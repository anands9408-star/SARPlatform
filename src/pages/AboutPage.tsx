/**
 * SAR Platform — Public About / Landing Page
 * Fully crawlable by Google — no auth required
 * Rich SEO content: features, FAQ, how it works, pricing
 */

import React from "react";
import { Link } from "react-router-dom";
import {
  Plane, Brain, Activity, CloudLightning, Satellite,
  Globe, Shield, Eye, Zap, Mail, CheckCircle2,
  ChevronDown, ChevronUp, Radio, MapPin, Database, Star, Video, Play,
} from "lucide-react";
import trackingImg from "@/assets/screenshot-tracking.jpg";
import aiImg from "@/assets/screenshot-ai.jpg";
import dangerImg from "@/assets/screenshot-danger.jpg";

const FAQ_ITEMS = [
  {
    q: "What is SAR Platform?",
    a: "SAR Platform is a professional real-time aircraft monitoring and Search & Rescue intelligence system. It tracks live aircraft using ADS-B transponder data from OpenSky Network, applies AI-powered crash prediction via Google Gemini, integrates live weather, and sends automated Gmail alerts for high-risk aircraft.",
  },
  {
    q: "How does real-time aircraft tracking work?",
    a: "SAR Platform fetches live ADS-B (Automatic Dependent Surveillance–Broadcast) data from the OpenSky Network every 25 seconds. ADS-B is the global standard where aircraft broadcast their position, altitude, speed, and heading. Our server-side edge proxy handles CORS and rate limiting — scan radius ranges from 500 km to global coverage.",
  },
  {
    q: "What AI technology powers the predictions?",
    a: "We use Google Gemini 3 Flash to generate tactical SAR prediction reports. The AI analyses real-time telemetry, physics calculations (kinematics, vector math, wind drift), and weather data to determine crash risk, probable impact zone, and recommended search sectors.",
  },
  {
    q: "What is ELT triangulation?",
    a: "An Emergency Locator Transmitter (ELT) broadcasts a distress signal on 121.5 MHz or 406 MHz when an aircraft crashes. SAR Platform lets operators log signal strength and bearing from multiple ground stations, then triangulates the intersection point to estimate the crash location on the map.",
  },
  {
    q: "How do I get subscriber access?",
    a: "Pay via UPI (anands9408@oksbi) or contact anands9408@gmail.com. Once payment is confirmed, your email is added to the subscriber list. Login with Gmail OTP — no password to remember. Subscriber access includes live aircraft feed (≤500 km), AI prediction reports, danger assessment, and live weather, valid for 30 days.",
  },
  {
    q: "Is there a free option?",
    a: "Yes — Free View mode gives anyone access to the read-only map and live weather data without any subscription. Simply verify your email via OTP, choose 'Free View', and enter the access password. Contact us for the current Free View password.",
  },
  {
    q: "Is SAR Platform certified for operational use?",
    a: "SAR Platform is a research-grade prototype using public APIs (OpenSky Network, Open-Meteo). It is designed for situational awareness, training, and research purposes only. Always defer to official aviation authorities (DGCA, AAI, ISRO SAC) and certified SAR systems for operational decisions.",
  },
];

const FEATURES_DETAIL = [
  {
    icon: Satellite,
    color: "#60a5fa",
    title: "Global ADS-B Aircraft Tracking",
    desc: "Track hundreds of aircraft simultaneously using real-time ADS-B data from OpenSky Network — one of the world's largest open aviation data sources. View aircraft position, altitude, heading, speed, and vertical rate on an interactive map. Scan radius: 500 km, 1,000 km, 2,000 km, or Global.",
    tags: ["OpenSky Network", "ADS-B", "25s Refresh"],
  },
  {
    icon: Brain,
    color: "#a855f7",
    title: "AI Crash Prediction Engine",
    desc: "Click any tracked aircraft to generate a full tactical SAR report powered by Google Gemini 3 Flash. The AI fuses aircraft telemetry, physics engine output (glide ratio, wind drift, descent kinematics), and live weather to estimate crash probability, predicted impact zone, search area radius, and recommended SAR strategy.",
    tags: ["Google Gemini 3 Flash", "Physics Engine", "Tactical Report"],
  },
  {
    icon: Activity,
    color: "#ef4444",
    title: "Automated Danger Assessment",
    desc: "Every aircraft is scored in real time across multiple risk factors: low altitude, rapid descent rate, low speed near stall, adverse weather, terrain proximity. Aircraft reaching CRITICAL or HIGH threshold automatically trigger a Gmail alert to the mission operator — with full risk breakdown and GPS coordinates.",
    tags: ["Risk Scoring", "Auto Alerts", "CRITICAL/HIGH/WATCH"],
  },
  {
    icon: CloudLightning,
    color: "#eab308",
    title: "Live Weather Fusion",
    desc: "Weather data from Open-Meteo (zero-cost, high-resolution) is fetched every 7 minutes and overlaid directly onto the SAR map. Wind speed, direction, visibility, and WMO weather code are merged into the AI prediction and danger scoring — giving a complete operational picture.",
    tags: ["Open-Meteo", "Wind Drift", "WMO Weather Code"],
  },
  {
    icon: Radio,
    color: "#22c55e",
    title: "ELT Signal Triangulation",
    desc: "When an aircraft goes missing, ELT signals on 121.5 / 406 MHz are picked up by ground stations. SAR Platform lets you log signal strength and bearing from up to 5 stations, then draws bearing lines on the map and calculates the triangulated intersection — giving rescue teams a precise search origin.",
    tags: ["121.5 MHz", "406 MHz", "Multi-Station Bearing"],
  },
  {
    icon: Database,
    color: "#f97316",
    title: "Historical Data & Analytics",
    desc: "All aircraft positions, weather snapshots, and risk assessments are stored in a cloud database with configurable rolling-window retention (6h to 7 days). The History Dashboard lets hosts replay aircraft tracks, export CSV data, and analyse risk trends across time — critical for post-incident review.",
    tags: ["Cloud Storage", "CSV Export", "Retention Config"],
  },
];

const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className="border-b border-border last:border-0"
      itemScope
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left py-4 flex items-center justify-between gap-4 hover:text-primary transition-colors"
      >
        <span className="font-heading text-sm font-700 text-foreground" itemProp="name">{q}</span>
        {open ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div
          className="pb-4 text-sm text-muted-foreground leading-relaxed"
          itemScope
          itemProp="acceptedAnswer"
          itemType="https://schema.org/Answer"
        >
          <span itemProp="text">{a}</span>
        </div>
      )}
    </div>
  );
};

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 px-6 lg:px-16"
        style={{ background: "hsl(var(--surface))", borderBottom: "1px solid hsl(var(--border))" }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-700 tracking-widest mb-6"
            style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.3)", color: "hsl(var(--primary))" }}>
            <Radio size={10} className="animate-pulse" /> LIVE · RESEARCH-GRADE PLATFORM
          </div>

          <h1 className="font-heading text-4xl lg:text-6xl font-700 leading-tight text-foreground mb-6">
            AI-Powered Aircraft<br />
            <span className="text-primary">Search & Rescue Intelligence</span>
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            SAR Platform combines real-time ADS-B aircraft tracking, Google Gemini AI crash prediction,
            live weather fusion, ELT triangulation, and automated emergency alerts — all in one web application.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {["ADS-B Tracking", "AI Prediction", "ELT Triangulation", "Weather Fusion", "Risk Scoring", "Gmail Alerts"].map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-heading font-700 tracking-wide"
                style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.25)", color: "hsl(var(--primary))" }}>
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-heading text-sm font-700 tracking-widest transition-all"
              style={{ background: "hsl(var(--primary))", color: "#fff" }}>
              <Plane size={14} /> ACCESS PLATFORM
            </Link>
            <Link to="/docs"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-heading text-sm font-700 tracking-widest border border-border text-foreground hover:border-primary hover:text-primary transition-all">
              VIEW DOCUMENTATION
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="py-10 px-6 border-b border-border" style={{ background: "hsl(var(--muted))" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "25s", label: "Data Refresh Rate" },
            { value: "Global", label: "Max Scan Coverage" },
            { value: "Gemini 3", label: "AI Model" },
            { value: "5 Bands", label: "ELT Stations" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-heading text-3xl font-700 text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted-foreground font-mono">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl lg:text-4xl font-700 text-foreground mb-4">
              Platform Capabilities
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every component is purpose-built for aviation SAR operations — from real-time data ingestion to AI-powered decision support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES_DETAIL.map((f) => (
              <article key={f.title}
                className="p-6 rounded-xl flex flex-col gap-4"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}44` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="font-heading text-base font-700 text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {f.tags.map((t) => (
                    <span key={t} className="px-2 py-1 rounded text-[9px] font-heading font-700 tracking-wide"
                      style={{ background: `${f.color}12`, color: f.color }}>
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-16" style={{ background: "hsl(var(--surface))", borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-700 text-foreground mb-4">How SAR Platform Works</h2>
            <p className="text-muted-foreground">From raw ADS-B signal to AI-generated rescue strategy in seconds.</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01", color: "#60a5fa",
                title: "Live Data Ingestion",
                desc: "OpenSky Network provides raw ADS-B transponder data. Our server-side edge proxy fetches aircraft positions, altitude, heading, and velocity every 25 seconds — handling CORS, rate limiting, and failover automatically.",
              },
              {
                step: "02", color: "#a855f7",
                title: "Physics & Risk Analysis",
                desc: "Each aircraft is passed through a physics engine computing kinematic state (glide ratio, descent rate, wind-adjusted trajectory) and a danger scorer checking altitude, speed, vertical rate, weather, and terrain. CRITICAL and HIGH aircraft trigger immediate alerts.",
              },
              {
                step: "03", color: "#ef4444",
                title: "AI Prediction Report",
                desc: "Select any tracked aircraft and the platform sends telemetry, physics output, and weather data to Google Gemini 3 Flash. The AI returns a structured SAR report: risk assessment, predicted impact coordinates, search radius, and recommended rescue strategy.",
              },
              {
                step: "04", color: "#22c55e",
                title: "Alert & Response",
                desc: "CRITICAL/HIGH risk aircraft automatically trigger a Gmail alert to the mission operator with a full risk table, aircraft coordinates, and factors. Operators use the map, timeline, and resource table to coordinate ground and air SAR teams.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-5 p-5 rounded-xl"
                style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-heading text-sm font-700 shrink-0"
                  style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40` }}>
                  {s.step}
                </div>
                <div>
                  <h3 className="font-heading text-sm font-700 text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access Plans ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-700 text-foreground mb-4">Access Plans</h2>
            <p className="text-muted-foreground">Choose the access level that fits your operational needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free View", icon: Eye, color: "#22c55e", border: "border-success/40",
                features: [
                  "Interactive live map",
                  "Real-time weather overlay",
                  "No subscription needed",
                  "Access password required",
                  "Read-only mode",
                ],
                cta: "Get Free Access",
                ctaLink: "/login",
              },
              {
                name: "Subscriber", icon: Star, color: "#60a5fa", border: "border-primary/40",
                featured: true,
                features: [
                  "Live aircraft feed ≤500 km",
                  "AI prediction reports",
                  "Danger risk assessment",
                  "Live weather with aircraft overlay",
                  "30-day rolling access",
                  "Gmail OTP login",
                ],
                cta: "Subscribe Now",
                ctaLink: "/login",
              },
              {
                name: "Host", icon: Shield, color: "#ef4444", border: "border-danger/60",
                features: [
                  "Full platform — all features",
                  "Unlimited global scan",
                  "Subscriber access manager",
                  "Automated alert controls",
                  "History dashboard + CSV export",
                  "ELT panel + Mission Input",
                  "Retention & cooldown config",
                ],
                cta: "Host Login",
                ctaLink: "/login",
              },
            ].map((plan) => (
              <div key={plan.name} className={`p-6 rounded-xl border-2 flex flex-col ${plan.border} ${(plan as any).featured ? "ring-1 ring-primary/30 shadow-lg" : ""}`}
                style={{ background: "hsl(var(--surface))" }}>
                {(plan as any).featured && (
                  <div className="text-center mb-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-heading font-700 tracking-widest"
                      style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))" }}>
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${plan.color}18` }}>
                    <plan.icon size={16} style={{ color: plan.color }} />
                  </div>
                  <h3 className="font-heading text-base font-700" style={{ color: plan.color }}>{plan.name}</h3>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={11} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} /> {feat}
                    </li>
                  ))}
                </ul>
                <Link to={plan.ctaLink}
                  className="block text-center py-2.5 rounded-lg font-heading text-xs font-700 tracking-widest transition-all border"
                  style={{ background: `${plan.color}14`, color: plan.color, borderColor: `${plan.color}50` }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-10 p-6 rounded-xl text-center"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
            <p className="text-sm text-muted-foreground mb-4">To subscribe, make payment and contact us:</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm font-mono">
              <div className="flex items-center gap-2 text-primary">
                <Zap size={13} /> UPI: <strong>anands9408@oksbi</strong>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Mail size={13} /> <strong>anands9408@gmail.com</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 lg:px-16"
        style={{ background: "hsl(var(--surface))", borderTop: "1px solid hsl(var(--border))" }}
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl font-700 text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about SAR Platform.</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
            <div className="px-6">
              {FAQ_ITEMS.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── See It In Action ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl lg:text-4xl font-700 text-foreground mb-4">See It In Action</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Real screens from the live SAR Platform dashboard — built for mission operators.</p>
          </div>

          <div className="space-y-16">
            {[
              {
                img: trackingImg,
                title: "Real-Time ADS-B Aircraft Tracking Map",
                tag: "Live Tracking",
                color: "#60a5fa",
                desc: "The interactive Leaflet map shows live aircraft positions from OpenSky Network, updated every 25 seconds. Risk-colored aircraft icons (CRITICAL in red, HIGH in orange, WATCH in yellow) give instant situational awareness. Scan radius is adjustable from 500 km to global coverage.",
                side: "right",
              },
              {
                img: aiImg,
                title: "AI Tactical Crash Prediction Report",
                tag: "AI Powered",
                color: "#a855f7",
                desc: "Click any tracked aircraft to generate a full AI prediction report via Google Gemini 3 Flash. The report fuses real-time telemetry, physics engine output (kinematics, wind drift, glide ratio), and live weather to estimate crash probability, predicted impact zone, and recommended SAR search radius.",
                side: "left",
              },
              {
                img: dangerImg,
                title: "Automated Danger Assessment Panel",
                tag: "Risk Scoring",
                color: "#ef4444",
                desc: "Every tracked aircraft is scored in real time across altitude, descent rate, speed near stall, and adverse weather. CRITICAL and HIGH-risk aircraft automatically trigger Gmail alerts to the mission operator with GPS coordinates and full risk breakdown — works whether host is online or offline.",
                side: "right",
              },
            ].map((sc) => (
              <div key={sc.title} className={`flex flex-col ${sc.side === "left" ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 items-center`}>
                <div className="lg:w-3/5 relative">
                  <div className="absolute -inset-3 rounded-2xl opacity-20" style={{ background: `radial-gradient(ellipse, ${sc.color}, transparent 70%)` }} />
                  <img src={sc.img} alt={sc.title} className="relative z-10 w-full rounded-xl object-cover shadow-2xl"
                    style={{ border: `1px solid ${sc.color}40`, boxShadow: `0 0 60px ${sc.color}15` }} />
                </div>
                <div className="lg:w-2/5 space-y-4">
                  <div className="inline-block px-3 py-1 rounded-full text-[10px] font-heading font-700 tracking-widest"
                    style={{ background: `${sc.color}15`, color: sc.color, border: `1px solid ${sc.color}40` }}>
                    {sc.tag}
                  </div>
                  <h3 className="font-heading text-xl font-700 text-foreground">{sc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{sc.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* YouTube embed placeholder */}
          <div className="mt-16 rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--primary) / 0.3)", background: "hsl(220 40% 5%)" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(var(--primary) / 0.2)" }}>
              <Video size={14} className="text-primary" />
              <span className="font-heading text-xs font-700 tracking-widest text-foreground">DEMO VIDEO</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.4)" }}>
                <Play size={28} className="text-primary ml-1" />
              </div>
              <div className="text-center">
                <p className="font-heading text-sm font-700 tracking-widest text-foreground mb-2">PLATFORM WALKTHROUGH</p>
                <p className="font-mono text-[10px] text-muted-foreground max-w-xs">
                  Full 2-minute demo — aircraft tracking, AI report generation, ELT triangulation, and danger assessment in action.
                </p>
              </div>
              <a href="https://www.youtube.com/@SARPlatform" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded font-heading text-xs font-700 tracking-widest"
                style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}>
                <Play size={11} /> WATCH ON YOUTUBE
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center" style={{ background: "hsl(var(--muted))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="max-w-2xl mx-auto">
          <Plane size={32} className="text-primary mx-auto mb-4" />
          <h2 className="font-heading text-3xl font-700 text-foreground mb-4">Start Monitoring Now</h2>
          <p className="text-muted-foreground mb-8">
            Free View is available immediately — no subscription, just email OTP verification.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/login"
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-heading text-sm font-700 tracking-widest transition-all"
              style={{ background: "hsl(var(--primary))", color: "#fff" }}>
              <Plane size={14} /> ENTER SAR PLATFORM
            </Link>
            <Link to="/docs"
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-heading text-sm font-700 tracking-widest border border-border text-foreground hover:border-primary hover:text-primary transition-all">
              READ DOCUMENTATION
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border" style={{ background: "hsl(var(--surface))" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Plane size={14} className="text-primary" />
            <span className="font-heading text-sm font-700 tracking-widest">SAR PLATFORM</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
            <Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link>
            <Link to="/license" className="hover:text-primary transition-colors">License</Link>
            <span>anands9408@gmail.com</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Data: OpenSky Network · Open-Meteo · AI: Google Gemini
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
