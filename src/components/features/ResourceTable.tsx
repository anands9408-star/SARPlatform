import React from "react";
import { SEARCH_ZONES } from "@/constants/sar";

const ResourceTable: React.FC = () => {
  return (
    <div className="sar-card hud-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-heading text-base font-700 tracking-widest text-foreground">
          RESOURCE ALLOCATION
        </h3>
        <span className="label-tag text-success">3 ASSETS ACTIVE</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "hsl(var(--muted))" }}>
            <th className="text-left px-4 py-2 label-tag">ZONE</th>
            <th className="text-left px-4 py-2 label-tag">PROBABILITY</th>
            <th className="text-left px-4 py-2 label-tag">RADIUS</th>
            <th className="text-left px-4 py-2 label-tag">ASSIGNED RESOURCE</th>
            <th className="text-left px-4 py-2 label-tag">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {SEARCH_ZONES.map((zone, i) => (
            <tr
              key={zone.name}
              className="border-t border-border transition-colors hover:bg-secondary/50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: zone.color }}
                  />
                  <span className="font-heading font-600 text-sm tracking-wider" style={{ color: zone.color }}>
                    {zone.name.toUpperCase()}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${zone.probability}%`, background: zone.color }}
                    />
                  </div>
                  <span className="font-mono text-xs text-foreground">{zone.probability}%</span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {(zone.radius / 1000).toFixed(0)} km
              </td>
              <td className="px-4 py-3 text-sm text-foreground">{zone.resource}</td>
              <td className="px-4 py-3">
                <span className={`label-tag ${i === 0 ? "text-success" : i === 1 ? "text-warning" : "text-success"}`}>
                  {i === 1 ? "STANDBY" : "ACTIVE"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResourceTable;
