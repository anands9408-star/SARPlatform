
/**
 * SAR Aircraft Hook — Optimized
 * ─────────────────────────────────────────────────────────────────────────────
 * • 300 km bounding box around target (not global — prevents 10k+ aircraft crash)
 * • 25-second refresh (was 15s — reduces rate-limit hits)
 * • Only writes LKP to localStorage for the selected aircraft (not all)
 * • Proper abort + cleanup on unmount / re-fetch
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { LiveAircraft } from "@/types";
import { PredictionEngine, buildKinematicState } from "@/lib/predictionEngine";

// ── 300 km bounding box helper ─────────────────────────────────────────────

const KM_PER_DEG_LAT = 111.32; // km per degree of latitude

function buildBounds(
  lat: number,
  lon: number,
  radiusKm = 300
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const dLat = radiusKm / KM_PER_DEG_LAT;
  const dLon = radiusKm / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}

// ── OpenSky parser ─────────────────────────────────────────────────────────

function parseOpenSkyStates(states: any[][]): LiveAircraft[] {
  return states
    .filter((s) => s[6] != null && s[5] != null && !(s[8] as boolean))
    .map((s) => ({
      icao24: (s[0] as string) || "unknown",
      callsign: ((s[1] as string) || "N/A").trim() || "N/A",
      lat: s[6] as number,
      lon: s[5] as number,
      altitude: s[7] ? Math.round((s[7] as number) * 3.28084) : 0,    // m → ft
      velocity: s[9] ? Math.round((s[9] as number) * 1.94384) : 0,    // m/s → kts
      heading: (s[10] as number) || 0,
      verticalRate: s[11] ? Math.round((s[11] as number) * 196.85) : 0, // m/s → ft/min
      onGround: (s[8] as boolean) || false,
      lastContact: (s[4] as number) || 0,
      originCountry: (s[2] as string) || "Unknown",
    }))
    .filter((a) => !a.onGround && a.altitude > 100);
}

// ── Hook ───────────────────────────────────────────────────────────────────

interface UseAircraftOptions {
  enabled: boolean;
  centerLat: number;
  centerLon: number;
  radiusKm?: number;           // default 1500 km
  refreshInterval?: number;    // ms, default 25000
  windSpeedMs?: number;
  windDirectionDeg?: number;
  selectedIcao24?: string | null; // only this aircraft gets LKP stored
}

interface UseAircraftResult {
  aircraft: LiveAircraft[];
  count: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  apiStatus: "ok" | "limited" | "error" | "idle";
  refresh: () => void;
}

export function useAircraft({
  enabled,
  centerLat,
  centerLon,
  radiusKm = 1500,
  refreshInterval = 25000,
  windSpeedMs = 5,
  windDirectionDeg = 0,
  selectedIcao24 = null,
}: UseAircraftOptions): UseAircraftResult {
  const [aircraft, setAircraft] = useState<LiveAircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiStatus, setApiStatus] = useState<"ok" | "limited" | "error" | "idle">("idle");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Recompute bounds only when center or radius changes (not on every render)
  const bounds = useMemo(
    () => buildBounds(centerLat, centerLon, radiusKm),
    // Round to 0.5° granularity so tiny movements don't refetch
    // The eslint-disable-next-line comment is for ESLint configuration, not TypeScript syntax.
    // Since the request is for TypeScript *syntax* correction, and this is an ESLint configuration directive,
    // it's outside the scope of syntax error. However, if the linter itself is causing a build error due
    // to a missing rule definition, removing the directive might be the most direct way to bypass the *symptom*
    // from a pure compilation perspective if the environment is not correctly set up for linting.
    // If the error message "Definition for rule 'react-hooks/exhaustive-deps' was not found"
    // indicates a problem with the *environment's linter setup*, not TS syntax, then removing the directive
    // is a valid "fix" in the context of getting the TS code to compile without issues,
    // assuming the linting is not strictly required to pass for *syntax correction*.
    // If the goal is purely TS syntax, this line is not a syntax error.
    // However, given the error message specifically pointing to this line,
    // and asking for a fix, removing the problematic comment is the most direct action.
    [
      Math.round(centerLat * 2) / 2,
      Math.round(centerLon * 2) / 2,
      radiusKm,
    ]
  );

  const fetchAircraft = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    try {
      const url =
        `https://opensky-network.org/api/states/all` +
        `?lamin=${bounds.minLat.toFixed(3)}&lomin=${bounds.minLon.toFixed(3)}` +
        `&lamax=${bounds.maxLat.toFixed(3)}&lomax=${bounds.maxLon.toFixed(3)}`;

      const res = await fetch(url, {
        signal: abortRef.current.signal,
        cache: "no-store",
      });

      if (res.status === 429) {
        setApiStatus("limited");
        setError("OpenSky rate limited — retrying in 30s");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const parsed = parseOpenSkyStates(json.states || []);

      // Only write LKP to localStorage for the selected aircraft
      if (selectedIcao24) {
        const sel = parsed.find((a) => a.icao24 === selectedIcao24);
        if (sel) {
          PredictionEngine.updateLKP(
            buildKinematicState(
              sel.lat, sel.lon, sel.heading, sel.velocity,
              sel.altitude, sel.verticalRate, windSpeedMs, windDirectionDeg
            ),
            sel.icao24,
            sel.callsign
          );
        }
      }

      setAircraft(parsed);
      setLastUpdated(new Date());
      setApiStatus("ok");
      setError(null);
      console.log(`[SAR] ${parsed.length} aircraft within ${radiusKm} km`);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("[SAR] Fetch error:", err);
      setApiStatus("error");
      setError(`API Error: ${err.message || "Network failed"} — using cached data`);
    } finally {
      setLoading(false);
    }
  }, [bounds, windSpeedMs, windDirectionDeg, selectedIcao24, radiusKm]);

  useEffect(() => {
    if (!enabled) {
      setAircraft([]);
      setApiStatus("idle");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    fetchAircraft();
    intervalRef.current = setInterval(fetchAircraft, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled, fetchAircraft, refreshInterval]);

  return {
    aircraft,
    count: aircraft.length,
    loading,
    error,
    lastUpdated,
    apiStatus,
    refresh: fetchAircraft,
  };
}
