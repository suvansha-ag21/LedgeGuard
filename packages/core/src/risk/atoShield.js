/**
 * Account Takeover (ATO) Shield Engine
 *
 * Correlates account access signals (failed login spikes, unfamiliar devices,
 * password resets, session anomalies) with outgoing transaction risk.
 */

export const ATO_THREAT_LEVELS = {
  CLEAN: 'CLEAN',
  ELEVATED: 'ELEVATED',
  CRITICAL: 'CRITICAL',
};

export const ATO_ENFORCEMENT_ACTIONS = {
  ALLOW: 'ALLOW',
  REQUIRE_STEP_UP: 'REQUIRE_STEP_UP',
  HOLD_FOR_REVIEW: 'HOLD_FOR_REVIEW',
  BLOCK: 'BLOCK',
};

/**
 * Assesses Account Takeover risk across session signals and transaction parameters.
 *
 * @param {object} params
 * @param {boolean} [params.isNewDevice=false] Unfamiliar device or browser fingerprint
 * @param {boolean} [params.recentPasswordReset=false] Password changed in the last 24 hours
 * @param {number} [params.failedLoginAttempts=0] Failed attempts in last 1 hour
 * @param {boolean} [params.recentEmailChange=false] Contact details recently modified
 * @param {number} [params.transferAmountPaise=0] Transfer amount in paise
 * @param {string} [params.recipientTier='NO_KNOWN_RISK'] Recipient trust tier
 * @returns {object} Structured ATO risk assessment
 */
export function evaluateAccountTakeoverRisk({
  isNewDevice = false,
  recentPasswordReset = false,
  failedLoginAttempts = 0,
  recentEmailChange = false,
  transferAmountPaise = 0,
  recipientTier = 'NO_KNOWN_RISK',
}) {
  const triggeredSignals = [];
  let threatScore = 0;

  const amountInr = transferAmountPaise / 100;

  // Signal 1: Unfamiliar Device
  if (isNewDevice) {
    threatScore += 25;
    triggeredSignals.push('Session initiated from an unrecognized device or browser');
  }

  // Signal 2: Recent Password Reset
  if (recentPasswordReset) {
    threatScore += 30;
    triggeredSignals.push('Account password was changed within the past 24 hours');
  }

  // Signal 3: Failed Login Attempts Spike
  if (failedLoginAttempts >= 3) {
    threatScore += 25;
    triggeredSignals.push(`${failedLoginAttempts} failed password attempts detected prior to current session`);
  }

  // Signal 4: Recent Profile / Email Change
  if (recentEmailChange) {
    threatScore += 20;
    triggeredSignals.push('Primary account contact credentials updated recently');
  }

  // Signal 5: Correlated High-Value Outflow (> ₹10,000) under access anomalies
  const hasAccessAnomaly = isNewDevice || recentPasswordReset || failedLoginAttempts >= 2;
  if (hasAccessAnomaly && amountInr >= 10000) {
    threatScore += 30;
    triggeredSignals.push(
      `Substantial outflow (₹${amountInr.toLocaleString('en-IN')}) attempted under active session anomaly`
    );
  }

  // Signal 6: Compound Threat: Unfamiliar device + Password Reset + Risky Recipient
  if (isNewDevice && recentPasswordReset && recipientTier !== 'NO_KNOWN_RISK') {
    threatScore += 40;
    triggeredSignals.push('Classic ATO Pattern: Unrecognized device + password reset + risky/new recipient');
  }

  // Determine threat level and enforcement action
  let threatLevel = ATO_THREAT_LEVELS.CLEAN;
  let action = ATO_ENFORCEMENT_ACTIONS.ALLOW;
  let explanation = 'Account activity matches normal baseline. Standard payment processing approved.';

  if (threatScore >= 65) {
    threatLevel = ATO_THREAT_LEVELS.CRITICAL;
    action = ATO_ENFORCEMENT_ACTIONS.HOLD_FOR_REVIEW;
    explanation =
      'High probability of Account Takeover (ATO) detected. Payment held in PLATFORM_HOLD escrow for identity verification.';
  } else if (threatScore >= 30) {
    threatLevel = ATO_THREAT_LEVELS.ELEVATED;
    action = ATO_ENFORCEMENT_ACTIONS.REQUIRE_STEP_UP;
    explanation =
      'Elevated security anomaly detected. Two-factor re-authentication or biometric confirmation required.';
  }

  return {
    threatScore: Math.min(100, threatScore),
    threatLevel,
    action,
    triggeredSignals,
    explanation,
    requiresStepUp: action === ATO_ENFORCEMENT_ACTIONS.REQUIRE_STEP_UP,
    requiresReviewHold: action === ATO_ENFORCEMENT_ACTIONS.HOLD_FOR_REVIEW,
  };
}
