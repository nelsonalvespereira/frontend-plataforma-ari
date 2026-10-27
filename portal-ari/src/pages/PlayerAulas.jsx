import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  ArrowLeft, PlayCircle, CheckCircle2, Loader2, ChevronRight, ChevronLeft, Zap, Clock, BookmarkPlus, Trash2,
  ChevronDown, ChevronUp, Layers, PanelRightClose, PanelRightOpen, StickyNote, Info,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGamificacao } from '../hooks/useGamificacao';
import Sidebar from './Sidebar';
import PlayerProtegido from '../components/PlayerProtegido';

import { useAvisos } from '../components/Avisos';
export default function PlayerAulas() {
  const avisos = useAvisos();
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [aulasPorModulo, setAulasPorModulo] = useState({});
  const [aulaAtual, setAulaAtual] = useState(null);
  const [loadingAulas, setLoadingAulas] = useState(true);
  const [marcandoConcluida, setMarcandoConcluida] = useState(false);

  // Módulos recolhidos/abertos na sidebar: { [moduloId]: boolean }
  const [modulosAbertos, setModulosAbertos] = useState({});

  // progresso[aula_id] = { progresso, concluida }
  const [progresso, setProgresso] = useState({});

  const [sucesso, setSucesso] = useState(false);
  const [ganhouXp, setGanhouXp] = useState(false);
  const { xp, recarregar } = useGamificacao();

  const [anotacoes, setAnotacoes] = useState([]);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [minutoInput, setMinutoInput] = useState('00:00');
  const [carregandoAnotacoes, setCarregandoAnotacoes] = useState(false);
  const playerRef = useRef(null);
  const topoRef = useRef(null);

  // Modo cinema (computador): esconde a lista de aulas para o vídeo ocupar a largura toda.
  const [cinema, setCinema] = useState(false);
  const [abaInfo, setAbaInfo] = useState('anotacoes'); // 'anotacoes' | 'sobre'

  const carregarProgresso = async (userId) => {
    const { data } = await supabase
      .from('progresso_aulas')
      .select('aula_id, progresso, concluida')
      .eq('user_id', userId);

    const mapa = {};
    (data ?? []).forEach((p) => { mapa[p.aula_id] = { progresso: p.progresso, concluida: p.concluida }; });
    setProgresso(mapa);
  };

 useEffect(() => {
    async function carregarDadosCurso() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('turma_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        await carregarProgresso(user.id);

        if (profile?.turma_id) {
          // Tenta buscar os módulos, mas se a tabela falhar, tratamos para não quebrar a tela
          let listaModulos = [];
          const { data: modData } = await supabase
            .from('modulos')
            .select('*')
            .eq('turma_id', profile.turma_id)
            .order('ordem', { ascending: true });
          
          if (modData) listaModulos = modData;

          // Busca todas as aulas da turma
          const { data: listaAulas, error: aulasError } = await supabase
            .from('aulas')
            .select('*')
            .eq('turma_id', profile.turma_id)
            .order('ordem', { ascending: true });

          if (aulasError) throw aulasError;

          const abertosMap = {};
          listaModulos.forEach(m => { abertosMap[m.id] = true; });

          // Agrupa as aulas por módulo ou cria um Módulo Geral automático
          const agrupadas = {};
          const aulasSemModulo = [];

          (listaAulas || []).forEach(aula => {
            if (aula.modulo_id && listaModulos.some(m => m.id === aula.modulo_id)) {
              if (!agrupadas[aula.modulo_id]) agrupadas[aula.modulo_id] = [];
              agrupadas[aula.modulo_id].push(aula);
            } else {
              aulasSemModulo.push(aula);
            }
          });

          let modulosFinais = [...listaModulos];
          if (aulasSemModulo.length > 0) {
            const modGeralId = 'geral-fallback';
            modulosFinais.push({ id: modGeralId, titulo: 'Módulo Geral / Aulas Avulsas', ordem: 999 });
            agrupadas[modGeralId] = aulasSemModulo;
            abertosMap[modGeralId] = true;
          }

          setModulos(modulosFinais);
          setAulasPorModulo(agrupadas);
          setModulosAbertos(abertosMap);

          const primeiraAula = listaAulas?.[0];
          if (primeiraAula) setAulaAtual(primeiraAula);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do curso:', error.message);
      } finally {
        setLoadingAulas(false);
      }
    }

    carregarDadosCurso();
  }, [navigate]);
  // Marca 50% de progresso assim que abre a aula
  useEffect(() => {
    async function registrarProgressoInicial() {
      if (!aulaAtual) return;
      const jaConcluida = progresso[aulaAtual.id]?.concluida;
      if (jaConcluida) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('progresso_aulas')
        .upsert(
          { user_id: user.id, aula_id: aulaAtual.id, progresso: 50, atualizado_em: new Date().toISOString() },
          { onConflict: 'user_id,aula_id' }
        );

      if (!error) {
        setProgresso((prev) => ({ ...prev, [aulaAtual.id]: { progresso: 50, concluida: false } }));
      }
    }
    registrarProgressoInicial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aulaAtual]);

  useEffect(() => {
    async function carregarAnotacoesDaAula() {
      if (!aulaAtual) return;
      setCarregandoAnotacoes(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('aulas_anotacoes')
          .select('*')
          .eq('aula_id', aulaAtual.id)
          .eq('user_id', user.id)
          .order('minuto_segundos', { ascending: true });

        if (error) throw error;
        setAnotacoes(data || []);
      } catch (err) {
        console.error('Erro ao carregar anotações:', err);
      } finally {
        setCarregandoAnotacoes(false);
      }
    }

    carregarAnotacoesDaAula();
  }, [aulaAtual]);

  const handleConcluirAula = async () => {
    if (!aulaAtual) return;
    setMarcandoConcluida(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('progresso_aulas')
        .upsert(
          {
            user_id: user.id,
            aula_id: aulaAtual.id,
            progresso: 100,
            concluida: true,
            concluida_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'user_id,aula_id' }
        );

      if (error) throw error;

      setProgresso((prev) => ({ ...prev, [aulaAtual.id]: { progresso: 100, concluida: true } }));
      recarregar();

      setSucesso(true);
      setGanhouXp(true);
      setTimeout(() => { setSucesso(false); setGanhouXp(false); }, 3000);

    } catch (error) {
      console.error('Erro ao concluir aula:', error.message);
      avisos.erro('Não foi possível concluir a aula: ' + error.message);
    } finally {
      setMarcandoConcluida(false);
    }
  };

  const handleSalvarAnotacao = async (e) => {
    e.preventDefault();
    if (!novaAnotacao.trim() || !aulaAtual) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const partes = minutoInput.split(':');
      const segundosTotais = partes.length === 2 ? parseInt(partes[0]) * 60 + parseInt(partes[1]) : 0;

      const { data, error } = await supabase.from('aulas_anotacoes').insert({
        aula_id: aulaAtual.id,
        user_id: user.id,
        minuto_segundos: segundosTotais,
        tempo_formatado: minutoInput,
        texto: novaAnotacao.trim(),
      }).select().single();

      if (error) throw error;

      setAnotacoes((prev) => [...prev, data].sort((a, b) => a.minuto_segundos - b.minuto_segundos));
      setNovaAnotacao('');
      setMinutoInput('00:00');
    } catch (err) {
      console.error('Erro ao salvar anotação:', err);
      avisos.erro('Não foi possível salvar a anotação.');
    }
  };

  const handleDeletarAnotacao = async (id) => {
    try {
      const { error } = await supabase.from('aulas_anotacoes').delete().eq('id', id);
      if (error) throw error;
      setAnotacoes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Erro ao deletar anotação:', err);
    }
  };

  const pularParaMinuto = (segundos) => {
    playerRef.current?.irPara(segundos);
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Preenche o campo de minuto com o ponto atual do vídeo.
  const usarMinutoAtual = () => {
    const s = Math.floor(playerRef.current?.tempoAtual() || 0);
    setMinutoInput(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
  };

  const toggleModulo = (modId) => {
    setModulosAbertos(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const isAulaConcluida = aulaAtual && progresso[aulaAtual.id]?.concluida;

  // Todas as aulas na ordem da lista (módulo por módulo), para "anterior / próxima".
  const sequencia = modulos.flatMap((m) => aulasPorModulo[m.id] || []);
  const totalAulas = sequencia.length;
  const indiceAtual = aulaAtual ? sequencia.findIndex((a) => a.id === aulaAtual.id) : -1;
  const aulaAnterior = indiceAtual > 0 ? sequencia[indiceAtual - 1] : null;
  const proximaAula = indiceAtual >= 0 && indiceAtual < totalAulas - 1 ? sequencia[indiceAtual + 1] : null;
  const concluidas = sequencia.filter((a) => progresso[a.id]?.concluida).length;
  const pctCurso = totalAulas ? Math.round((concluidas / totalAulas) * 100) : 0;
  const moduloDaAula = aulaAtual
    ? modulos.find((m) => (aulasPorModulo[m.id] || []).some((a) => a.id === aulaAtual.id))
    : null;

  const abrirAula = (aula) => {
    if (!aula) return;
    setAulaAtual(aula);
    setAbaInfo('anotacoes');
    // No celular a lista fica embaixo: volta para o vídeo ao trocar de aula.
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loadingAulas) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      <Sidebar ocultarNoComputador />

      <div className="area-nav-mobile flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* TOPO: voltar, onde estou, progresso do curso e XP */}
        <header className="h-16 bg-slate-900/80 border-b border-slate-800 px-4 md:px-6 flex items-center gap-3 md:gap-4 shrink-0">
          <Link to="/dashboard" className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors shrink-0" title="Voltar ao painel (menu da plataforma)">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-orange truncate">
              {moduloDaAula?.titulo || 'Videoaulas'}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {indiceAtual >= 0 ? `Aula ${indiceAtual + 1} de ${totalAulas}` : 'Videoaulas'}
            </p>
          </div>

          {totalAulas > 0 && (
            <div className="hidden md:flex items-center gap-3 w-56 shrink-0" title={`${concluidas} de ${totalAulas} aulas concluídas`}>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-orange rounded-full transition-all duration-500" style={{ width: `${pctCurso}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-300 tabular-nums">{pctCurso}%</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl border border-slate-700 shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white tabular-nums">{xp} XP</span>
          </div>

          <button
            onClick={() => setCinema((v) => !v)}
            className="hidden lg:flex p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
            title={cinema ? 'Mostrar lista de aulas' : 'Modo cinema (esconder lista de aulas)'}
          >
            {cinema ? <PanelRightOpen className="w-5 h-5 text-slate-300" /> : <PanelRightClose className="w-5 h-5 text-slate-300" />}
          </button>
        </header>

        {/* No celular a página rola inteira; no computador, vídeo e lista rolam separados */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

          {/* VÍDEO + INFORMAÇÕES */}
          <div className="lg:flex-1 lg:overflow-y-auto min-w-0">
            <div ref={topoRef} className="p-3 md:p-5 lg:p-6 mx-auto w-full max-w-[1400px]">
              {aulaAtual ? (
                <>
                  <PlayerProtegido
                    ref={playerRef}
                    key={aulaAtual.id}
                    url={aulaAtual.video_url}
                    titulo={aulaAtual.titulo}
                    className="border border-slate-800 shadow-2xl shadow-black/40"
                  />

                  {/* Título + ações numa faixa só */}
                  <div className="mt-4 md:mt-5 flex flex-col xl:flex-row xl:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
                        {aulaAtual.duracao_min && (
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {aulaAtual.duracao_min} min</span>
                        )}
                        {isAulaConcluida && (
                          <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Concluída</span>
                        )}
                      </div>
                      <h2 className="text-lg md:text-2xl font-black text-white leading-tight">{aulaAtual.titulo}</h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 relative">
                      {ganhouXp && (
                        <div className="absolute -top-9 right-2 animate-bounce flex items-center gap-1 text-amber-400 font-black text-base drop-shadow-lg">
                          <Zap className="w-4 h-4" /> +50 XP
                        </div>
                      )}
                      <button
                        onClick={() => abrirAula(aulaAnterior)}
                        disabled={!aulaAnterior}
                        className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Aula anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleConcluirAula}
                        disabled={marcandoConcluida || sucesso || isAulaConcluida}
                        className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                          isAulaConcluida || sucesso
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-brand-orange hover:bg-orange-500 text-white cursor-pointer'
                        }`}
                      >
                        {marcandoConcluida ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {isAulaConcluida || sucesso ? 'Concluída' : 'Marcar como concluída'}
                      </button>
                      <button
                        onClick={() => abrirAula(proximaAula)}
                        disabled={!proximaAula}
                        className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={proximaAula ? `Próxima: ${proximaAula.titulo}` : 'Esta é a última aula'}
                      >
                        <span className="hidden sm:inline">Próxima</span> <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Abas: anotações / sobre a aula */}
                  <div className="mt-5 md:mt-6 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="flex border-b border-slate-800 px-2">
                      {[
                        { id: 'anotacoes', label: 'Minhas anotações', icon: StickyNote, extra: anotacoes.length || null },
                        { id: 'sobre', label: 'Sobre a aula', icon: Info },
                      ].map(({ id, label, icon: Icon, extra }) => (
                        <button
                          key={id}
                          onClick={() => setAbaInfo(id)}
                          className={`flex items-center gap-2 px-4 py-3.5 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer ${
                            abaInfo === id ? 'border-brand-orange text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" /> {label}
                          {extra && <span className="text-[11px] px-1.5 rounded-md bg-slate-800 text-slate-300">{extra}</span>}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 md:p-5">
                      {abaInfo === 'sobre' ? (
                        <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                          {aulaAtual.descricao ? (
                            <p className="whitespace-pre-wrap">{aulaAtual.descricao}</p>
                          ) : (
                            <p className="text-slate-500">O professor não adicionou uma descrição para esta aula.</p>
                          )}
                          {!isAulaConcluida && (
                            <p className="text-xs text-slate-500">Marque a aula como concluída para registrar seu progresso e ganhar XP.</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <form onSubmit={handleSalvarAnotacao} className="flex gap-2 mb-4">
                            <div className="relative shrink-0">
                              <input
                                type="text"
                                value={minutoInput}
                                onChange={(e) => setMinutoInput(e.target.value)}
                                onFocus={() => minutoInput === '00:00' && usarMinutoAtual()}
                                placeholder="00:00"
                                title="Minuto do vídeo (MM:SS). Ao clicar, pega o ponto atual do vídeo."
                                className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono text-center focus:outline-none focus:border-brand-orange"
                              />
                            </div>
                            <input
                              type="text"
                              value={novaAnotacao}
                              onChange={(e) => setNovaAnotacao(e.target.value)}
                              onFocus={() => minutoInput === '00:00' && usarMinutoAtual()}
                              placeholder="Anote algo importante deste momento da aula…"
                              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-orange"
                            />
                            <button
                              type="submit"
                              disabled={!novaAnotacao.trim()}
                              className="px-4 py-2.5 bg-brand-orange hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
                              title="Salvar anotação"
                            >
                              <BookmarkPlus className="w-4 h-4" /> <span className="hidden sm:inline">Salvar</span>
                            </button>
                          </form>

                          {carregandoAnotacoes ? (
                            <div className="flex justify-center py-6 text-slate-500">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          ) : anotacoes.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4">
                              Nenhuma anotação ainda. Informe o minuto e o que quer lembrar; depois é só clicar no minuto para voltar a esse trecho.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {anotacoes.map((nota) => (
                                <li key={nota.id} className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl flex items-start gap-3 group">
                                  <button
                                    type="button"
                                    onClick={() => pularParaMinuto(nota.minuto_segundos)}
                                    className="px-2 py-1 bg-brand-orange/10 text-brand-orange border border-brand-orange/30 rounded-lg text-xs font-mono font-bold hover:bg-brand-orange hover:text-white transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                    title="Ir para este minuto no vídeo"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" /> {nota.tempo_formatado}
                                  </button>
                                  <p className="text-slate-200 text-sm leading-relaxed flex-1 min-w-0 break-words">{nota.texto}</p>
                                  <button
                                    onClick={() => handleDeletarAnotacao(nota.id)}
                                    className="text-slate-500 hover:text-red-400 p-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                                    title="Excluir anotação"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[60vh] items-center justify-center flex-col text-center p-8">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <PlayCircle className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Nenhuma aula encontrada</h3>
                  <p className="text-slate-400">O professor ainda não subiu os conteúdos desta turma.</p>
                </div>
              )}
            </div>
          </div>

          {/* LISTA DE AULAS POR MÓDULO */}
          {totalAulas > 0 && (
            <aside
              className={`w-full lg:w-[320px] xl:w-[360px] bg-slate-900 lg:border-l border-t lg:border-t-0 border-slate-800 flex-col shrink-0 ${
                cinema ? 'flex lg:hidden' : 'flex'
              }`}
            >
              <div className="px-5 py-4 border-b border-slate-800 shrink-0">
                <h3 className="text-white font-black text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-orange" /> Conteúdo do curso
                </h3>
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctCurso}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 tabular-nums shrink-0">{concluidas}/{totalAulas} concluídas</span>
                </div>
              </div>

              <div className="lg:flex-1 lg:overflow-y-auto p-3 space-y-3">
                {modulos.map((modulo) => {
                  const aulasDoModulo = aulasPorModulo[modulo.id] || [];
                  if (aulasDoModulo.length === 0) return null;
                  const aberto = modulosAbertos[modulo.id];
                  const feitas = aulasDoModulo.filter((a) => progresso[a.id]?.concluida).length;

                  return (
                    <div key={modulo.id} className="rounded-2xl overflow-hidden bg-slate-950/50 border border-slate-800">
                      <button
                        onClick={() => toggleModulo(modulo.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{modulo.titulo}</h4>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{feitas}/{aulasDoModulo.length} aulas</p>
                        </div>
                        {aberto ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>

                      {aberto && (
                        <div className="px-2 pb-2 space-y-1">
                          {aulasDoModulo.map((aula) => {
                            const concluida = progresso[aula.id]?.concluida;
                            const selecionada = aulaAtual?.id === aula.id;
                            const numero = sequencia.findIndex((a) => a.id === aula.id) + 1;

                            return (
                              <button
                                key={aula.id}
                                onClick={() => abrirAula(aula)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-3 cursor-pointer ${
                                  selecionada ? 'bg-brand-orange/10 ring-1 ring-brand-orange/40' : 'hover:bg-slate-800/60'
                                }`}
                              >
                                <span
                                  className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                                    concluida
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : selecionada
                                      ? 'bg-brand-orange text-white'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {concluida ? <CheckCircle2 className="w-4 h-4" /> : selecionada ? <PlayCircle className="w-4 h-4" /> : numero}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-[13px] font-bold leading-snug line-clamp-2 ${selecionada ? 'text-white' : 'text-slate-300'}`}>
                                    {aula.titulo}
                                  </span>
                                  <span className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-500">
                                    {selecionada && <span className="text-brand-orange">Assistindo</span>}
                                    {aula.duracao_min && (
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {aula.duracao_min} min</span>
                                    )}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
