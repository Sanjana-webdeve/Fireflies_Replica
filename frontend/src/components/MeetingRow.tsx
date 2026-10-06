"use client";
import { useRouter } from "next/navigation";
import { CheckSquare, Clock, Trash2, Video } from "lucide-react";
import type { MeetingListItem } from "@/lib/types";
import { fmtDuration, fmtTime } from "@/lib/utils";
import Avatar from "./Avatar";

export default function MeetingRow({ m, onDelete }: { m: MeetingListItem; onDelete: () => void }) {
  const router = useRouter();
  const shown = m.participants.slice(0, 4);
  const extra = m.participants.length - shown.length;

  return (
    <div onClick={() => router.push(`/meetings/${m.id}`)}
      className="group flex cursor-pointer flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
          <Video className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:text-brand-600">{m.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{m.overview || "No summary available"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{fmtTime(m.date)}</span>·<span>{m.platform}</span>
            {m.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 md:w-[430px] md:justify-end">
        <div className="flex -space-x-2">
          {shown.map((p) => <Avatar key={p} name={p} size="sm" />)}
          {extra > 0 && <span className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold dark:bg-slate-700">+{extra}</span>}
        </div>
        <span className="flex w-20 items-center gap-1 text-sm text-slate-500"><Clock className="h-4 w-4" />{fmtDuration(m.duration_seconds)}</span>
        <span className="flex w-16 items-center gap-1 text-sm text-slate-500" title="Completed / total action items">
          <CheckSquare className="h-4 w-4" />{m.total_actions - m.open_actions}/{m.total_actions}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20" aria-label="Delete meeting">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}