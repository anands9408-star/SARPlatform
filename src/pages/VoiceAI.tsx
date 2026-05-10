/**
 * Voice AI Command Page — SAR AI Voice Interface
 * Streaming outputs · Contextual memory · Map awareness · Dynamic decisions
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Bot, Loader,
  Trash2, Radio, Zap, MapPin, Activity, FlaskConical,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface MapContext {
  lat?: number;
  lon?: number;
  activeAircraft?: number;
  criticalCount?: number;
  scanRadiusKm?: number;
  weather?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SAR_SYSTEM_PROMPT = `You are SAR AI — the intelligent real-time assistant for the SAR (Search Aircraft Rescue) Platform.

CAPABILITIES:
- Real-time aviation safety analysis and crash prediction interpretation
- ADS-B aircraft tracking data analysis via OpenSky Network
- Search and Rescue operational planning (ICAO Annex 12 standards)
- Indian aviation context: DGCA regulations, AAI airports (DEL/BOM/MAA/BLR/HYD/CCU/AMD/COK/TRV/IXM)
- Physics-based flight trajectory analysis (kinematics: v=u+at, vector math)
- Emergency Locator Transmitter procedures (121.5 MHz legacy, 406 MHz Cospas-Sarsat, INMCC India)
- Weather impact assessment using Open-Meteo data
- Dynamic decision support for SAR coordinators

BEHAVIORAL RULES:
- Be concise and operationally direct — SAR operators need fast answers
- When map context is provided (lat/lon, aircraft count), use it in your analysis
- For CRITICAL situations: always recommend immediate action + emergency contacts
- Reference specific Indian airports and agencies when geographically relevant
- For emergencies: Indian Coast Guard 1800-180-3943 · National Emergency 112
- Platform support: anands9408@gmail.com

DYNAMIC DECISION FRAMEWORK:
- If aircraft < 1000ft + high descent rate → recommend IMMEDIATE alert + ELT activation
- If multiple CRITICAL aircraft → recommend sector-based SAR resource deployment
- If poor weather + low altitude → escalate risk assessment
- Always suggest next action steps based on current sensor data

STREAMING: Respond naturally and completely — your responses are streamed in real-time.`;

// ── Read live context from localStorage (set by PredictionPlatform) ──────
function getLiveMapContext(): MapContext {
  try {
    const raw = localStorage.getItem("sar_ai_context");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const VoiceAI: React.FC = () => {
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [listening, setListening]       = useState(false);
  const [ttsEnabled, setTtsEnabled]     = useState(true);
  const [transcript, setTranscript]     = useState("");
  const [mapCtx, setMapCtx]             = useState<MapContext>({});
  const [testLoading, setTestLoading]   = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef       = useRef<SpeechSynthesis | null>(null);
  const abortRef       = useRef<AbortController | null>(null);

  const hasSpeechAPI  = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const hasSpeechSynth = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (hasSpeechSynth) synthRef.current = window.speechSynthesis;
    return () => synthRef.current?.cancel();
  }, []);

  // ── Poll map context every 5s ──────────────────────────────────────────
  useEffect(() => {
    const poll = () => setMapCtx(getLiveMapContext());
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !hasSpeechSynth) return;
    synthRef.current?.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 400));
    utterance.rate  = 0.95;
    utterance.pitch = 1.0;
    utterance.lang  = "en-IN";
    synthRef.current?.speak(utterance);
  }, [ttsEnabled, hasSpeechSynth]);

  // ── Streaming message send ─────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    // Cancel any in-flight stream
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content: q, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build history (last 10 messages for memory)
    const historySnapshot = messages.slice(-10).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    // Build contextual system prompt with live map data
    const ctx = getLiveMapContext();
    let systemWithCtx = SAR_SYSTEM_PROMPT;
    if (ctx.lat && ctx.lon) {
      systemWithCtx += `\n\nLIVE MAP CONTEXT (real-time sensor data):\n- SAR Center: ${ctx.lat?.toFixed(4)}°N, ${ctx.lon?.toFixed(4)}°E\n- Active aircraft tracked: ${ctx.activeAircraft ?? "unknown"}\n- CRITICAL alerts: ${ctx.criticalCount ?? 0}\n- Scan radius: ${ctx.scanRadiusKm ?? "unknown"} km\n- Weather: ${ctx.weather ?? "not available"}\nUse this sensor data in your analysis when relevant.`;
    }

    // Add streaming AI message placeholder
    const aiId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, {
      id: aiId, role: "ai", content: "", timestamp: new Date(), streaming: true,
    }]);

    try {
      // Call edge function with streaming via fetch
      const { data: { session } } = await supabase.auth.getSession();
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;

      const resp = await fetch(`${baseUrl}/functions/v1/sar-voice-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          message: q,
          history: historySnapshot,
          system: systemWithCtx,
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`[${resp.status}] ${errText.slice(0, 200)}`);
      }

      // Check if response is SSE stream or JSON fallback
      const contentType = resp.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        // ── Stream SSE ─────────────────────────────────────────────────
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") break;
              try {
                const parsed = JSON.parse(raw);
                const delta = parsed.choices?.[0]?.delta?.content ?? "";
                accumulated += delta;
                setMessages((prev) => prev.map((m) =>
                  m.id === aiId ? { ...m, content: accumulated } : m
                ));
              } catch {}
            }
          }
        }

        setMessages((prev) => prev.map((m) =>
          m.id === aiId ? { ...m, streaming: false } : m
        ));
        speak(accumulated.slice(0, 400));

      } else {
        // ── Non-streaming JSON fallback ────────────────────────────────
        const data = await resp.json();
        const reply = data?.reply ?? "No response received.";
        setMessages((prev) => prev.map((m) =>
          m.id === aiId ? { ...m, content: reply, streaming: false } : m
        ));
        speak(reply);
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== aiId));
      } else {
        toast.error("AI error: " + err.message);
        setMessages((prev) => prev.map((m) =>
          m.id === aiId
            ? { ...m, content: "Failed to get response — check edge function logs.", streaming: false }
            : m
        ));
      }
    }

    setLoading(false);
  }, [loading, messages, speak]);

  // ── Test Voice AI button ───────────────────────────────────────────────
  const handleTestVoiceAI = async () => {
    setTestLoading(true);
    toast.info("Sending test query to SAR AI edge function…");
    const testQuestion = "What is the current risk level for aircraft below 1000ft? Explain the danger assessment criteria and recommended SAR response actions.";
    await sendMessage(testQuestion);
    setTestLoading(false);
  };

  const startListening = useCallback(() => {
    if (!hasSpeechAPI) { toast.error("Your browser doesn't support voice input"); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang            = "en-IN";
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;
    recognition.continuous      = false;

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => { setListening(false); setTranscript(""); };
    recognition.onerror = (e: any) => {
      setListening(false); setTranscript("");
      if (e.error !== "no-speech") toast.error("Voice error: " + e.error);
    };
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      if (e.results[0].isFinal) {
        setInput(t);
        sendMessage(t);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [hasSpeechAPI, sendMessage]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const suggestions = [
    "What is the danger assessment algorithm?",
    "How does ELT triangulation work on 406 MHz?",
    "What are the DGCA ADS-B mandate requirements?",
    "Explain the physics engine kinematics equations",
    "What should I do if an aircraft goes missing?",
    "How does the AI crash prediction work?",
  ];

  const hasMapCtx = mapCtx.lat && mapCtx.lon;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0"
        style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.4)" }}>
              <Bot size={18} className="text-primary" />
            </div>
            <div>
              <div className="font-heading text-base font-700 tracking-widest text-foreground">SAR AI ASSISTANT</div>
              <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                <Zap size={9} className="text-primary" />
                Streaming · Gemini 3 Flash · Contextual Memory
                {hasMapCtx && (
                  <span className="flex items-center gap-1 text-success">
                    <MapPin size={9} /> Map-Aware
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Test Voice AI */}
            <button
              onClick={handleTestVoiceAI}
              disabled={loading || testLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-warning/50 text-warning hover:bg-warning/10 font-heading text-[11px] font-700 transition-all disabled:opacity-50"
              title="Send test query: risk level for aircraft below 1000ft"
            >
              {testLoading
                ? <div className="w-3 h-3 border border-warning border-t-transparent rounded-full animate-spin" />
                : <FlaskConical size={11} />}
              TEST AI
            </button>

            {hasSpeechSynth && (
              <button onClick={() => { setTtsEnabled((v) => !v); synthRef.current?.cancel(); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-heading text-[11px] font-700 transition-all ${
                  ttsEnabled ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
                }`}>
                {ttsEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                {ttsEnabled ? "VOICE ON" : "VOICE OFF"}
              </button>
            )}
            <button onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-danger hover:border-danger/50 font-heading text-[11px] font-700 transition-all">
              <Trash2 size={11} /> CLEAR
            </button>
          </div>
        </div>

        {/* Live context bar */}
        {hasMapCtx && (
          <div className="mt-3 flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-mono"
            style={{ background: "hsl(var(--primary)/0.05)", border: "1px solid hsl(var(--primary)/0.2)" }}>
            <Activity size={10} className="text-primary shrink-0" />
            <span className="text-primary font-700">LIVE SENSOR CONTEXT</span>
            <span className="text-muted-foreground">Center: {mapCtx.lat?.toFixed(3)}°N {mapCtx.lon?.toFixed(3)}°E</span>
            {mapCtx.activeAircraft !== undefined && (
              <span className="text-foreground">Aircraft: {mapCtx.activeAircraft}</span>
            )}
            {mapCtx.criticalCount !== undefined && mapCtx.criticalCount > 0 && (
              <span style={{ color: "#ef4444" }} className="font-700">CRITICAL: {mapCtx.criticalCount}</span>
            )}
            {mapCtx.scanRadiusKm && (
              <span className="text-muted-foreground">Scan: {mapCtx.scanRadiusKm} km</span>
            )}
            {mapCtx.weather && <span className="text-muted-foreground">{mapCtx.weather}</span>}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.3)" }}>
              <Bot size={32} className="text-primary" />
            </div>
            <div>
              <div className="font-heading text-xl font-700 text-foreground mb-2">SAR AI Ready</div>
              <p className="text-sm text-muted-foreground max-w-md">
                Streaming intelligence for aviation safety. Ask about aircraft tracking, SAR operations, DGCA regulations, ELT procedures, or the platform's physics engine.
                {hasMapCtx && <span className="block mt-1 text-primary">Live map context is active — AI has real-time sensor awareness.</span>}
                {hasSpeechAPI && <span className="block mt-1">Click the microphone to speak.</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Support: anands9408@gmail.com</p>
            </div>

            {/* Test button in empty state */}
            <button
              onClick={handleTestVoiceAI}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-heading text-sm font-700 transition-all border border-warning/40 text-warning hover:bg-warning/10 disabled:opacity-50"
            >
              <FlaskConical size={14} />
              TEST VOICE AI — Verify Edge Function
            </button>

            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((s) => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-3 py-2 rounded-lg text-xs font-mono text-left transition-all"
                  style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary)/0.5)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-1"
                style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.3)" }}>
                {msg.streaming
                  ? <Loader size={14} className="text-primary animate-spin" />
                  : <Bot size={14} className="text-primary" />}
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user" ? "text-white font-mono" : "text-foreground font-mono"
            }`} style={{
              background: msg.role === "user" ? "hsl(var(--primary))" : "hsl(var(--surface))",
              border: msg.role === "ai" ? "1px solid hsl(var(--border))" : "none",
            }}>
              {msg.content}
              {msg.streaming && msg.content && (
                <span className="inline-block w-0.5 h-4 bg-primary ml-1 align-middle animate-pulse" />
              )}
              {!msg.content && msg.streaming && (
                <span className="text-muted-foreground text-xs">Generating…</span>
              )}
              <div className={`text-[9px] mt-1.5 ${msg.role === "user" ? "text-white/60" : "text-muted-foreground"}`}>
                {msg.timestamp.toLocaleTimeString()}
                {msg.streaming && <span className="ml-2 text-primary">● streaming</span>}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Listening indicator */}
      {listening && (
        <div className="px-4 py-2 flex items-center gap-3 border-t border-primary/30 shrink-0"
          style={{ background: "hsl(var(--primary)/0.05)" }}>
          <Radio size={14} className="text-primary animate-pulse" />
          <span className="font-mono text-xs text-primary">Listening…</span>
          {transcript && <span className="font-mono text-xs text-muted-foreground italic">{transcript}</span>}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-4 border-t border-border shrink-0" style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-2">
          {hasSpeechAPI && (
            <button
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                listening
                  ? "bg-danger/15 border-danger text-danger animate-pulse"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}>
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask SAR AI about aviation safety, DGCA, ELT, crash prediction… (real-time streaming)"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50 transition-colors"
          />
          {loading ? (
            <button
              onClick={() => { abortRef.current?.abort(); setLoading(false); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-danger/10 border border-danger/50 text-danger hover:bg-danger/20 transition-all"
              title="Stop generating">
              <div className="w-3 h-3 bg-danger rounded-sm" />
            </button>
          ) : (
            <button onClick={() => sendMessage(input)} disabled={!input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-all">
              <Send size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[9px] font-mono text-muted-foreground">
            {messages.length} messages · {messages.filter(m => m.role === "ai").length} AI responses
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">
            Enter to send · Shift+Enter for newline
          </span>
        </div>
      </div>
    </div>
  );
};

export default VoiceAI;
