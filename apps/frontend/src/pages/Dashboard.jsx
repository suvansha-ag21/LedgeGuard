import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Send,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  X,
  Eye,
  Download,
  Building2,
  CreditCard,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  QrCode
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatPaise } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import SendMoneyModal from '../components/SendMoneyModal.jsx';
import AddFundsModal from '../components/AddFundsModal.jsx';
import TransactionDrawer from '../components/TransactionDrawer.jsx';
import QRScannerModal from '../components/QRScannerModal.jsx';
import PaymentReceiptModal from '../components/PaymentReceiptModal.jsx';
import { triggerFishyAlert } from '../utils/fishyAlert.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user,
    balancePaise,
    transactions,
    blockedThreats,
    blockThreat,
    addTransaction,
    addFunds,
    isFrozen,
  } = useAuth();

  const [dismissActionCard, setDismissActionCard] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);
  const [timeRange, setTimeRange] = useState('Last 30 Days');

  // Dynamic metrics computed from real transactions
  const totalSentPaise = useMemo(() => {
    return transactions
      .filter((t) => t.amount_paise < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_paise), 0);
  }, [transactions]);

  const totalReceivedPaise = useMemo(() => {
    return transactions
      .filter((t) => t.amount_paise > 0)
      .reduce((sum, t) => sum + t.amount_paise, 0);
  }, [transactions]);

  const activeHoldsPaise = useMemo(() => {
    return transactions
      .filter((t) => t.isReviewRequired || t.status === 'Under Review' || t.status === 'UNDER_REVIEW')
      .reduce((sum, t) => sum + Math.abs(t.amount_paise), 0);
  }, [transactions]);

  const heldTransactionsCount = useMemo(() => {
    return transactions.filter(
      (t) => t.isReviewRequired || t.status === 'Under Review' || t.status === 'UNDER_REVIEW'
    ).length;
  }, [transactions]);

  // Money Flow (Last 30 Days) Dataset matching the exact design board
  const moneyFlowData = [
    { date: 'Sep 25', moneyIn: 12000, moneyOut: 4000, netBalance: 8000 },
    { date: 'Sep 30', moneyIn: 8500, moneyOut: 6200, netBalance: 10300 },
    { date: 'Oct 5', moneyIn: 14200, moneyOut: 7800, netBalance: 16700 },
    { date: 'Oct 10', moneyIn: 9800, moneyOut: 5400, netBalance: 21100 },
    { date: 'Oct 12', moneyIn: 18120, moneyOut: 6450, netBalance: 32770 },
    { date: 'Oct 15', moneyIn: 11300, moneyOut: 8900, netBalance: 35170 },
    { date: 'Oct 20', moneyIn: 16400, moneyOut: 12200, netBalance: 39370 },
    { date: 'Oct 24', moneyIn: 15500, moneyOut: 15200, netBalance: 12450 },
  ];

  // Find the flagged ShadowCrypto payment for the Action Required alert
  const flaggedPayment = useMemo(() => {
    return transactions.find((t) => t.id === 'tx_shadow_002') || transactions[1];
  }, [transactions]);

  // Top 5 recent transactions matching the mockup
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Handle Send Money action
  const handleSendSuccess = ({ recipient, amountPaise, note }) => {
    addTransaction({
      counterparty: recipient,
      amountPaise: -amountPaise,
      type: 'TRANSFER',
      note,
    });
  };

  // Handle Deposit action
  const handleDepositSuccess = ({ amountPaise, bankSource }) => {
    addFunds(amountPaise, bankSource);
  };

  const handleRowClick = (tx) => {
    setSelectedTx(tx);
    setIsDrawerOpen(true);
  };

  const handleReviewFlaggedPayment = () => {
    triggerFishyAlert({
      title: 'Suspicious Payment Placed On Hold!',
      category: 'PROTECTIVE ESCROW HOLD',
      recipient: 'ShadowCrypto OTC (+91 90000 00666)',
      amount: '₹1,000.00',
      reason:
        'This payment is currently held in protective escrow due to high-risk counterparty signals and anomalous outflow velocity.',
      signals: [
        'Recipient flagged across 3 partner banking networks for fraudulent balance drains',
        'Account age less than 15 days with 48% unverified dispute rate',
        'Peer-to-peer crypto OTC pattern matching known scam syndicates',
      ],
      safetyTip:
        'Funds held in protective review are safe in escrow. If this transfer was unauthorized, terminate the recipient immediately.',
      voiceMessage:
        'Security Notice: Payment of ₹1,000 to ShadowCrypto OTC is held in escrow review due to reported scam activity.',
      proceedText: 'Acknowledge Risk & Keep Held',
      onBlock: () => {
        blockThreat('shadow_crypto_block', 'ShadowCrypto OTC', 'Flagged crypto scammer syndicate');
      },
    });
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner & AI Slogan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight font-sans">
              Good Morning, {user?.name?.split(' ')[0] || 'Aman'}
            </h1>
            <span className="text-2xl animate-pulse">👋</span>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5 font-medium">
            Your money is secure, every transaction is monitored by AI.
          </p>
        </div>

        {/* Safe Payments Emblem */}
        <div className="hidden lg:flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl bg-white border border-cardborder shadow-soft">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <div className="text-left">
            <div className="text-[11px] font-bold text-ink leading-none">
              "Safe Payments.
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold leading-tight mt-0.5">
              A Smarter Tomorrow."
            </div>
          </div>
        </div>
      </div>

      {/* Hero 3-Column Row: Available Balance + Account Protection + Action Required */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        {/* Column 1: Available Balance Hero Card (Proportional ~42% width) */}
        <div className={`w-full ${dismissActionCard ? 'lg:w-[58%]' : 'lg:w-[42%]'} bg-gradient-to-br from-[#0F2922] via-[#143B30] to-[#0A1F1A] text-white rounded-3xl p-6 sm:p-7 shadow-medium flex flex-col justify-between relative overflow-hidden border border-[#1E4D40] min-w-0 shrink-0 lg:shrink`}>
          {/* Subtle Ambient Glow & Gold Circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Glowing 3D Wallet & Floating Gold Coins Illustration - Positioned in Upper-Right */}
          <div className="absolute right-3 sm:right-5 top-3 sm:top-4 w-36 sm:w-40 h-32 sm:h-36 pointer-events-none select-none opacity-90 sm:opacity-100">
            <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
              {/* Floating Gold Coin 1 */}
              <g transform="translate(110, 15)">
                <ellipse cx="14" cy="14" rx="13" ry="13" fill="url(#goldGrad1)" stroke="#FDE047" strokeWidth="1.5" />
                <ellipse cx="14" cy="14" rx="10" ry="10" fill="none" stroke="#CA8A04" strokeWidth="1" strokeDasharray="2 2" />
                <text x="14" y="19" textAnchor="middle" fill="#713F12" fontSize="13" fontWeight="900" fontFamily="sans-serif">₹</text>
              </g>

              {/* Floating Gold Coin 2 (Small) */}
              <g transform="translate(68, 25)">
                <ellipse cx="9" cy="9" rx="8.5" ry="8.5" fill="url(#goldGrad1)" stroke="#FDE047" strokeWidth="1.2" />
                <text x="9" y="12" textAnchor="middle" fill="#713F12" fontSize="9" fontWeight="900" fontFamily="sans-serif">₹</text>
              </g>

              {/* Floating Gold Coin 3 */}
              <g transform="translate(30, 48)">
                <ellipse cx="11" cy="11" rx="10.5" ry="10.5" fill="url(#goldGrad1)" stroke="#FDE047" strokeWidth="1.2" />
                <text x="11" y="15" textAnchor="middle" fill="#713F12" fontSize="10" fontWeight="900" fontFamily="sans-serif">₹</text>
              </g>

              {/* 3D Glowing Green Wallet Base */}
              <path
                d="M 50 65 L 138 52 C 144 51 149 55 149 61 L 146 112 C 146 118 141 123 135 124 L 46 135 C 40 136 34 131 34 125 L 37 76 C 37 70 43 66 50 65 Z"
                fill="url(#walletGrad1)"
                stroke="#34D399"
                strokeWidth="1.5"
              />
              {/* Wallet Flap */}
              <path
                d="M 36 78 C 36 72 41 67 48 66 L 136 53 C 143 52 148 56 148 62 L 148 82 C 148 88 142 93 135 94 L 46 103 C 40 104 36 100 36 94 Z"
                fill="url(#flapGrad1)"
                stroke="#6EE7B7"
                strokeWidth="1.2"
              />
              {/* Wallet Clasp / Gold Latch */}
              <g transform="translate(130, 72)">
                <rect x="0" y="0" width="18" height="15" rx="4" fill="url(#goldGrad1)" stroke="#FEF08A" strokeWidth="1" />
                <circle cx="8" cy="7.5" r="2.5" fill="#713F12" />
              </g>

              {/* Gradients */}
              <defs>
                <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="50%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#A16207" />
                </linearGradient>
                <linearGradient id="walletGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#064E3B" />
                  <stop offset="50%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#065F46" />
                </linearGradient>
                <linearGradient id="flapGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-2 text-white/80 text-xs font-semibold">
              <span>Available Balance</span>
              <Eye className="w-3.5 h-3.5 text-white/60 cursor-pointer hover:text-white" />
            </div>

            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                {formatPaise(balancePaise)}
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#184236] border border-[#235848] text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>12% +₹1,350 this month</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Send Money + Add Funds + Scan QR */}
          <div className="relative z-10 flex items-center space-x-2 pt-6 max-w-sm">
            <button
              onClick={() => {
                if (isFrozen) {
                  alert('Account is in Emergency Lockdown. Unlock your account to send money.');
                } else {
                  setIsSendOpen(true);
                }
              }}
              className={`flex-1 py-2.5 px-3 text-white text-xs font-extrabold rounded-2xl shadow-soft transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
                isFrozen ? 'bg-coral/80 hover:bg-coral' : 'bg-coral hover:bg-coral-hover'
              }`}
            >
              {isFrozen ? <Lock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isFrozen ? 'Locked' : 'Send'}</span>
            </button>
            <button
              onClick={() => setIsDepositOpen(true)}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center space-x-1 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add</span>
            </button>
            <button
              onClick={() => setIsQROpen(true)}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center space-x-1 active:scale-95"
              title="Scan UPI QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-300" />
              <span>QR</span>
            </button>
          </div>
        </div>

        {/* Column 2: Account Protection Card (Proportional ~28% width) */}
        <div className={`w-full ${dismissActionCard ? 'lg:w-[42%]' : 'lg:w-[28%]'} bg-white rounded-3xl p-6 border border-cardborder shadow-soft flex flex-col justify-between space-y-4 min-w-0 shrink-0 lg:shrink`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="text-sm font-bold text-ink">Account Protection</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F6ED] text-[#1E7E4E] shrink-0">
                Active
              </span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Your account is continuously monitored by LedgerGuard AI.
            </p>

            {/* 4 Protection Modules with Active Status */}
            <div className="space-y-2.5 pt-1">
              {[
                'Account takeover shield',
                'Transaction monitoring',
                'Fraud recipient check',
                'Device & login security',
              ].map((feature, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-ink/90 font-medium truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{feature}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Action Required Alert Card (Proportional ~30% width) */}
        {!dismissActionCard && (
          <div className="w-full lg:w-[30%] bg-[#FDF3F1] border border-[#F9D5CE] rounded-3xl p-6 shadow-soft flex flex-col justify-between space-y-4 animate-in fade-in min-w-0 shrink-0 lg:shrink">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-coral">
                  <div className="w-5 h-5 rounded-full bg-coral text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    !
                  </div>
                  <h3 className="text-sm font-black text-ink truncate">Action Required</h3>
                </div>
                <button
                  onClick={() => setDismissActionCard(true)}
                  className="w-6 h-6 rounded-full hover:bg-coral-light flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0"
                  title="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] font-bold text-coral flex items-center space-x-1">
                <span>1 suspicious payment on hold</span>
              </div>

              {/* Flagged Item Details Card */}
              <div className="p-3 bg-white/90 rounded-2xl border border-coral/20 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-coral-light text-coral flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-coral" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink truncate">
                      {flaggedPayment?.counterparty || 'ShadowCrypto OTC'}
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      24 Oct 2026, 01:45 PM
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="text-xs font-bold text-coral font-mono">
                    –₹1,000.00
                  </div>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    Under review
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed">
                This payment is on hold due to potential fraud risk (flagged recipient + unusual pattern).
              </p>
            </div>

            {/* Action Buttons: Review Payment + View Details */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={handleReviewFlaggedPayment}
                className="flex-1 py-2 px-2.5 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all text-center active:scale-95 truncate"
              >
                Review Payment
              </button>
              <button
                onClick={() => handleRowClick(flaggedPayment)}
                className="flex-1 py-2 px-2.5 bg-white hover:bg-canvas text-ink text-xs font-bold rounded-xl border border-cardborder transition-all text-center truncate"
              >
                View Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle Metric Cards Row (4 Grid Cards matching mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Sent */}
        <div className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-ink-muted block">Total Sent</span>
            <div className="text-2xl font-black text-ink tracking-tight font-sans">
              ₹15,200.00
            </div>
            <div className="text-[10px] font-bold text-coral flex items-center space-x-1">
              <span>↑ 12%</span>
              <span className="text-ink-muted font-normal">vs last month</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-coral-light text-coral flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 text-coral" />
          </div>
        </div>

        {/* Metric 2: Total Received */}
        <div className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-ink-muted block">Total Received</span>
            <div className="text-2xl font-black text-ink tracking-tight font-sans">
              ₹15,500.00
            </div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
              <span>↑ 28%</span>
              <span className="text-ink-muted font-normal">vs last month</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#E7F6ED] text-[#1E7E4E] flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5 text-[#1E7E4E]" />
          </div>
        </div>

        {/* Metric 3: Active Holds */}
        <div
          onClick={() => navigate('/transactions?status=UNDER_REVIEW')}
          className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft flex items-center justify-between cursor-pointer hover:border-amber/50 hover:shadow-medium transition-all group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-ink-muted block group-hover:text-amber-800 transition-colors">
              Active Holds
            </span>
            <div className="text-2xl font-black text-ink tracking-tight font-sans">
              ₹9,500.00
            </div>
            <div className="text-[10px] font-bold text-amber-700">
              {heldTransactionsCount > 0 ? `${heldTransactionsCount} payments on hold` : '2 payments held'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Metric 4: Risky Recipients */}
        <div
          onClick={() => navigate('/send')}
          className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft flex items-center justify-between cursor-pointer hover:border-coral/50 hover:shadow-medium transition-all group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-ink-muted block group-hover:text-coral transition-colors">
              Risky Recipients
            </span>
            <div className="text-2xl font-black text-coral tracking-tight font-sans">
              1 detected
            </div>
            <div className="text-[10px] font-medium text-ink-muted">
              Needs your attention
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-coral-light text-coral flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-coral" />
          </div>
        </div>
      </div>

      {/* Main Grid: Money Flow Chart (Left 60%) + Recent Transactions (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Money Flow (Last 30 Days) Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-cardborder shadow-soft flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-cardborder/40">
            <div>
              <h3 className="text-base font-bold text-ink tracking-tight font-sans">
                Money Flow <span className="text-xs font-normal text-ink-muted">(Last 30 Days)</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                See how your money moves in and out.
              </p>
            </div>

            {/* Filter Dropdown + Legend */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-3 text-[11px] font-semibold text-ink-muted">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1E7E4E]"></span>
                  <span>Money In</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-coral"></span>
                  <span>Money Out</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Net Balance</span>
                </span>
              </div>

              <div className="flex items-center space-x-1 px-3 py-1 bg-canvas rounded-xl border border-cardborder text-xs font-bold text-ink">
                <span>{timeRange}</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </div>
            </div>
          </div>

          {/* Interactive Composed Chart: Green Bars (Inflow), Coral Bars (Outflow), Gold Line (Net Balance) */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={moneyFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E2D9' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-forest text-white p-3.5 rounded-2xl shadow-elevated border border-forest-light text-xs font-sans space-y-1.5">
                          <div className="text-[11px] font-bold text-white/80 border-b border-white/10 pb-1">
                            {data.date} 2026
                          </div>
                          <div className="flex justify-between items-center space-x-4">
                            <span className="text-[#34D399]">Money In:</span>
                            <span className="font-mono font-bold text-white">₹{data.moneyIn.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center space-x-4">
                            <span className="text-coral">Money Out:</span>
                            <span className="font-mono font-bold text-white">₹{data.moneyOut.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center space-x-4 pt-1 border-t border-white/10">
                            <span className="text-amber-300 font-semibold">Net Balance:</span>
                            <span className="font-mono font-bold text-amber-300">₹{data.netBalance.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="moneyIn" fill="#1E7E4E" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="moneyOut" fill="#F15B43" radius={[4, 4, 0, 0]} barSize={12} />
                <Line
                  type="monotone"
                  dataKey="netBalance"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#F59E0B' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recent Transactions (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-cardborder shadow-soft flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-cardborder/40">
            <h3 className="text-base font-bold text-ink tracking-tight font-sans">
              Recent Transactions
            </h3>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs font-bold text-coral hover:text-coral-hover transition-colors flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exactly 5 Rows matching the mockup */}
          <div className="space-y-0.5 divide-y divide-cardborder/40">
            {recentTransactions.map((tx) => {
              const isPositive = tx.amount_paise > 0;
              const isReview = tx.status === 'Under Review' || tx.isReviewRequired;
              const absPaise = Math.abs(tx.amount_paise);
              const formattedAmt = (absPaise / 100).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const signedAmt = isPositive ? `+₹${formattedAmt}` : `–₹${formattedAmt}`;

              return (
                <div
                  key={tx.id}
                  onClick={() => handleRowClick(tx)}
                  className="py-3 px-2 rounded-2xl hover:bg-canvas transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Dynamic Avatar matching mockup */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                        isReview
                          ? 'bg-coral-light text-coral'
                          : isPositive
                          ? 'bg-[#E7F6ED] text-[#1E7E4E]'
                          : 'bg-forest/10 text-forest'
                      }`}
                    >
                      {isReview ? (
                        <ShieldAlert className="w-4 h-4 text-coral" />
                      ) : isPositive ? (
                        <ArrowDownLeft className="w-4 h-4 text-[#1E7E4E]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-forest" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-ink truncate group-hover:text-forest transition-colors">
                        {tx.counterparty}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill in Center/Right */}
                  <div className="flex items-center space-x-3 shrink-0 pl-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isReview
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#E7F6ED] text-[#1E7E4E]'
                      }`}
                    >
                      {isReview ? 'Under review' : 'Completed'}
                    </span>

                    <div className="text-right">
                      <div
                        className={`text-xs font-bold font-mono ${
                          isPositive ? 'text-[#1E7E4E]' : 'text-ink'
                        }`}
                      >
                        {signedAmt}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {tx.subtitle?.split('·')[0] || (isPositive ? 'Received' : 'Money sent')}
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-ink-muted/50 group-hover:text-forest group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions (5 Cards Grid matching mockup) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cardborder shadow-soft space-y-4">
        <div>
          <h3 className="text-base font-bold text-ink tracking-tight font-sans">
            Quick Actions
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Common tasks for your account
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Action 1: Send Money */}
          <div
            onClick={() => setIsSendOpen(true)}
            className="p-3.5 rounded-2xl bg-canvas hover:bg-canvas-alt border border-cardborder/80 cursor-pointer transition-all hover:shadow-soft flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-coral-light text-coral flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Send className="w-4 h-4 text-coral" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink group-hover:text-forest transition-colors truncate">
                Send Money
              </div>
              <div className="text-[10px] text-ink-muted truncate">
                To a contact or UPI ID
              </div>
            </div>
          </div>

          {/* Action 2: Receive Money */}
          <div
            onClick={() => navigate('/send')}
            className="p-3.5 rounded-2xl bg-canvas hover:bg-canvas-alt border border-cardborder/80 cursor-pointer transition-all hover:shadow-soft flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E7F6ED] text-[#1E7E4E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Download className="w-4 h-4 text-[#1E7E4E]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink group-hover:text-forest transition-colors truncate">
                Receive Money
              </div>
              <div className="text-[10px] text-ink-muted truncate">
                Share your QR code
              </div>
            </div>
          </div>

          {/* Action 3: Add Funds */}
          <div
            onClick={() => setIsDepositOpen(true)}
            className="p-3.5 rounded-2xl bg-canvas hover:bg-canvas-alt border border-cardborder/80 cursor-pointer transition-all hover:shadow-soft flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink group-hover:text-forest transition-colors truncate">
                Add Funds
              </div>
              <div className="text-[10px] text-ink-muted truncate">
                Top up your wallet
              </div>
            </div>
          </div>

          {/* Action 4: View Statements */}
          <div
            onClick={() => navigate('/transactions')}
            className="p-3.5 rounded-2xl bg-canvas hover:bg-canvas-alt border border-cardborder/80 cursor-pointer transition-all hover:shadow-soft flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink group-hover:text-forest transition-colors truncate">
                View Statements
              </div>
              <div className="text-[10px] text-ink-muted truncate">
                Download detailed ledger
              </div>
            </div>
          </div>

          {/* Action 5: Report Suspicious Activity */}
          <div
            onClick={() => navigate('/security')}
            className="p-3.5 rounded-2xl bg-canvas hover:bg-canvas-alt border border-cardborder/80 cursor-pointer transition-all hover:shadow-soft flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-ink group-hover:text-forest transition-colors truncate">
                Report Suspicious
              </div>
              <div className="text-[10px] text-ink-muted truncate">
                Help keep community safe
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Slide-over Drawer */}
      <SendMoneyModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        onSendSuccess={handleSendSuccess}
        currentBalance={balancePaise}
      />

      <AddFundsModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDepositSuccess={handleDepositSuccess}
      />

      <TransactionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTx}
      />

      <QRScannerModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      <PaymentReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />
    </div>
  );
}
