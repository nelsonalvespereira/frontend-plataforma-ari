import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, ChevronDown, FileQuestion, ClipboardList, Loader2, Trash2, Eye, X, Edit } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useAdminQuestoes, useAdminSimulados, useTurmas } from '../hooks/useAdmin';
import { buscarQuestoesDoSimulado } from '../hooks/useSimulados';
import QuestaoPreviewCard from '../components/QuestaoPreviewCard';

const DIFICULDADE_STYLE = {
  facil: 'bg-emerald-50 text-emerald-700',
  medio: 'bg-amber-50 text-amber-700',
  dificil: 'bg-red-50 text-red-700',
};

const DIFICULDADE_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

export default function AdminSimuladosQuestoes() {
  const navigate = useNavigate();
  const [aba, setAba] = useState('questoes');
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [menuAberto, setMenuAberto] = useState(null);
  const [questaoVisualizando, setQuestaoVisualizando] = useState(null);
  const [simuladoVisualizando, setSimuladoVisualizando] = useState(null);
  const [questoesDoSimulado, setQuestoesDoSimulado] = useState([]);
  const [carregandoQuestoesSimulado, setCarregandoQuestoesSimulado] = useState(false);

  const { turmas } = useTurmas();
  const { questoes, loading: loadingQ, excluirQuestao } = useAdminQuestoes({ busca, turmaId: turmaFiltro || undefined });
  const { simulados, loading: loadingS, excluirSimulado } = useAdminSimulados({ busca, turmaId: turmaFiltro || undefined });

  const handleExcluirQuestao = async (id) => {
    if (!confirm('Excluir essa questão? Essa ação não pode ser desfeita.')) return;
    await excluirQuestao(id);
    setMenuAberto(null);
  };

  const handleExcluirSimulado = async (id) => {
    if (!confirm('Excluir esse simulado? Essa ação não pode ser desfeita.')) return;
    await excluirSimulado(id);
    setMenuAberto(null);
  };

  const abrirVisualizacaoSimulado = async (simulado) => {
    setSimuladoVisualizando(simulado);
    setCarregandoQuestoesSimulado(true);
    const { questoes } = await buscarQuestoesDoSimulado(simulado.id, { comGabarito: true });
    setQuestoesDoSimulado(questoes);
    setCarregandoQuestoesSimulado(false);
  };

  const fecharVisualizacaoSimulado = () => {
    setSimuladoVisualizando(null);
    setQuestoesDoSimulado([]);
  };

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">

      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">Simulados e Questões</h2>
            <p className="text-xs font-medium text-slate-500">
              {questoes.length} questões · {simulados.length} simulados cadastrados
            </p>
          </div>

          <div className="w-9 h-9 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            A
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-5">

            {/* Abas */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-xl w-fit">
              <button
                onClick={() => setAba('questoes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  aba === 'questoes' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileQuestion className="w-4 h-4" /> Questões
              </button>
              <button
                onClick={() => setAba('simulados')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  aba === 'simulados' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> Simulados
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
                  placeholder={aba === 'questoes' ? 'Buscar por enunciado...' : 'Buscar simulado...'}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
                />
              </div>

              <div className="relative">
                <select
                  value={turmaFiltro}
                  onChange={(e) => setTurmaFiltro(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors cursor-pointer"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {aba === 'questoes' ? (
                <Link
                  to="/admin/nova-questao"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" /> Nova Questão
                </Link>
              ) : (
                <Link
                  to="/admin/novo-simulado"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" /> Novo Simulado
                </Link>
              )}
            </div>

            {/* Tabela: Questões */}
            {aba === 'questoes' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loadingQ ? (
                  <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando questões...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Enunciado</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Assunto</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dificuldade</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {questoes.map((q) => (
                          <tr
                            key={q.id}
                            onClick={() => setQuestaoVisualizando(q)}
                            className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-3.5 max-w-xs">
                              <p className="text-sm font-medium text-slate-700 truncate">{q.enunciado}</p>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{q.assunto}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{q.turmas?.nome || '—'}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${DIFICULDADE_STYLE[q.dificuldade]}`}>
                                {DIFICULDADE_LABEL[q.dificuldade] || q.dificuldade}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap text-right relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === q.id ? null : q.id); }}
                                className="text-slate-400 hover:text-brand-orange transition-colors p-1.5 cursor-pointer"
                              >
                                <MoreHorizontal className="w-4.5 h-4.5" />
                              </button>
                              {menuAberto === q.id && (
                                <div className="absolute right-6 top-10 z-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-40">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setQuestaoVisualizando(q); setMenuAberto(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" /> Visualizar
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/editar-questao/${q.id}`); setMenuAberto(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4" /> Editar
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleExcluirQuestao(q.id); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" /> Excluir
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}

                        {questoes.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                              Nenhuma questão encontrada com esses filtros.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tabela: Simulados */}
            {aba === 'simulados' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loadingS ? (
                  <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando simulados...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Título</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Questões</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {simulados.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => abrirVisualizacaoSimulado(s)}
                            className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-900 text-sm">{s.titulo}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{s.turmas?.nome || '—'}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600 capitalize">{s.tipo}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{s.simulado_questoes?.[0]?.count ?? 0}</span>
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap text-right relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === s.id ? null : s.id); }}
                                className="text-slate-400 hover:text-brand-orange transition-colors p-1.5 cursor-pointer"
                              >
                                <MoreHorizontal className="w-4.5 h-4.5" />
                              </button>
                              {menuAberto === s.id && (
                                <div className="absolute right-6 top-10 z-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-40">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); abrirVisualizacaoSimulado(s); setMenuAberto(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" /> Visualizar
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleExcluirSimulado(s.id); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" /> Excluir
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}

                        {simulados.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                              Nenhum simulado cadastrado ainda.
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

      {/* MODAL: VISUALIZAR QUESTÃO */}
      {questaoVisualizando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setQuestaoVisualizando(null)}
        >
          <div
            className="max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs font-bold text-white/90 bg-slate-900/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                Turma: {questaoVisualizando.turmas?.nome || '—'}
                {questaoVisualizando.banca ? ` · ${questaoVisualizando.banca}` : ''}
                {questaoVisualizando.ano ? ` · ${questaoVisualizando.ano}` : ''}
              </p>
              <button
                onClick={() => setQuestaoVisualizando(null)}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <QuestaoPreviewCard
              materia={questaoVisualizando.materia}
              assunto={questaoVisualizando.assunto}
              dificuldade={questaoVisualizando.dificuldade}
              enunciado={questaoVisualizando.enunciado}
              blocosEnunciado={questaoVisualizando.blocos_enunciado}
              imagemUrl={questaoVisualizando.imagem_url}
              alternativas={questaoVisualizando.alternativas || []}
              respostaCorreta={questaoVisualizando.resposta_correta}
              comentario={questaoVisualizando.comentario}
            />
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR SIMULADO */}
      {simuladoVisualizando && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 py-8 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
          onClick={fecharVisualizacaoSimulado}
        >
          <div
            className="max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 sticky top-0 z-10 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{simuladoVisualizando.titulo}</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1 capitalize">
                    {simuladoVisualizando.turmas?.nome || '—'} · {simuladoVisualizando.tipo} · {simuladoVisualizando.tempo_minutos} min · {questoesDoSimulado.length} questões
                  </p>
                </div>
                <button
                  onClick={fecharVisualizacaoSimulado}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {carregandoQuestoesSimulado ? (
              <div className="bg-white rounded-2xl border border-slate-200 flex items-center justify-center py-14 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando questões...
              </div>
            ) : questoesDoSimulado.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400 font-medium">
                Esse simulado não tem questões vinculadas.
              </div>
            ) : (
              <div className="space-y-4">
                {questoesDoSimulado.map((q, i) => (
                  <div key={q.id}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                      Questão {i + 1}
                    </p>
                    <QuestaoPreviewCard
                      materia={q.materia}
                      assunto={q.assunto}
                      dificuldade={q.dificuldade}
                      enunciado={q.enunciado}
                      blocosEnunciado={q.blocos_enunciado}
                      imagemUrl={q.imagem_url}
                      alternativas={q.alternativas || []}
                      respostaCorreta={q.resposta_correta}
                      comentario={q.comentario}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}