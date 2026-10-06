"use client";
import { useState } from "react";
import { Bookmark, CheckSquare, Layers, Loader2, MessageCircle, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { ActionItem, MeetingDetail } from "@/lib/types";
import { cn, fmtClock } from "@/lib/utils";
import ActionItems from "./ActionItems";
import AskAI from "./AskAI";
import Avatar from "../Avatar";

interface Props {
  meeting: MeetingDetail; time: number;
  onSeek: (t: number) => void;
  onActionItems: (items: ActionItem[]) => void;
  onRegenerate: () => Promise<void>;
  onDeleteHighlight: (id: number) => void;
}

const TABS = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "outline", label: "Outline", icon: Layers },
  { id: "ask", label: "Ask AI", icon: MessageCircle },
] as const;

export default function SummaryPanel({ meeting: m, time, onSeek, onActionItems, onRegenerate, onDeleteHighlight }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("summary");
  const [busy, setBusy] = useState(false);
  const openTasks = m.action_items.filter((a) => !a.completed).length;
  const activeChapter = [...m.chapters].reverse().find((c) => c.start <= time);

  return (
    <div className="card flex h-[calc(100vh-8rem)] min-h-[480px] flex-col">
      <div className="flex border-b border-slate-200 px-2 dark:border-slate-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium transition sm:text-sm",
              tab === id ? "text-brand-600" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
            <Icon className="h-4 w-4" />{label}
            {id === "tasks" && openTasks > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{openTasks}</span>}
            {tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-brand-600" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "summary" && (
          <div className="space-y-5">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Overview</h3>
                <button className="btn-ghost flex items-center gap-1 rounded-lg px-2 py-1 text-xs" disabled={busy}
                  onClick={async () => { setBusy(true); await onRegenerate(); setBusy(false); }}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Regenerate
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{m.summary?.overview || "No summary yet."}</p>
            </section>

            {!!m.summary?.keywords.length && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Keywords</h3>
                <div className="flex flex-wrap gap-1.5">{m.summary.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
              </section>
            )}

            {!!m.summary?.bullets.length && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Key notes</h3>
                <ul className="space-y-2">
                  {m.summary.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{b}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold">Talk time</h3>
              <div className="space-y-2.5">
                {m.speaker_stats.map((s) => (
                  <div key={s.speaker} className="flex items-center gap-2.5">
                    <Avatar name={s.speaker} size="sm" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs"><span className="font-medium">{s.speaker}</span><span className="text-slate-500">{s.percent}% · {s.words} words</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${s.percent}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "tasks" && <ActionItems meeting={m} onChange={onActionItems} />}

        {tab === "outline" && (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Chapters</h3>
              {m.chapters.length === 0 && <p className="text-sm text-slate-500">No chapters.</p>}
              <ol className="relative space-y-1 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                {m.chapters.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => onSeek(c.start)} className={cn("w-full rounded-lg p-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800", activeChapter?.id === c.id && "bg-brand-50 dark:bg-brand-900/20")}>
                      <span className="text-xs font-semibold tabular-nums text-brand-600">{fmtClock(c.start)}</span>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.summary}</p>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Bookmark className="h-4 w-4 text-amber-500" />Soundbites</h3>
              {m.highlights.length === 0 && <p className="text-sm text-slate-500">Hover over a transcript line and click the bookmark to save a soundbite.</p>}
              <div className="space-y-2">
                {m.highlights.map((h) => (
                  <div key={h.id} className="group flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900/50 dark:bg-amber-900/10">
                    <button onClick={() => onSeek(h.start)} className="flex-1 text-left text-xs"><span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">{fmtClock(h.start)}</span> {h.label}</button>
                    <button onClick={() => onDeleteHighlight(h.id)} className="text-slate-400 opacity-0 hover:text-red-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "ask" && <AskAI meetingId={m.id} onSeek={onSeek} />}
      </div>
    </div>
  );
}