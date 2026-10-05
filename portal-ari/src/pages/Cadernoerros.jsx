import React, { useState } from 'react';
import { AlertCircle, Loader2, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import Sidebar from './Sidebar';
import { useCadernoErros } from '../hooks/useCadernoErros';
import QuestaoPreviewCard from '../components/QuestaoPreviewCard';

const DIFICULDADE_STYLE = {
  facil: 'bg-emerald-50 text-emerald-700',
  medio: 'bg-amber-50 text-amber-700',
  dificil: 'bg-red-50 text-red-700',
};
const DIFICULDADE_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

export default function CadernoErros() {
  const { questoes, loading, error, marcarResolvida } = useCadernoErros();
  const [questaoAberta, setQuestaoAberta] = useState(null);
  const [removendoId, setRemovendoId] = useState(null);

  // Função para remover ou marcar como resolvida a questão do caderno de erros
  const handleMarcarResolvida = async (questaoId, e) => {
    if (e) e.stopPropagation();
    setRemovendoId(questaoId);

    try {
      const { error: err } = await marcarResolvida(questaoId);
      if (err) throw err;

      if (questaoAberta?.id === questaoId) {
        setQuestaoAberta(null);
      }
    } catch (err) {
      console.error('Erro ao resolver questão:', err);
    } finally {
      setRemovendoId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">

      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Caderno de Erros</h2>
              <p className="text-xs font-medium text-slate-500">
                {loading ? 'Carregando...' : `${questoes.length} questão${questoes.length === 1 ? '' : 'ões'} pra revisar`}
              </p>
            </div>
          </div>

          <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs">
            C
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-3xl mx-auto space-y-4 pb-10">

            {loading && (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
                Erro ao carregar: {error.message}
              </div>
            )}

            {!loading && !error && questoes.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">Nenhum erro pendente!</h3>
                <p className="text-sm text-slate-500">
                  As questões que você errar aparecem aqui — e você pode marcar como resolvidas assim que aprender.
                </p>
              </div>
            )}

            {!loading && questoes.map((q) => (
              <div
                key={q.id}
                onClick={() => setQuestaoAberta(q)}
                className="w-full flex items-center justify-between gap-4 bg-white border border-slate-200 hover:border-red-300 rounded-2xl p-4 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{q.materia}</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{q.assunto}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${DIFICULDADE_STYLE[q.dificuldade]}`}>
                      {DIFICULDADE_LABEL[q.dificuldade] || q.dificuldade}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 truncate">{q.enunciado}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleMarcarResolvida(q.id, e)}
                    disabled={removendoId === q.id}
                    title="Marcar como resolvida e remover do caderno"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {removendoId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Já Aprendi</span>
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-400 transition-colors" />
                </div>
              </div>
            ))}

          </div>
        </div>
      </main>

      {/* MODAL: REVISAR QUESTÃO COM OPÇÃO DE RESOLVER */}
      {questaoAberta && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 py-8 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setQuestaoAberta(null)}
        >
          <div className="max-w-3xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <button
                onClick={(e) => handleMarcarResolvida(questaoAberta.id, e)}
                disabled={removendoId === questaoAberta.id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {removendoId === questaoAberta.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Marcar como Resolvida (Remover do Caderno)</span>
              </button>

              <button
                onClick={() => setQuestaoAberta(null)}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <QuestaoPreviewCard
              materia={questaoAberta.materia}
              assunto={questaoAberta.assunto}
              dificuldade={questaoAberta.dificuldade}
              enunciado={questaoAberta.enunciado}
              blocosEnunciado={questaoAberta.blocos_enunciado}
              imagemUrl={questaoAberta.imagem_url}
              alternativas={questaoAberta.alternativas || []}
              respostaCorreta={questaoAberta.resposta_correta}
              comentario={questaoAberta.comentario}
              resolucaoVideoUrl={questaoAberta.resolucao_video_url}
            />
          </div>
        </div>
      )}
    </div>
  );
}