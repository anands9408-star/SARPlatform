import React from "react";
import { MapPin, Navigation, ScanLine, Globe, Satellite } from "lucide-react";

interface CoordinatePanelProps {
  lat: number;
  lon: number;
  onLatChange: (v: number) => void;
  onLonChange: (v: number) => void;
  scanRadius?: number;
  onScanRadiusChange?: (v: number) => void;
  /** Max radius allowed — subscribers capped at 500 km */
  maxRadius?: number;
}

/** sentinel value that means "no bounding box — fetch globally" */
export const GLOBAL_RADIUS = 0;

/** Simplified preset radius options */
const RADIUS_PRESETS = [
  { label: "500",  value: 500,  tier: "local"    },
  { label: "1K",   value: 1000, tier: "wide"     },
  { label: "2K",   value: 2000, tier: "max"      },
  { label: "GLB",  value: 0,    tier: "global"   },
];

const TIER_COLORS: Record<string, string> = {
  local:  "hsl(var(--primary))",
  wide:   "hsl(var(--warning))",
  max:    "hsl(var(--warning))",
  global: "#f97316",
};

const CoordinatePanel: React.FC<CoordinatePanelProps> = ({
  lat, lon, onLatChange, onLonChange,
  scanRadius = 1000,
  onScanRadiusChange,
  maxRadius,
}) => {
  const isGlobal = scanRadius === GLOBAL_RADIUS;
  const active   = RADIUS_PRESETS.find((p) => p.value === scanRadius);
  const tier     = active?.tier ?? "wide";

  const coverageLabel = () => {
    if (isGlobal) return "Satellite ADS-B · Global Coverage · All aircraft worldwide";
    if (scanRadius <= 500)  return "Regional coverage — ground + satellite ADS-B";
    if (scanRadius <= 1000) return "Wide-area — satellite ADS-B augmentation";
    return "Max range — satellite ADS-B primary · rate limits likely";
  };

  const handlePresetClick = (value: number) => {
    if (!onScanRadiusChange) return;
    // Enforce subscriber max radius
    if (maxRadius !== undefined && value !== 0 && value > maxRadius) return;
    onScanRadiusChange(value);
  };

  return (
    <div className="sar-card hud-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-700 tracking-widest">COORDINATES</h3>
        <MapPin size={16} className="text-danger" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-tag block mb-1.5">LATITUDE</label>
          <input
            type="number"
            value={lat}
            step={0.0001}
            onChange={(e) => onLatChange(parseFloat(e.target.value) || 0)}
            className="sar-input font-mono text-sm"
          />
        </div>
        <div>
          <label className="label-tag block mb-1.5">LONGITUDE</label>
          <input
            type="number"
            value={lon}
            step={0.0001}
            onChange={(e) => onLonChange(parseFloat(e.target.value) || 0)}
            className="sar-input font-mono text-sm"
          />
        </div>
      </div>

      {/* ── Scan Radius Control ─────────────────────────────────────────── */}
      {onScanRadiusChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ScanLine size={12} className="text-primary" />
              <label className="label-tag text-[9px]">ADS-B SCAN RADIUS</label>
              {maxRadius !== undefined && (
                <span className="label-tag text-[8px] text-warning">max {maxRadius} km</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isGlobal ? (
                <span className="font-mono text-xs font-700 flex items-center gap-1 text-orange-400">
                  <Satellite size={11} /> GLOBAL
                </span>
              ) : (
                <span className="font-mono text-xs font-600" style={{ color: TIER_COLORS[tier] }}>
                  {scanRadius} km
                </span>
              )}
            </div>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {RADIUS_PRESETS.map((p) => {
              const isActive = scanRadius === p.value;
              const isGlb = p.value === 0;
              const isLocked = maxRadius !== undefined && p.value !== 0 && p.value > maxRadius;
              return (
                <button
                  key={p.value}
                  onClick={() => handlePresetClick(p.value)}
                  disabled={isLocked}
                  className={`py-2 rounded font-mono text-[10px] font-700 border transition-all ${
                    isLocked
                      ? "border-border text-muted-foreground/40 cursor-not-allowed opacity-40"
                      : isActive
                        ? isGlb
                          ? "bg-orange-400/15 border-orange-400/60 text-orange-400"
                          : p.tier === "wide" || p.tier === "max"
                            ? "bg-warning/15 border-warning/60 text-warning"
                            : "bg-primary/15 border-primary/60 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  title={
                    isLocked ? `Restricted — upgrade for ${p.label}` :
                    isGlb ? "Global ADS-B (satellite)" : `${p.value} km radius`
                  }
                >
                  {isGlb ? <Globe size={10} className="mx-auto" /> : p.label}
                </button>
              );
            })}
          </div>

          {/* Coverage indicator */}
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] font-mono"
            style={{
              background: isGlobal
                ? "rgba(249,115,22,0.08)"
                : tier === "wide" || tier === "max"
                  ? "hsl(var(--warning) / 0.08)"
                  : "hsl(var(--primary) / 0.08)",
              border: `1px solid ${isGlobal
                ? "rgba(249,115,22,0.35)"
                : tier === "wide" || tier === "max"
                  ? "hsl(var(--warning) / 0.3)"
                  : "hsl(var(--primary) / 0.25)"}`,
            }}
          >
            {isGlobal
              ? <Satellite size={10} className="text-orange-400 shrink-0" />
              : <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TIER_COLORS[tier] }} />}
            <span style={{ color: isGlobal ? "#f97316" : TIER_COLORS[tier] }}>
              {coverageLabel()}
            </span>
          </div>
        </div>
      )}

      {/* DMS Display */}
      <div
        className="rounded p-3 space-y-1"
        style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Navigation size={12} className="text-primary" />
          <span className="label-tag text-[9px]">DECIMAL DEGREES</span>
        </div>
        <div className="font-mono text-xs text-foreground">
          LAT: <span className="text-primary">{lat >= 0 ? "N" : "S"} {Math.abs(lat).toFixed(6)}°</span>
        </div>
        <div className="font-mono text-xs text-foreground">
          LON: <span className="text-primary">{lon >= 0 ? "E" : "W"} {Math.abs(lon).toFixed(6)}°</span>
        </div>
        <div className="font-mono text-xs text-muted-foreground pt-1 border-t border-border">
          {toDMS(lat, "lat")} / {toDMS(lon, "lon")}
        </div>
      </div>
    </div>
  );
};

function toDMS(decimal: number, type: "lat" | "lon"): string {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(1);
  const dir = type === "lat" ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W";
  return `${d}°${m}'${s}"${dir}`;
}

export default CoordinatePanel;
