import json
import re

from ..models import Meeting


def clock(sec: float) -> str:
    s = int(sec)
    h, m, r = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{r:02d}" if h else f"{m}:{r:02d}"


def export_meeting(m: Meeting, fmt: str) -> tuple[str, str, str]:
    """Returns (content, media_type, filename)."""
    slug = re.sub(r"[^a-z0-9]+", "-", m.title.lower()).strip("-") or "meeting"
    people = ", ".join(p.name for p in m.participants)

    if fmt == "json":
        data = {
            "title": m.title, "date": m.date.isoformat(), "duration_seconds": m.duration_seconds,
            "participants": [p.name for p in m.participants], "tags": [t.name for t in m.tags],
            "summary": {"overview": m.summary.overview, "bullets": m.summary.bullets,
                        "keywords": m.summary.keywords} if m.summary else None,
            "action_items": [{"text": a.text, "assignee": a.assignee,
                              "due_date": a.due_date.isoformat() if a.due_date else None,
                              "completed": a.completed} for a in m.action_items],
            "chapters": [{"title": c.title, "start": c.start, "summary": c.summary} for c in m.chapters],
            "transcript": [{"speaker": s.speaker, "start": s.start, "end": s.end, "text": s.text}
                           for s in m.segments],
        }
        return json.dumps(data, indent=2), "application/json", f"{slug}.json"

    md = fmt == "md"
    h1, h2 = ("# ", "## ") if md else ("", "")
    out = [f"{h1}{m.title}", "", f"Date: {m.date:%b %d, %Y %H:%M}", f"Participants: {people}", ""]
    if m.summary:
        out += [f"{h2}Overview", m.summary.overview, ""]
        if m.summary.bullets:
            out += [f"{h2}Notes"] + [f"- {b}" for b in m.summary.bullets] + [""]
    if m.action_items:
        out += [f"{h2}Action Items"]
        for a in m.action_items:
            who = f" ({a.assignee})" if a.assignee else ""
            due = f" - due {a.due_date}" if a.due_date else ""
            out.append(f"- [{'x' if a.completed else ' '}] {a.text}{who}{due}")
        out.append("")
    if m.chapters:
        out += [f"{h2}Chapters"] + [f"- {clock(c.start)} {c.title}: {c.summary}" for c in m.chapters] + [""]
    out += [f"{h2}Transcript"]
    out += [f"[{clock(s.start)}] {s.speaker}: {s.text}" for s in m.segments]
    return "\n".join(out), ("text/markdown" if md else "text/plain"), f"{slug}.{'md' if md else 'txt'}"