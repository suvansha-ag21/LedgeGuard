import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Volume2,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Ban,
  HelpCircle
} from 'lucide-react';
import {
  speakVoiceAlert,
  announceThreatBlocked,
  isVoiceEnabled
} from '../utils/voiceAlert.js';
import { FISHY_ALERT_EVENT } from '../utils/fishyAlert.js';

export default function FishyAlertModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const handleAlertEvent = (e) => {
      if (e.detail) {
        setData(e.detail);
        setIsBlocked(false);
        setIsOpen(true);

        // Announce voice alert immediately
        const speechText =
          e.detail.voiceMessage ||
          `Warning! Suspicious activity detected. ${e.detail.title}. ${e.detail.reason || ''}`;
        speakVoiceAlert(speechText, { chime: 'alert', force: true });
      }
    };

    window.addEventListener(FISHY_ALERT_EVENT, handleAlertEvent);
    return () => window.removeEventListener(FISHY_ALERT_EVENT, handleAlertEvent);
  }, []);

  if (!isOpen || !data) return null;

  const handleClose = () => {
    setIsOpen(false);
    setData(null);
    setIsBlocked(false);
  };

  const handleBlock = () => {
    setIsBlocked(true);
    announceThreatBlocked();
    if (data.onBlock) {
      data.onBlock();
    }
    setTimeout(() => {
      handleClose();
    }, 1400);
  };

  const handleProceed = () => {
    if (data.onProceed) {
      data.onProceed();
    }
    handleClose();
  };

  const handleReplayVoice = () => {
    const speechText =
      data.voiceMessage ||
      `Warning! Suspicious activity detected. ${data.title}. ${data.reason || ''}`;
    speakVoiceAlert(speechText, { chime: 'alert', force: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-lg border-2 border-coral shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fishy-alert-title"
      >
        {/* Top Warning Banner */}
        <div className="bg-coral text-white px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 animate-pulse">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full inline-block mb-1">
                ⚠️ Security Alert Popup
              </span>
              <h2 id="fishy-alert-title" className="text-base font-black tracking-tight leading-tight">
                {data.title || 'Fishy Activity Detected!'}
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Target Counterparty / Transaction Card */}
          {(data.recipient || data.amount) && (
            <div className="bg-coral-light/30 border border-coral/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-coral uppercase tracking-wider">
                  Flagged Target / Action
                </span>
                <div className="text-sm font-extrabold text-ink">
                  {data.recipient || 'Suspicious Target'}
                </div>
                {data.category && (
                  <span className="text-[11px] font-mono text-ink-muted">
                    Category: {data.category}
                  </span>
                )}
              </div>
              {data.amount && (
                <div className="text-right">
                  <span className="text-[10px] text-ink-muted block font-medium">Flagged Amount</span>
                  <span className="text-lg font-black text-coral font-mono">{data.amount}</span>
                </div>
              )}
            </div>
          )}

          {/* Plain English Explanation */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black text-ink uppercase tracking-wider flex items-center space-x-1.5">
              <span>Why This Activity Is Flagged:</span>
            </h3>
            <p className="text-xs text-ink/80 leading-relaxed font-medium bg-canvas p-3.5 rounded-2xl border border-cardborder">
              {data.reason ||
                'LedgerGuard AI detected high-risk scam indicators or unusual access signals that deviate from your normal safe habits.'}
            </p>
          </div>

          {/* Specific Threat Signals */}
          {data.signals && data.signals.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-coral flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-coral" />
                <span>Detected Security Threat Indicators:</span>
              </span>
              <div className="space-y-1.5">
                {data.signals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-xs text-ink p-2 rounded-xl bg-amber-light/25 border border-amber/20"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-coral mt-1.5 shrink-0"></span>
                    <span className="leading-tight">{sig}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Golden Consumer Rule */}
          <div className="p-3.5 rounded-2xl bg-forest/5 border border-forest/20 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-forest mt-0.5 shrink-0" />
            <div className="text-xs text-ink">
              <span className="font-bold text-forest block">Consumer Protection Rule:</span>
              <p className="text-ink-muted text-[11px] mt-0.5 leading-snug">
                {data.safetyTip ||
                  'Never share your OTP, UPI PIN, or password with anyone. Genuine banks will never ask you to authorize a transfer to receive cash prizes.'}
              </p>
            </div>
          </div>

          {/* Voice Replay Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleReplayVoice}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-canvas-alt border border-cardborder text-xs font-bold text-ink hover:text-coral transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-coral" />
              <span>🔊 Replay Spoken Voice Warning</span>
            </button>
            <span className="text-[10px] text-ink-muted font-medium">Real-time AI Guard</span>
          </div>

          {/* Blocked Confirmation State Banner */}
          {isBlocked && (
            <div className="p-3 bg-sage-light border border-sage rounded-2xl flex items-center space-x-2 text-sage text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Threat Blocked Successfully! Your wallet and funds remain safe.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-cardborder bg-canvas/60 flex flex-col sm:flex-row items-center gap-2.5">
          {/* Primary Action: Keep Money Safe / Block */}
          <button
            type="button"
            onClick={handleBlock}
            disabled={isBlocked}
            className="w-full sm:flex-1 py-3 px-4 bg-coral hover:bg-coral-hover text-white text-xs font-extrabold rounded-2xl shadow-soft transition-all flex items-center justify-center space-x-2 active:scale-98"
          >
            <Ban className="w-4 h-4" />
            <span>🛡️ Block & Keep My Money Safe</span>
          </button>

          {/* Secondary Action: Proceed at own risk or with review */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={isBlocked}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-cardborder hover:bg-white text-xs font-bold text-ink-muted hover:text-ink transition-colors"
          >
            {data.proceedText || 'Proceed Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
