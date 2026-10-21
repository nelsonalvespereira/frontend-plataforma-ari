import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Calendar, Plus, DollarSign, CheckCircle2, Clock, Ban, UserX,
  MoreHorizontal, LogOut, Loader2, RefreshCw, X, Package,
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../lib/supabaseClient';

// ---------------------------------------------------------------------------
// Regras de status
// Status do Stripe -> grupo mostrado ao admin.
//   Em dia    : assinatura ativa ou em período de teste (aluno tem acesso)
//   Pendente  : pagamento falhou ou não foi concluído (aluno SEM acesso, ainda pode regularizar)
//   Bloqueado : assinatura cancelada/encerrada (aluno SEM acesso)
// Sem assinatura = cadastrou e nunca pagou. Cortesia = acesso liberado manualmente (acesso_livre).
// Só pack = não assina, mas tem pack avulso dentro do prazo. Pack vencido = comprou pack e o prazo acabou.
// ---------------------------------------------------------------------------
const GRUPO_DO_STATUS = {
  active: 'em_dia',
  trialing: 'em_dia',
  past_due: 'pendente',
  unpaid: 'pendente',
  incomplete: 'pendente',
  canceled: 'bloqueado',
  incomplete_expired: 'bloqueado',
  paused: 'bloqueado',
};

// Se o aluno tem mais de uma assinatura, vale a "melhor" situação.
const PESO_DO_GRUPO = { em_dia: 3, pendente: 2, bloqueado: 1 };

// Ordem da tabela: o que pede atenção aparece primeiro.
const ORDEM_NA_TABELA = { pendente: 0, bloqueado: 1, pack: 2, pack_vencido: 3, sem_assinatura: 4, em_dia: 5, cortesia: 6 };

const STATUS = {
  em_dia: { label: 'Em dia', badge: 'bg-emerald-50 text-emerald-700', icone: CheckCircle2, cor: 'bg-emerald-50 text-emerald-500', ring: 'ring-emerald-400' },
  pendente: { label: 'Pendente', badge: 'bg-amber-50 text-amber-700', icone: Clock, cor: 'bg-amber-50 text-amber-500', ring: 'ring-amber-400' },
  bloqueado: { label: 'Bloqueado', badge: 'bg-red-50 text-red-600', icone: Ban, cor: 'bg-red-50 text-red-500', ring: 'ring-red-400' },
  sem_assinatura: { label: 'Sem assinatura', badge: 'bg-slate-100 text-slate-500', icone: UserX, cor: 'bg-slate-100 text-slate-500', ring: 'ring-slate-400' },
  cortesia: { label: 'Cortesia', badge: 'bg-violet-50 text-violet-700' },
  pack: { label: 'Só pack', badge: 'bg-orange-50 text-brand-orange', icone: Package, cor: 'bg-orange-50 text-brand-orange', ring: 'ring-orange-400' },
  pack_vencido: { label: 'Pack vencido', badge: 'bg-slate-100 text-slate-500' },
};

const brl = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const data = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const dataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

function iniciais(nome) {
  if (!nome) return 'AL';
  return nome.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// Texto de detalhe de cada linha, conforme a situação do aluno.
function detalhe(l) {
  switch (l.status) {
    case 'em_dia':
      return l.cancelaNoFim
        ? { texto: `Cancela em ${data(l.proximaData)}`, destaque: true }
        : { texto: `Renova em ${data(l.proximaData)}` };
    case 'pendente':
      return { texto: `Pagamento não confirmado desde ${data(l.desde)}`, destaque: true };
    case 'bloqueado':
      return { texto: `Sem acesso desde ${data(l.desde)}` };
    case 'cortesia':
      return { texto: 'Acesso liberado manualmente' };
    case 'pack':
      return { texto: `Pack até ${dataHora(l.packAte)}` };
    case 'pack_vencido':
      return { texto: `Pack venceu em ${dataHora(l.packAte)}` };
    default:
      return { texto: 'Nunca assinou' };
  }
}

const POR_PAGINA = 10;

export default function Admin() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [perfis, setPerfis] = useState([]);
  const [assinaturas, setAssinaturas] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [compras, setCompras] = useState([]);

  const [filtro, setFiltro] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);

  // Observação: a API do Supabase devolve no máximo 1000 linhas por consulta.
  // Com mais alunos que isso, o ideal é agregar no servidor (função SQL).
  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [perfisRes, assRes, planosRes, comprasRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nome, created_at, acesso_livre, turmas:turma_id ( nome )')
          .eq('is_admin', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('assinaturas')
          .select('user_id, price_id, status, current_period_end, cancel_at_period_end, updated_at'),
        supabase.from('planos').select('price_id, nome, valor_centavos, tipo'),
        supabase
          .from('pack_compras')
          .select('stripe_session_id, user_id, price_id, valor_centavos, comprado_em, expira_em'),
      ]);

      for (const r of [perfisRes, assRes, planosRes]) {
        if (r.error) throw r.error;
      }
      // Sem a tabela de packs (migration não rodada), o painel continua funcionando.
      if (comprasRes.error) console.warn('pack_compras indisponível:', comprasRes.error.message);

      setPerfis(perfisRes.data ?? []);
      setAssinaturas(assRes.data ?? []);
      setPlanos(planosRes.data ?? []);
      setCompras(comprasRes.data ?? []);
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
      setErro('Não foi possível carregar os dados de pagamento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Junta alunos + assinaturas e calcula o status de cada um.
  const { linhas, contagem, receitaMensal, receitaPacksMes } = useMemo(() => {
    const planoPorPrice = new Map(planos.map((p) => [p.price_id, p]));
    const idsAlunos = new Set(perfis.map((p) => p.id));

    const porAluno = new Map();
    for (const s of assinaturas) {
      if (!idsAlunos.has(s.user_id)) continue; // ignora assinaturas de admins/testes
      if (!porAluno.has(s.user_id)) porAluno.set(s.user_id, []);
      porAluno.get(s.user_id).push(s);
    }

    // Packs por aluno: o pack que vence por último (ativo ou não).
    const agora = Date.now();
    const packPorAluno = new Map();
    for (const c of compras) {
      const atual = packPorAluno.get(c.user_id);
      if (!atual || new Date(c.expira_em) > new Date(atual.expira_em)) packPorAluno.set(c.user_id, c);
    }

    const linhas = perfis.map((p) => {
      const subs = (porAluno.get(p.id) ?? [])
        .map((s) => ({ ...s, grupo: GRUPO_DO_STATUS[s.status] ?? 'bloqueado' }))
        .sort((a, b) =>
          PESO_DO_GRUPO[b.grupo] - PESO_DO_GRUPO[a.grupo]
          || new Date(b.updated_at) - new Date(a.updated_at));

      const melhor = subs[0];
      const ativas = subs.filter((s) => s.grupo === 'em_dia').length;

      const pack = packPorAluno.get(p.id);
      const packAtivo = !!pack && new Date(pack.expira_em).getTime() > agora;
      const nomePack = pack ? (planoPorPrice.get(pack.price_id)?.nome ?? 'Pack avulso') : null;

      let status;
      if (melhor?.grupo === 'em_dia') status = 'em_dia';
      else if (p.acesso_livre) status = 'cortesia';
      else if (packAtivo) status = 'pack';
      else if (melhor) status = melhor.grupo;
      else if (pack) status = 'pack_vencido';
      else status = 'sem_assinatura';

      const nomeAssinatura = melhor ? (planoPorPrice.get(melhor.price_id)?.nome ?? '—') : null;
      let nomePlano;
      if (nomeAssinatura && ativas > 1) nomePlano = `${nomeAssinatura} +${ativas - 1}`;
      else if (nomeAssinatura) nomePlano = nomeAssinatura;
      else if (nomePack) nomePlano = `${nomePack} (pack)`;
      else nomePlano = '—';
      // Assinante que também tem pack ativo.
      if (nomeAssinatura && packAtivo) nomePlano += ' + pack';

      // A turma só vale para quem assina (ou tem cortesia); quem só comprou pack não tem turma.
      const temTurma = status === 'em_dia' || status === 'cortesia' || status === 'pendente' || status === 'bloqueado';

      return {
        id: p.id,
        aluno: p.nome || 'Aluno sem nome',
        iniciais: iniciais(p.nome),
        turma: temTurma ? (p.turmas?.nome || 'Sem turma') : '—',
        plano: nomePlano,
        packAte: pack?.expira_em ?? null,
        cadastro: p.created_at,
        status,
        proximaData: melhor?.current_period_end ?? null,
        cancelaNoFim: !!melhor?.cancel_at_period_end,
        desde: melhor?.updated_at ?? null,
      };
    });

    const contagem = { em_dia: 0, pendente: 0, bloqueado: 0, sem_assinatura: 0, cortesia: 0, pack: 0, pack_vencido: 0 };
    for (const l of linhas) contagem[l.status] += 1;

    // Receita mensal estimada: soma do preço de tabela das assinaturas ATIVAS.
    // (Não considera cupons/descontos aplicados no Stripe.)
    let receitaMensal = 0;
    for (const [, subs] of porAluno) {
      for (const s of subs) {
        if (s.status === 'active') receitaMensal += planoPorPrice.get(s.price_id)?.valor_centavos ?? 0;
      }
    }

    // Packs vendidos no mês atual (pagamento único). Cortesias (liberação manual) não contam.
    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    inicioDoMes.setHours(0, 0, 0, 0);
    let receitaPacksMes = 0;
    for (const c of compras) {
      if (c.stripe_session_id?.startsWith('manual:')) continue;
      if (!idsAlunos.has(c.user_id)) continue;
      if (new Date(c.comprado_em) >= inicioDoMes) receitaPacksMes += c.valor_centavos ?? 0;
    }

    linhas.sort((a, b) => ORDEM_NA_TABELA[a.status] - ORDEM_NA_TABELA[b.status]);
    return { linhas, contagem, receitaMensal, receitaPacksMes };
  }, [perfis, assinaturas, planos, compras]);

  const linhasFiltradas = useMemo(() => {
    const termo = searchQuery.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro !== 'todos' && l.status !== filtro) return false;
      if (!termo) return true;
      return (
        l.aluno.toLowerCase().includes(termo)
        || l.turma.toLowerCase().includes(termo)
        || l.plano.toLowerCase().includes(termo)
      );
    });
  }, [linhas, filtro, searchQuery]);

  const alternarFiltro = (chave) => {
    setFiltro((atual) => (atual === chave ? 'todos' : chave));
    setLimite(POR_PAGINA);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const cartoes = [
    { chave: 'em_dia', descricao: 'Assinatura ativa' },
    { chave: 'pendente', descricao: 'Pagamento não confirmado' },
    { chave: 'bloqueado', descricao: 'Cancelados / encerrados' },
    { chave: 'sem_assinatura', descricao: 'Cadastrados que nunca pagaram' },
    { chave: 'pack', descricao: 'Não assinam; pack no prazo' },
  ];

  const visiveis = linhasFiltradas.slice(0, limite);
  const restantes = linhasFiltradas.length - visiveis.length;

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">

      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setLimite(POR_PAGINA); }}
              placeholder="Buscar aluno, turma ou plano..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors"
            />
          </div>

          <div className="flex items-center gap-5 ml-auto">
            <button className="relative text-slate-400 hover:text-brand-orange transition-colors">
              <Bell className="w-4.5 h-4.5" />
              {contagem.pendente > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
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
                <p className="text-slate-500 text-sm font-medium mt-1">
                  {loading ? 'Carregando…' : `${linhas.length.toLocaleString('pt-BR')} alunos cadastrados.`}
                  {!loading && contagem.pendente > 0 && (
                    <span className="text-amber-600 font-bold"> {contagem.pendente} com pagamento pendente.</span>
                  )}
                </p>
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

            {erro && (
              <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3">
                <span>{erro}</span>
                <button onClick={carregar} className="font-bold underline cursor-pointer">Tentar de novo</button>
              </div>
            )}

            {/* KPIs de pagamento: clique para filtrar a tabela */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {cartoes.map(({ chave, descricao }) => {
                const cfg = STATUS[chave];
                const Icone = cfg.icone;
                const ativo = filtro === chave;
                return (
                  <button
                    key={chave}
                    onClick={() => alternarFiltro(chave)}
                    className={`text-left bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:border-brand-orange/30 ${
                      ativo ? `ring-2 ${cfg.ring} border-transparent` : 'border-slate-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cfg.cor}`}>
                      <Icone className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-500 mb-1">{cfg.label}</p>
                      <h3 className="text-2xl font-black text-slate-900 leading-none">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" /> : contagem[chave].toLocaleString('pt-BR')}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">{descricao}</p>
                    </div>
                  </button>
                );
              })}

              {/* Receita mensal estimada */}
              <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-brand-orange">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 mb-1">Receita do mês</p>
                  <h3 className="text-xl font-black text-slate-900 leading-none">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" /> : brl(receitaMensal + receitaPacksMes)}
                  </h3>
                  <p
                    className="text-[11px] text-slate-400 font-medium mt-1 truncate"
                    title="Assinaturas: preço de tabela das assinaturas ativas. Packs: vendas avulsas deste mês (sem cortesias)."
                  >
                    Assinaturas {brl(receitaMensal)} · Packs {brl(receitaPacksMes)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabela de alunos e pagamentos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-black text-slate-900">Alunos e pagamentos</h3>
                  {filtro !== 'todos' && (
                    <button
                      onClick={() => alternarFiltro(filtro)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${STATUS[filtro].badge}`}
                      title="Remover filtro"
                    >
                      {STATUS[filtro].label} <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={carregar}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-brand-orange transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                  </button>
                  <Link to="/admin/alunos" className="text-sm font-bold text-brand-orange hover:text-orange-600 transition-colors">
                    Gerenciar alunos
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm font-medium">Carregando dados...</p>
                  </div>
                ) : linhasFiltradas.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">
                    Nenhum aluno encontrado para este filtro.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aluno</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Turma</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plano</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhe</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {visiveis.map((row) => {
                        const info = detalhe(row);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {row.iniciais}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 text-sm block">{row.aluno}</span>
                                  <span className="text-[11px] text-slate-400 font-medium">Cadastro em {data(row.cadastro)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-bold text-slate-600">{row.turma}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-600">{row.plano}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS[row.status].badge}`}>
                                {STATUS[row.status].label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${info.destaque ? 'text-amber-600' : 'text-slate-500'}`}>
                                {info.texto}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Link to="/admin/alunos" className="text-slate-400 hover:text-brand-orange bg-white hover:bg-orange-50 rounded-lg transition-colors p-2 inline-block">
                                <MoreHorizontal className="w-4.5 h-4.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {!loading && restantes > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 text-center">
                  <button
                    onClick={() => setLimite((l) => l + POR_PAGINA)}
                    className="text-sm font-bold text-brand-orange hover:text-orange-600 cursor-pointer"
                  >
                    Mostrar mais ({restantes} restantes)
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}