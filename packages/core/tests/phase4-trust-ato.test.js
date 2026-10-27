import { describe, it, expect } from 'vitest';
import {
  evaluateRecipientTrust,
  RECIPIENT_TRUST_TIERS,
} from '../src/risk/trustCheck.js';
import {
  evaluateAccountTakeoverRisk,
  ATO_THREAT_LEVELS,
  ATO_ENFORCEMENT_ACTIONS,
} from '../src/risk/atoShield.js';

describe('Phase 4: Recipient Trust Check & Account Takeover (ATO) Shield', () => {
  describe('Recipient Trust Check Engine', () => {
    it('evaluates safe, verified recipients with NO_KNOWN_RISK', () => {
      const assessment = evaluateRecipientTrust({
        recipientId: 'acc_riya',
        amountPaise: 50000,
      });

      expect(assessment.tier).toBe(RECIPIENT_TRUST_TIERS.NO_KNOWN_RISK);
      expect(assessment.action).toBe('PROCEED');
      expect(assessment.trustScore).toBeGreaterThanOrEqual(90);
      expect(assessment.confirmedIncidents).toBe(0);
      expect(assessment.evidence.length).toBeGreaterThan(0);
      expect(assessment.isSimulatedData).toBe(true);
    });

    it('flags unverified or recently created merchants as CAUTION_RECOMMENDED', () => {
      const assessment = evaluateRecipientTrust({
        recipientId: 'acc_techcorp',
        amountPaise: 500000,
      });

      expect(assessment.tier).toBe(RECIPIENT_TRUST_TIERS.CAUTION_RECOMMENDED);
      expect(assessment.action).toBe('WARN_CONFIRM');
      expect(assessment.trustScore).toBeLessThan(80);
      expect(assessment.evidence.some((e) => e.includes('30 days'))).toBe(true);
    });

    it('flags known scam/drain accounts as HIGH_RISK_DETECTED', () => {
      const assessment = evaluateRecipientTrust({
        recipientId: 'acc_shadow_crypto',
        amountPaise: 1000000,
      });

      expect(assessment.tier).toBe(RECIPIENT_TRUST_TIERS.HIGH_RISK_DETECTED);
      expect(assessment.action).toBe('REQUIRE_REAUTH_OR_HOLD');
      expect(assessment.trustScore).toBeLessThan(40);
      expect(assessment.confirmedIncidents).toBeGreaterThanOrEqual(1);
    });

    it('elevates caution when large amount (> ₹25,000) is sent to a young account', () => {
      const assessment = evaluateRecipientTrust({
        recipientId: 'acc_new_merchant',
        recipientName: 'New Merchant Store',
        amountPaise: 3000000, // ₹30,000
      });

      expect(assessment.tier).toBe(RECIPIENT_TRUST_TIERS.CAUTION_RECOMMENDED);
      expect(assessment.action).toBe('WARN_CONFIRM');
    });
  });

  describe('Account Takeover (ATO) Shield Engine', () => {
    it('approves standard sessions under normal baseline as CLEAN', () => {
      const result = evaluateAccountTakeoverRisk({
        isNewDevice: false,
        recentPasswordReset: false,
        failedLoginAttempts: 0,
        transferAmountPaise: 50000, // ₹500
        recipientTier: 'NO_KNOWN_RISK',
      });

      expect(result.threatLevel).toBe(ATO_THREAT_LEVELS.CLEAN);
      expect(result.action).toBe(ATO_ENFORCEMENT_ACTIONS.ALLOW);
      expect(result.requiresStepUp).toBe(false);
      expect(result.requiresReviewHold).toBe(false);
    });

    it('requires 2FA step-up verification when unfamiliar device transfers substantial amount', () => {
      const result = evaluateAccountTakeoverRisk({
        isNewDevice: true,
        recentPasswordReset: false,
        failedLoginAttempts: 1,
        transferAmountPaise: 1500000, // ₹15,000
        recipientTier: 'NO_KNOWN_RISK',
      });

      expect(result.threatLevel).toBe(ATO_THREAT_LEVELS.ELEVATED);
      expect(result.action).toBe(ATO_ENFORCEMENT_ACTIONS.REQUIRE_STEP_UP);
      expect(result.requiresStepUp).toBe(true);
      expect(result.triggeredSignals.some((s) => s.includes('unrecognized device'))).toBe(true);
    });

    it('detects compound ATO pattern (unfamiliar device + password reset + risky recipient) and enforces HOLD_FOR_REVIEW', () => {
      const result = evaluateAccountTakeoverRisk({
        isNewDevice: true,
        recentPasswordReset: true,
        failedLoginAttempts: 4,
        transferAmountPaise: 5000000, // ₹50,000
        recipientTier: 'HIGH_RISK_DETECTED',
      });

      expect(result.threatLevel).toBe(ATO_THREAT_LEVELS.CRITICAL);
      expect(result.action).toBe(ATO_ENFORCEMENT_ACTIONS.HOLD_FOR_REVIEW);
      expect(result.requiresReviewHold).toBe(true);
      expect(result.triggeredSignals.some((s) => s.includes('Classic ATO Pattern'))).toBe(true);
    });
  });
});
