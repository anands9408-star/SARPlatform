import React from "react";
import { MapPin, Navigation, ScanLine } from "lucide-react";

interface CoordinatePanelProps {
  lat: number;
  lon: number;
  onLatChange: (v: number) => void;
  onLonChange: (v: number) => void;
  scanRadius?: number;          // km, 100–2000
  onScanRadiusChange?: (v: number) => void;
}

const RADIUS_MARKS = [100, 250, 500, 750, 1000, 1500, 2000];

const CoordinatePanel: React.FC<CoordinatePanelProps> = ({
  lat, lon, onLatChange, onLonChange,
  scanRadius = 1500,
  onScanRadiusChange,
}) => {
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

      {/* Scan Radius Slider */}
      {onScanRadiusChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ScanLine size={12} className="text-primary" />
              <label className="label-tag text-[9px]">SCAN RADIUS</label>
            </div>
            <span className="font-mono text-xs text-primary font-600">{scanRadius} km</span>
          </div>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={scanRadius}
            onChange={(e) => onScanRadiusChange(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          {/* Tick marks */}
          <div className="flex justify-between">
            {RADIUS_MARKS.map((m) => (
              <button
                key={m}
                onClick={() => onScanRadiusChange(m)}
                className={`text-[9px] font-mono transition-colors ${
                  scanRadius === m ? "text-primary font-700" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m >= 1000 ? `${m / 1000}k` : m}
              </button>
            ))}
          </div>
          {/* Coverage indicator */}
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] font-mono"
            style={{
              background: scanRadius > 1000 ? "hsl(var(--warning) / 0.08)" : "hsl(var(--primary) / 0.08)",
              border: `1px solid ${
                scanRadius > 1000 ? "hsl(var(--warning) / 0.3)" : "hsl(var(--primary) / 0.25)"
              }`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: scanRadius > 1000 ? "hsl(var(--warning))" : "hsl(var(--primary))" }}
            />
            <span
              style={{ color: scanRadius > 1000 ? "hsl(var(--warning))" : "hsl(var(--primary))" }}
            >
              {scanRadius <= 250 && "Local vicinity scan"}
              {scanRadius > 250 && scanRadius <= 500 && "Regional coverage"}
              {scanRadius > 500 && scanRadius <= 1000 && "Extended area — optimal"}
              {scanRadius > 1000 && scanRadius <= 1500 && "Wide-area — high load"}
              {scanRadius > 1500 && "Max range — expect rate limits"}
            </span>
          </div>
        </div>
      )}

      {/* DMS Display */}
      <div className="rounded p-3 space-y-1" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
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
