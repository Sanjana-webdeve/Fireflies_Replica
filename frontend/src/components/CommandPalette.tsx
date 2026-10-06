"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, Video } from "lucide-react";
import { api } from "@/lib/api";
import type { SearchResults } from "@/lib/types";
import { fmtClock } from "@/lib/utils";
import HighlightText from "./HighlightText";

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(""); setRes(null); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    setLoading(true);
    const t = setTimeout(() => api.search(q.trim()).then(setRes).catch(() => setRes(null)).finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  const go = (path: string) => { onClose(); router.push(path); };
  const empty = res && !res.meetings.length && !res.segments.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meetings and transcripts…"
            className="h-14 flex-1 bg-transparent text-sm outline-none" />
          <kbd className="rounded border border-slate-300 px-1.5 text-[11px] text-slate-500 dark:border-slate-600">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!res && !loading && <p className="p-6 text-center text-sm text-slate-500">Type at least 2 characters to search across every transcript.</p>}
          {loading && <p className="p-6 text-center text-sm text-slate-500">Searching…</p>}
          {empty && <p className="p-6 text-center text-sm text-slate-500">No results for “{q}”.</p>}
          {res?.meetings.map((m) => (
            <button key={`m${m.id}`} onClick={() => go(`/meetings/${m.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
              <Video className="h-4 w-4 text-brand-500" /><span className="text-sm font-medium"><HighlightText text={m.title} query={q} /></span>
            </button>
          ))}
          {res?.segments.map((s) => (
            <button key={s.segment_id} onClick={() => go(`/meetings/${s.meeting_id}?t=${Math.floor(s.start)}`)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm"><HighlightText text={s.text} query={q} /></p>
                <p className="mt-0.5 text-xs text-slate-500">{s.meeting_title} · {s.speaker} · {fmtClock(s.start)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}