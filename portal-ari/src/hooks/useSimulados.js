import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSimulados({ tipo } = {}) {
  const [simulados, setSimulados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('simulados')
      .select('id, titulo, tipo, tempo_minutos, simulado_questoes ( count )')
      .order('created_at', { ascending: false });
    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) setError(error);
    else setSimulados(data ?? []);
    setLoading(false);
  }, [tipo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { simulados, loading, error, recarregar: carregar };
}

// Busca as questões de um simulado específico, na ordem certa.
// comGabarito só funciona para admin (a tabela do gabarito é restrita); para o aluno vem sem gabarito.
export async function buscarQuestoesDoSimulado(simuladoId, { comGabarito = false } = {}) {
  const colunas = comGabarito ? 'ordem, questoes (*, questoes_gabarito (*))' : 'ordem, questoes (*)';
  const { data, error } = await supabase
    .from('simulado_questoes')
    .select(colunas)
    .eq('simulado_id', simuladoId)
    .order('ordem', { ascending: true });

  if (error) return { questoes: [], error };

  const questoes = data.map((row) => {
    const q = row.questoes;
    if (!comGabarito || !q) return q;
    const { questoes_gabarito: g, ...resto } = q;
    const gab = Array.isArray(g) ? g[0] : g;
    return { ...resto, ...(gab ?? {}) };
  });
  return { questoes, error: null };
}

// Aluno monta o próprio simulado (Por Assunto / Personalizado).
// RLS só deixa isso passar pra tipo 'assunto'/'personalizado' e turma própria.
export async function criarSimuladoAluno({ titulo, turmaId, tipo, tempoMinutos, questaoIds }) {
  const { data: simulado, error: erroSimulado } = await supabase
    .from('simulados')
    .insert({ titulo, turma_id: turmaId, tipo, tempo_minutos: tempoMinutos })
    .select()
    .single();

  if (erroSimulado) return { simulado: null, error: erroSimulado };

  const vinculos = questaoIds.map((id, index) => ({
    simulado_id: simulado.id,
    questao_id: id,
    ordem: index + 1,
  }));

  const { error: erroVinculo } = await supabase.from('simulado_questoes').insert(vinculos);
  if (erroVinculo) return { simulado: null, error: erroVinculo };

  return { simulado, error: null };
}

// Cria a tentativa ao iniciar a prova.
// A tentativa é aberta e corrigida pelo servidor.
export async function iniciarTentativa(simuladoId) {
  const { data, error } = await supabase.rpc('iniciar_tentativa_simulado', {
    p_simulado_id: simuladoId,
  });
  return { tentativa: data, error };
}

// Envia as respostas; o servidor corrige, grava e devolve { acertos, erros, em_branco, total, gabarito }.
export async function finalizarTentativa(tentativaId, respostas) {
  const { data, error } = await supabase.rpc('finalizar_tentativa_simulado', {
    p_tentativa_id: tentativaId,
    p_respostas: respostas,
  });
  return { resultado: data, error };
}
