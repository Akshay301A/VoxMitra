import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, X, Zap } from 'lucide-react';
import { api } from '../../api/client.ts';
import type { AutoTopUpSettings } from '../../types.ts';

interface AutoTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoTopUpSettings;
  onSuccess: (settings: AutoTopUpSettings) => void;
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20';

export const AutoTopUpModal: React.FC<AutoTopUpModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSuccess,
}) => {
  const [thresholdINR, setThresholdINR] = useState((settings.threshold_minor / 100 || 200).toString());
  const [rechargeINR, setRechargeINR] = useState((settings.recharge_amount_minor / 100 || 1000).toString());
  const [monthlyCapINR, setMonthlyCapINR] = useState((settings.monthly_cap_minor / 100 || 5000).toString());
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setThresholdINR((settings.threshold_minor / 100 || 200).toString());
    setRechargeINR((settings.recharge_amount_minor / 100 || 1000).toString());
    setMonthlyCapINR((settings.monthly_cap_minor / 100 || 5000).toString());
    setConsent(false);
    setError('');
    setSaved(false);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const threshold = Number(thresholdINR);
  const recharge = Number(rechargeINR);
  const monthlyCap = Number(monthlyCapINR);
  const validAmounts =
    Number.isFinite(threshold) &&
    Number.isFinite(recharge) &&
    Number.isFinite(monthlyCap) &&
    threshold > 0 &&
    recharge > 0 &&
    monthlyCap > 0 &&
    monthlyCap >= recharge &&
    threshold <= 100000 &&
    recharge <= 100000 &&
    monthlyCap <= 500000;

  const handleSavePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!validAmounts) {
      setError('Enter positive amounts. The monthly cap must be at least one recharge and cannot exceed ₹5,00,000.');
      return;
    }
    if (!consent) {
      setError('Confirm that you understand these are saved preferences only and do not authorize automatic charges.');
      return;
    }

    try {
      setLoading(true);
      const updated = await api.updateAutoTopUpSettings({
        enabled: false,
        threshold_minor: Math.round(threshold * 100),
        recharge_amount_minor: Math.round(recharge * 100),
        monthly_cap_minor: Math.round(monthlyCap * 100),
      });
      onSuccess(updated);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save recharge preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-recharge-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20 text-blue-300">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h2 id="auto-recharge-title" className="text-base font-semibold">Automatic Wallet Recharge</h2>
              <p className="mt-0.5 text-xs text-slate-400">Optional and separate from manual recharge</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close automatic recharge settings" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSavePreferences} className="space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-950">Setup required · authorization is not connected</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900">
                  You can save your preferred limits, but this workspace does not have a real payment authorization or recurring-charge flow. Saving will not activate automatic charges.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {saved && (
            <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Preferences saved. Automatic recharge remains disabled until real authorization and backend support are connected.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Low-balance trigger (INR)
              <input type="number" inputMode="decimal" min="1" max="100000" step="0.01" required value={thresholdINR} onChange={(event) => { setThresholdINR(event.target.value); setSaved(false); }} className={inputClass} />
              <span className="mt-1 block font-normal text-slate-500">Proposed trigger: ₹{Number(thresholdINR || 0).toLocaleString('en-IN')}</span>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Automatic recharge amount (INR)
              <input type="number" inputMode="decimal" min="1" max="100000" step="0.01" required value={rechargeINR} onChange={(event) => { setRechargeINR(event.target.value); setSaved(false); }} className={inputClass} />
              <span className="mt-1 block font-normal text-slate-500">One proposed charge: ₹{Number(rechargeINR || 0).toLocaleString('en-IN')}</span>
            </label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
              Monthly spending cap (INR)
              <input type="number" inputMode="decimal" min="1" max="500000" step="0.01" required value={monthlyCapINR} onChange={(event) => { setMonthlyCapINR(event.target.value); setSaved(false); }} className={inputClass} />
              <span className="mt-1 block font-normal text-slate-500">Maximum proposed automatic recharge spend per month. Must be at least one recharge.</span>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proposed automatic charge summary</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">
              If a future authorized service is connected: when the wallet falls below <strong>₹{Number(thresholdINR || 0).toLocaleString('en-IN')}</strong>, it would request a recharge of <strong>₹{Number(rechargeINR || 0).toLocaleString('en-IN')}</strong>, capped at <strong>₹{Number(monthlyCapINR || 0).toLocaleString('en-IN')}</strong> per month. No charge can be made now.
            </p>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-700">
            <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(''); }} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span>I understand this saves my proposed recharge preferences only. It does not authorize a payment method or enable automatic charging.</span>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading || !validAmounts || !consent} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save preferences · remain disabled
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
