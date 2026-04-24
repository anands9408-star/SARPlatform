import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { SARUser } from "@/hooks/useAuth";

const PredictionPlatform = lazy(() => import("@/pages/PredictionPlatform"));
const MissionInput        = lazy(() => import("@/pages/MissionInput"));
const SurvivorAssist      = lazy(() => import("@/pages/SurvivorAssist"));
const License             = lazy(() => import("@/pages/License"));
const Documentation       = lazy(() => import("@/pages/Documentation"));
const HistoryDashboard    = lazy(() => import("@/pages/HistoryDashboard"));
const LoginPage           = lazy(() => import("@/pages/LoginPage"));
const AboutPage           = lazy(() => import("@/pages/AboutPage"));
const LaunchPage          = lazy(() => import("@/pages/LaunchPage"));

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
// Runs once after Google redirect, resolves role from email, sets SAR session

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

      // Give Supabase a moment to exchange the code for a session (PKCE)
      await new Promise((r) => setTimeout(r, 800));

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) { console.error("[Google OAuth] getSession error:", error.message); return; }
      if (!session?.user?.email) {
        console.warn("[Google OAuth] No session/email found after callback");
        // Clean up URL params and redirect to login
        window.history.replaceState({}, document.title, "/login");
        toast.error("Google sign-in failed — please try again.");
        navigate("/login", { replace: true });
        return;
      }

      const email = session.user.email.toLowerCase();
      console.log("[Google OAuth] Signed in as:", email);

      // Resolve SAR role from email
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

      // Sign out from Supabase OAuth session (SAR uses its own sessionStorage session)
      await supabase.auth.signOut();

      // Clean URL then navigate
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

// ── Inner app (has access to AuthContext) ──────────────────────────────────

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <GoogleOAuthHandler />
      <Header />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public pages — always accessible */}
          <Route path="/"        element={<Navigate to={isAuthenticated ? "/platform" : "/login"} replace />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/license" element={<License />} />
          <Route path="/docs"    element={<Documentation />} />
          <Route path="/about"   element={<AboutPage />} />
          <Route path="/launch"  element={<LaunchPage />} />

          {/* Protected pages — require auth */}
          <Route path="/platform" element={
            <ProtectedRoute><PredictionPlatform /></ProtectedRoute>
          } />
          <Route path="/mission" element={
            <ProtectedRoute hostOnly><MissionInput /></ProtectedRoute>
          } />
          <Route path="/survivor" element={
            <ProtectedRoute hostOnly><SurvivorAssist /></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute hostOnly><HistoryDashboard /></ProtectedRoute>
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
