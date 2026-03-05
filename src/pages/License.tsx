import React, { useState } from "react";
import { Shield, AlertTriangle, FileText, Lock, Globe, ChevronDown, ChevronRight } from "lucide-react";

const SECTIONS = [
  {
    id: "purpose",
    title: "PURPOSE & INTENDED USE",
    icon: Globe,
    content: `The SAR (Search Aircraft Rescue) Platform is developed exclusively for legitimate search and rescue operations conducted by authorized agencies, licensed aviation authorities, certified rescue coordinators, and their designated support personnel.

This platform is intended to assist in locating distressed aircraft, coordinating rescue assets, estimating search zones using validated aeronautical physics, and supporting survivor triage operations.`,
  },
  {
    id: "authorized",
    title: "AUTHORIZED USERS",
    icon: Shield,
    content: `This system may only be operated by:

• Government SAR agencies (ISRO SAR, AFRCC, JRCC, MRCC, etc.)
• Licensed civil aviation authority personnel (DGCA, FAA, EASA, etc.)
• Certified search and rescue coordinators
• Emergency management professionals
• Authorized law enforcement aviation units
• Academic and research personnel with institutional oversight

Unauthorized access, reproduction, or commercial deployment without express written authorization from the platform owner constitutes a violation of applicable law.`,
  },
  {
    id: "prohibited",
    title: "PROHIBITED USES — STRICTLY FORBIDDEN",
    icon: AlertTriangle,
    content: `The following uses are STRICTLY PROHIBITED and may result in criminal prosecution:

• Tracking, monitoring, or surveillance of individuals or aircraft without legal authority
• Use in planning, facilitating, or concealing criminal activity of any nature
• Interference with civil or military airspace or navigation systems
• Unauthorized interception of ELT or distress signals
• Providing false distress information to rescue agencies (a criminal offense in most jurisdictions)
• Reverse engineering, redistributing, or reselling this platform's technology
• Use by or for sanctioned entities, terrorist organizations, or hostile actors
• Weaponization or military applications beyond sanctioned SAR operations

Misuse of aviation emergency frequencies (121.5 MHz, 406 MHz) is a federal offense under ICAO Annex 10 and applicable national aviation acts.`,
  },
  {
    id: "data",
    title: "DATA & PRIVACY",
    icon: Lock,
    content: `Live aircraft data sourced from OpenSky Network is made available under the OpenSky Network Data License. This data is restricted to non-commercial, research, and humanitarian use.

All mission data entered into this platform:
• Is processed locally within your session
• Is not transmitted to external servers by default
• Must not contain personally identifiable information (PII) beyond operational necessity
• Must be handled in accordance with your organization's data protection policy

The platform owner accepts no liability for data entered, stored, or shared by operators.`,
  },
  {
    id: "liability",
    title: "LIABILITY DISCLAIMER",
    icon: FileText,
    content: `THIS PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

Search zone predictions, glide radius calculations, and probability estimates are algorithmic approximations for operational guidance only. They do not replace professional judgment, certified SAR procedures, or official aeronautical data.

The platform owner shall not be liable for:
• Decisions made based on platform outputs
• Accuracy or availability of third-party data (OpenSky, weather sources)
• Outcomes of SAR operations in which this platform was used
• Any direct, indirect, incidental, or consequential damages arising from use or misuse

All SAR operations must comply with ICAO, national aviation authority requirements, and applicable maritime law.`,
  },
  {
    id: "legal",
    title: "LEGAL JURISDICTION & REPORTING",
    icon: Shield,
    content: `This platform operates under the jurisdiction of applicable Indian law, international aviation conventions (ICAO Annex 12 — Search and Rescue), and the Convention on International Civil Aviation (Chicago Convention).

To report misuse, unauthorized access, or suspected criminal activity involving this platform, contact:

• Indian Coast Guard: 1800-180-3943
• DGCA SAR Coordination: 011-24621086
• National Emergency: 112
• International Emergency: +1-757-441-7301 (US Coast Guard Command)

All reports of misuse will be investigated and may be forwarded to appropriate law enforcement authorities.`,
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
      <div className="px-6 py-4 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-primary" />
          <div>
            <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">
              LEGAL LICENSE & TERMS OF USE
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              SAR Platform — Authorized Use Policy · Effective: 2025
            </p>
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
              RESTRICTED GOVERNMENT / AUTHORIZED AGENCY USE ONLY
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              This platform contains tools that interface with live aviation data, ELT signal interpretation, and probabilistic search zone modeling.
              Unauthorized use, misuse, or use for non-rescue purposes is a violation of international aviation law and may constitute a criminal offense.
              By accessing this system, you affirm that you are an authorized operator and agree to all terms below.
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
                >
                  <Icon size={15} className={isDanger ? "text-danger" : "text-primary"} />
                  <span className={`font-heading text-sm font-700 tracking-widest flex-1 ${isDanger ? "text-danger" : "text-foreground"}`}>
                    {section.title}
                  </span>
                  {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-5 py-4" style={{ background: "hsl(var(--muted))" }}>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
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
            By using the SAR Platform, you acknowledge that:
          </p>
          <ul className="space-y-2 pl-1">
            {[
              "You are an authorized operator or designated personnel of a recognized SAR or aviation authority",
              "You will use this platform solely for legitimate search and rescue or humanitarian purposes",
              "You accept full legal and professional responsibility for all actions taken using this platform",
              "You will not share access credentials, data, or platform capabilities with unauthorized personnel",
              "You understand that misuse may result in criminal prosecution under applicable national and international law",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-border font-mono text-xs text-muted-foreground">
            SAR Platform · Search Aircraft Rescue · Version S31-ALPHA · All Rights Reserved<br />
            Unauthorized use is monitored, logged, and reportable to enforcement authorities.
          </div>
        </div>
      </div>
    </div>
  );
};

export default License;
