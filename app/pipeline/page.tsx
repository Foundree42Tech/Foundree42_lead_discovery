"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar, { SearchParams, SearchHistory } from "@/components/Sidebar";
import KanbanCard, { KanbanLead } from "@/components/KanbanCard";
import { useToast } from "@/components/Toast";

type Status = "new" | "contacted" | "qualified" | "won" | "dead";

const COLUMNS: { key: Status; label: string; color: string; headerColor: string }[] = [
  { key: "new",       label: "New",       color: "bg-apple-gray/5",   headerColor: "text-apple-gray" },
  { key: "contacted", label: "Contacted", color: "bg-apple-blue/5",   headerColor: "text-apple-blue" },
  { key: "qualified", label: "Qualified", color: "bg-apple-green/5",  headerColor: "text-apple-green" },
  { key: "won",       label: "Won",       color: "bg-apple-blue/5",   headerColor: "text-apple-blue" },
];

function formatPipeline(leads: KanbanLead[]): string {
  const total = leads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  if (!total) return "";
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000)     return `$${(total / 1_000).toFixed(0)}k`;
  return `$${total}`;
}

export default function PipelinePage() {
  const { showToast } = useToast();
  const [board, setBoard] = useState<Record<Status, KanbanLead[]>>({
    new: [], contacted: [], qualified: [], won: [], dead: [],
  });
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId]   = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);
  const dragRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/leads/kanban")
      .then(r => r.json())
      .then((data: Record<Status, KanbanLead[]>) => {
        setBoard(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function onDragStart(e: React.DragEvent, leadId: number) {
    dragRef.current = leadId;
    setDragId(leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, status: Status) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(status);
  }

  function onDragLeave() {
    setDropTarget(null);
  }

  async function onDrop(e: React.DragEvent, newStatus: Status) {
    e.preventDefault();
    setDropTarget(null);
    const leadId = dragRef.current;
    if (!leadId) return;

    // Find which column the lead came from
    let fromStatus: Status | null = null;
    let movedLead: KanbanLead | null = null;
    for (const [status, leads] of Object.entries(board)) {
      const found = leads.find(l => l.id === leadId);
      if (found) { fromStatus = status as Status; movedLead = found; break; }
    }
    if (!fromStatus || !movedLead || fromStatus === newStatus) { setDragId(null); return; }

    // Optimistic update
    setBoard(prev => {
      const next = { ...prev };
      next[fromStatus!] = prev[fromStatus!].filter(l => l.id !== leadId);
      next[newStatus]   = [{ ...movedLead!, status: newStatus }, ...prev[newStatus]];
      return next;
    });
    setDragId(null);

    // Persist
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      // Rollback
      setBoard(prev => {
        const next = { ...prev };
        next[newStatus] = prev[newStatus].filter(l => l.id !== leadId);
        next[fromStatus!] = [movedLead!, ...prev[fromStatus!]];
        return next;
      });
      showToast("Failed to update status", "error");
    } else {
      showToast(`Moved to ${newStatus}`);
    }
  }

  const deadLeads = board.dead ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        keyStatus={{ anthropic: false, apollo: false, tavily: false, salesforce: false }}
        metrics={{ total: 0, hot: 0, verified: 0, avgScore: 0 }}
        onKeySave={() => {}}
        recentSearches={[] as SearchHistory[]}
        onRerunSearch={(_p: SearchParams) => {}}
      />

      <main className="ml-[260px] flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-8 py-8 border-b border-black/[0.04]">
          <h2 className="text-3xl font-bold text-apple-black tracking-tight">Pipeline</h2>
          <p className="text-apple-gray mt-1">Drag leads between stages as your deals progress.</p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <svg className="w-8 h-8 text-apple-gray animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 px-6 py-6 overflow-x-auto">
            {COLUMNS.map(col => {
              const leads = board[col.key] ?? [];
              const pipeline = formatPipeline(leads);
              const isDropTarget = dropTarget === col.key;
              return (
                <div
                  key={col.key}
                  className="flex-shrink-0 w-72 flex flex-col"
                  onDragOver={e => onDragOver(e, col.key)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between mb-3 px-1`}>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${col.headerColor}`}>{col.label}</h3>
                      <span className="text-[11px] font-semibold text-apple-gray bg-apple-silver px-2 py-0.5 rounded-full">
                        {leads.length}
                      </span>
                    </div>
                    {pipeline && <span className="text-[11px] font-semibold text-apple-gray">{pipeline}</span>}
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`flex-1 rounded-2xl p-2 transition-colors min-h-[200px] ${col.color} ${
                      isDropTarget ? "ring-2 ring-apple-blue ring-dashed bg-apple-blue/10" : ""
                    }`}
                  >
                    {leads.length === 0 ? (
                      <div className={`h-full flex items-center justify-center ${isDropTarget ? "opacity-100" : "opacity-0"} transition-opacity`}>
                        <p className="text-xs text-apple-blue font-medium">Drop here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leads.map(lead => (
                          <div key={lead.id} className={dragId === lead.id ? "opacity-40" : ""}>
                            <KanbanCard lead={lead} onDragStart={onDragStart} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Dead column — collapsed */}
            <div className="flex-shrink-0 w-52 flex flex-col">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-sm font-semibold text-apple-red/60">Dead</h3>
                <span className="text-[11px] font-semibold text-apple-gray bg-apple-silver px-2 py-0.5 rounded-full">
                  {deadLeads.length}
                </span>
              </div>
              <div
                className="flex-1 rounded-2xl p-2 bg-apple-red/5 min-h-[200px] transition-colors"
                onDragOver={e => onDragOver(e, "dead")}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, "dead")}
              >
                <div className={`space-y-2 ${dropTarget === "dead" ? "ring-2 ring-apple-red ring-dashed rounded-xl" : ""}`}>
                  {deadLeads.slice(0, 5).map(lead => (
                    <div key={lead.id} className="opacity-60">
                      <KanbanCard lead={lead} onDragStart={onDragStart} />
                    </div>
                  ))}
                  {deadLeads.length > 5 && (
                    <p className="text-[10px] text-apple-gray text-center py-2">+{deadLeads.length - 5} more</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
