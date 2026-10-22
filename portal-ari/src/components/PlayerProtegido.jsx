import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// =============================================================================
// Player protegido para vídeos do YouTube (grátis, sem serviço novo).
//
// O que ele faz:
//   * Usa o player oficial do YouTube SEM os controles dele (controls=0) e por cima coloca
//     uma camada que recebe todos os cliques. O aluno não consegue clicar no título, no logo,
//     em "Assistir no YouTube", em "Compartilhar", nem nos vídeos sugeridos.
//   * Controles próprios: play/pausa, avançar/voltar 10s, barra de tempo, volume, velocidade
//     e tela cheia (a tela cheia é da NOSSA moldura, então a proteção continua nela).
//   * Marca d'água com o nome e o e-mail do aluno, mudando de lugar: desencoraja gravar a tela.
//   * Bloqueia o clique direito e, no fim do vídeo, cobre a tela de sugestões do YouTube.
//
// O que ele NÃO faz (nenhuma solução grátis com YouTube faz):
//   * Quem souber usar o F12 ainda acha o código do vídeo. Por isso deixe os vídeos como
//     "Não listado" no YouTube: fora do portal ninguém os encontra por busca.
//
// Uso:  <PlayerProtegido ref={playerRef} url={aula.video_url} titulo={aula.titulo} />
//       playerRef.current.irPara(segundos) · playerRef.current.tempoAtual()
// =============================================================================

// Aceita link normal, youtu.be, /embed/, /live/, /shorts/ ou só o ID.
export function extrairIdYoutube(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (/^[\w-]{11}$/.test(u)) return u;
  const m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return m ? m[1] : null;
}

// Carrega a API do YouTube uma única vez para o site inteiro.
let promessaApi = null;
function carregarApiYoutube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promessaApi) return promessaApi;
  promessaApi = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return promessaApi;
}

const fmt = (seg) => {
  const s = Math.max(0, Math.floor(seg || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

const VELOCIDADES = [0.75, 1, 1.25, 1.5, 2];

// Posições da marca d'água (em % da moldura); ela pula de uma para outra.
const POSICOES = [
  { top: '8%', left: '6%' }, { top: '14%', left: '58%' }, { top: '44%', left: '30%' },
  { top: '70%', left: '8%' }, { top: '76%', left: '55%' }, { top: '30%', left: '70%' },
];

const PlayerProtegido = forwardRef(function PlayerProtegido({ url, titulo, inicio = 0, onTerminar, className = '' }, ref) {
  const { profile, user } = useAuth();
  const videoId = extrairIdYoutube(url);

  const molduraRef = useRef(null);
  const alvoRef = useRef(null);
  const playerRef = useRef(null);
  const esconderRef = useRef(null);

  const [pronto, setPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [terminou, setTerminou] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [mudo, setMudo] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);
  const [telaCheiaCss, setTelaCheiaCss] = useState(false); // iPhone: não tem tela cheia de elemento
  const [controlesVisiveis, setControlesVisiveis] = useState(true);
  const [posMarca, setPosMarca] = useState(0);

  // ---------------------------------------------------------- cria o player
  useEffect(() => {
    if (!videoId) return undefined;
    let cancelado = false;
    setPronto(false);
    setCarregando(true);
    setTerminou(false);
    setTocando(false);
    setTempo(0);

    carregarApiYoutube().then((YT) => {
      if (cancelado || !alvoRef.current) return;
      playerRef.current = new YT.Player(alvoRef.current, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3,
          playsinline: 1, cc_load_policy: 0, start: Math.floor(inicio) || 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (cancelado) return;
            setPronto(true);
            setCarregando(false);
            setDuracao(e.target.getDuration() || 0);
            setMudo(e.target.isMuted());
          },
          onStateChange: (e) => {
            const st = e.data;
            setTocando(st === 1);
            setCarregando(st === 3);
            if (st === 1) {
              setTerminou(false);
              setDuracao(e.target.getDuration() || 0);
            }
            if (st === 0) {
              setTerminou(true);
              onTerminar?.();
            }
          },
        },
      });
    });

    return () => {
      cancelado = true;
      try { playerRef.current?.destroy(); } catch { /* já destruído */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Tempo atual (para a barra) enquanto toca.
  useEffect(() => {
    if (!pronto) return undefined;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p?.getCurrentTime) setTempo(p.getCurrentTime());
    }, 500);
    return () => clearInterval(id);
  }, [pronto]);

  // Marca d'água muda de lugar a cada 7 segundos.
  useEffect(() => {
    const id = setInterval(() => setPosMarca((i) => (i + 1) % POSICOES.length), 7000);
    return () => clearInterval(id);
  }, []);

  // ---------------------------------------------------------- ações
  const tocarPausar = useCallback(() => {
    const p = playerRef.current;
    if (!p || !pronto) return;
    if (terminou) { p.seekTo(0, true); p.playVideo(); return; }
    if (tocando) p.pauseVideo(); else p.playVideo();
  }, [pronto, tocando, terminou]);

  const irPara = useCallback((seg, tocar = true) => {
    const p = playerRef.current;
    if (!p || !pronto) return;
    p.seekTo(Math.max(0, seg), true);
    setTempo(Math.max(0, seg));
    if (tocar) p.playVideo();
  }, [pronto]);

  const pular = (delta) => irPara((playerRef.current?.getCurrentTime?.() || 0) + delta, tocando);

  const alternarMudo = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) { p.unMute(); setMudo(false); } else { p.mute(); setMudo(true); }
  };

  const trocarVelocidade = () => {
    const prox = VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length];
    playerRef.current?.setPlaybackRate(prox);
    setVelocidade(prox);
  };

  const alternarTelaCheia = () => {
    const el = molduraRef.current;
    if (!el) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    if (telaCheiaCss) { setTelaCheiaCss(false); return; }
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (pedir) pedir.call(el).catch?.(() => setTelaCheiaCss(true));
    else setTelaCheiaCss(true); // iPhone: ocupa a tela por CSS
  };

  useEffect(() => {
    const aoMudar = () => setTelaCheia(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', aoMudar);
    document.addEventListener('webkitfullscreenchange', aoMudar);
    return () => {
      document.removeEventListener('fullscreenchange', aoMudar);
      document.removeEventListener('webkitfullscreenchange', aoMudar);
    };
  }, []);

  // Controles aparecem ao mexer o mouse/tocar e somem sozinhos durante o vídeo.
  const mostrarControles = () => {
    setControlesVisiveis(true);
    clearTimeout(esconderRef.current);
    esconderRef.current = setTimeout(() => setControlesVisiveis(false), 2800);
  };
  useEffect(() => () => clearTimeout(esconderRef.current), []);

  const aoTeclar = (e) => {
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); tocarPausar(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); pular(10); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pular(-10); }
    else if (e.key === 'f') { e.preventDefault(); alternarTelaCheia(); }
    else if (e.key === 'm') { e.preventDefault(); alternarMudo(); }
    mostrarControles();
  };

  useImperativeHandle(ref, () => ({
    irPara,
    tempoAtual: () => playerRef.current?.getCurrentTime?.() || 0,
  }), [irPara]);

  // ---------------------------------------------------------- sem YouTube
  if (!videoId) {
    // Link que não é do YouTube (ex.: Vimeo): mostra como antes, sem as proteções extras.
    const seguro = typeof url === 'string' && url.startsWith('https://') ? url : '';
    return (
      <div className={`aspect-video bg-black rounded-2xl overflow-hidden ${className}`}>
        {seguro ? (
          <iframe className="w-full h-full" src={seguro} title={titulo} frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-medium">Vídeo ainda não disponível.</div>
        )}
      </div>
    );
  }

  const pct = duracao ? Math.min(100, (tempo / duracao) * 100) : 0;
  const mostrarBarra = controlesVisiveis || !tocando;
  const nomeMarca = [profile?.nome, user?.email].filter(Boolean).join(' · ');
  const cheia = telaCheia || telaCheiaCss;

  return (
    <div
      ref={molduraRef}
      tabIndex={0}
      onKeyDown={aoTeclar}
      onMouseMove={mostrarControles}
      onTouchStart={mostrarControles}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative bg-black overflow-hidden select-none outline-none group ${
        telaCheiaCss ? 'fixed inset-0 z-[100] rounded-none' : cheia ? '' : `aspect-video rounded-xl md:rounded-2xl ${className}`
      } ${cheia ? 'w-full h-full' : ''}`}
    >
      {/* Player do YouTube: sem controles próprios e sem receber cliques */}
      <div className="absolute inset-0 pointer-events-none [&>iframe]:w-full [&>iframe]:h-full">
        <div ref={alvoRef} />
      </div>

      {/* Camada que recebe TODOS os cliques (bloqueia título, logo, "Assistir no YouTube"...) */}
      <button
        type="button"
        aria-label={tocando ? 'Pausar' : 'Reproduzir'}
        onClick={tocarPausar}
        onDoubleClick={alternarTelaCheia}
        className="absolute inset-0 z-10 w-full h-full cursor-pointer"
      />

      {/* Tarjas que cobrem o topo (título/canal) e o canto do logo do YouTube */}
      <div className={`absolute inset-x-0 top-0 h-16 z-[11] pointer-events-none bg-gradient-to-b from-black/90 to-transparent transition-opacity ${tocando && !mostrarBarra ? 'opacity-0' : 'opacity-100'}`} />

      {/* Marca d'água com o aluno */}
      {nomeMarca && (
        <div
          className="absolute z-[12] pointer-events-none text-white/25 text-[11px] md:text-sm font-bold whitespace-nowrap transition-all duration-[1500ms] ease-in-out"
          style={POSICOES[posMarca]}
        >
          {nomeMarca}
        </div>
      )}

      {/* Carregando / botão grande de play / fim do vídeo */}
      {(carregando || !pronto) && !terminou && (
        <div className="absolute inset-0 z-[13] flex items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-white/80 animate-spin" />
        </div>
      )}
      {pronto && !tocando && !carregando && !terminou && (
        <div className="absolute inset-0 z-[13] flex items-center justify-center pointer-events-none">
          <span className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-orange/90 flex items-center justify-center shadow-2xl">
            <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" />
          </span>
        </div>
      )}
      {terminou && (
        <div className="absolute inset-0 z-[20] bg-slate-950 flex flex-col items-center justify-center gap-3 text-center p-6">
          <p className="text-white font-black text-lg">Fim da aula</p>
          <button
            type="button"
            onClick={tocarPausar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Assistir de novo
          </button>
        </div>
      )}

      {/* Barra de controles */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[15] px-3 md:px-4 pb-2.5 md:pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          mostrarBarra && !terminou ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <input
          type="range"
          min={0}
          max={duracao || 0}
          step="0.1"
          value={Math.min(tempo, duracao || 0)}
          onChange={(e) => irPara(Number(e.target.value), tocando)}
          aria-label="Posição do vídeo"
          className="w-full h-1.5 accent-orange-500 cursor-pointer mb-2"
          style={{ background: `linear-gradient(to right, #f97316 ${pct}%, rgba(255,255,255,.25) ${pct}%)` }}
        />
        <div className="flex items-center gap-1 md:gap-2 text-white">
          <button type="button" onClick={tocarPausar} className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 cursor-pointer" aria-label={tocando ? 'Pausar' : 'Reproduzir'}>
            {tocando ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </button>
          <button type="button" onClick={() => pular(-10)} className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 cursor-pointer" aria-label="Voltar 10 segundos">
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
          <button type="button" onClick={() => pular(10)} className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 cursor-pointer" aria-label="Avançar 10 segundos">
            <RotateCw className="w-4.5 h-4.5" />
          </button>
          <button type="button" onClick={alternarMudo} className="hidden sm:block p-2 rounded-lg hover:bg-white/10 cursor-pointer" aria-label={mudo ? 'Ativar som' : 'Silenciar'}>
            {mudo ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="text-xs md:text-sm font-semibold tabular-nums text-white/90 ml-1">
            {fmt(tempo)} <span className="text-white/50">/ {fmt(duracao)}</span>
          </span>
          <div className="flex-1" />
          <button type="button" onClick={trocarVelocidade} className="px-2 py-1 rounded-lg hover:bg-white/10 text-xs md:text-sm font-bold tabular-nums cursor-pointer" aria-label="Velocidade">
            {String(velocidade).replace('.', ',')}x
          </button>
          <button type="button" onClick={alternarTelaCheia} className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 cursor-pointer" aria-label={cheia ? 'Sair da tela cheia' : 'Tela cheia'}>
            {cheia ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
});

export default PlayerProtegido;
