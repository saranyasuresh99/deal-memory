// POST /api/debrief  { text, speaker? }
// Live mode (ANTHROPIC_API_KEY set): Claude Haiku proposes a CRM update as structured JSON.
// Demo mode: returns the precomputed result for a sample; for any other text, only the rule-based matcher runs.
// Either way the result is only a PROPOSAL — nothing changes until a person approves it in the UI.
import { NextResponse } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import precomputed from "@/data/precomputed/debriefs.json";
import { accounts } from "@/lib/data";
import { DEMO_MESSAGE, DEMO_USER, MODELS } from "@/lib/config";
import { friendlyError, getClient, isLiveMode } from "@/lib/ai";
import { matchAccounts } from "@/lib/matcher";
import { DEBRIEF_SYSTEM, debriefUserPrompt } from "@/lib/prompts";
import { finalizeDebrief, normalizeForMatch } from "@/lib/debrief";
import { DebriefSchema, type DebriefResponse } from "@/lib/schemas";

const MAX_CHARS = 8000;

function json(body: DebriefResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let body: { text?: unknown; speaker?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request could not be read." }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const speaker = typeof body.speaker === "string" && body.speaker.trim() ? body.speaker.trim().slice(0, 80) : DEMO_USER;
  if (!text) return json({ error: "Please speak or paste a note first." }, 400);
  if (text.length > MAX_CHARS) return json({ error: `That's too long — please keep it under ${MAX_CHARS} characters.` }, 400);

  const matcher = matchAccounts(text, accounts);

  if (isLiveMode()) {
    try {
      const res = await getClient().messages.parse({
        model: MODELS.extraction,
        max_tokens: 4000,
        system: DEBRIEF_SYSTEM,
        messages: [{ role: "user", content: debriefUserPrompt({ text, speaker, accounts, candidates: matcher }) }],
        output_config: { format: zodOutputFormat(DebriefSchema) },
      });
      if (res.stop_reason === "refusal" || !res.parsed_output) {
        return json({ error: "The AI could not produce a CRM update for this text. Please rephrase and try again." }, 502);
      }
      const { result, removed } = finalizeDebrief(res.parsed_output, text, accounts);
      return json({ mode: "live", result, matcher, removed_claims: removed });
    } catch (err) {
      return json({ error: friendlyError(err) }, 502);
    }
  }

  // Demo mode
  const sample = precomputed.samples.find((s) => normalizeForMatch(s.input) === normalizeForMatch(text));
  if (sample) {
    const parsed = DebriefSchema.safeParse(sample.result);
    if (!parsed.success) return json({ error: "The demo result for this sample is invalid." }, 500);
    const { result, removed } = finalizeDebrief(parsed.data, text, accounts);
    return json({ mode: "demo", result, matcher, removed_claims: removed });
  }
  return json({ mode: "demo", demo: true, message: DEMO_MESSAGE, matcher });
}
