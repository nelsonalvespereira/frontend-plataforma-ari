// Cria a sessão de checkout do Stripe em modo EMBUTIDO (o formulário aparece dentro do site).
// - O usuário vem do JWT (nunca do corpo da requisição).
// - O priceId só vale se estiver na tabela `planos` e ativo.
// - Metadata com user_id vai na sessão E na assinatura, para o webhook saber de quem é.
// - Planos com tipo = 'pack' viram pagamento ÚNICO (mode: payment) e a duração do acesso
//   vem da tabela `planos` (nunca do navegador) e segue na metadata para o webhook.
// - Devolve `clientSecret`, que o front usa para montar o formulário.

import Stripe from "npm:stripe@17.7.0";
import { corsHeaders, criarAdmin, json, urlDoSite, usuarioDaRequisicao } from "../_shared/util.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { priceId } = await req.json().catch(() => ({}));
    if (!priceId || typeof priceId !== "string") {
      return json({ error: "priceId é obrigatório" }, 400);
    }

    const siteUrl = urlDoSite(req);
    if (!siteUrl) return json({ error: "SITE_URL não configurada no servidor" }, 500);

    const admin = criarAdmin();

    // 1. O plano precisa existir e estar ativo.
    const { data: plano } = await admin
      .from("planos")
      .select("price_id, tipo, duracao_dias")
      .eq("price_id", priceId)
      .eq("ativo", true)
      .maybeSingle();
    if (!plano) return json({ error: "Plano inválido" }, 400);

    const ehPack = plano.tipo === "pack";

    // 2. Evita cobrança duplicada / desnecessária.
    // Pack: qualquer aluno pode comprar (assinante também; assinatura não inclui packs).
    // Comprar de novo um pack ainda ativo soma os dias ao prazo dele.
    if (!ehPack) {
      const { data: jaAtiva } = await admin
        .from("assinaturas")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .eq("price_id", priceId)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();
      if (jaAtiva) return json({ error: "Você já assina este plano" }, 409);
    }

    // 3. Reaproveita o cliente do Stripe se o aluno já tiver um.
    const { data: anterior } = await admin
      .from("assinaturas")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const cliente = anterior?.stripe_customer_id
      ? { customer: anterior.stripe_customer_id }
      : { customer_email: user.email ?? undefined };

    const base = {
      ui_mode: "embedded" as const, // formulário dentro do site (sem redirecionar para o Stripe)
      line_items: [{ price: priceId, quantity: 1 }],
      ...cliente,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      locale: "pt-BR" as const,
    };

    let session: Stripe.Checkout.Session;

    if (ehPack) {
      const dias = Number(plano.duracao_dias);
      if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
        console.error(`Plano pack ${priceId} sem duracao_dias válida (${plano.duracao_dias}).`);
        return json({ error: "Pack indisponível no momento" }, 500);
      }

      // Pack só funciona com preço AVULSO. Falha cedo, com mensagem clara no log.
      const preco = await stripe.prices.retrieve(priceId);
      if (preco.recurring) {
        console.error(`O preço ${priceId} é recorrente; o Pack precisa de um preço de pagamento único.`);
        return json({ error: "Pack indisponível no momento" }, 500);
      }

      const metadata = {
        user_id: user.id,
        tipo: "pack_temporario",
        dias: String(dias),
        price_id: priceId,
      };

      session = await stripe.checkout.sessions.create({
        ...base,
        mode: "payment",
        metadata,
        payment_intent_data: { metadata },
        // Após pagar, o Stripe leva o aluno para cá. O modo embutido não usa success_url/cancel_url.
        return_url: `${siteUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}&produto=pack`,
      });
    } else {
      session = await stripe.checkout.sessions.create({
        ...base,
        mode: "subscription",
        metadata: { user_id: user.id },
        subscription_data: { metadata: { user_id: user.id } },
        return_url: `${siteUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      });
    }

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("criar-checkout-stripe:", err);
    return json({ error: "Não foi possível iniciar o pagamento" }, 500);
  }
});
