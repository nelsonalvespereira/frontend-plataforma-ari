import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Lista de questões favoritadas pelo aluno, com o dado completo da
// questão já embutido (join), pronta pra exibir sem consulta extra.
export function useFavoritos() {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('favoritos')
      .select('id, created_at, questoes (*)')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setQuestoes((data ?? []).filter((f) => f.questoes).map((f) => ({ ...f.questoes, favoritoId: f.id })));
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { questoes, loading, error, recarregar: carregar };
}

// Hook leve pra usar dentro do Banco de Questões — só cuida do
// favorito da questão que está na tela no momento.
export function useFavorito(questaoId) {
  const [favoritado, setFavoritado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!questaoId) return;
    let ativo = true;

    supabase
      .from('favoritos')
      .select('id')
      .eq('questao_id', questaoId)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setFavoritado(!!data);
      });

    return () => { ativo = false; };
  }, [questaoId]);

  const alternar = async () => {
    if (!questaoId || carregando) return;
    setCarregando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCarregando(false); return; }

    if (favoritado) {
      await supabase.from('favoritos').delete().eq('questao_id', questaoId).eq('user_id', user.id);
      setFavoritado(false);
    } else {
      await supabase.from('favoritos').insert({ questao_id: questaoId, user_id: user.id });
      setFavoritado(true);
    }
    setCarregando(false);
  };

  return { favoritado, alternar, carregando };
}

export async function removerFavorito(favoritoId) {
  const { error } = await supabase.from('favoritos').delete().eq('id', favoritoId);
  return { error };
}