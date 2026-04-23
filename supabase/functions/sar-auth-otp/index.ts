/**
 * SAR Auth OTP Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Updated flow:
 *   1. action:"send"         → Send OTP to ANY valid email (no access pre-check)
 *   2. action:"verify"       → Verify OTP code
 *   3. action:"resolve_role" → After OTP verified, determine role:
 *        role:"host"        + password → check host password
 *        role:"subscriber"            → check viewer_access table
 *        role:"free_viewer" + password → check site_settings free_view_password
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HOST_EMAIL     = "anands9408@gmail.com";
const SENDER_EMAIL   = "anands9408@gmail.com";
const HOST_PASSWORD  = "0904";
const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendGmail(to: string, subject: string, html: string, text: string) {
  // Read from secret first, fall back to direct value if secret not yet propagated
  const gmailAppPassword =
    Deno.env.get("GMAIL_APP_PASSWORD") ||
    "ygsz kqfi sbkr ywoy";  // Gmail App Password — anands9408@gmail.com
  console.log("[OTP] SMTP using app-password length:", gmailAppPassword.length);

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
    to,
    subject,
    html,
    content: text,
  });

  await client.close();
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
    const body = await req.json();
    const { action, email, otp: inputOtp, role: requestedRole, password } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SEND OTP — send to any valid email ─────────────────────────────
    if (action === "send") {
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

      // Invalidate previous OTPs for this email
      await supabase
        .from("otp_sessions")
        .update({ used: true })
        .eq("email", normalizedEmail)
        .eq("used", false);

      // Insert new OTP (role determined later at resolve_role step)
      const { error: insertErr } = await supabase.from("otp_sessions").insert({
        email: normalizedEmail,
        otp_code: otp,
        role: "pending",   // resolved after role selection
        expires_at: expiresAt,
        used: false,
      });

      if (insertErr) throw new Error(`DB error: ${insertErr.message}`);

      // Send OTP email
      const html = `
        <!DOCTYPE html>
        <html>
        <body style="background:#0a0f1c;color:#e2e8f0;font-family:sans-serif;padding:32px;margin:0;">
          <div style="max-width:480px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="font-size:32px;">✈</div>
              <h1 style="font-family:monospace;color:#00d4ff;font-size:18px;letter-spacing:4px;margin:8px 0;">SAR PLATFORM</h1>
              <p style="color:#6b7280;font-size:12px;margin:0;">Search Aircraft Rescue</p>
            </div>
            <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:28px;text-align:center;">
              <p style="color:#9ca3af;font-size:14px;margin:0 0 16px;">Your one-time access code</p>
              <div style="background:#0a0f1c;border:2px solid #3b82f6;border-radius:8px;padding:20px;margin:16px 0;">
                <p style="color:#6b7280;font-size:11px;font-family:monospace;margin:0 0 8px;letter-spacing:2px;">VERIFICATION CODE</p>
                <div style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#60a5fa;">${otp}</div>
              </div>
              <p style="color:#6b7280;font-size:12px;margin:16px 0 0;">
                Valid for <strong style="color:#e2e8f0;">10 minutes</strong>. Do not share this code.
              </p>
            </div>
            <div style="margin-top:20px;padding:16px;background:#111827;border-radius:8px;text-align:center;">
              <p style="color:#374151;font-size:11px;font-family:monospace;margin:0;">
                If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendGmail(
        normalizedEmail,
        `SAR Platform — Verification Code: ${otp}`,
        html,
        `Your SAR Platform verification code is: ${otp}\nValid for 10 minutes.\n\nDo not share this code.`
      );

      console.log(`[OTP] Sent ${otp} to ${normalizedEmail}`);

      return new Response(JSON.stringify({ ok: true, message: "OTP sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VERIFY OTP ──────────────────────────────────────────────────────
    if (action === "verify") {
      if (!email || !inputOtp) {
        return new Response(JSON.stringify({ error: "email and otp required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data: session, error: sessionErr } = await supabase
        .from("otp_sessions")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("otp_code", inputOtp.trim())
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (sessionErr || !session) {
        return new Response(JSON.stringify({
          error: "invalid_otp",
          message: "Invalid or expired code. Please request a new one.",
        }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as used
      await supabase.from("otp_sessions").update({ used: true }).eq("id", session.id);

      console.log(`[OTP] Email verified: ${normalizedEmail}`);

      return new Response(JSON.stringify({
        ok: true,
        email: normalizedEmail,
        message: "Email verified — select your access level",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESOLVE ROLE — called after OTP verified ─────────────────────────
    if (action === "resolve_role") {
      if (!email || !requestedRole) {
        return new Response(JSON.stringify({ error: "email and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // ── Host ─────────────────────────────────────────────────────────
      if (requestedRole === "host") {
        if (!password || password !== HOST_PASSWORD) {
          return new Response(JSON.stringify({
            error: "invalid_password",
            message: "Invalid host password.",
          }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[OTP] Host role granted: ${normalizedEmail}`);
        return new Response(JSON.stringify({ ok: true, role: "host", email: normalizedEmail }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Subscriber ───────────────────────────────────────────────────
      if (requestedRole === "viewer") {
        const { data: viewerData } = await supabase
          .from("viewer_access")
          .select("id, expires_at, is_active")
          .eq("subscriber_email", normalizedEmail)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .limit(1);

        if (!viewerData || viewerData.length === 0) {
          return new Response(JSON.stringify({
            error: "no_subscription",
            message: "No active subscription found for this email. Contact anands9408@gmail.com to subscribe.",
          }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Notify host of subscriber login (fire-and-forget)
        const notifyHtml = `
          <!DOCTYPE html><html><body style="background:#0a0f1c;color:#e2e8f0;font-family:sans-serif;padding:24px;">
          <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;">
            <h2 style="font-family:monospace;color:#22c55e;font-size:14px;letter-spacing:3px;">🔔 SUBSCRIBER LOGIN</h2>
            <div style="background:#0a0f1c;border:1px solid #374151;border-radius:6px;padding:12px;font-family:monospace;font-size:13px;">
              <strong style="color:#60a5fa;">Email:</strong> ${normalizedEmail}<br/>
              <strong style="color:#60a5fa;">Time:</strong> ${new Date().toUTCString()}<br/>
              <strong style="color:#60a5fa;">Role:</strong> Subscriber
            </div>
          </div></body></html>
        `;
        sendGmail(HOST_EMAIL, `SAR: Subscriber Login — ${normalizedEmail}`, notifyHtml,
          `SAR: Subscriber ${normalizedEmail} logged in at ${new Date().toUTCString()}`
        ).catch((e) => console.error("[OTP] Host notify error:", e.message));

        console.log(`[OTP] Viewer role granted: ${normalizedEmail}`);
        return new Response(JSON.stringify({ ok: true, role: "viewer", email: normalizedEmail }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Free Viewer ──────────────────────────────────────────────────
      if (requestedRole === "free_viewer") {
        // Fetch host-configured free view password
        const { data: setting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "free_view_password")
          .single();

        const freeViewPassword = setting?.value || "sar2024";

        if (!password || password !== freeViewPassword) {
          return new Response(JSON.stringify({
            error: "invalid_password",
            message: "Invalid free view password. Contact the host.",
          }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[OTP] Free viewer role granted: ${normalizedEmail}`);
        return new Response(JSON.stringify({ ok: true, role: "free_viewer", email: normalizedEmail }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "unknown role" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[OTP] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
