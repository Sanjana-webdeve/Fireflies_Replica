from datetime import date, datetime
from typing import Optional

from sqlalchemy import (JSON, Boolean, Column, Date, DateTime, Float, ForeignKey,
                        Integer, String, Table, Text)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.utcnow()


# many-to-many: meetings <-> tags
meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    meetings: Mapped[list["Meeting"]] = relationship(back_populates="user")


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    meetings: Mapped[list["Meeting"]] = relationship(secondary=meeting_tags, back_populates="tags")


class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), default=1)
    title: Mapped[str] = mapped_column(String(200), index=True)
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    platform: Mapped[str] = mapped_column(String(40), default="Upload")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan")
    segments: Mapped[list["Segment"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Segment.idx")
    summary: Mapped[Optional["Summary"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", uselist=False)
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Chapter.start")
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.id")
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Comment.id")
    highlights: Mapped[list["Highlight"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Highlight.start")
    tags: Mapped[list["Tag"]] = relationship(secondary=meeting_tags, back_populates="meetings")


class Participant(Base):
    __tablename__ = "participants"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    meeting: Mapped["Meeting"] = relationship(back_populates="participants")


class Segment(Base):
    """One speaker turn of the transcript."""
    __tablename__ = "segments"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    idx: Mapped[int] = mapped_column(Integer)
    speaker: Mapped[str] = mapped_column(String(120), index=True)
    start: Mapped[float] = mapped_column(Float)
    end: Mapped[float] = mapped_column(Float)
    text: Mapped[str] = mapped_column(Text)
    meeting: Mapped["Meeting"] = relationship(back_populates="segments")


class Summary(Base):
    __tablename__ = "summaries"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True)
    overview: Mapped[str] = mapped_column(Text, default="")
    bullets: Mapped[list] = mapped_column(JSON, default=list)
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    meeting: Mapped["Meeting"] = relationship(back_populates="summary")


class Chapter(Base):
    __tablename__ = "chapters"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    start: Mapped[float] = mapped_column(Float)
    summary: Mapped[str] = mapped_column(Text, default="")
    meeting: Mapped["Meeting"] = relationship(back_populates="chapters")


class ActionItem(Base):
    __tablename__ = "action_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    segment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("segments.id", ondelete="SET NULL"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    assignee: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    meeting: Mapped["Meeting"] = relationship(back_populates="action_items")

    @property
    def meeting_title(self) -> Optional[str]:
        return self.meeting.title if self.meeting else None


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    segment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("segments.id", ondelete="CASCADE"), nullable=True)
    author: Mapped[str] = mapped_column(String(120), default="Alex Morgan")
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    meeting: Mapped["Meeting"] = relationship(back_populates="comments")


class Highlight(Base):
    """A 'soundbite' bookmarked on a transcript segment."""
    __tablename__ = "highlights"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    segment_id: Mapped[int] = mapped_column(ForeignKey("segments.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(200))
    start: Mapped[float] = mapped_column(Float, default=0)
    meeting: Mapped["Meeting"] = relationship(back_populates="highlights")