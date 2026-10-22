import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ListOrdered, Target, PlayCircle, Radio, TrendingUp,
  Trophy, LogOut, Calendar, AlertCircle, Bookmark, ShoppingBag, LayoutGrid, X,
} from 'lucide-react';
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

// ---------------------------------------------------------------- MOBILE
// Barra flutuante no rodapé (só abaixo de 1024px, onde a barra lateral some).
// 4 atalhos principais + "Mais", que abre uma gaveta com o resto do menu.
const BARRA_MOBILE = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/banco-questoes', label: 'Questões', icon: FileText },
  { to: '/player', label: 'Aulas', icon: PlayCircle },
  { to: '/packs', label: 'Packs', icon: ShoppingBag, prefixos: ['/pack/'] },
];

// Reserva espaço no fim das páginas para a barra não cobrir o conteúdo.
const CSS_MOBILE = `
@media (max-width: 1023.98px) {
  body.com-nav-mobile main { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
}
@keyframes gaveta-sobe { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes gaveta-fundo { from { opacity: 0; } to { opacity: 1; } }
`;

function Botao({ ativo, icon: Icon, label }) {
  return (
    <span
      className={`flex flex-col items-center justify-center gap-1 h-full rounded-[22px] transition-colors ${
        ativo ? 'bg-white/10 text-white' : 'text-slate-400 active:bg-white/5'
      }`}
    >
      <Icon className={`w-[22px] h-[22px] ${ativo ? 'text-brand-orange' : ''}`} strokeWidth={ativo ? 2.4 : 2} />
      <span className={`text-[11px] leading-none ${ativo ? 'font-bold' : 'font-semibold'}`}>{label}</span>
    </span>
  );
}

function BarraMobile({ maisItens, onSair }) {
  const { pathname } = useLocation();
  const [gavetaAberta, setGavetaAberta] = useState(false);

  useEffect(() => {
    document.body.classList.add('com-nav-mobile');
    return () => document.body.classList.remove('com-nav-mobile');
  }, []);

  // Fecha a gaveta ao trocar de página.
  useEffect(() => setGavetaAberta(false), [pathname]);

  const ativoNaBarra = (item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
      || (item.prefixos ?? []).some((p) => pathname.startsWith(p));
  const algumPrincipalAtivo = BARRA_MOBILE.some(ativoNaBarra);
  const maisAtivo = gavetaAberta || !algumPrincipalAtivo;


  return (
    <>
      <style>{CSS_MOBILE}</style>

      <nav
        aria-label="Menu principal"
        className="lg:hidden fixed inset-x-3 z-40 bottom-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-5 gap-1 p-1.5 h-[68px] rounded-[30px] bg-slate-950/85 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          {BARRA_MOBILE.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} className="h-full">
              <Botao ativo={ativoNaBarra(item) && !gavetaAberta} icon={item.icon} label={item.label} />
            </NavLink>
          ))}
          <button onClick={() => setGavetaAberta((v) => !v)} aria-expanded={gavetaAberta} className="h-full cursor-pointer">
            <Botao ativo={maisAtivo} icon={gavetaAberta ? X : LayoutGrid} label="Mais" />
          </button>
        </div>
      </nav>

      {gavetaAberta && (
        <div className="lg:hidden fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button
            aria-label="Fechar"
            onClick={() => setGavetaAberta(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            style={{ animation: 'gaveta-fundo .2s ease-out' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-slate-950 border-t border-white/10 rounded-t-[28px] px-4 pt-3 pb-[calc(100px+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto"
            style={{ animation: 'gaveta-sobe .25s ease-out' }}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {maisItens.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl text-center transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-slate-300 active:bg-white/10'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-brand-orange' : ''}`} />
                      <span className="text-xs font-semibold leading-tight">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
            <button
              onClick={onSair}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-red-400 bg-red-500/10 active:bg-red-500/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
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
  ];

  return (
    <>
    <BarraMobile maisItens={maisItens} onSair={sair} />
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