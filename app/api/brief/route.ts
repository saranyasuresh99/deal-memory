// POST /api/brief  { lead_id }
// Live mode: Claude Sonnet writes a pre-call brief from the account bundle (CRM row + linked documents).
// Demo mode: returns the brief pre-generated during the build.
// Accounts without documents never call the AI: "No history found for this account."
import { NextResponse } from "next/server";
import precomputed from "@/data/precomputed/briefs.json";
import { documentsFor, getAccount } from "@/lib/data";
import { friendlyError, isLiveMode } from "@/lib/ai";
import { structuredSonnet } from "@/lib/claude";
import { BRIEF_SYSTEM, briefUserPrompt } from "@/lib/prompts";
import { finalizeBrief } from "@/lib/grounding";
import { DEMO_MESSAGE } from "@/lib/config";
import { BriefSchema, type BriefResponse } from "@/lib/schemas";

const NO_HISTORY = "No history found for this account.";

function json(body: BriefResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let body: { lead_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "The request could not be read." }, 400);
  }
  const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
  const account = getAccount(leadId);
  if (!account) return json({ error: "Unknown account." }, 404);

  const live = isLiveMode();
  const mode = live ? "live" : "demo";
  const docs = documentsFor(leadId);
  if (docs.length === 0) return json({ mode, lead_id: leadId, no_history: true, message: NO_HISTORY });

  if (live) {
    try {
      const raw = await structuredSonnet({ system: BRIEF_SYSTEM, user: briefUserPrompt(account, docs), schema: BriefSchema });
      const { brief, removed } = finalizeBrief(raw);
      return json({ mode, lead_id: leadId, no_history: false, brief, removed_claims: removed });
    } catch (err) {
      return json({ error: friendlyError(err) }, 502);
    }
  }

  const entry = (precomputed.briefs as Record<string, { brief: unknown }>)[leadId];
  if (!entry) return json({ mode: "demo", demo: true, message: DEMO_MESSAGE });
  const parsed = BriefSchema.safeParse(entry.brief);
  if (!parsed.success) return json({ error: "The demo brief for this account is invalid." }, 500);
  const { brief, removed } = finalizeBrief(parsed.data);
  return json({ mode, lead_id: leadId, no_history: false, brief, removed_claims: removed });
}
