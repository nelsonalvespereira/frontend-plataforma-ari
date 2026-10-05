import React from 'react';
import { ArrowLeft, Trophy, Zap, Flame, Target, TrendingUp, Medal, Loader2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGamificacao, useRanking } from '../hooks/useGamificacao';
import { useDesempenho } from '../hooks/useDesempenho';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';

const CORES_BARRA = ['bg-brand-orange', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500'];

export default function Desempenho() {
  const { profile } = useAuth();
  const { xp, streak, loading: loadingGami } = useGamificacao();
  const { ranking, loading: loadingRanking } = useRanking({ limite: 10 });
  const { porAssunto, loading: loadingDesempenho } = useDesempenho();

  const desempenhoMaterias = porAssunto.map((item, index) => ({
    nome: item.assunto,
    acertos: item.acertos,
    totalRespondidas: item.total,
    cor: CORES_BARRA[index % CORES_BARRA.length],
  }));

  const nivelAtual = Math.floor((xp || 0) / 500) + 1;
  const xpProximoNivel = nivelAtual * 500;
  const progressoNivel = (((xp || 0) % 500) / 500) * 100;

  if (loadingGami || loadingRanking || loadingDesempenho || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          
          {/* HEADER */}
          <div className="flex items-center gap-4 mb-2">
            <Link to="/dashboard" className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-brand-orange" />
                Meu Desempenho
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Acompanhe sua evolução e taxa de acertos real na plataforma.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LADO ESQUERDO: ESTATÍSTICAS E GRÁFICOS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CARDS DE TOPO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card Nível */}
                <div className="bg-slate-950 p-6 rounded-3xl text-white relative overflow-hidden shadow-xl">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-orange rounded-full opacity-20 blur-2xl"></div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/10 rounded-xl"><Trophy className="w-5 h-5 text-brand-orange" /></div>
                    <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">Nível Atual</span>
                  </div>
                  <h3 className="text-4xl font-black mb-1">{nivelAtual}</h3>
                  <p className="text-xs font-medium text-slate-400">Concurseiro Dedicado</p>
                  
                  <div className="mt-5">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-brand-orange">{xp || 0} XP</span>
                      <span className="text-slate-400">Meta: {xpProximoNivel} XP</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-orange rounded-full transition-all duration-1000" style={{ width: `${progressoNivel}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Card Streak */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-3">
                    <Flame className="w-7 h-7 text-brand-orange" />
                  </div>
                  <span className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-1">Ofensiva</span>
                  <h3 className="text-3xl font-black text-slate-900">{streak || 1} <span className="text-lg text-slate-500">dias</span></h3>
                </div>

                {/* Card XP Total */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
                    <Zap className="w-7 h-7 text-amber-500" />
                  </div>
                  <span className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-1">XP Total</span>
                  <h3 className="text-3xl font-black text-slate-900">{xp || 0}</h3>
                </div>

              </div>

              {/* GRÁFICO DE BARRAS: DESEMPENHO REAL POR MATÉRIA */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-6 h-6 text-brand-orange" />
                  <h2 className="text-lg font-black text-slate-900">Taxa de Acertos por Matéria</h2>
                </div>

                {desempenhoMaterias.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 text-sm mb-1">Nenhum dado de questão encontrado</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">Resolva questões no Banco de Questões para gerar suas estatísticas reais de acertos aqui.</p>
                    <Link to="/banco-questoes" className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-orange text-white font-bold text-xs rounded-xl shadow-md hover:bg-orange-600 transition-colors">
                      Ir para o Banco de Questões
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {desempenhoMaterias.map((materia, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-slate-700">{materia.nome} <span className="text-xs font-normal text-slate-400">({materia.totalRespondidas} resolvidas)</span></span>
                          <span className="text-slate-900">{materia.acertos}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${materia.cor} transition-all duration-1000`} 
                            style={{ width: `${materia.acertos}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* LADO DIREITO: RANKING DA TURMA */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
                <Medal className="w-6 h-6 text-brand-orange" />
                <div>
                  <h2 className="font-black text-slate-900">Ranking da Turma</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top 10 Alunos</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {ranking.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 font-medium text-sm">
                    Nenhum aluno com XP ainda.
                  </div>
                ) : (
                  ranking.map((aluno, idx) => {
                    const isEu = aluno.id === profile.id;
                    let corPosicao = "bg-slate-100 text-slate-500";
                    if (idx === 0) corPosicao = "bg-amber-100 text-amber-600 border border-amber-200";
                    if (idx === 1) corPosicao = "bg-slate-200 text-slate-600 border border-slate-300";
                    if (idx === 2) corPosicao = "bg-orange-100 text-orange-700 border border-orange-200";

                    return (
                      <div 
                        key={aluno.id} 
                        className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${isEu ? 'bg-orange-50 border border-orange-100' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${corPosicao}`}>
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className={`font-bold truncate text-sm ${isEu ? 'text-brand-orange' : 'text-slate-700'}`}>
                            {aluno.nome?.split(' ')[0] || 'Aluno'} {isEu && '(Você)'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-bold text-xs text-slate-700">{aluno.xp || 0}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}