import type {
  ActionItem, AskResult, Comment, Highlight, MeetingDetail, MeetingListItem, SearchResults, Stats,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}/api${path}`, {
    cache: "no-store",
    ...init,
    headers: isForm ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : j.detail?.[0]?.msg ?? detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body ? JSON.stringify(body) : undefined });

export const api = {
  listMeetings: (params: Record<string, string>) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return req<MeetingListItem[]>(`/meetings${qs ? `?${qs}` : ""}`);
  },
  getMeeting: (id: number) => req<MeetingDetail>(`/meetings/${id}`),
  createMeeting: (body: { title: string; date?: string; participants: string[]; tags: string[]; transcript: string; format: string }) =>
    req<MeetingDetail>("/meetings", json("POST", body)),
  uploadMeeting: (form: FormData) => req<MeetingDetail>("/meetings/upload", { method: "POST", body: form }),
  updateMeeting: (id: number, body: { title?: string; participants?: string[]; tags?: string[] }) =>
    req<MeetingDetail>(`/meetings/${id}`, json("PATCH", body)),
  deleteMeeting: (id: number) => req<void>(`/meetings/${id}`, json("DELETE")),
  regenerate: (id: number) => req<MeetingDetail>(`/meetings/${id}/regenerate`, json("POST")),
  ask: (id: number, question: string) => req<AskResult>(`/meetings/${id}/ask`, json("POST", { question })),
  exportUrl: (id: number, format: "md" | "txt" | "json") => `${API_BASE}/api/meetings/${id}/export?format=${format}`,

  listActionItems: (completed?: boolean) =>
    req<ActionItem[]>(`/action-items${completed === undefined ? "" : `?completed=${completed}`}`),
  addActionItem: (meetingId: number, body: { text: string; assignee?: string | null; due_date?: string | null; segment_id?: number | null }) =>
    req<ActionItem>(`/meetings/${meetingId}/action-items`, json("POST", body)),
  updateActionItem: (id: number, body: Partial<Pick<ActionItem, "text" | "assignee" | "due_date" | "completed">>) =>
    req<ActionItem>(`/action-items/${id}`, json("PATCH", body)),
  deleteActionItem: (id: number) => req<void>(`/action-items/${id}`, json("DELETE")),

  addComment: (meetingId: number, body: { text: string; segment_id?: number | null }) =>
    req<Comment>(`/meetings/${meetingId}/comments`, json("POST", body)),
  deleteComment: (id: number) => req<void>(`/comments/${id}`, json("DELETE")),
  addHighlight: (meetingId: number, segment_id: number) =>
    req<Highlight>(`/meetings/${meetingId}/highlights`, json("POST", { segment_id })),
  deleteHighlight: (id: number) => req<void>(`/highlights/${id}`, json("DELETE")),

  search: (q: string) => req<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  tags: () => req<{ name: string; count: number }[]>("/tags"),
  participants: () => req<string[]>("/participants"),
  stats: () => req<Stats>("/stats"),
};