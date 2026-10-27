import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Mail, Lock, User, Gift, GraduationCap, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo-ari.jpeg';
import AceiteTermos, { MSG_ACEITE } from '../components/AceiteTermos';
import { TERMOS_VERSAO } from '../config/responsavel';

// /convite/:id — página do link que o admin gera em Gestão de Alunos → Convidar Aluno.
// O banco confere tudo (ver_convite / aceitar_convite): o convite vale uma vez,
// só para o e-mail convidado, e dentro do prazo.

const AVISOS = {
  usado: { titulo: 'Este convite já foi usado', texto: 'Se a conta é sua, é só entrar com seu e-mail e senha.' },
  expirado: { titulo: 'Este convite venceu', texto: 'Peça um novo convite ao professor.' },
  inexistente: { titulo: 'Convite não encontrado', texto: 'Confira se o link foi copiado inteiro ou peça um novo ao professor.' },
};

const campo =
  'w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange disabled:opacity-70';

export default function Convite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signUp, signIn, recarregarPerfil } = useAuth();

  const [convite, setConvite] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modo, setModo] = useState('cadastro'); // 'cadastro' | 'login'
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let ativo = true;
    supabase.rpc('ver_convite', { p_id: id }).then(({ data, error }) => {
      if (!ativo) return;
      const c = error ? { situacao: 'inexistente' } : data;
      setConvite(c);
      setNome(c?.nome || '');
      setCarregando(false);
    });
    return () => { ativo = false; };
  }, [id]);

  const aceitar = async () => {
    const { error } = await supabase.rpc('aceitar_convite', { p_id: id });
    if (error) throw new Error(error.message);
    await recarregarPerfil?.();
    navigate(convite.cortesia ? '/dashboard' : '/pagamento', { replace: true });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      if (modo === 'cadastro') {
        const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
        if (nomeLimpo.length < 2) throw new Error('Informe seu nome.');
        if (!aceitouTermos) throw new Error(MSG_ACEITE);
        const { data, error } = await signUp({ email: convite.email, password: senha, nome: nomeLimpo, turmaSlug: convite.turma_slug, termosVersao: TERMOS_VERSAO });
        if (error) {
          if (/already registered/i.test(error.message)) {
            setModo('login');
            throw new Error('Você já tem conta com este e-mail. Entre com sua senha para usar o convite.');
          }
          throw error;
        }
        if (!data?.session) {
          // Projeto com confirmação de e-mail: o convite é aplicado no primeiro login.
          setModo('login');
          setAviso('Enviamos um e-mail de confirmação. Confirme e depois entre aqui, por este mesmo link.');
          return;
        }
      } else {
        const { error } = await signIn({ email: convite.email, password: senha });
        if (error) throw new Error(/invalid login/i.test(error.message) ? 'Senha incorreta.' : error.message);
      }
      await aceitar();
    } catch (err) {
      setErro(err.message || 'Não foi possível concluir. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <img src={logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
          <span className="font-black tracking-wide">
            Arimática <span className="text-brand-orange">GABARITANDO</span>
          </span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-10">
              <Loader2 className="w-5 h-5 animate-spin" /> Abrindo convite…
            </div>
          ) : convite.situacao !== 'valido' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-brand-orange flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-black">{AVISOS[convite.situacao]?.titulo || AVISOS.inexistente.titulo}</h1>
              <p className="text-sm text-slate-400">{AVISOS[convite.situacao]?.texto || AVISOS.inexistente.texto}</p>
              <Link to="/login" className="inline-flex px-5 py-3 bg-brand-orange hover:bg-orange-600 rounded-xl text-sm font-bold">
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Você foi convidado</p>
              <h1 className="text-2xl font-black mt-1">Olá, {(convite.nome || 'aluno').split(' ')[0]}!</h1>
              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <GraduationCap className="w-4 h-4 text-brand-orange shrink-0" /> Turma: <strong className="text-white">{convite.turma || '—'}</strong>
                </p>
                {convite.cortesia ? (
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                    <Gift className="w-4 h-4 shrink-0" /> Com acesso liberado pelo professor
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">Depois do cadastro, você escolhe seu plano.</p>
                )}
              </div>

              <form onSubmit={enviar} className="mt-6 space-y-3">
                {modo === 'cadastro' && (
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className={campo} required />
                  </div>
                )}
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="email" value={convite.email} readOnly disabled className={campo} title="O convite vale só para este e-mail" />
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={modo === 'cadastro' ? 'Crie uma senha (mín. 6 caracteres)' : 'Sua senha'}
                    autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
                    className={campo}
                    required
                  />
                </div>

                {modo === 'cadastro' && <AceiteTermos marcado={aceitouTermos} onChange={setAceitouTermos} escuro />}

                {erro && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{erro}</p>}
                {aviso && <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">{aviso}</p>}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 disabled:opacity-60 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modo === 'cadastro' ? 'Criar minha conta' : 'Entrar e usar o convite'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setModo(modo === 'cadastro' ? 'login' : 'cadastro'); setErro(''); setAviso(''); }}
                className="w-full mt-4 text-sm text-slate-400 hover:text-white cursor-pointer"
              >
                {modo === 'cadastro' ? 'Já tenho conta com este e-mail' : 'Ainda não tenho conta'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
