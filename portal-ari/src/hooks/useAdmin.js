import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// ---------------------------------------------------------
// Turmas (usado nos filtros de todas as telas de admin)
// ---------------------------------------------------------
export function useTurmas() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('turmas').select('*').order('nome').then(({ data }) => {
      setTurmas(data ?? []);
      setLoading(false);
    });
  }, []);

  return { turmas, loading };
}

// ---------------------------------------------------------
// Gestão de Alunos
// Observação: profiles não guarda email nem plano/status de
// assinatura — isso vive no auth.users (não acessível pelo SDK
// do front) e num sistema de pagamento que ainda não existe.
// Por enquanto mostramos só o que realmente temos: nome, turma
// e data de cadastro.
// ---------------------------------------------------------
export function useAdminAlunos({ busca, turmaId } = {}) {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, nome, is_admin, created_at, turmas ( nome )')
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (turmaId) query = query.eq('turma_id', turmaId);
    if (busca) query = query.ilike('nome', `%${busca}%`);

    const { data, error } = await query;
    if (error) setError(error);
    else setAlunos(data ?? []);
    setLoading(false);
  }, [busca, turmaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { alunos, loading, error, recarregar: carregar };
}

// ---------------------------------------------------------
// Simulados e Questões (visão do admin, todas as turmas)
// ---------------------------------------------------------
export function useAdminQuestoes({ busca, turmaId } = {}) {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('questoes')
      .select('id, enunciado, blocos_enunciado, materia, assunto, dificuldade, alternativas, resposta_correta, comentario, imagem_url, banca, ano, turmas ( nome )')
      .order('created_at', { ascending: false });

    if (turmaId) query = query.eq('turma_id', turmaId);
    if (busca) query = query.ilike('enunciado', `%${busca}%`);

    const { data, error } = await query;
    if (error) setError(error);
    else setQuestoes(data ?? []);
    setLoading(false);
  }, [busca, turmaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluirQuestao(id) {
    const { error } = await supabase.from('questoes').delete().eq('id', id);
    if (!error) setQuestoes((prev) => prev.filter((q) => q.id !== id));
    return { error };
  }

  return { questoes, loading, error, recarregar: carregar, excluirQuestao };
}

export function useAdminSimulados({ busca, turmaId } = {}) {
  const [simulados, setSimulados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('simulados')
      .select('id, titulo, tipo, tempo_minutos, turmas ( nome ), simulado_questoes ( count )')
      .order('created_at', { ascending: false });

    if (turmaId) query = query.eq('turma_id', turmaId);
    if (busca) query = query.ilike('titulo', `%${busca}%`);

    const { data, error } = await query;
    if (error) setError(error);
    else setSimulados(data ?? []);
    setLoading(false);
  }, [busca, turmaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluirSimulado(id) {
    const { error } = await supabase.from('simulados').delete().eq('id', id);
    if (!error) setSimulados((prev) => prev.filter((s) => s.id !== id));
    return { error };
  }

  return { simulados, loading, error, recarregar: carregar, excluirSimulado };
}

// ---------------------------------------------------------
// Aulas e Lives (visão do admin, todas as turmas)
// ---------------------------------------------------------
export function useAdminVideoaulas({ busca, turmaId } = {}) {
  const [videoaulas, setVideoaulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('videoaulas')
      .select('id, titulo, modulo, duracao_min, turmas ( nome )')
      .order('created_at', { ascending: false });

    if (turmaId) query = query.eq('turma_id', turmaId);
    if (busca) query = query.ilike('titulo', `%${busca}%`);

    const { data, error } = await query;
    if (error) setError(error);
    else setVideoaulas(data ?? []);
    setLoading(false);
  }, [busca, turmaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluirVideoaula(id) {
    const { error } = await supabase.from('videoaulas').delete().eq('id', id);
    if (!error) setVideoaulas((prev) => prev.filter((v) => v.id !== id));
    return { error };
  }

  return { videoaulas, loading, error, recarregar: carregar, excluirVideoaula };
}

export function useAdminLives({ busca, turmaId } = {}) {
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lives')
      .select('id, titulo, professor, data_hora, turmas ( nome )')
      .order('data_hora', { ascending: true });

    if (turmaId) query = query.eq('turma_id', turmaId);
    if (busca) query = query.ilike('titulo', `%${busca}%`);

    const { data, error } = await query;
    if (error) setError(error);
    else setLives(data ?? []);
    setLoading(false);
  }, [busca, turmaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluirLive(id) {
    const { error } = await supabase.from('lives').delete().eq('id', id);
    if (!error) setLives((prev) => prev.filter((l) => l.id !== id));
    return { error };
  }

  // Deriva o status (Agendada/Encerrada) a partir da data — mais confiável
  // que guardar um campo de status separado que poderia ficar desatualizado.
  function statusDaLive(dataHora) {
    return new Date(dataHora) > new Date() ? 'Agendada' : 'Encerrada';
  }

  return { lives, loading, error, recarregar: carregar, excluirLive, statusDaLive };
}