import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  PhoneCall,
  History,
  Sliders,
  Network,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Volume2,
  Radio,
  Building2,
  CheckCircle2,
  Bell,
  Sparkles,
  ChevronDown,
  Wallet,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { VoxMitraLogo } from '../common/VoxMitraLogo.tsx';
import { api } from '../../api/client.ts';
import { WalletOverviewData } from '../../types.ts';
import { AddCreditsModal } from '../modals/AddCreditsModal.tsx';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
  breadcrumbs?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  breadcrumbs = ['Console'],
}) => {
  const { user, business, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [walletOverview, setWalletOverview] = useState<WalletOverviewData | null>(null);
  const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(false);

  const fetchWallet = async () => {
    try {
      const data = await api.getWalletOverview();
      setWalletOverview(data);
    } catch (err) {
      // Non-critical background fetch failure
    }
  };

  useEffect(() => {
    fetchWallet();
    const interval = setInterval(fetchWallet, 30000);
    return () => clearInterval(interval);
  }, []);

  const navGroups = [
    {
      group: 'Core Platform',
      items: [
        { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
        { id: 'agents', label: 'AI Voice Employees', icon: Users },
        { id: 'calls', label: 'Call Records & Audit', icon: History },
      ],
    },
    {
      group: 'Voice Studio',
      items: [
        { id: 'create-agent', label: 'Create New Agent', icon: PlusCircle },
        { id: 'testing', label: 'Interactive Voice Lab', icon: PhoneCall },
        { id: 'voice-settings', label: 'Voice & Languages', icon: Volume2 },
      ],
    },
    {
      group: 'Billing & Operations',
      items: [
        { id: 'wallet', label: 'Prepaid Usage Wallet', icon: Wallet },
        { id: 'billing', label: 'Subscriptions & Tariffs', icon: CreditCard },
        { id: 'integrations', label: 'Telecom & Integrations', icon: Network },
        { id: 'settings', label: 'Workspace Settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Deep Midnight Navy) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 border-r border-slate-800/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Lockup */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-left group focus:outline-hidden"
          >
            <VoxMitraLogo size="sm" showWordmark={true} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Profile Switcher Banner */}
        <div className="p-3 mx-3 my-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {business?.name || 'Apex Health Services'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Growth Plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categorized Navigation list */}
        <div className="flex-1 px-3 space-y-5 overflow-y-auto pt-2">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                {group.group}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Infrastructure Status Widget */}
        <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
            <span>TELEPHONY ENGINE</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Carrier: Exotel SIP</span>
            <span className="text-white font-mono font-medium">+91 80 4712</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Speech TTS Latency</span>
            <span className="text-blue-400 font-mono font-medium">180ms</span>
          </div>
        </div>

        {/* Bottom User Profile Strip */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.fullName || 'Dr. Aditya Sharma'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {user?.role || 'Workspace Owner'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              onNavigate('landing');
            }}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Contextual Header (Crisp Light Theme) */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Hierarchy */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{business?.name || 'Workspace'}</span>
              <span aria-hidden="true" className="text-slate-400">/</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-blue-600' : 'text-slate-600'}>
                    {crumb}
                  </span>
                  {idx < breadcrumbs.length - 1 && (
                    <span aria-hidden="true" className="text-slate-400">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-2.5">
            {/* Wallet Balance Pill & Quick Recharge Action */}
            <div className="flex items-center gap-1.5">
              {(() => {
                const balanceINR = walletOverview ? (walletOverview.wallet.available_balance_minor / 100) : 4250.00;
                const thresholdMinor = walletOverview?.billingConfig?.low_balance_alert_threshold_minor || 20000;
                const isLow = walletOverview ? walletOverview.wallet.available_balance_minor < thresholdMinor : false;
                const autoActive = !!(walletOverview?.autoTopUp?.enabled && walletOverview?.autoTopUp?.mandate_status === 'active');

                return (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onNavigate('wallet')}
                      title={`Prepaid Wallet: ₹${balanceINR.toFixed(2)} available. Click to view ledger and usage.`}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isLow
                          ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 shadow-2xs'
                      }`}
                    >
                      <Wallet className={`w-3.5 h-3.5 ${isLow ? 'text-amber-600' : 'text-blue-600'}`} />
                      <span className="font-mono tabular-nums font-bold">
                        ₹{balanceINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {autoActive ? (
                        <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                          <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
                          Auto
                        </span>
                      ) : isLow ? (
                        <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          Low
                        </span>
                      ) : null}
                    </button>

                    <button
                      onClick={() => setAddCreditsModalOpen(true)}
                      title="Add prepaid calling credits to wallet"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Recharge</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Telemetry Status Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Carrier SIP</span>
            </div>

            <button
              onClick={() => onNavigate('testing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Voice Lab</span>
            </button>

            <button
              onClick={() => onNavigate('create-agent')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">New Agent</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Add Credits Modal */}
      <AddCreditsModal
        isOpen={addCreditsModalOpen}
        onClose={() => setAddCreditsModalOpen(false)}
        onSuccess={(updatedWallet) => {
          setAddCreditsModalOpen(false);
          fetchWallet();
        }}
      />
    </div>
  );
};
