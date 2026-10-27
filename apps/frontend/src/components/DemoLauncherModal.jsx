import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldCheck, ShieldAlert, Laptop, RotateCcw, X, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { playChime, speakVoiceAlert } from '../utils/voiceAlert.js';

export default function DemoLauncherModal({ isOpen, onClose, onOpenPanicLock, onOpenQRScanner }) {
  const navigate = useNavigate();
  const { resetToDefaults } = useAuth();

  if (!isOpen) return null;

  const handleRunSafeDemo = () => {
    onClose();
    navigate('/send?scenario=safe');
  };

  const handleRunPhishingDemo = () => {
    onClose();
    playChime('warning');
    speakVoiceAlert('Phishing simulation activated. Notice the high risk score and safety escrow hold.', {
      chime: 'warning',
    });
    navigate('/send?scenario=phishing');
  };

  const handleRunATODemo = () => {
    onClose();
    playChime('alert');
    speakVoiceAlert('Account takeover simulation activated. Inspect the unfamiliar New Delhi device login.', {
      chime: 'alert',
    });
    navigate('/security');
  };

  const handleResetData = () => {
    resetToDefaults();
    playChime('success');
    speakVoiceAlert('All demo data, balances, and ledger journals have been reset to factory defaults.', {
      chime: 'success',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-cardborder relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-canvas-alt transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-light text-amber flex items-center justify-center shadow-soft shrink-0">
            <Zap className="w-6 h-6 text-amber" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-ink tracking-tight">1-Click Live Demo Scenarios</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-light text-forest">
                INTERVIEW READY
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Instantly run pre-configured flows to showcase LedgerGuard's AI defense & ledger guarantees
            </p>
          </div>
        </div>

        {/* 3 Interactive Cards */}
        <div className="space-y-3.5 mb-6">
          {/* Scenario 1: Safe Transfer */}
          <div
            onClick={handleRunSafeDemo}
            className="group p-4 rounded-2xl border border-cardborder hover:border-forest/40 bg-canvas hover:bg-forest/5 cursor-pointer transition-all flex items-center justify-between"
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-sage-light text-sage flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-ink">Scenario 1: Normal Safe P2P Split</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sage-light text-sage">Risk: 12 (Safe)</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Send ₹500 to trusted contact (Riya Sharma). Passes 4-node AI checks instantly with clean execution.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-forest group-hover:translate-x-1 transition-all shrink-0 ml-3" />
          </div>

          {/* Scenario 2: Phishing Scam */}
          <div
            onClick={handleRunPhishingDemo}
            className="group p-4 rounded-2xl border border-coral/30 hover:border-coral bg-coral/5 hover:bg-coral/10 cursor-pointer transition-all flex items-center justify-between"
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-coral-light text-coral flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-coral">Scenario 2: Electricity Bill Phishing Scam</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-coral text-white">Risk: 92 (Critical)</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Fake Discom urgent bill pressure. Triggers audible voice alert, fraud dialog, and locks money into Safe Escrow.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-coral group-hover:translate-x-1 transition-all shrink-0 ml-3" />
          </div>

          {/* Scenario 3: ATO Intrusion */}
          <div
            onClick={handleRunATODemo}
            className="group p-4 rounded-2xl border border-cardborder hover:border-amber/40 bg-canvas hover:bg-amber/5 cursor-pointer transition-all flex items-center justify-between"
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-light text-amber flex items-center justify-center shrink-0 mt-0.5">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-ink">Scenario 3: Account Takeover (ATO) Shield</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-light text-amber">Active Anomaly</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Unfamiliar device login detected from New Delhi. Demonstrates 1-click remote session revocation & lockdown.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-amber group-hover:translate-x-1 transition-all shrink-0 ml-3" />
          </div>
        </div>

        {/* Footer Actions: QR Scan, Panic Lock, Reset */}
        <div className="pt-4 border-t border-cardborder flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenQRScanner();
              }}
              className="px-3 py-1.5 bg-canvas hover:bg-canvas-alt border border-cardborder text-ink font-bold rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <span>📷 Test QR Scanner</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenPanicLock();
              }}
              className="px-3 py-1.5 bg-coral/10 hover:bg-coral/20 text-coral font-bold rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Test Panic Lock</span>
            </button>
          </div>

          <button
            onClick={handleResetData}
            className="text-ink-muted hover:text-coral font-semibold flex items-center space-x-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
