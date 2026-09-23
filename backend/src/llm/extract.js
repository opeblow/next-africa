import { config } from "../config.js";
import { logger } from "../lib/logger.js";

const { timeoutMs, maxRetries, retryBaseMs } = config.openai;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
}

/**
 * fetch() with an abort-based timeout and bounded exponential backoff on
 * transient failures (429 / 5xx / network). Non-retryable 4xx fail fast.
 */
async function fetchWithRetry(url, options, label) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.ok) return response;
      const detail = await response.text().catch(() => "");
      const retryable = response.status === 429 || response.status >= 500;
      lastError = Object.assign(new Error(`${label} failed`), {
        status: response.status,
        detail,
        retryable,
      });
      if (!retryable) throw lastError;
      logger.warn({ status: response.status, attempt, label }, "LLM request failed, will retry");
    } catch (error) {
      if (error?.retryable === false) throw error;
      lastError = Object.assign(error, { retryable: true });
      if (error.name === "AbortError") {
        lastError = Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), {
          retryable: true,
        });
      }
    } finally {
      clearTimeout(timer);
    }
    if (attempt < maxRetries) await delay(retryBaseMs * 2 ** attempt);
  }
  throw lastError;
}

const tool = {
  type: "function",
  function: {
    name: "record_commitments",
    description: "Extract every concrete commitment from the user's message.",
    parameters: {
      type: "object",
      properties: {
        reply: { type: "string" },
        commitments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              type: { type: "string", enum: ["task", "deadline", "meeting", "reminder"] },
              due_date: { type: ["string", "null"], description: "ISO timestamp or null." },
              linked_to_title: { type: ["string", "null"] },
            },
            required: ["title", "type", "due_date", "linked_to_title"],
          },
        },
      },
      required: ["reply", "commitments"],
    },
  },
};

export async function extractCommitments(text) {
  requireKey();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        tools: [tool],
        tool_choice: { type: "function", function: { name: "record_commitments" } },
        messages: [
          {
            role: "system",
            content: `You are NEXT Africa, an execution copilot. Extract only explicit or strongly implied commitments. The current UTC date and time is ${new Date().toISOString()}. Convert any stated relative date or time ("tomorrow", "Friday at 3pm", "next week") into an ISO 8601 timestamp; never invent a date that was not stated. Write \`reply\` as a short, warm confirmation of what you captured: one or two sentences, spoken directly to the user. Never repeat the user's message or any file contents back verbatim.`,
          },
          { role: "user", content: text },
        ],
      }),
    },
    "OpenAI extraction"
  );
  const body = await response.json();
  const call = body.choices?.[0]?.message?.tool_calls?.find((item) => item.function?.name === "record_commitments");
  if (!call?.function?.arguments) throw new Error("OpenAI returned no commitment extraction");
  return JSON.parse(call.function.arguments);
}

export async function transcribeAudio(base64, mimeType = "audio/webm") {
  requireKey();
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length) throw new Error("Empty audio payload");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType || "audio/webm" }), "voice-note.webm");
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  const response = await fetchWithRetry(
    "https://api.openai.com/v1/audio/transcriptions",
    { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form },
    "OpenAI transcription"
  );
  const body = await response.json();
  const text = body.text?.trim();
  if (!text) throw new Error("OpenAI returned no transcription");
  return text;
}
