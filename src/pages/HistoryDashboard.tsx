/**
 * SAR History Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Three tabs: Aircraft History · Weather Snapshots · Risk Assessments
 * Reads from OnSpace Cloud backend (aircraft_history, weather_snapshots,
 * risk_assessments tables) with auto-refresh and filtering controls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AircraftHistoryRow, WeatherSnapshotRow, RiskAssessmentRow } from "@/lib/sarStorage";
import {
  History, Plane, CloudRain, AlertTriangle, RefreshCw,
  TrendingDown, Wind, Eye, Thermometer, Activity,
  Clock, MapPin, Globe, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Tab type ───────────────────────────────────────────────────────────────
type Tab = "aircraft" | "weather" | "risk";

// ── Risk level styling ─────────────────────────────────────────────────────
function riskColor(level: string) {
  switch (level) {
    case "CRITICAL": return "text-danger border-danger/40 bg-danger/8";
    case "HIGH":     return "text-orange-400 border-orange-400/40 bg-orange-400/8";
    case "MEDIUM":   return "text-warning border-warning/40 bg-warning/8";
    default:         return "text-success border-success/40 bg-success/8";
  }
}

// ── Time formatter ─────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit",
    minute: "2-digit", second: "2-digit", hour12: false,
  });
}

// ── Main Component ─────────────────────────────────────────────────────────

const HistoryDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>("risk");

  // ── Aircraft history state ────────────────────────────────────────────
  const [aircraft, setAircraft]   = useState<AircraftHistoryRow[]>([]);
  const [acLoading, setAcLoading] = useState(false);
  const [acFilter, setAcFilter]   = useState("");
  const [acLimit, setAcLimit]     = useState(50);
  const [acExpanded, setAcExpanded] = useState<string | null>(null);

  // ── Weather state ─────────────────────────────────────────────────────
  const [weather, setWeather]     = useState<WeatherSnapshotRow[]>([]);
  const [wxLoading, setWxLoading] = useState(false);
  const [wxLimit, setWxLimit]     = useState(30);
  const [wxDangerOnly, setWxDangerOnly] = useState(false);

  // ── Risk state ────────────────────────────────────────────────────────
  const [risks, setRisks]         = useState<RiskAssessmentRow[]>([]);
  const [rkLoading, setRkLoading] = useState(false);
  const [rkFilter, setRkFilter]   = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");
  const [rkLimit, setRkLimit]     = useState(50);
  const [rkExpanded, setRkExpanded] = useState<string | null>(null);

  // ── Stats ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ totalAc: 0, totalWx: 0, totalRisk: 0, criticals: 0 });

  // ── Fetch aircraft history ─────────────────────────────────────────────
  const fetchAircraft = useCallback(async () => {
    setAcLoading(true);
    let q = supabase
      .from("aircraft_history")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(acLimit);
    if (acFilter.trim()) q = q.ilike("callsign", `%${acFilter.trim()}%`);
    const { data, error } = await q;
    if (!error && data) setAircraft(data as AircraftHistoryRow[]);
    setAcLoading(false);
  }, [acFilter, acLimit]);

  // ── Fetch weather snapshots ────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    setWxLoading(true);
    let q = supabase
      .from("weather_snapshots")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(wxLimit);
    if (wxDangerOnly) q = q.eq("is_dangerous", true);
    const { data, error } = await q;
    if (!error && data) setWeather(data as WeatherSnapshotRow[]);
    setWxLoading(false);
  }, [wxLimit, wxDangerOnly]);

  // ── Fetch risk assessments ─────────────────────────────────────────────
  const fetchRisks = useCallback(async () => {
    setRkLoading(true);
    let q = supabase
      .from("risk_assessments")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(rkLimit);
    if (rkFilter !== "ALL") q = q.eq("risk_level", rkFilter);
    const { data, error } = await q;
    if (!error && data) setRisks(data as RiskAssessmentRow[]);
    setRkLoading(false);
  }, [rkFilter, rkLimit]);

  // ── Fetch stats (counts) ───────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const [acRes, wxRes, rkRes, critRes] = await Promise.all([
      supabase.from("aircraft_history").select("id", { count: "exact", head: true }),
      supabase.from("weather_snapshots").select("id", { count: "exact", head: true }),
      supabase.from("risk_assessments").select("id", { count: "exact", head: true }),
      supabase.from("risk_assessments").select("id", { count: "exact", head: true }).eq("risk_level", "CRITICAL"),
    ]);
    setStats({
      totalAc:   acRes.count  ?? 0,
      totalWx:   wxRes.count  ?? 0,
      totalRisk: rkRes.count  ?? 0,
      criticals: critRes.count ?? 0,
    });
  }, []);

  // Initial + tab-switch loads
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === "aircraft") fetchAircraft(); }, [tab, fetchAircraft]);
  useEffect(() => { if (tab === "weather")  fetchWeather();  }, [tab, fetchWeather]);
  useEffect(() => { if (tab === "risk")     fetchRisks();    }, [tab, fetchRisks]);

  const handleRefresh = () => {
    fetchStats();
    if (tab === "aircraft") fetchAircraft();
    if (tab === "weather")  fetchWeather();
    if (tab === "risk")     fetchRisks();
  };

  // ── Stat Cards ─────────────────────────────────────────────────────────
  const statCards = [
    { label: "Aircraft Records", value: stats.totalAc.toLocaleString(), icon: Plane, color: "text-primary" },
    { label: "Weather Snapshots", value: stats.totalWx.toLocaleString(), icon: CloudRain, color: "text-primary" },
    { label: "Risk Assessments", value: stats.totalRisk.toLocaleString(), icon: Activity, color: "text-warning" },
    { label: "CRITICAL Events", value: stats.criticals.toLocaleString(), icon: AlertTriangle, color: "text-danger" },
  ];

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <div>
          <h1 className="font-heading text-xl font-700 tracking-widest text-foreground flex items-center gap-2">
            <History size={18} className="text-primary" /> SAR HISTORY DASHBOARD
          </h1>
          <p className="text-xs text-muted-foreground">
            Aircraft records · Weather snapshots · Risk assessments — stored in OnSpace Cloud
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded font-heading text-xs border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
        >
          <RefreshCw size={12} /> REFRESH
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="sar-card hud-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="label-tag text-[9px]">{s.label}</span>
                <s.icon size={14} className={s.color} />
              </div>
              <div className={`font-heading text-2xl font-700 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Tab Nav ──────────────────────────────────────────────────── */}
        <div className="sar-card hud-border overflow-hidden">
          <div className="flex border-b border-border" style={{ background: "hsl(var(--surface))" }}>
            {([
              { id: "risk",     label: "RISK ASSESSMENTS", icon: AlertTriangle },
              { id: "aircraft", label: "AIRCRAFT HISTORY",  icon: Plane },
              { id: "weather",  label: "WEATHER SNAPSHOTS", icon: CloudRain },
            ] as { id: Tab; label: string; icon: any }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 font-heading text-xs tracking-widest border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── RISK ASSESSMENTS TAB ──────────────────────────────────── */}
          {tab === "risk" && (
            <div>
              {/* Controls */}
              <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-3"
                style={{ background: "hsl(var(--muted))" }}>
                {(["ALL", "CRITICAL", "HIGH"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setRkFilter(lvl)}
                    className={`px-3 py-1 rounded font-heading text-[10px] font-700 tracking-wider border transition-all ${
                      rkFilter === lvl
                        ? lvl === "CRITICAL" ? "bg-danger/15 border-danger/50 text-danger"
                          : lvl === "HIGH" ? "bg-orange-400/15 border-orange-400/50 text-orange-400"
                          : "bg-primary/15 border-primary/50 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
                <select
                  value={rkLimit}
                  onChange={(e) => setRkLimit(parseInt(e.target.value))}
                  className="ml-auto sar-input text-xs py-1 w-24"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>Last {n}</option>
                  ))}
                </select>
                {rkLoading && <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />}
              </div>

              {/* List */}
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {risks.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertTriangle size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No risk records yet. Enable the aircraft feed to start collecting data.</p>
                  </div>
                ) : risks.map((r) => (
                  <div key={r.id}>
                    <button
                      onClick={() => setRkExpanded(rkExpanded === r.id ? null : r.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors text-left"
                    >
                      {/* Score ring */}
                      <div className="relative w-10 h-10 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={r.risk_level === "CRITICAL" ? "#ef4444" : "#f97316"}
                            strokeWidth="3"
                            strokeDasharray={`${(r.risk_score / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-mono text-[9px] font-700">{Math.round(r.risk_score)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading text-sm font-700">{r.callsign || r.icao24}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-700 font-heading tracking-wider border ${riskColor(r.risk_level)}`}>
                            {r.risk_level}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5 flex items-center gap-3">
                          <span><Clock size={9} className="inline mr-1" />{fmtTime(r.recorded_at)}</span>
                          <span><MapPin size={9} className="inline mr-1" />{r.lat.toFixed(3)}°, {r.lon.toFixed(3)}°</span>
                          {r.altitude_ft && <span>{r.altitude_ft.toLocaleString()} ft</span>}
                        </div>
                      </div>
                      {rkExpanded === r.id
                        ? <ChevronUp size={12} className="text-muted-foreground shrink-0" />
                        : <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                      }
                    </button>
                    {rkExpanded === r.id && r.factors && (
                      <div className="px-4 pb-3 space-y-1" style={{ background: "hsl(var(--muted))" }}>
                        <div className="label-tag text-[9px] pt-2 mb-1.5">RISK FACTORS</div>
                        {(r.factors as any[]).map((f: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                              <span className="text-foreground">{f.name || f.label}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[10px]">
                              <span className="text-muted-foreground">{f.value}</span>
                              <span className="text-warning">+{f.points || f.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AIRCRAFT HISTORY TAB ──────────────────────────────────── */}
          {tab === "aircraft" && (
            <div>
              <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-3"
                style={{ background: "hsl(var(--muted))" }}>
                <input
                  type="text"
                  placeholder="Filter callsign…"
                  value={acFilter}
                  onChange={(e) => setAcFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchAircraft()}
                  className="sar-input text-xs py-1 w-36"
                />
                <button
                  onClick={fetchAircraft}
                  className="px-3 py-1 rounded font-heading text-[10px] border border-primary/50 text-primary hover:bg-primary/10 transition-all"
                >
                  SEARCH
                </button>
                <select
                  value={acLimit}
                  onChange={(e) => setAcLimit(parseInt(e.target.value))}
                  className="ml-auto sar-input text-xs py-1 w-24"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>Last {n}</option>
                  ))}
                </select>
                {acLoading && <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />}
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead style={{ background: "hsl(var(--surface))" }}>
                    <tr className="border-b border-border">
                      {["CALLSIGN", "ICAO24", "POSITION", "ALTITUDE", "SPEED", "HEADING", "V-RATE", "RADIUS", "TIME"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left label-tag text-[9px] font-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {aircraft.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                          No aircraft records yet.
                        </td>
                      </tr>
                    ) : aircraft.map((a) => (
                      <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-3 py-2 font-heading text-xs font-700 text-primary whitespace-nowrap">
                          {a.callsign || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                          {a.icao24.toUpperCase()}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] whitespace-nowrap">
                          {a.lat.toFixed(3)}°, {a.lon.toFixed(3)}°
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">
                          {a.altitude_ft ? `${a.altitude_ft.toLocaleString()} ft` : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">
                          {a.velocity_kts ? `${a.velocity_kts} kts` : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">
                          {a.heading != null ? `${a.heading}°` : "—"}
                        </td>
                        <td className={`px-3 py-2 font-mono text-[10px] ${(a.vertical_rate_fpm ?? 0) < -1000 ? "text-danger" : ""}`}>
                          {a.vertical_rate_fpm ? `${a.vertical_rate_fpm > 0 ? "+" : ""}${a.vertical_rate_fpm} fpm` : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">
                          {a.scan_radius_km ? `${a.scan_radius_km} km` : <span className="flex items-center gap-1"><Globe size={9} />GLB</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                          {fmtTime(a.recorded_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── WEATHER SNAPSHOTS TAB ─────────────────────────────────── */}
          {tab === "weather" && (
            <div>
              <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-3"
                style={{ background: "hsl(var(--muted))" }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wxDangerOnly}
                    onChange={(e) => setWxDangerOnly(e.target.checked)}
                    className="accent-danger"
                  />
                  <span className="label-tag text-[9px]">DANGEROUS ONLY</span>
                </label>
                <select
                  value={wxLimit}
                  onChange={(e) => setWxLimit(parseInt(e.target.value))}
                  className="ml-auto sar-input text-xs py-1 w-24"
                >
                  {[15, 30, 60, 100].map((n) => (
                    <option key={n} value={n}>Last {n}</option>
                  ))}
                </select>
                {wxLoading && <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />}
              </div>

              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {weather.length === 0 ? (
                  <div className="p-8 text-center">
                    <CloudRain size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No weather snapshots yet. Weather is saved on each refresh from the Prediction Platform.</p>
                  </div>
                ) : weather.map((w) => (
                  <div
                    key={w.id}
                    className={`px-4 py-3 flex flex-wrap items-center gap-4 ${w.is_dangerous ? "bg-danger/3" : ""}`}
                  >
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <MapPin size={11} className="text-primary shrink-0" />
                      <span className="font-mono text-[10px]">
                        {w.lat.toFixed(3)}°, {w.lon.toFixed(3)}°
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-[10px] font-mono">
                      {w.temperature_c != null && (
                        <span className="flex items-center gap-1">
                          <Thermometer size={10} className="text-primary" />
                          {w.temperature_c}°C
                        </span>
                      )}
                      {w.wind_speed_kmh != null && (
                        <span className="flex items-center gap-1">
                          <Wind size={10} className="text-primary" />
                          {w.wind_speed_kmh} km/h {w.wind_direction_deg != null ? `${w.wind_direction_deg}°` : ""}
                        </span>
                      )}
                      {w.visibility_m != null && (
                        <span className="flex items-center gap-1">
                          <Eye size={10} className="text-primary" />
                          {(w.visibility_m / 1000).toFixed(1)} km
                        </span>
                      )}
                      {w.description && (
                        <span className={w.is_dangerous ? "text-danger font-700" : "text-foreground"}>
                          {w.description}
                        </span>
                      )}
                    </div>
                    {w.is_dangerous && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-700 font-heading tracking-wider border text-danger border-danger/40 bg-danger/8">
                        DANGER
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      <Clock size={9} className="inline mr-1" />{fmtTime(w.recorded_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryDashboard;
