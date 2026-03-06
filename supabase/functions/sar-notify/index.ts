/**
 * SAR Notification Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends crash/warning alerts via:
 *   • Email  — Gmail SMTP (App Password) → anands9408@gmail.com
 *   • SMS    — Fast2SMS API → +918124919993 (fast Indian delivery)
 *              Falls back to Twilio if Fast2SMS key not set.
 *
 * POST body:
 * {
 *   trigger:    "CRITICAL" | "HIGH" | "CRASH",
 *   aircraft: [{
 *     icao24, callsign, lat, lon, altitude_ft,
 *     risk_score, risk_level, factors: [{ name, value, points }]
 *   }]
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const RECIPIENT_EMAIL       = "anands9408@gmail.com";
const SENDER_EMAIL          = "anands9408@gmail.com";
const RECIPIENT_PHONE       = "+918124919993";
const RECIPIENT_PHONE_DIGITS = "8124919993"; // Fast2SMS 10-digit local number

Deno.serve(async (req: Request) => {
  // ── CORS preflight ─────────────────────────────────────────────────────
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

    // ── Build message content ──────────────────────────────────────────────
    const emoji = trigger === "CRASH" ? "🚨" : trigger === "CRITICAL" ? "⚠️" : "🔶";
    const levelLabel = trigger === "CRASH" ? "CRASH DETECTED" : `${trigger} RISK ALERT`;

    const summaryLines = aircraft.slice(0, 5).map((ac: any) =>
      `• ${ac.callsign || ac.icao24} — Score: ${ac.risk_score}/100 — ` +
      `${ac.altitude_ft?.toLocaleString() ?? "?"} ft — ` +
      `Pos: ${ac.lat?.toFixed(4)}°N, ${ac.lon?.toFixed(4)}°E`
    );

    // ── Email via Gmail SMTP ──────────────────────────────────────────────
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (gmailAppPassword) {
      const htmlRows = aircraft.slice(0, 10).map((ac: any) => `
        <tr style="border-bottom:1px solid #333;">
          <td style="padding:8px;font-family:monospace;color:#00d4ff;">${ac.callsign || ac.icao24}</td>
          <td style="padding:8px;color:${ac.risk_level === "CRITICAL" ? "#ef4444" : "#f97316"};">
            ${ac.risk_level} (${ac.risk_score}/100)
          </td>
          <td style="padding:8px;font-family:monospace;">${ac.altitude_ft?.toLocaleString() ?? "?"} ft</td>
          <td style="padding:8px;font-family:monospace;">${ac.lat?.toFixed(4)}°N, ${ac.lon?.toFixed(4)}°E</td>
          <td style="padding:8px;font-size:11px;color:#aaa;">
            ${(ac.factors || []).slice(0, 3).map((f: any) => f.name || f.label).join(", ")}
          </td>
        </tr>
      `).join("");

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="background:#0a0f1c;color:#e2e8f0;font-family:sans-serif;padding:24px;margin:0;">
          <div style="max-width:700px;margin:0 auto;">
            <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:16px;">
              <h1 style="margin:0;font-size:20px;color:${trigger==="CRITICAL"?"#ef4444":trigger==="CRASH"?"#dc2626":"#f97316"};">
                ${emoji} SAR ${levelLabel}
              </h1>
              <p style="color:#9ca3af;margin:6px 0 0;font-size:13px;">${new Date().toUTCString()}</p>
            </div>
            <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:16px;">
              <p style="color:#9ca3af;margin:0 0 12px;font-size:14px;">
                <strong style="color:#e2e8f0;">${aircraft.length}</strong> aircraft flagged at <strong style="color:${trigger==="CRITICAL"?"#ef4444":"#f97316"};">${trigger}</strong> risk level.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="border-bottom:1px solid #374151;">
                    <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600;">CALLSIGN</th>
                    <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600;">RISK</th>
                    <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600;">ALTITUDE</th>
                    <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600;">POSITION</th>
                    <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600;">FACTORS</th>
                  </tr>
                </thead>
                <tbody>${htmlRows}</tbody>
              </table>
            </div>
            <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:8px;padding:16px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
                This is an automated alert from the <strong style="color:#60a5fa;">SAR (Search Aircraft Rescue)</strong> platform.
                Immediate action may be required. Monitor the live feed for updates.
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
            auth: {
              username: SENDER_EMAIL,
              password: gmailAppPassword,
            },
          },
        });

        await client.send({
          from: `SAR Platform <${SENDER_EMAIL}>`,
          to:   RECIPIENT_EMAIL,
          subject: `${emoji} SAR ${levelLabel} — ${aircraft.length} Aircraft`,
          html: htmlBody,
          content: summaryLines.join("\n"),
        });

        await client.close();
        results.email = "sent";
        console.log("[SAR Notify] Gmail sent successfully");
      } catch (e: any) {
        results.email = `Gmail error: ${e.message}`;
        console.error("[SAR Notify] Gmail exception:", e);
      }
    } else {
      results.email = "skipped — GMAIL_APP_PASSWORD not set";
    }

    // ── SMS via Fast2SMS (primary — fast Indian delivery) ────────────────
    const fast2smsKey = Deno.env.get("FAST2SMS_API_KEY");
    const twilioSid   = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom  = Deno.env.get("TWILIO_PHONE_NUMBER");

    // Short SMS text (Fast2SMS quick route: 160 chars per segment)
    const shortSms =
      `SAR ${trigger} ALERT: ` +
      aircraft.slice(0, 3).map((ac: any) =>
        `${ac.callsign || ac.icao24} Risk:${ac.risk_score}/100 @${ac.altitude_ft}ft`
      ).join(" | ") +
      ` [${new Date().toUTCString().slice(17, 25)} UTC]`;

    if (fast2smsKey) {
      try {
        const f2sRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsKey,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            route:   "q",                       // Quick transactional route
            message: shortSms.slice(0, 160),
            numbers: RECIPIENT_PHONE_DIGITS,    // 10-digit Indian mobile
            flash:   0,
          }),
        });
        const f2sData = await f2sRes.json();
        if (f2sData.return === true) {
          results.sms = "sent";
          console.log("[SAR Notify] Fast2SMS sent:", f2sData.request_id);
        } else {
          results.sms = `Fast2SMS error: ${f2sData.message || JSON.stringify(f2sData)}`;
          console.error("[SAR Notify] Fast2SMS:", f2sData);
        }
      } catch (e: any) {
        results.sms = `Fast2SMS exception: ${e.message}`;
        console.error("[SAR Notify] Fast2SMS exception:", e);
      }
    } else if (twilioSid && twilioToken && twilioFrom) {
      // Fallback: Twilio
      const smsBody = new URLSearchParams({
        From: twilioFrom,
        To:   RECIPIENT_PHONE,
        Body: shortSms.slice(0, 1600),
      });
      try {
        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type":  "application/x-www-form-urlencoded",
            },
            body: smsBody.toString(),
          }
        );
        const smsData = await smsRes.json();
        if (!smsRes.ok) {
          results.sms = `Twilio error: ${smsData.message || JSON.stringify(smsData)}`;
        } else {
          results.sms = "sent (Twilio fallback)";
          console.log("[SAR Notify] Twilio SMS sent:", smsData.sid);
        }
      } catch (e: any) {
        results.sms = `Twilio exception: ${e.message}`;
        console.error("[SAR Notify] Twilio exception:", e);
      }
    } else {
      results.sms = "skipped — no SMS credentials set";
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
