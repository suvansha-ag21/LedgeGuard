/**
 * Recipient Trust Check Engine
 *
 * Evaluates recipient risk signals before a transfer is confirmed.
 * Considers verified fraud incidents, suspicious patterns, linked-account signals,
 * and user-submitted reports with confidence scoring.
 *
 * Clearly labeled as simulated intelligence (does not access real-world credit bureaus).
 */

export const RECIPIENT_TRUST_TIERS = {
  NO_KNOWN_RISK: 'NO_KNOWN_RISK',
  CAUTION_RECOMMENDED: 'CAUTION_RECOMMENDED',
  HIGH_RISK_DETECTED: 'HIGH_RISK_DETECTED',
};

// Known simulated recipient intelligence profiles
const SIMULATED_RECIPIENT_PROFILES = {
  'acc_riya': {
    name: 'Riya Sharma',
    phone: '+91 98201 44810',
    rawPhone: '9820144810',
    upi: 'riya@okhdfc',
    accountAgeMonths: 24,
    verifiedStatus: 'VERIFIED_KYC',
    confirmedFraudIncidents: 0,
    disputeRatePct: 0.0,
    unverifiedReportsCount: 0,
    trustScore: 98,
    tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
    evidence: [
      'Account in good standing for 24 months with regular transaction activity',
      'Zero reported scams, disputes, or security incidents',
      'Government ID and KYC verified on platform',
    ],
  },
  'acc_aditya': {
    name: 'Aditya Singh',
    phone: '+91 98112 33490',
    rawPhone: '9811233490',
    upi: 'aditya@oksbi',
    accountAgeMonths: 14,
    verifiedStatus: 'VERIFIED_KYC',
    confirmedFraudIncidents: 0,
    disputeRatePct: 0.0,
    unverifiedReportsCount: 0,
    trustScore: 95,
    tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
    evidence: [
      'Account active for 14 months with consistent inflow/outflow patterns',
      'Zero dispute complaints across all linked accounts',
      'Two-factor authentication verified',
    ],
  },
  'acc_zara': {
    name: 'Zara Khan',
    phone: '+91 99304 88219',
    rawPhone: '9930488219',
    upi: 'zara@okaxis',
    accountAgeMonths: 8,
    verifiedStatus: 'VERIFIED_KYC',
    confirmedFraudIncidents: 0,
    disputeRatePct: 0.0,
    unverifiedReportsCount: 0,
    trustScore: 92,
    tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
    evidence: [
      'Account active for 8 months with verified identity',
      'Zero chargeback or scam reports recorded',
    ],
  },
  'acc_bank': {
    name: 'External Bank (HDFC)',
    phone: '022 6160 6161',
    rawPhone: '02261606161',
    upi: 'hdfc.bridge@rbi',
    accountAgeMonths: 36,
    verifiedStatus: 'SYSTEM_BANK',
    confirmedFraudIncidents: 0,
    disputeRatePct: 0.0,
    unverifiedReportsCount: 0,
    trustScore: 100,
    tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
    evidence: [
      'Verified RBI-regulated banking institution counterparty',
      'Direct NEFT/RTGS settlement bridge',
    ],
  },
  'acc_techcorp': {
    name: 'TechCorp Services',
    phone: '+91 97110 55420',
    rawPhone: '9711055420',
    upi: 'techcorp@billpay',
    accountAgeMonths: 1,
    verifiedStatus: 'BASIC_UNVERIFIED',
    confirmedFraudIncidents: 0,
    disputeRatePct: 2.5,
    unverifiedReportsCount: 1,
    trustScore: 65,
    tier: RECIPIENT_TRUST_TIERS.CAUTION_RECOMMENDED,
    evidence: [
      'New business account created less than 30 days ago',
      'First-time recipient for your wallet',
      '1 unverified user report pending compliance evaluation',
    ],
  },
  'acc_shadow_crypto': {
    name: 'ShadowCrypto OTC Exchange',
    phone: '+91 90000 00666',
    rawPhone: '9000000666',
    upi: 'shadow@crypto.otc',
    accountAgeMonths: 0.5,
    verifiedStatus: 'FLAGGED',
    confirmedFraudIncidents: 3,
    disputeRatePct: 48.0,
    unverifiedReportsCount: 7,
    trustScore: 15,
    tier: RECIPIENT_TRUST_TIERS.HIGH_RISK_DETECTED,
    evidence: [
      'Linked to 3 confirmed rapid balance drain incidents on platform',
      'Multiple user dispute reports alleging unfulfilled P2P trades',
      'Unusual cross-border routing signals detected',
    ],
  },
  'acc_kunal': {
    name: 'Kunal Mehta (New Payee)',
    phone: '+91 91234 56789',
    rawPhone: '9123456789',
    upi: 'kunal.m@paytm',
    accountAgeMonths: 0.2,
    verifiedStatus: 'BASIC_UNVERIFIED',
    confirmedFraudIncidents: 0,
    disputeRatePct: 0.0,
    unverifiedReportsCount: 0,
    trustScore: 70,
    tier: RECIPIENT_TRUST_TIERS.CAUTION_RECOMMENDED,
    evidence: [
      'First-time recipient: You have never sent money to this account before',
      'Newly provisioned account (created 6 days ago)',
      'No confirmed fraud incidents reported, but caution is advised for initial transfer',
    ],
  },
  'acc_telegram_scam': {
    name: 'Telegram Task Scam Syndicate',
    phone: '+91 98765 00000',
    rawPhone: '9876500000',
    upi: 'tasks.payout@scam.in',
    accountAgeMonths: 0.1,
    verifiedStatus: 'FLAGGED_SYNDICATE',
    confirmedFraudIncidents: 8,
    disputeRatePct: 85.0,
    unverifiedReportsCount: 24,
    trustScore: 5,
    tier: RECIPIENT_TRUST_TIERS.HIGH_RISK_DETECTED,
    evidence: [
      'Flagged for "Like videos to earn money" Ponzi advance-fee scam',
      '24 user dispute reports alleging blocked withdrawals after depositing money',
      'Rapid automated drain to untraceable accounts within seconds of receiving funds',
    ],
  },
  'acc_coffee': {
    name: 'Blue Tokai Coffee Roasters',
    phone: '080 4123 9081',
    rawPhone: '08041239081',
    upi: 'bluetokai@icici',
    accountAgeMonths: 48,
    verifiedStatus: 'VERIFIED_MERCHANT',
    confirmedFraudIncidents: 0,
    disputeRatePct: 0.0,
    unverifiedReportsCount: 0,
    trustScore: 99,
    tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
    evidence: [
      'Verified registered retail merchant with ICICI Bank merchant gateway',
      'Consistent transaction history with 0 dispute rate across 48 months',
    ],
  },
};

/**
 * Evaluates recipient risk signals before payment execution.
 *
 * @param {object} params
 * @param {string} params.recipientId - Recipient account ID or key
 * @param {string} [params.recipientName] - Optional display name
 * @param {string} [params.recipientPhone] - Optional mobile phone number
 * @param {number} [params.amountPaise] - Proposed transfer amount in paise
 * @returns {object} Structured trust assessment
 */
export function evaluateRecipientTrust({ recipientId, recipientName = '', recipientPhone = '', amountPaise = 0 }) {
  const cleanPhone = (recipientPhone || recipientId || '').replace(/\D/g, '');

  // 1. Check exact key match
  let profile = SIMULATED_RECIPIENT_PROFILES[recipientId];

  // 2. Check phone number match across profiles
  if (!profile && cleanPhone) {
    profile = Object.values(SIMULATED_RECIPIENT_PROFILES).find(
      (p) => p.rawPhone === cleanPhone || (p.phone && p.phone.replace(/\D/g, '') === cleanPhone)
    );
  }

  // 3. Dynamic evaluation for typed custom mobile numbers or handles
  if (!profile) {
    if (
      cleanPhone === '9000000666' ||
      (recipientId && recipientId.toLowerCase().includes('shadow')) ||
      (recipientName && recipientName.toLowerCase().includes('crypto'))
    ) {
      profile = SIMULATED_RECIPIENT_PROFILES['acc_shadow_crypto'];
    } else if (cleanPhone && (cleanPhone.length === 10 || cleanPhone.endsWith(cleanPhone.slice(-10)))) {
      const standard10 = cleanPhone.slice(-10);
      profile = {
        name: recipientName || `Mobile (+91 ${standard10.slice(0, 5)} ${standard10.slice(5)})`,
        accountAgeMonths: 18,
        verifiedStatus: 'VERIFIED_MOBILE_KYC',
        confirmedFraudIncidents: 0,
        disputeRatePct: 0.0,
        unverifiedReportsCount: 0,
        trustScore: 92,
        tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
        evidence: [
          'Valid 10-digit Indian mobile number (+91) verified with simulated NPCI directory',
          'Zero fraud or suspicious activity reports registered against this phone',
          'Linked UPI virtual payment address active and ready for zero-sum settlement',
        ],
      };
    } else {
      profile = {
        name: recipientName || recipientId || 'Recipient Account',
        accountAgeMonths: 2,
        verifiedStatus: 'STANDARD',
        confirmedFraudIncidents: 0,
        disputeRatePct: 0.0,
        unverifiedReportsCount: 0,
        trustScore: 85,
        tier: RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK,
        evidence: [
          'Account active with no prior verified fraud incidents',
          'Standard counterparty with no active compliance restrictions',
        ],
      };
    }
  }

  let finalTier = profile.tier;
  let finalScore = profile.trustScore;
  const evidence = [...profile.evidence];

  // If high amount (> ₹25,000) sent to an unverified or recently created account, elevate caution
  if (amountPaise > 2500000 && profile.accountAgeMonths < 3) {
    if (finalTier === RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK) {
      finalTier = RECIPIENT_TRUST_TIERS.CAUTION_RECOMMENDED;
      finalScore = Math.min(finalScore, 70);
      evidence.push('High transfer amount (> ₹25,000) directed to a recipient account under 90 days old');
    }
  }

  const action =
    finalTier === RECIPIENT_TRUST_TIERS.HIGH_RISK_DETECTED
      ? 'REQUIRE_REAUTH_OR_HOLD'
      : finalTier === RECIPIENT_TRUST_TIERS.CAUTION_RECOMMENDED
      ? 'WARN_CONFIRM'
      : 'PROCEED';

  return {
    recipientId,
    recipientName: profile.name,
    trustScore: finalScore,
    tier: finalTier,
    action,
    evidence,
    verifiedStatus: profile.verifiedStatus,
    confirmedIncidents: profile.confirmedFraudIncidents,
    isSimulatedData: true,
  };
}
