from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ActionItem, Meeting, Segment
from ..schemas import ActionItemCreate, ActionItemOut, ActionItemUpdate
from .meetings import get_meeting_or_404

router = APIRouter(prefix="/api", tags=["action-items"])


@router.get("/action-items", response_model=list[ActionItemOut])
def list_action_items(completed: Optional[bool] = None, q: Optional[str] = Query(None),
                      db: Session = Depends(get_db)):
    stmt = select(ActionItem).join(Meeting)
    if completed is not None:
        stmt = stmt.where(ActionItem.completed == completed)
    if q:
        stmt = stmt.where(ActionItem.text.ilike(f"%{q}%"))
    return db.scalars(stmt.order_by(ActionItem.completed, ActionItem.due_date.is_(None),
                                    ActionItem.due_date, Meeting.date.desc())).all()


@router.post("/meetings/{meeting_id}/action-items", response_model=ActionItemOut, status_code=201)
def create_action_item(meeting_id: int, body: ActionItemCreate, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    if body.segment_id:
        seg = db.get(Segment, body.segment_id)
        if not seg or seg.meeting_id != meeting_id:
            raise HTTPException(422, "segment_id does not belong to this meeting")
    item = ActionItem(meeting_id=meeting_id, **body.model_dump())
    db.add(item)
    db.commit()
    return item


@router.patch("/action-items/{item_id}", response_model=ActionItemOut)
def update_action_item(item_id: int, body: ActionItemUpdate, db: Session = Depends(get_db)):
    item = db.get(ActionItem, item_id)
    if not item:
        raise HTTPException(404, "Action item not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    return item


@router.delete("/action-items/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(ActionItem, item_id)
    if not item:
        raise HTTPException(404, "Action item not found")
    db.delete(item)
    db.commit()
    return Response(status_code=204)