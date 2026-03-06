/**
 * Prediction Platform — Optimized
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes vs previous version:
 *  • Aircraft feed: bounded box, 25 s refresh
 *  • Physics prediction runs in Web Worker (off main thread)
 *  • Weather refresh: 7 minutes
 *  • LKP localStorage writes only for selected aircraft
 *  • Scan radius is now a dynamic slider (100–2000 km) in CoordinatePanel
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import SARMap from "@/components/features/SARMap";
import ResourceTable from "@/components/features/ResourceTable";
import GlideCalculator from "@/components/features/GlideCalculator";
import MissionTimeline from "@/components/features/MissionTimeline";
import AircraftStatusCards from "@/components/features/AircraftStatusCards";
import CoordinatePanel from "@/components/features/CoordinatePanel";
import DangerAssessment from "@/components/features/DangerAssessment";
import PhysicsPanel from "@/components/features/PhysicsPanel";
import WeatherPanel from "@/components/features/WeatherPanel";
import { useAircraft } from "@/hooks/useAircraft";
import { usePredictionWorker } from "@/hooks/usePredictionWorker";
import { KMH_TO_MS } from "@/lib/physics";
import { buildKinematicState } from "@/lib/predictionEngine";
import type { LiveAircraft, KinematicState, WeatherData } from "@/types";
import { SEARCH_ZONES } from "@/constants/sar";
import {
  Radio, Wifi, WifiOff, RefreshCw,
  Plane, Activity, Calculator, ChevronDown, ChevronUp, MapPin, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { HostPinGate, isHostAuthenticated } from "@/components/features/HostPinGate";

const DEFAULT_RADIUS_KM   = 1500;    // default scan radius
const REFRESH_INTERVAL_MS = 25_000;  // 25 seconds
const WEATHER_REFRESH_MS  = 7 * 60 * 1000; // 7 minutes

const PredictionPlatform: React.FC = () => {
  // ── Target LKP state ─────────────────────────────────────────────────────
  const [lat, setLat] = useState(12.9716);
  const [lon, setLon] = useState(77.5946);
  const [altitude, setAltitude] = useState(30000);

  // ── Dynamic scan radius ───────────────────────────────────────────────────
  const [scanRadius, setScanRadius] = useState(DEFAULT_RADIUS_KM);

  // ── Host auth + live aircraft ─────────────────────────────────────────────
  const [showPinGate, setShowPinGate] = useState(false);
  const [hostAuthed, setHostAuthed] = useState(() => isHostAuthenticated());
  const [showLiveAircraft, setShowLiveAircraft] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<LiveAircraft | null>(null);

  // ── Weather ───────────────────────────────────────────────────────────────
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const weatherMapRef = useRef<Map<string, WeatherData>>(new Map());

  // ── UI collapse states ────────────────────────────────────────────────────
  const [showPhysics, setShowPhysics] = useState(true);
  const [showDanger, setShowDanger] = useState(true);

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
  useEffect(() => {
    setTimeSinceLKP(0);
  }, [selectedAircraft, lat, lon]);
  useEffect(() => {
    const timer = setInterval(() => setTimeSinceLKP((t) => t + 5), 5000);
    return () => clearInterval(timer);
  }, []);

  // ── Physics computation — Web Worker (off main thread) ────────────────────
  const { summary: physicsSummary, computing: physicsComputing } =
    usePredictionWorker(kinematicState, timeSinceLKP);

  // ── Aircraft feed (bounded) ───────────────────────────────────────────────
  const { aircraft, count, loading, error, lastUpdated, apiStatus, refresh } =
    useAircraft({
      enabled: showLiveAircraft,
      centerLat: lat,
      centerLon: lon,
      radiusKm: scanRadius,
      refreshInterval: REFRESH_INTERVAL_MS,
      windSpeedMs: weather ? weather.windSpeed * KMH_TO_MS : 5,
      windDirectionDeg: weather ? weather.windDirection : 0,
      selectedIcao24: selectedAircraft?.icao24 ?? null,
    });

  const toggleLive = () => {
    if (!showLiveAircraft) {
      if (!hostAuthed) {
        setShowPinGate(true);
        return;
      }
      toast.success(`Connecting — fetching aircraft within ${scanRadius} km...`);
    } else {
      setSelectedAircraft(null);
      toast.info("Live aircraft feed disabled.");
    }
    setShowLiveAircraft((v) => !v);
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
  }, []);

  const weatherMap = weatherMapRef.current;

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {showPinGate && (
        <HostPinGate
          onAuthenticated={handlePinSuccess}
          onClose={() => setShowPinGate(false)}
        />
      )}

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div
        className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <div>
          <h1 className="font-heading text-xl font-700 tracking-widest text-foreground">
            SAR PREDICTION PLATFORM
          </h1>
          <p className="text-xs text-muted-foreground">
            S31 · Physics Engine (Web Worker) · {scanRadius} km Scan Radius · {REFRESH_INTERVAL_MS / 1000}s refresh
          </p>
        </div>
        <div className="flex-1" />

        {showLiveAircraft && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          >
            <MapPin size={12} className="text-primary" />
            <span className="font-mono text-xs text-foreground">
              {loading ? "Scanning..." : `${count} aircraft within ${scanRadius} km`}
            </span>
          </div>
        )}

        <button
          onClick={toggleLive}
          className={`flex items-center gap-2 px-4 py-2 rounded font-heading text-xs font-700 tracking-wide border transition-all ${
            showLiveAircraft
              ? "bg-success/10 border-success text-success"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {showLiveAircraft ? <Wifi size={13} /> : <WifiOff size={13} />}
          {showLiveAircraft
            ? `${scanRadius} KM FEED: ON`
            : hostAuthed
            ? `${scanRadius} KM FEED: OFF`
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

      {/* ── API Status Banner ──────────────────────────────────────────────── */}
      {showLiveAircraft && (
        <div
          className={`px-6 py-2 flex flex-wrap items-center gap-3 border-b border-border text-xs ${
            apiStatus === "error"
              ? "bg-danger/5"
              : apiStatus === "limited"
              ? "bg-warning/5"
              : "bg-success/5"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              apiStatus === "error"
                ? "bg-danger"
                : apiStatus === "limited"
                ? "bg-warning animate-pulse"
                : "bg-success animate-pulse"
            }`}
          />
          {apiStatus === "ok" && (
            <span className="font-mono text-success">
              OpenSky · {count} airborne in {scanRadius} km ·{" "}
              {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
            </span>
          )}
          {apiStatus === "limited" && (
            <span className="font-mono text-warning">
              ⚠ Rate limited — showing last data
            </span>
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
        {/* ── Asset Status ─────────────────────────────────────────────────── */}
        <AircraftStatusCards />

        {/* ── Main Layout ──────────────────────────────────────────────────── */}
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
                    SEARCH MAP · {scanRadius} KM RADIUS
                  </span>
                  {showLiveAircraft && (
                    <span className="flex items-center gap-1 text-success">
                      <Radio size={10} className="animate-pulse" />
                      <span className="label-tag text-[9px] text-success">LIVE</span>
                    </span>
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
                      onClick={() => {
                        setSelectedAircraft(null);
                        setTimeSinceLKP(0);
                      }}
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
            {showPhysics ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
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
                {showDanger ? (
                  <ChevronUp size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground" />
                )}
              </button>
              {showDanger && (
                <div style={{ height: 400 }}>
                  {showLiveAircraft && aircraft.length > 0 ? (
                    <DangerAssessment
                      aircraft={aircraft}
                      weatherMap={weatherMap}
                      topN={15}
                    />
                  ) : (
                    <div className="p-6 text-center">
                      <Plane size={28} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enable the aircraft feed to see danger assessment.
                      </p>
                      <button
                        onClick={toggleLive}
                        className="mt-3 sar-btn-primary text-xs py-1.5 px-3"
                      >
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
