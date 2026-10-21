import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ESPERA_REENVIO_S = 60; // o Supabase limita o envio de e-mails de recuperação

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const enviar = async (e) => {
    e.preventDefault();
    if (loading || espera > 0) return;
    setLoading(true);
    setErro('');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setLoading(false);

    if (error) {
      const limite = error.status === 429 || /rate limit|security purposes/i.test(error.message);
      setErro(
        limite
          ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
          : 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.'
      );
      if (limite) setEspera(ESPERA_REENVIO_S);
      return;
    }

    // Resposta propositalmente igual exista a conta ou não (não revela quem é aluno).
    setEnviado(true);
    setEspera(ESPERA_REENVIO_S);
  };

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>

        {enviado ? (
          <div className="space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verifique seu e-mail</h1>
            <p className="text-slate-600 leading-relaxed">
              Se existir uma conta com <strong>{email.trim()}</strong>, você vai receber em instantes um link para criar uma nova senha.
              Confira também a caixa de spam.
            </p>
            <button
              onClick={() => setEnviado(false)}
              disabled={espera > 0}
              className="text-sm font-bold text-brand-orange hover:text-orange-600 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {espera > 0 ? `Enviar de novo em ${espera}s` : 'Não chegou? Enviar de novo'}
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Esqueceu a senha?</h1>
            <p className="text-slate-500 mb-8 text-lg">Informe seu e-mail e enviaremos um link para você criar uma nova.</p>

            {erro && (
              <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {erro}
              </div>
            )}

            <form onSubmit={enviar} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || espera > 0}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-brand-orange hover:bg-orange-600 text-white text-base font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {espera > 0 ? `Aguarde ${espera}s` : 'Enviar link de recuperação'}
                    {espera <= 0 && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
