import React, {  useState  } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ShieldCheck,
  PlusCircle,
  ArrowDownRight,
  ArrowLeft,
  Send,
  Lock,
  Landmark,
  CheckCircle2,
  Copy,
  ExternalLink,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPaise } from '../utils/formatters.js';
import SendMoneyModal from '../components/SendMoneyModal.jsx';
import AddFundsModal from '../components/AddFundsModal.jsx';

export default function Wallets() {
  const navigate = useNavigate();
  const { user, account, balancePaise, transactions, addTransaction, addFunds } = useAuth();

  const activeHoldPaise = transactions
    .filter((t) => t.isReviewRequired || t.status === 'Under Review' || t.status === 'UNDER_REVIEW')
    .reduce((sum, t) => sum + Math.abs(t.amount_paise), 0);

  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(account?.id || 'acc_aman_001');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-7">
      {/* Page Header & Navigation */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-ink-muted hover:text-forest transition-colors mb-3 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-forest" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">My Wallets & Accounts</h1>
            <p className="text-xs text-ink-muted mt-1 font-medium">
              Manage your simulated Indian Rupee accounts, holds, and external funding sources
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="px-4 py-2 bg-forest hover:bg-forest-light text-white text-xs font-bold rounded-xl shadow-soft transition-all flex items-center space-x-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Deposit Funds</span>
          </button>
          <button
            onClick={() => setIsSendOpen(true)}
            className="px-4 py-2 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl shadow-soft transition-all flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transfer Money</span>
          </button>
        </div>
      </div>
      </div>

      {/* Main Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Primary Wallet */}
        <div className="bg-white rounded-3xl p-6 border-2 border-forest shadow-soft flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-forest-light text-white flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sage-light text-sage border border-sage/20 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>PRIMARY WALLET</span>
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <div className="text-xs text-ink-muted font-bold uppercase tracking-wider">Available Balance</div>
            <div className="text-3xl font-black text-ink tracking-tight">{formatPaise(balancePaise)}</div>
            <div className="text-[11px] text-ink-muted">INR &bull; Integer Paise Arithmetic</div>
          </div>

          <div className="pt-4 border-t border-cardborder text-xs space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-ink-muted">Account ID:</span>
              <button
                onClick={handleCopyId}
                className="font-mono text-ink font-bold flex items-center space-x-1 hover:text-forest"
              >
                <span>{(account?.id || 'acc_aman_001').substring(0, 16)}...</span>
                <Copy className="w-3 h-3 text-ink-muted" />
              </button>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-ink-muted">Account Type:</span>
              <span className="font-bold text-ink">USER_WALLET</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-ink-muted">Status:</span>
              <span className="font-bold text-sage">Active (No Overdraft)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Platform Hold Escrow */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-light text-amber flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-light text-amber border border-amber/20">
              ESCROW HOLD
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <div className="text-xs text-ink-muted font-bold uppercase tracking-wider">Active Holds (Pending Review)</div>
            <div className="text-3xl font-black text-ink tracking-tight">{formatPaise(activeHoldPaise)}</div>
            <div className="text-[11px] text-amber font-semibold">Protected in Safe Escrow</div>
          </div>

          <div className="pt-4 border-t border-cardborder text-xs space-y-2">
            <div className="text-[11px] text-ink-muted leading-relaxed">
              Funds safely reserved while our security check is completed. Released to the recipient upon verification, or refunded to you immediately.
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/transactions?status=UNDER_REVIEW')}
                className="text-xs font-bold text-forest hover:text-forest-light flex items-center space-x-1"
              >
                <span>View Held Payments</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: External Bank Bridge */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-canvas-alt text-forest flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-canvas-alt text-ink-muted border border-cardborder">
              SETTLEMENT BRIDGE
            </span>
          </div>

          <div className="space-y-1 mb-6">
            <div className="text-xs text-ink-muted font-bold uppercase tracking-wider">Linked Bank Account</div>
            <div className="text-xl font-black text-ink tracking-tight">HDFC Bank &bull;&bull;&bull;&bull; 4192</div>
            <div className="text-[11px] text-ink-muted">EXTERNAL_BANK System Counterparty</div>
          </div>

          <div className="pt-4 border-t border-cardborder text-xs space-y-2">
            <div className="text-[11px] text-ink-muted leading-relaxed">
              Connected funding bridge for deposits and cash withdrawals. Debits and credits maintain zero net discrepancy across the system.
            </div>
            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={() => setIsDepositOpen(true)}
                className="px-3 py-1.5 bg-canvas hover:bg-canvas-alt border border-cardborder rounded-lg text-xs font-bold text-ink"
              >
                Deposit
              </button>
              <button
                onClick={() => setIsSendOpen(true)}
                className="px-3 py-1.5 bg-canvas hover:bg-canvas-alt border border-cardborder rounded-lg text-xs font-bold text-ink"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mathematical Ledger Invariant Proof Card */}
      <div className="bg-forest text-white rounded-3xl p-6 border border-forest-dark shadow-medium flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-coral flex items-center justify-center shrink-0 shadow-sm">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-sage-light uppercase tracking-wider">
              Mathematical Balance Guarantee
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Cached Balance Strictly Equals Historical Ledger Entry Sum
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              Your wallet balance ({formatPaise(balancePaise)}) is derived directly from immutable signed transactions with 0 rounding errors.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/ledger')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all shrink-0"
        >
          View Full Ledger Explorer &rarr;
        </button>
      </div>

      {/* Modals */}
      <SendMoneyModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        onSendSuccess={({ recipient, amountPaise, note }) => {
          addTransaction({
            counterparty: recipient || 'Transfer',
            amountPaise: -amountPaise,
            type: 'TRANSFER',
            note,
          });
        }}
        currentBalance={balancePaise}
      />

      <AddFundsModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDepositSuccess={({ amountPaise, bankSource }) => {
          addFunds(amountPaise, bankSource);
        }}
      />
    </div>
  );
}
