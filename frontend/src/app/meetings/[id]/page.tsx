"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ActionItem, MeetingDetail, Segment } from "@/lib/types";
import { clamp, fmtDateTime, fmtDuration } from "@/lib/utils";
import Player from "@/components/meeting/Player";
import Transcript from "@/components/meeting/Transcript";
import SummaryPanel from "@/components/meeting/SummaryPanel";
import EditMeetingModal from "@/components/EditMeetingModal";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/ToastProvider";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const meetingId = Number(id);
  const router = useRouter();
  const { toast } = useToast();

  const [m, setM] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    api.getMeeting(meetingId).then(setM).catch((e) => setError(e.message));
  }, [meetingId]);

  // deep link from global search: /meetings/1?t=120
  useEffect(() => {
    if (!m) return;
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (t > 0) setTime(clamp(t, 0, m.duration_seconds));
  }, [m?.id]); // eslint-disable-line

  // simulated playback clock
  const duration = m?.duration_seconds ?? 0;
  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => {
      setTime((t) => {
        const n = t + 0.25 * rate;
        if (n >= duration) { setPlaying(false); return duration; }
        return n;
      });
    }, 250);
    return () => clearInterval(h);
  }, [playing, rate, duration]);

  const seek = useCallback((t: number, play = true) => {
    setTime(clamp(t, 0, duration));
    if (play) setPlaying(true);
  }, [duration]);

  const patch = (p: Partial<MeetingDetail>) => setM((prev) => (prev ? { ...prev, ...p } : prev));

  const activeSegment = useMemo(() => {
    let a: Segment | undefined;
    for (const s of m?.segments ?? []) { if (s.start <= time) a = s; else break; }
    return a;
  }, [m?.segments, time]);

  if (error) return <div className="p-10 text-center"><p className="mb-3 text-slate-500">{error}</p><Link href="/" className="btn btn-primary">Back to meetings</Link></div>;
  if (!m) return <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;

  async function addComment(seg: Segment, text: string) {
    try {
      const c = await api.addComment(m!.id, { text, segment_id: seg.id });
      patch({ comments: [...m!.comments, c] });
      toast("Comment added");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function toggleHighlight(seg: Segment) {
    const existing = m!.highlights.find((h) => h.segment_id === seg.id);
    try {
      if (existing) {
        await api.deleteHighlight(existing.id);
        patch({ highlights: m!.highlights.filter((h) => h.id !== existing.id) });
        toast("Soundbite removed", "info");
      } else {
        const h = await api.addHighlight(m!.id, seg.id);
        patch({ highlights: [...m!.highlights, h].sort((a, b) => a.start - b.start) });
        toast("Soundbite saved");
      }
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function createTask(seg: Segment) {
    try {
      const a = await api.addActionItem(m!.id, { text: seg.text, assignee: seg.speaker, segment_id: seg.id });
      patch({ action_items: [...m!.action_items, a] });
      toast("Action item created from transcript");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function regenerate() {
    try {
      const fresh = await api.regenerate(m!.id);
      setM(fresh);
      toast("AI notes regenerated ✨");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function remove() {
    try { await api.deleteMeeting(m!.id); toast("Meeting deleted"); router.push("/"); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 lg:p-6">
      <div className="mb-5">
        <Link href="/" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All meetings</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{m.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{fmtDateTime(m.date)}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{fmtDuration(m.duration_seconds)}</span>
              <span>{m.platform}</span>
              <div className="flex -space-x-2">{m.participants.map((p) => <Avatar key={p.id} name={p.name} size="sm" />)}</div>
              {m.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button className="btn btn-secondary" onClick={() => setExportOpen(!exportOpen)}><Download className="h-4 w-4" />Export</button>
              {exportOpen && (
                <div className="card absolute right-0 z-20 mt-2 w-44 p-1 text-sm shadow-xl" onMouseLeave={() => setExportOpen(false)}>
                  {([["md", "Markdown (.md)"], ["txt", "Plain text (.txt)"], ["json", "JSON (.json)"]] as const).map(([f, label]) => (
                    <a key={f} href={api.exportUrl(m.id, f)} onClick={() => { setExportOpen(false); toast(`Exporting as ${f.toUpperCase()}…`, "info"); }}
                      className="block rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">{label}</a>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</button>
            <button className="btn btn-secondary text-red-600" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" />Delete</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <Player duration={duration} time={time} playing={playing} rate={rate} chapters={m.chapters} highlights={m.highlights}
            activeSegment={activeSegment} onToggle={() => setPlaying((p) => !p)} onSeek={(t) => seek(t, false)} onRate={setRate} />
          <Transcript segments={m.segments} time={time} comments={m.comments} highlights={m.highlights}
            onSeek={(t) => seek(t)} onComment={addComment}
            onDeleteComment={async (cid) => { try { await api.deleteComment(cid); patch({ comments: m.comments.filter((c) => c.id !== cid) }); toast("Comment deleted", "info"); } catch (e) { toast((e as Error).message, "error"); } }}
            onToggleHighlight={toggleHighlight} onCreateTask={createTask} />
        </div>
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <SummaryPanel meeting={m} time={time} onSeek={(t) => seek(t)}
            onActionItems={(items: ActionItem[]) => patch({ action_items: items })}
            onRegenerate={regenerate}
            onDeleteHighlight={async (hid) => { try { await api.deleteHighlight(hid); patch({ highlights: m.highlights.filter((h) => h.id !== hid) }); } catch (e) { toast((e as Error).message, "error"); } }} />
        </aside>
      </div>

      <EditMeetingModal open={editing} meeting={m} onClose={() => setEditing(false)} onSaved={(u) => setM(u)} />
      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete meeting?"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleting(false)}>Cancel</button><button className="btn btn-danger" onClick={remove}>Delete</button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">This permanently removes the transcript, summary, comments and action items.</p>
      </Modal>
    </div>
  );
}