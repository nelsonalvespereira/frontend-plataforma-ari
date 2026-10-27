import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '../assets/logo-ari.jpeg';
import { NOME_PLATAFORMA, RESPONSAVEL, TERMOS_VERSAO } from '../config/responsavel';

// Moldura das páginas /termos e /privacidade: topo, índice e seções numeradas.
// secoes = [{ id, titulo, conteudo: <JSX> }]

export function dataVersao() {
  const [a, m, d] = TERMOS_VERSAO.split('-');
  return `${d}/${m}/${a}`;
}

// "José ..., CPF ..., com endereço em ..." — só com os campos preenchidos.
export function identificacaoResponsavel() {
  return [RESPONSAVEL.nome, RESPONSAVEL.documento, RESPONSAVEL.endereco && `com endereço em ${RESPONSAVEL.endereco}`]
    .filter(Boolean)
    .join(', ');
}

export function EmailContato() {
  return (
    <a href={`mailto:${RESPONSAVEL.email}`} className="font-semibold text-brand-orange hover:underline break-all">
      {RESPONSAVEL.email}
    </a>
  );
}

export default function DocumentoLegal({ titulo, resumo, secoes, outro }) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-700 font-sans">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img src={logo} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
            <span className="font-black text-slate-900 truncate">{NOME_PLATAFORMA}</span>
          </Link>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))}
            className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Versão de {dataVersao()}</p>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">{titulo}</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">{resumo}</p>

        <nav aria-label="Índice" className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nesta página</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {secoes.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-slate-600 hover:text-brand-orange">
                  {i + 1}. {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-8">
          {secoes.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-lg md:text-xl font-black text-slate-900">
                {i + 1}. {s.titulo}
              </h2>
              <div className="mt-2 space-y-3 leading-relaxed text-[15px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-slate-900">
                {s.conteudo}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500 flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span>Dúvidas? <EmailContato /></span>
          <Link to={outro.to} className="font-semibold text-slate-700 hover:text-brand-orange">
            {outro.rotulo} →
          </Link>
        </div>
      </main>
    </div>
  );
}
