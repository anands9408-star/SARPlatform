import React, { useState } from "react";
import {
  Heart,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  CheckCircle,
  Phone,
  Radio,
  Clock,
  MapPin,
  Zap,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface SurvivorData {
  count: number;
  injured: number;
  critical: number;
  terrainType: string;
  waterAvailable: string;
  signalFire: string;
  eltStatus: string;
  visibility: string;
  tempEstimate: string;
  notes: string;
}

const TERRAIN_TYPES = ["Mountain", "Forest", "Desert", "Sea / Water", "Urban Debris", "Jungle", "Snow / Ice", "Open Field"];
const VISIBILITY = ["Clear — >5 km", "Moderate — 1-5 km", "Low — <1 km", "Night / No Visibility"];
const TEMP_ESTIMATES = ["Extreme Cold (<0°C)", "Cold (0–10°C)", "Mild (10–25°C)", "Hot (25–40°C)", "Extreme Heat (>40°C)"];
const YES_NO = ["Yes", "No", "Unknown"];

const defaultData: SurvivorData = {
  count: 1,
  injured: 0,
  critical: 0,
  terrainType: "Mountain",
  waterAvailable: "Unknown",
  signalFire: "No",
  eltStatus: "Yes",
  visibility: "Clear — >5 km",
  tempEstimate: "Mild (10–25°C)",
  notes: "",
};

// Survival tips based on terrain
const SURVIVAL_TIPS: Record<string, string[]> = {
  Mountain: [
    "Stay at crash site — rescuers search last known position first",
    "Signal with mirror or bright fabric during daylight",
    "Build shelter from wind on leeward side of rocks",
    "Conserve energy — hypothermia risk increases rapidly at altitude",
    "Three whistle blasts or three fires in a triangle = universal distress",
  ],
  "Forest": [
    "Find a clearing for aerial visibility — do not move into dense trees",
    "Create a large X pattern on the ground using rocks/branches",
    "Stay near the aircraft wreckage — it is easier to spot from air",
    "Collect rainwater from large leaves; purify before drinking",
    "Signal fire: green leaves = white smoke visible during day",
  ],
  "Desert": [
    "Stay in shade during midday — prevent heat exhaustion",
    "Signal with reflective surfaces; mirrors visible up to 15 km",
    "Water is critical — ration carefully, do not exert in heat",
    "Ground signal: use rocks/debris to spell SOS in large letters",
    "Nights can be extremely cold — prepare insulation from wreckage",
  ],
  "Sea / Water": [
    "Deploy life raft immediately — stay together as a group",
    "Activate ELT and personal locator beacons (PLB) immediately",
    "Use sea dye marker during daylight for aerial detection",
    "Protect from solar exposure — hyperthermia kills quickly at sea",
    "Flash mirrors or lights toward aircraft/vessels at night",
  ],
  "Snow / Ice": [
    "Build snow shelter (quinzhee) to preserve body heat",
    "Mark SOS large in snow — visible from aircraft",
    "Stay dry — wet clothing causes hypothermia rapidly",
    "Insulate from ground — cold ground draws heat faster than air",
    "Ration food — digestion generates body heat",
  ],
  "Urban Debris": [
    "Tap on pipes or walls in sets of 3 — rescuers listen for patterns",
    "Move to exterior of structure if safe — easier extraction",
    "Signal from windows with bright fabric or lights",
    "Conserve phone battery — save for rescue calls only",
    "Cover mouth/nose with cloth in dust environments",
  ],
  Jungle: [
    "Stay near river banks — they guide both survivors and rescuers",
    "Signal smoke from jungle clearings is best aerial visibility",
    "Boil all water before consumption — prevent disease",
    "Mark trail if moving — leave visible direction signs",
    "Be cautious of wildlife and avoid fresh animal tracks",
  ],
  "Open Field": [
    "Lay debris/wreckage in a large X or SOS pattern",
    "Signal mirror flashes visible up to 15 km in open terrain",
    "Stay with the aircraft — reflective fuselage aids visual search",
    "Set signal fires at three corners — triangulation aids locating",
    "Wave brightly colored fabric when aircraft is heard/seen",
  ],
};

const EMERGENCY_CONTACTS = [
  { country: "India", number: "112", org: "National Emergency" },
  { country: "India", number: "1800-180-3943", org: "Indian Coast Guard" },
  { country: "India", number: "011-24621086", org: "DGCA SAR" },
  { country: "USA", number: "1-800-SAR-HELP", org: "AFRCC" },
  { country: "International", number: "121.5 MHz", org: "ELT Distress Frequency" },
  { country: "International", number: "406 MHz", org: "EPIRB / PLB Frequency" },
];

const SurvivorAssist: React.FC = () => {
  const [data, setData] = useState<SurvivorData>(defaultData);
  const [priorityGenerated, setPriorityGenerated] = useState(false);

  const set = (key: keyof SurvivorData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = key === "count" || key === "injured" || key === "critical"
      ? parseInt(e.target.value) || 0
      : e.target.value;
    setData((p) => ({ ...p, [key]: val }));
  };

  const getPriority = (): { level: string; color: string; action: string } => {
    if (data.critical > 0) return { level: "CRITICAL", color: "text-danger", action: "Immediate medical evacuation required" };
    if (data.injured > 0) return { level: "HIGH", color: "text-warning", action: "Medical assistance needed — expedite rescue" };
    return { level: "STANDARD", color: "text-success", action: "Survivors stable — standard search procedure" };
  };

  const generateReport = () => {
    setPriorityGenerated(true);
    toast.success("Survivor priority report generated — transmit to command.");
  };

  const priority = getPriority();
  const tips = SURVIVAL_TIPS[data.terrainType] || SURVIVAL_TIPS["Open Field"];

  return (
    <div className="min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border" style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-3">
          <Heart size={20} className="text-danger" />
          <div>
            <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">
              SURVIVOR ASSISTANCE MODULE
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Triage assessment, survival guidance, and emergency protocols for crash survivors
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT: Survivor Input */}
        <div className="space-y-4">

          {/* Survivor Count */}
          <div className="sar-card hud-border p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Heart size={14} className="text-danger" />
              <h3 className="font-heading text-sm font-700 tracking-widest">SURVIVOR TRIAGE</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "TOTAL SURVIVORS", key: "count" as const, color: "text-success" },
                { label: "INJURED", key: "injured" as const, color: "text-warning" },
                { label: "CRITICAL", key: "critical" as const, color: "text-danger" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="label-tag block mb-1.5">{f.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={(data as any)[f.key]}
                    onChange={set(f.key)}
                    className="sar-input font-mono text-lg text-center"
                    style={{ color: `hsl(var(--foreground))` }}
                  />
                </div>
              ))}
            </div>

            {/* Priority indicator */}
            <div className="p-3 rounded flex items-center gap-3"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className={`w-3 h-3 rounded-full ${data.critical > 0 ? "bg-danger" : data.injured > 0 ? "bg-warning" : "bg-success"} animate-pulse`} />
              <div>
                <div className={`font-heading text-sm font-700 tracking-wider ${priority.color}`}>
                  PRIORITY: {priority.level}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{priority.action}</div>
              </div>
            </div>
          </div>

          {/* Environment */}
          <div className="sar-card hud-border p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <MapPin size={14} className="text-primary" />
              <h3 className="font-heading text-sm font-700 tracking-widest">ENVIRONMENT</h3>
            </div>

            <div>
              <label className="label-tag block mb-1.5">TERRAIN TYPE</label>
              <select value={data.terrainType} onChange={set("terrainType")} className="sar-select">
                {TERRAIN_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label-tag block mb-1.5">TEMPERATURE ESTIMATE</label>
              <select value={data.tempEstimate} onChange={set("tempEstimate")} className="sar-select">
                {TEMP_ESTIMATES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label-tag block mb-1.5">VISIBILITY</label>
              <select value={data.visibility} onChange={set("visibility")} className="sar-select">
                {VISIBILITY.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Signals */}
          <div className="sar-card hud-border p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Radio size={14} className="text-primary" />
              <h3 className="font-heading text-sm font-700 tracking-widest">SIGNAL STATUS</h3>
            </div>

            {[
              { label: "WATER AVAILABLE?", key: "waterAvailable" as const },
              { label: "SIGNAL FIRE LIT?", key: "signalFire" as const },
              { label: "ELT ACTIVATED?", key: "eltStatus" as const },
            ].map((f) => (
              <div key={f.key}>
                <label className="label-tag block mb-1.5">{f.label}</label>
                <div className="flex gap-2">
                  {YES_NO.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setData((p) => ({ ...p, [f.key]: opt }))}
                      className={`flex-1 py-2 rounded font-heading text-xs font-600 tracking-wide transition-all border ${
                        (data as any)[f.key] === opt
                          ? opt === "Yes" ? "bg-success/10 border-success text-success"
                            : opt === "No" ? "bg-danger/10 border-danger text-danger"
                            : "bg-primary/10 border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label className="label-tag block mb-1.5">ADDITIONAL NOTES</label>
              <textarea
                value={data.notes}
                onChange={(e) => setData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Injuries description, hazards, visible landmarks..."
                rows={3}
                className="sar-input resize-none text-xs"
              />
            </div>
          </div>

          <button onClick={generateReport} className="sar-btn-primary w-full">
            <Shield size={14} className="inline mr-2" />
            GENERATE PRIORITY REPORT
          </button>
        </div>

        {/* CENTER: Survival Tips */}
        <div className="space-y-4">
          <div className="sar-card hud-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between"
              style={{ background: "hsl(var(--surface))" }}>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-warning" />
                <h3 className="font-heading text-sm font-700 tracking-widest">
                  SURVIVAL GUIDE — {data.terrainType.toUpperCase()}
                </h3>
              </div>
              <span className="label-tag text-warning">{tips.length} PROTOCOLS</span>
            </div>
            <div className="p-4 space-y-3">
              {tips.map((tip, i) => (
                <div key={i} className="flex gap-3 p-3 rounded transition-colors"
                  style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-heading font-700 text-xs"
                    style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Checklist */}
          <div className="sar-card hud-border p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <CheckCircle size={14} className="text-success" />
              <h3 className="font-heading text-sm font-700 tracking-widest">IMMEDIATE CHECKLIST</h3>
            </div>
            {[
              "Activate ELT / PLB beacon immediately",
              "Move away from fuel leak / fire hazard",
              "Administer first aid to critical survivors",
              "Establish shelter — temperature control is urgent",
              "Conserve water and ration food supplies",
              "Set up ground-to-air signal (SOS/X pattern)",
              "Stay at crash site unless immediate hazard",
              "Maintain group — do not separate survivors",
            ].map((item, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <div className="w-4 h-4 rounded border border-border mt-0.5 flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
                  <CheckCircle size={10} className="text-transparent group-hover:text-primary transition-colors" />
                </div>
                <span className="text-xs text-foreground leading-relaxed">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* RIGHT: Report + Contacts */}
        <div className="space-y-4">

          {/* Priority Report */}
          {priorityGenerated && (
            <div className="sar-card hud-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2"
                style={{ background: "hsl(var(--danger) / 0.08)" }}>
                <AlertTriangle size={14} className="text-danger" />
                <h3 className="font-heading text-sm font-700 tracking-widest text-danger">
                  PRIORITY REPORT — TRANSMIT NOW
                </h3>
              </div>
              <div className="p-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded space-y-1.5" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                  <div className="font-heading text-sm text-primary tracking-widest mb-3">SAR SURVIVOR REPORT</div>
                  {[
                    ["PRIORITY", priority.level],
                    ["TOTAL SURVIVORS", data.count],
                    ["INJURED", data.injured],
                    ["CRITICAL / URGENT", data.critical],
                    ["TERRAIN", data.terrainType],
                    ["TEMPERATURE", data.tempEstimate],
                    ["VISIBILITY", data.visibility],
                    ["WATER SUPPLY", data.waterAvailable],
                    ["SIGNAL FIRE", data.signalFire],
                    ["ELT STATUS", data.eltStatus],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{k}:</span>
                      <span className={String(k) === "PRIORITY" ? priority.color : "text-foreground"}>{String(v)}</span>
                    </div>
                  ))}
                  {data.notes && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-muted-foreground mb-1">NOTES:</div>
                      <div className="text-foreground">{data.notes}</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText("SAR SURVIVOR REPORT\n" + JSON.stringify(data, null, 2)); toast.success("Report copied to clipboard."); }}
                  className="sar-btn-secondary w-full text-xs py-2"
                >
                  COPY TO CLIPBOARD
                </button>
              </div>
            </div>
          )}

          {/* Emergency Contacts */}
          <div className="sar-card hud-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2"
              style={{ background: "hsl(var(--surface))" }}>
              <Phone size={14} className="text-primary" />
              <h3 className="font-heading text-sm font-700 tracking-widest">EMERGENCY CONTACTS</h3>
            </div>
            <div className="divide-y divide-border">
              {EMERGENCY_CONTACTS.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors">
                  <div>
                    <div className="text-xs text-foreground font-500">{c.org}</div>
                    <div className="label-tag">{c.country}</div>
                  </div>
                  <div className="font-mono text-sm text-primary font-600">{c.number}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Distress Signals Card */}
          <div className="sar-card hud-border p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Radio size={14} className="text-primary" />
              <h3 className="font-heading text-sm font-700 tracking-widest">DISTRESS SIGNALS</h3>
            </div>
            {[
              { signal: "3 Whistle Blasts", meaning: "Universal distress — repeat every 60s" },
              { signal: "SOS (··· — — — ···)", meaning: "Morse code — light or mirror" },
              { signal: "3 Fires / Smoke (△)", meaning: "Triangle formation — aerial visibility" },
              { signal: "Ground X Pattern", meaning: "Requires immediate assistance" },
              { signal: "Ground V Pattern", meaning: "Require medical help" },
              { signal: "Wave Both Arms", meaning: "Aircraft acknowledgement signal" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-2.5 rounded"
                style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                <div className="shrink-0">
                  <div className="font-mono text-xs text-primary font-600">{item.signal}</div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">{item.meaning}</div>
              </div>
            ))}
          </div>

          {/* Time elapsed tracker */}
          <div className="sar-card hud-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-warning" />
              <h3 className="font-heading text-sm font-700 tracking-widest">GOLDEN HOUR TRACKER</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The first <span className="text-warning font-600">72 hours</span> are critical for survivor rescue. After 24h without rescue, activate all available signals simultaneously. Medical supplies should be rationed for minimum 96 hours.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["0–24h", "CRITICAL", "danger"], ["24–72h", "HIGH", "warning"], ["72h+", "SUSTAINED", "primary"]].map(([h, l, c]) => (
                <div key={h} className="rounded p-2" style={{ background: "hsl(var(--muted))" }}>
                  <div className={`font-mono text-xs font-600 text-${c}`}>{h}</div>
                  <div className="label-tag text-[9px]">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurvivorAssist;
