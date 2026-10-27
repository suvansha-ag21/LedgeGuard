/**
 * LedgerGuard Smart Voice & Audio Alert Engine
 *
 * Provides real-time synthesized voice announcements and security tones
 * whenever suspicious transactions, account takeover attempts, or risky recipients
 * are detected across payments.
 *
 * Uses native Web Audio API (for security chimes) and Web Speech API (for natural speech),
 * requiring zero external audio files, API keys, or cloud latency.
 */

// Local storage key for persistent user mute/unmute preference
const VOICE_PREF_KEY = 'ledgerguard_voice_alerts_enabled';

/**
 * Checks if voice announcements are enabled by the user. Defaults to true.
 */
export function isVoiceEnabled() {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(VOICE_PREF_KEY);
  return stored === null ? true : stored === 'true';
}

/**
 * Toggles or sets voice alert state.
 */
export function setVoiceEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOICE_PREF_KEY, enabled ? 'true' : 'false');
  // Dispatch custom window event so Header icon updates instantly
  window.dispatchEvent(new CustomEvent('ledgerguard:voice_toggle', { detail: { enabled } }));
}

/**
 * Plays an instant synthesized audio chime using Web Audio API.
 * 
 * @param {'warning' | 'alert' | 'success'} type
 */
export function playChime(type = 'warning') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'warning' || type === 'alert') {
      // Urgent security two-tone warning: 520 Hz -> 390 Hz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(390, now + 0.18);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(520, now);
      osc2.frequency.exponentialRampToValueAtTime(390, now + 0.18);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } else if (type === 'success') {
      // Pleasant confirmation ding-dong: C5 (523Hz) -> E5 (659Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    // Audio context may require user gesture on first load; safe fallback
  }
}

/**
 * Speaks a security alert or announcement out loud using Web Speech API.
 *
 * @param {string} text Plain English alert to speak
 * @param {object} options
 * @param {'warning' | 'alert' | 'success' | 'none'} [options.chime='warning']
 * @param {boolean} [options.force=false] Speak even if globally muted (e.g. user manually clicked "Listen")
 */
export function speakVoiceAlert(text, { chime = 'warning', force = false } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!force && !isVoiceEnabled()) return;

  try {
    // Stop any existing speech
    window.speechSynthesis.cancel();

    // Play synthesized tone
    if (chime !== 'none') {
      playChime(chime);
    }

    // Short delay to let chime play cleanly before voice begins
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      // Try to find natural English voice
      const bestVoice =
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => v.lang.startsWith('en-GB')) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices[0];

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      window.speechSynthesis.speak(utterance);
    }, chime !== 'none' ? 220 : 0);
  } catch (err) {
    console.warn('Voice announcement error:', err);
  }
}

/**
 * Stop any active speech immediately.
 */
export function cancelVoiceAlert() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// -------------------------------------------------------------
// Pre-configured Plain-English Fintech Voice Announcements
// -------------------------------------------------------------

export function announceSuspiciousRecipient(name, tier = 'HIGH') {
  if (tier === 'HIGH' || tier === 'HIGH_RISK_DETECTED') {
    speakVoiceAlert(
      `Warning! LedgerGuard detected high risk indicators for ${name}. This account was linked to reported scams. Please confirm before sending money.`,
      { chime: 'alert' }
    );
  } else {
    speakVoiceAlert(
      `Security notice: ${name} is a newly registered recipient. Please verify their phone number or account details.`,
      { chime: 'warning' }
    );
  }
}

export function announceAtoThreat() {
  speakVoiceAlert(
    `Security alert: Unfamiliar device activity detected on your account. Two-step verification is required to authorize this transfer.`,
    { chime: 'alert' }
  );
}

export function announceHeldPayment(amountRupees, recipientName) {
  speakVoiceAlert(
    `Security alert: Transfer of ₹${amountRupees} to ${recipientName} has been paused and held in escrow for your protection.`,
    { chime: 'warning' }
  );
}

export function announcePaymentSuccess(amountRupees, recipientName) {
  speakVoiceAlert(
    `Transfer of ₹${amountRupees} to ${recipientName} completed successfully. Double-entry ledger verified.`,
    { chime: 'success' }
  );
}

export function announceUnusualSpending(recipientName, amountRupees, timesHigher = '4') {
  speakVoiceAlert(
    `Spending alert: Payment of ₹${amountRupees} to ${recipientName} is ${timesHigher} times higher than your normal spending average. LedgerGuard has held this transfer in review.`,
    { chime: 'alert', force: true }
  );
}

export function announceFishyScam(recipientName = 'this recipient', reason = 'fraudulent reports') {
  speakVoiceAlert(
    `Warning! Suspicious activity detected. Transfer to ${recipientName} flagged for ${reason}. Please confirm carefully before sending money.`,
    { chime: 'alert', force: true }
  );
}

export function announceFishyCollectRequest(senderName = 'Unknown', amount = '₹4,999') {
  speakVoiceAlert(
    `Warning! Phishing scam collect request detected from ${senderName} for ${amount}. Never enter your UPI PIN to receive money. UPI PIN is only needed to send money.`,
    { chime: 'alert', force: true }
  );
}

export function announceThreatBlocked() {
  speakVoiceAlert(
    `Threat successfully blocked. Your account and money are completely safe.`,
    { chime: 'success', force: true }
  );
}
