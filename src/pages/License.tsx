/**
 * SAR Platform — Legal License, Terms of Use & Indian Aviation Compliance
 */

import React, { useState } from "react";
import {
  Shield, AlertTriangle, FileText, Lock, Globe,
  ChevronDown, ChevronRight, Plane, Radio, BookOpen,
} from "lucide-react";

const SECTIONS = [
  {
    id: "purpose",
    title: "PURPOSE & INTENDED USE",
    icon: Globe,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <p>
          The <strong>SAR (Search Aircraft Rescue) Platform</strong> is developed as a research-grade situational awareness tool to assist
          in monitoring live aircraft telemetry, estimating search zones for distressed aircraft, and supporting Search &amp; Rescue (SAR)
          mission coordination using publicly available ADS-B data and open weather APIs.
        </p>
        <p>
          The platform integrates the <strong>OpenSky Network</strong> global ADS-B receiver network, the <strong>Open-Meteo</strong> weather
          API, and <strong>Google Gemini 3 Flash</strong> AI to provide real-time aircraft tracking, physics-based kinematic prediction,
          danger risk scoring, ELT triangulation, and automated Gmail alerting for mission operators.
        </p>

        <div className="p-4 rounded-lg" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">INTENDED USERS</div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {[
              "Government Search & Rescue agencies (Indian Coast Guard, IAF, ISRO SAC, RCC New Delhi/Mumbai/Chennai)",
              "Licensed civil aviation authority personnel (DGCA, FAA, EASA, CAAS, CAA-India)",
              "Certified search and rescue coordinators and mission operators",
              "Emergency management professionals and aerodrome rescue teams",
              "Academic researchers, aviation enthusiasts, and pilot communities for training and situational awareness",
              "Authorized law enforcement aviation units operating under valid mandate",
              "Aviation journalism and safety analysis professionals",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-lg" style={{ background: "hsl(220 40% 6%)", border: "1px solid hsl(var(--border))" }}>
          <div className="font-heading text-xs font-700 tracking-widest text-warning mb-2">IMPORTANT DISCLAIMER</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            SAR Platform is a <strong>research-grade prototype</strong>, NOT certified by DGCA, AAI, FAA, EASA, or any aviation authority
            for operational emergency use. All outputs — AI crash predictions, danger scores, search zones, ELT triangulations — are
            algorithmic estimates for situational awareness, training, and research purposes only. In any real aviation emergency,
            immediately contact the nearest ATC facility, Indian Coast Guard (1800-180-3943), or National Emergency (112).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "indian-aviation-law",
    title: "INDIAN AVIATION LAW & REGULATORY FRAMEWORK",
    icon: Shield,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p>
          This platform operates within the jurisdiction of Indian law and applicable international aviation conventions. Users in India
          must comply with the following regulatory framework:
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">THE AIRCRAFT ACT, 1934</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The primary legislation governing civil aviation in India. Section 5 grants the Central Government power to make rules
              for safety of air navigation. Section 11 prescribes penalties for dangerous flying. Operators must not use this platform
              in any manner that could interfere with, hinder, or endanger the safety of civil aviation as defined under this Act.
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">DGCA CIVIL AVIATION REQUIREMENTS (CAR)</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Directorate General of Civil Aviation issues CARs under the Aircraft Rules, 1937. Key CARs relevant to this platform:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-32">CAR Section 2 Part II</span><span>ADS-B Out equipment mandate for Indian-registered aircraft above FL290, effective 2022</span></li>
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-32">CAR Section 5 Part X</span><span>Search and Rescue — SAR procedures, RCC responsibilities, ELT carriage requirements for aircraft in India</span></li>
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-32">CAR Section 7 Part I</span><span>Emergency Radio Frequencies — 121.5 MHz (VHF distress), 243 MHz (UHF military guard), 406 MHz (ELT)</span></li>
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-32">CAR Section 9 Part II</span><span>Wireless Equipment — operation of radio equipment, licensing requirements under WPC regulations</span></li>
            </ul>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">AIRPORTS AUTHORITY OF INDIA (AAI) ACT, 1994</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AAI is the statutory body responsible for providing air traffic services, communications, navigation, and surveillance
              across 137 airports in India. AAI operates four Area Control Centres (ACCs) at Delhi, Mumbai, Chennai, and Kolkata,
              each managing a Flight Information Region (FIR). SAR Platform data does not substitute for — and must not be presented
              as equivalent to — official AAI radar and ATC data. AAI radar provides secondary surveillance radar (SSR) with greater
              precision and authority than public ADS-B feeds.
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">INFORMATION TECHNOLOGY ACT, 2000 (India)</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unauthorized access to computer systems, interception of electronic data, and identity fraud are offenses under the IT
              Act. Access credentials for SAR Platform must not be shared, transferred, or used by unauthorized persons. Any attempt
              to reverse-engineer, scrape, or exploit the platform's authentication system will be treated as a violation of Section
              43 and Section 66 of the IT Act, 2000.
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">ICAO ANNEXES — INTERNATIONAL OBLIGATIONS</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              India is a signatory to the Convention on International Civil Aviation (Chicago Convention, 1944) and has ratified all
              applicable ICAO Annexes. Relevant annexes for SAR Platform operations:
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-24">Annex 10 Vol III</span><span>Aviation telecommunications — emergency frequencies 121.5 MHz and 406 MHz usage and protection</span></li>
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-24">Annex 12</span><span>Search and Rescue — RCC procedures, SAR coordination, ELT standards, COSPAS-SARSAT requirements</span></li>
              <li className="flex gap-2"><span className="text-primary font-700 shrink-0 w-24">Annex 13</span><span>Aircraft Accident and Incident Investigation — reporting obligations, evidence preservation</span></li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "authorized",
    title: "AUTHORIZED USERS",
    icon: Shield,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <p>This system may only be operated by the following authorized personnel. Unauthorized access constitutes a violation of applicable Indian and international law.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Government SAR Agencies", items: ["ISRO Space Applications Centre (Cospas-Sarsat INMCC)", "Indian Coast Guard (RCC coordination)", "Indian Air Force SAR units", "JRCC / MRCC operations centres"] },
            { title: "Aviation Authorities", items: ["DGCA regulatory personnel", "AAI Air Traffic Control officers", "FAA, EASA, CAAS international counterparts", "Airport Emergency Services (AES)"] },
            { title: "Research & Education", items: ["Aviation safety researchers", "University aviation programs", "Aerospace engineering students (supervised)", "Aviation journalism professionals"] },
            { title: "Commercial Operators", items: ["Airline safety departments (situational awareness only)", "Helicopter SAR service providers", "Drone (UAS) operators in coordination zones", "Aviation insurance investigators (post-incident review)"] },
          ].map((group) => (
            <div key={group.title} className="p-3 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">{group.title}</div>
              <ul className="space-y-1">
                {group.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "prohibited",
    title: "PROHIBITED USES — STRICTLY FORBIDDEN",
    icon: AlertTriangle,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <p className="text-danger font-heading text-xs font-700 tracking-widest">The following uses are STRICTLY PROHIBITED and may result in criminal prosecution under Indian law, ICAO standards, and applicable international conventions:</p>

        <div className="space-y-2">
          {[
            { cat: "SURVEILLANCE & TRACKING", color: "#ef4444", items: [
              "Tracking, monitoring, or surveillance of individuals or aircraft without legal authority or valid SAR mandate",
              "Stalking, profiling, or building intelligence dossiers on private aircraft operators or passengers",
              "Commercial competitor intelligence gathering using aircraft tracking data",
            ]},
            { cat: "CRIMINAL ACTIVITY", color: "#ef4444", items: [
              "Use in planning, facilitating, concealing, or supporting any criminal activity",
              "Smuggling route planning using aircraft tracking to avoid interdiction",
              "Human trafficking facilitation using aviation data",
              "Providing false distress information to rescue agencies (criminal offense under Indian Penal Code Sec. 177 and ICAO Annex 12)",
            ]},
            { cat: "AVIATION INTERFERENCE", color: "#f97316", items: [
              "Any interference with civil or military airspace, navigation systems, or air traffic control",
              "Unauthorized interception, jamming, or spoofing of ELT or ADS-B signals (Wireless Telegraphy Act, 1933)",
              "Generating false ADS-B targets or injecting false position data",
            ]},
            { cat: "UNAUTHORIZED DISTRIBUTION", color: "#eab308", items: [
              "Reverse engineering, redistributing, sublicensing, or reselling this platform's technology or code",
              "Sharing login credentials or access with unauthorized third parties",
              "Republishing AI prediction outputs or risk scores as certified aviation authority data",
            ]},
            { cat: "PROHIBITED ENTITIES", color: "#ef4444", items: [
              "Use by or for sanctioned entities, terrorist organizations, or hostile state actors",
              "Military applications beyond sanctioned SAR operations",
              "State-sponsored surveillance programs targeting civil aviation",
            ]},
          ].map((group) => (
            <div key={group.cat} className="p-3 rounded-lg" style={{ background: `${group.color}08`, border: `1px solid ${group.color}30` }}>
              <div className="font-heading text-[10px] font-700 tracking-widest mb-2" style={{ color: group.color }}>{group.cat}</div>
              <ul className="space-y-1">
                {group.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: group.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="p-3 rounded" style={{ background: "hsl(var(--danger) / 0.08)", border: "1px solid hsl(var(--danger) / 0.3)" }}>
          <p className="text-xs text-danger">
            Misuse of aviation emergency frequencies (121.5 MHz, 406 MHz) is a federal offense under ICAO Annex 10 and the Indian Wireless
            Telegraphy Act. Generating false distress calls is punishable under Indian Penal Code Sec. 177 (false information to public servant)
            and may trigger international law enforcement action under ICAO procedures.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "data",
    title: "DATA SOURCES & PRIVACY",
    icon: Lock,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <div className="space-y-3">
          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">OPENSKY NETWORK DATA LICENSE</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live aircraft data is sourced from the OpenSky Network and is made available under the
              <strong> OpenSky Network Non-Commercial Data License</strong>. This data is restricted to non-commercial, research, and
              humanitarian use. Commercial redistribution of OpenSky data is prohibited without written permission from OpenSky Network.
              Aircraft ICAO24 codes, callsigns, positions, altitudes, velocities, and headings are published under this license.
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">USER DATA & SESSION STORAGE</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">All user authentication data is handled as follows:</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />Email addresses used only for OTP delivery and access control — never sold or shared with third parties</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />Login sessions stored in localStorage with 8-hour TTL — automatically cleared on expiry</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />OTP codes stored in database with 5-minute expiry and single-use enforcement</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />Aircraft history and risk assessment data stored with configurable retention (6h–7 days)</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />No personally identifiable information is collected beyond the operator's email address</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">INDIA PERSONAL DATA PROTECTION</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This platform complies with applicable Indian data protection principles. User email addresses are treated as personal data
              under the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong>. Data is stored on cloud infrastructure
              operated by OnSpace Cloud (Supabase-compatible), with PostgreSQL row-level security policies enforcing access control.
              Users may request deletion of their email and session data by contacting anands9408@gmail.com.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "liability",
    title: "LIABILITY DISCLAIMER",
    icon: FileText,
    content: (
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        <div className="p-4 rounded-lg" style={{ background: "hsl(var(--danger) / 0.06)", border: "1px solid hsl(var(--danger) / 0.3)" }}>
          <p className="text-xs text-foreground font-heading font-700 tracking-widest mb-2">DISCLAIMER OF WARRANTIES</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            THIS PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES
            OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. The platform owner makes no representation that
            aircraft tracking data is real-time, complete, accurate, or suitable for operational decision-making in actual emergencies.
          </p>
        </div>

        <p>
          Search zone predictions, glide radius calculations, danger scores, and AI-generated reports are <strong>algorithmic approximations
          for operational guidance only</strong>. They do not replace professional judgment, certified SAR procedures, or official aeronautical data
          from DGCA, AAI, or international aviation authorities.
        </p>

        <div className="space-y-2">
          <div className="font-heading text-xs font-700 tracking-widest text-primary">THE PLATFORM OWNER SHALL NOT BE LIABLE FOR:</div>
          {[
            "Decisions made based on platform outputs that result in property damage, injury, or death",
            "Accuracy, completeness, or availability of third-party data (OpenSky Network, Open-Meteo, Google Gemini)",
            "Outcomes — positive or negative — of SAR operations in which this platform was used as a reference",
            "Any direct, indirect, incidental, special, exemplary, or consequential damages arising from use or misuse",
            "Delayed, incorrect, or missing Gmail alerts due to SMTP, network, or Google service failures",
            "Inaccuracies in AI-generated prediction reports from Google Gemini 3 Flash",
            "Data loss due to database failures, retention expiry, or infrastructure interruptions",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-danger mt-1.5 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <div className="p-3 rounded" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-xs text-muted-foreground">
            All SAR operations must comply with ICAO Annex 12, DGCA regulations, national aviation authority requirements, and
            applicable maritime law. In India, SAR operations are formally coordinated through the Rescue Co-ordination Centre
            (RCC) under the Indian Coast Guard (Aeronautical) and the Indian Air Force.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "legal",
    title: "LEGAL JURISDICTION & EMERGENCY CONTACTS",
    icon: Shield,
    content: (
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <p>
          This platform operates under the jurisdiction of applicable Indian law, international aviation conventions (ICAO Annex 12 —
          Search and Rescue), and the Convention on International Civil Aviation (Chicago Convention, 1944). Any disputes arising
          from use of this platform shall be governed by the laws of India, with jurisdiction in the courts of Tamil Nadu.
        </p>

        <div className="p-4 rounded-lg" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <div className="font-heading text-xs font-700 tracking-widest text-primary mb-3">INDIAN EMERGENCY CONTACTS — REAL AVIATION EMERGENCIES</div>
          <div className="space-y-2 text-xs">
            {[
              { label: "Indian Coast Guard (SAR)", number: "1800-180-3943", desc: "24/7 SAR coordination, maritime and aviation" },
              { label: "DGCA Emergency", number: "011-24621086", desc: "Aviation safety incidents and regulatory emergencies" },
              { label: "National Emergency", number: "112", desc: "All Indian emergencies including aviation accidents" },
              { label: "AAI Operations Control", number: "011-24632950", desc: "Aerodrome and ATC emergency coordination" },
              { label: "Mumbai RCC", number: "+91-22-22614646", desc: "Western region Rescue Co-ordination Centre" },
              { label: "Chennai RCC", number: "+91-44-25220040", desc: "Southern region Rescue Co-ordination Centre" },
              { label: "US Coast Guard Command", number: "+1-757-441-7301", desc: "International SAR coordination (Atlantic/Pacific)" },
            ].map((c) => (
              <div key={c.label} className="flex gap-3 p-2 rounded" style={{ background: "hsl(var(--muted))" }}>
                <span className="text-primary font-700 w-40 shrink-0">{c.label}</span>
                <span className="font-mono text-primary w-28 shrink-0">{c.number}</span>
                <span className="text-muted-foreground">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
          <div className="font-heading text-xs font-700 tracking-widest text-primary mb-2">REPORTING MISUSE</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            To report misuse, unauthorized access, suspected criminal activity involving this platform, or data breaches, contact:
            <br /><strong className="text-primary">anands9408@gmail.com</strong>
            <br /><br />
            All reports of misuse will be investigated. Confirmed cases of unauthorized access or criminal misuse may be reported to
            the Cybercrime Cell, Indian Police (cybercrime.gov.in), and relevant aviation authorities.
          </p>
        </div>
      </div>
    ),
  },
];

const License: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["purpose", "prohibited"]));

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
      <div className="px-6 py-6 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={20} className="text-primary" />
            <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">
              LEGAL LICENSE & TERMS OF USE
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            SAR Platform — Authorized Use Policy · Indian Aviation Law Compliance · ICAO Annex 12 · Effective: 2025
          </p>
          <div className="mt-3 ml-8 text-xs text-muted-foreground leading-relaxed max-w-3xl">
            Terms of use, legal disclaimer, Indian aviation regulatory compliance (DGCA, AAI, Aircraft Act 1934, IT Act 2000,
            DPDPA 2023), ICAO Annex 12 SAR obligations, prohibited use restrictions, data privacy policy, liability disclaimer,
            and emergency contact information for real aviation emergencies in India.
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">

        {/* Warning Banner */}
        <div className="rounded p-4 flex items-start gap-4"
          style={{ background: "hsl(var(--danger) / 0.08)", border: "1px solid hsl(var(--danger) / 0.4)" }}>
          <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
          <div>
            <div className="font-heading text-base font-700 tracking-wider text-danger mb-1">
              RESEARCH-GRADE PROTOTYPE — NOT CERTIFIED FOR OPERATIONAL SAR USE
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              SAR Platform is a research tool using public APIs (OpenSky Network, Open-Meteo, Google Gemini 3 Flash).
              It is NOT certified by DGCA, AAI, FAA, EASA, or any aviation authority for operational emergency use.
              All outputs — AI predictions, danger scores, search zones, ELT triangulations — are algorithmic estimates for
              situational awareness and training only. In any real aviation emergency in India, contact the Indian Coast Guard
              (1800-180-3943) or National Emergency (112) immediately.
              By accessing this system, you affirm that you understand and accept all terms below.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isOpen = openSections.has(section.id);
            const isDanger = section.id === "prohibited";

            return (
              <div key={section.id} className="sar-card hud-border overflow-hidden">
                <button
                  onClick={() => toggle(section.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-secondary/30 ${isOpen ? "border-b border-border" : ""}`}
                  style={{ background: "hsl(var(--surface))" }}
                >
                  <Icon size={15} className={isDanger ? "text-danger" : "text-primary"} />
                  <span className={`font-heading text-sm font-700 tracking-widest flex-1 ${isDanger ? "text-danger" : "text-foreground"}`}>
                    {section.title}
                  </span>
                  {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-5 py-4" style={{ background: "hsl(var(--muted))" }}>
                    {typeof section.content === "string"
                      ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
                      : section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Acceptance */}
        <div className="sar-card hud-border p-5 mt-6 space-y-3"
          style={{ borderColor: "hsl(var(--primary) / 0.4)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Lock size={14} className="text-primary" />
            <h3 className="font-heading text-sm font-700 tracking-widest text-primary">OPERATOR ACKNOWLEDGEMENT</h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            By using SAR Platform, you explicitly acknowledge and agree that:
          </p>
          <ul className="space-y-2 pl-1">
            {[
              "You understand this platform is a research-grade prototype NOT certified for operational emergency SAR use",
              "You will use this platform solely for situational awareness, training, research, or humanitarian purposes",
              "You accept full legal and professional responsibility for all actions taken using platform outputs",
              "You will not share access credentials or platform capabilities with unauthorized personnel",
              "You will comply with DGCA, AAI, ICAO Annex 12, Indian aviation law, and applicable international conventions",
              "You will immediately contact official SAR agencies (Indian Coast Guard, RCC, or ATC) in any real aviation emergency",
              "You understand that misuse may result in civil liability and criminal prosecution under Indian and international law",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-border font-mono text-xs text-muted-foreground">
            SAR Platform · Search Aircraft Rescue · Version 2.0 · All Rights Reserved<br />
            Jurisdiction: India · Governing Law: Aircraft Act 1934, IT Act 2000, DPDPA 2023, ICAO Annex 12<br />
            Contact: anands9408@gmail.com · Unauthorized use is monitored, logged, and reportable to enforcement authorities.
          </div>
        </div>
      </div>
    </div>
  );
};

export default License;
