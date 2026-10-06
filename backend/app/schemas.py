from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- output ----------
class ParticipantOut(ORM):
    id: int
    name: str
    email: Optional[str] = None


class SegmentOut(ORM):
    id: int
    idx: int
    speaker: str
    start: float
    end: float
    text: str


class SummaryOut(ORM):
    overview: str
    bullets: list[str]
    keywords: list[str]


class ChapterOut(ORM):
    id: int
    title: str
    start: float
    summary: str


class ActionItemOut(ORM):
    id: int
    meeting_id: int
    segment_id: Optional[int] = None
    text: str
    assignee: Optional[str] = None
    due_date: Optional[date] = None
    completed: bool
    created_at: datetime
    meeting_title: Optional[str] = None


class CommentOut(ORM):
    id: int
    segment_id: Optional[int] = None
    author: str
    text: str
    created_at: datetime


class HighlightOut(ORM):
    id: int
    segment_id: int
    label: str
    start: float


class SpeakerStat(BaseModel):
    speaker: str
    seconds: float
    words: int
    percent: float


class MeetingListItem(BaseModel):
    id: int
    title: str
    date: datetime
    duration_seconds: int
    platform: str
    participants: list[str]
    tags: list[str]
    total_actions: int
    open_actions: int
    overview: str


class MeetingDetail(BaseModel):
    id: int
    title: str
    date: datetime
    duration_seconds: int
    platform: str
    participants: list[ParticipantOut]
    tags: list[str]
    summary: Optional[SummaryOut] = None
    segments: list[SegmentOut]
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]
    comments: list[CommentOut]
    highlights: list[HighlightOut]
    speaker_stats: list[SpeakerStat]


class SourceOut(BaseModel):
    segment_id: int
    start: float
    speaker: str
    text: str


class AskOut(BaseModel):
    answer: str
    sources: list[SourceOut]


# ---------- input ----------
class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    date: Optional[datetime] = None
    participants: list[str] = []
    tags: list[str] = []
    transcript: str = Field(min_length=1)
    format: str = "txt"  # txt | vtt | json


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    participants: Optional[list[str]] = None
    tags: Optional[list[str]] = None


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    assignee: Optional[str] = None
    due_date: Optional[date] = None
    segment_id: Optional[int] = None


class ActionItemUpdate(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    assignee: Optional[str] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    segment_id: Optional[int] = None


class HighlightCreate(BaseModel):
    segment_id: int
    label: Optional[str] = None