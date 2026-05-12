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

    // ── Initialize Gemini 1.5 Pro with Google Generative AI SDK ──────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.7, // Balanced for SAR analysis
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40,
      },
    });

    // ── Build chat history (last 10 turns for context window) ────────────────
    const chatHistory = history.slice(-10).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }));

    console.log(
      `[SAR Voice AI] ${stream ? "STREAMING" : "JSON"} request — model: gemini-1.5-pro | message: "${message.slice(0, 80)}" | history: ${history.length} turns`
    );

    // ── Start chat session with system instruction ──────────────────────────
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: system,
    });

    // ── Non-streaming path (JSON response) ──────────────────────────────────
    if (!stream) {
      const result = await chat.sendMessage(message);
      const reply =
        result.response.text() ??
        "I could not generate a response. Please try again.";

      console.log(
        `[SAR Voice AI] Reply generated — ${reply.length} chars`
      );

      // ── Dynamic decision injection based on reply keywords ────────────────
      let decision: Record<string, string> | null = null;
      const lowerReply = reply.toLowerCase();

      if (
        lowerReply.includes("critical") ||
        lowerReply.includes("crash") ||
        lowerReply.includes("emergency")
      ) {
        decision = {
          severity: "CRITICAL",
          action:
            "Immediate alert recommended — contact Indian Coast Guard 1800-180-3943",
          escalate: "true",
        };
      } else if (
        lowerReply.includes("high risk") ||
        lowerReply.includes("below 1000") ||
        lowerReply.includes("descent")
      ) {
        decision = {
          severity: "HIGH",
          action:
            "Monitor closely — prepare ELT verification on 121.5 / 406 MHz",
          escalate: "false",
        };
      }

      return new Response(
        JSON.stringify({
          reply,
          model: "gemini-1.5-pro",
          ...(decision && { decision }),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Streaming path (Server-Sent Events) ─────────────────────────────────
    const streamHeaders = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    };

    // Use TransformStream to pipe streamed content as SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // ── Async streaming handler ─────────────────────────────────────────────
    (async () => {
      try {
        const result = await chat.sendMessageStream(message);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            // Format as OpenAI-compatible SSE for frontend
            const sseMessage = JSON.stringify({
              choices: [
                {
                  delta: {
                    content: text,
                  },
                },
              ],
            });
            await writer.write(
              encoder.encode(`data: ${sseMessage}\n\n`)
            );
          }
        }

        // Signal end of stream
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("[SAR Voice AI] Stream error:", e);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: e.message })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { status: 200, headers: streamHeaders });
  } catch (err: any) {
    console.error("[SAR Voice AI] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
