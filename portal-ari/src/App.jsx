import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SubscriptionRoute from './components/SubscriptionRoute';

import Login from './pages/Login';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Pagamento from './pages/Pagamento';
import PagamentoSucesso from './pages/PagamentoSucesso';
import Pack from './pages/Pack';
import LojaPacks from './pages/LojaPacks';
import Convite from './pages/Convite';
import Termos from './pages/Termos';
import Privacidade from './pages/Privacidade';
import PackExpirado from './pages/PackExpirado';
import Dashboard from './pages/Dashboard';
import Simulados from './pages/Simulados';
import SimuladoPersonalizado from './pages/SimuladoPersonalizado'; 
import Lives from './pages/Lives';
import PlayerAulas from './pages/PlayerAulas';
import PlayerLive from './pages/LivePlayer';
import Home from './pages/Home';

// Componentes Administrativos
import AdminDashboard from './Admin/AdminDashboard';
import AdminConfiguracoes from './Admin/AdminConfiguracoes';
import AdminAlunos from './Admin/AdminAlunos';
import AdminSimuladosQuestoes from './Admin/AdminSimuladosQuestoes';
import AdminEditarQuestao from './Admin/AdminEditarQuestao';
import AdminAulasLives from './Admin/AdminAulasLives';
import AdminLiveController from './Admin/AdminLiveController';
import AdminModulos from './Admin/AdminModulos';
import AdminNovaQuestao from './pages/AdminNovaQuestao';
import AdminNovoSimulado from './Admin/AdminNovoSimulado';
import AdminAssuntos from './Admin/AdminAssuntos';
import AdminCronograma from './Admin/AdminCronograma';
import AdminPack from './Admin/AdminPack';

// Componentes do Aluno
import BancoQuestoes from './pages/BancoQuestoes';
import Desempenho from './pages/Desempenho';
import PlanoEstudos from './pages/PlanoEstudos';
import AssuntosEnem from './pages/AssuntosEnem';
import CadernoErros from './pages/Cadernoerros';
import Favoritos from './pages/Favoritos';
import Ranking from './pages/Ranking';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/convite/:id" element={<Convite />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/pagamento" element={<Pagamento />} />
          <Route path="/pagamento/sucesso" element={<ProtectedRoute><PagamentoSucesso /></ProtectedRoute>} />

          {/* Packs avulsos: a loja e cada pack exigem só login; o conteúdo é liberado
              por pack (RLS confere a compra e o prazo no banco) */}
          <Route path="/packs" element={<ProtectedRoute><LojaPacks /></ProtectedRoute>} />
          <Route path="/pack" element={<Navigate to="/packs" replace />} />
          <Route path="/pack/expirado" element={<PackExpirado />} />
          <Route path="/pack/:priceId" element={<ProtectedRoute><Pack /></ProtectedRoute>} />

          {/* Rotas do aluno — exigem login */}
          <Route path="/dashboard" element={<SubscriptionRoute><Dashboard /></SubscriptionRoute>} />
          <Route path="/simulados" element={<SubscriptionRoute><Simulados /></SubscriptionRoute>} />
          <Route path="/simulado-personalizado" element={<SubscriptionRoute><SimuladoPersonalizado /></SubscriptionRoute>} /> {/* 👈 Rota adicionada */}
          <Route path="/lives" element={<SubscriptionRoute><Lives /></SubscriptionRoute>} />
          <Route path="/player" element={<SubscriptionRoute><PlayerAulas /></SubscriptionRoute>} />
          <Route path="/banco-questoes" element={<SubscriptionRoute><BancoQuestoes /></SubscriptionRoute>} />
          <Route path="/desempenho" element={<SubscriptionRoute><Desempenho /></SubscriptionRoute>} />
          <Route path="/plano-estudos" element={<SubscriptionRoute><PlanoEstudos /></SubscriptionRoute>} />
          <Route path="/live/:id" element={<SubscriptionRoute><PlayerLive /></SubscriptionRoute>} />
          <Route path="/assuntos-enem" element={<SubscriptionRoute><AssuntosEnem /></SubscriptionRoute>} />
          <Route path="/caderno-erros" element={<SubscriptionRoute><CadernoErros /></SubscriptionRoute>} />
          <Route path="/favoritos" element={<SubscriptionRoute><Favoritos /></SubscriptionRoute>} />
          <Route path="/ranking" element={<SubscriptionRoute><Ranking /></SubscriptionRoute>} />

          {/* Rotas do admin — exigem login E is_admin = true */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/configuracoes" element={<AdminRoute><AdminConfiguracoes /></AdminRoute>} />
          <Route path="/admin/alunos" element={<AdminRoute><AdminAlunos /></AdminRoute>} />
          <Route path="/admin/simulados-questoes" element={<AdminRoute><AdminSimuladosQuestoes /></AdminRoute>} />
          <Route path="/admin/aulas-lives" element={<AdminRoute><AdminAulasLives /></AdminRoute>} />
          <Route path="/admin/modulos" element={<AdminRoute><AdminModulos /></AdminRoute>} />
          <Route path="/admin/live-control/:id" element={<AdminRoute><AdminLiveController /></AdminRoute>} />

          {/* Rotas de Criação e Gestão de Questões (Com suporte a ID para edição) */}
          <Route path="/admin/questao" element={<AdminRoute><AdminNovaQuestao /></AdminRoute>} />
          <Route path="/admin/questao/:id" element={<AdminRoute><AdminNovaQuestao /></AdminRoute>} />
          <Route path="/admin/nova-questao" element={<AdminRoute><AdminNovaQuestao /></AdminRoute>} />
          <Route path="/admin/editar-questao/:id" element={<AdminRoute><AdminEditarQuestao /></AdminRoute>} />
          <Route path="/admin/novo-simulado" element={<AdminRoute><AdminNovoSimulado /></AdminRoute>} />
          <Route path="/admin/assuntos" element={<AdminRoute><AdminAssuntos /></AdminRoute>} />
          <Route path="/admin/cronograma" element={<AdminRoute><AdminCronograma /></AdminRoute>} />
          <Route path="/admin/pack" element={<AdminRoute><AdminPack /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;