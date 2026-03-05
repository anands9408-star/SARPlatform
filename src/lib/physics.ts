/**
 * SAR Physics Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements:
 *  • Vector decomposition (heading/wind → Cartesian Vx, Vy)
 *  • Relative velocity (ground speed = airspeed + wind vector)
 *  • Basic kinematics: v = u + at | s = ut + ½at² | v² = u² + 2as
 *  • Coordinate system: WGS-84 lat/lon ↔ local ENU (East-North-Up)
 *  • Time-based uncertainty expansion (confidence decay + radius growth)
 *  • Aerodynamic drift correction
 *  • Predicted path generation (series of future positions)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  KinematicState,
  VectorComponents,
  PredictedPoint,
  PhysicsSummary,
} from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────
export const EARTH_RADIUS_M = 6_371_000; // metres
export const KTS_TO_MS = 0.514444;       // 1 knot = 0.514444 m/s
export const FPM_TO_MS = 0.00508;        // 1 ft/min = 0.00508 m/s
export const KMH_TO_MS = 1 / 3.6;       // 1 km/h = 0.2778 m/s
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// Confidence decay constant — confidence halves every DECAY_HALF_LIFE seconds
const DECAY_HALF_LIFE = 300; // 5 minutes
// Base uncertainty radius per second of elapsed time (metres/second)
const UNCERTAINTY_GROWTH_RATE = 25; // metres per second without contact
// Minimum confidence floor
const MIN_CONFIDENCE = 5;

// ── Vector Operations ──────────────────────────────────────────────────────

/**
 * Decompose a speed (m/s) and bearing (degrees, clockwise from North)
 * into East (x) and North (y) components in m/s.
 */
export function bearingToVector(speedMs: number, bearingDeg: number): VectorComponents {
  const rad = bearingDeg * DEG_TO_RAD;
  const x = speedMs * Math.sin(rad);  // East
  const y = speedMs * Math.cos(rad);  // North
  return {
    x,
    y,
    magnitude: speedMs,
    direction: bearingDeg,
  };
}

/**
 * Add two 2-D vectors (East-North) and return resultant magnitude + bearing.
 */
export function addVectors(a: VectorComponents, b: VectorComponents): VectorComponents {
  const x = a.x + b.x;
  const y = a.y + b.y;
  const magnitude = Math.sqrt(x * x + y * y);
  let direction = Math.atan2(x, y) * RAD_TO_DEG;
  if (direction < 0) direction += 360;
  return { x, y, magnitude, direction };
}

/**
 * Meteorological wind convention → aircraft-impact vector.
 * Wind FROM 270° (west) = wind blowing EAST = +x component.
 * We need the "wind acting on aircraft" vector (opposite of FROM direction).
 */
export function windVector(speedMs: number, fromDegrees: number): VectorComponents {
  // Wind FROM N → blows south → aircraft drifts south → direction = 180°
  const toDirection = (fromDegrees + 180) % 360;
  return bearingToVector(speedMs, toDirection);
}

// ── Coordinate Conversion ─────────────────────────────────────────────────

/**
 * Convert (lat, lon) to local ENU metres from an origin point.
 * Uses equirectangular projection — accurate within ~100 km.
 */
export function latLonToENU(
  lat: number,
  lon: number,
  originLat: number,
  originLon: number
): { east: number; north: number } {
  const dLat = (lat - originLat) * DEG_TO_RAD;
  const dLon = (lon - originLon) * DEG_TO_RAD;
  const north = dLat * EARTH_RADIUS_M;
  const east = dLon * EARTH_RADIUS_M * Math.cos(originLat * DEG_TO_RAD);
  return { east, north };
}

/**
 * Convert ENU offset (metres) back to (lat, lon).
 */
export function enuToLatLon(
  east: number,
  north: number,
  originLat: number,
  originLon: number
): { lat: number; lon: number } {
  const dLat = north / EARTH_RADIUS_M;
  const dLon = east / (EARTH_RADIUS_M * Math.cos(originLat * DEG_TO_RAD));
  return {
    lat: originLat + dLat * RAD_TO_DEG,
    lon: originLon + dLon * RAD_TO_DEG,
  };
}

// ── Kinematics ────────────────────────────────────────────────────────────

/**
 * Standard kinematic equations.
 * All units in metres and seconds (SI).
 */
export const kinematics = {
  /** v = u + at → final velocity */
  finalVelocity: (u: number, a: number, t: number) => u + a * t,
  /** s = ut + ½at² → displacement */
  displacement: (u: number, a: number, t: number) => u * t + 0.5 * a * t * t,
  /** v² = u² + 2as → final velocity from distance */
  finalVelocityFromDist: (u: number, a: number, s: number) =>
    Math.sqrt(Math.max(0, u * u + 2 * a * s)),
  /** t = (v - u) / a → time to reach velocity */
  timeToVelocity: (u: number, v: number, a: number) =>
    a !== 0 ? (v - u) / a : Infinity,
};

// ── Aerodynamic Drift ─────────────────────────────────────────────────────

/**
 * Estimate wind drift effect on trajectory.
 * Returns lateral drift distance (metres) over elapsed time.
 * Based on cross-wind component = |V_wind| * sin(angle between heading and wind)
 */
export function calculateDrift(
  aircraftHeadingDeg: number,
  windFromDeg: number,
  windSpeedMs: number,
  timeSeconds: number
): number {
  const angleDiff = ((windFromDeg + 180 - aircraftHeadingDeg + 360) % 360) * DEG_TO_RAD;
  const crossWindMs = Math.abs(windSpeedMs * Math.sin(angleDiff));
  return crossWindMs * timeSeconds; // metres
}

// ── Uncertainty Expansion ─────────────────────────────────────────────────

/**
 * Confidence decreases exponentially with time since last known position.
 * C(t) = 100 × e^(−λt)   where λ = ln(2) / T½
 */
export function confidenceAtTime(timeSinceLKP: number): number {
  const lambda = Math.log(2) / DECAY_HALF_LIFE;
  const c = 100 * Math.exp(-lambda * timeSinceLKP);
  return Math.max(MIN_CONFIDENCE, c);
}

/**
 * Search radius grows quadratically with time (uncertainty cone):
 * R(t) = R₀ + k·t + ½·k_growth·t²
 */
export function searchRadiusAtTime(
  baseRadius: number,
  timeSinceLKP: number
): number {
  return baseRadius + UNCERTAINTY_GROWTH_RATE * timeSinceLKP +
    0.5 * 0.5 * timeSinceLKP * timeSinceLKP;
}

// ── Prediction Path ───────────────────────────────────────────────────────

/**
 * Generate future predicted positions using physics.
 * Returns an array of predicted points at 1-minute intervals up to maxMinutes.
 */
export function generatePredictedPath(
  state: KinematicState,
  maxMinutes = 30,
  stepMinutes = 1
): PredictedPoint[] {
  const points: PredictedPoint[] = [];

  // Aircraft velocity vector (m/s)
  const airspeedMs = state.velocity * KTS_TO_MS;
  const aircraftVec = bearingToVector(airspeedMs, state.heading);

  // Wind vector acting on aircraft (m/s)
  const windSpeedMs = state.windSpeed;
  const windVec = windVector(windSpeedMs, state.windDirection);

  // Ground velocity = airspeed vector + wind vector (relative velocity)
  const groundVec = addVectors(aircraftVec, windVec);

  // Vertical rate (m/s)
  const vRateMs = state.verticalRate * FPM_TO_MS;

  let currentLat = state.lat;
  let currentLon = state.lon;
  let currentAlt = state.altitude;
  let currentSpeedKts = state.velocity;

  for (let step = stepMinutes; step <= maxMinutes; step += stepMinutes) {
    const dt = step * 60; // total seconds from LKP

    // Kinematic displacement from origin using s = ut + ½at²
    // We assume near-constant velocity (a ≈ 0 for cruise, slight decel on descent)
    const decelerationMs2 = currentAlt < 5000 ? -0.05 : 0; // slight decel if low
    const dispEast = kinematics.displacement(groundVec.x, 0, dt);
    const dispNorth = kinematics.displacement(groundVec.y, 0, dt);

    // Final velocity at this time step
    const finalGroundSpeedMs = kinematics.finalVelocity(
      groundVec.magnitude,
      decelerationMs2,
      stepMinutes * 60
    );
    currentSpeedKts = (finalGroundSpeedMs / KTS_TO_MS);

    // New position
    const pos = enuToLatLon(dispEast, dispNorth, state.lat, state.lon);
    currentLat = pos.lat;
    currentLon = pos.lon;

    // Altitude change
    currentAlt = Math.max(0, state.altitude + vRateMs * dt * (1 / FPM_TO_MS) / 60);

    // Uncertainty
    const confidence = confidenceAtTime(dt);
    const uncertaintyRadius = searchRadiusAtTime(500, dt);

    points.push({
      lat: currentLat,
      lon: currentLon,
      altitude: currentAlt,
      velocity: Math.max(0, currentSpeedKts),
      time: dt,
      confidence,
      uncertaintyRadius,
    });

    // Stop if aircraft would have landed
    if (currentAlt <= 0) break;
  }

  return points;
}

// ── Full Physics Summary ──────────────────────────────────────────────────

/**
 * Compute the full physics summary for an aircraft in distress.
 */
export function computePhysicsSummary(
  state: KinematicState,
  timeSinceLKP: number = 0
): PhysicsSummary {
  const airspeedMs = state.velocity * KTS_TO_MS;
  const aircraftVector = bearingToVector(airspeedMs, state.heading);

  const windSpeedMs = state.windSpeed;
  const windVec = windVector(windSpeedMs, state.windDirection);

  const groundVector = addVectors(aircraftVector, windVec);

  const predictedPath = generatePredictedPath(state, 30, 1);
  const displacement = groundVector.magnitude * 60; // metres per minute

  return {
    aircraftVector,
    windVector: windVec,
    groundVector,
    displacement,
    predictedPath,
    searchRadiusNow: searchRadiusAtTime(500, timeSinceLKP),
    confidenceNow: confidenceAtTime(timeSinceLKP),
    timeSinceLKP,
  };
}

// ── Danger Scoring from Physics ────────────────────────────────────────────

/**
 * Score probability of crash using aerodynamic & kinematic factors.
 * Returns 0 (safe) → 100 (imminent danger).
 */
export function computeCrashProbability(
  altitude: number,        // feet
  verticalRate: number,    // ft/min (negative = descending)
  velocity: number,        // knots
  windSpeedMs: number,     // m/s
  heading: number,
  windFromDeg: number
): number {
  let score = 0;

  // Altitude risk (low altitude = high risk)
  if (altitude < 1000) score += 35;
  else if (altitude < 3000) score += 20;
  else if (altitude < 8000) score += 10;

  // Descent rate risk (rapid descent)
  if (verticalRate < -2000) score += 30;
  else if (verticalRate < -1000) score += 15;
  else if (verticalRate < -500) score += 7;

  // Speed anomaly (too slow or too fast)
  if (velocity < 80 || velocity > 600) score += 15;
  else if (velocity < 120 || velocity > 450) score += 7;

  // Wind severity (high crosswind = instability)
  const crossWindDrift = calculateDrift(heading, windFromDeg, windSpeedMs, 60);
  if (crossWindDrift > 5000) score += 20;
  else if (crossWindDrift > 2000) score += 10;
  else if (crossWindDrift > 500) score += 4;

  return Math.min(100, score);
}
