import math
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (ActionItem, Chapter, Meeting, Participant, Segment, Summary, Tag)
from .summarizer import summarize

DEFAULT_USER_ID = 1


def get_or_create_tag(db: Session, name: str) -> Tag:
    tag = db.scalar(select(Tag).where(Tag.name == name))
    if not tag:
        tag = Tag(name=name)
        db.add(tag)
        db.flush()
    return tag


def set_tags(db: Session, meeting: Meeting, names: list[str]) -> None:
    clean = list(dict.fromkeys(n.strip().lower() for n in names if n.strip()))
    meeting.tags = [get_or_create_tag(db, n) for n in clean]


def apply_ai(meeting: Meeting) -> None:
    """(Re)generate summary + chapters, and add any newly detected action items."""
    segs = [{"idx": s.idx, "speaker": s.speaker, "start": s.start, "end": s.end, "text": s.text}
            for s in meeting.segments]
    ai = summarize(segs)
    if meeting.summary:
        meeting.summary.overview = ai["overview"]
        meeting.summary.bullets = ai["bullets"]
        meeting.summary.keywords = ai["keywords"]
    else:
        meeting.summary = Summary(overview=ai["overview"], bullets=ai["bullets"], keywords=ai["keywords"])
    meeting.chapters = [Chapter(**c) for c in ai["chapters"]]
    existing = {a.text.lower() for a in meeting.action_items}
    for a in ai["action_items"]:
        if a["text"].lower() in existing:
            continue
        meeting.action_items.append(ActionItem(
            text=a["text"], assignee=a["assignee"], segment_id=meeting.segments[a["segment_idx"]].id))


def create_meeting(db: Session, *, title: str, segments: list[dict], date: Optional[datetime] = None,
                   participants: Optional[list[str]] = None, tags: Optional[list[str]] = None,
                   platform: str = "Upload", duration: Optional[int] = None, ai: bool = True) -> Meeting:
    if date and date.tzinfo:
        date = date.replace(tzinfo=None)
    names = [n.strip() for n in (participants or []) if n.strip()] or \
        list(dict.fromkeys(s["speaker"] for s in segments))
    m = Meeting(user_id=DEFAULT_USER_ID, title=title, date=date or datetime.utcnow(), platform=platform,
                duration_seconds=duration or int(math.ceil(segments[-1]["end"])) + 15)
    m.participants = [Participant(name=n) for n in names]
    m.segments = [Segment(idx=i, **s) for i, s in enumerate(segments)]
    set_tags(db, m, tags or [])
    db.add(m)
    db.flush()  # assigns segment ids so action items can reference them
    if ai:
        apply_ai(m)
    db.commit()
    return m


def speaker_stats(segments) -> list[dict]:
    agg: dict[str, dict] = {}
    for s in segments:
        a = agg.setdefault(s.speaker, {"speaker": s.speaker, "seconds": 0.0, "words": 0})
        a["seconds"] += max(s.end - s.start, 0)
        a["words"] += len(s.text.split())
    total = sum(a["seconds"] for a in agg.values()) or 1
    out = sorted(agg.values(), key=lambda a: a["seconds"], reverse=True)
    for a in out:
        a["percent"] = round(a["seconds"] / total * 100, 1)
        a["seconds"] = round(a["seconds"], 1)
    return out