/**
 * HostPinGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal dialog that gates the live aircraft feed behind a host PIN.
 * The PIN is stored as a constant — only the host who deployed the app knows it.
 * Authenticated state is kept in sessionStorage (cleared when tab closes).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from "react";
import { Lock, ShieldAlert, Eye, EyeOff, X } from "lucide-react";

// ── Change this to your secret host PIN ───────────────────────────────────
const HOST_PIN = "0904";
const SESSION_KEY = "sar_host_auth";

export function isHostAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function setHostAuthenticated(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {}
}

interface Props {
  onAuthenticated: () => void;
  onClose: () => void;
}

const HostPinGate: React.FC<Props> = ({ onAuthenticated, onClose }) => {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer when locked out
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      setLockSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setLocked(false);
          setAttempts(0);
          setError("");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (pin === HOST_PIN) {
      setHostAuthenticated();
      onAuthenticated();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      if (newAttempts >= 3) {
        setLocked(true);
        setLockSecondsLeft(30);
        setError("Too many attempts — locked for 30 seconds.");
      } else {
        setError(`Incorrect PIN. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? "" : "s"} remaining.`);
      }
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
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
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>

        {/* Top accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-danger to-transparent" />

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--danger) / 0.12)", border: "1px solid hsl(var(--danger) / 0.4)" }}
            >
              {locked ? (
                <ShieldAlert size={24} className="text-danger" />
              ) : (
                <Lock size={24} className="text-danger" />
              )}
            </div>
          </div>

          <h2 className="font-heading text-base font-700 tracking-widest text-center text-foreground mb-1">
            HOST AUTHENTICATION
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
            Live aircraft feed is restricted to authorised SAR operators only.
            Enter your host PIN to enable.
          </p>

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
                  placeholder="Enter host PIN"
                  maxLength={20}
                  className="w-full px-4 py-3 pr-10 rounded font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-danger/60 transition-all"
                  style={{
                    background: "hsl(var(--muted))",
                    border: `1px solid ${error ? "hsl(var(--danger) / 0.6)" : "hsl(var(--border))"}`,
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

              {error && (
                <p className="text-xs text-danger font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={!pin.trim()}
                className="w-full py-3 rounded font-heading text-sm font-700 tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "hsl(var(--danger))",
                  color: "#fff",
                }}
              >
                AUTHENTICATE
              </button>
            </form>
          )}

          <p className="mt-4 text-[10px] text-muted-foreground text-center font-mono leading-relaxed">
            Unauthorised access to live aircraft data is prohibited under SAR platform license.
            All access attempts are logged.
          </p>
        </div>

        {/* Bottom accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </div>
  );
};

export { HostPinGate };
