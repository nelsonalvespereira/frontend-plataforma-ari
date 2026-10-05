import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  ChevronDown, 
  X, 
  Loader2, 
  Mail, 
  User, 
  BookOpen, 
  Check, 
  Copy,
  AlertCircle,
  Edit,
  Trash2,
  KeyRound
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

export default function AdminAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState(['Todas']);
  const [turmasObjs, setTurmasObjs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('Todas');
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  // Estado do Modal de Convite
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [inviteForm, setInviteForm] = useState({
    nome: '',
    email: '',
    turmaId: '',
  });

  // Estado do Modal de Edição
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', turma_id: '' });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Estado do Modal de Senha
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false);
  const [alunoSenhaAlvo, setAlunoSenhaAlvo] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [submittingSenha, setSubmittingSenha] = useState(false);

  // 1. Carregar Alunos e Turmas do Banco
  const carregarDados = async () => {
    try {
      setLoading(true);

      // Busca lista de turmas
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .order('nome');

      if (turmasData && turmasData.length > 0) {
        setTurmasObjs(turmasData);
        setTurmas(['Todas', ...turmasData.map((t) => t.nome)]);
      }

      // Busca direto da tabela profiles (excluindo o admin)
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
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const formatados = (profilesData || []).map((p) => ({
        id: p.id,
        nome: p.nome || 'Sem Nome',
        email: 'Aluno(a)',
        turma: p.turmas?.nome || 'Geral',
        turma_id: p.turmas?.id || null,
        plano: 'Padrão',
        status: 'Ativo',
        cadastro: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'
      }));

      setAlunos(formatados);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // 2. Excluir Aluno
  const handleExcluirAluno = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o aluno "${nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Aluno excluído com sucesso!');
      carregarDados();
    } catch (err) {
      console.error('Erro detalhado ao excluir aluno:', err);
      alert('Erro ao excluir o aluno. Verifique as permissões (RLS) no Supabase.');
    } finally {
      setMenuAbertoId(null);
    }
  };

  // 3. Abrir Modal de Edição
  const abrirEdicao = (aluno) => {
    setAlunoEmEdicao(aluno);
    setEditForm({ nome: aluno.nome, turma_id: aluno.turma_id || '' });
    setModalEditOpen(true);
    setMenuAbertoId(null);
  };

  // 4. Salvar Edição
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!alunoEmEdicao) return;

    setSubmittingEdit(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: editForm.nome,
          turma_id: editForm.turma_id || null
        })
        .eq('id', alunoEmEdicao.id);

      if (error) throw error;

      alert('Dados do aluno atualizados com sucesso!');
      setModalEditOpen(false);
      carregarDados();
    } catch (err) {
      console.error('Erro detalhado ao atualizar aluno:', err);
      alert('Erro ao atualizar dados.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 5. Abrir Modal de Alterar Senha
  const abrirAlterarSenha = (aluno) => {
    setAlunoSenhaAlvo(aluno);
    setNovaSenha('');
    setModalSenhaOpen(true);
    setMenuAbertoId(null);
  };

  // 6. Alterar a senha diretamente via função do banco (RPC)
  const handleSalvarSenha = async (e) => {
    e.preventDefault();
    if (!alunoSenhaAlvo || !novaSenha.trim()) {
      return alert('Digite a nova senha.');
    }

    if (novaSenha.length < 6) {
      return alert('A senha precisa ter pelo menos 6 caracteres.');
    }

    setSubmittingSenha(true);
    try {
      const { error } = await supabase.rpc('admin_mudar_senha_usuario', {
        user_id: alunoSenhaAlvo.id,
        nova_senha: novaSenha.trim()
      });

      if (error) throw error;

      alert(`Senha de ${alunoSenhaAlvo.nome} alterada com sucesso!`);
      setModalSenhaOpen(false);
      setAlunoSenhaAlvo(null);
      setNovaSenha('');
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      alert('Erro ao alterar senha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSubmittingSenha(false);
    }
  };

  // 7. Enviar Convite / Cadastrar
  const handleSendInvite = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmittingInvite(true);

    try {
      const { data, error } = await supabase
        .from('convites')
        .insert([
          {
            nome: inviteForm.nome,
            email: inviteForm.email,
            turma_nome: inviteForm.turmaId,
            status: 'Pendente',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const generatedLink = `${window.location.origin}/cadastro?convite=${data?.id || 'token'}&turma=${encodeURIComponent(inviteForm.turmaId)}`;
      setInviteLink(generatedLink);
      setInviteSuccess(true);
      carregarDados();
    } catch (err) {
      console.error('Erro ao processar convite:', err);
      const mockFallbackLink = `${window.location.origin}/cadastro?turma=${encodeURIComponent(inviteForm.turmaId)}&email=${encodeURIComponent(inviteForm.email)}`;
      setInviteLink(mockFallbackLink);
      setInviteSuccess(true);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setInviteSuccess(false);
    setInviteLink('');
    setErrorMessage('');
    setInviteForm({ nome: '', email: '', turmaId: '' });
  };

  // Filtragem de dados
  const alunosFiltrados = alunos.filter((aluno) => {
    const bateBusca = aluno.nome.toLowerCase().includes(busca.toLowerCase());
    const bateTurma = turmaFiltro === 'Todas' || aluno.turma === turmaFiltro;
    return bateBusca && bateTurma;
  });

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">Gestão de Alunos</h2>
            <p className="text-xs font-medium text-slate-500">
              {loading ? 'Carregando...' : `${alunos.length} alunos cadastrados`}
            </p>
          </div>

          <div className="w-9 h-9 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            A
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-5">
            
            {/* BARRA DE AÇÕES */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
                />
              </div>

              <div className="relative">
                <select
                  value={turmaFiltro}
                  onChange={(e) => setTurmaFiltro(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
                >
                  {turmas.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <button 
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0 shadow-sm shadow-orange-500/20"
              >
                <UserPlus className="w-4 h-4" /> Convidar Aluno
              </button>
            </div>

            {/* TABELA DE ALUNOS */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm font-medium">Buscando alunos no banco...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Aluno</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Plano</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastro</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alunosFiltrados.map((aluno) => (
                        <tr key={aluno.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {iniciais(aluno.nome)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm leading-tight">{aluno.nome}</p>
                                <p className="text-xs text-slate-500">{aluno.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-600">{aluno.turma}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-600">{aluno.plano}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-500">{aluno.cadastro}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[aluno.status] || STATUS_STYLE.Ativo}`}>
                              {aluno.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right relative">
                            <button 
                              onClick={() => setMenuAbertoId(menuAbertoId === aluno.id ? null : aluno.id)}
                              className="text-slate-400 hover:text-brand-orange transition-colors p-1.5 rounded-lg hover:bg-orange-50"
                            >
                              <MoreHorizontal className="w-4.5 h-4.5" />
                            </button>

                            {/* Menu Flutuante de Ações */}
                            {menuAbertoId === aluno.id && (
                              <div className="absolute right-12 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-40 text-left">
                                <button
                                  onClick={() => abrirEdicao(aluno)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-500" /> Editar
                                </button>
                                <button
                                  onClick={() => abrirAlterarSenha(aluno)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Redefinir Senha
                                </button>
                                <button
                                  onClick={() => handleExcluirAluno(aluno.id, aluno.nome)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {alunosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                            Nenhum aluno cadastrado ou encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODAL: EDITAR ALUNO */}
      {modalEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Editar Aluno</h3>
              <button onClick={() => setModalEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nome do Aluno</label>
                <input
                  type="text"
                  required
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Turma</label>
                <select
                  value={editForm.turma_id}
                  onChange={(e) => setEditForm({ ...editForm, turma_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                >
                  <option value="">Sem Turma</option>
                  {turmasObjs.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 px-4 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REDEFINIR SENHA DO ALUNO */}
      {modalSenhaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Redefinir Senha de {alunoSenhaAlvo?.nome}</h3>
              <button onClick={() => setModalSenhaOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarSenha} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nova Senha</label>
                <input
                  type="text"
                  required
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalSenhaOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingSenha}
                  className="flex-1 py-2.5 px-4 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  {submittingSenha ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVIDAR ALUNO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Convidar Novo Aluno</h3>
                  <p className="text-xs text-slate-500">Selecione a turma e envie o acesso</p>
                </div>
              </div>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!inviteSuccess ? (
              <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nome Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pedro Henrique"
                      value={inviteForm.nome}
                      onChange={(e) => setInviteForm({ ...inviteForm, nome: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">E-mail do Aluno</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="aluno@email.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Turma de Acesso</label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      required
                      value={inviteForm.turmaId}
                      onChange={(e) => setInviteForm({ ...inviteForm, turmaId: e.target.value })}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    >
                      <option value="">Selecione uma turma...</option>
                      {turmas.filter((t) => t !== 'Todas').map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInvite}
                    className="flex-1 py-2.5 px-4 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    {submittingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Convite'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Convite Criado com Sucesso!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Envie o link abaixo para <strong>{inviteForm.nome}</strong> acessar a turma <strong>{inviteForm.turmaId}</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-left">
                  <span className="text-xs text-slate-600 font-mono truncate">{inviteLink}</span>
                  <button onClick={handleCopyLink} className="p-1.5 text-slate-500 hover:text-brand-orange rounded-lg hover:bg-white shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button onClick={fecharModal} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl">
                  Concluir
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}