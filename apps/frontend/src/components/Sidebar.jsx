import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  ArrowLeftRight,
  Wallet,
  PieChart,
  ShieldCheck,
  Settings,
  LogOut,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Strict User-First Navigation per Section 3 of PRD
  const userNavItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/send', label: 'Send & Receive', icon: Send },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/wallets', label: 'My Wallets', icon: Wallet },
    { to: '/spending', label: 'Spending Insights', icon: PieChart },
    { to: '/security', label: 'Security Center', icon: ShieldCheck },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-forest text-white flex flex-col h-screen sticky top-0 border-r border-forest-dark select-none shadow-medium z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-coral flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center">
              Ledger<span className="text-coral">Guard</span>
            </div>
            <div className="text-[10px] text-white/60 font-medium tracking-wide">
              AI Payments & Ledger
            </div>
          </div>
        </div>
      </div>

      {/* Primary User Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-white/40 uppercase">
            Personal Banking
          </div>
          <nav className="space-y-1">
            {userNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-forest-light text-white shadow-soft font-bold'
                        : 'text-white/70 hover:bg-forest-hover hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-white/80" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Live Evaluation Demo Scenarios Button */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('ledgerguard:open_demo_scenarios'))}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 transition-all shadow-soft group"
            >
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Demo Scenarios</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-[#102B24]">
                3 MODES
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* User Footer & AI Protection Badge matching mockup */}
      <div className="p-3 border-t border-white/10 space-y-2.5">
        {/* Protected by AI Pill */}
        <div className="bg-[#12362C] rounded-2xl p-3 border border-white/10 flex items-start space-x-2.5 shadow-soft">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-bold text-white leading-tight">Protected by AI</div>
            <div className="text-[9px] text-white/60 leading-tight mt-0.5">Real-time threat detection on every payment</div>
          </div>
        </div>

        {/* User Chip */}
        <div className="bg-forest-card rounded-2xl p-2.5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-forest-light text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'AS'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.name || 'Aman Sharma'}</div>
              <div className="text-[10px] text-emerald-400 font-semibold truncate">Verified Account</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
