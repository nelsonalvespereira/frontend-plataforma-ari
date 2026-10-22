import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, LogOut, X } from 'lucide-react';

// Barra flutuante no rodapé para celular (só abaixo de 1024px, onde a barra lateral some).
// Usada pelo menu do aluno (Sidebar) e pelo do admin (AdminSidebar).
//   itens     -> até 4 atalhos fixos na barra  { to, label, icon, end?, prefixos? }
//   maisItens -> o resto do menu, na gaveta "Mais"
//   onSair    -> botão "Sair da conta" no fim da gaveta

// Reserva espaço no fim das páginas para a barra não cobrir o conteúdo
// (<main> da página ou, se ela não usar <main>, um elemento com a classe area-nav-mobile).
const CSS_MOBILE = `
@media (max-width: 1023.98px) {
  body.com-nav-mobile main,
  body.com-nav-mobile .area-nav-mobile { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
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

export default function BarraNavMobile({ itens, maisItens, onSair }) {
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
  const algumPrincipalAtivo = itens.some(ativoNaBarra);
  const maisAtivo = gavetaAberta || !algumPrincipalAtivo;


  return (
    <>
      <style>{CSS_MOBILE}</style>

      <nav
        aria-label="Menu principal"
        className="lg:hidden fixed inset-x-3 z-40 bottom-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-5 gap-1 p-1.5 h-[68px] rounded-[30px] bg-slate-950/85 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          {itens.map((item) => (
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

