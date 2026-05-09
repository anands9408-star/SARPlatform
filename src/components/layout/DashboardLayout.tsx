/**
 * DashboardLayout — Left-sidebar layout for authenticated pages
 * Sidebar has: Platform, Active Alerts, Aircraft Logs, Rescue Status,
 *              Subscriber Mgmt, Analytics, History, Mission
 */

import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Map, Activity, Plane, Shield, BarChart2, History,
  Radio, ChevronLeft, ChevronRight, Mic, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  hostOnly?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/platform",    label: "Live Platform",      icon: Map,         hostOnly: false },
  { to: "/alerts",      label: "Active Alerts",      icon: AlertCircle, hostOnly: false },
  { to: "/logs",        label: "Aircraft Logs",       icon: Plane,       hostOnly: false },
  { to: "/rescue",      label: "Rescue Status",       icon: Shield,      hostOnly: false },
  { to: "/subscribers", label: "Subscriber Mgmt",    icon: Radio,       hostOnly: true  },
  { to: "/analytics",   label: "Analytics",           icon: BarChart2,   hostOnly: false },
  { to: "/history",     label: "History Dashboard",   icon: History,     hostOnly: true  },
  { to: "/mission",     label: "Mission Input",       icon: Activity,    hostOnly: true  },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isHost, isFreeViewer } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const items = NAV_ITEMS.filter((item) => {
    if (item.hostOnly && !isHost) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen pt-16" style={{ background: "hsl(var(--background))" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-16 bottom-0 z-40 flex flex-col transition-all duration-300"
        style={{
          width: collapsed ? 52 : 200,
          background: "hsl(220 40% 5%)",
          borderRight: "1px solid hsl(var(--card-border))",
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-end px-3 py-3 border-b hover:bg-white/5 transition-colors"
          style={{ borderColor: "hsl(var(--card-border))" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight size={14} className="text-muted-foreground" />
            : <ChevronLeft size={14} className="text-muted-foreground" />}
        </button>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded px-2 py-2.5 font-heading text-[11px] font-600 tracking-wide transition-all whitespace-nowrap overflow-hidden ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Voice AI button */}
        {!isFreeViewer && (
          <div className="p-2 border-t" style={{ borderColor: "hsl(var(--card-border))" }}>
            <NavLink
              to="/voice"
              title={collapsed ? "Voice AI" : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded px-2 py-2.5 font-heading text-[11px] font-600 tracking-wide transition-all whitespace-nowrap overflow-hidden ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent"
                }`
              }
            >
              <Mic size={14} className="shrink-0" />
              {!collapsed && <span>Voice AI</span>}
            </NavLink>
          </div>
        )}

        {/* Sidebar footer */}
        {!collapsed && (
          <div className="p-3 border-t" style={{ borderColor: "hsl(var(--card-border))" }}>
            <div className="text-[9px] font-mono text-muted-foreground leading-relaxed">
              <div className="text-primary font-700">SAR PLATFORM</div>
              <div>Search Aircraft Rescue</div>
              <div className="mt-1 text-[8px]">anands9408@gmail.com</div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main
        className="flex-1 transition-all duration-300 overflow-auto"
        style={{ marginLeft: collapsed ? 52 : 200 }}
      >
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
