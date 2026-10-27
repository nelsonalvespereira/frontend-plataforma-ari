import React, { useState, useEffect } from 'react';
import { User, GraduationCap, Bell, Lock, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../lib/supabaseClient';

import { useAvisos } from '../components/Avisos';
function Toggle({ ativo, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${ativo ? 'bg-brand-orange' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          ativo ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function AdminConfiguracoes() {
  const avisos = useAvisos();
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [adminUserId, setAdminUserId] = useState(null);
  
  // Estado dos modais de Turma
  const [modalTurmaOpen, setModalTurmaOpen] = useState(false);
  const [turmaEmEdicao, setTurmaEmEdicao] = useState(null);
  const [nomeNovaTurma, setNomeNovaTurma] = useState('');
  const [salvandoTurma, setSalvandoTurma] = useState(false);

  // Perfil Admin
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // Segurança (Senha)
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Notificações reais
  const [notificacoes, setNotificacoes] = useState({
    novaMatricula: true,
    novaDuvida: true,
    resumoSemanal: false,
  });

  const toggleNotificacao = async (chave) => {
    const novasNotificacoes = { ...notificacoes, [chave]: !notificacoes[chave] };
    setNotificacoes(novasNotificacoes);

    if (adminUserId) {
      try {
        await supabase
          .from('profiles')
          .update({ notificacoes: novasNotificacoes })
          .eq('id', adminUserId);
      } catch (err) {
        console.error('Erro ao salvar preferências de notificação:', err);
      }
    }
  };

  // Carregar dados iniciais (Perfil, Notificações e Turmas)
  const carregarDadosAdmin = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminUserId(user.id);
        setEmailAdmin(user.email || '');

        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome, notificacoes')
          .eq('id', user.id)
          .single();

        if (profileData) {
          if (profileData.nome) setNomeAdmin(profileData.nome);
          if (profileData.notificacoes) setNotificacoes(profileData.notificacoes);
        }
      }

      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select('*')
        .order('nome');

      if (turmasError) throw turmasError;
      setTurmas(turmasData || []);

    } catch (err) {
      console.error('Erro ao carregar dados do admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosAdmin();
  }, []);

  // Salvar Alterações do Perfil Real
  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    if (!adminUserId) return;

    setSalvandoPerfil(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: nomeAdmin })
        .eq('id', adminUserId);

      if (error) throw error;
      avisos.sucesso('Perfil atualizado com sucesso no banco de dados!');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      avisos.erro('Erro ao atualizar perfil.');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  // Salvar / Criar Turma
  const handleSalvarTurma = async (e) => {
    e.preventDefault();
    if (!nomeNovaTurma.trim()) return;

    setSalvandoTurma(true);
    try {
      if (turmaEmEdicao) {
        const { error } = await supabase
          .from('turmas')
          .update({ nome: nomeNovaTurma })
          .eq('id', turmaEmEdicao.id);

        if (error) throw error;
        avisos.sucesso('Turma atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('turmas')
          .insert({ nome: nomeNovaTurma });

        if (error) throw error;
        avisos.sucesso('Turma criada com sucesso!');
      }

      setModalTurmaOpen(false);
      setNomeNovaTurma('');
      setTurmaEmEdicao(null);
      carregarDadosAdmin();
    } catch (err) {
      console.error('Erro ao salvar turma:', err);
      avisos.erro('Erro ao salvar turma.');
    } finally {
      setSalvandoTurma(false);
    }
  };

  // Excluir Turma
  const handleExcluirTurma = async (id, nome) => {
    if (!(await avisos.confirmar({ titulo: `Excluir a turma "${nome}"?`, mensagem: 'Essa ação não pode ser desfeita.', confirmarTexto: 'Excluir', perigo: true }))) return;

    try {
      const { error } = await supabase.from('turmas').delete().eq('id', id);
      if (error) throw error;
      avisos.sucesso('Turma excluída com sucesso!');
      carregarDadosAdmin();
    } catch (err) {
      console.error('Erro ao excluir turma:', err);
      avisos.erro('Erro ao excluir turma. Verifique se há alunos vinculados.');
    }
  };

  const abrirModalCriar = () => {
    setTurmaEmEdicao(null);
    setNomeNovaTurma('');
    setModalTurmaOpen(true);
  };

  const abrirModalEditar = (turma) => {
    setTurmaEmEdicao(turma);
    setNomeNovaTurma(turma.nome);
    setModalTurmaOpen(true);
  };

  // Atualizar Senha Real via Supabase Auth
  const handleAtualizarSenha = async (e) => {
    e.preventDefault();
    if (!senhaNova || senhaNova !== senhaConfirma) {
      return avisos.erro('As senhas não coincidem ou estão vazias.');
    }

    if (senhaNova.length < 6) {
      return avisos.erro('A senha precisa ter pelo menos 6 caracteres.');
    }

    setSalvandoSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senhaNova });
      if (error) throw error;
      avisos.sucesso('Senha atualizada com sucesso no sistema de autenticação!');
      setSenhaNova('');
      setSenhaConfirma('');
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);
      avisos.erro('Erro ao atualizar senha: ' + err.message);
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">Configurações</h2>
            <p className="text-xs font-medium text-slate-500">Preferências reais da conta e da plataforma</p>
          </div>

          <div className="w-9 h-9 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {nomeAdmin ? nomeAdmin[0].toUpperCase() : 'A'}
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-3xl mx-auto space-y-5 pb-10">

            {/* Perfil do Administrador */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-5">
                <User className="w-4.5 h-4.5 text-brand-orange" /> Perfil do Administrador
              </h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-brand-orange rounded-full flex items-center justify-center text-white font-black text-xl shrink-0">
                  {nomeAdmin ? nomeAdmin[0].toUpperCase() : 'A'}
                </div>
              </div>

              <form onSubmit={handleSalvarPerfil}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome</label>
                    <input
                      type="text"
                      required
                      value={nomeAdmin}
                      onChange={(e) => setNomeAdmin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email (Conta)</label>
                    <input
                      type="email"
                      disabled
                      value={emailAdmin}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={salvandoPerfil}
                  className="mt-5 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {salvandoPerfil && <Loader2 className="w-4 h-4 animate-spin" />} Salvar alterações
                </button>
              </form>
            </div>

            {/* Turmas da Plataforma (Dinâmico do Banco) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4.5 h-4.5 text-brand-orange" /> Turmas da Plataforma
                </h3>
                <button 
                  onClick={abrirModalCriar}
                  className="flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nova Turma
                </button>
              </div>

              {loading ? (
                <div className="py-8 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : turmas.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhuma turma cadastrada no banco.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {turmas.map((turma) => (
                    <div key={turma.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{turma.nome}</p>
                        <p className="text-xs text-slate-500 font-mono">ID: {turma.id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirModalEditar(turma)} className="p-2 text-slate-400 hover:text-brand-orange transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExcluirTurma(turma.id, turma.nome)} className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notificações */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-5">
                <Bell className="w-4.5 h-4.5 text-brand-orange" /> Notificações (Salvas no Banco)
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Nova matrícula</p>
                    <p className="text-xs text-slate-500">Avisar quando um aluno se matricular em qualquer turma</p>
                  </div>
                  <Toggle ativo={notificacoes.novaMatricula} onChange={() => toggleNotificacao('novaMatricula')} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Nova dúvida no chat/live</p>
                    <p className="text-xs text-slate-500">Avisar quando um aluno postar uma dúvida</p>
                  </div>
                  <Toggle ativo={notificacoes.novaDuvida} onChange={() => toggleNotificacao('novaDuvida')} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Resumo semanal por email</p>
                    <p className="text-xs text-slate-500">Receber métricas da plataforma toda segunda-feira</p>
                  </div>
                  <Toggle ativo={notificacoes.resumoSemanal} onChange={() => toggleNotificacao('resumoSemanal')} />
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-5">
                <Lock className="w-4.5 h-4.5 text-brand-orange" /> Segurança (Alterar Senha do Admin)
              </h3>

              <form onSubmit={handleAtualizarSenha} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nova senha</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={senhaNova}
                      onChange={(e) => setSenhaNova(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar nova senha</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={senhaConfirma}
                      onChange={(e) => setSenhaConfirma(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {salvandoSenha && <Loader2 className="w-4 h-4 animate-spin" />} Atualizar senha
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>

      {/* MODAL: CRIAR / EDITAR TURMA */}
      {modalTurmaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {turmaEmEdicao ? 'Editar Turma' : 'Nova Turma'}
              </h3>
              <button onClick={() => setModalTurmaOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarTurma} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nome da Turma</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Intensivo ENEM 2026"
                  value={nomeNovaTurma}
                  onChange={(e) => setNomeNovaTurma(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTurmaOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTurma}
                  className="flex-1 py-2.5 px-4 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {salvandoTurma && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}