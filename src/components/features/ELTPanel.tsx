/**
 * ELT Signal Panel
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows SAR operators to:
 *  1. Log ELT signal stations (frequency, signal strength, bearing)
 *  2. Triangulate a crash position from 2+ bearing lines
 *  3. Export the triangulated fix for map display
 *
 * Physics:
 *  • Each station emits a bearing line from (lat, lon) at angle θ
 *  • Two bearing lines intersect at the crash point
 *  • For 3+ stations we compute a least-squares centroid of all pairwise fixes
 *  • Position error estimated from bearing accuracy (±2° for 406 MHz, ±5° for 121.5 MHz)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useMemo } from "react";
import { Radio, Plus, Trash2, Crosshair, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ELTStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  frequency: "121.5" | "406";
  bearing: number;          // degrees True North (0-360)
  signalStrength: number;   // dBm  -120 (weak) to -60 (strong)
}

export interface ELTTriangulation {
  lat: number;
  lon: number;
  errorRadiusKm: number;
  confidence: number;       // 0-100%
  stations: ELTStation[];
}

// ── Triangulation Math ────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_KM = 6371;

/**
 * Move from (lat, lon) along bearing θ for distance d (km).
 * Returns destination lat/lon.
 */
function bearingPoint(lat: number, lon: number, bearingDeg: number, distKm: number): [number, number] {
  const φ1 = lat * DEG2RAD;
  const λ1 = lon * DEG2RAD;
  const θ = bearingDeg * DEG2RAD;
  const δ = distKm / EARTH_KM;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  return [φ2 * RAD2DEG, ((λ2 * RAD2DEG + 540) % 360) - 180];
}

/**
 * Intersect two bearing lines (each defined by origin + bearing).
 * Returns [lat, lon] or null if lines are parallel / coincident.
 * Uses spherical bearing line intersection (Vincenty-simplified).
 */
function intersectBearings(
  lat1: number, lon1: number, bearing1: number,
  lat2: number, lon2: number, bearing2: number
): [number, number] | null {
  const φ1 = lat1 * DEG2RAD, λ1 = lon1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD, λ2 = lon2 * DEG2RAD;
  const θ13 = bearing1 * DEG2RAD;
  const θ23 = bearing2 * DEG2RAD;

  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;

  const δ12 = 2 * Math.asin(
    Math.sqrt(
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    )
  );

  if (Math.abs(δ12) < 1e-10) return null; // coincident points

  const cosθa = (Math.sin(φ2) - Math.sin(φ1) * Math.cos(δ12)) / (Math.sin(δ12) * Math.cos(φ1));
  const cosθb = (Math.sin(φ1) - Math.sin(φ2) * Math.cos(δ12)) / (Math.sin(δ12) * Math.cos(φ2));
  const θa = Math.acos(Math.max(-1, Math.min(1, cosθa)));
  const θb = Math.acos(Math.max(-1, Math.min(1, cosθb)));

  const θ12 = Math.sin(λ2 - λ1) > 0 ? θa : 2 * Math.PI - θa;
  const θ21 = Math.sin(λ2 - λ1) > 0 ? 2 * Math.PI - θb : θb;

  const α1 = θ13 - θ12;
  const α2 = θ21 - θ23;

  if (Math.sin(α1) === 0 && Math.sin(α2) === 0) return null; // infinite solutions
  if (Math.sin(α1) * Math.sin(α2) < 0) return null;          // ambiguous

  const cosα3 = -Math.cos(α1) * Math.cos(α2) + Math.sin(α1) * Math.sin(α2) * Math.cos(δ12);
  const δ13 = Math.atan2(
    Math.sin(δ12) * Math.sin(α1) * Math.sin(α2),
    Math.cos(α2) + Math.cos(α1) * cosα3
  );

  const φ3 = Math.asin(
    Math.max(-1, Math.min(1, Math.sin(φ1) * Math.cos(δ13) + Math.cos(φ1) * Math.sin(δ13) * Math.cos(θ13)))
  );
  const Δλ13 = Math.atan2(
    Math.sin(θ13) * Math.sin(δ13) * Math.cos(φ1),
    Math.cos(δ13) - Math.sin(φ1) * Math.sin(φ3)
  );
  const λ3 = λ1 + Δλ13;

  return [φ3 * RAD2DEG, ((λ3 * RAD2DEG + 540) % 360) - 180];
}

function triangulate(stations: ELTStation[]): ELTTriangulation | null {
  if (stations.length < 2) return null;

  const fixes: [number, number][] = [];

  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const fix = intersectBearings(
        stations[i].lat, stations[i].lon, stations[i].bearing,
        stations[j].lat, stations[j].lon, stations[j].bearing
      );
      if (fix) fixes.push(fix);
    }
  }

  if (fixes.length === 0) return null;

  // Centroid of all pairwise fixes
  const lat = fixes.reduce((s, f) => s + f[0], 0) / fixes.length;
  const lon = fixes.reduce((s, f) => s + f[1], 0) / fixes.length;

  // Error radius based on frequency accuracy and number of stations
  // 406 MHz: ±2° bearing accuracy → ~3.5 km at 100 km range
  // 121.5 MHz: ±5° bearing accuracy → ~8.7 km at 100 km range
  const has406 = stations.some((s) => s.frequency === "406");
  const baseErrorKm = has406 ? 3 : 8;
  const errorRadiusKm = Math.max(0.5, baseErrorKm / Math.sqrt(stations.length));

  // Confidence based on: signal strength, number of stations, frequency
  const avgStrength = stations.reduce((s, st) => s + st.signalStrength, 0) / stations.length;
  const strengthScore = Math.min(100, Math.max(0, (avgStrength + 120) / 60 * 100)); // -120→0%, -60→100%
  const stationBonus = Math.min(30, (stations.length - 2) * 15);
  const freqBonus = has406 ? 20 : 0;
  const confidence = Math.min(98, strengthScore * 0.5 + stationBonus + freqBonus + 10);

  return { lat, lon, errorRadiusKm, confidence, stations };
}

// ── Signal Strength Label ─────────────────────────────────────────────────

function strengthLabel(dbm: number): { label: string; color: string } {
  if (dbm >= -80) return { label: "STRONG", color: "text-success" };
  if (dbm >= -100) return { label: "MODERATE", color: "text-warning" };
  return { label: "WEAK", color: "text-danger" };
}

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  onTriangulationUpdate: (result: ELTTriangulation | null) => void;
}

const defaultStation = (): ELTStation => ({
  id: `elt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  lat: 12.97,
  lon: 77.59,
  frequency: "406",
  bearing: 0,
  signalStrength: -90,
});

const ELTPanel: React.FC<Props> = ({ onTriangulationUpdate }) => {
  const [stations, setStations] = useState<ELTStation[]>([
    { ...defaultStation(), name: "Station Alpha", lat: 13.08, lon: 80.27, bearing: 225, frequency: "406", signalStrength: -80 },
    { ...defaultStation(), id: `elt_${Date.now() + 1}`, name: "Station Beta", lat: 12.50, lon: 79.80, bearing: 310, frequency: "406", signalStrength: -95 },
  ]);
  const [showHelp, setShowHelp] = useState(false);

  const triangulation = useMemo(() => triangulate(stations), [stations]);

  // Push triangulation result up to parent
  React.useEffect(() => {
    onTriangulationUpdate(triangulation);
  }, [triangulation, onTriangulationUpdate]);

  const updateStation = useCallback((id: string, patch: Partial<ELTStation>) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addStation = () => {
    if (stations.length >= 5) {
      toast.error("Maximum 5 ELT stations supported.");
      return;
    }
    setStations((prev) => [
      ...prev,
      { ...defaultStation(), name: `Station ${String.fromCharCode(65 + prev.length)}` },
    ]);
    toast.success("ELT station added.");
  };

  const removeStation = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="sar-card hud-border overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-2"
        style={{ background: "hsl(var(--surface))" }}
      >
        <Radio size={14} className="text-primary animate-pulse" />
        <h3 className="font-heading text-sm font-700 tracking-widest">ELT SIGNAL TRACKER</h3>
        <div className="flex-1" />
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Help"
        >
          <Info size={13} />
        </button>
        <button
          onClick={addStation}
          disabled={stations.length >= 5}
          className="flex items-center gap-1 px-2 py-1 rounded font-heading text-xs font-700 tracking-wide transition-all border border-primary text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={11} /> ADD STATION
        </button>
      </div>

      {/* Help */}
      {showHelp && (
        <div
          className="px-4 py-3 border-b border-border text-xs text-muted-foreground leading-relaxed space-y-1"
          style={{ background: "hsl(var(--muted) / 0.5)" }}
        >
          <p><span className="text-primary font-heading font-700">121.5 MHz</span> — Legacy ELT. ±5° bearing accuracy. Range ~100 km.</p>
          <p><span className="text-primary font-heading font-700">406 MHz</span> — Modern ELT / EPIRB. ±2° bearing. GPS-capable. Preferred.</p>
          <p><span className="text-primary font-heading font-700">Triangulation</span> — Bearing lines from 2+ stations intersect at the crash site. More stations = smaller error radius.</p>
          <p><span className="text-primary font-heading font-700">Signal Strength</span> — Scale: -60 dBm (strong) to -120 dBm (very weak). Values above -80 indicate proximity.</p>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Frequency legend */}
        <div className="flex gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-muted-foreground">406 MHz (GPS, ±2°)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-warning" />
            <span className="text-muted-foreground">121.5 MHz (legacy, ±5°)</span>
          </div>
        </div>

        {/* Station cards */}
        <div className="space-y-3">
          {stations.map((station, idx) => {
            const { label: sLabel, color: sColor } = strengthLabel(station.signalStrength);
            return (
              <div
                key={station.id}
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.4)" }}
              >
                {/* Station header */}
                <div
                  className="px-3 py-2 flex items-center gap-2 border-b border-border"
                  style={{
                    background: station.frequency === "406"
                      ? "hsl(var(--primary) / 0.08)"
                      : "hsl(var(--warning) / 0.08)",
                  }}
                >
                  <span
                    className="font-heading text-[10px] font-700 tracking-wider px-2 py-0.5 rounded"
                    style={{
                      background: station.frequency === "406"
                        ? "hsl(var(--primary) / 0.2)"
                        : "hsl(var(--warning) / 0.2)",
                      color: station.frequency === "406"
                        ? "hsl(var(--primary))"
                        : "hsl(var(--warning))",
                    }}
                  >
                    {station.frequency} MHz
                  </span>
                  <span className="font-heading text-xs font-700 text-foreground flex-1">
                    {station.name || `Station ${idx + 1}`}
                  </span>
                  <span className={`label-tag text-[9px] ${sColor}`}>{sLabel}</span>
                  <button
                    onClick={() => removeStation(station.id)}
                    disabled={stations.length <= 2}
                    className="text-muted-foreground hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove station"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Fields */}
                <div className="p-3 grid grid-cols-2 gap-3">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="label-tag block mb-1 text-[9px]">STATION NAME</label>
                    <input
                      type="text"
                      value={station.name}
                      onChange={(e) => updateStation(station.id, { name: e.target.value })}
                      placeholder="e.g. Radar Site Chennai"
                      className="sar-input text-xs py-1.5"
                    />
                  </div>

                  {/* Lat */}
                  <div>
                    <label className="label-tag block mb-1 text-[9px]">LATITUDE</label>
                    <input
                      type="number"
                      step={0.001}
                      value={station.lat}
                      onChange={(e) => updateStation(station.id, { lat: parseFloat(e.target.value) || 0 })}
                      className="sar-input font-mono text-xs py-1.5"
                    />
                  </div>

                  {/* Lon */}
                  <div>
                    <label className="label-tag block mb-1 text-[9px]">LONGITUDE</label>
                    <input
                      type="number"
                      step={0.001}
                      value={station.lon}
                      onChange={(e) => updateStation(station.id, { lon: parseFloat(e.target.value) || 0 })}
                      className="sar-input font-mono text-xs py-1.5"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="label-tag block mb-1 text-[9px]">FREQUENCY</label>
                    <select
                      value={station.frequency}
                      onChange={(e) => updateStation(station.id, { frequency: e.target.value as "121.5" | "406" })}
                      className="sar-select text-xs py-1.5"
                    >
                      <option value="406">406 MHz (GPS)</option>
                      <option value="121.5">121.5 MHz (Legacy)</option>
                    </select>
                  </div>

                  {/* Bearing */}
                  <div>
                    <label className="label-tag block mb-1 text-[9px]">BEARING (°TRUE)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={360}
                        step={1}
                        value={station.bearing}
                        onChange={(e) => updateStation(station.id, { bearing: parseFloat(e.target.value) || 0 })}
                        className="sar-input font-mono text-xs py-1.5 flex-1"
                      />
                      {/* Mini bearing dial */}
                      <div
                        className="relative w-8 h-8 rounded-full border border-border flex items-center justify-center shrink-0"
                        style={{ background: "hsl(var(--muted))" }}
                      >
                        <div
                          className="absolute w-0.5 h-3 origin-bottom"
                          style={{
                            bottom: "50%",
                            left: "calc(50% - 1px)",
                            background: station.frequency === "406" ? "hsl(var(--primary))" : "hsl(var(--warning))",
                            transform: `rotate(${station.bearing}deg)`,
                            transformOrigin: "bottom center",
                            borderRadius: "1px",
                          }}
                        />
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                      </div>
                    </div>
                  </div>

                  {/* Signal Strength */}
                  <div className="col-span-2">
                    <label className="label-tag block mb-1 text-[9px]">
                      SIGNAL STRENGTH: <span className={`font-mono ${sColor}`}>{station.signalStrength} dBm ({sLabel})</span>
                    </label>
                    <input
                      type="range"
                      min={-120}
                      max={-60}
                      step={1}
                      value={station.signalStrength}
                      onChange={(e) => updateStation(station.id, { signalStrength: parseInt(e.target.value) })}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                      <span>-120 dBm (Weak)</span>
                      <span>-60 dBm (Strong)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Triangulation Result */}
        {triangulation ? (
          <div
            className="rounded-lg p-4 space-y-3"
            style={{
              background: "hsl(var(--success) / 0.06)",
              border: `1px solid hsl(var(--success) / ${triangulation.confidence > 60 ? "0.5" : "0.3"})`,
            }}
          >
            <div className="flex items-center gap-2">
              <Crosshair size={14} className="text-success" />
              <span className="font-heading text-sm font-700 tracking-widest text-success">
                TRIANGULATED FIX
              </span>
              <div className="flex-1" />
              <span
                className={`font-heading text-xs font-700 px-2 py-0.5 rounded ${
                  triangulation.confidence > 70
                    ? "bg-success/15 text-success"
                    : triangulation.confidence > 40
                    ? "bg-warning/15 text-warning"
                    : "bg-danger/15 text-danger"
                }`}
              >
                {triangulation.confidence.toFixed(0)}% CONF
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded p-2.5 text-center"
                style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="label-tag text-[9px] mb-1">LATITUDE</div>
                <div className="font-mono text-sm text-foreground font-600">
                  {triangulation.lat.toFixed(5)}°
                </div>
              </div>
              <div
                className="rounded p-2.5 text-center"
                style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="label-tag text-[9px] mb-1">LONGITUDE</div>
                <div className="font-mono text-sm text-foreground font-600">
                  {triangulation.lon.toFixed(5)}°
                </div>
              </div>
              <div
                className="rounded p-2.5 text-center"
                style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="label-tag text-[9px] mb-1">ERROR RADIUS</div>
                <div className="font-mono text-sm text-warning font-600">
                  ±{triangulation.errorRadiusKm.toFixed(2)} km
                </div>
              </div>
              <div
                className="rounded p-2.5 text-center"
                style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="label-tag text-[9px] mb-1">STATIONS USED</div>
                <div className="font-mono text-sm text-primary font-600">
                  {triangulation.stations.length}
                </div>
              </div>
            </div>

            <div
              className="p-2 rounded text-xs font-mono"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
            >
              <span className="text-muted-foreground">FIX: </span>
              <span className="text-success">
                {triangulation.lat.toFixed(5)}°N, {triangulation.lon.toFixed(5)}°E ±{triangulation.errorRadiusKm.toFixed(2)} km
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Triangulated crash position shown on map as green crosshair.
              Error radius (yellow circle) represents bearing accuracy uncertainty.
            </p>
          </div>
        ) : (
          <div
            className="rounded p-4 flex items-center gap-3"
            style={{ background: "hsl(var(--warning) / 0.06)", border: "1px solid hsl(var(--warning) / 0.3)" }}
          >
            <AlertTriangle size={16} className="text-warning shrink-0" />
            <div>
              <p className="text-xs text-warning font-heading font-700 tracking-wide">TRIANGULATION FAILED</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Bearing lines are parallel or intersect outside Earth bounds. Adjust station bearings.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ELTPanel;
export type { Props as ELTPanelProps };
