import React, {  useState  } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Key,
  ArrowLeft,
  Smartphone,
  Laptop,
  CheckCircle2,
  LogOut,
  Bell,
  Sliders,
  AlertTriangle,
  Lock,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const navigate = useNavigate();
  const { user, account, logout } = useAuth();

  const [name, setName] = useState(user?.name || 'Aman Sharma');
  const [email, setEmail] = useState(user?.email || 'aman@ledgerguard.internal');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [highValueAlert, setHighValueAlert] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 p-8 max-w-5xl w-full mx-auto space-y-7">
      {/* Page Title & Navigation */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-ink-muted hover:text-forest transition-colors mb-3 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-forest" />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="text-2xl font-black text-ink tracking-tight">Profile & Security Settings</h1>
        <p className="text-xs text-ink-muted mt-1 font-medium">
          Manage your personal details, login security preferences, and active devices
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-sage-light border border-sage/20 rounded-2xl flex items-center space-x-2.5 text-xs text-forest font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-sage" />
          <span>Profile preferences saved successfully</span>
        </div>
      )}

      {/* Profile Information Card */}
      <div className="bg-white rounded-3xl p-7 border border-cardborder shadow-soft space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-cardborder">
          <div className="w-10 h-10 rounded-2xl bg-forest-light text-white flex items-center justify-center font-bold text-sm">
            {name?.[0] || 'A'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Personal Profile</h2>
            <p className="text-[11px] text-ink-muted">Basic identity linked to your simulated wallet</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-10 pr-4 py-2.5 bg-canvas rounded-xl border border-cardborder text-xs text-ink-muted font-semibold cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Account Status</label>
            <div className="p-2.5 bg-canvas rounded-xl border border-cardborder text-xs font-bold text-ink flex items-center justify-between">
              <span>Verified Personal Account</span>
              <span className="text-[10px] font-semibold text-forest bg-sage-light px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-forest" />
                KYC Active
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Wallet Account ID</label>
            <div className="p-2.5 bg-canvas rounded-xl border border-cardborder text-xs font-mono font-bold text-ink truncate">
              {account?.id || 'acc_aman_001'}
            </div>
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="py-2.5 px-5 bg-forest hover:bg-forest-light text-white font-bold text-xs rounded-xl shadow-soft transition-all"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Security Preferences */}
      <div className="bg-white rounded-3xl p-7 border border-cardborder shadow-soft space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-cardborder">
          <div className="w-10 h-10 rounded-2xl bg-coral-light text-coral flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Account Takeover Protection & Security Controls</h2>
            <p className="text-[11px] text-ink-muted">Configure automated risk barriers for sensitive transfers</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-canvas rounded-2xl border border-cardborder">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-ink">Two-Factor Authentication (Simulated)</div>
              <div className="text-[11px] text-ink-muted">
                Require one-time verification passcode for logins from unfamiliar devices
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                twoFactorEnabled ? 'bg-forest' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-canvas rounded-2xl border border-cardborder">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-ink">High-Value Transfer Confirmation</div>
              <div className="text-[11px] text-ink-muted">
                Trigger step-up re-authentication whenever a payment exceeds ₹10,000.00
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHighValueAlert(!highValueAlert)}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                highValueAlert ? 'bg-forest' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  highValueAlert ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-3xl p-7 border border-cardborder shadow-soft space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-cardborder">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sage-light text-sage flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Active Sessions & Recognized Devices</h2>
              <p className="text-[11px] text-ink-muted">Devices currently authenticated to your wallet</p>
            </div>
          </div>
          <button
            onClick={() => alert('All other sessions revoked successfully.')}
            className="text-xs font-bold text-coral hover:text-coral-hover transition-colors"
          >
            Revoke Other Sessions
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl border border-forest/30 bg-forest/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-forest text-white flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink flex items-center space-x-2">
                  <span>Windows PC &bull; Chrome Browser</span>
                  <span className="text-[9px] bg-sage text-white font-bold px-1.5 py-0.5 rounded-full">
                    CURRENT SESSION
                  </span>
                </div>
                <div className="text-[10px] text-ink-muted">IP 127.0.0.1 &bull; Active right now</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-cardborder bg-canvas flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-canvas-alt text-ink flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink">iPhone 15 Pro &bull; Mobile App</div>
                <div className="text-[10px] text-ink-muted">Last active 2 days ago &bull; Mumbai, India</div>
              </div>
            </div>
            <button
              onClick={() => alert('Mobile session revoked.')}
              className="text-xs font-bold text-ink-muted hover:text-coral transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Developer & Interview Diagnostics (Discrete) */}
      <div className="p-6 bg-white rounded-3xl border border-cardborder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-ink">Engineering Diagnostics & Attack Lab</div>
          <div className="text-[11px] text-ink-muted">Access synthetic fraud testbench and double-entry reconciliation audit</div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/demo-lab')}
            className="px-3.5 py-1.5 bg-canvas hover:bg-canvas-alt border border-cardborder rounded-xl text-xs font-bold text-ink hover:text-forest transition-all"
          >
            Demo Lab →
          </button>
          <button
            onClick={() => navigate('/ledger')}
            className="px-3.5 py-1.5 bg-canvas hover:bg-canvas-alt border border-cardborder rounded-xl text-xs font-bold text-ink hover:text-forest transition-all"
          >
            Ledger Explorer →
          </button>
        </div>
      </div>

      {/* Logout Action */}
      <div className="p-6 bg-white rounded-3xl border border-cardborder flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-ink">Sign Out of LedgerGuard</div>
          <div className="text-[11px] text-ink-muted">Terminates your session on this browser</div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
