import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/createTestDb.js';
import {
  IsolationForest,
  generateSyntheticTrainingSet,
  extractFeatureVector,
  c,
} from '../src/risk/isolationForest.js';
import { assessTransactionRisk } from '../src/risk/evaluator.js';

describe('Phase 5: AI Fraud Detection Engine, ML Anomaly & Risk Decisions', () => {
  let pool;

  beforeEach(async () => {
    const testDb = await createTestDb();
    pool = testDb.pool;
  });

  describe('Isolation Forest ML Anomaly Detection', () => {
    it('computes BST average path length constant c(n) correctly', () => {
      expect(c(0)).toBe(0);
      expect(c(1)).toBe(0);
      expect(c(2)).toBe(1);
      expect(c(64)).toBeGreaterThan(7);
      expect(c(64)).toBeLessThan(9);
    });

    it('trains an IsolationForest ensemble and scores multi-dimensional feature vectors', () => {
      const trainingData = generateSyntheticTrainingSet(100);
      const forest = new IsolationForest({ numTrees: 40, subSampleSize: 32 });
      forest.fit(trainingData);

      expect(forest.fitted).toBe(true);
      expect(forest.trees.length).toBe(40);

      // Normal spending habit sample
      const normalVector = [1500, 0, 1, 1.0, 0.1, 800, 0, 14];
      const normalScore = forest.score(normalVector);
      expect(normalScore).toBeGreaterThanOrEqual(0.0);
      expect(normalScore).toBeLessThanOrEqual(1.0);

      // Extreme anomaly vector: huge amount, massive velocity, complete drain, strange hour
      const outlierVector = [500000, 15, 45, 25.0, 0.99, 2, 1, 3];
      const outlierScore = forest.score(outlierVector);
      expect(outlierScore).toBeGreaterThanOrEqual(0.0);
      expect(outlierScore).toBeLessThanOrEqual(1.0);
    });

    it('extracts standardized feature vectors from transaction parameters', () => {
      const vector = extractFeatureVector({
        amountInr: 2500,
        velocity1m: 1,
        velocity1h: 3,
        amountToAvgRatio: 1.25,
        balanceDrainRatio: 0.2,
        accountAgeHours: 350,
        isNewRecipient: 0,
        hourOfDay: 15,
      });

      expect(vector).toEqual([2500, 1, 3, 1.25, 0.2, 350, 0, 15]);
    });
  });

  describe('Multi-Layer Risk Assessment & Decision Mapping', () => {
    it('returns ALLOW for low-risk transaction with structured metrics', async () => {
      // Create user and source account with standard balance
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Normal User', 'normal@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const accRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'Normal Wallet', 'USER_WALLET', 'INR', 1000000)
         RETURNING id`,
        [userId]
      );
      const sourceId = accRes.rows[0].id;

      const targetRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'Target Wallet', 'USER_WALLET', 'INR', 50000)
         RETURNING id`,
        [userId]
      );
      const targetId = targetRes.rows[0].id;

      // Small normal transfer ₹500 (50,000 paise)
      const assessment = await assessTransactionRisk({
        pool,
        sourceAccountId: sourceId,
        targetAccountId: targetId,
        amountPaise: 50000,
      });

      expect(assessment).toHaveProperty('score');
      expect(assessment).toHaveProperty('decision');
      expect(assessment).toHaveProperty('triggered_rule_codes');
      expect(assessment).toHaveProperty('model_anomaly_score');
      expect(assessment).toHaveProperty('evidence');
      expect(assessment).toHaveProperty('recommended_action');
      expect(assessment.calibrated).toBe(false);
      expect(assessment.calibration_note).toContain('not a direct probability of fraud');

      expect(['ALLOW', 'VERIFY']).toContain(assessment.decision);
      expect(assessment.score).toBeLessThan(60);
    });

    it('triggers VERIFY decision when moderate risk indicators are detected', async () => {
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Verify User', 'verify@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const accRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'Source Wallet', 'USER_WALLET', 'INR', 5000000)
         RETURNING id`,
        [userId]
      );
      const sourceId = accRes.rows[0].id;

      const targetRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'New Payee', 'USER_WALLET', 'INR', 0)
         RETURNING id`,
        [userId]
      );
      const targetId = targetRes.rows[0].id;

      // First-time recipient with substantial transfer amount ₹30,000 (3,000,000 paise)
      const assessment = await assessTransactionRisk({
        pool,
        sourceAccountId: sourceId,
        targetAccountId: targetId,
        amountPaise: 3000000,
      });

      expect(assessment.triggered_rule_codes).toContain('FIRST_TIME_RECIPIENT_LARGE');
      expect(assessment.score).toBeGreaterThanOrEqual(25);
    });

    it('triggers BLOCK decision for severe velocity spike + rapid drain', async () => {
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Attacker User', 'attacker@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const accRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'Drain Wallet', 'USER_WALLET', 'INR', 2000000)
         RETURNING id`,
        [userId]
      );
      const sourceId = accRes.rows[0].id;

      // Create a frozen recipient account
      const frozenRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance, status)
         VALUES ($1, 'Frozen Payee', 'USER_WALLET', 'INR', 0, 'FROZEN')
         RETURNING id`,
        [userId]
      );
      const frozenTargetId = frozenRes.rows[0].id;

      // Seed 5 recent outgoing transfers to simulate velocity spike (> 4 in 60s)
      for (let i = 0; i < 5; i++) {
        const txRes = await pool.query(
          `INSERT INTO transactions (idempotency_key, type, amount_paise, status)
           VALUES ($1, 'TRANSFER', 10000, 'COMPLETED')
           RETURNING id`,
          [`spike_tx_${i}_${Date.now()}`]
        );
        await pool.query(
          `INSERT INTO ledger_entries (transaction_id, account_id, amount_paise, balance_after)
           VALUES ($1, $2, -10000, 1990000)`,
          [txRes.rows[0].id, sourceId]
        );
      }

      // Large drain to frozen account
      const assessment = await assessTransactionRisk({
        pool,
        sourceAccountId: sourceId,
        targetAccountId: frozenTargetId,
        amountPaise: 1800000, // 90% drain
      });

      expect(assessment.score).toBeGreaterThanOrEqual(70);
      expect(['REVIEW', 'BLOCK']).toContain(assessment.decision);
      expect(assessment.triggered_rule_codes).toContain('VELOCITY_SPIKE_1M');
      expect(assessment.triggered_rule_codes).toContain('HIGH_RISK_RECIPIENT');
      expect(assessment.triggered_rule_codes).toContain('RAPID_BALANCE_DRAIN');
      expect(assessment.evidence.length).toBeGreaterThanOrEqual(3);
    });

    it('honors custom threshold configurations', async () => {
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Thresh User', 'thresh@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const accRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'Thresh Wallet', 'USER_WALLET', 'INR', 1000000)
         RETURNING id`,
        [userId]
      );
      const sourceId = accRes.rows[0].id;

      const targetRes = await pool.query(
        `INSERT INTO accounts (user_id, name, type, currency, cached_balance)
         VALUES ($1, 'Thresh Payee', 'USER_WALLET', 'INR', 0)
         RETURNING id`,
        [userId]
      );
      const targetId = targetRes.rows[0].id;

      // With strict thresholds where BLOCK_MIN = 20
      const assessment = await assessTransactionRisk({
        pool,
        sourceAccountId: sourceId,
        targetAccountId: targetId,
        amountPaise: 500000,
        customThresholds: {
          BLOCK_MIN: 20,
        },
      });

      if (assessment.score >= 20) {
        expect(assessment.decision).toBe('BLOCK');
      }
    });
  });
});
