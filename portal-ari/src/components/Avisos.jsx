import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

// Avisos do portal (no lugar de alert() e confirm() do navegador).
//
//   const avisos = useAvisos();
//   avisos.sucesso('Aula concluída!');
//   avisos.erro('Não foi possível salvar.');
//   avisos.info('Seu acesso vence amanhã.');
//   if (await avisos.confirmar({ titulo: 'Excluir aluno?', mensagem: '...', confirmarTexto: 'Excluir', perigo: true })) { ... }
//
// O <AvisosProvider> fica no App.jsx, em volta das rotas.

const AvisosContext = createContext(null);

const DURACAO = { sucesso: 4000, info: 4500, erro: 6500 };

const ESTILO = {
  sucesso: { icone: CheckCircle2, cor: 'text-emerald-400', borda: 'border-emerald-500/40' },
  erro: { icone: AlertCircle, cor: 'text-red-400', borda: 'border-red-500/50' },
  info: { icone: Info, cor: 'text-sky-400', borda: 'border-white/15' },
};

let proximoId = 1;

export function AvisosProvider({ children }) {
  const [lista, setLista] = useState([]);
  const [pergunta, setPergunta] = useState(null); // { titulo, mensagem, confirmarTexto, cancelarTexto, perigo, responder }
  const timers = useRef(new Map());

  const fechar = useCallback((id) => {
    setLista((l) => l.filter((a) => a.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const mostrar = useCallback((tipo, texto) => {
    const id = proximoId++;
    setLista((l) => [...l.slice(-3), { id, tipo, texto: String(texto ?? '') }]); // no máximo 4 na tela
    timers.current.set(id, setTimeout(() => fechar(id), DURACAO[tipo] ?? 4000));
    return id;
  }, [fechar]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const confirmar = useCallback(
    (opcoes = {}) =>
      new Promise((resolve) => {
        const o = typeof opcoes === 'string' ? { titulo: opcoes } : opcoes;
        setPergunta({ ...o, responder: resolve });
      }),
    []
  );

  const responder = (valor) => {
    pergunta?.responder(valor);
    setPergunta(null);
  };

  const valor = useMemo(
    () => ({
      sucesso: (t) => mostrar('sucesso', t),
      erro: (t) => mostrar('erro', t),
      info: (t) => mostrar('info', t),
      confirmar,
    }),
    [mostrar, confirmar]
  );

  return (
    <AvisosContext.Provider value={valor}>
      {children}

      <style>{`
        .avisos-pilha { bottom: calc(16px + env(safe-area-inset-bottom)); }
        body.com-nav-mobile .avisos-pilha { bottom: calc(100px + env(safe-area-inset-bottom)); }
        @media (min-width: 1024px) { body.com-nav-mobile .avisos-pilha, .avisos-pilha { bottom: 24px; } }
        @keyframes aviso-entrar { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        .aviso-entrar { animation: aviso-entrar .18s ease-out; }
      `}</style>

      <div className="avisos-pilha fixed z-[110] inset-x-3 lg:inset-x-auto lg:right-6 lg:w-96 flex flex-col gap-2 pointer-events-none">
        {lista.map((a) => {
          const e = ESTILO[a.tipo] ?? ESTILO.info;
          const Icone = e.icone;
          return (
            <div
              key={a.id}
              data-aviso={a.tipo}
              role={a.tipo === 'erro' ? 'alert' : 'status'}
              className={`aviso-entrar pointer-events-auto flex items-start gap-3 rounded-2xl border ${e.borda} bg-slate-900 text-white shadow-2xl shadow-black/40 px-4 py-3`}
            >
              <Icone className={`w-5 h-5 mt-0.5 shrink-0 ${e.cor}`} aria-hidden />
              <p className="flex-1 text-sm font-semibold leading-snug whitespace-pre-line">{a.texto}</p>
              <button
                type="button"
                onClick={() => fechar(a.id)}
                aria-label="Fechar aviso"
                className="p-1 -m-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {pergunta && <JanelaConfirmar pergunta={pergunta} responder={responder} />}
    </AvisosContext.Provider>
  );
}

function JanelaConfirmar({ pergunta, responder }) {
  const { titulo = 'Tem certeza?', mensagem, confirmarTexto = 'Confirmar', cancelarTexto = 'Cancelar', perigo = false } = pergunta;
  const cancelarRef = useRef(null);
  const confirmarRef = useRef(null);

  useEffect(() => {
    // Ação perigosa: o foco começa no "Cancelar" (Enter sem querer não apaga nada).
    (perigo ? cancelarRef : confirmarRef).current?.focus();
    const aoTeclar = (e) => { if (e.key === 'Escape') responder(false); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={() => responder(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        className="aviso-entrar relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 pb-[calc(24px+env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${perigo ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-brand-orange'}`}>
            {perigo ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h2 id="confirmar-titulo" className="text-lg font-black text-slate-900 leading-tight">{titulo}</h2>
            {mensagem && <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-line">{mensagem}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            ref={cancelarRef}
            type="button"
            onClick={() => responder(false)}
            className="px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            {cancelarTexto}
          </button>
          <button
            ref={confirmarRef}
            type="button"
            onClick={() => responder(true)}
            className={`px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer ${perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-orange hover:bg-orange-600'}`}
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}

// Fora do <AvisosProvider> (não deveria acontecer) cai no alert/confirm do navegador,
// para nunca quebrar a tela.
const RESERVA = {
  sucesso: (t) => window.alert(t),
  erro: (t) => window.alert(t),
  info: (t) => window.alert(t),
  confirmar: async (o = {}) => window.confirm([o.titulo, o.mensagem].filter(Boolean).join('\n\n')),
};

export function useAvisos() {
  return useContext(AvisosContext) ?? RESERVA;
}
