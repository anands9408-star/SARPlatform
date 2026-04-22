/**
 * SAR Notification Edge Function — Gmail Only
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends crash/warning alerts via Gmail SMTP only.
 * No SMS — free delivery via email.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const RECIPIENT_EMAIL = "anands9408@gmail.com";
const SENDER_EMAIL    = "anands9408@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { trigger, aircraft } = await req.json();

    if (!trigger || !aircraft?.length) {
      return new Response(
        JSON.stringify({ error: "trigger and aircraft[] are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, string> = {};
    const emoji = trigger === "CRASH" ? "🚨" : trigger === "CRITICAL" ? "⚠️" : "🔶";
    const levelLabel = trigger === "CRASH" ? "CRASH DETECTED" : `${trigger} RISK ALERT`;

    // ── Gmail SMTP ───────────────────────────────────────────────────────────
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailAppPassword) {
      results.email = "skipped — GMAIL_APP_PASSWORD not configured";
    } else {
      const htmlRows = aircraft.slice(0, 10).map((ac: any) => `
        <tr style="border-bottom:1px solid #1f2937;">
          <td style="padding:8px 12px;font-family:monospace;color:#60a5fa;font-weight:700;">${ac.callsign || ac.icao24}</td>
          <td style="padding:8px 12px;color:${ac.risk_level === "CRITICAL" ? "#ef4444" : "#f97316"};font-family:monospace;font-weight:700;">
            ${ac.risk_level} · ${ac.risk_score}/100
          </td>
          <td style="padding:8px 12px;font-family:monospace;color:#d1d5db;">${ac.altitude_ft?.toLocaleString() ?? "?"} ft</td>
          <td style="padding:8px 12px;font-family:monospace;color:#d1d5db;">${ac.lat?.toFixed(4)}°N, ${ac.lon?.toFixed(4)}°E</td>
          <td style="padding:8px 12px;font-size:11px;color:#6b7280;">
            ${(ac.factors || []).slice(0, 2).map((f: any) => f.name || f.label).join(", ")}
          </td>
        </tr>
      `).join("");

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="background:#0a0f1c;color:#e2e8f0;font-family:sans-serif;padding:24px;margin:0;">
          <div style="max-width:720px;margin:0 auto;">

            <!-- Header -->
            <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
              <span style="font-size:28px;">${emoji}</span>
              <div>
                <h1 style="margin:0;font-size:18px;font-family:monospace;letter-spacing:3px;color:${trigger === "CRITICAL" ? "#ef4444" : trigger === "CRASH" ? "#dc2626" : "#f97316"};">
                  SAR ${levelLabel}
                </h1>
                <p style="margin:4px 0 0;color:#6b7280;font-size:12px;font-family:monospace;">
                  ${new Date().toUTCString()} · SAR Platform Automated Alert
                </p>
              </div>
            </div>

            <!-- Summary -->
            <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
              <p style="margin:0 0 14px;color:#9ca3af;font-size:13px;">
                <strong style="color:#e2e8f0;">${aircraft.length} aircraft</strong> flagged at
                <strong style="color:${trigger === "CRITICAL" ? "#ef4444" : "#f97316"}"> ${trigger}</strong> risk level requiring attention.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="border-bottom:1px solid #374151;">
                    <th style="padding:8px 12px;text-align:left;color:#4b5563;font-family:monospace;font-weight:600;letter-spacing:1px;">CALLSIGN</th>
                    <th style="padding:8px 12px;text-align:left;color:#4b5563;font-family:monospace;font-weight:600;letter-spacing:1px;">RISK</th>
                    <th style="padding:8px 12px;text-align:left;color:#4b5563;font-family:monospace;font-weight:600;letter-spacing:1px;">ALTITUDE</th>
                    <th style="padding:8px 12px;text-align:left;color:#4b5563;font-family:monospace;font-weight:600;letter-spacing:1px;">POSITION</th>
                    <th style="padding:8px 12px;text-align:left;color:#4b5563;font-family:monospace;font-weight:600;letter-spacing:1px;">FACTORS</th>
                  </tr>
                </thead>
                <tbody>${htmlRows}</tbody>
              </table>
            </div>

            <!-- Footer -->
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:14px 20px;">
              <p style="margin:0;font-size:11px;color:#374151;font-family:monospace;line-height:1.6;">
                Automated alert from <strong style="color:#60a5fa;">SAR (Search Aircraft Rescue)</strong> Platform.
                Aircraft data sourced from OpenSky Network. Not certified for operational use.
                Log in to the platform for live tracking and full mission data.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: { username: SENDER_EMAIL, password: gmailAppPassword },
          },
        });

        await client.send({
          from: `SAR Platform <${SENDER_EMAIL}>`,
          to: RECIPIENT_EMAIL,
          subject: `${emoji} SAR ${levelLabel} — ${aircraft.length} Aircraft`,
          html: htmlBody,
          content: aircraft.slice(0, 5).map((ac: any) =>
            `• ${ac.callsign || ac.icao24} — ${ac.risk_level} (${ac.risk_score}/100) @ ${ac.altitude_ft}ft — ${ac.lat?.toFixed(4)}°N, ${ac.lon?.toFixed(4)}°E`
          ).join("\n"),
        });

        await client.close();
        results.email = "sent";
        console.log("[SAR Notify] Gmail alert sent to", RECIPIENT_EMAIL);
      } catch (e: any) {
        results.email = `Gmail error: ${e.message}`;
        console.error("[SAR Notify] Gmail exception:", e.message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, trigger, aircraft_count: aircraft.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[SAR Notify] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
