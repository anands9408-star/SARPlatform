/**
 * Prediction Platform — Role-Gated Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * HOST access:       Full platform — all panels, all radius options, all controls
 * VIEWER access:      AI Prediction, Danger Assessment, Live Weather, 500 km cap
 * FREE_VIEWER access: Read-only map + weather only, no live feed, no AI
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
import WeatherPanel from "@/components/features/WeatherPanel";
import AIPredictionPanel from "@/components/features/AIPredictionPanel";
import CommSatellitePanel from "@/components/features/CommSatellitePanel";
import ViewerAccessManager from "@/components/features/ViewerAccessManager";
import VideoFeedPanel from "@/components/features/VideoFeedPanel";
import { useAircraft } from "@/hooks/useAircraft";
import { useAuth } from "@/hooks/useAuth";
import { KMH_TO_MS } from "@/lib/physics";
import { buildKinematicState } from "@/lib/predictionEngine";
import { saveWeatherSnapshot, getRetentionHours, setRetentionHours } from "@/lib/sarStorage";
import type { LiveAircraft, KinematicState, WeatherData } from "@/types";
import { SEARCH_ZONES } from "@/constants/sar";
import {
  Radio, Wifi, WifiOff, RefreshCw,
  Plane, Activity, ChevronDown, ChevronUp, MapPin, Globe,
  Database, X, ShieldAlert, Brain, Satellite, Shield, Eye, Video,
} from "lucide-react";
import { toast } from "sonner";
import { sendSARAlert } from "@/lib/notifications";
import type { NotifyAircraft } from "@/lib/notifications";
import type { DangerScore } from "@/types";

const DEFAULT_RADIUS_KM     = 1000;
const SUBSCRIBER_MAX_RADIUS = 1000; // Upgraded: subscribers now get 1K scan
const REFRESH_INTERVAL_MS   = 25_000;
const WEATHER_REFRESH_MS    = 7 * 60 * 1000;
const CRASH_MONITOR_MS      = 90_000;

const RETENTION_OPTIONS = [
  { label: "6 h",  value: 6   },
  { label: "12 h", value: 12  },
  { label: "24 h", value: 24  },
  { label: "48 h", value: 48  },
  { label: "7 d",  value: 168 },
];

const PredictionPlatform: React.FC = () => {
  const { isHost, isViewer, isFreeViewer, user } = useAuth();

  // ── Target / LKP state ────────────────────────────────────────────────
  const [lat, setLat]           = useState(12.9716);
  const [lon, setLon]           = useState(77.5946);
  const [altitude, setAltitude] = useState(30000);

  // ── Scan radius — subscribers capped, free viewers locked ─────────────
  const [scanRadius, setScanRadius] = useState(
    (isViewer || isFreeViewer) ? SUBSCRIBER_MAX_RADIUS : DEFAULT_RADIUS_KM
  );
  const isGlobal = scanRadius === GLOBAL_RADIUS;

  const handleScanRadiusChange = (r: number) => {
    if (isFreeViewer) { toast.error("Free viewers cannot change scan radius."); return; }
    if (isViewer && r !== 0 && r > SUBSCRIBER_MAX_RADIUS) {
      toast.error(`Subscriber access is limited to ${SUBSCRIBER_MAX_RADIUS} km scan radius.`);
      return;
    }
    if (isViewer && r === 0) { toast.error("Global scan requires Host access."); return; }
    setScanRadius(r);
  };

  // ── Live feed state ────────────────────────────────────────────────────
  const [showLiveAircraft, setShowLiveAircraft] = useState(false);

  // ── AI + satellite + viewer manager panels ───────────────────────────
  const [showAIPanel,    setShowAIPanel]    = useState(false);
  const [showSatPanel,   setShowSatPanel]   = useState(false);
  const [showViewerMgr,  setShowViewerMgr]  = useState(false);
  const [selectedDangerScore, setSelectedDangerScore] = useState<DangerScore | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<LiveAircraft | null>(null);

  // ── Prototype banner ──────────────────────────────────────────────────
  const [showBanner, setShowBanner] = useState(
    () => localStorage.getItem("sar_banner_dismissed") !== "1"
  );

  // ── Weather ───────────────────────────────────────────────────────────
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const weatherMapRef         = useRef<Map<string, WeatherData>>(new Map());

  // ── Collapse states ───────────────────────────────────────────────────
  const [showDanger,    setShowDanger]    = useState(true);
  const [showVideoFeed, setShowVideoFeed] = useState(true);

  // ── Retention (host only) ─────────────────────────────────────────────
  const [retentionHours, setRetentionHoursState] = useState(getRetentionHours);
  const [showCooldownPanel, setShowCooldownPanel] = useState(false);
  const [cooldownMin, setCooldownMin]   = useState(10);
  const [alertEnabled, setAlertEnabled] = useState(true);

  const handleRetentionChange = (hours: number) => {
    setRetentionHours(hours);
    setRetentionHoursState(hours);
    toast.success(`Data retention set to ${hours >= 168 ? "7 days" : `${hours}h`}`);
  };

  // ── Kinematic state ───────────────────────────────────────────────────
  const kinematicState: KinematicState = useMemo(() => {
    if (selectedAircraft) {
      return buildKinematicState(
        selectedAircraft.lat, selectedAircraft.lon,
        selectedAircraft.heading, selectedAircraft.velocity,
        selectedAircraft.altitude, selectedAircraft.verticalRate,
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

  // ── Timer: elapsed since LKP ──────────────────────────────────────────
  const [timeSinceLKP, setTimeSinceLKP] = useState(0);
  useEffect(() => { setTimeSinceLKP(0); }, [selectedAircraft, lat, lon]);
  useEffect(() => {
    const timer = setInterval(() => setTimeSinceLKP((t) => t + 5), 5000);
    return () => clearInterval(timer);
  }, []);

  // ── Aircraft feed ─────────────────────────────────────────────────────
  const { aircraft, count, loading, error, lastUpdated, apiStatus, refresh } = useAircraft({
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
      toast.success(
        isGlobal
          ? "Connecting — global aircraft scan active…"
          : `Connecting — aircraft within ${scanRadius} km…`
      );
    } else {
      setSelectedAircraft(null);
      toast.info("Live aircraft feed disabled.");
    }
    setShowLiveAircraft((v) => !v);
  };

  // ── Risk alert callback ───────────────────────────────────────────────
  const handleHighRisk = useCallback((highRisk: DangerScore[]) => {
    if (!alertEnabled || !isHost) return;
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
  }, [alertEnabled, isHost]);

  const handleHighRiskWithScore = useCallback((highRisk: DangerScore[]) => {
    const top = highRisk.find((s) => s.level === "CRITICAL") ?? highRisk[0];
    if (top) setSelectedDangerScore(top);
    handleHighRisk(highRisk);
  }, [handleHighRisk]);

  // ── Test Alert (host only) ────────────────────────────────────────────
  const [testAlertLoading, setTestAlertLoading] = useState(false);
  const handleTestAlert = async () => {
    setTestAlertLoading(true);
    toast.info("Sending test alert — check Gmail…");
    const mockAircraft: NotifyAircraft[] = [{
      icao24: "TEST01", callsign: "SAR-TEST", lat, lon,
      altitude_ft: 1200, risk_score: 87, risk_level: "CRITICAL",
      factors: [
        { name: "Low Altitude",  value: "1,200 ft",     points: 35 },
        { name: "Rapid Descent", value: "-2,400 ft/min", points: 30 },
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
        try { msg = `[${fnErr.context?.status}] ${await fnErr.context?.text()}`; } catch {}
      }
      toast.error(`Test alert failed: ${msg}`);
    } else {
      const r = data?.results ?? {};
      toast.success(`Test alert dispatched — Email: ${r.email ?? "?"}`);
    }
    setTestAlertLoading(false);
  };

  // ── Crash monitor — polls edge fn every 90s even when offline ──────
  useEffect(() => {
    if (!isHost) return;
    const runCrashCheck = async () => {
      try {
        const { supabase: sb } = await import("@/lib/supabase");
        await sb.functions.invoke("sar-crash-monitor", {
          body: { lat, lon, radiusKm: isGlobal ? 5000 : Math.max(scanRadius, 2000) },
        });
        console.log("[CrashMonitor] Periodic check complete");
      } catch (e) {
        console.warn("[CrashMonitor] Check failed:", e);
      }
    };
    runCrashCheck();
    const iv = setInterval(runCrashCheck, CRASH_MONITOR_MS);
    return () => clearInterval(iv);
  }, [isHost, lat, lon, scanRadius, isGlobal]);

  // ── Store host email for reference ─────────────────────────────────
  useEffect(() => {
    if (isHost && user?.email) {
      localStorage.setItem("sar_host_alert_email", user.email);
    }
  }, [isHost, user?.email]);

  const handleAircraftClick = useCallback((ac: LiveAircraft) => {
    setSelectedAircraft(ac);
    setTimeSinceLKP(0);
    setLat(ac.lat);
    setLon(ac.lon);
    toast.success(`Tracking: ${ac.callsign} · AI prediction ready`);
  }, []);

  const handleWeatherUpdate = useCallback((data: WeatherData) => {
    setWeather(data);
    if (isHost) saveWeatherSnapshot(lat, lon, data);
  }, [lat, lon, isHost]);

  const weatherMap  = weatherMapRef.current;
  const radiusLabel = isGlobal ? "GLOBAL" : `${scanRadius} KM`;
  const countLabel  = isGlobal
    ? `${count} aircraft worldwide`
    : `${count} aircraft within ${scanRadius} km`;

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>

      {/* ── Prototype Banner ─────────────────────────────────────────────── */}
      {showBanner && (
        <div
          className="px-4 py-2 flex items-center gap-3 text-xs border-b border-warning/30"
          style={{ background: "hsl(var(--warning) / 0.06)" }}
        >
          <ShieldAlert size={13} className="text-warning shrink-0" />
          <span className="text-warning font-mono flex-1">
            <strong>PROTOTYPE</strong> — Research-grade tool. Data from public APIs for situational awareness only.
            Not certified for operational SAR use.
          </span>
          <button
            onClick={() => { localStorage.setItem("sar_banner_dismissed", "1"); setShowBanner(false); }}
            className="shrink-0 p-1 rounded hover:bg-warning/20 text-warning transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Role Banner ───────────────────────────────────────────────────── */}
      {isViewer && (
        <div className="px-4 py-1.5 flex items-center gap-2 border-b border-primary/20 text-[10px] font-mono"
          style={{ background: "hsl(var(--primary) / 0.05)" }}>
          <Eye size={10} className="text-primary shrink-0" />
          <span className="text-primary">Subscriber — AI Prediction, Danger Assessment, Weather, Video Feed &amp; Kinematic Simulation · Scan up to {SUBSCRIBER_MAX_RADIUS} km</span>
        </div>
      )}
      {isFreeViewer && (
        <div className="px-4 py-1.5 flex items-center gap-2 border-b border-success/20 text-[10px] font-mono"
          style={{ background: "hsl(130 50% 35% / 0.06)" }}>
          <Eye size={10} className="text-success shrink-0" />
          <span className="text-success">Free View — Live map &amp; weather only · Subscribe via anands9408@gmail.com for full access</span>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div
        className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <div>
          <h1 className="font-heading text-xl font-700 tracking-widest text-foreground">
            SAR PREDICTION PLATFORM
          </h1>
          <p className="text-xs text-muted-foreground">
            {isHost ? "Host" : isFreeViewer ? "Free Viewer" : "Subscriber"} · {radiusLabel} Scan · {REFRESH_INTERVAL_MS / 1000}s refresh · Edge Proxy ✓
          </p>
        </div>
        <div className="flex-1" />

        {/* Alerts & Retention (host only) */}
        {isHost && (
          <div className="relative">
            <button
              onClick={() => setShowCooldownPanel((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded font-heading text-xs border transition-all ${
                alertEnabled
                  ? "border-primary/50 text-primary hover:bg-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <Radio size={11} /> ALERTS {alertEnabled ? "ON" : "OFF"}
            </button>
            {showCooldownPanel && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-72 rounded border border-border p-3 space-y-3 shadow-xl"
                style={{ background: "hsl(var(--surface))" }}
              >
                <div className="font-heading text-xs font-700 tracking-widest border-b border-border pb-2">
                  NOTIFICATION &amp; DATA SETTINGS
                </div>
                <label className="flex items-center justify-between gap-2">
                  <span className="label-tag text-[9px]">EMAIL ALERTS (Gmail)</span>
                  <button
                    onClick={() => setAlertEnabled((v) => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${alertEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${alertEnabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </label>
                <div className="space-y-1">
                  <label className="label-tag text-[9px] block">ALERT COOLDOWN</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={60} step={1}
                      value={cooldownMin} onChange={(e) => setCooldownMin(parseInt(e.target.value))}
                      className="flex-1 accent-primary" />
                    <span className="font-mono text-xs text-primary w-12 text-right">{cooldownMin} min</span>
                  </div>
                </div>
                <div className="space-y-1 border-t border-border pt-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Database size={9} className="text-primary" />
                    <label className="label-tag text-[9px]">DATA RETENTION</label>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {RETENTION_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => handleRetentionChange(opt.value)}
                        className={`text-[9px] px-2 py-0.5 rounded font-mono border transition-all ${
                          retentionHours === opt.value
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground border-t border-border pt-2">
                  Gmail alerts → <span className="text-primary font-mono">anands9408@gmail.com</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test alert (host only) */}
        {isHost && (
          <button onClick={handleTestAlert} disabled={testAlertLoading}
            className="flex items-center gap-2 px-3 py-2 rounded font-heading text-xs font-700 border border-danger/50 text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
          >
            {testAlertLoading
              ? <div className="w-3 h-3 border border-danger border-t-transparent rounded-full animate-spin" />
              : <Activity size={12} />}
            TEST ALERT
          </button>
        )}

        {/* Count badge */}
        {showLiveAircraft && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          >
            {isGlobal ? <Globe size={12} className="text-warning" /> : <MapPin size={12} className="text-primary" />}
            <span className="font-mono text-xs">{loading ? "Scanning…" : countLabel}</span>
          </div>
        )}

        {/* Feed toggle — hidden for free viewers */}
        {!isFreeViewer && (
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
            {showLiveAircraft ? `${radiusLabel} FEED: ON` : `${radiusLabel} FEED: OFF`}
          </button>
        )}

        {/* Search zone legend (host only) */}
        {isHost && (
          <div className="hidden xl:flex items-center gap-3">
            {SEARCH_ZONES.map((z) => (
              <div key={z.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: z.color }} />
                <span className="label-tag">{z.name} {z.probability}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── API Status Banner ─────────────────────────────────────────────── */}
      {showLiveAircraft && (
        <div className={`px-6 py-2 flex flex-wrap items-center gap-3 border-b border-border text-xs ${
          apiStatus === "error" ? "bg-danger/5" : apiStatus === "limited" ? "bg-warning/5" : "bg-success/5"
        }`}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            apiStatus === "error" ? "bg-danger" : apiStatus === "limited" ? "bg-warning animate-pulse" : "bg-success animate-pulse"
          }`} />
          {apiStatus === "ok" && (
            <span className="font-mono text-success">
              OpenSky (Proxy) · {countLabel} · {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
              {isGlobal && " · ⚠ Global scan — rate limits likely"}
            </span>
          )}
          {apiStatus === "limited" && <span className="font-mono text-warning">⚠ Rate limited — showing last data</span>}
          {apiStatus === "error" && <span className="font-mono text-danger">{error}</span>}
          {(apiStatus === "error" || apiStatus === "limited") && (
            <button onClick={refresh} className="flex items-center gap-1 ml-2 text-primary hover:underline">
              <RefreshCw size={10} /> Retry
            </button>
          )}
          {selectedAircraft && (
            <span className="ml-auto font-mono text-muted-foreground">
              Tracking: <span className="text-primary">{selectedAircraft.callsign}</span> · T+{Math.floor(timeSinceLKP / 60)}m {timeSinceLKP % 60}s
            </span>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* ── Status Cards (host only) ──────────────────────────────────────── */}
        {isHost && <AircraftStatusCards />}

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Map */}
          <div className="xl:col-span-3">
            <div className="sar-card hud-border overflow-hidden" style={{ height: 520 }}>
              <div className="px-4 py-2 border-b border-border flex items-center justify-between"
                style={{ background: "hsl(var(--surface))" }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-heading text-xs tracking-widest">SEARCH MAP · {radiusLabel}</span>
                  {showLiveAircraft && (
                    <span className="flex items-center gap-1 text-success">
                      <Radio size={10} className="animate-pulse" />
                      <span className="label-tag text-[9px] text-success">LIVE</span>
                    </span>
                  )}
                  {selectedAircraft && (
                    <span className="label-tag text-primary text-[9px]">TRACKING: {selectedAircraft.callsign}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {selectedAircraft && (
                    <button onClick={() => { setSelectedAircraft(null); setTimeSinceLKP(0); }}
                      className="label-tag text-muted-foreground hover:text-danger transition-colors text-[9px]"
                    >CLEAR</button>
                  )}
                  <span className="font-mono text-xs text-primary">{lat.toFixed(4)}°N / {lon.toFixed(4)}°E</span>
                </div>
              </div>
              <div style={{ height: "calc(100% - 41px)" }}>
                <SARMap
                  lat={lat} lon={lon}
                  showZones={isHost}
                  aircraft={showLiveAircraft ? aircraft : []}
                  predictedPath={[]}
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
              lat={lat} lon={lon}
              onLatChange={setLat}
              onLonChange={setLon}
              scanRadius={scanRadius}
              onScanRadiusChange={handleScanRadiusChange}
              maxRadius={isViewer ? SUBSCRIBER_MAX_RADIUS : undefined}
            />
            {isHost && <GlideCalculator altitude={altitude} onAltitudeChange={setAltitude} />}
            <WeatherPanel
              lat={lat} lon={lon}
              refreshIntervalMs={WEATHER_REFRESH_MS}
              onWeatherUpdate={handleWeatherUpdate}
            />
          </div>
        </div>

        {/* ── Mission Control Video Feed ─────────────────────────────────── */}
        <VideoFeedPanel selectedAircraft={selectedAircraft} weather={weather} />

        {/* ── Upgrade prompt for free viewers ────────────────────────────── */}
        {isFreeViewer && (
          <div className="sar-card hud-border p-6 text-center">
            <Brain size={28} className="text-primary mx-auto mb-3" />
            <p className="font-heading text-sm font-700 text-foreground mb-1">AI Prediction &amp; Live Aircraft Feed</p>
            <p className="text-xs text-muted-foreground mb-3 max-w-sm mx-auto">
              Subscribe to unlock AI crash prediction, live aircraft tracking, and danger assessment.
            </p>
            <div className="text-[11px] font-mono text-primary">anands9408@gmail.com · UPI: anands9408@oksbi</div>
          </div>
        )}

        {/* ── AI Prediction Engine ─────────────────────────────────────────── */}
        {!isFreeViewer && <div className="sar-card hud-border overflow-hidden">
          <button
            onClick={() => setShowAIPanel((v) => !v)}
            className="w-full px-4 py-3 border-b border-border flex items-center gap-2 hover:bg-secondary/20 transition-colors"
            style={{ background: "hsl(var(--surface))" }}
          >
            <Brain size={14} className="text-primary" />
            <span className="font-heading text-sm font-700 tracking-widest">AI PREDICTION ENGINE</span>
            <span className="label-tag text-primary ml-1 text-[9px]">Google Gemini 3 Flash</span>
            {selectedAircraft && (
              <span className="label-tag text-primary ml-2">Ready: {selectedAircraft.callsign}</span>
            )}
            <div className="flex-1" />
            {showAIPanel ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {showAIPanel && (
            <AIPredictionPanel
              aircraft={selectedAircraft}
              physicsSummary={{
                aircraftVector: { x: 0, y: 0, magnitude: 0, direction: 0 },
                windVector: { x: 0, y: 0, magnitude: 0, direction: 0 },
                groundVector: { x: 0, y: 0, magnitude: selectedAircraft ? selectedAircraft.velocity * 0.514444 : 0, direction: selectedAircraft?.heading ?? 0 },
                displacement: 0, predictedPath: [], searchRadiusNow: 1000,
                confidenceNow: selectedAircraft ? 85 : 0,
                timeSinceLKP,
              }}
              weather={weather}
              riskScore={selectedDangerScore?.score}
              riskLevel={selectedDangerScore?.level}
              riskFactors={selectedDangerScore?.factors?.map((f) => ({ name: f.name, value: f.value, points: f.points }))}
            />
          )}
        </div>}

        {/* ── Danger Assessment — hidden for free viewers ───────────────── */}
        {!isFreeViewer && <div className="sar-card hud-border overflow-hidden">
          <button
            onClick={() => setShowDanger((v) => !v)}
            className="w-full px-4 py-3 border-b border-border flex items-center gap-2 hover:bg-secondary/20 transition-colors"
            style={{ background: "hsl(var(--surface))" }}
          >
            <Activity size={14} className="text-danger" />
            <span className="font-heading text-sm font-700 tracking-widest">DANGER ASSESSMENT</span>
            <span className="label-tag text-[9px] ml-2">Auto-risk scoring</span>
            <div className="flex-1" />
            {showDanger ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {showDanger && (
            <div style={{ minHeight: 300 }}>
              {showLiveAircraft && aircraft.length > 0 ? (
                <DangerAssessment
                  aircraft={aircraft}
                  weatherMap={weatherMap}
                  topN={15}
                  onHighRisk={handleHighRiskWithScore}
                  autoSaveIntervalSec={isHost ? 120 : 0}
                />
              ) : (
                <div className="p-8 text-center">
                  <Plane size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enable the aircraft feed to see real-time danger assessment.
                  </p>
                  <button onClick={toggleLive} className="mt-3 sar-btn-primary text-xs py-1.5 px-3">
                    Enable Feed
                  </button>
                </div>
              )}
            </div>
          )}
        </div>}

        {/* ── Host-Only Panels ─────────────────────────────────────────────── */}
        {isHost && (
          <>
            {/* Comm Satellites */}
            <div className="sar-card hud-border overflow-hidden">
              <button
                onClick={() => setShowSatPanel((v) => !v)}
                className="w-full px-4 py-3 border-b border-border flex items-center gap-2 hover:bg-secondary/20 transition-colors"
                style={{ background: "hsl(var(--surface))" }}
              >
                <Satellite size={14} className="text-primary" />
                <span className="font-heading text-sm font-700 tracking-widest">COMMUNICATION SATELLITES</span>
                <span className="label-tag ml-2 text-[9px]">ADS-B · LEO/GEO networks</span>
                <div className="flex-1" />
                {showSatPanel ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              {showSatPanel && <CommSatellitePanel isHostAuth={true} />}
            </div>

            {/* Subscriber Access Manager */}
            <div className="sar-card hud-border overflow-hidden">
              <button
                onClick={() => setShowViewerMgr((v) => !v)}
                className="w-full px-4 py-3 border-b border-border flex items-center gap-2 hover:bg-secondary/20 transition-colors"
                style={{ background: "hsl(var(--surface))" }}
              >
                <Shield size={14} className="text-primary" />
                <span className="font-heading text-sm font-700 tracking-widest">SUBSCRIBER ACCESS MANAGER</span>
                <span className="label-tag ml-2 text-[9px] text-primary">Host only · Email-based</span>
                <div className="flex-1" />
                {showViewerMgr ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              {showViewerMgr && <ViewerAccessManager />}
            </div>

            {/* Resource Table + Timeline */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ResourceTable />
              <div style={{ height: 380 }}><MissionTimeline /></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PredictionPlatform;
