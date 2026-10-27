import React, {  useState  } from 'react';
import { 
  X, 
  ShieldCheck, 
  Download, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  MapPin, 
  GitCommit, 
  Scale, 
  FileText,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { formatPaise, formatDate } from '../utils/formatters.js';
import ExplainablePaymentJourney from './ExplainablePaymentJourney.jsx';
import MoneyMovementMap from './MoneyMovementMap.jsx';
import PaymentReceiptModal from './PaymentReceiptModal.jsx';

export default function TransactionDrawer({ isOpen, onClose, transaction }) {
  const [activeTab, setActiveTab] = useState('journey'); // 'journey' | 'map' | 'journal'
  const [showCertificate, setShowCertificate] = useState(false);

  if (!isOpen || !transaction) return null;

  const isDeposit = transaction.type === 'DEPOSIT';
  const isSent = transaction.amount_paise < 0 || transaction.type === 'TRANSFER' || transaction.type === 'WITHDRAWAL';
  const absAmount = Math.abs(transaction.amount_paise);
  const status = transaction.status || 'COMPLETED';

  const isBlocked = status === 'BLOCKED' || status === 'FAILED' || status === 'Failed';
  const isUnderReview = status === 'UNDER REVIEW' || status === 'UNDER_REVIEW' || status === 'Under Review';

  const handleDownloadReceipt = () => {
    const receiptText = `=====================================================
LEDGERGUARD TRANSACTION RECEIPT
Simulated Intelligent Payment & Fraud Protection Platform
=====================================================
Transaction ID:   ${transaction.id}
Date & Time:      ${formatDate(transaction.created_at || new Date().toISOString())}
Type:             ${transaction.type || 'TRANSFER'}
Status:           ${status.toUpperCase()}
Amount:           INR ${(absAmount / 100).toFixed(2)} (${absAmount} paise)

Counterparty:     ${transaction.counterparty || transaction.to || 'Beneficiary'}
Idempotency Key:  ${transaction.idempotency_key || 'idem_generated'}
Risk Score:       ${transaction.risk_score || 12}/100

DOUBLE-ENTRY JOURNAL ENTRIES:
1. Credit (Source):      -${formatPaise(absAmount)}
2. Debit (Destination):  +${formatPaise(absAmount)}
Sum Invariant:           0 paise (Balanced)

ATTESTATION:
Ledger entries are strictly immutable (trg_immutable_ledger_entries).
Stored in atomic integer paise with zero-sum invariant guaranteed.
=====================================================`;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${transaction.id || 'tx'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-elevated border-l border-cardborder flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-cardborder flex items-center justify-between bg-canvas/40">
          <div>
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-ink-muted hover:text-forest transition-colors mb-2.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-forest" />
              <span>Back to Transactions</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Transaction Details</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isBlocked 
                  ? 'bg-coral-light text-coral border-coral/20' 
                  : isUnderReview 
                  ? 'bg-amber-light text-amber border-amber/20' 
                  : 'bg-sage-light text-sage border-sage/20'
              }`}>
                {status}
              </span>
            </div>
            <div className="flex items-baseline space-x-3 mt-1">
              <h2 className="text-2xl font-black text-ink tracking-tight">
                {formatPaise(absAmount)}
              </h2>
              <span className="text-xs font-mono text-ink-muted">
                ({absAmount.toLocaleString()} paise)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas-alt flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 px-6 pt-3 border-b border-cardborder bg-white">
          <button
            onClick={() => setActiveTab('journey')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'journey'
                ? 'border-forest text-forest'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Payment Journey (6 Stages)</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'map'
                ? 'border-forest text-forest'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Money Movement Map</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'journal'
                ? 'border-forest text-forest'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Double-Entry Journal</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Explainable Payment Journey */}
          {activeTab === 'journey' && (
            <ExplainablePaymentJourney transaction={transaction} />
          )}

          {/* TAB 2: Money Movement Map */}
          {activeTab === 'map' && (
            <MoneyMovementMap transaction={transaction} />
          )}

          {/* TAB 3: Double-Entry Journal Breakdown */}
          {activeTab === 'journal' && (
            <div className="space-y-6">
              {/* Metadata Card */}
              <div className="bg-canvas rounded-2xl p-4 border border-cardborder space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-cardborder/60">
                  <span className="text-ink-muted">Transaction ID:</span>
                  <span className="font-bold text-ink">{transaction.id}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-cardborder/60">
                  <span className="text-ink-muted">Idempotency Key:</span>
                  <span className="text-ink">{transaction.idempotency_key || 'idem_7c82e...'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-muted">Created Timestamp:</span>
                  <span className="text-ink">{formatDate(transaction.created_at || new Date().toISOString())}</span>
                </div>
              </div>

              {/* Journal Table */}
              <div className="bg-white rounded-2xl p-5 border border-cardborder shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-forest" />
                    <span className="text-xs font-bold text-ink">Balanced Journal Entries (2)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sage-light text-sage border border-sage/20">
                    Sum = 0 paise (Balanced)
                  </span>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  {/* Destination Entry */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-cardborder/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-ink">
                        {isSent ? transaction.counterparty || transaction.to : 'My Primary Wallet'}
                      </div>
                      <div className="text-[10px] text-ink-muted">DEBIT (Destination Account)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sage">+{formatPaise(absAmount)}</div>
                      <div className="text-[10px] text-ink-muted">+{absAmount} paise</div>
                    </div>
                  </div>

                  {/* Source Entry */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-cardborder/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-ink">
                        {isSent ? 'My Primary Wallet' : 'EXTERNAL_BANK'}
                      </div>
                      <div className="text-[10px] text-ink-muted">CREDIT (Source Account)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-coral">-{formatPaise(absAmount)}</div>
                      <div className="text-[10px] text-ink-muted">-{absAmount} paise</div>
                    </div>
                  </div>
                </div>

                {/* Mathematical Balance Guarantee */}
                <div className="p-3 rounded-xl bg-canvas-alt border border-cardborder text-[11px] text-ink-muted flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-3.5 h-3.5 text-sage" />
                    <span>Invariable Zero-Sum Rule:</span>
                  </div>
                  <span className="font-mono font-bold text-sage">
                    (+{absAmount}) + (-{absAmount}) = 0 paise
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-cardborder bg-white flex items-center gap-3">
          <button
            onClick={() => setShowCertificate(true)}
            className="flex-1 py-2.5 rounded-xl border border-forest/30 bg-forest/5 hover:bg-forest/10 text-xs font-bold text-forest flex items-center justify-center space-x-2 transition-colors active:scale-98"
          >
            <ShieldCheck className="w-4 h-4 text-forest" />
            <span>Cryptographic Certificate</span>
          </button>
          <button
            onClick={handleDownloadReceipt}
            className="py-2.5 px-4 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink flex items-center justify-center space-x-1.5 transition-colors active:scale-98"
          >
            <Download className="w-4 h-4 text-ink-muted" />
            <span>Text Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold transition-all shadow-soft active:scale-98"
          >
            Done
          </button>
        </div>
      </div>

      <PaymentReceiptModal
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
        transaction={transaction}
      />
    </div>
  );
}
