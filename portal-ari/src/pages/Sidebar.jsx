import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ListOrdered, Target, PlayCircle, Radio, TrendingUp,
  Trophy, LogOut, Calendar, AlertCircle, Bookmark,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import logoAri from '../assets/logo-ari.jpeg';

const NAV_ITEMS_SECONDARY = [
  { to: '/desempenho', label: 'Meu Desempenho', icon: TrendingUp },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/plano-estudos', label: 'Plano de Estudos', icon: Calendar },
  { to: '/caderno-erros', label: 'Caderno de Erros', icon: AlertCircle },
  { to: '/favoritos', label: 'Favoritos', icon: Bookmark },
];

const navLinkClass = ({ isActive }) =>
  `flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
    isActive
      ? 'bg-brand-orange/10 text-brand-orange'
      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
  }`;

export default function Sidebar() {
  const navigate = useNavigate();
  const [isEnem, setIsEnem] = useState(false);

  useEffect(() => {
    async function verificarTurmaEnem() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Busca o perfil do aluno para verificar o curso/turma
        const { data: profile } = await supabase
          .from('profiles')
          .select('curso, turma') // ajuste conforme a coluna que define a turma no seu banco
          .eq('id', user.id)
          .single();

        if (profile) {
          const valorCurso = (profile.curso || profile.turma || '').toLowerCase();
          // Se o curso ou turma contiver "enem", libera o link
          if (valorCurso.includes('enem')) {
            setIsEnem(true);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar turma do aluno:', err);
      }
    }

    verificarTurmaEnem();
  }, []);

  return (
    <aside className="w-64 bg-slate-950 flex-col hidden lg:flex shrink-0">
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800/60">
        <img
          src={logoAri}
          alt="Aritmática Gabaritando"
          className="w-8 h-8 rounded-lg object-cover shrink-0"
        />
        <span className="text-sm font-black text-white tracking-wide leading-tight">
          ARITMÁTICA <span className="text-brand-orange">GABARITANDO</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
          Plataforma
        </p>
        
        <NavLink to="/dashboard" end className={navLinkClass}>
          <LayoutDashboard className="w-4.5 h-4.5 mr-3 shrink-0" />
Dashboard
        </NavLink>
        
        <NavLink to="/banco-questoes" className={navLinkClass}>
          <FileText className="w-4.5 h-4.5 mr-3 shrink-0" />
          Banco de Questões
        </NavLink>

        {/* Aparece EXCLUSIVAMENTE se for da turma do ENEM */}
        {isEnem && (
          <NavLink to="/assuntos-enem" className={navLinkClass}>
            <ListOrdered className="w-4.5 h-4.5 mr-3 shrink-0" />
            Assuntos do ENEM
          </NavLink>
        )}

        <NavLink to="/simulados" className={navLinkClass}>
          <Target className="w-4.5 h-4.5 mr-3 shrink-0" />
          Simulados
        </NavLink>
        
        <NavLink to="/player" className={navLinkClass}>
          <PlayCircle className="w-4.5 h-4.5 mr-3 shrink-0" />
          Videoaulas
        </NavLink>
        
        <NavLink to="/lives" className={navLinkClass}>
          <Radio className="w-4.5 h-4.5 mr-3 shrink-0" />
          Lives
        </NavLink>

        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-6 mb-2">
          Acompanhamento
        </p>
        {NAV_ITEMS_SECONDARY.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon className="w-4.5 h-4.5 mr-3 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-full py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </button>
      </div>
   </aside>
  );
}