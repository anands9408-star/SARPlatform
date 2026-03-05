/**
 * Physics Panel Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive display of all physics calculations for a target aircraft.
 * Shows:
 *  • Vector decomposition (aircraft + wind + ground velocity)
 *  • Kinematics (v=u+at, s=ut+½at², v²=u²+2as)
 *  • Time-based prediction table
 *  • Search radius growth chart
 *  • Confidence decay curve
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";
import type { KinematicState, PhysicsSummary } from "@/types";
import {
  computePhysicsSummary,
  kinematics,
  KTS_TO_MS,
  KMH_TO_MS,
  FPM_TO_MS,
  EARTH_RADIUS_M,
} from "@/lib/physics";
import { Calculator, Compass, Wind, Navigation, TrendingDown, Table } from "lucide-react";

interface Props {
  state: KinematicState;
  timeSinceLKP?: number;
}

const VectorRow: React.FC<{ label: string; x: number; y: number; mag: number; dir: number; color: string }> = ({
  label, x, y, mag, dir, color,
}) => (
  <div className="grid grid-cols-5 gap-2 py-2 border-b border-border last:border-0 text-xs font-mono items-center">
    <div className="col-span-1">
      <span className="font-heading text-[10px] tracking-wider" style={{ color }}>{label}</span>
    </div>
    <div className="text-center text-foreground">{x.toFixed(2)}</div>
    <div className="text-center text-foreground">{y.toFixed(2)}</div>
    <div className="text-center text-primary font-600">{mag.toFixed(2)}</div>
    <div className="text-center text-muted-foreground">{dir.toFixed(1)}°</div>
  </div>
);

const PhysicsPanel: React.FC<Props> = ({ state, timeSinceLKP = 0 }) => {
  const [activeTab, setActiveTab] = useState<"vectors" | "kinematics" | "prediction" | "uncertainty">("vectors");

  const summary: PhysicsSummary = useMemo(
    () => computePhysicsSummary(state, timeSinceLKP),
    [state, timeSinceLKP]
  );

  // Kinematics at various times (a = 0 for cruise, -0.05 m/s² for descent)
  const acceleration = state.verticalRate < -500 ? -0.05 : 0;
  const u0 = summary.groundVector.magnitude; // m/s

  const kinematicTable = [1, 2, 5, 10, 15, 20, 30].map((min) => {
    const t = min * 60;
    const vt = kinematics.finalVelocity(u0, acceleration, t);
    const s = kinematics.displacement(u0, acceleration, t);
    const vt2 = kinematics.finalVelocityFromDist(u0, acceleration, s);
    return { min, t, vt, s, vt2 };
  });

  const tabs = [
    { id: "vectors" as const, label: "VECTORS", icon: Compass },
    { id: "kinematics" as const, label: "KINEMATICS", icon: Calculator },
    { id: "prediction" as const, label: "PREDICTED PATH", icon: Navigation },
    { id: "uncertainty" as const, label: "UNCERTAINTY", icon: TrendingDown },
  ];

  return (
    <div className="sar-card hud-border overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2"
        style={{ background: "hsl(var(--surface))" }}>
        <Calculator size={14} className="text-primary" />
        <h3 className="font-heading text-sm font-700 tracking-widest">PHYSICS ENGINE</h3>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            GS: <span className="text-primary">{(summary.groundVector.magnitude / KTS_TO_MS).toFixed(1)} kts</span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            C: <span className={summary.confidenceNow > 60 ? "text-success" : summary.confidenceNow > 30 ? "text-warning" : "text-danger"}>
              {summary.confidenceNow.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 font-heading text-[10px] font-700 tracking-wider whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={10} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {/* ─── VECTORS TAB ─── */}
        {activeTab === "vectors" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Ground velocity = Aircraft airspeed vector + Wind vector (relative velocity)
            </div>

            {/* Vector table */}
            <div className="rounded overflow-hidden border border-border">
              <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[9px] font-heading tracking-wider"
                style={{ background: "hsl(var(--surface))" }}>
                <div>VECTOR</div>
                <div className="text-center">Vx (E) m/s</div>
                <div className="text-center">Vy (N) m/s</div>
                <div className="text-center">|V| m/s</div>
                <div className="text-center">DIR °</div>
              </div>
              <div className="px-3">
                <VectorRow
                  label="AIRCRAFT" color="#f97316"
                  x={summary.aircraftVector.x} y={summary.aircraftVector.y}
                  mag={summary.aircraftVector.magnitude} dir={summary.aircraftVector.direction}
                />
                <VectorRow
                  label="WIND" color="#60a5fa"
                  x={summary.windVector.x} y={summary.windVector.y}
                  mag={summary.windVector.magnitude} dir={summary.windVector.direction}
                />
                <VectorRow
                  label="GROUND" color="#22c55e"
                  x={summary.groundVector.x} y={summary.groundVector.y}
                  mag={summary.groundVector.magnitude} dir={summary.groundVector.direction}
                />
              </div>
            </div>

            {/* Vector diagram */}
            <div>
              <div className="label-tag mb-2">VECTOR DIAGRAM (top-down view)</div>
              <div className="relative rounded overflow-hidden" style={{ height: 180, background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                <svg width="100%" height="100%" viewBox="0 0 300 180">
                  {/* Grid */}
                  {[0, 60, 120, 180, 240, 300].map((x) => (
                    <line key={x} x1={x} y1={0} x2={x} y2={180} stroke="hsl(220 25% 20%)" strokeWidth="0.5" />
                  ))}
                  {[0, 45, 90, 135, 180].map((y) => (
                    <line key={y} x1={0} y1={y} x2={300} y2={y} stroke="hsl(220 25% 20%)" strokeWidth="0.5" />
                  ))}

                  {/* Origin */}
                  <circle cx="150" cy="90" r="3" fill="#ffffff" opacity="0.5" />

                  {/* Scale factor */}
                  {(() => {
                    const maxMag = Math.max(
                      summary.aircraftVector.magnitude,
                      summary.windVector.magnitude,
                      summary.groundVector.magnitude,
                      1
                    );
                    const scale = 60 / maxMag;
                    const ax = 150 + summary.aircraftVector.x * scale;
                    const ay = 90 - summary.aircraftVector.y * scale;
                    const wx = 150 + summary.windVector.x * scale;
                    const wy = 90 - summary.windVector.y * scale;
                    const gx = 150 + summary.groundVector.x * scale;
                    const gy = 90 - summary.groundVector.y * scale;

                    return (
                      <>
                        {/* Aircraft vector */}
                        <line x1="150" y1="90" x2={ax} y2={ay} stroke="#f97316" strokeWidth="2" />
                        <circle cx={ax} cy={ay} r="3" fill="#f97316" />
                        <text x={ax + 4} y={ay - 4} fill="#f97316" fontSize="9" fontFamily="monospace">AC</text>

                        {/* Wind vector */}
                        <line x1="150" y1="90" x2={wx} y2={wy} stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />
                        <circle cx={wx} cy={wy} r="3" fill="#60a5fa" />
                        <text x={wx + 4} y={wy + 10} fill="#60a5fa" fontSize="9" fontFamily="monospace">WND</text>

                        {/* Ground vector */}
                        <line x1="150" y1="90" x2={gx} y2={gy} stroke="#22c55e" strokeWidth="2.5" />
                        <polygon
                          points={`${gx},${gy} ${gx - 6},${gy + 4} ${gx - 6},${gy - 4}`}
                          fill="#22c55e"
                          transform={`rotate(${Math.atan2(gx - 150, -(gy - 90)) * 180 / Math.PI}, ${gx}, ${gy})`}
                        />
                        <text x={gx + 4} y={gy} fill="#22c55e" fontSize="9" fontFamily="monospace">GND</text>
                      </>
                    );
                  })()}

                  {/* Compass labels */}
                  <text x="148" y="12" fill="hsl(220 15% 55%)" fontSize="9" fontFamily="monospace">N</text>
                  <text x="148" y="176" fill="hsl(220 15% 55%)" fontSize="9" fontFamily="monospace">S</text>
                  <text x="4" y="93" fill="hsl(220 15% 55%)" fontSize="9" fontFamily="monospace">W</text>
                  <text x="285" y="93" fill="hsl(220 15% 55%)" fontSize="9" fontFamily="monospace">E</text>
                </svg>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "AIRSPEED", value: `${state.velocity} kts`, sub: `${(state.velocity * KTS_TO_MS).toFixed(1)} m/s` },
                { label: "WIND SPEED", value: `${(state.windSpeed / KMH_TO_MS).toFixed(0)} km/h`, sub: `${state.windSpeed.toFixed(1)} m/s` },
                { label: "GROUND SPEED", value: `${(summary.groundVector.magnitude / KTS_TO_MS).toFixed(1)} kts`, sub: `${summary.groundVector.magnitude.toFixed(1)} m/s` },
              ].map((item) => (
                <div key={item.label} className="rounded p-2.5 text-center" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                  <div className="label-tag text-[9px]">{item.label}</div>
                  <div className="font-heading text-base font-700 text-foreground">{item.value}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── KINEMATICS TAB ─── */}
        {activeTab === "kinematics" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground leading-relaxed">
              Equations: <span className="font-mono text-primary">v = u + at</span> · <span className="font-mono text-primary">s = ut + ½at²</span> · <span className="font-mono text-primary">v² = u² + 2as</span>
            </div>

            {/* Initial conditions */}
            <div className="rounded p-3 space-y-2" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className="label-tag mb-2">INITIAL CONDITIONS</div>
              {[
                ["u (initial velocity)", `${u0.toFixed(2)} m/s (${(u0 / KTS_TO_MS).toFixed(1)} kts)`],
                ["a (acceleration)", `${acceleration} m/s²`],
                ["Heading", `${state.heading.toFixed(1)}°`],
                ["Altitude", `${state.altitude.toLocaleString()} ft`],
                ["Vertical Rate", `${state.verticalRate} ft/min`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{k}</span>
                  <span className="text-foreground font-mono font-600">{v}</span>
                </div>
              ))}
            </div>

            {/* Kinematics table */}
            <div>
              <div className="label-tag mb-2">DISPLACEMENT TABLE</div>
              <div className="rounded overflow-hidden border border-border">
                <div className="grid grid-cols-4 gap-1 px-3 py-2 text-[9px] font-heading tracking-wider"
                  style={{ background: "hsl(var(--surface))" }}>
                  <div>t (min)</div>
                  <div className="text-center">v (m/s)</div>
                  <div className="text-center">s (km)</div>
                  <div className="text-center">v² check</div>
                </div>
                <div className="divide-y divide-border">
                  {kinematicTable.map((row) => (
                    <div key={row.min} className="grid grid-cols-4 gap-1 px-3 py-1.5 text-[11px] font-mono hover:bg-secondary/20 transition-colors">
                      <div className="text-muted-foreground">{row.min} min</div>
                      <div className="text-center text-foreground">{row.vt.toFixed(2)}</div>
                      <div className="text-center text-primary font-600">{(row.s / 1000).toFixed(2)}</div>
                      <div className="text-center text-muted-foreground">{row.vt2.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── PREDICTED PATH TAB ─── */}
        {activeTab === "prediction" && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Physics-based trajectory at 1-minute intervals with wind drift applied.
            </div>
            <div className="rounded overflow-hidden border border-border">
              <div className="grid grid-cols-5 gap-1 px-3 py-2 text-[9px] font-heading tracking-wider"
                style={{ background: "hsl(var(--surface))" }}>
                <div>MIN</div>
                <div className="text-center">LAT</div>
                <div className="text-center">LON</div>
                <div className="text-center">ALT ft</div>
                <div className="text-center">CONF %</div>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {summary.predictedPath.filter((_, i) => i % 2 === 0 || i < 5).map((p, i) => (
                  <div key={i} className="grid grid-cols-5 gap-1 px-3 py-1.5 text-[10px] font-mono hover:bg-secondary/20 transition-colors">
                    <div className="text-muted-foreground">{Math.round(p.time / 60)}'</div>
                    <div className="text-center text-foreground">{p.lat.toFixed(3)}</div>
                    <div className="text-center text-foreground">{p.lon.toFixed(3)}</div>
                    <div className="text-center text-primary">{Math.round(p.altitude).toLocaleString()}</div>
                    <div className={`text-center font-600 ${p.confidence > 50 ? "text-success" : p.confidence > 25 ? "text-warning" : "text-danger"}`}>
                      {p.confidence.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── UNCERTAINTY TAB ─── */}
        {activeTab === "uncertainty" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Search radius grows and confidence decays exponentially with time since LKP.
              C(t) = 100·e<sup>−λt</sup> · R(t) = R₀ + k·t + ½·k·t²
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded p-3 text-center" style={{ background: "hsl(var(--danger) / 0.08)", border: "1px solid hsl(var(--danger) / 0.3)" }}>
                <div className="label-tag text-[9px] mb-1">SEARCH RADIUS NOW</div>
                <div className="font-heading text-2xl font-700 text-danger">{(summary.searchRadiusNow / 1000).toFixed(2)}</div>
                <div className="label-tag">km</div>
              </div>
              <div className="rounded p-3 text-center" style={{ background: "hsl(var(--success) / 0.08)", border: "1px solid hsl(var(--success) / 0.3)" }}>
                <div className="label-tag text-[9px] mb-1">CONFIDENCE NOW</div>
                <div className={`font-heading text-2xl font-700 ${summary.confidenceNow > 60 ? "text-success" : summary.confidenceNow > 30 ? "text-warning" : "text-danger"}`}>
                  {summary.confidenceNow.toFixed(1)}%
                </div>
                <div className="label-tag">{timeSinceLKP < 60 ? "< 1 min elapsed" : `${Math.round(timeSinceLKP / 60)} min elapsed`}</div>
              </div>
            </div>

            {/* Mini uncertainty chart (SVG bar chart) */}
            <div>
              <div className="label-tag mb-2">RADIUS GROWTH OVER TIME</div>
              <div className="rounded overflow-hidden" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", height: 80 }}>
                <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
                  {[0, 5, 10, 15, 20, 30].map((min, i, arr) => {
                    const t = min * 60;
                    const r = Math.min(20000, 500 + 25 * t + 0.25 * t * t);
                    const maxR = Math.min(20000, 500 + 25 * 30 * 60 + 0.25 * (30 * 60) * (30 * 60));
                    const x = (i / (arr.length - 1)) * 290 + 5;
                    const barH = (r / maxR) * 60;
                    return (
                      <g key={min}>
                        <rect x={x - 10} y={80 - barH - 5} width={20} height={barH}
                          fill={r > 10000 ? "#ef4444" : r > 5000 ? "#f97316" : "#f59e0b"}
                          opacity="0.7" rx="2" />
                        <text x={x} y={76} textAnchor="middle" fontSize="8" fill="hsl(220 15% 55%)" fontFamily="monospace">{min}m</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Confidence decay table */}
            <div className="rounded overflow-hidden border border-border">
              <div className="grid grid-cols-3 gap-1 px-3 py-2 text-[9px] font-heading tracking-wider"
                style={{ background: "hsl(var(--surface))" }}>
                <div>TIME ELAPSED</div>
                <div className="text-center">CONFIDENCE</div>
                <div className="text-center">SEARCH RADIUS</div>
              </div>
              <div className="divide-y divide-border">
                {[0, 1, 5, 10, 20, 30, 60].map((min) => {
                  const t = min * 60;
                  const c = Math.max(5, 100 * Math.exp(-Math.log(2) / 300 * t));
                  const r = Math.min(20000, 500 + 25 * t + 0.25 * t * t);
                  return (
                    <div key={min} className="grid grid-cols-3 gap-1 px-3 py-1.5 text-[10px] font-mono hover:bg-secondary/20">
                      <div className="text-muted-foreground">{min === 0 ? "Now" : `${min} min`}</div>
                      <div className={`text-center font-600 ${c > 60 ? "text-success" : c > 30 ? "text-warning" : "text-danger"}`}>
                        {c.toFixed(1)}%
                      </div>
                      <div className="text-center text-primary">{(r / 1000).toFixed(2)} km</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhysicsPanel;
