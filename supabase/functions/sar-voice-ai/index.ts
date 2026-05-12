/**
 * SAR Voice AI Edge Function — Streaming SSE + Gemini 1.5 Pro Advanced Reasoning
 * Uses Google Generative AI with extended thinking for rescue planning
 * Supports both streaming and non-streaming responses with dynamic decision injection
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.16.0";
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

    const apiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY not configured — check Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Initialize Gemini 1.5 Pro ────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // FIX #1: systemInstruction MUST be passed here, NOT in startChat
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: system, 
      generationConfig: {
        temperature: 0.7, 
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40,
      },
    });

    // ── Build chat history ───────────────────────────────────────────────────
    const chatHistory = history.slice(-10).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }));

    // FIX #1 (Cont): Removed systemInstruction from here
    const chat = model.startChat({
      history: chatHistory,
    });

    // ── Non-streaming path ───────────────────────────────────────────────────
    if (!stream) {
      const result = await chat.sendMessage(message);
      const reply = result.response.text() ?? "No response generated.";

      let decision: Record<string, string> | null = null;
      const lowerReply = reply.toLowerCase();

      if (lowerReply.includes("critical") || lowerReply.includes("crash") || lowerReply.includes("emergency")) {
        decision = { severity: "CRITICAL", action: "Immediate alert recommended — contact Indian Coast Guard 1800-180-3943", escalate: "true" };
      } else if (lowerReply.includes("high risk") || lowerReply.includes("below 1000")) {
        decision = { severity: "HIGH", action: "Monitor closely — prepare ELT verification on 121.5 / 406 MHz", escalate: "false" };
      }

      return new Response(
        JSON.stringify({ reply, model: "gemini-1.5-pro", ...(decision && { decision }) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Streaming path (Server-Sent Events) ─────────────────────────────────
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const result = await chat.sendMessageStream(message);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            const sseMessage = JSON.stringify({ choices: [{ delta: { content: text } }] });
            await writer.write(encoder.encode(`data: ${sseMessage}\n\n`));
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (e: any) {
        // FIX #2: Format the error so the frontend actually displays it inside the bubble
        const errorMsg = JSON.stringify({ choices: [{ delta: { content: `\n[Backend Error: ${e.message}]` } }] });
        await writer.write(encoder.encode(`data: ${errorMsg}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
