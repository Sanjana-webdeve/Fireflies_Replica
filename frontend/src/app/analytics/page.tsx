"use client";
import { useEffect, useState } from "react";
import { CheckSquare, Clock, FileText, Loader2, Video } from "lucide-react";
import { api } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { fmtDuration } from "@/lib/utils";
import Avatar from "@/components/Avatar";

export default function AnalyticsPage() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { api.stats().then(setS).catch(() => {}); }, []);
  if (!s) return <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;

  const maxDay = Math.max(1, ...s.per_day.map((d) => d.count));
  const maxSpk = Math.max(1, ...s.speakers.map((x) => x.seconds));
  const maxKw = Math.max(1, ...s.keywords.map((k) => k.count));
  const completion = s.open_actions + s.done_actions ? Math.round((s.done_actions / (s.open_actions + s.done_actions)) * 100) : 0;

  const cards = [
    { label: "Meetings", value: s.total_meetings, icon: Video },
    { label: "Meeting time", value: fmtDuration(s.total_seconds), icon: Clock },
    { label: "Words transcribed", value: s.total_words.toLocaleString(), icon: FileText },
    { label: "Task completion", value: `${completion}%`, icon: CheckSquare },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mb-6 text-sm text-slate-500">Insights across all of your conversations.</p>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30"><Icon className="h-5 w-5" /></span>
            <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Meetings — last 14 days</h2>
          <div className="flex h-44 items-end gap-1.5">
            {s.per_day.map((d) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${d.count}`}>
                <span className="mb-1 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">{d.count}</span>
                <div className="w-full rounded-t-md bg-brand-500/80 transition-all group-hover:bg-brand-600" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 6 : 2, opacity: d.count ? 1 : 0.25 }} />
                <span className="mt-1 text-[10px] text-slate-400">{new Date(d.date + "T00:00").getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Talk time by speaker</h2>
          <div className="space-y-3">
            {s.speakers.map((x) => (
              <div key={x.speaker} className="flex items-center gap-3">
                <Avatar name={x.speaker} size="sm" />
                <span className="w-32 truncate text-sm">{x.speaker}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(x.seconds / maxSpk) * 100}%` }} /></div>
                <span className="w-12 text-right text-xs text-slate-500">{Math.round(x.seconds / 60)}m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Trending topics</h2>
          <div className="flex flex-wrap gap-2">
            {s.keywords.map((k) => (
              <span key={k.word} className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                style={{ fontSize: `${12 + (k.count / maxKw) * 8}px` }}>{k.word}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}