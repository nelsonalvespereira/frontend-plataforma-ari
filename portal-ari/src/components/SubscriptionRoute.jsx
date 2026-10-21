import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Para as áreas do aluno: exige login e assinatura ativa (admin sempre passa).
// Sem assinatura, o aluno vai para /pagamento em vez de ver o conteúdo.
// Quem comprou o Pack Avulso não entra aqui: é levado ao /pack (ou ao aviso, se o prazo acabou).
export default function SubscriptionRoute({ children }) {
  const { user, temAcesso, temPack, packExpirado, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!temAcesso) {
    if (temPack) return <Navigate to="/packs" replace />;
    if (packExpirado) return <Navigate to="/pack/expirado" replace />;
    return <Navigate to="/pagamento" replace />;
  }

  return children;
}
