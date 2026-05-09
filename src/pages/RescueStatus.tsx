/**
 * Rescue Status Dashboard — Mission status overview
 */
import React, { useState } from "react";
import { Shield, CheckCircle2, Clock, AlertTriangle, Radio, Phone, MapPin, Plane } from "lucide-react";
import { toast } from "sonner";

interface Mission {
  id: string;
  callsign: string;
  status: "ACTIVE" | "STANDBY" | "RESOLVED" | "CRITICAL";
  lat: number;
  lon: number;
  startTime: string;
  type: string;
  resource: string;
}

const MOCK_MISSIONS: Mission[] = [
  { id: "M001", callsign: "AIR404",  status: "CRITICAL", lat: 12.97, lon: 77.59, startTime: "14:32 UTC", type: "Crash Prediction",   resource: "Helo-India-Alpha" },
  { id: "M002", callsign: "IX-821",  status: "ACTIVE",   lat: 19.08, lon: 72.87, startTime: "13:15 UTC", type: "Signal Loss",        resource: "CG Dornier-4" },
  { id: "M003", callsign: "SG-7791", status: "STANDBY",  lat: 13.19, lon: 80.27, startTime: "12:00 UTC", type: "ELT 406 MHz Alert", resource: "MAA Ground Team" },
  { id: "M004", callsign: "UK-6E",   status: "RESOLVED", lat: 17.23, lon: 78.46, startTime: "10:45 UTC", type: "High Risk Assessment",resource: "HYD Standby" },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  CRITICAL: { color: "#ef4444", bg: "#ef444415", icon: AlertTriangle },
  ACTIVE:   { color: "#f97316", bg: "#f9731615", icon: Radio        },
  STANDBY:  { color: "#eab308", bg: "#eab30815", icon: Clock        },
  RESOLVED: { color: "#22c55e", bg: "#22c55e15", icon: CheckCircle2 },
};

const RescueStatus: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>(MOCK_MISSIONS);
  const [selected, setSelected] = useState<Mission | null>(null);

  const updateStatus = (id: string, status: Mission["status"]) => {
    setMissions((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
    toast.success(`Mission ${id} updated to ${status}`);
  };

  const counts = {
    CRITICAL: missions.filter((m) => m.status === "CRITICAL").length,
    ACTIVE:   missions.filter((m) => m.status === "ACTIVE").length,
    STANDBY:  missions.filter((m) => m.status === "STANDBY").length,
    RESOLVED: missions.filter((m) => m.status === "RESOLVED").length,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">RESCUE STATUS</h1>
        <p className="text-xs text-muted-foreground mt-1">Mission tracking and SAR resource coordination</p>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(counts) as [Mission["status"], number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div key={status} className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
              <Icon size={20} style={{ color: cfg.color }} />
              <div>
                <div className="font-heading text-2xl font-700" style={{ color: cfg.color }}>{count}</div>
                <div className="text-[10px] font-heading font-700 tracking-widest text-muted-foreground">{status}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergency contacts */}
      <div className="sar-card hud-border p-4">
        <div className="font-heading text-xs font-700 tracking-widest text-primary mb-3 flex items-center gap-2">
          <Phone size={12} /> EMERGENCY CONTACTS — INDIA SAR
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 text-xs font-mono">
          {[
            { label: "Indian Coast Guard SAR",  number: "1800-180-3943" },
            { label: "National Emergency",       number: "112"           },
            { label: "DGCA Emergency",           number: "011-24621086"  },
            { label: "Mumbai RCC",               number: "+91-22-22614646"},
            { label: "Chennai RCC",              number: "+91-44-25220040"},
            { label: "SAR Platform Support",     number: "anands9408@gmail.com" },
          ].map((c) => (
            <div key={c.label} className="flex gap-3 p-2 rounded"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <span className="text-primary font-700 shrink-0 w-36">{c.label}</span>
              <span className="text-foreground">{c.number}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missions grid + detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Mission list */}
        <div className="xl:col-span-2 sar-card hud-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2"
            style={{ background: "hsl(var(--surface))" }}>
            <Shield size={14} className="text-primary" />
            <span className="font-heading text-sm font-700 tracking-widest">ACTIVE MISSIONS</span>
          </div>
          <div className="divide-y divide-border">
            {missions.map((m) => {
              const cfg = STATUS_CONFIG[m.status];
              const Icon = cfg.icon;
              return (
                <button key={m.id} onClick={() => setSelected(m === selected ? null : m)}
                  className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-colors hover:bg-secondary/20 ${selected?.id === m.id ? "bg-primary/5" : ""}`}>
                  <Icon size={16} style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-700 text-sm text-foreground">{m.callsign}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-700 tracking-wider"
                        style={{ background: cfg.bg, color: cfg.color }}>{m.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{m.type}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin size={9} />{m.lat.toFixed(2)}, {m.lon.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono text-muted-foreground">{m.startTime}</div>
                    <div className="text-[10px] font-mono text-primary">{m.resource}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mission detail */}
        <div className="sar-card hud-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
            <span className="font-heading text-sm font-700 tracking-widest">MISSION DETAIL</span>
          </div>
          {selected ? (
            <div className="p-4 space-y-4">
              <div>
                <div className="font-heading text-xs font-700 tracking-widest text-primary mb-1">AIRCRAFT</div>
                <div className="font-mono text-xl font-700 text-foreground">{selected.callsign}</div>
                <div className="text-xs text-muted-foreground">{selected.id} · {selected.type}</div>
              </div>
              <div>
                <div className="font-heading text-xs font-700 tracking-widest text-primary mb-1">POSITION</div>
                <div className="font-mono text-sm text-foreground">{selected.lat.toFixed(4)}°N</div>
                <div className="font-mono text-sm text-foreground">{selected.lon.toFixed(4)}°E</div>
              </div>
              <div>
                <div className="font-heading text-xs font-700 tracking-widest text-primary mb-1">RESOURCE</div>
                <div className="font-mono text-sm text-foreground">{selected.resource}</div>
              </div>
              <div>
                <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">UPDATE STATUS</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["ACTIVE", "STANDBY", "RESOLVED", "CRITICAL"] as Mission["status"][]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button key={s} onClick={() => updateStatus(selected.id, s)}
                        className="py-2 rounded text-[10px] font-heading font-700 tracking-wider transition-all"
                        style={{
                          background: selected.status === s ? cfg.bg : "hsl(var(--muted))",
                          color: selected.status === s ? cfg.color : "hsl(var(--muted-foreground))",
                          border: `1px solid ${selected.status === s ? cfg.color : "hsl(var(--border))"}`,
                        }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Plane size={28} className="mb-3 opacity-30" />
              <p className="text-sm">Select a mission to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RescueStatus;
