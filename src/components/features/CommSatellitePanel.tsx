/**
 * CommSatellitePanel — Communication Satellite Status & Control
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays available communication satellite networks for SAR use.
 * Toggle each network on/off. Status, orbital info, and coverage band shown.
 * This panel is decorative/operational-awareness — the actual ADS-B data
 * still flows through OpenSky (which ingests from satellite ADS-B receivers
 * such as Aireon, SKYTRAC, etc.).
 *
 * Host enables this when needed — visible only to host-authenticated users.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { Satellite, Radio, Globe, Wifi, WifiOff, Signal, AlertCircle } from "lucide-react";

interface SatNetwork {
  id: string;
  name: string;
  type: "LEO" | "MEO" | "GEO";
  coverage: string;
  frequency: string;
  adsb: boolean;
  status: "NOMINAL" | "DEGRADED" | "OFFLINE";
  latency_ms: number;
  enabled: boolean;
}

const INITIAL_NETWORKS: SatNetwork[] = [
  {
    id: "aireon",
    name: "Aireon ADS-B",
    type: "LEO",
    coverage: "Global (Poles included)",
    frequency: "1090 MHz",
    adsb: true,
    status: "NOMINAL",
    latency_ms: 15,
    enabled: false,
  },
  {
    id: "skytrac",
    name: "SKYTRAC ISAT",
    type: "LEO",
    coverage: "Global",
    frequency: "L-Band",
    adsb: true,
    status: "NOMINAL",
    latency_ms: 22,
    enabled: false,
  },
  {
    id: "inmarsat",
    name: "Inmarsat SwiftBroadband",
    type: "GEO",
    coverage: "±75° latitude",
    frequency: "L-Band / Ka-Band",
    adsb: false,
    status: "NOMINAL",
    latency_ms: 280,
    enabled: false,
  },
  {
    id: "iridium",
    name: "Iridium Certus",
    type: "LEO",
    coverage: "True global (poles)",
    frequency: "L-Band",
    adsb: false,
    status: "NOMINAL",
    latency_ms: 45,
    enabled: false,
  },
  {
    id: "starlink",
    name: "Starlink Aviation",
    type: "LEO",
    coverage: "Global (expanding)",
    frequency: "Ku/Ka-Band",
    adsb: false,
    status: "DEGRADED",
    latency_ms: 35,
    enabled: false,
  },
  {
    id: "vdes",
    name: "VDES Satellite (IMO)",
    type: "LEO",
    coverage: "Maritime zones",
    frequency: "VHF Digital",
    adsb: false,
    status: "NOMINAL",
    latency_ms: 60,
    enabled: false,
  },
];

const TYPE_COLORS = { LEO: "#22c55e", MEO: "#60a5fa", GEO: "#f97316" };

const STATUS_STYLES = {
  NOMINAL:  { text: "text-success",  dot: "bg-success",  label: "NOMINAL"  },
  DEGRADED: { text: "text-warning",  dot: "bg-warning animate-pulse",  label: "DEGRADED" },
  OFFLINE:  { text: "text-danger",   dot: "bg-danger",   label: "OFFLINE"  },
};

interface CommSatellitePanelProps {
  isHostAuth: boolean;
}

const CommSatellitePanel: React.FC<CommSatellitePanelProps> = ({ isHostAuth }) => {
  const [networks, setNetworks] = useState<SatNetwork[]>(INITIAL_NETWORKS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [globalTime, setGlobalTime] = useState(new Date());

  // Tick clock every second
  useEffect(() => {
    const iv = setInterval(() => setGlobalTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const activeCount = networks.filter((n) => n.enabled).length;
  const adsbActive  = networks.filter((n) => n.enabled && n.adsb);

  const toggleNetwork = (id: string) => {
    if (!isHostAuth) return;
    setNetworks((nets) =>
      nets.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  return (
    <div className="sar-card hud-border overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <Satellite size={14} className="text-primary" />
        <div className="flex-1">
          <span className="font-heading text-xs tracking-widest font-700">COMM SATELLITES</span>
          <span className="ml-2 label-tag text-[9px]">{activeCount} active</span>
        </div>
        {/* UTC Clock */}
        <span className="font-mono text-[10px] text-primary">
          {globalTime.toUTCString().slice(17, 25)} UTC
        </span>
        <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
      </div>

      {/* ADS-B satellite status bar */}
      {adsbActive.length > 0 && (
        <div
          className="px-4 py-2 flex items-center gap-2 border-b border-border"
          style={{ background: "hsl(var(--success) / 0.06)" }}
        >
          <Signal size={11} className="text-success shrink-0" />
          <span className="font-mono text-[10px] text-success">
            Satellite ADS-B active: {adsbActive.map((n) => n.name).join(" + ")} · Global tracking enabled
          </span>
        </div>
      )}

      {/* Networks list */}
      <div className="divide-y divide-border">
        {networks.map((net) => {
          const st = STATUS_STYLES[net.status];
          const isOpen = expanded === net.id;

          return (
            <div key={net.id}>
              <div
                className={`px-4 py-3 flex items-center gap-3 ${
                  isHostAuth ? "cursor-pointer hover:bg-secondary/20" : "cursor-default"
                } transition-colors`}
                onClick={() => setExpanded(isOpen ? null : net.id)}
              >
                {/* Enable toggle — host only */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleNetwork(net.id); }}
                  disabled={!isHostAuth || net.status === "OFFLINE"}
                  className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${
                    net.enabled ? "bg-primary" : "bg-muted-foreground/20"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={!isHostAuth ? "Host-only control" : net.enabled ? "Disable" : "Enable"}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    net.enabled ? "left-4" : "left-0.5"
                  }`} />
                </button>

                {/* Satellite icon */}
                <div className={`flex items-center justify-center w-7 h-7 rounded shrink-0 ${
                  net.enabled ? "bg-primary/12" : "bg-muted/30"
                }`}>
                  {net.enabled
                    ? <Wifi size={12} className="text-primary" />
                    : <WifiOff size={12} className="text-muted-foreground" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-heading text-xs font-700 ${net.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                      {net.name}
                    </span>
                    <span
                      className="text-[8px] font-mono font-700 px-1 rounded"
                      style={{ color: TYPE_COLORS[net.type], background: `${TYPE_COLORS[net.type]}18` }}
                    >
                      {net.type}
                    </span>
                    {net.adsb && (
                      <span className="text-[8px] font-mono font-700 px-1 rounded text-success bg-success/10">
                        ADS-B
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className={`font-mono text-[10px] ${st.text}`}>{st.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">· {net.latency_ms}ms</span>
                  </div>
                </div>

                {/* Signal strength viz */}
                <div className="flex items-end gap-0.5 h-5 shrink-0">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className="w-1.5 rounded-sm transition-all"
                      style={{
                        height: `${bar * 5}px`,
                        background: net.enabled && net.status !== "OFFLINE"
                          ? bar <= (net.status === "DEGRADED" ? 2 : 4)
                            ? "hsl(var(--primary))"
                            : "hsl(var(--border))"
                          : "hsl(var(--border))",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-3 pt-1 space-y-1.5" style={{ background: "hsl(var(--muted))" }}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                    <span className="text-muted-foreground">Coverage</span>
                    <span>{net.coverage}</span>
                    <span className="text-muted-foreground">Frequency</span>
                    <span>{net.frequency}</span>
                    <span className="text-muted-foreground">Orbit</span>
                    <span style={{ color: TYPE_COLORS[net.type] }}>{net.type}</span>
                    <span className="text-muted-foreground">Latency</span>
                    <span className="text-success">{net.latency_ms} ms</span>
                    <span className="text-muted-foreground">ADS-B</span>
                    <span className={net.adsb ? "text-success" : "text-muted-foreground"}>
                      {net.adsb ? "Yes — 1090 MHz surveillance" : "No (comms only)"}
                    </span>
                  </div>
                  {!isHostAuth && (
                    <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono text-muted-foreground">
                      <AlertCircle size={9} />
                      Host authentication required to enable this network
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 border-t border-border" style={{ background: "hsl(var(--muted))" }}>
        <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
          {isHostAuth
            ? "Toggle networks to enable satellite ADS-B augmentation. ADS-B networks extend coverage globally via satellite receivers."
            : "View-only mode — authenticate as host to enable communication satellites."}
        </p>
      </div>
    </div>
  );
};

export default CommSatellitePanel;
