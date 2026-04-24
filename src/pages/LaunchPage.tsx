/**
 * SAR Platform — Product Hunt Launch Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Public page at /launch
 * - Countdown timer to launch date
 * - Feature showcase with screenshots
 * - Product Hunt badge and vote button
 * - Generated product logo
 * - Share links
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plane, Brain, Activity, Satellite, Globe, Shield,
  Radio, Zap, Mail, Star, ArrowRight, Share2,
  Clock, CheckCircle2, CloudLightning, Database,
} from "lucide-react";
import trackingImg from "@/assets/screenshot-tracking.jpg";
import aiImg from "@/assets/screenshot-ai.jpg";
import dangerImg from "@/assets/screenshot-danger.jpg";

// ── Countdown ──────────────────────────────────────────────────────────────

// Set your target launch date here
const LAUNCH_DATE = new Date("2026-05-01T10:00:00+05:30").getTime(); // IST

function useCountdown(target: number) {
  const [diff, setDiff] = useState(target - Date.now());

  useEffect(() => {
    const iv = setInterval(() => setDiff(target - Date.now()), 1000);
    return () => clearInterval(iv);
  }, [target]);

  const total = Math.max(0, diff);
  const d = Math.floor(total / 86400000);
  const h = Math.floor((total % 86400000) / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  return { d, h, m, s, launched: total <= 0 };
}

const CountUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="text-center">
    <div
      className="w-20 h-20 rounded-xl flex items-center justify-center font-heading text-4xl font-700 mb-2"
      style={{
        background: "hsl(220 40% 8%)",
        border: "2px solid hsl(var(--primary) / 0.4)",
        boxShadow: "0 0 20px hsl(var(--primary) / 0.1)",
        color: "hsl(var(--primary))",
      }}
    >
      {String(value).padStart(2, "0")}
    </div>
    <div className="label-tag text-[10px]">{label}</div>
  </div>
);

// ── Screenshots ────────────────────────────────────────────────────────────

const SCREENSHOTS = [
  {
    img: trackingImg,
    title: "Real-Time ADS-B Aircraft Tracking",
    desc: "Live aircraft positions from OpenSky Network on an interactive Leaflet map. Risk-colored icons, aircraft list with ICAO24 callsigns, altitude, heading, and velocity. Scan radius from 500 km to global.",
    tag: "Live Tracking",
    color: "#60a5fa",
  },
  {
    img: aiImg,
    title: "AI Crash Prediction Report",
    desc: "Google Gemini 3 Flash analyses real-time telemetry, wind drift, kinematics, and weather to generate a full tactical SAR report — crash probability, impact zone coordinates, recommended search sectors.",
    tag: "AI Powered",
    color: "#a855f7",
  },
  {
    img: dangerImg,
    title: "Automated Danger Assessment",
    desc: "Every tracked aircraft is scored across altitude, vertical rate, speed, and weather. CRITICAL/HIGH aircraft automatically trigger Gmail alerts to the mission operator with full risk breakdown.",
    tag: "Risk Scoring",
    color: "#ef4444",
  },
];

// ── Feature list ───────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Satellite, color: "#60a5fa", text: "Global ADS-B tracking via OpenSky Network (25s refresh)" },
  { icon: Brain,     color: "#a855f7", text: "AI crash prediction powered by Google Gemini 3 Flash" },
  { icon: Activity,  color: "#ef4444", text: "Automated CRITICAL/HIGH danger risk scoring for all aircraft" },
  { icon: CloudLightning, color: "#eab308", text: "Live weather fusion from Open-Meteo (wind drift, visibility)" },
  { icon: Radio,     color: "#22c55e", text: "ELT triangulation — multi-station 121.5 / 406 MHz bearing lines" },
  { icon: Database,  color: "#f97316", text: "Cloud history + CSV export + configurable data retention" },
  { icon: Globe,     color: "#06b6d4", text: "Physics engine: kinematics simulation with vector animation" },
  { icon: Shield,    color: "#8b5cf6", text: "Role-based access: Host / Subscriber / Free Viewer" },
];

// ── Main ───────────────────────────────────────────────────────────────────

const LaunchPage: React.FC = () => {
  const { d, h, m, s, launched } = useCountdown(LAUNCH_DATE);
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://sar-platform.onspace.app/launch";
  const phUrl    = "https://www.producthunt.com/posts/sar-platform"; // update after listing

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 px-6 lg:px-16 text-center"
        style={{ background: "hsl(var(--surface))", borderBottom: "1px solid hsl(var(--border))" }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)" }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img
              src="/sar-product-logo.png"
              alt="SAR Platform Logo"
              className="w-24 h-24 rounded-2xl object-cover"
              style={{ border: "2px solid hsl(var(--primary) / 0.4)", boxShadow: "0 0 40px hsl(var(--primary) / 0.2)" }}
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-700 tracking-widest mb-6"
            style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.3)", color: "hsl(var(--primary))" }}>
            <Star size={10} className="animate-pulse" />
            {launched ? "NOW LIVE ON PRODUCT HUNT" : "COMING SOON TO PRODUCT HUNT"}
          </div>

          <h1 className="font-heading text-5xl lg:text-6xl font-700 leading-tight text-foreground mb-6">
            SAR Platform<br />
            <span className="text-primary">is Launching</span>
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            AI-powered aircraft Search & Rescue intelligence — real-time ADS-B tracking, Google Gemini crash prediction,
            ELT triangulation, and automated emergency alerts.
          </p>

          {/* Countdown */}
          {!launched ? (
            <div className="flex items-center justify-center gap-6 mb-10">
              <CountUnit value={d} label="DAYS" />
              <div className="font-heading text-3xl font-700 text-primary mb-4">:</div>
              <CountUnit value={h} label="HOURS" />
              <div className="font-heading text-3xl font-700 text-primary mb-4">:</div>
              <CountUnit value={m} label="MINUTES" />
              <div className="font-heading text-3xl font-700 text-primary mb-4">:</div>
              <CountUnit value={s} label="SECONDS" />
            </div>
          ) : (
            <div className="mb-10 py-4 px-6 rounded-xl inline-block"
              style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.4)" }}>
              <div className="font-heading text-2xl font-700 text-primary">🚀 WE ARE LIVE!</div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {/* Product Hunt Badge */}
            <a
              href={phUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 rounded-xl font-heading text-sm font-700 tracking-wide transition-all"
              style={{
                background: "#ff6154",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(255,97,84,0.3)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="white"/>
                <path d="M22.5 13H16v14h4v-4.5h2.5a4.75 4.75 0 000-9.5zm0 6H20v-2.5h2.5a1.25 1.25 0 010 2.5z" fill="#ff6154"/>
              </svg>
              {launched ? "Vote on Product Hunt" : "Follow on Product Hunt"}
              <ArrowRight size={14} />
            </a>

            <Link
              to="/platform"
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-heading text-sm font-700 tracking-wide transition-all"
              style={{ background: "hsl(var(--primary))", color: "#fff" }}
            >
              <Plane size={14} /> TRY THE PLATFORM
            </Link>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-heading text-sm font-700 tracking-wide border border-border text-foreground hover:border-primary hover:text-primary transition-all"
            >
              <Share2 size={14} />
              {copied ? "LINK COPIED!" : "SHARE"}
            </button>
          </div>

          {/* Share text */}
          <p className="text-muted-foreground text-sm">
            Share with aviation communities, SAR operators, pilots, and aviation enthusiasts
          </p>
        </div>
      </section>

      {/* ── Product Hunt Embed Badge ──────────────────────────────────── */}
      <section className="py-10 px-6 text-center border-b border-border">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground mb-6">Support the launch — every upvote helps aviation safety reach more people</p>
          <div className="flex justify-center">
            <a
              href={phUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=sar-platform&theme=dark"
                alt="SAR Platform on Product Hunt"
                className="h-14 rounded"
                onError={(e) => {
                  // If badge fails, show a styled fallback
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </a>
          </div>

          {/* Fallback styled button */}
          <div className="mt-4">
            <a
              href={phUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-heading text-base font-700 tracking-widest transition-all"
              style={{
                background: "linear-gradient(135deg, #ff6154, #ff4136)",
                color: "#fff",
                boxShadow: "0 8px 32px rgba(255,97,84,0.3)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="white"/>
                <path d="M22.5 13H16v14h4v-4.5h2.5a4.75 4.75 0 000-9.5zm0 6H20v-2.5h2.5a1.25 1.25 0 010 2.5z" fill="#ff6154"/>
              </svg>
              ▲ UPVOTE ON PRODUCT HUNT
            </a>
          </div>
        </div>
      </section>

      {/* ── Screenshots ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-700 text-foreground mb-4">See It In Action</h2>
            <p className="text-muted-foreground">Real screens from the live SAR Platform dashboard.</p>
          </div>

          <div className="space-y-16">
            {SCREENSHOTS.map((sc, i) => (
              <div key={sc.title} className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 items-center`}>
                {/* Image */}
                <div className="lg:w-3/5 relative">
                  <div
                    className="absolute -inset-2 rounded-2xl opacity-30"
                    style={{ background: `radial-gradient(ellipse, ${sc.color}, transparent 70%)` }}
                  />
                  <img
                    src={sc.img}
                    alt={sc.title}
                    className="relative z-10 w-full rounded-xl object-cover"
                    style={{ border: `1px solid ${sc.color}40`, boxShadow: `0 0 40px ${sc.color}20` }}
                  />
                </div>

                {/* Description */}
                <div className="lg:w-2/5 space-y-4">
                  <div
                    className="inline-block px-3 py-1 rounded-full text-[10px] font-heading font-700 tracking-widest"
                    style={{ background: `${sc.color}15`, color: sc.color, border: `1px solid ${sc.color}40` }}
                  >
                    {sc.tag}
                  </div>
                  <h3 className="font-heading text-xl font-700 text-foreground">{sc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{sc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature List ────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 lg:px-16"
        style={{ background: "hsl(var(--surface))", borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-700 text-foreground mb-4">Full Feature Set</h2>
            <p className="text-muted-foreground">Everything packed into a single web application.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}40` }}>
                  <f.icon size={14} style={{ color: f.color }} />
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed pt-1">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Use / GIF Instructions ────────────────────────────── */}
      <section className="py-20 px-6 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-700 text-foreground mb-4">Getting Started</h2>
            <p className="text-muted-foreground">Up and running in under 2 minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "1", icon: Mail, color: "#60a5fa", title: "Login with Email OTP", desc: "Enter your email → receive 6-digit code → verify in seconds. No password to remember." },
              { step: "2", icon: Globe, color: "#22c55e", title: "Enable Aircraft Feed", desc: "Click the feed toggle to start scanning aircraft. Choose 500 km, 1K, 2K, or Global." },
              { step: "3", icon: Satellite, color: "#a855f7", title: "Click Any Aircraft", desc: "Select any aircraft on the map to begin tracking. AI prediction panel becomes ready." },
              { step: "4", icon: Brain, color: "#ef4444", title: "Generate AI Report", desc: "Click 'Generate Prediction' — Gemini analyses telemetry and returns a full SAR report." },
            ].map((step) => (
              <div key={step.step} className="p-5 rounded-xl flex flex-col gap-3"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-heading text-xs font-700"
                    style={{ background: `${step.color}18`, color: step.color, border: `1px solid ${step.color}40` }}>
                    {step.step}
                  </div>
                  <step.icon size={14} style={{ color: step.color }} />
                </div>
                <h3 className="font-heading text-sm font-700 text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Demo GIF placeholder */}
          <div
            className="mt-12 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: "hsl(220 40% 5%)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              height: 240,
              boxShadow: "0 0 40px hsl(var(--primary) / 0.08)",
            }}
          >
            <div className="text-center">
              <div className="font-heading text-2xl mb-2">🎬</div>
              <p className="font-heading text-sm font-700 tracking-widest text-foreground mb-1">DEMO VIDEO</p>
              <p className="font-mono text-[10px] text-muted-foreground mb-3">Record a 2-minute walkthrough and embed here</p>
              <div className="flex flex-wrap justify-center gap-2 text-[9px] font-heading font-700">
                {["OBS Studio", "Loom", "YouTube Embed", "GIF (ezgif)"].map((t) => (
                  <span key={t} className="px-2 py-1 rounded"
                    style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center"
        style={{ background: "hsl(var(--surface))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="max-w-xl mx-auto">
          <img src="/sar-product-logo.png" alt="SAR" className="w-16 h-16 rounded-xl mx-auto mb-6 object-cover"
            style={{ border: "1px solid hsl(var(--primary) / 0.4)" }} />
          <h2 className="font-heading text-3xl font-700 text-foreground mb-4">Support the Launch</h2>
          <p className="text-muted-foreground mb-8">
            A free upvote on Product Hunt helps SAR Platform reach more aviation professionals, search and rescue teams, and pilot communities.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <a href={phUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-heading text-sm font-700 tracking-widest"
              style={{ background: "#ff6154", color: "#fff", boxShadow: "0 4px 20px rgba(255,97,84,0.3)" }}>
              ▲ UPVOTE ON PRODUCT HUNT
            </a>
            <Link to="/about"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-heading text-sm font-700 tracking-widest border border-border text-foreground hover:border-primary hover:text-primary transition-all">
              LEARN MORE
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5 text-primary"><Zap size={11} /> UPI: anands9408@oksbi</div>
            <div className="flex items-center gap-1.5 text-primary"><Mail size={11} /> anands9408@gmail.com</div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border" style={{ background: "hsl(var(--background))" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Plane size={12} className="text-primary" />
            <span className="font-heading font-700 tracking-widest">SAR PLATFORM</span>
          </Link>
          <div className="flex gap-4">
            <Link to="/about"   className="hover:text-primary transition-colors">About</Link>
            <Link to="/docs"    className="hover:text-primary transition-colors">Docs</Link>
            <Link to="/license" className="hover:text-primary transition-colors">License</Link>
          </div>
          <span>anands9408@gmail.com</span>
        </div>
      </footer>
    </div>
  );
};

export default LaunchPage;
