/**
 * Weather API Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses Open-Meteo (completely free, no API key required).
 * https://open-meteo.com/
 *
 * WMO Weather Codes → human readable + danger assessment.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { WeatherData } from "@/types";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// ── WMO Code Lookup ────────────────────────────────────────────────────────

interface WMOInfo {
  description: string;
  dangerLevel: WeatherData["dangerLevel"];
  visibilityKm: number;
}

const WMO_CODES: Record<number, WMOInfo> = {
  0:  { description: "Clear Sky",                         dangerLevel: "SAFE",    visibilityKm: 50 },
  1:  { description: "Mainly Clear",                      dangerLevel: "SAFE",    visibilityKm: 40 },
  2:  { description: "Partly Cloudy",                     dangerLevel: "SAFE",    visibilityKm: 30 },
  3:  { description: "Overcast",                          dangerLevel: "CAUTION", visibilityKm: 20 },
  45: { description: "Fog",                               dangerLevel: "DANGER",  visibilityKm: 0.5 },
  48: { description: "Rime Fog (Icing Risk)",             dangerLevel: "EXTREME", visibilityKm: 0.2 },
  51: { description: "Light Drizzle",                     dangerLevel: "CAUTION", visibilityKm: 10 },
  53: { description: "Moderate Drizzle",                  dangerLevel: "CAUTION", visibilityKm: 8 },
  55: { description: "Dense Drizzle",                     dangerLevel: "DANGER",  visibilityKm: 4 },
  61: { description: "Light Rain",                        dangerLevel: "CAUTION", visibilityKm: 8 },
  63: { description: "Moderate Rain",                     dangerLevel: "CAUTION", visibilityKm: 5 },
  65: { description: "Heavy Rain",                        dangerLevel: "DANGER",  visibilityKm: 2 },
  71: { description: "Light Snowfall",                    dangerLevel: "CAUTION", visibilityKm: 5 },
  73: { description: "Moderate Snowfall",                 dangerLevel: "DANGER",  visibilityKm: 2 },
  75: { description: "Heavy Snowfall",                    dangerLevel: "EXTREME", visibilityKm: 0.5 },
  77: { description: "Snow Grains",                       dangerLevel: "CAUTION", visibilityKm: 3 },
  80: { description: "Light Rain Showers",                dangerLevel: "CAUTION", visibilityKm: 6 },
  81: { description: "Moderate Rain Showers",             dangerLevel: "CAUTION", visibilityKm: 4 },
  82: { description: "Violent Rain Showers",              dangerLevel: "EXTREME", visibilityKm: 1 },
  85: { description: "Snow Showers",                      dangerLevel: "DANGER",  visibilityKm: 1 },
  86: { description: "Heavy Snow Showers",                dangerLevel: "EXTREME", visibilityKm: 0.3 },
  95: { description: "Thunderstorm",                      dangerLevel: "EXTREME", visibilityKm: 0.5 },
  96: { description: "Thunderstorm with Hail",            dangerLevel: "EXTREME", visibilityKm: 0.2 },
  99: { description: "Thunderstorm with Heavy Hail",      dangerLevel: "EXTREME", visibilityKm: 0.1 },
};

function getWMO(code: number): WMOInfo {
  return (
    WMO_CODES[code] ?? { description: `Code ${code}`, dangerLevel: "CAUTION", visibilityKm: 10 }
  );
}

// ── In-Memory Cache ────────────────────────────────────────────────────────

const cache = new Map<string, WeatherData>();

function cacheKey(lat: number, lon: number): string {
  // Round to 1 decimal for cache granularity
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

// ── API Fetch ──────────────────────────────────────────────────────────────

/**
 * Fetch current weather at (lat, lon) using Open-Meteo.
 * Returns cached data if fresh (<10 min old).
 * Returns null on network failure.
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchTime < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lon.toFixed(4));
    url.searchParams.set(
      "current",
      "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation,cloud_cover"
    );
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const cur = json.current;
    const code: number = cur.weather_code ?? 0;
    const wmo = getWMO(code);

    const data: WeatherData = {
      lat,
      lon,
      temperature: cur.temperature_2m ?? 0,
      windSpeed: cur.wind_speed_10m ?? 0,
      windDirection: cur.wind_direction_10m ?? 0,
      precipitation: cur.precipitation ?? 0,
      weatherCode: code,
      weatherDescription: wmo.description,
      visibility: wmo.visibilityKm,
      dangerLevel: wmo.dangerLevel,
      fetchTime: Date.now(),
    };

    cache.set(key, data);
    return data;
  } catch (err) {
    console.warn("Weather API fetch failed:", err);
    return null;
  }
}

/**
 * Fetch weather for multiple coordinates in parallel (for aircraft grid).
 * Returns a map of icao24 → WeatherData.
 */
export async function fetchWeatherBatch(
  coords: Array<{ icao24: string; lat: number; lon: number }>
): Promise<Map<string, WeatherData>> {
  const results = new Map<string, WeatherData>();
  // Deduplicate by rounded coordinates to minimize API calls
  const unique = new Map<string, { icao24: string; lat: number; lon: number }>();
  for (const c of coords) {
    unique.set(cacheKey(c.lat, c.lon), c);
  }

  await Promise.all(
    Array.from(unique.values()).map(async (c) => {
      const w = await fetchWeather(c.lat, c.lon);
      if (w) results.set(c.icao24, w);
    })
  );

  return results;
}

/**
 * Decode WMO code to emoji for compact display.
 */
export function weatherEmoji(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

/**
 * Compute wind danger contribution (adds to aircraft danger score).
 * Wind > 60 km/h = EXTREME for small aircraft.
 */
export function windDangerScore(windSpeedKmh: number): number {
  if (windSpeedKmh > 80) return 30;
  if (windSpeedKmh > 60) return 20;
  if (windSpeedKmh > 40) return 10;
  if (windSpeedKmh > 20) return 4;
  return 0;
}
