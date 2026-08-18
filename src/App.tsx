import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { KanbanView } from './components/KanbanView';
import { AtendimentosListView } from './components/AtendimentosListView';
import { NovoAtendimentoView } from './components/NovoAtendimentoView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { WhatsAppBotView } from './components/WhatsAppBotView';
import { AtendimentoDetailModal } from './components/AtendimentoDetailModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { ToastContainer } from './components/ToastContainer';
import { LayoutDashboard, Kanban, FileText, PlusCircle, Settings, Bot } from 'lucide-react';

const MobileBottomNav: React.FC = () => {
  const { activeView, setActiveView, atendimentos, empresa, conversas } = useApp();
  const activeCount = atendimentos.filter((a) => a.status !== 'ConcluÃ­do').length;

  const tabs = [
    { id: 'dashboard' as const, label: 'InÃ­cio', icon: LayoutDashboard },
    { id: 'kanban' as const, label: 'Quadro', icon: Kanban, badge: activeCount },
    { id: 'novo' as const, label: 'Novo', icon: PlusCircle, isCenter: true },
    { id: 'bot' as const, label: 'RobÃ´ IA', icon: Bot, badge: conversas.length },
    { id: 'atendimentos' as const, label: 'Clientes', icon: FileText, badge: atendimentos.length },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800/90 px-3 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 active:scale-95 transition-all font-bold"
                >
                  <Icon className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <span className="text-[10px] font-bold text-amber-400 mt-1">Novo Pedido</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative min-w-[56px] cursor-pointer ${
                isActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] text-amber-400' : 'stroke-2'}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-extrabold px-1 rounded-full bg-zinc-800 text-amber-300 border border-zinc-700 min-w-[14px] text-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeView } = useApp();

  return (
    <main className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4 sm:pt-6 pb-24 md:pb-10 transition-all duration-200">
      {activeView === 'dashboard' && <DashboardView />}
      {activeView === 'kanban' && <KanbanView />}
      {activeView === 'atendimentos' && <AtendimentosListView />}
      {activeView === 'novo' && <NovoAtendimentoView />}
      {activeView === 'bot' && <WhatsAppBotView />}
      {activeView === 'config' && <ConfiguracoesView />}

      {/* Modais Globais */}
      <AtendimentoDetailModal />
      <WhatsAppModal />
      <ToastContainer />
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-400 selection:text-zinc-950 antialiased">
        <Header />
        <div className="flex-1">
          <MainContent />
        </div>
        <MobileBottomNav />
      </div>
    </AppProvider>
  );
}

