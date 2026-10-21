import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Área do Pack Avulso: exige login e (pack ativo OU acesso completo).
// Quando o prazo do pack acaba, useAuth atualiza o estado e esta rota redireciona sozinha
// para o aviso de expiração, mesmo com o aluno parado na página.
export default function PackRoute({ children }) {
  const { user, temAcesso, temPack, packExpirado, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (temAcesso || temPack) return children;
  if (packExpirado) return <Navigate to="/pack/expirado" replace />;
  return <Navigate to="/pagamento" replace />;
}