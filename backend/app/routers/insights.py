from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ActionItem, Meeting, Participant, Segment, Summary, Tag, meeting_tags

router = APIRouter(prefix="/api", tags=["insights"])


@router.get("/search")
def global_search(q: str = Query(min_length=2), limit: int = 25, db: Session = Depends(get_db)):
    like = f"%{q}%"
    meetings = db.execute(
        select(Meeting.id, Meeting.title, Meeting.date)
        .where(Meeting.title.ilike(like)).order_by(Meeting.date.desc()).limit(5)).all()
    rows = db.execute(
        select(Segment.id, Segment.meeting_id, Segment.start, Segment.speaker, Segment.text, Meeting.title)
        .join(Meeting, Meeting.id == Segment.meeting_id)
        .where(Segment.text.ilike(like)).order_by(Meeting.date.desc(), Segment.idx).limit(limit)).all()
    return {
        "meetings": [{"id": r.id, "title": r.title, "date": r.date} for r in meetings],
        "segments": [{"segment_id": r.id, "meeting_id": r.meeting_id, "meeting_title": r.title,
                      "start": r.start, "speaker": r.speaker, "text": r.text} for r in rows],
    }


@router.get("/tags")
def list_tags(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Tag.name, func.count(meeting_tags.c.meeting_id))
        .join(meeting_tags, meeting_tags.c.tag_id == Tag.id).group_by(Tag.name).order_by(Tag.name)).all()
    return [{"name": n, "count": c} for n, c in rows]


@router.get("/participants")
def list_participants(db: Session = Depends(get_db)):
    return list(db.scalars(select(Participant.name).distinct().order_by(Participant.name)).all())


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Meeting.id))) or 0
    seconds = db.scalar(select(func.coalesce(func.sum(Meeting.duration_seconds), 0))) or 0
    open_ = db.scalar(select(func.count(ActionItem.id)).where(ActionItem.completed.is_(False))) or 0
    done = db.scalar(select(func.count(ActionItem.id)).where(ActionItem.completed.is_(True))) or 0
    words = db.scalar(select(func.coalesce(func.sum(
        func.length(Segment.text) - func.length(func.replace(Segment.text, " ", "")) + 1), 0))) or 0
    speakers = db.execute(
        select(Segment.speaker, func.sum(Segment.end - Segment.start).label("s"))
        .group_by(Segment.speaker).order_by(desc("s")).limit(8)).all()

    counts = Counter(d.date() for d in db.scalars(select(Meeting.date)).all())
    today = date.today()
    per_day = [{"date": (today - timedelta(days=i)).isoformat(),
                "count": counts.get(today - timedelta(days=i), 0)} for i in range(13, -1, -1)]

    kw: Counter = Counter()
    for keywords in db.scalars(select(Summary.keywords)).all():
        kw.update(keywords or [])

    return {
        "total_meetings": total, "total_seconds": int(seconds), "total_words": int(words),
        "open_actions": open_, "done_actions": done,
        "speakers": [{"speaker": s, "seconds": round(v or 0, 1)} for s, v in speakers],
        "per_day": per_day,
        "keywords": [{"word": w, "count": c} for w, c in kw.most_common(12)],
    }