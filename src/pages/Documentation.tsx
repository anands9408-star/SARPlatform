/**
 * SAR Documentation Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Full technical documentation for:
 *  • Physics engine formulas
 *  • API data sources
 *  • Prediction methodology
 *  • Search zone calculation
 *  • Error handling procedures
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import {
  BookOpen, Calculator, Globe, Cloud, Zap, AlertTriangle,
  ChevronDown, ChevronRight, Code, Database, Shield,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
  <div className="rounded overflow-hidden border border-border mt-2 mb-2">
    <pre className="p-3 font-mono text-xs text-foreground overflow-x-auto leading-relaxed"
      style={{ background: "hsl(220 30% 8%)" }}>
      {code.trim()}
    </pre>
  </div>
);

const Formula: React.FC<{ label: string; formula: string; description: string }> = ({ label, formula, description }) => (
  <div className="flex gap-3 p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
    <div className="shrink-0 w-24">
      <span className="label-tag text-[9px]">{label}</span>
    </div>
    <div>
      <div className="font-mono text-sm text-primary font-600">{formula}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  </div>
);

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "PLATFORM OVERVIEW",
    icon: BookOpen,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <p>
          The SAR (Search Aircraft Rescue) Prediction Platform uses <strong className="text-primary">physics-based prediction</strong> to estimate the location of a distressed aircraft and optimise search zone placement. It integrates live global aircraft data from OpenSky Network, real-time weather from Open-Meteo, and a built-in kinematic engine.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {[
            { title: "OpenSky Network", desc: "Free, open-source real-time ADS-B aggregator. No API key required." },
            { title: "Open-Meteo", desc: "Free weather API with hourly forecasts. No key required." },
            { title: "Physics Engine", desc: "Implements vectors, kinematics, aerodynamics in TypeScript." },
            { title: "Prediction Store", desc: "localStorage-based LKP persistence for signal-loss recovery." },
          ].map((item) => (
            <div key={item.title} className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className="font-heading text-xs font-700 tracking-wider text-primary mb-1">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "physics",
    title: "PHYSICS ENGINE — EQUATIONS",
    icon: Calculator,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">All physics computations are in SI units (metres, seconds, m/s) unless noted.</p>

        <div>
          <h4 className="font-heading text-xs tracking-widest text-primary mb-2">KINEMATICS (src/lib/physics.ts)</h4>
          <div className="space-y-2">
            <Formula label="Final Velocity" formula="v = u + at" description="Final velocity given initial velocity u, acceleration a, time t" />
            <Formula label="Displacement" formula="s = ut + ½at²" description="Distance covered in time t from initial velocity u and constant acceleration a" />
            <Formula label="Velocity Check" formula="v² = u² + 2as" description="Final velocity from displacement s — used to verify kinematic consistency" />
          </div>
        </div>

        <div>
          <h4 className="font-heading text-xs tracking-widest text-primary mb-2">VECTORS</h4>
          <div className="space-y-2">
            <Formula label="Aircraft Vector" formula="Vx = V·sin(θ), Vy = V·cos(θ)" description="Decompose airspeed V at heading θ into East (Vx) and North (Vy) components" />
            <Formula label="Wind Vector" formula="Wx = Vw·sin(θ+180°), Wy = Vw·cos(θ+180°)" description="Wind FROM direction converted to aircraft-impact vector (blowing TO direction)" />
            <Formula label="Ground Speed" formula="Vg = Va + Vw" description="Relative velocity: ground velocity = aircraft airspeed + wind vector (vector addition)" />
            <Formula label="Magnitude" formula="|V| = √(Vx² + Vy²)" description="Magnitude of resultant vector from East/North components" />
          </div>
        </div>

        <div>
          <h4 className="font-heading text-xs tracking-widest text-primary mb-2">AERODYNAMIC DRIFT</h4>
          <div className="space-y-2">
            <Formula label="Cross-Wind" formula="Vx_cross = |Vw| · sin(Δθ)" description="Lateral drift speed from cross-wind component (Δθ = angle between wind and heading)" />
            <Formula label="Drift Distance" formula="d = Vx_cross × t" description="Total lateral displacement from wind drift over time t (metres)" />
          </div>
        </div>

        <div>
          <h4 className="font-heading text-xs tracking-widest text-primary mb-2">COORDINATE CONVERSION</h4>
          <div className="space-y-2">
            <Formula label="ENU East" formula="E = Δλ · R · cos(φ)" description="East displacement in metres from longitude offset Δλ at latitude φ. R = 6,371,000 m" />
            <Formula label="ENU North" formula="N = Δφ · R" description="North displacement in metres from latitude offset Δφ" />
            <Formula label="Back to LatLon" formula="φ' = φ + N/R, λ' = λ + E/(R·cos φ)" description="Convert ENU offsets back to WGS-84 lat/lon" />
          </div>
        </div>

        <CodeBlock code={`
// Example: predict position at t=300 seconds
const airspeedMs = 420 * 0.514444;        // knots → m/s
const aircraftVec = bearingToVector(airspeedMs, 245); // heading 245°
const windVec = windVector(8.5, 270);      // 8.5 m/s from West
const groundVec = addVectors(aircraftVec, windVec);

// Displacement using s = ut + ½at²
const east  = kinematics.displacement(groundVec.x, 0, 300);
const north = kinematics.displacement(groundVec.y, 0, 300);

// Convert to new lat/lon
const {lat: newLat, lon: newLon} = enuToLatLon(east, north, originLat, originLon);
        `} />
      </div>
    ),
  },
  {
    id: "uncertainty",
    title: "UNCERTAINTY & SEARCH ZONE EXPANSION",
    icon: Zap,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Search zone radius grows and confidence decays over time without fresh position data.</p>
        <div className="space-y-2">
          <Formula label="Confidence" formula="C(t) = 100 · e^(−λt)" description="Exponential confidence decay. λ = ln(2)/T½ where T½ = 300s (halves every 5 min)" />
          <Formula label="Search Radius" formula="R(t) = R₀ + k·t + ½·k·t²" description="Quadratic radius growth. R₀ = 500m initial, k = 25 m/s growth constant" />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[["0 min", "100%", "0.5 km"], ["5 min", "79%", "8 km"], ["15 min", "50%", "35 km"], ["30 min", "25%", "135 km"]].map(([t, c, r]) => (
            <div key={t} className="p-2 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className="label-tag text-[9px]">{t}</div>
              <div className="font-mono text-success font-600">{c}</div>
              <div className="font-mono text-danger text-[10px]">{r}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "apis",
    title: "DATA SOURCES & APIs",
    icon: Globe,
    content: (
      <div className="space-y-4 text-sm">
        <div className="space-y-3">
          <div className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-wider text-primary mb-2">OPENSKY NETWORK</div>
            <p className="text-xs text-muted-foreground mb-2">ADS-B aggregator providing real-time aircraft positions globally. Free, no API key.</p>
            <CodeBlock code={`
// Global (all aircraft)
GET https://opensky-network.org/api/states/all

// Bounded region
GET https://opensky-network.org/api/states/all
  ?lamin={minLat}&lomin={minLon}&lamax={maxLat}&lomax={maxLon}

// Response: states array
// [icao24, callsign, origin_country, ..., lon, lat, altitude, onGround,
//  velocity, heading, vertical_rate, ...]
            `} />
            <div className="text-xs text-warning flex items-center gap-1 mt-2">
              <AlertTriangle size={10} />
              Rate limit: ~100 req/day anonymous. Errors handled with cached last data.
            </div>
          </div>

          <div className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-wider text-primary mb-2">OPEN-METEO WEATHER API</div>
            <p className="text-xs text-muted-foreground mb-2">Free weather API. WMO codes mapped to danger levels. No API key required.</p>
            <CodeBlock code={`
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,wind_speed_10m,
           wind_direction_10m,weather_code,precipitation
  &wind_speed_unit=kmh
  &timezone=auto

// Response includes current weather conditions
// weather_code follows WMO standard (0=clear, 95=thunderstorm, etc.)
            `} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "signal-loss",
    title: "SIGNAL LOSS — PREDICTION ENGINE",
    icon: Database,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <p>When an aircraft disappears from the live feed (signal lost), the prediction engine continues forecasting using the <strong className="text-primary">Last Known Position (LKP)</strong> stored in localStorage.</p>
        <div className="space-y-2">
          {[
            ["1. Save LKP", "On each OpenSky tick, KinematicState (lat, lon, heading, speed, altitude, wind) saved to localStorage"],
            ["2. Detect Loss", "Signal loss detected when aircraft ICAO24 missing from live feed for >30 seconds"],
            ["3. Continue Prediction", "Load last saved state, compute elapsed time, continue physics prediction from LKP"],
            ["4. Expand Zone", "Search radius grows and confidence decays with every second elapsed since LKP"],
            ["5. Recovery", "When signal restored, prediction resets to fresh live state and LKP updated"],
          ].map(([step, desc]) => (
            <div key={String(step)} className="flex gap-3 p-2.5 rounded"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <span className="font-heading text-xs text-primary font-700 shrink-0 w-32">{step}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <CodeBlock code={`
// Check if aircraft signal is lost (src/lib/predictionEngine.ts)
const result = PredictionEngine.getPrediction(icao24);

if (result.signalLost) {
  const { elapsedSeconds, predictions, confidence, searchRadius } = result;
  // Continue showing physics-based predicted path
  // Search radius = searchRadiusAtTime(500, elapsedSeconds)
  // Confidence = confidenceAtTime(elapsedSeconds)
}
        `} />
      </div>
    ),
  },
  {
    id: "danger",
    title: "DANGER ASSESSMENT ALGORITHM",
    icon: AlertTriangle,
    content: (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Each aircraft receives a composite danger score (0–100) from multiple physics and weather factors.</p>
        <div className="rounded overflow-hidden border border-border">
          <div className="grid grid-cols-3 gap-1 px-3 py-2 text-[9px] font-heading tracking-wider"
            style={{ background: "hsl(var(--surface))" }}>
            <div>FACTOR</div>
            <div className="text-center">THRESHOLD</div>
            <div className="text-center">POINTS</div>
          </div>
          <div className="divide-y divide-border text-xs font-mono">
            {[
              ["Altitude", "< 1,000 ft", "+35"],
              ["Altitude", "< 3,000 ft", "+20"],
              ["Descent Rate", "< −2,000 ft/min", "+30"],
              ["Descent Rate", "< −1,000 ft/min", "+15"],
              ["Airspeed", "< 80 kts (stall risk)", "+20"],
              ["Wind Danger", "> 60 km/h crosswind", "+20"],
              ["Weather", "Extreme (thunderstorm)", "+25"],
              ["Visibility", "< 1 km", "+20"],
              ["Signal Age", "> 60 seconds", "+20"],
            ].map(([f, t, p]) => (
              <div key={`${f}${t}`} className="grid grid-cols-3 gap-1 px-3 py-1.5 hover:bg-secondary/20">
                <div className="text-foreground">{f}</div>
                <div className="text-center text-muted-foreground">{t}</div>
                <div className="text-center text-warning">{p}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Score ≥ 60 = CRITICAL · ≥ 40 = WARNING · ≥ 20 = WATCH · &lt; 20 = SAFE
        </p>
      </div>
    ),
  },
  {
    id: "errors",
    title: "ERROR HANDLING",
    icon: Shield,
    content: (
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          {[
            {
              error: "OpenSky API Rate Limit (429)",
              handling: "Display warning banner, continue showing last cached aircraft data, retry on next interval",
              color: "warning",
            },
            {
              error: "OpenSky Network Error",
              handling: "Show error banner with Retry button. Last aircraft positions retained from previous tick",
              color: "danger",
            },
            {
              error: "Weather API Failure",
              handling: "Default to 5 m/s wind / N direction for physics. Panel shows 'unavailable' state with retry",
              color: "warning",
            },
            {
              error: "Signal Loss (aircraft disappears)",
              handling: "PredictionEngine switches to LKP-based prediction. Physics continues from last saved state",
              color: "primary",
            },
            {
              error: "localStorage Failure",
              handling: "Graceful fallback — prediction engine continues in-memory only, logs console warning",
              color: "warning",
            },
            {
              error: "Map Tile Load Failure",
              handling: "CartoDB dark tiles fail silently. App remains functional with blank map background",
              color: "primary",
            },
          ].map((item) => (
            <div key={item.error} className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className={`font-heading text-xs font-700 tracking-wider text-${item.color} mb-1`}>{item.error}</div>
              <div className="text-xs text-muted-foreground">{item.handling}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const Documentation: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["overview", "physics"])
  );

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-primary" />
          <div>
            <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">
              TECHNICAL DOCUMENTATION
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              SAR Platform · Physics Engine · API Reference · Error Handling
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-3">
        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setOpenSections((prev) => new Set([...prev, s.id]));
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-2.5 py-1 rounded font-heading text-[10px] font-700 tracking-wider border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {s.title.split(" ")[0]}
            </button>
          ))}
        </div>

        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections.has(section.id);
          return (
            <div key={section.id} id={`section-${section.id}`} className="sar-card hud-border overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-secondary/30 ${isOpen ? "border-b border-border" : ""}`}
                style={{ background: "hsl(var(--surface))" }}
              >
                <Icon size={14} className="text-primary shrink-0" />
                <span className="font-heading text-sm font-700 tracking-widest flex-1 text-foreground">
                  {section.title}
                </span>
                {isOpen
                  ? <ChevronDown size={14} className="text-muted-foreground" />
                  : <ChevronRight size={14} className="text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="px-5 py-4" style={{ background: "hsl(var(--muted))" }}>
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Documentation;
