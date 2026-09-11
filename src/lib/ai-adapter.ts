// AI provider adapter — Groq (primary) + OpenAI-compatible fallback + stub
// Replaces z-ai-web-dev-sdk. Set:
//   GROQ_API_KEY=... (required for AI features)
//   GROQ_MODEL=openai/gpt-oss-120b (optional, defaults to openai/gpt-oss-120b)
// Legacy: AI_PROVIDER=openai with OPENAI_API_KEY still works.

import Groq from "groq-sdk";

const STUB = {
  chat: {
    completions: {
      create: async (_opts: any) => ({
        choices: [
          {
            message: {
              content:
                "AI engine not configured. Add GROQ_API_KEY to your .env file (get a free key at https://console.groq.com) to enable AI features.",
            },
          },
        ],
      }),
    },
  },
};

function normalizeMessages(messages: any[]): any[] {
  // Groq/OpenAI expect roles: system | user | assistant.
  // Our codebase historically used role "assistant" for the system prompt —
  // convert a leading assistant message to system for better results.
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  const out = [...messages];
  if (out[0]?.role === "assistant") {
    out[0] = { ...out[0], role: "system" };
  }
  // Ensure all roles are valid
  return out.map((m) => ({
    role: m.role === "system" || m.role === "user" || m.role === "assistant" ? m.role : "user",
    content: String(m.content ?? ""),
  }));
}

function getGroqModel(): string {
  return (
    process.env.GROQ_MODEL ||
    process.env.AI_MODEL ||
    "openai/gpt-oss-120b"
  );
}

export async function getAIClient(): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Groq — primary provider
  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey });
    const model = getGroqModel();
    return {
      chat: {
        completions: {
          create: async (opts: any) => {
            const res = await groq.chat.completions.create({
              model: opts.model || model,
              messages: normalizeMessages(opts.messages),
              temperature: opts.temperature ?? 0.7,
              max_tokens: opts.max_tokens ?? 2048,
            } as any);
            return { choices: (res as any).choices || [] };
          },
        },
      },
    };
  }

  // 2. Legacy OpenAI-compatible (if user set AI_PROVIDER=openai)
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!apiKey) return STUB;
    return {
      chat: {
        completions: {
          create: async (opts: any) => {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: normalizeMessages(opts.messages),
                temperature: opts.temperature ?? 0.7,
              }),
            });
            const data = await res.json();
            return { choices: (data as any).choices || [] };
          },
        },
      },
    };
  }

  // 3. Not configured — return stub with helpful message (callers already have fallbacks)
  if (!groqKey) {
    console.warn(
      "[ai] GROQ_API_KEY is not set. AI features will return placeholder text. Get a free key at https://console.groq.com"
    );
  }
  return STUB;
}

export const providers = ["groq", "openai", "stub"];
export const defaultModel = "openai/gpt-oss-120b";
