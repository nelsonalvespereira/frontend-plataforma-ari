import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Calendar, Plus, DollarSign,
  Users, FileQuestion, MoreHorizontal, LogOut, Loader2
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../lib/supabaseClient';

const STATUS_STYLE = {
  Ativo: 'bg-emerald-50 text-emerald-700',
  Pendente: 'bg-amber-50 text-amber-700',
  Inativo: 'bg-slate-100 text-slate-500',
};

function iniciais(nome) {
  if (!nome) return 'AL';
  return nome
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Admin() {
  const navigate = useNavigate();

  // Estados dos dados dinâmicos
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    alunosAtivos: 0,
    receitaMes: 0,
    simuladosRealizados: 0,
  });
  const [ultimosAlunos, setUltimosAlunos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Efeito para carregar dados do Supabase
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // --- BUSCA DOS KPIS ---
        // Alunos Ativos (perfis que não são admin)
        const { count: totalAlunos, error: errAlunos } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_admin', false);

        if (errAlunos) console.error(errAlunos);

        // Total de Simulados / Provas geradas
        const { count: totalSimulados } = await supabase
          .from('simulados')
          .select('*', { count: 'exact', head: true });

        setKpis({
          alunosAtivos: totalAlunos || 0,
          receitaMes: 0, // Ajustável conforme gateway de pagamento futuramente
          simuladosRealizados: totalSimulados || 0,
        });

        // --- BUSCA DOS ÚLTIMOS ALUNOS CADASTRADOS ---
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            nome,
            created_at,
            is_admin,
            turmas:turma_id ( id, nome )
          `)
          .eq('is_admin', false)
          .order('created_at', { ascending: false })
          .limit(8);

        if (profilesError) throw profilesError;

        const formatados = (profilesData || []).map((p) => ({
          id: p.id,
          aluno: p.nome || 'Aluno Sem Nome',
          iniciais: iniciais(p.nome),
          plano: p.turmas?.nome || 'Geral / Sem Turma',
          data: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }) : '—',
          status: 'Ativo'
        }));

        setUltimosAlunos(formatados);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Filtro de busca na tabela
  const alunosFiltrados = ultimosAlunos.filter((m) =>
    m.aluno.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.plano.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">
      
      <AdminSidebar />

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno ou turma..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
            />
          </div>

          <div className="flex items-center gap-5 ml-auto">
            <button className="relative text-slate-400 hover:text-brand-orange transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-4 pl-5 border-l border-slate-200">
              <div className="flex items-center gap-2.5 cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="font-bold text-sm text-slate-900 leading-none">Prof. Ari</p>
                  <p className="text-xs text-slate-500 mt-1">Administrador</p>
                </div>
                <div className="w-9 h-9 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  A
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                title="Sair da conta"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Boas-vindas e Ações */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bom dia, Ari!</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Aqui está o resumo da sua plataforma hoje.</p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/admin/aulas-lives"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-brand-orange hover:border-brand-orange rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  <Calendar className="w-4 h-4" /> Gerenciar Lives
                </Link>
                <Link
                  to="/admin/nova-questao" 
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm shadow-orange-500/20"
                >
                  <Plus className="w-4 h-4" /> Nova Questão
                </Link>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Alunos Ativos */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-brand-orange/30 transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Alunos Ativos</p>
                  <h3 className="text-2xl font-black text-slate-900 leading-none">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" /> : kpis.alunosAtivos.toLocaleString('pt-BR')}
                  </h3>
                </div>
              </div>

              {/* Receita do Mês */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-brand-orange/30 transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-500">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Plataforma</p>
                  <h3 className="text-xl font-black text-slate-900 leading-none">
                    Ativa & Online
                  </h3>
                </div>
              </div>

              {/* Simulados Cadastrados */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-brand-orange/30 transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-brand-orange">
                  <FileQuestion className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Simulados Criados</p>
                  <h3 className="text-2xl font-black text-slate-900 leading-none">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" /> : kpis.simuladosRealizados.toLocaleString('pt-BR')}
                  </h3>
                </div>
              </div>
            </div>

            {/* Tabela de Últimos Alunos Cadastrados */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-base font-black text-slate-900">Últimos Alunos Cadastrados</h3>
                <Link to="/admin/alunos" className="text-sm font-bold text-brand-orange hover:text-orange-600 transition-colors">
                  Ver todos
                </Link>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm font-medium">Carregando dados...</p>
                  </div>
                ) : alunosFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">
                    Nenhum aluno cadastrado no momento.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aluno</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastro</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {alunosFiltrados.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {row.iniciais}
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{row.aluno}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-slate-600">{row.plano}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-500">{row.data}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[row.status] || STATUS_STYLE.Ativo}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Link to="/admin/alunos" className="text-slate-400 hover:text-brand-orange bg-white hover:bg-orange-50 rounded-lg transition-colors p-2 inline-block">
                              <MoreHorizontal className="w-4.5 h-4.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}