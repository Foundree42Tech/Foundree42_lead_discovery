"use client";
import { useState, useRef, useEffect } from "react";
import ContactCard from "./ContactCard";
import ActivityFeed from "./ActivityFeed";
import { useToast } from "./Toast";

interface TargetRoles { primary: string[]; secondary: string[]; note: string; }
interface Contact { name: string; title: string; email: string; linkedin: string; }

export interface LeadData {
  id: number;
  company: string;
  industry: string | null;
  employees: string | null;
  revenue: string | null;
  location: string | null;
  score: number | null;
  icp: string | null;
  whyFit: string | null;
  trigger: string | null;
  source: string | null;
  verified: boolean;
  contacts: unknown;
  technologies: unknown;
  newsSignals: unknown;
  targetRoles: unknown;
  foundAt: string;
  status: string;
  notes: string | null;
  sfLeadId: string | null;
  linkedinDm: string | null;
}

const STATUS_OPTIONS = [
  { value: "new",       label: "New",       color: "bg-apple-gray/10 text-apple-gray" },
  { value: "contacted", label: "Contacted", color: "bg-apple-blue/10 text-apple-blue" },
  { value: "qualified", label: "Qualified", color: "bg-apple-green/10 text-apple-green" },
  { value: "dead",      label: "Dead",      color: "bg-apple-red/10 text-apple-red" },
];

function ScoreBadge({ score, whyFit, trigger, icp }: { score: number; whyFit?: string | null; trigger?: string | null; icp?: string | null }) {
  const color = score >= 80 ? "bg-apple-green/10 text-apple-green" : score >= 60 ? "bg-apple-amber/10 text-apple-amber" : "bg-apple-gray/10 text-apple-gray";
  const label = score >= 80 ? "Hot" : score >= 60 ? "Warm" : "Cold";
  const dot   = score >= 80 ? "bg-apple-green" : score >= 60 ? "bg-apple-amber" : "bg-apple-gray";
  const hasDetail = whyFit || trigger || icp;
  return (
    <div className={`relative group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-default ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {score}/100 · {label}
      {hasDetail && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-neutral-900 text-white text-xs rounded-xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Score</span>
            <span className={`font-bold ${score >= 80 ? "text-apple-green" : score >= 60 ? "text-apple-amber" : "text-apple-gray"}`}>{score}/100</span>
          </div>
          {icp && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">ICP</span>
              <span className="font-medium">{icp}</span>
            </div>
          )}
          {whyFit && (
            <div>
              <span className="text-white/60 block">Why fit</span>
              <span className="text-white/90 leading-snug">{whyFit}</span>
            </div>
          )}
          {trigger && (
            <div>
              <span className="text-white/60 block">Signal</span>
              <span className="text-white/90 leading-snug">{trigger}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeadCard({ lead: initialLead, defaultOpen, onDelete, selected, onToggleSelect }: {
  lead: LeadData; defaultOpen?: boolean; onDelete?: (id: number) => void;
  selected?: boolean; onToggleSelect?: () => void;
}) {
  const { showToast } = useToast();
  const [lead, setLead]       = useState(initialLead);
  const [open, setOpen]       = useState(defaultOpen ?? false);
  const [sfLoading, setSfLoading] = useState(false);
  const [sfError, setSfError] = useState("");
  const [findingPeople, setFindingPeople] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (notesTimer.current) clearTimeout(notesTimer.current); }, []);

  const score       = lead.score ?? 0;
  const borderColor = score >= 80 ? "border-l-apple-green" : score >= 60 ? "border-l-apple-amber" : "border-l-apple-gray/30";
  const contacts    = (lead.contacts    ?? []) as Contact[];
  const technologies= (lead.technologies?? []) as string[];
  const newsSignals = (lead.newsSignals ?? []) as string[];
  const targetRoles = lead.targetRoles as TargetRoles | null;
  const statusMeta  = STATUS_OPTIONS.find((s) => s.value === lead.status) ?? STATUS_OPTIONS[0];

  async function updateField(data: { status?: string; notes?: string }) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setLead((l) => ({ ...l, ...updated }));
    }
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value;
    setLead((l) => ({ ...l, status }));
    updateField({ status });
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const notes = e.target.value;
    setLead((l) => ({ ...l, notes }));
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => { updateField({ notes }); showToast("Note saved", "info"); }, 800);
  }

  async function handleFindPeople() {
    setFindingPeople(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/contacts`, { method: "POST" });
      const data = await res.json() as { contacts?: Contact[]; error?: string; message?: string };
      if (res.ok && data.contacts && data.contacts.length > 0) {
        setLead((l) => ({ ...l, contacts: data.contacts as unknown }));
        showToast(`Found ${data.contacts.length} contact${data.contacts.length !== 1 ? "s" : ""}`, "success");
      } else {
        showToast(data.error ?? data.message ?? "No contacts found", "info");
      }
    } catch {
      showToast("Failed to find people", "error");
    }
    setFindingPeople(false);
  }

  async function handleSalesforcePush() {
    setSfLoading(true);
    setSfError("");
    const res = await fetch(`/api/leads/${lead.id}/salesforce`, { method: "POST" });
    const data = await res.json() as { sfLeadId?: string; error?: string; alreadyPushed?: boolean };
    if (res.ok && data.sfLeadId) {
      setLead((l) => ({ ...l, sfLeadId: data.sfLeadId! }));
    } else {
      setSfError(data.error ?? "Push failed.");
    }
    setSfLoading(false);
  }

  return (
    <div className={`bg-white rounded-2xl shadow-card transition-shadow hover:shadow-card-hover border border-l-4 ${borderColor} ${selected ? "border-apple-blue/40 ring-1 ring-apple-blue/20" : "border-black/[0.04]"}`}>
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        {onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${
              selected ? "bg-apple-blue border-apple-blue" : "border-black/20 hover:border-apple-blue/60"
            }`}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
        <button className="flex items-center gap-4 min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-apple-silver flex items-center justify-center">
            <span className="text-sm font-bold text-apple-black">{lead.company[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-apple-black truncate">{lead.company}</p>
            <p className="text-xs text-apple-gray truncate">{[lead.industry, lead.location].filter(Boolean).join(" · ")}</p>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreBadge score={score} whyFit={lead.whyFit} trigger={lead.trigger} icp={lead.icp} />
          {/* Status dropdown */}
          <select
            value={lead.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue/30 ${statusMeta.color}`}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setOpen((v) => !v)} className="p-1">
            <svg className={`w-4 h-4 text-apple-gray transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="px-6 pb-6 border-t border-black/[0.04] animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1">Why They Fit</p>
                <p className="text-sm text-apple-black">{lead.whyFit || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1">Buying Signal</p>
                <p className="text-sm text-apple-black">{lead.trigger || "—"}</p>
              </div>
              {technologies.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1.5">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.slice(0, 5).map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-apple-silver text-apple-black">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {newsSignals.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1">News</p>
                  {newsSignals.map((n, i) => <p key={i} className="text-xs text-apple-gray">— {n}</p>)}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Employees", val: lead.employees, hint: null },
                  { label: "Revenue",   val: lead.revenue,   hint: null },
                  { label: "ICP",       val: lead.icp,       hint: "Ideal Customer Profile — how well this company matches Foundree42's target buyer (industry, size, CRM maturity, and buying signals). Higher tiers are a closer fit." },
                  { label: "Source",    val: lead.source,    hint: null },
                ].map(({ label, val, hint }) => (
                  <div key={label} className="relative group bg-apple-silver rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest flex items-center gap-1">
                      {label}
                      {hint && (
                        <svg className="w-3 h-3 text-apple-gray/70" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      )}
                    </p>
                    <p className="text-sm font-medium text-apple-black mt-0.5 truncate">{val || "—"}</p>
                    {hint && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-neutral-900 text-white text-[11px] leading-snug rounded-xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        {hint}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-1.5">Notes</p>
                <textarea
                  value={lead.notes ?? ""}
                  onChange={handleNotesChange}
                  placeholder="Add call notes, follow-up reminders…"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest">Who to Contact</p>
              <button
                onClick={handleFindPeople}
                disabled={findingPeople}
                className="flex items-center gap-1.5 text-xs font-medium text-apple-blue hover:text-apple-blue-hover disabled:opacity-50 transition-colors"
              >
                {findingPeople ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                )}
                {findingPeople ? "Finding…" : contacts.length > 0 ? "Refresh people" : "Find people"}
              </button>
            </div>
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((c, i) => <ContactCard key={i} contact={c} isPrimary={i === 0} />)}
              </div>
            ) : targetRoles ? (
              <div className="space-y-2">
                <p className="text-xs text-apple-gray italic mb-2">{targetRoles.note}</p>
                {[...targetRoles.primary, ...targetRoles.secondary].slice(0, 4).map((role, idx) => {
                  const liUrl = `https://www.linkedin.com/search/results/people/?keywords=` + encodeURIComponent(`${role} ${lead.company}`);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-apple-silver border border-black/5">
                      <div>
                        <p className="text-sm font-medium text-apple-black">{role}</p>
                        <p className="text-[10px] text-apple-gray">{idx < targetRoles.primary.length ? "Primary" : "Secondary"}</p>
                      </div>
                      <a href={liUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-apple-blue hover:text-apple-blue-hover transition-colors flex-shrink-0">
                        Search LinkedIn →
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-apple-gray">No contact data available.</p>
            )}
          </div>

          <ActivityFeed leadId={lead.id} />

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {lead.sfLeadId ? (
                <span className="text-xs font-medium text-apple-green flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  In Salesforce
                </span>
              ) : (
                <button onClick={handleSalesforcePush} disabled={sfLoading}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-apple-blue hover:bg-apple-blue-hover disabled:opacity-50 px-3 py-1.5 rounded-lg transition active:scale-95">
                  {sfLoading ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : null}
                  Push to Salesforce
                </button>
              )}
              {/* Outreach link */}
              <a
                href={`/outreach?company=${encodeURIComponent(lead.company)}&leadId=${lead.id}`}
                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition active:scale-95 ${
                  lead.linkedinDm
                    ? "bg-apple-green/10 text-apple-green hover:bg-apple-green/20"
                    : "bg-apple-silver text-apple-black hover:bg-black/8"
                }`}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                {lead.linkedinDm ? "Outreach Written" : "Write Outreach"}
              </a>
              {sfError && <p className="text-xs text-apple-red">{sfError}</p>}
            </div>
            {onDelete && (
              <button onClick={() => onDelete(lead.id)} className="text-xs text-apple-red hover:opacity-70 transition-opacity">
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
