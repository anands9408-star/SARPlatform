import React from "react";
import { SAMPLE_AIRCRAFT } from "@/constants/sar";
import { Plane, Cpu, Users } from "lucide-react";

const typeIcon = (type: string) => {
  if (type === "Drone") return <Cpu size={14} />;
  if (type === "Ground Unit") return <Users size={14} />;
  return <Plane size={14} />;
};

const AircraftStatusCards: React.FC = () => {
  return (
    <div className="sar-card hud-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-heading text-base font-700 tracking-widest">ASSET STATUS</h3>
        <span className="label-tag text-success">{SAMPLE_AIRCRAFT.length} ASSETS</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "hsl(var(--border))" }}>
        {SAMPLE_AIRCRAFT.map((a) => (
          <div key={a.id} className="p-4" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center justify-between mb-3">
              <div className={a.status === "Active" ? "text-success" : "text-warning"}>
                {typeIcon(a.type)}
              </div>
              <span className={`label-tag ${a.status === "Active" ? "text-success" : "text-warning"}`}>
                {a.status.toUpperCase()}
              </span>
            </div>
            <div className="font-heading text-lg font-700 tracking-wider text-foreground mb-0.5">
              {a.callsign}
            </div>
            <div className="label-tag mb-3">{a.type}</div>

            {/* Fuel bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="label-tag text-[9px]">FUEL</span>
                <span className="font-mono text-[10px] text-foreground">{a.fuel}%</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${a.fuel}%`,
                    background:
                      a.fuel > 60
                        ? "hsl(var(--success))"
                        : a.fuel > 30
                        ? "hsl(var(--warning))"
                        : "hsl(var(--danger))",
                  }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1">
              <span className="label-tag text-[9px]">SECTOR:</span>
              <span className="font-mono text-[10px] text-primary">{a.sector}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AircraftStatusCards;
