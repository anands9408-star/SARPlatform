/**
 * Analytics Dashboard — Charts for aircraft, risk, and weather data
 */
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart2, TrendingUp, RefreshCw, Activity, Plane, Cloud } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CHART_COLORS = ["#60a5fa", "#ef4444", "#f97316", "#22c55e", "#a855f7", "#eab308"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-2 rounded border text-xs font-mono"
      style={{ background: "hsl(220 30% 12%)", border: "1px solid hsl(220 25% 22%)", color: "hsl(210 20% 90%)" }}>
      {label && <div className="mb-1 text-muted-foreground">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

const Analytics: React.FC = () => {
  const [riskData, setRiskData]         = useState<any[]>([]);
  const [altData, setAltData]           = useState<any[]>([]);
  const [countryData, setCountryData]   = useState<any[]>([]);
  const [riskTrend, setRiskTrend]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [riskRes, histRes] = await Promise.all([
        supabase.from("risk_assessments").select("risk_level, risk_score, recorded_at").order("recorded_at", { ascending: false }).limit(200),
        supabase.from("aircraft_history").select("altitude_ft, origin_country, recorded_at").order("recorded_at", { ascending: false }).limit(300),
      ]);

      if (riskRes.error) toast.error("Risk data error: " + riskRes.error.message);
      if (histRes.error) toast.error("History data error: " + histRes.error.message);

      // Risk level breakdown
      const riskCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, WATCH: 0, SAFE: 0 };
      riskRes.data?.forEach((r: any) => { riskCounts[r.risk_level] = (riskCounts[r.risk_level] ?? 0) + 1; });
      setRiskData(Object.entries(riskCounts).map(([name, value]) => ({ name, value })));

      // Altitude distribution
      const bins: Record<string, number> = {
        "0-5k ft": 0, "5-15k ft": 0, "15-30k ft": 0, "30k+ ft": 0,
      };
      histRes.data?.forEach((r: any) => {
        const a = r.altitude_ft ?? 0;
        if (a < 5000) bins["0-5k ft"]++;
        else if (a < 15000) bins["5-15k ft"]++;
        else if (a < 30000) bins["15-30k ft"]++;
        else bins["30k+ ft"]++;
      });
      setAltData(Object.entries(bins).map(([name, count]) => ({ name, count })));

      // Country breakdown (top 8)
      const countryCounts: Record<string, number> = {};
      histRes.data?.forEach((r: any) => {
        const c = r.origin_country ?? "Unknown";
        countryCounts[c] = (countryCounts[c] ?? 0) + 1;
      });
      setCountryData(
        Object.entries(countryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }))
      );

      // Risk score trend over last 24 hours (by hour)
      const hourMap: Record<string, { critical: number; high: number; watch: number }> = {};
      riskRes.data?.forEach((r: any) => {
        const h = new Date(r.recorded_at).getHours();
        const key = `${h.toString().padStart(2, "0")}:00`;
        if (!hourMap[key]) hourMap[key] = { critical: 0, high: 0, watch: 0 };
        if (r.risk_level === "CRITICAL") hourMap[key].critical++;
        else if (r.risk_level === "HIGH") hourMap[key].high++;
        else if (r.risk_level === "WATCH") hourMap[key].watch++;
      });
      setRiskTrend(
        Object.entries(hourMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([time, d]) => ({ time, ...d }))
      );

    } catch (e: any) {
      toast.error("Analytics error: " + e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">ANALYTICS</h1>
          <p className="text-xs text-muted-foreground mt-1">Aircraft, risk, and weather data analysis</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all font-heading text-xs font-700">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Row 1: Risk Level + Altitude Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Level Pie */}
            <div className="sar-card hud-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-danger" />
                <span className="font-heading text-sm font-700 tracking-widest">RISK LEVEL BREAKDOWN</span>
              </div>
              {riskData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}>
                      {riskData.map((_, i) => (
                        <Cell key={i} fill={
                          _ .name === "CRITICAL" ? "#ef4444" :
                          _.name === "HIGH"     ? "#f97316" :
                          _.name === "WATCH"    ? "#eab308" : "#22c55e"
                        } />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Altitude Distribution Bar */}
            <div className="sar-card hud-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Plane size={14} className="text-primary" />
                <span className="font-heading text-sm font-700 tracking-widest">ALTITUDE DISTRIBUTION</span>
              </div>
              {altData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={altData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 20%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 20% 55%)", fontFamily: "JetBrains Mono" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 55%)", fontFamily: "JetBrains Mono" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Aircraft" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 2: Risk Trend Line */}
          <div className="sar-card hud-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-primary" />
              <span className="font-heading text-sm font-700 tracking-widest">RISK SCORE TREND — BY HOUR</span>
            </div>
            {riskTrend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No trend data yet — enable aircraft feed to generate data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={riskTrend} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 20%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(215 20% 55%)", fontFamily: "JetBrains Mono" }} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(215 20% 55%)", fontFamily: "JetBrains Mono" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                  <Line type="monotone" dataKey="critical" name="CRITICAL" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="high"     name="HIGH"     stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="watch"    name="WATCH"    stroke="#eab308" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Row 3: Country breakdown */}
          <div className="sar-card hud-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cloud size={14} className="text-primary" />
              <span className="font-heading text-sm font-700 tracking-widest">AIRCRAFT BY ORIGIN COUNTRY</span>
            </div>
            {countryData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={countryData} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 20%)" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(215 20% 55%)", fontFamily: "JetBrains Mono" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(215 20% 55%)", fontFamily: "JetBrains Mono" }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Aircraft" radius={[0, 3, 3, 0]}>
                    {countryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
