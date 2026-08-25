import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ─── AI Assistant (OpenAI-compatible provider, default: Gemini) ────
//
// POST /api/assistant  { messages: [{ role: "user"|"assistant", content }] }
// Returns a plain-text stream of the model's reply.
//
// The signed-in user's inventory is fetched server-side (RLS-scoped)
// and injected into the system prompt on every request.
//
// Configure via env vars (see .env.example):
//   AI_API_KEY   — API key of the provider (required)
//   AI_BASE_URL  — OpenAI-compatible base URL (default: Gemini)
//   AI_MODEL     — model id (default: gemini-3.6-flash)

const BASE_URL = (
  process.env.AI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai"
).replace(/\/+$/, "");
const DEFAULT_MODEL = process.env.AI_MODEL || "gemini-3.6-flash";
const MAX_HISTORY_MESSAGES = 12;

function buildInventory(products) {
  return (products ?? []).map((p) => ({
    name: p.name,
    quantity: p.quantity,
    unit: p.units?.name ?? null,
    category: p.categories?.name ?? null,
    lowStockThreshold: p.low_stock_threshold ?? null,
    lowOnStock:
      p.low_stock_threshold != null && p.quantity <= p.low_stock_threshold,
  }));
}

function buildSystemPrompt(inventory) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "You are the built-in assistant of a personal home inventory app.",
    `Today's date is ${today}.`,
    "",
    "The signed-in user's current inventory as JSON:",
    JSON.stringify(inventory),
    "",
    "Guidelines:",
    "- Only answer questions related to the user's inventory, cooking, meals, shopping and restocking. Politely decline anything else.",
    '- For "what can I cook": suggest dishes that mostly use items currently in stock and list any missing ingredients. Prefer to use up low-stock items first.',
    '- For "what to buy": base suggestions on lowOnStock items and what the user wants to cook.',
    "- Quote quantities with their units when relevant.",
    "- Be concise: short paragraphs or bullet lists, no markdown headers.",
    "- If the inventory is empty, say so and suggest adding products in the app first.",
  ].join("\n");
}

function sanitizeHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

/**
 * Converts an OpenAI-compatible SSE body into a plain text stream.
 */
function sseToTextStream(upstreamBody) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload);
              const text = chunk.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // Ignore malformed / keep-alive chunks
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock?.();
      }
    },
  });
}

export async function POST(request) {
  // Defense in depth: middleware already redirects anonymous users,
  // but the API must never answer unauthenticated requests.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured (missing AI_API_KEY)." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const history = sanitizeHistory(body?.messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "No question provided." },
      { status: 400 },
    );
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("*, categories(name), units(name)")
    .order("name");
  if (error) {
    return NextResponse.json(
      { error: "Could not load your inventory." },
      { status: 500 },
    );
  }

  let upstream;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "inventory-app",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        stream: true,
        messages: [
          { role: "system", content: buildSystemPrompt(buildInventory(products)) },
          ...history,
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the AI service." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    if (upstream.status === 429) {
      return NextResponse.json(
        {
          error:
            "The free AI quota is used up right now. Please try again later.",
        },
        { status: 429 },
      );
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json(
        { error: "AI authentication failed. Check AI_API_KEY." },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "The AI service returned an error. Please try again." },
      { status: 502 },
    );
  }

  return new Response(sseToTextStream(upstream.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
