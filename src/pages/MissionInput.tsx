
import React, { useState, useCallback } from "react";
import SARMap from "@/components/features/SARMap";
import ELTPanel from "@/components/features/ELTPanel";
import type { ELTTriangulation } from "@/components/features/ELTPanel";
import {
  WEATHER_CONDITIONS,
  WIND_DIRECTIONS,
  CRASH_ZONES,
  ELT_OPTIONS,
} from "@/constants/sar";
import type { MissionData } from "@/types";
import {
  Wind,
  Cloud,
  Radio,
  MapPin,
  Plane,
  Navigation,
  AlertTriangle,
  CheckCircle,
  Crosshair,
} from "lucide-react";
import { toast } from "sonner";

const defaultMission: MissionData = {
  weather: "Clear",
  windSpeed: 0,
  windDirection: "North",
  trajectory: "",
  crashZone: "Mountain",
  flightRoute: "",
  lat: 13.0827,
  lon: 80.2707,
  eltSignal: "Yes",
};

const MissionInput: React.FC = () => {
  const [data, setData] = useState<MissionData>(defaultMission);
  const [analyzed, setAnalyzed] = useState(false);
  const [eltTriangulation, setEltTriangulation] = useState<ELTTriangulation | null>(null);

  const handleTriangulationUpdate = useCallback((result: ELTTriangulation | null) => {
    setEltTriangulation(result);
    if (result) {
      setData((prev) => ({
        ...prev,
        lat: parseFloat(result.lat.toFixed(6)),
        lon: parseFloat(result.lon.toFixed(6)),
      }));
    }
  }, []);

  const set = (key: keyof MissionData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = key === "lat" || key === "lon" || key === "windSpeed"
      ? parseFloat(e.target.value) || 0
      : e.target.value;
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const handleAnalyze = () => {
    if (!data.trajectory && !data.flightRoute) {
      toast.error("Please enter trajectory or flight route details.");
      return;
    }
    setAnalyzed(true);
    toast.success("Analysis complete — crash location plotted on map.");
  };

  const handleReset = () => {
    setData(defaultMission);
    setAnalyzed(false);
    toast.info("Mission data cleared.");
  };

  const handleMapClick = (lat: number, lon: number) => {
    setData((prev) => ({ ...prev, lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)) }));
    toast.info(`Coordinates updated: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  };

  const windDeg: Record<string, number> = {
    North: 0, "North-East": 45, East: 90, "South-East": 135,
    South: 180, "South-West": 225, West: 270, "North-West": 315,
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
        <h1 className="font-heading text-2xl font-700 tracking-widest">MISSION INPUT — SAR DATA FEED</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Feed environmental, trajectory and distress signal data for analysis
        </p>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Weather & Wind */}
          <div className="sar-card hud-border p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Cloud size={15} className="text-primary" />
              <h3 className="font-heading text-sm font-700 tracking-widest">ENVIRONMENTAL DATA</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-tag block mb-1.5">WEATHER CONDITION</label>
                <select value={data.weather} onChange={set("weather")} className="sar-select">
                  {WEATHER_CONDITIONS.map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="label-tag block mb-1.5">WIND SPEED (KM/H)</label>
                <input type="number" min={0} value={data.windSpeed} onChange={set("windSpeed")} className="sar-input" />
              </div>
            </div>

            <div>
              <label className="label-tag block mb-1.5">WIND DIRECTION</label>
              <select value={data.windDirection} onChange={set("windDirection")} className="sar-select">
                {WIND_DIRECTIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Wind compass */}
            <div className="flex items-center gap-4 p-3 rounded" style={{ background: "hsl(var(--muted))" }}>
              <div className="relative w-12 h-12 rounded-full border border-border flex items-center justify-center shrink-0">
                <div
                  className="absolute w-0.5 h-5 bg-primary origin-bottom rounded-full"
                  style={{
                    bottom: "50%",
                    left: "calc(50% - 1px)",
                    transform: `rotate(${windDeg[data.windDirection] || 0}deg)`,
                    transformOrigin: "bottom center",
                  }}
                />
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <div className="font-mono text-xs text-foreground">{data.windDirection}</div>
                <div className="font-mono text-xs text-muted-foreground">{windDeg[data.windDirection] || 0}° — {data.windSpeed} km/h</div>
              </div>
            </div>
          </div>

          {/* Trajectory & Route */}
          <div className="sar-card hud-border p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Navigation size={15} className="text-primary" />
              <h3 className="font-heading text-sm font-700 tracking-widest">TRAJECTORY & ROUTE</h3>
            </div>

            <div>
              <label className="label-tag block mb-1.5">AIRCRAFT TRAJECTORY DETAILS</label>
              <input
                type="text"
                value={data.trajectory}
                onChange={set("trajectory")}
                placeholder="e.g. Heading 245° at 450 kts, descending"
                className="sar-input"
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5">FLIGHT ROUTE (FROM — TO)</label>
              <input
                type="text"
                value={data.flightRoute}
                onChange={set("flightRoute")}
                placeholder="e.g. BLR → MAA"
                className="sar-input"
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5">CRASH PRONE ZONE</label>
              <select value={data.crashZone} onChange={set("crashZone")} className="sar-select">
                {CRASH_ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            </div>
          </div>

          {/* Coordinates & ELT */}
          <div className="sar-card hud-border p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <MapPin size={15} className="text-danger" />
              <h3 className="font-heading text-sm font-700 tracking-widest">CRASH COORDINATES</h3>
            </div>
            <p className="text-xs text-muted-foreground">Click map to update or enter manually below</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-tag block mb-1.5">LATITUDE</label>
                <input type="number" step={0.0001} value={data.lat} onChange={set("lat")} className="sar-input font-mono text-sm" />
              </div>
              <div>
                <label className="label-tag block mb-1.5">LONGITUDE</label>
                <input type="number" step={0.0001} value={data.lon} onChange={set("lon")} className="sar-input font-mono text-sm" />
              </div>
            </div>

            <div>
              <label className="label-tag block mb-1.5">ELT DISTRESS SIGNAL RECEIVED?</label>
              <div className="flex gap-3">
                {ELT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setData((p) => ({ ...p, eltSignal: opt }))}
                    className={`flex-1 py-2 rounded font-heading text-sm font-600 tracking-wider transition-all border ${
                      data.eltSignal === opt
                        ? opt === "Yes"
                          ? "bg-success/10 border-success text-success"
                          : "bg-danger/10 border-danger text-danger"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {opt === "Yes" ? <CheckCircle size={12} className="inline mr-1" /> : <AlertTriangle size={12} className="inline mr-1" />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleAnalyze} className="sar-btn-primary flex-1">
              <Radio size={14} className="inline mr-2" />
              Analyze & Show Location
            </button>
            <button onClick={handleReset} className="sar-btn-secondary">Reset</button>
          </div>
        </div>

        {/* ELT Panel */}
        <ELTPanel onTriangulationUpdate={handleTriangulationUpdate} />
      </div> {/* This closing div was missing */}

      {/* Right: Map + Summary */}
      <div className="lg:col-span-3 space-y-4">
        {/* Map */}
        <div className="sar-card hud-border overflow-hidden" style={{ height: 480 }}>
          <div className="px-4 py-2 border-b border-border flex items-center justify-between" style={{ background: "hsl(var(--surface))" }}>
            <div className="flex items-center gap-3">
              <span className="font-heading text-sm tracking-widest">CRASH LOCATION MAP — CLICK TO PLACE</span>
              {eltTriangulation && (
                <span className="flex items-center gap-1 label-tag text-success text-[9px]">
                  <Crosshair size={10} /> ELT FIX ACTIVE
                </span>
              )}
            </div>
            <span className="font-mono text-xs text-primary">{data.lat.toFixed(4)}°N / {data.lon.toFixed(4)}°E</span>
          </div>
          <div style={{ height: "calc(100% - 41px)" }}>
            <SARMap
              lat={data.lat}
              lon={data.lon}
              showZones={analyzed}
              onMapClick={handleMapClick}
              eltTriangulation={eltTriangulation}
            />
          </div>
        </div>

        {/* Summary — only shown after analysis */}
        {analyzed && (
          <div className="sar-card hud-border p-4">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
              <CheckCircle size={15} className="text-success" />
              <h3 className="font-heading text-base font-700 tracking-widest text-success">ANALYSIS COMPLETE</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "WEATHER", value: data.weather, icon: "🌤" },
                { label: "WIND SPEED", value: `${data.windSpeed} km/h`, icon: "💨" },
                { label: "WIND DIR", value: data.windDirection, icon: "🧭" },
                { label: "CRASH ZONE", value: data.crashZone, icon: "📍" },
                { label: "ELT SIGNAL", value: data.eltSignal, icon: "📡" },
                { label: "FLIGHT ROUTE", value: data.flightRoute || "—", icon: "✈️" },
              ].map((item) => (
                <div key={item.label} className="rounded p-3" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                  <div className="label-tag mb-1">{item.label}</div>
                  <div className="text-sm text-foreground font-500">{item.icon} {item.value}</div>
                </div>
              ))}
            </div>
            {data.trajectory && (
              <div className="mt-3 p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                <span className="label-tag">TRAJECTORY: </span>
                <span className="text-sm text-foreground ml-2">{data.trajectory}</span>
              </div>
            )}
            {eltTriangulation && (
              <div className="mt-3 p-3 rounded" style={{ background: "hsl(var(--success) / 0.08)", border: "1px solid hsl(var(--success) / 0.4)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Crosshair size={12} className="text-success" />
                  <span className="label-tag text-success">ELT TRIANGULATED CRASH POSITION</span>
                </div>
                <span className="font-mono text-xs text-success">
                  {eltTriangulation.lat.toFixed(5)}°N, {eltTriangulation.lon.toFixed(5)}°E
                  &nbsp;·&nbsp;±{eltTriangulation.errorRadiusKm.toFixed(2)} km&nbsp;·&nbsp;{eltTriangulation.confidence.toFixed(0)}% confidence
                </span>
              </div>
            )}
            <div className="mt-3 p-3 rounded flex items-center gap-2" style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
              <Plane size={14} className="text-primary" />
              <span className="font-mono text-xs text-primary">
                TARGET: {data.lat.toFixed(6)}°N, {data.lon.toFixed(6)}°E — ELT: {data.eltSignal}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionInput;
