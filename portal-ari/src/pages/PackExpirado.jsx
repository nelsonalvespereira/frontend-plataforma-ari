import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Hourglass, ArrowRight, LogOut } from 'lucide-react';
import logo from '../assets/logo-ari.jpeg';
import { useAuth } from '../hooks/useAuth';

// Aviso exibido quando o acesso temporário do Pack terminou.
export default function PackExpirado() {
  const { user, loading, temAcesso, temPack, packExpiraEm, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (temAcesso) return <Navigate to="/dashboard" replace />; // virou assinante
  if (temPack) return <Navigate to="/packs" replace />;        // comprou/renovou o pack

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="Arimática Gabaritando" className="w-14 h-14 rounded-xl object-cover mx-auto" />
        <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto">
          <Hourglass className="w-8 h-8 text-brand-orange" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black">Seu acesso ao Pack terminou</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {packExpiraEm
              ? `O prazo acabou em ${packExpiraEm.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}. `
              : ''}
            Gostou do conteúdo? Continue estudando com a plataforma completa: videoaulas, banco de questões, simulados e lives da sua turma.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/packs"
            className="px-6 py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            Ver packs <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/pagamento"
            className="px-6 py-3.5 border border-slate-700 text-slate-200 hover:bg-white/5 font-bold text-sm rounded-xl transition-colors inline-flex items-center justify-center"
          >
            Ver assinaturas
          </Link>
          <button
            onClick={signOut}
            className="px-6 py-3.5 border border-slate-700 text-slate-300 hover:bg-white/5 font-bold text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
