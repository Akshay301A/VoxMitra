import React, { useEffect, useState } from 'react';
import {
  Wallet as WalletIcon,
  PlusCircle,
  CreditCard,
  Zap,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ShieldCheck,
  Receipt,
  Info,
  PhoneCall,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { api } from '../api/client.ts';
import {
  Wallet,
  WalletOverviewData,
  WalletTransaction,
  AutoTopUpSettings,
  BillingConfig,
  DailyUsagePoint,
} from '../types.ts';
import { AddCreditsModal } from '../components/modals/AddCreditsModal.tsx';
import { AutoTopUpModal } from '../components/modals/AutoTopUpModal.tsx';
import { AdminBillingModal } from '../components/modals/AdminBillingModal.tsx';
import { TransactionDetailModal } from '../components/modals/TransactionDetailModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface WalletPageProps {
  onNavigate?: (page: string, params?: any) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<WalletOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<'7d' | '14d' | '30d'>('14d');

  // Transactions Filter & Pagination State
  const [txList, setTxList] = useState<WalletTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals
  const [addCreditsOpen, setAddCreditsOpen] = useState(false);
  const [autoTopUpOpen, setAutoTopUpOpen] = useState(false);
  const [adminBillingOpen, setAdminBillingOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getWalletOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load wallet overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTxLoading(true);
      const res = await api.getWalletTransactions({
        type: txTypeFilter !== 'all' ? txTypeFilter : undefined,
        status: txStatusFilter !== 'all' ? txStatusFilter : undefined,
        search: txSearch.trim() || undefined,
        limit: PAGE_SIZE,
        offset: (txPage - 1) * PAGE_SIZE,
      });
      setTxList(res.transactions);
      setTxTotal(res.total);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [txTypeFilter, txStatusFilter, txPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTxPage(1);
    loadTransactions();
  };

  const handleDownloadCSV = () => {
    if (!txList || txList.length === 0) return;

    const headers = [
      'Transaction ID',
      'Date & Time',
      'Type',
      'Direction',
      'Amount (INR)',
      'Credits',
      'Status',
      'Resulting Balance (INR)',
      'Description',
      'Call ID',
      'Gateway Reference',
    ];

    const rows = txList.map((tx) => [
      tx.id,
      new Date(tx.created_at).toISOString(),
      tx.transaction_type,
      tx.direction,
      (tx.amount_minor / 100).toFixed(2),
      Math.round(tx.amount_minor / 100),
      tx.status,
      (tx.resulting_balance_minor / 100).toFixed(2),
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.call_id || '',
      tx.external_reference || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `voxmitra_wallet_statement_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Loading VoxMitra Usage Wallet...</span>
      </div>
    );
  }

  const wallet = data?.wallet;
  const autoTopUp = data?.autoTopUp;
  const config = data?.billingConfig;
  const availableINR = (wallet?.available_balance_minor || 0) / 100;
  const availableCredits = Math.round(availableINR);
  const reservedINR = (wallet?.reserved_balance_minor || 0) / 100;
  const reservedCredits = Math.round(reservedINR);
  const rateINR = (config?.usage_rate_per_minute_minor || 550) / 100;

  // Chart data
  const chartPoints = data?.dailyUsage || [];
  const maxCreditsInChart = Math.max(...chartPoints.map((p) => p.credits), 10);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* 1. TOP HEADER & WORKSPACE CONTEXT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Usage Wallet & Prepaid Credits
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              INR (₹) Account
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prepaid voice call credits, transparent per-minute metering, and automated replenishment.
            Managed by <span className="text-slate-700 font-semibold">Ramachandra Naidu Jyothi Private Limited</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              loadOverview();
              loadTransactions();
            }}
            title="Refresh Wallet Metrics"
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setAdminBillingOpen(true)}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Commercial Rates</span>
            </button>
          )}

          <button
            onClick={() => setAddCreditsOpen(true)}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Credits</span>
          </button>
        </div>
      </div>

      {/* 2. WALLET HERO & OVERVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Wallet Balance Hero Card */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-950 via-[#0B0F19] to-slate-900 text-white p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <WalletIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-300">
                    Prepaid Usage Wallet
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    ₹1 = 1 Usage Credit
                  </span>
                </div>
              </div>

              {/* Auto Top-Up Pill */}
              <button
                onClick={() => setAutoTopUpOpen(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  autoTopUp?.enabled && autoTopUp?.mandate_status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
                title="Click to configure Auto Top-Up settings"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>
                  Auto Top-Up:{' '}
                  {autoTopUp?.enabled && autoTopUp?.mandate_status === 'active'
                    ? 'Active'
                    : 'Disabled'}
                </span>
              </button>
            </div>

            {/* Main Balance Display */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Available Call Balance
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-white">
                  ₹{availableINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-sm sm:text-base font-bold font-mono text-blue-400">
                  {availableCredits.toLocaleString('en-IN')} Credits
                </span>
              </div>

              {reservedCredits > 0 && (
                <p className="text-xs text-amber-400 font-mono mt-1">
                  ({reservedCredits} credits currently reserved during active calls)
                </p>
              )}
            </div>

            {/* Plan & Rate Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Subscription Plan</span>
                <span className="font-semibold text-white capitalize">
                  {config?.billing_mode === 'pure_prepaid' ? 'Pure Prepaid' : 'Growth Plan (Hybrid)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Usage Voice Rate</span>
                <span className="font-mono font-semibold text-white">
                  ₹{rateINR.toFixed(2)} / min
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Last Recharge</span>
                <span className="font-mono text-slate-300">
                  {data?.lastSuccessfulRechargeDate
                    ? new Date(data.lastSuccessfulRechargeDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Oct 1, 2026'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between relative z-10">
            <span className="text-[11px] text-slate-400">
              Indian Telephony Routing · Sovereign Ledger Isolation
            </span>
            <button
              onClick={() => setAddCreditsOpen(true)}
              className="py-1.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Add Credits</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Usage Summary Metrics Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* Estimated Remaining Minutes */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Est. Call Minutes
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-blue-600 mt-1">
                ~{data?.estimatedRemainingMinutes || 0} min
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              *Estimate based on standard ₹{rateINR.toFixed(2)}/min voice rate.
            </p>
          </div>

          {/* Credits Consumed Today */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Consumed Today
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {Math.round((data?.todayUsageMinor || 0) / 100)} cr
              </p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              ₹{((data?.todayUsageMinor || 0) / 100).toFixed(2)} deducted today
            </p>
          </div>

          {/* Cycle Minutes Consumed */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Call Talk Time
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data?.cycleMinutesConsumed || 0} min
              </p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Across {data?.cycleCompletedCalls || 0} completed conversations
            </p>
          </div>

          {/* Included Plan Allowance Status */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Plan Allowance
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {config?.included_minutes_used || 0}/{config?.included_minutes || 500}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-2">
              No double-billing guarantee active
            </p>
          </div>
        </div>
      </div>

      {/* 3. DAILY USAGE CHART & AUTO TOP-UP CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Usage Visual Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Daily Voice Usage & Credit Burn Trend</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily credits deducted and connected telephone talk minutes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                14-Day Trajectory
              </span>
            </div>
          </div>

          {/* Chart Columns */}
          <div className="pt-6 grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-40">
            {chartPoints.map((pt, idx) => {
              const heightPct = Math.max(12, Math.round((pt.credits / maxCreditsInChart) * 100));
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[9px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {pt.credits}cr
                  </div>
                  <div
                    className="w-full max-w-[28px] bg-blue-100 rounded-t-md overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-95"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="w-full bg-blue-600 h-full rounded-t-sm" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 truncate max-w-[32px]">
                    {pt.date.split(' ')[1] || pt.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto Top-Up Configuration Card */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Auto Top-Up Rules</span>
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                autoTopUp?.enabled && autoTopUp?.mandate_status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {autoTopUp?.enabled && autoTopUp?.mandate_status === 'active'
                  ? 'Enabled'
                  : 'Disabled'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Low-Balance Trigger:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{((autoTopUp?.threshold_minor || 20000) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Recharge Amount:</span>
                <span className="font-mono font-bold text-blue-600">
                  ₹{((autoTopUp?.recharge_amount_minor || 100000) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Spending Cap:</span>
                <span className="font-mono text-slate-900">
                  ₹{((autoTopUp?.monthly_cap_minor || 500000) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">e-Mandate Status:</span>
                <span className={`font-semibold capitalize ${
                  autoTopUp?.mandate_status === 'active' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {autoTopUp?.mandate_status === 'active' ? 'Authorized (UPI / Card)' : 'Setup Required'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              When enabled, your wallet replenishes automatically so live customer calls are never disconnected.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoTopUpOpen(true)}
            className="w-full mt-4 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
          >
            Configure Auto Top-Up
          </button>
        </div>
      </div>

      {/* 4. COMMERCIAL RATES & BILLING POLICIES DISCLOSURE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Commercial Rates & Transparent Metering Policy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear disclosure of billable voice events, duration rounding, and taxes.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 font-mono">
            GST (18%) Applicable
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-500">Starter Tier</span>
            <p className="text-lg font-bold font-mono text-slate-900">₹7.00 / min</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              100 included minutes with ₹999/mo plan. Additional voice calls metered at ₹7.00/min.
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/20 space-y-1.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-blue-600">Growth Tier (Your Plan)</span>
              <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">Active</span>
            </div>
            <p className="text-lg font-bold font-mono text-slate-900">₹5.50 / min</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              500 included minutes with ₹2,999/mo plan. Additional voice calls metered at ₹5.50/min.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-500">Business Tier</span>
            <p className="text-lg font-bold font-mono text-slate-900">₹4.75 / min</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              1,500 included minutes with ₹7,999/mo plan. High volume bulk rate at ₹4.75/min.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Guaranteed Billing Principles:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
            <li><span className="font-semibold text-slate-800">No Double Billing</span>: Subscription minutes are consumed first; wallet credits are only charged for overage usage.</li>
            <li><span className="font-semibold text-slate-800">Transparent Rounding</span>: Call duration rounded to 60-second standard increments after conversation connects.</li>
            <li><span className="font-semibold text-slate-800">Unanswered Calls</span>: Zero connected talk time incurs no per-minute usage charge.</li>
            <li><span className="font-semibold text-slate-800">Indian Telephony Entity</span>: All invoices issued by Ramachandra Naidu Jyothi Private Limited with GST compliance.</li>
          </ul>
        </div>
      </div>

      {/* 5. TRANSACTION HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Wallet Transaction Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete audit trail of prepaid top-ups, auto charges, call deductions, and reversals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ref or description..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden w-52 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </form>

            {/* Type Filter */}
            <select
              value={txTypeFilter}
              onChange={(e) => {
                setTxTypeFilter(e.target.value);
                setTxPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="topup">Top-Up</option>
              <option value="call_usage">Call Usage</option>
              <option value="autotopup">Auto Top-Up</option>
              <option value="refund">Refund / Reversal</option>
              <option value="admin_adjustment">Admin Adjustment</option>
            </select>

            {/* Status Filter */}
            <select
              value={txStatusFilter}
              onChange={(e) => {
                setTxStatusFilter(e.target.value);
                setTxPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            {/* Download CSV */}
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount (INR / Credits)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Resulting Balance</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {txLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Loading transactions...
                  </td>
                </tr>
              ) : txList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No transactions match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                txList.map((tx) => {
                  const isCredit = tx.direction === 'credit';
                  const amountINR = tx.amount_minor / 100;
                  const resultingINR = tx.resulting_balance_minor / 100;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-sans text-xs">
                        {new Date(tx.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 text-xs">
                        {tx.id}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          tx.transaction_type === 'topup'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.transaction_type === 'autotopup'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tx.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 truncate max-w-[220px] font-sans text-xs" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className={`py-3.5 px-4 font-bold text-xs ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {isCredit ? '+' : '-'}₹{amountINR.toFixed(2)} ({Math.round(amountINR)} cr)
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : tx.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        ₹{resultingINR.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {txTotal > PAGE_SIZE && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-sans">
            <span>
              Showing {(txPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(txPage * PAGE_SIZE, txTotal)} of {txTotal} transactions
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={txPage <= 1}
                onClick={() => setTxPage((p) => p - 1)}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono">{txPage}</span>
              <button
                type="button"
                disabled={txPage * PAGE_SIZE >= txTotal}
                onClick={() => setTxPage((p) => p + 1)}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {addCreditsOpen && (
        <AddCreditsModal
          isOpen={addCreditsOpen}
          onClose={() => setAddCreditsOpen(false)}
          onSuccess={(updatedWallet) => {
            loadOverview();
            loadTransactions();
          }}
        />
      )}

      {autoTopUpOpen && autoTopUp && (
        <AutoTopUpModal
          isOpen={autoTopUpOpen}
          onClose={() => setAutoTopUpOpen(false)}
          settings={autoTopUp}
          onSuccess={(updatedSettings) => {
            loadOverview();
          }}
        />
      )}

      {adminBillingOpen && config && (
        <AdminBillingModal
          isOpen={adminBillingOpen}
          onClose={() => setAdminBillingOpen(false)}
          config={config}
          onSuccess={(updatedConfig) => {
            loadOverview();
          }}
        />
      )}

      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onNavigateToCall={(callId) => {
            if (onNavigate) onNavigate('calls', { selectedCallId: callId });
          }}
        />
      )}
    </div>
  );
};
