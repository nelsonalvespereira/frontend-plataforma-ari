import React, { useState, useEffect } from 'react';
import {
  Search, Filter, BookOpen, ChevronDown, ChevronRight, ChevronLeft,
  MessageSquare, Bookmark, FileText, Loader2, Folder, SlidersHorizontal, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import RenderBlocos from '../components/RenderBlocos';
import ResolucaoProfessor from '../components/ResolucaoProfessor';
import { useQuestoes } from '../hooks/useQuestoes';
import { supabase } from '../lib/supabaseClient';

import { useAvisos } from '../components/Avisos';
const ROTULO_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

export default function BancoQuestoes() {
  const avisos = useAvisos();
  const [respostaSelecionada, setRespostaSelecionada] = useState(null);
  const [respondida, setRespondida] = useState(false);
  const [gabaritoRevelado, setGabaritoRevelado] = useState(false);
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [busca, setBusca] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [assuntoIdSelecionado, setAssuntoIdSelecionado] = useState('');
  const [pagina, setPagina] = useState(0);

  const [favoritado, setFavoritado] = useState(false);
  const [categoriasAbertas, setCategoriasAbertas] = useState({});
  const [assuntosArvore, setAssuntosArvore] = useState([]);
  const [turmaIdAluno, setTurmaIdAluno] = useState(null);
  const [questoesEmbaralhadas, setQuestoesEmbaralhadas] = useState([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false); // gaveta de filtros no celular
  const { profile } = useAuth();

  useEffect(() => {
    async function carregarFiltrosArvore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('id', user.id)
        .single();

      if (profile && profile.turma_id) {
        setTurmaIdAluno(profile.turma_id);

        const { data: arvore } = await supabase
          .from('assuntos_hierarquia')
          .select('*')
          .eq('turma_id', profile.turma_id)
          .order('created_at', { ascending: true });

        if (arvore) {
          setAssuntosArvore(arvore);
          const idsIniciais = {};
          arvore.filter(a => !a.categoria_pai_id).forEach(p => { idsIniciais[p.id] = true; });
          setCategoriasAbertas(idsIniciais);
        }
      }
    }
    carregarFiltrosArvore();
  }, []);

  const toggleCategoria = (id) => {
    setCategoriasAbertas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const { questoes, total, loading, error, responder } = useQuestoes({
    busca,
    dificuldade,
    assuntoId: assuntoIdSelecionado,
    pagina: 0,
    porPagina: 500,
  });

  useEffect(() => {
    if (questoes && questoes.length > 0) {
      const embaralhadas = [...questoes].sort(() => Math.random() - 0.5);
      setQuestoesEmbaralhadas(embaralhadas);
      setPagina(0);
    } else {
      setQuestoesEmbaralhadas([]);
    }
  }, [questoes]);

  const questaoAtual = questoesEmbaralhadas[pagina];

  const alternarFavorito = () => {
    setFavoritado(!favoritado);
  };

  const [enviando, setEnviando] = useState(false);

  // O banco confere a resposta e só então devolve o gabarito, que é juntado à questão da tela.
  const handleResponder = async () => {
    if (!respostaSelecionada || !questaoAtual || enviando) return;
    setEnviando(true);
    // resultado = { correta, resposta_correta, comentario, video_resolucao_url, ... }
    const { resultado: gabarito, error } = await responder(questaoAtual.id, respostaSelecionada);
    setEnviando(false);
    if (error) {
      avisos.erro('Não foi possível registrar sua resposta. Tente de novo.');
      return;
    }
    const id = questaoAtual.id;
    setQuestoesEmbaralhadas((qs) => qs.map((q) => (q.id === id ? { ...q, ...(gabarito ?? {}) } : q)));
    setRespondida(true);
  };

  const revelarGabarito = () => {
    setGabaritoRevelado(true);
  };

  const irParaProxima = () => {
    setPagina((p) => Math.min(questoesEmbaralhadas.length - 1, p + 1));
    setRespostaSelecionada(null);
    setRespondida(false);
    setGabaritoRevelado(false);
    setMostrarComentario(false);
    setFavoritado(false);
  };

  const irParaAnterior = () => {
    setPagina((p) => Math.max(0, p - 1));
    setRespostaSelecionada(null);
    setRespondida(false);
    setGabaritoRevelado(false);
    setMostrarComentario(false);
    setFavoritado(false);
  };

  const principais = assuntosArvore.filter(a => !a.categoria_pai_id);
  const getSub = (paiId) => assuntosArvore.filter(a => a.categoria_pai_id === paiId);
  const assuntoSelecionado = assuntosArvore.find((a) => a.id === assuntoIdSelecionado);
  const filtrosAtivos = (assuntoIdSelecionado ? 1 : 0) + (dificuldade ? 1 : 0);

  // Mesmo conteúdo de filtros na barra lateral (computador) e na gaveta (celular).
  const painelFiltros = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-orange" /> Filtros
        </h3>
        <button
          onClick={() => { setBusca(''); setDificuldade(''); setAssuntoIdSelecionado(''); setPagina(0); }}
          className="text-xs font-bold text-slate-400 hover:text-brand-orange transition-colors cursor-pointer"
        >
          Limpar
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPagina(0); }}
          placeholder="Palavra-chave..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:outline-none focus:border-brand-orange transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Categorias e Assuntos
        </label>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          <button
            onClick={() => { setAssuntoIdSelecionado(''); setPagina(0); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              !assuntoIdSelecionado ? 'bg-orange-50 text-brand-orange' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📁 Todos os Assuntos
          </button>

          {principais.map((pai) => {
            const subitensNivel1 = getSub(pai.id);
            const isOpenPai = categoriasAbertas[pai.id];
            const isPaiSelecionado = assuntoIdSelecionado === pai.id;

            return (
              <div key={pai.id} className="space-y-1">
                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                  isPaiSelecionado ? 'bg-orange-50 text-brand-orange' : 'hover:bg-slate-50 text-slate-700'
                }`}>
                  <button
                    onClick={() => { setAssuntoIdSelecionado(pai.id); setPagina(0); }}
                    className="flex items-center gap-1.5 text-xs font-bold flex-1 text-left cursor-pointer truncate uppercase"
                  >
                    <Folder className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                    <span className="truncate">{pai.nome}</span>
                  </button>
                  
                  {subitensNivel1.length > 0 && (
                    <button
                      onClick={() => toggleCategoria(pai.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {isOpenPai ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {isOpenPai && subitensNivel1.length > 0 && (
                  <div className="pl-3 space-y-1 border-l-2 border-slate-100 ml-3 my-1">
                    {subitensNivel1.map((sub1) => {
                      const subitensNivel2 = getSub(sub1.id);
                      const isOpenSub1 = categoriasAbertas[sub1.id];
                      const isSub1Selecionado = assuntoIdSelecionado === sub1.id;

                      return (
                        <div key={sub1.id} className="space-y-1">
                          <div className={`flex items-center justify-between px-2 py-1 rounded-md transition-colors ${
                            isSub1Selecionado ? 'bg-orange-50 text-brand-orange font-bold' : 'hover:bg-slate-50 text-slate-600'
                          }`}>
                            <button
                              onClick={() => { setAssuntoIdSelecionado(sub1.id); setPagina(0); }}
                              className="flex items-center gap-1 text-xs flex-1 text-left cursor-pointer truncate font-medium"
                            >
                              <span className="text-slate-400">📂</span>
                              <span className="truncate">{sub1.nome}</span>
                            </button>

                            {subitensNivel2.length > 0 && (
                              <button
                                onClick={() => toggleCategoria(sub1.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {isOpenSub1 ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            )}
                          </div>

                          {isOpenSub1 && subitensNivel2.length > 0 && (
                            <div className="pl-4 space-y-1 border-l border-slate-100 ml-2 my-1">
                              {subitensNivel2.map((sub2) => {
                                const isSub2Selecionado = assuntoIdSelecionado === sub2.id;
                                return (
                                  <button
                                    key={sub2.id}
                                    onClick={() => { setAssuntoIdSelecionado(sub2.id); setPagina(0); }}
                                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer truncate flex items-center gap-1.5 ${
                                      isSub2Selecionado ? 'bg-orange-50 text-brand-orange font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                                  >
                                    <span className="text-slate-300">📄</span>
                                    <span className="truncate">{sub2.nome}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Dificuldade
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { valor: '', label: 'Todas' },
            { valor: 'facil', label: 'Fácil' },
            { valor: 'medio', label: 'Médio' },
            { valor: 'dificil', label: 'Difícil' },
          ].map((opt) => (
            <button
              key={opt.valor}
              onClick={() => { setDificuldade(opt.valor); setPagina(0); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                dificuldade === opt.valor
                  ? 'border-brand-orange bg-orange-50 text-brand-orange'
                  : 'border-slate-200 text-slate-600 hover:border-brand-orange hover:text-brand-orange'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Banco de Questões</h2>
              <p className="text-xs font-medium text-slate-500">
                {total > 0 ? `${total} questões disponíveis ` : 'Nenhuma questão cadastrada ainda'}
              </p>
            </div>
          </div>

          <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
            {(profile?.nome || 'A').charAt(0).toUpperCase()}
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* BARRA DE FILTROS */}
          <div className="hidden md:flex w-72 bg-white border-r border-slate-200 overflow-y-auto shrink-0 p-5 flex-col gap-6">
            {painelFiltros}
          </div>

          {/* CELULAR: busca + botão de filtros (a lista de assuntos abre numa gaveta) */}
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2.5 shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(0); }}
                  placeholder="Buscar questão..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm font-medium focus:outline-none focus:border-brand-orange"
                />
              </div>
              <button
                onClick={() => setFiltrosAbertos(true)}
                className={`relative flex items-center gap-1.5 px-3.5 rounded-xl border text-sm font-bold cursor-pointer ${
                  filtrosAtivos > 0 ? 'border-brand-orange text-brand-orange bg-orange-50' : 'border-slate-200 text-slate-600'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" /> Filtros
                {filtrosAtivos > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center">
                    {filtrosAtivos}
                  </span>
                )}
              </button>
            </div>

            {(assuntoSelecionado || dificuldade) && (
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5">
                {assuntoSelecionado && (
                  <button
                    onClick={() => { setAssuntoIdSelecionado(''); setPagina(0); }}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-brand-orange text-xs font-bold cursor-pointer"
                  >
                    {assuntoSelecionado.nome} <X className="w-3 h-3" />
                  </button>
                )}
                {dificuldade && (
                  <button
                    onClick={() => { setDificuldade(''); setPagina(0); }}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    {ROTULO_DIFICULDADE[dificuldade]} <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {filtrosAbertos && (
            <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filtros">
              <button aria-label="Fechar" onClick={() => setFiltrosAbertos(false)} className="absolute inset-0 bg-slate-950/50" />
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-[28px] flex flex-col">
                <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mt-3" />
                <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 flex flex-col gap-6">
                  {painelFiltros}
                </div>
                <div className="p-4 border-t border-slate-100 pb-[calc(16px+env(safe-area-inset-bottom))]">
                  <button
                    onClick={() => setFiltrosAbertos(false)}
                    className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl cursor-pointer"
                  >
                    {loading ? 'Carregando…' : `Ver ${questoesEmbaralhadas.length} ${questoesEmbaralhadas.length === 1 ? 'questão' : 'questões'}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ÁREA DA QUESTÃO */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-4 md:space-y-5 pb-6 md:pb-12">
              {loading && (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Carregando questão...
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
                  Erro ao carregar questões: {error.message}
                </div>
              )}

              {!loading && !error && questoesEmbaralhadas.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700 mb-1">Nenhuma questão por aqui ainda</h3>
                  <p className="text-sm text-slate-500">Assim que o professor cadastrar questões da sua turma, elas aparecem aqui.</p>
                </div>
              )}

              {!loading && questaoAtual && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-500">
                      Questão <span className="text-slate-900">{pagina + 1}</span> de {questoesEmbaralhadas.length} <span className="text-xs text-orange-500 font-bold ml-1"></span>
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-50 border-b border-slate-100 px-4 md:px-5 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {questaoAtual.materia}
                        </span>
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-bold">
                          {questaoAtual.assunto}
                        </span>
                        {questaoAtual.banca && (
                          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                            {questaoAtual.banca}{questaoAtual.ano ? ` · ${questaoAtual.ano}` : ''}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={alternarFavorito}
                        className={`p-1 -m-1 shrink-0 transition-colors cursor-pointer ${favoritado ? 'text-brand-orange' : 'text-slate-400 hover:text-brand-orange'}`}
                        title={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Bookmark className="w-4.5 h-4.5" fill={favoritado ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div
                      className="p-4 md:p-8 select-none space-y-4"
                      onCopy={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {/* ENUNCIADO SEGURO (Exibe blocos ou texto puro caso venham em colunas diferentes) */}
                      {questaoAtual.blocos_enunciado && questaoAtual.blocos_enunciado.length > 0 ? (
                        <div className="text-slate-800 font-medium leading-relaxed md:text-justify text-[15px] md:text-base">
                          <RenderBlocos blocos={questaoAtual.blocos_enunciado} />
                        </div>
                      ) : questaoAtual.enunciado ? (
                        <p className="text-slate-800 font-medium leading-relaxed md:text-justify whitespace-pre-wrap text-[15px] md:text-base">
                          {questaoAtual.enunciado}
                        </p>
                      ) : null}

                      {/* Imagem / Gráfico Principal */}
                      {questaoAtual.imagem_url && (
                        <div className="my-4 flex flex-col items-center justify-center">
                          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs inline-block max-w-full">
                            <img
                              src={questaoAtual.imagem_url}
                              alt="Gráfico ou Tabela"
                              className="max-h-72 w-auto object-contain rounded-xl mx-auto"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        {questaoAtual.alternativas?.map((alt) => (
                          <button
                            key={alt.letra}
                            disabled={respondida}
                            onClick={() => setRespostaSelecionada(alt.letra)}
                            className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-colors group cursor-pointer ${
                              gabaritoRevelado && alt.letra === questaoAtual.resposta_correta
                                ? 'border-emerald-500 bg-emerald-50/60'
                                : gabaritoRevelado && alt.letra === respostaSelecionada
                                ? 'border-red-400 bg-red-50/60'
                                : respostaSelecionada === alt.letra
                                ? 'border-brand-orange bg-orange-50/60'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            } ${respondida ? 'cursor-default' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                              respostaSelecionada === alt.letra || (gabaritoRevelado && alt.letra === questaoAtual.resposta_correta)
                                ? 'bg-brand-orange text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                            }`}>
                              {alt.letra}
                            </div>
                            <span className="font-medium text-sm text-slate-700 flex-1">
                              {alt.blocos && alt.blocos.length > 0 ? (
                                <RenderBlocos blocos={alt.blocos} imgHeight="h-8" />
                              ) : (
                                alt.texto
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between gap-3">
                      <button
                        onClick={() => setMostrarComentario(!mostrarComentario)}
                        disabled={!gabaritoRevelado}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span className="sm:hidden">Comentário</span>
                        <span className="hidden sm:inline">Comentário do Professor</span>
                      </button>

                      {!respondida ? (
                        <button
                          onClick={handleResponder}
                          disabled={!respostaSelecionada || enviando}
                          className="px-5 py-2.5 md:py-2 bg-brand-orange hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Responder
                        </button>
                      ) : !gabaritoRevelado ? (
                        <button
                          onClick={revelarGabarito}
                          className="flex items-center gap-1.5 px-5 py-2.5 md:py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Ver Gabarito
                        </button>
                      ) : (
                        <button
                          onClick={irParaProxima}
                          className="flex items-center gap-1.5 px-5 py-2.5 md:py-2 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Próxima <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {gabaritoRevelado && mostrarComentario && (
                      <div className="px-4 md:px-6 py-5 bg-orange-50/60 border-t border-orange-100 select-none">
                        <ResolucaoProfessor
                          key={questaoAtual.id}
                          comentario={questaoAtual.comentario}
                          videoUrl={questaoAtual.video_resolucao_url || questaoAtual.resolucao_video_url}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={irParaAnterior}
                      disabled={pagina === 0}
                      className="flex items-center gap-1.5 px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}