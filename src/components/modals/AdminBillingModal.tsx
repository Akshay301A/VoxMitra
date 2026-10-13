import React, { useState } from 'react';
import {
  X,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Building2,
  Info,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { BillingConfig } from '../../types.ts';

interface AdminBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BillingConfig;
  onSuccess: (config: BillingConfig) => void;
}

export const AdminBillingModal: React.FC<AdminBillingModalProps> = ({
  isOpen,
  onClose,
  config,
  onSuccess,
}) => {
  const [billingMode, setBillingMode] = useState<BillingConfig['billing_mode']>(
    config.billing_mode || 'subscription_plus_wallet'
  );
  const [rateINR, setRateINR] = useState(
    ((config.usage_rate_per_minute_minor || 550) / 100).toFixed(2)
  );
  const [includedMinutes, setIncludedMinutes] = useState(
    (config.included_minutes || 500).toString()
  );
  const [durationRounding, setDurationRounding] = useState(
    (config.call_duration_rounding_seconds || 60).toString()
  );
  const [chargeUnanswered, setChargeUnanswered] = useState(
    config.charge_unanswered_calls || false
  );
  const [lowBalanceAlertINR, setLowBalanceAlertINR] = useState(
    Math.round((config.low_balance_alert_threshold_minor || 20000) / 100).toString()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateMinor = Math.round(parseFloat(rateINR || '5.5') * 100);
    const incMin = parseInt(includedMinutes || '0', 10);
    const roundingSec = parseInt(durationRounding || '60', 10);
    const lowBalMinor = Math.round(parseFloat(lowBalanceAlertINR || '200') * 100);

    try {
      setLoading(true);
      setError(null);
      const updated = await api.updateBillingConfig({
        billing_mode: billingMode,
        usage_rate_per_minute_minor: rateMinor,
        included_minutes: incMin,
        call_duration_rounding_seconds: roundingSec,
        charge_unanswered_calls: chargeUnanswered,
        low_balance_alert_threshold_minor: lowBalMinor,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed updating commercial billing configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Commercial Rates & Billing Configuration</h3>
              <p className="text-[11px] text-slate-400">
                Ramachandra Naidu Jyothi Private Limited · Sovereign Billing Architecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Billing Mode Architecture Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Select Commercial Billing Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setBillingMode('subscription_plus_wallet')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  billingMode === 'subscription_plus_wallet'
                    ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Mode A: Hybrid Model</span>
                  {billingMode === 'subscription_plus_wallet' && (
                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Monthly subscription plan with included minutes + usage wallet for any overage.
                </p>
              </div>

              <div
                onClick={() => setBillingMode('pure_prepaid')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  billingMode === 'pure_prepaid'
                    ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Mode B: Pure Prepaid</span>
                  {billingMode === 'pure_prepaid' && (
                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  No mandatory recurring subscription. All calling minutes deduct directly from prepaid credits.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Per-Minute Rate */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Usage Rate (₹ / Minute)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="50"
                  value={rateINR}
                  onChange={(e) => setRateINR(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Proposed rates: Starter (₹7.00), Growth (₹5.50), Business (₹4.75).
              </p>
            </div>

            {/* Included Minutes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Included Monthly Minutes
              </label>
              <input
                type="number"
                min="0"
                max="50000"
                value={includedMinutes}
                onChange={(e) => setIncludedMinutes(e.target.value)}
                disabled={billingMode === 'pure_prepaid'}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-mono disabled:bg-slate-100 disabled:text-slate-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {billingMode === 'pure_prepaid' ? 'Disabled in Pure Prepaid mode' : 'Covered before wallet deductions'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Duration Rounding */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Call Duration Rounding Policy
              </label>
              <select
                value={durationRounding}
                onChange={(e) => setDurationRounding(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-600 outline-hidden bg-white"
              >
                <option value="60">60-second standard increments</option>
                <option value="30">30-second billing increments</option>
                <option value="1">Per-second precision</option>
              </select>
            </div>

            {/* Low-Balance Alert Threshold */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Low Balance Alert Threshold (INR)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  value={lowBalanceAlertINR}
                  onChange={(e) => setLowBalanceAlertINR(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:border-blue-600 outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          {/* Unanswered Calls Policy */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Charge Unanswered / Busy Calls</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When disabled, call attempts with zero connected talk time incur ₹0.00 charge.
              </p>
            </div>
            <input
              type="checkbox"
              checked={chargeUnanswered}
              onChange={(e) => setChargeUnanswered(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </div>

          {/* Footer note */}
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Changes take effect immediately for new call settlements. Historical ledger records remain immutable and retain their original historical financial figures.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Commercial Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
