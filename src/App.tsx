import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/views/DashboardView';
import { CRMView } from './components/views/CRMView';
import { MarketMiningView } from './components/views/MarketMiningView';
import { DSSEngineView } from './components/views/DSSEngineView';
import { ReportsView } from './components/views/ReportsView';
import { SQLExplorerView } from './components/views/SQLExplorerView';
import { Enterprise360Modal } from './components/modals/Enterprise360Modal';
import { AICopilotDrawer } from './components/modals/AICopilotDrawer';
import { LoginModal } from './components/modals/LoginModal';
import { ToastProvider } from './components/ui/UIPrimitives';
import { EnterpriseItem, UserSession } from './types';

function AppShell() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Crisp Executive Light Mode by default (MASTER.md), with persisted Dark Mode toggle
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('dss_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [user, setUser] = useState<UserSession | null>({
    maNV: 'ADMIN',
    hoTen: 'Ban Giám Đốc (CCO)',
    email: 'cco@recruitinsight.vn',
    phongBan: 'Executive',
    vaiTro: 'Executive',
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [copilotState, setCopilotState] = useState<{ open: boolean; tab: 'chat' | 'settings' }>({
    open: false,
    tab: 'chat',
  });
  const [selectedMaDN360, setSelectedMaDN360] = useState<string | null>(null);

  // Global synchronization counter & quick-lookup cache
  const [refreshKey, setRefreshKey] = useState(0);
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [marketCount, setMarketCount] = useState(21827);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dss_theme', theme);
  }, [theme]);

  const syncGlobalSummary = useCallback(async () => {
    try {
      const [entRes, mktRes] = await Promise.all([
        fetch('/api/enterprises').then((r) => r.json()),
        fetch('/api/market/status').then((r) => r.json()),
      ]);
      if (Array.isArray(entRes)) setEnterprises(entRes);
      if (mktRes?.totalPostings) setMarketCount(mktRes.totalPostings);
    } catch {
      // ignore initial boot race
    }
  }, []);

  useEffect(() => {
    syncGlobalSummary();
  }, [syncGlobalSummary, refreshKey]);

  const triggerGlobalRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-background)] text-[var(--color-foreground)]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={() => setUser(null)}
        onOpenCopilot={() => setCopilotState({ open: true, tab: 'chat' })}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        marketCount={marketCount}
        enterpriseCount={enterprises.length}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenCopilot={(tab = 'chat') => setCopilotState({ open: true, tab })}
          onSelectEnterprise360={(maDN) => setSelectedMaDN360(maDN)}
          onOpenLogin={() => setLoginModalOpen(true)}
          user={user}
          enterprises={enterprises}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              refreshKey={refreshKey}
              onSelectEnterprise360={(maDN) => setSelectedMaDN360(maDN)}
              onNavigateTab={(t) => setActiveTab(t)}
              onOpenCopilot={() => setCopilotState({ open: true, tab: 'chat' })}
            />
          )}

          {activeTab === 'crm' && (
            <CRMView
              user={user}
              refreshKey={refreshKey}
              onDataMutated={triggerGlobalRefresh}
              onSelectEnterprise360={(maDN) => setSelectedMaDN360(maDN)}
            />
          )}

          {activeTab === 'market' && (
            <MarketMiningView
              user={user}
              onLeadConverted={triggerGlobalRefresh}
              onSelectEnterprise360={(maDN) => setSelectedMaDN360(maDN)}
            />
          )}

          {activeTab === 'dss' && <DSSEngineView enterprises={enterprises} />}

          {activeTab === 'reports' && <ReportsView refreshKey={refreshKey} />}

          {activeTab === 'sql' && <SQLExplorerView />}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <Enterprise360Modal
        maDN={selectedMaDN360}
        onClose={() => setSelectedMaDN360(null)}
        user={user}
        onDataMutated={triggerGlobalRefresh}
      />

      <AICopilotDrawer
        open={copilotState.open}
        initialTab={copilotState.tab}
        onClose={() => setCopilotState((s) => ({ ...s, open: false }))}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
        currentUser={user}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

export default App;
