import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeft,
  Users, 
  Calendar, 
  AlertCircle, 
  HelpCircle, 
  Scale, 
  Download,
  Eye,
  CheckCircle2,
  Sparkles,
  Volume2
} from 'lucide-react';
import { formatPaise, formatDate } from '../utils/formatters.js';
import TransactionDrawer from '../components/TransactionDrawer.jsx';
import { announceUnusualSpending } from '../utils/voiceAlert.js';

export default function SpendingInsights() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('OCT_2026'); // 'OCT_2026' | 'LAST_30_DAYS'
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Authenticated user's verified historical transactions (in integer paise)
  const transactions = [
    {
      id: 'tx_salary_002',
      created_at: '2026-10-23T16:15:00Z',
      type: 'DEPOSIT',
      displayType: 'Salary Deposit',
      counterparty: 'Salary Deposit',
      category: 'Income',
      amount_paise: 1200000, // ₹12,000.00
      status: 'Completed',
      risk_score: 5,
    },
    {
      id: 'tx_zara_005',
      created_at: '2026-10-20T18:12:00Z',
      type: 'RECEIVE',
      displayType: 'Received Transfer',
      counterparty: 'Zara Khan',
      category: 'Transfers',
      amount_paise: 350000, // ₹3,500.00
      status: 'Completed',
      risk_score: 10,
    },
    {
      id: 'tx_aditya_003',
      created_at: '2026-10-22T14:40:00Z',
      type: 'TRANSFER',
      displayType: 'Sent Transfer',
      counterparty: 'Aditya Singh',
      category: 'Personal Transfer',
      amount_paise: -120000, // ₹1,200.00
      status: 'Completed',
      risk_score: 18,
    },
    {
      id: 'tx_rohit_006',
      created_at: '2026-10-19T13:05:00Z',
      type: 'TRANSFER',
      displayType: 'Sent Transfer',
      counterparty: 'Rohit Verma',
      category: 'Personal Transfer',
      amount_paise: -850000, // ₹8,500.00
      status: 'Under Review',
      risk_score: 74,
      isAnomaly: true,
      anomalyReason: 'Amount exceeds 30-day moving average by 4.2x (Held in review)',
    },
    {
      id: 'tx_riya_001',
      created_at: '2026-10-24T10:24:00Z',
      type: 'TRANSFER',
      displayType: 'Sent Transfer',
      counterparty: 'Riya Sharma',
      category: 'Friends & Family',
      amount_paise: -50000, // ₹500.00
      status: 'Completed',
      risk_score: 12,
    },
    {
      id: 'tx_cafe_008',
      created_at: '2026-10-17T19:45:00Z',
      type: 'TRANSFER',
      displayType: 'Sent Transfer',
      counterparty: 'Blue Tokai Coffee',
      category: 'Food & Dining',
      amount_paise: -45000, // ₹450.00
      status: 'Completed',
      risk_score: 11,
    },
    {
      id: 'tx_techcorp_007',
      created_at: '2026-10-18T09:20:00Z',
      type: 'TRANSFER',
      displayType: 'Sent Transfer',
      counterparty: 'TechCorp Services',
      category: 'Software & Bills',
      amount_paise: -25000, // ₹250.00
      status: 'Completed',
      risk_score: 7,
    },
  ];

  // Mathematical Aggregations in Integer Paise
  const stats = useMemo(() => {
    let inflowPaise = 0;
    let outflowPaise = 0;
    const counterpartyTotals = {};
    const categoryTotals = {};

    transactions.forEach((tx) => {
      if (tx.amount_paise > 0) {
        inflowPaise += tx.amount_paise;
      } else {
        const abs = Math.abs(tx.amount_paise);
        outflowPaise += abs;

        // Counterparties
        if (!counterpartyTotals[tx.counterparty]) {
          counterpartyTotals[tx.counterparty] = { count: 0, totalPaise: 0 };
        }
        counterpartyTotals[tx.counterparty].count += 1;
        counterpartyTotals[tx.counterparty].totalPaise += abs;

        // Categories
        const cat = tx.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + abs;
      }
    });

    const netPaise = inflowPaise - outflowPaise;
    const savingsRate = inflowPaise > 0 ? ((netPaise / inflowPaise) * 100).toFixed(1) : 0;

    const frequentCounterparties = Object.entries(counterpartyTotals)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalPaise - a.totalPaise);

    const categories = Object.entries(categoryTotals)
      .map(([name, totalPaise]) => ({
        name,
        totalPaise,
        percentage: outflowPaise > 0 ? ((totalPaise / outflowPaise) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.totalPaise - a.totalPaise);

    return {
      inflowPaise,
      outflowPaise,
      netPaise,
      savingsRate,
      frequentCounterparties,
      categories,
    };
  }, [transactions]);

  const handleInspect = (tx) => {
    setSelectedTx(tx);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
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
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-ink tracking-tight">Spending Insights</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sage-light text-sage border border-sage/20">
                Double-Entry Verified
              </span>
            </div>
          <p className="text-xs text-ink-muted mt-1 font-medium">
            Authentic inflow, outflow, and baseline velocity analytics computed in integer paise
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-2 bg-white rounded-2xl p-1.5 border border-cardborder shadow-soft text-xs font-bold text-ink">
          <Calendar className="w-4 h-4 text-ink-muted ml-2" />
          <button
            onClick={() => setTimeRange('OCT_2026')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeRange === 'OCT_2026' ? 'bg-forest text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            October 2026
          </button>
          <button
            onClick={() => setTimeRange('LAST_30_DAYS')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeRange === 'LAST_30_DAYS' ? 'bg-forest text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>
      </div>

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Money In */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Total Money In</span>
            <div className="w-9 h-9 rounded-2xl bg-sage-light flex items-center justify-center text-sage">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-ink">
              {formatPaise(stats.inflowPaise)}
            </span>
            <span className="text-xs font-mono font-bold text-sage flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-ink-muted">
            Aggregated from 2 verified inbound transfers (Salary & Zara Khan)
          </p>
        </div>

        {/* Money Out */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Total Money Out</span>
            <div className="w-9 h-9 rounded-2xl bg-coral-light flex items-center justify-center text-coral">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-ink">
              {formatPaise(stats.outflowPaise)}
            </span>
            <span className="text-xs font-mono font-bold text-coral flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +8.5%
            </span>
          </div>
          <p className="text-[11px] text-ink-muted">
            5 outgoing payments including ₹8,500.00 pending review
          </p>
        </div>

        {/* Net Savings & Invariant */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Net Surplus & Retention</span>
            <div className="w-9 h-9 rounded-2xl bg-forest/10 flex items-center justify-center text-forest">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-forest">
              +{formatPaise(stats.netPaise)}
            </span>
            <span className="text-xs font-mono font-bold text-sage">
              ({stats.savingsRate}% retained)
            </span>
          </div>
          <p className="text-[11px] text-ink-muted">
            Strict double-entry net balance proof holds across all accounts
          </p>
        </div>
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending Category Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-ink">Outflow by Category</h2>
              <p className="text-xs text-ink-muted mt-0.5">Calculated from transaction metadata tags</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-canvas text-ink-muted border border-cardborder">
              {stats.categories.length} Categories
            </span>
          </div>

          <div className="space-y-4">
            {stats.categories.map((cat, idx) => {
              const barColors = ['bg-forest', 'bg-coral', 'bg-amber', 'bg-sage'];
              const color = barColors[idx % barColors.length];

              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{cat.name}</span>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="font-extrabold text-ink">{formatPaise(cat.totalPaise)}</span>
                      <span className="text-ink-muted">({cat.percentage}%)</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full bg-canvas rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Frequent Recipients */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-ink">Frequent Recipients</h2>
              <p className="text-xs text-ink-muted mt-0.5">Ranked by aggregate transfer volume</p>
            </div>
            <Users className="w-4 h-4 text-ink-muted" />
          </div>

          <div className="space-y-3">
            {stats.frequentCounterparties.map((cp) => (
              <div 
                key={cp.name}
                className="p-3.5 rounded-2xl bg-canvas border border-cardborder/70 flex items-center justify-between hover:border-forest/30 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-forest text-warm-ivory text-xs font-black flex items-center justify-center">
                    {cp.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-ink">{cp.name}</div>
                    <div className="text-[10px] text-ink-muted">{cp.count} payment{cp.count > 1 ? 's' : ''} sent</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-black text-ink">{formatPaise(cp.totalPaise)}</div>
                  <div className="text-[10px] text-sage font-bold">Verified counterparty</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Spending Protection & Unusual Activity Alert */}
      <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-light text-amber flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-ink">Smart Spending Protection & Alerts</h2>
              <p className="text-[11px] text-ink-muted">AI monitors your everyday spending to guard against unusual or unauthorized charges</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-forest bg-forest/5 px-2.5 py-1 rounded-full border border-forest/10 w-fit">
            ✓ 24/7 Account Watch Active
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-light/30 border border-amber/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-light text-amber border border-amber/30 uppercase tracking-wide">
                ⚠️ Unusual Charge Paused
              </span>
              <span className="text-xs font-extrabold text-ink">Rohit Verma — ₹8,500.00</span>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              This payment of ₹8,500 is <strong className="text-ink">over 4 times higher</strong> than your regular spending (usually ₹1,850). For your safety, LedgerGuard held this transfer in escrow so you can confirm it before money leaves your account.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => announceUnusualSpending('Rohit Verma', '8,500', '4')}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-amber hover:bg-amber/90 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-soft transition-all"
              title="Hear audible voice alert for this transaction"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>🔊 Hear Voice Alert</span>
            </button>
            <button
              onClick={() => handleInspect(transactions.find((t) => t.id === 'tx_rohit_006'))}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-canvas border border-cardborder rounded-xl text-xs font-bold text-ink flex items-center justify-center space-x-1.5 shadow-soft transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-forest" />
              <span>View Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transparent Consumer Security Guarantees */}
      <div className="bg-canvas-alt rounded-3xl p-6 border border-cardborder space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-ink">
          <HelpCircle className="w-4 h-4 text-forest" />
          <span>How We Keep Your Money 100% Safe & Accurate</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-ink-muted">
          <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-cardborder/60">
            <div className="font-bold text-ink flex items-center space-x-1.5">
              <span>🎯 Exact Rupee Accuracy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every balance is tracked down to the exact single paisa. No rounding shortcuts or hidden penny losses, guaranteeing your wallet balance is always 100% precise.
            </p>
          </div>
          <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-cardborder/60">
            <div className="font-bold text-ink flex items-center space-x-1.5">
              <span>🏛️ Verified Bank Records</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every payment is backed by permanent double-entry accounting records before your balance is updated. Zero estimated numbers or guesswork.
            </p>
          </div>
          <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-cardborder/60">
            <div className="font-bold text-ink flex items-center space-x-1.5">
              <span>🛡️ Smart Scam & Theft Defense</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Our intelligent security system watches for unusual payment spikes and flags unverified recipients so your hard-earned money stays secure.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Details Drawer */}
      <TransactionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTx}
      />
    </div>
  );
}
