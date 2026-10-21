import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Cliente com poder total (ignora RLS). Usar só no servidor.
export function criarAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Descobre QUEM está chamando a partir do JWT do aluno. Retorna null se não autenticado.
export async function usuarioDaRequisicao(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// URL base do site para os redirects do Stripe. Nunca confia cegamente no header Origin:
// só usa se estiver na lista ALLOWED_ORIGINS (ou SITE_URL); senão usa o primeiro da lista.
export function urlDoSite(req: Request): string | null {
  const permitidas = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("SITE_URL") ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const origem = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  if (permitidas.includes(origem)) return origem;
  return permitidas[0] ?? null;
}
