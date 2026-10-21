import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const dois = (n) => String(n).padStart(2, '0');

// Contagem regressiva até o fim do pack. Quando chega a zero, o AuthProvider tira o aluno da área.
export default function PackContagem({ expiraEm }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiraEm) return null;

  const restante = Math.max(0, expiraEm.getTime() - agora);
  const totalSeg = Math.floor(restante / 1000);
  const dias = Math.floor(totalSeg / 86400);
  const horas = Math.floor((totalSeg % 86400) / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  const acabando = restante < 60 * 60 * 1000; // menos de 1 hora

  const texto = `${dias > 0 ? `${dias}d ` : ''}${dois(horas)}:${dois(min)}:${dois(seg)}`;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
        acabando
          ? 'bg-red-500/10 text-red-400 border-red-500/30'
          : 'bg-orange-500/10 text-brand-orange border-orange-500/20'
      }`}
      title={`Acesso até ${expiraEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Seu acesso expira em</span>
      <span className="tabular-nums">{restante === 0 ? 'encerrando…' : texto}</span>
    </div>
  );
}
