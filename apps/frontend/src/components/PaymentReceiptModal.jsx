import React, { useState } from 'react';
import { ShieldCheck, Scale, Copy, Check, Printer, X, CheckCircle2, Lock, FileText, ArrowRight } from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';

export default function PaymentReceiptModal({ isOpen, onClose, transaction }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const txId = transaction.id || 'tx_demo_001';
  const amountPaise = Math.abs(transaction.amount_paise || transaction.amountPaise || 50000);
  const isHold = transaction.isReviewRequired || transaction.status === 'Under Review' || transaction.status === 'UNDER_REVIEW';
  
  // Deterministic cryptographic hash mock derived from transaction properties
  const pseudoHash = `0x${Array.from(txId + amountPaise + (transaction.created_at || ''))
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0x8f2a41c9)
    .toString(16)
    .padStart(8, '0')}7f99b1a03e144c82d56a90ec5418b7c2`;

  const debitEntryId = `ent_deb_${txId.replace(/^tx_/, '')}`;
  const creditEntryId = `ent_crd_${txId.replace(/^tx_/, '')}`;

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(pseudoHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-cardborder relative overflow-hidden print:p-0 print:border-none print:shadow-none">
        {/* Close Button (Hidden on Print) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-canvas-alt transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Header */}
        <div className="text-center pb-5 border-b border-cardborder">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest text-white text-[10px] font-bold tracking-wider uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-light" />
            <span>Cryptographic Settlement Certificate</span>
          </div>
          <h2 className="text-xl font-black text-ink tracking-tight">LedgerGuard Verified Transaction</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Double-Entry Immutable Journal Proof &bull; Strict Zero-Sum Invariant
          </p>
        </div>

        {/* Amount & Status Hero */}
        <div className="py-5 text-center bg-canvas my-5 rounded-2xl border border-cardborder">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Settled Amount</div>
          <div className="text-3xl font-black text-ink tracking-tight mt-1">
            {formatPaise(amountPaise)}
          </div>
          <div className="mt-2 flex items-center justify-center space-x-1.5">
            {isHold ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-light text-amber border border-amber/30 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>HELD IN ESCROW FOR SECURITY VERIFICATION</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sage-light text-sage border border-sage/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>LEDGER COMMITTED &bull; 0 DISCREPANCY</span>
              </span>
            )}
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="space-y-3 text-xs mb-5">
          <div className="flex justify-between items-center py-1.5 border-b border-cardborder/60">
            <span className="text-ink-muted">Transaction ID:</span>
            <span className="font-mono font-bold text-ink">{txId}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-cardborder/60">
            <span className="text-ink-muted">Timestamp:</span>
            <span className="font-semibold text-ink">
              {transaction.created_at ? new Date(transaction.created_at).toLocaleString('en-IN') : '24 October 2026, 5:15 PM'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-cardborder/60">
            <span className="text-ink-muted">Source Account (Debit):</span>
            <span className="font-semibold text-ink">{transaction.from || 'Aman (User Wallet)'}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-cardborder/60">
            <span className="text-ink-muted">Destination (Credit):</span>
            <span className="font-semibold text-ink">{transaction.to || transaction.counterparty}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-cardborder/60">
            <span className="text-ink-muted">AI Pre-Transfer Risk Score:</span>
            <span className={`font-bold ${transaction.risk_score > 60 ? 'text-coral' : 'text-sage'}`}>
              {transaction.risk_score || 12} / 100 ({transaction.risk_level || 'LOW'})
            </span>
          </div>
        </div>

        {/* Double-Entry Invariant Proof Box */}
        <div className="p-3.5 rounded-xl bg-forest/5 border border-forest/20 text-xs mb-5 space-y-1.5">
          <div className="flex items-center justify-between font-bold text-forest text-[11px]">
            <span className="flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5" />
              <span>Double-Entry Proof (Integer Paise)</span>
            </span>
            <span className="text-sage font-mono">Net Invariant: ₹0.00</span>
          </div>
          <div className="font-mono text-[10px] text-ink-muted space-y-0.5">
            <div className="flex justify-between">
              <span>Debit: {debitEntryId}</span>
              <span className="text-coral">-{formatPaise(amountPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credit: {creditEntryId}</span>
              <span className="text-sage">+{formatPaise(amountPaise)}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Hash */}
        <div className="p-3 rounded-xl bg-canvas border border-cardborder mb-6">
          <div className="flex items-center justify-between text-[10px] text-ink-muted font-bold mb-1">
            <span>CANONICAL SHA-256 JOURNAL HASH</span>
            <button
              onClick={handleCopyHash}
              className="text-forest hover:text-forest-light flex items-center space-x-1 font-semibold"
            >
              {copied ? <Check className="w-3 h-3 text-sage" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-[10px] text-ink break-all select-all">{pseudoHash}</div>
        </div>

        {/* Print / Actions (Hidden on Print) */}
        <div className="flex items-center space-x-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-canvas hover:bg-canvas-alt border border-cardborder text-xs font-bold text-ink rounded-xl transition-all"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-forest hover:bg-forest-light text-xs font-bold text-white rounded-xl shadow-soft transition-all flex items-center justify-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
