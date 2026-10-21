import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Zap, Loader2, CheckCircle2, ArrowLeft, Timer, LogOut, LogIn } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { rotuloDuracao } from '../lib/packUtils';

// Fora do componente, para não recriar o Stripe a cada render.
const chavePublica = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = chavePublica ? loadStripe(chavePublica) : null;

const formatarPreco = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Lê a mensagem de erro que a Edge Function devolveu (corpo JSON), se houver.
async function mensagemDoErro(error, padrao) {
  try {
    const corpo = await error.context?.json?.();
    return corpo?.error || padrao;
  } catch {
    return padrao;
  }
}

// Formulário de pagamento do Stripe, dentro da página.
function PainelCheckout({ plano, onVoltar, onErro }) {
  // Chamada pelo Stripe ao montar o formulário: pede ao servidor uma sessão para este plano.
  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
      body: { priceId: plano.price_id },
    });

    if (error) {
      const msg = await mensagemDoErro(error, 'Não foi possível iniciar o pagamento.');
      onErro(msg);
      throw new Error(msg);
    }
    if (!data?.clientSecret) {
      const msg = 'O formulário de pagamento não foi retornado. Tente novamente.';
      onErro(msg);
      throw new Error(msg);
    }
    return data.clientSecret;
  }, [plano.price_id, onErro]);

  return (
    <div className="max-w-3xl w-full">
      <button
        onClick={onVoltar}
        className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Trocar de plano
      </button>

      <div className="mb-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">Plano escolhido</p>
          <p className="text-lg font-black">{plano.nome}</p>
        </div>
        <p className="text-xl font-black">
          {formatarPreco(plano.valor_centavos)}
          <span className="text-xs text-slate-400 font-medium">
            {plano.tipo === 'pack' ? ` · pagamento único · ${rotuloDuracao(plano.duracao_dias)} de acesso` : ' / mês'}
          </span>
        </p>
      </div>

      <div className="rounded-2xl bg-white p-2 sm:p-4 min-h-[320px]">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

export default function Pagamento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, temAssinatura, temPack, packExpiraEm, loading: loadingAuth, signOut } = useAuth();

  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const [erro, setErro] = useState('');
  const topoRef = useRef(null);

  // Os planos vêm da tabela `planos` (os Price IDs não ficam fixos no código).
  useEffect(() => {
    supabase
      .from('planos')
      .select('price_id, nome, descricao, valor_centavos, tipo, duracao_dias, turma_id')
      .order('ordem', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar os planos. Tente novamente.');
        else setPlanos(data ?? []);
        setLoadingPlanos(false);
      });
  }, []);

  // Vindo da Loja de Packs (/pagamento?plano=price_...): abre direto o pagamento daquele pack.
  const planoDaUrl = searchParams.get('plano');
  const voltarParaLoja = searchParams.get('voltar') === 'packs';
  const jaAbriuDaUrl = useRef(false);
  useEffect(() => {
    if (jaAbriuDaUrl.current || !planoDaUrl || loadingPlanos || loadingAuth) return;
    jaAbriuDaUrl.current = true;
    const plano = planos.find((p) => p.price_id === planoDaUrl);
    if (plano) handleEscolherPlano(plano);
    else setErro('Este pack não está mais disponível.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoDaUrl, planos, loadingPlanos, loadingAuth]);

  const voltarDoCheckout = () => {
    if (voltarParaLoja) navigate('/packs');
    else setPlanoSelecionado(null);
  };

  // Se o formulário falhar, volta para a lista de planos e mostra o motivo.
  const handleErroCheckout = useCallback((mensagem) => {
    setErro(mensagem);
    setPlanoSelecionado(null);
  }, []);

  const handleEscolherPlano = (plano) => {
    setErro('');

    if (!user) {
      navigate('/login');
      return;
    }
    if (!stripePromise) {
      setErro('Pagamento indisponível: falta configurar VITE_STRIPE_PUBLIC_KEY.');
      return;
    }

    setPlanoSelecionado(plano);
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const abrirPortal = async () => {
    setErro('');
    setAbrindoPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('portal-cliente');
      if (error) throw new Error(await mensagemDoErro(error, 'Não foi possível abrir o portal.'));
      window.location.href = data.url;
    } catch (err) {
      setErro(err.message);
      setAbrindoPortal(false);
    }
  };

  const assinaturas = planos.filter((p) => p.tipo !== 'pack');
  // Packs de outra turma não aparecem (pack sem turma = todos).
  const packs = planos.filter(
    (p) => p.tipo === 'pack' && (!p.turma_id || p.turma_id === profile?.turma_id)
  );
  const escolhendoPack = planoSelecionado?.tipo === 'pack';

  const trocarDeConta = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col items-center justify-center p-6 md:p-12 text-white">
      {/* Barra da conta: deixa claro com quem o aluno está logado e permite trocar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-5 md:px-8 py-4 text-sm">
        <Link to="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white font-semibold">
          <ArrowLeft className="w-4 h-4" /> Início
        </Link>
        {!loadingAuth && (
          user ? (
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-slate-400 truncate">
                Conectado como <strong className="text-slate-200">{profile?.nome || user.email}</strong>
              </span>
              <button
                onClick={trocarDeConta}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:bg-white/5 text-slate-200 font-bold rounded-lg cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" /> Sair / trocar de conta
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:bg-white/5 text-slate-200 font-bold rounded-lg"
            >
              <LogIn className="w-4 h-4" /> Já tenho conta
            </Link>
          )
        )}
      </div>

      <div ref={topoRef} className="max-w-4xl w-full text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-brand-orange border border-orange-500/20 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" /> {escolhendoPack ? 'Pack Avulso · Pagamento Único' : 'Assinatura Mensal Recorrente'}
        </div>
        <h1 className="text-3xl md:text-5xl font-black">
          {planoSelecionado
            ? (escolhendoPack ? 'Finalize sua compra' : 'Finalize sua assinatura')
            : 'Escolha sua modalidade'}
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Acesso completo à plataforma, simulados, videoaulas e banco de questões da sua turma.
        </p>
      </div>

      {searchParams.get('canceled') && !temAssinatura && !planoSelecionado && (
        <div className="max-w-6xl w-full mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300">
          O pagamento foi cancelado e nada foi cobrado. Quando quiser, escolha um plano abaixo.
        </div>
      )}

      {temPack && !temAssinatura && !planoSelecionado && (
        <div className="max-w-6xl w-full mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-emerald-300 font-medium">
            Você tem pack ativo{packExpiraEm ? ` até ${packExpiraEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}.
          </span>
          <Link to="/packs" className="px-4 py-2 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-lg text-center">
            Meus packs
          </Link>
        </div>
      )}

      {temAssinatura && !planoSelecionado && (
        <div className="max-w-6xl w-full mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-emerald-300 font-medium">Você já tem uma assinatura ativa.</span>
          <div className="flex gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-lg"
            >
              Ir para o painel
            </Link>
            <button
              onClick={abrirPortal}
              disabled={abrindoPortal}
              className="px-4 py-2 border border-slate-600 text-slate-200 font-bold rounded-lg cursor-pointer disabled:opacity-50"
            >
              {abrindoPortal ? 'Abrindo…' : 'Gerenciar assinatura'}
            </button>
          </div>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="max-w-6xl w-full mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"
        >
          {erro}
        </div>
      )}

      {planoSelecionado ? (
        <PainelCheckout
          key={planoSelecionado.price_id}
          plano={planoSelecionado}
          onVoltar={voltarDoCheckout}
          onErro={handleErroCheckout}
        />
      ) : loadingPlanos || loadingAuth ? (
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
          {assinaturas.map((plano) => (
            <div
              key={plano.price_id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-7 flex flex-col justify-between transition-all shadow-xl"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">{plano.nome}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">{formatarPreco(plano.valor_centavos)}</span>
                  <span className="text-xs text-slate-400 font-medium">/ mês</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{plano.descricao}</p>
                <ul className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Renovação automática mensal
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Acesso imediato ao conteúdo
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleEscolherPlano(plano)}
                className="w-full mt-8 py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                Assinar {plano.nome}
              </button>
            </div>
          ))}
        </div>
      )}

      {!planoSelecionado && !loadingPlanos && !loadingAuth && packs.length > 0 && (
        <div className="max-w-6xl w-full mt-14">
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-xl md:text-2xl font-black">{temAssinatura ? 'Packs avulsos' : 'Prefere experimentar antes?'}</h2>
            <p className="text-slate-400 text-sm">Aulões com acesso temporário, pagamento único e sem renovação automática.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {packs.map((pack) => (
              <div
                key={pack.price_id}
                className="bg-slate-900 border border-brand-orange/30 hover:border-brand-orange/60 rounded-3xl p-7 flex flex-col justify-between transition-all shadow-xl"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-brand-orange text-[11px] font-bold uppercase tracking-wider">
                    <Timer className="w-3 h-3" /> {rotuloDuracao(pack.duracao_dias)} de acesso
                  </div>
                  <h3 className="text-lg font-black text-white">{pack.nome}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{formatarPreco(pack.valor_centavos)}</span>
                    <span className="text-xs text-slate-400 font-medium">pagamento único</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{pack.descricao}</p>
                  <ul className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Aulão, questões e lives deste pack
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Sem renovação automática
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => handleEscolherPlano(pack)}
                  className="w-full mt-8 py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  Comprar {pack.nome}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Pagamento 100% seguro processado via Stripe. Assinaturas podem ser canceladas quando quiser.
      </div>
    </div>
  );
}
