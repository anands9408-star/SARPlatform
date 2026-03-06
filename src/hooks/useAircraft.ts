
/**
 * SAR Aircraft Hook — Optimized
 * ─────────────────────────────────────────────────────────────────────────────
 * • Bounded box OR global fetch (radiusKm === 0 → no bbox, worldwide)
 * • 25-second refresh (was 15s — reduces rate-limit hits)
 * • Only writes LKP to localStorage for the selected aircraft (not all)
 * • Proper abort + cleanup on unmount / re-fetch
 * • Persists aircraft batch to OnSpace Cloud backend via sarStorage
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { LiveAircraft } from "@/types";
import { PredictionEngine, buildKinematicState } from "@/lib/predictionEngine";
import { saveAircraftBatch } from "@/lib/sarStorage";
import { GLOBAL_RADIUS } from "@/components/features/CoordinatePanel";

// ── Bounding box helper ────────────────────────────────────────────────────

const KM_PER_DEG_LAT = 111.32;

function buildBounds(
  lat: number,
  lon: number,
  radiusKm: number
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
      icao24:        (s[0] as string) || "unknown",
      callsign:      ((s[1] as string) || "N/A").trim() || "N/A",
      lat:           s[6] as number,
      lon:           s[5] as number,
      altitude:      s[7] ? Math.round((s[7] as number) * 3.28084) : 0,
      velocity:      s[9] ? Math.round((s[9] as number) * 1.94384) : 0,
      heading:       (s[10] as number) || 0,
      verticalRate:  s[11] ? Math.round((s[11] as number) * 196.85) : 0,
      onGround:      (s[8] as boolean) || false,
      lastContact:   (s[4] as number) || 0,
      originCountry: (s[2] as string) || "Unknown",
    }))
    .filter((a) => !a.onGround && a.altitude > 100);
}

// ── Hook ───────────────────────────────────────────────────────────────────

interface UseAircraftOptions {
  enabled: boolean;
  centerLat: number;
  centerLon: number;
  /** 100–2000 km for bounded fetch, or GLOBAL_RADIUS (0) for worldwide */
  radiusKm?: number;
  refreshInterval?: number;
  windSpeedMs?: number;
  windDirectionDeg?: number;
  selectedIcao24?: string | null;
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
  const [aircraft, setAircraft]       = useState<LiveAircraft[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiStatus, setApiStatus]     = useState<"ok" | "limited" | "error" | "idle">("idle");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  const isGlobal = radiusKm === GLOBAL_RADIUS;

  // Bounding box (only computed for bounded mode)
  const bounds = useMemo(
    () => (isGlobal ? null : buildBounds(centerLat, centerLon, radiusKm)),
    [Math.round(centerLat * 2) / 2, Math.round(centerLon * 2) / 2, radiusKm, isGlobal]
  );

  const fetchAircraft = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    try {
      // Build URL — no bbox params when global
      let url = "https://opensky-network.org/api/states/all";
      if (!isGlobal && bounds) {
        url +=
          `?lamin=${bounds.minLat.toFixed(3)}&lomin=${bounds.minLon.toFixed(3)}` +
          `&lamax=${bounds.maxLat.toFixed(3)}&lomax=${bounds.maxLon.toFixed(3)}`;
      }

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

      const json   = await res.json();
      const parsed = parseOpenSkyStates(json.states || []);

      // ── LKP localStorage — selected aircraft only ──────────────────────
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

      // ── Backend persistence — save top 50 by altitude + selected ──────
      const toSave = [
        ...parsed.filter((a) => a.icao24 === selectedIcao24),
        ...parsed
          .filter((a) => a.icao24 !== selectedIcao24)
          .sort((a, b) => b.altitude - a.altitude)
          .slice(0, 49),
      ].slice(0, 50);

      saveAircraftBatch(toSave, radiusKm); // fire-and-forget

      setAircraft(parsed);
      setLastUpdated(new Date());
      setApiStatus("ok");
      setError(null);
      console.log(
        `[SAR] ${parsed.length} aircraft ${isGlobal ? "worldwide" : `within ${radiusKm} km`}`
      );
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("[SAR] Fetch error:", err);
      setApiStatus("error");
      setError(`API Error: ${err.message || "Network failed"} — using cached data`);
    } finally {
      setLoading(false);
    }
  }, [bounds, isGlobal, radiusKm, windSpeedMs, windDirectionDeg, selectedIcao24]);

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
    count:       aircraft.length,
    loading,
    error,
    lastUpdated,
    apiStatus,
    refresh: fetchAircraft,
  };
}
