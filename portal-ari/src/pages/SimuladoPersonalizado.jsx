import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FileText, CheckCircle2, XCircle, ArrowRight, ArrowLeft, 
  Loader2, Zap, Filter, Award, BookOpen, RotateCcw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import RenderBlocos from '../components/RenderBlocos';
import { useGamificacao } from '../hooks/useGamificacao';
import { responderQuestaoAvulsa } from '../hooks/useQuestoes';

export default function SimuladoPersonalizado() {
  const navigate = useNavigate();
  const { recarregar } = useGamificacao();

  // Estados de Configuração
  const [etapa, setEtapa] = useState('config'); // 'config' | 'quiz' | 'resultado'
  const [turmaId, setTurmaId] = useState(null);
  const [assuntosArvore, setAssuntosArvore] = useState([]);
  const [assuntoSelecionado, setAssuntoSelecionado] = useState('');
  const [dificuldadeFiltro, setDificuldadeFiltro] = useState('');
  const [quantidadeDesejada, setQuantidadeDesejada] = useState(5);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Estados da Prova/Quiz
  const [questoesQuiz, setQuestoesQuiz] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostasUsuario, setRespostasUsuario] = useState({}); // { [questaoId]: 'A' }
  const [gabaritosRevelados, setGabaritosRevelados] = useState({}); // { [questaoId]: true }
  const [resultadosServidor, setResultadosServidor] = useState({}); // { [questaoId]: { correta, xp } }
  const [confirmando, setConfirmando] = useState(false);
  const [carregandoQuiz, setCarregandoQuiz] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState({ acertos: 0, total: 0, xpGanho: 0 });

  // 1. Carrega dados do perfil e a árvore de assuntos da turma do aluno
  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        const { data: profile } = await supabase
          .from('profiles')
          .select('turma_id')
          .eq('id', user.id)
          .single();

        if (profile && profile.turma_id) {
          setTurmaId(profile.turma_id);

          const { data: arvore } = await supabase
            .from('assuntos_hierarquia')
            .select('*')
            .eq('turma_id', profile.turma_id)
            .order('created_at', { ascending: true });

          if (arvore) setAssuntosArvore(arvore);
        }
      } catch (err) {
        console.error('Erro ao carregar simulado:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    carregarDados();
  }, [navigate]);

  // 2. Iniciar o Simulado filtrando as questões
  const handleIniciarSimulado = async (e) => {
    e.preventDefault();
    setCarregandoQuiz(true);

    try {
      let query = supabase
        .from('questoes')
        .select('*')
        .eq('turma_id', turmaId);

      // Se selecionou um assunto específico da árvore
      if (assuntoSelecionado) {
        query = query.eq('assunto_id', assuntoSelecionado);
      }

      // Se selecionou dificuldade
      if (dificuldadeFiltro) {
        query = query.eq('dificuldade', dificuldadeFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('Nenhuma questão encontrada com esses filtros. Tente selecionar outro assunto ou limpar a dificuldade!');
        setCarregandoQuiz(false);
        return;
      }

      // Embaralha as questões e pega a quantidade escolhida
      const embaralhadas = [...data].sort(() => 0.5 - Math.random());
      const selecionadas = embaralhadas.slice(0, parseInt(quantidadeDesejada));

      setQuestoesQuiz(selecionadas);
      setIndiceAtual(0);
      setRespostasUsuario({});
      setGabaritosRevelados({});
      setResultadosServidor({});
      setEtapa('quiz');
    } catch (err) {
      console.error('Erro ao buscar questões:', err.message);
      alert('Erro ao iniciar simulado.');
    } finally {
      setCarregandoQuiz(false);
    }
  };

  const questaoAtual = questoesQuiz[indiceAtual];

  const selecionarAlternativa = (letra) => {
    if (gabaritosRevelados[questaoAtual.id]) return; // Não muda se já revelou o gabarito
    setRespostasUsuario(prev => ({ ...prev, [questaoAtual.id]: letra }));
  };

  // O servidor corrige, grava a resposta, concede o XP e devolve o gabarito desta questão.
  const confirmarRespostaAtual = async () => {
    const q = questaoAtual;
    if (!q || !respostasUsuario[q.id] || confirmando || gabaritosRevelados[q.id]) return;

    setConfirmando(true);
    const { resultado, error } = await responderQuestaoAvulsa(q.id, respostasUsuario[q.id], 'personalizado');
    setConfirmando(false);

    if (error || !resultado) {
      alert('Não foi possível confirmar a resposta. Tente novamente.');
      return;
    }

    setQuestoesQuiz(prev => prev.map(x => (
      x.id === q.id
        ? { ...x, resposta_correta: resultado.resposta_correta, comentario: resultado.comentario }
        : x
    )));
    setResultadosServidor(prev => ({ ...prev, [q.id]: { correta: resultado.correta, xp: resultado.xp_ganho } }));
    setGabaritosRevelados(prev => ({ ...prev, [q.id]: true }));
  };

  const proximaQuestao = () => {
    if (indiceAtual < questoesQuiz.length - 1) {
      setIndiceAtual(prev => prev + 1);
    } else {
      finalizarSimulado();
    }
  };

  const finalizarSimulado = async () => {
    setFinalizando(true);
    try {
      // Acertos e XP vêm das respostas já corrigidas pelo servidor.
      const lista = Object.values(resultadosServidor);
      const acertos = lista.filter(r => r.correta).length;
      const xpGanho = lista.reduce((soma, r) => soma + (r.xp || 0), 0);

      if (xpGanho > 0) recarregar();

      setResultadoFinal({ acertos, total: questoesQuiz.length, xpGanho });
      setEtapa('resultado');
    } finally {
      setFinalizando(false);
    }
  };

  const principais = assuntosArvore.filter(a => !a.categoria_pai_id);
  const getSub = (paiId) => assuntosArvore.filter(a => a.categoria_pai_id === paiId);

  if (loadingConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/10 text-brand-orange rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Simulado Personalizado</h1>
              <p className="text-xs text-slate-400">Treine com foco total nos seus pontos de melhoria</p>
            </div>
          </div>
        </header>

        {/* ETAPA 1: CONFIGURAÇÃO DO SIMULADO */}
        {etapa === 'config' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <Filter className="w-5 h-5 text-brand-orange" /> Configurar Novo Simulado
              </h2>
              <p className="text-sm text-slate-400 mb-6">Selecione os parâmetros para gerar seu treino sob medida.</p>

              <form onSubmit={handleIniciarSimulado} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Filtrar por Assunto / Módulo
                  </label>
                  <select
                    value={assuntoSelecionado}
                    onChange={(e) => setAssuntoSelecionado(e.target.value)}
                    className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium outline-none focus:border-brand-orange"
                  >
                    <option value="">📁 Todos os Assuntos (Geral)</option>
                    {principais.map(pai => {
                      const subitens = getSub(pai.id);
                      return (
                        <React.Fragment key={pai.id}>
                          <option value={pai.id} className="font-bold">📂 {pai.nome}</option>
                          {subitens.map(sub => (
                            <option key={sub.id} value={sub.id}>&nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.nome}</option>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Dificuldade
                    </label>
                    <select
                      value={dificuldadeFiltro}
                      onChange={(e) => setDificuldadeFiltro(e.target.value)}
                      className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium outline-none focus:border-brand-orange"
                    >
                      <option value="">Todas</option>
                      <option value="facil">Fácil</option>
                      <option value="medio">Médio</option>
                      <option value="dificil">Difícil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Quantidade de Questões
                    </label>
                    <select
                      value={quantidadeDesejada}
                      onChange={(e) => setQuantidadeDesejada(e.target.value)}
                      className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium outline-none focus:border-brand-orange"
                    >
                      <option value="3">3 Questões (Rápido)</option>
                      <option value="5">5 Questões</option>
                      <option value="10">10 Questões</option>
                      <option value="20">20 Questões</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={carregandoQuiz}
                    className="w-full py-4 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {carregandoQuiz ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    {carregandoQuiz ? 'Gerando Simulado...' : 'Iniciar Simulado'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ETAPA 2: RESOLUÇÃO DO QUIZ */}
        {etapa === 'quiz' && questaoAtual && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-3xl mx-auto space-y-6 pb-12">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Questão <strong className="text-white">{indiceAtual + 1}</strong> de {questoesQuiz.length}
                </span>
                <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-brand-orange rounded-lg text-xs font-bold uppercase">
                  {questaoAtual.dificuldade}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                {/* Enunciado */}
                <div className="text-slate-100 font-medium leading-relaxed text-justify">
                  {questaoAtual.blocos_enunciado && questaoAtual.blocos_enunciado.length > 0 ? (
                    <RenderBlocos blocos={questaoAtual.blocos_enunciado} />
                  ) : (
                    <p>{questaoAtual.enunciado}</p>
                  )}
                </div>

                {/* Imagem Principal se houver */}
                {questaoAtual.imagem_url && (
                  <div className="flex justify-center my-4">
                    <img src={questaoAtual.imagem_url} alt="Gráfico da questão" className="max-h-64 rounded-xl border border-slate-700 bg-white p-1 object-contain" />
                  </div>
                )}

                {/* Alternativas */}
                <div className="space-y-3 pt-2">
                  {questaoAtual.alternativas?.map((alt) => {
                    const selecionada = respostasUsuario[questaoAtual.id] === alt.letra;
                    const revelado = gabaritosRevelados[questaoAtual.id];
                    const correta = alt.letra === questaoAtual.resposta_correta;

                    let estiloBorda = 'border-slate-800 bg-slate-950/40 hover:border-slate-700';
                    if (revelado) {
                      if (correta) estiloBorda = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
                      else if (selecionada && !correta) estiloBorda = 'border-red-500 bg-red-500/10 text-red-300';
                    } else if (selecionada) {
                      estiloBorda = 'border-brand-orange bg-orange-500/10 text-white';
                    }

                    return (
                      <button
                        key={alt.letra}
                        disabled={revelado}
                        onClick={() => selecionarAlternativa(alt.letra)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${estiloBorda}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                          selecionada || (revelado && correta) ? 'bg-brand-orange text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {alt.letra}
                        </div>
                        <span className="text-sm font-medium text-slate-200 flex-1">
                          {alt.blocos && alt.blocos.length > 0 ? <RenderBlocos blocos={alt.blocos} /> : alt.texto}
                        </span>
                        {revelado && correta && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {revelado && selecionada && !correta && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Comentário do Professor após revelar */}
                {gabaritosRevelados[questaoAtual.id] && questaoAtual.comentario && (
                  <div className="mt-6 p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-xs font-black uppercase text-brand-orange tracking-wider">Comentário do Professor</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{questaoAtual.comentario}</p>
                  </div>
                )}
              </div>

              {/* Botões de Ação Inferiores */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {!gabaritosRevelados[questaoAtual.id] ? (
                  <button
                    onClick={confirmarRespostaAtual}
                    disabled={!respostasUsuario[questaoAtual.id]}
                    className="px-6 py-3.5 bg-brand-orange hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg"
                  >
                    Confirmar Resposta
                  </button>
                ) : (
                  <button
                    onClick={proximaQuestao}
                    disabled={finalizando}
                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2"
                  >
                    {finalizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    {indiceAtual === questoesQuiz.length - 1 ? 'Ver Resultado Final' : 'Próxima Questão'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: RESULTADO FINAL */}
        {etapa === 'resultado' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white mb-1">Simulado Concluído!</h2>
                <p className="text-sm text-slate-400">Você finalizou seu treino personalizado com sucesso.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-800">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Acertos</span>
                  <span className="text-2xl font-black text-white">{resultadoFinal.acertos} / {resultadoFinal.total}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">XP Ganho</span>
                  <span className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                    <Zap className="w-5 h-5" /> +{resultadoFinal.xpGanho}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => setEtapa('config')}
                  className="w-full py-4 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" /> Configurar Novo Simulado
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Voltar ao Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}