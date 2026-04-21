/**
 * ViewerAccessManager — Host-only panel to manage temporary viewer PINs
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows host to:
 *  • Create new subscriber PINs with 30-day expiry
 *  • View all active PINs with expiry dates
 *  • Revoke individual PINs
 *  • Copy PIN to share with subscribers
 *
 * Subscribers pay via UPI: anands9408@oksbi or phone: +91 8124919993
 * Host verifies payment and generates a PIN here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Plus, Copy, Check, Trash2, RefreshCw, Calendar,
  CreditCard, Phone, ShieldCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ViewerPin {
  id: string;
  pin_hash: string;   // we use this as the plain PIN
  label: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

function randomPin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let pin = "";
  for (let i = 0; i < 8; i++) {
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}

function daysLeft(expires_at: string): number {
  return Math.max(0, Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86400000));
}

const ViewerAccessManager: React.FC = () => {
  const [pins, setPins]           = useState<ViewerPin[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [label, setLabel]         = useState("");
  const [copied, setCopied]       = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);

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

  const createPin = async () => {
    setCreating(true);
    const pin = randomPin();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("viewer_access").insert({
      pin_hash: pin,
      label: label.trim() || "Subscriber",
      expires_at: expiresAt,
      is_active: true,
    });
    if (error) {
      toast.error(`Failed to create PIN: ${error.message}`);
    } else {
      toast.success(`PIN ${pin} created — valid for 30 days`);
      setLabel("");
      setShowForm(false);
      fetchPins();
    }
    setCreating(false);
  };

  const revokePin = async (id: string, pin: string) => {
    const { error } = await supabase
      .from("viewer_access")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      toast.error("Failed to revoke PIN.");
    } else {
      toast.success(`PIN ${pin} revoked.`);
      fetchPins();
    }
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(pin);
    setTimeout(() => setCopied(null), 2000);
    toast.success("PIN copied to clipboard.");
  };

  const activePins = pins.filter((p) => p.is_active);

  return (
    <div className="sar-card hud-border overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <Users size={14} className="text-primary" />
        <div className="flex-1">
          <span className="font-heading text-xs tracking-widest font-700">VIEWER ACCESS MANAGER</span>
          <span className="ml-2 label-tag text-[9px]">{activePins.length} active subscriptions</span>
        </div>
        <button
          onClick={fetchPins}
          className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-heading text-[10px] font-700 border border-primary/50 text-primary hover:bg-primary/10 transition-all"
        >
          <Plus size={11} /> NEW PIN
        </button>
      </div>

      {/* Payment info */}
      <div
        className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-4 text-[10px] font-mono"
        style={{ background: "hsl(var(--muted))" }}
      >
        <div className="flex items-center gap-1.5 text-primary">
          <CreditCard size={10} />
          <span>UPI: anands9408@oksbi</span>
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <Phone size={10} />
          <span>+91 8124919993</span>
        </div>
        <span className="text-muted-foreground">Verify payment → create PIN → share with subscriber</span>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-border space-y-3" style={{ background: "hsl(var(--muted))" }}>
          <div className="font-heading text-[10px] tracking-widest text-primary">CREATE SUBSCRIBER PIN</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Subscriber label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="sar-input flex-1 text-xs py-2"
              maxLength={30}
            />
            <button
              onClick={createPin}
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded font-heading text-xs font-700 border transition-all disabled:opacity-50"
              style={{ background: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" }}
            >
              {creating ? <RefreshCw size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
              {creating ? "CREATING…" : "GENERATE"}
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground font-mono">
            A random 8-character PIN will be generated with 30-day validity. Share it with the subscriber.
          </p>
        </div>
      )}

      {/* Pins list */}
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {pins.length === 0 && !loading ? (
          <div className="px-4 py-6 text-center">
            <Users size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No subscriber PINs yet. Click NEW PIN to create one.</p>
          </div>
        ) : pins.map((p) => {
          const days = daysLeft(p.expires_at);
          const expired = !p.is_active || days === 0;
          return (
            <div
              key={p.id}
              className={`px-4 py-3 flex items-center gap-3 ${expired ? "opacity-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-700 tracking-widest text-primary">
                    {p.pin_hash}
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
                  <span>Created {new Date(p.created_at).toLocaleDateString("en-IN")}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!expired && (
                  <button
                    onClick={() => copyPin(p.pin_hash)}
                    className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
                    title="Copy PIN"
                  >
                    {copied === p.pin_hash ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  </button>
                )}
                {p.is_active && (
                  <button
                    onClick={() => revokePin(p.id, p.pin_hash)}
                    className="p-1.5 rounded text-muted-foreground hover:text-danger transition-colors"
                    title="Revoke PIN"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border" style={{ background: "hsl(var(--muted))" }}>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
          <AlertCircle size={9} />
          PINs expire automatically after 30 days. Subscribers must renew monthly via payment.
        </div>
      </div>
    </div>
  );
};

export default ViewerAccessManager;
