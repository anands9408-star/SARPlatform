/**
 * SAR Platform — Login Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1: Enter email — system checks if host or active subscriber
 * Step 2: Enter 6-digit OTP sent to email via Gmail
 * Marketing section + How it works for advertising the platform
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  Plane, Mail, Lock, ArrowRight, RefreshCw, Shield, Globe,
  Brain, Activity, Satellite, CloudLightning, ChevronRight,
  Star, Zap, Eye, CheckCircle2, AlertTriangle, PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import type { SARUser } from "@/hooks/useAuth";

// ── OTP Input Component ────────────────────────────────────────────────────

const OTPInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onComplete: () => void;
}> = ({ value, onChange, onComplete }) => {
  const digits = value.padEnd(6, " ").split("").slice(0, 6);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.length === 6) onComplete();
  };

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
        onKeyDown={handleKey}
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

// ── Feature cards ──────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Satellite,
    color: "#60a5fa",
    title: "Global ADS-B Tracking",
    desc: "Real-time aircraft positions from OpenSky satellite receivers — worldwide coverage, 25-second refresh.",
  },
  {
    icon: Brain,
    color: "#a855f7",
    title: "AI Prediction Engine",
    desc: "Google Gemini 3 Flash analyses telemetry, physics vectors, and weather to generate tactical SAR reports.",
  },
  {
    icon: Activity,
    color: "#ef4444",
    title: "Danger Assessment",
    desc: "Automated CRITICAL/HIGH/WATCH risk scoring for every tracked aircraft with multi-factor analysis.",
  },
  {
    icon: CloudLightning,
    color: "#eab308",
    title: "Live Weather Integration",
    desc: "Open-Meteo weather data merged with aircraft positions — wind drift, visibility, storm danger zones.",
  },
  {
    icon: Shield,
    color: "#22c55e",
    title: "Physics Engine",
    desc: "Vector kinematics (v=u+at, relative velocity, wind drift) computed off-thread for zero UI lag.",
  },
  {
    icon: Globe,
    color: "#f97316",
    title: "ELT Triangulation",
    desc: "Multi-station bearing line intersection to locate Emergency Locator Transmitters in the field.",
  },
];

const PLANS = [
  {
    name: "Viewer",
    price: "Subscription",
    color: "#60a5fa",
    border: "border-primary/40",
    features: [
      "Live aircraft feed (up to 500 km)",
      "AI prediction reports",
      "Danger assessment panel",
      "Live weather overlay",
      "30-day access pass",
    ],
    cta: "Subscribe",
    ctaBg: "bg-primary",
    highlight: false,
  },
  {
    name: "Host",
    price: "Private Access",
    color: "#ef4444",
    border: "border-danger/60",
    features: [
      "Full platform — all features",
      "Unlimited scan radius (GLOBAL)",
      "Physics + kinematics panels",
      "Subscriber access manager",
      "Alert & retention controls",
      "Communication satellites panel",
      "ELT triangulation & mission input",
    ],
    cta: "Host Login",
    ctaBg: "bg-danger",
    highlight: true,
  },
];

// ── Main Page ──────────────────────────────────────────────────────────────

type Step = "email" | "otp";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isHost } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"host" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/platform", { replace: true });
  }, [isAuthenticated, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const iv = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(iv);
  }, [resendCooldown]);

  useEffect(() => { emailInputRef.current?.focus(); }, []);

  // ── Step 1: Send OTP ────────────────────────────────────────────────────

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || loading) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
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
        try {
          const text = await fnErr.context?.text();
          const parsed = JSON.parse(text || "{}");
          msg = parsed.message || parsed.error || msg;
        } catch {}
      }
      if (msg.includes("no_access") || (data && data.error === "no_access")) {
        toast.error("No active subscription found. Contact +91 8124919993 or UPI: anands9408@oksbi");
      } else {
        toast.error(`Could not send OTP: ${msg}`);
      }
      setLoading(false);
      return;
    }

    if (data?.error === "no_access") {
      toast.error("No active subscription. Contact +91 8124919993 or pay via UPI: anands9408@oksbi");
      setLoading(false);
      return;
    }

    if (data?.role) setRole(data.role);
    setStep("otp");
    setResendCooldown(60);
    toast.success(`OTP sent to ${email.trim()} — check your inbox.`);
    setLoading(false);
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────

  const handleVerifyOTP = async () => {
    if (otp.length !== 6 || loading) return;
    setLoading(true);

    const { data, error: fnErr } = await supabase.functions.invoke("sar-auth-otp", {
      body: { email: email.trim().toLowerCase(), action: "verify", otp },
    });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try {
          const text = await fnErr.context?.text();
          const parsed = JSON.parse(text || "{}");
          msg = parsed.message || parsed.error || msg;
        } catch {}
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

    const user: SARUser = {
      email: data.email || email.trim().toLowerCase(),
      role: data.role,
      loginAt: Date.now(),
    };

    login(user);
    toast.success(
      data.role === "host"
        ? "Host access granted — full platform unlocked."
        : "Welcome! Viewer access granted."
    );
    navigate("/platform", { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>

      {/* ── Hero / Auth Section ───────────────────────────────────────── */}
      <div className="min-h-screen flex flex-col lg:flex-row">

        {/* Left: Marketing panel */}
        <div className="lg:w-3/5 flex flex-col justify-center p-8 lg:p-16 relative overflow-hidden">
          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Radar circle */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/8 opacity-30"
            style={{ boxShadow: "0 0 80px hsl(var(--primary)/0.15) inset" }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/10" />

          <div className="relative z-10 max-w-xl">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.4)" }}
              >
                <Plane size={22} className="text-primary" />
              </div>
              <div>
                <div className="font-heading text-xl font-700 tracking-widest text-foreground">SAR PLATFORM</div>
                <div className="text-xs text-muted-foreground font-mono">Search Aircraft Rescue</div>
              </div>
            </div>

            <h1 className="font-heading text-4xl lg:text-5xl font-700 leading-tight text-foreground mb-4">
              Real-Time Aircraft<br />
              <span className="text-primary">Rescue Intelligence</span>
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-md">
              Professional-grade aviation monitoring with AI prediction, physics-based crash analysis,
              and multi-channel emergency alerts. Built for SAR mission operators and aviation professionals.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-10">
              {["Global ADS-B", "AI Prediction", "Weather Fusion", "ELT Triangulation", "Risk Scoring"].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full text-xs font-heading font-700 tracking-wide border"
                  style={{
                    background: "hsl(var(--primary)/0.08)",
                    border: "1px solid hsl(var(--primary)/0.25)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "25s", label: "Refresh Rate" },
                { value: "1500km", label: "Default Scan" },
                { value: "GLOBAL", label: "Max Coverage" },
              ].map((s) => (
                <div key={s.label}
                  className="p-3 rounded-lg text-center"
                  style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
                >
                  <div className="font-heading text-xl font-700 text-primary">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Auth Panel */}
        <div className="lg:w-2/5 flex items-center justify-center p-8"
          style={{ background: "hsl(var(--surface))", borderLeft: "1px solid hsl(var(--border))" }}
        >
          <div className="w-full max-w-sm">

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 font-heading border transition-all ${
                step === "email" ? "bg-primary text-white border-primary" : "bg-success/15 border-success text-success"
              }`}>
                {step === "email" ? "1" : <CheckCircle2 size={14} />}
              </div>
              <div className={`flex-1 h-px transition-all ${step === "otp" ? "bg-primary" : "bg-border"}`} />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 font-heading border transition-all ${
                step === "otp" ? "bg-primary text-white border-primary" : "bg-muted/30 border-border text-muted-foreground"
              }`}>
                2
              </div>
            </div>

            {step === "email" ? (
              <>
                <h2 className="font-heading text-2xl font-700 tracking-wide text-foreground mb-1">
                  Access Portal
                </h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Enter your email to receive a one-time access code.
                  Host and subscriber emails are verified automatically.
                </p>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="label-tag block mb-2 text-[10px]">EMAIL ADDRESS</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        ref={emailInputRef}
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

                  <button
                    type="submit"
                    disabled={!email.trim() || loading}
                    className="w-full py-3 rounded-lg font-heading text-sm font-700 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "hsl(var(--primary))", color: "#fff" }}
                  >
                    {loading
                      ? <><RefreshCw size={14} className="animate-spin" /> SENDING CODE…</>
                      : <><Mail size={14} /> SEND ACCESS CODE <ArrowRight size={14} /></>}
                  </button>
                </form>

                {/* Subscription info */}
                <div
                  className="mt-6 p-4 rounded-lg"
                  style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
                >
                  <div className="font-heading text-[10px] tracking-widest text-muted-foreground mb-2">
                    NEED ACCESS?
                  </div>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center gap-2 text-primary">
                      <span>UPI:</span>
                      <span className="font-700">anands9408@oksbi</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <PhoneCall size={10} />
                      <span className="font-700">+91 8124919993</span>
                    </div>
                    <div className="text-muted-foreground text-[10px] mt-1">
                      Pay monthly subscription → receive email access code
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-heading text-2xl font-700 tracking-wide text-foreground mb-1">
                  Enter Access Code
                </h2>
                <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                  We sent a 6-digit code to:
                </p>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded mb-6 text-sm font-mono"
                  style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--primary)/0.3)" }}
                >
                  <Mail size={12} className="text-primary shrink-0" />
                  <span className="text-primary font-700 truncate">{email}</span>
                </div>

                {/* Role badge */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded mb-5 text-[10px] font-heading tracking-widest ${
                    role === "host"
                      ? "bg-danger/8 border border-danger/30 text-danger"
                      : "bg-primary/8 border border-primary/30 text-primary"
                  }`}
                >
                  {role === "host" ? <Shield size={11} /> : <Eye size={11} />}
                  {role === "host" ? "HOST ACCESS DETECTED" : "SUBSCRIBER ACCESS DETECTED"}
                </div>

                <OTPInput value={otp} onChange={setOtp} onComplete={handleVerifyOTP} />

                <button
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || loading}
                  className="mt-5 w-full py-3 rounded-lg font-heading text-sm font-700 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: role === "host" ? "hsl(var(--danger))" : "hsl(var(--primary))",
                    color: "#fff",
                  }}
                >
                  {loading
                    ? <><RefreshCw size={14} className="animate-spin" /> VERIFYING…</>
                    : <><Lock size={14} /> AUTHENTICATE <ArrowRight size={14} /></>}
                </button>

                {/* Resend + back */}
                <div className="flex items-center justify-between mt-4 text-xs">
                  <button
                    onClick={() => { setStep("email"); setOtp(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Change email
                  </button>
                  <button
                    onClick={handleSendOTP}
                    disabled={resendCooldown > 0 || loading}
                    className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
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
            <h2 className="font-heading text-3xl font-700 tracking-wide text-foreground mb-3">
              Platform Capabilities
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built for aviation professionals and SAR mission operators who need real-time situational awareness.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl"
                style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}44` }}
                >
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
            <h2 className="font-heading text-3xl font-700 tracking-wide text-foreground mb-3">
              Access Plans
            </h2>
            <p className="text-muted-foreground">
              Subscribe to access live tracking and AI-powered mission intelligence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border-2 ${plan.border} ${plan.highlight ? "relative" : ""}`}
                style={{ background: "hsl(var(--surface))" }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-heading font-700 tracking-widest"
                    style={{ background: "hsl(var(--danger))", color: "#fff" }}
                  >
                    HOST ONLY
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-lg font-700" style={{ color: plan.color }}>{plan.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{plan.price}</p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${plan.color}18` }}
                  >
                    {plan.name === "Host" ? <Shield size={16} style={{ color: plan.color }} /> : <Star size={16} style={{ color: plan.color }} />}
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} style={{ color: plan.color, flexShrink: 0 }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                {plan.name === "Viewer" && (
                  <div
                    className="p-3 rounded-lg text-[11px] font-mono space-y-1"
                    style={{ background: "hsl(var(--muted))" }}
                  >
                    <div className="flex items-center gap-1.5 text-primary"><Zap size={10} /> UPI: anands9408@oksbi</div>
                    <div className="flex items-center gap-1.5 text-primary"><PhoneCall size={10} /> +91 8124919993</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer
        className="py-8 px-6 border-t border-border text-center"
        style={{ background: "hsl(var(--surface))" }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Plane size={14} className="text-primary" />
          <span className="font-heading text-sm font-700 tracking-widest text-foreground">SAR PLATFORM</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-3">
          Search Aircraft Rescue — Research-grade aviation monitoring platform
        </p>
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
