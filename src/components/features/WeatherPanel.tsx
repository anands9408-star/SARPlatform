/**
 * Live Weather Panel Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches weather for current coordinates and displays:
 *  • Current conditions, wind, temperature
 *  • Danger assessment for aviation
 *  • Wind as m/s for physics engine input
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { fetchWeather, weatherEmoji, windDangerScore } from "@/lib/weatherApi";
import type { WeatherData } from "@/types";
import { Cloud, Wind, Thermometer, Eye, RefreshCw, AlertTriangle } from "lucide-react";
import { KMH_TO_MS } from "@/lib/physics";

interface Props {
  lat: number;
  lon: number;
  refreshIntervalMs?: number;   // default 7 minutes
  onWeatherUpdate?: (data: WeatherData) => void;
}

const dangerColors: Record<WeatherData["dangerLevel"], string> = {
  SAFE:    "text-success border-success/30 bg-success/8",
  CAUTION: "text-warning border-warning/30 bg-warning/8",
  DANGER:  "text-danger border-danger/30 bg-danger/8",
  EXTREME: "text-danger border-danger/60 bg-danger/15",
};

const WeatherPanel: React.FC<Props> = ({ lat, lon, refreshIntervalMs = 7 * 60 * 1000, onWeatherUpdate }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const data = await fetchWeather(lat, lon);
    if (data) {
      setWeather(data);
      onWeatherUpdate?.(data);
    } else {
      setError("Weather API unavailable — check connection");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [lat, lon]);

  if (loading && !weather) {
    return (
      <div className="sar-card hud-border p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-muted-foreground">Fetching weather data...</span>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="sar-card hud-border p-4">
        <div className="flex items-center gap-2 text-warning mb-2">
          <AlertTriangle size={14} />
          <span className="font-heading text-xs font-700 tracking-wide">WEATHER UNAVAILABLE</span>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button onClick={load} className="mt-2 text-xs text-primary hover:underline">Retry</button>
      </div>
    );
  }

  if (!weather) return null;

  const windMs = weather.windSpeed * KMH_TO_MS;
  const wScore = windDangerScore(weather.windSpeed);

  return (
    <div className="sar-card hud-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between"
        style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-primary" />
          <h3 className="font-heading text-sm font-700 tracking-widest">LIVE WEATHER</h3>
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
          <button onClick={load} className="text-muted-foreground hover:text-primary transition-colors" title="Refresh">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Danger badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded border text-sm font-heading font-700 tracking-wider ${dangerColors[weather.dangerLevel]}`}>
          <span className="text-xl">{weatherEmoji(weather.weatherCode)}</span>
          <div>
            <div>{weather.dangerLevel} — {weather.weatherDescription}</div>
            <div className="text-[10px] font-400 font-mono opacity-70">
              {lat.toFixed(2)}°N / {lon.toFixed(2)}°E
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Thermometer, label: "TEMP", value: `${weather.temperature.toFixed(1)} °C` },
            { icon: Wind,        label: "WIND", value: `${weather.windSpeed} km/h` },
            { icon: Eye,         label: "VISIBILITY", value: `${weather.visibility} km` },
            { icon: Cloud,       label: "PRECIP", value: `${weather.precipitation} mm/h` },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <item.icon size={12} className="text-primary shrink-0" />
              <div>
                <div className="label-tag text-[9px]">{item.label}</div>
                <div className="font-mono text-xs text-foreground">{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Wind for physics */}
        <div className="p-2 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
          <div className="label-tag text-[9px] mb-1.5">WIND (PHYSICS INPUT)</div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-muted-foreground">Speed:</span>
            <span className="text-primary">{windMs.toFixed(2)} m/s</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-muted-foreground">Direction FROM:</span>
            <span className="text-primary">{weather.windDirection}°</span>
          </div>
        </div>

        {/* Wind danger */}
        {wScore > 0 && (
          <div className="flex items-center gap-2 p-2 rounded"
            style={{ background: "hsl(var(--warning) / 0.08)", border: "1px solid hsl(var(--warning) / 0.3)" }}>
            <AlertTriangle size={11} className="text-warning shrink-0" />
            <span className="text-xs text-warning">
              Wind adds +{wScore} to aircraft danger score
            </span>
          </div>
        )}

        <div className="label-tag text-[9px] text-center">
          Source: Open-Meteo · Updated {new Date(weather.fetchTime).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;
