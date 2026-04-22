/**
 * ViewerAccessManager — Host-only panel
 * • Manage subscriber email access (add / revoke)
 * • Set the free view password (host-configurable)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Plus, Trash2, RefreshCw, Calendar, CreditCard,
  ShieldCheck, AlertCircle, Mail, Eye, Key, Save,
} from "lucide-react";
import { toast } from "sonner";

interface ViewerRecord {
  id: string;
  subscriber_email: string | null;
  label: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

function daysLeft(expires_at: string): number {
  return Math.max(0, Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86400000));
}

type Tab = "subscribers" | "free_view";

const ViewerAccessManager: React.FC = () => {
  const [tab, setTab]           = useState<Tab>("subscribers");

  // ── Subscribers tab ───────────────────────────────────────────────────
  const [records, setRecords]   = useState<ViewerRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail]       = useState("");
  const [label, setLabel]       = useState("");
  const [months, setMonths]     = useState(1);
  const [showForm, setShowForm] = useState(false);

  // ── Free view tab ────────────────────────────────────────────────────
  const [freeViewPwd, setFreeViewPwd]         = useState("");
  const [newFreeViewPwd, setNewFreeViewPwd]   = useState("");
  const [savingPwd, setSavingPwd]             = useState(false);
  const [loadingPwd, setLoadingPwd]           = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("viewer_access")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data as ViewerRecord[]);
    setLoading(false);
  }, []);

  const fetchFreeViewPwd = useCallback(async () => {
    setLoadingPwd(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "free_view_password")
      .single();
    if (data?.value) setFreeViewPwd(data.value);
    setLoadingPwd(false);
  }, []);

  useEffect(() => { fetchRecords(); fetchFreeViewPwd(); }, [fetchRecords, fetchFreeViewPwd]);

  const createAccess = async () => {
    if (!email.trim()) { toast.error("Subscriber email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid email."); return; }

    setCreating(true);
    const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("viewer_access").insert({
      pin_hash: `EMAIL-${Date.now()}`,
      subscriber_email: email.trim().toLowerCase(),
      label: label.trim() || "Subscriber",
      expires_at: expiresAt,
      is_active: true,
    });

    if (error) {
      toast.error(`Failed to create access: ${error.message}`);
    } else {
      toast.success(`Access granted to ${email.trim()} for ${months} month(s)`);
      setEmail(""); setLabel(""); setMonths(1); setShowForm(false);
      fetchRecords();
    }
    setCreating(false);
  };

  const revokeAccess = async (id: string, emailAddr: string) => {
    const { error } = await supabase.from("viewer_access").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("Failed to revoke access."); }
    else { toast.success(`Access for ${emailAddr} revoked.`); fetchRecords(); }
  };

  const saveFreeViewPwd = async () => {
    if (!newFreeViewPwd.trim()) { toast.error("Password cannot be empty."); return; }
    setSavingPwd(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "free_view_password", value: newFreeViewPwd.trim(), updated_at: new Date().toISOString() });
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      setFreeViewPwd(newFreeViewPwd.trim());
      setNewFreeViewPwd("");
      toast.success("Free view password updated.");
    }
    setSavingPwd(false);
  };

  const activeSubs = records.filter((r) => r.is_active && daysLeft(r.expires_at) > 0);

  return (
    <div className="overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border" style={{ background: "hsl(var(--muted))" }}>
        {([
          { id: "subscribers" as Tab, icon: Users, label: "SUBSCRIBERS", badge: activeSubs.length },
          { id: "free_view"   as Tab, icon: Eye,   label: "FREE VIEW PASSWORD", badge: null },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-heading text-[10px] font-700 tracking-widest border-b-2 transition-all ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon size={11} />
            {t.label}
            {t.badge !== null && (
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-700 ${tab === t.id ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Subscribers Tab ─────────────────────────────────────────────── */}
      {tab === "subscribers" && (
        <>
          {/* Payment info */}
          <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-4 text-[10px] font-mono"
            style={{ background: "hsl(var(--muted))" }}>
            <div className="flex items-center gap-1.5 text-primary"><CreditCard size={10} /> UPI: anands9408@oksbi</div>
            <div className="flex items-center gap-1.5 text-primary"><Mail size={10} /> anands9408@gmail.com</div>
            <span className="text-muted-foreground">Verify payment → add email → subscriber logs in via Gmail OTP</span>
          </div>

          {/* Add button */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-2"
            style={{ background: "hsl(var(--surface))" }}>
            <span className="font-heading text-[10px] tracking-widest flex-1">
              {activeSubs.length} active subscriber{activeSubs.length !== 1 ? "s" : ""}
            </span>
            <button onClick={fetchRecords}
              className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded font-heading text-[10px] font-700 border border-primary/50 text-primary hover:bg-primary/10 transition-all">
              <Plus size={11} /> ADD SUBSCRIBER
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="px-4 py-3 border-b border-border space-y-3" style={{ background: "hsl(var(--muted))" }}>
              <div className="font-heading text-[10px] tracking-widest text-primary">GRANT SUBSCRIBER ACCESS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="label-tag text-[9px] block mb-1">EMAIL *</label>
                  <input type="email" placeholder="subscriber@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="sar-input w-full text-xs py-2" />
                </div>
                <div>
                  <label className="label-tag text-[9px] block mb-1">LABEL</label>
                  <input type="text" placeholder="Name (optional)" value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="sar-input w-full text-xs py-2" maxLength={30} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="label-tag text-[9px] block mb-1">DURATION</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 6].map((m) => (
                      <button key={m} onClick={() => setMonths(m)}
                        className={`px-2 py-1 rounded font-mono text-[9px] border transition-all ${
                          months === m ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>{m} mo</button>
                    ))}
                  </div>
                </div>
                <button onClick={createAccess} disabled={creating || !email.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded font-heading text-xs font-700 border transition-all disabled:opacity-50 mt-auto"
                  style={{ background: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" }}>
                  {creating ? <RefreshCw size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                  {creating ? "ADDING…" : "GRANT ACCESS"}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {records.length === 0 && !loading ? (
              <div className="px-4 py-6 text-center">
                <Mail size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No subscribers yet.</p>
              </div>
            ) : records.map((r) => {
              const days = daysLeft(r.expires_at);
              const expired = !r.is_active || days === 0;
              return (
                <div key={r.id} className={`px-4 py-3 flex items-center gap-3 ${expired ? "opacity-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-sm text-primary">
                        <Mail size={10} /> {r.subscriber_email || "—"}
                      </span>
                      <span className="font-heading text-[10px] text-muted-foreground">{r.label}</span>
                      {expired
                        ? <span className="label-tag text-danger text-[8px]">EXPIRED</span>
                        : <span className="label-tag text-success text-[8px]">ACTIVE</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[9px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={8} /> {days > 0 ? `${days} days left` : "Expired"}
                      </span>
                      <span>Expires {new Date(r.expires_at).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  {r.is_active && (
                    <button onClick={() => revokeAccess(r.id, r.subscriber_email || "?")}
                      className="p-1.5 rounded text-muted-foreground hover:text-danger transition-colors"
                      title="Revoke access">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-border" style={{ background: "hsl(var(--muted))" }}>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
              <AlertCircle size={9} />
              You receive a Gmail alert each time a subscriber logs in.
            </div>
          </div>
        </>
      )}

      {/* ── Free View Tab ────────────────────────────────────────────────── */}
      {tab === "free_view" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg"
            style={{ background: "hsl(var(--primary)/0.06)", border: "1px solid hsl(var(--primary)/0.2)" }}>
            <Eye size={13} className="text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Free viewers can access read-only map and weather without a subscription.
              They enter their email (Gmail OTP verified), choose <strong className="text-foreground">Free View</strong>, and enter this password.
            </p>
          </div>

          {/* Current password display */}
          <div>
            <label className="label-tag text-[9px] block mb-2">CURRENT FREE VIEW PASSWORD</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <Key size={12} className="text-muted-foreground shrink-0" />
              <span className="font-mono text-sm text-primary font-700 tracking-widest">
                {loadingPwd ? "Loading…" : freeViewPwd || "—"}
              </span>
            </div>
          </div>

          {/* Set new password */}
          <div>
            <label className="label-tag text-[9px] block mb-2">SET NEW PASSWORD</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={newFreeViewPwd}
                  onChange={(e) => setNewFreeViewPwd(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveFreeViewPwd(); }}
                  placeholder="Enter new password…"
                  className="sar-input pl-9 w-full text-sm"
                />
              </div>
              <button onClick={saveFreeViewPwd} disabled={!newFreeViewPwd.trim() || savingPwd}
                className="flex items-center gap-1.5 px-4 py-2 rounded font-heading text-xs font-700 border transition-all disabled:opacity-50"
                style={{ background: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" }}>
                {savingPwd ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                {savingPwd ? "SAVING…" : "SAVE"}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[9px] font-mono text-muted-foreground">
            <AlertCircle size={9} className="mt-0.5 shrink-0" />
            Share this password with free viewers. Change it anytime to revoke all free access instantly.
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerAccessManager;
