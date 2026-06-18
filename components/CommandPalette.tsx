"use client";
import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

interface PaletteCtx { openPalette: () => void; }
const PaletteContext = createContext<PaletteCtx>({ openPalette: () => {} });
export const useCommandPalette = () => useContext(PaletteContext);

interface Lead { id: number; company: string; score: number | null; status: string; }

interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  score?: number | null;
  status?: string;
  action: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  new:       "bg-apple-gray/10 text-apple-gray",
  contacted: "bg-apple-blue/10 text-apple-blue",
  qualified: "bg-apple-green/10 text-apple-green",
  dead:      "bg-apple-red/10 text-apple-red",
};

function ScoreChip({ score }: { score: number | null }) {
  if (!score) return null;
  const color = score >= 80 ? "text-apple-green" : score >= 60 ? "text-apple-amber" : "text-apple-gray";
  return <span className={`text-xs font-bold tabular-nums ${color}`}>{score}</span>;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fetch leads once when opened
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);
    fetch("/api/leads")
      .then(r => r.json())
      .then((data: Lead[]) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  const NAV_ITEMS: PaletteItem[] = [
    { id: "nav-discover",  label: "Go to Discover",  sub: "/",          icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/></svg>,  action: () => navigate("/") },
    { id: "nav-outreach",  label: "Go to Outreach",  sub: "/outreach",  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>, action: () => navigate("/outreach") },
    { id: "nav-pipeline",  label: "Go to Pipeline",  sub: "/pipeline",  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z"/></svg>, action: () => navigate("/pipeline") },
    { id: "nav-dashboard", label: "Go to Dashboard", sub: "/dashboard", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>, action: () => navigate("/dashboard") },
    { id: "nav-settings",  label: "Go to Settings",  sub: "/settings",  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, action: () => navigate("/settings") },
  ];

  const ACTION_ITEMS: PaletteItem[] = [
    { id: "action-export", label: "Export CSV",       sub: "Download all leads", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>, action: () => { window.location.href = "/api/export"; setOpen(false); } },
  ];

  const q = query.toLowerCase().trim();

  const filteredLeads: PaletteItem[] = leads
    .filter(l => !q || l.company.toLowerCase().includes(q))
    .slice(0, 6)
    .map(l => ({
      id:     `lead-${l.id}`,
      label:  l.company,
      sub:    "Write outreach →",
      icon:   <div className="w-6 h-6 rounded-lg bg-apple-silver flex items-center justify-center text-[10px] font-bold text-apple-black flex-shrink-0">{l.company[0]}</div>,
      score:  l.score,
      status: l.status,
      action: () => navigate(`/outreach?company=${encodeURIComponent(l.company)}&leadId=${l.id}`),
    }));

  const filteredNav    = NAV_ITEMS.filter(n => !q || n.label.toLowerCase().includes(q));
  const filteredActions = ACTION_ITEMS.filter(a => !q || a.label.toLowerCase().includes(q));

  const groups: { label: string; items: PaletteItem[] }[] = [];
  if (filteredLeads.length)   groups.push({ label: "Leads",        items: filteredLeads });
  if (filteredNav.length)     groups.push({ label: "Navigation",   items: filteredNav });
  if (filteredActions.length) groups.push({ label: "Actions",      items: filteredActions });

  const allItems = groups.flatMap(g => g.items);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allItems.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); allItems[selectedIdx]?.action(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, allItems, selectedIdx]);

  // Reset selection when query changes
  useEffect(() => setSelectedIdx(0), [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const paletteCtx: PaletteCtx = { openPalette: () => setOpen(true) };

  if (!open) return <PaletteContext.Provider value={paletteCtx}>{children}</PaletteContext.Provider>;

  let globalIdx = 0;

  return (
    <PaletteContext.Provider value={paletteCtx}>
      {children}
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
        onClick={() => setOpen(false)}
      >
        {/* Modal */}
        <div
          className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-black/[0.06]"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06]">
            <svg className="w-5 h-5 text-apple-gray flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search leads, navigate, or run actions…"
              className="flex-1 text-sm text-apple-black placeholder-black/30 bg-transparent border-0 outline-none"
            />
            <kbd className="hidden sm:inline text-[10px] font-medium text-apple-gray bg-apple-silver px-2 py-0.5 rounded-md">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2">
            {groups.length === 0 ? (
              <p className="text-sm text-apple-gray text-center py-8">No results for &quot;{query}&quot;</p>
            ) : (
              groups.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest px-4 py-2">{group.label}</p>
                  {group.items.map(item => {
                    const idx = globalIdx++;
                    const isSelected = idx === selectedIdx;
                    return (
                      <button
                        key={item.id}
                        data-idx={idx}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? "bg-apple-blue text-white" : "text-apple-black hover:bg-apple-silver"
                        }`}
                      >
                        <span className={`flex-shrink-0 ${isSelected ? "text-white" : "text-apple-gray"}`}>{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-apple-black"}`}>{item.label}</p>
                          {item.sub && <p className={`text-xs truncate ${isSelected ? "text-white/70" : "text-apple-gray"}`}>{item.sub}</p>}
                        </div>
                        {item.score != null && <ScoreChip score={item.score} />}
                        {item.status && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            isSelected ? "bg-white/20 text-white" : (STATUS_COLOR[item.status] ?? "bg-apple-gray/10 text-apple-gray")
                          }`}>{item.status}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-black/[0.06] px-4 py-2 flex items-center gap-4 text-[10px] text-apple-gray">
            <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
            <span><kbd className="font-semibold">↵</kbd> select</span>
            <span><kbd className="font-semibold">Esc</kbd> dismiss</span>
          </div>
        </div>
      </div>
    </PaletteContext.Provider>
  );
}
