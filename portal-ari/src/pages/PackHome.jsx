import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListChecks, LogOut, Radio, Video } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PackContagem from '../components/pack/PackContagem';
import PackAulao from '../components/pack/PackAulao';
import PackQuestoes from '../components/pack/PackQuestoes';
import PackLives from '../components/pack/PackLives';

const ABAS = [
  { id: 'aulao', rotulo: 'Aulão', icone: Video },
  { id: 'questoes', rotulo: 'Questões', icone: ListChecks },
  { id: 'lives', rotulo: 'Lives', icone: Radio },
];

// Área do Pack Avulso: Aulão, Questões e Lives marcados como do pack.
export default function PackHome() {
  const navigate = useNavigate();
  const { profile, packAtivo, packExpiraEm, temAssinatura, signOut } = useAuth();
  const [aba, setAba] = useState('aulao');

  const sair = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 h-16 flex items-center justify-between gap-3 sticky top-0 z-10">
        <div className="min-w-0">
          <p className="font-black text-lg leading-none">Pack <span className="text-brand-orange">Aulão</span></p>
          <p className="text-xs text-slate-500 mt-1 truncate">Olá, {profile?.nome || 'aluno'}</p>
        </div>

        <div className="flex items-center gap-3">
          {packAtivo && !temAssinatura && <PackContagem expiraEm={packExpiraEm} />}
          {(temAssinatura || profile?.is_admin) && (
            <Link
              to={profile?.is_admin ? '/admin' : '/dashboard'}
              className="text-sm font-bold text-slate-300 hover:text-brand-orange"
            >
              {profile?.is_admin ? 'Admin' : 'Meu painel'}
            </Link>
          )}
          <button
            onClick={sair}
            title="Sair"
            aria-label="Sair"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <nav className="flex gap-2 mb-6 overflow-x-auto" role="tablist">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                aba === id
                  ? 'bg-brand-orange text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Icone className="w-4 h-4" /> {rotulo}
            </button>
          ))}
        </nav>

        {aba === 'aulao' && <PackAulao />}
        {aba === 'questoes' && <PackQuestoes />}
        {aba === 'lives' && <PackLives />}
      </main>
    </div>
  );
}
