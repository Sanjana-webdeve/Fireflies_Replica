export interface Participant { id: number; name: string; email?: string | null }
export interface Segment { id: number; idx: number; speaker: string; start: number; end: number; text: string }
export interface Summary { overview: string; bullets: string[]; keywords: string[] }
export interface Chapter { id: number; title: string; start: number; summary: string }
export interface ActionItem {
  id: number; meeting_id: number; segment_id: number | null; text: string; assignee: string | null;
  due_date: string | null; completed: boolean; created_at: string; meeting_title?: string | null;
}
export interface Comment { id: number; segment_id: number | null; author: string; text: string; created_at: string }
export interface Highlight { id: number; segment_id: number; label: string; start: number }
export interface SpeakerStat { speaker: string; seconds: number; words: number; percent: number }

export interface MeetingListItem {
  id: number; title: string; date: string; duration_seconds: number; platform: string;
  participants: string[]; tags: string[]; total_actions: number; open_actions: number; overview: string;
}
export interface MeetingDetail {
  id: number; title: string; date: string; duration_seconds: number; platform: string;
  participants: Participant[]; tags: string[]; summary: Summary | null; segments: Segment[];
  chapters: Chapter[]; action_items: ActionItem[]; comments: Comment[]; highlights: Highlight[];
  speaker_stats: SpeakerStat[];
}
export interface Source { segment_id: number; start: number; speaker: string; text: string }
export interface AskResult { answer: string; sources: Source[] }
export interface SearchResults {
  meetings: { id: number; title: string; date: string }[];
  segments: { segment_id: number; meeting_id: number; meeting_title: string; start: number; speaker: string; text: string }[];
}
export interface Stats {
  total_meetings: number; total_seconds: number; total_words: number; open_actions: number; done_actions: number;
  speakers: { speaker: string; seconds: number }[];
  per_day: { date: string; count: number }[];
  keywords: { word: string; count: number }[];
}