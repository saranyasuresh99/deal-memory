// Demo vs Live mode. Live mode switches on automatically when ANTHROPIC_API_KEY is set on the server.
// The key is only ever read server-side and is never printed or sent to the browser.
import Anthropic from "@anthropic-ai/sdk";

export function isLiveMode(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return client;
}

// Friendly message for any API failure — the page must never crash.
export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The AI key was rejected. Check ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "The AI is busy right now. Please try again in a minute.";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the AI service. Check your connection.";
  if (err instanceof Anthropic.APIError) return `The AI service returned an error (${err.status}). Please try again.`;
  return "Something went wrong while asking the AI. Please try again.";
}
