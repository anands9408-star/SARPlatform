import React from "react";
import { GLIDE_RATIO } from "@/constants/sar";
import { Gauge, Wind, Target } from "lucide-react";

interface GlideCalculatorProps {
  altitude: number;
  onAltitudeChange: (v: number) => void;
}

const GlideCalculator: React.FC<GlideCalculatorProps> = ({ altitude, onAltitudeChange }) => {
  const altKm = altitude / 3280.84;
  const searchRadius = altKm * GLIDE_RATIO;

  return (
    <div className="sar-card hud-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-700 tracking-widest">
          GLIDE PHYSICS — S31
        </h3>
        <Gauge size={16} className="text-primary" />
      </div>

      {/* Altitude Slider */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="label-tag">ALTITUDE (FT)</label>
          <span className="font-mono text-sm text-primary">{altitude.toLocaleString()} ft</span>
        </div>
        <input
          type="range"
          min={5000}
          max={40000}
          step={500}
          value={altitude}
          onChange={(e) => onAltitudeChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${((altitude - 5000) / 35000) * 100}%, hsl(var(--muted)) ${((altitude - 5000) / 35000) * 100}%)`,
            accentColor: "hsl(var(--primary))",
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="label-tag">5,000 ft</span>
          <span className="label-tag">40,000 ft</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <MetricBox
          icon={<Target size={14} className="text-primary" />}
          label="ALT (KM)"
          value={altKm.toFixed(2)}
          unit="km"
        />
        <MetricBox
          icon={<Wind size={14} className="text-warning" />}
          label="GLIDE RATIO"
          value={`1:${GLIDE_RATIO}`}
          unit="ratio"
        />
        <MetricBox
          icon={<Gauge size={14} className="text-danger" />}
          label="SEARCH RADIUS"
          value={searchRadius.toFixed(2)}
          unit="km"
          highlight
        />
      </div>

      <div className="border-t border-border pt-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <p className="font-mono text-xs text-muted-foreground">
          Predicted search perimeter:{" "}
          <span className="text-primary">{searchRadius.toFixed(2)} km</span> from last known position
        </p>
      </div>
    </div>
  );
};

const MetricBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}> = ({ icon, label, value, unit, highlight }) => (
  <div
    className="rounded p-3"
    style={{
      background: highlight ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted))",
      border: highlight ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--border))",
    }}
  >
    <div className="flex items-center gap-1 mb-2">
      {icon}
      <span className="label-tag text-[9px]">{label}</span>
    </div>
    <div className={`font-heading text-xl font-700 ${highlight ? "text-primary" : "text-foreground"}`}>
      {value}
    </div>
    <div className="label-tag text-[9px] mt-0.5">{unit}</div>
  </div>
);

export default GlideCalculator;
