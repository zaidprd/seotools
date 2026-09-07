import "server-only";

import { createProvider } from "./providers";
import { AIProviderError, type AIRequest, type ProviderId } from "./types";

interface Target {
  provider: ProviderId;
  model: string;
}

function providerId(value: string | undefined, fallback: ProviderId): ProviderId {
  return value === "anthropic" || value === "sumopod" ? value : fallback;
}

function targets(): { primary: Target; fallback: Target } {
  return {
    primary: {
      provider: providerId(process.env.AI_PRIMARY_PROVIDER, "sumopod"),
      model: process.env.AI_PRIMARY_MODEL || "claude-sonnet-4-6",
    },
    fallback: {
      provider: providerId(process.env.AI_FALLBACK_PROVIDER, "sumopod"),
      model: process.env.AI_FALLBACK_MODEL || "claude-haiku-4-5",
    },
  };
}

async function runTarget(target: Target, request: AIRequest): Promise<string> {
  return createProvider(target.provider).generate(target.model, request);
}

export async function generateText(request: AIRequest): Promise<string> {
  const { primary, fallback } = targets();
  try {
    return await runTarget(primary, request);
  } catch (error) {
    if (!(error instanceof AIProviderError) || !error.retryable) throw error;
    console.warn(`[ai] Primary request failed; trying configured fallback once: ${error.message}`);
    return runTarget(fallback, request);
  }
}

export async function generateStructured<T>(
  request: AIRequest,
  parse: (text: string) => T,
): Promise<T> {
  const { primary, fallback } = targets();
  try {
    return parse(await runTarget(primary, { ...request, responseFormat: "json" }));
  } catch (error) {
    // Parser/schema errors are deterministic for this response and must not spend
    // another full request. Fallback is reserved for provider availability errors.
    if (!(error instanceof AIProviderError) || !error.retryable) throw error;
    console.warn(`[ai] Primary provider failed; trying configured fallback once: ${error.message}`);
    return parse(await runTarget(fallback, { ...request, responseFormat: "json" }));
  }
}
