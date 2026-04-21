/**
 * OpenSky Proxy Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Proxies requests to the OpenSky Network API server-side to avoid:
 *   • Browser CORS restrictions
 *   • Client-side API exposure
 *   • Rate-limit fingerprinting
 *
 * POST body:
 * {
 *   lat?:    number   — center latitude  (omit for global)
 *   lon?:    number   — center longitude (omit for global)
 *   radius?: number   — scan radius in km (0 or omit → global / no bbox)
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { corsHeaders } from "../_shared/cors.ts";

const KM_PER_DEG_LAT = 111.32;
const OPENSKY_BASE   = "https://opensky-network.org/api/states/all";

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lon, radius } = body as {
      lat?: number;
      lon?: number;
      radius?: number;
    };

    // Build bounding box if a valid radius is supplied
    let url = OPENSKY_BASE;
    if (radius && radius > 0 && lat != null && lon != null) {
      const dLat = radius / KM_PER_DEG_LAT;
      const dLon = radius / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
      const params = new URLSearchParams({
        lamin: (lat - dLat).toFixed(3),
        lomin: (lon - dLon).toFixed(3),
        lamax: (lat + dLat).toFixed(3),
        lomax: (lon + dLon).toFixed(3),
      });
      url = `${OPENSKY_BASE}?${params.toString()}`;
    }

    console.log(`[OpenSky Proxy] Fetching: ${url}`);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SAR-Platform/1.0",
        "Accept":     "application/json",
      },
    });

    if (res.status === 429) {
      console.warn("[OpenSky Proxy] Rate limited");
      return new Response(
        JSON.stringify({ error: "rate_limited", message: "OpenSky rate limit reached — try again in 30s" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[OpenSky Proxy] HTTP ${res.status}: ${text}`);
      return new Response(
        JSON.stringify({ error: `upstream_error`, message: `OpenSky returned HTTP ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    console.log(`[OpenSky Proxy] OK — ${(data.states || []).length} states returned`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[OpenSky Proxy] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
