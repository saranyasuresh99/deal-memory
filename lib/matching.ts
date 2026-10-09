import type { Account } from "./types";

// Trailing words that don't identify a company on their own ("Kaveri Textiles" -> "kaveri").
const GENERIC_SUFFIXES = new Set([
  "group", "llc", "inc", "ltd", "industries", "labs", "solutions", "saas", "bank", "capital",
  "clinics", "hotels", "realty", "textiles", "foods", "analytics", "insurance", "hospitality",
  "constructions", "parts", "diagnostics", "solar", "nbfc", "healthcare", "health", "logistics",
  "advisory", "agency", "fitness", "lending",
]);

// First words too common to use alone as a company alias.
const STOP_FIRST_WORDS = new Set(["sunrise", "citywide", "global", "green", "smart", "cloud", "health"]);

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "GlobalMart" -> "global mart"
function splitCamel(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function companyAliases(company: string): string[] {
  const words = company.trim().split(/\s+/);
  const aliases = new Set<string>();
  aliases.add(company.toLowerCase());
  const core = [...words];
  while (core.length > 1 && GENERIC_SUFFIXES.has(core[core.length - 1].toLowerCase())) core.pop();
  aliases.add(core.join(" ").toLowerCase());
  const first = words[0].toLowerCase();
  if (first.length >= 5 && !STOP_FIRST_WORDS.has(first)) aliases.add(first);
  // "Global Mart" written with a space should still match "GlobalMart"
  aliases.add(splitCamel(company).toLowerCase());
  aliases.add(splitCamel(core.join(" ")).toLowerCase());
  return [...aliases].filter((a) => a.length >= 4);
}

export function mentionsAlias(text: string, alias: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}([^a-z0-9]|$)`, "i");
  return re.test(text);
}

// Accounts whose company name (or a distinctive alias of it) appears in the text.
export function accountsMentioned(text: string, accounts: Account[]): Account[] {
  return accounts.filter((a) => companyAliases(a.company).some((al) => mentionsAlias(text, al)));
}

export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

export function extractEmails(s: string): string[] {
  return (s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []).map((e) => e.toLowerCase());
}
