import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert,
  ArrowLeft,
  Smartphone, 
  Laptop, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Volume2,
  MoreHorizontal,
  X,
  Flag,
  Lock,
  Globe,
  Clock,
  RotateCcw
} from 'lucide-react';
import { speakVoiceAlert } from '../utils/voiceAlert.js';
import { triggerFishyAlert } from '../utils/fishyAlert.js';
import { useAuth } from '../context/AuthContext.jsx';
import PanicLockModal from '../components/PanicLockModal.jsx';

export default function SecurityCenter() {
  const navigate = useNavigate();
  const {
    sessions,
    reports,
    revokeSession,
    revokeAllUnfamiliarSessions,
    addReport,
    resetToDefaults,
    isFrozen,
  } = useAuth();

  const hasUnfamiliarSession = sessions.some((s) => s.isUnfamiliar);

  // Modals state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);

  // Form state for reporting
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('');

  const handleTerminateOtherSessions = () => {
    revokeAllUnfamiliarSessions();
    setIsReviewModalOpen(false);
    speakVoiceAlert('All unfamiliar and remote sessions have been terminated. Your account is secured.', { chime: 'success', force: true });
  };

  const handleTerminateSession = (id) => {
    revokeSession(id);
    speakVoiceAlert('Session terminated successfully.', { chime: 'success', force: true });
  };

  // Triggers the Fishy Alert Popup for Unfamiliar Device
  const handleSecureAccount = () => {
    triggerFishyAlert({
      title: 'Unfamiliar Device Session Detected!',
      category: 'ACCOUNT TAKEOVER PROTECTION',
      recipient: 'Windows 11 PC (Firefox 125) • New Delhi',
      amount: 'Active Session Flagged',
      reason:
        'A login occurred from an unrecognized device in New Delhi. Please verify your identity or terminate this session before sensitive payments can continue.',
      signals: [
        'Unrecognized browser & device signature (Firefox 125 on Windows 11)',
        'Geographic jump: Bengaluru → New Delhi within 3 hours',
        'Verification required before sensitive payments can continue',
      ],
      safetyTip:
        'If this was not you, terminate the session immediately. LedgerGuard protects your funds from unauthorized withdrawals.',
      voiceMessage:
        'Security alert: Unfamiliar device login from New Delhi detected. Please review and secure your account.',
      proceedText: 'Keep Session Active',
      onBlock: () => {
        handleTerminateOtherSessions();
      },
    });
  };

  const handleReviewActivity = () => {
    setIsReviewModalOpen(true);
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!reportTarget || !reportReason) return;

    addReport({
      target: reportTarget,
      reason: reportReason,
    });
    setReportTarget('');
    setReportReason('');
    setIsReportModalOpen(false);
    speakVoiceAlert('Report submitted successfully. LedgerGuard compliance investigation initiated.', { chime: 'success', force: true });
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-ink-muted hover:text-forest transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-forest" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-sans">
              Security Center
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted font-normal">
              Your account, protected at every step.
            </p>
          </div>

          {/* Protection active badge & Panic Lock matching mockup */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsPanicModalOpen(true)}
              className={`font-bold text-xs px-3.5 py-1.5 rounded-full inline-flex items-center space-x-1.5 transition-all shadow-soft border ${
                isFrozen
                  ? 'bg-coral text-white border-coral animate-pulse'
                  : 'bg-white hover:bg-coral/10 text-coral border-coral/30 hover:border-coral'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isFrozen ? 'Account Locked' : 'Panic Freeze'}</span>
            </button>
            <span className="bg-[#E7F6ED] text-[#1E7E4E] font-medium text-xs px-3.5 py-1.5 rounded-full inline-flex items-center">
              Protection active
            </span>
          </div>
        </div>
      </div>

      {/* Main Protection Banner: "Your account is protected" */}
      <div className="bg-[#0F2922] text-white rounded-3xl p-5 sm:p-6 shadow-soft flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
              Your account is protected
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-normal mt-0.5">
              {hasUnfamiliarSession
                ? 'Security checks are active. One unfamiliar session needs your attention.'
                : 'Security checks are active. All recognized devices verified.'}
            </p>
          </div>
        </div>

        {/* Audio status button */}
        <button
          onClick={() =>
            speakVoiceAlert(
              hasUnfamiliarSession
                ? 'Your account is protected. Security checks are active. One unfamiliar session needs your attention.'
                : 'Your account is protected. Security checks are active. All recognized devices verified.',
              { chime: 'success', force: true }
            )
          }
          className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all shrink-0"
          title="Hear audible security status"
        >
          <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
          <span>Hear Status</span>
        </button>
      </div>

      {/* Unfamiliar Device Detected Warning Card (Hidden once account is secured) */}
      {hasUnfamiliarSession && (
        <div className="bg-[#FEF5E7] border border-[#FBD9B0] rounded-3xl p-5 sm:p-6 space-y-4 shadow-soft animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-ink">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-ink">
                Unfamiliar device detected
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted/90 font-normal">
              A login from an unrecognized device needs verification before sensitive payments can continue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSecureAccount}
              className="w-full sm:flex-1 bg-[#0F2922] hover:bg-forest-light text-white text-xs sm:text-sm font-bold rounded-2xl py-3 px-5 transition-all text-center shadow-soft active:scale-[0.99]"
            >
              Secure account
            </button>
            <button
              type="button"
              onClick={handleReviewActivity}
              className="w-full sm:flex-1 bg-white hover:bg-canvas text-ink text-xs sm:text-sm font-bold rounded-2xl py-3 px-5 border border-cardborder transition-all text-center shadow-soft active:scale-[0.99]"
            >
              Review activity
            </button>
          </div>
        </div>
      )}

      {/* Two Metric Cards: Active Sessions & Open Reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Active sessions */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-2 flex flex-col justify-between">
          <div className="w-6 h-6 text-ink-muted">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink font-sans tracking-tight">
              {sessions.length}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink mt-0.5">
              Active sessions
            </div>
            <div className="text-xs text-ink-muted font-normal">
              Manage devices
            </div>
          </div>
        </div>

        {/* Card 2: Open reports */}
        <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-2 flex flex-col justify-between">
          <div className="w-6 h-6 text-ink-muted">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink font-sans tracking-tight">
              {reports.length}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink mt-0.5">
              Security cases
            </div>
            <div className="text-xs text-ink-muted font-normal">
              Compliance records
            </div>
          </div>
        </div>
      </div>

      {/* Your Devices Card matching the mockups */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cardborder shadow-soft space-y-4">
        <h3 className="text-base font-bold text-ink tracking-tight">
          Your devices
        </h3>

        <div className="space-y-0">
          {/* Device 1: MacBook Pro */}
          {sessions.some((s) => s.id === 'sess_current_01') && (
            <div className="py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <Laptop className="w-5 h-5 text-ink-muted shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-ink leading-tight">
                    MacBook Pro
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5 font-normal">
                    Current device · Active now
                  </div>
                </div>
              </div>
              <span className="bg-[#E7F6ED] text-[#1E7E4E] font-semibold text-xs px-3 py-1 rounded-full">
                Trusted
              </span>
            </div>
          )}

          {/* Device 2: iPhone 15 Pro */}
          {sessions.some((s) => s.id === 'sess_mobile_02') && (
            <>
              <div className="border-b border-cardborder/40 my-1"></div>
              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <Smartphone className="w-5 h-5 text-ink-muted shrink-0" />
                  <div>
                    <div className="text-sm sm:text-base font-bold text-ink leading-tight">
                      iPhone 15 Pro
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5 font-normal">
                      Last active 3 hours ago · iOS App
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTerminateSession('sess_mobile_02')}
                  title="Sign out device"
                  className="px-2.5 py-1 text-xs font-semibold text-ink-muted hover:text-coral hover:bg-coral-light/20 rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}

          {/* Device 3: Unfamiliar Windows PC (If active) */}
          {sessions.some((s) => s.isUnfamiliar) && (
            <>
              <div className="border-b border-cardborder/40 my-1"></div>
              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <Laptop className="w-5 h-5 text-[#D97706] shrink-0" />
                  <div>
                    <div className="text-sm sm:text-base font-bold text-ink leading-tight flex items-center space-x-2">
                      <span>Windows 11 PC</span>
                      <span className="text-[10px] bg-amber-100 text-[#A86414] font-bold px-2 py-0.5 rounded-full">
                        Unfamiliar
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5 font-normal">
                      Firefox 125 · New Delhi · Needs verification
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTerminateSession('sess_unknown_03')}
                  className="text-xs font-bold text-coral hover:text-coral-hover hover:underline px-2 py-1"
                >
                  Revoke
                </button>
              </div>
            </>
          )}

          {/* Device 4: Office iMac */}
          {sessions.some((s) => s.id === 'sess_office_04') && (
            <>
              <div className="border-b border-cardborder/40 my-1"></div>
              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <Laptop className="w-5 h-5 text-ink-muted shrink-0" />
                  <div>
                    <div className="text-sm sm:text-base font-bold text-ink leading-tight">
                      Office iMac 27"
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5 font-normal">
                      Bengaluru HQ · Safari 17.4 · 2 days ago
                    </div>
                  </div>
                </div>
                <span className="bg-[#E7F6ED] text-[#1E7E4E] font-semibold text-xs px-3 py-1 rounded-full">
                  Trusted
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Security Activity Card matching Image 2 */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cardborder shadow-soft space-y-4">
        <h3 className="text-base font-bold text-ink tracking-tight">
          Recent security activity
        </h3>

        <div className="space-y-0">
          {/* Activity 1: Identity verification completed */}
          <div className="py-3.5 flex items-start space-x-3.5">
            <CheckCircle2 className="w-5 h-5 text-[#1E7E4E] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm sm:text-base font-bold text-ink leading-tight">
                Identity verification completed
              </div>
              <div className="text-xs text-ink-muted mt-0.5 font-normal">
                A payment passed an additional security check.
              </div>
            </div>
          </div>

          <div className="border-b border-cardborder/40 my-1"></div>

          {/* Activity 2: Unfamiliar login */}
          <div
            onClick={hasUnfamiliarSession ? handleSecureAccount : undefined}
            className={`py-3.5 flex items-start space-x-3.5 ${
              hasUnfamiliarSession
                ? 'cursor-pointer group hover:bg-canvas-alt/40 -mx-3 px-3 rounded-2xl transition-all'
                : ''
            }`}
          >
            {hasUnfamiliarSession ? (
              <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#1E7E4E] shrink-0 mt-0.5" />
            )}
            <div>
              <div
                className={`text-sm sm:text-base font-bold leading-tight transition-colors ${
                  hasUnfamiliarSession ? 'text-ink group-hover:text-amber-800' : 'text-[#1E7E4E]'
                }`}
              >
                {hasUnfamiliarSession ? 'Unfamiliar login detected' : 'Unfamiliar login revoked & secured'}
              </div>
              <div className="text-xs text-ink-muted mt-0.5 font-normal">
                {hasUnfamiliarSession
                  ? 'Verification is required before sensitive actions continue.'
                  : 'Unrecognized session was terminated. Zero unauthorized access.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Reports & Compliance Cases Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-cardborder shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink tracking-tight">
                Security Reports & Compliance Cases ({reports.length})
              </h3>
              <p className="text-xs text-ink-muted">Track disputed payees, isolated phishing collect attempts, and investigations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl transition-all shadow-soft flex items-center space-x-1.5 w-fit"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report Suspicious Payee</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-canvas border border-cardborder flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-canvas-alt transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold font-mono text-forest bg-forest/10 px-2 py-0.5 rounded-md">
                    {rep.id}
                  </span>
                  <span className="text-xs font-bold text-ink truncate">{rep.target}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    rep.status === 'BLOCKED'
                      ? 'bg-coral-light text-coral'
                      : rep.status === 'RESOLVED'
                      ? 'bg-sage-light text-forest'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {rep.status}
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted leading-tight">
                  {rep.reason}
                </div>
              </div>
              <div className="text-[10px] text-ink-muted sm:text-right shrink-0 font-medium">
                {new Date(rep.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Report Link & Demo Reset at bottom */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-muted pt-2 border-t border-cardborder/40">
        <span>Need to flag a suspicious transaction or payee?</span>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => {
              resetToDefaults();
              speakVoiceAlert('All demo data has been reset to defaults.', { chime: 'success', force: true });
            }}
            className="font-bold text-ink-muted hover:text-ink flex items-center space-x-1 transition-colors"
            title="Reset all balances, transactions and sessions to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="font-bold text-coral hover:text-coral-hover underline"
          >
            Report an issue
          </button>
        </div>
      </div>

      {/* Review Activity Drawer/Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-cardborder shadow-elevated p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-cardborder">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#D97706] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-ink">Review Unfamiliar Device Activity</h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-ink-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-canvas rounded-2xl border border-cardborder space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted font-medium">Device:</span>
                <span className="font-bold text-ink">Windows 11 PC (Firefox 125.0)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted font-medium">Location:</span>
                <span className="font-bold text-ink">New Delhi, Delhi, India</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted font-medium">IP Address:</span>
                <span className="font-mono text-ink">49.207.181.12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted font-medium">Status:</span>
                <span className="text-amber-700 font-bold">Unverified Session</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink"
              >
                Close
              </button>
              <button
                onClick={handleTerminateOtherSessions}
                className="flex-1 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-bold transition-all shadow-soft"
              >
                Sign Out Unknown Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Suspicious Activity Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md border border-cardborder shadow-elevated p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-cardborder">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-coral-light text-coral flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-ink">Report Suspicious Payee or Charge</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-ink-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Target Account or UPI ID</label>
                <input
                  type="text"
                  value={reportTarget}
                  onChange={(e) => setReportTarget(e.target.value)}
                  placeholder="e.g. unknown@scampay or +91 90000 00000"
                  className="w-full px-3.5 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Reason for Dispute / Report</label>
                <textarea
                  rows="3"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe the suspicious behavior, fake reward claim, or unexpected charge..."
                  className="w-full px-3.5 py-2 bg-canvas rounded-xl border border-cardborder text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                  required
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-cardborder hover:bg-canvas text-xs font-bold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-bold transition-all shadow-soft"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Panic Lock Modal */}
      <PanicLockModal
        isOpen={isPanicModalOpen}
        onClose={() => setIsPanicModalOpen(false)}
      />
    </div>
  );
}
