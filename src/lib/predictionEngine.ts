/**
 * SAR Prediction Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Maintains a persistent, signal-loss-tolerant prediction store.
 * Saves Last Known Position (LKP) state to localStorage so predictions
 * survive page refresh and network outages.
 *
 * On signal loss:
 *  1. Load last saved KinematicState from localStorage
 *  2. Compute elapsed time since LKP
 *  3. Continue physics-based prediction from that state
 *  4. Expand search radius and decay confidence over elapsed time
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { KinematicState, StoredPrediction, PredictedPoint } from "@/types";
import {
  generatePredictedPath,
  computePhysicsSummary,
  confidenceAtTime,
  searchRadiusAtTime,
} from "@/lib/physics";

const STORAGE_KEY = "sar_predictions";
const MAX_STORED = 20;

// ── Storage Helpers ────────────────────────────────────────────────────────

function loadStore(): Record<string, StoredPrediction> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, StoredPrediction>): void {
  try {
    // Keep only most recent MAX_STORED entries
    const entries = Object.entries(store);
    if (entries.length > MAX_STORED) {
      entries.sort((a, b) => b[1].storedAt - a[1].storedAt);
      const trimmed = Object.fromEntries(entries.slice(0, MAX_STORED));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    console.warn("SAR PredictionEngine: localStorage write failed");
  }
}

// ── Core Engine ────────────────────────────────────────────────────────────

export const PredictionEngine = {
  /**
   * Store / update the Last Known Position for an aircraft.
   * Called each time we receive fresh OpenSky data.
   */
  updateLKP(state: KinematicState, icao24: string, callsign: string): void {
    const store = loadStore();
    const predictions = generatePredictedPath(state, 60, 1); // 60-minute path
    store[icao24] = {
      lkpState: state,
      predictions,
      storedAt: Date.now(),
      icao24,
      callsign,
    };
    saveStore(store);
  },

  /**
   * Get predictions for an aircraft.
   * If signal was lost (aircraft disappeared from live feed),
   * continues prediction from last saved LKP with time-elapsed expansion.
   */
  getPrediction(icao24: string): {
    found: boolean;
    signalLost: boolean;
    elapsedSeconds: number;
    predictions: PredictedPoint[];
    confidence: number;
    searchRadius: number;
    lkpState: KinematicState | null;
    callsign: string;
  } {
    const store = loadStore();
    const entry = store[icao24];

    if (!entry) {
      return {
        found: false,
        signalLost: false,
        elapsedSeconds: 0,
        predictions: [],
        confidence: 0,
        searchRadius: 0,
        lkpState: null,
        callsign: "",
      };
    }

    const elapsedSeconds = (Date.now() - entry.storedAt) / 1000;
    const confidence = confidenceAtTime(elapsedSeconds);
    const searchRadius = searchRadiusAtTime(500, elapsedSeconds);

    // Re-generate predictions offset by elapsed time
    const updatedPredictions = entry.predictions
      .map((p) => ({
        ...p,
        time: p.time + elapsedSeconds,
        confidence: confidenceAtTime(p.time + elapsedSeconds),
        uncertaintyRadius: searchRadiusAtTime(500, p.time + elapsedSeconds),
      }))
      .filter((p) => p.confidence > 2);

    return {
      found: true,
      signalLost: elapsedSeconds > 30, // signal considered lost after 30 seconds
      elapsedSeconds,
      predictions: updatedPredictions,
      confidence,
      searchRadius,
      lkpState: entry.lkpState,
      callsign: entry.callsign,
    };
  },

  /**
   * List all stored predictions (for lost aircraft dashboard).
   */
  getAllLKPs(): StoredPrediction[] {
    const store = loadStore();
    return Object.values(store).sort((a, b) => b.storedAt - a.storedAt);
  },

  /**
   * Clear a specific aircraft's stored prediction.
   */
  clear(icao24: string): void {
    const store = loadStore();
    delete store[icao24];
    saveStore(store);
  },

  /**
   * Clear all stored predictions.
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * List all aircraft currently considered "lost" (stored but not in live feed).
   */
  getLostAircraft(liveIcao24Set: Set<string>): StoredPrediction[] {
    const store = loadStore();
    return Object.values(store).filter(
      (entry) =>
        !liveIcao24Set.has(entry.icao24) &&
        Date.now() - entry.storedAt < 3_600_000 // within last hour
    );
  },
};

// ── Helper: Build KinematicState from raw OpenSky data ─────────────────────

export function buildKinematicState(
  lat: number,
  lon: number,
  heading: number,
  velocityKts: number,
  altitudeFt: number,
  verticalRateFpm: number,
  windSpeedMs: number = 5,      // default 5 m/s if weather unavailable
  windDirectionDeg: number = 0  // default calm from North
): KinematicState {
  return {
    lat,
    lon,
    heading,
    velocity: velocityKts,
    altitude: altitudeFt,
    verticalRate: verticalRateFpm,
    windSpeed: windSpeedMs,
    windDirection: windDirectionDeg,
    timestamp: Date.now(),
  };
}
