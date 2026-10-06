"""Optional LLM integration. If GEMINI_API_KEY is not set, callers fall back to retrieval."""
import os
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()


def available() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def ask(question: str, transcript: str) -> Optional[str]:
    if not available():
        return None
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')}:generateContent",
            headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"],
                     "content-type": "application/json"},
            json={
                "systemInstruction": {"parts": [{"text": (
                    "You answer questions about a meeting using ONLY the transcript provided. "
                    "Be concise and mention speakers/timestamps when useful. "
                    "If the answer is not in the transcript, say so."
                )}]},
                "contents": [{"role": "user", "parts": [{"text": (
                    f"Transcript:\n{transcript[:60000]}\n\nQuestion: {question}"
                )}]}],
                "generationConfig": {"maxOutputTokens": 600},
            },
            timeout=40,
        )
        r.raise_for_status()
        parts = r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
        return "".join(part.get("text", "") for part in parts).strip() or None
    except Exception:
        return None