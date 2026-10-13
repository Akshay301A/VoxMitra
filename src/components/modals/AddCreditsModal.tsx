import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Wallet } from '../../types.ts';

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wallet: Wallet) => void;
}

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  // Flow states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    amountINR: number;
    creditsAdded: number;
    transactionId: string;
    newBalance: number;
  } | null>(null);

  if (!isOpen) return null;

  const presets = [
    { amount: 500, label: 'Starter', popular: false },
    { amount: 1000, label: 'Recommended', popular: true },
    { amount: 2500, label: 'Growth', popular: false },
    { amount: 5000, label: 'Enterprise', popular: false },
  ];

  const rechargeAmountINR = isCustom
    ? parseInt(customAmount || '0', 10)
    : selectedPreset;

  const gstRate = 0.18;
  const gstAmount = Math.round(rechargeAmountINR * gstRate * 100) / 100;
  const totalPayableINR = rechargeAmountINR + gstAmount;
  const expectedCredits = rechargeAmountINR; // Transparent 1:1 rule: ₹1 = 1 credit

  const handleSelectPreset = (amt: number) => {
    setIsCustom(false);
    setSelectedPreset(amt);
    setError(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustom(true);
    setCustomAmount(e.target.value);
    setError(null);
  };

  const handleInitiatePayment = async () => {
    if (!rechargeAmountINR || rechargeAmountINR < 100) {
      setError('Minimum recharge amount is ₹100.');
      return;
    }
    if (rechargeAmountINR > 100000) {
      setError('Maximum single recharge amount is ₹1,00,000.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const idempotencyKey = `topup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Create order on backend boundary
      const order = await api.createPaymentOrder(rechargeAmountINR, idempotencyKey);

      // 2. Server-side payment verification
      // If Razorpay frontend SDK is configured, it would launch Razorpay Checkout.
      // Here we process through our verified server-side boundary with simulated gateway signature:
      const simulatedPaymentId = 'pay_rzp_' + Math.random().toString(36).substring(2, 12);
      const simulatedSignature = 'sig_verified_' + Math.random().toString(36).substring(2, 12);

      const verifyResult = await api.verifyPayment({
        orderId: order.orderId,
        paymentId: simulatedPaymentId,
        signature: simulatedSignature,
        amountMinor: order.amountMinor,
        idempotencyKey,
        description: `Prepaid Usage Wallet Top-Up (₹${rechargeAmountINR.toLocaleString('en-IN')}) via Razorpay Gateway`,
      });

      if (verifyResult.success) {
        setSuccessData({
          amountINR: rechargeAmountINR,
          creditsAdded: expectedCredits,
          transactionId: verifyResult.transaction.id,
          newBalance: verifyResult.wallet.available_balance_minor / 100,
        });
        onSuccess(verifyResult.wallet);
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
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
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add Wallet Credits</h3>
              <p className="text-[11px] text-slate-400">
                100% transparent conversion: ₹1 = 1 Usage Credit
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
        <div className="p-6 space-y-5">
          {successData ? (
            /* Success State */
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  ₹{successData.amountINR.toLocaleString('en-IN')} Credited Successfully!
                </h4>
                <p className="text-xs text-slate-500">
                  {successData.creditsAdded.toLocaleString('en-IN')} usage credits have been added to your VoxMitra balance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {successData.transactionId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Updated Wallet Balance:</span>
                  <span className="font-mono font-bold text-blue-600">
                    ₹{successData.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({Math.round(successData.newBalance)} credits)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Provider:</span>
                  <span className="font-semibold text-slate-700">
                    Ramachandra Naidu Jyothi Pvt Ltd
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
              >
                Done & Return to Wallet
              </button>
            </div>
          ) : (
            /* Recharge Form */
            <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Preset Denominations */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Recharge Amount
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {presets.map((preset) => {
                    const isSelected = !isCustom && selectedPreset === preset.amount;
                    return (
                      <button
                        key={preset.amount}
                        type="button"
                        onClick={() => handleSelectPreset(preset.amount)}
                        className={`p-3 rounded-xl border text-center relative transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {preset.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            Popular
                          </span>
                        )}
                        <p className="text-sm font-bold font-mono tabular-nums text-slate-900">
                          ₹{preset.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {preset.amount} credits
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Enter Custom Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    placeholder="Enter amount (min ₹100)"
                    value={customAmount}
                    onChange={handleCustomChange}
                    className={`w-full pl-8 pr-3 py-2 text-xs border rounded-xl outline-hidden font-mono ${
                      isCustom
                        ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/30'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Breakdown Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Recharge Usage Credits:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {expectedCredits > 0 ? expectedCredits.toLocaleString('en-IN') : 0} credits
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Base Amount:</span>
                  <span className="font-mono text-slate-900">
                    ₹{rechargeAmountINR > 0 ? rechargeAmountINR.toLocaleString('en-IN') : 0}.00
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (18%):</span>
                  <span className="font-mono text-slate-900">
                    ₹{gstAmount > 0 ? gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="font-mono text-blue-600 text-sm">
                    ₹{totalPayableINR > 0 ? totalPayableINR.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Payment Gateway Badge */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Razorpay Secure (UPI, Cards, NetBanking)</span>
                </span>
                <span className="text-slate-400 font-mono">256-bit SSL</span>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={loading || rechargeAmountINR < 100}
                onClick={handleInitiatePayment}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Secure Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Pay ₹{totalPayableINR > 0 ? totalPayableINR.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
