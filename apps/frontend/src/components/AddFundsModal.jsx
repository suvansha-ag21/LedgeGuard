import React, {  useState  } from 'react';
import { X, PlusCircle, Landmark, ShieldCheck } from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';

export default function AddFundsModal({ isOpen, onClose, onDepositSuccess }) {
  const [amountRupees, setAmountRupees] = useState('5000');
  const [bankSource, setBankSource] = useState('HDFC Bank - •••• 4192');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = [1000, 5000, 10000, 25000];
  const amountPaise = (parseFloat(amountRupees) || 0) * 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amountPaise <= 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onDepositSuccess?.({
        bankSource,
        amountPaise,
      });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl w-full max-w-md border border-cardborder shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-cardborder flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-sage-light text-sage flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">Add Funds</h3>
              <p className="text-[11px] text-ink-muted">Deposit money from linked bank account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-canvas-alt flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Funding Source</label>
            <div className="p-3 bg-canvas rounded-xl border border-cardborder flex items-center space-x-3">
              <Landmark className="w-5 h-5 text-forest" />
              <div className="text-xs">
                <div className="font-bold text-ink">{bankSource}</div>
                <div className="text-[10px] text-ink-muted">EXTERNAL_BANK System Bridge</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Deposit Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted">₹</span>
              <input
                type="number"
                min="100"
                step="any"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-forest/20"
                required
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountRupees(amt.toString())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    parseFloat(amountRupees) === amt
                      ? 'bg-forest text-white'
                      : 'bg-canvas-alt hover:bg-canvas-subtle text-ink-muted hover:text-ink'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-sage-light rounded-2xl border border-sage/20 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-ink leading-tight">
              <span className="font-bold text-sage">Zero-Sum Ledger Guarantee</span>
              <p className="text-ink-muted text-[10px] mt-0.5">
                Debits EXTERNAL_BANK and credits your wallet atomically in integer paise.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || amountPaise <= 0}
              className="w-full py-3 bg-forest hover:bg-forest-light text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Depositing...' : `Deposit ${formatPaise(amountPaise)}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
