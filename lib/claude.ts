// One place for Live-mode Sonnet calls that must return validated JSON.
// - Structured output: the response is parsed and validated against a zod schema.
// - Server-side refusal fallback ("default"): if a safety classifier declines, the API retries on a fallback model.
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AiNoResultError, getClient } from "./ai";
import { MODELS } from "./config";

export async function structuredSonnet<S extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const res = await getClient().beta.messages.parse({
    model: MODELS.reasoning,
    max_tokens: opts.maxTokens ?? 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: { format: betaZodOutputFormat(opts.schema) },
  });
  if (res.stop_reason === "refusal" || res.parsed_output == null) {
    throw new AiNoResultError("The AI did not return a usable answer.");
  }
  return res.parsed_output as z.infer<S>;
}
