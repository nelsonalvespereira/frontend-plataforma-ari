import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ListOrdered, Target, PlayCircle, Radio, TrendingUp,
  Trophy, LogOut, Calendar, AlertCircle, Bookmark, ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import BarraNavMobile from '../components/BarraNavMobile';
import { useAuth } from '../hooks/useAuth';
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

// Atalhos fixos da barra do celular; o resto vai para a gaveta "Mais".
const BARRA_MOBILE = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/banco-questoes', label: 'Questões', icon: FileText },
  { to: '/player', label: 'Aulas', icon: PlayCircle },
  { to: '/packs', label: 'Packs', icon: ShoppingBag, prefixos: ['/pack/'] },
];

// ocultarNoComputador: telas de "foco" (videoaula) escondem a barra lateral no computador
// para o conteúdo ganhar espaço. No celular a barra do rodapé continua aparecendo.
export default function Sidebar({ ocultarNoComputador = false }) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  // A turma vem do perfil já carregado (profiles.turma_id -> turmas.slug / nome).
  const turma = `${profile?.turmas?.slug ?? ''} ${profile?.turmas?.nome ?? ''}`.toLowerCase();
  const isEnem = turma.includes('enem');

  const sair = async () => {
    await signOut();
    navigate('/login');
  };

  // Tudo que não está na barra do rodapé vai para a gaveta "Mais".
  const maisItens = [
    { to: '/simulados', label: 'Simulados', icon: Target },
    { to: '/lives', label: 'Lives', icon: Radio },
    ...(isEnem ? [{ to: '/assuntos-enem', label: 'Assuntos do ENEM', icon: ListOrdered }] : []),
    ...NAV_ITEMS_SECONDARY,
    { to: '/termos', label: 'Termos e privacidade', icon: ShieldCheck },
  ];

  return (
    <>
    <BarraNavMobile itens={BARRA_MOBILE} maisItens={maisItens} onSair={sair} />
    <aside className={`w-64 bg-slate-950 flex-col hidden shrink-0 ${ocultarNoComputador ? '' : 'lg:flex'}`}>
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800/60">
        <img
          src={logoAri}
          alt="Arimática Gabaritando"
          className="w-8 h-8 rounded-lg object-cover shrink-0"
        />
        <span className="text-sm font-black text-white tracking-wide leading-tight">
          Arimática <span className="text-brand-orange">GABARITANDO</span>
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

        {/* Aparece só para a turma do ENEM */}
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

        {/* Loja de Packs: fica ativo também dentro de um pack (/pack/...) */}
        <NavLink
          to="/packs"
          className={({ isActive }) =>
            navLinkClass({ isActive: isActive || window.location.pathname.startsWith('/pack/') })
          }
        >
          <ShoppingBag className="w-4.5 h-4.5 mr-3 shrink-0" />
          Packs Avulsos
          <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-brand-orange/15 text-brand-orange">
            Novo
          </span>
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
          onClick={sair}
          className="flex items-center justify-center w-full py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </button>
      </div>
    </aside>
    </>
  );
}
