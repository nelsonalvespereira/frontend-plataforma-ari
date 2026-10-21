import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const TAMANHO_MINIMO = 6; // mesmo mínimo do cadastro

// Página aberta pelo link do e-mail de recuperação.
// O Supabase lê o token da URL e dispara o evento PASSWORD_RECOVERY, que libera o formulário.
export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('verificando'); // verificando | pronto | invalido | sucesso
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Só aceita quem chegou por um link de recuperação (token no hash ou ?code= no fluxo PKCE).
    const veioDoLink =
      window.location.hash.includes('type=recovery') ||
      new URLSearchParams(window.location.search).has('code');

    if (!veioDoLink) {
      setEstado('invalido');
      return undefined;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setEstado('pronto');
    });

    // Se o evento já passou antes de o listener existir, a sessão de recuperação já está ativa.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setEstado((atual) => (atual === 'verificando' ? 'pronto' : atual));
    });

    // Link expirado/usado: o Supabase não cria sessão.
    const limite = setTimeout(() => {
      setEstado((atual) => (atual === 'verificando' ? 'invalido' : atual));
    }, 6000);

    return () => {
      clearTimeout(limite);
      listener.subscription.unsubscribe();
    };
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');

    if (senha.length < TAMANHO_MINIMO) {
      setErro(`A senha deve ter pelo menos ${TAMANHO_MINIMO} caracteres.`);
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      if (/same password|different from the old/i.test(error.message)) {
        setErro('A nova senha precisa ser diferente da anterior.');
      } else if (/session|jwt|expired/i.test(error.message)) {
        setEstado('invalido');
      } else {
        setErro('Não foi possível alterar a senha: ' + error.message);
      }
      return;
    }

    // Encerra a sessão de recuperação (e as demais): o aluno entra de novo com a senha nova.
    await supabase.auth.signOut();
    setEstado('sucesso');
  };

  const campo =
    'block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium';

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {estado === 'verificando' && (
          <div className="text-center space-y-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto" />
            <p className="font-medium">Validando seu link...</p>
          </div>
        )}

        {estado === 'invalido' && (
          <div className="space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Link inválido ou expirado</h1>
            <p className="text-slate-600 leading-relaxed">
              Por segurança, o link de recuperação vale por pouco tempo e só pode ser usado uma vez. Peça um novo.
            </p>
            <Link
              to="/esqueci-senha"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
            >
              Pedir novo link <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {estado === 'pronto' && (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Crie uma nova senha</h1>
            <p className="text-slate-500 mb-8 text-lg">Escolha uma senha que você não usa em outros sites.</p>

            {erro && (
              <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {erro}
              </div>
            )}

            <form onSubmit={salvar} className="space-y-5">
              <div>
                <label htmlFor="senha" className="block text-sm font-semibold text-slate-700 mb-1.5">Nova senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input id="senha" type="password" required autoFocus autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} placeholder="••••••••" />
                </div>
              </div>

              <div>
                <label htmlFor="confirmar" className="block text-sm font-semibold text-slate-700 mb-1.5">Repita a nova senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input id="confirmar" type="password" required autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={campo} placeholder="••••••••" />
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-brand-orange hover:bg-orange-600 text-white text-base font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}

        {estado === 'sucesso' && (
          <div className="space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Senha alterada!</h1>
            <p className="text-slate-600 leading-relaxed">Agora é só entrar com a sua nova senha.</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Ir para o login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
