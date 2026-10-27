import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Send,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  Building2,
  Check,
  ChevronDown,
  Info,
  Volume2,
  Search,
  Star,
  Shield,
  HelpCircle,
  X,
  Plus,
  Activity,
  UserCheck,
  Wallet,
  Smartphone,
  Lightbulb,
  AlertOctagon,
  Clock,
  Scale
} from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import { evaluateRecipientTrust, RECIPIENT_TRUST_TIERS } from '@ledgerguard/core/risk/trustCheck';
import { evaluateAccountTakeoverRisk, ATO_THREAT_LEVELS, ATO_ENFORCEMENT_ACTIONS } from '@ledgerguard/core/risk/atoShield';
import {
  announceSuspiciousRecipient,
  announceAtoThreat,
  announceHeldPayment,
  announcePaymentSuccess,
  speakVoiceAlert,
  announceThreatBlocked
} from '../utils/voiceAlert.js';
import { triggerFishyAlert } from '../utils/fishyAlert.js';

export default function SendMoney() {
  const navigate = useNavigate();
  const location = useLocation();
  const { balancePaise, addTransaction, blockedThreats, blockThreat, isFrozen } = useAuth();
  const currentBalancePaise = balancePaise ?? 1485000;

  // Recipient search & filter state
  const [recipientFilter, setRecipientFilter] = useState('Recent'); // 'Recent' (active in mockup) | 'Contacts' | 'Bank Accounts' | 'UPI ID' | 'Saved'
  const [searchQuery, setSearchQuery] = useState('');

  // 4 Primary Recipients matching the exact design mockup
  const [recipientsList, setRecipientsList] = useState([
    {
      id: 'acc_riya',
      name: 'Riya Sharma',
      phone: '+91 98201 44810',
      rawPhone: '9820144810',
      upi: 'riya@okhdfc',
      badge: 'Verified',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      star: true,
      initials: 'RS',
      avatarBg: 'bg-[#E7F6ED] text-[#1E7E4E]',
      categories: ['Recent', 'Contacts', 'Saved', 'UPI ID'],
      trustScore: 12,
      riskLevel: 'Low Risk',
      isScam: false,
      reputationStatus: 'Good',
      patternStatus: 'Normal',
      fraudReportsStatus: 'None',
      atoStatus: 'No unusual activity',
    },
    {
      id: 'acc_aditya',
      name: 'Aditya Singh',
      phone: '+91 98112 33490',
      rawPhone: '9811233490',
      upi: 'aditya@oksbi',
      badge: 'Trusted',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/60',
      star: false,
      initials: 'AS',
      avatarBg: 'bg-[#EBF3FE] text-[#2563EB]',
      categories: ['Recent', 'Contacts', 'UPI ID'],
      trustScore: 15,
      riskLevel: 'Low Risk',
      isScam: false,
      reputationStatus: 'Good',
      patternStatus: 'Normal',
      fraudReportsStatus: 'None',
      atoStatus: 'No unusual activity',
    },
    {
      id: 'acc_zara',
      name: 'Zara Khan',
      phone: '+91 99304 88219',
      rawPhone: '9930488219',
      upi: 'zara@okaxis',
      badge: 'New',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
      star: false,
      initials: 'ZK',
      avatarBg: 'bg-[#F3EEFE] text-[#7C3AED]',
      categories: ['Contacts', 'Saved', 'UPI ID'],
      trustScore: 24,
      riskLevel: 'Low Risk',
      isScam: false,
      reputationStatus: 'Good',
      patternStatus: 'Normal',
      fraudReportsStatus: 'None',
      atoStatus: 'Standard limit',
    },
    {
      id: 'acc_shadow_crypto',
      name: 'ShadowCrypto',
      phone: '+91 90000 00666',
      rawPhone: '9000000666',
      upi: 'shadow@crypto.otc',
      badge: 'High Risk',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/60',
      star: false,
      initials: 'SC',
      avatarBg: 'bg-[#FEECEC] text-[#DC2626]',
      categories: ['Recent', 'UPI ID'],
      trustScore: 88,
      riskLevel: 'High Risk',
      isScam: true,
      reputationStatus: 'Flagged Scammer',
      patternStatus: 'Anomalous Velocity',
      fraudReportsStatus: '3 Confirmed Reports',
      atoStatus: 'Protective Hold Req.',
    },
    {
      id: 'acc_bank',
      name: 'External Bank',
      phone: '•••• 4192',
      rawPhone: '02261606161',
      upi: 'hdfc.bridge@rbi',
      badge: 'Self Account',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      star: false,
      initials: 'EB',
      isBank: true,
      avatarBg: 'bg-[#EDF2F7] text-[#475569]',
      categories: ['Bank Accounts'],
      trustScore: 0,
      riskLevel: 'Zero Risk',
      isScam: false,
      reputationStatus: 'Good',
      patternStatus: 'Normal',
      fraudReportsStatus: 'None',
      atoStatus: 'Self Linked Account',
    }
  ]);

  // Selected recipient (defaults to Riya Sharma matching mockup)
  const [selectedRecipient, setSelectedRecipient] = useState(recipientsList[0]);

  // Amount selection state (defaults to ₹1,000 matching mockup)
  const [amountRupees, setAmountRupees] = useState('1000');
  const [note, setNote] = useState('');
  const [selectedWalletSource, setSelectedWalletSource] = useState('Primary Wallet');
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);

  // New Recipient Modal
  const [isAddNewOpen, setIsAddNewOpen] = useState(false);
  const [newRecName, setNewRecName] = useState('');
  const [newRecPhone, setNewRecPhone] = useState('');

  // Interactive Simulator toggles for Demonstration
  const [simNewDevice, setSimNewDevice] = useState(false);
  const [simPasswordReset, setSimPasswordReset] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState(null);
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);

  // 5 Quick Amount chips matching mockup: ₹500, ₹1,000, ₹2,000, ₹5,000, ₹10,000
  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  // Handle URL scenario query params (?scenario=safe or ?scenario=phishing)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scenario = params.get('scenario');
    if (scenario === 'safe') {
      const riya = recipientsList.find((r) => r.id === 'acc_riya') || recipientsList[0];
      setSelectedRecipient(riya);
      setAmountRupees('500');
      setNote('Weekend lunch split');
    } else if (scenario === 'phishing') {
      const scam = recipientsList.find((r) => r.isScam) || recipientsList[3];
      setSelectedRecipient(scam);
      setAmountRupees('4850');
      setNote('Discom electricity disconnection avoid');
    }
  }, [location.search]);

  const amountNumber = parseFloat(amountRupees) || 0;
  const amountPaise = Math.round(amountNumber * 100);
  const isOverBalance = amountPaise > currentBalancePaise;

  // Filtered recipients based on Category tab and Search query
  const filteredRecipients = useMemo(() => {
    return recipientsList.filter((rec) => {
      const matchesCategory =
        recipientFilter === 'Recent'
          ? rec.categories.includes('Recent') || rec.categories.includes('All')
          : rec.categories.includes(recipientFilter);
      const matchesQuery =
        !searchQuery ||
        rec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.upi.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [recipientsList, recipientFilter, searchQuery]);

  // Recipient Trust Check from core library
  const trustCheck = evaluateRecipientTrust({
    recipientId: selectedRecipient.id,
    recipientName: selectedRecipient.name,
    recipientPhone: selectedRecipient.phone || selectedRecipient.rawPhone,
    amountPaise,
  });

  // Account Takeover (ATO) Shield from core library
  const atoCheck = evaluateAccountTakeoverRisk({
    isNewDevice: simNewDevice,
    recentPasswordReset: simPasswordReset,
    failedLoginAttempts: simPasswordReset ? 2 : 0,
    transferAmountPaise: amountPaise,
    recipientTier: selectedRecipient.isScam
      ? RECIPIENT_TRUST_TIERS.HIGH_RISK_DETECTED
      : RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
  });

  // Handle selecting a recipient card
  const handleSelectRecipient = (rec) => {
    setSelectedRecipient(rec);
    setAcknowledgedRisk(false);

    if (rec.isScam) {
      announceSuspiciousRecipient(rec.name, 'HIGH_RISK');
    }
  };

  // Helper to trigger the Suspicious / Fishy Activity Alert Popup
  const openFishyRecipientPopup = (rec = selectedRecipient) => {
    triggerFishyAlert({
      title: 'Suspicious Recipient Detected!',
      category: 'FLAGGED SCAM ACCOUNT',
      recipient: `${rec.name} (${rec.phone || rec.upi || ''})`,
      amount: `₹${parseFloat(amountRupees || '0').toLocaleString('en-IN')}`,
      reason:
        'This recipient has been reported across multiple partner banks and verified users for fraudulent schemes and unauthorized balance drains.',
      signals: [
        'Linked to 3 confirmed rapid balance drain incidents on platform',
        'Multiple user dispute reports alleging scam/fraudulent transfers',
        'High-risk routing pattern and newly created profile (< 30 days)',
      ],
      safetyTip:
        'Never send money to unverified individuals or unverified trading services. Transfers to suspicious accounts are placed under protective review.',
      voiceMessage: `Warning! LedgerGuard detected high-risk scam indicators for ${rec.name}. This account was linked to reported scams. Please confirm before sending money.`,
      proceedText: 'Acknowledge Risk & Proceed',
      onBlock: () => {
        setSelectedRecipient(recipientsList[0]);
        setAcknowledgedRisk(false);
      },
      onProceed: () => {
        setAcknowledgedRisk(true);
      },
    });
  };

  // Handle Review & Confirm Click
  const handleReviewAndConfirm = (e) => {
    e.preventDefault();
    if (isFrozen) {
      playChime('alert');
      speakVoiceAlert('Transfer blocked. Your account is currently in emergency lockdown.', {
        chime: 'alert',
        force: true,
      });
      return;
    }
    if (amountPaise <= 0 || isOverBalance) return;

    // Trigger Fishy Alert Modal if recipient is scam and risk is not yet acknowledged
    if (selectedRecipient.isScam && !acknowledgedRisk) {
      openFishyRecipientPopup();
      return;
    }

    // Step-up 2FA if ATO threat is critical
    if (atoCheck.requiresStepUp) {
      announceAtoThreat();
      setIs2FAModalOpen(true);
      return;
    }

    executeTransfer();
  };

  const handleConfirm2FA = (e) => {
    e.preventDefault();
    if (twoFactorCode.length < 4) return;
    setIs2FAModalOpen(false);
    executeTransfer();
  };

  const executeTransfer = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      const isHold =
        atoCheck.requiresReviewHold ||
        selectedRecipient.isScam;

      const formattedAmount = (amountPaise / 100).toLocaleString('en-IN');
      if (isHold) {
        announceHeldPayment(formattedAmount, selectedRecipient.name);
      } else {
        announcePaymentSuccess(formattedAmount, selectedRecipient.name);
      }

      // Add to unified persistent transactions feed
      const newTx = addTransaction({
        counterparty: selectedRecipient.name,
        subtitle: `Money sent · ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
        amountPaise: -amountPaise,
        type: 'TRANSFER',
        status: isHold ? 'Under Review' : 'Completed',
        statusText: isHold ? 'Security review required' : 'Completed',
        isReviewRequired: isHold,
        risk_score: isHold ? 88 : atoCheck.threatScore > 0 ? atoCheck.threatScore : selectedRecipient.trustScore,
        risk_level: isHold ? 'CRITICAL' : 'LOW',
        note: note || 'Transfer',
        from: 'Aman (Wallet)',
        to: selectedRecipient.name,
      });

      setSuccessTx({
        id: newTx.id,
        idempotency_key: newTx.idempotency_key,
        recipient: selectedRecipient.name,
        recipientPhone: selectedRecipient.phone,
        amount_paise: amountPaise,
        risk_score: newTx.risk_score,
        status: isHold ? 'UNDER_REVIEW' : 'COMPLETED',
        created_at: newTx.created_at,
        note: note || 'Transfer',
      });
    }, 600);
  };

  const handleAddNewRecipient = (e) => {
    e.preventDefault();
    if (!newRecName || !newRecPhone) return;

    const newContact = {
      id: `acc_custom_${Date.now()}`,
      name: newRecName,
      phone: newRecPhone,
      rawPhone: newRecPhone.replace(/\D/g, ''),
      upi: `${newRecName.toLowerCase().replace(/\s+/g, '')}@okaxis`,
      badge: 'New',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
      star: false,
      initials: newRecName.substring(0, 2).toUpperCase(),
      avatarBg: 'bg-[#EBF3FE] text-[#2563EB]',
      categories: ['Recent', 'Contacts', 'Saved'],
      trustScore: 20,
      riskLevel: 'Low Risk',
      isScam: false,
      reputationStatus: 'Good',
      patternStatus: 'Normal',
      fraudReportsStatus: 'None',
      atoStatus: 'Standard limit',
    };

    setRecipientsList((prev) => [newContact, ...prev]);
    setSelectedRecipient(newContact);
    setIsAddNewOpen(false);
    setNewRecName('');
    setNewRecPhone('');
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-5 animate-in fade-in duration-200 min-h-[calc(100vh-80px)] flex flex-col justify-between">
      {/* Hero Header Area: Send Money Title, Subtitles, Stepper & 3D Visual Art */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-1">
        {/* Left: Title + Subtitle + 3-Step Stepper */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight font-sans">
              Send Money
            </h1>
            <div className="mt-1 space-y-0.5">
              <p className="text-sm font-bold text-ink tracking-tight">
                Secure Transfers. Smarter Protection.
              </p>
              <p className="text-xs text-ink-muted font-medium">
                Powered by AI to keep your money and loved ones safe.
              </p>
            </div>
          </div>

          {/* 3-Step Stepper Navigation */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs pt-1">
            {/* Step 1: Choose Recipient */}
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-[#102B24] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                1
              </div>
              <span className="font-bold text-ink">Choose Recipient</span>
            </div>

            {/* Connecting line 1 (Emerald Green) */}
            <div className="w-8 sm:w-12 h-[2px] bg-emerald-600 rounded-full"></div>

            {/* Step 2: Enter Amount */}
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full border border-cardborder bg-white text-ink text-[10px] font-bold flex items-center justify-center">
                2
              </div>
              <span className="font-semibold text-ink-muted">Enter Amount</span>
            </div>

            {/* Connecting line 2 (Muted) */}
            <div className="w-8 sm:w-12 h-[2px] bg-cardborder rounded-full"></div>

            {/* Step 3: Review & Confirm */}
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full border border-cardborder bg-white text-ink-muted text-[10px] font-bold flex items-center justify-center">
                3
              </div>
              <span className="font-semibold text-ink-muted">Review & Confirm</span>
            </div>
          </div>
        </div>

        {/* Right: Floating Smartphone with Rupee Coin, Gold Shield & "Safe Payments Stronger Tomorrows." */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="w-48 h-24 relative select-none pointer-events-none">
            <svg viewBox="0 0 190 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
              {/* Floating Gold Coin 1 */}
              <g transform="translate(80, 10)">
                <ellipse cx="12" cy="12" rx="11" ry="11" fill="url(#heroGold)" stroke="#FDE047" strokeWidth="1.5" />
                <ellipse cx="12" cy="12" rx="8" ry="8" fill="none" stroke="#CA8A04" strokeWidth="1" strokeDasharray="2 2" />
                <text x="12" y="16" textAnchor="middle" fill="#713F12" fontSize="11" fontWeight="900" fontFamily="sans-serif">₹</text>
              </g>

              {/* Floating Gold Coin 2 */}
              <g transform="translate(108, 28)">
                <ellipse cx="9" cy="9" rx="8.5" ry="8.5" fill="url(#heroGold)" stroke="#FDE047" strokeWidth="1.2" />
                <text x="9" y="12" textAnchor="middle" fill="#713F12" fontSize="9" fontWeight="900" fontFamily="sans-serif">₹</text>
              </g>

              {/* Angled Smartphone */}
              <g transform="translate(16, 12) rotate(-8)">
                <rect x="0" y="0" width="46" height="78" rx="8" fill="#102B24" stroke="#1E4D40" strokeWidth="1.8" />
                <rect x="3" y="5" width="40" height="68" rx="5" fill="#0B1E19" />
                {/* Phone Screen Coin */}
                <circle cx="23" cy="34" r="12" fill="url(#heroGold)" stroke="#FEF08A" strokeWidth="1.2" />
                <text x="23" y="38" textAnchor="middle" fill="#713F12" fontSize="12" fontWeight="900" fontFamily="sans-serif">₹</text>
                <text x="23" y="54" textAnchor="middle" fill="#34D399" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">Sending...</text>
              </g>

              {/* Glowing Golden Shield on the Right */}
              <g transform="translate(125, 20)">
                {/* Emerald Shield Behind */}
                <path d="M 22 0 L 44 8 L 44 32 C 44 48 22 58 22 58 C 22 58 0 48 0 32 L 0 8 Z" fill="#064E3B" stroke="#059669" strokeWidth="1.5" />
                {/* Gold Inner Shield */}
                <path d="M 22 8 L 36 14 L 36 30 C 36 41 22 48 22 48 C 22 48 8 41 8 30 L 8 14 Z" fill="url(#heroGold)" stroke="#FEF08A" strokeWidth="1" />
                <circle cx="22" cy="27" r="3" fill="#713F12" />
              </g>

              <defs>
                <linearGradient id="heroGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="50%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#A16207" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Slogan Text Stack matching mockup */}
          <div className="text-left font-sans tracking-tight leading-tight">
            <div className="text-xs font-black text-ink leading-tight">Safe</div>
            <div className="text-xs font-black text-ink leading-tight">Payments</div>
            <div className="text-xs font-black text-emerald-800 leading-tight">Stronger</div>
            <div className="text-xs font-black text-emerald-800 leading-tight">Tomorrows.</div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN (~62% width / 7 Cols) ================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* CARD 1: Select Recipient */}
          <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-4">
            {/* Top Row: Title + Category Pills + '+ Add New' Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink">Select Recipient</h2>

              <div className="flex items-center flex-wrap gap-1.5">
                {['Recent', 'Contacts', 'Bank Accounts', 'UPI ID', 'Saved'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setRecipientFilter(cat)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      recipientFilter === cat
                        ? 'bg-[#102B24] text-white shadow-xs'
                        : 'bg-white border border-cardborder text-ink-muted hover:text-ink hover:bg-canvas'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddNewOpen(true)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-white hover:bg-canvas border border-cardborder text-ink transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3 text-forest" />
                  <span>Add New</span>
                </button>
              </div>
            </div>

            {/* Search Bar matching mockup */}
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile number, UPI ID or bank account..."
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
              />
            </div>

            {/* 4 Primary Horizontal Recipient Cards matching mockup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {filteredRecipients.slice(0, 4).map((rec) => {
                const isSelected = selectedRecipient.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => handleSelectRecipient(rec)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-2 group ${
                      isSelected
                        ? rec.isScam
                          ? 'border-2 border-coral bg-coral-light/30 ring-2 ring-coral/20'
                          : 'border-2 border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-600/10'
                        : 'border-cardborder hover:border-ink-muted/40 bg-white hover:bg-canvas/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${rec.avatarBg}`}
                      >
                        {rec.isBank ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          rec.initials
                        )}
                      </div>

                      {/* Name & Phone */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-ink truncate">
                            {rec.name}
                          </span>
                          {rec.star && (
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-ink-muted truncate font-mono mt-0.5">
                          {rec.phone}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {rec.badge && (
                      <div className="pt-0.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${rec.badgeClass}`}
                        >
                          {rec.badge}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 2: Enter Amount & Visual Transfer Path */}
          <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
              {/* Left: Currency Input & 5 Quick Amount Chips */}
              <div className="sm:col-span-7 space-y-3">
                <label className="text-xs font-bold text-ink block">
                  Enter Amount
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-black text-ink">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    placeholder="1,000"
                    className="w-full pl-8 pr-3 py-2 bg-white rounded-2xl border border-cardborder text-3xl font-black text-ink font-sans tracking-tight focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                  />
                </div>

                {/* 5 Quick Amount Chips matching mockup */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {quickAmounts.map((amt) => {
                    const isActive = parseFloat(amountRupees) === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountRupees(amt.toString())}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#102B24] text-white shadow-xs'
                            : 'bg-canvas hover:bg-canvas-alt border border-cardborder text-ink-muted hover:text-ink'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>

                {isOverBalance && (
                  <div className="text-[11px] font-bold text-coral flex items-center space-x-1.5 animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Amount exceeds available balance ({formatPaise(currentBalancePaise)})
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Wallet Selector & Note */}
              <div className="sm:col-span-5 space-y-3 sm:border-l sm:border-cardborder sm:pl-5">
                {/* From Wallet Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ink-muted block">From</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                      className="w-full px-3 py-2 bg-canvas rounded-xl border border-cardborder text-xs flex items-center justify-between text-left hover:bg-canvas-alt transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Wallet className="w-3.5 h-3.5 text-forest shrink-0" />
                        <span className="font-bold text-ink truncate text-[11px]">
                          {selectedWalletSource} ({formatPaise(currentBalancePaise)})
                        </span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-ink-muted shrink-0 ml-1" />
                    </button>

                    {isWalletDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-cardborder shadow-elevated p-1.5 z-20 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWalletSource('Primary Wallet');
                            setIsWalletDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-xl text-xs font-bold text-ink hover:bg-canvas flex items-center justify-between"
                        >
                          <span>Primary Wallet</span>
                          <span className="text-forest font-mono">{formatPaise(currentBalancePaise)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWalletSource('HDFC Bank •••• 4192');
                            setIsWalletDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-xl text-xs font-medium text-ink hover:bg-canvas flex items-center justify-between"
                        >
                          <span>HDFC Bank •••• 4192</span>
                          <span className="text-ink-muted font-mono">Linked UPI</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add a Note Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-ink-muted">
                      Add a note (optional)
                    </label>
                    <span className="text-[10px] text-ink-muted font-mono">
                      {note.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Rent, Dinner, Gift..."
                    className="w-full px-3.5 py-2 bg-canvas rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bottom: Transfer Path Visualizer ("You" -> Floating Gold Coins -> Recipient) */}
            <div className="pt-3 border-t border-cardborder/60">
              <div className="relative py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-50/40 via-amber-50/30 to-emerald-50/40 border border-emerald-100/50 flex items-center justify-between overflow-hidden">
                {/* You Circle Avatar */}
                <div className="flex items-center space-x-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#102B24] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-ink">You</span>
                </div>

                {/* Curved Dotted Flight Path with Gold Coins */}
                <div className="flex-1 mx-4 relative flex items-center justify-center">
                  {/* Dotted Track Line */}
                  <div className="w-full border-t-2 border-dashed border-amber-300"></div>

                  {/* 3 Floating Gold Rupee Coins along the path */}
                  <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 border border-yellow-200 flex items-center justify-center shadow-xs -translate-y-1 animate-bounce">
                      <span className="text-[9px] font-black text-amber-950">₹</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border border-yellow-200 flex items-center justify-center shadow-xs translate-y-1 animate-pulse">
                      <span className="text-[10px] font-black text-amber-950">₹</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 border border-yellow-200 flex items-center justify-center shadow-xs -translate-y-0.5">
                      <span className="text-[9px] font-black text-amber-950">₹</span>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                </div>

                {/* Recipient Circle Avatar */}
                <div className="flex items-center space-x-2 z-10">
                  <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shadow-xs ${selectedRecipient.avatarBg}`}>
                    {selectedRecipient.initials}
                  </div>
                  <span className="text-xs font-bold text-ink truncate max-w-[120px]">
                    {selectedRecipient.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: AI Security Check (4 Connected Stage Nodes with Arrows matching mockup) */}
          <div className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink">AI Security Check</h3>
                  <p className="text-[10px] text-ink-muted">
                    Analyzing recipient, amount, and current account activity...
                  </p>
                </div>
              </div>

              {/* Live Analysis Pill */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Analysis</span>
              </div>
            </div>

            {/* 4 Connected Stage Nodes with Arrows matching mockup */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 items-center">
              {/* Node 1: Recipient Reputation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 ${
                      selectedRecipient.isScam ? 'bg-rose-500' : 'bg-emerald-600'
                    }`}
                  >
                    {selectedRecipient.isScam ? (
                      <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-ink leading-tight">
                      Recipient<br />Reputation
                    </div>
                    <div
                      className={`text-[9px] font-bold mt-0.5 ${
                        selectedRecipient.isScam ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {selectedRecipient.isScam ? 'Flagged Scammer' : 'No issues'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-emerald-400" />
              </div>

              {/* Node 2: Amount Analysis */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 ${
                      isOverBalance ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                  >
                    {isOverBalance ? (
                      <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-ink leading-tight">
                      Amount<br />Analysis
                    </div>
                    <div
                      className={`text-[9px] font-bold mt-0.5 ${
                        isOverBalance ? 'text-coral' : 'text-emerald-700'
                      }`}
                    >
                      {isOverBalance ? 'Exceeds balance' : 'Normal range'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-emerald-400" />
              </div>

              {/* Node 3: Transaction Velocity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-ink leading-tight">
                      Transaction<br />Velocity
                    </div>
                    <div className="text-[9px] font-bold text-emerald-700 mt-0.5">
                      Within limits
                    </div>
                  </div>
                </div>
                <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-emerald-400" />
              </div>

              {/* Node 4: Account Takeover Signals */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 ${
                    simNewDevice || simPasswordReset ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                >
                  {simNewDevice || simPasswordReset ? (
                    <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-ink leading-tight">
                    Account Takeover<br />Signals
                  </div>
                  <div
                    className={`text-[9px] font-bold mt-0.5 ${
                      simNewDevice || simPasswordReset ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {simNewDevice || simPasswordReset ? 'Challenge req.' : 'No risk detected'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (~38% width / 5 Cols) ================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* CARD 1: Combined Dark Recipient Profile & AI Risk Analysis Card */}
          <div className="rounded-3xl overflow-hidden border border-cardborder shadow-soft bg-white">
            {/* Top Dark Forest Green Banner matching mockup */}
            <div
              className={`p-5 text-white flex items-center justify-between transition-colors ${
                selectedRecipient.isScam
                  ? 'bg-gradient-to-r from-[#2A0E12] to-[#1A070A]'
                  : 'bg-gradient-to-r from-[#0B231D] via-[#0E2C24] to-[#0A1F1A]'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div
                  className={`w-12 h-12 rounded-full font-black text-sm flex items-center justify-center shadow-soft ${
                    selectedRecipient.isScam
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#1E7E4E] text-white'
                  }`}
                >
                  {selectedRecipient.isBank ? (
                    <Building2 className="w-5 h-5 text-white" />
                  ) : (
                    selectedRecipient.initials
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base font-bold text-white tracking-tight">
                      {selectedRecipient.name}
                    </span>
                    {selectedRecipient.star && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    )}
                  </div>
                  <div className="text-xs text-white/70 font-mono mt-0.5">
                    {selectedRecipient.phone}
                  </div>
                </div>
              </div>

              {/* Verified Contact Badge */}
              <div className="shrink-0">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center space-x-1 ${
                    selectedRecipient.isScam
                      ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                      : 'bg-[#1E7E4E]/30 border-[#34D399]/40 text-emerald-300'
                  }`}
                >
                  {selectedRecipient.isScam ? (
                    <>
                      <AlertOctagon className="w-3 h-3 text-rose-300" />
                      <span>Flagged Scammer</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-300" />
                      <span>Verified Contact</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Bottom Section: AI Risk Analysis with 4 Signal Rows & Circular Gauge */}
            <div className="p-5 space-y-4">
              {/* Header: Title + Low Risk Pill */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-ink">
                    AI Risk Analysis
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                    selectedRecipient.isScam
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {selectedRecipient.riskLevel}
                </span>
              </div>

              {/* Two Partitions: 4 Signal Rows on Left, Circular Progress Meter on Right */}
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* 4 Signal Rows (8 Cols) */}
                <div className="col-span-8 space-y-2 text-xs">
                  {/* Row 1: Recipient Reputation */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2 text-ink/80">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">Recipient Reputation</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <span className={selectedRecipient.isScam ? 'text-rose-600' : 'text-emerald-700'}>
                        {selectedRecipient.reputationStatus}
                      </span>
                      {selectedRecipient.isScam ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Transaction Pattern */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2 text-ink/80">
                      <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">Transaction Pattern</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <span className={selectedRecipient.isScam ? 'text-rose-600' : 'text-emerald-700'}>
                        {selectedRecipient.patternStatus}
                      </span>
                      {selectedRecipient.isScam ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Fraud Reports */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2 text-ink/80">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium">Fraud Reports</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <span className={selectedRecipient.isScam ? 'text-rose-600' : 'text-emerald-700'}>
                        {selectedRecipient.fraudReportsStatus}
                      </span>
                      {selectedRecipient.isScam ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Account Takeover Signals */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2 text-ink/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">Account Takeover Signals</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <span className={selectedRecipient.isScam ? 'text-rose-600' : 'text-emerald-700'}>
                        {selectedRecipient.atoStatus}
                      </span>
                      {selectedRecipient.isScam ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Circular Score Meter (4 Cols) */}
                <div className="col-span-4 flex flex-col items-center justify-center">
                  <div className="relative w-18 h-18 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                      <circle
                        cx="36"
                        cy="36"
                        r="28"
                        stroke="#E5E7EB"
                        strokeWidth="5"
                        fill="none"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r="28"
                        stroke={selectedRecipient.isScam ? '#EF4444' : '#10B981'}
                        strokeWidth="5"
                        strokeDasharray="175.9"
                        strokeDashoffset={
                          175.9 - (175.9 * selectedRecipient.trustScore) / 100
                        }
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-black text-ink leading-none">
                        {selectedRecipient.trustScore}
                      </span>
                      <span className="text-[9px] font-bold text-ink-muted leading-none mt-0.5">
                        /100
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-ink-muted mt-1">
                    Risk Score
                  </span>
                </div>
              </div>

              {/* If Scam: Voice Warning & Fishy Alert Trigger */}
              {selectedRecipient.isScam && (
                <div className="pt-2 border-t border-rose-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openFishyRecipientPopup()}
                    className="flex-1 py-2 px-3 bg-coral hover:bg-coral-hover text-white text-xs font-black rounded-xl shadow-soft transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>🚨 View Fishy Alert</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      announceSuspiciousRecipient(selectedRecipient.name, 'HIGH_RISK')
                    }
                    className="py-2 px-2.5 bg-white hover:bg-canvas text-xs font-bold text-coral border border-coral/30 rounded-xl transition-all"
                    title="Play Voice Alert"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-coral" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: Transfer Summary */}
          <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Transfer Summary</h3>
              <button
                type="button"
                onClick={() => {
                  const amountInput = document.querySelector('input[type="number"]');
                  if (amountInput) amountInput.focus();
                }}
                className="text-xs font-bold px-2 py-0.5 rounded-lg border border-cardborder hover:bg-canvas text-ink transition-colors"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Recipient Row */}
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Recipient</span>
                <span className="font-bold text-ink">{selectedRecipient.name}</span>
              </div>

              {/* UPI ID / Number Row */}
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">UPI ID / Number</span>
                <span className="font-bold text-ink font-mono">{selectedRecipient.phone}</span>
              </div>

              {/* Amount Row */}
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Amount</span>
                <span className="font-bold text-ink font-mono">
                  ₹
                  {amountNumber.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Transfer Fee Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-ink-muted">
                  <span>Transfer Fee</span>
                  <Info className="w-3 h-3 text-ink-muted" />
                </div>
                <span className="font-bold text-ink font-mono">
                  ₹0.00
                </span>
              </div>

              <div className="border-t border-cardborder pt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-ink">
                  Total Payable
                </span>
                <span className="text-base font-black text-ink font-sans tracking-tight">
                  ₹
                  {amountNumber.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Action Button: Review & Confirm -> */}
            <button
              type="button"
              onClick={handleReviewAndConfirm}
              disabled={(!isFrozen && (isSubmitting || isOverBalance || amountPaise <= 0))}
              className={`w-full py-3.5 px-4 text-white text-xs font-black rounded-2xl shadow-soft transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer mt-2 ${
                isFrozen
                  ? 'bg-coral hover:bg-coral-hover animate-pulse'
                  : 'bg-[#102B24] hover:bg-[#15362E] disabled:opacity-50'
              }`}
            >
              {isFrozen ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>🔒 Account Locked (Unlock to Transfer)</span>
                </>
              ) : isSubmitting ? (
                <span>Evaluating Double-Entry Invariants...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-400 rotate-45" />
                  <span>Review & Confirm</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* CARD 3: Stay Safe While Transferring (Bottom Right matching mockup) */}
          <div className="bg-white rounded-3xl p-5 border border-cardborder shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-xs font-bold text-ink">
                  Stay Safe While Transferring
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerFishyAlert({
                    title: 'Security Guidelines',
                    category: 'SAFETY BEST PRACTICES',
                    recipient: 'LedgerGuard Guardrails',
                    amount: '₹0.00',
                    reason: 'Always double-check recipient details before sending funds. LedgerGuard automatically monitors and protects against account takeover and high-risk syndicates.',
                    signals: [
                      'Verify beneficiary UPI ID against verified address book',
                      'Never share OTP or approve unprompted 2FA requests',
                      'Report suspicious payment requests immediately'
                    ],
                    safetyTip: 'Transfers to newly created or flagged accounts are subject to protective review escrow.',
                    voiceMessage: 'Security tip: Always double-check recipient details before transferring funds.',
                    proceedText: 'Got It'
                  });
                }}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-1.5 text-[11px] text-ink-muted pl-1">
              <div className="flex items-start space-x-1.5">
                <span className="text-ink">•</span>
                <span>Always verify recipient details</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <span className="text-ink">•</span>
                <span>Avoid transferring to unknown contacts</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <span className="text-ink">•</span>
                <span>Check for unusual payment requests</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <span className="text-ink">•</span>
                <span>LedgerGuard will alert you if something looks suspicious</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Guarantee & Invariant Anchor Card */}
      <div className="bg-[#102B24] text-white rounded-3xl p-5 border border-forest-dark shadow-soft flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-coral flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
              <span>Autonomous Escrow & Mathematical Invariant Protection Active</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px]">
                Pre-Transfer Guarantee
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white mt-0.5">
              Zero-Loss Fraud Quarantine &bull; Exact Integer Paise Double-Entry Ledger
            </h3>
            <p className="text-[11px] text-white/70 mt-0.5">
              High-risk payments and unfamiliar accounts are quarantined in safety escrow before settlement. Cancel anytime with instant 100% refund.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-white/60">Strict System Invariant</div>
            <div className="text-xs font-mono font-bold text-emerald-300">Sum(Debits + Credits) = ₹0.00</div>
          </div>
        </div>
      </div>

      {/* ATO Step-Up 2FA Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md border border-cardborder shadow-elevated p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-light text-amber flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Account Takeover Shield Challenge
                </h3>
                <p className="text-[11px] text-ink-muted">
                  Step-up authentication required for this transfer
                </p>
              </div>
            </div>

            <div className="p-3 bg-canvas rounded-2xl border border-cardborder text-xs text-ink space-y-1">
              <div className="font-bold text-coral">Triggered Security Anomaly:</div>
              {atoCheck.triggeredSignals.map((sig, i) => (
                <div
                  key={i}
                  className="text-[11px] text-ink-muted flex items-center space-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-coral"></span>
                  <span>{sig}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleConfirm2FA} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Enter Security Passcode / 2FA PIN
                </label>
                <input
                  type="password"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 1234 or your PIN"
                  className="w-full px-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-center text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-forest/20"
                  required
                />
                <p className="text-[10px] text-ink-muted mt-1 text-center">
                  Demo code: enter any 4 digits (e.g. 1234)
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIs2FAModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink"
                >
                  Cancel Transfer
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold"
                >
                  Verify & Proceed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      {successTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md border border-cardborder shadow-elevated p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div
                className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                  successTx.status === 'UNDER_REVIEW'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {successTx.status === 'UNDER_REVIEW' ? (
                  <Lock className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-lg font-black text-ink">
                {successTx.status === 'UNDER_REVIEW'
                  ? 'Payment Placed in Escrow Review'
                  : 'Payment Sent Successfully!'}
              </h3>
              <p className="text-xs text-ink-muted">
                {successTx.status === 'UNDER_REVIEW'
                  ? 'Paused for your security due to high-risk counterparty signals. Your funds remain safe in escrow.'
                  : 'Your payment was safely delivered and recorded in your transaction ledger.'}
              </p>
            </div>

            {/* Voice Announcement Replay Button */}
            <button
              type="button"
              onClick={() => {
                const formatted = (
                  successTx.amount_paise / 100
                ).toLocaleString('en-IN');
                if (successTx.status === 'UNDER_REVIEW') {
                  announceHeldPayment(formatted, successTx.recipient);
                } else {
                  announcePaymentSuccess(formatted, successTx.recipient);
                }
              }}
              className="w-full py-2.5 px-4 bg-canvas-alt hover:bg-canvas rounded-xl border border-cardborder text-xs font-bold text-ink flex items-center justify-center space-x-2 transition-all shadow-xs"
            >
              <Volume2 className="w-4 h-4 text-forest" />
              <span>🔊 Replay Voice Announcement</span>
            </button>

            <div className="bg-canvas rounded-2xl p-4 border border-cardborder space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-ink-muted">Transaction ID:</span>
                <span className="font-bold text-ink">{successTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Recipient:</span>
                <span className="font-bold text-ink">
                  {successTx.recipient}{' '}
                  {successTx.recipientPhone
                    ? `(${successTx.recipientPhone})`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Amount:</span>
                <span className="font-bold text-forest">
                  {formatPaise(successTx.amount_paise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Security Status:</span>
                <span className="font-bold text-ink">
                  {successTx.status === 'UNDER_REVIEW'
                    ? 'Held for Escrow Review'
                    : 'Verified & Cleared'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">New Balance:</span>
                <span className="font-bold text-ink">
                  {formatPaise(currentBalancePaise)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                onClick={() => setSuccessTx(null)}
                className="w-full sm:flex-1 py-2.5 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink transition-colors"
              >
                Send Another
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold transition-colors shadow-soft"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="w-full sm:flex-1 py-2.5 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink transition-colors"
              >
                View History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* '+ Add New' Recipient Modal */}
      {isAddNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md border border-cardborder shadow-elevated p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-cardborder">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-forest" />
                <h3 className="text-sm font-black text-ink">Add New Beneficiary</h3>
              </div>
              <button
                onClick={() => setIsAddNewOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-canvas flex items-center justify-center text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewRecipient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newRecName}
                  onChange={(e) => setNewRecName(e.target.value)}
                  placeholder="e.g. Priya Patel"
                  className="w-full px-3.5 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Mobile Number or UPI ID</label>
                <input
                  type="text"
                  required
                  value={newRecPhone}
                  onChange={(e) => setNewRecPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210 or priya@okaxis"
                  className="w-full px-3.5 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNewOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold shadow-soft"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}