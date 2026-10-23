import React, { useCallback, useEffect, useState } from 'react';
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
import { OnboardingWizard } from './components/onboarding/OnboardingWizard.tsx';
import type { OnboardingData } from './types.ts';
import { api } from './api/client.ts';

function MainRouter() {
  const { user, loading, refreshMe } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [pageParams, setPageParams] = useState<any>({});
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [tourOpen, setTourOpen] = useState(false);

  const handleNavigate = useCallback((page: string, params?: any) => {
    setCurrentPage(page);
    setPageParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!user) {
      setOnboarding(null);
      setOnboardingOpen(false);
      setTourOpen(false);
      setOnboardingError('');
      return;
    }
    let active = true;
    setOnboardingLoading(true);
    setOnboardingError('');
    void api.getOnboarding()
      .then((data) => {
        if (!active) return;
        setOnboarding(data);
        if (data.status === 'not_started' || data.status === 'in_progress') {
          setCurrentPage('dashboard');
          setOnboardingOpen(true);
        } else if (data.status === 'completed' && !data.tourCompleted) {
          setCurrentPage('dashboard');
          setTourOpen(true);
        }
      })
      .catch((error) => {
        console.error('Could not load workspace onboarding state:', error);
        if (active) setOnboardingError(error instanceof Error ? error.message : 'Onboarding status is unavailable.');
      })
      .finally(() => {
        if (active) setOnboardingLoading(false);
      });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!loading && user && currentPage === 'landing') setCurrentPage('dashboard');
  }, [currentPage, loading, user]);

  const saveOnboarding = useCallback(async (patch: Partial<OnboardingData>) => {
    const updated = await api.saveOnboarding(patch);
    setOnboarding(updated);
  }, []);

  const finishOnboarding = async (data: OnboardingData) => {
    if (data.businessName !== onboarding?.businessName || data.timezone !== onboarding?.timezone) {
      await api.updateBusiness({ name: data.businessName, timezone: data.timezone });
      await refreshMe();
    }
    setOnboarding(data);
    setOnboardingOpen(false);
    setCurrentPage('dashboard');
    if (!data.tourCompleted) setTourOpen(true);
  };

  const skipOnboarding = async () => {
    const updated = await api.saveOnboarding({
      status: 'skipped',
      completed: true,
      step: onboarding?.step || 0,
      tourCompleted: true,
      pendingAgentStart: false,
    });
    setOnboarding(updated);
    setOnboardingOpen(false);
    setCurrentPage('dashboard');
  };

  const finishTour = () => {
    const shouldStartAgent = onboarding?.pendingAgentStart;
    const updated = onboarding ? { ...onboarding, tourCompleted: true, pendingAgentStart: false, tourStep: 8 } : null;
    if (updated) setOnboarding(updated);
    setTourOpen(false);
    if (shouldStartAgent && updated) {
      handleNavigate('create-agent', { onboardingPrefill: updated });
    } else handleNavigate('dashboard');
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
    <>
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      breadcrumbs={breadcrumbMap[currentPage] || ['Console']}
      tourOpen={tourOpen}
      tourStartStep={onboarding?.tourCompleted ? 0 : onboarding?.tourStep || 0}
      onTourOpen={() => setTourOpen(true)}
      onTourFinish={finishTour}
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
          onTest={(agentId) => handleNavigate('testing', { agentId })}
          initialBusiness={pageParams.onboardingPrefill}
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
      {onboardingError && (
        <div role="alert" className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
          <p className="font-semibold">Setup status could not be loaded</p>
          <p className="mt-1 text-xs">{onboardingError}. You can still use the dashboard; refresh and sign in again to retry.</p>
        </div>
      )}
    </AppLayout>
    {onboardingOpen && onboarding && !onboardingLoading && (
      <OnboardingWizard
        initialData={onboarding}
        onSave={saveOnboarding}
        onComplete={finishOnboarding}
        onSkip={skipOnboarding}
      />
    )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
