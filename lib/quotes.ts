// Anti-hallucination check (rule 5): a quote only counts if it really appears in its source.
// Comparison is case-insensitive and whitespace-normalised. Markdown bold markers and
// dash/quote-mark variants are also normalised so formatting differences don't cause false misses.

export function normalizeForQuote(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteInText(quote: string, source: string): boolean {
  const q = normalizeForQuote(quote);
  if (q.length === 0) return false;
  return normalizeForQuote(source).includes(q);
}
