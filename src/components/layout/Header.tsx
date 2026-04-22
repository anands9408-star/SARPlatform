import { NavLink, useNavigate } from "react-router-dom";
import sarLogo from "@/assets/sar-logo.png";
import { Radio, Map, FileText, BookOpen, History, LogOut, Shield, Eye, Globe } from "lucide-react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Header = () => {
  const { user, logout, isHost, isAuthenticated, isFreeViewer } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("Logged out from SAR Platform.");
    navigate("/login");
  };

  // Nav items — filtered by role
  const allNavItems = [
    { to: "/platform",  label: "PLATFORM",    icon: Map,      end: true,  requiresHost: false, freeViewerOk: true },
    { to: "/mission",   label: "MISSION",      icon: Radio,    end: false, requiresHost: true,  freeViewerOk: false },
    { to: "/history",   label: "HISTORY",      icon: History,  end: false, requiresHost: true,  freeViewerOk: false },
    { to: "/docs",      label: "DOCS",         icon: BookOpen, end: false, requiresHost: false, freeViewerOk: true  },
    { to: "/license",   label: "LICENSE",      icon: FileText, end: false, requiresHost: false, freeViewerOk: true, public: true },
  ];

  // Show nav only when authenticated; always show license
  const navItems = isAuthenticated
    ? allNavItems.filter((n) => {
        if (n.requiresHost) return isHost;
        if (isFreeViewer)   return (n as any).freeViewerOk;
        return true;
      })
    : allNavItems.filter((n) => (n as any).public);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{
        background: "hsl(220 40% 6% / 0.96)",
        borderBottom: "1px solid hsl(var(--card-border))",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center h-full px-4 gap-3">
        {/* Logo */}
        <NavLink to={isAuthenticated ? "/platform" : "/login"} className="flex items-center gap-2.5 shrink-0">
          <img src={sarLogo} alt="SAR Logo" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-heading text-lg font-bold text-primary leading-none tracking-widest">SAR</div>
            <div className="label-tag text-[8px]">Search Aircraft Rescue</div>
          </div>
        </NavLink>

        <div className="w-px h-8 shrink-0" style={{ background: "hsl(var(--border))" }} />

        {/* Nav */}
        <nav className="flex items-center gap-1 overflow-x-auto flex-1">
          {navItems.map((item) => (
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
          {!isAuthenticated && (
            <NavLink
              to="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded font-heading text-xs font-700 tracking-wide transition-all whitespace-nowrap border border-primary/40 text-primary hover:bg-primary/10 ml-2"
            >
              LOGIN
            </NavLink>
          )}
        </nav>

        {/* User info + auth status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="label-tag text-success text-[9px]">LIVE</span>
          </div>
          <LiveClock />

          {isAuthenticated && user && (
            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
              >
                {isHost
                  ? <Shield size={11} className="text-danger" />
                  : isFreeViewer
                    ? <Globe size={11} className="text-success" />
                    : <Eye size={11} className="text-primary" />}
                <span className="font-mono text-[10px] text-foreground max-w-[120px] truncate">
                  {user.email.split("@")[0]}
                </span>
                <span className={`font-heading text-[8px] font-700 ${isHost ? "text-danger" : isFreeViewer ? "text-success" : "text-primary"}`}>
                  {isHost ? "HOST" : isFreeViewer ? "FREE" : "VIEWER"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                title="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
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
