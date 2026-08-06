export interface ApiEnvelope<T> { code: number; message: string; data: T }

export interface LoginResult {
  token: string;
  expires_in: number;
  user: { user_id: string; nickname: string | null; is_new: boolean };
  default_child_id: string;
}

export interface Profile {
  user_id: string;
  nickname: string | null;
  can_access_all: boolean;
  free_until?: string | null;
  entitlement_until: string | null;
  referral_count?: number;
  membership: { status: string; plan_type?: string; end_date?: string };
}

export interface HomeEntry { title: string; path: string; subject: string; cover?: string; total_chapters?: number }
export interface HomeIndex { chaptered_works?: HomeEntry[]; standalone_picks?: HomeEntry[]; hot?: HomeEntry[] }
export interface Cover { cover_image_url?: string }
export interface SubjectBrief { subject_id: string; subject_name: string; total_entries: number; cover?: Cover }
export interface GlobalIndex { subjects?: SubjectBrief[] }
export interface CategoryBrief { id?: string; name: string; path?: string; entry_count?: number; cover?: Cover }
export interface ContentEntry { entry_id: string; title: string; path: string; cover?: Cover; duration_ms?: number }
export interface DirectoryIndex {
  subject_name?: string;
  name?: string;
  work_name?: string;
  categories?: CategoryBrief[];
  sub_categories?: CategoryBrief[];
  entries?: ContentEntry[];
  chapters?: Array<{ chapter_id: string; title: string; full_path: string; cover?: Cover }>;
}
export interface Segments { title: string; full_audio_url?: string; cover_url?: string }
export interface Track { id: string; title: string; audioUrl: string; coverUrl?: string; lyricsUrl?: string; lessonText?: string; subject?: string; kind: 'story' | 'song' | 'lesson' }
export interface FreeItem { p: string; t: string; s: string }
export interface FreePool { version?: string; stories: FreeItem[]; songs: FreeItem[] }
export interface LessonEntry { id: string; text: string; path: string; seq: number }
export interface SearchItem { t: string; p: string; s: string; c?: number }
export interface ProgressSummary {
  overall_stats: { total_words_learned: number; total_words_friends: number; total_words_mastered: number };
  subject_progress: Array<{ subject: string; learned: number; tested: number; mastered: number }>;
}
