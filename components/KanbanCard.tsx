"use client";

export interface KanbanLead {
  id: number;
  company: string;
  industry: string | null;
  location: string | null;
  score: number | null;
  status: string;
  linkedinDm: string | null;
  dealValue: number | null;
  followUpAt: string | null;
  foundAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export default function KanbanCard({
  lead,
  onDragStart,
}: {
  lead: KanbanLead;
  onDragStart: (e: React.DragEvent, leadId: number) => void;
}) {
  const score = lead.score ?? 0;
  const scoreColor = score >= 80 ? "text-apple-green" : score >= 60 ? "text-apple-amber" : "text-apple-gray";
  const borderColor = score >= 80 ? "border-l-apple-green" : score >= 60 ? "border-l-apple-amber" : "border-l-apple-gray/30";

  const overdueFollowUp = lead.followUpAt && new Date(lead.followUpAt) < new Date();

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className={`bg-white rounded-xl border border-l-4 border-black/[0.06] ${borderColor} shadow-card hover:shadow-card-hover transition-all cursor-grab active:cursor-grabbing active:opacity-70 active:scale-[0.98] p-3 select-none`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-apple-black truncate">{lead.company}</p>
          <p className="text-[11px] text-apple-gray truncate mt-0.5">
            {[lead.industry, lead.location].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {score > 0 && <span className={`text-xs font-bold flex-shrink-0 tabular-nums ${scoreColor}`}>{score}</span>}
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {lead.dealValue && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-apple-silver text-apple-black">
            ${(lead.dealValue / 1000).toFixed(0)}k
          </span>
        )}
        {lead.linkedinDm && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-apple-green/10 text-apple-green">
            Outreach ready
          </span>
        )}
        {overdueFollowUp && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-apple-red/10 text-apple-red">
            Follow-up overdue
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[10px] text-apple-gray">{timeAgo(lead.foundAt)}</span>
        <a
          href={`/outreach?company=${encodeURIComponent(lead.company)}&leadId=${lead.id}`}
          onClick={e => e.stopPropagation()}
          className="text-[10px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors"
        >
          {lead.linkedinDm ? "View outreach →" : "Write outreach →"}
        </a>
      </div>
    </div>
  );
}
