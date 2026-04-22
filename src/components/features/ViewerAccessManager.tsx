/**
 * ViewerAccessManager — Host-only panel to manage subscriber email access
 * ─────────────────────────────────────────────────────────────────────────────
 * Host adds subscriber email → they can log in via Email+OTP
 * Host is notified by email when any subscriber logs in
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Plus, Check, Trash2, RefreshCw, Calendar,
  CreditCard, Phone, ShieldCheck, AlertCircle, Mail,
} from "lucide-react";
import { toast } from "sonner";

interface ViewerPin {
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

const ViewerAccessManager: React.FC = () => {
  const [pins, setPins]             = useState<ViewerPin[]>([]);
  const [loading, setLoading]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [email, setEmail]           = useState("");
  const [label, setLabel]           = useState("");
  const [months, setMonths]         = useState(1);
  const [showForm, setShowForm]     = useState(false);

  const fetchPins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("viewer_access")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPins(data as ViewerPin[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const createAccess = async () => {
    if (!email.trim()) { toast.error("Subscriber email is required."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { toast.error("Enter a valid email."); return; }

    setCreating(true);
    const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("viewer_access").insert({
      pin_hash: `EMAIL-${Date.now()}`,  // placeholder — not used for OTP login
      subscriber_email: email.trim().toLowerCase(),
      label: label.trim() || "Subscriber",
      expires_at: expiresAt,
      is_active: true,
    });

    if (error) {
      toast.error(`Failed to create access: ${error.message}`);
    } else {
      toast.success(`Access granted to ${email.trim()} for ${months} month(s)`);
      setEmail("");
      setLabel("");
      setMonths(1);
      setShowForm(false);
      fetchPins();
    }
    setCreating(false);
  };

  const revokeAccess = async (id: string, email: string) => {
    const { error } = await supabase
      .from("viewer_access")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      toast.error("Failed to revoke access.");
    } else {
      toast.success(`Access for ${email} revoked.`);
      fetchPins();
    }
  };

  const activePins = pins.filter((p) => p.is_active && daysLeft(p.expires_at) > 0);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <Users size={14} className="text-primary" />
        <div className="flex-1">
          <span className="font-heading text-xs tracking-widest font-700">SUBSCRIBER ACCESS MANAGER</span>
          <span className="ml-2 label-tag text-[9px]">{activePins.length} active</span>
        </div>
        <button onClick={fetchPins}
          className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-heading text-[10px] font-700 border border-primary/50 text-primary hover:bg-primary/10 transition-all"
        >
          <Plus size={11} /> ADD SUBSCRIBER
        </button>
      </div>

      {/* Payment info */}
      <div
        className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-4 text-[10px] font-mono"
        style={{ background: "hsl(var(--muted))" }}
      >
        <div className="flex items-center gap-1.5 text-primary">
          <CreditCard size={10} /> UPI: anands9408@oksbi
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <Phone size={10} /> +91 8124919993
        </div>
        <span className="text-muted-foreground">Verify payment → add subscriber email → they log in via Email+OTP</span>
      </div>

      {/* How it works */}
      <div className="px-4 py-2 border-b border-border bg-primary/3">
        <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
          <span className="text-primary font-700">How it works:</span> Add subscriber's email here with an expiry period.
          They visit the login page, enter their email, receive a one-time code via Gmail, and get viewer access.
          You receive a Gmail notification whenever a subscriber logs in.
        </p>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-border space-y-3" style={{ background: "hsl(var(--muted))" }}>
          <div className="font-heading text-[10px] tracking-widest text-primary">ADD SUBSCRIBER EMAIL</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label-tag text-[9px] block mb-1">EMAIL *</label>
              <input
                type="email"
                placeholder="subscriber@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sar-input w-full text-xs py-2"
              />
            </div>
            <div>
              <label className="label-tag text-[9px] block mb-1">LABEL</label>
              <input
                type="text"
                placeholder="Subscriber name (optional)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="sar-input w-full text-xs py-2"
                maxLength={30}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="label-tag text-[9px] block mb-1">ACCESS DURATION</label>
              <div className="flex gap-1">
                {[1, 2, 3, 6].map((m) => (
                  <button key={m} onClick={() => setMonths(m)}
                    className={`px-2 py-1 rounded font-mono text-[9px] border transition-all ${
                      months === m ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >{m} mo</button>
                ))}
              </div>
            </div>
            <button
              onClick={createAccess}
              disabled={creating || !email.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded font-heading text-xs font-700 border transition-all disabled:opacity-50 mt-auto"
              style={{ background: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" }}
            >
              {creating ? <RefreshCw size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
              {creating ? "ADDING…" : "GRANT ACCESS"}
            </button>
          </div>
        </div>
      )}

      {/* Subscribers list */}
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {pins.length === 0 && !loading ? (
          <div className="px-4 py-6 text-center">
            <Mail size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No subscribers yet. Click ADD SUBSCRIBER to grant access.</p>
          </div>
        ) : pins.map((p) => {
          const days = daysLeft(p.expires_at);
          const expired = !p.is_active || days === 0;
          return (
            <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${expired ? "opacity-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-sm text-primary">
                    <Mail size={10} /> {p.subscriber_email || "—"}
                  </span>
                  <span className="font-heading text-[10px] text-muted-foreground">{p.label}</span>
                  {expired
                    ? <span className="label-tag text-danger text-[8px]">EXPIRED</span>
                    : <span className="label-tag text-success text-[8px]">ACTIVE</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[9px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={8} />
                    {days > 0 ? `${days} days left` : "Expired"}
                  </span>
                  <span>Expires {new Date(p.expires_at).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              {p.is_active && (
                <button
                  onClick={() => revokeAccess(p.id, p.subscriber_email || "?")}
                  className="p-1.5 rounded text-muted-foreground hover:text-danger transition-colors"
                  title="Revoke access"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border" style={{ background: "hsl(var(--muted))" }}>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
          <AlertCircle size={9} />
          Access expires automatically. You receive a Gmail alert each time a subscriber logs in.
        </div>
      </div>
    </div>
  );
};

export default ViewerAccessManager;
