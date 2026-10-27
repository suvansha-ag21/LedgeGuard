import React, {  useState  } from 'react';
import { 
  Network, 
  User, 
  Smartphone, 
  Laptop, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  Info, 
  Filter,
  Eye,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { formatPaise } from '../utils/formatters.js';

export default function FraudConnectionGraph({ onInspectAccount }) {
  const [selectedNode, setSelectedNode] = useState('rohit');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'FLAGGED_ONLY' | 'DEVICE_SIGNALS'

  // Network Nodes
  const nodes = [
    {
      id: 'aman',
      type: 'ACCOUNT',
      label: 'Aman (User Wallet)',
      tier: 'PRIMARY',
      risk: 'SAFE',
      balancePaise: 1245000,
      x: 180,
      y: 200,
      connections: ['riya', 'aditya', 'rohit', 'device_mac'],
    },
    {
      id: 'riya',
      type: 'RECIPIENT',
      label: 'Riya Sharma',
      tier: 'VERIFIED',
      risk: 'SAFE',
      x: 380,
      y: 90,
      transfers: 8,
      amountPaise: 50000,
      connections: ['aman'],
    },
    {
      id: 'aditya',
      type: 'RECIPIENT',
      label: 'Aditya Singh',
      tier: 'VERIFIED',
      risk: 'SAFE',
      x: 380,
      y: 190,
      transfers: 3,
      amountPaise: 120000,
      connections: ['aman'],
    },
    {
      id: 'rohit',
      type: 'RECIPIENT',
      label: 'Rohit Verma',
      tier: 'FLAGGED',
      risk: 'HIGH',
      x: 380,
      y: 310,
      transfers: 1,
      amountPaise: 850000,
      signals: ['Velocity spike', 'Unusual 4.2x baseline jump', 'Linked to mule cluster'],
      connections: ['aman', 'mule_x', 'device_win'],
    },
    {
      id: 'mule_x',
      type: 'MULE_ACCOUNT',
      label: 'Mule Wallet (acc_mule_902)',
      tier: 'FROZEN',
      risk: 'CRITICAL',
      x: 580,
      y: 360,
      transfers: 14,
      signals: ['Rapid cycling', 'Zero retention', 'AML Flagged'],
      connections: ['rohit', 'device_win'],
    },
    {
      id: 'device_mac',
      type: 'DEVICE',
      label: 'MacBook Pro (Sonoma)',
      tier: 'TRUSTED_DEVICE',
      risk: 'SAFE',
      x: 80,
      y: 100,
      connections: ['aman'],
    },
    {
      id: 'device_win',
      type: 'DEVICE',
      label: 'Windows 11 (New Delhi)',
      tier: 'UNFAMILIAR_DEVICE',
      risk: 'HIGH',
      ip: '49.207.181.12',
      x: 560,
      y: 200,
      connections: ['rohit', 'mule_x'],
    },
  ];

  // Network Edges / Connections
  const edges = [
    { from: 'aman', to: 'riya', label: '₹500.00', status: 'SAFE' },
    { from: 'aman', to: 'aditya', label: '₹1,200.00', status: 'SAFE' },
    { from: 'aman', to: 'rohit', label: '₹8,500.00 (Held)', status: 'FLAGGED' },
    { from: 'rohit', to: 'mule_x', label: 'Rapid Hop ₹8,000.00', status: 'CRITICAL' },
    { from: 'device_mac', to: 'aman', label: 'Primary Auth Session', status: 'SAFE' },
    { from: 'device_win', to: 'rohit', label: 'Shared IP 49.207.181.12', status: 'SUSPICIOUS' },
    { from: 'device_win', to: 'mule_x', label: 'Shared Hardware UUID', status: 'CRITICAL' },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode) || nodes[0];

  const filteredNodes = nodes.filter((node) => {
    if (filterMode === 'FLAGGED_ONLY') {
      return node.risk === 'HIGH' || node.risk === 'CRITICAL';
    }
    if (filterMode === 'DEVICE_SIGNALS') {
      return node.type === 'DEVICE' || node.signals;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl p-6 border border-cardborder shadow-soft space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-extrabold text-ink">Fraud Connection Graph</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-coral/10 text-coral border border-coral/20">
              Coordinated Attack Hunter
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Visualize relationships between accounts, payees, unfamiliar devices, and transaction hops
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-canvas rounded-2xl p-1 border border-cardborder text-xs font-bold text-ink">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterMode === 'ALL' ? 'bg-forest text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            All Nodes
          </button>
          <button
            onClick={() => setFilterMode('FLAGGED_ONLY')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterMode === 'FLAGGED_ONLY' ? 'bg-coral text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Flagged Only
          </button>
          <button
            onClick={() => setFilterMode('DEVICE_SIGNALS')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterMode === 'DEVICE_SIGNALS' ? 'bg-amber text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Device Signals
          </button>
        </div>
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div className="relative bg-canvas rounded-3xl border border-cardborder overflow-hidden h-96 p-4">
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="edgeGradSafe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#102B24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2E6554" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edgeGradFlagged" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F15B43" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#D9B66F" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Render Connection Edges */}
          {edges.map((edge, idx) => {
            const source = nodes.find((n) => n.id === edge.from);
            const target = nodes.find((n) => n.id === edge.to);
            if (!source || !target) return null;

            const isEdgeFlagged = edge.status === 'FLAGGED' || edge.status === 'CRITICAL' || edge.status === 'SUSPICIOUS';

            return (
              <g key={idx}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isEdgeFlagged ? '#F15B43' : '#DDE9DF'}
                  strokeWidth={isEdgeFlagged ? '2.5' : '1.5'}
                  strokeDasharray={isEdgeFlagged ? '4,4' : 'none'}
                  className="transition-all"
                />
                {/* Edge Label Pill */}
                <rect
                  x={(source.x + target.x) / 2 - 45}
                  y={(source.y + target.y) / 2 - 10}
                  width="90"
                  height="20"
                  rx="6"
                  fill="#FFFFFF"
                  stroke={isEdgeFlagged ? '#F15B43' : '#E5E7EB'}
                  strokeWidth="1"
                />
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 + 4}
                  textAnchor="middle"
                  className="text-[9px] font-mono font-bold fill-current"
                  fill={isEdgeFlagged ? '#F15B43' : '#17231F'}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Render Interactive Node Circles */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const isFlagged = node.risk === 'HIGH' || node.risk === 'CRITICAL';

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node.id)}
                className="cursor-pointer group"
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Glowing selection ring */}
                {isSelected && (
                  <circle
                    r="26"
                    className="animate-ping opacity-25"
                    fill={isFlagged ? '#F15B43' : '#102B24'}
                  />
                )}

                {/* Node Outer Circle */}
                <circle
                  r="20"
                  fill={isFlagged ? '#F15B43' : node.type === 'DEVICE' ? '#D9B66F' : '#102B24'}
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  className="shadow-md transition-transform duration-200 group-hover:scale-110"
                />

                {/* Node Label Below */}
                <text
                  y="34"
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-ink select-none"
                >
                  {node.label}
                </text>
                <text
                  y="46"
                  textAnchor="middle"
                  className="text-[8px] font-mono fill-ink-muted select-none"
                >
                  {node.tier}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-cardborder text-[10px] font-bold text-ink space-y-1 shadow-soft">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-forest"></span>
            <span>Primary Account</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-coral"></span>
            <span>Flagged Payee / Mule Node</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber"></span>
            <span>Device / Session Node</span>
          </div>
        </div>
      </div>

      {/* Selected Node Investigation Inspector */}
      {activeNodeData && (
        <div className="bg-canvas-alt rounded-2xl p-5 border border-cardborder space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-cardborder/60">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
                activeNodeData.risk === 'CRITICAL' || activeNodeData.risk === 'HIGH' ? 'bg-coral' : 'bg-forest'
              }`}>
                {activeNodeData.type === 'DEVICE' ? (
                  <Laptop className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-black text-ink">{activeNodeData.label}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                    activeNodeData.risk === 'CRITICAL' || activeNodeData.risk === 'HIGH' 
                      ? 'bg-coral-light text-coral' 
                      : 'bg-sage-light text-sage'
                  }`}>
                    {activeNodeData.risk} RISK
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted">Node ID: <code className="font-mono">{activeNodeData.id}</code></p>
              </div>
            </div>

            <div className="text-xs font-mono">
              <span className="text-ink-muted">Linked Connections: </span>
              <strong className="text-ink">{activeNodeData.connections.length} nodes</strong>
            </div>
          </div>

          {/* Signals & Threat Context */}
          <div className="text-xs space-y-2">
            <div className="font-bold text-ink flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber" />
              <span>Correlated Risk Indicators:</span>
            </div>

            {activeNodeData.signals ? (
              <div className="flex flex-wrap gap-2">
                {activeNodeData.signals.map((sig, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-coral-light text-coral border border-coral/20 font-mono text-[10px] font-bold">
                    ⚠️ {sig}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-ink-muted text-[11px]">
                No malicious flags recorded. Transfer patterns match verified individual counterparty baselines.
              </p>
            )}
          </div>

          {/* Investigative Disclaimer per PRD Section 10 */}
          <div className="p-3 rounded-xl bg-canvas border border-cardborder text-[11px] text-ink-muted flex items-start space-x-2">
            <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
            <p>
              <strong>Investigative Signal Protocol:</strong> Graph connections are contextual heuristic markers for compliance analysts, not automated proof of fraud. 
              Accounts connected to flagged entities are not automatically frozen without corroborated transaction evidence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
