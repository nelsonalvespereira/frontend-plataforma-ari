import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import Login from './pages/Login';
import Pagamento from './pages/Pagamento';
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
          <Route path="/pagamento" element={<Pagamento />} />

          {/* Rotas do aluno — exigem login */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/simulados" element={<ProtectedRoute><Simulados /></ProtectedRoute>} />
          <Route path="/simulado-personalizado" element={<ProtectedRoute><SimuladoPersonalizado /></ProtectedRoute>} /> {/* 👈 Rota adicionada */}
          <Route path="/lives" element={<ProtectedRoute><Lives /></ProtectedRoute>} />
          <Route path="/player" element={<ProtectedRoute><PlayerAulas /></ProtectedRoute>} />
          <Route path="/banco-questoes" element={<ProtectedRoute><BancoQuestoes /></ProtectedRoute>} />
          <Route path="/desempenho" element={<ProtectedRoute><Desempenho /></ProtectedRoute>} />
          <Route path="/plano-estudos" element={<ProtectedRoute><PlanoEstudos /></ProtectedRoute>} />
          <Route path="/live/:id" element={<ProtectedRoute><PlayerLive /></ProtectedRoute>} />
          <Route path="/assuntos-enem" element={<ProtectedRoute><AssuntosEnem /></ProtectedRoute>} />
          <Route path="/caderno-erros" element={<ProtectedRoute><CadernoErros /></ProtectedRoute>} />
          <Route path="/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;