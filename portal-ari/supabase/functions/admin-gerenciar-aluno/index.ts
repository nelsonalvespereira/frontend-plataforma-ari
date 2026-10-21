// supabase/functions/admin-gerenciar-aluno/index.ts
//
// Edge Function que roda no servidor do Supabase (não no navegador).
// Usa a Service Role Key — que tem poder total — então TODA chamada
// precisa provar duas coisas antes de fazer qualquer coisa:
//   1. Quem está chamando está autenticado (tem um JWT válido)
//   2. Quem está chamando é admin (is_admin = true no profile dele)
// Sem essas duas checagens, qualquer aluno logado poderia excluir
// ou resetar a senha de qualquer outro aluno.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente "normal" (chave anon), usado só pra confirmar QUEM está chamando.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com a Service Role Key — só a partir daqui, e só porque já
    // confirmamos que quem chamou é admin de verdade.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, userId, novaSenha } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trava: ninguém apaga/altera a própria conta por aqui, nem a de outro admin.
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'Você não pode executar isso na própria conta.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: alvo } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
    if (alvo?.is_admin) {
      return new Response(JSON.stringify({ error: 'Não é possível alterar outro administrador.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_user') {
      // Apaga a conta em auth.users. Como profiles.id referencia
      // auth.users com "on delete cascade", o profile some junto,
      // sem precisar de um segundo delete.
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_password') {
      if (!novaSenha || novaSenha.length < 6) {
        return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: novaSenha });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});