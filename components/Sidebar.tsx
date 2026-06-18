"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCommandPalette } from "./CommandPalette";

interface KeyStatus { anthropic: boolean; apollo: boolean; tavily: boolean; salesforce: boolean; }

interface SidebarProps {
  keyStatus:       KeyStatus;
  metrics:         { total: number; hot: number; verified: number; avgScore: number };
  onKeySave:       (keys: Record<string, string>) => void;
  recentSearches:  SearchHistory[];
  onRerunSearch:   (params: SearchParams) => void;
}

export interface SearchParams {
  industry: string; location: string; revenue: string; size: string;
  signals: string; count: number; minScore: number;
  engagementType: string; targetCRMs: string[]; fundingStage: string;
}

export interface SearchHistory {
  id:        number;
  params:    Partial<SearchParams>;
  leadCount: number;
  ranAt:     string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const NAV_ITEMS = [
  { href: "/",          label: "Discover",  icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/></svg> },
  { href: "/outreach",  label: "Outreach",  icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
  { href: "/pipeline",  label: "Pipeline",  icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z"/></svg> },
  { href: "/dashboard", label: "Dashboard", icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
];

function StatusDot({ active }: { active: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-apple-green" : "bg-black/10"}`} />;
}

function MetricBar({ val, goal }: { val: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
  return (
    <div className="mt-1.5 h-1 w-full rounded-full bg-black/6">
      <div
        className="h-1 rounded-full bg-apple-blue transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function Sidebar({ keyStatus, metrics, onKeySave, recentSearches, onRerunSearch }: SidebarProps) {
  const router          = useRouter();
  const pathname        = usePathname();
  const { openPalette } = useCommandPalette();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  // The integration dots reflect real config, fetched here so they're correct on
  // every page regardless of what the parent passes (some pages pass placeholders).
  const [liveKeys,      setLiveKeys]      = useState<KeyStatus>(keyStatus);
  const [weeklyGoal,    setWeeklyGoal]    = useState(20);
  const [sfConnected,   setSfConnected]   = useState(false);
  const [sfInstanceUrl, setSfInstanceUrl] = useState<string | null>(null);
  const [sfLoading,     setSfLoading]     = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.json())
      .then(d => { setSfConnected(d.sfConnected); setSfInstanceUrl(d.sfInstanceUrl); })
      .catch(() => {});
    // Load weekly goal from profile
    fetch("/api/user/profile")
      .then(r => r.json())
      .then(d => { if (d.weeklyGoal) setWeeklyGoal(d.weeklyGoal); })
      .catch(() => {});
    // Real integration status — independent of the parent-supplied prop
    fetch("/api/config")
      .then(r => r.json())
      .then((d: Record<string, boolean>) =>
        setLiveKeys({ anthropic: !!d.anthropic, apollo: !!d.apollo, tavily: !!d.tavily, salesforce: !!d.salesforce }))
      .catch(() => {});
  }, []);

  async function handleDisconnectSF() {
    setSfLoading(true);
    await fetch("/api/auth/salesforce", { method: "DELETE" });
    setSfConnected(false);
    setSfInstanceUrl(null);
    setSfLoading(false);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-sm font-bold tracking-tight text-apple-black mb-0.5">
          Foundree<span className="text-apple-blue">42</span>
        </p>
        <h1 className="text-xl font-bold text-apple-black tracking-tight">Sales Platform</h1>
        <p className="text-[10px] text-apple-gray italic mt-1">from raw to remarkable</p>
      </div>

      {/* Cmd+K hint */}
      <div className="px-3 pb-2">
        <button
          onClick={openPalette}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-apple-silver text-apple-gray text-xs hover:text-apple-black transition-colors"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/>
          </svg>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] font-semibold bg-white/60 px-1.5 py-0.5 rounded-md">⌘K</kbd>
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="px-3 pb-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <a key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? "bg-apple-blue/10 text-apple-blue" : "text-apple-gray hover:text-apple-black hover:bg-apple-silver"
              }`}>
              {icon}
              {label}
            </a>
          );
        })}
      </nav>

      <div className="h-px bg-black/[0.06] mx-6 mb-4" />

      {/* Metrics */}
      <div className="px-6 flex-1 overflow-y-auto space-y-1">
        <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-3">This Week</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Total",     val: metrics.total,    goal: weeklyGoal },
            { label: "Hot 80+",   val: metrics.hot,      goal: Math.round(weeklyGoal * 0.25) },
            { label: "Verified",  val: metrics.verified, goal: Math.round(weeklyGoal * 0.5) },
            { label: "Avg Score", val: metrics.avgScore || 0, goal: 80 },
          ].map(({ label, val, goal }) => (
            <div key={label} className="bg-apple-silver rounded-xl p-3">
              <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">{label}</p>
              <p className="text-lg font-bold text-apple-black">{val || "—"}</p>
              <MetricBar val={typeof val === "number" ? val : 0} goal={goal} />
            </div>
          ))}
        </div>

        <div className="h-px bg-black/[0.06] my-4" />

        {/* Integration Status */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Integrations</p>
          {([
            { name: "anthropic" as const, label: "Anthropic (AI)" },
            { name: "apollo"    as const, label: "Apollo" },
            { name: "tavily"    as const, label: "Tavily" },
          ]).map(({ name, label }) => (
            <div key={name} className="flex items-center justify-between py-1">
              <span className="text-sm text-apple-black">{label}</span>
              <StatusDot active={liveKeys[name]} />
            </div>
          ))}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-apple-black">Salesforce</span>
            <StatusDot active={sfConnected} />
          </div>
        </div>

        <a href="/settings" className="mt-3 block text-sm font-medium text-apple-blue hover:text-apple-blue-hover transition-colors">
          Configure integrations →
        </a>

        <div className="h-px bg-black/[0.06] my-4" />

        {/* Salesforce quick status */}
        {sfConnected ? (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Salesforce</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-apple-green flex-shrink-0" />
              <p className="text-xs text-apple-black truncate">{sfInstanceUrl ?? "Connected"}</p>
            </div>
            <button onClick={handleDisconnectSF} disabled={sfLoading}
              className="text-xs font-medium text-apple-red hover:opacity-70 transition-opacity disabled:opacity-40">
              {sfLoading ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <button onClick={() => { window.location.href = "/api/auth/salesforce"; }}
              className="block text-sm font-medium text-apple-blue hover:text-apple-blue-hover transition-colors text-left">
              Connect Salesforce →
            </button>
            <a href="/settings" className="block text-[11px] text-apple-gray hover:text-apple-black transition-colors">
              How to connect →
            </a>
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <>
            <div className="h-px bg-black/[0.06] my-4" />
            <div>
              <button onClick={() => setHistoryOpen(v => !v)}
                className="w-full flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Recent Searches</p>
                <svg className={`w-3 h-3 text-apple-gray transition-transform ${historyOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {historyOpen && (
                <div className="space-y-1.5">
                  {recentSearches.map(s => (
                    <div key={s.id} className="group flex items-start justify-between gap-2 py-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-apple-black truncate">
                          {[s.params.industry, s.params.location].filter(Boolean).join(", ") || "Search"}
                        </p>
                        <p className="text-[10px] text-apple-gray">
                          {s.leadCount} lead{s.leadCount !== 1 ? "s" : ""} · {timeAgo(s.ranAt)}
                        </p>
                      </div>
                      <button onClick={() => onRerunSearch(s.params as SearchParams)}
                        className="text-[10px] font-medium text-apple-blue opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                        Re-run
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom bar: Settings + Sign out */}
      <div className="px-3 py-4 border-t border-black/[0.06]">
        <a href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
            pathname === "/settings" ? "bg-apple-blue/10 text-apple-blue" : "text-apple-gray hover:text-apple-black hover:bg-apple-silver"
          }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Settings
        </a>
        <div className="flex items-center justify-between px-3 mt-1">
          <p className="text-[10px] text-apple-gray">Foundree42 · US Market</p>
          <button
            onClick={async () => {
              await fetch("/api/auth/signout", { method: "POST" });
              router.push("/sign-in");
            }}
            className="text-[11px] font-medium text-apple-gray hover:text-apple-red transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-black/[0.06] z-20 hidden md:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center border border-black/[0.06]"
      >
        <svg className="w-5 h-5 text-apple-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 h-full w-[280px] bg-white z-50 flex flex-col shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-apple-silver transition-colors">
              <svg className="w-5 h-5 text-apple-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
