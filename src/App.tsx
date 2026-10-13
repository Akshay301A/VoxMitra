import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AgentListPage } from './pages/AgentListPage.tsx';
import { CreateAgentWizard } from './pages/CreateAgentWizard.tsx';
import { AgentConfigEditor } from './pages/AgentConfigEditor.tsx';
import { VoiceSettingsPage } from './pages/VoiceSettingsPage.tsx';
import { AgentTestingPage } from './pages/AgentTestingPage.tsx';
import { CallHistoryPage } from './pages/CallHistoryPage.tsx';
import { IntegrationsPage } from './pages/IntegrationsPage.tsx';
import { BillingPage } from './pages/BillingPage.tsx';
import { WalletPage } from './pages/WalletPage.tsx';
import { AccountSettingsPage } from './pages/AccountSettingsPage.tsx';

function MainRouter() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [pageParams, setPageParams] = useState<any>({});

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    setPageParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <span>Loading VoxMitra Platform...</span>
        </div>
      </div>
    );
  }

  // Public Marketing Landing Page
  if (currentPage === 'landing') {
    return (
      <LandingPage
        onNavigate={handleNavigate}
        isAuthenticated={!!user}
      />
    );
  }

  // Authentication Pages
  if (currentPage === 'login' || currentPage === 'register') {
    return (
      <AuthPage
        initialMode={currentPage === 'register' ? 'register' : 'login'}
        onSuccess={() => handleNavigate('dashboard')}
        onBack={() => handleNavigate('landing')}
      />
    );
  }

  // Authenticated App Shell Pages
  const breadcrumbMap: Record<string, string[]> = {
    dashboard: ['Dashboard'],
    agents: ['AI Employees'],
    'create-agent': ['AI Employees', 'New Agent Wizard'],
    'agent-editor': ['AI Employees', 'Configuration Editor'],
    testing: ['Testing Sandbox'],
    calls: ['Call Records & Analytics'],
    'voice-settings': ['Voice & Language Settings'],
    integrations: ['Integrations'],
    wallet: ['Prepaid Wallet & Credits'],
    billing: ['Usage & Tariffs'],
    settings: ['Account & Settings'],
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      breadcrumbs={breadcrumbMap[currentPage] || ['Console']}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage onNavigate={handleNavigate} />
      )}

      {currentPage === 'agents' && (
        <AgentListPage onNavigate={handleNavigate} />
      )}

      {currentPage === 'create-agent' && (
        <CreateAgentWizard
          onSuccess={(newAgentId) => handleNavigate('agent-editor', { agentId: newAgentId })}
          onCancel={() => handleNavigate('agents')}
        />
      )}

      {currentPage === 'agent-editor' && (
        <AgentConfigEditor
          agentId={pageParams.agentId || 'ag019800-0000-4000-8000-000000000001'}
          onBack={() => handleNavigate('agents')}
          onTest={(agentId) => handleNavigate('testing', { agentId })}
        />
      )}

      {currentPage === 'testing' && (
        <AgentTestingPage
          initialAgentId={pageParams.agentId}
          onNavigate={handleNavigate}
        />
      )}

      {currentPage === 'calls' && (
        <CallHistoryPage
          initialCallId={pageParams.selectedCallId}
          onNavigate={handleNavigate}
        />
      )}

      {currentPage === 'voice-settings' && <VoiceSettingsPage />}

      {currentPage === 'integrations' && <IntegrationsPage />}

      {currentPage === 'wallet' && (
        <WalletPage onNavigate={handleNavigate} />
      )}

      {currentPage === 'billing' && <BillingPage onNavigate={handleNavigate} />}

      {currentPage === 'settings' && <AccountSettingsPage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
