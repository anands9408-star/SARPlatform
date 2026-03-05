import { NavLink } from "react-router-dom";
import sarLogo from "@/assets/sar-logo.png";
import { Radio, Map, Heart, FileText, BookOpen } from "lucide-react";
import React from "react";

const Header = () => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{
        background: "hsl(220 40% 6% / 0.96)",
        borderBottom: "1px solid hsl(var(--card-border))",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center h-full px-4 gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={sarLogo} alt="SAR Logo" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-heading text-lg font-bold text-primary leading-none tracking-widest">SAR</div>
            <div className="label-tag text-[8px]">Search Aircraft Rescue</div>
          </div>
        </NavLink>

        <div className="w-px h-8 shrink-0" style={{ background: "hsl(var(--border))" }} />

        {/* Nav */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {[
            { to: "/", label: "PREDICTION", icon: Map, end: true },
            { to: "/mission", label: "MISSION INPUT", icon: Radio, end: false },
            { to: "/survivor", label: "SURVIVOR AID", icon: Heart, end: false },
            { to: "/docs", label: "DOCS", icon: BookOpen, end: false },
            { to: "/license", label: "LICENSE", icon: FileText, end: false },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded font-heading text-xs font-600 tracking-wide transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon size={12} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Live Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="label-tag text-success">LIVE</span>
          </div>
          <LiveClock />
          <div className="sar-card px-3 py-1 hidden sm:block">
            <span className="font-mono text-xs text-primary">S31-ALPHA</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const LiveClock = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-xs text-muted-foreground hidden md:block">
      {time.toUTCString().slice(17, 25)} UTC
    </span>
  );
};

export default Header;
