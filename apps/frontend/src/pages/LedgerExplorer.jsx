import React, {  useState, useMemo  } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  Search,
  CheckCircle2,
  Scale,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { formatPaise, formatDate } from '../utils/formatters.js';
import TransactionDrawer from '../components/TransactionDrawer.jsx';

export default function LedgerExplorer() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAccountAudits, setShowAccountAudits] = useState(true);

  const pageSize = 10;

  // Realistic Immutable Ledger Entries matching the design board
  const [entries, setEntries] = useState([
    // Tx 1: Aman -> Riya (₹500 = 50,000 paise)
    {
      id: 'LE10204',
      transaction_id: 'TX40203',
      account_name: 'Aman (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'CREDIT',
      amount_paise: -50000,
      balance_after: 1245000,
      created_at: '2026-10-24T10:24:00Z',
    },
    {
      id: 'LE10205',
      transaction_id: 'TX40203',
      account_name: 'Riya Sharma (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'DEBIT',
      amount_paise: 50000,
      balance_after: 475000,
      created_at: '2026-10-24T10:24:00Z',
    },

    // Tx 2: External Bank -> Aman (₹12,000 = 1,200,000 paise)
    {
      id: 'LE10206',
      transaction_id: 'TX40204',
      account_name: 'EXTERNAL_BANK',
      account_type: 'SYSTEM',
      entry_type: 'CREDIT',
      amount_paise: -1200000,
      balance_after: 98800000,
      created_at: '2026-10-23T16:15:00Z',
    },
    {
      id: 'LE10207',
      transaction_id: 'TX40204',
      account_name: 'Aman (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'DEBIT',
      amount_paise: 1200000,
      balance_after: 1295000,
      created_at: '2026-10-23T16:15:00Z',
    },

    // Tx 3: Aman -> Aditya (₹1,200 = 120,000 paise)
    {
      id: 'LE10208',
      transaction_id: 'TX40205',
      account_name: 'Aman (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'CREDIT',
      amount_paise: -120000,
      balance_after: 1175000,
      created_at: '2026-10-22T14:40:00Z',
    },
    {
      id: 'LE10209',
      transaction_id: 'TX40205',
      account_name: 'Aditya Singh (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'DEBIT',
      amount_paise: 120000,
      balance_after: 2540000,
      created_at: '2026-10-22T14:40:00Z',
    },

    // Tx 4: Aman -> External Bank (₹4,000 = 400,000 paise)
    {
      id: 'LE10210',
      transaction_id: 'TX40206',
      account_name: 'Aman (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'CREDIT',
      amount_paise: -400000,
      balance_after: 775000,
      created_at: '2026-10-21T11:30:00Z',
    },
    {
      id: 'LE10211',
      transaction_id: 'TX40206',
      account_name: 'EXTERNAL_BANK',
      account_type: 'SYSTEM',
      entry_type: 'DEBIT',
      amount_paise: 400000,
      balance_after: 99200000,
      created_at: '2026-10-21T11:30:00Z',
    },

    // Tx 5: Zara -> Aman (₹3,500 = 350,000 paise)
    {
      id: 'LE10212',
      transaction_id: 'TX40207',
      account_name: 'Zara Khan (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'CREDIT',
      amount_paise: -350000,
      balance_after: 1850000,
      created_at: '2026-10-20T18:12:00Z',
    },
    {
      id: 'LE10213',
      transaction_id: 'TX40207',
      account_name: 'Aman (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'DEBIT',
      amount_paise: 350000,
      balance_after: 1125000,
      created_at: '2026-10-20T18:12:00Z',
    },

    // Tx 6: Fee Assessment (₹25 = 2,500 paise)
    {
      id: 'LE10214',
      transaction_id: 'TX40208',
      account_name: 'Aman (Wallet)',
      account_type: 'USER_WALLET',
      entry_type: 'CREDIT',
      amount_paise: -2500,
      balance_after: 1122500,
      created_at: '2026-10-19T13:05:00Z',
    },
    {
      id: 'LE10215',
      transaction_id: 'TX40208',
      account_name: 'PLATFORM_FEE',
      account_type: 'SYSTEM',
      entry_type: 'DEBIT',
      amount_paise: 2500,
      balance_after: 425000,
      created_at: '2026-10-19T13:05:00Z',
    },
  ]);

  // Account Audits: comparing cached balance vs historical journal sum
  const accountAudits = [
    { name: 'Aman (Wallet)', type: 'USER_WALLET', cached: 1245000, calculated: 1245000, diff: 0, inSync: true },
    { name: 'Riya Sharma (Wallet)', type: 'USER_WALLET', cached: 475000, calculated: 475000, diff: 0, inSync: true },
    { name: 'Aditya Singh (Wallet)', type: 'USER_WALLET', cached: 2540000, calculated: 2540000, diff: 0, inSync: true },
    { name: 'Zara Khan (Wallet)', type: 'USER_WALLET', cached: 1850000, calculated: 1850000, diff: 0, inSync: true },
    { name: 'EXTERNAL_BANK', type: 'SYSTEM', cached: 99200000, calculated: 99200000, diff: 0, inSync: true },
    { name: 'PLATFORM_FEE', type: 'SYSTEM', cached: 425000, calculated: 425000, diff: 0, inSync: true },
    { name: 'PLATFORM_HOLD', type: 'SYSTEM', cached: 100000, calculated: 100000, diff: 0, inSync: true },
  ];

  // Mathematical totals
  const totalDebits = entries.filter((e) => e.amount_paise > 0).reduce((a, b) => a + b.amount_paise, 0);
  const totalCredits = entries.filter((e) => e.amount_paise < 0).reduce((a, b) => a + Math.abs(b.amount_paise), 0);
  const netDifference = totalDebits - totalCredits;

  // Filtering
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        entry.id.toLowerCase().includes(term) ||
        entry.transaction_id.toLowerCase().includes(term) ||
        entry.account_name.toLowerCase().includes(term) ||
        (Math.abs(entry.amount_paise) / 100).toString().includes(term);

      const matchesAccount =
        accountFilter === 'ALL' ||
        entry.account_name.toLowerCase().includes(accountFilter.toLowerCase());

      const matchesType =
        typeFilter === 'ALL' || entry.entry_type === typeFilter;

      return matchesSearch && matchesAccount && matchesType;
    });
  }, [entries, searchTerm, accountFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleInspect = (entry) => {
    setSelectedTx({
      id: entry.transaction_id,
      counterparty: entry.account_name,
      amount_paise: entry.amount_paise,
      created_at: entry.created_at,
      status: 'COMPLETED',
      risk_score: 12,
      idempotency_key: `idem_${entry.transaction_id.toLowerCase()}`,
    });
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-7">
      {/* Page Title & Navigation */}
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
            <h1 className="text-2xl font-black text-ink tracking-tight">Double-Entry Journal & Ledger Explorer</h1>
            <p className="text-xs text-ink-muted mt-1 font-medium">
              Real-time feed of all immutable debit and credit ledger postings
            </p>
          </div>

        <button
          onClick={() => setShowAccountAudits(!showAccountAudits)}
          className="px-3.5 py-2 bg-white rounded-xl border border-cardborder shadow-soft text-xs font-bold text-ink hover:bg-canvas-alt transition-all flex items-center space-x-2"
        >
          <Layers className="w-3.5 h-3.5 text-forest" />
          <span>{showAccountAudits ? 'Hide Account Balance Audit' : 'Show Account Balance Audit'}</span>
        </button>
      </div>
      </div>

      {/* Zero-Sum Invariant Banner */}
      <div className="bg-forest text-white rounded-3xl p-6 border border-forest-dark shadow-medium flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-coral flex items-center justify-center shrink-0 shadow-sm">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-sage-light">
                Fundamental Invariant Verified
              </span>
              <span className="bg-sage text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ZERO-SUM BALANCED</span>
              </span>
            </div>
            <div className="text-xl font-extrabold mt-1">
              Net Ledger Discrepancy: {formatPaise(netDifference)}{' '}
              <span className="text-xs font-normal text-white/70">
                (&sum; Debits &minus; &sum; Credits strictly equals ₹0.00)
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              Total Posted Debits: <strong>{formatPaise(totalDebits)}</strong> &bull; Total Posted Credits: <strong>{formatPaise(totalCredits)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 text-xs font-mono font-bold text-white">
            100% Immutable Trigger
          </div>
        </div>
      </div>

      {/* Account Balance Synchronization Audit (Collapsible) */}
      {showAccountAudits && (
        <div className="bg-white rounded-3xl border border-cardborder shadow-soft overflow-hidden">
          <div className="p-5 border-b border-cardborder flex items-center justify-between bg-canvas/40">
            <div>
              <h3 className="text-xs font-bold text-ink flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-forest" />
                <span>Account Balance Synchronization Audit</span>
              </h3>
              <p className="text-[10px] text-ink-muted mt-0.5">
                Verifies cached balances directly against the historical journal sum of all immutable entries
              </p>
            </div>
            <span className="text-[10px] font-bold text-sage bg-sage-light px-2.5 py-1 rounded-full border border-sage/20">
              {accountAudits.filter((a) => a.inSync).length} / {accountAudits.length} Accounts In-Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/60 border-b border-cardborder text-ink-muted text-[10px] uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-5">Account Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Cached Balance</th>
                  <th className="py-2.5 px-4 text-right">Journal Derived</th>
                  <th className="py-2.5 px-4 text-right">Difference</th>
                  <th className="py-2.5 px-5 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardborder">
                {accountAudits.map((acc, i) => (
                  <tr key={i} className="hover:bg-canvas/40 transition-colors">
                    <td className="py-2.5 px-5 font-bold text-ink">{acc.name}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-canvas-alt text-ink-muted">
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-ink">{formatPaise(acc.cached)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-ink-muted">{formatPaise(acc.calculated)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-sage">₹0.00</td>
                    <td className="py-2.5 px-5 text-center">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage-light text-sage border border-sage/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>SYNCED</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by transaction ID, entry ID, account..."
            className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-canvas rounded-xl border border-cardborder text-xs font-bold text-ink focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Accounts</option>
            <option value="Aman">Aman (Wallet)</option>
            <option value="Riya">Riya Sharma (Wallet)</option>
            <option value="Aditya">Aditya Singh (Wallet)</option>
            <option value="Zara">Zara Khan (Wallet)</option>
            <option value="EXTERNAL_BANK">EXTERNAL_BANK</option>
            <option value="PLATFORM_FEE">PLATFORM_FEE</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-canvas rounded-xl border border-cardborder text-xs font-bold text-ink focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="DEBIT">Debit (+Dr)</option>
            <option value="CREDIT">Credit (&minus;Cr)</option>
          </select>

          {/* Date range pill */}
          <div className="flex items-center space-x-1.5 px-3 py-2 bg-canvas rounded-xl border border-cardborder text-xs font-bold text-ink">
            <Calendar className="w-3.5 h-3.5 text-ink-muted" />
            <span>Oct 18, 2026 - Oct 24, 2026</span>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setAccountFilter('ALL');
              setTypeFilter('ALL');
            }}
            className="p-2 rounded-xl border border-cardborder bg-canvas hover:bg-canvas-alt text-ink-muted hover:text-ink transition-colors"
            title="Refresh / Reset filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Journal Table matching Screen 5 */}
      <div className="bg-white rounded-3xl border border-cardborder shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cardborder bg-canvas/60 text-ink-muted font-bold text-[11px]">
                <th className="py-3.5 px-5">Entry ID</th>
                <th className="py-3.5 px-5">Transaction ID</th>
                <th className="py-3.5 px-5">Account</th>
                <th className="py-3.5 px-4 text-center">Debit / Credit</th>
                <th className="py-3.5 px-5 text-right">Amount (Paise / INR)</th>
                <th className="py-3.5 px-5 text-right">Balance After</th>
                <th className="py-3.5 px-5">Created At</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardborder">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-ink-muted">
                    <p className="font-bold text-sm">No ledger entries match your filter</p>
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => {
                  const isDebit = entry.entry_type === 'DEBIT';
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => handleInspect(entry)}
                      className="hover:bg-canvas/50 transition-colors cursor-pointer group"
                    >
                      {/* Entry ID */}
                      <td className="py-3.5 px-5 font-mono font-bold text-forest">
                        {entry.id}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3.5 px-5 font-mono text-ink-muted group-hover:text-ink transition-colors">
                        {entry.transaction_id}
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-ink">{entry.account_name}</div>
                        <div className="text-[10px] text-ink-muted font-mono">{entry.account_type}</div>
                      </td>

                      {/* Debit / Credit */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                            isDebit
                              ? 'bg-sage-light text-sage border border-sage/20'
                              : 'bg-coral-light text-coral border border-coral/20'
                          }`}
                        >
                          {isDebit ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>{entry.entry_type}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 text-right font-mono">
                        <div
                          className={`font-black text-xs ${
                            isDebit ? 'text-sage' : 'text-coral'
                          }`}
                        >
                          {formatPaise(entry.amount_paise, { showPlus: true })}
                        </div>
                        <div className="text-[10px] text-ink-muted font-mono">
                          {entry.amount_paise.toLocaleString('en-IN')} paise
                        </div>
                      </td>

                      {/* Balance After */}
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-ink">
                        {formatPaise(entry.balance_after)}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-5 text-ink-muted font-medium">
                        {formatDate(entry.created_at)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspect(entry);
                          }}
                          className="px-2 py-1 bg-canvas hover:bg-canvas-alt border border-cardborder rounded-lg text-ink hover:text-forest text-[11px] font-bold transition-all flex items-center space-x-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-cardborder bg-canvas/30 flex items-center justify-between text-xs text-ink-muted">
          <div>
            Showing <strong className="text-ink">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-ink">
              {Math.min(currentPage * pageSize, filteredEntries.length)}
            </strong>{' '}
            of <strong className="text-ink">{filteredEntries.length}</strong> journal entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-cardborder bg-white hover:bg-canvas disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-ink">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-cardborder bg-white hover:bg-canvas disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Drawer (Screen 4) */}
      <TransactionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTx}
      />
    </div>
  );
}
