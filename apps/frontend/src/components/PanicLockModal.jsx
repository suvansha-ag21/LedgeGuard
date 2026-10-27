import React, { useState } from 'react';
import { ShieldAlert, Lock, Unlock, AlertTriangle, CheckCircle2, X, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { playChime, speakVoiceAlert } from '../utils/voiceAlert.js';

export default function PanicLockModal({ isOpen, onClose }) {
  const { isFrozen, freezeAccount, unfreezeAccount } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleActivateLock = () => {
    freezeAccount('Manual Emergency User Panic Lockdown triggered');
    playChime('alert');
    speakVoiceAlert('Emergency lockdown activated. All outgoing transfers and payments are immediately frozen.', {
      chime: 'alert',
      force: true,
    });
    setSuccessMsg('Account has been frozen. Outgoing transfers blocked.');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  const handleUnlock = (e) => {
    e?.preventDefault();
    if (pin.length < 4) {
      setError('Please enter a 4-digit PIN (Demo: 1234)');
      return;
    }
    unfreezeAccount(pin);
    playChime('success');
    speakVoiceAlert('Identity verified. Emergency lockdown lifted. Your account is active.', {
      chime: 'success',
      force: true,
    });
    setSuccessMsg('Lockdown lifted. Your wallet is unlocked.');
    setError('');
    setTimeout(() => {
      setSuccessMsg('');
      setPin('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-cardborder relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-canvas-alt transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isFrozen ? (
          /* Lockdown Confirmation View */
          <div className="space-y-5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-coral-light text-coral flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-coral" />
              </div>
              <div>
                <h3 className="text-lg font-black text-ink">Emergency Panic Freeze</h3>
                <p className="text-xs text-ink-muted">Immediate outgoing payment lockdown</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-coral/5 border border-coral/20 text-xs text-ink space-y-2">
              <div className="font-bold text-coral flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Suspect Fraud, Phishing, or Account Theft?</span>
              </div>
              <p className="text-ink-muted leading-relaxed">
                Activating Emergency Lockdown immediately halts all outgoing transfers, UPI requests, and withdrawals.
                Your current balance stays safe in immutable escrow.
              </p>
            </div>

            <div className="space-y-2 text-xs text-ink-muted">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
                <span>Zero outbound transfers permitted while locked</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
                <span>Unlock anytime using your 4-digit PIN</span>
              </div>
            </div>

            {successMsg ? (
              <div className="p-3 bg-coral text-white rounded-xl text-xs font-bold text-center">
                {successMsg}
              </div>
            ) : (
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-canvas hover:bg-canvas-alt border border-cardborder text-xs font-bold text-ink rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActivateLock}
                  className="flex-1 py-3 bg-coral hover:bg-coral-hover text-xs font-bold text-white rounded-xl shadow-soft transition-all flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Account Now</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Unlock with PIN View */
          <div className="space-y-5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-light text-amber flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-amber" />
              </div>
              <div>
                <h3 className="text-lg font-black text-ink">Account is Currently Frozen</h3>
                <p className="text-xs text-ink-muted">Enter PIN to unlock outgoing transfers</p>
              </div>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 flex items-center justify-between">
                  <span>4-Digit Security PIN</span>
                  <span className="text-[10px] text-ink-muted font-normal">(Demo PIN: 1234)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    placeholder="••••"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-canvas border border-cardborder rounded-xl text-center text-xl font-mono tracking-widest text-ink focus:outline-none focus:border-forest"
                  />
                </div>
                {error && <p className="text-[11px] text-coral font-bold mt-1.5">{error}</p>}
              </div>

              {successMsg ? (
                <div className="p-3 bg-sage text-white rounded-xl text-xs font-bold text-center">
                  {successMsg}
                </div>
              ) : (
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-canvas hover:bg-canvas-alt border border-cardborder text-xs font-bold text-ink rounded-xl transition-all"
                  >
                    Keep Locked
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-forest hover:bg-forest-light text-xs font-bold text-white rounded-xl shadow-soft transition-all flex items-center justify-center space-x-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Account</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
