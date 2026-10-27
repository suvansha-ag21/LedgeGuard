import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpDown,
  ShieldAlert,
  Search,
  Download,
  X
} from 'lucide-react';
import TransactionDrawer from '../components/TransactionDrawer.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Formats paise into plain Indian rupees matching the user's mockup (-₹500, -₹1,000, +₹12,000)
function formatMockupRupees(paise) {
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;
  const isWhole = absPaise % 100 === 0;
  const formatted = isWhole
    ? rupees.toLocaleString('en-IN')
    : rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (paise > 0) return `+₹${formatted}`;
  return `–₹${formatted}`;
}

export default function Transactions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from searchParams if present
  const initialTab = useMemo(() => {
    const rawStatus = (searchParams.get('status') || '').toUpperCase();
    if (rawStatus === 'UNDER_REVIEW' || rawStatus === 'HOLD' || rawStatus === 'HELD') {
      return 'NEEDS_ATTENTION';
    }
    const rawType = (searchParams.get('type') || '').toUpperCase();
    if (rawType === 'SENT') return 'SENT';
    if (rawType === 'RECEIVED') return 'RECEIVED';
    return 'ALL';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState(initialTab); // 'ALL' | 'SENT' | 'RECEIVED' | 'NEEDS_ATTENTION'
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Selected Transaction for Drawer
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const rawStatus = (searchParams.get('status') || '').toUpperCase();
    if (rawStatus === 'UNDER_REVIEW' || rawStatus === 'HOLD' || rawStatus === 'HELD') {
      setActiveTab('NEEDS_ATTENTION');
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'NEEDS_ATTENTION') {
      newParams.set('status', 'UNDER_REVIEW');
      newParams.delete('type');
    } else if (tab === 'SENT') {
      newParams.set('type', 'SENT');
      newParams.delete('status');
    } else if (tab === 'RECEIVED') {
      newParams.set('type', 'RECEIVED');
      newParams.delete('status');
    } else {
      newParams.delete('status');
      newParams.delete('type');
    }
    setSearchParams(newParams);
  };

  // Real-time reactive transactions from unified context
  const { transactions } = useAuth();

  // Filter & Search logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Tab filter
      if (activeTab === 'SENT' && tx.amount_paise >= 0) return false;
      if (activeTab === 'RECEIVED' && tx.amount_paise <= 0) return false;
      if (activeTab === 'NEEDS_ATTENTION' && !tx.isReviewRequired) return false;

      // 2. Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          tx.counterparty.toLowerCase().includes(term) ||
          tx.subtitle.toLowerCase().includes(term) ||
          tx.status.toLowerCase().includes(term) ||
          tx.id.toLowerCase().includes(term) ||
          (Math.abs(tx.amount_paise) / 100).toString().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, activeTab, searchTerm]);

  // Sort logic
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [filteredTransactions, sortAsc]);

  // Group transactions by date label preserving order
  const groupedTransactions = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    sortedTransactions.forEach((tx) => {
      const groupKey = tx.dateGroup || 'TODAY · 24 OCTOBER';
      if (!groupMap.has(groupKey)) {
        const newGroup = { label: groupKey, items: [] };
        groupMap.set(groupKey, newGroup);
        groups.push(newGroup);
      }
      groupMap.get(groupKey).items.push(tx);
    });

    return groups;
  }, [sortedTransactions]);

  const handleRowClick = (tx) => {
    setSelectedTx(tx);
    setIsDrawerOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Counterparty', 'Type', 'Amount (INR)', 'Status'];
    const rows = sortedTransactions.map((tx) => [
      tx.id,
      tx.created_at,
      tx.counterparty,
      tx.displayType,
      (tx.amount_paise / 100).toFixed(2),
      tx.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledgerguard_activity_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-ink-muted hover:text-forest transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-forest" />
          <span>Back to Dashboard</span>
        </button>

        {/* Right tools (Search & CSV Export) */}
        <div className="flex items-center space-x-2">
          {showSearch ? (
            <div className="relative animate-in fade-in duration-150">
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search payments..."
                className="pl-8 pr-7 py-1.5 bg-white rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 shadow-soft w-48 sm:w-64"
              />
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowSearch(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-xl bg-white hover:bg-canvas-alt border border-cardborder text-ink-muted hover:text-ink transition-all shadow-soft"
              title="Search transactions"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-canvas-alt border border-cardborder text-ink-muted hover:text-ink text-xs font-bold rounded-xl transition-all shadow-soft flex items-center space-x-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Container Card Matching the User's Mockup */}
      <div className="bg-[#FAF9F5] rounded-3xl p-6 sm:p-8 border border-cardborder/80 shadow-soft space-y-6">
        {/* Title Header with Sort Toggle (⇅) */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-serif sm:font-sans">
              Transaction activity
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted font-normal">
              Track every payment, all in one place.
            </p>
          </div>

          {/* Up-Down Sort Icon Button (⇅) */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="w-10 h-10 rounded-2xl bg-white hover:bg-canvas border border-cardborder/80 flex items-center justify-center text-ink hover:text-forest transition-colors shadow-soft"
            title={sortAsc ? 'Sorted: Oldest first (click for Newest)' : 'Sorted: Newest first (click for Oldest)'}
            aria-label="Toggle sort order"
          >
            <ArrowUpDown className="w-4 h-4 text-ink" />
          </button>
        </div>

        {/* Filter Pills (All activity, Sent, Received, Needs attention) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleTabChange('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-ink text-white shadow-soft'
                : 'bg-white border border-cardborder text-ink-muted hover:text-ink hover:bg-canvas shadow-xs'
            }`}
          >
            All activity
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('SENT')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'SENT'
                ? 'bg-ink text-white shadow-soft'
                : 'bg-white border border-cardborder text-ink-muted hover:text-ink hover:bg-canvas shadow-xs'
            }`}
          >
            Sent
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('RECEIVED')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'RECEIVED'
                ? 'bg-ink text-white shadow-soft'
                : 'bg-white border border-cardborder text-ink-muted hover:text-ink hover:bg-canvas shadow-xs'
            }`}
          >
            Received
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('NEEDS_ATTENTION')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'NEEDS_ATTENTION'
                ? 'bg-ink text-white shadow-soft'
                : 'bg-white border border-cardborder text-ink-muted hover:text-ink hover:bg-canvas shadow-xs'
            }`}
          >
            <span>Needs attention</span>
            {transactions.some((t) => t.isReviewRequired) && (
              <span className={`w-2 h-2 rounded-full ${
                activeTab === 'NEEDS_ATTENTION' ? 'bg-coral' : 'bg-amber'
              }`}></span>
            )}
          </button>
        </div>

        {/* Grouped Transactions Inner Card (White with Rounded Corners) */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-cardborder/70 shadow-soft space-y-6">
          {groupedTransactions.length === 0 ? (
            <div className="py-12 text-center text-ink-muted space-y-2">
              <p className="font-bold text-sm text-ink">No transactions found</p>
              <p className="text-xs">Try selecting a different filter pill above.</p>
            </div>
          ) : (
            groupedTransactions.map((group, groupIdx) => (
              <div key={group.label} className="space-y-4">
                {/* Date Group Heading (e.g. TODAY · 24 OCTOBER) */}
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  {group.label}
                </div>

                {/* Items in this group */}
                <div className="space-y-0">
                  {group.items.map((tx, itemIdx) => {
                    const isPositive = tx.amount_paise > 0;
                    return (
                      <React.Fragment key={tx.id}>
                        <div
                          onClick={() => handleRowClick(tx)}
                          className="py-3.5 flex items-center justify-between cursor-pointer group hover:bg-canvas-alt/40 -mx-3 px-3 rounded-2xl transition-all"
                        >
                          {/* Left: Icon & Details */}
                          <div className="flex items-center space-x-3.5 min-w-0">
                            {/* Icon Container matching mockup */}
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                tx.isReviewRequired
                                  ? 'bg-[#FEECEB] text-coral border border-coral/20'
                                  : 'bg-[#E7F6ED] text-[#1E7E4E]'
                              }`}
                            >
                              {tx.isReviewRequired ? (
                                <ShieldAlert className="w-5 h-5 text-coral" />
                              ) : isPositive ? (
                                <ArrowDownLeft className="w-5 h-5 text-[#1E7E4E]" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 text-[#1E7E4E]" />
                              )}
                            </div>

                            {/* Name, Subtitle, and Status Text */}
                            <div className="min-w-0">
                              <div className="text-sm sm:text-base font-bold text-ink leading-tight truncate">
                                {tx.counterparty}
                              </div>
                              <div className="text-xs text-ink-muted mt-0.5 font-normal">
                                {tx.subtitle}
                              </div>
                              <div className="mt-0.5">
                                {tx.isReviewRequired ? (
                                  <span className="text-xs font-semibold text-[#A86414]">
                                    Security review required
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-[#1E7E4E]">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount & View details ↗ */}
                          <div className="text-right shrink-0 pl-3">
                            <div
                              className={`text-sm sm:text-base font-bold tracking-tight font-mono ${
                                isPositive ? 'text-[#1E7E4E]' : 'text-ink'
                              }`}
                            >
                              {formatMockupRupees(tx.amount_paise)}
                            </div>
                            <div className="text-xs text-ink-muted group-hover:text-ink font-normal flex items-center justify-end gap-0.5 mt-0.5 transition-colors">
                              <span>
                                {tx.isReviewRequired ? 'Review details' : 'View details'}
                              </span>
                              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Divider between items in the same group */}
                        {itemIdx < group.items.length - 1 && (
                          <div className="border-b border-cardborder/40 my-1"></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Divider between groups */}
                {groupIdx < groupedTransactions.length - 1 && (
                  <div className="border-b border-cardborder/30 pt-2"></div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Caption matching the user's mockup */}
        <div className="text-left pt-1">
          <span className="text-[11px] text-ink-muted/80 font-normal">
            Concept mockup · Illustrative transactions
          </span>
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
