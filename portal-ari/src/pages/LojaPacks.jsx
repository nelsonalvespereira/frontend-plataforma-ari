import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Timer, CheckCircle2, Loader2, LogOut, PlayCircle, Plus, ShoppingBag } from 'lucide-react';
import Sidebar from './Sidebar';
import AvisoInstalarApp from '../components/AvisoInstalarApp';
import logo from '../assets/logo-ari.jpeg';
import { useAuth } from '../hooks/useAuth';
import { useLojaPacks } from '../hooks/usePack';
import { formatarRestante, rotuloDuracao } from '../lib/packUtils';

const formatarPreco = (centavos) =>
  ((centavos ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Assinante/admin vê a página dentro do painel (com o menu lateral).
// Quem só tem pack (ou nada) vê uma versão simples, sem o menu da plataforma.
function Moldura({ comMenu, children, signOut }) {
  if (comMenu) {
    return (
      <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Packs Avulsos</h2>
              <p className="text-xs font-medium text-slate-500">Aulões e materiais extras com acesso por tempo limitado</p>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans">
      <header className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="Arimática Gabaritando" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            <span className="font-black tracking-tight truncate">Packs Avulsos</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/pagamento" className="px-3 py-1.5 text-xs font-bold text-slate-200 border border-white/15 hover:bg-white/10 rounded-lg">
              Ver assinaturas
            </Link>
            <button onClick={signOut} title="Sair" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">{children}</div>
    </div>
  );
}

function CartaoPack({ pack, expiraEm, agora, onComprar }) {
  const ativo = !!expiraEm && expiraEm.getTime() > agora;

  return (
    <div
      className={`bg-white rounded-3xl p-6 flex flex-col gap-4 border shadow-sm ${
        ativo ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center shrink-0">
          <Package className="w-5 h-5" />
        </div>
        {ativo ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-brand-orange text-[11px] font-bold">
            <Timer className="w-3.5 h-3.5" /> {rotuloDuracao(pack.duracao_dias)} de acesso
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-black text-slate-900 leading-snug">{pack.nome}</h3>
        {pack.descricao && <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{pack.descricao}</p>}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
        {ativo ? (
          <>
            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-emerald-600" />
              Acaba em <span className="tabular-nums text-slate-800">{formatarRestante(expiraEm.getTime() - agora)}</span>
            </p>
            <div className="flex gap-2">
              <Link
                to={`/pack/${encodeURIComponent(pack.price_id)}`}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <PlayCircle className="w-4 h-4" /> Acessar
              </Link>
              <button
                onClick={() => onComprar(pack)}
                title="Comprar mais tempo"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tempo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{formatarPreco(pack.valor_centavos)}</span>
              <span className="text-xs text-slate-500 font-medium">pagamento único</span>
            </div>
            <button
              onClick={() => onComprar(pack)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Comprar pack
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LojaPacks() {
  const navigate = useNavigate();
  const { user, profile, temAcesso, signOut } = useAuth();
  const { packs, meus, loading, erro } = useLojaPacks(profile?.turma_id, user?.id);

  // Relógio da página: atualiza os contadores a cada 30s (e esconde o "Liberado" quando vence).
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const comprar = (pack) => navigate(`/pagamento?plano=${encodeURIComponent(pack.price_id)}&voltar=packs`);

  const liberados = packs.filter((p) => meus[p.price_id] && meus[p.price_id].getTime() > agora);
  const disponiveis = packs.filter((p) => !liberados.includes(p));

  return (
    <Moldura comMenu={temAcesso} signOut={signOut}>
      <AvisoInstalarApp />
      <div className="max-w-6xl mx-auto space-y-8">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
            Não foi possível carregar os packs. Atualize a página.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando packs...
          </div>
        ) : packs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 mb-1">Nenhum pack disponível agora</h3>
            <p className="text-sm text-slate-500">Quando o professor lançar um novo aulão, ele aparece aqui.</p>
          </div>
        ) : (
          <>
            {liberados.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meus packs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {liberados.map((p) => (
                    <CartaoPack key={p.price_id} pack={p} expiraEm={meus[p.price_id]} agora={agora} onComprar={comprar} />
                  ))}
                </div>
              </section>
            )}

            {disponiveis.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {liberados.length > 0 ? 'Outros packs' : 'Packs disponíveis'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {disponiveis.map((p) => (
                    <CartaoPack key={p.price_id} pack={p} expiraEm={null} agora={agora} onComprar={comprar} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Moldura>
  );
}
