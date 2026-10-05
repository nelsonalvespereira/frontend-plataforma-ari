import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Caderno de Erros "vivo": mostra só as questões cuja ÚLTIMA tentativa
// foi errada. Se o aluno acertar depois, a questão sai da lista sozinha —
// não precisa de um botão de "remover manual".
export function useCadernoErros() {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('respostas_questoes')
      .select('questao_id, correta, alternativa_escolhida, respondido_em, questoes (*)')
      .eq('user_id', user.id)
      .order('respondido_em', { ascending: false });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    const vistos = new Set();
    const erradas = [];
    for (const r of data) {
      if (vistos.has(r.questao_id)) continue; // já vimos uma tentativa mais recente dessa questão
      vistos.add(r.questao_id);
      if (!r.correta && r.questoes) {
        erradas.push({
          ...r.questoes,
          ultimaAlternativaEscolhida: r.alternativa_escolhida,
          ultimaTentativaEm: r.respondido_em,
        });
      }
    }

    setQuestoes(erradas);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // "Já aprendi": grava uma revisão na mesma tabela de respostas.
  // A última tentativa passa a ser correta e a questão sai do caderno.
  // O desempenho ignora alternativa_escolhida === '__revisado__' para não inflar acertos.
  async function marcarResolvida(questaoId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Usuário não autenticado') };

    const { error } = await supabase.from('respostas_questoes').insert({
      user_id: user.id,
      questao_id: questaoId,
      alternativa_escolhida: '__revisado__',
      correta: true,
    });

    if (!error) await carregar();
    return { error };
  }

  return { questoes, loading, error, recarregar: carregar, marcarResolvida };
}