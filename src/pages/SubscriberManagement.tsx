/**
 * Subscriber Management Dashboard — Manage viewer_access table
 */
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Radio, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Calendar, Mail } from "lucide-react";
import { toast } from "sonner";

interface ViewerAccess {
  id: string;
  subscriber_email: string | null;
  label: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

const SubscriberManagement: React.FC = () => {
  const [records, setRecords]     = useState<ViewerAccess[]>([]);
  const [loading, setLoading]     = useState(false);
  const [adding, setAdding]       = useState(false);
  const [newEmail, setNewEmail]   = useState("");
  const [newDays, setNewDays]     = useState(30);
  const [newLabel, setNewLabel]   = useState("Subscriber");
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("viewer_access")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load subscribers: " + error.message);
    else setRecords(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("viewer_access")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Subscriber ${current ? "deactivated" : "activated"}`);
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
    }
  };

  const extendAccess = async (id: string, days: number) => {
    const newExpiry = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabase
      .from("viewer_access")
      .update({ expires_at: newExpiry, is_active: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Access extended by ${days} days`);
      load();
    }
  };

  const addSubscriber = async () => {
    if (!newEmail.trim()) { toast.error("Enter an email address"); return; }
    setSaving(true);
    const expires = new Date(Date.now() + newDays * 86400000).toISOString();
    const { error } = await supabase
      .from("viewer_access")
      .insert({
        subscriber_email: newEmail.trim().toLowerCase(),
        label: newLabel,
        pin_hash: "email-otp",
        expires_at: expires,
        is_active: true,
      });
    if (error) toast.error(error.message);
    else {
      toast.success(`Subscriber ${newEmail} added — ${newDays} days access`);
      setNewEmail(""); setNewLabel("Subscriber");
      setAdding(false);
      load();
    }
    setSaving(false);
  };

  const active = records.filter((r) => r.is_active && new Date(r.expires_at) > new Date()).length;
  const expired = records.filter((r) => !r.is_active || new Date(r.expires_at) <= new Date()).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-700 tracking-widest text-foreground">SUBSCRIBER MANAGEMENT</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage email-based viewer access · Host only</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded font-heading text-xs font-700 border border-primary/50 text-primary hover:bg-primary/10 transition-all">
            <Plus size={12} /> ADD SUBSCRIBER
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all font-heading text-xs font-700">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl" style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.3)" }}>
          <div className="font-heading text-3xl font-700 text-primary">{records.length}</div>
          <div className="text-[10px] font-heading font-700 tracking-widest text-muted-foreground">TOTAL</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: "#22c55e15", border: "1px solid #22c55e40" }}>
          <div className="font-heading text-3xl font-700" style={{ color: "#22c55e" }}>{active}</div>
          <div className="text-[10px] font-heading font-700 tracking-widest text-muted-foreground">ACTIVE</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: "#ef444415", border: "1px solid #ef444440" }}>
          <div className="font-heading text-3xl font-700" style={{ color: "#ef4444" }}>{expired}</div>
          <div className="text-[10px] font-heading font-700 tracking-widest text-muted-foreground">EXPIRED</div>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="sar-card hud-border p-5 space-y-4">
          <div className="font-heading text-sm font-700 tracking-widest text-primary">ADD NEW SUBSCRIBER</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-1">
              <label className="label-tag text-[9px]">EMAIL ADDRESS</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="subscriber@gmail.com"
                className="w-full px-3 py-2 rounded border border-border bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="label-tag text-[9px]">LABEL</label>
              <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border bg-transparent text-xs font-mono text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="label-tag text-[9px]">ACCESS DURATION (days)</label>
              <input type="number" value={newDays} onChange={(e) => setNewDays(parseInt(e.target.value) || 30)}
                min={1} max={365}
                className="w-full px-3 py-2 rounded border border-border bg-transparent text-xs font-mono text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addSubscriber} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded font-heading text-xs font-700 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-all">
              {saving ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={11} />}
              ADD
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 rounded font-heading text-xs font-700 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="sar-card hud-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2" style={{ background: "hsl(var(--surface))" }}>
          <Radio size={14} className="text-primary" />
          <span className="font-heading text-sm font-700 tracking-widest">SUBSCRIBER LIST</span>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No subscribers found</div>
          ) : records.map((r) => {
            const isExpired = new Date(r.expires_at) <= new Date();
            const isActive = r.is_active && !isExpired;
            return (
              <div key={r.id} className="px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-secondary/20 transition-colors">
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-success" : "bg-danger"}`} />

                {/* Email */}
                <div className="flex-1 min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <Mail size={11} className="text-muted-foreground" />
                    <span className="font-mono text-sm text-foreground">{r.subscriber_email ?? "—"}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono ml-4">{r.label}</div>
                </div>

                {/* Expiry */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
                  <Calendar size={10} />
                  <span className={isExpired ? "text-danger" : "text-foreground"}>
                    {isExpired ? "EXPIRED" : `Expires ${new Date(r.expires_at).toLocaleDateString()}`}
                  </span>
                </div>

                {/* Created */}
                <div className="text-[10px] font-mono text-muted-foreground shrink-0">
                  Added {new Date(r.created_at).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(r.id, r.is_active)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-heading font-700 border transition-all ${
                      r.is_active
                        ? "border-danger/40 text-danger hover:bg-danger/10"
                        : "border-success/40 text-success hover:bg-success/10"
                    }`}>
                    {r.is_active ? <XCircle size={10} /> : <CheckCircle2 size={10} />}
                    {r.is_active ? "DEACTIVATE" : "ACTIVATE"}
                  </button>
                  {(isExpired || !r.is_active) && (
                    <button onClick={() => extendAccess(r.id, 30)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-heading font-700 border border-primary/40 text-primary hover:bg-primary/10 transition-all">
                      <Plus size={10} /> 30 DAYS
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubscriberManagement;
