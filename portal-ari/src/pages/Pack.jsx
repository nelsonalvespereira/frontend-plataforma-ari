import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  PlayCircle, FileText, Radio, Clock, ExternalLink, LogOut, Timer, Loader2, CalendarClock,
  ArrowLeft, Lock, ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, Info, Package, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PlayerProtegido from '../components/PlayerProtegido';
import { usePackDetalhe, usePackItens, useRestante } from '../hooks/usePack';
import { abrirMaterialPrivado, formatarRestante, formatarUrlEmbed, linkSeguro, rotuloDuracao, statusDaLive } from '../lib/packUtils';

const formatarPreco = (centavos) =>
  ((centavos ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const GRUPOS = [
  { tipo: 'aulao', titulo: 'Aulão', icon: PlayCircle },
  { tipo: 'questoes', titulo: 'Questões e resoluções', icon: FileText },
  { tipo: 'live', titulo: 'Lives', icon: Radio },
];

const STATUS_LIVE = {
  agendada: { label: 'Agendada', cls: 'bg-blue-500/15 text-blue-300' },
  ao_vivo: { label: 'Ao vivo', cls: 'bg-red-500/20 text-red-300 animate-pulse' },
  encerrada: { label: 'Gravação', cls: 'bg-slate-700/60 text-slate-300' },
};

// Item pode tocar no player principal? (aulão com vídeo, resolução em vídeo, live que já começou)
function assistivel(item, agora) {
  if (!formatarUrlEmbed(item.video_url)) return false;
  if (item.tipo !== 'live') return true;
  return item.data_hora ? statusDaLive(item.data_hora, item.duracao_min, agora) !== 'agendada' : true;
}

function Player({ item }) {
  const src = formatarUrlEmbed(item?.video_url);
  if (src.includes('youtube.com/embed/')) {
    return <PlayerProtegido key={`${item.id}:${src}`} url={src} titulo={item.titulo} className="border border-slate-800 shadow-2xl shadow-black/40" />;
  }
  if (!src) {
    return (
      <div className="aspect-video bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 text-sm font-medium p-6 text-center">
        <PlayCircle className="w-10 h-10 text-slate-700" />
        {item?.tipo === 'questoes' ? 'Esta lista não tem resolução em vídeo. Abra o PDF abaixo.' : 'Vídeo ainda não disponível.'}
      </div>
    );
  }
  return (
    <div className="aspect-video bg-black rounded-xl md:rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <iframe className="w-full h-full" src={src} title={item.titulo} frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  );
}

// PDF privado (link temporário gerado no clique) ou, nos itens antigos, link externo.
function BotaoMaterial({ item, children, className }) {
  const [abrindo, setAbrindo] = useState(false);

  if (item.arquivo_path) {
    const abrir = async () => {
      setAbrindo(true);
      try {
        await abrirMaterialPrivado(item.arquivo_path);
      } catch (e) {
        alert(`${e.message} Se o seu acesso acabou de vencer, atualize a página.`);
      } finally {
        setAbrindo(false);
      }
    };
    return (
      <button onClick={abrir} disabled={abrindo} className={`${className} cursor-pointer disabled:opacity-60`}>
        {abrindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {children}
      </button>
    );
  }

  const link = linkSeguro(item.link_url);
  if (!link) return null;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={className}>
      <ExternalLink className="w-4 h-4" /> {children}
    </a>
  );
}

function TelaSimples({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col">
      <header className="h-16 border-b border-slate-800 px-4 md:px-6 flex items-center gap-3">
        <Link to="/packs" className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700" title="Voltar aos packs">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </Link>
        <span className="text-white font-bold">Packs Avulsos</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-5">{children}</main>
    </div>
  );
}

// /pack/:priceId — conteúdo de um pack, no mesmo formato do player de videoaulas.
export default function Pack() {
  const { priceId: priceIdUrl } = useParams();
  const priceId = priceIdUrl ? decodeURIComponent(priceIdUrl) : '';
  const navigate = useNavigate();
  const { user, profile, temAcesso, signOut, recarregarPerfil } = useAuth();
  const ehAdmin = !!profile?.is_admin;

  const { pack, expiraEm, loading: carregandoPack } = usePackDetalhe(priceId, user?.id);
  const liberado = ehAdmin || !!expiraEm;
  const { aulas, questoes, lives, loading, erro, recarregar } = usePackItens(liberado ? priceId : null);

  const restanteMs = useRestante(!ehAdmin && expiraEm ? expiraEm.getTime() : 0);
  const poucoTempo = !ehAdmin && expiraEm && restanteMs > 0 && restanteMs < 3600000;
  const acabou = !ehAdmin && !!expiraEm && restanteMs === 0;

  const [atualId, setAtualId] = useState(null);
  const [cinema, setCinema] = useState(false);
  const topoRef = useRef(null);

  // Relógio para o status das lives (agendada → ao vivo) sem recarregar.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Quando o prazo acaba com o aluno na página: recarrega (a RLS já esconde o conteúdo).
  useEffect(() => {
    if (!acabou) return;
    recarregar();
    recarregarPerfil?.();
  }, [acabou, recarregar, recarregarPerfil]);

  const grupos = useMemo(() => ({ aulao: aulas, questoes, live: lives }), [aulas, questoes, lives]);
  const todos = useMemo(() => [...aulas, ...questoes, ...lives], [aulas, questoes, lives]);
  const tocaveis = useMemo(() => todos.filter((i) => assistivel(i, agora)), [todos, agora]);

  // Item atual: o escolhido, ou o primeiro vídeo do pack (normalmente o aulão).
  const atual = todos.find((i) => i.id === atualId) ?? tocaveis[0] ?? todos[0] ?? null;
  const posTocavel = atual ? tocaveis.findIndex((i) => i.id === atual.id) : -1;
  const anterior = posTocavel > 0 ? tocaveis[posTocavel - 1] : null;
  const proximo = posTocavel >= 0 && posTocavel < tocaveis.length - 1 ? tocaveis[posTocavel + 1] : null;

  const abrir = (item) => {
    if (!item) return;
    setAtualId(item.id);
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!priceId) return <Navigate to="/packs" replace />;
  if (carregandoPack) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-orange" />
      </div>
    );
  }

  const comprar = () => navigate(`/pagamento?plano=${encodeURIComponent(priceId)}&voltar=packs`);

  if (!pack) {
    return (
      <TelaSimples>
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-black text-white">Pack não encontrado</h1>
          <p className="text-sm text-slate-400">Ele pode ter saído de venda.</p>
          <Link to="/packs" className="inline-flex px-5 py-3 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl">
            Ver packs disponíveis
          </Link>
        </div>
      </TelaSimples>
    );
  }

  if (!liberado || acabou) {
    return (
      <TelaSimples>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 max-w-md w-full">
          <div className="w-14 h-14 bg-brand-orange/10 text-brand-orange rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-white">{acabou ? 'Seu acesso a este pack terminou' : pack.nome}</h1>
          {pack.descricao && <p className="text-sm text-slate-300 whitespace-pre-wrap">{pack.descricao}</p>}
          <p className="text-sm text-slate-400">
            {formatarPreco(pack.valor_centavos)} · pagamento único · {rotuloDuracao(pack.duracao_dias)} de acesso
          </p>
          <button onClick={comprar} className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl cursor-pointer">
            {acabou ? 'Comprar de novo' : 'Comprar este pack'}
          </button>
        </div>
      </TelaSimples>
    );
  }

  const statusAtual = atual?.tipo === 'live' && atual.data_hora ? statusDaLive(atual.data_hora, atual.duracao_min, agora) : null;
  const totalItens = todos.length;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 font-sans overflow-hidden">
      {/* TOPO: voltar, nome do pack, tempo restante */}
      <header className="h-16 bg-slate-900/80 border-b border-slate-800 px-4 md:px-6 flex items-center gap-3 md:gap-4 shrink-0">
        <Link to="/packs" className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors shrink-0" title="Voltar aos packs">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-orange truncate flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 shrink-0" /> Pack avulso
          </p>
          <p className="text-sm font-bold text-white truncate">{pack.nome}</p>
        </div>

        {!ehAdmin && expiraEm && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 ${
              poucoTempo ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-slate-800 text-slate-200 border-slate-700'
            }`}
            title={`Acesso até ${expiraEm.toLocaleString('pt-BR')}`}
          >
            <Timer className="w-4 h-4 text-brand-orange" />
            <span className="hidden sm:inline">Acaba em</span>
            <span className="tabular-nums">{formatarRestante(restanteMs)}</span>
          </div>
        )}
        {ehAdmin && !expiraEm && (
          <span className="hidden sm:inline px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">Visão do admin</span>
        )}

        {temAcesso ? (
          <Link to="/dashboard" className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 shrink-0" title="Ir para o painel">
            <LayoutDashboard className="w-5 h-5 text-slate-300" />
          </Link>
        ) : (
          <button onClick={signOut} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 shrink-0 cursor-pointer" title="Sair">
            <LogOut className="w-5 h-5 text-slate-300" />
          </button>
        )}

        <button
          onClick={() => setCinema((v) => !v)}
          className="hidden lg:flex p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
          title={cinema ? 'Mostrar conteúdo do pack' : 'Modo cinema (esconder a lista)'}
        >
          {cinema ? <PanelRightOpen className="w-5 h-5 text-slate-300" /> : <PanelRightClose className="w-5 h-5 text-slate-300" />}
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* PLAYER + INFORMAÇÕES */}
        <div className="lg:flex-1 lg:overflow-y-auto min-w-0">
          <div ref={topoRef} className="p-3 md:p-5 lg:p-6 mx-auto w-full max-w-[1400px]">
            {erro && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm font-medium">
                Não foi possível carregar o conteúdo do pack. Atualize a página.
              </div>
            )}

            {loading ? (
              <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando conteúdo…
              </div>
            ) : !atual ? (
              <div className="aspect-video bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                <PlayCircle className="w-12 h-12 text-slate-700 mb-3" />
                <h3 className="text-white font-bold mb-1">Conteúdo em breve</h3>
                <p className="text-slate-400 text-sm">O professor ainda vai publicar o aulão deste pack.</p>
              </div>
            ) : (
              <>
                {atual.tipo === 'live' && statusAtual === 'agendada' ? (
                  <div className="aspect-video bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl flex flex-col items-center justify-center text-center gap-3 p-6">
                    <CalendarClock className="w-12 h-12 text-blue-300" />
                    <p className="text-white font-black text-lg">A live ainda não começou</p>
                    <p className="text-slate-300 text-sm">
                      {new Date(atual.data_hora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                    <p className="text-brand-orange font-bold tabular-nums">
                      Começa em {formatarRestante(new Date(atual.data_hora).getTime() - agora)}
                    </p>
                  </div>
                ) : (
                  <Player item={atual} />
                )}

                {/* Título + navegação */}
                <div className="mt-4 md:mt-5 flex flex-col xl:flex-row xl:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5 flex-wrap">
                      <span className="text-brand-orange font-bold uppercase tracking-wider">
                        {atual.tipo === 'aulao' ? 'Aulão' : atual.tipo === 'questoes' ? 'Resolução de questões' : 'Live'}
                      </span>
                      {atual.duracao_min && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {atual.duracao_min} min</span>
                      )}
                      {statusAtual && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${STATUS_LIVE[statusAtual].cls}`}>{STATUS_LIVE[statusAtual].label}</span>
                      )}
                    </div>
                    <h2 className="text-lg md:text-2xl font-black text-white leading-tight">{atual.titulo}</h2>
                  </div>

                  {tocaveis.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => abrir(anterior)}
                        disabled={!anterior}
                        className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Vídeo anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => abrir(proximo)}
                        disabled={!proximo}
                        className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={proximo ? `Próximo: ${proximo.titulo}` : 'Este é o último vídeo'}
                      >
                        Próximo vídeo <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sobre + material */}
                <div className="mt-5 md:mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-brand-orange" /> Sobre este conteúdo
                  </h3>
                  {atual.descricao ? (
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{atual.descricao}</p>
                  ) : (
                    <p className="text-sm text-slate-500">{pack.descricao || 'Sem descrição.'}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4 empty:hidden">
                    <BotaoMaterial
                      item={atual}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      {atual.tipo === 'questoes' ? 'Abrir questões (PDF)' : 'Material de apoio'}
                    </BotaoMaterial>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CONTEÚDO DO PACK */}
        {totalItens > 0 && (
          <aside
            className={`w-full lg:w-[320px] xl:w-[360px] bg-slate-900 lg:border-l border-t lg:border-t-0 border-slate-800 flex-col shrink-0 ${
              cinema ? 'flex lg:hidden' : 'flex'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-orange" /> Conteúdo do pack
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
                {expiraEm && !ehAdmin && ` · acesso até ${expiraEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
              </p>
            </div>

            <div className="lg:flex-1 lg:overflow-y-auto p-3 space-y-4 pb-6">
              {GRUPOS.map(({ tipo, titulo, icon: Icon }) => {
                const lista = grupos[tipo];
                if (!lista?.length) return null;
                return (
                  <div key={tipo}>
                    <p className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" /> {titulo}
                    </p>
                    <div className="space-y-1">
                      {lista.map((item, i) => {
                        const selecionado = atual?.id === item.id;
                        const toca = assistivel(item, agora);
                        const st = item.tipo === 'live' && item.data_hora ? statusDaLive(item.data_hora, item.duracao_min, agora) : null;
                        return (
                          <button
                            key={item.id}
                            onClick={() => abrir(item)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-3 cursor-pointer ${
                              selecionado ? 'bg-brand-orange/10 ring-1 ring-brand-orange/40' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            <span
                              className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                                selecionado ? 'bg-brand-orange text-white' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {selecionado && toca ? <PlayCircle className="w-4 h-4" /> : item.tipo === 'questoes' && !toca ? <FileText className="w-3.5 h-3.5" /> : i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[13px] font-bold leading-snug line-clamp-2 ${selecionado ? 'text-white' : 'text-slate-300'}`}>
                                {item.titulo}
                              </span>
                              <span className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-500 flex-wrap">
                                {selecionado && toca && <span className="text-brand-orange">Assistindo</span>}
                                {st && <span className={`px-1.5 rounded ${STATUS_LIVE[st].cls}`}>{STATUS_LIVE[st].label}</span>}
                                {st === 'agendada' && (
                                  <span>{new Date(item.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                                {item.tipo === 'questoes' && (item.arquivo_path || item.link_url) && <span>PDF</span>}
                                {item.tipo === 'questoes' && toca && <span>· resolução em vídeo</span>}
                                {item.duracao_min && st !== 'agendada' && (
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duracao_min} min</span>
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!temAcesso && (
                <Link
                  to="/pagamento"
                  className="block mx-1 mt-2 p-4 rounded-2xl bg-gradient-to-br from-brand-orange/20 to-transparent border border-brand-orange/30"
                >
                  <p className="text-sm font-black text-white">Gostou? Tenha a plataforma completa</p>
                  <p className="text-xs text-slate-300 mt-1">Videoaulas, banco de questões e simulados da sua turma.</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-brand-orange">Ver assinaturas <ChevronRight className="w-3.5 h-3.5" /></span>
                </Link>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
