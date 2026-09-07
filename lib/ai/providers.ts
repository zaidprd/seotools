import "server-only";

import { AIProviderError, type AIProvider, type AIRequest, type ProviderId } from "./types";

const DEFAULT_TIMEOUT_MS = 75_000;

function timeoutSignal(): AbortSignal {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS);
  return AbortSignal.timeout(Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS);
}

function retryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function responseBody(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!response.ok) {
    throw new AIProviderError(`AI provider returned HTTP ${response.status}`, retryableStatus(response.status), response.status);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new AIProviderError("AI provider returned invalid JSON", true, response.status, { cause });
  }
}

async function providerFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: timeoutSignal(), cache: "no-store" });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Network request failed";
    throw new AIProviderError(message, true, undefined, { cause });
  }
}

class SumoPodProvider implements AIProvider {
  readonly id = "sumopod" as const;

  async generate(model: string, request: AIRequest): Promise<string> {
    const apiKey = process.env.SUMOPOD_API_KEY;
    if (!apiKey) throw new AIProviderError("SUMOPOD_API_KEY is not configured", false);
    const baseUrl = (process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1").replace(/\/$/, "");
    const response = await providerFetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: request.system }, ...request.messages],
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        ...(request.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const data = await responseBody(response) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new AIProviderError("AI provider returned empty content", true, response.status);
    }
    return content.trim();
  }
}

class AnthropicProvider implements AIProvider {
  readonly id = "anthropic" as const;

  async generate(model: string, request: AIRequest): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AIProviderError("ANTHROPIC_API_KEY is not configured", false);
    const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1").replace(/\/$/, "");
    const response = await providerFetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": process.env.ANTHROPIC_API_VERSION || "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: request.system,
        messages: request.messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }),
    });
    const data = await responseBody(response) as { content?: Array<{ type?: string; text?: unknown }> };
    const content = data.content?.find((block) => block.type === "text")?.text;
    if (typeof content !== "string" || !content.trim()) {
      throw new AIProviderError("AI provider returned empty content", true, response.status);
    }
    return content.trim();
  }
}

export function createProvider(id: ProviderId): AIProvider {
  if (id === "anthropic") return new AnthropicProvider();
  return new SumoPodProvider();
}
