import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const INTERVALO_MS = 2000;
const LIMITE_MS = 30000;

// O Stripe devolve o aluno para cá logo após o pagamento, mas quem libera o acesso
// é o webhook, que pode levar alguns segundos. Aqui consultamos até a assinatura (ou o
// Pack Avulso, quando ?produto=pack) aparecer.
export default function PagamentoSucesso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ehPack = searchParams.get('produto') === 'pack';
  const sessionId = searchParams.get('session_id');
  const { temAcesso, recarregarAssinaturas, recarregarPerfil } = useAuth();
  const [expirou, setExpirou] = useState(false);
  const [packLiberado, setPackLiberado] = useState(null); // price_id do pack comprado, quando o webhook gravar

  // Assinatura: espera o acesso aparecer. Pack: espera a compra DESTA sessão aparecer
  // (o aluno pode já ter outro pack ativo, então "ter pack" não basta).
  const destino = ehPack ? (packLiberado ? `/pack/${encodeURIComponent(packLiberado)}` : null) : temAcesso ? '/dashboard' : null;

  useEffect(() => {
    if (destino) navigate(destino, { replace: true });
  }, [destino, navigate]);

  useEffect(() => {
    if (destino) return undefined;

    const inicio = Date.now();
    const id = setInterval(async () => {
      if (ehPack) {
        if (sessionId) {
          const { data } = await supabase
            .from('pack_compras')
            .select('price_id')
            .eq('stripe_session_id', sessionId)
            .maybeSingle();
          if (data?.price_id) {
            await recarregarPerfil();
            setPackLiberado(data.price_id);
          }
        }
      } else {
        // Recarrega o perfil também: o webhook pode ter trocado a turma do aluno.
        await Promise.all([recarregarAssinaturas(), recarregarPerfil()]);
      }
      if (Date.now() - inicio > LIMITE_MS) {
        clearInterval(id);
        setExpirou(true);
      }
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [destino, ehPack, sessionId, recarregarAssinaturas, recarregarPerfil]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        {expirou ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-black">Pagamento recebido</h1>
            <p className="text-slate-400 text-sm">
              A confirmação está demorando mais que o normal. Seu acesso será liberado assim que
              o pagamento for processado. Você pode atualizar esta página em alguns minutos.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-3 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl cursor-pointer"
              >
                Atualizar
              </button>
              <Link
                to="/"
                className="px-5 py-3 border border-slate-700 text-slate-300 font-bold text-sm rounded-xl"
              >
                Voltar ao início
              </Link>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-brand-orange mx-auto animate-spin" />
            <h1 className="text-2xl font-black">Confirmando seu pagamento</h1>
            <p className="text-slate-400 text-sm">
              Isso leva só alguns segundos. {ehPack ? 'Você será levado ao seu Pack automaticamente.' : 'Você será levado ao painel automaticamente.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
