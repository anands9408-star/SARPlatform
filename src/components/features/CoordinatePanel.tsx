import React from "react";
import { MapPin, Navigation } from "lucide-react";

interface CoordinatePanelProps {
  lat: number;
  lon: number;
  onLatChange: (v: number) => void;
  onLonChange: (v: number) => void;
}

const CoordinatePanel: React.FC<CoordinatePanelProps> = ({ lat, lon, onLatChange, onLonChange }) => {
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
