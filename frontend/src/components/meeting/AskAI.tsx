"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Source } from "@/lib/types";
import { cn, fmtClock } from "@/lib/utils";

interface Msg { role: "user" | "ai"; text: string; sources?: Source[] }
const SUGGESTIONS = ["Summarize this meeting", "What are the action items?", "What decisions were made?", "What risks were mentioned?"];

export default function AskAI({ meetingId, onSeek }: { meetingId: number; onSeek: (t: number) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); setBusy(true);
    try {
      const r = await api.ask(meetingId, question);
      setMsgs((m) => [...m, { role: "ai", text: r.answer, sources: r.sources }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", text: `Sorry, something went wrong: ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {msgs.length === 0 && (
          <div className="py-4 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40"><Sparkles className="h-6 w-6" /></span>
            <p className="text-sm font-medium">Ask anything about this meeting</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs hover:border-brand-500 hover:text-brand-600 dark:border-slate-700">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
            <div className={cn("max-w-[90%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800")}>
              {m.text}
              {!!m.sources?.length && (
                <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Sources</p>
                  {m.sources.map((s) => (
                    <button key={s.segment_id} onClick={() => onSeek(s.start)} className="block w-full rounded-lg bg-white p-2 text-left text-xs hover:bg-brand-50 dark:bg-slate-900 dark:hover:bg-slate-700">
                      <span className="font-semibold text-brand-600">{fmtClock(s.start)}</span> · {s.speaker}: <span className="line-clamp-2">{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
        <div ref={end} />
      </div>
      <div className="flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <input className="input" placeholder="Ask a question…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)} />
        <button className="btn btn-primary px-3" onClick={() => ask(q)} disabled={busy}><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}