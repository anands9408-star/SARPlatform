/**
 * Voice AI Command Page — SAR AI Voice Interface
 * Uses OnSpace AI (Gemini 3 Flash) + Web Speech API for voice interaction
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, Bot, Loader, Trash2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SAR_SYSTEM_PROMPT = `You are SAR AI — the intelligent assistant for the SAR (Search Aircraft Rescue) Platform. 
You specialize in:
- Aviation safety and crash prediction analysis
- ADS-B aircraft tracking data interpretation  
- Search and Rescue operational planning (ICAO Annex 12)
- Indian aviation context (DGCA, AAI, Cospas-Sarsat, Indian Coast Guard)
- Physics-based flight trajectory analysis
- Emergency Locator Transmitter (ELT) procedures (121.5 MHz, 406 MHz)
- Weather impact on aviation safety (Open-Meteo data)

Always provide concise, operationally useful responses. Reference real Indian airports (DEL, BOM, MAA, BLR, HYD) and agencies when relevant.
For emergencies, always direct to: Indian Coast Guard 1800-180-3943 or National Emergency 112.
Contact SAR Platform support: anands9408@gmail.com`;

const VoiceAI: React.FC = () => {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [listening, setListening]     = useState(false);
  const [ttsEnabled, setTtsEnabled]   = useState(true);
  const [transcript, setTranscript]   = useState("");
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef       = useRef<SpeechSynthesis | null>(null);

  const hasSpeechAPI  = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const hasSpeechSynth = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (hasSpeechSynth) synthRef.current = window.speechSynthesis;
    return () => synthRef.current?.cancel();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !hasSpeechSynth) return;
    synthRef.current?.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 300));
    utterance.rate  = 0.95;
    utterance.pitch = 1.0;
    utterance.lang  = "en-IN";
    synthRef.current?.speak(utterance);
  }, [ttsEnabled, hasSpeechSynth]);

  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = messages.slice(-8).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    const { data, error: fnErr } = await supabase.functions.invoke("sar-voice-ai", {
      body: { message: q, history, system: SAR_SYSTEM_PROMPT },
    });

    if (fnErr) {
      let msg = fnErr.message;
      if (fnErr instanceof FunctionsHttpError) {
        try { msg = await fnErr.context?.text(); } catch {}
      }
      toast.error("AI error: " + msg);
      setLoading(false);
      return;
    }

    const aiText = data?.reply ?? "I couldn't process that. Please try again.";
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", content: aiText, timestamp: new Date() };
    setMessages((prev) => [...prev, aiMsg]);
    speak(aiText);
    setLoading(false);
  }, [loading, messages, speak]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0"
        style={{ background: "hsl(var(--surface))" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.4)" }}>
            <Bot size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-heading text-base font-700 tracking-widest text-foreground">SAR AI ASSISTANT</div>
            <div className="text-[10px] font-mono text-muted-foreground">Powered by Google Gemini 3 Flash · Voice + Text</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask me anything about aircraft tracking, SAR operations, DGCA regulations, ELT procedures, or the platform's physics engine.
                {hasSpeechAPI && " Click the microphone to speak."}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Support: anands9408@gmail.com</p>
            </div>
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
                <Bot size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "text-white font-mono"
                : "text-foreground font-mono"
            }`} style={{
              background: msg.role === "user"
                ? "hsl(var(--primary))"
                : "hsl(var(--surface))",
              border: msg.role === "ai" ? "1px solid hsl(var(--border))" : "none",
            }}>
              {msg.content}
              <div className={`text-[9px] mt-1.5 ${msg.role === "user" ? "text-white/60" : "text-muted-foreground"}`}>
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mr-2"
              style={{ background: "hsl(var(--primary)/0.15)", border: "1px solid hsl(var(--primary)/0.3)" }}>
              <Bot size={14} className="text-primary" />
            </div>
            <div className="px-4 py-3 rounded-xl flex items-center gap-2"
              style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}>
              <Loader size={14} className="text-primary animate-spin" />
              <span className="text-xs font-mono text-muted-foreground">SAR AI thinking…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Listening indicator */}
      {listening && (
        <div className="px-4 py-2 flex items-center gap-3 border-t border-primary/30"
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
            placeholder="Ask SAR AI anything about aviation safety, DGCA, ELT, crash prediction…"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50 transition-colors"
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-all">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAI;
