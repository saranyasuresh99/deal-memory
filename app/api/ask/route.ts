// POST /api/ask  { question }
// Live mode: Claude Sonnet answers from the CRM + matching documents, with citations; refuses when unsupported.
// Demo mode: returns a prepared answer when the question matches one; otherwise the Demo-mode message.
import { NextResponse } from "next/server";
import precomputed from "@/data/precomputed/answers.json";
import { friendlyError, isLiveMode } from "@/lib/ai";
import { structuredSonnet } from "@/lib/claude";
import { ASK_SYSTEM, askUserPrompt } from "@/lib/prompts";
import { crmCsv, documentsForQuestion, finalizeAnswer } from "@/lib/grounding";
import { normalizeForMatch } from "@/lib/debrief";
import { DEMO_MESSAGE } from "@/lib/config";
import { AskSchema, type AskResponse } from "@/lib/schemas";

const MAX_CHARS = 500;

function json(body: AskResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let body: { question?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request could not be read." }, 400);
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return json({ error: "Please type a question." }, 400);
  if (question.length > MAX_CHARS) return json({ error: `Please keep questions under ${MAX_CHARS} characters.` }, 400);

  if (isLiveMode()) {
    try {
      const raw = await structuredSonnet({
        system: ASK_SYSTEM,
        user: askUserPrompt(question, crmCsv(), documentsForQuestion(question)),
        schema: AskSchema,
        maxTokens: 6000,
      });
      const { result, removed } = finalizeAnswer(raw);
      return json({ mode: "live", result, removed_claims: removed });
    } catch (err) {
      return json({ error: friendlyError(err) }, 502);
    }
  }

  const match = precomputed.questions.find((q) => normalizeForMatch(q.question) === normalizeForMatch(question));
  if (!match) return json({ mode: "demo", demo: true, message: DEMO_MESSAGE });
  const parsed = AskSchema.safeParse(match.result);
  if (!parsed.success) return json({ error: "The demo answer for this question is invalid." }, 500);
  const { result, removed } = finalizeAnswer(parsed.data);
  return json({ mode: "demo", result, removed_claims: removed });
}
