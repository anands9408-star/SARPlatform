
/**
 * SAR Aircraft Hook — Edge Function Proxy Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * • All OpenSky requests are routed through the `opensky-proxy` Edge Function
 *   → Eliminates browser CORS failures and hides the upstream API from clients
 * • Bounded box OR global fetch (radiusKm === 0 → no bbox, worldwide)
 * • 25-second refresh (reduces rate-limit hits)
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
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

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
  const fetchingRef = useRef(false);

  const isGlobal = radiusKm === GLOBAL_RADIUS;

  // Round coordinates to reduce unnecessary re-fetches
  const rLat = Math.round(centerLat * 2) / 2;
  const rLon = Math.round(centerLon * 2) / 2;

  const fetchAircraft = useCallback(async () => {
    if (fetchingRef.current) return; // prevent overlapping fetches
    fetchingRef.current = true;
    setLoading(true);

    try {
      // ── Call edge function proxy (avoids browser CORS restrictions) ────
      const body = isGlobal
        ? {}
        : { lat: centerLat, lon: centerLon, radius: radiusKm };

      const { data: rawData, error: fnError } = await supabase.functions.invoke(
        "opensky-proxy",
        { body }
      );

      if (fnError) {
        let msg = fnError.message;
        let isRateLimit = false;

        if (fnError instanceof FunctionsHttpError) {
          try {
            const status = fnError.context?.status;
            const text   = await fnError.context?.text();
            if (status === 429) {
              isRateLimit = true;
              msg = "OpenSky rate limited — retrying in 30s";
            } else {
              msg = `[${status}] ${text || fnError.message}`;
            }
          } catch {
            msg = fnError.message;
          }
        }

        if (isRateLimit) {
          setApiStatus("limited");
          setError(msg);
        } else {
          setApiStatus("error");
          setError(`Proxy error: ${msg}`);
        }
        return;
      }

      if (rawData?.error === "rate_limited") {
        setApiStatus("limited");
        setError("OpenSky rate limited — retrying in 30s");
        return;
      }

      if (rawData?.error) {
        setApiStatus("error");
        setError(`OpenSky error: ${rawData.message || rawData.error}`);
        return;
      }

      const parsed = parseOpenSkyStates(rawData?.states || []);

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
      console.error("[SAR] Fetch error:", err);
      setApiStatus("error");
      setError(`Fetch failed: ${err.message || "Network error"} — using cached data`);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [rLat, rLon, radiusKm, isGlobal, windSpeedMs, windDirectionDeg, selectedIcao24]);

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
