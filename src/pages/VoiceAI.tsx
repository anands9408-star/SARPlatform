/**
 * Voice AI Command Page — SAR AI Voice Interface
 * Streaming outputs · Contextual memory · Map awareness · Dynamic decisions · JARVIS Alert Watcher
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Bot, Loader,
  Trash2, Radio, Zap, MapPin, Activity, FlaskConical, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  streaming?: boolean;
  isAlert?: boolean;
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
Analyze ADS-B data, physics kinematics (v=u+at), and ELT signals based on ICAO Annex 12 standards. 
Indian aviation context: DGCA regulations and AAI airports. Be concise and operationally direct.`;

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
  const [lastAlertCount, setLastAlertCount] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef       = useRef<SpeechSynthesis | null>(null);
  const abortRef       = useRef<AbortController | null>(null);

  const hasSpeechAPI  = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const hasSpeechSynth = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (hasSpeechSynth) synthRef.current = window.speechSynthesis;
    return () => synthRef.current?.cancel();
  }, [hasSpeechSynth]);

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
    utterance.lang  = "en-IN";
    synthRef.current?.speak(utterance);
  }, [ttsEnabled, hasSpeechSynth]);

  // ── Streaming message send with Robust Parsing ──────
  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const historySnapshot = messages.slice(-10).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    const aiId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", timestamp: new Date(), streaming: true }]);

    try {
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
        body: JSON.stringify({ message: q, history: historySnapshot, system: SAR_SYSTEM_PROMPT, stream: true }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) throw new Error(`[${resp.status}] AI Connection Error`);

      const contentType = resp.headers.get("content-type") || "";

      // IF BACKEND SENDS STANDARD JSON (Not Streaming)
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        const reply = data.reply || data.text || data.choices?.[0]?.message?.content || JSON.stringify(data);
        
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: reply, streaming: false } : m));
        speak(reply);
      } 
      // IF BACKEND SENDS A STREAM OR RAW TEXT
      else {
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          if (chunk.includes("data: ")) {
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (raw === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(raw);
                  const delta = parsed.choices?.[0]?.delta?.content || parsed.text || parsed.reply || "";
                  accumulated += delta;
                } catch (e) {}
              }
            }
          } else {
            // THIS is the line that fixes your empty bubbles if the backend isn't using "data: "
            accumulated += chunk.replace(/\[DONE\]/g, ""); 
          }

          setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: accumulated, streaming: true } : m));
        }

        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, streaming: false } : m));
        speak(accumulated);
      }

    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("SAR AI Error");
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: "Error communicating with Gemini backend: " + err.message, streaming: false } : m));
      }
    }
    setLoading(false);
  }, [loading, messages, speak]);

  const startListening = useCallback(() => {
    if (!hasSpeechAPI) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      if (e.results[0].isFinal) { setInput(t); sendMessage(t); }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [hasSpeechAPI, sendMessage]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3">
          <Bot className="text-primary" />
          <h1 className="font-heading font-bold text-foreground tracking-widest text-base">SAR AI ASSISTANT</h1>
        </div>
        <button onClick={() => setMessages([])} className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground"><Trash2 size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl font-mono text-sm shadow-sm border ${
              msg.role === "user" ? "bg-primary border-primary text-white" : "bg-surface border-border text-foreground"
            }`}>
              {msg.content || (msg.streaming && "Analyzing sensor data...")}
              {msg.streaming && <span className="ml-1 inline-block w-2 h-4 bg-primary animate-pulse" />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-6 border-t border-border bg-surface">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <button onClick={listening ? () => recognitionRef.current.stop() : startListening}
            className={`p-4 rounded-2xl border transition-all ${listening ? "bg-danger/10 border-danger text-danger animate-pulse" : "border-border text-muted-foreground"}`}>
            {listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            className="flex-1 bg-background border border-border rounded-2xl px-5 py-4 font-mono text-sm focus:border-primary outline-none text-foreground"
            placeholder="Ask SAR AI about aircraft tracking or rescue planning..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="p-4 bg-primary text-white rounded-2xl disabled:opacity-40">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAI;

