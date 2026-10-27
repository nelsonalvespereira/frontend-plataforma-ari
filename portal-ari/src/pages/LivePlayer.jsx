import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Radio, MessageSquare, Send, Loader2, Calendar } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';

import { useAvisos } from '../components/Avisos';
export default function LivePlayer() {
  const avisos = useAvisos();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usuarioNome, setUsuarioNome] = useState('Aluno');
  const [chatMensagens, setChatMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarDadosLive() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // Pega o nome do perfil do aluno
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user.id)
          .single();

        if (profile?.nome) setUsuarioNome(profile.nome);

        // Busca os detalhes da live
        const { data: liveData, error: liveError } = await supabase
          .from('lives')
          .select('*')
          .eq('id', id)
          .single();

        if (liveError) throw liveError;
        setLive(liveData);

        // Busca mensagens anteriores do chat desta live
        const { data: mensagensData, error: msgError } = await supabase
          .from('live_chat')
          .select('*')
          .eq('live_id', id)
          .order('created_at', { ascending: true });

        if (!msgError && mensagensData) {
          setChatMensagens(mensagensData);
        }

      } catch (error) {
        console.error('Erro ao carregar live ou chat:', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      carregarDadosLive();
    }

    // Configura a escuta em Tempo Real (Realtime) do Supabase para o Chat
    const channel = supabase
      .channel(`room_live_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat',
          filter: `live_id=eq.${id}`
        },
        (payload) => {
          setChatMensagens((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Limpa o canal quando o componente for desmontado
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const formatarEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('embed')) return url;
    
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  };

  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || enviando) return;

    setEnviando(true);
    try {
      // Salva a mensagem no Supabase. O Realtime vai atualizar automaticamente a tela de todos.
      const { error } = await supabase.from('live_chat').insert({
        live_id: id,
        autor: usuarioNome,
        texto: novaMensagem.trim()
      });

      if (error) throw error;
      setNovaMensagem('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error.message);
      avisos.erro('Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/lives" className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg truncate max-w-md">{live?.titulo || 'Transmissão ao Vivo'}</h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs font-black uppercase tracking-wider animate-pulse shrink-0">
                <Radio className="w-3 h-3" /> Ao Vivo
              </span>
            </div>
          </div>
        </header>

        {/* CORPO PRINCIPAL: VÍDEO + CHAT */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LADO ESQUERDO: PLAYER DA LIVE */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col">
            {live ? (
              <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
                
                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50 mb-6 border border-slate-800 relative">
                  {live.link_transmissao ? (
                    <iframe 
                      className="w-full h-full"
                      src={formatarEmbedUrl(live.link_transmissao)} 
                      title={live.titulo}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="flex h-full items-center justify-center flex-col text-slate-500">
                      <Radio className="w-12 h-12 mb-2 opacity-40 animate-pulse" />
                      <p className="text-sm font-bold">Link de transmissão indisponível no momento.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-orange bg-orange-500/10 px-3 py-1 rounded-lg mb-2 inline-block">
                      {live.professor || 'Prof. Ari'}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white">{live.titulo}</h2>
                    <p className="text-slate-400 text-xs font-medium flex items-center gap-2 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {live.data_hora ? new Date(live.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Horário não especificado'}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex h-full items-center justify-center flex-col text-center p-8">
                <h3 className="text-xl font-bold text-white mb-2">Live não encontrada</h3>
                <p className="text-slate-400">Esta transmissão pode ter sido removida ou o link está incorreto.</p>
              </div>
            )}
          </div>

          {/* LADO DIREITO: CHAT AO VIVO REAL-TIME */}
          <div className="w-full lg:w-[380px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 h-72 lg:h-auto">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2 shrink-0">
              <MessageSquare className="w-4 h-4 text-brand-orange" />
              <h3 className="text-white font-bold text-sm">Chat da Transmissão</h3>
            </div>

            {/* MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMensagens.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-6">Nenhuma mensagem ainda. Seja o primeiro a mandar um salve!</p>
              ) : (
                chatMensagens.map((msg) => (
                  <div key={msg.id} className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/60 text-xs">
                    <span className="font-bold text-brand-orange">{msg.autor}:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{msg.texto}</p>
                  </div>
                ))
              )}
            </div>

            {/* FORM DE ENVIO */}
            <form onSubmit={enviarMensagem} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900">
              <input 
                type="text" 
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                placeholder="Tire sua dúvida com o professor..." 
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-orange transition-colors"
              />
              <button 
                type="submit"
                disabled={enviando}
                className="bg-brand-orange hover:bg-orange-600 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:opacity-50"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

        </div>

      </main>
    </div>
  );
}