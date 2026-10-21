import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { responderQuestaoAvulsa } from '../../hooks/useQuestoes';
import RenderBlocos from '../RenderBlocos';

// Questões: as marcadas como do pack (questoes.incluso_no_pack = true).
// O gabarito só chega do servidor depois que o aluno responde.
export default function PackQuestoes() {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [indice, setIndice] = useState(0);
  const [escolhas, setEscolhas] = useState({});     // { [questaoId]: letra } antes de responder
  const [respondidas, setRespondidas] = useState({}); // { [questaoId]: { escolhida, correta } }
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase
      .from('questoes')
      .select('*')
      .eq('incluso_no_pack', true)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar as questões. Tente novamente.');
        else setQuestoes(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;
  if (questoes.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-bold text-slate-300">As questões ainda não foram liberadas</p>
        <p className="text-sm mt-1">Assim que o professor publicar, elas aparecem aqui.</p>
        {erro && <p role="alert" className="mt-3 text-red-400 text-sm">{erro}</p>}
      </div>
    );
  }

  const q = questoes[indice];
  const resp = respondidas[q.id];
  const escolhida = resp?.escolhida ?? escolhas[q.id];
  const feitas = Object.keys(respondidas).length;
  const acertos = Object.values(respondidas).filter((r) => r.correta).length;

  const responder = async () => {
    if (!escolhas[q.id] || resp || enviando) return;
    setEnviando(true);
    setErro('');
    const { resultado, error } = await responderQuestaoAvulsa(q.id, escolhas[q.id]);
    setEnviando(false);

    if (error || !resultado) {
      setErro('Não foi possível registrar sua resposta. Tente novamente.');
      return;
    }
    setQuestoes((prev) => prev.map((x) => (
      x.id === q.id ? { ...x, resposta_correta: resultado.resposta_correta, comentario: resultado.comentario } : x
    )));
    setRespondidas((prev) => ({ ...prev, [q.id]: { escolhida: escolhas[q.id], correta: resultado.correta } }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="font-bold text-slate-300">Questão {indice + 1} de {questoes.length}</span>
        <span className="text-slate-400">{feitas} respondidas · {acertos} acertos</span>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-slate-800">
        <div
          className="p-5 sm:p-6 space-y-4 select-none"
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {(q.materia || q.assunto) && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {[q.materia, q.assunto].filter(Boolean).join(' · ')}
            </p>
          )}

          {q.blocos_enunciado && q.blocos_enunciado.length > 0 ? (
            <div className="font-medium leading-relaxed text-justify"><RenderBlocos blocos={q.blocos_enunciado} /></div>
          ) : q.enunciado ? (
            <p className="font-medium leading-relaxed text-justify whitespace-pre-wrap">{q.enunciado}</p>
          ) : null}

          {q.imagem_url && (
            <div className="flex justify-center">
              <img src={q.imagem_url} alt="Imagem da questão" className="max-h-72 w-auto object-contain rounded-xl" />
            </div>
          )}

          <div className="space-y-3 pt-2">
            {q.alternativas?.map((alt) => {
              const certa = resp && alt.letra === q.resposta_correta;
              const errada = resp && alt.letra === resp.escolhida && !resp.correta;
              const marcada = escolhida === alt.letra;
              return (
                <button
                  key={alt.letra}
                  disabled={!!resp}
                  onClick={() => setEscolhas((prev) => ({ ...prev, [q.id]: alt.letra }))}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    certa ? 'border-emerald-500 bg-emerald-50/60'
                      : errada ? 'border-red-400 bg-red-50/60'
                      : marcada ? 'border-brand-orange bg-orange-50/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } ${resp ? 'cursor-default' : ''}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                    marcada || certa ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {alt.letra}
                  </span>
                  <span className="font-medium text-sm text-slate-700 flex-1">
                    {alt.blocos && alt.blocos.length > 0 ? <RenderBlocos blocos={alt.blocos} imgHeight="h-8" /> : alt.texto}
                  </span>
                </button>
              );
            })}
          </div>

          {resp && (
            <div className={`p-4 rounded-xl border text-sm ${resp.correta ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <p className="font-black">
                {resp.correta ? 'Você acertou!' : `Você errou. A resposta certa é a alternativa ${q.resposta_correta}.`}
              </p>
              {q.comentario && (
                <div className="mt-3 pt-3 border-t border-black/10 text-slate-700">
                  <p className="flex items-center gap-1.5 font-bold mb-1"><MessageSquare className="w-4 h-4" /> Comentário do professor</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{q.comentario}</p>
                </div>
              )}
            </div>
          )}
          {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        </div>

        <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex items-center justify-between">
          <button
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
            disabled={indice === 0}
            className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-brand-orange disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {!resp ? (
            <button
              onClick={responder}
              disabled={!escolhas[q.id] || enviando}
              className="px-6 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Responder
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-400">Respondida</span>
          )}

          <button
            onClick={() => setIndice((i) => Math.min(questoes.length - 1, i + 1))}
            disabled={indice === questoes.length - 1}
            className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-brand-orange disabled:opacity-40 cursor-pointer"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
