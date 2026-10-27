import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Save, ClipboardList, ArrowLeft, Loader2, CheckCircle2, Search, GripVertical, X } from 'lucide-react';

import { useAvisos } from '../components/Avisos';
const DIFICULDADE_STYLE = {
  facil: 'bg-emerald-50 text-emerald-700',
  medio: 'bg-amber-50 text-amber-700',
  dificil: 'bg-red-50 text-red-700',
};
const DIFICULDADE_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

export default function AdminNovoSimulado() {
  const avisos = useAvisos();
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState([]);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [tipo, setTipo] = useState('oficial');
  const [tempoMinutos, setTempoMinutos] = useState(150);
  const [busca, setBusca] = useState('');

  const [selecionadas, setSelecionadas] = useState([]); // array de questão (objeto completo), na ordem escolhida

  useEffect(() => {
    supabase.from('turmas').select('*').order('nome').then(({ data }) => {
      setTurmas(data ?? []);
      if (data?.length > 0) setTurmaId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!turmaId) return;
    setLoadingQuestoes(true);
    supabase
      .from('questoes')
      .select('id, enunciado, assunto, dificuldade')
      .eq('turma_id', turmaId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuestoesDisponiveis(data ?? []);
        setSelecionadas([]); // trocar de turma reseta a seleção (questões de outra turma não valem mais)
        setLoadingQuestoes(false);
      });
  }, [turmaId]);

  const questoesFiltradas = questoesDisponiveis.filter((q) =>
    q.enunciado.toLowerCase().includes(busca.toLowerCase()) ||
    q.assunto.toLowerCase().includes(busca.toLowerCase())
  );

  const estaSelecionada = (id) => selecionadas.some((q) => q.id === id);

  const toggleSelecionada = (questao) => {
    setSelecionadas((prev) =>
      prev.some((q) => q.id === questao.id)
        ? prev.filter((q) => q.id !== questao.id)
        : [...prev, questao]
    );
  };

  const removerSelecionada = (id) => {
    setSelecionadas((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selecionadas.length === 0) {
      avisos.erro('Selecione pelo menos uma questão pro simulado.');
      return;
    }

    setSalvando(true);
    try {
      const { data: simulado, error: erroSimulado } = await supabase
        .from('simulados')
        .insert({ titulo, turma_id: turmaId, tipo, tempo_minutos: parseInt(tempoMinutos) })
        .select()
        .single();

      if (erroSimulado) throw erroSimulado;

      const vinculos = selecionadas.map((q, index) => ({
        simulado_id: simulado.id,
        questao_id: q.id,
        ordem: index + 1,
      }));

      const { error: erroVinculo } = await supabase.from('simulado_questoes').insert(vinculos);
      if (erroVinculo) throw erroVinculo;

      setSucesso(true);
      setTimeout(() => navigate('/admin/simulados-questoes'), 1200);

    } catch (error) {
      console.error('Erro ao salvar simulado:', error.message);
      avisos.erro('Erro ao salvar o simulado. Verifique o console.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/simulados-questoes" className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-brand-orange" />
              Novo Simulado
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Monte uma prova a partir das questões já cadastradas.</p>
          </div>
        </div>

        {sucesso && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 font-bold">
            <CheckCircle2 className="w-6 h-6" />
            Simulado criado com sucesso! Redirecionando...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* BLOCO 1: Dados do simulado */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Dados do Simulado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Título</label>
                <input required type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Simulado Oficial ENEM" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange focus:ring-2 focus:ring-orange-100 font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Turma</label>
                <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange focus:ring-2 focus:ring-orange-100 font-medium">
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange focus:ring-2 focus:ring-orange-100 font-medium">
                  <option value="oficial">Oficial</option>
                  <option value="assunto">Por Assunto</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tempo (minutos)</label>
                <input required type="number" min="1" value={tempoMinutos} onChange={(e) => setTempoMinutos(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange focus:ring-2 focus:ring-orange-100 font-medium" />
              </div>
            </div>
          </div>

          {/* BLOCO 2: Seleção de questões + questões escolhidas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Lista de questões disponíveis */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Questões da Turma ({questoesDisponiveis.length})
              </h3>

              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por enunciado ou assunto..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-brand-orange transition-colors"
                />
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {loadingQuestoes ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Carregando questões...
                  </div>
                ) : questoesFiltradas.length === 0 ? (
                  <p className="text-sm text-slate-400 font-medium text-center py-10">
                    Nenhuma questão encontrada pra essa turma.
                  </p>
                ) : (
                  questoesFiltradas.map((q) => (
                    <label
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        estaSelecionada(q.id) ? 'border-brand-orange bg-orange-50/60' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={estaSelecionada(q.id)}
                        onChange={() => toggleSelecionada(q)}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{q.enunciado}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{q.assunto}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${DIFICULDADE_STYLE[q.dificuldade]}`}>
                            {DIFICULDADE_LABEL[q.dificuldade] || q.dificuldade}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Questões selecionadas, na ordem que vão aparecer na prova */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Selecionadas para o Simulado ({selecionadas.length})
              </h3>

              {selecionadas.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium text-center py-10">
                  Marque questões na lista ao lado pra elas aparecerem aqui, na ordem em que foram escolhidas.
                </p>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {selecionadas.map((q, index) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                      <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                      <span className="w-6 h-6 rounded-lg bg-brand-orange text-white font-black text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-700 truncate flex-1">{q.enunciado}</p>
                      <button
                        type="button"
                        onClick={() => removerSelecionada(q.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button disabled={salvando} type="submit" className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-70">
              {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {salvando ? 'Salvando...' : 'Criar Simulado'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}