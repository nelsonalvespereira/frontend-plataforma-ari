import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, X, PlayCircle, FileText, Radio, Eye, EyeOff, Package, Receipt,
  ShoppingBag, Gift, ExternalLink, Upload, Paperclip, Lock,
} from 'lucide-react';
import { BUCKET_MATERIAIS } from '../lib/packUtils';
import { Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../lib/supabaseClient';

const TIPOS = {
  aulao: { label: 'Aulão', icon: PlayCircle },
  questoes: { label: 'Questões', icon: FileText },
  live: { label: 'Live', icon: Radio },
};

const FORM_VAZIO = {
  tipo: 'aulao',
  titulo: '',
  descricao: '',
  video_url: '',
  link_url: '',
  arquivo_path: '',
  data_hora: '',
  duracao_min: '',
  pack_price_id: '',
  ordem: 0,
  ativo: true,
};

const PACK_VAZIO = {
  price_id: '',
  nome: '',
  descricao: '',
  valor: '',
  duracao_dias: 2,
  turma_id: '',
  ordem: 10,
  ativo: true,
};

// <input type="datetime-local"> trabalha em horário local, sem fuso.
function paraInputLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const campo = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange';
const rotulo = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1';

export default function AdminPack() {
  const [aba, setAba] = useState('packs');
  const [itens, setItens] = useState([]);
  const [packs, setPacks] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [filtroPack, setFiltroPack] = useState('');

  const [modalPack, setModalPack] = useState(false);
  const [editandoPack, setEditandoPack] = useState(null);
  const [formPack, setFormPack] = useState(PACK_VAZIO);
  const [liberando, setLiberando] = useState(null); // pack escolhido para liberar a um aluno
  const [formLiberar, setFormLiberar] = useState({ user_id: '', dias: 2 });
  const [compras, setCompras] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [arquivoNovo, setArquivoNovo] = useState(null); // PDF escolhido no formulário (ainda não enviado)

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    const [itensRes, comprasRes, turmasRes, packsRes, alunosRes] = await Promise.all([
      supabase.from('pack_itens').select('*').order('tipo').order('ordem'),
      supabase
        .from('pack_compras')
        .select('stripe_session_id, price_id, valor_centavos, dias, comprado_em, expira_em, profiles(nome)')
        .order('comprado_em', { ascending: false })
        .limit(100),
      supabase.from('turmas').select('id, nome').order('nome'),
      supabase.from('planos').select('*').eq('tipo', 'pack').order('ordem'),
      supabase.from('profiles').select('id, nome').order('nome'),
    ]);

    if (itensRes.error) setErro(itensRes.error.message);
    else if (packsRes.error) setErro(packsRes.error.message);
    setItens(itensRes.data ?? []);
    setPacks(packsRes.data ?? []);
    setAlunos(alunosRes.data ?? []);
    setCompras(comprasRes.data ?? []);
    setTurmas(turmasRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const abrirNovo = () => {
    setEditandoId(null);
    setArquivoNovo(null);
    setForm({ ...FORM_VAZIO, pack_price_id: filtroPack || (packs.length === 1 ? packs[0].price_id : '') });
    setModal(true);
  };

  // ------------------------------------------------------------- packs (planos)
  const setP = (k) => (e) => setFormPack((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const abrirNovoPack = () => {
    setEditandoPack(null);
    setFormPack(PACK_VAZIO);
    setModalPack(true);
  };

  const abrirEdicaoPack = (p) => {
    setEditandoPack(p.price_id);
    setFormPack({
      price_id: p.price_id,
      nome: p.nome ?? '',
      descricao: p.descricao ?? '',
      valor: ((p.valor_centavos ?? 0) / 100).toFixed(2),
      duracao_dias: p.duracao_dias ?? 2,
      turma_id: p.turma_id ?? '',
      ordem: p.ordem ?? 10,
      ativo: p.ativo,
    });
    setModalPack(true);
  };

  const salvarPack = async (e) => {
    e.preventDefault();
    const priceId = formPack.price_id.trim();
    if (!editandoPack && !priceId.startsWith('price_')) {
      alert('Cole o Price ID do Stripe (começa com "price_"). Ele precisa ser de PAGAMENTO ÚNICO.');
      return;
    }
    const dias = Number(formPack.duracao_dias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      alert('Duração deve ser de 1 a 365 dias.');
      return;
    }

    setSalvando(true);
    const payload = {
      nome: formPack.nome.trim(),
      descricao: formPack.descricao.trim() || null,
      valor_centavos: Math.round(Number(String(formPack.valor).replace(',', '.')) * 100) || 0,
      duracao_dias: dias,
      turma_id: formPack.turma_id || null,
      ordem: Number(formPack.ordem) || 0,
      ativo: formPack.ativo,
      tipo: 'pack',
    };
    const { error } = editandoPack
      ? await supabase.from('planos').update(payload).eq('price_id', editandoPack)
      : await supabase.from('planos').insert({ ...payload, price_id: priceId });
    setSalvando(false);
    if (error) {
      alert('Erro ao salvar o pack: ' + error.message);
      return;
    }
    setModalPack(false);
    carregar();
  };

  const alternarPackAtivo = async (p) => {
    const { error } = await supabase.from('planos').update({ ativo: !p.ativo }).eq('price_id', p.price_id);
    if (error) alert('Erro: ' + error.message);
    else carregar();
  };

  const encerrarCompra = async (c) => {
    if (!window.confirm(`Encerrar agora o acesso de ${c.profiles?.nome || 'este aluno'} a este pack?`)) return;
    const { error } = await supabase.rpc('admin_encerrar_pack', { p_session_id: c.stripe_session_id });
    if (error) alert('Erro ao encerrar: ' + error.message);
    else carregar();
  };

  const abrirLiberar = (p) => {
    setLiberando(p);
    setFormLiberar({ user_id: '', dias: p.duracao_dias || 2 });
  };

  const liberar = async (e) => {
    e.preventDefault();
    if (!formLiberar.user_id) return;
    setSalvando(true);
    const { data, error } = await supabase.rpc('admin_liberar_pack', {
      p_user_id: formLiberar.user_id,
      p_price_id: liberando.price_id,
      p_dias: Number(formLiberar.dias),
    });
    setSalvando(false);
    if (error) {
      alert('Erro ao liberar: ' + error.message);
      return;
    }
    alert(`Pack liberado até ${new Date(data).toLocaleString('pt-BR')}.`);
    setLiberando(null);
    carregar();
  };

  const abrirEdicao = (item) => {
    setEditandoId(item.id);
    setArquivoNovo(null);
    setForm({
      tipo: item.tipo,
      titulo: item.titulo ?? '',
      descricao: item.descricao ?? '',
      video_url: item.video_url ?? '',
      link_url: item.link_url ?? '',
      arquivo_path: item.arquivo_path ?? '',
      data_hora: paraInputLocal(item.data_hora),
      duracao_min: item.duracao_min ?? '',
      pack_price_id: item.pack_price_id ?? '',
      ordem: item.ordem ?? 0,
      ativo: item.ativo,
    });
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    if (!form.pack_price_id) {
      alert('Escolha a qual pack este item pertence.');
      return;
    }
    if (form.tipo === 'live' && !form.data_hora) {
      alert('Informe a data e hora da live.');
      return;
    }

    setSalvando(true);

    // Envia o PDF (se escolheu um novo) para o armazenamento PRIVADO, na pasta do pack.
    let arquivoPath = form.arquivo_path || null;
    if (arquivoNovo) {
      const nomeLimpo = arquivoNovo.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
      const caminho = `${form.pack_price_id}/${Date.now()}-${nomeLimpo}`;
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET_MATERIAIS)
        .upload(caminho, arquivoNovo, { contentType: 'application/pdf', upsert: false });
      if (erroUpload) {
        setSalvando(false);
        alert('Erro ao enviar o PDF: ' + erroUpload.message);
        return;
      }
      // Troca de arquivo: apaga o antigo para não acumular.
      if (form.arquivo_path) await supabase.storage.from(BUCKET_MATERIAIS).remove([form.arquivo_path]);
      arquivoPath = caminho;
    }

    const payload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      video_url: form.video_url.trim() || null,
      link_url: arquivoPath ? null : form.link_url.trim() || null,
      arquivo_path: form.tipo === 'live' ? null : arquivoPath,
      data_hora: form.tipo === 'live' && form.data_hora ? new Date(form.data_hora).toISOString() : null,
      duracao_min: form.duracao_min ? Number(form.duracao_min) : null,
      pack_price_id: form.pack_price_id,
      ordem: Number(form.ordem) || 0,
      ativo: form.ativo,
    };

    const { error } = editandoId
      ? await supabase.from('pack_itens').update(payload).eq('id', editandoId)
      : await supabase.from('pack_itens').insert(payload);

    setSalvando(false);
    if (error) {
      alert('Erro ao salvar: ' + error.message);
      return;
    }
    setArquivoNovo(null);
    setModal(false);
    carregar();
  };

  const alternarAtivo = async (item) => {
    const { error } = await supabase.from('pack_itens').update({ ativo: !item.ativo }).eq('id', item.id);
    if (error) alert('Erro: ' + error.message);
    else carregar();
  };

  const excluir = async (item) => {
    if (!window.confirm(`Excluir "${item.titulo}"?`)) return;
    const { error } = await supabase.from('pack_itens').delete().eq('id', item.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    if (item.arquivo_path) await supabase.storage.from(BUCKET_MATERIAIS).remove([item.arquivo_path]);
    carregar();
  };

  const nomeDoPack = (priceId) => packs.find((p) => p.price_id === priceId)?.nome;
  const nomeDaTurma = (id) => turmas.find((t) => t.id === id)?.nome;
  const lista = itens
    .filter((i) => !filtroTipo || i.tipo === filtroTipo)
    .filter((i) => !filtroPack || (filtroPack === '__sem__' ? !i.pack_price_id : i.pack_price_id === filtroPack));
  const itensPorPack = itens.reduce((acc, i) => ({ ...acc, [i.pack_price_id]: (acc[i.pack_price_id] || 0) + 1 }), {});
  const semPack = itens.filter((i) => !i.pack_price_id).length;
  const fmtData = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const fmtValor = (c) => (c == null ? '—' : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden text-slate-800">
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-orange" /> Packs Avulsos
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {packs.length} packs · {itens.length} itens de conteúdo · {compras.length} compras recentes
            </p>
          </div>
          {aba === 'packs' && (
            <button
              onClick={abrirNovoPack}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo pack
            </button>
          )}
          {aba === 'conteudo' && (
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo item
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex p-1 bg-white border border-slate-200 rounded-xl w-fit">
                {[
                  { id: 'packs', label: 'Packs', icon: ShoppingBag },
                  { id: 'conteudo', label: 'Conteúdo', icon: Package },
                  { id: 'compras', label: 'Compras', icon: Receipt },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setAba(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      aba === id ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {aba === 'conteudo' && (
                <select
                  value={filtroPack}
                  onChange={(e) => setFiltroPack(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                >
                  <option value="">Todos os packs</option>
                  {packs.map((p) => <option key={p.price_id} value={p.price_id}>{p.nome}</option>)}
                  {semPack > 0 && <option value="__sem__">Sem pack ({semPack})</option>}
                </select>
              )}

              {aba === 'conteudo' && (
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                >
                  <option value="">Todos os tipos</option>
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              )}
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
                {erro} — confira se as migrations do Pack e da Loja de Packs foram executadas.
              </div>
            )}

            {!loading && semPack > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium">
                {semPack} {semPack === 1 ? 'item está' : 'itens estão'} sem pack e não aparecem para nenhum aluno.
                Na aba Conteúdo, edite e escolha o pack de cada um.
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
              </div>
            ) : aba === 'packs' ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Pack', 'Preço', 'Acesso', 'Turma', 'Itens', 'Status', 'Ações'].map((h, i) => (
                        <th key={h} className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${i === 6 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {packs.map((p) => (
                      <tr key={p.price_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-slate-900 text-sm">{p.nome}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.price_id}</p>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600">{fmtValor(p.valor_centavos)}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600">{p.duracao_dias} {p.duracao_dias === 1 ? 'dia' : 'dias'}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600">{nomeDaTurma(p.turma_id) || 'Todas'}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600">{itensPorPack[p.price_id] || 0}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${p.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {p.ativo ? 'À venda' : 'Oculto'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link to={`/pack/${encodeURIComponent(p.price_id)}`} title="Ver como aluno" className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button onClick={() => abrirLiberar(p)} title="Liberar para um aluno (sem pagamento)" className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer">
                              <Gift className="w-4 h-4" />
                            </button>
                            <button onClick={() => alternarPackAtivo(p)} title={p.ativo ? 'Tirar de venda' : 'Colocar à venda'} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                              {p.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => abrirEdicaoPack(p)} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {packs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                          Nenhum pack cadastrado. Crie o produto no Stripe com preço de pagamento único e clique em "Novo pack".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : aba === 'conteudo' ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Item', 'Tipo', 'Pack', 'Data', 'Status', 'Ações'].map((h, i) => (
                        <th key={h} className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lista.map((item) => {
                      const T = TIPOS[item.tipo];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5">
                            <p className="font-bold text-slate-900 text-sm">{item.titulo}</p>
                            <p className="text-xs text-slate-500">Ordem {item.ordem}</p>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                              <T.icon className="w-4 h-4 text-brand-orange" /> {T.label}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium">
                            {nomeDoPack(item.pack_price_id) ? (
                              <span className="text-slate-600">{nomeDoPack(item.pack_price_id)}</span>
                            ) : (
                              <span className="text-amber-600 font-bold">Sem pack</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600">{item.data_hora ? fmtData(item.data_hora) : '—'}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${item.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {item.ativo ? 'Publicado' : 'Oculto'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => alternarAtivo(item)} title={item.ativo ? 'Ocultar' : 'Publicar'} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                                {item.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button onClick={() => abrirEdicao(item)} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => excluir(item)} title="Excluir" className="p-2 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {lista.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                          Nenhum item no Pack ainda. Clique em "Novo item" para publicar o aulão, as questões ou uma live.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Aluno', 'Pack', 'Valor', 'Comprado em', 'Acesso até', ''].map((h) => (
                        <th key={h || 'acoes'} className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compras.map((c) => {
                      const ativa = new Date(c.expira_em) > new Date();
                      return (
                        <tr key={c.stripe_session_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5 text-sm font-bold text-slate-900">{c.profiles?.nome || '—'}</td>
                          <td className="px-6 py-3.5 text-sm font-medium text-slate-600">{nomeDoPack(c.price_id) || '—'}</td>
                          <td className="px-6 py-3.5 text-sm font-medium text-slate-600">
                            {c.stripe_session_id.startsWith('manual:') ? 'Cortesia' : fmtValor(c.valor_centavos)}
                          </td>
                          <td className="px-6 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">{fmtData(c.comprado_em)}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${ativa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {fmtData(c.expira_em)} · {ativa ? 'ativo' : 'expirado'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-right">
                            {ativa && (
                              <button
                                onClick={() => encerrarCompra(c)}
                                className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                Encerrar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {compras.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                          Nenhuma compra de Pack ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">{editandoId ? 'Editar item do Pack' : 'Novo item do Pack'}</h3>
              <button onClick={() => setModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Tipo *</label>
                  <select value={form.tipo} onChange={set('tipo')} className={campo}>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Pack *</label>
                  <select required value={form.pack_price_id} onChange={set('pack_price_id')} className={campo}>
                    <option value="">Escolha o pack</option>
                    {packs.map((p) => <option key={p.price_id} value={p.price_id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={rotulo}>Título *</label>
                <input required value={form.titulo} onChange={set('titulo')} className={campo} placeholder="Ex: Aulão de Porcentagem — Parte 1" />
              </div>

              <div>
                <label className={rotulo}>Descrição</label>
                <textarea rows={3} value={form.descricao} onChange={set('descricao')} className={campo} />
              </div>

              <div>
                <label className={rotulo}>
                  {form.tipo === 'live' ? 'Link da transmissão (YouTube)' : form.tipo === 'questoes' ? 'Vídeo da resolução (opcional)' : 'Link do vídeo (YouTube / Vimeo)'}
                </label>
                <input value={form.video_url} onChange={set('video_url')} className={campo} placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              {form.tipo !== 'live' && (
                <div className="space-y-2">
                  <label className={rotulo}>
                    {form.tipo === 'questoes' ? 'PDF da lista de questões' : 'PDF de material de apoio (opcional)'}
                  </label>

                  {(form.arquivo_path || arquivoNovo) && (
                    <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800 min-w-0">
                        <Paperclip className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {arquivoNovo ? arquivoNovo.name : form.arquivo_path.split('/').pop().replace(/^\d+-/, '')}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setArquivoNovo(null); setForm((f) => ({ ...f, arquivo_path: '' })); }}
                        className="text-xs font-bold text-red-600 hover:underline cursor-pointer shrink-0"
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-brand-orange rounded-xl py-4 text-sm font-bold text-slate-500 hover:text-brand-orange cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    {form.arquivo_path || arquivoNovo ? 'Trocar PDF' : 'Enviar PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        if (f.type !== 'application/pdf') return alert('Envie um arquivo PDF.');
                        if (f.size > 50 * 1024 * 1024) return alert('O PDF pode ter no máximo 50 MB.');
                        setArquivoNovo(f);
                      }}
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Fica privado: só abre para quem tem este pack no prazo, com link que expira em minutos.
                  </p>

                  {!form.arquivo_path && !arquivoNovo && (
                    <details className="text-xs text-slate-500">
                      <summary className="cursor-pointer font-semibold">Ou usar um link externo (não protegido)</summary>
                      <input value={form.link_url} onChange={set('link_url')} className={`${campo} mt-2`} placeholder="https://..." />
                    </details>
                  )}
                </div>
              )}

              {form.tipo === 'live' && (
                <div>
                  <label className={rotulo}>Data e hora *</label>
                  <input type="datetime-local" value={form.data_hora} onChange={set('data_hora')} className={campo} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Duração (min)</label>
                  <input type="number" min="0" value={form.duracao_min} onChange={set('duracao_min')} className={campo} />
                </div>
                <div>
                  <label className={rotulo}>Ordem</label>
                  <input type="number" value={form.ordem} onChange={set('ordem')} className={campo} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={set('ativo')} className="w-4 h-4 accent-orange-500" />
                Publicado (visível para quem comprou este pack)
              </label>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalPack && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">{editandoPack ? 'Editar pack' : 'Novo pack'}</h3>
              <button onClick={() => setModalPack(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarPack} className="space-y-4">
              <div>
                <label className={rotulo}>Price ID do Stripe *</label>
                <input
                  required
                  disabled={!!editandoPack}
                  value={formPack.price_id}
                  onChange={setP('price_id')}
                  className={`${campo} font-mono disabled:opacity-60`}
                  placeholder="price_..."
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  No Stripe: Produtos → crie o produto → preço <strong>Pagamento único</strong> (não recorrente). Copie o ID do preço.
                </p>
              </div>

              <div>
                <label className={rotulo}>Nome *</label>
                <input required value={formPack.nome} onChange={setP('nome')} className={campo} placeholder="Ex: Aulão Imperdível ENEM" />
              </div>

              <div>
                <label className={rotulo}>Descrição (aparece na loja)</label>
                <textarea rows={3} value={formPack.descricao} onChange={setP('descricao')} className={campo} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Preço exibido (R$) *</label>
                  <input required inputMode="decimal" value={formPack.valor} onChange={setP('valor')} className={campo} placeholder="19,90" />
                </div>
                <div>
                  <label className={rotulo}>Dias de acesso *</label>
                  <input required type="number" min="1" max="365" value={formPack.duracao_dias} onChange={setP('duracao_dias')} className={campo} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 -mt-2">O valor cobrado é sempre o do preço no Stripe; este campo é só para exibir na loja.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Turma</label>
                  <select value={formPack.turma_id} onChange={setP('turma_id')} className={campo}>
                    <option value="">Todas as turmas</option>
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Ordem na loja</label>
                  <input type="number" value={formPack.ordem} onChange={setP('ordem')} className={campo} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formPack.ativo} onChange={setP('ativo')} className="w-4 h-4 accent-orange-500" />
                À venda (aparece na loja de packs)
              </label>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setModalPack(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {liberando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-black text-slate-900">Liberar pack</h3>
              <button onClick={() => setLiberando(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              <strong className="text-slate-700">{liberando.nome}</strong> sem pagamento (cortesia ou teste). Se o aluno já tiver este pack ativo, os dias são somados.
            </p>
            <form onSubmit={liberar} className="space-y-4">
              <div>
                <label className={rotulo}>Aluno *</label>
                <select required value={formLiberar.user_id} onChange={(e) => setFormLiberar((f) => ({ ...f, user_id: e.target.value }))} className={campo}>
                  <option value="">Escolha o aluno</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome || a.id}</option>)}
                </select>
              </div>
              <div>
                <label className={rotulo}>Dias de acesso *</label>
                <input required type="number" min="1" max="365" value={formLiberar.dias} onChange={(e) => setFormLiberar((f) => ({ ...f, dias: e.target.value }))} className={campo} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setLiberando(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Liberar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
