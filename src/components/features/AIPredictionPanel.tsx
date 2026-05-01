/**
 * AI Prediction Panel
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the `sar-ai-predict` Edge Function (OnSpace AI / Gemini 3 Flash)
 * to generate a tactical mission prediction report for the selected aircraft.
 *
 * Shows:
 *  • Structured AI report with threat assessment, predicted position,
 *    search recommendation, weather impact, priority actions, confidence
 *  • Model info + generation timestamp
 *  • Copy-to-clipboard button for field use
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  Brain, Loader2, RefreshCw, Copy, Check, AlertTriangle, Satellite,
} from "lucide-react";
import { toast } from "sonner";
import type { LiveAircraft, PhysicsSummary, WeatherData } from "@/types";

interface AIPredictionPanelProps {
  aircraft: LiveAircraft | null;
  physicsSummary: PhysicsSummary;
  weather: WeatherData | null;
  riskScore?: number;
  riskLevel?: string;
  riskFactors?: { name: string; value: string; points: number }[];
}

// ── Markdown-lite renderer (bold headers + bullet points) ──────────────────

function renderReport(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold headers: **HEADER**
    if (/^\*\*[^*]+\*\*/.test(line.trim())) {
      const header = line.replace(/\*\*/g, "").trim();
      return (
        <div key={i} className="mt-3 mb-1 font-heading text-[10px] tracking-widest text-primary font-700">
          {header}
        </div>
      );
    }
    // Bullet points
    if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
      return (
        <div key={i} className="flex items-start gap-2 ml-2 mb-0.5">
          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
          <span className="font-mono text-[11px] text-foreground leading-relaxed">
            {line.replace(/^[•\-]\s*/, "")}
          </span>
        </div>
      );
    }
    // Empty lines
    if (!line.trim()) return <div key={i} className="h-1" />;
    // Normal text
    return (
      <p key={i} className="font-mono text-[11px] text-foreground/90 leading-relaxed mb-0.5">
        {line}
      </p>
    );
  });
}

const AIPredictionPanel: React.FC<AIPredictionPanelProps> = ({
  aircraft,
  physicsSummary,
  weather,
  riskScore,
  riskLevel,
  riskFactors = [],
}) => {
  const [report, setReport]       = useState<string>("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string>("");
  const [copied, setCopied]       = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generatePrediction = useCallback(async () => {
    if (!aircraft) {
      toast.error("Select an aircraft first to generate AI prediction.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    // Build predicted position from physics summary
    const firstPath = physicsSummary.predictedPath;
    const at15min   = firstPath.find((p) => p.time >= 900) ?? firstPath[firstPath.length - 1];

    const body = {
      aircraft: {
        callsign:           aircraft.callsign,
        icao24:             aircraft.icao24,
        lat:                aircraft.lat,
        lon:                aircraft.lon,
        altitude_ft:        aircraft.altitude,
        velocity_kts:       aircraft.velocity,
        heading:            aircraft.heading,
        vertical_rate_fpm:  aircraft.verticalRate,
        origin_country:     aircraft.originCountry,
      },
      physics: {
        groundSpeed_kts:   physicsSummary.groundVector.magnitude * 1.94384,
        confidence_pct:    physicsSummary.confidenceNow,
        searchRadius_km:   physicsSummary.searchRadiusNow / 1000,
        predictedLat:      at15min?.lat,
        predictedLon:      at15min?.lon,
        timeSinceLKP_s:    physicsSummary.timeSinceLKP,
      },
      weather: weather
        ? {
            temperature_c:     weather.temperature,
            windSpeed_kmh:     weather.windSpeed,
            windDirection_deg: weather.windDirection,
            visibility_m:      weather.visibility * 1000,
            description:       weather.weatherDescription,
            isDangerous:       weather.dangerLevel === "DANGER" || weather.dangerLevel === "EXTREME",
          }
        : null,
      riskScore,
      riskLevel,
      riskFactors,
    };

    const { data, error: fnErr } = await supabase.functions.invoke("sar-ai-predict", { body });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { msg = `[${fnErr.context?.status}] ${await fnErr.context?.text()}`; } catch { /* ignore */ }
      }
      setError(msg);
      toast.error("AI prediction failed — check logs.");
    } else if (data?.report) {
      setReport(data.report);
      setGeneratedAt(new Date());
      toast.success("AI prediction generated.");
    } else {
      setError("No report returned from AI.");
    }

    setLoading(false);
  }, [aircraft, physicsSummary, weather, riskScore, riskLevel, riskFactors]);

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Report copied to clipboard.");
  };

  return (
    <div className="sar-card hud-border overflow-hidden flex flex-col" style={{ minHeight: 300 }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <Brain size={14} className="text-primary" />
        <div className="flex-1">
          <span className="font-heading text-xs tracking-widest font-700">AI PREDICTION ENGINE</span>
          <span className="ml-2 label-tag text-[9px] text-primary">Gemini 3 Flash · SAR-AI</span>
        </div>
        {generatedAt && (
          <span className="font-mono text-[9px] text-muted-foreground">
            {generatedAt.toLocaleTimeString()}
          </span>
        )}
        {report && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded font-heading text-[9px] border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? "COPIED" : "COPY"}
          </button>
        )}
        <button
          onClick={generatePrediction}
          disabled={loading || !aircraft}
          className="flex items-center gap-2 px-3 py-1.5 rounded font-heading text-[10px] font-700 tracking-wide border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: loading ? "hsl(var(--primary) / 0.1)" : "hsl(var(--primary))",
            borderColor: "hsl(var(--primary) / 0.6)",
            color: loading ? "hsl(var(--primary))" : "#fff",
          }}
          title={!aircraft ? "Select an aircraft to run AI prediction" : "Generate AI prediction report"}
        >
          {loading
            ? <Loader2 size={11} className="animate-spin" />
            : <RefreshCw size={11} />}
          {loading ? "ANALYSING…" : report ? "REFRESH" : "GENERATE"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: 440 }}>
        {!aircraft && !report && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Satellite size={28} className="text-muted-foreground mb-3" />
            <p className="text-xs text-muted-foreground font-mono leading-relaxed max-w-xs">
              Select an aircraft from the live feed, then click <strong className="text-primary">GENERATE</strong> to
              run the AI prediction engine for tactical SAR guidance.
            </p>
          </div>
        )}

        {aircraft && !report && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Brain size={28} className="text-primary/50 mb-3" />
            <p className="text-xs text-muted-foreground font-mono">
              Aircraft selected: <span className="text-primary">{aircraft.callsign}</span>
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Click <strong className="text-primary">GENERATE</strong> for AI tactical prediction.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="relative mb-4">
              <Brain size={28} className="text-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
            </div>
            <p className="text-xs text-primary font-heading tracking-widest">ANALYSING TELEMETRY…</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-1">
              Gemini 3 Flash · SAR threat model
            </p>
          </div>
        )}

        {error && !loading && (
          <div
            className="flex items-start gap-3 p-4 rounded"
            style={{ background: "hsl(var(--danger) / 0.08)", border: "1px solid hsl(var(--danger) / 0.3)" }}
          >
            <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-danger font-heading font-700">AI PREDICTION FAILED</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{error}</p>
            </div>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-0.5">
            {/* Selected aircraft info bar */}
            {aircraft && (
              <div
                className="flex items-center gap-3 px-3 py-2 rounded mb-3 flex-wrap"
                style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}
              >
                <span className="font-heading text-xs font-700 text-primary">{aircraft.callsign}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{aircraft.icao24.toUpperCase()}</span>
                <span className="font-mono text-[10px]">{aircraft.altitude.toLocaleString()} ft</span>
                <span className="font-mono text-[10px]">{aircraft.velocity} kts</span>
                {riskLevel && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-700 font-heading tracking-wider border ${
                    riskLevel === "CRITICAL" ? "text-danger border-danger/40 bg-danger/8"
                    : riskLevel === "HIGH" ? "text-orange-400 border-orange-400/40"
                    : "text-warning border-warning/40"
                  }`}>
                    {riskLevel} · {riskScore}/100
                  </span>
                )}
              </div>
            )}
            {renderReport(report)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPredictionPanel;
