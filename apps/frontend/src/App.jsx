import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SendMoney from './pages/SendMoney.jsx';
import Transactions from './pages/Transactions.jsx';
import LedgerExplorer from './pages/LedgerExplorer.jsx';
import Wallets from './pages/Wallets.jsx';
import Settings from './pages/Settings.jsx';
import SpendingInsights from './pages/SpendingInsights.jsx';
import SecurityCenter from './pages/SecurityCenter.jsx';
import DemoLab from './pages/DemoLab.jsx';
import Login from './pages/Login.jsx';
import FishyAlertModal from './components/FishyAlertModal.jsx';

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-canvas text-ink font-sans selection:bg-coral selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>
      <FishyAlertModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated User-First Navigation */}
          <Route element={<AppLayout />}>
            {/* 1. Home / Dashboard */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* 2. Send & Receive */}
            <Route path="/send" element={<SendMoney />} />

            {/* 3. Transactions */}
            <Route path="/transactions" element={<Transactions />} />

            {/* 4. My Wallets */}
            <Route path="/wallets" element={<Wallets />} />

            {/* 5. Spending Insights */}
            <Route path="/spending" element={<SpendingInsights />} />

            {/* 6. Security Center */}
            <Route path="/security" element={<SecurityCenter />} />

            {/* 7. Profile & Settings */}
            <Route path="/settings" element={<Settings />} />

            {/* Engineering & Compliance Lab */}
            <Route path="/demo-lab" element={<DemoLab />} />
            <Route path="/ledger" element={<LedgerExplorer />} />

            {/* Fallback route */}
            <Route
              path="*"
              element={
                <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-canvas border border-cardborder flex items-center justify-center text-ink font-bold text-xl shadow-soft">
                    ?
                  </div>
                  <h3 className="text-base font-black text-ink">Page Not Found</h3>
                  <p className="text-xs text-ink-muted max-w-sm">
                    The requested route is not available. Return to the primary overview dashboard.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-forest hover:bg-forest-light text-white text-xs font-bold rounded-xl shadow-soft transition-all"
                  >
                    <span>Back to Dashboard</span>
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
