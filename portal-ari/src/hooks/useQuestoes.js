import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useQuestoes({ materia, assunto, assuntoId, assuntoIds, dificuldade, busca, pagina = 0, porPagina = 10 } = {}) {
  const [questoes, setQuestoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    let idsFiltro = assuntoIds || [];

    // Se o aluno clicou em um assunto/categoria específica na árvore,
    // vamos buscar esse ID e todos os filhos/subcategorias abaixo dele recursivamente!
    if (assuntoId) {
      try {
        const { data: todosAssuntos } = await supabase
          .from('assuntos_hierarquia')
          .select('id, categoria_pai_id');

        if (todosAssuntos) {
          const idsColetados = [assuntoId];
          let fila = [assuntoId];

          // Varre a árvore para pegar todos os descendentes (filhos, netos, etc.)
          while (fila.length > 0) {
            const atualId = fila.shift();
            const filhos = todosAssuntos.filter(a => a.categoria_pai_id === atualId);
            for (const filho of filhos) {
              if (!idsColetados.includes(filho.id)) {
                idsColetados.push(filho.id);
                fila.push(filho.id);
              }
            }
          }
          idsFiltro = idsColetados;
        }
      } catch (err) {
        console.error('Erro ao mapear hierarquia de assuntos:', err);
        idsFiltro = [assuntoId];
      }
    }

    let query = supabase
      .from('questoes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pagina * porPagina, pagina * porPagina + porPagina - 1);

    if (materia) query = query.eq('materia', materia);
    if (assunto) query = query.eq('assunto', assunto);
    
    // Aplica o filtro usando a lista completa de IDs (incluindo os filhos da pasta)
    if (idsFiltro.length > 0) {
      query = query.in('assunto_id', idsFiltro);
    }
    
    if (dificuldade) query = query.eq('dificuldade', dificuldade);
    if (busca) query = query.ilike('enunciado', `%${busca}%`);

    const { data, error, count } = await query;

    if (error) {
      setError(error);
    } else {
      setQuestoes(data);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [materia, assunto, assuntoId, JSON.stringify(assuntoIds), dificuldade, busca, pagina, porPagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function responder(questaoId, alternativaEscolhida, modo) {
    return responderQuestaoAvulsa(questaoId, alternativaEscolhida, modo);
  }

  return { questoes, total, loading, error, recarregar: carregar, responder };
}

// A correção acontece no servidor: ele grava a resposta e devolve o gabarito (só depois de responder).
// modo 'personalizado' também concede XP (no máximo uma vez por questão).
export async function responderQuestaoAvulsa(questaoId, alternativaEscolhida, modo = 'avulsa') {
  const { data, error } = await supabase.rpc('responder_questao', {
    p_questao_id: questaoId,
    p_alternativa: alternativaEscolhida,
    p_modo: modo,
  });

  return { correta: data?.correta ?? false, resultado: data ?? null, error };
}

// Gabarito de uma questão que o aluno já respondeu ou favoritou (null se ainda não tem direito).
export async function obterGabarito(questaoId) {
  const { data, error } = await supabase.rpc('obter_gabarito', { p_questao_id: questaoId });
  return { gabarito: data ?? null, error };
}

export function useAssuntosDisponiveis() {
  const [assuntos, setAssuntos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('questoes').select('assunto').then(({ data, error }) => {
      if (!error && data) {
        const unicos = [...new Set(data.map((q) => q.assunto))].sort();
        setAssuntos(unicos);
      }
      setLoading(false);
    });
  }, []);

  return { assuntos, loading };
}

export async function buscarQuestoesParaSimulado({ assunto, dificuldade, quantidade }) {
  let query = supabase.from('questoes').select('id, dificuldade');
  if (assunto) query = query.eq('assunto', assunto);
  if (dificuldade && dificuldade !== 'misto') query = query.eq('dificuldade', dificuldade);

  const { data, error } = await query;
  if (error) return { questaoIds: [], error };

  const embaralhado = [...(data ?? [])].sort(() => Math.random() - 0.5);
  return { questaoIds: embaralhado.slice(0, quantidade).map((q) => q.id), error: null };
}

// Junta o gabarito devolvido pelo banco às questões da tela.
// Aceita { "<id>": {...} } ou uma lista [{ questao_id, ... }].
export function aplicarGabarito(questoes, gabarito) {
  if (!gabarito) return questoes;
  const porId = Array.isArray(gabarito)
    ? Object.fromEntries(gabarito.map((g) => [g.questao_id ?? g.id, g]))
    : gabarito;
  return questoes.map((q) => (porId[q.id] ? { ...q, ...porId[q.id], id: q.id } : q));
}