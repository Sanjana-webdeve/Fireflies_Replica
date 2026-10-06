"use client";
import { useMemo } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { Chapter, Highlight, Segment } from "@/lib/types";
import { clamp, fmtClock } from "@/lib/utils";

interface Props {
  duration: number; time: number; playing: boolean; rate: number;
  chapters: Chapter[]; highlights: Highlight[]; activeSegment?: Segment;
  onToggle: () => void; onSeek: (t: number) => void; onRate: (r: number) => void;
}

const BARS = 90;

export default function Player({ duration, time, playing, rate, chapters, highlights, activeSegment, onToggle, onSeek, onRate }: Props) {
  const heights = useMemo(
    () => Array.from({ length: BARS }, (_, i) => 18 + Math.abs(Math.sin(i * 1.7) * 38 + Math.cos(i * 0.6) * 24)),
    []
  );
  const pct = duration ? (time / duration) * 100 : 0;
  const at = (t: number) => `${(t / (duration || 1)) * 100}%`;

  return (
    <div className="card overflow-hidden">
      <div className="relative bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 px-5 pb-4 pt-5 text-white">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-white/50">Audio preview (simulated playback)</p>

        <div className="flex h-24 cursor-pointer items-center gap-[3px]"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(clamp(((e.clientX - r.left) / r.width) * duration, 0, duration));
          }}>
          {heights.map((h, i) => (
            <div key={i} style={{ height: `${h}%` }}
              className={`flex-1 rounded-full transition-colors ${(i / BARS) * 100 < pct ? "bg-brand-300" : "bg-white/25"}`} />
          ))}
        </div>

        <div className="mt-3 min-h-[2.5rem] text-sm text-white/90">
          {activeSegment ? (
            <p className="line-clamp-2"><span className="font-semibold text-brand-200">{activeSegment.speaker}:</span> {activeSegment.text}</p>
          ) : (
            <p className="text-white/50">Press play or click the waveform to jump to a moment.</p>
          )}
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="relative">
          <input type="range" min={0} max={duration} step={0.1} value={time} onChange={(e) => onSeek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[#7137f0]" aria-label="Seek" />
          <div className="pointer-events-none absolute inset-x-0 -top-2 h-2">
            {chapters.map((c) => <span key={c.id} className="absolute h-2 w-0.5 bg-slate-400" style={{ left: at(c.start) }} title={c.title} />)}
            {highlights.map((h) => <span key={h.id} className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-amber-400" style={{ left: at(h.start) }} />)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onSeek(clamp(time - 10, 0, duration))} className="btn-ghost rounded-lg p-2" title="Back 10s"><SkipBack className="h-5 w-5" /></button>
          <button onClick={onToggle} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button onClick={() => onSeek(clamp(time + 10, 0, duration))} className="btn-ghost rounded-lg p-2" title="Forward 10s"><SkipForward className="h-5 w-5" /></button>
          <span className="ml-1 text-sm tabular-nums text-slate-500">{fmtClock(time)} / {fmtClock(duration)}</span>
          <select value={rate} onChange={(e) => onRate(Number(e.target.value))} className="ml-auto rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-sm dark:border-slate-700">
            {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}x</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}