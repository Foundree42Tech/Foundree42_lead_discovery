"use client";
import { useState } from "react";

interface BulkActionBarProps {
  selectedIds:     Set<number>;
  onClearSelection: () => void;
  onStatusChange:  (status: string) => Promise<void>;
  onDelete:        () => Promise<void>;
  onSalesforcePush:() => Promise<void>;
  sfConnected:     boolean;
}

const STATUS_OPTIONS = [
  { value: "new",       label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "dead",      label: "Dead" },
];

export default function BulkActionBar({
  selectedIds, onClearSelection, onStatusChange, onDelete, onSalesforcePush, sfConnected,
}: BulkActionBarProps) {
  const [loading,         setLoading]         = useState<"status" | "delete" | "salesforce" | null>(null);
  const [statusVal,       setStatusVal]       = useState("contacted");
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [resultMsg,       setResultMsg]       = useState("");

  const count = selectedIds.size;

  async function handleStatus() {
    setLoading("status");
    setResultMsg("");
    await onStatusChange(statusVal);
    setLoading(null);
    setResultMsg(`${count} lead${count !== 1 ? "s" : ""} marked as ${statusVal}`);
    setTimeout(() => setResultMsg(""), 3000);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading("delete");
    setResultMsg("");
    await onDelete();
    setLoading(null);
    setConfirmDelete(false);
  }

  async function handleSF() {
    setLoading("salesforce");
    setResultMsg("");
    await onSalesforcePush();
    setLoading(null);
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 ml-[130px]">
      <div className="flex items-center gap-3 bg-apple-black text-white px-5 py-3 rounded-2xl shadow-2xl">
        {/* Count */}
        <span className="text-sm font-semibold whitespace-nowrap">
          {count} selected
        </span>

        <div className="w-px h-4 bg-white/20" />

        {/* Status change */}
        <div className="flex items-center gap-1.5">
          <select
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value)}
            className="text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            onClick={handleStatus}
            disabled={loading !== null}
            className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {loading === "status" ? "Updating…" : "Set status"}
          </button>
        </div>

        <div className="w-px h-4 bg-white/20" />

        {/* Salesforce push */}
        {sfConnected && (
          <button
            onClick={handleSF}
            disabled={loading !== null}
            className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {loading === "salesforce" ? "Pushing…" : "Push to SF"}
          </button>
        )}

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap ${
            confirmDelete ? "bg-apple-red hover:bg-apple-red/80" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {loading === "delete" ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete"}
        </button>

        {confirmDelete && (
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-white/60 hover:text-white/90">
            Cancel
          </button>
        )}

        <div className="w-px h-4 bg-white/20" />

        {/* Result message */}
        {resultMsg && <span className="text-xs text-apple-green font-medium">{resultMsg}</span>}

        {/* Clear */}
        <button onClick={onClearSelection} className="text-white/60 hover:text-white/90 transition-colors ml-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
