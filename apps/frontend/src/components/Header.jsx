import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  ShieldCheck,
  Wallet,
  ArrowLeft,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldAlert,
  X,
  Zap,
  Lock,
  Unlock,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPaise } from '../utils/formatters.js';
import { isVoiceEnabled, setVoiceEnabled, playChime } from '../utils/voiceAlert.js';
import { triggerFishyAlert } from '../utils/fishyAlert.js';
import PanicLockModal from './PanicLockModal.jsx';
import DemoLauncherModal from './DemoLauncherModal.jsx';
import QRScannerModal from './QRScannerModal.jsx';

export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/dashboard';
  const { user, balancePaise, sessions, blockedThreats, blockThreat, isFrozen } = useAuth();
  const userName = user?.name || 'Aman Sharma';
  const userStatus = isFrozen ? 'Account Frozen' : 'Verified Account';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const balance = balancePaise ?? 1245000;

  const hasPhishingThreat = !blockedThreats?.includes('winprize_collect');
  const hasUnfamiliarSession = sessions?.some((s) => s.isUnfamiliar);
  const totalThreats = (hasPhishingThreat ? 1 : 0) + (hasUnfamiliarSession ? 1 : 0);

  // Modals state
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // Voice alert preference state
  const [voiceOn, setVoiceOn] = useState(() => isVoiceEnabled());
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleVoiceToggle = (e) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setVoiceOn(e.detail.enabled);
      }
    };
    const handleOpenScenarios = () => {
      setIsDemoOpen(true);
    };
    window.addEventListener('ledgerguard:voice_toggle', handleVoiceToggle);
    window.addEventListener('ledgerguard:open_demo_scenarios', handleOpenScenarios);
    return () => {
      window.removeEventListener('ledgerguard:voice_toggle', handleVoiceToggle);
      window.removeEventListener('ledgerguard:open_demo_scenarios', handleOpenScenarios);
    };
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleToggleVoice = () => {
    const nextState = !voiceOn;
    setVoiceEnabled(nextState);
    setVoiceOn(nextState);
    if (nextState) {
      playChime('success');
    }
  };

  return (
    <>
      {/* Emergency Lockdown Top Alert Banner */}
      {isFrozen && (
        <div className="bg-coral text-white px-8 py-2.5 text-xs font-bold flex items-center justify-between shadow-md sticky top-0 z-30 animate-pulse">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
            <span>
              EMERGENCY ACCOUNT LOCKDOWN ACTIVE &bull; All outbound transfers are currently blocked to prevent fraud.
            </span>
          </div>
          <button
            onClick={() => setIsPanicOpen(true)}
            className="px-3 py-1 bg-white hover:bg-white/90 text-coral rounded-lg font-black text-xs transition-colors flex items-center space-x-1"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock Account</span>
          </button>
        </div>
      )}

      <header className="px-8 py-4 flex items-center justify-between border-b border-cardborder bg-canvas sticky top-0 z-20">
        {/* Left: Back to Dashboard & Search */}
        <div className="flex items-center space-x-3">
        {!isHome && (
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-canvas-alt border border-cardborder text-xs font-bold text-ink hover:text-forest transition-all shadow-soft group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-forest" />
            <span>Back to Dashboard</span>
          </Link>
        )}

        {/* Search Bar with integrated QR Scanner & Ctrl K */}
        <div className="relative w-72 sm:w-80 md:w-96">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions, recipients..."
            className="w-full pl-10 pr-20 py-2 bg-white rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all shadow-soft"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
            <button
              onClick={() => setIsQROpen(true)}
              title="Scan UPI QR Code"
              className="p-1 rounded-md text-ink-muted hover:text-forest hover:bg-canvas transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-forest" />
            </button>
            <span className="text-[10px] font-mono text-ink-muted bg-canvas border border-cardborder px-1.5 py-0.5 rounded-md pointer-events-none">
              Ctrl K
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions: Clean, Uncluttered & Spacious */}
      <div className="flex items-center space-x-3">

        {/* Voice Security Alerts Toggle */}
        <button
          onClick={handleToggleVoice}
          title={voiceOn ? 'Voice Security Alerts: ON (Click to Mute)' : 'Voice Security Alerts: MUTED (Click to Enable)'}
          aria-label="Toggle Voice Security Alerts"
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-soft relative group ${
            voiceOn
              ? 'bg-forest/10 border-forest text-forest hover:bg-forest/20'
              : 'bg-white border-cardborder text-ink-muted hover:text-ink hover:bg-canvas-alt'
          }`}
        >
          {voiceOn ? (
            <Volume2 className="w-4 h-4 text-forest transition-transform group-hover:scale-110" />
          ) : (
            <VolumeX className="w-4 h-4 text-ink-muted transition-transform group-hover:scale-110" />
          )}
          {voiceOn && (
            <span className="w-1.5 h-1.5 rounded-full bg-forest absolute top-1.5 right-1.5 animate-pulse"></span>
          )}
        </button>

        {/* Notifications & Security Alerts Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Security notifications"
            className="w-9 h-9 rounded-xl bg-white border border-cardborder hover:bg-canvas-alt flex items-center justify-center text-ink-muted hover:text-ink transition-all shadow-soft relative"
          >
            <Bell className="w-4 h-4" />
            {totalThreats > 0 ? (
              <span className="w-2 h-2 rounded-full bg-coral absolute top-2 right-2 ring-2 ring-white"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-sage absolute top-2 right-2 ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-cardborder shadow-elevated p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-cardborder">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${totalThreats > 0 ? 'bg-coral animate-ping' : 'bg-sage'}`}></span>
                  <h4 className="text-xs font-black text-ink">Security Alerts & Incidents</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  totalThreats > 0 ? 'text-coral bg-coral-light' : 'text-sage bg-sage-light'
                }`}>
                  {totalThreats > 0 ? `${totalThreats} Fishy Threat${totalThreats > 1 ? 's' : ''} Detected` : 'All Systems Clear'}
                </span>
              </div>

              {/* Notification 1: Phishing Collect Scam (If active) */}
              {hasPhishingThreat && (
                <div
                  onClick={() => {
                    setShowNotifications(false);
                    triggerFishyAlert({
                      title: 'Phishing Collect Scam Detected!',
                      category: 'INBOUND UPI PHISHING',
                      recipient: 'WinPrize Festive Cashback (claim@instant-lottery.in)',
                      amount: '₹4,999.00',
                      reason:
                        'A fake inbound reward collect request is attempting to draw funds from your account under the guise of festive cashback.',
                      signals: [
                        'Deceptive request asking you to enter your UPI PIN to "receive" money',
                        'Domain flagged by 14 users in fraud reports',
                        'High-risk collect velocity on unverified payment gateway',
                      ],
                      safetyTip:
                        'Fintech Golden Rule: You NEVER need to enter your UPI PIN to receive money. UPI PIN is only needed to send money.',
                      voiceMessage:
                        'Warning! Phishing scam collect request detected from WinPrize Cashback for ₹4,999. Never enter your UPI PIN to receive money.',
                      proceedText: 'Dismiss Alert',
                      onBlock: () => {
                        blockThreat('winprize_collect', 'WinPrize Festive Cashback', 'Phishing collect request blocked');
                      },
                    });
                  }}
                  className="p-3 rounded-2xl bg-coral-light/20 border border-coral/30 hover:bg-coral-light/35 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-coral uppercase tracking-wider flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3 text-coral" />
                      <span>Phishing Collect Request</span>
                    </span>
                    <span className="text-[10px] text-ink-muted">Active</span>
                  </div>
                  <div className="text-xs font-bold text-ink">WinPrize Cashback • ₹4,999.00</div>
                  <p className="text-[11px] text-ink-muted leading-tight">
                    Fake reward collect request asking for UPI PIN to "receive" cash. Click to view security alert popup.
                  </p>
                </div>
              )}

              {/* Notification 2: High-Risk Recipient Alert */}
              <div
                onClick={() => {
                  setShowNotifications(false);
                  triggerFishyAlert({
                    title: 'High-Risk Scammer Recipient!',
                    category: 'FLAGGED SCAM ACCOUNT',
                    recipient: 'ShadowCrypto OTC (+91 90000 00666)',
                    amount: '₹10,000.00',
                    reason:
                      'Counterparty is flagged in national banking databases for rapid balance drains and unfulfilled crypto trades.',
                    signals: [
                      '3 confirmed fraud drain incidents on platform',
                      'Account age < 15 days with 48% dispute rate',
                      'Cross-border high-risk transaction routing',
                    ],
                    safetyTip:
                      'Never send funds to unverified peer-to-peer crypto traders. Once settled, transfers to such accounts cannot be retrieved.',
                    voiceMessage:
                      'Warning! LedgerGuard detected high-risk scam indicators for ShadowCrypto OTC. Please confirm before sending money.',
                    proceedText: 'Acknowledge Risk',
                  });
                }}
                className="p-3 rounded-2xl bg-amber-light/20 border border-amber/30 hover:bg-amber-light/35 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-amber" />
                    <span>Flagged Recipient Warning</span>
                  </span>
                  <span className="text-[10px] text-ink-muted">Yesterday</span>
                </div>
                <div className="text-xs font-bold text-ink">ShadowCrypto OTC • Scammer Account</div>
                <p className="text-[11px] text-ink-muted leading-tight">
                  Flagged for high-risk trading and scam reports. Click to test security alert popup.
                </p>
              </div>

              {/* Demo Quick Button to Trigger Alert Popup */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    triggerFishyAlert({
                      title: 'Suspicious Activity Detected!',
                      category: 'SIMULATED FRAUD INTERCEPTION',
                      recipient: 'Unknown Merchant (scam.pay@fakebill)',
                      amount: '₹7,500.00',
                      reason:
                        'Suspicious charge intercepted: Unverified merchant attempting unauthorized withdrawal with mismatched geographic tokens.',
                      signals: [
                        'First-time recipient with zero transaction history',
                        'Mismatched location signature (originating from unknown proxy IP)',
                        'Transaction pattern matches known phishing syndicate',
                      ],
                      safetyTip:
                        'Always verify the recipient UPI ID or phone number before confirming payment requests.',
                      voiceMessage:
                        'Warning! Suspicious activity detected. Unknown merchant transfer of ₹7,500 flagged for fraud.',
                      proceedText: 'Proceed Anyway',
                    });
                  }}
                  className="w-full py-2 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-soft"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>🚨 Trigger Sample Fishy Alert Popup</span>
                </button>
              </div>

              {/* Emergency Lockdown Action inside Notifications */}
              <div className="pt-2 border-t border-cardborder flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    setIsPanicOpen(true);
                  }}
                  className="text-xs font-bold text-coral hover:text-coral-hover flex items-center space-x-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isFrozen ? 'Unlock Account' : 'Emergency Panic Lock'}</span>
                </button>
                <Link
                  to="/security"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-bold text-forest hover:text-forest-light"
                >
                  Security Center &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Chip */}
        <Link
          to="/security"
          title="Account Security & Settings"
          className="flex items-center space-x-2.5 pl-2 border-l border-cardborder group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-forest text-white font-bold text-xs flex items-center justify-center shadow-soft group-hover:bg-forest-light transition-colors relative">
            {initials || 'AS'}
            {isFrozen && (
              <span className="w-2.5 h-2.5 rounded-full bg-coral absolute -top-0.5 -right-0.5 ring-2 ring-white"></span>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-ink leading-tight group-hover:text-forest transition-colors">
              {userName}
            </div>
            <div className={`text-[10px] font-semibold ${isFrozen ? 'text-coral' : 'text-forest'}`}>
              {userStatus}
            </div>
          </div>
        </Link>
      </div>
    </header>

    {/* Global Header Modals */}
    <PanicLockModal isOpen={isPanicOpen} onClose={() => setIsPanicOpen(false)} />
    <DemoLauncherModal
      isOpen={isDemoOpen}
      onClose={() => setIsDemoOpen(false)}
      onOpenPanicLock={() => setIsPanicOpen(true)}
      onOpenQRScanner={() => setIsQROpen(true)}
    />
    <QRScannerModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />
  </>
  );
}
