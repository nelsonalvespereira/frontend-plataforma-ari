import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Conteúdo de UM pack (aulão, questões, lives). A RLS só devolve os itens se o aluno
// comprou este pack e o prazo ainda não acabou (relógio do banco). Admin vê tudo.
export function usePackItens(priceId) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    if (!priceId) {
      setItens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('pack_itens')
      .select('id, tipo, titulo, descricao, video_url, link_url, arquivo_path, data_hora, duracao_min, ordem')
      .eq('pack_price_id', priceId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('data_hora', { ascending: true, nullsFirst: false });

    setErro(error ?? null);
    setItens(data ?? []);
    setLoading(false);
  }, [priceId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    aulas: itens.filter((i) => i.tipo === 'aulao'),
    questoes: itens.filter((i) => i.tipo === 'questoes'),
    lives: itens.filter((i) => i.tipo === 'live'),
    loading,
    erro,
    recarregar: carregar,
  };
}

// Vitrine: packs à venda para a turma do aluno (pack sem turma = todos) e,
// para cada pack, até quando o aluno tem acesso (só os que ainda valem).
export function useLojaPacks(turmaId, userId) {
  const [packs, setPacks] = useState([]);
  const [meus, setMeus] = useState({}); // { price_id: Date de expiração }
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('planos')
      .select('price_id, nome, descricao, valor_centavos, duracao_dias, turma_id, ordem')
      .eq('tipo', 'pack')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    query = turmaId ? query.or(`turma_id.is.null,turma_id.eq.${turmaId}`) : query.is('turma_id', null);

    const [packsRes, comprasRes] = await Promise.all([
      query,
      userId
        ? supabase
            .from('pack_compras')
            .select('price_id, expira_em')
            .eq('user_id', userId)
            .gt('expira_em', new Date().toISOString())
        : Promise.resolve({ data: [] }),
    ]);

    const mapa = {};
    for (const c of comprasRes.data ?? []) {
      const fim = new Date(c.expira_em);
      if (!mapa[c.price_id] || fim > mapa[c.price_id]) mapa[c.price_id] = fim;
    }

    setErro(packsRes.error ?? null);
    setPacks(packsRes.data ?? []);
    setMeus(mapa);
    setLoading(false);
  }, [turmaId, userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { packs, meus, loading, erro, recarregar: carregar };
}

// Um pack específico + até quando o aluno tem acesso a ele (null = não tem).
export function usePackDetalhe(priceId, userId) {
  const [pack, setPack] = useState(null);
  const [expiraEm, setExpiraEm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const [packRes, compraRes] = await Promise.all([
        supabase
          .from('planos')
          .select('price_id, nome, descricao, valor_centavos, duracao_dias')
          .eq('price_id', priceId)
          .maybeSingle(),
        userId
          ? supabase
              .from('pack_compras')
              .select('expira_em')
              .eq('user_id', userId)
              .eq('price_id', priceId)
              .order('expira_em', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!ativo) return;
      setPack(packRes.data ?? null);
      const fim = compraRes.data?.expira_em ? new Date(compraRes.data.expira_em) : null;
      setExpiraEm(fim && fim > new Date() ? fim : null);
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [priceId, userId]);

  return { pack, expiraEm, loading };
}

// Contador regressivo até `alvoMs`. Atualiza a cada segundo.
export function useRestante(alvoMs) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!alvoMs) return undefined;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [alvoMs]);

  return alvoMs ? Math.max(0, alvoMs - agora) : 0;
}
