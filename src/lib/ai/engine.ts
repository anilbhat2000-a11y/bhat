import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// The AI engine: one call to Claude that returns JSON matching a schema. It is switched on
// by putting an Anthropic API key in .env (ANTHROPIC_API_KEY). Without a key the portal works
// as before and the AI screens explain how to switch it on. The server needs outbound HTTPS
// to api.anthropic.com; nothing else in the LMS needs the internet.

export type AiContent = Anthropic.Beta.BetaContentBlockParam[];
export type AiRequest<T> = { system: string; content: AiContent; schema: z.ZodType<T>; maxTokens: number };
export type AiResponse<T> = { data: T; model: string; inputTokens: number; outputTokens: number };
export interface AiGenerator {
  generate<T>(req: AiRequest<T>): Promise<AiResponse<T>>;
}

export class AiError extends Error {}

export const aiModel = (env: Record<string, string | undefined> = process.env) => env.AI_MODEL?.trim() || "claude-opus-5-5";

let override: AiGenerator | null = null;
// Tests replace the real engine with a fake one.
export function useAiGenerator(g: AiGenerator | null): void {
  override = g;
}

export function aiEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (override) return true;
  if ((env.AI_ENABLED ?? "").toLowerCase() === "false") return false;
  return !!env.ANTHROPIC_API_KEY?.trim();
}

let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic({ timeout: 20 * 60_000, maxRetries: 2 }));

const realGenerator: AiGenerator = {
  async generate<T>({ system, content, schema, maxTokens }: AiRequest<T>): Promise<AiResponse<T>> {
    let message;
    try {
      // Streaming, because a whole course can take a few minutes to write. If Claude declines
      // a request for safety reasons, the API retries it on a suitable fallback model.
      const stream = claude().beta.messages.stream({
        model: aiModel(),
        max_tokens: maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high", format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: "user", content }],
      });
      message = await stream.finalMessage();
    } catch (e) {
      throw new AiError(explainApiError(e));
    }
    if (message.stop_reason === "refusal") throw new AiError("The AI declined this request. Reword the topic or instructions and try again.");
    if (message.stop_reason === "max_tokens") throw new AiError("The answer was too long. Ask for fewer modules, lessons or questions.");
    const data = message.parsed_output as T | null;
    if (!data) throw new AiError("The AI's answer could not be read. Try again.");
    return { data, model: message.model, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
  },
};

function explainApiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "The Anthropic API key is not valid. Check ANTHROPIC_API_KEY in .env.";
  if (e instanceof Anthropic.PermissionDeniedError) return "The Anthropic account does not allow this model. Check AI_MODEL in .env or the account settings.";
  if (e instanceof Anthropic.RateLimitError) return "The AI service is busy or the account's limit was reached. Wait a few minutes and try again.";
  if (e instanceof Anthropic.BadRequestError) return `The AI service refused the request: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return "The server could not reach api.anthropic.com. Check the server's internet access, proxy and firewall.";
  if (e instanceof Anthropic.APIError) return `The AI service returned an error (${e.status ?? "no status"}). Try again later.`;
  return `The AI request failed: ${(e as Error).message}`;
}

export function aiGenerator(): AiGenerator {
  if (override) return override;
  if (!aiEnabled()) throw new AiError("The AI assistant is switched off: add ANTHROPIC_API_KEY to .env.");
  return realGenerator;
}
