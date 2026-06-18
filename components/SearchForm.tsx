"use client";
import { useState, forwardRef, useImperativeHandle } from "react";

interface SearchParams {
  industry: string;
  location: string;
  revenue: string;
  size: string;
  signals: string;
  count: number;
  minScore: number;
  engagementType: string;
  targetCRMs: string[];
  fundingStage: string;
}

export interface SearchFormHandle {
  setParams: (p: SearchParams) => void;
}

const REVENUES = ["Any revenue","Under $10M","$10M - $50M","$50M - $500M","$500M - $3B","$1B+","Over $3B"];
const SIZES    = ["Any size","1-50 employees","50-200 employees","200-500 employees","500-2,000 employees","2,000-10,000 employees","10,000+ employees"];
const CRM_OPTIONS = ["HubSpot", "Zoho", "Microsoft Dynamics", "Pipedrive", "Spreadsheets / No CRM"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls  = "w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition";
const selectCls = inputCls + " appearance-none cursor-pointer";

const DEFAULT_PARAMS: SearchParams = {
  industry: "", location: "", revenue: "Any revenue", size: "Any size",
  signals: "", count: 8, minScore: 60,
  engagementType: "any", targetCRMs: [], fundingStage: "any",
};

const SearchForm = forwardRef<SearchFormHandle, { onSearch: (p: SearchParams) => void; loading: boolean }>(
  function SearchForm({ onSearch, loading }, ref) {
    const [params, setParamsState] = useState<SearchParams>(DEFAULT_PARAMS);
    const [advancedOpen, setAdvancedOpen] = useState(true);

    useImperativeHandle(ref, () => ({
      setParams: (p: SearchParams) => setParamsState(p),
    }));

    const set = <K extends keyof SearchParams>(k: K, v: SearchParams[K]) =>
      setParamsState((p) => ({ ...p, [k]: v }));

    function toggleCRM(crm: string) {
      const next = params.targetCRMs.includes(crm)
        ? params.targetCRMs.filter((c) => c !== crm)
        : [...params.targetCRMs, crm];
      set("targetCRMs", next);
    }

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      onSearch(params);
    }

    return (
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6">
        <h2 className="text-lg font-semibold text-apple-black mb-5">Search Criteria</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Industry">
            <input className={inputCls} placeholder="e.g. Healthcare, Manufacturing"
              value={params.industry} onChange={(e) => set("industry", e.target.value)} required />
          </Field>

          <Field label="Location">
            <input className={inputCls} placeholder="e.g. Arizona, Phoenix AZ"
              value={params.location} onChange={(e) => set("location", e.target.value)} required />
          </Field>

          <Field label="Revenue">
            <select className={selectCls} value={params.revenue} onChange={(e) => set("revenue", e.target.value)}>
              {REVENUES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>

          <Field label="Company Size">
            <select className={selectCls} value={params.size} onChange={(e) => set("size", e.target.value)}>
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Buying Signals (optional)">
            <textarea className={inputCls + " resize-none h-[80px]"} placeholder="e.g. hiring Salesforce Admin, recent funding…"
              value={params.signals} onChange={(e) => set("signals", e.target.value)} />
          </Field>

          <div className="space-y-4">
            <Field label={`Leads to find: ${params.count}`}>
              <input type="range" min={3} max={15} value={params.count}
                onChange={(e) => set("count", parseInt(e.target.value))} className="w-full accent-apple-blue" />
            </Field>
            <Field label={`Minimum fit score: ${params.minScore}`}>
              <input type="range" min={0} max={100} value={params.minScore}
                onChange={(e) => set("minScore", parseInt(e.target.value))} className="w-full accent-apple-blue" />
            </Field>
          </div>
        </div>

        {/* Advanced section */}
        <div className="mt-6">
          <button type="button" onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-3 w-full group">
            <div className="flex-1 h-px bg-black/[0.06]" />
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-apple-gray uppercase tracking-widest group-hover:text-apple-black transition-colors">
              Advanced
              <svg className={`w-3 h-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            <div className="flex-1 h-px bg-black/[0.06]" />
          </button>

          {advancedOpen && (
            <div className="mt-4 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Engagement Focus">
                  <select className={selectCls} value={params.engagementType} onChange={(e) => set("engagementType", e.target.value)}>
                    <option value="any">Any (General Prospecting)</option>
                    <option value="new_impl">New Implementation</option>
                    <option value="migration">CRM Migration</option>
                    <option value="optimization">Salesforce Optimization</option>
                  </select>
                </Field>

                <Field label="Funding Stage">
                  <select className={selectCls} value={params.fundingStage} onChange={(e) => set("fundingStage", e.target.value)}>
                    <option value="any">Any Stage</option>
                    <option value="bootstrapped">Bootstrapped / Self-funded</option>
                    <option value="seed_b">Seed – Series B</option>
                    <option value="series_c">Series C+ / Late-stage</option>
                    <option value="public">Public Company</option>
                  </select>
                </Field>
              </div>

              {params.engagementType === "optimization" ? (
                <div className="px-4 py-3 rounded-xl bg-apple-blue/5 border border-apple-blue/10">
                  <p className="text-xs text-apple-blue">Optimization mode targets existing Salesforce customers with underutilization, poor data quality, or no dedicated admin.</p>
                </div>
              ) : (
                <Field label="Target CRM (migration play)">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CRM_OPTIONS.map((crm) => {
                      const selected = params.targetCRMs.includes(crm);
                      return (
                        <button key={crm} type="button" onClick={() => toggleCRM(crm)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition active:scale-95 ${
                            selected
                              ? "bg-apple-blue text-white"
                              : "bg-apple-silver text-apple-black hover:bg-black/8"
                          }`}>
                          {crm}
                        </button>
                      );
                    })}
                  </div>
                  {params.targetCRMs.length === 0 && (
                    <p className="text-[10px] text-apple-gray mt-1.5">None selected = any CRM</p>
                  )}
                </Field>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="mt-6 w-full bg-apple-blue hover:bg-apple-blue-hover disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl transition active:scale-95">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Finding leads…
            </span>
          ) : "Find Leads"}
        </button>
      </form>
    );
  }
);

export default SearchForm;
