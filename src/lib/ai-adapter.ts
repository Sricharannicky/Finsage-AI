// AI provider adapter — Groq (primary) + OpenAI-compatible fallback + stub
// Replaces z-ai-web-dev-sdk. Set:
//   GROQ_API_KEY=... (get a free key at https://console.groq.com)
//   GROQ_MODEL=llama-3.3-70b-versatile (optional, defaults to llama-3.3-70b-versatile)
// Or for OpenAI:
//   OPENAI_API_KEY=...
//   OPENAI_MODEL=gpt-4o-mini (optional, defaults to gpt-4o-mini)
//   AI_PROVIDER=openai

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
  // Convert a leading assistant message to system for better prompt adherence.
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
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Groq — primary provider (if configured and provider is not forced to openai)
  if (groqKey && provider !== "openai") {
    const groq = new Groq({ apiKey: groqKey });
    const model = getGroqModel();
    return {
      chat: {
        completions: {
          create: async (opts: any) => {
            const requestedModel = opts.model || model;
            try {
              const res = await groq.chat.completions.create({
                model: requestedModel,
                messages: normalizeMessages(opts.messages),
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.max_tokens ?? 2048,
              } as any);
              return { choices: (res as any).choices || [] };
            } catch (err: any) {
              if (err?.code === "model_not_found" || err?.message?.includes("does not exist")) {
                console.warn(`[groq] Model ${requestedModel} not found, falling back to openai/gpt-oss-120b`);
                const fallbackRes = await groq.chat.completions.create({
                  model: "openai/gpt-oss-120b",
                  messages: normalizeMessages(opts.messages),
                  temperature: opts.temperature ?? 0.7,
                  max_tokens: opts.max_tokens ?? 2048,
                } as any);
                return { choices: (fallbackRes as any).choices || [] };
              }
              throw err;
            }
          },
        },
      },
    };
  }

  // 2. OpenAI provider (if provider=openai or if OPENAI_API_KEY is set without Groq)
  if (openAiKey || provider === "openai") {
    const apiKey = openAiKey;
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
                model: opts.model || model,
                messages: normalizeMessages(opts.messages),
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.max_tokens ?? 2048,
              }),
            });
            const data = await res.json();
            return { choices: (data as any).choices || [] };
          },
        },
      },
    };
  }

  // 3. Not configured — return stub with helpful message
  console.warn(
    "[ai] Neither GROQ_API_KEY nor OPENAI_API_KEY is set. AI features will return placeholder text. Get a free key at https://console.groq.com"
  );
  return STUB;
}

export const providers = ["groq", "openai", "stub"];
export const defaultModel = "llama-3.3-70b-versatile";
