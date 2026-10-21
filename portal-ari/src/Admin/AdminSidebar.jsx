import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileQuestion, Video, Calendar, Settings, FolderTree, Package } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/admin/alunos', label: 'Gestão de Alunos', icon: Users },
  { to: '/admin/simulados-questoes', label: 'Simulados e Questões', icon: FileQuestion },
  { to: '/admin/assuntos', label: 'Gerenciar Assuntos', icon: FolderTree },
  { to: '/admin/modulos', label: 'Módulos e Aulas', icon: Video },
  { to: '/admin/aulas-lives', label: 'Aulas e Lives', icon: Video },
  { to: '/admin/cronograma', label: 'Plano de Estudos', icon: Calendar },
  { to: '/admin/pack', label: 'Pack Avulso', icon: Package },
];

const navLinkClass = ({ isActive }) =>
  `flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
    isActive
      ? 'bg-brand-orange text-white'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`;

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-[#1e2330] flex-col hidden lg:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <span className="text-lg font-black text-white tracking-tight">
          Admin<span className="text-brand-orange">Ari</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass}>
            <Icon className="w-4.5 h-4.5 mr-3 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700/50">
        <NavLink to="/admin/configuracoes" className={navLinkClass}>
          <Settings className="w-4.5 h-4.5 mr-3 shrink-0" /> Configurações
        </NavLink>
      </div>
    </aside>
  );
}