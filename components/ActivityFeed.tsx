"use client";
import { useState, useEffect } from "react";

interface Activity { id: number; type: string; description: string; createdAt: string; }

const TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  discovered:      { color: "bg-apple-blue",  icon: <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg> },
  status_changed:  { color: "bg-apple-amber", icon: <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg> },
  outreach_written:{ color: "bg-apple-green", icon: <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg> },
  sf_pushed:       { color: "bg-apple-blue",  icon: <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg> },
  note_saved:      { color: "bg-apple-gray",  icon: <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/></svg> },
  researched:      { color: "bg-apple-green", icon: <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg> },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function ActivityFeed({ leadId }: { leadId: number }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/activity?leadId=${leadId}`)
      .then(r => r.json())
      .then((data: Activity[]) => { setActivities(Array.isArray(data) ? data : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [leadId]);

  if (!loaded) return null;
  if (activities.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-3">Activity</p>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-black/[0.06]" />
        <div className="space-y-3">
          {activities.slice(0, 8).map(a => {
            const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.note_saved;
            return (
              <div key={a.id} className="flex items-start gap-3 pl-0.5">
                <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${cfg.color} text-white flex items-center justify-center`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs text-apple-black leading-snug">{a.description}</p>
                  <p className="text-[10px] text-apple-gray mt-0.5">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
