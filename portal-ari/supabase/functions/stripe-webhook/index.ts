// Recebe os eventos do Stripe e mantém `assinaturas` (mensal) e o Pack Avulso (acesso temporário) em dia.
// Precisa de verify_jwt = false (quem chama é o Stripe, não um aluno); a segurança
// vem da verificação da assinatura do webhook (STRIPE_WEBHOOK_SECRET).

import Stripe from "npm:stripe@17.7.0";
import { criarAdmin } from "../_shared/util.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const admin = criarAdmin();

// Descobre de qual aluno é a assinatura: metadata > client_reference_id > registro anterior.
async function descobrirUserId(sub: Stripe.Subscription, fallback?: string | null) {
  const daMetadata = sub.metadata?.user_id ?? fallback;
  if (daMetadata) return daMetadata;

  const { data } = await admin
    .from("assinaturas")
    .select("user_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function salvarAssinatura(sub: Stripe.Subscription, fallbackUserId?: string | null) {
  const userId = await descobrirUserId(sub, fallbackUserId);
  if (!userId) {
    // Assinatura que não nasceu do nosso checkout: ignora (200) em vez de ficar re-tentando.
    console.warn(`Assinatura ${sub.id} sem user_id; ignorada.`);
    return;
  }

  const item = sub.items.data[0];
  // Dependendo da versão da API, current_period_end fica na assinatura ou no item.
  const fimDoPeriodo = (sub as unknown as { current_period_end?: number }).current_period_end
    ?? (item as unknown as { current_period_end?: number } | undefined)?.current_period_end;

  const clienteId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const { error } = await admin.from("assinaturas").upsert(
    {
      stripe_subscription_id: sub.id,
      user_id: userId,
      stripe_customer_id: clienteId,
      price_id: item?.price.id ?? null,
      status: sub.status,
      current_period_end: fimDoPeriodo ? new Date(fimDoPeriodo * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
}

// Pack Avulso: pagamento único que libera o conteúdo do Pack por N dias.
// Quem decide tudo é a função SQL registrar_compra_pack (atômica e idempotente por sessão):
// grava a compra, calcula a expiração (soma dias se o pack ainda estava ativo) e atualiza o perfil.
async function registrarPack(session: Stripe.Checkout.Session, eventCreated: number) {
  // Métodos assíncronos (boleto/pix) chegam como "unpaid" no completed; o dinheiro só
  // confirma em checkout.session.async_payment_succeeded, que cai aqui de novo.
  if (session.payment_status !== "paid") {
    console.log(`Sessão ${session.id} do pack ainda não paga (${session.payment_status}); aguardando.`);
    return;
  }

  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const dias = Number(session.metadata?.dias);
  if (!userId || !Number.isInteger(dias) || dias < 1 || dias > 365) {
    // Nunca deveria acontecer: a sessão é criada por nós, com metadata validada.
    console.error(`Pack ${session.id} sem user_id/dias válidos`, session.metadata);
    return;
  }

  const paymentIntent = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { data: expiraEm, error } = await admin.rpc("registrar_compra_pack", {
    p_session_id: session.id,
    p_user_id: userId,
    p_price_id: session.metadata?.price_id ?? null,
    p_dias: dias,
    p_valor_centavos: session.amount_total ?? null,
    p_payment_intent: paymentIntent,
    p_comprado_em: new Date(eventCreated * 1000).toISOString(),
  });
  if (error) throw error; // 500 -> o Stripe tenta de novo; a função é idempotente

  console.log(`Pack liberado para ${userId} até ${expiraEm}`);
}

// Quem assina um plano passa para a turma desse plano (planos.turma_id). Roda ANTES de salvar a
// assinatura, para a turma já estar certa quando o aluno for liberado. Só na compra (checkout),
// nunca em renovações, para não desfazer uma troca de turma feita pelo admin.
async function aplicarTurmaDoPlano(sub: Stripe.Subscription, fallbackUserId?: string | null) {
  const userId = await descobrirUserId(sub, fallbackUserId);
  const priceId = sub.items.data[0]?.price.id;
  if (!userId || !priceId) return;

  const { data: plano } = await admin
    .from("planos")
    .select("turma_id")
    .eq("price_id", priceId)
    .maybeSingle();
  if (!plano?.turma_id) return; // plano sem turma cadastrada: mantém a turma atual

  const { error } = await admin.from("profiles").update({ turma_id: plano.turma_id }).eq("id", userId);
  if (error) throw error;
}

async function tratarEvento(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Compra avulsa do Pack.
      if (session.mode === "payment") {
        if (session.metadata?.tipo === "pack_temporario") {
          await registrarPack(session, event.created);
        }
        return;
      }

      // Assinatura mensal (fluxo que já existia).
      if (session.mode !== "subscription" || !session.subscription) return;
      const subId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      await aplicarTurmaDoPlano(sub, session.client_reference_id);
      await salvarAssinatura(sub, session.client_reference_id);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await salvarAssinatura(event.data.object as Stripe.Subscription);
      return;
    }
    default:
      return; // eventos que não nos interessam
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });

  const assinatura = req.headers.get("stripe-signature");
  if (!assinatura) return new Response("Sem assinatura", { status: 400 });

  const corpo = await req.text(); // precisa ser o texto cru, sem parse
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      corpo,
      assinatura,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Assinatura do webhook inválida:", err);
    return new Response("Assinatura inválida", { status: 400 });
  }

  // Idempotência: o Stripe pode reenviar o mesmo evento.
  const { data: jaProcessado } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (jaProcessado) return new Response("ok (repetido)", { status: 200 });

  try {
    await tratarEvento(event);
  } catch (err) {
    console.error(`Erro ao tratar ${event.type} (${event.id}):`, err);
    return new Response("Erro ao processar", { status: 500 }); // Stripe tenta de novo
  }

  await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  return new Response("ok", { status: 200 });
});