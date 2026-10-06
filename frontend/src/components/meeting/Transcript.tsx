"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, ChevronDown, ChevronUp, ListTodo, MessageSquare, Search, Send, Trash2 } from "lucide-react";
import type { Comment, Highlight, Segment } from "@/lib/types";
import { cn, fmtClock } from "@/lib/utils";
import Avatar from "../Avatar";
import HighlightText from "../HighlightText";

interface Props {
  segments: Segment[]; time: number; comments: Comment[]; highlights: Highlight[];
  onSeek: (t: number) => void;
  onComment: (seg: Segment, text: string) => Promise<void>;
  onDeleteComment: (id: number) => void;
  onToggleHighlight: (seg: Segment) => void;
  onCreateTask: (seg: Segment) => void;
}

export default function Transcript(p: Props) {
  const [query, setQuery] = useState("");
  const [cur, setCur] = useState(0);
  const [follow, setFollow] = useState(true);
  const [speaker, setSpeaker] = useState("all");
  const [composer, setComposer] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  const speakers = useMemo(() => Array.from(new Set(p.segments.map((s) => s.speaker))), [p.segments]);
  const visible = useMemo(() => p.segments.filter((s) => speaker === "all" || s.speaker === speaker), [p.segments, speaker]);
  const matches = useMemo(
    () => (query.trim() ? visible.filter((s) => s.text.toLowerCase().includes(query.trim().toLowerCase())).map((s) => s.id) : []),
    [visible, query]
  );
  const activeId = useMemo(() => {
    let a = -1;
    for (const s of p.segments) { if (s.start <= p.time) a = s.id; else break; }
    return a;
  }, [p.segments, p.time]);

  const scrollTo = (id: number) => {
    const el = refs.current[id], c = box.current;
    if (el && c) c.scrollTo({ top: el.offsetTop - c.clientHeight / 3, behavior: "smooth" });
  };

  useEffect(() => { if (follow && !query && activeId >= 0) scrollTo(activeId); }, [activeId]); // eslint-disable-line
  useEffect(() => { if (matches.length) scrollTo(matches[Math.min(cur, matches.length - 1)]); }, [cur, matches]); // eslint-disable-line

  const currentMatch = matches[Math.min(cur, matches.length - 1)];
  const step = (d: number) => matches.length && setCur((c) => (c + d + matches.length) % matches.length);

  async function send(seg: Segment) {
    if (!draft.trim()) return;
    await p.onComment(seg, draft.trim());
    setDraft(""); setComposer(null);
  }

  return (
    <div className="card flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setCur(0); }}
            onKeyDown={(e) => e.key === "Enter" && step(e.shiftKey ? -1 : 1)}
            placeholder="Search in transcript…" className="input pl-9" />
        </div>
        {query.trim() && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>{matches.length ? `${Math.min(cur, matches.length - 1) + 1}/${matches.length}` : "0 results"}</span>
            <button className="btn-ghost rounded p-1" onClick={() => step(-1)}><ChevronUp className="h-4 w-4" /></button>
            <button className="btn-ghost rounded p-1" onClick={() => step(1)}><ChevronDown className="h-4 w-4" /></button>
          </div>
        )}
        <select value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="input w-auto">
          <option value="all">All speakers</option>
          {speakers.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-[#7137f0]" />Follow along
        </label>
      </div>

      <div ref={box} className="relative max-h-[58vh] overflow-y-auto p-2">
        {visible.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No transcript lines.</p>}
        {visible.map((s) => {
          const hl = p.highlights.find((h) => h.segment_id === s.id);
          const cm = p.comments.filter((c) => c.segment_id === s.id);
          return (
            <div key={s.id} ref={(el) => { refs.current[s.id] = el; }}
              className={cn("group relative rounded-lg px-3 py-2.5 transition",
                s.id === activeId ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                s.id === currentMatch && "ring-2 ring-amber-400")}>
              <div className="flex gap-3">
                <Avatar name={s.speaker} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">{s.speaker}</span>
                    <button onClick={() => p.onSeek(s.start)} className="tabular-nums text-brand-600 hover:underline">{fmtClock(s.start)}</button>
                    {hl && <Bookmark className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                  </div>
                  <p onClick={() => p.onSeek(s.start)} className="mt-0.5 cursor-pointer text-sm leading-relaxed">
                    <HighlightText text={s.text} query={query} />
                  </p>

                  {cm.map((c) => (
                    <div key={c.id} className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-900/20">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
                      <p className="flex-1"><b>{c.author}:</b> {c.text}</p>
                      <button onClick={() => p.onDeleteComment(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}

                  {composer === s.id && (
                    <div className="mt-2 flex gap-2">
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(s)}
                        placeholder="Add a comment…" className="input py-1.5" />
                      <button onClick={() => send(s)} className="btn btn-primary px-3"><Send className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute right-2 top-2 hidden gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm group-hover:flex dark:border-slate-700 dark:bg-slate-800">
                <button title="Comment" onClick={() => { setComposer(composer === s.id ? null : s.id); setDraft(""); }} className="btn-ghost rounded p-1.5"><MessageSquare className="h-4 w-4" /></button>
                <button title={hl ? "Remove soundbite" : "Save soundbite"} onClick={() => p.onToggleHighlight(s)} className="btn-ghost rounded p-1.5"><Bookmark className={cn("h-4 w-4", hl && "fill-amber-400 text-amber-400")} /></button>
                <button title="Create action item" onClick={() => p.onCreateTask(s)} className="btn-ghost rounded p-1.5"><ListTodo className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}