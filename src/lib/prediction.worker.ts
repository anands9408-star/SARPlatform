/**
 * SAR Prediction Web Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs physics prediction OFF the main thread so the UI never freezes.
 * Receives a KinematicState + timeSinceLKP, returns PhysicsSummary.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { KinematicState, PhysicsSummary } from "@/types";
import { computePhysicsSummary } from "@/lib/physics";

self.onmessage = (e: MessageEvent<{ state: KinematicState; timeSinceLKP: number }>) => {
  try {
    const { state, timeSinceLKP } = e.data;
    const summary: PhysicsSummary = computePhysicsSummary(state, timeSinceLKP);
    self.postMessage({ ok: true, summary });
  } catch (err: any) {
    self.postMessage({ ok: false, error: err?.message ?? "Worker error" });
  }
};
