import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, ShieldCheck, ShieldAlert, X, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { playChime, speakVoiceAlert } from '../utils/voiceAlert.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function QRScannerModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { blockThreat } = useAuth();
  const [activeScan, setActiveScan] = useState(null); // 'safe' | 'scam' | null
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleSimulateSafeQR = () => {
    setIsAnalyzing(true);
    setActiveScan(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setActiveScan('safe');
      playChime('success');
    }, 700);
  };

  const handleSimulateScamQR = () => {
    setIsAnalyzing(true);
    setActiveScan(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setActiveScan('scam');
      playChime('warning');
      speakVoiceAlert('Phishing warning! This QR code masquerades as a public utility to steal your funds.', {
        chime: 'warning',
        force: true,
      });
    }, 700);
  };

  const handleProceedSafe = () => {
    onClose();
    navigate('/send?scenario=safe');
  };

  const handleReportAndBlockScam = () => {
    blockThreat('fake_discom_qr', 'Electricity Bill Phishing QR', 'Malicious QR masquerading as power utility');
    playChime('success');
    speakVoiceAlert('Phishing QR reported and blocked. Threat report logged in security audit.', {
      chime: 'success',
    });
    onClose();
  };

  const handleTestEscrow = () => {
    onClose();
    navigate('/send?scenario=phishing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-cardborder relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-canvas-alt transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-forest-light text-forest flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-ink">Simulated UPI QR Scanner</h3>
            <p className="text-xs text-ink-muted">Pre-payment deep payload inspection with LedgerGuard AI</p>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-ink rounded-2xl h-52 overflow-hidden flex flex-col items-center justify-center p-4 border-2 border-forest/30 shadow-inner mb-5">
          {/* Laser Scan Animation */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-forest-light to-transparent animate-pulse shadow-[0_0_12px_#34D399]" />

          {/* Viewfinder Reticle Corners */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-forest-light rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-forest-light rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-forest-light rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-forest-light rounded-br-lg" />

          {isAnalyzing ? (
            <div className="text-center space-y-2 z-10">
              <div className="w-8 h-8 border-2 border-forest-light border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-forest-light animate-pulse">Inspecting UPI payload & trust score...</p>
            </div>
          ) : activeScan === 'safe' ? (
            <div className="text-center space-y-1.5 z-10 bg-forest/90 p-3 rounded-xl border border-sage/40 backdrop-blur-sm max-w-xs">
              <div className="flex items-center justify-center space-x-1.5 text-sage-light text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>GENUINE MERCHANT QR</span>
              </div>
              <p className="text-[11px] text-white/90 font-medium">Blue Tokai Coffee Roasters &bull; ₹380.00</p>
              <div className="text-[9px] font-mono text-white/60">UPI: bluetokai@icici (Verified VPA)</div>
            </div>
          ) : activeScan === 'scam' ? (
            <div className="text-center space-y-1.5 z-10 bg-coral/95 p-3 rounded-xl border border-white/40 backdrop-blur-sm max-w-xs">
              <div className="flex items-center justify-center space-x-1.5 text-white text-xs font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>PHISHING THREAT INTERCEPTED</span>
              </div>
              <p className="text-[11px] text-white font-medium">Fake Discom Urgent Disconnection &bull; ₹4,890.00</p>
              <div className="text-[9px] font-mono text-white/80">Spoofed VPA: powerdiscom.bill849@okaxis</div>
            </div>
          ) : (
            <div className="text-center space-y-1 text-white/60 z-10">
              <QrCode className="w-10 h-10 mx-auto text-forest-light/60 animate-bounce" />
              <p className="text-xs font-mono text-white/70">Tap a sample QR payload below to simulate scan</p>
            </div>
          )}
        </div>

        {/* Scan Actions / Sample Payloads */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Simulate Scanning a QR Code
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Safe QR Button */}
            <button
              type="button"
              onClick={handleSimulateSafeQR}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-2.5 ${
                activeScan === 'safe'
                  ? 'border-sage bg-sage-light/40 shadow-soft'
                  : 'border-cardborder hover:border-forest/40 bg-canvas hover:bg-forest/5'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-sage-light text-sage flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink">1. Genuine Cafe QR</div>
                <div className="text-[10px] text-ink-muted">Verified ICICI merchant &bull; ₹380</div>
              </div>
            </button>

            {/* Phishing Scam QR Button */}
            <button
              type="button"
              onClick={handleSimulateScamQR}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-2.5 ${
                activeScan === 'scam'
                  ? 'border-coral bg-coral-light/40 shadow-soft'
                  : 'border-cardborder hover:border-coral/40 bg-canvas hover:bg-coral/5'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-coral-light text-coral flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-coral">2. Fake Power Bill QR</div>
                <div className="text-[10px] text-ink-muted">Impersonation Phishing &bull; ₹4,890</div>
              </div>
            </button>
          </div>

          {/* Action Resolution after scan */}
          {activeScan === 'safe' && (
            <div className="pt-2 animate-fade-in">
              <button
                onClick={handleProceedSafe}
                className="w-full py-2.5 bg-forest hover:bg-forest-light text-white text-xs font-bold rounded-xl shadow-soft transition-all flex items-center justify-center space-x-2"
              >
                <span>Proceed to Pay ₹380.00</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeScan === 'scam' && (
            <div className="pt-2 flex items-center space-x-2 animate-fade-in">
              <button
                onClick={handleReportAndBlockScam}
                className="flex-1 py-2.5 bg-canvas hover:bg-canvas-alt border border-cardborder text-ink text-xs font-bold rounded-xl transition-all"
              >
                Block & Report QR
              </button>
              <button
                onClick={handleTestEscrow}
                className="flex-1 py-2.5 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl shadow-soft transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Test Escrow Protection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
