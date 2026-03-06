/**
 * SAR Backend Storage
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists aircraft history, weather snapshots, and risk assessments to
 * OnSpace Cloud (Supabase-compatible).
 *
 * All writes are fire-and-forget (no blocking the UI).
 * All reads return typed results for history dashboards.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import type { LiveAircraft, WeatherData } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RiskFactor {
  label: string;
  score: number;
}

export interface RiskEntry {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude_ft: number;
  risk_score: number;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  factors: RiskFactor[];
}

export interface AircraftHistoryRow {
  id: string;
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude_ft: number | null;
  velocity_kts: number | null;
  heading: number | null;
  vertical_rate_fpm: number | null;
  origin_country: string | null;
  scan_radius_km: number | null;
  recorded_at: string;
}

export interface WeatherSnapshotRow {
  id: string;
  lat: number;
  lon: number;
  temperature_c: number | null;
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  visibility_m: number | null;
  weather_code: number | null;
  description: string | null;
  is_dangerous: boolean;
  recorded_at: string;
}

export interface RiskAssessmentRow {
  id: string;
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude_ft: number | null;
  risk_score: number;
  risk_level: string;
  factors: RiskFactor[] | null;
  recorded_at: string;
}

// ── Write helpers ──────────────────────────────────────────────────────────

/**
 * Bulk-insert a batch of aircraft positions.
 * Called after each successful OpenSky fetch (top-N or selected aircraft).
 */
export async function saveAircraftBatch(
  aircraft: LiveAircraft[],
  scanRadiusKm: number
): Promise<void> {
  if (!aircraft.length) return;
  const rows = aircraft.map((a) => ({
    icao24:             a.icao24,
    callsign:           a.callsign || null,
    lat:                a.lat,
    lon:                a.lon,
    altitude_ft:        a.altitude || null,
    velocity_kts:       a.velocity || null,
    heading:            a.heading || null,
    vertical_rate_fpm:  a.verticalRate || null,
    origin_country:     a.originCountry || null,
    scan_radius_km:     scanRadiusKm === 0 ? null : scanRadiusKm,   // null = global
  }));

  const { error } = await supabase.from("aircraft_history").insert(rows);
  if (error) console.error("[SAR Storage] aircraft_history insert:", error.message);
  else console.log(`[SAR Storage] Saved ${rows.length} aircraft history rows`);
}

/**
 * Save a single weather snapshot for the current target location.
 */
export async function saveWeatherSnapshot(
  lat: number,
  lon: number,
  weather: WeatherData
): Promise<void> {
  const { error } = await supabase.from("weather_snapshots").insert({
    lat,
    lon,
    temperature_c:      weather.temperature ?? null,
    wind_speed_kmh:     weather.windSpeed ?? null,
    wind_direction_deg: weather.windDirection ?? null,
    visibility_m:       weather.visibility ?? null,
    weather_code:       weather.weatherCode ?? null,
    description:        weather.description ?? null,
    is_dangerous:       weather.isDangerous ?? false,
  });
  if (error) console.error("[SAR Storage] weather_snapshots insert:", error.message);
  else console.log("[SAR Storage] Weather snapshot saved");
}

/**
 * Save risk assessment rows for high-risk aircraft.
 * Only persists CRITICAL and HIGH entries to avoid bloat.
 */
export async function saveRiskAssessments(entries: RiskEntry[]): Promise<void> {
  const filtered = entries.filter(
    (e) => e.risk_level === "CRITICAL" || e.risk_level === "HIGH"
  );
  if (!filtered.length) return;

  const rows = filtered.map((e) => ({
    icao24:     e.icao24,
    callsign:   e.callsign || null,
    lat:        e.lat,
    lon:        e.lon,
    altitude_ft: e.altitude_ft || null,
    risk_score: e.risk_score,
    risk_level: e.risk_level,
    factors:    e.factors,
  }));

  const { error } = await supabase.from("risk_assessments").insert(rows);
  if (error) console.error("[SAR Storage] risk_assessments insert:", error.message);
  else console.log(`[SAR Storage] Saved ${rows.length} risk entries`);
}

// ── Read helpers ───────────────────────────────────────────────────────────

/** Fetch the last N aircraft history rows for a given ICAO24 */
export async function getAircraftHistory(
  icao24: string,
  limit = 50
): Promise<AircraftHistoryRow[]> {
  const { data, error } = await supabase
    .from("aircraft_history")
    .select("*")
    .eq("icao24", icao24)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[SAR Storage] getAircraftHistory:", error.message);
  return (data as AircraftHistoryRow[]) ?? [];
}

/** Fetch recent weather snapshots near a location */
export async function getRecentWeather(
  lat: number,
  lon: number,
  radiusDeg = 0.5,
  limit = 20
): Promise<WeatherSnapshotRow[]> {
  const { data, error } = await supabase
    .from("weather_snapshots")
    .select("*")
    .gte("lat", lat - radiusDeg)
    .lte("lat", lat + radiusDeg)
    .gte("lon", lon - radiusDeg)
    .lte("lon", lon + radiusDeg)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[SAR Storage] getRecentWeather:", error.message);
  return (data as WeatherSnapshotRow[]) ?? [];
}

/** Fetch the latest high-risk assessments */
export async function getHighRiskHistory(
  limit = 30
): Promise<RiskAssessmentRow[]> {
  const { data, error } = await supabase
    .from("risk_assessments")
    .select("*")
    .in("risk_level", ["CRITICAL", "HIGH"])
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[SAR Storage] getHighRiskHistory:", error.message);
  return (data as RiskAssessmentRow[]) ?? [];
}
