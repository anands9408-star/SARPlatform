/**
 * Aircraft Logs Dashboard — Full history + Map Replay
 * Replay animates historical aircraft positions on SARMap over time
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plane, RefreshCw, Download, Search, Filter,
  Play, Pause, Square, FastForward, Rewind, Map as MapIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import SARMap from "@/components/features/SARMap";
import type { LiveAircraft } from "@/types";

interface AircraftRecord {
  id: string;
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude_ft: number | null;
  velocity_kts: number | null;
  heading: number | null;
  vertical_rate_fpm: number | null;
  origin_country: string | null;
  scan_radius_km: number | null;
  recorded_at: string;
}

// ── Replay state machine ──────────────────────────────────────────────────
type ReplayState = "idle" | "playing" | "paused";

/** Build per-ICAO tracks sorted by time */
function buildTracks(records: AircraftRecord[]): Map<string, AircraftRecord[]> {
  const tracks = new Map<string, AircraftRecord[]>();
  for (const r of records) {
    const key = r.icao24;
    if (!tracks.has(key)) tracks.set(key, []);
    tracks.get(key)!.push(r);
  }
  // sort each track by time ascending
  tracks.forEach((arr) => arr.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()));
  return tracks;
}

/** Interpolate each track's position at a given timestamp */
function getFrameAircraft(tracks: Map<string, AircraftRecord[]>, ts: number): LiveAircraft[] {
  const result: LiveAircraft[] = [];
  tracks.forEach((arr, icao24) => {
    // find the latest record at or before ts
    let rec: AircraftRecord | null = null;
    for (const r of arr) {
      if (new Date(r.recorded_at).getTime() <= ts) rec = r;
      else break;
    }
    if (!rec) return;
    result.push({
      icao24,
      callsign: rec.callsign ?? icao24.toUpperCase(),
      lat: rec.lat,
      lon: rec.lon,
      altitude: rec.altitude_ft ?? 0,
      velocity: rec.velocity_kts ?? 0,
      heading: rec.heading ?? 0,
      verticalRate: rec.vertical_rate_fpm ?? 0,
      originCountry: rec.origin_country ?? "Unknown",
      onGround: false,
      riskScore: 0,
      riskLevel: "SAFE",
    });
  });
  return result;
}

const AircraftLogs: React.FC = () => {
  const [records, setRecords]         = useState<AircraftRecord[]>([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [page, setPage]               = useState(0);
  const PAGE_SIZE = 25;

  // ── Replay state ─────────────────────────────────────────────────────────
  const [showReplay, setShowReplay]   = useState(false);
  const [replayState, setReplayState] = useState<ReplayState>("idle");
  const [replayTs, setReplayTs]       = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(10); // multiplier (10x = 1 real sec = 10 replay secs)
  const [replayAircraft, setReplayAircraft] = useState<LiveAircraft[]>([]);
  const [tracks, setTracks]           = useState<Map<string, AircraftRecord[]>>(new Map());
  const [timeRange, setTimeRange]     = useState({ min: 0, max: 0 });
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef  = useRef<number>(0);
  const centerRef    = useRef({ lat: 12.97, lon: 77.59 });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("aircraft_history")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Failed to load logs: " + error.message);
    else setRecords(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Build tracks when records or search changes ───────────────────────────
  const buildReplayData = useCallback((recs: AircraftRecord[]) => {
    const t = buildTracks(recs);
    setTracks(t);
    const allTimes = recs.map((r) => new Date(r.recorded_at).getTime());
    if (allTimes.length === 0) return;
    const mn = Math.min(...allTimes);
    const mx = Math.max(...allTimes);
    setTimeRange({ min: mn, max: mx });
    setReplayTs(mn);
    // center on median aircraft position
    const midRec = recs[Math.floor(recs.length / 2)];
    if (midRec) centerRef.current = { lat: midRec.lat, lon: midRec.lon };
  }, []);

  const openReplay = () => {
    if (records.length === 0) { toast.error("No records to replay"); return; }
    buildReplayData(records);
    setReplayState("idle");
    setShowReplay(true);
    toast.success(`Replay loaded — ${records.length} records across ${tracks.size || "?"} aircraft`);
  };

  // ── Animation loop ────────────────────────────────────────────────────────
  const animationStep = useCallback((now: number) => {
    const delta = now - lastTickRef.current; // ms since last frame
    lastTickRef.current = now;

    setReplayTs((prev) => {
      const next = prev + delta * replaySpeed; // advance replay time
      if (next >= timeRange.max) {
        setReplayState("paused");
        return timeRange.max;
      }
      return next;
    });

    animFrameRef.current = requestAnimationFrame(animationStep);
  }, [replaySpeed, timeRange.max]);

  useEffect(() => {
    if (replayState === "playing") {
      lastTickRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(animationStep);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [replayState, animationStep]);

  // ── Update visible aircraft on timestamp change ───────────────────────────
  useEffect(() => {
    if (!showReplay) return;
    setReplayAircraft(getFrameAircraft(tracks, replayTs));
  }, [replayTs, tracks, showReplay]);

  const play  = () => { lastTickRef.current = performance.now(); setReplayState("playing"); };
  const pause = () => setReplayState("paused");
  const stop  = () => { setReplayState("idle"); setReplayTs(timeRange.min); };

  const replayProgress = timeRange.max > timeRange.min
    ? ((replayTs - timeRange.min) / (timeRange.max - timeRange.min)) * 100
    : 0;

  const formatReplayTime = (ts: number) => new Date(ts).toLocaleTimeString();

  const countries = ["ALL", ...Array.from(new Set(records.map((r) => r.origin_country ?? "Unknown")))];

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (r.callsign?.toLowerCase().includes(q) || r.icao24.toLowerCase().includes(q));
    const matchCountry = countryFilter === "ALL" || r.origin_country === countryFilter;
    return matchSearch && matchCountry;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCsv = () => {
    const header = "icao24,callsign,lat,lon,altitude_ft,velocity_kts,heading,vertical_rate_fpm,origin_country,recorded_at";
    const rows = filtered.map((r) =>
      [r.icao24, r.callsign ?? "", r.lat, r.lon, r.altitude_ft ?? "", r.velocity_kts ?? "",
       r.heading ?? "", r.vertical_rate_fpm ?? "", r.origin_country ?? "", r.recorded_at].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "aircraft_logs.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} aircraft records`);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">AIRCRAFT LOGS</h1>
          <p className="text-xs text-muted-foreground mt-1">{records.length} records in database</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openReplay}
            className="flex items-center gap-2 px-3 py-2 rounded font-heading text-xs font-700 border border-primary/50 text-primary hover:bg-primary/10 transition-all">
            <MapIcon size={12} /> MAP REPLAY
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all font-heading text-xs font-700">
            <Download size={12} /> EXPORT CSV
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all font-heading text-xs font-700">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
          </button>
        </div>
      </div>

      {/* ── Map Replay Panel ───────────────────────────────────────────────── */}
      {showReplay && (
        <div className="sar-card hud-border overflow-hidden" style={{ border: "1px solid hsl(var(--primary)/0.4)" }}>
          {/* Replay header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between"
            style={{ background: "hsl(220 40% 5%)" }}>
            <div className="flex items-center gap-3">
              <MapIcon size={14} className="text-primary" />
              <span className="font-heading text-sm font-700 tracking-widest text-primary">MAP REPLAY</span>
              <span className="label-tag text-[9px] text-primary">{replayAircraft.length} aircraft visible</span>
              <div className={`w-2 h-2 rounded-full ${replayState === "playing" ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
              <span className="font-mono text-[10px] text-muted-foreground">
                {replayState === "idle" ? "STOPPED" : replayState === "playing" ? "PLAYING" : "PAUSED"}
              </span>
            </div>
            <button onClick={() => { stop(); setShowReplay(false); }}
              className="p-1.5 rounded hover:bg-danger/10 hover:text-danger text-muted-foreground transition-all">
              <X size={14} />
            </button>
          </div>

          {/* Map */}
          <div style={{ height: 460 }}>
            <SARMap
              lat={centerRef.current.lat}
              lon={centerRef.current.lon}
              showZones={false}
              aircraft={replayAircraft}
              predictedPath={[]}
              selectedAircraftId={null}
            />
          </div>

          {/* Controls */}
          <div className="px-4 py-4 border-t border-border space-y-3"
            style={{ background: "hsl(220 40% 5%)" }}>
            {/* Progress bar / scrubber */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{formatReplayTime(timeRange.min)}</span>
                <span className="text-primary font-700">{formatReplayTime(replayTs)}</span>
                <span>{formatReplayTime(timeRange.max)}</span>
              </div>
              <input
                type="range"
                min={timeRange.min}
                max={timeRange.max}
                step={1000}
                value={replayTs}
                onChange={(e) => {
                  setReplayTs(parseInt(e.target.value));
                  setReplayState("paused");
                }}
                className="w-full accent-primary"
                style={{ height: 4 }}
              />
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{ width: `${replayProgress}%`, background: "hsl(var(--primary))" }}
                />
              </div>
            </div>

            {/* Playback buttons + speed */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={stop}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 font-heading text-[11px] font-700 transition-all">
                <Square size={11} /> STOP
              </button>
              <button
                onClick={() => setReplayTs((t) => Math.max(timeRange.min, t - 30_000))}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-heading text-[11px] font-700 transition-all">
                <Rewind size={11} /> -30s
              </button>
              {replayState === "playing" ? (
                <button onClick={pause}
                  className="flex items-center gap-1.5 px-4 py-2 rounded font-heading text-[11px] font-700 bg-warning/15 border border-warning/50 text-warning hover:bg-warning/25 transition-all">
                  <Pause size={12} /> PAUSE
                </button>
              ) : (
                <button onClick={play}
                  className="flex items-center gap-1.5 px-4 py-2 rounded font-heading text-[11px] font-700 bg-primary/15 border border-primary/50 text-primary hover:bg-primary/25 transition-all">
                  <Play size={12} /> {replayState === "idle" ? "PLAY" : "RESUME"}
                </button>
              )}
              <button
                onClick={() => setReplayTs((t) => Math.min(timeRange.max, t + 30_000))}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-heading text-[11px] font-700 transition-all">
                <FastForward size={11} /> +30s
              </button>

              <div className="flex-1" />

              {/* Speed selector */}
              <div className="flex items-center gap-2">
                <span className="label-tag text-[9px]">SPEED</span>
                {[1, 5, 10, 30, 60].map((s) => (
                  <button key={s} onClick={() => setReplaySpeed(s)}
                    className={`px-2 py-1 rounded text-[10px] font-heading font-700 border transition-all ${
                      replaySpeed === s
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}>{s}×</button>
                ))}
              </div>

              {/* Aircraft count at frame */}
              <div className="text-[10px] font-mono text-muted-foreground">
                {replayAircraft.length} aircraft · {tracks.size} tracks
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search callsign / ICAO24…"
            className="w-full pl-8 pr-3 py-2 rounded border border-border bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setPage(0); }}
            className="pl-8 pr-3 py-2 rounded border border-border bg-transparent text-xs font-mono text-foreground focus:outline-none focus:border-primary appearance-none"
          >
            {countries.slice(0, 20).map((c) => <option key={c} value={c} style={{ background: "hsl(220 30% 12%)" }}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="sar-card hud-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ background: "hsl(var(--surface))" }}>
                {["ICAO24", "CALLSIGN", "LAT / LON", "ALT (ft)", "SPEED (kts)", "HDG", "VRATE", "COUNTRY", "TIME"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left font-heading text-[9px] font-700 tracking-widest text-muted-foreground border-b border-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">
                  <div className="flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">No records found</td></tr>
              ) : paginated.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-3 py-2.5 text-primary font-700">{r.icao24.toUpperCase()}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.callsign ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.lat.toFixed(3)}, {r.lon.toFixed(3)}</td>
                  <td className="px-3 py-2.5">
                    <span style={{ color: (r.altitude_ft ?? 0) < 3000 ? "#ef4444" : "#22c55e" }}>
                      {r.altitude_ft?.toLocaleString() ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{r.velocity_kts ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.heading?.toFixed(0) ?? "—"}°</td>
                  <td className="px-3 py-2.5">
                    <span style={{ color: (r.vertical_rate_fpm ?? 0) < -1000 ? "#ef4444" : "#6b7280" }}>
                      {r.vertical_rate_fpm ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.origin_country ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {new Date(r.recorded_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border" style={{ background: "hsl(var(--surface))" }}>
            <span className="text-xs font-mono text-muted-foreground">{filtered.length} results · Page {page + 1} / {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded border border-border text-xs font-heading font-700 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 transition-all">
                PREV
              </button>
              <button disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-border text-xs font-heading font-700 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 transition-all">
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AircraftLogs;
