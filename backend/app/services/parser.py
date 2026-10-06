"""Parses .txt / .vtt / .json transcripts into a normalized list of segments.

Every returned segment is: {"speaker": str, "start": float, "end": float, "text": str}
Supported text styles:
    00:12 Sarah Chen: Hello            [00:12] Sarah Chen: Hello
    Sarah Chen (00:12): Hello          Sarah Chen: Hello   (no timestamps -> estimated)
"""
import json
import re
from typing import Optional

WORDS_PER_SECOND = 2.6  # average speech rate, used to estimate missing timings

_TS = r"\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?"
_RE_TS_FIRST = re.compile(
    rf"^\[?(?P<ts>{_TS})\]?\s*[-–]?\s*(?P<speaker>[^:\n\[\]]{{1,40}}?)\s*:\s*(?P<text>.+)$")
_RE_SPK_TS = re.compile(
    rf"^(?P<speaker>[^:\n\[\]()]{{1,40}}?)\s*[\[(](?P<ts>{_TS})[\])]\s*:?\s*(?P<text>.+)$")
_RE_PLAIN = re.compile(r"^(?P<speaker>[^:\n\[\]]{1,40}?)\s*:\s*(?P<text>.+)$")


def ts_to_seconds(ts: str) -> float:
    secs = 0.0
    for part in ts.strip().replace(",", ".").split(":"):
        secs = secs * 60 + float(part)
    return secs


def _num(v) -> Optional[float]:
    if v is None or v == "":
        return None
    if isinstance(v, str) and ":" in v:
        return ts_to_seconds(v)
    return float(v)


def parse_txt(content: str) -> list[dict]:
    raw: list[dict] = []
    for line in content.replace("\r", "").split("\n"):
        line = line.strip()
        if not line:
            continue
        m = _RE_TS_FIRST.match(line) or _RE_SPK_TS.match(line)
        if m:
            raw.append({"speaker": m["speaker"].strip(), "start": ts_to_seconds(m["ts"]),
                        "text": m["text"].strip()})
            continue
        m = _RE_PLAIN.match(line)
        if m:
            raw.append({"speaker": m["speaker"].strip(), "start": None, "text": m["text"].strip()})
        elif raw:  # continuation of previous line
            raw[-1]["text"] += " " + line
    return raw


def parse_vtt(content: str) -> list[dict]:
    raw: list[dict] = []
    for block in re.split(r"\n\s*\n", content.replace("\r", "")):
        lines = [l for l in block.strip().split("\n") if l.strip()]
        idx = next((i for i, l in enumerate(lines) if "-->" in l), None)
        if idx is None:
            continue
        a, b = (x.strip().split(" ")[0] for x in lines[idx].split("-->"))
        text = " ".join(lines[idx + 1:])
        speaker = "Speaker"
        m = re.match(r"<v\s+([^>]+)>(.*)", text)
        if m:
            speaker, text = m.group(1).strip(), m.group(2)
        else:
            m = re.match(r"([^:]{1,40}):\s*(.+)", text)
            if m:
                speaker, text = m.group(1).strip(), m.group(2)
        text = re.sub(r"<[^>]+>", "", text).strip()
        raw.append({"speaker": speaker, "start": ts_to_seconds(a), "end": ts_to_seconds(b), "text": text})
    return raw


def parse_json(content: str) -> list[dict]:
    data = json.loads(content)
    if isinstance(data, dict):
        data = data.get("segments") or data.get("transcript") or data.get("sentences") or []
    if not isinstance(data, list):
        raise ValueError("JSON transcript must be a list of segments")
    raw = []
    for item in data:
        if not isinstance(item, dict):
            continue
        raw.append({
            "speaker": str(item.get("speaker") or item.get("speaker_name") or "Speaker"),
            "start": _num(item.get("start", item.get("start_time"))),
            "end": _num(item.get("end", item.get("end_time"))),
            "text": str(item.get("text") or item.get("content") or item.get("sentence") or ""),
        })
    return raw


def _finalize(raw: list[dict]) -> list[dict]:
    segs: list[dict] = []
    cursor = 0.0
    for r in raw:
        text = r["text"].strip()
        if not text:
            continue
        start = cursor if r.get("start") is None else float(r["start"])
        est = max(len(text.split()) / WORDS_PER_SECOND, 1.0)
        end = start + est if r.get("end") is None else float(r["end"])
        segs.append({"speaker": (r.get("speaker") or "Speaker").strip() or "Speaker",
                     "start": round(start, 2), "end": round(max(end, start + 0.5), 2), "text": text})
        cursor = segs[-1]["end"]
    for a, b in zip(segs, segs[1:]):  # don't let a turn overlap the next one
        if a["end"] > b["start"] > a["start"]:
            a["end"] = b["start"]
    return segs


def parse_transcript(content: str, fmt: str = "txt") -> list[dict]:
    content = content.strip().lstrip("\ufeff")
    if not content:
        raise ValueError("Transcript is empty")
    fmt = (fmt or "txt").lower()
    if fmt == "vtt" or content.startswith("WEBVTT"):
        raw = parse_vtt(content)
    elif fmt == "json" or content[:1] in "{[":
        try:
            raw = parse_json(content)
        except ValueError:
            if fmt == "json":
                raise ValueError("Invalid JSON transcript")
            raw = parse_txt(content)
    else:
        raw = parse_txt(content)
    segs = _finalize(raw)
    if not segs:
        raise ValueError("Could not find any transcript lines. Use 'Speaker: text' per line, "
                         "optionally prefixed with a timestamp like 00:12.")
    return segs