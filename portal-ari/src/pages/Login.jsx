import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Turma escolhida lá na Landing Page
    const niche = searchParams.get('niche') || localStorage.getItem('selectedNiche') || 'enem';

    try {
      if (isRegistering) {
        const { error } = await signUp({
          email,
          password,
          nome: email.split('@')[0], // nome provisório até termos um campo próprio
          turmaSlug: niche,
        });

        if (error) throw error;
        
        // Redireciona para o pagamento após criar a conta com sucesso
        navigate('/pagamento');
      } else {
        const { error } = await signIn({ email, password });
        if (error) throw error;

        // 1. Pega o usuário que acabou de logar na sessão
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

          if (profile?.is_admin) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          // Fallback de segurança
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error(error);
      if (error.message.includes('Invalid login credentials')) {
        setErrorMsg('E-mail ou senha incorretos.');
      } else if (error.message.includes('User already registered')) {
        setErrorMsg('Este e-mail já está cadastrado.');
      } else if (error.message.includes('Password should be at least')) {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setErrorMsg('Ocorreu um erro: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">

      {/* LADO ESQUERDO: Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 bg-white relative z-10">

        <div className="absolute top-8 left-8 sm:top-12 sm:left-16 md:left-24 xl:left-32">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-orange to-orange-400 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-black text-lg">A</span>
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight">
              Portal<span className="text-brand-orange">Ari</span>
            </span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto mt-16 lg:mt-0">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta!'}
          </h2>
          <p className="text-slate-500 mb-8 text-lg">
            {isRegistering
              ? 'Faça seu cadastro para iniciar sua jornada.'
              : 'Acesse sua conta para continuar sua jornada rumo à aprovação.'}
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isRegistering && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-slate-300 rounded cursor-pointer transition-colors"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer font-medium">
                    Lembrar de mim
                  </label>
                </div>

                <a href="#" className="text-sm font-bold text-brand-orange hover:text-orange-600 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-brand-orange hover:bg-orange-600 text-white text-base font-bold rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-95 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegistering ? 'Criar Conta' : 'Entrar na Plataforma'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          <p className="mt-8 text-center text-sm text-slate-600 font-medium">
            {isRegistering ? 'Já tem uma conta? ' : 'Ainda não é aluno? '}
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-bold text-brand-orange hover:text-orange-600 transition-colors"
            >
              {isRegistering ? 'Faça login aqui' : 'Crie sua conta'}
            </button>
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Imagem de Fundo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop"
            alt="Estudantes focados"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>
      </div>

    </div>
  );
}