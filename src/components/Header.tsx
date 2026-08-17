import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Kanban,
  FileText,
  PlusCircle,
  Settings,
  Search,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { activeView, setActiveView, empresa, atendimentos, searchTerm, setSearchTerm } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeOrdersCount = atendimentos.filter((a) => a.status !== 'Concluído').length;

  const navItems = [
    { id: 'dashboard' as const, label: 'Início', icon: LayoutDashboard },
    { id: 'kanban' as const, label: 'Quadro de Pedidos', icon: Kanban, badge: activeOrdersCount },
    { id: 'atendimentos' as const, label: 'Lista de Clientes', icon: FileText, badge: atendimentos.length },
    { id: 'config' as const, label: 'Ajustes', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 border-b border-zinc-800/90 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Nome da Empresa */}
          <div
            className="flex items-center gap-3 cursor-pointer group shrink-0"
            onClick={() => setActiveView('dashboard')}
          >
            {empresa.logo ? (
              <img
                src={empresa.logo}
                alt={empresa.nome}
                className="w-10 h-10 rounded-xl object-contain bg-zinc-800 border border-zinc-700 p-0.5"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-950 bg-amber-400 font-black text-base shadow-sm shadow-amber-400/20"
              >
                {empresa.nome ? empresa.nome.substring(0, 2).toUpperCase() : 'MP'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-extrabold text-base tracking-tight text-amber-400 leading-tight group-hover:text-amber-300 transition-colors truncate max-w-[180px] sm:max-w-xs flex items-center gap-1.5">
                <span>{empresa.nome || 'Marmoraria Fácil'}</span>
              </div>
              <div className="text-xs text-zinc-400 truncate max-w-[160px] sm:max-w-xs font-normal">
                {empresa.slogan || 'Sistema de Atendimento & Orçamentos'}
              </div>
            </div>
          </div>

          {/* Barra de Busca Simples */}
          <div className="hidden lg:flex items-center flex-1 max-w-sm mx-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cliente, telefone ou pedra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-800/80 hover:bg-zinc-800 focus:bg-zinc-900 border border-zinc-700/80 focus:border-amber-400 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-amber-400 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Navegação Desktop Clara & Limpa */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Botão Novo Atendimento em Destaque */}
            <button
              onClick={() => setActiveView('novo')}
              className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 shadow-md shadow-amber-400/20 hover:shadow-amber-400/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
              <span>+ Novo Pedido</span>
            </button>
          </nav>

          {/* Controles Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setActiveView('novo')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-950 bg-amber-400 hover:bg-amber-300 font-extrabold text-xs shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
              <span>Novo</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 cursor-pointer"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menu Gaveta Mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-800 space-y-1.5">
            <div className="px-1 mb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente ou pedra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive ? 'bg-zinc-800 text-amber-400 border border-zinc-700' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-zinc-800 text-zinc-400'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
