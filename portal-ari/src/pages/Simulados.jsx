import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, BookOpen, Settings2, PlayCircle, Clock,
  ChevronLeft, ChevronRight, CheckCircle2, LayoutGrid, ArrowLeft, Loader2, Eye, MessageSquare, Check, XCircle, EyeOff, Folder, ChevronDown
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth';
import {
  useSimulados, buscarQuestoesDoSimulado, criarSimuladoAluno,
  iniciarTentativa, finalizarTentativa,
} from '../hooks/useSimulados';
import { buscarQuestoesParaSimulado, aplicarGabarito } from '../hooks/useQuestoes';
import RenderBlocos from '../components/RenderBlocos';
import ResolucaoProfessor from '../components/ResolucaoProfessor';
import { supabase } from '../lib/supabaseClient';

import { useAvisos } from '../components/Avisos';
export default function Simulados() {
  const avisos = useAvisos();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [modoResolucao, setModoResolucao] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState('oficial');
  
  // 👈 Novos estados para a árvore hierárquica na aba "Por Assunto"
  const [assuntosArvore, setAssuntosArvore] = useState([]);
  const [assuntoIdSelecionado, setAssuntoIdSelecionado] = useState('');
  const [assuntoNomeSelecionado, setAssuntoNomeSelecionado] = useState('');
  const [categoriasAbertas, setCategoriasAbertas] = useState({});
  const [loadingAssuntosArvore, setLoadingAssuntosArvore] = useState(false);

  const [quantidadePersonalizada, setQuantidadePersonalizada] = useState(15);
  const [dificuldadePersonalizada, setDificuldadePersonalizada] = useState('misto');
  const [gerando, setGerando] = useState(false);

  const { simulados: simuladosOficiais, loading: loadingOficiais } = useSimulados({ tipo: 'oficial' });

  // Busca a árvore de assuntos da turma do aluno para a aba "Por Assunto"
  useEffect(() => {
    async function carregarArvoreTurma() {
      if (!profile?.turma_id) return;
      setLoadingAssuntosArvore(true);
      try {
        const { data: arvore, error } = await supabase
          .from('assuntos_hierarquia')
          .select('*')
          .eq('turma_id', profile.turma_id)
          .order('created_at', { ascending: true });

        if (!error && arvore) {
          setAssuntosArvore(arvore);
          // Abre os nós principais por padrão
          const idsIniciais = {};
          arvore.filter(a => !a.categoria_pai_id).forEach(p => { idsIniciais[p.id] = true; });
          setCategoriasAbertas(idsIniciais);
        }
      } catch (err) {
        console.error('Erro ao carregar árvore de assuntos:', err);
      } finally {
        setLoadingAssuntosArvore(false);
      }
    }
    carregarArvoreTurma();
  }, [profile]);

  const toggleCategoria = (id) => {
    setCategoriasAbertas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [simuladoAtivo, setSimuladoAtivo] = useState(null); 
  const [tentativaId, setTentativaId] = useState(null);
  const [questoesProva, setQuestoesProva] = useState([]);
  const [carregandoProva, setCarregandoProva] = useState(false);

  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [respostas, setRespostas] = useState({}); 
  const [finalizando, setFinalizando] = useState(false);
  const [resultado, setResultado] = useState(null); 
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [visualizandoGabarito, setVisualizandoGabarito] = useState(false); 
  const [gabaritoReveladoNaQuestao, setGabaritoReveladoNaQuestao] = useState(false);

  const handleVoltar = () => navigate('/dashboard');

  useEffect(() => {
    if (!modoResolucao || resultado) return;
    if (segundosRestantes <= 0) return;
    const t = setInterval(() => setSegundosRestantes((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [modoResolucao, resultado, segundosRestantes]);

  const formatarTempo = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  async function abrirProva(simulado) {
    setCarregandoProva(true);
    setSimuladoAtivo(simulado);

    const { questoes, error } = await buscarQuestoesDoSimulado(simulado.id);
    if (error || questoes.length === 0) {
      avisos.erro('Não foi possível carregar as questões desse simulado.');
      setCarregandoProva(false);
      return;
    }

    const { tentativa, error: erroTentativa } = await iniciarTentativa(simulado.id);
    if (erroTentativa) {
      avisos.erro('Não foi possível iniciar o simulado.');
      setCarregandoProva(false);
      return;
    }

    setQuestoesProva(questoes);
    setTentativaId(tentativa.id);
    setRespostas({});
    setQuestaoAtual(0);
    setResultado(null);
    setVisualizandoGabarito(false);
    setGabaritoReveladoNaQuestao(false);
    setSegundosRestantes((simulado.tempo_minutos ?? 60) * 60);
    setModoResolucao(true);
    setCarregandoProva(false);
  }

  const iniciarOficial = (simulado) => abrirProva(simulado);

  const iniciarPorAssuntoHierarquico = async () => {
    if (!assuntoIdSelecionado) return;
    setGerando(true);

    try {
      // Busca questões vinculadas ao assunto_id selecionado na árvore
      let query = supabase.from('questoes').select('id').eq('assunto_id', assuntoIdSelecionado);
      if (profile?.turma_id) {
        query = query.eq('turma_id', profile.turma_id);
      }
      const { data: questoesData, error: erroBusca } = await query;

      if (erroBusca || !questoesData || questoesData.length === 0) {
        avisos.info('Ainda não há questões cadastradas para este assunto.');
        setGerando(false);
        return;
      }

      const questaoIds = questoesData.map(q => q.id);

      const { simulado, error } = await criarSimuladoAluno({
        titulo: `Treino: ${assuntoNomeSelecionado}`,
        turmaId: profile.turma_id,
        tipo: 'assunto',
        tempoMinutos: Math.max(15, questaoIds.length * 3),
        questaoIds,
      });

      setGerando(false);
      if (error) {
        avisos.erro('Não foi possível gerar o simulado. Tente novamente.');
        return;
      }
      abrirProva(simulado);
    } catch (err) {
      console.error('Erro ao iniciar treino por assunto:', err);
      setGerando(false);
    }
  };

  const iniciarPersonalizado = async () => {
    setGerando(true);

    const { questaoIds, error: erroBusca } = await buscarQuestoesParaSimulado({
      dificuldade: dificuldadePersonalizada,
      quantidade: quantidadePersonalizada,
    });

    if (erroBusca || questaoIds.length === 0) {
      avisos.info('Ainda não há questões suficientes com esse filtro.');
      setGerando(false);
      return;
    }

    const { simulado, error } = await criarSimuladoAluno({
      titulo: `Personalizado (${quantidadePersonalizada} questões)`,
      turmaId: profile.turma_id,
      tipo: 'personalizado',
      tempoMinutos: Math.max(20, quantidadePersonalizada * 2),
      questaoIds,
    });

    setGerando(false);
    if (error) {
      avisos.erro('Não foi possível gerar o simulado. Tente novamente.');
      return;
    }
    abrirProva(simulado);
  };

  const handleResponder = (letra) => {
    if (resultado) return; 
    const id = questoesProva[questaoAtual].id;
    setRespostas((prev) => ({ ...prev, [id]: letra }));
  };

  // A correção acontece NO BANCO (o gabarito não fica no navegador durante a prova).
  // Ele devolve o placar e o gabarito, que é juntado às questões para a tela de revisão.
  const handleFinalizar = async () => {
    if (finalizando) return;
    setFinalizando(true);

    const { resultado: r, error } = await finalizarTentativa(tentativaId, respostas);
    if (error || !r) {
      setFinalizando(false);
      avisos.erro('Não foi possível corrigir o simulado. Verifique sua conexão e tente finalizar de novo.');
      return;
    }

    setQuestoesProva((qs) => aplicarGabarito(qs, r.gabarito));
    setResultado({ acertos: r.acertos, erros: r.erros, emBranco: r.em_branco });
    setFinalizando(false);
  };

  // Acabou o tempo: encerra a prova sozinho (antes o cronômetro parava em 00:00:00 e a prova seguia aberta).
  useEffect(() => {
    if (modoResolucao && !resultado && !finalizando && tentativaId && segundosRestantes === 0) {
      handleFinalizar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoResolucao, segundosRestantes]);

  const sairDaProva = () => {
    setModoResolucao(false);
    setSimuladoAtivo(null);
    setQuestoesProva([]);
    setResultado(null);
    setVisualizandoGabarito(false);
    setGabaritoReveladoNaQuestao(false);
  };

  const mudarQuestao = (novaIndex) => {
    setQuestaoAtual(novaIndex);
    setGabaritoReveladoNaQuestao(false);
  };

  const principais = assuntosArvore.filter(a => !a.categoria_pai_id);
  const getSub = (paiId) => assuntosArvore.filter(a => a.categoria_pai_id === paiId);

  // ==========================================
  // MODO DE RESOLUÇÃO OU GABARITO PÓS-PROVA
  // ==========================================
  if (modoResolucao) {
    const questao = questoesProva[questaoAtual];
    const respostaAluno = respostas[questao?.id];

    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={sairDaProva}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              aria-label="Sair da prova"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-sm">
                {simuladoAtivo?.titulo} {visualizandoGabarito && <span className="text-brand-orange ml-2">· Revisão com Gabarito</span>}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Questão {questaoAtual + 1} de {questoesProva.length}</p>
            </div>
          </div>

          {!resultado && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-sm border border-red-100">
              <Clock className="w-4 h-4" />
              {formatarTempo(segundosRestantes)}
            </div>
          )}

          {resultado && !visualizandoGabarito && (
            <button
              onClick={() => { setVisualizandoGabarito(true); setGabaritoReveladoNaQuestao(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" /> Entrar no Modo Gabarito
            </button>
          )}

          {visualizandoGabarito && (
            <button
              onClick={() => { setVisualizandoGabarito(false); setGabaritoReveladoNaQuestao(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Voltar ao Sumário
            </button>
          )}
        </header>

        {resultado && !visualizandoGabarito ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-black text-slate-900 mb-1">Simulado finalizado!</h2>
              <p className="text-sm text-slate-500 font-medium mb-6">Confira seu desempenho:</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-emerald-600">{resultado.acertos}</p>
                  <p className="text-xs font-bold text-emerald-700">Acertos</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-red-600">{resultado.erros}</p>
                  <p className="text-xs font-bold text-red-700">Erros</p>
                </div>
                <div className="bg-slate-100 rounded-xl p-3">
                  <p className="text-2xl font-black text-slate-600">{resultado.emBranco}</p>
                  <p className="text-xs font-bold text-slate-500">Em branco</p>
                </div>
              </div>

              <button
                onClick={() => { setVisualizandoGabarito(true); setGabaritoReveladoNaQuestao(false); }}
                className="w-full py-3 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors mb-2 cursor-pointer shadow-md"
              >
                Ver Gabarito por Demanda
              </button>
              <button
                onClick={sairDaProva}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Voltar aos Simulados
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden">

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                {!questao ? (
                  <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando questão...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {questao.materia}{questao.assunto ? ` · ${questao.assunto}` : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">Questão {questaoAtual + 1}</span>
                        
                        {resultado && (
                          <button
                            onClick={() => setGabaritoReveladoNaQuestao(!gabaritoReveladoNaQuestao)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              gabaritoReveladoNaQuestao 
                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                                : 'bg-brand-orange text-white hover:bg-orange-600 shadow-sm'
                            }`}
                          >
                            {gabaritoReveladoNaQuestao ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {gabaritoReveladoNaQuestao ? 'Ocultar Gabarito' : 'Ver Gabarito'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="select-none" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
                      <p className="text-lg text-slate-800 leading-relaxed font-medium mb-6 text-justify">
                        {questao.blocos_enunciado?.length > 0 ? (
                          <RenderBlocos blocos={questao.blocos_enunciado} imgHeight="h-20" />
                        ) : (
                          questao.enunciado
                        )}
                      </p>

                      {questao.imagem_url && (
                        <img src={questao.imagem_url} alt="Ilustração" className="rounded-xl border border-slate-200 max-h-72 mx-auto mb-6 object-contain" />
                      )}

                      {/* ALTERNATIVAS */}
                      <div className="space-y-2.5">
                        {questao.alternativas?.map((alt) => {
                          const isMarcada = respostaAluno === alt.letra;
                          const isCorreta = alt.letra === questao.resposta_correta;

                          let estilosBota_o = 'border-slate-200 bg-white hover:border-brand-orange/40 text-slate-700';
                          let estilosCirculo = 'bg-slate-100 text-slate-600';

                          if (resultado && gabaritoReveladoNaQuestao) {
                            if (isCorreta) {
                              estilosBota_o = 'border-emerald-500 bg-emerald-50/80 text-slate-900';
                              estilosCirculo = 'bg-emerald-500 text-white';
                            } else if (isMarcada && !isCorreta) {
                              estilosBota_o = 'border-red-400 bg-red-50/80 text-slate-900';
                              estilosCirculo = 'bg-red-500 text-white';
                            }
                          } else {
                            if (isMarcada) {
                              estilosBota_o = 'border-brand-orange bg-orange-50 text-slate-900';
                              estilosCirculo = 'bg-brand-orange text-white';
                            }
                          }

                          return (
                            <button
                              key={alt.letra}
                              disabled={!!resultado}
                              onClick={() => handleResponder(alt.letra)}
                              className={`w-full flex items-center text-left p-4 rounded-xl border transition-colors ${estilosBota_o} ${resultado ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 shrink-0 transition-colors ${estilosCirculo}`}>
                                {alt.letra}
                              </div>
                              <span className="text-base font-medium flex-1">
                                {alt.blocos?.length > 0 ? <RenderBlocos blocos={alt.blocos} imgHeight="h-10" /> : alt.texto}
                              </span>

                              {resultado && gabaritoReveladoNaQuestao && isCorreta && (
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md ml-2 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Correta
                                </span>
                              )}
                              {resultado && gabaritoReveladoNaQuestao && isMarcada && !isCorreta && (
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-md ml-2 flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> Sua escolha
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* COMENTÁRIO DO PROFESSOR */}
                      {resultado && gabaritoReveladoNaQuestao && (
                        <div className="mt-6 p-5 bg-orange-50/70 border border-orange-200 rounded-2xl animate-fade-in">
                          <ResolucaoProfessor
                            key={questao.id}
                            titulo="Resolução Comentada do Professor"
                            comentario={questao.comentario}
                            videoUrl={questao.video_resolucao_url || questao.resolucao_video_url}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <button
                  onClick={() => mudarQuestao(Math.max(0, questaoAtual - 1))}
                  disabled={questaoAtual === 0}
                  className="flex items-center px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" /> Anterior
                </button>

                {!resultado && questaoAtual === questoesProva.length - 1 ? (
                  <button
                    onClick={handleFinalizar}
                    disabled={finalizando}
                    className="flex items-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-70 cursor-pointer"
                  >
                    {finalizando ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                    Finalizar Prova
                  </button>
                ) : (
                  <button
                    onClick={() => mudarQuestao(Math.min(questoesProva.length - 1, questaoAtual + 1))}
                    disabled={questaoAtual === questoesProva.length - 1}
                    className="flex items-center px-6 py-2.5 bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-md cursor-pointer"
                  >
                    Próxima <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-800">Mapa de Questões</h3>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-5 gap-2">
                  {questoesProva.map((q, i) => {
                    const isRespondida = !!respostas[q.id];
                    const isAtual = questaoAtual === i;
                    const escolhida = respostas[q.id];
                    const correta = q.resposta_correta;

                    let corMapa = 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent';
                    if (resultado && visualizandoGabarito) {
                      if (escolhida === correta) {
                        corMapa = 'bg-emerald-100 text-emerald-700 border-emerald-300';
                      } else if (escolhida) {
                        corMapa = 'bg-red-100 text-red-700 border-red-300';
                      } else {
                        corMapa = 'bg-slate-100 text-slate-400 border-slate-200';
                      }
                    } else if (isRespondida) {
                      corMapa = 'bg-brand-orange/20 text-brand-orange border-brand-orange/30';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => mudarQuestao(i)}
                        className={`h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-all border cursor-pointer ${
                          isAtual
                            ? 'ring-2 ring-brand-orange ring-offset-2 bg-slate-900 text-white border-slate-900'
                            : corMapa
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-1.5">
                {resultado && visualizandoGabarito ? (
                  <>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Acertou
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div> Errou / Em branco
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-brand-orange/20 border border-brand-orange/30"></div> Respondidas ({Object.keys(respostas).length})
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></div> Em branco ({questoesProva.length - Object.keys(respostas).length})
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // HUB DE CONFIGURAÇÃO DO SIMULADO (TELA 1)
  // ==========================================
  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto">

          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={handleVoltar}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-brand-orange border border-slate-200 transition-colors shrink-0 cursor-pointer"
              aria-label="Voltar ao dashboard"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Central de Simulados</h1>
              <p className="text-slate-500 text-sm font-medium">Configure seu ambiente de prova e teste seus conhecimentos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setTipoSelecionado('oficial')}
              className={`p-5 rounded-2xl border text-left transition-colors cursor-pointer ${tipoSelecionado === 'oficial' ? 'border-brand-orange bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-orange-200'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tipoSelecionado === 'oficial' ? 'bg-brand-orange text-white' : 'bg-orange-50 text-brand-orange'}`}>
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">Oficial</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Simulados oficiais preparados pelo professor.</p>
            </button>

            <button
              onClick={() => setTipoSelecionado('assunto')}
              className={`p-5 rounded-2xl border text-left transition-colors cursor-pointer ${tipoSelecionado === 'assunto' ? 'border-brand-orange bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-orange-200'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tipoSelecionado === 'assunto' ? 'bg-brand-orange text-white' : 'bg-orange-50 text-brand-orange'}`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">Por Assunto</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Foque nos seus pontos fracos por Módulos e Tópicos.</p>
            </button>

            <button
              onClick={() => setTipoSelecionado('personalizado')}
              className={`p-5 rounded-2xl border text-left transition-colors cursor-pointer ${tipoSelecionado === 'personalizado' ? 'border-brand-orange bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-orange-200'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tipoSelecionado === 'personalizado' ? 'bg-brand-orange text-white' : 'bg-orange-50 text-brand-orange'}`}>
                <Settings2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">Personalizado</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Escolha a quantidade de questões e a dificuldade.</p>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7 shadow-sm">

            {tipoSelecionado === 'oficial' && (
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-5">Simulados Oficiais Disponíveis</h2>
                {loadingOficiais ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
                  </div>
                ) : simuladosOficiais.length === 0 ? (
                  <p className="text-sm text-slate-400 font-medium text-center py-10">
                    Nenhum simulado oficial cadastrado pra sua turma ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {simuladosOficiais.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{s.titulo}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {s.simulado_questoes?.[0]?.count ?? 0} questões · {s.tempo_minutos} min
                          </p>
                        </div>
                        <button
                          onClick={() => iniciarOficial(s)}
                          disabled={carregandoProva}
                          className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-70 cursor-pointer"
                        >
                          {carregandoProva && simuladoAtivo?.id === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                          Iniciar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA "POR ASSUNTO" COM A ÁRVORE HIERÁRQUICA MULTINÍVEL */}
            {tipoSelecionado === 'assunto' && (
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-2">Selecione o Módulo / Assunto</h2>
                <p className="text-xs text-slate-500 mb-5">Navegue pela árvore de conteúdos da sua turma para focar seu treino.</p>

                {loadingAssuntosArvore ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando árvore de assuntos...
                  </div>
                ) : assuntosArvore.length === 0 ? (
                  <p className="text-sm text-slate-400 font-medium text-center py-10">
                    Nenhum assunto cadastrado na árvore da sua turma ainda.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2 mb-6 border border-slate-100 rounded-xl p-3 bg-slate-50">
                    {principais.map((pai) => {
                      const subitensNivel1 = getSub(pai.id);
                      const isOpenPai = categoriasAbertas[pai.id];
                      const isPaiSelecionado = assuntoIdSelecionado === pai.id;

                      return (
                        <div key={pai.id} className="space-y-1">
                          <div className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors border ${
                            isPaiSelecionado ? 'bg-orange-50 border-orange-200 text-brand-orange font-bold' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}>
                            <button
                              onClick={() => { setAssuntoIdSelecionado(pai.id); setAssuntoNomeSelecionado(pai.nome); }}
                              className="flex items-center gap-2 text-xs font-bold flex-1 text-left cursor-pointer uppercase truncate"
                            >
                              <Folder className="w-4 h-4 text-brand-orange shrink-0" />
                              <span className="truncate">{pai.nome}</span>
                            </button>

                            {subitensNivel1.length > 0 && (
                              <button
                                onClick={() => toggleCategoria(pai.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {isOpenPai ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                          </div>

                          {/* Subitens Nível 1 */}
                          {isOpenPai && subitensNivel1.length > 0 && (
                            <div className="pl-4 space-y-1.5 border-l-2 border-slate-200 ml-3 my-1">
                              {subitensNivel1.map((sub1) => {
                                const subitensNivel2 = getSub(sub1.id);
                                const isOpenSub1 = categoriasAbertas[sub1.id];
                                const isSub1Selecionado = assuntoIdSelecionado === sub1.id;

                                return (
                                  <div key={sub1.id} className="space-y-1">
                                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors border ${
                                      isSub1Selecionado ? 'bg-orange-50 border-orange-200 text-brand-orange font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}>
                                      <button
                                        onClick={() => { setAssuntoIdSelecionado(sub1.id); setAssuntoNomeSelecionado(sub1.nome); }}
                                        className="flex items-center gap-1.5 text-xs flex-1 text-left cursor-pointer truncate font-semibold"
                                      >
                                        <span>📂</span>
                                        <span className="truncate">{sub1.nome}</span>
                                      </button>

                                      {subitensNivel2.length > 0 && (
                                        <button
                                          onClick={() => toggleCategoria(sub1.id)}
                                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                          {isOpenSub1 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                      )}
                                    </div>

                                    {/* Subitens Nível 2 / Folhas Finais */}
                                    {isOpenSub1 && subitensNivel2.length > 0 && (
                                      <div className="pl-4 space-y-1 border-l border-slate-200 ml-2 my-1">
                                        {subitensNivel2.map((sub2) => {
                                          const isSub2Selecionado = assuntoIdSelecionado === sub2.id;
                                          return (
                                            <button
                                              key={sub2.id}
                                              onClick={() => { setAssuntoIdSelecionado(sub2.id); setAssuntoNomeSelecionado(sub2.nome); }}
                                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer truncate flex items-center gap-2 border ${
                                                isSub2Selecionado ? 'bg-orange-50 border-orange-200 text-brand-orange font-bold' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                              }`}
                                            >
                                              <span>📄</span>
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
                )}

                <button
                  onClick={iniciarPorAssuntoHierarquico}
                  disabled={!assuntoIdSelecionado || gerando}
                  className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-brand-orange disabled:bg-slate-300 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                  {assuntoNomeSelecionado ? `Iniciar Treino: ${assuntoNomeSelecionado}` : 'Selecione um assunto acima'}
                </button>
              </div>
            )}

            {tipoSelecionado === 'personalizado' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quantidade de Questões</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {[10, 15, 20, 30, 45].map((num) => (
                        <button
                          key={num}
                          onClick={() => setQuantidadePersonalizada(num)}
                          className={`px-5 py-2.5 border rounded-xl font-bold text-sm transition-colors cursor-pointer ${quantidadePersonalizada === num ? 'bg-brand-orange text-white border-brand-orange shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-brand-orange text-slate-700'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Nível de Dificuldade</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { valor: 'facil', label: 'Fácil' },
                        { valor: 'medio', label: 'Médio' },
                        { valor: 'dificil', label: 'Difícil' },
                        { valor: 'misto', label: 'Misto' },
                      ].map((op) => (
                        <button
                          key={op.valor}
                          onClick={() => setDificuldadePersonalizada(op.valor)}
                          className={`px-5 py-2.5 border rounded-xl font-bold text-sm transition-colors cursor-pointer ${dificuldadePersonalizada === op.valor ? 'bg-brand-orange text-white border-brand-orange shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-brand-orange text-slate-700'}`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={iniciarPersonalizado}
                  disabled={gerando}
                  className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-70 cursor-pointer shadow-md"
                >
                  {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                  Gerar Simulado
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}