/**
 * HostPinGate — Dual-tier authentication
 * ─────────────────────────────────────────────────────────────────────────────
 * TIER 1 — Host PIN (permanent): Full access to all features including live
 *           aircraft feed, alert controls, retention settings, satellite mode.
 *           PIN: 0904 (host-only)
 *
 * TIER 2 — Viewer PIN (temporary subscription): Read-only live feed access.
 *           PINs are stored in `viewer_access` table with 30-day expiry.
 *           Renewed monthly by host after subscriber confirms payment via:
 *             UPI: anands9408@oksbi | Phone: +91 8124919993
 *
 * Auth state lives in sessionStorage (cleared when tab closes).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from "react";
import { Lock, ShieldAlert, Eye, EyeOff, X, CreditCard, Satellite } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Host PIN (never changes) ───────────────────────────────────────────────
const HOST_PIN      = "0904";
const SESSION_KEY   = "sar_host_auth";
const VIEWER_KEY    = "sar_viewer_auth";

// ── Session helpers ────────────────────────────────────────────────────────

export function isHostAuthenticated(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

export function isViewerAuthenticated(): boolean {
  try { return sessionStorage.getItem(VIEWER_KEY) === "1"; } catch { return false; }
}

export function isAnyAuthenticated(): boolean {
  return isHostAuthenticated() || isViewerAuthenticated();
}

function setHostAuthenticated() {
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
}

function setViewerAuthenticated() {
  try { sessionStorage.setItem(VIEWER_KEY, "1"); } catch {}
}

// ── Viewer PIN verification (checks DB) ───────────────────────────────────

async function verifyViewerPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("viewer_access")
    .select("id, expires_at, is_active")
    .eq("pin_hash", pin)           // plain pin stored as-is for simplicity
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (error) { console.error("[PinGate] DB error:", error.message); return false; }
  return (data?.length ?? 0) > 0;
}

// ── Component ──────────────────────────────────────────────────────────────

export type AuthLevel = "host" | "viewer";

interface Props {
  onAuthenticated: (level: AuthLevel) => void;
  onClose: () => void;
}

const HostPinGate: React.FC<Props> = ({ onAuthenticated, onClose }) => {
  const [pin, setPin]                   = useState("");
  const [showPin, setShowPin]           = useState(false);
  const [error, setError]               = useState("");
  const [attempts, setAttempts]         = useState(0);
  const [locked, setLocked]             = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [verifying, setVerifying]       = useState(false);
  const [tab, setTab]                   = useState<"host" | "viewer">("host");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [tab]);

  // Lockout countdown
  useEffect(() => {
    if (!locked) return;
    const iv = setInterval(() => {
      setLockSecondsLeft((s) => {
        if (s <= 1) { clearInterval(iv); setLocked(false); setAttempts(0); setError(""); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [locked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || verifying || !pin.trim()) return;

    // ── Tier 1: Host PIN ───────────────────────────────────────────────
    if (tab === "host") {
      if (pin === HOST_PIN) {
        setHostAuthenticated();
        onAuthenticated("host");
        return;
      }
      const n = attempts + 1;
      setAttempts(n);
      setPin("");
      if (n >= 3) {
        setLocked(true);
        setLockSecondsLeft(30);
        setError("Too many attempts — locked for 30 seconds.");
      } else {
        setError(`Incorrect PIN. ${3 - n} attempt${3 - n === 1 ? "" : "s"} remaining.`);
      }
      return;
    }

    // ── Tier 2: Viewer PIN (DB lookup) ─────────────────────────────────
    setVerifying(true);
    const valid = await verifyViewerPin(pin.trim());
    setVerifying(false);

    if (valid) {
      setViewerAuthenticated();
      onAuthenticated("viewer");
    } else {
      const n = attempts + 1;
      setAttempts(n);
      setPin("");
      if (n >= 3) {
        setLocked(true);
        setLockSecondsLeft(30);
        setError("Too many attempts — locked for 30 seconds.");
      } else {
        setError(`Invalid or expired viewer PIN. ${3 - n} attempt${3 - n === 1 ? "" : "s"} remaining.`);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(5px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-lg overflow-hidden"
        style={{
          background: "hsl(var(--surface))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 0 60px rgba(239,68,68,0.15), 0 25px 50px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Top accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-danger to-transparent" />

        {/* Tab selector */}
        <div className="flex border-b border-border" style={{ background: "hsl(var(--muted))" }}>
          <button
            onClick={() => { setTab("host"); setError(""); setPin(""); setAttempts(0); setLocked(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-heading text-[10px] tracking-widest border-b-2 transition-colors ${
              tab === "host"
                ? "border-danger text-danger bg-danger/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock size={10} /> HOST ACCESS
          </button>
          <button
            onClick={() => { setTab("viewer"); setError(""); setPin(""); setAttempts(0); setLocked(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-heading text-[10px] tracking-widest border-b-2 transition-colors ${
              tab === "viewer"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Satellite size={10} /> VIEWER ACCESS
          </button>
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: tab === "host"
                  ? "hsl(var(--danger) / 0.12)"
                  : "hsl(var(--primary) / 0.12)",
                border: `1px solid ${tab === "host"
                  ? "hsl(var(--danger) / 0.4)"
                  : "hsl(var(--primary) / 0.4)"}`,
              }}
            >
              {locked
                ? <ShieldAlert size={24} className="text-danger" />
                : tab === "host"
                  ? <Lock size={24} className="text-danger" />
                  : <Satellite size={24} className="text-primary" />}
            </div>
          </div>

          {tab === "host" ? (
            <>
              <h2 className="font-heading text-base font-700 tracking-widest text-center text-foreground mb-1">
                HOST AUTHENTICATION
              </h2>
              <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
                Full SAR platform access — live aircraft feed, alerts, satellite mode, AI prediction.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-heading text-base font-700 tracking-widest text-center text-foreground mb-1">
                VIEWER ACCESS
              </h2>
              <p className="text-xs text-muted-foreground text-center mb-2 leading-relaxed">
                Enter your subscription PIN to access the live feed.
              </p>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded mb-5 text-[10px] font-mono"
                style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}
              >
                <CreditCard size={12} className="text-primary shrink-0" />
                <div className="text-muted-foreground leading-relaxed">
                  Subscribe via <span className="text-primary">UPI: anands9408@oksbi</span> or
                  call <span className="text-primary">+91 8124919993</span> to receive your
                  monthly access PIN. PINs renew every 30 days.
                </div>
              </div>
            </>
          )}

          {locked ? (
            <div
              className="p-4 rounded text-center"
              style={{ background: "hsl(var(--danger) / 0.08)", border: "1px solid hsl(var(--danger) / 0.3)" }}
            >
              <ShieldAlert size={16} className="text-danger mx-auto mb-2" />
              <p className="text-xs text-danger font-heading font-700 tracking-wide">ACCESS LOCKED</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try again in <span className="text-danger font-mono font-700">{lockSecondsLeft}s</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(""); }}
                  placeholder={tab === "host" ? "Enter host PIN" : "Enter viewer PIN"}
                  maxLength={32}
                  className="w-full px-4 py-3 pr-10 rounded font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all"
                  style={{
                    background: "hsl(var(--muted))",
                    border: `1px solid ${error
                      ? "hsl(var(--danger) / 0.6)"
                      : tab === "host"
                        ? "hsl(var(--border))"
                        : "hsl(var(--primary) / 0.3)"}`,
                  }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {error && <p className="text-xs text-danger font-mono">{error}</p>}

              <button
                type="submit"
                disabled={!pin.trim() || verifying}
                className="w-full py-3 rounded font-heading text-sm font-700 tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: tab === "host" ? "hsl(var(--danger))" : "hsl(var(--primary))",
                  color: "#fff",
                }}
              >
                {verifying && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {verifying ? "VERIFYING…" : "AUTHENTICATE"}
              </button>
            </form>
          )}

          <p className="mt-4 text-[10px] text-muted-foreground text-center font-mono leading-relaxed">
            Unauthorised access is prohibited. All access attempts are logged.
          </p>
        </div>

        {/* Bottom accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </div>
  );
};

export { HostPinGate };
