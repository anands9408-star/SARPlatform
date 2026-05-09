/**
 * Aircraft Logs Dashboard — Full history of tracked aircraft from DB
 */
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plane, RefreshCw, Download, Search, Filter } from "lucide-react";
import { toast } from "sonner";

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

const AircraftLogs: React.FC = () => {
  const [records, setRecords]   = useState<AircraftRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 25;

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
            {countries.slice(0, 20).map((c) => <option key={c} value={c}>{c}</option>)}
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
