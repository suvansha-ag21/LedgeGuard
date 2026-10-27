import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

const DEMO_DATA_VERSION = 'v2_rich_scenarios';

const DEFAULT_USER = {
  id: 'usr_aman_001',
  name: 'Aman Sharma',
  email: 'aman@ledgerguard.internal',
  role: 'USER',
};

const DEFAULT_ACCOUNT = {
  id: 'acc_aman_001',
  user_id: 'usr_aman_001',
  name: 'Aman Sharma (Wallet)',
  type: 'USER_WALLET',
  currency: 'INR',
  cached_balance: 1485000, // ₹14,850.00
  status: 'ACTIVE',
};

const INITIAL_TRANSACTIONS = [
  {
    id: 'tx_coffee_010',
    dateGroup: 'TODAY · 24 OCTOBER',
    created_at: '2026-10-24T17:15:00Z',
    counterparty: 'Blue Tokai Coffee Roasters',
    subtitle: 'UPI QR In-Store · 5:15 PM',
    timeAgo: 'Money sent · 5:15 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'Blue Tokai Coffee',
    amount_paise: -38000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 4,
    risk_level: 'LOW',
    idempotency_key: 'idem_coffee_8421',
    note: 'Cold Brew & Croissant · Bengaluru Cafe Counter #2',
  },
  {
    id: 'tx_riya_001',
    dateGroup: 'TODAY · 24 OCTOBER',
    created_at: '2026-10-24T15:54:00Z',
    counterparty: 'Riya Sharma',
    subtitle: 'Money sent · 3:54 PM',
    timeAgo: 'Money sent · 3:54 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'Riya Sharma',
    amount_paise: -50000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 12,
    risk_level: 'LOW',
    idempotency_key: 'idem_riya_f8391',
    note: 'Weekend lunch split',
  },
  {
    id: 'tx_shadow_002',
    dateGroup: 'TODAY · 24 OCTOBER',
    created_at: '2026-10-24T13:45:00Z',
    counterparty: 'ShadowCrypto OTC',
    subtitle: 'Money sent · 1:45 PM',
    timeAgo: 'Money sent · 1:45 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'ShadowCrypto OTC',
    amount_paise: -100000,
    status: 'Under Review',
    statusText: 'Security review required',
    isReviewRequired: true,
    risk_score: 88,
    risk_level: 'CRITICAL',
    idempotency_key: 'idem_shadow_hold_910',
    note: 'Peer-to-peer crypto exchange · Flagged OTC syndicate',
  },
  {
    id: 'tx_salary_003',
    dateGroup: 'YESTERDAY · 23 OCTOBER',
    created_at: '2026-10-23T10:15:00Z',
    counterparty: 'Salary deposit',
    subtitle: 'Received from external bank',
    timeAgo: 'Received from external bank',
    type: 'DEPOSIT',
    displayType: 'Deposit',
    from: 'EXTERNAL_BANK',
    to: 'Aman (Wallet)',
    amount_paise: 1200000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 5,
    risk_level: 'LOW',
    idempotency_key: 'idem_salary_4920',
    note: 'Direct monthly payroll bridge · TechCorp Services',
  },
  {
    id: 'tx_amazon_009',
    dateGroup: '22 OCTOBER',
    created_at: '2026-10-22T17:20:00Z',
    counterparty: 'Amazon India Marketplace',
    subtitle: 'Merchant payment · 5:20 PM',
    timeAgo: 'Merchant payment · 5:20 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'Amazon Pay Merchant',
    amount_paise: -349900,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 6,
    risk_level: 'LOW',
    idempotency_key: 'idem_amzn_9921',
    note: 'Order #402-8921-99 · Mechanical Keyboard',
  },
  {
    id: 'tx_aditya_004',
    dateGroup: '22 OCTOBER',
    created_at: '2026-10-22T14:40:00Z',
    counterparty: 'Aditya Singh',
    subtitle: 'Money sent · 2:40 PM',
    timeAgo: 'Money sent · 2:40 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'Aditya Singh',
    amount_paise: -120000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 18,
    risk_level: 'LOW',
    idempotency_key: 'idem_aditya_3019',
    note: 'Concert ticket contribution',
  },
  {
    id: 'tx_telegram_008',
    dateGroup: '21 OCTOBER',
    created_at: '2026-10-21T16:25:00Z',
    counterparty: 'Telegram Task Scam Syndicate',
    subtitle: 'Unauthorized transfer · Intercepted',
    timeAgo: 'Payment Blocked · 4:25 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'Task Scam Syndicate (unverified)',
    amount_paise: -1500000,
    status: 'Under Review',
    statusText: 'Security review required',
    isReviewRequired: true,
    risk_score: 95,
    risk_level: 'CRITICAL',
    idempotency_key: 'idem_telegram_scam_88',
    note: 'Advance-fee task scam syndicate flagged by CERT-In · Funds protected in escrow',
  },
  {
    id: 'tx_bescom_011',
    dateGroup: '21 OCTOBER',
    created_at: '2026-10-21T14:10:00Z',
    counterparty: 'BESCOM Electricity Board',
    subtitle: 'Utility bill pay · BBPS',
    timeAgo: 'Utility bill pay · 2:10 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'BESCOM Utility Bill',
    amount_paise: -215000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 2,
    risk_level: 'LOW',
    idempotency_key: 'idem_bescom_4102',
    note: 'October Home Electricity Bill · Consumer #881290',
  },
  {
    id: 'tx_ext_bank_005',
    dateGroup: '21 OCTOBER',
    created_at: '2026-10-21T11:30:00Z',
    counterparty: 'External Bank (HDFC)',
    subtitle: 'Withdrawal to external bank',
    timeAgo: 'Withdrawal to external bank',
    type: 'WITHDRAWAL',
    displayType: 'Withdrawal',
    from: 'Aman (Wallet)',
    to: 'HDFC Bank •••• 4192',
    amount_paise: -400000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 8,
    risk_level: 'LOW',
    idempotency_key: 'idem_hdfc_9941',
    note: 'Automated balance sweep to primary savings account',
  },
  {
    id: 'tx_refund_012',
    dateGroup: '20 OCTOBER',
    created_at: '2026-10-20T20:45:00Z',
    counterparty: 'Swiggy Instant Refund',
    subtitle: 'Merchant refund credit · 8:45 PM',
    timeAgo: 'Refund credited · 8:45 PM',
    type: 'RECEIVE',
    displayType: 'Received',
    from: 'Swiggy Refund Gateway',
    to: 'Aman (Wallet)',
    amount_paise: 64000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 2,
    risk_level: 'LOW',
    idempotency_key: 'idem_swiggy_ref_11',
    note: 'Cancelled order refund · Zero-Sum reversal',
  },
  {
    id: 'tx_zara_006',
    dateGroup: '20 OCTOBER',
    created_at: '2026-10-20T18:12:00Z',
    counterparty: 'Zara Khan',
    subtitle: 'Received from Zara Khan',
    timeAgo: 'Received from Zara Khan',
    type: 'RECEIVE',
    displayType: 'Received',
    from: 'Zara Khan',
    to: 'Aman (Wallet)',
    amount_paise: 350000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 10,
    risk_level: 'LOW',
    idempotency_key: 'idem_zara_7811',
    note: 'UI Design Consultation milestone fee',
  },
  {
    id: 'tx_rohit_007',
    dateGroup: '19 OCTOBER',
    created_at: '2026-10-19T13:05:00Z',
    counterparty: 'Rohit Verma',
    subtitle: 'Money sent · 1:05 PM',
    timeAgo: 'Money sent · 1:05 PM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'Rohit Verma',
    amount_paise: -850000,
    status: 'Under Review',
    statusText: 'Security review required',
    isReviewRequired: true,
    risk_score: 74,
    risk_level: 'HIGH',
    idempotency_key: 'idem_rohit_9022',
    note: 'Suspicious cross-border remittance routing pattern',
  },
  {
    id: 'tx_kavita_014',
    dateGroup: '18 OCTOBER',
    created_at: '2026-10-18T19:20:00Z',
    counterparty: 'Kavita Rao',
    subtitle: 'Received from Kavita Rao',
    timeAgo: 'Received · 7:20 PM',
    type: 'RECEIVE',
    displayType: 'Received',
    from: 'Kavita Rao',
    to: 'Aman (Wallet)',
    amount_paise: 420000,
    status: 'Completed',
    statusText: 'Completed',
    isReviewRequired: false,
    risk_score: 7,
    risk_level: 'LOW',
    idempotency_key: 'idem_kavita_331',
    note: 'Weekend getaway resort booking share',
  },
  {
    id: 'tx_gaming_013',
    dateGroup: '18 OCTOBER',
    created_at: '2026-10-18T02:14:00Z',
    counterparty: 'ApexPay Gaming Gateway',
    subtitle: 'Off-hours burst debit · 2:14 AM',
    timeAgo: 'Held for Review · 2:14 AM',
    type: 'TRANSFER',
    displayType: 'Sent',
    from: 'Aman (Wallet)',
    to: 'ApexPay Gaming',
    amount_paise: -500000,
    status: 'Under Review',
    statusText: 'Security review required',
    isReviewRequired: true,
    risk_score: 81,
    risk_level: 'HIGH',
    idempotency_key: 'idem_apex_burst_90',
    note: 'Anomaly detected: Off-hours velocity spike (2:14 AM) with new merchant signature',
  },
];

const INITIAL_SESSIONS = [
  {
    id: 'sess_current_01',
    device: 'MacBook Pro',
    subtitle: 'Current device · Active now',
    location: 'Bengaluru, Karnataka, India',
    ip: '103.212.145.88',
    browser: 'Chrome 124.0',
    isCurrent: true,
    isTrusted: true,
  },
  {
    id: 'sess_mobile_02',
    device: 'iPhone 15 Pro',
    subtitle: 'Last active 3 hours ago',
    location: 'Bengaluru, Karnataka, India',
    ip: '103.212.145.92',
    browser: 'LedgerGuard iOS v2.1',
    isCurrent: false,
    isTrusted: true,
  },
  {
    id: 'sess_unknown_03',
    device: 'Windows 11 PC',
    subtitle: 'Firefox 125 · New Delhi · Yesterday',
    location: 'New Delhi, Delhi, India',
    ip: '49.207.181.12',
    browser: 'Firefox 125.0',
    isCurrent: false,
    isUnfamiliar: true,
  },
  {
    id: 'sess_office_04',
    device: 'Office iMac 27"',
    subtitle: 'Safari 17.4 · Bengaluru HQ · 2 days ago',
    location: 'Bengaluru, Karnataka, India',
    ip: '182.74.92.14',
    browser: 'Safari 17.4',
    isCurrent: false,
    isTrusted: true,
  },
];

const INITIAL_REPORTS = [
  {
    id: 'REP-9021',
    date: '2026-10-24T18:30:00Z',
    target: 'WinPrize Festive Cashback (reward@instant-lottery.in)',
    reason: 'Fake festive reward collect request attempting to drain funds via UPI PIN trick',
    category: 'UPI Phishing',
    status: 'INVESTIGATING',
  },
  {
    id: 'REP-8812',
    date: '2026-10-15T11:00:00Z',
    target: 'ShadowCrypto OTC (+91 90000 00666)',
    reason: 'Flagged in banking fraud registry for rapid balance drains and unfulfilled crypto swaps',
    category: 'Scam Account',
    status: 'BLOCKED',
  },
  {
    id: 'REP-7740',
    date: '2026-10-12T09:15:00Z',
    target: 'Telegram "Like Videos to Earn ₹5,000/day" Scheme',
    reason: 'Advance-fee task scam syndicate impersonating YouTube recruitment partner',
    category: 'Syndicate Fraud',
    status: 'BLOCKED',
  },
  {
    id: 'REP-6523',
    date: '2026-10-08T14:20:00Z',
    target: 'ATM Terminal Koramangala 5th Block',
    reason: 'Skimmer device reported by multiple users; security alert triggered for card swipe freeze',
    category: 'Hardware Tamper',
    status: 'RESOLVED',
  },
  {
    id: 'REP-5109',
    date: '2026-09-28T16:45:00Z',
    target: 'AntivirusPro Billing Service (scam-sub@protect-now.in)',
    reason: 'Unauthorized recurring mandate debit attempt intercepted by Zero-Sum guard',
    category: 'Unauthorized Mandate',
    status: 'RESOLVED',
  },
];

function checkDemoVersion() {
  if (typeof window === 'undefined') return;
  try {
    const currentVer = localStorage.getItem('ledgerguard_demo_version');
    if (currentVer !== DEMO_DATA_VERSION) {
      localStorage.removeItem('ledgerguard_balance');
      localStorage.removeItem('ledgerguard_transactions');
      localStorage.removeItem('ledgerguard_sessions');
      localStorage.removeItem('ledgerguard_reports');
      localStorage.removeItem('ledgerguard_blocked_threats');
      localStorage.setItem('ledgerguard_demo_version', DEMO_DATA_VERSION);
    }
  } catch (e) {
    // Ignore storage issues
  }
}

function getStored(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    checkDemoVersion();
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function setStored(key, val) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    // Ignore quota issues
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Unified, persistent balance
  const [balancePaise, setBalancePaise] = useState(() => {
    return getStored('ledgerguard_balance', 1485000);
  });

  // Unified, persistent transactions list
  const [transactions, setTransactions] = useState(() => {
    return getStored('ledgerguard_transactions', INITIAL_TRANSACTIONS);
  });

  // Unified, persistent active sessions
  const [sessions, setSessions] = useState(() => {
    return getStored('ledgerguard_sessions', INITIAL_SESSIONS);
  });

  // Unified, persistent security incident reports
  const [reports, setReports] = useState(() => {
    return getStored('ledgerguard_reports', INITIAL_REPORTS);
  });

  // Blocked threat keys (e.g. ['winprize_collect'])
  const [blockedThreats, setBlockedThreats] = useState(() => {
    return getStored('ledgerguard_blocked_threats', []);
  });

  // Emergency Panic Lock state
  const [isFrozen, setIsFrozen] = useState(() => {
    return getStored('ledgerguard_is_frozen', false);
  });

  useEffect(() => {
    setStored('ledgerguard_is_frozen', isFrozen);
  }, [isFrozen]);

  const freezeAccount = (reason = 'Emergency User Lockdown') => {
    setIsFrozen(true);
    const newReport = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      target: 'Emergency Account Lockdown',
      reason,
      category: 'Panic Lock Triggered',
      status: 'LOCKED',
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const unfreezeAccount = (pin) => {
    // Demo accept any 4-digit PIN (default '1234')
    setIsFrozen(false);
    return true;
  };

  // Derived account state for backward compatibility
  const account = {
    ...DEFAULT_ACCOUNT,
    status: isFrozen ? 'FROZEN' : 'ACTIVE',
    cached_balance: balancePaise,
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      // Use local session fallback
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    setStored('ledgerguard_balance', balancePaise);
  }, [balancePaise]);

  useEffect(() => {
    setStored('ledgerguard_transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    setStored('ledgerguard_sessions', sessions);
  }, [sessions]);

  useEffect(() => {
    setStored('ledgerguard_reports', reports);
  }, [reports]);

  useEffect(() => {
    setStored('ledgerguard_blocked_threats', blockedThreats);
  }, [blockedThreats]);

  // Unified balance update
  const updateBalance = (deltaPaise) => {
    setBalancePaise((prev) => Math.max(0, prev + deltaPaise));
  };

  // Add a new transaction (send, receive, deposit, withdraw)
  const addTransaction = ({
    counterparty,
    subtitle,
    amountPaise,
    type = 'TRANSFER',
    status = 'Completed',
    statusText,
    isReviewRequired = false,
    risk_score = 12,
    risk_level = 'LOW',
    note = '',
    from,
    to,
  }) => {
    const isSent = amountPaise < 0;
    const isHold = isReviewRequired || status === 'Under Review' || status === 'UNDER_REVIEW';

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newTx = {
      id: `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      dateGroup: 'TODAY · 24 OCTOBER',
      created_at: now.toISOString(),
      counterparty: counterparty || (isSent ? 'Recipient' : 'Deposit'),
      subtitle: subtitle || (isSent ? `Money sent · ${timeString}` : `Received · ${timeString}`),
      timeAgo: `Just now · ${timeString}`,
      type,
      displayType: isSent ? 'Sent' : type === 'DEPOSIT' ? 'Deposit' : 'Received',
      from: from || (isSent ? 'Aman (Wallet)' : counterparty),
      to: to || (isSent ? counterparty : 'Aman (Wallet)'),
      amount_paise: amountPaise,
      status: isHold ? 'Under Review' : status,
      statusText: statusText || (isHold ? 'Security review required' : 'Completed'),
      isReviewRequired: isHold,
      risk_score: isHold ? 88 : risk_score,
      risk_level: isHold ? 'CRITICAL' : risk_level,
      idempotency_key: `idem_${Math.random().toString(36).substring(2, 10)}`,
      note: note || '',
    };

    // Update transactions list
    setTransactions((prev) => [newTx, ...prev]);

    // Update balance
    setBalancePaise((prev) => Math.max(0, prev + amountPaise));

    return newTx;
  };

  // Deposit funds convenience wrapper
  const addFunds = (amountPaise, bankSource = 'External Bank (HDFC)') => {
    return addTransaction({
      counterparty: bankSource,
      subtitle: 'Received from external bank',
      amountPaise: Math.abs(amountPaise),
      type: 'DEPOSIT',
      status: 'Completed',
      statusText: 'Completed',
      isReviewRequired: false,
      risk_score: 5,
      risk_level: 'LOW',
      note: 'Deposit from linked bank account',
      from: bankSource,
      to: 'Aman (Wallet)',
    });
  };

  // Revoke a single session
  const revokeSession = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Revoke all unfamiliar/suspicious sessions
  const revokeAllUnfamiliarSessions = () => {
    setSessions((prev) => prev.filter((s) => !s.isUnfamiliar));
  };

  // Block a threat (e.g. WinPrize phishing collect) and auto-create report
  const blockThreat = (threatKey, threatTitle, reason) => {
    setBlockedThreats((prev) => {
      if (prev.includes(threatKey)) return prev;
      return [...prev, threatKey];
    });

    const newReport = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      target: threatTitle || threatKey,
      reason: reason || 'Phishing / Suspicious activity blocked by user',
      category: 'Inbound Threat Blocked',
      status: 'BLOCKED',
    };
    setReports((prev) => [newReport, ...prev]);
  };

  // Add an incident report
  const addReport = ({ target, reason, category = 'User Reported' }) => {
    const newReport = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      target,
      reason,
      category,
      status: 'INVESTIGATING',
    };
    setReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  // Reset demo data back to clean factory defaults
  const resetToDefaults = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ledgerguard_balance');
      localStorage.removeItem('ledgerguard_transactions');
      localStorage.removeItem('ledgerguard_sessions');
      localStorage.removeItem('ledgerguard_reports');
      localStorage.removeItem('ledgerguard_blocked_threats');
      localStorage.removeItem('ledgerguard_is_frozen');
      localStorage.setItem('ledgerguard_demo_version', DEMO_DATA_VERSION);
    }
    setBalancePaise(1485000);
    setTransactions(INITIAL_TRANSACTIONS);
    setSessions(INITIAL_SESSIONS);
    setReports(INITIAL_REPORTS);
    setBlockedThreats([]);
    setIsFrozen(false);
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.auth.login({ email, password });
      if (res?.user) {
        setUser(res.user);
        await fetchCurrentUser();
      }
      return res;
    } catch (err) {
      setUser({ id: 'usr_aman_001', name: 'Aman Sharma', email, role: 'USER' });
      return { success: true };
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const res = await api.auth.register({ name, email, password, role: 'USER' });
      if (res?.user) {
        setUser(res.user);
        await fetchCurrentUser();
      }
      return res;
    } catch (err) {
      const newUsr = { id: `usr_${Date.now().toString(36)}`, name, email, role: 'USER' };
      setUser(newUsr);
      return { success: true, user: newUsr };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        balancePaise,
        transactions,
        sessions,
        reports,
        blockedThreats,
        isFrozen,
        freezeAccount,
        unfreezeAccount,
        loading,
        error,
        login,
        register,
        logout,
        updateBalance,
        addTransaction,
        addFunds,
        revokeSession,
        revokeAllUnfamiliarSessions,
        blockThreat,
        addReport,
        resetToDefaults,
        refreshAccount: fetchCurrentUser,
        fetchCurrentUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
