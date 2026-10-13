import React from 'react';
import {
  X,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  PhoneCall,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { WalletTransaction } from '../../types.ts';

interface TransactionDetailModalProps {
  transaction: WalletTransaction | null;
  onClose: () => void;
  onNavigateToCall?: (callId: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onNavigateToCall,
}) => {
  if (!transaction) return null;

  const isCredit = transaction.direction === 'credit';
  const amountINR = transaction.amount_minor / 100;
  const credits = Math.round(transaction.amount_minor / 100);
  const resultingINR = transaction.resulting_balance_minor / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isCredit ? 'bg-emerald-600/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400'}`}>
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Transaction Receipt</h3>
              <p className="text-[11px] font-mono text-slate-400">{transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Amount Hero */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              {transaction.transaction_type.replace(/_/g, ' ')}
            </span>
            <div className={`text-2xl font-bold font-mono tabular-nums flex items-center justify-center gap-1 ${
              isCredit ? 'text-emerald-600' : 'text-slate-900'
            }`}>
              <span>{isCredit ? '+' : '-'}₹{amountINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isCredit ? '+' : '-'}{credits.toLocaleString('en-IN')} Usage Credits
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 divide-y divide-slate-100">
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                transaction.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : transaction.status === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {transaction.status}
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Date & Time</span>
              <span className="font-mono text-slate-900 font-medium">
                {new Date(transaction.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })}
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Description</span>
              <span className="text-right text-slate-900 font-medium max-w-[260px]">
                {transaction.description}
              </span>
            </div>

            {transaction.external_reference && (
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Gateway Reference</span>
                <span className="font-mono text-slate-900 font-medium">
                  {transaction.external_reference}
                </span>
              </div>
            )}

            {transaction.call_id && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Associated Call Record</span>
                {onNavigateToCall ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToCall(transaction.call_id!);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 font-mono"
                  >
                    <span>{transaction.call_id.slice(0, 12)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="font-mono text-slate-900">{transaction.call_id}</span>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Resulting Available Balance</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{resultingINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({Math.round(resultingINR)} credits)
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Platform Operator</span>
              <span className="text-slate-700 font-semibold">
                Ramachandra Naidu Jyothi Pvt Ltd
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              All transactions in this ledger are cryptographically secured and immutable under integer-paise financial precision.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
