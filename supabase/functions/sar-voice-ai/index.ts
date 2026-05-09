/**
 * SAR Voice AI Edge Function
 * Proxies chat messages to OnSpace AI (Gemini 3 Flash)
 * Maintains multi-turn conversation history
 */

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history = [], system } = await req.json();

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
        JSON.stringify({ error: "OnSpace AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages = [
      {
        role: "system",
        content: system || "You are SAR AI, an intelligent assistant for the SAR (Search Aircraft Rescue) Platform specializing in aviation safety and search & rescue operations.",
      },
      ...history.slice(-10), // keep last 10 turns for context
      { role: "user", content: message },
    ];

    console.log("[SAR Voice AI] Sending to Gemini 3 Flash, message:", message.slice(0, 80));

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[SAR Voice AI] OnSpace AI error:", errText);
      return new Response(
        JSON.stringify({ error: `AI error ${response.status}: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    console.log("[SAR Voice AI] Reply generated, length:", reply.length);

    return new Response(
      JSON.stringify({ reply, model: "google/gemini-3-flash-preview" }),
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
