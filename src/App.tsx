import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";

const PredictionPlatform = lazy(() => import("@/pages/PredictionPlatform"));
const MissionInput = lazy(() => import("@/pages/MissionInput"));
const SurvivorAssist = lazy(() => import("@/pages/SurvivorAssist"));
const License = lazy(() => import("@/pages/License"));
const Documentation = lazy(() => import("@/pages/Documentation"));

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
      <div className="font-heading text-xl tracking-widest text-primary">INITIALIZING SAR SYSTEMS...</div>
      <div className="font-mono text-xs text-muted-foreground">Loading physics engine &amp; live feeds</div>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(var(--background))" }}>
    <div className="text-center">
      <div className="font-heading text-6xl font-700 text-primary mb-4">404</div>
      <div className="font-heading text-xl tracking-widest text-foreground mb-2">SECTOR NOT FOUND</div>
      <p className="text-muted-foreground mb-6">This zone is outside mission parameters.</p>
      <a href="/" className="sar-btn-primary inline-block">RETURN TO BASE</a>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Header />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<PredictionPlatform />} />
          <Route path="/mission" element={<MissionInput />} />
          <Route path="/survivor" element={<SurvivorAssist />} />
          <Route path="/license" element={<License />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
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
    </BrowserRouter>
  );
};

export default App;
