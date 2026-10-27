import React, {  useState  } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Wallet, 
  Building2, 
  Scale, 
  CheckCircle2, 
  Info, 
  User,
  Sparkles
} from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';

export default function MoneyMovementMap({ transaction }) {
  const [activeNode, setActiveNode] = useState('sender');

  if (!transaction) return null;

  const absAmount = Math.abs(transaction.amount_paise);
  const isDeposit = transaction.type === 'DEPOSIT';
  const isWithdrawal = transaction.type === 'WITHDRAWAL';
  const isBlockedOrHeld = transaction.status === 'Under Review' || transaction.status === 'BLOCKED' || transaction.status === 'Failed';

  const sourceName = isDeposit ? 'EXTERNAL_BANK' : (transaction.from || 'My Primary Wallet');
  const targetName = isWithdrawal ? 'EXTERNAL_BANK' : (transaction.to || transaction.counterparty || 'Recipient Wallet');
  const platformFeePaise = 0; // Simulated zero fee

  return (
    <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-extrabold text-ink">Money Movement Map</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-forest/10 text-forest border border-forest/20">
              Interactive Flow
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Click on any account node to inspect balance adjustments & formal ledger roles
          </p>
        </div>

        {/* Zero-Sum Invariant Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sage-light text-sage border border-sage/20 text-xs font-mono font-bold">
          <Scale className="w-3.5 h-3.5" />
          <span>Net Change: ₹0.00 (Balanced)</span>
        </div>
      </div>

      {/* Visual Node Flow */}
      <div className="relative py-4">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-16 right-16 -translate-y-1/2 h-0.5 bg-gradient-to-r from-coral/40 via-amber/40 to-sage/40 -z-0"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {/* Node 1: Source / Sender */}
          <div 
            onClick={() => setActiveNode('sender')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
              activeNode === 'sender' 
                ? 'bg-canvas-alt border-forest shadow-md ring-2 ring-forest/20' 
                : 'bg-canvas border-cardborder hover:border-forest/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-coral-light flex items-center justify-center text-coral">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-coral px-2 py-0.5 rounded-md bg-coral/10">
                Source Account
              </span>
            </div>
            <div className="text-xs font-extrabold text-ink truncate">{sourceName}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">Simulated User Wallet</div>
            <div className="mt-3 pt-3 border-t border-cardborder/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-ink-muted">Balance Delta:</span>
              <span className="text-xs font-mono font-extrabold text-coral">
                -{formatPaise(absAmount)}
              </span>
            </div>
          </div>

          {/* Node 2: Platform / Clearing */}
          <div 
            onClick={() => setActiveNode('platform')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
              activeNode === 'platform' 
                ? 'bg-canvas-alt border-forest shadow-md ring-2 ring-forest/20' 
                : 'bg-canvas border-cardborder hover:border-forest/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-light flex items-center justify-center text-amber">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber px-2 py-0.5 rounded-md bg-amber/10">
                Transit & Routing
              </span>
            </div>
            <div className="text-xs font-extrabold text-ink">LedgerGuard Engine</div>
            <div className="text-[11px] text-ink-muted mt-0.5">
              {isBlockedOrHeld ? 'Held in PLATFORM_HOLD' : 'Atomic PostgreSQL Bus'}
            </div>
            <div className="mt-3 pt-3 border-t border-cardborder/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-ink-muted">Platform Fee:</span>
              <span className="text-xs font-mono font-extrabold text-ink">
                ₹0.00
              </span>
            </div>
          </div>

          {/* Node 3: Target / Destination */}
          <div 
            onClick={() => setActiveNode('target')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
              activeNode === 'target' 
                ? 'bg-canvas-alt border-forest shadow-md ring-2 ring-forest/20' 
                : 'bg-canvas border-cardborder hover:border-forest/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-sage-light flex items-center justify-center text-sage">
                <User className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sage px-2 py-0.5 rounded-md bg-sage/10">
                Destination Account
              </span>
            </div>
            <div className="text-xs font-extrabold text-ink truncate">{targetName}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">Credited Beneficiary</div>
            <div className="mt-3 pt-3 border-t border-cardborder/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-ink-muted">Balance Delta:</span>
              <span className="text-xs font-mono font-extrabold text-sage">
                {isBlockedOrHeld ? '₹0.00 (Pending)' : `+${formatPaise(absAmount)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Explanatory Distinction Box */}
      <div className="bg-canvas-alt rounded-2xl p-4 border border-cardborder space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-ink">
          <Info className="w-4 h-4 text-forest" />
          <span>Node Details & Accounting Clarification</span>
        </div>

        {activeNode === 'sender' && (
          <div className="text-xs space-y-1.5 text-ink-muted">
            <p className="text-ink font-semibold">
              <strong className="text-coral">Wallet View:</strong> Sender's spendable balance decreases by {formatPaise(absAmount)}.
            </p>
            <p>
              <strong className="text-ink">Formal Accounting View:</strong> In LedgerGuard's double-entry journal, this creates a 
              <span className="font-mono text-coral font-bold"> CREDIT </span> entry with signed negative amount 
              (<code className="bg-white px-1 py-0.5 rounded text-coral font-bold">-{absAmount} paise</code>).
            </p>
          </div>
        )}

        {activeNode === 'platform' && (
          <div className="text-xs space-y-1.5 text-ink-muted">
            <p className="text-ink font-semibold">
              <strong className="text-amber">Routing Engine:</strong> Verified ascending lock ordering (<code>SELECT ... FOR UPDATE ORDER BY id ASC</code>) prevents deadlocks during atomic transfer execution.
            </p>
            <p>
              No platform processing fee was charged for this simulated transfer. Platform retention delta is <span className="font-mono font-bold text-ink">0 paise</span>.
            </p>
          </div>
        )}

        {activeNode === 'target' && (
          <div className="text-xs space-y-1.5 text-ink-muted">
            <p className="text-ink font-semibold">
              <strong className="text-sage">Wallet View:</strong> Beneficiary's spendable balance increases by {formatPaise(absAmount)}.
            </p>
            <p>
              <strong className="text-ink">Formal Accounting View:</strong> In LedgerGuard's double-entry journal, this creates a 
              <span className="font-mono text-sage font-bold"> DEBIT </span> entry with signed positive amount 
              (<code className="bg-white px-1 py-0.5 rounded text-sage font-bold">+{absAmount} paise</code>).
            </p>
          </div>
        )}
      </div>

      {/* Math Proof Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-2xl bg-canvas border border-cardborder text-xs font-mono">
        <span className="text-ink-muted">Zero-Sum Equation:</span>
        <div className="flex items-center space-x-2 font-bold text-ink mt-2 sm:mt-0">
          <span className="text-coral">(-{formatPaise(absAmount)})</span>
          <span>+</span>
          <span className="text-ink">₹0.00</span>
          <span>+</span>
          <span className="text-sage">(+{formatPaise(absAmount)})</span>
          <span>=</span>
          <span className="text-sage underline decoration-2">0 paise (Balanced)</span>
        </div>
      </div>
    </div>
  );
}
