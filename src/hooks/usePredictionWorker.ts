/**
 * usePredictionWorker
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs physics summary computation in a Web Worker (off main thread).
 * Falls back to synchronous computation if Worker API is unavailable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { KinematicState, PhysicsSummary } from "@/types";
import { computePhysicsSummary } from "@/lib/physics";

// Fallback empty summary shape
const EMPTY_SUMMARY: PhysicsSummary = {
  aircraftVector: { x: 0, y: 0, magnitude: 0, direction: 0 },
  windVector: { x: 0, y: 0, magnitude: 0, direction: 0 },
  groundVector: { x: 0, y: 0, magnitude: 0, direction: 0 },
  displacement: 0,
  predictedPath: [],
  searchRadiusNow: 500,
  confidenceNow: 100,
  timeSinceLKP: 0,
};

export function usePredictionWorker(
  state: KinematicState,
  timeSinceLKP: number
): { summary: PhysicsSummary; computing: boolean } {
  const [summary, setSummary] = useState<PhysicsSummary>(EMPTY_SUMMARY);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize worker once
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../lib/prediction.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current.onmessage = (
        e: MessageEvent<{ ok: boolean; summary?: PhysicsSummary; error?: string }>
      ) => {
        setComputing(false);
        if (e.data.ok && e.data.summary) {
          setSummary(e.data.summary);
        } else {
          console.warn("[PredWorker] fallback:", e.data.error);
        }
      };
      workerRef.current.onerror = () => {
        setComputing(false);
      };
    } catch {
      // Web Workers not supported — will fall back to sync
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const compute = useCallback(
    (s: KinematicState, t: number) => {
      if (workerRef.current) {
        setComputing(true);
        workerRef.current.postMessage({ state: s, timeSinceLKP: t });
      } else {
        // Synchronous fallback (no Worker support)
        const result = computePhysicsSummary(s, t);
        setSummary(result);
      }
    },
    []
  );

  // Debounce: only recompute when state/time changes, max every 2 seconds
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      compute(state, timeSinceLKP);
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, timeSinceLKP, compute]);

  return { summary, computing };
}
