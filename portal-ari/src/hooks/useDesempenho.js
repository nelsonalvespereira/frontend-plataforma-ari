import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Calcula as métricas que a tela "Meu Desempenho" mostra,
// a partir das respostas que o próprio aluno já deu (RLS garante que são só as dele).
export function useDesempenho() {
  const [resumo, setResumo] = useState({
    totalRespondidas: 0,
    acertos: 0,
    erros: 0,
    taxaAcerto: 0,
  });
  const [porAssunto, setPorAssunto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('respostas_questoes')
      .select('correta, alternativa_escolhida, questoes ( assunto )');

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    const tentativas = (data ?? []).filter((r) => r.alternativa_escolhida !== '__revisado__');
    const total = tentativas.length;
    const acertos = tentativas.filter((r) => r.correta).length;

    const porAssuntoMap = {};
    tentativas.forEach((r) => {
      const assunto = r.questoes?.assunto ?? 'Outros';
      if (!porAssuntoMap[assunto]) porAssuntoMap[assunto] = { assunto, total: 0, acertos: 0 };
      porAssuntoMap[assunto].total += 1;
      if (r.correta) porAssuntoMap[assunto].acertos += 1;
    });

    setResumo({
      totalRespondidas: total,
      acertos,
      erros: total - acertos,
      taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0,
    });

    setPorAssunto(
      Object.values(porAssuntoMap).map((item) => ({
        assunto: item.assunto,
        acertos: Math.round((item.acertos / item.total) * 100),
        total: item.total,
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { resumo, porAssunto, loading, error, recarregar: carregar };
}
