/**
 * SAR Platform — Login Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1: Enter email → Gmail OTP sent to any email
 * Step 2: Enter 6-digit OTP (verify email)
 * Step 3: Choose access level
 *   → Host:        enter host password
 *   → Subscriber:  auto-check active subscription
 *   → Free Viewer: enter host-set free view password
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { SARUser } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  Plane, Mail, Lock, ArrowRight, RefreshCw, Shield, Globe,
  Brain, Activity, Satellite, CloudLightning, CheckCircle2,
  Eye, Zap, Star, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ── OTP Box Input ──────────────────────────────────────────────────────────

const OTPInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onComplete: () => void;
}> = ({ value, onChange, onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(v);
          if (v.length === 6) onComplete();
        }}
        onKeyDown={(e) => { if (e.key === "Enter" && value.length === 6) onComplete(); }}
        className="absolute inset-0 opacity-0 w-full h-full cursor-text"
        autoComplete="one-time-code"
      />
      <div className="flex gap-2 justify-center" onClick={() => inputRef.current?.focus()}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`w-11 h-14 rounded flex items-center justify-center font-mono text-xl font-700 border-2 transition-all cursor-text ${
              i < value.length
                ? "border-primary bg-primary/10 text-foreground"
                : i === value.length
                  ? "border-primary/70 bg-surface animate-pulse"
                  : "border-border bg-muted/30 text-muted-foreground"
            }`}
          >
            {value[i] ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Feature cards data ─────────────────────────────────────────────────────

const FEATURES = [
  { icon: Satellite, color: "#60a5fa", title: "Global ADS-B Tracking", desc: "Real-time aircraft positions from OpenSky — worldwide coverage, 25-second refresh." },
  { icon: Brain, color: "#a855f7", title: "AI Prediction Engine", desc: "Google Gemini 3 Flash analyses telemetry, physics, and weather to generate tactical SAR reports." },
  { icon: Activity, color: "#ef4444", title: "Danger Assessment", desc: "Automated CRITICAL/HIGH/WATCH risk scoring for every tracked aircraft." },
  { icon: CloudLightning, color: "#eab308", title: "Live Weather Integration", desc: "Open-Meteo weather merged with aircraft positions — wind drift, visibility, storm zones." },
  { icon: Shield, color: "#22c55e", title: "Physics Engine", desc: "Vector kinematics computed off-thread — zero UI lag." },
  { icon: Globe, color: "#f97316", title: "ELT Triangulation", desc: "Multi-station bearing line intersection to locate Emergency Locator Transmitters." },
];

// ── Step type ──────────────────────────────────────────────────────────────

type Step = "email" | "otp" | "role";
type RoleChoice = "host" | "viewer" | "free_viewer";

// ── Main ───────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [step, setStep]             = useState<Step>("email");
  const [email, setEmail]           = useState("");
  const [otp, setOtp]               = useState("");
  const [roleChoice, setRoleChoice] = useState<RoleChoice | null>(null);
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate("/platform", { replace: true }); }, [isAuthenticated, navigate]);
  useEffect(() => { emailRef.current?.focus(); }, []);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const iv = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(iv);
  }, [resendCooldown]);

  // ── Google OAuth Sign-In ──────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/platform",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      toast.error(`Google sign-in failed: ${error.message}`);
      setGoogleLoading(false);
    }
    // On success, browser redirects to Google — no further state needed
  };

  // ── Step 1: Send OTP to any email ────────────────────────────────────

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const { data, error: fnErr } = await supabase.functions.invoke("sar-auth-otp", {
      body: { email: email.trim().toLowerCase(), action: "send" },
    });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { const t = await fnErr.context?.text(); msg = JSON.parse(t || "{}").message || msg; } catch {}
      }
      toast.error(`Could not send OTP: ${msg}`);
      setLoading(false);
      return;
    }

    setStep("otp");
    setResendCooldown(60);
    toast.success(`Verification code sent to ${email.trim()}`);
    setLoading(false);
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────

  const handleVerifyOTP = async () => {
    if (otp.length !== 6 || loading) return;
    setLoading(true);

    const { data, error: fnErr } = await supabase.functions.invoke("sar-auth-otp", {
      body: { email: email.trim().toLowerCase(), action: "verify", otp },
    });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { const t = await fnErr.context?.text(); msg = JSON.parse(t || "{}").message || msg; } catch {}
      }
      toast.error(msg || "Invalid code — please try again.");
      setOtp("");
      setLoading(false);
      return;
    }

    if (data?.error) {
      toast.error(data.message || "Invalid or expired code.");
      setOtp("");
      setLoading(false);
      return;
    }

    toast.success("Email verified — choose your access level.");
    setStep("role");
    setLoading(false);
  };

  // ── Step 3: Resolve role ──────────────────────────────────────────────

  const handleResolveRole = async () => {
    if (!roleChoice || loading) return;
    if ((roleChoice === "host" || roleChoice === "free_viewer") && !password.trim()) {
      toast.error("Please enter the password.");
      return;
    }

    setLoading(true);
    const body: Record<string, string> = {
      email: email.trim().toLowerCase(),
      action: "resolve_role",
      role: roleChoice,
    };
    if (password.trim()) body.password = password.trim();

    const { data, error: fnErr } = await supabase.functions.invoke("sar-auth-otp", { body });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { const t = await fnErr.context?.text(); msg = JSON.parse(t || "{}").message || msg; } catch {}
      }
      toast.error(msg || "Access denied.");
      setPassword("");
      setLoading(false);
      return;
    }

    if (data?.error) {
      toast.error(data.message || "Access denied.");
      setPassword("");
      setLoading(false);
      return;
    }

    const user: SARUser = {
      email: data.email || email.trim().toLowerCase(),
      role: data.role,
      loginAt: Date.now(),
    };

    login(user);
    const msgs: Record<string, string> = {
      host: "Host access granted — full platform unlocked.",
      viewer: "Welcome! Subscriber access granted.",
      free_viewer: "Free view access granted — read-only mode.",
    };
    toast.success(msgs[data.role] || "Access granted.");
    navigate("/platform", { replace: true });
    setLoading(false);
  };

  // ── Step indicator ────────────────────────────────────────────────────

  const stepLabels = ["Email", "Verify", "Access"];
  const stepIndex  = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <div className="min-h-screen flex flex-col lg:flex-row">

        {/* ── Left: Marketing ─────────────────────────────────────────── */}
        <div className="lg:w-3/5 flex flex-col justify-center p-8 lg:p-16 relative overflow-hidden">
          {/* grid bg */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/8 opacity-25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/10 opacity-20" />

          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.4)" }}>
                <Plane size={22} className="text-primary" />
              </div>
              <div>
                <div className="font-heading text-xl font-700 tracking-widest text-foreground">SAR PLATFORM</div>
                <div className="text-xs text-muted-foreground font-mono">Search Aircraft Rescue</div>
              </div>
            </div>

            <h1 className="font-heading text-4xl lg:text-5xl font-700 leading-tight text-foreground mb-4">
              Real-Time Aircraft<br /><span className="text-primary">Rescue Intelligence</span>
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-md">
              Professional-grade aviation monitoring with AI prediction, physics-based crash analysis,
              and automated emergency alerts for SAR mission operators.
            </p>

            <div className="flex flex-wrap gap-2 mb-10">
              {["Global ADS-B", "AI Prediction", "Weather Fusion", "ELT Triangulation", "Risk Scoring"].map((f) => (
                <span key={f} className="px-3 py-1.5 rounded-full text-xs font-heading font-700 tracking-wide"
                  style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.25)", color: "hsl(var(--primary))" }}>
                  {f}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[{ value: "25s", label: "Refresh Rate" }, { value: "1500km", label: "Default Scan" }, { value: "GLOBAL", label: "Max Coverage" }].map((s) => (
                <div key={s.label} className="p-3 rounded-lg text-center"
                  style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
                  <div className="font-heading text-xl font-700 text-primary">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Auth Panel ─────────────────────────────────────────── */}
        <div className="lg:w-2/5 flex items-center justify-center p-8"
          style={{ background: "hsl(var(--surface))", borderLeft: "1px solid hsl(var(--border))" }}>
          <div className="w-full max-w-sm">

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-7">
              {stepLabels.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 font-heading border-2 transition-all ${
                      i < stepIndex
                        ? "bg-success/15 border-success text-success"
                        : i === stepIndex
                          ? "bg-primary text-white border-primary"
                          : "bg-muted/30 border-border text-muted-foreground"
                    }`}>
                      {i < stepIndex ? <CheckCircle2 size={13} /> : i + 1}
                    </div>
                    <span className={`text-[9px] font-heading tracking-widest ${i === stepIndex ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-px mb-4 transition-all ${i < stepIndex ? "bg-success" : i === stepIndex - 1 ? "bg-primary" : "bg-border"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ── Step 1: Email ─────────────────────────────────────── */}
            {step === "email" && (
              <>
                <h2 className="font-heading text-2xl font-700 tracking-wide text-foreground mb-1">Access Portal</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Enter your email. We'll send a one-time verification code.
                </p>

                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full py-3 rounded-lg font-heading text-sm font-700 tracking-wide flex items-center justify-center gap-2 mb-5 transition-all border disabled:opacity-50"
                  style={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {googleLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                      </g>
                    </svg>
                  )}
                  {googleLoading ? "Redirecting…" : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
                  <span className="text-[10px] text-muted-foreground font-mono">or verify by email</span>
                  <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
                </div>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="label-tag block mb-2 text-[10px]">EMAIL ADDRESS</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="sar-input pl-9 w-full text-sm"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={!email.trim() || loading}
                    className="w-full py-3 rounded-lg font-heading text-sm font-700 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                    {loading
                      ? <><RefreshCw size={14} className="animate-spin" /> SENDING CODE…</>
                      : <><Mail size={14} /> SEND VERIFICATION CODE <ArrowRight size={14} /></>}
                  </button>
                </form>

                {/* Contact */}
                <div className="mt-6 p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                  <div className="font-heading text-[10px] tracking-widest text-muted-foreground mb-2">NEED SUBSCRIPTION ACCESS?</div>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center gap-2 text-primary">
                      <Zap size={10} /> UPI: <span className="font-700">anands9408@oksbi</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <Mail size={10} /> <span className="font-700">anands9408@gmail.com</span>
                    </div>
                    <div className="text-muted-foreground text-[10px] mt-1">
                      Pay monthly subscription → email us → receive subscriber access
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: OTP ───────────────────────────────────────── */}
            {step === "otp" && (
              <>
                <h2 className="font-heading text-2xl font-700 tracking-wide text-foreground mb-1">Verify Email</h2>
                <p className="text-sm text-muted-foreground mb-2 leading-relaxed">6-digit code sent to:</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded mb-6 text-sm font-mono"
                  style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                  <Mail size={12} className="text-primary shrink-0" />
                  <span className="text-primary font-700 truncate">{email}</span>
                </div>

                <OTPInput value={otp} onChange={setOtp} onComplete={handleVerifyOTP} />

                <button onClick={handleVerifyOTP} disabled={otp.length !== 6 || loading}
                  className="mt-5 w-full py-3 rounded-lg font-heading text-sm font-700 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                  {loading
                    ? <><RefreshCw size={14} className="animate-spin" /> VERIFYING…</>
                    : <><CheckCircle2 size={14} /> VERIFY CODE <ArrowRight size={14} /></>}
                </button>

                <div className="flex items-center justify-between mt-4 text-xs">
                  <button onClick={() => { setStep("email"); setOtp(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    ← Change email
                  </button>
                  <button onClick={handleSendOTP} disabled={resendCooldown > 0 || loading}
                    className="text-primary hover:underline disabled:opacity-50 font-mono">
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: Role Selection ─────────────────────────────── */}
            {step === "role" && (
              <>
                <h2 className="font-heading text-2xl font-700 tracking-wide text-foreground mb-1">Choose Access</h2>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Select your access level for SAR Platform.
                </p>

                {/* Role cards */}
                <div className="space-y-2 mb-5">
                  {[
                    {
                      id: "host" as RoleChoice,
                      icon: Shield,
                      label: "Host",
                      desc: "Full platform — all features, unlimited radius",
                      color: "#ef4444",
                      border: roleChoice === "host" ? "border-danger" : "border-border",
                      needsPassword: true,
                      placeholder: "Host password",
                    },
                    {
                      id: "viewer" as RoleChoice,
                      icon: Star,
                      label: "Subscriber",
                      desc: "AI prediction, danger assessment, weather, 500 km scan",
                      color: "#60a5fa",
                      border: roleChoice === "viewer" ? "border-primary" : "border-border",
                      needsPassword: false,
                      placeholder: "",
                    },
                    {
                      id: "free_viewer" as RoleChoice,
                      icon: Eye,
                      label: "Free View",
                      desc: "Read-only map and weather — no subscription needed",
                      color: "#22c55e",
                      border: roleChoice === "free_viewer" ? "border-success" : "border-border",
                      needsPassword: true,
                      placeholder: "Free view password",
                    },
                  ].map((r) => (
                    <div key={r.id}>
                      <button
                        onClick={() => { setRoleChoice(r.id); setPassword(""); }}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${r.border}`}
                        style={{
                          background: roleChoice === r.id ? `${r.color}10` : "hsl(var(--muted))",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${r.color}18` }}>
                            <r.icon size={15} style={{ color: r.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-heading text-sm font-700 text-foreground">{r.label}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">{r.desc}</div>
                          </div>
                          {roleChoice === r.id && (
                            <CheckCircle2 size={14} style={{ color: r.color, flexShrink: 0 }} />
                          )}
                        </div>
                      </button>

                      {/* Password input for host and free_viewer */}
                      {roleChoice === r.id && r.needsPassword && (
                        <div className="mt-2 relative">
                          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleResolveRole(); }}
                            placeholder={r.placeholder}
                            className="sar-input pl-9 w-full text-sm"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleResolveRole}
                  disabled={!roleChoice || loading || ((roleChoice === "host" || roleChoice === "free_viewer") && !password.trim())}
                  className="w-full py-3 rounded-lg font-heading text-sm font-700 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: roleChoice === "host" ? "hsl(var(--danger))"
                      : roleChoice === "free_viewer" ? "hsl(130 50% 35%)"
                      : "hsl(var(--primary))",
                    color: "#fff",
                  }}
                >
                  {loading
                    ? <><RefreshCw size={14} className="animate-spin" /> AUTHENTICATING…</>
                    : <><Lock size={14} /> ENTER PLATFORM <ArrowRight size={14} /></>}
                </button>

                <button onClick={() => { setStep("otp"); setOtp(""); setRoleChoice(null); setPassword(""); }}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
                  ← Back to verification
                </button>
              </>
            )}

            {/* License link */}
            <div className="mt-8 pt-6 border-t border-border text-center">
              <a href="/license" className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono">
                View License & Terms of Use
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Grid ──────────────────────────────────────────────── */}
      <div className="py-16 px-6 lg:px-16" style={{ background: "hsl(var(--surface))" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl font-700 tracking-wide text-foreground mb-3">Platform Capabilities</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built for aviation professionals and SAR mission operators needing real-time situational awareness.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-5 rounded-xl"
                style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}44` }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-heading text-sm font-700 text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Access Plans ──────────────────────────────────────────────── */}
      <div className="py-16 px-6 lg:px-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl font-700 tracking-wide text-foreground mb-3">Access Plans</h2>
            <p className="text-muted-foreground">Subscribe to unlock live AI-powered mission intelligence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: "Free View", icon: Eye, color: "#22c55e", border: "border-success/40",
                features: ["Read-only map", "Live weather data", "No subscription needed", "Password required"],
                contact: false,
              },
              {
                name: "Subscriber", icon: Star, color: "#60a5fa", border: "border-primary/40",
                features: ["Live aircraft feed (≤500 km)", "AI prediction reports", "Danger assessment", "Live weather overlay", "30-day access"],
                contact: true,
              },
              {
                name: "Host", icon: Shield, color: "#ef4444", border: "border-danger/60",
                features: ["Full platform — all features", "Unlimited global scan", "Subscriber manager", "Alert controls", "ELT + mission input"],
                contact: false,
              },
            ].map((plan) => (
              <div key={plan.name} className={`p-5 rounded-xl border-2 ${plan.border}`}
                style={{ background: "hsl(var(--surface))" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${plan.color}18` }}>
                    <plan.icon size={15} style={{ color: plan.color }} />
                  </div>
                  <h3 className="font-heading text-sm font-700" style={{ color: plan.color }}>{plan.name}</h3>
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <CheckCircle2 size={10} style={{ color: plan.color, flexShrink: 0 }} /> {feat}
                    </li>
                  ))}
                </ul>
                {plan.contact && (
                  <div className="p-2.5 rounded text-[10px] font-mono space-y-1"
                    style={{ background: "hsl(var(--muted))" }}>
                    <div className="flex items-center gap-1.5 text-primary"><Zap size={9} /> UPI: anands9408@oksbi</div>
                    <div className="flex items-center gap-1.5 text-primary"><Mail size={9} /> anands9408@gmail.com</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border text-center" style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Plane size={14} className="text-primary" />
          <span className="font-heading text-sm font-700 tracking-widest text-foreground">SAR PLATFORM</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-3">Search Aircraft Rescue — Research-grade aviation monitoring</p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <a href="/license" className="hover:text-primary transition-colors">License</a>
          <span>·</span>
          <a href="/docs" className="hover:text-primary transition-colors">Documentation</a>
          <span>·</span>
          <span>Data: OpenSky Network · Open-Meteo</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
          <AlertTriangle size={9} />
          <span>Not certified for operational SAR use. Always defer to official aviation authorities.</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
