export interface MissionData {
  weather: string;
  windSpeed: number;
  windDirection: string;
  trajectory: string;
  crashZone: string;
  flightRoute: string;
  lat: number;
  lon: number;
  eltSignal: string;
}

export interface SearchZone {
  name: string;
  radius: number;
  color: string;
  probability: number;
  resource: string;
}

export interface MissionLog {
  id: string;
  time: string;
  event: string;
  severity: "info" | "warning" | "critical";
}

export interface AircraftStatus {
  id: string;
  callsign: string;
  type: string;
  status: string;
  fuel: number;
  sector: string;
}

// ─── Live Aircraft from OpenSky ─────────────────────────────────────
export interface LiveAircraft {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;     // feet
  velocity: number;     // knots
  heading: number;      // degrees true
  verticalRate: number; // ft/min
  onGround: boolean;
  lastContact: number;  // unix timestamp
  originCountry: string;
}

// ─── Physics / Kinematics State ──────────────────────────────────────
export interface KinematicState {
  lat: number;
  lon: number;
  heading: number;       // degrees
  velocity: number;      // knots
  altitude: number;      // feet
  verticalRate: number;  // ft/min
  windSpeed: number;     // m/s
  windDirection: number; // degrees FROM (met convention)
  timestamp: number;     // unix ms
}

export interface VectorComponents {
  x: number; // east component m/s
  y: number; // north component m/s
  magnitude: number;
  direction: number; // degrees
}

export interface PredictedPoint {
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  time: number;          // seconds from now
  confidence: number;    // 0–100%
  uncertaintyRadius: number; // metres
}

export interface PhysicsSummary {
  aircraftVector: VectorComponents;
  windVector: VectorComponents;
  groundVector: VectorComponents;    // relative velocity = aircraft + wind
  displacement: number;              // metres per minute
  predictedPath: PredictedPoint[];
  searchRadiusNow: number;           // metres
  confidenceNow: number;             // %
  timeSinceLKP: number;              // seconds since last known position
}

// ─── Danger Assessment ───────────────────────────────────────────────
export interface DangerScore {
  icao24: string;
  callsign: string;
  score: number;         // 0–100, higher = more danger
  level: "SAFE" | "WATCH" | "WARNING" | "CRITICAL";
  factors: DangerFactor[];
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  velocity: number;
}

export interface DangerFactor {
  name: string;
  value: string;
  severity: "low" | "medium" | "high";
  points: number;
}

// ─── Weather ─────────────────────────────────────────────────────────
export interface WeatherData {
  lat: number;
  lon: number;
  temperature: number;       // °C
  windSpeed: number;         // km/h
  windDirection: number;     // degrees
  precipitation: number;     // mm/h
  weatherCode: number;       // WMO code
  weatherDescription: string;
  visibility: number;        // km (estimated from WMO code)
  dangerLevel: "SAFE" | "CAUTION" | "DANGER" | "EXTREME";
  fetchTime: number;         // unix ms
}

// ─── Prediction Engine Storage ────────────────────────────────────────
export interface StoredPrediction {
  lkpState: KinematicState;  // Last Known Position state
  predictions: PredictedPoint[];
  storedAt: number;
  icao24: string;
  callsign: string;
}
