import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { SARUser } from "@/hooks/useAuth";

const PredictionPlatform    = lazy(() => import("@/pages/PredictionPlatform"));
const MissionInput           = lazy(() => import("@/pages/MissionInput"));
const SurvivorAssist         = lazy(() => import("@/pages/SurvivorAssist"));
const License                = lazy(() => import("@/pages/License"));
const Documentation          = lazy(() => import("@/pages/Documentation"));
const HistoryDashboard       = lazy(() => import("@/pages/HistoryDashboard"));
const LoginPage              = lazy(() => import("@/pages/LoginPage"));
const AboutPage              = lazy(() => import("@/pages/AboutPage"));
const LaunchPage             = lazy(() => import("@/pages/LaunchPage"));
const ActiveAlerts           = lazy(() => import("@/pages/ActiveAlerts"));
const AircraftLogs           = lazy(() => import("@/pages/AircraftLogs"));
const RescueStatus           = lazy(() => import("@/pages/RescueStatus"));
const SubscriberManagement   = lazy(() => import("@/pages/SubscriberManagement"));
const Analytics              = lazy(() => import("@/pages/Analytics"));
const VoiceAI                = lazy(() => import("@/pages/VoiceAI"));

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(var(--background))" }}>
    <div className="text-center space-y-4">
      <div className="relative w-16 h-16 mx-auto">
        <div className="radar-ring absolute inset-0" />
        <div className="radar-ring absolute inset-0" style={{ animationDelay: "1s" }} />
        <div className="w-16 h-16 rounded-full border border-primary flex items-center justify-center">
          <span className="text-2xl">✈</span>
        </div>
      </div>
      <div className="font-heading text-xl tracking-widest text-primary">INITIALIZING SAR SYSTEMS…</div>
      <div className="font-mono text-xs text-muted-foreground">Loading mission systems</div>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(var(--background))" }}>
    <div className="text-center">
      <div className="font-heading text-6xl font-700 text-primary mb-4">404</div>
      <div className="font-heading text-xl tracking-widest text-foreground mb-2">SECTOR NOT FOUND</div>
      <p className="text-muted-foreground mb-6">This zone is outside mission parameters.</p>
      <a href="/login" className="sar-btn-primary inline-block">RETURN TO BASE</a>
    </div>
  </div>
);

// ── Google OAuth callback handler ─────────────────────────────────────────
const HOST_EMAIL = "anands9408@gmail.com";

function GoogleOAuthHandler() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuth = async () => {
      const hasHash = window.location.hash.includes("access_token");
      const hasCode = window.location.search.includes("code=");
      if (!hasHash && !hasCode) return;
      if (isAuthenticated) return;

      console.log("[Google OAuth] Callback detected — resolving session…");
      await new Promise((r) => setTimeout(r, 800));

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) { console.error("[Google OAuth] getSession error:", error.message); return; }
      if (!session?.user?.email) {
        window.history.replaceState({}, document.title, "/login");
        toast.error("Google sign-in failed — please try again.");
        navigate("/login", { replace: true });
        return;
      }

      const email = session.user.email.toLowerCase();
      let role: SARUser["role"] = "free_viewer";
      if (email === HOST_EMAIL) {
        role = "host";
      } else {
        const { data: viewerData } = await supabase
          .from("viewer_access")
          .select("id")
          .eq("subscriber_email", email)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .limit(1);
        if (viewerData && viewerData.length > 0) role = "viewer";
      }

      const sarUser: SARUser = { email, role, loginAt: Date.now() };
      login(sarUser);

      const msgs: Record<string, string> = {
        host:        "Host access granted via Google — full platform unlocked.",
        viewer:      "Welcome! Subscriber access granted via Google.",
        free_viewer: "Google sign-in complete — free view mode active.",
      };
      toast.success(msgs[role]);

      await supabase.auth.signOut();
      window.history.replaceState({}, document.title, "/platform");
      navigate("/platform", { replace: true });
    };

    handleOAuth();
  }, [isAuthenticated]);

  return null;
}

// ── Auth-guarded route ──────────────────────────────────────────────────────
function ProtectedRoute({ children, hostOnly = false }: { children: React.ReactNode; hostOnly?: boolean }) {
  const { isAuthenticated, isHost } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (hostOnly && !isHost) {
    return <Navigate to="/platform" replace />;
  }
  return <>{children}</>;
}

// ── Dashboard wrapper — applies sidebar layout to authenticated pages ──────
function DashboardPage({ children, hostOnly = false }: { children: React.ReactNode; hostOnly?: boolean }) {
  return (
    <ProtectedRoute hostOnly={hostOnly}>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// ── Inner app ──────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <GoogleOAuthHandler />
      <Header />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public pages — no sidebar */}
          <Route path="/"        element={<Navigate to={isAuthenticated ? "/platform" : "/login"} replace />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/license" element={<License />} />
          <Route path="/docs"    element={<Documentation />} />
          <Route path="/about"   element={<AboutPage />} />
          <Route path="/launch"  element={<LaunchPage />} />

          {/* ── Authenticated dashboard pages — LEFT SIDEBAR LAYOUT ── */}
          <Route path="/platform" element={
            <DashboardPage>
              <PredictionPlatform />
            </DashboardPage>
          } />
          <Route path="/alerts" element={
            <DashboardPage>
              <ActiveAlerts />
            </DashboardPage>
          } />
          <Route path="/logs" element={
            <DashboardPage>
              <AircraftLogs />
            </DashboardPage>
          } />
          <Route path="/rescue" element={
            <DashboardPage>
              <RescueStatus />
            </DashboardPage>
          } />
          <Route path="/analytics" element={
            <DashboardPage>
              <Analytics />
            </DashboardPage>
          } />
          <Route path="/voice" element={
            <DashboardPage>
              <VoiceAI />
            </DashboardPage>
          } />
          <Route path="/subscribers" element={
            <DashboardPage hostOnly>
              <SubscriberManagement />
            </DashboardPage>
          } />
          <Route path="/mission" element={
            <DashboardPage hostOnly>
              <MissionInput />
            </DashboardPage>
          } />
          <Route path="/history" element={
            <DashboardPage hostOnly>
              <HistoryDashboard />
            </DashboardPage>
          } />
          <Route path="/survivor" element={
            <DashboardPage hostOnly>
              <SurvivorAssist />
            </DashboardPage>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "hsl(220 30% 12%)",
            color: "hsl(210 20% 90%)",
            border: "1px solid hsl(220 25% 22%)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "13px",
          },
        }}
      />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
