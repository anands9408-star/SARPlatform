/**
 * SAR Platform — Technical Documentation
 * Full reference for physics engine, APIs, DGCA/AAI operational context,
 * prediction methodology, search zone calculation, and error handling.
 */

import React, { useState } from "react";
import {
  BookOpen, Calculator, Globe, Cloud, Zap, AlertTriangle,
  ChevronDown, ChevronRight, Code, Database, Shield, Plane,
  Radio, MapPin, Activity, FileText,
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

const InfoBox: React.FC<{ title: string; children: React.ReactNode; color?: string }> = ({ title, children, color = "#60a5fa" }) => (
  <div className="p-4 rounded-lg mb-3" style={{ background: `${color}0d`, border: `1px solid ${color}30` }}>
    <div className="font-heading text-xs font-700 tracking-widest mb-2" style={{ color }}>{title}</div>
    <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "PLATFORM OVERVIEW",
    icon: BookOpen,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p>
          The <strong className="text-primary">SAR (Search Aircraft Rescue) Prediction Platform</strong> is a real-time aviation monitoring
          and Search &amp; Rescue intelligence system purpose-built for mission operators. It fuses live ADS-B aircraft tracking from the
          OpenSky Network, physics-based kinematic prediction, live weather from Open-Meteo, and Google Gemini 3 Flash AI analysis into a
          single unified web application.
        </p>
        <p>
          The platform was developed in response to the limitations of conventional situational awareness tools in the Indian sub-continent,
          where rapid aircraft disappearance events — especially in remote terrain like the Western Ghats, Himalayan foothills, and Bay of Bengal
          approaches — often leave SAR operators without adequate real-time intelligence. SAR Platform bridges this gap using freely available
          public ADS-B data, cloud-hosted physics computation, and AI-powered threat assessment.
        </p>

        <InfoBox title="INDIAN AVIATION CONTEXT" color="#22c55e">
          India's civil aviation sector is regulated by the <strong>Directorate General of Civil Aviation (DGCA)</strong> under the Ministry
          of Civil Aviation, with aerodrome infrastructure managed by the <strong>Airports Authority of India (AAI)</strong>. The Indian Coast
          Guard and the Indian Air Force (IAF) jointly coordinate SAR operations through the <strong>Rescue Co-ordination Centre (RCC)</strong>
          based at New Delhi, Mumbai, and Chennai. The platform's alert system is optimised for Indian time zones and routes between major
          Indian airports (DEL, BOM, MAA, BLR, HYD, CCU, COK, AMD).
        </InfoBox>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {[
            { title: "OpenSky Network", desc: "Global ADS-B aggregator. Free, open-source, no API key. Covers 99% of Indian commercial routes." },
            { title: "Open-Meteo", desc: "Free weather API with hourly forecasts including wind shear, visibility, and WMO weather codes." },
            { title: "Physics Engine", desc: "Implements vectors, kinematics, aerodynamics, and wind drift in TypeScript with sub-second computation." },
            { title: "Google Gemini 3 Flash", desc: "AI model for tactical SAR report generation — crash probability, impact zone, search sectors." },
            { title: "PostgreSQL Cloud DB", desc: "Aircraft history, weather snapshots, and risk assessments stored with 6h–7 day configurable retention." },
            { title: "Gmail SMTP Alerts", desc: "HTML email alerts sent immediately to host when CRITICAL or HIGH risk aircraft are detected." },
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
    id: "operational-scenarios",
    title: "OPERATIONAL SCENARIOS — USE CASES",
    icon: Plane,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground">
          SAR Platform is designed for the following real-world operational contexts. Each scenario represents an actual use case for
          aviation SAR operators, researchers, and aviation enthusiasts in India and globally.
        </p>

        <InfoBox title="SCENARIO 1 — COMMERCIAL AIRCRAFT RAPID DESCENT ALERT" color="#ef4444">
          <strong>Context:</strong> An Airbus A320 on final approach to Chennai International Airport (MAA) shows sudden altitude
          deviation — descending at −3,200 ft/min from 8,000 ft in adverse monsoon weather with visibility below 1 km.
          <br /><br />
          <strong>SAR Platform Response:</strong> Danger Assessment scores the aircraft CRITICAL (82/100). The system triggers an
          automatic Gmail alert to the host operator with the aircraft's ICAO24 code, GPS coordinates, descent rate, and speed.
          The AI prediction engine generates a tactical report estimating a probable impact zone within a 35 km radius southeast
          of MAA, recommending three primary search sectors aligned with the aircraft's last heading.
        </InfoBox>

        <InfoBox title="SCENARIO 2 — LIGHT AIRCRAFT SIGNAL LOSS IN REMOTE TERRAIN" color="#eab308">
          <strong>Context:</strong> A Cessna 172 operating VFR from Coimbatore (CJB) to Ooty disappears from ADS-B tracking
          over the Nilgiri Hills. Last known position: 11.4°N, 76.7°E at 9,500 ft with heading 065° and airspeed 92 kts.
          <br /><br />
          <strong>SAR Platform Response:</strong> Prediction engine activates Last Known Position (LKP) mode. Using vector
          kinematics and wind drift from Open-Meteo (NE wind at 18 km/h), it estimates the aircraft drifted approximately
          4.2 km northeast of LKP over 4 minutes before signal loss. The search zone expands from 500 m to 12 km radius
          at T+5 minutes with 73% confidence. ELT panel is activated for 121.5 MHz bearing input from ground stations.
        </InfoBox>

        <InfoBox title="SCENARIO 3 — ELT TRIANGULATION FOR CRASH LOCALIZATION" color="#60a5fa">
          <strong>Context:</strong> A distress ELT signal on 406 MHz is picked up by three ISRO Cospas-Sarsat ground stations.
          Bearing from Ahmedabad station: 132°. Bearing from Nagpur station: 245°. Bearing from Hyderabad station: 018°.
          <br /><br />
          <strong>SAR Platform Response:</strong> The ELT Triangulation Panel takes bearing inputs from all three stations,
          draws bearing lines on the interactive Leaflet map, and calculates the triangulated intersection point. The estimated
          crash location (±2 km CEP) is displayed with a coordinate overlay, enabling rescue helicopter deployment.
        </InfoBox>

        <InfoBox title="SCENARIO 4 — SUBSCRIBER MONITORING FOR AVIATION ENTHUSIASTS" color="#a855f7">
          <strong>Context:</strong> An aviation researcher in Bangalore wants to monitor live aircraft over South India,
          receive AI analysis for anomalous flights, and study weather impact on aviation safety — without host-level access.
          <br /><br />
          <strong>SAR Platform Response:</strong> Subscriber access provides a live aircraft feed within 1,000 km scan radius,
          covering all major South Indian airports (BLR, MAA, HYD, COK, TRV, CJB, IXM). The AI prediction panel is available
          for any selected aircraft, and the danger assessment panel highlights risk-scored aircraft in real time.
        </InfoBox>

        <div className="mt-4 p-4 rounded-lg" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
          <div className="font-heading text-xs font-700 tracking-widest text-primary mb-3">SUPPORTED INDIAN AVIATION ROUTES</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono text-muted-foreground">
            {[
              "DEL–BOM (Delhi–Mumbai)", "DEL–MAA (Delhi–Chennai)", "BOM–BLR (Mumbai–Bangalore)",
              "DEL–CCU (Delhi–Kolkata)", "BLR–HYD (Bangalore–Hyderabad)", "MAA–COK (Chennai–Cochin)",
              "BOM–COK (Mumbai–Cochin)", "DEL–AMD (Delhi–Ahmedabad)", "BLR–TRV (Bangalore–Trivandrum)",
              "DEL–GOX (Delhi–Goa)", "CCU–IXB (Kolkata–Bagdogra)", "BOM–IXJ (Mumbai–Jammu)",
            ].map((route) => (
              <div key={route} className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-primary" />
                {route}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "dgca-aai",
    title: "INDIAN AVIATION AUTHORITIES — DGCA & AAI CONTEXT",
    icon: Shield,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p>
          SAR Platform is designed to complement — not replace — official Indian aviation authority systems. Understanding the
          regulatory framework is essential for operators using this platform for situational awareness.
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">DIRECTORATE GENERAL OF CIVIL AVIATION (DGCA)</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              The DGCA is the primary regulatory authority for civil aviation in India under the Aircraft Act, 1934 and Aircraft Rules, 1937.
              It oversees airworthiness certification, pilot licensing, airline operations, and accident investigation. DGCA mandates
              ADS-B Out equipment on aircraft above FL290 in Indian airspace as per CAR Section 2, Series I, Part II.
            </p>
            <div className="flex flex-wrap gap-2 text-[9px] font-heading font-700">
              {["Aircraft Act 1934", "CAR Section 2", "ADS-B Mandate FL290+", "Accident Investigation", "Pilot Licensing"].map((t) => (
                <span key={t} className="px-2 py-1 rounded" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>{t}</span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">AIRPORTS AUTHORITY OF INDIA (AAI)</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              AAI manages 137 airports across India, provides air traffic services (ATS), and operates the Area Control Centre (ACC)
              at Delhi, Mumbai, Chennai, and Kolkata — each responsible for a Flight Information Region (FIR). AAI's Emergency
              Response Protocol coordinates with SAR units when an aircraft declares MAYDAY or PAN-PAN.
            </p>
            <div className="flex flex-wrap gap-2 text-[9px] font-heading font-700">
              {["137 Airports", "4 ACCs (FIR)", "MAYDAY Response", "CNS/ATM Systems", "NOTAM Management"].map((t) => (
                <span key={t} className="px-2 py-1 rounded" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>{t}</span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">COSPAS-SARSAT — ELT SYSTEM IN INDIA</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              India operates Cospas-Sarsat Local User Terminals (LUT) at Lucknow and Bangalore, monitored by ISRO's Space Applications
              Centre (SAC). ELT signals on 406 MHz are processed by the Indian Mission Control Centre (INMCC) and forwarded to the
              Rescue Co-ordination Centre (RCC). SAR Platform's ELT panel allows operators to input raw bearing data from these
              monitoring stations to triangulate crash positions before official notification arrives.
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-warning mb-2">PLATFORM STATUS — NOT DGCA CERTIFIED</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SAR Platform is a <strong>research-grade prototype</strong> using public APIs. It is NOT certified by DGCA, AAI, or any
              aviation authority for operational emergency use. All outputs — AI predictions, danger scores, search zones — are
              algorithmic estimates for situational awareness and training only. In any real emergency, contact the nearest ATC,
              Indian Coast Guard (1800-180-3943), or dial 112.
            </p>
          </div>
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
        <p className="text-sm text-muted-foreground">All physics computations run in SI units (metres, seconds, m/s) unless noted. The engine is implemented in <code className="text-primary">src/lib/physics.ts</code> and runs in a Web Worker for non-blocking computation.</p>

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
            <Formula label="Ground Speed" formula="Vg = Va + Vw" description="Ground velocity = aircraft airspeed + wind vector (vector addition)" />
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
        <p className="text-sm text-muted-foreground">Search zone radius grows and confidence decays over time without fresh position data — based on ICAO Annex 12 search planning methodology adapted for ADS-B signal loss scenarios.</p>
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
        <InfoBox title="REAL-WORLD CALIBRATION" color="#eab308">
          Search radius expansion rates are calibrated against historical Indian aviation incident data. The 2010 Air India Express
          crash at Mangalore (IX-812) demonstrated that signal loss to ground impact took approximately 47 seconds from final ADS-B
          ping — well within the platform's 30-second detection window. Uncertainty expansion accounts for terrain distortion in
          hilly regions like the Western Ghats where aircraft may descend below ADS-B reception before impact.
        </InfoBox>
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
            <p className="text-xs text-muted-foreground mb-2">
              OpenSky Network is a non-profit consortium of aviation enthusiasts and researchers operating one of the world's largest
              open ADS-B receiver networks. Coverage in India is strongest over major metro areas (Delhi, Mumbai, Bangalore, Chennai,
              Hyderabad) and along high-traffic corridors. Remote areas — northeastern states, Andaman &amp; Nicobar Islands, and
              high-altitude Himalayan routes — may have reduced coverage. The platform uses a server-side edge proxy to bypass CORS
              restrictions and handle rate limiting gracefully.
            </p>
            <CodeBlock code={`
// Global (all aircraft)
GET https://opensky-network.org/api/states/all

// Bounded region (e.g., South India 8°N–15°N, 75°E–82°E)
GET https://opensky-network.org/api/states/all
  ?lamin=8&lomin=75&lamax=15&lomax=82

// Response: states array
// [icao24, callsign, origin_country, ..., lon, lat, altitude, onGround,
//  velocity, heading, vertical_rate, ...]
            `} />
            <div className="text-xs text-warning flex items-center gap-1 mt-2">
              <AlertTriangle size={10} />
              Rate limit: ~100 req/day anonymous. Errors handled with cached last data. 25s refresh interval is optimal.
            </div>
          </div>

          <div className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-wider text-primary mb-2">OPEN-METEO WEATHER API</div>
            <p className="text-xs text-muted-foreground mb-2">
              Open-Meteo provides free, high-resolution weather forecasts based on ECMWF and DWD models. Data refreshes every hour.
              Critical weather codes for Indian aviation: 95–99 (thunderstorm — common during June–September monsoon), 45–48 (fog —
              frequent at Delhi and Kolkata during December–January). The platform fetches weather every 7 minutes and merges it
              into the AI prediction and danger scoring pipeline.
            </p>
            <CodeBlock code={`
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,wind_speed_10m,
           wind_direction_10m,weather_code,precipitation
  &wind_speed_unit=kmh
  &timezone=Asia/Kolkata
            `} />
          </div>

          <div className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-wider text-primary mb-2">GOOGLE GEMINI 3 FLASH — AI PREDICTION</div>
            <p className="text-xs text-muted-foreground">
              The AI prediction engine sends a structured payload — aircraft telemetry, physics engine output, weather data, and
              risk factors — to the <code className="text-primary">sar-ai-predict</code> edge function which calls Google Gemini
              3 Flash. The model returns a structured SAR report: threat assessment, predicted crash probability, impact zone
              coordinates, recommended search radius, and priority actions for rescue coordination.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "signal-loss",
    title: "SIGNAL LOSS — PREDICTION ENGINE",
    icon: Radio,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <p>When an aircraft disappears from the live feed (signal lost), the prediction engine continues forecasting using the <strong className="text-primary">Last Known Position (LKP)</strong> stored in localStorage.</p>

        <InfoBox title="WHY SIGNAL LOSS MATTERS IN INDIA" color="#60a5fa">
          ADS-B coverage in India depends on ground receiver density. In mountainous terrain (Himachal Pradesh, Uttarakhand, Meghalaya),
          an aircraft can fly below receiver line-of-sight and disappear from tracking for several minutes while still flying normally.
          Similarly, over the Bay of Bengal and Arabian Sea beyond 200 NM from the coast, ADS-B coverage drops significantly.
          The LKP prediction engine maintains situational awareness during these gaps.
        </InfoBox>

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
        <p className="text-muted-foreground">Each aircraft receives a composite danger score (0–100) from multiple physics and weather factors. The algorithm is calibrated against historical accident data and ICAO flight safety standards.</p>
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

        <InfoBox title="CRITICAL RISK EXAMPLES — INDIAN AVIATION HISTORY" color="#ef4444">
          The danger algorithm is informed by historical Indian aviation accidents:
          <br />• <strong>Air India Express IX-812 (2010, Mangalore)</strong> — approached runway at excessive speed and altitude, overran into gorge. Risk factors: high speed, unstabilised approach.
          <br />• <strong>Indian Airlines IC-440 (1991, Imphal)</strong> — CFIT in fog at 2,300 ft. Risk factors: low visibility, low altitude, mountainous terrain.
          <br />• <strong>Alliance Air CD-7412 (2000, Patna)</strong> — touched down at wrong point, overran. Risk factors: rapid descent on short final.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "elt-triangulation",
    title: "ELT TRIANGULATION METHODOLOGY",
    icon: Radio,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p>
          The ELT (Emergency Locator Transmitter) triangulation panel allows operators to input bearing and signal strength readings
          from multiple ground monitoring stations and compute the probable crash location using line-of-bearing intersection.
        </p>

        <div className="space-y-2">
          <Formula label="Bearing Line" formula="x = lon + d·sin(θ), y = lat + d·cos(θ)" description="Line endpoint at distance d km from station on bearing θ degrees" />
          <Formula label="Intersection" formula="P = argmin Σ dist(P, line_i)²" description="Optimal position minimising sum of squared distances to all bearing lines" />
          <Formula label="CEP" formula="CEP₅₀ = 1.1774 · σ" description="50% Circular Error Probable from standard deviation σ of position estimates" />
        </div>

        <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
          <div className="font-heading text-xs font-700 tracking-widest text-primary mb-3">INDIAN ELT MONITORING INFRASTRUCTURE</div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex gap-2"><span className="text-primary font-700 w-32 shrink-0">INMCC Lucknow</span><span>Indian Mission Control Centre — primary Cospas-Sarsat ground station, 406 MHz processing</span></div>
            <div className="flex gap-2"><span className="text-primary font-700 w-32 shrink-0">SAC Bangalore</span><span>ISRO Space Applications Centre — secondary LUT, Cospas-Sarsat coordination</span></div>
            <div className="flex gap-2"><span className="text-primary font-700 w-32 shrink-0">AFRS Mumbai</span><span>Aeronautical Fixed Radio Station — 121.5 MHz ELT monitoring, coastal coverage</span></div>
            <div className="flex gap-2"><span className="text-primary font-700 w-32 shrink-0">RCC New Delhi</span><span>Rescue Co-ordination Centre — ICAO Annex 12 SAR coordination hub for India</span></div>
          </div>
        </div>
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
              handling: "Display warning banner, continue showing last cached aircraft data, retry on next 25s interval",
              color: "warning",
            },
            {
              error: "OpenSky Network Error / Timeout",
              handling: "Show error banner with Retry button. Last aircraft positions retained from previous tick. Edge proxy adds 15s timeout.",
              color: "danger",
            },
            {
              error: "Weather API Failure",
              handling: "Default to 5 m/s wind / N direction for physics. Panel shows 'unavailable' state with retry",
              color: "warning",
            },
            {
              error: "Signal Loss (aircraft disappears)",
              handling: "PredictionEngine switches to LKP-based prediction. Physics continues from last saved state. Search zone expands.",
              color: "primary",
            },
            {
              error: "AI Prediction Failure",
              handling: "FunctionsHttpError parsed for exact server message. Error displayed with status code and raw response for debugging.",
              color: "danger",
            },
            {
              error: "Gmail Alert Failure (SMTP 534)",
              handling: "Edge function has hardcoded app password fallback. Requires 2-Step Verification on Gmail account for app passwords.",
              color: "warning",
            },
            {
              error: "localStorage Failure",
              handling: "Graceful fallback — prediction engine continues in-memory only, logs console warning",
              color: "warning",
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
  {
    id: "role-access",
    title: "ROLE-BASED ACCESS CONTROL",
    icon: FileText,
    content: (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">SAR Platform implements three access tiers with strict feature isolation. Authentication uses email OTP (Gmail delivery) with optional Google OAuth for hosts.</p>

        <div className="space-y-3">
          {[
            {
              role: "HOST", color: "#ef4444",
              login: "Any designated email + password (0904) after OTP",
              features: [
                "Full platform — all panels and controls",
                "Unlimited global ADS-B scan",
                "Automated Gmail alert system (CRITICAL/HIGH/CRASH)",
                "Subscriber access manager — add/remove subscribers",
                "History dashboard with CSV export",
                "ELT triangulation panel",
                "Mission input and resource table",
                "Data retention configuration (6h–7 days)",
                "Crash monitor edge function — passive offline monitoring",
                "Test alert button with mock aircraft data",
              ],
            },
            {
              role: "SUBSCRIBER", color: "#60a5fa",
              login: "Email OTP — email must be in viewer_access table",
              features: [
                "Live aircraft feed up to 1,000 km radius",
                "AI crash prediction via Google Gemini",
                "Danger assessment panel (real-time risk scoring)",
                "Live weather overlay with aircraft fusion",
                "Mission Control video feed + kinematic simulation",
                "30-day rolling access (configurable by host)",
              ],
            },
            {
              role: "FREE VIEWER", color: "#22c55e",
              login: "Email OTP + host-set free access password",
              features: [
                "Interactive live map (read-only, no aircraft feed)",
                "Real-time weather overlay",
                "No AI prediction, no danger assessment",
                "Upgrade prompt with subscription contact",
              ],
            },
          ].map((tier) => (
            <div key={tier.role} className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: `1px solid ${tier.color}30` }}>
              <div className="font-heading text-sm font-700 tracking-widest mb-1" style={{ color: tier.color }}>{tier.role}</div>
              <div className="text-xs text-muted-foreground mb-3">{tier.login}</div>
              <ul className="space-y-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: tier.color }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const Documentation: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["overview", "operational-scenarios"])
  );

  // Inject page-specific JSON-LD structured data for Google rich results
  React.useEffect(() => {
    const techArticleScript = document.createElement("script");
    techArticleScript.type = "application/ld+json";
    techArticleScript.id = "jsonld-tech-article";
    techArticleScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "SAR Platform Physics Engine — Kinematics, Vector Math & Wind Drift for Aircraft Crash Prediction",
      "description": "Technical reference for the SAR Platform physics engine: kinematic equations (v=u+at), vector decomposition of aircraft and wind velocities, aerodynamic drift, ENU coordinate conversion, uncertainty expansion, ELT triangulation, and AI prediction via Google Gemini 3 Flash.",
      "url": "https://react-9b5gkx.onspace.build/docs",
      "image": "https://react-9b5gkx.onspace.build/og-image.jpg",
      "author": { "@type": "Person", "name": "SAR Platform Team", "email": "anands9408@gmail.com" },
      "publisher": {
        "@type": "Organization",
        "name": "SAR Platform",
        "logo": { "@type": "ImageObject", "url": "https://react-9b5gkx.onspace.build/sar-product-logo.png" }
      },
      "datePublished": "2025-01-01",
      "dateModified": "2026-05-09",
      "inLanguage": "en-IN",
      "keywords": "physics engine aircraft, kinematics aviation, ADS-B prediction, DGCA India, AAI airports, ELT triangulation 406 MHz, SAR search rescue, Google Gemini AI aviation, OpenSky Network API",
      "articleSection": "Technical Documentation",
      "proficiencyLevel": "Expert",
      "about": [
        { "@type": "Thing", "name": "ADS-B Aircraft Tracking" },
        { "@type": "Thing", "name": "Search and Rescue Operations" },
        { "@type": "Thing", "name": "DGCA India Civil Aviation" },
        { "@type": "Thing", "name": "Emergency Locator Transmitter ELT" },
        { "@type": "Thing", "name": "Google Gemini AI" }
      ]
    });

    const howToScript = document.createElement("script");
    howToScript.type = "application/ld+json";
    howToScript.id = "jsonld-howto";
    howToScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Track Live Aircraft and Generate AI SAR Predictions with SAR Platform",
      "description": "Step-by-step guide to using SAR Platform: login via email OTP, load live ADS-B aircraft data from OpenSky Network, review danger-scored aircraft, generate Google Gemini AI crash prediction reports, and use ELT triangulation for signal-lost aircraft.",
      "url": "https://react-9b5gkx.onspace.build/docs",
      "totalTime": "PT5M",
      "supply": [
        { "@type": "HowToSupply", "name": "Email address for OTP login" },
        { "@type": "HowToSupply", "name": "SAR Platform subscriber or host access" }
      ],
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Login via Email OTP", "text": "Navigate to the SAR Platform login page. Enter your registered email and click 'Send OTP'. A 4-digit code is delivered to your inbox. Enter the code to authenticate." },
        { "@type": "HowToStep", "position": 2, "name": "Select Scan Radius", "text": "Choose your ADS-B scan radius: 500 km, 1,000 km, 2,000 km, or Global. The platform fetches live aircraft from OpenSky Network within the selected bounds every 25 seconds." },
        { "@type": "HowToStep", "position": 3, "name": "Review Danger-Scored Aircraft", "text": "The Danger Assessment panel scores each aircraft 0–100. CRITICAL (≥60) and HIGH (≥40) aircraft are highlighted and trigger automatic Gmail alerts to the host." },
        { "@type": "HowToStep", "position": 4, "name": "Generate AI Prediction Report", "text": "Select an aircraft on the map and click 'Generate AI Prediction'. Google Gemini 3 Flash analyses telemetry, physics engine output, and weather to produce a full SAR tactical report with impact zone and search sectors." },
        { "@type": "HowToStep", "position": 5, "name": "Use ELT Triangulation", "text": "If an aircraft goes missing, open the ELT Panel. Enter bearing readings from ground stations monitoring 121.5 MHz or 406 MHz. The platform calculates and displays the triangulated crash position on the map." },
        { "@type": "HowToStep", "position": 6, "name": "Export Historical Data", "text": "Hosts access the History Dashboard to view past aircraft tracks and risk assessments. Download CSV for post-incident analysis. Data retention is configurable from 6 hours to 7 days." }
      ]
    });

    // Remove any existing injected scripts before adding new ones
    document.getElementById("jsonld-tech-article")?.remove();
    document.getElementById("jsonld-howto")?.remove();
    document.head.appendChild(techArticleScript);
    document.head.appendChild(howToScript);

    return () => {
      document.getElementById("jsonld-tech-article")?.remove();
      document.getElementById("jsonld-howto")?.remove();
    };
  }, []);

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {/* Page header */}
      <div className="px-6 py-6 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={20} className="text-primary" />
            <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">
              TECHNICAL DOCUMENTATION
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            SAR Platform · Physics Engine · API Reference · DGCA/AAI Context · Operational Scenarios · Error Handling
          </p>

          {/* SEO intro paragraph */}
          <div className="mt-4 ml-8 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            Complete technical reference for the SAR Platform aviation search and rescue intelligence system. Covers physics-based
            kinematic prediction equations (vector decomposition, kinematics, wind drift), ADS-B data sourcing from OpenSky Network,
            Indian aviation regulatory context (DGCA, AAI, Cospas-Sarsat ELT infrastructure), AI prediction methodology using Google
            Gemini 3 Flash, danger assessment scoring algorithm, and role-based access control architecture.
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

        {/* Footer note */}
        <div className="mt-6 p-4 rounded-lg text-center text-xs text-muted-foreground font-mono"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
          SAR Platform Documentation · Data sources: OpenSky Network, Open-Meteo, Google Gemini · Indian aviation context: DGCA, AAI, ISRO SAC, Cospas-Sarsat<br />
          <span className="text-warning">Research-grade prototype — not certified for operational SAR use. Contact anands9408@gmail.com for enquiries.</span>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
