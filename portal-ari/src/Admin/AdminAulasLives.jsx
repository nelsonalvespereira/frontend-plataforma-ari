import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, ChevronDown, PlayCircle, Radio, Loader2, Trash2, X, Edit, Layers } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useAdminVideoaulas, useAdminLives, useTurmas } from '../hooks/useLives';
import { supabase } from '../lib/supabaseClient';

import { useAvisos } from '../components/Avisos';
const STATUS_LIVE_STYLE = {
  Agendada: 'bg-blue-50 text-blue-700',
  'Ao Vivo': 'bg-red-50 text-red-600 animate-pulse',
  Encerrada: 'bg-slate-100 text-slate-500',
};

export default function AdminAulasLives() {
  const avisos = useAvisos();
  const [aba, setAba] = useState('videoaulas');
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [menuAberto, setMenuAberto] = useState(null);

  // Estados dos Modais
  const [modalVideoaulaAberto, setModalVideoaulaAberto] = useState(false);
  const [modalLiveAberto, setModalLiveAberto] = useState(false);
  const [modalEditVideoAberto, setModalEditVideoAberto] = useState(false);
  const [modalEditLiveAberto, setModalEditLiveAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Estados de Edição
  const [videoEmEdicao, setVideoEmEdicao] = useState(null);
  const [liveEmEdicao, setLiveEmEdicao] = useState(null);

  // Módulos disponíveis para a turma selecionada no formulário de aula
  const [modulosDisponiveis, setModulosDisponiveis] = useState([]);

  // Form Videoaula (Cadastro)
  const [tituloV, setTituloV] = useState('');
  const [moduloIdV, setModuloIdV] = useState('');
  const [turmaIdV, setTurmaIdV] = useState('');
  const [duracaoV, setDuracaoV] = useState('');
  const [videoUrlV, setVideoUrlV] = useState('');

  // Form Live (Cadastro)
  const [tituloL, setTituloL] = useState('');
  const [professorL, setProfessorL] = useState('Prof. Ari');
  const [turmaIdL, setTurmaIdL] = useState('');
  const [dataHoraL, setDataHoraL] = useState('');
  const [linkL, setLinkL] = useState('');

  const { turmas } = useTurmas();
  const { videoaulas, loading: loadingV, excluirVideoaula, fetchVideoaulas } = useAdminVideoaulas({ busca, turmaId: turmaFiltro || undefined });
  const { lives, loading: loadingL, excluirLive, statusDaLive, fetchLives } = useAdminLives({ busca, turmaId: turmaFiltro || undefined });

  // Função centralizada para buscar módulos de uma turma
  const carregarModulosPorTurmaId = async (idTurma) => {
    if (!idTurma) {
      setModulosDisponiveis([]);
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('modulos')
        .select('*')
        .eq('turma_id', idTurma)
        .order('ordem', { ascending: true });

      if (error) throw error;
      const lista = data || [];
      setModulosDisponiveis(lista);
      return lista;
    } catch (err) {
      console.error('Erro ao buscar módulos para o form:', err);
      setModulosDisponiveis([]);
      return [];
    }
  };

  // Dispara a busca sempre que o usuário trocar a turma no select do formulário
  const handleTrocarTurmaForm = async (e) => {
    const novoTurmaId = e.target.value;
    setTurmaIdV(novoTurmaId);
    setModuloIdV(''); // Limpa o módulo selecionado ao trocar de turma
    await carregarModulosPorTurmaId(novoTurmaId);
  };

  const handleExcluirVideoaula = async (id) => {
    if (!(await avisos.confirmar({ titulo: 'Excluir essa videoaula?', confirmarTexto: 'Excluir', perigo: true }))) return;
    await excluirVideoaula(id);
    setMenuAberto(null);
    if (fetchVideoaulas) fetchVideoaulas();
  };

  const handleExcluirLive = async (id) => {
    if (!(await avisos.confirmar({ titulo: 'Excluir essa live?', confirmarTexto: 'Excluir', perigo: true }))) return;
    await excluirLive(id);
    setMenuAberto(null);
    if (fetchLives) fetchLives();
  };

  // Função auxiliar para converter link do YouTube em formato Embed
  const formatarUrlVideo = (url) => {
    if (!url) return '';
    if (url.includes('embed')) return url;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  // Salvar Videoaula
  const handleSalvarVideoaula = async (e) => {
    e.preventDefault();
    if (!tituloV || !turmaIdV) return avisos.erro('Preencha os campos obrigatórios.');

    setSalvando(true);
    try {
      const urlFormatada = formatarUrlVideo(videoUrlV);
      const modObj = modulosDisponiveis.find(m => m.id === moduloIdV);

      const dadosAula = {
        titulo: tituloV,
        modulo_id: moduloIdV || null,
        modulo_nome: modObj ? modObj.titulo : 'Módulo Geral',
        turma_id: turmaIdV,
        duracao_min: duracaoV ? Number(duracaoV) : null,
        video_url: urlFormatada,
        ordem: videoaulas.length + 1
      };

      const { error } = await supabase.from('aulas').insert(dadosAula);

      if (error) throw error;

      avisos.sucesso('Videoaula cadastrada com sucesso!');
      setModalVideoaulaAberto(false);
      setTituloV('');
      setModuloIdV('');
      setTurmaIdV('');
      setDuracaoV('');
      setVideoUrlV('');
      if (fetchVideoaulas) fetchVideoaulas();
    } catch (err) {
      console.error('Erro ao cadastrar videoaula:', err);
      avisos.erro('Erro ao salvar videoaula: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSalvando(false);
    }
  };
  
  // Abrir Edição de Videoaula (Carrega os módulos de forma síncrona antes de abrir o modal)
  const abrirEdicaoVideo = async (v) => {
    setVideoEmEdicao(v);
    setTituloV(v.titulo || '');
    setDuracaoV(v.duracao_min || '');
    setVideoUrlV(v.video_url || '');
    setMenuAberto(null);

    if (v.turma_id) {
      setTurmaIdV(v.turma_id);
      // Carrega os módulos aguardando a resposta antes de setar o ID do módulo
      await carregarModulosPorTurmaId(v.turma_id);
    } else {
      setTurmaIdV('');
      setModulosDisponiveis([]);
    }

    setModuloIdV(v.modulo_id || '');
    setModalEditVideoAberto(true);
  };

  // Atualizar Videoaula
  const handleAtualizarVideoaula = async (e) => {
    e.preventDefault();
    if (!videoEmEdicao) return;

    setSalvando(true);
    try {
      const urlFormatada = formatarUrlVideo(videoUrlV);
      const modObj = modulosDisponiveis.find(m => m.id === moduloIdV);

      const { error } = await supabase.from('aulas').update({
        titulo: tituloV,
        modulo_id: moduloIdV || null,
        modulo_nome: modObj ? modObj.titulo : (videoEmEdicao.modulo_nome || 'Módulo Geral'),
        turma_id: turmaIdV,
        duracao_min: duracaoV ? Number(duracaoV) : null,
        video_url: urlFormatada,
      }).eq('id', videoEmEdicao.id);

      if (error) throw error;

      avisos.sucesso('Videoaula atualizada com sucesso!');
      setModalEditVideoAberto(false);
      setVideoEmEdicao(null);
      if (fetchVideoaulas) fetchVideoaulas();
    } catch (err) {
      console.error('Erro ao atualizar videoaula:', err);
      avisos.erro('Erro ao atualizar videoaula: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Salvar Live
  const handleSalvarLive = async (e) => {
    e.preventDefault();
    if (!tituloL || !turmaIdL || !dataHoraL) return avisos.erro('Preencha os campos obrigatórios.');

    setSalvando(true);
    try {
      const dataIso = new Date(dataHoraL).toISOString();

      const { error } = await supabase.from('lives').insert({
        titulo: tituloL,
        professor: professorL,
        turma_id: turmaIdL,
        data_hora: dataIso,
        link_transmissao: linkL
      });

      if (error) throw error;

      avisos.sucesso('Live agendada com sucesso!');
      setModalLiveAberto(false);
      setTituloL('');
      setTurmaIdL('');
      setDataHoraL('');
      setLinkL('');
      if (fetchLives) fetchLives();
    } catch (err) {
      console.error('Erro ao agendar live:', err);
      avisos.erro('Erro ao salvar live: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Abrir Edição de Live
  const abrirEdicaoLive = (l) => {
    setLiveEmEdicao(l);
    setTituloL(l.titulo || '');
    setProfessorL(l.professor || 'Prof. Ari');
    setTurmaIdL(l.turma_id || '');
    if (l.data_hora) {
      const formattedDate = new Date(l.data_hora).toISOString().slice(0, 16);
      setDataHoraL(formattedDate);
    }
    setLinkL(l.url_embed || l.link_transmissao || '');
    setModalEditLiveAberto(true);
    setMenuAberto(null);
  };

  // Atualizar Live
  const handleAtualizarLive = async (e) => {
    e.preventDefault();
    if (!liveEmEdicao) return;

    setSalvando(true);
    try {
      const dataIso = new Date(dataHoraL).toISOString();

      const { error } = await supabase.from('lives').update({
        titulo: tituloL,
        professor: professorL,
        turma_id: turmaIdL,
        data_hora: dataIso,
        link_transmissao: linkL
      }).eq('id', liveEmEdicao.id);

      if (error) throw error;

      avisos.sucesso('Live atualizada com sucesso!');
      setModalEditLiveAberto(false);
      setLiveEmEdicao(null);
      if (fetchLives) fetchLives();
    } catch (err) {
      console.error('Erro ao atualizar live:', err);
      avisos.erro('Erro ao atualizar live: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">Aulas e Lives</h2>
            <p className="text-xs font-medium text-slate-500">
              {videoaulas.length} videoaulas · {lives.length} lives cadastradas
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/modulos"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              <Layers className="w-4 h-4 text-brand-orange" /> Gerenciar Módulos
            </Link>
            <div className="w-9 h-9 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              A
            </div>
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-5">

            {/* Abas */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-xl w-fit">
              <button
                onClick={() => setAba('videoaulas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  aba === 'videoaulas' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <PlayCircle className="w-4 h-4" /> Videoaulas
              </button>
              <button
                onClick={() => setAba('lives')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  aba === 'lives' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Radio className="w-4 h-4" /> Lives
              </button>
            </div>

            {/* Barra de ações */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={aba === 'videoaulas' ? 'Buscar videoaula...' : 'Buscar live...'}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
                />
              </div>

              <div className="relative">
                <select
                  value={turmaFiltro}
                  onChange={(e) => setTurmaFiltro(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={() => {
                  if (aba === 'videoaulas') {
                    setTituloV(''); setModuloIdV(''); setTurmaIdV(''); setDuracaoV(''); setVideoUrlV('');
                    setModulosDisponiveis([]);
                    setModalVideoaulaAberto(true);
                  } else {
                    setTituloL(''); setProfessorL('Prof. Ari'); setTurmaIdL(''); setDataHoraL(''); setLinkL('');
                    setModalLiveAberto(true);
                  }
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {aba === 'videoaulas' ? 'Nova Videoaula' : 'Agendar Live'}
              </button>
            </div>

            {/* Tabela: Videoaulas */}
            {aba === 'videoaulas' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {loadingV ? (
                  <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando videoaulas...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Aula</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Duração</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {videoaulas.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-3.5">
                              <p className="font-bold text-slate-900 text-sm">{v.titulo}</p>
                              <p className="text-xs text-slate-500">{v.modulo_nome || v.modulo || 'Módulo Geral'}</p>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{v.turmas?.nome || '—'}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{v.duracao_min ? `${v.duracao_min} min` : '—'}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap text-right relative">
                              <button
                                onClick={() => setMenuAberto(menuAberto === v.id ? null : v.id)}
                                className="text-slate-400 hover:text-brand-orange transition-colors p-1.5"
                              >
                                <MoreHorizontal className="w-4.5 h-4.5" />
                              </button>
                              {menuAberto === v.id && (
                                <div className="absolute right-6 top-10 z-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 w-36 text-left">
                                  <button
                                    onClick={() => abrirEdicaoVideo(v)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-blue-500" /> Editar
                                  </button>
                                  <button
                                    onClick={() => handleExcluirVideoaula(v.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}

                        {videoaulas.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                              Nenhuma videoaula cadastrada ainda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tabela: Lives */}
            {aba === 'lives' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {loadingL ? (
                  <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando lives...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Live</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lives.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-3.5">
                              <p className="font-bold text-slate-900 text-sm">{l.titulo}</p>
                              <p className="text-xs text-slate-500">{l.professor}</p>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{l.turmas?.nome || '—'}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">
                                {new Date(l.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_LIVE_STYLE[statusDaLive(l.data_hora)]}`}>
                                {statusDaLive(l.data_hora)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap text-right relative">
                              <button
                                onClick={() => setMenuAberto(menuAberto === l.id ? null : l.id)}
                                className="text-slate-400 hover:text-brand-orange transition-colors p-1.5"
                              >
                                <MoreHorizontal className="w-4.5 h-4.5" />
                              </button>
                              {menuAberto === l.id && (
                                <div className="absolute right-6 top-10 z-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 w-40 text-left">
                                  <Link
                                    to={`/admin/live-control/${l.id}`}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  >
                                    <Radio className="w-3.5 h-3.5" /> Entrar na Live
                                  </Link>
                                  <button
                                    onClick={() => abrirEdicaoLive(l)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-blue-500" /> Editar
                                  </button>
                                  <button
                                    onClick={() => handleExcluirLive(l.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}

                        {lives.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                              Nenhuma live cadastrada ainda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* MODAL: NOVA VIDEOAULA */}
      {modalVideoaulaAberto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Cadastrar Nova Videoaula</h3>
              <button onClick={() => setModalVideoaulaAberto(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarVideoaula} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Título da Aula *</label>
                <input
                  type="text"
                  required
                  value={tituloV}
                  onChange={(e) => setTituloV(e.target.value)}
                  placeholder="Ex: Equações do 2º Grau - Aula 1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Turma Alvo *</label>
                  <select
                    required
                    value={turmaIdV}
                    onChange={handleTrocarTurmaForm}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  >
                    <option value="">Selecione a turma</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Módulo</label>
                  <select
                    value={moduloIdV}
                    onChange={(e) => setModuloIdV(e.target.value)}
                    disabled={!turmaIdV || modulosDisponiveis.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50"
                  >
                    <option value="">Selecione o módulo</option>
                    {modulosDisponiveis.map((m) => (
                      <option key={m.id} value={m.id}>{m.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  value={duracaoV}
                  onChange={(e) => setDuracaoV(e.target.value)}
                  placeholder="Ex: 45"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Link do Vídeo (YouTube / Embed)</label>
                <input
                  type="text"
                  value={videoUrlV}
                  onChange={(e) => setVideoUrlV(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/embed/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalVideoaulaAberto(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Aula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR VIDEOAULA */}
      {modalEditVideoAberto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Editar Videoaula</h3>
              <button onClick={() => setModalEditVideoAberto(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAtualizarVideoaula} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Título da Aula *</label>
                <input
                  type="text"
                  required
                  value={tituloV}
                  onChange={(e) => setTituloV(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Turma Alvo *</label>
                  <select
                    required
                    value={turmaIdV}
                    onChange={handleTrocarTurmaForm}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  >
                    <option value="">Selecione a turma</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Módulo</label>
                  <select
                    value={moduloIdV}
                    onChange={(e) => setModuloIdV(e.target.value)}
                    disabled={!turmaIdV || modulosDisponiveis.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50"
                  >
                    <option value="">Selecione o módulo</option>
                    {modulosDisponiveis.map((m) => (
                      <option key={m.id} value={m.id}>{m.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  value={duracaoV}
                  onChange={(e) => setDuracaoV(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Link do Vídeo (YouTube / Embed)</label>
                <input
                  type="text"
                  value={videoUrlV}
                  onChange={(e) => setVideoUrlV(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalEditVideoAberto(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGENDAR LIVE */}
      {modalLiveAberto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Agendar Nova Live</h3>
              <button onClick={() => setModalLiveAberto(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarLive} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Título da Live *</label>
                <input
                  type="text"
                  required
                  value={tituloL}
                  onChange={(e) => setTituloL(e.target.value)}
                  placeholder="Ex: Tir dúvidas de Matemática para o ENEM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Turma Alvo *</label>
                  <select
                    required
                    value={turmaIdL}
                    onChange={(e) => setTurmaIdL(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  >
                    <option value="">Selecione a turma</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Professor</label>
                  <input
                    type="text"
                    value={professorL}
                    onChange={(e) => setProfessorL(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Data e Hora *</label>
                <input
                  type="datetime-local"
                  required
                  value={dataHoraL}
                  onChange={(e) => setDataHoraL(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Link de Transmissão</label>
                <input
                  type="text"
                  value={linkL}
                  onChange={(e) => setLinkL(e.target.value)}
                  placeholder="Ex: https://youtube.com/live/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalLiveAberto(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Agendar Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR LIVE */}
      {modalEditLiveAberto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Editar Live</h3>
              <button onClick={() => setModalEditLiveAberto(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAtualizarLive} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Título da Live *</label>
                <input
                  type="text"
                  required
                  value={tituloL}
                  onChange={(e) => setTituloL(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Turma Alvo *</label>
                  <select
                    required
                    value={turmaIdL}
                    onChange={(e) => setTurmaIdL(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  >
                    <option value="">Selecione a turma</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Professor</label>
                  <input
                    type="text"
                    value={professorL}
                    onChange={(e) => setProfessorL(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Data e Hora *</label>
                <input
                  type="datetime-local"
                  required
                  value={dataHoraL}
                  onChange={(e) => setDataHoraL(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Link de Transmissão</label>
                <input
                  type="text"
                  value={linkL}
                  onChange={(e) => setLinkL(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalEditLiveAberto(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}