import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { ShieldCheck, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Pagamento() {
  const [loadingPlano, setLoadingPlano] = useState(null);

  // IDs de preço oficiais configurados no painel da Stripe
  const PLANOS = [
    { id: 'price_1UNFWdE8OAb1ScAoQZvU0g8x', nome: 'ENEM', valor: '69,99', desc: 'Foco total nas matrizes de referência e simulados estilo ENEM.' },
    { id: 'price_1UNFedE8OAb1ScAoc82kerg8', nome: 'Concursos', valor: '69,99', desc: 'Preparatório completo para editais civis e militares.' },
    { id: 'price_1UNFgaE8OAb1ScAoDkdFdEI8', nome: 'Pré-IFMA', valor: '29,90', desc: 'Conteúdo direcionado para aprovação no Instituto Federal.' },
    { id: 'price_1UNFjPE8OAb1ScAoSkm77Wk2', nome: '6º Ano', valor: '29,90', desc: 'Reforço escolar e base sólida para o Ensino Fundamental.' },
    { id: 'price_1UNFknE8OAb1ScAoU5mlDeBV', nome: 'Isolada de Matemática', valor: '59,90', desc: 'Domine a matemática do zero ao avançado com o professor.' },
  ];

  const handleAssinar = async (priceId, nomePlano) => {
    setLoadingPlano(nomePlano);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Você precisa estar logado para assinar.');
        return window.location.href = '/login';
      }

      // Chama a Edge Function no Supabase para gerar a sessão de checkout segura da Stripe
      const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
        body: { priceId, userId: user.id, email: user.email },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url; // Redireciona o aluno direto para a página de pagamento da Stripe
      } else {
        throw new Error('URL de pagamento não retornada.');
      }

    } catch (err) {
      console.error('Erro ao iniciar pagamento:', err);
      alert('Erro ao conectar com o gateway de pagamento.');
    } finally {
      setLoadingPlano(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col items-center justify-center p-6 md:p-12 text-white">
      <div className="max-w-4xl w-full text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-brand-orange border border-orange-500/20 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" /> Assinatura Mensal Recorrente
        </div>
        <h1 className="text-3xl md:text-5xl font-black">Escolha sua modalidade</h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">Acesso completo à plataforma, simulados, videoaulas e banco de questões da sua turma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        {PLANOS.map((plano) => (
          <div key={plano.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-7 flex flex-col justify-between transition-all shadow-xl">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-white">{plano.nome}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">R$ {plano.valor}</span>
                <span className="text-xs text-slate-400 font-medium">/ mês</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{plano.desc}</p>
              <ul className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Renovação automática mensal</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Acesso imediato ao conteúdo</li>
              </ul>
            </div>
            <button
              onClick={() => handleAssinar(plano.id, plano.nome)}
              disabled={loadingPlano === plano.nome}
              className="w-full mt-8 py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loadingPlano === plano.nome ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Assinar {plano.nome}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Pagamento 100% seguro processado via Stripe. Cancele quando quiser.
      </div>
    </div>
  );
}