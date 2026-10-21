import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Traz os dados consolidados do aluno (XP, streak, etc) direto do perfil
export function useGamificacao(turmaId, metaSemanalDias = 5) {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [diasEstudadosSemana, setDiasEstudadosSemana] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fazemos APENAS UMA busca na tabela, pegando todas as colunas de uma vez
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('xp, dias_seguidos, dias_estudados_semana')
        .eq('id', user.id)
        .single();

      if (dbError) throw dbError;

      setXp(data?.xp || 0);
      setStreak(data?.dias_seguidos || 0);
      setDiasEstudadosSemana(data?.dias_estudados_semana || 0);

    } catch (err) {
      console.error('Erro na gamificação:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    xp,
    streak,
    diasEstudadosSemana,
    metaSemanalDias,
    loading,
    error,
    recarregar: carregar,
  };
}

// Ranking puxando os alunos com maior XP
export function useRanking({ turmaId, limite = 50 } = {}) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    
    try {
      // A RLS só deixa o aluno ler o próprio profile; o ranking vem de uma função segura
      // no banco que devolve apenas id, primeiro nome e XP (ver migration do ranking).
      const { data, error: dbError } = await supabase.rpc('ranking_alunos', {
        p_turma_id: turmaId || null,
        p_limite: limite,
      });
      if (dbError) throw dbError;

      setRanking(data || []);
    } catch (err) {
      console.error('Erro no ranking:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [turmaId, limite]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ranking, loading, error, recarregar: carregar };
}