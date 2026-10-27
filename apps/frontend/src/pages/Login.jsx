import React, {  useState  } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoUserLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await login('aman@ledgerguard.internal', 'UserPassword123!');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6 selection:bg-coral selection:text-white">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-cardborder shadow-elevated overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Branding Panel (5 Columns) */}
        <div className="lg:col-span-5 bg-forest text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-forest-light/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-coral flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg text-white">
                  Ledger<span className="text-coral">Guard</span>
                </div>
                <div className="text-[10px] text-white/60 font-medium">Double-Entry Payments & AI Fraud Defense</div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <h2 className="text-2xl font-black text-white leading-tight">
                Simulated Banking.<br />
                Mathematically Sound.
              </h2>
              <p className="text-xs text-white/70 leading-relaxed">
                Experience real-time double-entry ledgers, AI fraud detection, velocity anomaly screening, and zero-sum balance guarantees.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
                <span>Zero-Sum Verified Debits & Credits</span>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center space-x-3">
                <ShieldCheck className="w-4 h-4 text-coral flex-shrink-0" />
                <span>Recipient Trust Check & ATO Shield</span>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center space-x-3">
                <Wallet className="w-4 h-4 text-amber flex-shrink-0" />
                <span>Simulated INR (Paise Integer Arithmetic)</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 text-[11px] text-white/50">
            Protected by LedgerGuard Core v1.0
          </div>
        </div>

        {/* Right Form Panel (7 Columns) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-ink">
                  {isRegister ? 'Create Your Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isRegister
                    ? 'Auto-creates your wallet with simulated bonus funds'
                    : 'Access your wallet, transactions, and security center'}
                </p>
              </div>

              <div className="flex items-center bg-canvas p-1 rounded-xl border border-cardborder">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setErrorMessage('');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    !isRegister ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setErrorMessage('');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    isRegister ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-coral-light border border-coral/20 rounded-2xl flex items-center space-x-2 text-xs text-coral font-semibold mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Aman Sharma"
                      required={isRegister}
                      className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aman@ledgerguard.internal"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
                {isRegister && (
                  <p className="text-[10px] text-ink-muted mt-1">Must be at least 8 characters long</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-coral hover:bg-coral-hover text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2"
              >
                <span>{loading ? 'Authenticating...' : isRegister ? 'Create Wallet & Sign In' : 'Sign In to Wallet'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick Demo Login */}
          <div className="pt-6 mt-6 border-t border-cardborder">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 text-center">
              Quick 1-Click Demo Profile
            </div>
            <button
              type="button"
              onClick={handleDemoUserLogin}
              className="w-full p-3 bg-canvas hover:bg-canvas-alt border border-cardborder rounded-xl text-left transition-all group flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-ink group-hover:text-forest">Aman Sharma</div>
                <div className="text-[10px] text-ink-muted font-medium">Personal INR Wallet (₹12,450.00 Available)</div>
              </div>
              <span className="text-[10px] font-bold text-forest bg-sage-light px-2.5 py-1 rounded-full">
                Enter Dashboard →
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
