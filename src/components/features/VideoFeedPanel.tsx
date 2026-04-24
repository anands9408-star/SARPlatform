/**
 * Mission Control Video Feed Panel
 * ─────────────────────────────────────────────────────────────────────────────
 * Dark-themed card with glowing border.
 * - Live satellite / drone feed placeholder (video player)
 * - Simulate button: uses last known aircraft position + vector kinematics
 *   to animate a predicted flight path on an SVG canvas overlay
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Video, Satellite, Play, Pause, RotateCcw, Zap, Radio, Crosshair, ChevronDown, ChevronUp } from "lucide-react";
import type { LiveAircraft, WeatherData } from "@/types";

interface Props {
  selectedAircraft: LiveAircraft | null;
  weather: WeatherData | null;
}

// ── Simulation types ───────────────────────────────────────────────────────

interface SimPoint {
  x: number;
  y: number;
  t: number;       // seconds
  vx: number;
  vy: number;
  speed: number;
}

// ── Vector kinematics simulation ────────────────────────────────────────────

function runKinematicSimulation(
  ac: LiveAircraft,
  weather: WeatherData | null,
  durationSec = 180,   // 3 minutes
  stepSec     = 2,
): SimPoint[] {
  const points: SimPoint[] = [];
  const canvas_w = 600;
  const canvas_h = 300;

  // Convert heading to radians (N=0, E=90, S=180, W=270)
  const hdgRad = ((ac.heading ?? 0) * Math.PI) / 180;

  // Aircraft velocity components in knots → pixels/sec (scale factor)
  const scale  = 0.04; // 1 kt ≈ 0.04 px/s in canvas space
  const speed  = ac.velocity ?? 250; // knots
  let vx = Math.sin(hdgRad) * speed * scale;
  let vy = -Math.cos(hdgRad) * speed * scale;  // Y is inverted in canvas

  // Wind drift in kt (from Open-Meteo)
  const windSpeed  = weather ? (weather.windSpeed ?? 0) / 1.852 : 0; // km/h → kts
  const windDirRad = weather ? ((weather.windDirection ?? 0) * Math.PI) / 180 : 0;
  const wxDrift    = Math.sin(windDirRad) * windSpeed * scale * 0.15;
  const wyDrift    = -Math.cos(windDirRad) * windSpeed * scale * 0.15;

  // Descent creates gradual deceleration
  const vRate      = ac.verticalRate ?? 0; // ft/min
  const decelRate  = vRate < -500 ? 0.998 : 1.0; // slight decel if descending fast

  // Start from center of canvas
  let x = canvas_w / 2;
  let y = canvas_h / 2;

  for (let t = 0; t <= durationSec; t += stepSec) {
    points.push({ x, y, t, vx, vy, speed: Math.sqrt(vx * vx + vy * vy) / scale });
    x  += (vx + wxDrift) * stepSec;
    y  += (vy + wyDrift) * stepSec;
    vx *= decelRate;
    vy *= decelRate;

    // Boundary wrapping — keep in canvas
    if (x < 0)         x = canvas_w;
    if (x > canvas_w)  x = 0;
    if (y < 0)         y = canvas_h;
    if (y > canvas_h)  y = 0;
  }

  return points;
}

// ── Animated simulation canvas ─────────────────────────────────────────────

const SimCanvas: React.FC<{
  points: SimPoint[];
  running: boolean;
  aircraft: LiveAircraft;
  onComplete: () => void;
}> = ({ points, running, aircraft, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const stepRef   = useRef(0);

  useEffect(() => {
    stepRef.current = 0;
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const step = stepRef.current;
      if (!running || step >= points.length) {
        if (step >= points.length) onComplete();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Background grid ──────────────────────────────────────────────
      ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
      ctx.lineWidth   = 0.5;
      for (let gx = 0; gx < canvas.width; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }

      // ── Uncertainty cone ────────────────────────────────────────────
      const confidenceDecay = Math.max(0.1, 1 - step / points.length);
      const coneWidth       = (step / points.length) * 60;
      if (step > 0) {
        const grad = ctx.createLinearGradient(points[0].x, points[0].y, points[step].x, points[step].y);
        grad.addColorStop(0, "rgba(59,130,246,0)");
        grad.addColorStop(1, `rgba(239,68,68,${0.07 * (1 - confidenceDecay)})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let i = 0; i <= step; i++) {
          const perp_x = -( points[i].vy / (Math.sqrt(points[i].vx ** 2 + points[i].vy ** 2) + 0.001)) * coneWidth * (i / step);
          const perp_y =  ( points[i].vx / (Math.sqrt(points[i].vx ** 2 + points[i].vy ** 2) + 0.001)) * coneWidth * (i / step);
          if (i === 0) ctx.moveTo(points[i].x + perp_x, points[i].y + perp_y);
          else ctx.lineTo(points[i].x + perp_x, points[i].y + perp_y);
        }
        for (let i = step; i >= 0; i--) {
          const perp_x =  ( points[i].vy / (Math.sqrt(points[i].vx ** 2 + points[i].vy ** 2) + 0.001)) * coneWidth * (i / step);
          const perp_y = -( points[i].vx / (Math.sqrt(points[i].vx ** 2 + points[i].vy ** 2) + 0.001)) * coneWidth * (i / step);
          ctx.lineTo(points[i].x + perp_x, points[i].y + perp_y);
        }
        ctx.closePath();
        ctx.fill();
      }

      // ── Path trail ───────────────────────────────────────────────────
      if (step > 1) {
        const pathGrad = ctx.createLinearGradient(points[0].x, points[0].y, points[step].x, points[step].y);
        pathGrad.addColorStop(0, "rgba(59,130,246,0.3)");
        pathGrad.addColorStop(1, "rgba(239,68,68,0.9)");
        ctx.strokeStyle = pathGrad;
        ctx.lineWidth   = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i <= step; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }

      // ── Predicted (dashed) ahead ─────────────────────────────────────
      if (step < points.length - 1) {
        ctx.strokeStyle = "rgba(239,68,68,0.3)";
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(points[step].x, points[step].y);
        for (let i = step + 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── LKP origin marker ────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(59,130,246,0.9)";
      ctx.fill();
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // ── LKP label ────────────────────────────────────────────────────
      ctx.fillStyle   = "#93c5fd";
      ctx.font        = "10px 'JetBrains Mono', monospace";
      ctx.fillText("LKP", points[0].x + 8, points[0].y - 6);

      // ── Aircraft icon at current step ────────────────────────────────
      const cur     = points[step];
      const hdgRad  = Math.atan2(cur.vx, -cur.vy);
      ctx.save();
      ctx.translate(cur.x, cur.y);
      ctx.rotate(hdgRad);

      // Glow
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      glow.addColorStop(0, "rgba(59,130,246,0.5)");
      glow.addColorStop(1, "rgba(59,130,246,0)");
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Plane shape
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 4);
      ctx.lineTo(0, 1);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fillStyle   = "#3b82f6";
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // ── HUD data overlay ─────────────────────────────────────────────
      const elapsed = points[step].t;
      const curSpeed = points[step].speed;

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(8, 8, 180, 66);
      ctx.strokeStyle = "rgba(59,130,246,0.4)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(8, 8, 180, 66);

      ctx.fillStyle = "#60a5fa";
      ctx.font      = "9px 'JetBrains Mono', monospace";
      ctx.fillText(`CALLSIGN  ${aircraft.callsign || aircraft.icao24}`, 14, 22);
      ctx.fillText(`T+        ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, 14, 36);
      ctx.fillText(`SPEED     ${curSpeed.toFixed(0)} kts`, 14, 50);
      ctx.fillText(`CONF      ${Math.max(10, Math.round(90 * (1 - step / points.length)))}%`, 14, 64);

      stepRef.current = step + 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    if (running) {
      frameRef.current = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(frameRef.current);
    }

    return () => cancelAnimationFrame(frameRef.current);
  }, [running, points, aircraft, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={300}
      className="w-full rounded"
      style={{ background: "hsl(220 40% 5%)", imageRendering: "crisp-edges" }}
    />
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────

const VideoFeedPanel: React.FC<Props> = ({ selectedAircraft, weather }) => {
  const [collapsed, setCollapsed]   = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simPoints,  setSimPoints]  = useState<SimPoint[]>([]);
  const [simDone,    setSimDone]    = useState(false);
  const [feedMode,   setFeedMode]   = useState<"video" | "sim">("video");

  const handleSimulate = useCallback(() => {
    if (!selectedAircraft) return;
    const pts = runKinematicSimulation(selectedAircraft, weather, 180, 2);
    setSimPoints(pts);
    setSimDone(false);
    setSimRunning(true);
    setFeedMode("sim");
  }, [selectedAircraft, weather]);

  const handleReset = useCallback(() => {
    setSimRunning(false);
    setSimDone(false);
    setSimPoints([]);
    setFeedMode("video");
  }, []);

  const handleComplete = useCallback(() => {
    setSimRunning(false);
    setSimDone(true);
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "hsl(220 40% 5%)",
        border: "1px solid hsl(var(--primary) / 0.3)",
        boxShadow: "0 0 24px hsl(var(--primary) / 0.08), inset 0 0 40px hsl(220 40% 3% / 0.5)",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b cursor-pointer hover:bg-primary/5 transition-colors"
        style={{ borderColor: "hsl(var(--primary) / 0.2)" }}
        onClick={() => setCollapsed((v) => !v)}
      >
        {/* Glowing icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "hsl(var(--primary) / 0.15)",
            border: "1px solid hsl(var(--primary) / 0.4)",
            boxShadow: "0 0 10px hsl(var(--primary) / 0.2)",
          }}
        >
          <Video size={14} className="text-primary" />
        </div>

        <div className="flex-1">
          <div className="font-heading text-sm font-700 tracking-widest text-foreground flex items-center gap-2">
            MISSION CONTROL VIDEO FEED
            <span
              className="px-2 py-0.5 rounded text-[9px] font-heading font-700 tracking-widest"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}
            >
              {feedMode === "sim" ? "SIMULATION" : "LIVE FEED"}
            </span>
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(var(--primary) / 0.6)" }}>
            Satellite · Drone · Kinematic Simulation
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: feedMode === "sim" && simRunning ? "#ef4444" : "hsl(var(--primary))" }}
          />
          <span className="label-tag text-[9px]" style={{ color: "hsl(var(--primary))" }}>
            {feedMode === "sim" && simRunning ? "SIMULATING" : feedMode === "sim" && simDone ? "COMPLETE" : "STANDBY"}
          </span>
        </div>

        {collapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* ── Controls ────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Feed mode toggle */}
            <div
              className="flex rounded overflow-hidden border"
              style={{ borderColor: "hsl(var(--primary) / 0.3)" }}
            >
              {(["video", "sim"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setFeedMode(mode); if (mode === "video") { setSimRunning(false); setSimDone(false); } }}
                  className="px-3 py-1.5 font-heading text-[10px] font-700 tracking-widest transition-all"
                  style={{
                    background: feedMode === mode ? "hsl(var(--primary) / 0.2)" : "transparent",
                    color: feedMode === mode ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {mode === "video" ? "LIVE FEED" : "SIMULATE"}
                </button>
              ))}
            </div>

            {/* Simulate button */}
            <button
              onClick={handleSimulate}
              disabled={!selectedAircraft || (simRunning)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded font-heading text-[10px] font-700 tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "hsl(var(--primary) / 0.15)",
                border: "1px solid hsl(var(--primary) / 0.4)",
                color: "hsl(var(--primary))",
                boxShadow: selectedAircraft && !simRunning ? "0 0 8px hsl(var(--primary) / 0.2)" : "none",
              }}
            >
              <Zap size={11} />
              {simRunning ? "RUNNING…" : "SIMULATE PATH"}
            </button>

            {/* Pause/Resume */}
            {feedMode === "sim" && simPoints.length > 0 && (
              <button
                onClick={() => setSimRunning((v) => !v)}
                disabled={simDone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-heading text-[10px] font-700 tracking-widest transition-all disabled:opacity-40"
                style={{
                  background: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
              >
                {simRunning ? <Pause size={11} /> : <Play size={11} />}
                {simRunning ? "PAUSE" : "RESUME"}
              </button>
            )}

            {/* Reset */}
            {feedMode === "sim" && (simPoints.length > 0 || simDone) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-heading text-[10px] font-700 tracking-widest transition-all text-muted-foreground hover:text-foreground"
                style={{ border: "1px solid hsl(var(--border))" }}
              >
                <RotateCcw size={11} /> RESET
              </button>
            )}

            {/* Aircraft info */}
            {selectedAircraft && (
              <div className="ml-auto flex items-center gap-2 px-2 py-1 rounded"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
                <Crosshair size={10} className="text-primary" />
                <span className="font-mono text-[10px] text-primary">{selectedAircraft.callsign || selectedAircraft.icao24}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{selectedAircraft.altitude?.toLocaleString()} ft · {selectedAircraft.velocity?.toFixed(0)} kts</span>
              </div>
            )}
          </div>

          {/* ── Video / Simulation area ──────────────────────────────── */}
          <div
            className="relative rounded-lg overflow-hidden"
            style={{
              background: "hsl(220 40% 4%)",
              border: "1px solid hsl(var(--primary) / 0.2)",
              boxShadow: "0 0 16px hsl(var(--primary) / 0.05) inset",
            }}
          >
            {feedMode === "video" ? (
              /* ── Live Feed Placeholder ──────────────────────────── */
              <div className="relative" style={{ paddingBottom: "50%" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  {/* Scan lines effect */}
                  <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,0.3) 2px, rgba(59,130,246,0.3) 4px)",
                  }} />

                  {/* Corner brackets */}
                  {[["top-2 left-2", "border-t-2 border-l-2"], ["top-2 right-2", "border-t-2 border-r-2"],
                    ["bottom-2 left-2", "border-b-2 border-l-2"], ["bottom-2 right-2", "border-b-2 border-r-2"]].map(([pos, borders]) => (
                    <div key={pos} className={`absolute w-5 h-5 ${pos} ${borders}`} style={{ borderColor: "hsl(var(--primary) / 0.5)" }} />
                  ))}

                  {/* Center content */}
                  <div className="relative z-10 text-center">
                    <div className="flex items-center gap-2 justify-center mb-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <Satellite size={18} className="text-primary" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                    <p className="font-heading text-sm font-700 tracking-widest text-foreground mb-1">
                      SATELLITE / DRONE FEED
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground mb-3">
                      Live feed integration pending · RTSP / WebRTC endpoint required
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["RTSP Stream", "WebRTC", "HLS/DASH", "Drone FPV"].map((t) => (
                        <span key={t} className="px-2 py-1 rounded text-[9px] font-heading font-700"
                          style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom HUD bar */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 flex items-center justify-between"
                    style={{ background: "rgba(0,0,0,0.8)", borderTop: "1px solid hsl(var(--primary) / 0.2)" }}>
                    <span className="font-mono text-[9px]" style={{ color: "hsl(var(--primary) / 0.7)" }}>
                      SAR-CAM-01 · STANDBY
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {new Date().toUTCString().slice(17, 25)} UTC
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: "hsl(var(--primary) / 0.7)" }}>
                      NO SIGNAL
                    </span>
                  </div>
                </div>
              </div>
            ) : simPoints.length > 0 ? (
              /* ── Kinematic Simulation ────────────────────────────── */
              <SimCanvas
                points={simPoints}
                running={simRunning}
                aircraft={selectedAircraft!}
                onComplete={handleComplete}
              />
            ) : (
              /* ── Sim placeholder ────────────────────────────────── */
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Zap size={24} className="text-primary opacity-60" />
                <p className="font-heading text-sm font-700 tracking-widest text-foreground">SIMULATION READY</p>
                <p className="font-mono text-[10px] text-muted-foreground text-center max-w-xs">
                  {selectedAircraft
                    ? `Select aircraft "${selectedAircraft.callsign}" and click SIMULATE PATH to run kinematic prediction animation.`
                    : "Click an aircraft on the map to track it, then press SIMULATE PATH."}
                </p>
              </div>
            )}
          </div>

          {/* ── Simulation legend ────────────────────────────────────── */}
          {feedMode === "sim" && (
            <div className="flex flex-wrap gap-4 text-[10px] font-mono px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 rounded" style={{ background: "linear-gradient(90deg, #3b82f6, #ef4444)" }} />
                <span className="text-muted-foreground">Predicted path (vector kinematics + wind)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 rounded border-dashed border-t border-red-500" />
                <span className="text-muted-foreground">Future trajectory (dashed)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }} />
                <span className="text-muted-foreground">Uncertainty cone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">LKP (Last Known Position)</span>
              </div>
            </div>
          )}

          {/* ── Instructions ───────────────────────────────────────── */}
          {!selectedAircraft && (
            <div className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono"
              style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
              <Radio size={10} className="text-primary animate-pulse shrink-0" />
              <span style={{ color: "hsl(var(--primary) / 0.8)" }}>
                Enable the aircraft feed and click any aircraft on the map to begin simulation. Physics engine uses heading, velocity, and wind drift.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoFeedPanel;
