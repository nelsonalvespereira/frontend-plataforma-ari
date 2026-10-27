import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo-ari.jpeg';
import { useAuth } from '../hooks/useAuth';

// Página 404: endereço que não existe no portal.
export default function NaoEncontrada() {
  const { user } = useAuth();
  const destino = user ? { to: '/dashboard', texto: 'Ir para o meu painel' } : { to: '/', texto: 'Ir para o início' };

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <img src={logo} alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto shadow-lg" />
        <p className="mt-8 text-7xl font-black tracking-tight text-slate-900">
          4<span className="text-brand-orange">0</span>4
        </p>
        <h1 className="mt-3 text-xl font-black text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          O endereço pode ter mudado ou o link estar incompleto. Confira o link ou volte para o portal.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            to={destino.to}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold"
          >
            <Compass className="w-4 h-4" /> {destino.texto}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
