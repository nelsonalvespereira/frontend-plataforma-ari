import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  PlayCircle, FileText, Radio, Clock, ExternalLink, LogOut, Timer, Loader2,
  CalendarClock, Video, Sparkles, ArrowLeft, Lock,
} from 'lucide-react';
import logo from '../assets/logo-ari.jpeg';
import { useAuth } from '../hooks/useAuth';
import PlayerProtegido from '../components/PlayerProtegido';
import { usePackDetalhe, usePackItens, useRestante } from '../hooks/usePack';
import { abrirMaterialPrivado, formatarRestante, formatarUrlEmbed, linkSeguro, rotuloDuracao, statusDaLive } from '../lib/packUtils';

const ABAS = [
  { id: 'aulao', label: 'Aulão', icon: PlayCircle },
  { id: 'questoes', label: 'Questões', icon: FileText },
  { id: 'lives', label: 'Lives', icon: Radio },
];

function Player({ url, titulo }) {
  const src = formatarUrlEmbed(url);
  // YouTube: player protegido (sem acesso ao YouTube, marca d'água com o aluno).
  if (src.includes('youtube.com/embed/')) {
    return <PlayerProtegido key={src} url={src} titulo={titulo} className="border border-slate-800 shadow-xl" />;
  }
  if (!src) {
    return (
      <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 text-sm font-medium">
        Vídeo ainda não disponível.
      </div>
    );
  }
  return (
    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <iframe
        className="w-full h-full"
        src={src}
        title={titulo}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// Botão de material: PDF privado (link temporário gerado no clique) ou, nos itens antigos, link externo.
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

function Vazio({ icon: Icon, titulo, texto }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
      <Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <h3 className="font-bold text-slate-700 mb-1">{titulo}</h3>
      <p className="text-sm text-slate-500">{texto}</p>
    </div>
  );
}

function AbaAulao({ aulas }) {
  const [atualId, setAtualId] = useState(null);
  const atual = aulas.find((a) => a.id === atualId) ?? aulas[0];

  if (aulas.length === 0) {
    return <Vazio icon={Video} titulo="Aulão em breve" texto="O professor ainda vai publicar o aulão deste Pack." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-4">
        <Player url={atual.video_url} titulo={atual.titulo} />
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">{atual.titulo}</h2>
          {atual.descricao && (
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed whitespace-pre-wrap">{atual.descricao}</p>
          )}
          <BotaoMaterial
            item={atual}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Material de apoio
          </BotaoMaterial>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden h-fit">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-sm font-black text-slate-800">Conteúdo do aulão</h3>
          <p className="text-xs text-slate-500 font-medium">{aulas.length} {aulas.length === 1 ? 'vídeo' : 'vídeos'}</p>
        </div>
        <div className="p-2 space-y-1 max-h-[480px] overflow-y-auto">
          {aulas.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setAtualId(a.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                a.id === atual.id ? 'bg-orange-50 border-brand-orange/40' : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${a.id === atual.id ? 'text-brand-orange' : 'text-slate-400'}`}>
                Parte {i + 1}{a.duracao_min ? ` · ${a.duracao_min} min` : ''}
              </span>
              <p className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">{a.titulo}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AbaQuestoes({ questoes }) {
  const [abertoId, setAbertoId] = useState(null);

  if (questoes.length === 0) {
    return <Vazio icon={FileText} titulo="Questões em breve" texto="As listas de questões do Pack aparecem aqui assim que forem publicadas." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {questoes.map((q) => {
        const resolucao = formatarUrlEmbed(q.video_url);
        const aberto = abertoId === q.id;
        return (
          <div key={q.id} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 leading-snug">{q.titulo}</h3>
                {q.descricao && <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed whitespace-pre-wrap">{q.descricao}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-auto pt-1">
              <BotaoMaterial
                item={q}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Abrir questões
              </BotaoMaterial>
              {resolucao && (
                <button
                  onClick={() => setAbertoId(aberto ? null : q.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" /> {aberto ? 'Fechar resolução' : 'Ver resolução'}
                </button>
              )}
            </div>

            {aberto && resolucao && <Player url={q.video_url} titulo={`Resolução: ${q.titulo}`} />}
          </div>
        );
      })}
    </div>
  );
}

const STATUS_LIVE = {
  agendada: { label: 'Agendada', cls: 'bg-blue-50 text-blue-700' },
  ao_vivo: { label: 'Ao vivo', cls: 'bg-red-50 text-red-600 animate-pulse' },
  encerrada: { label: 'Encerrada', cls: 'bg-slate-100 text-slate-500' },
};

function CartaoLive({ live }) {
  const [assistindo, setAssistindo] = useState(false);
  // Reavalia o status a cada 30s para a live "virar" ao vivo sem recarregar a página.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const status = live.data_hora ? statusDaLive(live.data_hora, live.duracao_min, agora) : 'encerrada';
  const st = STATUS_LIVE[status];
  const temVideo = !!formatarUrlEmbed(live.video_url);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-900 leading-snug">{live.titulo}</h3>
          {live.data_hora && (
            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              {new Date(live.data_hora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          )}
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
      </div>

      {live.descricao && <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{live.descricao}</p>}

      {status === 'agendada' && (
        <p className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-orange" />
          Começa em {formatarRestante(new Date(live.data_hora).getTime() - agora)}
        </p>
      )}

      {status !== 'agendada' && temVideo && (
        assistindo ? (
          <Player url={live.video_url} titulo={live.titulo} />
        ) : (
          <button
            onClick={() => setAssistindo(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" /> {status === 'ao_vivo' ? 'Entrar na live' : 'Assistir gravação'}
          </button>
        )
      )}

      {status !== 'agendada' && !temVideo && (
        <p className="text-xs font-medium text-slate-400">A gravação ainda não foi publicada.</p>
      )}
    </div>
  );
}

function AbaLives({ lives }) {
  if (lives.length === 0) {
    return <Vazio icon={Radio} titulo="Nenhuma live agendada" texto="Quando o professor agendar as lives do Pack, elas aparecem aqui." />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {lives.map((l) => <CartaoLive key={l.id} live={l} />)}
    </div>
  );
}

const formatarPreco = (centavos) =>
  ((centavos ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Carregando() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center text-slate-400 gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
    </div>
  );
}

// /pack/:priceId — conteúdo de um pack. Sem compra ativa, mostra o pack bloqueado com o botão de comprar.
export default function Pack() {
  const { priceId: priceIdUrl } = useParams();
  const priceId = priceIdUrl ? decodeURIComponent(priceIdUrl) : '';
  const navigate = useNavigate();
  const { user, profile, temAcesso, signOut, recarregarPerfil } = useAuth();
  const ehAdmin = !!profile?.is_admin;

  const { pack, expiraEm, loading: carregandoPack } = usePackDetalhe(priceId, user?.id);
  const liberado = ehAdmin || !!expiraEm;
  const { aulas, questoes, lives, loading, erro, recarregar } = usePackItens(liberado ? priceId : null);
  const [aba, setAba] = useState('aulao');

  const restanteMs = useRestante(!ehAdmin && expiraEm ? expiraEm.getTime() : 0);
  const poucoTempo = !ehAdmin && expiraEm && restanteMs > 0 && restanteMs < 3600000;
  const acabou = !ehAdmin && !!expiraEm && restanteMs === 0;

  // Quando o prazo deste pack acaba com o aluno na página: recarrega (a RLS já esconde o conteúdo).
  useEffect(() => {
    if (!acabou) return;
    recarregar();
    recarregarPerfil?.();
  }, [acabou, recarregar, recarregarPerfil]);

  const primeiroNome = (profile?.nome || 'aluno(a)').split(' ')[0];
  const contagens = useMemo(
    () => ({ aulao: aulas.length, questoes: questoes.length, lives: lives.length }),
    [aulas, questoes, lives]
  );

  if (!priceId) return <Navigate to="/packs" replace />;
  if (carregandoPack) return <Carregando />;

  const comprar = () => navigate(`/pagamento?plano=${encodeURIComponent(priceId)}&voltar=packs`);
  const bloqueado = !liberado || acabou;

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans">
      <header className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/packs" title="Voltar aos packs" className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <img src={logo} alt="Arimática Gabaritando" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            <span className="font-black tracking-tight truncate">{pack?.nome || 'Pack Avulso'}</span>
          </div>

          <div className="flex items-center gap-3">
            {!ehAdmin && expiraEm && !acabou && (
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                  poucoTempo
                    ? 'bg-red-500/10 text-red-300 border-red-500/30'
                    : 'bg-white/5 text-slate-200 border-white/10'
                }`}
                title={`Acesso até ${expiraEm.toLocaleString('pt-BR')}`}
              >
                <Timer className="w-3.5 h-3.5 text-brand-orange" />
                <span className="hidden sm:inline">Seu acesso acaba em</span>
                <span className="tabular-nums">{formatarRestante(restanteMs)}</span>
              </div>
            )}
            {temAcesso ? (
              <Link to="/dashboard" className="hidden sm:inline px-3 py-1.5 text-xs font-bold text-slate-200 border border-white/15 hover:bg-white/10 rounded-lg">
                Painel
              </Link>
            ) : (
              <button
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {!pack ? (
        <main className="max-w-xl mx-auto px-5 py-16 text-center space-y-4">
          <h1 className="text-xl font-black text-slate-900">Pack não encontrado</h1>
          <p className="text-sm text-slate-500">Ele pode ter saído de venda.</p>
          <Link to="/packs" className="inline-flex px-5 py-3 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl">
            Ver packs disponíveis
          </Link>
        </main>
      ) : bloqueado ? (
        <main className="max-w-xl mx-auto px-5 py-16">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-orange-50 text-brand-orange rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900">{acabou ? 'Seu acesso a este pack terminou' : pack.nome}</h1>
            {pack.descricao && <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">{pack.descricao}</p>}
            <p className="text-sm text-slate-500">
              {formatarPreco(pack.valor_centavos)} · pagamento único · {rotuloDuracao(pack.duracao_dias)} de acesso
            </p>
            <button
              onClick={comprar}
              className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl cursor-pointer"
            >
              {acabou ? 'Comprar de novo' : 'Comprar este pack'}
            </button>
          </div>
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-5 md:px-8 py-8 space-y-6">
          <section className="bg-slate-950 rounded-3xl p-6 md:p-8 text-white">
            <p className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {ehAdmin && !expiraEm ? 'Visão do administrador' : 'Acesso temporário'}
            </p>
            <h1 className="text-2xl md:text-3xl font-black mt-1">Bora aproveitar, {primeiroNome}!</h1>
            <p className="text-slate-400 text-sm font-medium mt-1.5 max-w-xl whitespace-pre-wrap">
              {pack.descricao || 'Aulão, questões e lives exclusivas deste pack.'}
            </p>
          </section>

          <nav className="flex p-1 bg-white border border-slate-200 rounded-xl w-full sm:w-fit overflow-x-auto">
            {ABAS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  aba === id ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
                <span className={`text-[11px] px-1.5 rounded-md ${aba === id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                  {contagens[id]}
                </span>
              </button>
            ))}
          </nav>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
              Não foi possível carregar o conteúdo do pack. Atualize a página.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando conteúdo...
            </div>
          ) : (
            <>
              {aba === 'aulao' && <AbaAulao aulas={aulas} />}
              {aba === 'questoes' && <AbaQuestoes questoes={questoes} />}
              {aba === 'lives' && <AbaLives lives={lives} />}
            </>
          )}
        </main>
      )}
    </div>
  );
}
