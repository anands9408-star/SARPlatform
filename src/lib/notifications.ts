/**
 * SAR Notification Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the sar-notify Edge Function to send email + SMS alerts.
 * All calls are fire-and-forget with a cooldown guard so the same
 * aircraft doesn't spam notifications every 25 seconds.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type NotifyTrigger = "CRITICAL" | "HIGH" | "CRASH";

export interface NotifyAircraft {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude_ft: number;
  risk_score: number;
  risk_level: string;
  factors: { name: string; value: string; points: number }[];
}

/** Cooldown: don't re-notify same aircraft within this window (ms) */
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Track when each ICAO24 was last notified */
const notifiedAt = new Map<string, number>();

/**
 * Filter aircraft that haven't been notified within the cooldown window.
 * Updates the notifiedAt map for newly notified aircraft.
 */
function filterCooldown(aircraft: NotifyAircraft[]): NotifyAircraft[] {
  const now = Date.now();
  const fresh = aircraft.filter((ac) => {
    const last = notifiedAt.get(ac.icao24) ?? 0;
    return now - last > COOLDOWN_MS;
  });
  fresh.forEach((ac) => notifiedAt.set(ac.icao24, now));
  return fresh;
}

/**
 * Send a SAR alert for a batch of high-risk aircraft.
 * Returns immediately — network call runs in background.
 */
export function sendSARAlert(
  trigger: NotifyTrigger,
  aircraft: NotifyAircraft[]
): void {
  const toNotify = filterCooldown(aircraft);
  if (!toNotify.length) return;

  console.log(
    `[SAR Notify] Triggering ${trigger} alert for ${toNotify.length} aircraft:`,
    toNotify.map((a) => a.callsign).join(", ")
  );

  // Fire-and-forget
  (async () => {
    const { data, error } = await supabase.functions.invoke("sar-notify", {
      body: { trigger, aircraft: toNotify },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const text = await error.context?.text();
          msg = `[${error.context?.status}] ${text || error.message}`;
        } catch {
          // ignore
        }
      }
      console.error("[SAR Notify] Edge function error:", msg);
      return;
    }

    console.log("[SAR Notify] Alert sent:", data);
  })();
}
