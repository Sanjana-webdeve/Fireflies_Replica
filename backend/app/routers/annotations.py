from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Comment, Highlight, Segment
from ..schemas import CommentCreate, CommentOut, HighlightCreate, HighlightOut
from .meetings import get_meeting_or_404

router = APIRouter(prefix="/api", tags=["annotations"])


def _segment_for(db: Session, meeting_id: int, segment_id: int) -> Segment:
    seg = db.get(Segment, segment_id)
    if not seg or seg.meeting_id != meeting_id:
        raise HTTPException(422, "segment_id does not belong to this meeting")
    return seg


@router.post("/meetings/{meeting_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(meeting_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    if body.segment_id:
        _segment_for(db, meeting_id, body.segment_id)
    c = Comment(meeting_id=meeting_id, segment_id=body.segment_id, text=body.text.strip())
    db.add(c)
    db.commit()
    return c


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(404, "Comment not found")
    db.delete(c)
    db.commit()
    return Response(status_code=204)


@router.post("/meetings/{meeting_id}/highlights", response_model=HighlightOut, status_code=201)
def add_highlight(meeting_id: int, body: HighlightCreate, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    seg = _segment_for(db, meeting_id, body.segment_id)
    h = Highlight(meeting_id=meeting_id, segment_id=seg.id, start=seg.start,
                  label=(body.label or seg.text)[:200])
    db.add(h)
    db.commit()
    return h


@router.delete("/highlights/{highlight_id}", status_code=204)
def delete_highlight(highlight_id: int, db: Session = Depends(get_db)):
    h = db.get(Highlight, highlight_id)
    if not h:
        raise HTTPException(404, "Highlight not found")
    db.delete(h)
    db.commit()
    return Response(status_code=204)