import React, { useState } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  CreditCard,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { AutoTopUpSettings } from '../../types.ts';

interface AutoTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoTopUpSettings;
  onSuccess: (settings: AutoTopUpSettings) => void;
}

export const AutoTopUpModal: React.FC<AutoTopUpModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSuccess,
}) => {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [thresholdMinor, setThresholdMinor] = useState(settings.threshold_minor || 20000);
  const [rechargeAmountMinor, setRechargeAmountMinor] = useState(settings.recharge_amount_minor || 100000);
  const [monthlyCapINR, setMonthlyCapINR] = useState(
    Math.round((settings.monthly_cap_minor || 500000) / 100).toString()
  );
  const [mandateStatus, setMandateStatus] = useState(settings.mandate_status || 'none');

  const [loading, setLoading] = useState(false);
  const [authorizingMandate, setAuthorizingMandate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const thresholds = [
    { label: '₹100', minor: 10000 },
    { label: '₹200 (Recommended)', minor: 20000 },
    { label: '₹500', minor: 50000 },
  ];

  const rechargeAmounts = [
    { label: '₹500', minor: 50000 },
    { label: '₹1,000 (Recommended)', minor: 100000 },
    { label: '₹2,500', minor: 250000 },
  ];

  const handleAuthorizeMandate = async () => {
    try {
      setAuthorizingMandate(true);
      setError(null);
      const res = await api.authorizePaymentMandate();
      if (res.success) {
        setMandateStatus(res.settings.mandate_status);
        setEnabled(true);
        setSuccessMsg('e-Mandate authorized successfully! Auto Top-Up is now active.');
        onSuccess(res.settings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authorize mandate.');
    } finally {
      setAuthorizingMandate(false);
    }
  };

  const handleCancelMandate = async () => {
    try {
      setAuthorizingMandate(true);
      setError(null);
      const res = await api.cancelPaymentMandate();
      if (res.success) {
        setMandateStatus(res.settings.mandate_status);
        setEnabled(false);
        setSuccessMsg('Payment mandate revoked. Auto Top-Up has been disabled.');
        onSuccess(res.settings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel mandate.');
    } finally {
      setAuthorizingMandate(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const capMinor = Math.round(parseFloat(monthlyCapINR || '5000') * 100);

    if (enabled && mandateStatus !== 'active') {
      setError('An active payment mandate is required before enabling Auto Top-Up. Please authorize e-Mandate below.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await api.updateAutoTopUpSettings({
        enabled,
        threshold_minor: thresholdMinor,
        recharge_amount_minor: rechargeAmountMinor,
        monthly_cap_minor: capMinor,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed updating auto top-up settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Auto Top-Up Settings</h3>
              <p className="text-[11px] text-slate-400">
                Never miss an inbound or outbound customer call due to low balance
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
        <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Enable / Disable Switch */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Enable Automatic Replenishment</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically recharge wallet when available credits drop below your threshold
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-hidden ${
                enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-xs block transition-transform absolute top-0.5 ${
                  enabled ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Threshold Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Low-Balance Trigger Threshold
            </label>
            <div className="grid grid-cols-3 gap-2">
              {thresholds.map((t) => (
                <button
                  key={t.minor}
                  type="button"
                  onClick={() => setThresholdMinor(t.minor)}
                  className={`p-2.5 text-xs rounded-xl border text-center transition-all ${
                    thresholdMinor === t.minor
                      ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recharge Amount Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Recharge Top-Up Amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {rechargeAmounts.map((r) => (
                <button
                  key={r.minor}
                  type="button"
                  onClick={() => setRechargeAmountMinor(r.minor)}
                  className={`p-2.5 text-xs rounded-xl border text-center transition-all ${
                    rechargeAmountMinor === r.minor
                      ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Cap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maximum Monthly Recharge Cap (INR)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono font-bold">
                ₹
              </span>
              <input
                type="number"
                min="500"
                max="500000"
                value={monthlyCapINR}
                onChange={(e) => setMonthlyCapINR(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Prevents unexpected charges. VoxMitra will pause auto top-ups once this monthly limit is reached.
            </p>
          </div>

          {/* e-Mandate Authorization Status Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>e-Mandate / UPI AutoPay Authorization</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                mandateStatus === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {mandateStatus === 'active' ? 'Authorized Active' : 'Setup Required'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Auto top-up requires explicit recurring payment authorization under RBI e-Mandate guidelines.
              Saving settings does <span className="font-semibold text-slate-900">NOT</span> charge your card immediately.
            </p>

            <div className="pt-1 flex items-center gap-2">
              {mandateStatus === 'active' ? (
                <button
                  type="button"
                  disabled={authorizingMandate}
                  onClick={handleCancelMandate}
                  className="py-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                >
                  Revoke Mandate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authorizingMandate}
                  onClick={handleAuthorizeMandate}
                  className="py-1.5 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
                >
                  {authorizingMandate && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Authorize e-Mandate</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
