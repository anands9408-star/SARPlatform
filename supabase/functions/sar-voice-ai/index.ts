/**
 * SAR Voice AI Edge Function — Streaming SSE + Dynamic Decisions
 * Supports both streaming (SSE) and non-streaming JSON responses
 * Uses OnSpace AI Gemini 3 Flash with real-time context injection
 */

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, history = [], system, stream = false } = body;

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey  = Deno.env.get("ONSPACE_AI_API_KEY");
    const baseUrl = Deno.env.get("ONSPACE_AI_BASE_URL");

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "OnSpace AI not configured — check ONSPACE_AI_API_KEY and ONSPACE_AI_BASE_URL secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build messages array with memory (last 10 turns) ───────────────────
    const messages = [
      {
        role: "system",
        content: system || "You are SAR AI, an intelligent assistant for the SAR (Search Aircraft Rescue) Platform specializing in aviation safety and search & rescue operations. You have dynamic decision support capabilities and real-time sensor awareness.",
      },
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    console.log(`[SAR Voice AI] ${stream ? "STREAMING" : "JSON"} request — message: "${message.slice(0, 80)}" | history: ${history.length} turns`);

    const aiPayload = {
      model: "google/gemini-3-flash-preview",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream,
    };

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(aiPayload),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[SAR Voice AI] OnSpace AI error ${aiResponse.status}:`, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `OnSpace AI error ${aiResponse.status}: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Streaming: pipe SSE through ────────────────────────────────────────
    if (stream) {
      const streamHeaders = {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      };

      // Transform the upstream SSE into our own SSE stream
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Pipe upstream body through — forward each SSE chunk
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              break;
            }
            const chunk = decoder.decode(value, { stream: true });
            // Forward the chunk as-is (already SSE format from OnSpace AI)
            await writer.write(encoder.encode(chunk));
          }
        } catch (e) {
          console.error("[SAR Voice AI] Stream pipe error:", e);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, { status: 200, headers: streamHeaders });
    }

    // ── Non-streaming: return JSON ─────────────────────────────────────────
    const data = await aiResponse.json();
    const reply = data.choices?.[0]?.message?.content ?? "I could not generate a response. Please try again.";

    console.log(`[SAR Voice AI] Reply generated — ${reply.length} chars`);

    // ── Dynamic decision injection ─────────────────────────────────────────
    // Parse reply for action keywords and append structured decision
    let decision: Record<string, string> | null = null;
    const lowerReply = reply.toLowerCase();
    if (lowerReply.includes("critical") || lowerReply.includes("crash") || lowerReply.includes("emergency")) {
      decision = {
        severity: "CRITICAL",
        action:   "Immediate alert recommended — contact Indian Coast Guard 1800-180-3943",
        escalate: "true",
      };
    } else if (lowerReply.includes("high risk") || lowerReply.includes("below 1000") || lowerReply.includes("descent")) {
      decision = {
        severity: "HIGH",
        action:   "Monitor closely — prepare ELT verification on 121.5 / 406 MHz",
        escalate: "false",
      };
    }

    return new Response(
      JSON.stringify({
        reply,
        model: "google/gemini-3-flash-preview",
        ...(decision && { decision }),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[SAR Voice AI] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
