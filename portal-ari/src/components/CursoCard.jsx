import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CursoCard({ titulo, descricao, preco, priceId, badge }) {
  const [loading, setLoading] = useState(false);

  const handleComprarDireto = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Você precisa estar logado para assinar um curso.');
        return window.location.href = '/login';
      }

      // Chama a Edge Function do Supabase passando o ID do preço específico do curso
      const { data, error } = await supabase.functions.invoke('criar-checkout-stripe', {
        body: { priceId, userId: user.id, email: user.email },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url; // Redireciona direto para o checkout da Stripe
      } else {
        throw new Error('URL de pagamento não gerada.');
      }

    } catch (err) {
      console.error('Erro ao redirecionar para o checkout:', err);
      alert('Erro ao iniciar o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 hover:border-brand-orange rounded-3xl p-7 shadow-xs flex flex-col justify-between transition-all relative group">
      {badge && (
        <span className="absolute -top-3.5 right-6 px-3 py-1 bg-brand-orange text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
          {badge}
        </span>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900">{titulo}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{descricao}</p>
        
        <div className="flex items-baseline gap-1 pt-2">
          <span className="text-3xl font-black text-slate-900">R$ {preco}</span>
          <span className="text-xs text-slate-400 font-medium">/ mês</span>
        </div>

        <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600 font-medium">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Acesso imediato a todo o conteúdo</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Simulados e Banco de Questões</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" /> Renovação automática mensal</li>
        </ul>
      </div>

      <button
        onClick={handleComprarDireto}
        disabled={loading}
        className="w-full mt-8 py-4 bg-slate-900 group-hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Assinar {titulo}
      </button>
    </div>
  );
}