from datetime import datetime, time
from typing import Optional
from datetime import date as date_type

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Meeting, Participant, Segment, Tag
from ..schemas import AskIn, AskOut, MeetingCreate, MeetingDetail, MeetingListItem, MeetingUpdate
from ..services import qa
from ..services.exporter import export_meeting
from ..services.meeting_service import apply_ai, create_meeting, set_tags, speaker_stats
from ..services.parser import parse_transcript

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def get_meeting_or_404(db: Session, meeting_id: int) -> Meeting:
    m = db.get(Meeting, meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")
    return m


def to_list_item(m: Meeting) -> dict:
    return {
        "id": m.id, "title": m.title, "date": m.date, "duration_seconds": m.duration_seconds,
        "platform": m.platform, "participants": [p.name for p in m.participants],
        "tags": [t.name for t in m.tags], "total_actions": len(m.action_items),
        "open_actions": sum(1 for a in m.action_items if not a.completed),
        "overview": m.summary.overview[:200] if m.summary else "",
    }


def to_detail(m: Meeting) -> dict:
    return {
        "id": m.id, "title": m.title, "date": m.date, "duration_seconds": m.duration_seconds,
        "platform": m.platform, "participants": m.participants, "tags": [t.name for t in m.tags],
        "summary": m.summary, "segments": m.segments, "chapters": m.chapters,
        "action_items": m.action_items, "comments": m.comments, "highlights": m.highlights,
        "speaker_stats": speaker_stats(m.segments),
    }


def split_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def safe_parse(text: str, fmt: str) -> list[dict]:
    try:
        return parse_transcript(text, fmt)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("", response_model=list[MeetingListItem])
def list_meetings(
    q: Optional[str] = None, participant: Optional[str] = None, tag: Optional[str] = None,
    date_from: Optional[date_type] = None, date_to: Optional[date_type] = None,
    sort: str = Query("newest", pattern="^(newest|oldest|longest)$"),
    db: Session = Depends(get_db),
):
    stmt = select(Meeting).options(
        selectinload(Meeting.participants), selectinload(Meeting.tags),
        selectinload(Meeting.action_items), selectinload(Meeting.summary))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            Meeting.title.ilike(like),
            Meeting.id.in_(select(Participant.meeting_id).where(Participant.name.ilike(like))),
            Meeting.id.in_(select(Segment.meeting_id).where(Segment.text.ilike(like))),
        ))
    if participant:
        stmt = stmt.where(Meeting.id.in_(
            select(Participant.meeting_id).where(Participant.name.ilike(f"%{participant}%"))))
    if tag:
        stmt = stmt.where(Meeting.tags.any(Tag.name == tag.lower()))
    if date_from:
        stmt = stmt.where(Meeting.date >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(Meeting.date <= datetime.combine(date_to, time.max))
    order = {"newest": Meeting.date.desc(), "oldest": Meeting.date.asc(),
             "longest": Meeting.duration_seconds.desc()}[sort]
    return [to_list_item(m) for m in db.scalars(stmt.order_by(order)).all()]


@router.post("", response_model=MeetingDetail, status_code=201)
def create(body: MeetingCreate, db: Session = Depends(get_db)):
    segs = safe_parse(body.transcript, body.format)
    m = create_meeting(db, title=body.title.strip(), date=body.date, participants=body.participants,
                       tags=body.tags, segments=segs, platform="Pasted")
    return to_detail(m)


@router.post("/upload", response_model=MeetingDetail, status_code=201)
async def upload(
    file: UploadFile = File(...), title: str = Form(""), participants: str = Form(""),
    tags: str = Form(""), date: Optional[str] = Form(None), db: Session = Depends(get_db),
):
    text = (await file.read()).decode("utf-8", errors="ignore")
    name = file.filename or "Untitled meeting"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else "txt"
    segs = safe_parse(text, ext if ext in {"txt", "vtt", "json"} else "txt")
    try:
        when = datetime.fromisoformat(date) if date else None
    except ValueError:
        raise HTTPException(422, "Invalid date")
    m = create_meeting(db, title=title.strip() or name.rsplit(".", 1)[0], date=when,
                       participants=split_csv(participants), tags=split_csv(tags),
                       segments=segs, platform="Upload")
    return to_detail(m)


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    return to_detail(get_meeting_or_404(db, meeting_id))


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(meeting_id: int, body: MeetingUpdate, db: Session = Depends(get_db)):
    m = get_meeting_or_404(db, meeting_id)
    if body.title is not None:
        m.title = body.title.strip() or m.title
    if body.participants is not None:
        m.participants = [Participant(name=n.strip()) for n in dict.fromkeys(body.participants) if n.strip()]
    if body.tags is not None:
        set_tags(db, m, body.tags)
    db.commit()
    return to_detail(m)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    db.delete(get_meeting_or_404(db, meeting_id))
    db.commit()
    return Response(status_code=204)


@router.post("/{meeting_id}/regenerate", response_model=MeetingDetail)
def regenerate(meeting_id: int, db: Session = Depends(get_db)):
    m = get_meeting_or_404(db, meeting_id)
    apply_ai(m)
    db.commit()
    return to_detail(m)


@router.post("/{meeting_id}/ask", response_model=AskOut)
def ask(meeting_id: int, body: AskIn, db: Session = Depends(get_db)):
    return qa.answer(get_meeting_or_404(db, meeting_id), body.question)


@router.get("/{meeting_id}/export")
def export(meeting_id: int, format: str = Query("md", pattern="^(md|txt|json)$"),
           db: Session = Depends(get_db)):
    content, media, filename = export_meeting(get_meeting_or_404(db, meeting_id), format)
    return Response(content, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})