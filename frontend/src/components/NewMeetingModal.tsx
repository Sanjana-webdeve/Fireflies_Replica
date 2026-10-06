"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "./ToastProvider";
import { api } from "@/lib/api";
import { cn, parseList } from "@/lib/utils";

const SAMPLE = `00:05 Alex Morgan: Thanks for joining the design review. Let's go through the new dashboard layout.
00:20 Jamie Lee: I like the cleaner sidebar, but the filters feel hidden on smaller screens.
00:42 Alex Morgan: Good point. I'll move the filters into a collapsible panel and share an updated mockup by Friday.
01:05 Chris Park: We should also decide on the chart library. I'll compare two options and report back next week.
01:30 Jamie Lee: Agreed. Let's launch the beta to internal users on the twentieth.`;

export default function NewMeetingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [people, setPeople] = useState("");
  const [tags, setTags] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDate(""); setPeople(""); setTags(""); setText(""); setFile(null); };

  async function submit() {
    setBusy(true);
    try {
      let created;
      if (mode === "paste") {
        if (!title.trim() || !text.trim()) throw new Error("Title and transcript are required");
        created = await api.createMeeting({
          title, date: date || undefined, participants: parseList(people), tags: parseList(tags), transcript: text, format: "txt",
        });
      } else {
        if (!file) throw new Error("Please choose a transcript file");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", title);
        fd.append("participants", people);
        fd.append("tags", tags);
        if (date) fd.append("date", date);
        created = await api.uploadMeeting(fd);
      }
      toast("Meeting created — AI notes generated ✨");
      reset();
      onClose();
      router.push(`/meetings/${created.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New meeting" size="lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}Create meeting
        </button>
      </>}>
      <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        {([["paste", "Paste transcript", FileText], ["upload", "Upload file", Upload]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setMode(id)}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 font-medium",
              mode === id ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500")}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Title {mode === "paste" && "*"}</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design review" />
        </div>
        <div><label className="label">Date & time</label><input type="datetime-local" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Tags (comma separated)</label><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="product, planning" /></div>
        <div className="sm:col-span-2"><label className="label">Participants (optional — detected from speakers)</label>
          <input className="input" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Alex Morgan, Jamie Lee" /></div>
      </div>

      {mode === "paste" ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className="label">Transcript *</label>
            <button className="mb-1 text-xs font-medium text-brand-600 hover:underline" onClick={() => { setText(SAMPLE); if (!title) setTitle("Design Review"); }}>Use sample</button>
          </div>
          <textarea className="input h-48 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"00:05 Speaker Name: What they said...\n00:20 Another Speaker: Reply..."} />
        </div>
      ) : (
        <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-500 dark:border-slate-700">
          <Upload className="mb-2 h-6 w-6 text-brand-500" />
          <span className="text-sm font-medium">{file ? file.name : "Choose a .txt, .vtt or .json transcript"}</span>
          <input type="file" accept=".txt,.vtt,.json" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </Modal>
  );
}