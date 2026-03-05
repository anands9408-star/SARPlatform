import React from "react";
import { MISSION_LOGS } from "@/constants/sar";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

const MissionTimeline: React.FC = () => {
  return (
    <div className="sar-card hud-border flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="font-heading text-base font-700 tracking-widest">MISSION LOG</h3>
        <span className="label-tag">{MISSION_LOGS.length} EVENTS</span>
      </div>
      <div className="overflow-y-auto flex-1 scrollbar-thin p-2 space-y-1">
        {MISSION_LOGS.map((log) => {
          const Icon =
            log.severity === "critical"
              ? AlertCircle
              : log.severity === "warning"
              ? AlertTriangle
              : Info;
          const color =
            log.severity === "critical"
              ? "text-danger"
              : log.severity === "warning"
              ? "text-warning"
              : "text-muted-foreground";
          return (
            <div
              key={log.id}
              className="flex gap-3 p-2 rounded hover:bg-secondary/40 transition-colors"
            >
              <Icon size={13} className={`${color} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug">{log.event}</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{log.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MissionTimeline;
