"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, SearchX, X } from "lucide-react";
import { api } from "@/lib/api";
import type { MeetingListItem } from "@/lib/types";
import { dayLabel } from "@/lib/utils";
import MeetingRow from "@/components/MeetingRow";
import Modal from "@/components/Modal";
import { useToast } from "@/components/ToastProvider";
import { useUI } from "@/components/AppShell";

const EMPTY = { q: "", participant: "", tag: "", date_from: "", date_to: "", sort: "newest" };

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function LibraryPage() {
  const { toast } = useToast();
  const { openNewMeeting } = useUI();
  const [f, setF] = useState(EMPTY);
  const dq = useDebounce(f.q, 300);
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<MeetingListItem | null>(null);

  useEffect(() => {
    api.tags().then(setTags).catch(() => {});
    api.participants().then(setPeople).catch(() => {});
  }, []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.listMeetings({ ...f, q: dq })
      .then((d) => { if (!cancel) { setMeetings(d); setError(null); } })
      .catch((e) => !cancel && setError(e.message))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [dq, f.participant, f.tag, f.date_from, f.date_to, f.sort]); // eslint-disable-line

  const groups = useMemo(() => {
    if (f.sort === "longest") return [["Longest meetings", meetings]] as [string, MeetingListItem[]][];
    const g = new Map<string, MeetingListItem[]>();
    meetings.forEach((m) => { const k = dayLabel(m.date); g.set(k, [...(g.get(k) ?? []), m]); });
    return Array.from(g.entries());
  }, [meetings, f.sort]);

  const hasFilters = JSON.stringify(f) !== JSON.stringify(EMPTY);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteMeeting(toDelete.id);
      setMeetings((p) => p.filter((m) => m.id !== toDelete.id));
      toast(`Deleted “${toDelete.title}”`);
    } catch (e) { toast((e as Error).message, "error"); }
    setToDelete(null);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-slate-500">{loading ? "Loading…" : `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}</p>
        </div>
        <button className="btn btn-primary" onClick={openNewMeeting}><Plus className="h-4 w-4" />New meeting</button>
      </div>

      <div className="card mb-5 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search title, people, transcript…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <select className="input" value={f.participant} onChange={(e) => setF({ ...f, participant: e.target.value })}>
          <option value="">All participants</option>{people.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input" value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })}>
          <option value="">All tags</option>{tags.map((t) => <option key={t.name} value={t.name}>#{t.name} ({t.count})</option>)}
        </select>
        <input type="date" className="input" title="From" value={f.date_from} onChange={(e) => setF({ ...f, date_from: e.target.value })} />
        <input type="date" className="input" title="To" value={f.date_to} onChange={(e) => setF({ ...f, date_to: e.target.value })} />
        <select className="input" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="longest">Longest first</option>
        </select>
        {hasFilters && <button className="btn btn-ghost" onClick={() => setF(EMPTY)}><X className="h-4 w-4" />Clear</button>}
      </div>

      {error && <div className="card border-red-200 p-4 text-sm text-red-600">Could not reach the API: {error}. Is the backend running on port 8000?</div>}

      {loading && !meetings.length && <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>}

      {!loading && !error && meetings.length === 0 && (
        <div className="card flex flex-col items-center py-16 text-center">
          <SearchX className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold">{hasFilters ? "No meetings match your filters" : "No meetings yet"}</p>
          <p className="mt-1 text-sm text-slate-500">{hasFilters ? "Try adjusting your search." : "Create your first meeting from a transcript."}</p>
          {!hasFilters && <button className="btn btn-primary mt-4" onClick={openNewMeeting}><Plus className="h-4 w-4" />New meeting</button>}
        </div>
      )}

      <div className="space-y-5">
        {groups.map(([label, items]) => (
          <section key={label}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</h2>
            <div className="card overflow-hidden">{items.map((m) => <MeetingRow key={m.id} m={m} onDelete={() => setToDelete(m)} />)}</div>
          </section>
        ))}
      </div>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete meeting?"
        footer={<><button className="btn btn-secondary" onClick={() => setToDelete(null)}>Cancel</button><button className="btn btn-danger" onClick={confirmDelete}>Delete</button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">“{toDelete?.title}” and its transcript, summary and action items will be permanently deleted.</p>
      </Modal>
    </div>
  );
}