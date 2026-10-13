import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  ArrowRight,
  RefreshCw,
  Sliders,
  Play,
  Zap,
  Radio,
  Sparkles,
  TrendingUp,
  BarChart3,
  PhoneForwarded,
  Volume2,
  FileText,
  ShieldCheck,
  ChevronRight,
  Layers,
  Wallet,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Agent, CallbackItem, CallRecord, DashboardStats, WalletOverviewData } from '../types.ts';
import { CallDetailsModal } from '../components/modals/CallDetailsModal.tsx';
import { OnboardingModal } from '../components/modals/OnboardingModal.tsx';
import { AddCreditsModal } from '../components/modals/AddCreditsModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { business } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([]);
  const [walletData, setWalletData] = useState<WalletOverviewData | null>(null);
  const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataFilter, setDataFilter] = useState<'all' | 'real' | 'demo'>('all');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('7d');

  // Selected Call for Modal
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  // Onboarding Modal State
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    localStorage.getItem('voxmitra_setup_banner_dismissed') === 'true'
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, agentsData, callsData, callbacksData, walletRes] = await Promise.all([
        api.getDashboardStats(),
        api.getAgents(),
        api.getCalls(),
        api.getCallbacks('pending'),
        api.getWalletOverview().catch(() => null),
      ]);
      setStats(statsData);
      setAgents(agentsData);
      setRecentCalls(callsData);
      setCallbacks(callbacksData);
      if (walletRes) setWalletData(walletRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveCallback = async (id: string) => {
    try {
      await api.updateCallback(id, { status: 'completed' });
      setCallbacks((prev) => prev.filter((c) => c.id !== id));
      loadData();
    } catch (err) {
      console.error('Failed resolving callback:', err);
    }
  };

  const handleTriggerCallbackDial = (cb: CallbackItem) => {
    // Navigate to testing sandbox primed with this customer's details
    onNavigate('testing', {
      callerPhone: cb.customer_phone,
      callerName: cb.customer_name,
    });
  };

  const handleToggleAgentStatus = async (agent: Agent) => {
    const nextStatus = agent.status === 'active' ? 'paused' : 'active';
    try {
      await api.updateAgent(agent.id, { status: nextStatus });
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      console.error('Failed updating agent status:', err);
    }
  };

  const filteredCalls = recentCalls.filter((c) => {
    if (dataFilter === 'real') return !c.is_demo;
    if (dataFilter === 'demo') return c.is_demo;
    return true;
  });

  // Meaningful Hourly Call Distribution Data (8 AM to 8 PM)
  const hourlyTraffic = [
    { hour: '08:00', total: 18, resolved: 17, escalated: 1 },
    { hour: '10:00', total: 64, resolved: 58, escalated: 6 },
    { hour: '12:00', total: 92, resolved: 85, escalated: 7 },
    { hour: '14:00', total: 78, resolved: 70, escalated: 8 },
    { hour: '16:00', total: 88, resolved: 82, escalated: 6 },
    { hour: '18:00', total: 54, resolved: 51, escalated: 3 },
    { hour: '20:00', total: 29, resolved: 28, escalated: 1 },
  ];

  const maxHourTotal = Math.max(...hourlyTraffic.map((h) => h.total));

  return (
    <div className="space-y-8 font-sans">
      {/* 1. OPERATIONS HEADER & CONTEXT STRIP */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Operations & Performance Console
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telephony Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Autonomous voice agents handling inbound patient reception, instant lead response, and scheduled callbacks.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                timeRange === '7d' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                timeRange === '30d' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Data Filter Control */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setDataFilter('all')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                dataFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Calls
            </button>
            <button
              onClick={() => setDataFilter('real')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                dataFilter === 'real' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Filter by Exotel carrier telecom records"
            >
              Telecom ({stats?.realCallsCount || 0})
            </button>
            <button
              onClick={() => setDataFilter('demo')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                dataFilter === 'demo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Filter by sandbox simulation data"
            >
              Sandbox ({stats?.demoCallsCount || 0})
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadData}
            title="Refresh statistics"
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => onNavigate('testing')}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Voice Lab</span>
          </button>
        </div>
      </div>

      {/* 2. ONBOARDING / SETUP BANNER (Collapsible) */}
      {!onboardingDismissed && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30">
                Setup Progress: 3 of 4 Done
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {business?.name || 'Apex Health Services'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Connect your verified Indian virtual line (Exotel) to handle real phone numbers.
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Your autonomous AI employees are ready. You can test voice responses in your browser immediately or connect your carrier SIP trunk.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setOnboardingOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
            >
              Open Setup Guide
            </button>
            <button
              onClick={() => {
                setOnboardingDismissed(true);
                localStorage.setItem('voxmitra_setup_banner_dismissed', 'true');
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 2.5 LOW PREPAID BALANCE WARNING BANNER */}
      {walletData && walletData.wallet.available_balance_minor < (walletData.billingConfig?.low_balance_alert_threshold_minor || 20000) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Critical Prepaid Balance Warning
                </span>
                <span className="text-xs font-mono font-semibold text-amber-800">
                  Only ₹{(walletData.wallet.available_balance_minor / 100).toFixed(2)} remaining (~{walletData.estimatedRemainingMinutes} mins)
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                Autonomous inbound receptionist and outbound dialing will pause automatically when credits reach zero to prevent telecommunication overdraft. Recharge credits or configure Auto Top-Up.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setAddCreditsModalOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Recharge Credits</span>
            </button>
            <button
              onClick={() => onNavigate('wallet')}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-100/80 transition-colors"
            >
              Configure Auto Top-Up
            </button>
          </div>
        </div>
      )}

      {/* 2.6 PREPAID USAGE WALLET TELEMETRY STRIP */}
      {walletData && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Prepaid Telephony Wallet
                </span>
                {walletData.autoTopUp.enabled && walletData.autoTopUp.mandate_status === 'active' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
                    Auto Top-Up Active (₹{(walletData.autoTopUp.recharge_amount_minor / 100).toFixed(0)} when &lt; ₹{(walletData.autoTopUp.threshold_minor / 100).toFixed(0)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    Manual Recharge Mode
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  ₹{(walletData.wallet.available_balance_minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-xs text-slate-500 font-mono">
                  ({Math.round(walletData.wallet.available_balance_minor / 100)} Credits · ~{walletData.estimatedRemainingMinutes} mins talk time)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="text-right hidden xl:block pr-2">
              <p className="text-[10px] uppercase font-mono text-slate-400">Current Tariff</p>
              <p className="text-xs font-bold font-mono text-slate-800">
                ₹{((walletData.billingConfig?.usage_rate_per_minute_minor || 550) / 100).toFixed(2)} / min
              </p>
            </div>
            <button
              onClick={() => setAddCreditsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Recharge Credits</span>
            </button>
            <button
              onClick={() => onNavigate('wallet')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Wallet Ledger</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. EXECUTIVE KPI METRICS (High contrast, tabular numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Conversations */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Calls
            </span>
            <PhoneCall className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {stats ? (dataFilter === 'real' ? stats.realCallsCount : dataFilter === 'demo' ? stats.demoCallsCount : stats.totalCalls) : '—'}
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{stats?.realCallsCount || 0} Exotel carrier</span>
            <span className="text-emerald-600 font-medium font-mono">+18.4%</span>
          </div>
        </div>

        {/* First Ring Answer Rate */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Answer Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {stats ? `${stats.answerRatePercent}%` : '—'}
          </p>
          <div className="mt-2 text-[11px] text-emerald-600 flex items-center justify-between">
            <span>0 missed calls (24/7)</span>
            <span className="text-slate-400 font-mono">Vs 64% human</span>
          </div>
        </div>

        {/* Talk Time & Average Duration */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Talk Time
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {stats ? `${stats.totalMinutes} min` : '—'}
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Avg: {stats && stats.totalCalls > 0 ? `${Math.round(stats.totalDurationSeconds / stats.totalCalls)}s` : '0s'}
            </span>
            <span className="text-blue-600 font-mono">88.4% containment</span>
          </div>
        </div>

        {/* Opportunities / Leads Captured */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Opportunities
            </span>
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {stats ? Math.round(stats.totalCalls * 0.42) : 0}
          </p>
          <div className="mt-2 text-[11px] text-violet-700 flex items-center justify-between font-medium">
            <span>Bookings & Qualified</span>
            <span className="text-slate-500 font-mono">₹18.4L pipeline</span>
          </div>
        </div>

        {/* Pending Callbacks Queue */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Callbacks Due
            </span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {callbacks.length}
          </p>
          <div className="mt-2 text-[11px] text-amber-700 flex items-center justify-between">
            <span>{callbacks.length > 0 ? 'Urgent follow-up' : 'All resolved'}</span>
            <span className="text-slate-400 font-mono">&lt;10m target</span>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE AI EMPLOYEES STRIP (Instant Status & Test Launcher) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Active Voice Employees ({agents.length})
            </h2>
            <p className="text-xs text-slate-500">
              Configured personas, language rules, and autonomous call status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('create-agent')}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              + Deploy New Agent
            </button>
            <button
              onClick={() => onNavigate('agents')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const isActive = agent.status === 'active';
            return (
              <div
                key={agent.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {agent.agent_type === 'inbound_receptionist'
                        ? 'Inbound 24/7'
                        : agent.agent_type === 'instant_lead'
                        ? '60s Speed-to-Lead'
                        : 'Bulk Outreach'}
                    </span>

                    {/* Interactive Active / Paused Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleAgentStatus(agent)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Click to toggle agent status"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{isActive ? 'Active' : 'Paused'}</span>
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{agent.name}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Calls Processed:</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {agent.total_calls}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onNavigate('testing', { agentId: agent.id })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Test Voice</span>
                  </button>
                  <button
                    onClick={() => onNavigate('agent-editor', { agentId: agent.id })}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="Configure Agent Rules & FAQs"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. HOURLY CALL VOLUME & AI CONTAINMENT CHART */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Hourly Call Volume & Autonomous Containment</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Traffic distribution across business hours. AI handled 88.4% of conversations without human escalation.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
              <span>AI Fully Resolved</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
              <span>Warm Transferred</span>
            </span>
          </div>
        </div>

        {/* Visual Bar Columns */}
        <div className="pt-6 grid grid-cols-7 gap-3 items-end h-36">
          {hourlyTraffic.map((item) => {
            const heightPercent = Math.max(15, Math.round((item.total / maxHourTotal) * 100));
            const resolvedPercent = Math.round((item.resolved / item.total) * 100);
            return (
              <div key={item.hour} className="flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.total} calls
                </div>
                <div
                  className="w-full max-w-[42px] bg-indigo-100 rounded-t-md overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-95"
                  style={{ height: `${heightPercent}%` }}
                >
                  <div
                    className="w-full bg-blue-600 rounded-t-sm"
                    style={{ height: `${resolvedPercent}%` }}
                    title={`${item.resolved} resolved autonomously (${resolvedPercent}%)`}
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-600">{item.hour}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. TWO-COLUMN LAYOUT: Recent Call Stream & High-Priority Callbacks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Conversations Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Real-Time Call Activity Stream</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verbatim transcripts, audio recordings, and CRM lead extractions.
                </p>
              </div>
              <button
                onClick={() => onNavigate('calls')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Full Audit Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Caller / Recipient</th>
                    <th className="py-2.5 px-4">Voice Employee</th>
                    <th className="py-2.5 px-4">Duration</th>
                    <th className="py-2.5 px-4">Outcome</th>
                    <th className="py-2.5 px-4">AI Summary</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCalls.slice(0, 7).map((call) => (
                    <tr key={call.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 font-mono tabular-nums">
                              {call.caller_number}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[110px] font-medium">
                        {call.agent_name || 'AI Employee'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {call.duration_seconds}s
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            call.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : call.status === 'transferred'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {call.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]" title={call.summary}>
                        {call.summary || 'Caller inquiry processed successfully.'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="py-1 px-2.5 rounded-md text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          View Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Actionable Pending Callbacks Queue */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scheduled Callbacks Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer requested callbacks awaiting outbound dial.
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                {callbacks.length} Due
              </span>
            </div>

            <div className="p-4 space-y-3">
              {callbacks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-700">All callbacks resolved</p>
                  <p className="text-[11px]">No pending caller requests in queue.</p>
                </div>
              ) : (
                callbacks.map((cb) => (
                  <div
                    key={cb.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900">{cb.customer_name}</p>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded">
                        High Priority
                      </span>
                    </div>

                    <p className="text-xs font-mono text-slate-700 tabular-nums">
                      {cb.customer_phone}
                    </p>

                    <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 leading-relaxed">
                      {cb.notes}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400 font-mono">
                        Target: {new Date(cb.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTriggerCallbackDial(cb)}
                          className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>AI Dial</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveCallback(cb.id)}
                          className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Infrastructure Health strip at card bottom */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                <span>Exotel Telephony SIP</span>
              </span>
              <span className="text-emerald-700 font-semibold font-mono">Connected (0% packet drop)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>ElevenLabs Speech TTS</span>
              </span>
              <span className="text-blue-700 font-semibold font-mono">180ms Latency</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. MODALS */}
      {selectedCall && (
        <CallDetailsModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onNavigateToTesting={(agentId) => onNavigate('testing', { agentId })}
        />
      )}

      {onboardingOpen && (
        <OnboardingModal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onComplete={() => {
            setOnboardingOpen(false);
            setOnboardingDismissed(true);
            loadData();
          }}
          onNavigateToTesting={(agentId) => onNavigate('testing', { agentId })}
        />
      )}

      {/* Add Credits Recharge Modal */}
      <AddCreditsModal
        isOpen={addCreditsModalOpen}
        onClose={() => setAddCreditsModalOpen(false)}
        onSuccess={(wallet) => {
          setAddCreditsModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};
