"""Lightweight extractive 'AI' summarizer (no external API needed).

Produces overview, bullet notes, keywords, chapters and action items from segments.
It is deliberately isolated so it can be swapped for an LLM call without touching routers.
"""
import re
from collections import Counter

STOP = set("""a about above after again all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have having he her
here hers him his how i if in into is it its just let's like me more most my no nor not now of off on once only or
other our out over own really same she should so some such than that the their them then there these they this
those through to too under until up us very was we were what when where which while who whom why will with would
you your yeah okay going think know get got one thing things need want make sure great thanks thank alright still
today next first""".split())

WORD = re.compile(r"[A-Za-z][A-Za-z'-]{2,}")
ACTION_RE = re.compile(
    r"\b(i'll|i will|i can take|i'm going to|i am going to|we need to|we should|let's|can you|could you|"
    r"please|action item|follow up|by (monday|tuesday|wednesday|thursday|friday|end of (the )?(day|week)|eod))\b",
    re.I)
SELF_RE = re.compile(r"\b(i'll|i will|i can take|i'm going to|i am going to)\b", re.I)
DECISION_RE = re.compile(r"\b(decid|agree|commit|priorit|deadline|plan|launch|budget|risk|blocked)\w*", re.I)


def _tokens(text: str) -> list[str]:
    return [w.lower() for w in WORD.findall(text) if w.lower() not in STOP]


def _sentences(segs: list[dict]) -> list[tuple[int, str, str]]:
    out = []
    for s in segs:
        for sent in re.split(r"(?<=[.!?])\s+", s["text"]):
            if len(sent.split()) >= 6:
                out.append((s["idx"], s["speaker"], sent.strip()))
    return out


def top_keywords(text: str, n: int = 8) -> list[str]:
    return [w for w, _ in Counter(_tokens(text)).most_common(n)]


def _chapters(segs: list[dict]) -> list[dict]:
    total = segs[-1]["end"]
    n = max(1, min(len(segs), max(3, min(6, round(total / 420)))))
    size = len(segs) / n
    chapters = []
    for i in range(n):
        chunk = segs[int(i * size): int((i + 1) * size)] or segs[-1:]
        text = " ".join(s["text"] for s in chunk)
        kws = top_keywords(text, 2)
        title = " & ".join(k.title() for k in kws) if kws else f"Part {i + 1}"
        first = next((x for x in re.split(r"(?<=[.!?])\s+", text) if len(x.split()) >= 5), text[:140])
        chapters.append({"title": title, "start": chunk[0]["start"], "summary": first.strip()})
    return chapters


def summarize(segs: list[dict]) -> dict:
    if not segs:
        return {"overview": "", "bullets": [], "keywords": [], "chapters": [], "action_items": []}

    full = " ".join(s["text"] for s in segs)
    freq = Counter(_tokens(full))
    sents = _sentences(segs)

    def score(sent: str) -> float:
        toks = _tokens(sent)
        return sum(freq[t] for t in toks) / ((len(toks) ** 0.5) or 1)

    ranked = sorted(range(len(sents)), key=lambda i: score(sents[i][2]), reverse=True)
    overview_idx = sorted(ranked[:3])
    decisions = [i for i in range(len(sents)) if DECISION_RE.search(sents[i][2]) and i not in overview_idx]
    pool = decisions + [i for i in ranked[3:] if i not in decisions]
    bullet_idx = sorted(pool[:5])

    actions, seen = [], set()
    for idx, speaker, sent in sents:
        if ACTION_RE.search(sent) and sent.lower() not in seen and len(actions) < 6:
            seen.add(sent.lower())
            actions.append({"text": sent, "assignee": speaker if SELF_RE.search(sent) else None,
                            "segment_idx": idx})

    return {
        "overview": " ".join(sents[i][2] for i in overview_idx),
        "bullets": [sents[i][2] for i in bullet_idx],
        "keywords": top_keywords(full, 8),
        "chapters": _chapters(segs),
        "action_items": actions,
    }