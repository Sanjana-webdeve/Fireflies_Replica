"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "./ToastProvider";
import { api } from "@/lib/api";
import { parseList } from "@/lib/utils";
import type { MeetingDetail } from "@/lib/types";

interface Props { open: boolean; meeting: MeetingDetail; onClose: () => void; onSaved: (m: MeetingDetail) => void }

export default function EditMeetingModal({ open, meeting, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState(meeting.title);
  const [people, setPeople] = useState(meeting.participants.map((p) => p.name).join(", "));
  const [tags, setTags] = useState(meeting.tags.join(", "));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(meeting.title);
      setPeople(meeting.participants.map((p) => p.name).join(", "));
      setTags(meeting.tags.join(", "));
    }
  }, [open, meeting]);

  async function save() {
    if (!title.trim()) return toast("Title is required", "error");
    setBusy(true);
    try {
      onSaved(await api.updateMeeting(meeting.id, { title, participants: parseList(people), tags: parseList(tags) }));
      toast("Meeting updated");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit meeting"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><label className="label">Participants (comma separated)</label><input className="input" value={people} onChange={(e) => setPeople(e.target.value)} /></div>
        <div><label className="label">Tags (comma separated)</label><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
      </div>
    </Modal>
  );
}