import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, ArrowLeft, Plus, Loader2, Save, Trash2, Users, User, Layers, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const DIAS_SEMANA = [
  { id: 1, nome: 'Segunda-feira' },
  { id: 2, nome: 'Terça-feira' },
  { id: 3, nome: 'Quarta-feira' },
  { id: 4, nome: 'Quinta-feira' },
  { id: 5, nome: 'Sexta-feira' },
  { id: 6, nome: 'Sábado' },
  { id: 0, nome: 'Domingo' },
];

export default function AdminCronograma() {
  const [modo, setModo] = useState('turma'); // 'turma' ou 'aluno'
  
  // Listas de dados
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [modulos, setModulos] = useState([]);
  
  // Seleções ativas
  const [turmaAtiva, setTurmaAtiva] = useState('');
  const [alunoAtivo, setAlunoAtivo] = useState('');
  
  const [cronograma, setCronograma] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do Formulário
  const [diaSemana, setDiaSemana] = useState(1);
  const [moduloId, setModuloId] = useState('');
  const [materia, setMateria] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Carregar turmas, alunos e módulos ao iniciar
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [{ data: turmasData }, { data: alunosData }, { data: modulosData }] = await Promise.all([
          supabase.from('turmas').select('id, nome').order('nome'),
          supabase.from('profiles').select('id, nome').eq('is_admin', false).order('nome'),
          supabase.from('modulos').select('id, titulo, turma_id').order('ordem', { ascending: true })
        ]);

        if (turmasData && turmasData.length > 0) {
          setTurmas(turmasData);
          setTurmaAtiva(turmasData[0].id);
        }

        if (alunosData && alunosData.length > 0) {
          setAlunos(alunosData);
          setAlunoAtivo(alunosData[0].id);
        }

        if (modulosData) {
          setModulos(modulosData);
          if (modulosData.length > 0) setModuloId(modulosData[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar dados iniciais:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Carregar cronograma com tratamento rigoroso
  useEffect(() => {
    if (modo === 'turma') {
      if (turmaAtiva) carregarCronogramaTurma(turmaAtiva);
    } else {
      if (alunoAtivo) carregarCronogramaAluno(alunoAtivo);
    }
  }, [modo, turmaAtiva, alunoAtivo]);

  async function carregarCronogramaTurma(idTurma) {
    if (!idTurma) return;
    const { data, error } = await supabase
      .from('cronograma')
      .select('*, modulos(titulo)')
      .eq('turma_id', idTurma)
      .order('dia_semana', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar cronograma da turma:', error);
      return;
    }
    setCronograma((data || []).filter(c => !c.usuario_id));
  }

  async function carregarCronogramaAluno(idAluno) {
    if (!idAluno) return;
    const { data, error } = await supabase
      .from('cronograma')
      .select('*, modulos(titulo)')
      .eq('usuario_id', idAluno)
      .order('dia_semana', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar cronograma do aluno:', error);
      return;
    }
    setCronograma(data || []);
  }

  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return alert('Preencha o título da atividade.');

    if (modo === 'turma' && !turmaAtiva) return alert('Selecione uma turma válida.');
    if (modo === 'aluno' && !alunoAtivo) return alert('Selecione um aluno válido.');

    setSalvando(true);
    try {
      const payload = {
        dia_semana: parseInt(diaSemana),
        modulo_id: moduloId || null,
        materia: materia ? materia.trim() : null,
        titulo: titulo.trim(),
        descricao: descricao ? descricao.trim() : null,
        turma_id: modo === 'turma' ? turmaAtiva : null,
        usuario_id: modo === 'aluno' ? alunoAtivo : null
      };

      const { error } = await supabase.from('cronograma').insert([payload]);
      if (error) throw error;

      setTitulo('');
      setDescricao('');

      if (modo === 'turma') {
        carregarCronogramaTurma(turmaAtiva);
      } else {
        carregarCronogramaAluno(alunoAtivo);
      }
    } catch (error) {
      alert('Erro ao salvar no cronograma: ' + (error.message || 'Erro desconhecido'));
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (id) => {
    try {
      const { error } = await supabase.from('cronograma').delete().eq('id', id);
      if (error) throw error;

      if (modo === 'turma') {
        carregarCronogramaTurma(turmaAtiva);
      } else {
        carregarCronogramaAluno(alunoAtivo);
      }
    } catch (error) {
      console.error('Erro ao remover:', error);
    }
  };

  // Filtra os módulos da turma selecionada (se estiver no modo turma)
  const modulosFiltrados = modo === 'turma' 
    ? modulos.filter(m => m.turma_id === turmaAtiva) 
    : modulos;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-orange" /> Gerenciar Plano de Estudos
              </h2>
              <p className="text-xs font-medium text-slate-500">Monte a rotina semanal vinculando aos módulos criados.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SELETOR DE MODO (TURMA / ALUNO) */}
            <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                onClick={() => setModo('turma')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modo === 'turma' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Por Turma
              </button>
              <button
                onClick={() => setModo('aluno')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modo === 'aluno' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Por Aluno
              </button>
            </div>

            {/* SELECT DE TURMA OU ALUNO */}
            {modo === 'turma' ? (
              <select 
                value={turmaAtiva} 
                onChange={e => setTurmaAtiva(e.target.value)} 
                className="p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-bold text-sm text-slate-700 shadow-sm"
              >
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            ) : (
              <select 
                value={alunoAtivo} 
                onChange={e => setAlunoAtivo(e.target.value)} 
                className="p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-bold text-sm text-slate-700 shadow-sm"
              >
                {alunos.length === 0 ? (
                  <option value="">Nenhum aluno cadastrado</option>
                ) : (
                  alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)
                )}
              </select>
            )}

            <div className="w-9 h-9 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              A
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
            
            {/* LADO ESQUERDO: FORMULÁRIO DE ADIÇÃO */}
            <div className="w-full lg:w-[400px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 shrink-0 h-fit">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Plus className="w-4 h-4 text-brand-orange" /> Adicionar Atividade ({modo === 'turma' ? 'Turma' : 'Individual'})
              </h3>

              <form onSubmit={handleAdicionar} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dia da Semana</label>
                  <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange text-sm font-bold text-slate-700">
                    {DIAS_SEMANA.map(dia => <option key={dia.id} value={dia.id}>{dia.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-orange" /> Módulo do Curso
                  </label>
                  <select 
                    value={moduloId} 
                    onChange={e => setModuloId(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange text-sm font-medium text-slate-700"
                  >
                    <option value="">Selecione um módulo...</option>
                    {modulosFiltrados.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-orange" /> Matéria / Tópico (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={materia} 
                    onChange={e => setMateria(e.target.value)} 
                    placeholder="Ex: Matemática Básica, Geometria..." 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Título da Atividade</label>
                  <input required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Resolver lista de exercícios" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instruções / Descrição (Opcional)</label>
                  <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows="3" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange text-sm font-medium resize-none" placeholder="Ex: Assistir videoaula e depois praticar..." />
                </div>

                <button disabled={salvando} type="submit" className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-6 shadow-sm cursor-pointer">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lançar na Rotina
                </button>
              </form>
            </div>

            {/* LADO DIREITO: PREVIEW DO CRONOGRAMA */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">
                  Cronograma {modo === 'turma' ? 'da Turma' : 'do Aluno'}
                </h3>
                <span className="text-xs font-bold px-3 py-1 bg-orange-100 text-brand-orange rounded-full">
                  {cronograma.length} atividades cadastradas
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cronograma.length === 0 ? (
                  <div className="text-center p-12 text-slate-400 font-medium text-sm">Nenhuma atividade cadastrada para esta seleção.</div>
                ) : (
                  DIAS_SEMANA.map(dia => {
                    const tarefas = cronograma.filter(c => c.dia_semana === dia.id);
                    if (tarefas.length === 0) return null;

                    return (
                      <div key={dia.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <h4 className="font-black text-slate-800 mb-3 text-xs uppercase tracking-wider">{dia.nome}</h4>
                        <div className="space-y-2">
                          {tarefas.map(tarefa => {
                            return (
                              <div key={tarefa.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-start gap-3 group shadow-sm">
                                <div className="p-2 bg-orange-50 text-brand-orange rounded-lg shrink-0 mt-0.5">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {tarefa.modulos?.titulo && (
                                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-black uppercase tracking-wider">
                                        {tarefa.modulos.titulo}
                                      </span>
                                    )}
                                    {tarefa.materia && (
                                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">
                                        {tarefa.materia}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="font-bold text-slate-900 text-sm">{tarefa.titulo}</h5>
                                  {tarefa.descricao && <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{tarefa.descricao}</p>}
                                </div>
                                <button onClick={() => handleRemover(tarefa.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}