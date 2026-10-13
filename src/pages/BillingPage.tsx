import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Clock, ArrowUpRight, ShieldCheck, Download, Wallet, Zap } from 'lucide-react';
import { api } from '../api/client.ts';

interface BillingPageProps {
  onNavigate?: (page: string, params?: any) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigate }) => {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsage() {
      try {
        setLoading(true);
        const data = await api.getUsage();
        setUsage(data);
      } catch (err) {
        console.error('Failed to load usage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading billing metrics...</div>;
  }

  const minutesUsed = usage?.total_minutes || 0;
  const includedMinutes = usage?.included_minutes || 1000;
  const percentUsed = Math.min(100, Math.round((minutesUsed / includedMinutes) * 100));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Usage Telemetry & Subscriptions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor real-time calling minutes, subscription plan allowances, and billing history.
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('wallet')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Wallet className="w-4 h-4" />
            <span>Open Prepaid Wallet & Auto Top-Up</span>
          </button>
        )}
      </div>

      {/* Prepaid Usage Wallet Spotlight Card */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-400/30">
              Prepaid Telephony Credits
            </span>
            <span className="text-xs text-slate-400 font-mono">1 Credit = ₹1.00</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Prepaid Usage Wallet Active (₹{usage?.wallet_balance_inr?.toFixed(2) || '4,250.00'})
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Real-time per-second call debiting at ₹{usage?.cost_per_minute_inr?.toFixed(2) || '5.50'}/min. Optional automated recharge ensures continuous phone coverage with zero dropped calls.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onNavigate && (
            <button
              onClick={() => onNavigate('wallet')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-slate-950 hover:bg-slate-100 transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Manage Wallet & Auto Top-Up</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Plan & Usage Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                Current Plan
              </span>
              <h2 className="text-xl font-bold text-slate-900 capitalize">
                {usage?.plan_tier || 'Growth'} Plan
              </h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
              Active Subscription
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Calling Minutes Consumed</span>
              <span className="font-mono tabular-nums text-slate-900 font-bold">
                {minutesUsed} / {includedMinutes} min ({percentUsed}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Billing cycle renews on {usage?.billing_period?.end || 'October 31, 2026'}. Unused minutes do not roll over.
            </p>
          </div>
        </div>

        {/* Current Cost Estimate */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Cycle Estimated Cost
            </span>
            <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
              ${usage?.estimated_bill_usd || '0.00'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Rate: ${usage?.cost_per_minute || '0.08'} per additional voice minute.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span>
              {usage?.payment_method?.brand} ending in {usage?.payment_method?.last4}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Tiers Matrix */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Subscription Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Starter</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">$49/mo</p>
              <ul className="text-xs text-slate-600 mt-3 space-y-1.5">
                <li>· 200 included minutes</li>
                <li>· 1 AI Voice Agent</li>
                <li>· Community support</li>
              </ul>
            </div>
            <button
              disabled
              className="mt-6 w-full py-1.5 px-3 text-xs font-semibold rounded bg-slate-200 text-slate-600"
            >
              Downgrade
            </button>
          </div>

          <div className="p-4 rounded-xl border-2 border-indigo-600 bg-white flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-600">Active</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Growth</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">$179/mo</p>
              <ul className="text-xs text-slate-600 mt-3 space-y-1.5">
                <li>· 1,000 included minutes</li>
                <li>· 5 AI Voice Agents</li>
                <li>· Exotel & ElevenLabs connect</li>
                <li>· Live CRM webhook dispatch</li>
              </ul>
            </div>
            <button
              disabled
              className="mt-6 w-full py-1.5 px-3 text-xs font-semibold rounded bg-indigo-50 text-indigo-700"
            >
              Current Active Plan
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Enterprise</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">$599/mo</p>
              <ul className="text-xs text-slate-600 mt-3 space-y-1.5">
                <li>· 5,000 included minutes</li>
                <li>· Unlimited AI Agents</li>
                <li>· Private carrier SIP trunk</li>
                <li>· Dedicated account SLA</li>
              </ul>
            </div>
            <button className="mt-6 w-full py-1.5 px-3 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-800 text-white transition-colors">
              Upgrade to Enterprise
            </button>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">Billing Ledger & Invoices</h3>
          <p className="text-xs text-slate-500 mt-0.5">Historical monthly statements.</p>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Minutes Used</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            <tr>
              <td className="py-3 px-4 text-slate-900 font-medium">INV-2026-09</td>
              <td className="py-3 px-4 text-slate-600 font-sans">Sep 1 – Sep 30, 2026</td>
              <td className="py-3 px-4 text-slate-600">485.5 min</td>
              <td className="py-3 px-4 text-slate-900 font-bold">$38.84</td>
              <td className="py-3 px-4 font-sans">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  Paid
                </span>
              </td>
              <td className="py-3 px-4 text-right font-sans">
                <button className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 font-semibold text-xs">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
