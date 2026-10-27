import React from 'react';
import PlayerProtegido, { extrairIdYoutube } from './PlayerProtegido';

// Resolução da questão para o aluno: vídeo (player protegido, com marca d'água) e/ou texto.
// Usado no Banco de Questões, Simulados e Caderno de Erros.
// Nunca mostra um quadro vazio: sem vídeo e sem texto, avisa que ainda não há resolução.
export default function ResolucaoProfessor({ comentario, videoUrl, titulo = 'Resolução do Professor', className = '' }) {
  const texto = typeof comentario === 'string' ? comentario.trim() : '';
  const temVideo = !!extrairIdYoutube(videoUrl);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
          P
        </div>
        <h4 className="font-black text-slate-800 text-sm">{titulo}</h4>
      </div>

      {temVideo && (
        <div data-resolucao-video className="rounded-xl overflow-hidden bg-black">
          <PlayerProtegido url={videoUrl} titulo={titulo} />
        </div>
      )}

      {texto && (
        <p className="text-sm text-slate-700 font-medium leading-relaxed text-justify whitespace-pre-wrap">{texto}</p>
      )}

      {!temVideo && !texto && (
        <p className="text-sm text-slate-500 font-medium">O professor ainda não publicou a resolução desta questão.</p>
      )}
    </div>
  );
}
