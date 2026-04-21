/**
 * SAR AI Prediction Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses OnSpace AI (Gemini 3 Flash) to analyse aircraft telemetry, physics
 * summary, weather data and risk factors — then returns a structured
 * AI-generated mission prediction report.
 *
 * POST body:
 * {
 *   aircraft: {
 *     callsign, icao24, lat, lon, altitude_ft, velocity_kts,
 *     heading, vertical_rate_fpm, origin_country
 *   },
 *   physics: {
 *     groundSpeed_kts, confidence_pct, searchRadius_km,
 *     predictedLat, predictedLon, timeSinceLKP_s
 *   },
 *   weather: {
 *     temperature_c, windSpeed_kmh, windDirection_deg,
 *     visibility_m, description, isDangerous
 *   },
 *   riskScore: number,
 *   riskLevel: string,
 *   riskFactors: [{ name, value, points }]
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { aircraft, physics, weather, riskScore, riskLevel, riskFactors } = body;

    if (!aircraft) {
      return new Response(
        JSON.stringify({ error: "aircraft object is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey  = Deno.env.get("ONSPACE_AI_API_KEY");
    const baseUrl = Deno.env.get("ONSPACE_AI_BASE_URL");

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "OnSpace AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build rich system prompt ───────────────────────────────────────────
    const systemPrompt = `You are SAR-AI, an expert Search and Rescue aviation analyst embedded in the SAR (Search Aircraft Rescue) mission platform. 
Your role is to analyse real-time aircraft telemetry, physics predictions, and weather data to provide tactical mission guidance.

Guidelines:
- Be concise, precise, and operationally actionable — this is used by mission operators in real time
- Output must be structured under these exact headers (use markdown bold for headers):
  **THREAT ASSESSMENT** — 1–2 sentences on overall risk
  **PREDICTED POSITION** — where the aircraft will be in 15 and 30 minutes
  **SEARCH RECOMMENDATION** — primary search area (lat/lon box + radius)
  **WEATHER IMPACT** — how current weather affects search/rescue
  **PRIORITY ACTIONS** — 3 bullet points, immediate steps for operators
  **CONFIDENCE** — overall prediction confidence with reasoning
- Use aviation terminology. Altitude in feet, speed in knots, distance in km/nm.
- If risk is CRITICAL, urgently recommend immediate SAR activation.`;

    const factorsText = (riskFactors || [])
      .map((f: any) => `  • ${f.name}: ${f.value} (+${f.points} pts)`)
      .join("\n");

    const userPrompt = `Analyse this aircraft for SAR operators:

**AIRCRAFT**
Callsign: ${aircraft.callsign || "N/A"} | ICAO24: ${aircraft.icao24}
Position: ${aircraft.lat?.toFixed(4)}°N, ${aircraft.lon?.toFixed(4)}°E
Altitude: ${aircraft.altitude_ft?.toLocaleString() ?? "?"} ft | Speed: ${aircraft.velocity_kts ?? "?"} kts
Heading: ${aircraft.heading ?? "?"}° | Vertical Rate: ${aircraft.vertical_rate_fpm ?? "?"} ft/min
Origin: ${aircraft.origin_country ?? "Unknown"}

**RISK ASSESSMENT**
Risk Level: ${riskLevel ?? "UNKNOWN"} | Risk Score: ${riskScore ?? "?"}/100
Risk Factors:
${factorsText || "  None identified"}

**PHYSICS PREDICTION**
Ground Speed: ${physics?.groundSpeed_kts?.toFixed(1) ?? "?"} kts
Prediction Confidence: ${physics?.confidence_pct?.toFixed(1) ?? "?"}%
Search Radius: ${physics?.searchRadius_km?.toFixed(2) ?? "?"} km
Predicted Position (15 min): ${physics?.predictedLat?.toFixed(4) ?? "?"}°N, ${physics?.predictedLon?.toFixed(4) ?? "?"}°E
Time Since LKP: ${physics?.timeSinceLKP_s ? Math.round(physics.timeSinceLKP_s / 60) + " min" : "unknown"}

**WEATHER**
${weather ? `Temperature: ${weather.temperature_c}°C | Wind: ${weather.windSpeed_kmh} km/h @ ${weather.windDirection_deg}°
Visibility: ${weather.visibility_m ? (weather.visibility_m / 1000).toFixed(1) + " km" : "unknown"}
Conditions: ${weather.description ?? "unknown"} | Dangerous: ${weather.isDangerous ? "YES" : "no"}` : "Weather data unavailable"}

Provide your SAR AI prediction report now:`;

    // ── Call OnSpace AI ─────────────────────────────────────────────────────
    console.log("[SAR AI] Calling OnSpace AI for prediction...");

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("[SAR AI] API error:", aiRes.status, text);
      return new Response(
        JSON.stringify({ error: `OnSpace AI error: ${aiRes.status} — ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const report = aiData.choices?.[0]?.message?.content ?? "No prediction available.";

    console.log("[SAR AI] Prediction generated successfully");

    return new Response(
      JSON.stringify({ ok: true, report, model: "google/gemini-3-flash-preview" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[SAR AI] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
