"use client";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ActionItem, MeetingDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "../ToastProvider";

interface Props { meeting: MeetingDetail; onChange: (items: ActionItem[]) => void }

export default function ActionItems({ meeting, onChange }: Props) {
  const { toast } = useToast();
  const items = meeting.action_items;
  const names = meeting.participants.map((p) => p.name);
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ text: "", assignee: "", due: "" });

  const done = items.filter((i) => i.completed).length;
  const replace = (u: ActionItem) => onChange(items.map((i) => (i.id === u.id ? { ...i, ...u } : i)));

  async function add() {
    if (!text.trim()) return;
    try {
      const created = await api.addActionItem(meeting.id, { text: text.trim(), assignee: assignee || null, due_date: due || null });
      onChange([...items, created]);
      setText(""); setAssignee(""); setDue("");
      toast("Action item added");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function toggle(i: ActionItem) {
    replace({ ...i, completed: !i.completed });
    try { await api.updateActionItem(i.id, { completed: !i.completed }); if (!i.completed) toast("Nice! Marked as complete"); }
    catch (e) { replace(i); toast((e as Error).message, "error"); }
  }

  async function saveEdit(i: ActionItem) {
    try {
      replace(await api.updateActionItem(i.id, { text: draft.text, assignee: draft.assignee || null, due_date: draft.due || null }));
      setEditing(null);
      toast("Action item updated");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function remove(i: ActionItem) {
    try { await api.deleteActionItem(i.id); onChange(items.filter((x) => x.id !== i.id)); toast("Action item deleted"); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{done} of {items.length} completed</span><span>{items.length ? Math.round((done / items.length) * 100) : 0}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <input className="input" placeholder="Add an action item…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <div className="flex gap-2">
          <input list="people" className="input" placeholder="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          <datalist id="people">{names.map((n) => <option key={n} value={n} />)}</datalist>
          <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          <button className="btn btn-primary px-3" onClick={add}><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      {items.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No action items yet.</p>}
      <ul className="space-y-2">
        {items.map((i) => {
          const overdue = !i.completed && i.due_date && new Date(i.due_date) < new Date(new Date().toDateString());
          return (
            <li key={i.id} className="group rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              {editing === i.id ? (
                <div className="space-y-2">
                  <input className="input" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
                  <div className="flex gap-2">
                    <input list="people" className="input" value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} placeholder="Assignee" />
                    <input type="date" className="input" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="btn btn-secondary px-3 py-1.5" onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
                    <button className="btn btn-primary px-3 py-1.5" onClick={() => saveEdit(i)}><Check className="h-4 w-4" />Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(i)} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                    i.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-brand-500 dark:border-slate-600")}>
                    {i.completed && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", i.completed && "text-slate-400 line-through")}>{i.text}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                      {i.assignee && <span className="chip">{i.assignee}</span>}
                      {i.due_date && <span className={cn("rounded-full px-2.5 py-0.5 font-medium", overdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                        {overdue ? "Overdue · " : "Due "}{new Date(i.due_date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button className="btn-ghost rounded p-1.5" onClick={() => { setEditing(i.id); setDraft({ text: i.text, assignee: i.assignee ?? "", due: i.due_date ?? "" }); }}><Pencil className="h-4 w-4" /></button>
                    <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}