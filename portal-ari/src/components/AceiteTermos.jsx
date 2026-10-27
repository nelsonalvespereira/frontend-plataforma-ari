import React from 'react';
import { Link } from 'react-router-dom';

// Caixa "Li e aceito os Termos..." usada nos cadastros (Login e Convite).
// escuro = true no visual escuro (página de convite).
export default function AceiteTermos({ marcado, onChange, escuro = false }) {
  const link = escuro ? 'text-brand-orange hover:underline font-semibold' : 'text-brand-orange hover:text-orange-600 font-bold';
  return (
    <label className={`flex items-start gap-2.5 text-sm cursor-pointer ${escuro ? 'text-slate-300' : 'text-slate-600 font-medium'}`}>
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-orange-500 cursor-pointer"
      />
      <span>
        Li e aceito os{' '}
        <Link to="/termos" target="_blank" rel="noopener" className={link}>Termos de uso</Link>{' '}
        e a{' '}
        <Link to="/privacidade" target="_blank" rel="noopener" className={link}>Política de privacidade</Link>.
      </span>
    </label>
  );
}

export const MSG_ACEITE = 'Para criar a conta, aceite os Termos de uso e a Política de privacidade.';
