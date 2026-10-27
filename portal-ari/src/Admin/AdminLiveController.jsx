import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Radio, MessageSquare, Send, Loader2, Calendar, ShieldAlert, StopCircle } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

import { useAvisos } from '../components/Avisos';
export default function AdminLiveController() {
  const avisos = useAvisos();
  const { id } = useParams();
  const navigate = useNavigate();

  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMensagens, setChatMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  useEffect(() => {
    async function carregarDadosLive() {
      try {
        const { data: liveData, error: liveError } = await supabase
          .from('lives')
          .select('*, turmas(nome)')
          .eq('id', id)
          .single();

        if (liveError) throw liveError;
        setLive(liveData);

        const { data: mensagensData, error: msgError } = await supabase
          .from('live_chat')
          .select('*')
          .eq('live_id', id)
          .order('created_at', { ascending: true });

        if (!msgError && mensagensData) {
          setChatMensagens(mensagensData);
        }
      } catch (error) {
        console.error('Erro ao carregar live para o admin:', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      carregarDadosLive();
    }

    const channel = supabase
      .channel(`admin_room_live_${id}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const formatarEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('embed')) return url;
    
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0`;
    }
    return url;
  };

  // 👈 Função para encerrar a live manualmente alterando a data/hora para o passado
  const handleEncerrarLiveManual = async () => {
    if (!(await avisos.confirmar({ titulo: 'Encerrar a transmissão agora?', mensagem: 'A live termina para todos os alunos.', confirmarTexto: 'Encerrar', perigo: true }))) return;

    setEncerrando(true);
    try {
      // Jogamos a data para o passado (ontem) para que o status mude automaticamente para "Encerrada"
      const dataPassada = new Date(Date.now() - 86400000).toISOString();

      const { error } = await supabase
        .from('lives')
        .update({ data_hora: dataPassada })
        .eq('id', id);

      if (error) throw error;

      avisos.sucesso('Transmissão encerrada com sucesso!');
      // Atualiza o estado local da live
      setLive((prev) => ({ ...prev, data_hora: dataPassada }));
    } catch (err) {
      console.error('Erro ao encerrar live:', err);
      avisos.erro('Erro ao encerrar a transmissão.');
    } finally {
      setEncerrando(false);
    }
  };

  const enviarMensagemAdmin = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || enviando) return;

    setEnviando(true);
    try {
      const { error } = await supabase.from('live_chat').insert({
        live_id: id,
        autor: 'Prof. Ari (Admin)',
        texto: novaMensagem.trim()
      });

      if (error) throw error;
      setNovaMensagem('');
    } catch (error) {
      console.error('Erro ao enviar mensagem como admin:', error.message);
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

  // Verifica se a live já passou do horário ou foi encerrada manualmente
  const isEncerrada = new Date() > new Date(live?.data_hora);

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden text-slate-100">
      
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER DO ADMIN COM BOTÃO DE ENCERRAR */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/admin/aulas-lives" className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-slate-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-black text-lg text-white">Painel de Controle da Transmissão</h1>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-orange/10 text-brand-orange border border-brand-orange/20 rounded-full text-xs font-black uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" /> Modo Professor
              </span>
            </div>
          </div>

          {/* Botão de Ação Manual para Encerrar */}
          {!isEncerrada ? (
            <button
              onClick={handleEncerrarLiveManual}
              disabled={encerrando}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              {encerrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              Encerrar Transmissão
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold border border-slate-700">
              Transmissão Encerrada
            </span>
          )}
        </header>

        {/* CORPO PRINCIPAL: PLAYER + CHAT DE MODERAÇÃO */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LADO ESQUERDO: VÍDEO E DETALHES */}
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
                      <Radio className="w-12 h-12 mb-2 opacity-40 animate-pulse text-brand-orange" />
                      <p className="text-sm font-bold">Nenhum link de transmissão configurado nesta live.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-orange bg-orange-500/10 px-3 py-1 rounded-lg">
                        Turma: {live.turmas?.nome || 'Geral'}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                        {live.professor || 'Prof. Ari'}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white">{live.titulo}</h2>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex h-full items-center justify-center flex-col text-center p-8">
                <h3 className="text-xl font-bold text-white mb-2">Transmissão não encontrada</h3>
              </div>
            )}
          </div>

          {/* LADO DIREITO: CHAT */}
          <div className="w-full lg:w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 h-72 lg:h-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-orange" />
                <h3 className="text-white font-bold text-sm">Chat ao Vivo (Modo Professor)</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMensagens.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-6">O chat está limpo no momento.</p>
              ) : (
                chatMensagens.map((msg) => {
                  const isAdmin = msg.autor.includes('Admin') || msg.autor.includes('Ari');
                  return (
                    <div 
                      key={msg.id} 
                      className={`p-3 rounded-xl border text-xs ${
                        isAdmin 
                          ? 'bg-brand-orange/10 border-brand-orange/30' 
                          : 'bg-slate-800/40 border-slate-800/60'
                      }`}
                    >
                      <span className={`font-bold ${isAdmin ? 'text-amber-400' : 'text-brand-orange'}`}>
                        {msg.autor}:
                      </span>
                      <p className="text-slate-200 mt-0.5 leading-relaxed">{msg.texto}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={enviarMensagemAdmin} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900">
              <input 
                type="text" 
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                placeholder="Enviar aviso como Professor..." 
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