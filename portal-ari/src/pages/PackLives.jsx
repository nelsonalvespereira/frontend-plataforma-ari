import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Loader2, Radio, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { formatarEmbedUrl } from '../../lib/embed';

const calcularStatus = (dataHoraStr) => {
  if (!dataHoraStr) return 'Agendada';
  const agora = new Date();
  const dataLive = new Date(dataHoraStr);
  const diffMinutos = (dataLive - agora) / (1000 * 60);
  if (diffMinutos <= 15 && diffMinutos >= -120) return 'Ao Vivo';
  if (agora > dataLive) return 'Encerrada';
  return 'Agendada';
};

const COR_STATUS = {
  'Ao Vivo': 'bg-red-500/10 text-red-400 border-red-500/30',
  Agendada: 'bg-slate-800 text-slate-300 border-slate-700',
  Encerrada: 'bg-slate-800 text-slate-500 border-slate-700',
};

// Chat em tempo real da live (mesma ideia do chat das lives do curso).
function ChatDaLive({ liveId, nome }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fimRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    setMensagens([]);

    supabase
      .from('live_chat')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (ativo && !error && data) setMensagens(data);
      });

    const canal = supabase
      .channel(`pack_live_${liveId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat', filter: `live_id=eq.${liveId}` },
        (payload) => setMensagens((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new])),
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [liveId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [mensagens]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    const { error } = await supabase.from('live_chat').insert({ live_id: liveId, autor: nome, texto: texto.trim() });
    if (error) setErro('Não foi possível enviar a mensagem.');
    else setTexto('');
    setEnviando(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[420px] lg:h-full min-h-[320px]">
      <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">Chat ao vivo</p>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.length === 0 && <p className="text-sm text-slate-500 text-center pt-6">Nenhuma mensagem ainda. Mande a primeira!</p>}
        {mensagens.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-bold text-brand-orange">{m.autor}</span>
            <p className="text-slate-300 break-words">{m.texto}</p>
          </div>
        ))}
        <div ref={fimRef} />
      </div>
      <form onSubmit={enviar} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite sua mensagem…"
          maxLength={500}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar mensagem"
          className="p-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 cursor-pointer"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      {erro && <p role="alert" className="px-4 pb-3 text-xs text-red-400">{erro}</p>}
    </div>
  );
}

// Lives: as marcadas como do pack (lives.incluso_no_pack = true).
export default function PackLives() {
  const { profile } = useAuth();
  const [lives, setLives] = useState([]);
  const [liveId, setLiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase
      .from('lives')
      .select('*')
      .eq('incluso_no_pack', true)
      .order('data_hora', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setErro('Não foi possível carregar as lives. Tente novamente.');
        } else {
          setLives(data ?? []);
          // Abre direto a que está ao vivo, se houver.
          const aoVivo = (data ?? []).find((l) => calcularStatus(l.data_hora) === 'Ao Vivo');
          if (aoVivo) setLiveId(aoVivo.id);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;
  if (erro) return <p role="alert" className="py-10 text-center text-red-400 text-sm">{erro}</p>;
  if (lives.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Radio className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-bold text-slate-300">Nenhuma live agendada para o pack</p>
        <p className="text-sm mt-1">Quando o professor marcar, ela aparece aqui.</p>
      </div>
    );
  }

  const atual = lives.find((l) => l.id === liveId);

  return (
    <div className="space-y-6">
      {atual && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
              {atual.link_transmissao ? (
                <iframe
                  key={atual.id}
                  className="w-full h-full"
                  src={formatarEmbedUrl(atual.link_transmissao)}
                  title={atual.titulo}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="h-full flex items-center justify-center flex-col text-slate-500">
                  <Radio className="w-12 h-12 mb-2 opacity-40" />
                  <p className="text-sm">A transmissão ainda não começou.</p>
                </div>
              )}
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{atual.titulo}</h2>
          </div>
          <ChatDaLive liveId={atual.id} nome={profile?.nome || 'Aluno'} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lives.map((live) => {
          const status = calcularStatus(live.data_hora);
          return (
            <button
              key={live.id}
              onClick={() => setLiveId(live.id)}
              className={`text-left bg-slate-900 border rounded-2xl p-5 transition-colors cursor-pointer ${
                live.id === liveId ? 'border-brand-orange' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${COR_STATUS[status]}`}>
                {status}
              </span>
              <h4 className="mt-3 font-black text-white leading-snug">{live.titulo}</h4>
              <p className="mt-1 text-xs text-slate-400">{live.professor || 'Prof. Ari'}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                {live.data_hora ? new Date(live.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data a definir'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
