import React, { useEffect, useState } from 'react';
import { Share, PlusSquare, X, Download } from 'lucide-react';
import logo from '../assets/logo-ari.jpeg';

// Aviso "Instale o app" — só no celular e só para quem ainda não instalou o portal.
//   Android/Chrome: botão "Instalar" abre a janela de instalação do próprio celular.
//   iPhone: a Apple não deixa instalar por botão, então mostramos Compartilhar → Tela de Início.
// "Agora não" esconde por 7 dias; depois de instalar, nunca mais aparece.

const CHAVE_ADIADO = 'aviso-instalar-adiado-ate';
const CHAVE_INSTALADO = 'aviso-instalar-instalado';
const ADIAR_DIAS = 7;
const ATRASO_MS = 2000;

// O Chrome dispara este evento uma vez, às vezes antes desta tela abrir. Guardamos já no
// carregamento do arquivo para não perder.
let eventoInstalacao = null;
const ouvintes = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // não deixa o Chrome mostrar a barrinha dele; usamos o nosso aviso
    eventoInstalacao = e;
    ouvintes.forEach((f) => f(e));
  });
  window.addEventListener('appinstalled', () => {
    lerOuGravar(CHAVE_INSTALADO, '1');
    eventoInstalacao = null;
    ouvintes.forEach((f) => f(null));
  });
}

function lerOuGravar(chave, valor) {
  try {
    if (valor === undefined) return window.localStorage.getItem(chave);
    window.localStorage.setItem(chave, valor);
  } catch {
    /* navegação privada: segue sem lembrar */
  }
  return null;
}

function jaInstalado() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    lerOuGravar(CHAVE_INSTALADO) === '1'
  );
}

function ehIphone() {
  const ua = window.navigator.userAgent || '';
  // iPad novo se apresenta como Mac, mas tem tela de toque.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
}

function ehCelular() {
  return window.matchMedia?.('(max-width: 1023px)').matches && window.matchMedia?.('(pointer: coarse)').matches;
}

function adiado() {
  const ate = Number(lerOuGravar(CHAVE_ADIADO));
  return Number.isFinite(ate) && ate > Date.now();
}

export default function AvisoInstalarApp() {
  const [visivel, setVisivel] = useState(false);
  const [evento, setEvento] = useState(eventoInstalacao);
  const iphone = typeof window !== 'undefined' && ehIphone();

  useEffect(() => {
    const ouvir = (e) => {
      setEvento(e);
      if (!e) setVisivel(false); // instalou
    };
    ouvintes.add(ouvir);
    return () => ouvintes.delete(ouvir);
  }, []);

  useEffect(() => {
    if (jaInstalado() || adiado() || !ehCelular()) return undefined;
    const id = setTimeout(() => setVisivel(true), ATRASO_MS);
    return () => clearTimeout(id);
  }, []);

  if (!visivel) return null;
  // Android sem o evento (navegador que não instala): só mostramos no iPhone, que tem os passos.
  if (!iphone && !evento) return null;

  const agoraNao = () => {
    lerOuGravar(CHAVE_ADIADO, String(Date.now() + ADIAR_DIAS * 24 * 60 * 60 * 1000));
    setVisivel(false);
  };

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const escolha = await evento.userChoice.catch(() => null);
    if (escolha?.outcome === 'accepted') {
      lerOuGravar(CHAVE_INSTALADO, '1');
      setVisivel(false);
    }
    eventoInstalacao = null; // o Chrome só deixa usar o evento uma vez
    setEvento(null);
  };

  return (
    <>
      <style>{`
        /* Fundo e cores aqui (e não só em classes do Tailwind): assim o aviso fica certo
           mesmo se o Tailwind não ler este arquivo. */
        .aviso-instalar {
          bottom: calc(16px + env(safe-area-inset-bottom));
          background-color: rgba(15, 23, 42, 0.97);
          border-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .aviso-instalar .icone-compartilhar { color: #38bdf8; }
        body.com-nav-mobile .aviso-instalar { bottom: calc(100px + env(safe-area-inset-bottom)); }
      `}</style>
      <div
        role="dialog"
        aria-label="Instalar o app"
        className="aviso-instalar lg:hidden fixed inset-x-3 z-50 backdrop-blur border rounded-3xl shadow-2xl shadow-black/50 p-4 text-white"
      >
        <div className="flex items-start gap-3">
          <img src={logo} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-black leading-tight">Instale o app no seu celular</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Abre direto pelo ícone, em tela cheia e mais rápido.
            </p>
          </div>
          <button
            type="button"
            onClick={agoraNao}
            aria-label="Fechar"
            className="p-1.5 -m-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {iphone ? (
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2">
              <span className="w-5 h-5 rounded-full bg-brand-orange text-[11px] font-black flex items-center justify-center shrink-0">1</span>
              Toque em <Share className="icone-compartilhar w-4 h-4 shrink-0" aria-hidden /> <strong>Compartilhar</strong>
            </li>
            <li className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2">
              <span className="w-5 h-5 rounded-full bg-brand-orange text-[11px] font-black flex items-center justify-center shrink-0">2</span>
              Escolha <PlusSquare className="w-4 h-4 shrink-0" aria-hidden /> <strong>Adicionar à Tela de Início</strong>
            </li>
          </ol>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={agoraNao}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 cursor-pointer"
          >
            Agora não
          </button>
          {!iphone && (
            <button
              type="button"
              onClick={instalar}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-brand-orange hover:bg-orange-600 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden /> Instalar
            </button>
          )}
        </div>
      </div>
    </>
  );
}