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
  KeyRound,
  Gift,
  Package,
  Ban
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../lib/supabaseClient';

import { useAvisos } from '../components/Avisos';
const STATUS_STYLE = {
  Ativo: 'bg-emerald-50 text-emerald-700',
  Pendente: 'bg-amber-50 text-amber-700',
  Inativo: 'bg-slate-100 text-slate-500',
  'Sem acesso': 'bg-slate-100 text-slate-500',
  Expirado: 'bg-red-50 text-red-600',
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
  const avisos = useAvisos();
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
    cortesia: false,
  });

  // Estado do Modal de Edição
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', turma_id: '' });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Estado do Modal de Pack (liberação manual)
  const [alunoPackAlvo, setAlunoPackAlvo] = useState(null);
  const [diasPack, setDiasPack] = useState(2);
  const [packsDisponiveis, setPacksDisponiveis] = useState([]);
  const [packEscolhido, setPackEscolhido] = useState('');
  const [submittingPack, setSubmittingPack] = useState(false);

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
          acesso_livre,
          tipo_acesso,
          data_expiracao_pack,
          turmas:turma_id ( id, nome )
        `)
        .eq('is_admin', false)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Assinaturas ativas e nomes dos planos, para mostrar o acesso REAL de cada aluno
      const [{ data: assinData }, { data: planosData }] = await Promise.all([
        supabase.from('assinaturas').select('user_id, price_id, status').in('status', ['active', 'trialing']),
        supabase.from('planos').select('price_id, nome, tipo, duracao_dias'),
      ]);
      setPacksDisponiveis((planosData || []).filter((pl) => pl.tipo === 'pack'));
      const assinPorUsuario = {};
      (assinData || []).forEach((a) => { if (!assinPorUsuario[a.user_id]) assinPorUsuario[a.user_id] = a; });
      const nomePlano = Object.fromEntries((planosData || []).map((pl) => [pl.price_id, pl.nome]));
      const agora = Date.now();
      const fmt = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      const formatados = (profilesData || []).map((p) => {
        const assinatura = assinPorUsuario[p.id];
        const packAtivo = p.tipo_acesso === 'pack_temporario' && !!p.data_expiracao_pack
          && new Date(p.data_expiracao_pack).getTime() > agora;
        const packVencido = !packAtivo && (p.tipo_acesso === 'pack_temporario' || p.tipo_acesso === 'pack_expirado');

        let plano = '—';
        let status = 'Sem acesso';
        if (assinatura) { plano = nomePlano[assinatura.price_id] || 'Assinante'; status = 'Ativo'; }
        else if (p.acesso_livre) { plano = 'Cortesia'; status = 'Ativo'; }
        else if (packAtivo) { plano = `Pack até ${fmt(p.data_expiracao_pack)}`; status = 'Ativo'; }
        else if (packVencido) { plano = 'Pack expirado'; status = 'Expirado'; }

        return {
          id: p.id,
          nome: p.nome || 'Sem Nome',
          email: 'Aluno(a)',
          // Quem só tem (ou teve) pack não pertence a uma turma até assinar.
          turma: assinatura || p.acesso_livre ? (p.turmas?.nome || 'Geral') : '—',
          turma_id: p.turmas?.id || null,
          plano,
          status,
          acessoLivre: !!p.acesso_livre,
          packAtivo,
          cadastro: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'
        };
      });

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
    if (!(await avisos.confirmar({
      titulo: `Excluir o aluno "${nome}"?`,
      mensagem: 'Se ele tiver assinatura, ela será cancelada no Stripe agora (sem reembolso automático). Essa ação não pode ser desfeita.',
      confirmarTexto: 'Excluir aluno',
      perigo: true,
    }))) return;

    try {
      // A Edge Function cancela a assinatura no Stripe e só então apaga a conta (auth.users).
      const { data, error } = await supabase.functions.invoke('admin-gerenciar-aluno', {
        body: { action: 'delete_user', userId: id },
      });

      if (error || data?.error) {
        // Em erro, o motivo real vem no corpo da resposta da função.
        const corpo = await error?.context?.json?.().catch(() => null);
        throw new Error(data?.error || corpo?.error || error.message);
      }

      avisos.sucesso(
        data?.assinaturasCanceladas
          ? 'Aluno excluído e assinatura cancelada no Stripe.'
          : 'Aluno excluído com sucesso!'
      );
      carregarDados();
    } catch (err) {
      console.error('Erro detalhado ao excluir aluno:', err);
      avisos.erro('Erro ao excluir o aluno: ' + (err.message || 'tente novamente.'));
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

      avisos.sucesso('Dados do aluno atualizados com sucesso!');
      setModalEditOpen(false);
      carregarDados();
    } catch (err) {
      console.error('Erro detalhado ao atualizar aluno:', err);
      avisos.erro('Erro ao atualizar dados.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Acesso manual: cortesia (acesso_livre) liga/desliga sem passar pelo Stripe
  const alternarCortesia = async (aluno) => {
    setMenuAbertoId(null);
    const dar = !aluno.acessoLivre;
    const msg = dar
      ? `Dar acesso de cortesia (sem cobrança) para "${aluno.nome}"?`
      : `Remover a cortesia de "${aluno.nome}"? Ele perde o acesso se não tiver assinatura.`;
    if (!(await avisos.confirmar({ titulo: dar ? 'Dar cortesia?' : 'Remover cortesia?', mensagem: msg, confirmarTexto: dar ? 'Dar cortesia' : 'Remover', perigo: !dar }))) return;

    const { error } = await supabase.from('profiles').update({ acesso_livre: dar }).eq('id', aluno.id);
    if (error) return avisos.erro('Erro ao alterar cortesia: ' + error.message);
    carregarDados();
  };

  const abrirLiberarPack = (aluno) => {
    const primeiro = packsDisponiveis[0];
    setAlunoPackAlvo(aluno);
    setPackEscolhido(primeiro?.price_id ?? '');
    setDiasPack(primeiro?.duracao_dias ?? 2);
    setMenuAbertoId(null);
  };

  // Libera o Pack manualmente por N dias a partir de agora
  const handleLiberarPack = async (e) => {
    e.preventDefault();
    const dias = Number(diasPack);
    if (!alunoPackAlvo || !Number.isInteger(dias) || dias < 1 || dias > 365) {
      return avisos.erro('Informe um número de dias entre 1 e 365.');
    }

    if (!packEscolhido) return avisos.erro('Escolha qual pack liberar.');

    // Registra como compra de cortesia (valor 0): é a compra que libera o conteúdo do pack.
    setSubmittingPack(true);
    const { error } = await supabase.rpc('admin_liberar_pack', {
      p_user_id: alunoPackAlvo.id,
      p_price_id: packEscolhido,
      p_dias: dias,
    });
    setSubmittingPack(false);

    if (error) return avisos.erro('Erro ao liberar o Pack: ' + error.message);
    setAlunoPackAlvo(null);
    carregarDados();
  };

  const handleRevogarPack = async (aluno) => {
    setMenuAbertoId(null);
    if (!(await avisos.confirmar({ titulo: `Encerrar o Pack de "${aluno.nome}"?`, mensagem: 'O acesso aos packs dele termina agora.', confirmarTexto: 'Encerrar', perigo: true }))) return;
    const { error } = await supabase
      .from('profiles')
      .update({ tipo_acesso: 'pack_expirado', data_expiracao_pack: new Date().toISOString() })
      .eq('id', aluno.id);
    if (error) return avisos.erro('Erro ao encerrar o Pack: ' + error.message);
    carregarDados();
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
      return avisos.erro('Digite a nova senha.');
    }

    if (novaSenha.length < 6) {
      return avisos.erro('A senha precisa ter pelo menos 6 caracteres.');
    }

    setSubmittingSenha(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-gerenciar-aluno', {
        body: { action: 'reset_password', userId: alunoSenhaAlvo.id, novaSenha: novaSenha.trim() },
      });

      if (error || data?.error) throw new Error(data?.error || error.message);

      avisos.sucesso(`Senha de ${alunoSenhaAlvo.nome} alterada com sucesso!`);
      setModalSenhaOpen(false);
      setAlunoSenhaAlvo(null);
      setNovaSenha('');
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      avisos.erro('Erro ao alterar senha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSubmittingSenha(false);
    }
  };

  // 7. Enviar Convite / Cadastrar
  // Convite: vale uma vez, só para o e-mail convidado, por 14 dias (regras no banco: ver/aceitar_convite).
  const handleSendInvite = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmittingInvite(true);

    try {
      const { data, error } = await supabase
        .from('convites')
        .insert([
          {
            nome: inviteForm.nome.trim(),
            email: inviteForm.email.trim().toLowerCase(),
            turma_id: inviteForm.turmaId,
            cortesia: !!inviteForm.cortesia,
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      setInviteLink(`${window.location.origin}/convite/${data.id}`);
      setInviteSuccess(true);
    } catch (err) {
      console.error('Erro ao criar convite:', err);
      setErrorMessage('Não foi possível criar o convite. Confira se a migration de convites foi executada. (' + (err.message || err) + ')');
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
    setInviteForm({ nome: '', email: '', turmaId: '', cortesia: false });
  };

  // Filtragem de dados

  // Menu de ações do aluno (tabela no computador e cartões no celular).
  const menuAcoes = (aluno, posicao) => (
    <div className={`${posicao} z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-48 text-left`}>
      <button
        onClick={() => abrirEdicao(aluno)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Edit className="w-3.5 h-3.5 text-blue-500" /> Editar
      </button>
      <button
        onClick={() => alternarCortesia(aluno)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Gift className="w-3.5 h-3.5 text-emerald-500" /> {aluno.acessoLivre ? 'Remover cortesia' : 'Dar cortesia'}
      </button>
      <button
        onClick={() => abrirLiberarPack(aluno)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Package className="w-3.5 h-3.5 text-brand-orange" /> Liberar Pack
      </button>
      {aluno.packAtivo && (
        <button
          onClick={() => handleRevogarPack(aluno)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Ban className="w-3.5 h-3.5 text-red-500" /> Encerrar Pack
        </button>
      )}
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
  );

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
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex justify-between items-center shrink-0">
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-5">
            
            {/* BARRA DE AÇÕES */}
            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 md:gap-3">
              <div className="relative col-span-2 md:flex-1">
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
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
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
                <UserPlus className="w-4 h-4" /> Convidar<span className="hidden sm:inline"> Aluno</span>
              </button>
            </div>

            {/* TABELA DE ALUNOS */}
            <div className="bg-white rounded-2xl border border-slate-200 md:overflow-hidden shadow-sm">
              <div className="md:overflow-x-auto">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm font-medium">Buscando alunos no banco...</p>
                  </div>
                ) : (
                  <>
                  {/* Celular: um cartão por aluno */}
                  <ul className="md:hidden divide-y divide-slate-100">
                    {alunosFiltrados.map((aluno) => (
                      <li key={aluno.id} className="relative flex items-start gap-3 px-4 py-3.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {iniciais(aluno.nome)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm truncate">{aluno.nome}</span>
                            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[aluno.status] || STATUS_STYLE.Ativo}`}>
                              {aluno.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                            {aluno.plano}{aluno.turma !== '—' ? ` · ${aluno.turma}` : ''}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cadastro em {aluno.cadastro}</p>
                        </div>
                        <button
                          onClick={() => setMenuAbertoId(menuAbertoId === aluno.id ? null : aluno.id)}
                          aria-label="Ações"
                          className="p-2 -mr-2 text-slate-400 hover:text-brand-orange rounded-lg shrink-0 cursor-pointer"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {menuAbertoId === aluno.id && menuAcoes(aluno, 'absolute right-4 top-12')}
                      </li>
                    ))}
                    {alunosFiltrados.length === 0 && (
                      <li className="px-4 py-12 text-center text-sm text-slate-400 font-medium">
                        Nenhum aluno encontrado com os filtros aplicados.
                      </li>
                    )}
                  </ul>

                  <table className="hidden md:table w-full text-left border-collapse">
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

                            {menuAbertoId === aluno.id && menuAcoes(aluno, 'absolute right-12 top-10')}
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
                  </>
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
                      {turmasObjs.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteForm.cortesia}
                    onChange={(e) => setInviteForm({ ...inviteForm, cortesia: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-orange-500"
                    aria-label="Liberar acesso gratuito (cortesia)"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">Liberar acesso gratuito (cortesia)</span>
                    <span className="block text-xs text-slate-500">
                      Marcado: entra com a plataforma liberada, sem pagar. Desmarcado: cria a conta e escolhe um plano.
                    </span>
                  </span>
                </label>

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
                    Envie o link para <strong>{inviteForm.nome}</strong> ({inviteForm.email.trim().toLowerCase()}), turma{' '}
                    <strong>{turmasObjs.find((t) => t.id === inviteForm.turmaId)?.nome || '—'}</strong>
                    {inviteForm.cortesia ? ', com acesso gratuito' : ''}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Vale uma vez, só para esse e-mail, por 14 dias.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-left">
                  <span className="text-xs text-slate-600 font-mono truncate">{inviteLink}</span>
                  <button onClick={handleCopyLink} className="p-1.5 text-slate-500 hover:text-brand-orange rounded-lg hover:bg-white shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Olá, ${inviteForm.nome.split(' ')[0]}! Aqui está seu convite para a plataforma Arimática Gabaritando: ${inviteLink}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  Enviar pelo WhatsApp
                </a>

                <button onClick={fecharModal} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl">
                  Concluir
                </button>
              </div>
            )}

          </div>
        </div>
      )}
      {/* MODAL: LIBERAR PACK MANUALMENTE */}
      {alunoPackAlvo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900">Liberar Pack</h3>
              <button onClick={() => setAlunoPackAlvo(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 font-medium mb-5">
              Acesso temporário (cortesia) para <strong>{alunoPackAlvo.nome}</strong>. Se ele já tiver este pack ativo, os dias são somados.
            </p>
            <form onSubmit={handleLiberarPack} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Pack</label>
                {packsDisponiveis.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Nenhum pack cadastrado. Crie um em Packs Avulsos → aba Packs.
                  </p>
                ) : (
                  <select
                    required
                    value={packEscolhido}
                    onChange={(e) => {
                      setPackEscolhido(e.target.value);
                      const pk = packsDisponiveis.find((x) => x.price_id === e.target.value);
                      if (pk?.duracao_dias) setDiasPack(pk.duracao_dias);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  >
                    {packsDisponiveis.map((pk) => <option key={pk.price_id} value={pk.price_id}>{pk.nome}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantidade de dias</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={diasPack}
                  onChange={(e) => setDiasPack(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAlunoPackAlvo(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingPack} className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  {submittingPack && <Loader2 className="w-4 h-4 animate-spin" />} Liberar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}