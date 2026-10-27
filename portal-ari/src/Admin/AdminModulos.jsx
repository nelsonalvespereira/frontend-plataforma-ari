import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2, Pencil, ArrowUp, ArrowDown, Check, X, Loader2, Layers } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useTurmas } from '../hooks/useAdmin';
import {
  useModulosComAulas, criarModulo, renomearModulo, excluirModulo, reordenarModulos,
} from '../hooks/useModulos';

import { useAvisos } from '../components/Avisos';
export default function AdminModulos() {
  const avisos = useAvisos();
  const { turmas } = useTurmas();
  const [turmaId, setTurmaId] = useState('');

  const { modulos, semModulo, loading, recarregar } = useModulosComAulas(turmaId || undefined);

  const [novoTitulo, setNovoTitulo] = useState('');
  const [criando, setCriando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [tituloEditado, setTituloEditado] = useState('');

  React.useEffect(() => {
    if (turmas.length > 0 && !turmaId) setTurmaId(turmas[0].id);
  }, [turmas]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCriarModulo = async (e) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !turmaId) return;
    setCriando(true);
    const proximaOrdem = modulos.length > 0 ? Math.max(...modulos.map((m) => m.ordem)) + 1 : 1;
    const { error } = await criarModulo({ turmaId, titulo: novoTitulo.trim(), ordem: proximaOrdem });
    setCriando(false);
    if (error) {
      avisos.erro('Erro ao criar módulo: ' + error.message);
      return;
    }
    setNovoTitulo('');
    recarregar();
  };

  const iniciarEdicao = (modulo) => {
    setEditandoId(modulo.id);
    setTituloEditado(modulo.titulo);
  };

  const salvarEdicao = async (id) => {
    if (!tituloEditado.trim()) return;
    const { error } = await renomearModulo(id, tituloEditado.trim());
    if (!error) {
      setEditandoId(null);
      recarregar();
    }
  };

  const handleExcluir = async (modulo) => {
    const aviso = modulo.aulas.length > 0
      ? `Esse módulo tem ${modulo.aulas.length} aula(s). Elas não serão apagadas, só ficam sem módulo. Excluir mesmo assim?`
      : 'Excluir esse módulo?';
    if (!(await avisos.confirmar({ titulo: 'Excluir esse módulo?', mensagem: modulo.aulas.length > 0 ? aviso.replace(' Excluir mesmo assim?', '') : undefined, confirmarTexto: 'Excluir', perigo: true }))) return;
    const { error } = await excluirModulo(modulo.id);
    if (!error) recarregar();
  };

  const handleMover = async (index, direcao) => {
    await reordenarModulos(modulos, index, direcao);
    recarregar();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar />

      <main className="flex-1 h-screen overflow-y-auto">

        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Gerenciar Módulos</h2>
              <p className="text-xs font-medium text-slate-500">Organize as aulas em módulos, por turma</p>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-5">

          {/* Seletor de turma */}
          <div className="relative w-full sm:w-72">
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Criar novo módulo */}
          <form onSubmit={handleCriarModulo} className="flex gap-3 bg-white border border-slate-200 rounded-2xl p-4">
            <input
              type="text"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex: Módulo 3 — Geometria Espacial"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
            />
            <button
              type="submit"
              disabled={criando || !novoTitulo.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
            >
              {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Novo Módulo
            </button>
          </form>

          {/* Lista de módulos */}
          {loading ? (
            <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando módulos...
            </div>
          ) : modulos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-400 font-medium">
              Nenhum módulo criado pra essa turma ainda. Crie o primeiro acima.
            </div>
          ) : (
            <div className="space-y-3">
              {modulos.map((modulo, index) => (
                <div key={modulo.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => handleMover(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleMover(index, 1)} disabled={index === modulos.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {editandoId === modulo.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={tituloEditado}
                          onChange={(e) => setTituloEditado(e.target.value)}
                          autoFocus
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-brand-orange"
                        />
                        <button onClick={() => salvarEdicao(modulo.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditandoId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{modulo.titulo}</h3>
                        <p className="text-xs text-slate-500">{modulo.aulas.length} aula{modulo.aulas.length === 1 ? '' : 's'}</p>
                      </div>
                    )}

                    {editandoId !== modulo.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => iniciarEdicao(modulo)} className="p-2 text-slate-400 hover:text-brand-orange transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExcluir(modulo)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {modulo.aulas.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 space-y-1">
                      {modulo.aulas.map((aula) => (
                        <p key={aula.id} className="text-xs text-slate-600 font-medium px-2 py-1">
                          {aula.titulo}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {semModulo.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">
                {semModulo.length} aula{semModulo.length === 1 ? '' : 's'} sem módulo
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Edite cada uma em "Aulas e Lives" e escolha um módulo pra ela aparecer organizada.
              </p>
              <div className="space-y-1">
                {semModulo.map((aula) => (
                  <p key={aula.id} className="text-xs text-amber-800 font-medium bg-white/60 rounded-lg px-3 py-1.5">
                    {aula.titulo}
                  </p>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}