"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ActionItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ToastProvider";

type Filter = "open" | "done" | "all";

export default function TasksPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ActionItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");

  useEffect(() => { api.listActionItems().then(setItems).catch((e) => toast(e.message, "error")); }, [toast]);

  async function toggle(i: ActionItem) {
    setItems((p) => p!.map((x) => (x.id === i.id ? { ...x, completed: !x.completed } : x)));
    try { await api.updateActionItem(i.id, { completed: !i.completed }); }
    catch (e) { setItems((p) => p!.map((x) => (x.id === i.id ? i : x))); toast((e as Error).message, "error"); }
  }

  const shown = (items ?? []).filter((i) => filter === "all" || (filter === "done") === i.completed);
  const today = new Date(new Date().toDateString());

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <p className="mb-5 text-sm text-slate-500">Action items from all of your meetings.</p>

      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        {(["open", "done", "all"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-4 py-1.5 font-medium capitalize", filter === f ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500")}>
            {f === "done" ? "Completed" : f}
          </button>
        ))}
      </div>

      {!items && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>}
      {items && shown.length === 0 && <div className="card py-14 text-center text-sm text-slate-500">Nothing here. 🎉</div>}
      <div className="card overflow-hidden">
        {shown.map((i) => {
          const overdue = !i.completed && i.due_date && new Date(i.due_date + "T00:00") < today;
          return (
            <div key={i.id} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0 dark:border-slate-800">
              <button onClick={() => toggle(i)} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                i.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-brand-500 dark:border-slate-600")}>
                {i.completed && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", i.completed && "text-slate-400 line-through")}>{i.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {i.assignee && <span className="chip">{i.assignee}</span>}
                  <Link href={`/meetings/${i.meeting_id}`} className="hover:text-brand-600 hover:underline">{i.meeting_title}</Link>
                </div>
              </div>
              {i.due_date && (
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", overdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                  {new Date(i.due_date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}