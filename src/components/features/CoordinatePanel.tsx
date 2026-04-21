import React from "react";
import { MapPin, Navigation, ScanLine, Globe, Satellite } from "lucide-react";

interface CoordinatePanelProps {
  lat: number;
  lon: number;
  onLatChange: (v: number) => void;
  onLonChange: (v: number) => void;
  scanRadius?: number;
  onScanRadiusChange?: (v: number) => void;
}

/** sentinel value that means "no bounding box — fetch globally" */
export const GLOBAL_RADIUS = 0;

/** Preset radius options including satellite-grade coverage tiers */
const RADIUS_PRESETS = [
  { label: "100", value: 100,  tier: "local"    },
  { label: "200", value: 200,  tier: "local"    },
  { label: "500", value: 500,  tier: "regional" },
  { label: "750", value: 750,  tier: "regional" },
  { label: "1K",  value: 1000, tier: "wide"     },
  { label: "1.5K",value: 1500, tier: "wide"     },
  { label: "2K",  value: 2000, tier: "max"      },
  { label: "GLB", value: 0,    tier: "global"   },
];

const TIER_COLORS: Record<string, string> = {
  local:    "hsl(var(--primary))",
  regional: "hsl(var(--primary))",
  wide:     "hsl(var(--warning))",
  max:      "hsl(var(--warning))",
  global:   "#f97316",
};

const CoordinatePanel: React.FC<CoordinatePanelProps> = ({
  lat, lon, onLatChange, onLonChange,
  scanRadius = 1500,
  onScanRadiusChange,
}) => {
  const isGlobal = scanRadius === GLOBAL_RADIUS;
  const active = RADIUS_PRESETS.find((p) => p.value === scanRadius);
  const tier = active?.tier ?? "wide";

  const coverageLabel = () => {
    if (isGlobal) return "Satellite ADS-B · Global Coverage · All aircraft worldwide";
    if (scanRadius <= 200)  return "Local vicinity — ground ADS-B";
    if (scanRadius <= 500)  return "Regional coverage — ground + satellite ADS-B";
    if (scanRadius <= 1000) return "Extended area — optimal ground ADS-B";
    if (scanRadius <= 1500) return "Wide-area — satellite ADS-B augmentation";
    return "Max range — satellite ADS-B primary · rate limits likely";
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

          {/* Preset radius buttons — all 8 options */}
          <div className="grid grid-cols-8 gap-1">
            {RADIUS_PRESETS.map((p) => {
              const isActive = scanRadius === p.value;
              const isGlb = p.value === 0;
              return (
                <button
                  key={p.value}
                  onClick={() => onScanRadiusChange(p.value)}
                  className={`py-1.5 rounded font-mono text-[9px] font-700 border transition-all ${
                    isActive
                      ? isGlb
                        ? "bg-orange-400/15 border-orange-400/60 text-orange-400"
                        : p.tier === "wide" || p.tier === "max"
                          ? "bg-warning/15 border-warning/60 text-warning"
                          : "bg-primary/15 border-primary/60 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  title={isGlb ? "Global ADS-B (satellite)" : `${p.value} km radius`}
                >
                  {isGlb ? <Globe size={9} className="mx-auto" /> : p.label}
                </button>
              );
            })}
          </div>

          {/* Slider (hidden for global) */}
          {!isGlobal && (
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={scanRadius}
              onChange={(e) => onScanRadiusChange(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          )}

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
