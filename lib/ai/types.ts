import "server-only";

export type ProviderId = "sumopod" | "anthropic";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequest {
  system: string;
  messages: AIMessage[];
  maxTokens: number;
  temperature?: number;
  responseFormat?: "text" | "json";
}

export interface AIProvider {
  readonly id: ProviderId;
  generate(model: string, request: AIRequest): Promise<string>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIProviderError";
  }
}
