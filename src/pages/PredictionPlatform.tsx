/**
 * Prediction Platform — Optimized
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes vs previous version:
 *  • Aircraft feed via opensky-proxy Edge Function (no browser CORS issues)
 *  • Physics prediction runs in Web Worker (off main thread)
 *  • Weather refresh: 7 minutes — snapshots persisted to OnSpace Cloud
 *  • Retention config UI (rolling window 6h / 12h / 24h / 48h / 7d)
 *  • Scan radius: dynamic slider (100–2000 km) + GLOBAL toggle
 *  • Prototype notice banner for public users
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import SARMap from "@/components/features/SARMap";
import ResourceTable from "@/components/features/ResourceTable";
import GlideCalculator from "@/components/features/GlideCalculator";
import MissionTimeline from "@/components/features/MissionTimeline";
import AircraftStatusCards from "@/components/features/AircraftStatusCards";
import CoordinatePanel, { GLOBAL_RADIUS } from "@/components/features/CoordinatePanel";
import DangerAssessment from "@/components/features/DangerAssessment";
import PhysicsPanel from "@/components/features/PhysicsPanel";
import WeatherPanel from "@/components/features/WeatherPanel";
import { useAircraft } from "@/hooks/useAircraft";
import { usePredictionWorker } from "@/hooks/usePredictionWorker";
import { KMH_TO_MS } from "@/lib/physics";
import { buildKinematicState } from "@/lib/predictionEngine";
import { saveWeatherSnapshot, getRetentionHours, setRetentionHours } from "@/lib/sarStorage";
import type { LiveAircraft, KinematicState, WeatherData } from "@/types";
import { SEARCH_ZONES } from "@/constants/sar";
import {
  Radio, Wifi, WifiOff, RefreshCw,
  Plane, Activity, Calculator, ChevronDown, ChevronUp, MapPin, Lock, Globe,
  Database, X, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { HostPinGate, isHostAuthenticated } from "@/components/features/HostPinGate";
import { sendSARAlert } from "@/lib/notifications";
import type { NotifyAircraft } from "@/lib/notifications";
import type { DangerScore } from "@/types";

const DEFAULT_RADIUS_KM   = 1500;
const REFRESH_INTERVAL_MS = 25_000;
const WEATHER_REFRESH_MS  = 7 * 60 * 1000;

const RETENTION_OPTIONS = [
  { label: "6 h",  value: 6 },
  { label: "12 h", value: 12 },
  { label: "24 h", value: 24 },
  { label: "48 h", value: 48 },
  { label: "7 d",  value: 168 },
];

const PredictionPlatform: React.FC = () => {
  // ── Target LKP state ─────────────────────────────────────────────────────
  const [lat, setLat]           = useState(12.9716);
  const [lon, setLon]           = useState(77.5946);
  const [altitude, setAltitude] = useState(30000);

  // ── Dynamic scan radius ───────────────────────────────────────────────────
  const [scanRadius, setScanRadius] = useState(DEFAULT_RADIUS_KM);
  const isGlobal = scanRadius === GLOBAL_RADIUS;

  // ── Host auth + live aircraft ─────────────────────────────────────────────
  const [showPinGate, setShowPinGate]           = useState(false);
  const [hostAuthed, setHostAuthed]             = useState(() => isHostAuthenticated());
  const [showLiveAircraft, setShowLiveAircraft] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<LiveAircraft | null>(null);

  // ── Prototype banner ──────────────────────────────────────────────────────
  const [showPrototypeBanner, setShowPrototypeBanner] = useState(() => {
    return localStorage.getItem("sar_banner_dismissed") !== "1";
  });

  // ── Weather ───────────────────────────────────────────────────────────────
  const [weather, setWeather]   = useState<WeatherData | null>(null);
  const weatherMapRef           = useRef<Map<string, WeatherData>>(new Map());

  // ── UI collapse states ────────────────────────────────────────────────────
  const [showPhysics, setShowPhysics] = useState(true);
  const [showDanger, setShowDanger]   = useState(true);

  // ── Retention config ──────────────────────────────────────────────────────
  const [retentionHours, setRetentionHoursState] = useState(getRetentionHours);

  const handleRetentionChange = (hours: number) => {
    setRetentionHours(hours);
    setRetentionHoursState(hours);
    toast.success(`Data retention set to ${hours >= 168 ? "7 days" : `${hours}h`}`);
  };

  // ── Kinematic state ───────────────────────────────────────────────────────
  const kinematicState: KinematicState = useMemo(() => {
    if (selectedAircraft) {
      return buildKinematicState(
        selectedAircraft.lat,
        selectedAircraft.lon,
        selectedAircraft.heading,
        selectedAircraft.velocity,
        selectedAircraft.altitude,
        selectedAircraft.verticalRate,
        weather ? weather.windSpeed * KMH_TO_MS : 5,
        weather ? weather.windDirection : 0
      );
    }
    return buildKinematicState(
      lat, lon, 245, 420, altitude, -800,
      weather ? weather.windSpeed * KMH_TO_MS : 5,
      weather ? weather.windDirection : 0
    );
  }, [selectedAircraft, lat, lon, altitude, weather]);

  // ── Timer: elapsed seconds since LKP ─────────────────────────────────────
  const [timeSinceLKP, setTimeSinceLKP] = useState(0);
  useEffect(() => { setTimeSinceLKP(0); }, [selectedAircraft, lat, lon]);
  useEffect(() => {
    const timer = setInterval(() => setTimeSinceLKP((t) => t + 5), 5000);
    return () => clearInterval(timer);
  }, []);

  // ── Physics computation — Web Worker ──────────────────────────────────────
  const { summary: physicsSummary, computing: physicsComputing } =
    usePredictionWorker(kinematicState, timeSinceLKP);

  // ── Aircraft feed ─────────────────────────────────────────────────────────
  const { aircraft, count, loading, error, lastUpdated, apiStatus, refresh } =
    useAircraft({
      enabled:          showLiveAircraft,
      centerLat:        lat,
      centerLon:        lon,
      radiusKm:         scanRadius,
      refreshInterval:  REFRESH_INTERVAL_MS,
      windSpeedMs:      weather ? weather.windSpeed * KMH_TO_MS : 5,
      windDirectionDeg: weather ? weather.windDirection : 0,
      selectedIcao24:   selectedAircraft?.icao24 ?? null,
    });

  const toggleLive = () => {
    if (!showLiveAircraft) {
      if (!hostAuthed) { setShowPinGate(true); return; }
      toast.success(
        isGlobal
          ? "Connecting — global aircraft scan active..."
          : `Connecting — fetching aircraft within ${scanRadius} km...`
      );
    } else {
      setSelectedAircraft(null);
      toast.info("Live aircraft feed disabled.");
    }
    setShowLiveAircraft((v) => !v);
  };

  // ── Alert cooldown controls ────────────────────────────────────────────
  const [cooldownMin, setCooldownMin]     = useState(10);
  const [alertEnabled, setAlertEnabled]   = useState(true);
  const [showCooldownPanel, setShowCooldownPanel] = useState(false);

  // ── Risk auto-alert callback ───────────────────────────────────────────
  const handleHighRisk = useCallback((highRisk: DangerScore[]) => {
    if (!alertEnabled) return;
    const toAlert: NotifyAircraft[] = highRisk.map((s) => ({
      icao24:      s.icao24,
      callsign:    s.callsign,
      lat:         s.lat,
      lon:         s.lon,
      altitude_ft: s.altitude,
      risk_score:  s.score,
      risk_level:  s.level,
      factors:     s.factors.map((f) => ({ name: f.name, value: f.value, points: f.points })),
    }));
    const trigger = toAlert.some((a) => a.risk_level === "CRITICAL") ? "CRITICAL" : "HIGH";
    sendSARAlert(trigger, toAlert);
  }, [alertEnabled]);

  // ── Test Alert ──────────────────────────────────────────────────────────
  const [testAlertLoading, setTestAlertLoading] = useState(false);

  const handleTestAlert = async () => {
    setTestAlertLoading(true);
    toast.info("Sending test CRITICAL alert — check email & SMS…");

    const mockAircraft: NotifyAircraft[] = [{
      icao24:      "TEST01",
      callsign:    "SAR-TEST",
      lat, lon,
      altitude_ft: 1200,
      risk_score:  87,
      risk_level:  "CRITICAL",
      factors: [
        { name: "Low Altitude",    value: "1,200 ft",      points: 35 },
        { name: "Rapid Descent",   value: "-2,400 ft/min", points: 30 },
        { name: "Extreme Weather", value: "Thunderstorm",  points: 22 },
      ],
    }];

    const { supabase: sb } = await import("@/lib/supabase");
    const { FunctionsHttpError } = await import("@supabase/supabase-js");

    const { data, error: fnErr } = await sb.functions.invoke("sar-notify", {
      body: { trigger: "CRITICAL", aircraft: mockAircraft },
    });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { msg = `[${fnErr.context?.status}] ${await fnErr.context?.text()}`; } catch { /* ignore */ }
      }
      toast.error(`Test alert failed: ${msg}`);
    } else {
      const r = data?.results ?? {};
      const parts: string[] = [];
      if (r.email === "sent") parts.push("Email sent");
      else if (r.email)       parts.push(`Email: ${r.email}`);
      if (r.sms === "sent")   parts.push("SMS sent");
      else if (r.sms)         parts.push(`SMS: ${r.sms}`);
      toast.success(`Test alert dispatched — ${parts.join(" · ") || "check logs"}`);
    }
    setTestAlertLoading(false);
  };

  const handlePinSuccess = () => {
    setShowPinGate(false);
    setHostAuthed(true);
    setShowLiveAircraft(true);
    toast.success("Host authenticated — live feed enabled.");
  };

  const handleAircraftClick = useCallback((ac: LiveAircraft) => {
    setSelectedAircraft(ac);
    setTimeSinceLKP(0);
    setLat(ac.lat);
    setLon(ac.lon);
    toast.success(`Tracking: ${ac.callsign} · Physics prediction active`);
  }, []);

  const handleWeatherUpdate = useCallback((data: WeatherData) => {
    setWeather(data);
    saveWeatherSnapshot(lat, lon, data);
  }, [lat, lon]);

  const weatherMap  = weatherMapRef.current;
  const radiusLabel = isGlobal ? "GLOBAL" : `${scanRadius} KM`;
  const countLabel  = isGlobal ? `${count} aircraft worldwide` : `${count} aircraft within ${scanRadius} km`;

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {showPinGate && (
        <HostPinGate
          onAuthenticated={handlePinSuccess}
          onClose={() => setShowPinGate(false)}
        />
      )}

      {/* ── Prototype Banner ─────────────────────────────────────────────── */}
      {showPrototypeBanner && (
        <div
          className="px-4 py-2 flex items-center gap-3 text-xs border-b border-warning/30"
          style={{ background: "hsl(var(--warning) / 0.08)" }}
        >
          <ShieldAlert size={13} className="text-warning shrink-0" />
          <span className="text-warning font-mono flex-1">
            <strong>PROTOTYPE</strong> — This is a research-grade aviation monitoring tool.
            Data is sourced from public APIs and is provided for situational awareness only.
            Not certified for operational SAR use. Always defer to official aviation authorities.
          </span>
          <button
            onClick={() => {
              localStorage.setItem("sar_banner_dismissed", "1");
              setShowPrototypeBanner(false);
            }}
            className="shrink-0 p-1 rounded hover:bg-warning/20 text-warning transition-colors"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div
        className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <div>
          <h1 className="font-heading text-xl font-700 tracking-widest text-foreground">
            SAR PREDICTION PLATFORM
          </h1>
          <p className="text-xs text-muted-foreground">
            S31 · Physics Engine (Web Worker) · {radiusLabel} Scan · {REFRESH_INTERVAL_MS / 1000}s refresh · Edge Proxy ✓
          </p>
        </div>
        <div className="flex-1" />

        {/* Alert + Retention Controls */}
        <div className="relative">
          <button
            onClick={() => setShowCooldownPanel((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded font-heading text-xs border transition-all ${
              alertEnabled
                ? "border-primary/50 text-primary hover:bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
            title="Alert cooldown & data retention settings"
          >
            <Radio size={11} />
            ALERTS {alertEnabled ? "ON" : "OFF"}
          </button>
          {showCooldownPanel && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-72 rounded border border-border p-3 space-y-3 shadow-xl"
              style={{ background: "hsl(var(--surface))" }}
            >
              <div className="font-heading text-xs font-700 tracking-widest border-b border-border pb-2">
                NOTIFICATION &amp; DATA SETTINGS
              </div>

              {/* Alert toggle */}
              <label className="flex items-center justify-between gap-2">
                <span className="label-tag text-[9px]">EMAIL + SMS ALERTS</span>
                <button
                  onClick={() => setAlertEnabled((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    alertEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    alertEnabled ? "left-5" : "left-0.5"
                  }`} />
                </button>
              </label>

              {/* Cooldown slider */}
              <div className="space-y-1">
                <label className="label-tag text-[9px] block">ALERT COOLDOWN (same aircraft)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={1} max={60} step={1}
                    value={cooldownMin}
                    onChange={(e) => setCooldownMin(parseInt(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="font-mono text-xs text-primary w-12 text-right">{cooldownMin} min</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[5, 10, 15, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setCooldownMin(m)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono border transition-all ${
                        cooldownMin === m
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Retention config ─────────────────────────────────── */}
              <div className="space-y-1 border-t border-border pt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Database size={9} className="text-primary" />
                  <label className="label-tag text-[9px]">DATA RETENTION WINDOW</label>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {RETENTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleRetentionChange(opt.value)}
                      className={`text-[9px] px-2 py-0.5 rounded font-mono border transition-all ${
                        retentionHours === opt.value
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  Records older than this window are auto-deleted before each save.
                  Currently: <span className="text-primary font-mono">
                    {retentionHours >= 168 ? "7 days" : `${retentionHours}h`}
                  </span>
                </p>
              </div>

              <div className="text-[9px] text-muted-foreground border-t border-border pt-2">
                Alerts via Gmail + Fast2SMS to<br/>
                <span className="text-primary font-mono">+91 8124919993</span> &amp; <span className="text-primary font-mono">anands9408@gmail.com</span>
              </div>
            </div>
          )}
        </div>

        {/* Test Alert Button */}
        <button
          onClick={handleTestAlert}
          disabled={testAlertLoading}
          className="flex items-center gap-2 px-3 py-2 rounded font-heading text-xs font-700 tracking-wide border border-danger/50 text-danger hover:bg-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send a mock CRITICAL alert to verify email & SMS delivery"
        >
          {testAlertLoading ? (
            <div className="w-3 h-3 border border-danger border-t-transparent rounded-full animate-spin" />
          ) : (
            <Activity size={12} />
          )}
          TEST ALERT
        </button>

        {showLiveAircraft && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          >
            {isGlobal ? <Globe size={12} className="text-warning" /> : <MapPin size={12} className="text-primary" />}
            <span className="font-mono text-xs text-foreground">
              {loading ? "Scanning..." : countLabel}
            </span>
          </div>
        )}

        <button
          onClick={toggleLive}
          className={`flex items-center gap-2 px-4 py-2 rounded font-heading text-xs font-700 tracking-wide border transition-all ${
            showLiveAircraft
              ? isGlobal
                ? "bg-warning/10 border-warning text-warning"
                : "bg-success/10 border-success text-success"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {showLiveAircraft
            ? isGlobal ? <Globe size={13} /> : <Wifi size={13} />
            : <WifiOff size={13} />}
          {showLiveAircraft
            ? `${radiusLabel} FEED: ON`
            : hostAuthed
            ? `${radiusLabel} FEED: OFF`
            : <><Lock size={10} className="inline mr-1" />HOST ONLY</>}
        </button>

        <div className="hidden lg:flex items-center gap-3">
          {SEARCH_ZONES.map((z) => (
            <div key={z.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: z.color }} />
              <span className="label-tag">{z.name} {z.probability}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── API Status Banner ────────────────────────────────────────────── */}
      {showLiveAircraft && (
        <div
          className={`px-6 py-2 flex flex-wrap items-center gap-3 border-b border-border text-xs ${
            apiStatus === "error"   ? "bg-danger/5"
            : apiStatus === "limited" ? "bg-warning/5"
            : "bg-success/5"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              apiStatus === "error"   ? "bg-danger"
              : apiStatus === "limited" ? "bg-warning animate-pulse"
              : "bg-success animate-pulse"
            }`}
          />
          {apiStatus === "ok" && (
            <span className="font-mono text-success">
              OpenSky (via Proxy) · {countLabel} ·{" "}
              {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
              {isGlobal && " · ⚠ Global scan — rate limits likely"}
            </span>
          )}
          {apiStatus === "limited" && (
            <span className="font-mono text-warning">⚠ Rate limited — showing last data</span>
          )}
          {apiStatus === "error" && (
            <span className="font-mono text-danger">{error}</span>
          )}
          {(apiStatus === "error" || apiStatus === "limited") && (
            <button
              onClick={refresh}
              className="flex items-center gap-1 ml-2 text-primary hover:underline"
            >
              <RefreshCw size={10} /> Retry
            </button>
          )}
          {physicsComputing && (
            <span className="ml-auto font-mono text-muted-foreground flex items-center gap-1.5">
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              Computing physics…
            </span>
          )}
          {selectedAircraft && !physicsComputing && (
            <span className="ml-auto font-mono text-muted-foreground">
              Tracking:{" "}
              <span className="text-primary">{selectedAircraft.callsign}</span> · T+
              {Math.floor(timeSinceLKP / 60)}m {timeSinceLKP % 60}s
            </span>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        <AircraftStatusCards />

        {/* ── Main Layout ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Map */}
          <div className="xl:col-span-3">
            <div className="sar-card hud-border overflow-hidden" style={{ height: 560 }}>
              <div
                className="px-4 py-2 border-b border-border flex items-center justify-between"
                style={{ background: "hsl(var(--surface))" }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-heading text-xs tracking-widest">
                    SEARCH MAP · {radiusLabel} RADIUS
                  </span>
                  {showLiveAircraft && (
                    <span className="flex items-center gap-1 text-success">
                      <Radio size={10} className="animate-pulse" />
                      <span className="label-tag text-[9px] text-success">LIVE</span>
                    </span>
                  )}
                  {isGlobal && showLiveAircraft && (
                    <span className="label-tag text-warning text-[9px]">GLOBAL</span>
                  )}
                  {selectedAircraft && (
                    <span className="label-tag text-primary text-[9px]">
                      TRACKING: {selectedAircraft.callsign}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {selectedAircraft && (
                    <button
                      onClick={() => { setSelectedAircraft(null); setTimeSinceLKP(0); }}
                      className="label-tag text-muted-foreground hover:text-danger transition-colors text-[9px]"
                    >
                      CLEAR SELECTION
                    </button>
                  )}
                  <span className="font-mono text-xs text-primary">
                    {lat.toFixed(4)}°N / {lon.toFixed(4)}°E
                  </span>
                </div>
              </div>
              <div style={{ height: "calc(100% - 41px)" }}>
                <SARMap
                  lat={lat}
                  lon={lon}
                  showZones
                  aircraft={showLiveAircraft ? aircraft : []}
                  predictedPath={physicsSummary.predictedPath}
                  selectedAircraftId={selectedAircraft?.icao24 ?? null}
                  weatherMap={weatherMap}
                  onAircraftClick={handleAircraftClick}
                />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <CoordinatePanel
              lat={lat}
              lon={lon}
              onLatChange={setLat}
              onLonChange={setLon}
              scanRadius={scanRadius}
              onScanRadiusChange={setScanRadius}
            />
            <GlideCalculator altitude={altitude} onAltitudeChange={setAltitude} />
            <WeatherPanel
              lat={lat}
              lon={lon}
              refreshIntervalMs={WEATHER_REFRESH_MS}
              onWeatherUpdate={handleWeatherUpdate}
            />
          </div>
        </div>

        {/* ── Physics Engine Panel ─────────────────────────────────────────── */}
        <div className="sar-card hud-border overflow-hidden">
          <button
            onClick={() => setShowPhysics((v) => !v)}
            className="w-full px-4 py-3 border-b border-border flex items-center gap-2 hover:bg-secondary/20 transition-colors"
            style={{ background: "hsl(var(--surface))" }}
          >
            <Calculator size={14} className="text-primary" />
            <span className="font-heading text-sm font-700 tracking-widest">
              PHYSICS ENGINE — WEB WORKER · OFF-THREAD COMPUTATION
            </span>
            {selectedAircraft && (
              <span className="label-tag text-primary ml-2">
                Aircraft: {selectedAircraft.callsign}
              </span>
            )}
            <div className="flex-1" />
            <span className="label-tag">
              GS: {(physicsSummary.groundVector.magnitude / 0.514444).toFixed(1)} kts ·
              Conf: {physicsSummary.confidenceNow.toFixed(1)}%
            </span>
            {physicsComputing && (
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {showPhysics
              ? <ChevronUp size={14} className="text-muted-foreground" />
              : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {showPhysics && (
            <div style={{ height: 460 }}>
              <PhysicsPanel state={kinematicState} timeSinceLKP={timeSinceLKP} />
            </div>
          )}
        </div>

        {/* ── Danger Assessment + Resource Table + Timeline ──────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1">
            <div className="sar-card hud-border overflow-hidden">
              <button
                onClick={() => setShowDanger((v) => !v)}
                className="w-full px-4 py-3 border-b border-border flex items-center gap-2 hover:bg-secondary/20 transition-colors"
                style={{ background: "hsl(var(--surface))" }}
              >
                <Activity size={14} className="text-danger" />
                <span className="font-heading text-sm font-700 tracking-widest">
                  DANGER ASSESSMENT
                </span>
                <div className="flex-1" />
                {showDanger
                  ? <ChevronUp size={14} className="text-muted-foreground" />
                  : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              {showDanger && (
                <div style={{ height: 400 }}>
                  {showLiveAircraft && aircraft.length > 0 ? (
                    <DangerAssessment
                      aircraft={aircraft}
                      weatherMap={weatherMap}
                      topN={15}
                      onHighRisk={handleHighRisk}
                      autoSaveIntervalSec={120}
                    />
                  ) : (
                    <div className="p-6 text-center">
                      <Plane size={28} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enable the aircraft feed to see danger assessment.
                      </p>
                      <button onClick={toggleLive} className="mt-3 sar-btn-primary text-xs py-1.5 px-3">
                        Enable Feed
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="xl:col-span-1">
            <ResourceTable />
          </div>
          <div className="xl:col-span-1" style={{ height: 400 }}>
            <MissionTimeline />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPlatform;
