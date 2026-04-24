/**
 * SAR Crash Monitor Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Checks OpenSky API + aircraft_history table to detect potential aircraft
 * crashes (extreme descent + sudden disappearance) and sends immediate
 * Gmail alerts to the host — works whether host is online or offline.
 *
 * Invoke: POST /functions/v1/sar-crash-monitor { radiusKm, lat, lon }
 * Can also be called on a schedule (client-side interval every 60s).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HOST_EMAIL   = "anands9408@gmail.com";
const SENDER_EMAIL = "anands9408@gmail.com";
const OPENSKY_API  = "https://opensky-network.org/api";

// Crash detection thresholds
const CRASH_ALTITUDE_FT        = 500;    // Below this is critical
const CRASH_VERTICAL_RATE_FPM  = -3000; // Faster than this descent rate
const CRASH_SPEED_KTS          = 60;    // Dangerously low speed
const DISAPPEAR_WINDOW_SEC     = 120;   // Aircraft gone for > 2 minutes after anomaly

interface CrashCandidate {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude_ft: number;
  vertical_rate_fpm: number;
  velocity_kts: number;
  reason: string;
  last_seen: string;
}

async function sendCrashAlert(candidates: CrashCandidate[], alertType: "DETECTED" | "DISAPPEARED") {
  const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD") || "ygsz kqfi sbkr ywoy";

  const rows = candidates.map((c) => `
    <tr>
      <td style="padding:8px;border:1px solid #1f2937;font-family:monospace;color:#60a5fa;">${c.icao24}</td>
      <td style="padding:8px;border:1px solid #1f2937;font-family:monospace;color:#e2e8f0;">${c.callsign || "N/A"}</td>
      <td style="padding:8px;border:1px solid #1f2937;font-family:monospace;color:#ef4444;">${c.altitude_ft.toLocaleString()} ft</td>
      <td style="padding:8px;border:1px solid #1f2937;font-family:monospace;color:#eab308;">${c.vertical_rate_fpm.toLocaleString()} fpm</td>
      <td style="padding:8px;border:1px solid #1f2937;font-family:monospace;color:#9ca3af;">${c.lat.toFixed(4)}°N, ${c.lon.toFixed(4)}°E</td>
      <td style="padding:8px;border:1px solid #1f2937;font-family:monospace;color:#f97316;">${c.reason}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
  <html>
  <body style="background:#0a0f1c;color:#e2e8f0;font-family:sans-serif;padding:24px;margin:0;">
    <div style="max-width:680px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:40px;">🚨</div>
        <h1 style="font-family:monospace;color:#ef4444;font-size:20px;letter-spacing:4px;margin:8px 0;">
          SAR CRASH ${alertType === "DETECTED" ? "RISK DETECTED" : "SIGNAL LOST"}
        </h1>
        <p style="color:#6b7280;font-size:12px;margin:4px 0;">${new Date().toUTCString()}</p>
        <div style="background:#ef4444;color:white;padding:6px 16px;border-radius:4px;font-family:monospace;font-size:11px;display:inline-block;margin-top:8px;">
          ${candidates.length} AIRCRAFT ${alertType === "DETECTED" ? "CRITICAL PARAMETERS" : "DISAPPEARED AFTER ANOMALY"}
        </div>
      </div>

      <div style="background:#111827;border:1px solid #374151;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <div style="background:#1f2937;padding:10px 14px;font-family:monospace;font-size:11px;color:#9ca3af;letter-spacing:2px;">
          ⚠ POSSIBLE CRASH — IMMEDIATE SAR RESPONSE REQUIRED
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#1f2937;">
                <th style="padding:8px;border:1px solid #374151;text-align:left;color:#9ca3af;font-family:monospace;font-size:10px;">ICAO24</th>
                <th style="padding:8px;border:1px solid #374151;text-align:left;color:#9ca3af;font-family:monospace;font-size:10px;">CALLSIGN</th>
                <th style="padding:8px;border:1px solid #374151;text-align:left;color:#9ca3af;font-family:monospace;font-size:10px;">ALTITUDE</th>
                <th style="padding:8px;border:1px solid #374151;text-align:left;color:#9ca3af;font-family:monospace;font-size:10px;">DESCENT RATE</th>
                <th style="padding:8px;border:1px solid #374151;text-align:left;color:#9ca3af;font-family:monospace;font-size:10px;">POSITION</th>
                <th style="padding:8px;border:1px solid #374151;text-align:left;color:#9ca3af;font-family:monospace;font-size:10px;">REASON</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <div style="background:#7f1d1d;border:1px solid #ef4444;border-radius:6px;padding:12px;margin-bottom:16px;">
        <p style="color:#fca5a5;font-size:12px;font-family:monospace;margin:0;">
          ⚡ This alert was generated automatically by SAR Platform crash monitoring.<br/>
          Immediately verify on the SAR Platform dashboard and contact ATC/local authorities if confirmed.<br/>
          <strong>Not a certified emergency notification — for situational awareness only.</strong>
        </p>
      </div>

      <div style="text-align:center;margin-top:16px;">
        <a href="https://sar-platform.onspace.app/platform" 
           style="background:#3b82f6;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-family:monospace;font-size:12px;letter-spacing:2px;">
          OPEN SAR PLATFORM →
        </a>
      </div>
    </div>
  </body>
  </html>`;

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: SENDER_EMAIL, password: gmailAppPassword },
    },
  });

  await client.send({
    from: `SAR Crash Monitor <${SENDER_EMAIL}>`,
    to: HOST_EMAIL,
    subject: `🚨 SAR CRASH ${alertType === "DETECTED" ? "RISK" : "SIGNAL LOST"} — ${candidates.length} Aircraft · ${new Date().toUTCString()}`,
    html,
    content: `SAR CRASH ALERT: ${candidates.length} aircraft with critical parameters detected. Check platform: https://sar-platform.onspace.app/platform`,
  });

  await client.close();
  console.log(`[CrashMonitor] Alert sent for ${candidates.length} aircraft`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { lat = 12.9716, lon = 77.5946, radiusKm = 2000 } = body;

    console.log(`[CrashMonitor] Checking area: ${lat},${lon} radius=${radiusKm}km`);

    // ─── 1. Fetch live aircraft from OpenSky ──────────────────────────────
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const bbox     = `lamin=${lat - latDelta}&lomin=${lon - lonDelta}&lamax=${lat + latDelta}&lomax=${lon + lonDelta}`;

    const osRes = await fetch(`${OPENSKY_API}/states/all?${bbox}`, {
      headers: { "User-Agent": "SAR-Platform/2.0 CrashMonitor" },
      signal: AbortSignal.timeout(15000),
    });

    if (!osRes.ok) {
      console.warn(`[CrashMonitor] OpenSky returned ${osRes.status}`);
      return new Response(JSON.stringify({ ok: false, message: `OpenSky ${osRes.status}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const osData = await osRes.json();
    const states: any[][] = osData.states ?? [];

    // ─── 2. Parse and identify crash candidates ───────────────────────────
    const crashCandidates: CrashCandidate[] = [];

    for (const s of states) {
      const icao24       = (s[0] ?? "").toLowerCase();
      const callsign     = (s[1] ?? "").trim();
      const lon_         = s[5] ?? null;
      const lat_         = s[6] ?? null;
      const altitude_m   = s[7] ?? s[13] ?? null; // baro alt or geo alt
      const velocity_ms  = s[9] ?? null;
      const heading      = s[10] ?? 0;
      const vertRate_ms  = s[11] ?? 0;
      const onGround     = s[8] ?? false;

      if (!lat_ || !lon_ || onGround || !altitude_m) continue;

      const altitude_ft      = altitude_m * 3.28084;
      const velocity_kts     = (velocity_ms ?? 0) * 1.94384;
      const vertRate_fpm     = (vertRate_ms ?? 0) * 196.85;

      const reasons: string[] = [];

      // Extremely low altitude
      if (altitude_ft < CRASH_ALTITUDE_FT) {
        reasons.push(`Alt ${altitude_ft.toFixed(0)} ft`);
      }

      // Rapid descent
      if (vertRate_fpm < CRASH_VERTICAL_RATE_FPM) {
        reasons.push(`Descent ${vertRate_fpm.toFixed(0)} fpm`);
      }

      // Low speed near stall (combined with descent)
      if (velocity_kts < CRASH_SPEED_KTS && vertRate_fpm < -500) {
        reasons.push(`Speed ${velocity_kts.toFixed(0)} kts`);
      }

      if (reasons.length >= 2) {
        crashCandidates.push({
          icao24, callsign, lat: lat_, lon: lon_,
          altitude_ft, vertical_rate_fpm: vertRate_fpm,
          velocity_kts, reason: reasons.join(" + "),
          last_seen: new Date().toISOString(),
        });
      }
    }

    // ─── 3. Check for disappeared aircraft (anomaly then gone) ────────────
    const cutoff = new Date(Date.now() - DISAPPEAR_WINDOW_SEC * 1000).toISOString();
    const { data: recentHistory } = await supabase
      .from("aircraft_history")
      .select("icao24, callsign, lat, lon, altitude_ft, vertical_rate_fpm, velocity_kts, recorded_at")
      .gte("recorded_at", cutoff)
      .lt("altitude_ft", 2000)
      .lt("vertical_rate_fpm", -1500);

    const disappeared: CrashCandidate[] = [];
    const currentIcaos = new Set(states.map((s: any[]) => (s[0] ?? "").toLowerCase()));

    for (const hist of (recentHistory ?? [])) {
      if (!currentIcaos.has(hist.icao24)) {
        // Was seen recently with bad parameters, now gone
        disappeared.push({
          icao24: hist.icao24,
          callsign: hist.callsign ?? "N/A",
          lat: hist.lat, lon: hist.lon,
          altitude_ft: hist.altitude_ft ?? 0,
          vertical_rate_fpm: hist.vertical_rate_fpm ?? 0,
          velocity_kts: hist.velocity_kts ?? 0,
          reason: "Signal lost after anomaly",
          last_seen: hist.recorded_at,
        });
      }
    }

    // ─── 4. Check cooldown — avoid spam ───────────────────────────────────
    const { data: lastAlert } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "crash_monitor_last_alert")
      .single();

    const now = Date.now();
    const lastAlertTime = lastAlert ? parseInt(lastAlert.value) : 0;
    const COOLDOWN_MS   = 15 * 60 * 1000; // 15 min between crash alerts

    const shouldAlert = (crashCandidates.length > 0 || disappeared.length > 0) && (now - lastAlertTime > COOLDOWN_MS);

    if (shouldAlert) {
      // Update cooldown
      await supabase.from("site_settings").upsert({ key: "crash_monitor_last_alert", value: String(now) });

      if (crashCandidates.length > 0) {
        await sendCrashAlert(crashCandidates, "DETECTED");
      }
      if (disappeared.length > 0) {
        await sendCrashAlert(disappeared, "DISAPPEARED");
      }
    }

    console.log(`[CrashMonitor] Done — ${crashCandidates.length} crash candidates, ${disappeared.length} disappeared`);

    return new Response(JSON.stringify({
      ok: true,
      checked: states.length,
      crashCandidates: crashCandidates.length,
      disappeared: disappeared.length,
      alertSent: shouldAlert,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[CrashMonitor] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
