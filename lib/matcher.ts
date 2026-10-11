// Rule-based account matcher (no AI). Finds CRM accounts a piece of free text is probably about,
// and says why. Used in Demo mode for unknown debrief text, and as hints for the AI in Live mode.
import { companyAliases, emailDomain, extractEmails, mentionsAlias } from "./matching";
import type { Account } from "./types";
import type { MatchCandidate } from "./schemas";

function personName(name: string | null): string | null {
  if (!name) return null;
  return name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").trim();
}

export function matchAccounts(text: string, accounts: Account[]): MatchCandidate[] {
  const emails = extractEmails(text);
  const out: MatchCandidate[] = [];

  for (const a of accounts) {
    const reasons: string[] = [];
    let score = 0;
    const contactEmail = a.contact_email?.toLowerCase() ?? null;

    if (contactEmail && emails.includes(contactEmail)) {
      reasons.push(`contact email ${contactEmail} appears in the text`);
      score += 10;
    } else if (contactEmail && emails.some((e) => emailDomain(e) === emailDomain(contactEmail))) {
      reasons.push(`email domain @${emailDomain(contactEmail)} appears in the text`);
      score += 6;
    }

    const companyHit = companyAliases(a.company).find((al) => mentionsAlias(text, al));
    if (companyHit) {
      reasons.push(`company name "${companyHit}" mentioned`);
      score += 5;
    }

    const full = personName(a.contact_name);
    if (full && full.includes(" ") && mentionsAlias(text, full.toLowerCase())) {
      reasons.push(`contact name "${full}" mentioned`);
      score += 4;
    } else if (full && companyHit) {
      const first = full.split(" ")[0];
      if (first.length >= 3 && !first.endsWith(".") && mentionsAlias(text, first.toLowerCase())) {
        reasons.push(`contact first name "${first}" mentioned`);
        score += 2;
      }
    }

    if (score > 0) {
      out.push({ lead_id: a.lead_id, company: a.company, contact_name: a.contact_name, reason: reasons.join("; "), score });
    }
  }
  return out.sort((x, y) => y.score - x.score || x.lead_id.localeCompare(y.lead_id));
}
