import re

from ..models import Meeting
from . import llm
from .exporter import clock
from .summarizer import _tokens


def answer(m: Meeting, question: str) -> dict:
    q = question.lower()
    q_tokens = set(_tokens(question))

    scored = []
    for s in m.segments:
        overlap = len(q_tokens & set(_tokens(s.text)))
        if overlap:
            scored.append((overlap, s))
    scored.sort(key=lambda x: (-x[0], x[1].start))
    sources = [{"segment_id": s.id, "start": s.start, "speaker": s.speaker, "text": s.text}
               for _, s in scored[:3]]

    # 1) real LLM if configured
    transcript = "\n".join(f"[{clock(s.start)}] {s.speaker}: {s.text}" for s in m.segments)
    llm_answer = llm.ask(question, transcript)
    if llm_answer:
        return {"answer": llm_answer, "sources": sources}

    # 2) intent shortcuts using stored AI notes
    if re.search(r"action|task|to-?do|follow", q) and m.action_items:
        lines = [f"• {a.text}" + (f" — {a.assignee}" if a.assignee else "") for a in m.action_items]
        return {"answer": "Here are the action items from this meeting:\n" + "\n".join(lines), "sources": []}
    if re.search(r"summar|overview|recap|about", q) and m.summary:
        return {"answer": m.summary.overview, "sources": []}

    # 3) retrieval fallback
    if not sources:
        return {"answer": "I couldn't find anything about that in this meeting.", "sources": []}
    best = sources[0]
    return {"answer": f"The most relevant moment is at {clock(best['start'])}, where "
                      f"{best['speaker']} said: “{best['text']}”", "sources": sources}