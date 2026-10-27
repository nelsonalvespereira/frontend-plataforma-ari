import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, turma_id, nome, is_admin, turmas: { slug, nome } }
  const [assinaturas, setAssinaturas] = useState([]); // assinaturas ativas/em teste do aluno
  const [loading, setLoading] = useState(true);
  const [agora, setAgora] = useState(() => Date.now()); // relógio local, só para a interface reagir ao prazo
  const packRevogadoRef = useRef(null); // evita chamar a revogação mais de uma vez para o mesmo prazo

  async function carregarProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, turma_id, is_admin, acesso_livre, tipo_acesso, data_expiracao_pack, turmas ( slug, nome )')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao carregar profile:', error);
      setProfile(null);
      return;
    }
    setProfile(data);
  }

  // A RLS já limita a consulta às assinaturas do próprio aluno.
  const carregarAssinaturas = useCallback(async (userId) => {
    if (!userId) {
      setAssinaturas([]);
      return [];
    }
    const { data, error } = await supabase
      .from('assinaturas')
      .select('stripe_subscription_id, price_id, status, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing']);

    if (error) {
      console.error('Erro ao carregar assinaturas:', error);
      setAssinaturas([]);
      return [];
    }
    setAssinaturas(data ?? []);
    return data ?? [];
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await Promise.all([
        carregarProfile(session?.user?.id),
        carregarAssinaturas(session?.user?.id),
      ]);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      await Promise.all([
        carregarProfile(session?.user?.id),
        carregarAssinaturas(session?.user?.id),
      ]);
    });

    return () => listener.subscription.unsubscribe();
  }, [carregarAssinaturas]);

  // turmaSlug: o `nicheId` escolhido na landing page (ex: 'enem', 'concursos'...)
  // termosVersao: versão dos Termos/Privacidade aceita no cadastro (fica gravada na conta).
  async function signUp({ email, password, nome, turmaSlug, termosVersao }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          turma_slug: turmaSlug,
          ...(termosVersao && { termos_versao: termosVersao, termos_aceitos_em: new Date().toISOString() }),
        },
      },
    });
    return { data, error };
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Recarrega a assinatura (usado na tela de sucesso, enquanto o webhook ainda não chegou).
  const recarregarAssinaturas = useCallback(
    () => carregarAssinaturas(session?.user?.id),
    [carregarAssinaturas, session?.user?.id]
  );

  const temAssinatura = assinaturas.length > 0;
  const isAdmin = !!profile?.is_admin;

  // ---------------------------------------------------------------- Pack Avulso
  // Acesso temporário: vale enquanto tipo_acesso = 'pack_temporario' E o prazo não passou.
  // Isto aqui só decide a INTERFACE; quem protege os dados de verdade é a RLS (relógio do banco).
  const packExpiraEmMs = profile?.data_expiracao_pack ? new Date(profile.data_expiracao_pack).getTime() : null;
  const temPack =
    profile?.tipo_acesso === 'pack_temporario' && packExpiraEmMs !== null && packExpiraEmMs > agora;
  const packExpirado =
    profile?.tipo_acesso === 'pack_expirado' ||
    (profile?.tipo_acesso === 'pack_temporario' && !temPack);

  const recarregarPerfil = useCallback(
    () => carregarProfile(session?.user?.id),
    [session?.user?.id]
  );

  // Expiração automática: quando o prazo chega (ou já passou ao abrir o site), pede ao banco
  // para marcar o pack como expirado e recarrega o perfil. O banco confere com o relógio dele.
  useEffect(() => {
    if (profile?.tipo_acesso !== 'pack_temporario' || packExpiraEmMs === null) return undefined;

    const revogar = async () => {
      const chave = `${profile.id}:${packExpiraEmMs}`;
      if (packRevogadoRef.current === chave) return;
      packRevogadoRef.current = chave;

      const { error } = await supabase.rpc('revogar_pack_expirado');
      if (error) console.error('Erro ao revogar pack expirado:', error);
      await carregarProfile(profile.id);
    };

    const restante = packExpiraEmMs - Date.now();
    if (restante <= 0) {
      setAgora(Date.now());
      revogar();
      return undefined;
    }

    // setTimeout aceita no máximo ~24,8 dias; packs são curtos, mas limitamos por segurança.
    const timer = setTimeout(() => {
      setAgora(Date.now());
      revogar();
    }, Math.min(restante + 500, 2_000_000_000));

    return () => clearTimeout(timer);
  }, [profile?.id, profile?.tipo_acesso, packExpiraEmMs]);

  // Aba que ficou dormindo (timers pausam em segundo plano): ao voltar, reavalia o prazo.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') setAgora(Date.now());
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,               // profile.turmas.slug / profile.is_admin disponíveis aqui
    turmaId: profile?.turma_id ?? null,
    assinaturas,
    temAssinatura,
    temAcesso: temAssinatura || isAdmin || !!profile?.acesso_livre, // admin e acesso livre (cortesia) sempre entram
    temPack,                                  // pack avulso ativo (acesso temporário)
    packExpirado,                             // comprou um pack e o prazo acabou
    packExpiraEm: packExpiraEmMs ? new Date(packExpiraEmMs) : null,
    recarregarAssinaturas,
    recarregarPerfil,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>');
  }
  return ctx;
}