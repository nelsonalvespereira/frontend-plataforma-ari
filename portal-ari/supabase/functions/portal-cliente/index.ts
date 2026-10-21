// Abre o portal do Stripe onde o aluno cancela a assinatura, troca o cartão e vê faturas.
// Requer ativar o "Customer portal" no painel do Stripe (Settings > Billing > Customer portal).

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

    const siteUrl = urlDoSite(req);
    if (!siteUrl) return json({ error: "SITE_URL não configurada no servidor" }, 500);

    const { data: assinatura } = await criarAdmin()
      .from("assinaturas")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assinatura) return json({ error: "Nenhuma assinatura encontrada" }, 404);

    const portal = await stripe.billingPortal.sessions.create({
      customer: assinatura.stripe_customer_id,
      return_url: `${siteUrl}/dashboard`,
    });

    return json({ url: portal.url });
  } catch (err) {
    console.error("portal-cliente:", err);
    return json({ error: "Não foi possível abrir o portal de assinatura" }, 500);
  }
});
