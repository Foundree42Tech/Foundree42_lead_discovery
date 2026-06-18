"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Sidebar, { SearchParams, SearchHistory } from "@/components/Sidebar";
import SearchForm from "@/components/SearchForm";
import LeadCard, { LeadData } from "@/components/LeadCard";
import LeadFilters, { FilterState, DEFAULT_FILTERS } from "@/components/LeadFilters";
import BulkActionBar from "@/components/BulkActionBar";
import SearchSkeleton from "@/components/SearchSkeleton";
import { useToast } from "@/components/Toast";
import type { SearchFormHandle } from "@/components/SearchForm";

interface KeyStatus { anthropic: boolean; apollo: boolean; tavily: boolean; salesforce: boolean; }

const QUICK_STARTS: { label: string; params: SearchParams }[] = [
  { label: "Healthcare · Arizona",         params: { industry: "Healthcare",         location: "Arizona",    revenue: "$10M - $50M",  size: "50-200 employees",  signals: "",                              count: 8, minScore: 60, engagementType: "any",        targetCRMs: [],           fundingStage: "any" } },
  { label: "Manufacturing · Texas",        params: { industry: "Manufacturing",      location: "Texas",      revenue: "$50M - $500M", size: "200-500 employees", signals: "",                              count: 8, minScore: 60, engagementType: "any",        targetCRMs: [],           fundingStage: "any" } },
  { label: "SaaS · California",            params: { industry: "SaaS",              location: "California", revenue: "$10M - $50M",  size: "50-200 employees",  signals: "recent funding, hiring sales ops", count: 8, minScore: 60, engagementType: "migration", targetCRMs: ["HubSpot"], fundingStage: "seed_b" } },
  { label: "Financial Services · New York", params: { industry: "Financial Services", location: "New York",   revenue: "$50M - $500M", size: "200-500 employees", signals: "",                              count: 8, minScore: 60, engagementType: "any",        targetCRMs: [],           fundingStage: "any" } },
];

function applyFilters(leads: LeadData[], f: FilterState): LeadData[] {
  let out = leads.filter((l) => {
    if (f.statuses.length && !f.statuses.includes(l.status)) return false;
    if (f.sources.length  && !f.sources.includes(l.source ?? "")) return false;
    if ((l.score ?? 0) < f.minScore) return false;
    if (f.query && !l.company.toLowerCase().includes(f.query.toLowerCase())) return false;
    return true;
  });
  if (f.sort === "score")   out = [...out].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (f.sort === "date")    out = [...out].sort((a, b) => new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime());
  if (f.sort === "company") out = [...out].sort((a, b) => a.company.localeCompare(b.company));
  return out;
}

function metrics(leads: LeadData[]) {
  const total    = leads.length;
  const hot      = leads.filter((l) => (l.score ?? 0) >= 80).length;
  const verified = leads.filter((l) => l.verified).length;
  const avgScore = total ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / total) : 0;
  return { total, hot, verified, avgScore };
}

export default function Home() {
  const { showToast } = useToast();
  const [leads,          setLeads]         = useState<LeadData[]>([]);
  const [keyStatus,      setKeyStatus]     = useState<KeyStatus>({ anthropic: false, apollo: false, tavily: false, salesforce: false });
  const [loading,        setLoading]       = useState(false);
  const [error,          setError]         = useState("");
  const [newCount,       setNewCount]      = useState(0);
  const [skippedCount,   setSkippedCount]  = useState(0);
  const [filters,        setFilters]       = useState<FilterState>(DEFAULT_FILTERS);
  const [minExport,      setMinExport]     = useState(60);
  const [selectedIds,    setSelectedIds]   = useState<Set<number>>(new Set());
  const [sfConnected,    setSfConnected]   = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchHistory[]>([]);
  const searchFormRef = useRef<SearchFormHandle | null>(null);

  const refreshLeads = useCallback(async () => {
    const res = await fetch("/api/leads");
    if (res.ok) setLeads(await res.json());
  }, []);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setKeyStatus).catch(() => {});
    fetch("/api/user/me").then((r) => r.json()).then((d) => setSfConnected(d.sfConnected)).catch(() => {});
    fetch("/api/search/history").then((r) => r.json()).then(setRecentSearches).catch(() => {});
    refreshLeads();
  }, [refreshLeads]);

  const filteredLeads = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  async function handleSearch(params: SearchParams) {
    if (!keyStatus.anthropic) { setError("Configure your Anthropic API key first."); return; }
    setError("");
    setLoading(true);
    setNewCount(0);
    setSkippedCount(0);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/search", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Search failed.");
      } else {
        const data = await res.json() as { leads: LeadData[]; skippedDuplicates: number };
        setNewCount(data.leads.length);
        setSkippedCount(data.skippedDuplicates);
        await refreshLeads();
        fetch("/api/search/history").then((r) => r.json()).then(setRecentSearches).catch(() => {});
        if (data.leads.length > 0) {
          showToast(`+${data.leads.length} new lead${data.leads.length !== 1 ? "s" : ""} added`);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function handleClearAll() {
    if (!confirm(`Delete all ${leads.length} lead${leads.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    const res = await fetch("/api/leads?all=true", { method: "DELETE" });
    if (res.ok) {
      setLeads([]);
      setSelectedIds(new Set());
      setNewCount(0);
      setSkippedCount(0);
      showToast("All leads cleared", "error");
    } else {
      showToast("Failed to clear leads", "error");
    }
  }

  function handleKeySave(saved: Record<string, string>) {
    setKeyStatus((s) => ({
      ...s,
      ...(saved.anthropic ? { anthropic: true } : {}),
      ...(saved.apollo    ? { apollo:    true } : {}),
      ...(saved.tavily    ? { tavily:    true } : {}),
    }));
  }

  function handleToggleSelect(id: number) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function handleRerunSearch(params: SearchParams) {
    searchFormRef.current?.setParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleQuickStart(params: SearchParams) {
    searchFormRef.current?.setParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleBulkStatus(status: string) {
    const ids = Array.from(selectedIds);
    await fetch("/api/leads/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ids, status }),
    });
    setLeads((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, status } : l));
    setSelectedIds(new Set());
    showToast(`${ids.length} lead${ids.length !== 1 ? "s" : ""} marked as ${status}`);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    await fetch("/api/leads/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids }),
    });
    setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    showToast(`${ids.length} lead${ids.length !== 1 ? "s" : ""} deleted`, "error");
  }

  async function handleBulkSalesforcePush() {
    const ids = Array.from(selectedIds);
    const res = await fetch("/api/leads/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "salesforce", ids }),
    });
    if (res.ok) {
      const data = await res.json() as { pushed: number[]; skipped: number[]; failed: { id: number; error: string }[] };
      if (data.pushed.length > 0) {
        await refreshLeads();
        showToast(`${data.pushed.length} lead${data.pushed.length !== 1 ? "s" : ""} pushed to Salesforce`);
      }
      if (data.failed.length > 0) {
        showToast(`${data.failed.length} lead${data.failed.length !== 1 ? "s" : ""} failed to push`, "error");
      }
    }
    setSelectedIds(new Set());
  }

  const exportUrl   = `/api/export?minScore=${minExport}`;
  const exportCount = leads.filter((l) => (l.score ?? 0) >= minExport).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        keyStatus={keyStatus}
        metrics={metrics(leads)}
        onKeySave={handleKeySave}
        recentSearches={recentSearches}
        onRerunSearch={handleRerunSearch}
      />

      <main className="ml-[260px] flex-1 px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-apple-black tracking-tight">Find Leads</h2>
          <p className="text-apple-gray mt-1">Discover US companies that need Salesforce help.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red">{error}</div>
        )}

        <SearchForm ref={searchFormRef} onSearch={handleSearch} loading={loading} />

        {loading && <SearchSkeleton />}

        {!loading && leads.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-apple-black">
                  {leads.length} lead{leads.length !== 1 ? "s" : ""}
                </h2>
                {newCount > 0 && (
                  <p className="text-xs text-apple-green mt-0.5">
                    +{newCount} added from last search
                    {skippedCount > 0 && ` · ${skippedCount} already in database (skipped)`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-apple-gray whitespace-nowrap">Export min: {minExport}</label>
                  <input type="range" min={0} max={100} value={minExport}
                    onChange={(e) => setMinExport(parseInt(e.target.value))}
                    className="w-20 accent-apple-blue" />
                </div>
                <a href={exportUrl}
                  className="flex-shrink-0 bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition active:scale-95">
                  Export CSV ({exportCount})
                </a>
                <button onClick={handleClearAll}
                  className="flex-shrink-0 text-xs font-semibold text-apple-red hover:bg-apple-red/10 px-3 py-2 rounded-xl transition active:scale-95">
                  Clear all
                </button>
              </div>
            </div>

            <LeadFilters filters={filters} onChange={setFilters} total={leads.length} filtered={filteredLeads.length} />

            <div className="space-y-3 mt-4">
              {filteredLeads.map((lead, i) => (
                <div key={lead.id} className="animate-fadeIn">
                  <LeadCard
                    lead={lead}
                    defaultOpen={i < 2}
                    onDelete={handleDelete}
                    selected={selectedIds.has(lead.id)}
                    onToggleSelect={() => handleToggleSelect(lead.id)}
                  />
                </div>
              ))}
              {filteredLeads.length === 0 && (
                <div className="text-center py-12 text-apple-gray text-sm">No leads match the current filters.</div>
              )}
            </div>
          </section>
        )}

        {!loading && leads.length === 0 && (
          <div className="mt-16 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-apple-silver flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-apple-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-apple-black">No leads yet</h3>
              <p className="text-sm text-apple-gray mt-1">Use the form above to discover companies that need Salesforce help.</p>
            </div>
            <div>
              <p className="text-xs text-apple-gray uppercase tracking-widest font-semibold mb-3">Quick start</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_STARTS.map(({ label, params }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickStart(params)}
                    className="text-sm px-4 py-2 rounded-full bg-apple-silver text-apple-black hover:bg-apple-blue hover:text-white transition active:scale-95"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          onStatusChange={handleBulkStatus}
          onDelete={handleBulkDelete}
          onSalesforcePush={handleBulkSalesforcePush}
          sfConnected={sfConnected}
        />
      )}
    </div>
  );
}
