import { isLiveMode } from "@/lib/ai";

// Server component: shows whether the API routes call Claude (Live) or serve pre-generated results (Demo).
export default function ModeBadge() {
  const live = isLiveMode();
  return live ? (
    <span
      title="ANTHROPIC_API_KEY is set: AI features call Claude live."
      className="cursor-help rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
    >
      Live AI
    </span>
  ) : (
    <span
      title="AI results were pre-generated with Claude during the build."
      className="cursor-help rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700"
    >
      Demo mode
    </span>
  );
}
