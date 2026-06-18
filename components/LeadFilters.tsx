"use client";

export interface FilterState {
  statuses: string[];
  sources: string[];
  minScore: number;
  sort: "score" | "date" | "company";
  query: string;
}

export const DEFAULT_FILTERS: FilterState = { statuses: [], sources: [], minScore: 0, sort: "score", query: "" };

const STATUS_OPTIONS = ["new", "contacted", "qualified", "dead"];
const SOURCE_OPTIONS = ["Apollo Verified", "Tavily Web Search", "AI Estimate — verify before outreach"];

interface LeadFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  total: number;
  filtered: number;
}

function isActive(filters: FilterState): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.sources.length > 0 ||
    filters.minScore > 0 ||
    filters.sort !== "score" ||
    filters.query.length > 0
  );
}

export default function LeadFilters({ filters, onChange, total, filtered }: LeadFiltersProps) {
  function toggleStatus(s: string) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next.length === STATUS_OPTIONS.length ? [] : next });
  }

  function toggleSource(s: string) {
    const next = filters.sources.includes(s)
      ? filters.sources.filter((x) => x !== s)
      : [...filters.sources, s];
    onChange({ ...filters, sources: next.length === SOURCE_OPTIONS.length ? [] : next });
  }

  const statusColors: Record<string, string> = {
    new:       "bg-apple-gray/10 text-apple-gray",
    contacted: "bg-apple-blue/10 text-apple-blue",
    qualified: "bg-apple-green/10 text-apple-green",
    dead:      "bg-apple-red/10 text-apple-red",
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] px-6 py-4">
      {/* Search row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-apple-gray pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search companies…"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-apple-gray whitespace-nowrap">
            {filtered === total ? `${total} leads` : `${filtered} of ${total}`}
          </span>
          {isActive(filters) && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="text-[11px] font-semibold text-apple-red hover:opacity-70 transition-opacity whitespace-nowrap active:scale-95 transition-transform"
            >
              × Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Status</span>
          {STATUS_OPTIONS.map((s) => {
            const active = filters.statuses.length === 0 || filters.statuses.includes(s);
            return (
              <button key={s} onClick={() => toggleStatus(s)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-opacity active:scale-95 transition-transform ${statusColors[s]} ${active ? "opacity-100" : "opacity-30"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-black/10 hidden sm:block" />

        {/* Source filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Source</span>
          {[
            { val: "Apollo Verified",                        label: "Apollo" },
            { val: "Tavily Web Search",                      label: "Tavily" },
            { val: "AI Estimate — verify before outreach",   label: "AI" },
          ].map(({ val, label }) => {
            const active = filters.sources.length === 0 || filters.sources.includes(val);
            return (
              <button key={val} onClick={() => toggleSource(val)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full bg-apple-silver text-apple-black transition-opacity active:scale-95 transition-transform ${active ? "opacity-100" : "opacity-30"}`}>
                {label}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-black/10 hidden sm:block" />

        {/* Min score */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest whitespace-nowrap">Min Score: {filters.minScore}</span>
          <input type="range" min={0} max={100} value={filters.minScore}
            onChange={(e) => onChange({ ...filters, minScore: parseInt(e.target.value) })}
            className="w-24 accent-apple-blue" />
        </div>

        <div className="h-5 w-px bg-black/10 hidden sm:block" />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Sort</span>
          {(["score", "date", "company"] as const).map((s) => (
            <button key={s} onClick={() => onChange({ ...filters, sort: s })}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors active:scale-95 transition-transform ${filters.sort === s ? "bg-apple-blue text-white" : "bg-apple-silver text-apple-black"}`}>
              {s === "score" ? "Score" : s === "date" ? "Recent" : "A–Z"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
