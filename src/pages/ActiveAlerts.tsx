/**
 * Active Alerts Dashboard — Real-time CRITICAL/HIGH risk alerts
 */
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Plane, MapPin, Activity, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { sendSARAlert } from "@/lib/notifications";
import type { NotifyAircraft } from "@/lib/notifications";

interface RiskRecord {
  id: string;
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude_ft: number | null;
  risk_score: number;
  risk_level: string;
  factors: any;
  recorded_at: string;
}

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  WATCH:    "#eab308",
  SAFE:     "#22c55e",
};

const ActiveAlerts: React.FC = () => {
  const [records, setRecords]   = useState<RiskRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");
  const [notifying, setNotifying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("risk_assessments")
      .select("*")
      .in("risk_level", ["CRITICAL", "HIGH", "WATCH"])
      .order("recorded_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Failed to load alerts: " + error.message);
    else setRecords(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Poll every 30s
  useEffect(() => {
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  const filtered = filter === "ALL" ? records : records.filter((r) => r.risk_level === filter);

  const handleResend = async (rec: RiskRecord) => {
    setNotifying(rec.id);
    const ac: NotifyAircraft = {
      icao24:      rec.icao24,
      callsign:    rec.callsign ?? rec.icao24,
      lat:         rec.lat,
      lon:         rec.lon,
      altitude_ft: rec.altitude_ft ?? 0,
      risk_score:  rec.risk_score,
      risk_level:  rec.risk_level,
      factors:     Array.isArray(rec.factors) ? rec.factors : [],
    };
    await sendSARAlert(rec.risk_level as any, [ac]);
    toast.success(`Alert re-sent for ${ac.callsign}`);
    setNotifying(null);
  };

  const critCount  = records.filter((r) => r.risk_level === "CRITICAL").length;
  const highCount  = records.filter((r) => r.risk_level === "HIGH").length;
  const watchCount = records.filter((r) => r.risk_level === "WATCH").length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">ACTIVE ALERTS</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time CRITICAL / HIGH / WATCH risk aircraft from database</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all font-heading text-xs font-700">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "CRITICAL", count: critCount, color: "#ef4444", icon: AlertTriangle },
          { label: "HIGH",     count: highCount, color: "#f97316", icon: Activity      },
          { label: "WATCH",    count: watchCount,color: "#eab308", icon: Plane         },
        ].map(({ label, count, color, icon: Icon }) => (
          <button key={label}
            onClick={() => setFilter(filter === label as any ? "ALL" : label as any)}
            className="flex items-center gap-4 p-5 rounded-xl text-left transition-all"
            style={{
              background: filter === label ? `${color}18` : "hsl(var(--surface))",
              border: `2px solid ${filter === label ? color : "hsl(var(--border))"}`,
            }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div>
              <div className="font-heading text-3xl font-700" style={{ color }}>{count}</div>
              <div className="font-heading text-xs font-700 tracking-widest text-muted-foreground">{label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="sar-card hud-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3"
          style={{ background: "hsl(var(--surface))" }}>
          <AlertTriangle size={14} className="text-danger" />
          <span className="font-heading text-sm font-700 tracking-widest">ALERT LOG</span>
          <span className="label-tag text-[9px] ml-2">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
            No {filter !== "ALL" ? filter : ""} alerts found
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((rec) => {
              const color = LEVEL_COLOR[rec.risk_level] ?? "#6b7280";
              return (
                <div key={rec.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-secondary/20 transition-colors">
                  {/* Level badge */}
                  <div className="w-24 shrink-0">
                    <span className="px-2 py-1 rounded text-[10px] font-heading font-700 tracking-wider"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}>
                      {rec.risk_level}
                    </span>
                  </div>

                  {/* Callsign + ICAO */}
                  <div className="w-32 shrink-0">
                    <div className="font-mono text-sm font-700 text-foreground">{rec.callsign || rec.icao24}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{rec.icao24.toUpperCase()}</div>
                  </div>

                  {/* Score */}
                  <div className="w-20 shrink-0">
                    <div className="font-heading text-xl font-700" style={{ color }}>{rec.risk_score}</div>
                    <div className="text-[9px] text-muted-foreground font-mono">/ 100</div>
                  </div>

                  {/* Position */}
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
                    <MapPin size={10} className="text-primary" />
                    {rec.lat.toFixed(4)}°N, {rec.lon.toFixed(4)}°E
                    {rec.altitude_ft && ` · ${rec.altitude_ft.toLocaleString()} ft`}
                  </div>

                  {/* Factors */}
                  <div className="flex flex-wrap gap-1 flex-1">
                    {(Array.isArray(rec.factors) ? rec.factors : []).slice(0, 3).map((f: any, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                        style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                        {f.name ?? f.label}
                      </span>
                    ))}
                  </div>

                  {/* Time */}
                  <div className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {new Date(rec.recorded_at).toLocaleTimeString()}
                  </div>

                  {/* Re-notify button */}
                  {(rec.risk_level === "CRITICAL" || rec.risk_level === "HIGH") && (
                    <button
                      onClick={() => handleResend(rec)}
                      disabled={notifying === rec.id}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-danger/40 text-danger hover:bg-danger/10 text-[10px] font-heading font-700 transition-all disabled:opacity-50"
                    >
                      {notifying === rec.id
                        ? <div className="w-3 h-3 border border-danger border-t-transparent rounded-full animate-spin" />
                        : <Mail size={10} />}
                      NOTIFY
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveAlerts;
