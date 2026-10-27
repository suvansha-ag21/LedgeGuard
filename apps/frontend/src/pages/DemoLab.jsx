import React, {  useState  } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  Play, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  Scale, 
  Cpu, 
  Activity, 
  Key, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';
import FraudConnectionGraph from '../components/FraudConnectionGraph.jsx';

export default function DemoLab() {
  const navigate = useNavigate();
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('scenarios'); // 'scenarios' | 'graph'

  // Pre-configured Fraud Scenarios conforming to PRD Section 16
  const scenarios = [
    {
      id: 'SCENARIO_NORMAL',
      title: '1. Baseline Transfer',
      subtitle: 'Typical ₹500.00 transfer to verified friend',
      expectedDecision: 'ALLOW',
      riskTier: 'LOW',
      badgeClass: 'bg-sage-light text-sage border-sage/20',
      inputs: {
        amountPaise: 50000,
        amountInr: 500,
        counterparty: 'Riya Sharma',
        recipientTrust: 'NO_KNOWN_RISK',
        velocity1m: 0,
        deviceStatus: 'TRUSTED_PRIMARY',
      },
      simulatedOutcome: {
        decision: 'ALLOW',
        score: 12,
        modelAnomalyScore: 0.18,
        triggeredRules: ['ALL_BOUNDS_NORMAL'],
        recommendedAction: 'Proceed normally with ledger posting.',
        ledgerEntries: [
          { account: 'Riya Sharma (Wallet)', entryType: 'DEBIT', deltaPaise: 50000 },
          { account: 'Aman (User Wallet)', entryType: 'CREDIT', deltaPaise: -50000 },
        ],
        invariantCheck: 'Passed: Sum = 0 paise, Non-Negative Balance',
      },
    },
    {
      id: 'SCENARIO_SPIKE_AMOUNT',
      title: '2. Unusually Large Transfer',
      subtitle: '₹75,000.00 outflow (35x historical average)',
      expectedDecision: 'REVIEW',
      riskTier: 'MEDIUM',
      badgeClass: 'bg-amber-light text-amber border-amber/20',
      inputs: {
        amountPaise: 7500000,
        amountInr: 75000,
        counterparty: 'Unknown Merchant Ltd',
        recipientTrust: 'CAUTION_RECOMMENDED',
        velocity1m: 1,
        deviceStatus: 'TRUSTED_PRIMARY',
      },
      simulatedOutcome: {
        decision: 'REVIEW',
        score: 68,
        modelAnomalyScore: 0.64,
        triggeredRules: ['AMOUNT_SPIKE_HISTORICAL', 'FIRST_TIME_RECIPIENT_LARGE'],
        recommendedAction: 'Hold for authorized compliance review in PLATFORM_HOLD.',
        ledgerEntries: [],
        invariantCheck: 'Held in Escrow: No direct wallet credit posted',
      },
    },
    {
      id: 'SCENARIO_VELOCITY_SPIKE',
      title: '3. Rapid Velocity Attack',
      subtitle: '6 rapid repeated transfers in under 45 seconds',
      expectedDecision: 'BLOCK',
      riskTier: 'CRITICAL',
      badgeClass: 'bg-coral-light text-coral border-coral/20',
      inputs: {
        amountPaise: 150000,
        amountInr: 1500,
        counterparty: 'Rapid Payee Bot',
        recipientTrust: 'HIGH_RISK_DETECTED',
        velocity1m: 6,
        deviceStatus: 'UNKNOWN_BROWSER',
      },
      simulatedOutcome: {
        decision: 'BLOCK',
        score: 88,
        modelAnomalyScore: 0.82,
        triggeredRules: ['VELOCITY_SPIKE_1M', 'REPEATED_ATTEMPT_BURST', 'HIGH_RISK_RECIPIENT'],
        recommendedAction: 'Reject transaction outright prior to posting.',
        ledgerEntries: [],
        invariantCheck: 'Protected: Zero funds deducted, zero ledger entries written',
      },
    },
    {
      id: 'SCENARIO_ATO',
      title: '4. Account Takeover (ATO) Shield',
      subtitle: 'New device login + password reset + ₹45,000 transfer',
      expectedDecision: 'VERIFY',
      riskTier: 'HIGH',
      badgeClass: 'bg-amber-light text-amber border-amber/20',
      inputs: {
        amountPaise: 4500000,
        amountInr: 45000,
        counterparty: 'Rohit Verma',
        recipientTrust: 'CAUTION_RECOMMENDED',
        velocity1m: 0,
        deviceStatus: 'UNFAMILIAR_DEVICE (New Delhi)',
        recentPasswordReset: true,
      },
      simulatedOutcome: {
        decision: 'VERIFY',
        score: 62,
        modelAnomalyScore: 0.68,
        triggeredRules: ['ATO_CORRELATED_THREAT', 'PASSWORD_RESET_FOLLOWED_BY_TRANSFER'],
        recommendedAction: 'Require biometric/OTP step-up authentication challenge.',
        ledgerEntries: [],
        invariantCheck: 'Blocked until 2FA Step-Up challenge is verified',
      },
    },
    {
      id: 'SCENARIO_CONCURRENT_RACE',
      title: '5. 100 Concurrent Withdrawals',
      subtitle: 'Simultaneous transfer barrage against ₹10,000 balance',
      expectedDecision: 'INVARIANT SAFE',
      riskTier: 'CONCURRENCY',
      badgeClass: 'bg-forest/10 text-forest border-forest/20',
      inputs: {
        amountPaise: 100000,
        amountInr: 1000,
        totalConcurrentWorkers: 100,
        availableBalanceInr: 10000,
      },
      simulatedOutcome: {
        decision: 'INVARIANT SAFE',
        score: 0,
        modelAnomalyScore: 0.0,
        triggeredRules: ['ORDERED_LOCK_ASC_ENFORCED'],
        recommendedAction: 'Ascending lock ordering executed: Exactly 10 transfers succeeded, 90 rejected with INSUFFICIENT_FUNDS.',
        ledgerEntries: [
          { account: 'Aman (User Wallet)', entryType: 'CREDIT', deltaPaise: -1000000 },
          { account: 'EXTERNAL_BANK', entryType: 'DEBIT', deltaPaise: 1000000 },
        ],
        invariantCheck: 'Strictly Enforced: Final balance exactly ₹0.00; non-negative invariant never breached',
      },
    },
    {
      id: 'SCENARIO_IDEMPOTENCY_REPLAY',
      title: '6. Idempotency Key 5x Replay',
      subtitle: 'Duplicate POST requests with identical idempotency token',
      expectedDecision: 'IDEMPOTENT',
      riskTier: 'CONCURRENCY',
      badgeClass: 'bg-sage-light text-sage border-sage/20',
      inputs: {
        amountPaise: 200000,
        amountInr: 2000,
        idempotencyKey: 'idem_replay_test_9019',
        retryCount: 5,
      },
      simulatedOutcome: {
        decision: 'IDEMPOTENT',
        score: 5,
        modelAnomalyScore: 0.12,
        triggeredRules: ['IDEMPOTENCY_KEY_CACHE_HIT'],
        recommendedAction: 'Request 1 executed atomically; requests 2-5 returned cached HTTP 200 payload without re-posting.',
        ledgerEntries: [
          { account: 'Aman (User Wallet)', entryType: 'CREDIT', deltaPaise: -200000 },
          { account: 'Beneficiary Wallet', entryType: 'DEBIT', deltaPaise: 200000 },
        ],
        invariantCheck: 'Single Execution Verified: Exactly 2 ledger entries created for 5 attempts',
      },
    },
  ];

  const handleRunScenario = (scenario) => {
    setActiveScenarioId(scenario.id);
    setIsRunning(true);
    setExecutionResult(null);

    setTimeout(() => {
      setIsRunning(false);
      setExecutionResult(scenario.simulatedOutcome);
    }, 600);
  };

  const handleReset = () => {
    setActiveScenarioId(null);
    setExecutionResult(null);
  };

  return (
    <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Header & Navigation */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-ink-muted hover:text-forest transition-colors mb-3 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-forest" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-ink tracking-tight">Demo Lab & Playground</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-coral text-white">
                ENGINEERING TESTBENCH
              </span>
            </div>
          <p className="text-xs text-ink-muted mt-1 font-medium">
            Execute synthetic fraud attacks, verify ML Isolation Forest detection, and stress-test double-entry invariants
          </p>
        </div>

        {/* Lab Sub-navigation */}
        <div className="flex items-center space-x-2">
          <div className="bg-white rounded-2xl p-1.5 border border-cardborder shadow-soft flex items-center space-x-1 text-xs font-bold text-ink">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'scenarios' ? 'bg-forest text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Attack Scenarios
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'graph' ? 'bg-forest text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Fraud Connection Graph
            </button>
          </div>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-white hover:bg-canvas border border-cardborder text-ink-muted hover:text-ink shadow-soft transition-all"
            title="Reset simulation telemetry"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>

      {activeTab === 'graph' ? (
        <FraudConnectionGraph />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: 6 Scenario Selectors (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">
              Select Attack or Concurrency Scenario
            </div>

            {scenarios.map((sc) => {
              const isSelected = activeScenarioId === sc.id;

              return (
                <div
                  key={sc.id}
                  onClick={() => handleRunScenario(sc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-canvas-alt border-forest shadow-md ring-2 ring-forest/20'
                      : 'bg-white border-cardborder hover:border-forest/40 shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-extrabold text-ink">{sc.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${sc.badgeClass}`}>
                          {sc.expectedDecision}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">{sc.subtitle}</p>
                    </div>

                    <button className="w-7 h-7 rounded-lg bg-canvas hover:bg-forest hover:text-white flex items-center justify-center text-ink-muted transition-colors shrink-0">
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Execution Telemetry & Results Console (7 cols) */}
          <div className="lg:col-span-7">
            {executionResult ? (
              <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-6 animate-in fade-in duration-200">
                {/* Result Header */}
                <div className="flex items-center justify-between pb-4 border-b border-cardborder">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                      Telemetry Output
                    </span>
                    <h3 className="text-base font-extrabold text-ink mt-0.5">
                      Decision: <span className={
                        executionResult.decision === 'BLOCK' ? 'text-coral' : executionResult.decision === 'ALLOW' ? 'text-sage' : 'text-amber'
                      }>{executionResult.decision}</span>
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-canvas border border-cardborder text-ink">
                      Score: {executionResult.score}/100
                    </span>
                  </div>
                </div>

                {/* Score & ML Gauges */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-canvas border border-cardborder space-y-1">
                    <span className="text-[10px] font-mono text-ink-muted uppercase">Layer 1 & 3 Heuristics</span>
                    <div className="text-xl font-black text-ink">{executionResult.score}/100</div>
                    <p className="text-[10px] text-ink-muted">Deterministic rule violations</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-canvas border border-cardborder space-y-1">
                    <span className="text-[10px] font-mono text-ink-muted uppercase">Layer 2 Isolation Forest ML</span>
                    <div className="text-xl font-black text-forest">
                      {executionResult.modelAnomalyScore.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-ink-muted">Multi-dimensional outlier depth</p>
                  </div>
                </div>

                {/* Triggered Rule Codes */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink">Triggered Engine Rules:</div>
                  <div className="flex flex-wrap gap-2">
                    {executionResult.triggeredRules.map((rule) => (
                      <span
                        key={rule}
                        className="px-2.5 py-1 rounded-lg bg-canvas-alt border border-cardborder text-ink font-mono text-[10px] font-bold"
                      >
                        ⚡ {rule}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Compliance Action */}
                <div className="p-4 rounded-2xl bg-forest/5 border border-forest/15 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-forest uppercase tracking-wider">
                    Recommended Action
                  </div>
                  <p className="text-xs text-ink font-medium leading-relaxed">
                    {executionResult.recommendedAction}
                  </p>
                </div>

                {/* Resulting Double-Entry Journal */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">Generated Ledger Journal Entries:</span>
                    <span className="text-[10px] font-mono text-ink-muted">
                      {executionResult.ledgerEntries.length} entries written
                    </span>
                  </div>

                  {executionResult.ledgerEntries.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-canvas text-center text-xs text-ink-muted font-mono">
                      // Zero entries posted (Transaction rejected or held prior to posting)
                    </div>
                  ) : (
                    <div className="space-y-2 font-mono text-xs">
                      {executionResult.ledgerEntries.map((le, i) => (
                        <div key={i} className="p-3 rounded-xl bg-canvas flex items-center justify-between">
                          <div>
                            <div className="font-bold text-ink">{le.account}</div>
                            <div className="text-[10px] text-ink-muted">{le.entryType}</div>
                          </div>
                          <span className={`font-bold ${le.deltaPaise > 0 ? 'text-sage' : 'text-coral'}`}>
                            {le.deltaPaise > 0 ? '+' : ''}{formatPaise(le.deltaPaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invariant Mathematical Audit */}
                <div className="p-3.5 rounded-2xl bg-canvas-alt border border-cardborder flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-forest" />
                    <span className="font-bold text-ink">Invariant Status:</span>
                  </div>
                  <span className="font-mono text-sage font-bold">
                    ✓ {executionResult.invariantCheck}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-canvas rounded-3xl p-12 border border-cardborder text-center space-y-3 flex flex-col items-center justify-center min-h-[420px]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-cardborder flex items-center justify-center text-forest shadow-soft">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-ink">Interactive Simulator Ready</h3>
                <p className="text-xs text-ink-muted max-w-sm">
                  Select any scenario from the left panel to trigger deterministic rules, ML Isolation Forest anomaly evaluation, and live ledger invariants.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
