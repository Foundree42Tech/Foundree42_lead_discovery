"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar, { SearchParams, SearchHistory } from "@/components/Sidebar";
import { useToast } from "@/components/Toast";
import type { CompanyIntelligence, PitchStrategy, OutreachMessages } from "@/lib/outreach";

type MessageTab = "linkedin" | "email" | "followup" | "connect";

const STAGE_LABELS = [
  { label: "Gathering signals",    sub: "Searching for company intelligence…" },
  { label: "Analyzing company",    sub: "Building company profile and ICP score…" },
  { label: "Building pitch",       sub: "Crafting pitch angle and strategy…" },
  { label: "Writing messages",     sub: "Generating personalized outreach…" },
];

const STAGE_DURATIONS = [3000, 10000, 17000, 24000];

const TAB_CONFIG: { key: MessageTab; label: string; field: keyof OutreachMessages; charLimit?: number }[] = [
  { key: "linkedin", label: "LinkedIn DM",    field: "linkedinDm",     charLimit: 300 },
  { key: "email",    label: "Cold Email",     field: "coldEmail" },
  { key: "followup", label: "Follow-up",      field: "followupEmail" },
  { key: "connect",  label: "Connect Note",   field: "connectionNote", charLimit: 200 },
];

const QUICK_REFINE = [
  { label: "Shorter",       instruction: "Make this significantly shorter while keeping the key message." },
  { label: "More direct",   instruction: "Make this more direct and confident. Remove any hedging language." },
  { label: "More formal",   instruction: "Make this more professional and formal in tone." },
  { label: "Add detail",    instruction: "Add one more specific, compelling detail or data point." },
];

function StageIndicator({ stage }: { stage: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6 space-y-4">
      <p className="text-sm font-semibold text-apple-black">Researching company…</p>
      {STAGE_LABELS.map((s, i) => {
        const done    = stage > i + 1;
        const active  = stage === i + 1;
        const waiting = stage < i + 1;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
              done    ? "bg-apple-green text-white" :
              active  ? "bg-apple-blue text-white" :
              "bg-apple-silver text-apple-gray"
            }`}>
              {done ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              ) : active ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (i + 1)}
            </div>
            <div>
              <p className={`text-sm font-medium ${done ? "text-apple-green" : active ? "text-apple-black" : "text-apple-gray"}`}>
                {s.label}
              </p>
              {(active || done) && (
                <p className="text-xs text-apple-gray">{done ? "Complete" : s.sub}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntelligenceCard({ intelligence, strategy }: { intelligence: CompanyIntelligence; strategy: PitchStrategy }) {
  const [pitchOpen, setPitchOpen] = useState(false);
  const scoreColor = intelligence.icpScore >= 80 ? "text-apple-green" : intelligence.icpScore >= 60 ? "text-apple-amber" : "text-apple-gray";
  const crmColor   = intelligence.currentCRM === "Salesforce" ? "bg-apple-green/10 text-apple-green" : "bg-apple-amber/10 text-apple-amber";

  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-5 border-b border-black/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(intelligence.headquarters || "example.com")}`}
              alt=""
              className="w-9 h-9 rounded-xl bg-apple-silver flex-shrink-0 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <div className="min-w-0">
              <p className="font-semibold text-apple-black text-base truncate">{intelligence.industry}</p>
              <p className="text-xs text-apple-gray truncate">{intelligence.headquarters} · {intelligence.estimatedSize}</p>
            </div>
          </div>
          <div className={`text-xl font-bold flex-shrink-0 ${scoreColor}`}>{intelligence.icpScore}</div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-apple-silver text-apple-black">{intelligence.icpTier}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${crmColor}`}>{intelligence.currentCRM}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            intelligence.dataQuality === "high" ? "bg-apple-green/10 text-apple-green" :
            intelligence.dataQuality === "medium" ? "bg-apple-amber/10 text-apple-amber" :
            "bg-apple-gray/10 text-apple-gray"
          }`}>{intelligence.dataQuality} confidence</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        <p className="text-xs text-apple-gray leading-relaxed">{intelligence.overview}</p>

        {intelligence.painPoints.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1.5">Pain Points</p>
            <ul className="space-y-1">
              {intelligence.painPoints.map((p, i) => (
                <li key={i} className="text-xs text-apple-black flex items-start gap-1.5">
                  <span className="text-apple-red mt-0.5 flex-shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {intelligence.recentTriggers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1.5">Buying Triggers</p>
            <ul className="space-y-1">
              {intelligence.recentTriggers.map((t, i) => (
                <li key={i} className="text-xs text-apple-black flex items-start gap-1.5">
                  <span className="text-apple-green mt-0.5 flex-shrink-0">→</span>{t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {intelligence.idealContacts.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1.5">Ideal Contacts</p>
            <div className="space-y-1.5">
              {intelligence.idealContacts.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-apple-silver">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-apple-black truncate">{c.title}</p>
                    <p className="text-[10px] text-apple-gray truncate">{c.why}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    c.priority === "primary" ? "bg-apple-blue/10 text-apple-blue" : "bg-apple-gray/10 text-apple-gray"
                  }`}>{c.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pitch Strategy (collapsible) */}
        <div>
          <button onClick={() => setPitchOpen(v => !v)}
            className="flex items-center gap-1.5 w-full text-[10px] font-semibold text-apple-gray uppercase tracking-widest hover:text-apple-black transition-colors">
            Pitch Strategy
            <svg className={`w-3 h-3 transition-transform ${pitchOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {pitchOpen && (
            <div className="mt-2 space-y-2 animate-fadeIn">
              <div className="p-3 rounded-xl bg-apple-blue/5 border border-apple-blue/10">
                <p className="text-xs font-semibold text-apple-blue mb-0.5">Pitch Angle</p>
                <p className="text-xs text-apple-black">{strategy.pitchAngle}</p>
              </div>
              {strategy.valueProps.length > 0 && (
                <ul className="space-y-1">
                  {strategy.valueProps.map((v, i) => (
                    <li key={i} className="text-xs text-apple-black flex items-start gap-1.5">
                      <span className="text-apple-blue mt-0.5 flex-shrink-0">✓</span>{v}
                    </li>
                  ))}
                </ul>
              )}
              {strategy.cta && (
                <p className="text-xs text-apple-gray italic">{strategy.cta}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessagePanel({
  company,
  leadId,
  messages,
  onSaved,
}: {
  company: string;
  leadId: number | null;
  messages: OutreachMessages;
  onSaved: (id: number) => void;
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab]       = useState<MessageTab>("linkedin");
  const [edited, setEdited]             = useState<OutreachMessages>(messages);
  const [refineInput, setRefineInput]   = useState("");
  const [showCustom, setShowCustom]     = useState(false);
  const [refining, setRefining]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [savedId, setSavedId]           = useState<number | null>(null);
  const [refineCount, setRefineCount]   = useState<Record<string, number>>({});
  const originalMessages                = useRef<OutreachMessages>(messages);
  const textareaRef                     = useRef<HTMLTextAreaElement>(null);

  const tabCfg = TAB_CONFIG.find(t => t.key === activeTab)!;
  const currentMessage = edited[tabCfg.field];
  const originalMessage = originalMessages.current[tabCfg.field];
  const isEdited = currentMessage !== originalMessage;
  const charLimit = tabCfg.charLimit;

  async function handleRefine(instruction: string) {
    if (!currentMessage || refining) return;
    setRefining(true);
    const res = await fetch("/api/outreach/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: currentMessage, type: tabCfg.label, instruction }),
    });
    if (res.ok) {
      const data = await res.json() as { message: string };
      setEdited(prev => ({ ...prev, [tabCfg.field]: data.message }));
      setRefineCount(prev => ({ ...prev, [tabCfg.key]: (prev[tabCfg.key] ?? 0) + 1 }));
    } else {
      showToast("Refinement failed", "error");
    }
    setRefining(false);
    setRefineInput("");
    setShowCustom(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentMessage);
      showToast("Copied to clipboard");
    } catch {
      showToast("Could not copy", "error");
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      linkedinDm:     edited.linkedinDm,
      coldEmail:      edited.coldEmail,
      emailSubject:   edited.emailSubject,
      followupEmail:  edited.followupEmail,
      connectionNote: edited.connectionNote,
    };
    let targetId = leadId;
    if (targetId) {
      await fetch(`/api/leads/${targetId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      // Create a minimal lead record for this company
      const res = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, ...body }),
      });
      if (res.ok) {
        const data = await res.json() as { id: number };
        targetId = data.id;
      }
    }
    if (targetId) {
      setSavedId(targetId);
      onSaved(targetId);
      showToast("Outreach saved to lead");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] flex flex-col animate-fadeIn">
      {/* Tabs */}
      <div className="flex gap-0.5 p-1.5 border-b border-black/[0.04]">
        {TAB_CONFIG.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 text-xs font-semibold px-2 py-2 rounded-xl transition-colors ${
              activeTab === t.key ? "bg-apple-blue text-white" : "text-apple-gray hover:text-apple-black hover:bg-apple-silver"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Message area */}
      <div className="p-5 flex-1 space-y-3">
        {/* Subject line for email tab */}
        {activeTab === "email" && (
          <div>
            <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1">Subject</label>
            <input
              value={edited.emailSubject}
              onChange={e => setEdited(prev => ({ ...prev, emailSubject: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-xl bg-apple-silver border border-black/5 text-apple-black focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
            />
          </div>
        )}

        {/* Message textarea */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Message</label>
              {isEdited && (
                <button onClick={() => setEdited(prev => ({ ...prev, [tabCfg.field]: originalMessage }))}
                  className="text-[10px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors">
                  Revert to original ↩
                </button>
              )}
              {(refineCount[tabCfg.key] ?? 0) > 0 && (
                <span className="text-[10px] text-apple-gray">{refineCount[tabCfg.key]} refinement{refineCount[tabCfg.key] === 1 ? "" : "s"}</span>
              )}
            </div>
            {charLimit && (
              <span className={`text-[10px] font-semibold tabular-nums ${
                currentMessage.length > charLimit ? "text-apple-red" : currentMessage.length > charLimit * 0.85 ? "text-apple-amber" : "text-apple-gray"
              }`}>{currentMessage.length}/{charLimit}</span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={e => setEdited(prev => ({ ...prev, [tabCfg.field]: e.target.value }))}
            rows={activeTab === "email" || activeTab === "followup" ? 9 : 5}
            className="w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 resize-none leading-relaxed"
          />
        </div>

        {/* Quick refine */}
        <div>
          <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-2">Quick refine</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REFINE.map(q => (
              <button key={q.label} onClick={() => handleRefine(q.instruction)} disabled={refining}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-apple-silver text-apple-black hover:bg-apple-blue hover:text-white disabled:opacity-40 transition active:scale-95">
                {q.label}
              </button>
            ))}
            <button onClick={() => setShowCustom(v => !v)} disabled={refining}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-apple-silver text-apple-black hover:bg-apple-blue hover:text-white transition active:scale-95">
              Custom…
            </button>
          </div>

          {showCustom && (
            <div className="mt-2 flex gap-2 animate-fadeIn">
              <input
                value={refineInput}
                onChange={e => setRefineInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && refineInput.trim()) handleRefine(refineInput.trim()); }}
                placeholder="e.g. Add a stat about CRM adoption ROI…"
                className="flex-1 text-xs px-3 py-2 rounded-xl bg-apple-silver border border-black/5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
              />
              <button onClick={() => refineInput.trim() && handleRefine(refineInput.trim())} disabled={refining || !refineInput.trim()}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-apple-blue text-white hover:bg-apple-blue-hover disabled:opacity-40 transition active:scale-95">
                {refining ? "…" : "Refine"}
              </button>
            </div>
          )}

          {refining && (
            <div className="flex items-center gap-2 mt-2 text-xs text-apple-gray">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Refining…
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-black/[0.04] flex items-center justify-between gap-3">
        <button onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-apple-gray hover:text-apple-black transition-colors active:scale-95">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          Copy
        </button>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition active:scale-95 ${
            savedId
              ? "bg-apple-green/10 text-apple-green"
              : "bg-apple-blue text-white hover:bg-apple-blue-hover disabled:opacity-50"
          }`}>
          {saving ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Saving…
            </>
          ) : savedId ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Saved to Lead
            </>
          ) : "Save to Lead"}
        </button>
      </div>
    </div>
  );
}

export default function OutreachPage() {
  const { showToast } = useToast();

  const [company,      setCompany]      = useState("");
  const [messageStyle, setMessageStyle] = useState("");
  const [leadId,       setLeadId]       = useState<number | null>(null);
  const [leadHint,     setLeadHint]     = useState<{ industry?: string; employees?: string; trigger?: string; technologies?: string[] }>({});

  const [loading,      setLoading]      = useState(false);
  const [stage,        setStage]        = useState(0);
  const [error,        setError]        = useState("");
  const [intelligence, setIntelligence] = useState<CompanyIntelligence | null>(null);
  const [strategy,     setStrategy]     = useState<PitchStrategy | null>(null);
  const [messages,     setMessages]     = useState<OutreachMessages | null>(null);
  const [savedLeadId,  setSavedLeadId]  = useState<number | null>(null);

  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Read query params on mount (avoids useSearchParams + Suspense)
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const qCompany = params.get("company");
    const qLeadId  = params.get("leadId");
    if (qCompany) setCompany(decodeURIComponent(qCompany));
    if (qLeadId) {
      const id = parseInt(qLeadId);
      setLeadId(id);
      // Fetch existing lead data to pre-populate hints
      fetch(`/api/leads/${id}`).then(r => r.json()).then((lead: Record<string, unknown>) => {
        setLeadHint({
          industry:     lead.industry     as string | undefined,
          employees:    lead.employees    as string | undefined,
          trigger:      lead.trigger      as string | undefined,
          technologies: lead.technologies as string[] | undefined,
        });
      }).catch(() => {});
    }
  }, []);

  function clearStageTimers() {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  }

  async function handleResearch() {
    if (!company.trim()) return;
    setLoading(true);
    setStage(1);
    setError("");
    setIntelligence(null);
    setStrategy(null);
    setMessages(null);
    setSavedLeadId(null);

    // Simulate stage progression while API runs
    clearStageTimers();
    STAGE_DURATIONS.forEach((delay, i) => {
      stageTimers.current.push(setTimeout(() => setStage(i + 2), delay));
    });

    try {
      const res = await fetch("/api/outreach/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), messageStyle, ...leadHint }),
      });
      clearStageTimers();
      if (res.ok) {
        const data = await res.json() as { intelligence: CompanyIntelligence; strategy: PitchStrategy; messages: OutreachMessages };
        setIntelligence(data.intelligence);
        setStrategy(data.strategy);
        setMessages(data.messages);
        setStage(5);
        showToast("Research complete");
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Research failed.");
        setStage(0);
      }
    } catch {
      clearStageTimers();
      setError("Network error. Please try again.");
      setStage(0);
    } finally {
      setLoading(false);
    }
  }

  const showResults = intelligence && strategy && messages;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        keyStatus={{ anthropic: true, apollo: false, tavily: false, salesforce: false }}
        metrics={{ total: 0, hot: 0, verified: 0, avgScore: 0 }}
        onKeySave={() => {}}
        recentSearches={[] as SearchHistory[]}
        onRerunSearch={(_p: SearchParams) => {}}
      />

      <main className="ml-[260px] flex-1 px-8 py-10 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-apple-black tracking-tight">Research & Outreach</h2>
          <p className="text-apple-gray mt-1">Generate personalized Salesforce outreach for any company.</p>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Company Name</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !loading) handleResearch(); }}
                placeholder="e.g. Acme Corporation"
                className="w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Message Style (optional)</label>
              <input
                value={messageStyle}
                onChange={e => setMessageStyle(e.target.value)}
                placeholder="e.g. Casual and direct, reference their HubSpot migration"
                className="w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition"
              />
            </div>
          </div>

          {leadId && (
            <div className="mt-3 flex items-center gap-2 text-xs text-apple-blue">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Pre-filled from lead #{leadId} — existing data will enhance the analysis
            </div>
          )}

          {error && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red">{error}</div>
          )}

          <button
            onClick={handleResearch}
            disabled={loading || !company.trim()}
            className="mt-4 w-full bg-apple-blue hover:bg-apple-blue-hover disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl transition active:scale-95">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Researching…
              </span>
            ) : "Research & Generate Outreach"}
          </button>
        </div>

        {/* Pipeline progress */}
        {loading && stage > 0 && (
          <div className="mb-6">
            <StageIndicator stage={stage} />
          </div>
        )}

        {/* Results */}
        {showResults && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <IntelligenceCard intelligence={intelligence} strategy={strategy} />
            <MessagePanel
              company={company}
              leadId={leadId ?? savedLeadId}
              messages={messages}
              onSaved={setSavedLeadId}
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && !showResults && (
          <div className="mt-8 bg-white rounded-2xl shadow-card border border-black/[0.04] p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-apple-silver flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-apple-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-apple-black mb-1">Research a company</h3>
            <p className="text-sm text-apple-gray max-w-sm mx-auto">
              Enter a company name above. We&apos;ll research their profile and generate personalized LinkedIn DMs, cold emails, and follow-ups — ready to send.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {["Salesforce", "HubSpot", "Zendesk", "Veeva Systems", "Medallia"].map(name => (
                <button key={name} onClick={() => setCompany(name)}
                  className="text-sm px-4 py-2 rounded-full bg-apple-silver text-apple-black hover:bg-apple-blue hover:text-white transition active:scale-95">
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
