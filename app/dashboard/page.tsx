"use client";
import { useState, useEffect } from "react";
import Sidebar, { SearchParams, SearchHistory } from "@/components/Sidebar";

interface Activity { id: number; type: string; description: string; createdAt: string; leadId?: number; lead?: { company: string } | null; }
interface StatusGroup { status: string; count: number; }
interface SourceGroup { source: string; count: number; }
interface HotLead { id: number; company: string; score: number | null; source: string | null; }

interface DashboardData {
  totalLeads:     number;
  leadsThisWeek:  number;
  hotThisWeek:    number;
  avgScore:       number;
  contactRate:    number;
  statusGroups:   StatusGroup[];
  sourceGroups:   SourceGroup[];
  hotLeads:       HotLead[];
  recentActivity: Activity[];
}

const STATUS_LABELS: Record<string, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", won: "Won", dead: "Dead" };
const STATUS_COLOR:  Record<string, string> = { new: "#5f6360", contacted: "#186cb2", qualified: "#34c759", won: "#186cb2", dead: "#ff4040" };
const TYPE_LABEL:    Record<string, string> = {
  discovered:      "New lead discovered",
  status_changed:  "Status updated",
  outreach_written:"Outreach written",
  sf_pushed:       "Pushed to Salesforce",
  note_saved:      "Note saved",
  researched:      "Company researched",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-apple-black">{label}</span>
        <span className="text-apple-gray tabular-nums">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-apple-silver overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function SourceBar({ source, count, max }: { source: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const colors: Record<string, string> = { Apollo: "#186cb2", Tavily: "#34c759", AI: "#ff9f0a" };
  const color = colors[source] ?? "#5f6360";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-apple-black">{source}</span>
        <span className="text-apple-gray tabular-nums">{count} · {pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-apple-silver overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-5">
      <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-bold tracking-tight mt-1 ${color ?? "text-apple-black"}`}>{value}</p>
      {sub && <p className="text-xs text-apple-gray mt-0.5">{sub}</p>}
    </div>
  );
}

function weekLabel(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then((d: DashboardData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxStatus = data ? Math.max(...data.statusGroups.map(g => g.count), 1) : 1;
  const maxSource = data ? Math.max(...data.sourceGroups.map(g => g.count), 1) : 1;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        keyStatus={{ anthropic: false, apollo: false, tavily: false, salesforce: false }}
        metrics={{ total: data?.totalLeads ?? 0, hot: data?.hotThisWeek ?? 0, verified: 0, avgScore: data?.avgScore ?? 0 }}
        onKeySave={() => {}}
        recentSearches={[] as SearchHistory[]}
        onRerunSearch={(_p: SearchParams) => {}}
      />

      <main className="ml-[260px] flex-1 px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-apple-black tracking-tight">Dashboard</h2>
            <p className="text-apple-gray mt-1">Week of {weekLabel()}</p>
          </div>
          <a href="/" className="text-sm font-medium text-apple-blue hover:text-apple-blue-hover transition-colors">
            Run new search →
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-black/[0.04] p-5 animate-pulse">
                <div className="h-3 w-20 bg-apple-silver rounded mb-3" />
                <div className="h-8 w-12 bg-apple-silver rounded" />
              </div>
            ))}
          </div>
        ) : !data ? (
          <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-12 text-center">
            <p className="text-apple-gray">No data yet. Run your first search to see analytics.</p>
            <a href="/" className="mt-4 inline-block text-sm font-medium text-apple-blue hover:text-apple-blue-hover">
              Go to Discover →
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Leads this week" value={data.leadsThisWeek} sub={`${data.totalLeads} total`} />
              <StatCard label="Hot leads (80+)" value={data.hotThisWeek}   color="text-apple-green" sub="Score ≥ 80" />
              <StatCard label="Avg score"        value={data.avgScore || "—"} sub="Across all leads" />
              <StatCard label="Contact rate"     value={`${data.contactRate}%`} sub="New → Contacted" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pipeline funnel */}
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6">
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-4">Pipeline Funnel</p>
                {data.statusGroups.length === 0 ? (
                  <p className="text-sm text-apple-gray">No leads yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(["new","contacted","qualified","won","dead"] as const)
                      .map(s => {
                        const group = data.statusGroups.find(g => g.status === s);
                        if (!group || group.count === 0) return null;
                        return (
                          <FunnelBar
                            key={s}
                            label={STATUS_LABELS[s] ?? s}
                            count={group.count}
                            max={maxStatus}
                            color={STATUS_COLOR[s] ?? "#5f6360"}
                          />
                        );
                      }).filter(Boolean)}
                  </div>
                )}
              </div>

              {/* Source breakdown */}
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6">
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-4">Lead Sources</p>
                {data.sourceGroups.length === 0 ? (
                  <p className="text-sm text-apple-gray">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.sourceGroups
                      .sort((a, b) => b.count - a.count)
                      .map(g => <SourceBar key={g.source} source={g.source} count={g.count} max={maxSource} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Hot leads + Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hot leads */}
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Hot Leads This Week</p>
                  <a href="/?minScore=80" className="text-[10px] font-medium text-apple-blue hover:text-apple-blue-hover">See all →</a>
                </div>
                {data.hotLeads.length === 0 ? (
                  <p className="text-sm text-apple-gray">No hot leads this week yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.hotLeads.map(l => (
                      <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-apple-silver hover:bg-apple-blue/5 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-apple-green/10 flex items-center justify-center text-[10px] font-bold text-apple-green flex-shrink-0">
                            {l.company[0]}
                          </div>
                          <p className="text-sm font-medium text-apple-black truncate">{l.company}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-apple-green">{l.score}</span>
                          <a href={`/outreach?company=${encodeURIComponent(l.company)}&leadId=${l.id}`}
                            className="text-[10px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors">
                            Outreach →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6">
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-4">Recent Activity</p>
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-apple-gray">No activity yet. Start discovering leads!</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.recentActivity.map(a => {
                      const company = a.lead?.company;
                      const href = a.leadId ? `/outreach?leadId=${a.leadId}${company ? `&company=${encodeURIComponent(company)}` : ""}` : undefined;
                      const row = (
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] text-apple-gray flex-shrink-0 pt-0.5 w-12 text-right">{timeAgo(a.createdAt)}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-apple-black">
                              {TYPE_LABEL[a.type] ?? a.type}
                              {company && <span className="text-apple-gray font-normal"> · {company}</span>}
                            </p>
                            <p className="text-[11px] text-apple-gray leading-snug">{a.description}</p>
                          </div>
                        </div>
                      );
                      return href ? (
                        <a key={a.id} href={href} className="block -mx-2 px-2 py-1 rounded-lg hover:bg-apple-silver transition-colors">{row}</a>
                      ) : (
                        <div key={a.id}>{row}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
