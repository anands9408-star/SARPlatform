/**
 * Danger Assessment Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Scores each live aircraft using physics-based factors:
 *  • Altitude (low = danger)
 *  • Vertical rate (rapid descent = danger)
 *  • Wind crosswind drift
 *  • Weather at location
 *  • Signal age
 * Displays top N most dangerous aircraft with detailed factor breakdown.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useState } from "react";
import type { LiveAircraft, DangerScore, DangerFactor, WeatherData } from "@/types";
import { computeCrashProbability, calculateDrift, KMH_TO_MS } from "@/lib/physics";
import { windDangerScore } from "@/lib/weatherApi";
import { AlertTriangle, Plane, ChevronDown, ChevronRight, Activity, RefreshCw } from "lucide-react";

interface Props {
  aircraft: LiveAircraft[];
  weatherMap?: Map<string, WeatherData>;
  topN?: number;
}

function levelClass(level: DangerScore["level"]): string {
  switch (level) {
    case "CRITICAL": return "text-danger border-danger/40 bg-danger/8";
    case "WARNING":  return "text-warning border-warning/40 bg-warning/8";
    case "WATCH":    return "text-primary border-primary/40 bg-primary/8";
    default:         return "text-success border-success/40 bg-success/8";
  }
}

function scoreToLevel(score: number): DangerScore["level"] {
  if (score >= 60) return "CRITICAL";
  if (score >= 40) return "WARNING";
  if (score >= 20) return "WATCH";
  return "SAFE";
}

function computeDangerScore(ac: LiveAircraft, weather?: WeatherData): DangerScore {
  const factors: DangerFactor[] = [];
  let score = 0;

  // ── Altitude ──
  if (ac.altitude < 1000) {
    factors.push({ name: "Altitude CRITICAL", value: `${ac.altitude.toLocaleString()} ft`, severity: "high", points: 35 });
    score += 35;
  } else if (ac.altitude < 3000) {
    factors.push({ name: "Low Altitude", value: `${ac.altitude.toLocaleString()} ft`, severity: "high", points: 20 });
    score += 20;
  } else if (ac.altitude < 8000) {
    factors.push({ name: "Below Cruise Altitude", value: `${ac.altitude.toLocaleString()} ft`, severity: "medium", points: 8 });
    score += 8;
  }

  // ── Vertical Rate ──
  if (ac.verticalRate < -2000) {
    factors.push({ name: "Rapid Descent", value: `${ac.verticalRate.toLocaleString()} ft/min`, severity: "high", points: 30 });
    score += 30;
  } else if (ac.verticalRate < -1000) {
    factors.push({ name: "High Descent Rate", value: `${ac.verticalRate.toLocaleString()} ft/min`, severity: "medium", points: 15 });
    score += 15;
  }

  // ── Speed Anomaly ──
  if (ac.velocity < 80 && ac.altitude > 1000) {
    factors.push({ name: "Low Airspeed (Stall Risk)", value: `${ac.velocity} kts`, severity: "high", points: 20 });
    score += 20;
  } else if (ac.velocity > 550) {
    factors.push({ name: "Overspeed", value: `${ac.velocity} kts`, severity: "medium", points: 15 });
    score += 15;
  }

  // ── Weather ──
  if (weather) {
    const wScore = windDangerScore(weather.windSpeed);
    if (wScore > 0) {
      factors.push({ name: `Wind: ${weather.weatherDescription}`, value: `${weather.windSpeed} km/h`, severity: wScore > 15 ? "high" : "medium", points: wScore });
      score += wScore;
    }
    if (weather.dangerLevel === "EXTREME") {
      factors.push({ name: "Extreme Weather", value: weather.weatherDescription, severity: "high", points: 25 });
      score += 25;
    } else if (weather.dangerLevel === "DANGER") {
      factors.push({ name: "Dangerous Weather", value: weather.weatherDescription, severity: "medium", points: 12 });
      score += 12;
    }
    if (weather.visibility < 1) {
      factors.push({ name: "Near-Zero Visibility", value: `${weather.visibility} km`, severity: "high", points: 20 });
      score += 20;
    } else if (weather.visibility < 5) {
      factors.push({ name: "Low Visibility", value: `${weather.visibility} km`, severity: "medium", points: 8 });
      score += 8;
    }
  }

  // ── Signal Age ──
  const signalAge = Date.now() / 1000 - ac.lastContact;
  if (signalAge > 60) {
    factors.push({ name: "Signal Loss", value: `${Math.round(signalAge)}s ago`, severity: "high", points: 20 });
    score += 20;
  } else if (signalAge > 30) {
    factors.push({ name: "Weak Signal", value: `${Math.round(signalAge)}s ago`, severity: "medium", points: 8 });
    score += 8;
  }

  const totalScore = Math.min(100, score);
  return {
    icao24: ac.icao24,
    callsign: ac.callsign,
    score: totalScore,
    level: scoreToLevel(totalScore),
    factors,
    lat: ac.lat,
    lon: ac.lon,
    altitude: ac.altitude,
    heading: ac.heading,
    velocity: ac.velocity,
  };
}

const DangerAssessment: React.FC<Props> = ({ aircraft, weatherMap, topN = 10 }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<DangerScore["level"] | "ALL">("ALL");

  const scored = useMemo<DangerScore[]>(() => {
    return aircraft
      .map((ac) => computeDangerScore(ac, weatherMap?.get(ac.icao24)))
      .filter((s) => s.factors.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }, [aircraft, weatherMap, topN]);

  const filtered = filter === "ALL" ? scored : scored.filter((s) => s.level === filter);

  const counts = useMemo(() => ({
    CRITICAL: scored.filter((s) => s.level === "CRITICAL").length,
    WARNING:  scored.filter((s) => s.level === "WARNING").length,
    WATCH:    scored.filter((s) => s.level === "WATCH").length,
    SAFE:     scored.filter((s) => s.level === "SAFE").length,
  }), [scored]);

  return (
    <div className="sar-card hud-border overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between"
        style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-danger" />
          <h3 className="font-heading text-sm font-700 tracking-widest">DANGER ASSESSMENT</h3>
        </div>
        <span className="label-tag">{scored.length} AT RISK</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border">
        {(["ALL", "CRITICAL", "WARNING", "WATCH"] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilter(lvl)}
            className={`flex-1 py-2 font-heading text-[10px] font-700 tracking-wider transition-colors border-b-2 ${
              filter === lvl
                ? lvl === "CRITICAL" ? "border-danger text-danger"
                  : lvl === "WARNING" ? "border-warning text-warning"
                  : lvl === "WATCH" ? "border-primary text-primary"
                  : "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {lvl}
            {lvl !== "ALL" && counts[lvl] > 0 && (
              <span className="ml-1 opacity-70">({counts[lvl]})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <Plane size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No aircraft at this risk level</p>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.icao24}>
              <button
                onClick={() => setExpanded(expanded === s.icao24 ? null : s.icao24)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
              >
                {/* Score bar */}
                <div className="relative w-10 h-10 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke={s.level === "CRITICAL" ? "#ef4444" : s.level === "WARNING" ? "#f97316" : s.level === "WATCH" ? "#f59e0b" : "#22c55e"}
                      strokeWidth="3"
                      strokeDasharray={`${(s.score / 100) * 94.2} 94.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-[9px] font-700 text-foreground">{s.score}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-700 text-foreground truncate">{s.callsign}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-700 font-heading tracking-wider border ${levelClass(s.level)}`}>
                      {s.level}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {s.altitude.toLocaleString()} ft · {s.velocity} kts · {s.factors.length} risk factor{s.factors.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {expanded === s.icao24
                  ? <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                  : <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                }
              </button>

              {/* Expanded factors */}
              {expanded === s.icao24 && (
                <div className="px-4 pb-3 space-y-1.5" style={{ background: "hsl(var(--muted))" }}>
                  <div className="pt-2 mb-2 flex items-center gap-2">
                    <AlertTriangle size={11} className="text-warning" />
                    <span className="label-tag text-[9px]">RISK FACTORS</span>
                  </div>
                  {s.factors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          f.severity === "high" ? "bg-danger" : f.severity === "medium" ? "bg-warning" : "bg-primary"
                        }`} />
                        <span className="text-[11px] text-foreground truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-muted-foreground">{f.value}</span>
                        <span className="font-mono text-[10px] text-warning">+{f.points}</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border mt-2 font-mono text-[10px] text-muted-foreground">
                    {s.lat.toFixed(4)}°N, {s.lon.toFixed(4)}°E · ICAO: {s.icao24.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DangerAssessment;
