import React, { useState } from 'react';
import { X, Send, ShieldCheck, AlertCircle, Phone } from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';
import { announcePaymentSuccess } from '../utils/voiceAlert.js';

export default function SendMoneyModal({ isOpen, onClose, onSendSuccess, currentBalance = 1245000 }) {
  const [recipient, setRecipient] = useState('Riya Sharma');
  const [amountRupees, setAmountRupees] = useState('500');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 5000, 10000];
  const amountPaise = (parseFloat(amountRupees) || 0) * 100;
  const isOverBalance = amountPaise > currentBalance;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amountPaise <= 0 || isOverBalance) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const cleanName = recipient.split('(')[0].trim();
      const formattedRupees = (amountPaise / 100).toLocaleString('en-IN');
      announcePaymentSuccess(formattedRupees, cleanName);
      onSendSuccess?.({
        recipient,
        amountPaise,
        note,
      });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl w-full max-w-md border border-cardborder shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cardborder flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-coral-light text-coral flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">Send Money</h3>
              <p className="text-[11px] text-ink-muted">Transfer funds to linked accounts</p>
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
          {/* Recipient Mobile Number or Contact */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-ink">Recipient Mobile Number or Contact</label>
              <span className="text-[10px] text-ink-muted">Type any number</span>
            </div>
            <div className="relative mb-2">
              <Phone className="w-4 h-4 text-forest absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter 10-digit mobile no. (e.g. 9876543210)"
                className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs font-semibold text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                required
              />
            </div>
            {/* Quick contact select pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'Riya Sharma', phone: '+91 98201 44810' },
                { name: 'Aditya Singh', phone: '+91 98112 33490' },
                { name: 'Zara Khan', phone: '+91 99304 88219' },
                { name: 'External Bank', phone: 'HDFC •••• 4192' },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setRecipient(`${c.name} (${c.phone})`)}
                  className="px-2 py-1 rounded-lg bg-canvas text-[10px] font-bold text-ink-muted hover:text-ink hover:bg-canvas-alt border border-cardborder/60 transition-colors"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted">₹</span>
              <input
                type="number"
                min="1"
                step="any"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                placeholder="0"
                required
              />
            </div>

            {/* Quick pills */}
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

            {isOverBalance && (
              <div className="flex items-center space-x-1.5 text-xs text-coral mt-2 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Exceeds available balance ({formatPaise(currentBalance)})</span>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner share, rent, invoice"
              className="w-full px-3.5 py-2 bg-canvas rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>

          {/* AI Risk Guard Preview */}
          <div className="p-3 bg-sage-light rounded-2xl border border-sage/20 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-forest mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-ink leading-tight">
              <span className="font-bold text-forest">Smart Security: Protected & Verified</span>
              <p className="text-ink-muted text-[10px] mt-0.5">
                Recipient checked against reported scam databases. Instant transfer with bank-verified protection.
              </p>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isOverBalance || amountPaise <= 0}
              className="w-full py-3 bg-coral hover:bg-coral-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Processing Payment...' : `Send ${formatPaise(amountPaise)}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
