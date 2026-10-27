import React from 'react';
import { BookOpen } from 'lucide-react';
import RenderBlocos from './RenderBlocos';
import ResolucaoProfessor from './ResolucaoProfessor';

const DIFICULDADE_STYLE = {
  facil: 'bg-emerald-50 text-emerald-700',
  medio: 'bg-amber-50 text-amber-700',
  dificil: 'bg-red-50 text-red-700',
};
const DIFICULDADE_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

// Card usado tanto no preview ao vivo (Nova Questão) quanto na
// visualização de uma questão já cadastrada (Simulados e Questões).
// Fiel ao card que o aluno vê no Banco de Questões.
// Suporta o formato antigo (enunciado texto + imagem_url única) e o
// novo formato de blocos (blocosEnunciado / alternativas com blocos).
export default function QuestaoPreviewCard({
  materia,
  assunto,
  dificuldade = 'medio',
  enunciado,
  blocosEnunciado,
  imagemUrl,
  alternativas = [],
  respostaCorreta,
  comentario,
  resolucaoVideoUrl,
}) {
  const temBlocos = blocosEnunciado && blocosEnunciado.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {materia || 'Matéria'}
          </span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
            {assunto || 'Assunto'}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${DIFICULDADE_STYLE[dificuldade]}`}>
            {DIFICULDADE_LABEL[dificuldade]}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-slate-800 font-medium leading-relaxed mb-5 whitespace-pre-wrap text-justify">
          {temBlocos ? (
            <RenderBlocos blocos={blocosEnunciado} placeholder="O enunciado aparece aqui conforme você digita..." />
          ) : (
            enunciado || <span className="text-slate-300 italic">O enunciado aparece aqui conforme você digita...</span>
          )}
        </p>

        {imagemUrl && (
          <img src={imagemUrl} alt="Gráfico" className="rounded-xl border border-slate-200 max-h-56 mx-auto mb-5 object-contain" />
        )}

        <div className="space-y-2.5">
          {alternativas.map((alt) => (
            <div
              key={alt.letra}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border ${
                respostaCorreta === alt.letra ? 'border-brand-orange bg-orange-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                respostaCorreta === alt.letra ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {alt.letra}
              </div>
              <span className="font-medium text-sm text-slate-700">
                {alt.blocos && alt.blocos.length > 0 ? (
                  <RenderBlocos blocos={alt.blocos} imgHeight="h-8" placeholder={`Alternativa ${alt.letra}`} />
                ) : (
                  alt.texto || <span className="text-slate-300 italic">Alternativa {alt.letra}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(comentario?.trim() || resolucaoVideoUrl) && (
        <div className="px-5 py-4 bg-orange-50/60 border-t border-orange-100">
          <ResolucaoProfessor comentario={comentario} videoUrl={resolucaoVideoUrl} />
        </div>
      )}
    </div>
  );
}