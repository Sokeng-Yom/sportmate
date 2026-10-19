/**
 * Frontend types aligned with the FastAPI backend schemas (app/schemas/*).
 * Field names and enum values MUST match the JSON the API returns — do not
 * rename fields here without changing the backend schemas too.
 */

export type Role = "PLAYER" | "VENUE_OWNER" | "ADMIN";

export const ROLES: Role[] = ["PLAYER", "VENUE_OWNER", "ADMIN"];

export const MATCH_STATUSES = [
  "OPEN",
  "FULL",
  "READY",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const VENUE_STATUSES = [
  "PAYMENT_PENDING",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const BOOKING_STATUSES = ["CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  name: string;
  role: Role;
  avatar: string | null;
  restricted_until: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  name?: string | null;
  avatar?: string | null;
}

export interface UserSport {
  id: string;
  user_id: string;
  sport: string;
  skill_level: string;
}

export interface UserSportCreate {
  sport: string;
  skill_level: string;
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export interface MatchRead {
  id: string;
  sport: string;
  location: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  players_needed: number;
  skill_level: string;
  status: MatchStatus;
  created_by: string;
  created_at: string;
}

export interface MatchPlayerRead {
  id: string;
  user_id: string;
  joined_at: string;
}

export interface MatchDetailRead extends MatchRead {
  players: MatchPlayerRead[];
}

export interface RecommendedMatch extends MatchRead {
  score: number;
}

export interface MatchCreate {
  sport: string;
  location: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (backend coerces to time)
  players_needed: number;
  skill_level: string; // one of SKILL_LEVELS
}

export interface LeaveRiskPreview {
  risk_level: string;
  hours_remaining: number;
  will_restrict: boolean;
  restriction_days: number;
}

export interface WaitingListJoined {
  id: string;
  position: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Pagination (shared wrapper shape used by every list endpoint)
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Venues & Courts
// ---------------------------------------------------------------------------

export interface VenueRead {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  description: string | null;
  photo_url: string | null;
  status: VenueStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface VenueCreate {
  name: string;
  address: string;
  description?: string | null;
}

export interface VenueUpdate {
  name?: string | null;
  address?: string | null;
  description?: string | null;
  photo_url?: string | null;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export interface BookingCreate {
  match_id: string;
  court_id: string;
  duration_minutes: number;
}

export interface BookingRead {
  id: string;
  court_id: string;
  match_id: string | null;
  booked_by: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  court_name: string | null;
  venue_id: string | null;
  venue_name: string | null;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotificationRead {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface NotificationPage extends Paginated<NotificationRead> {
  unread_count: number;
}

export interface MarkedCount {
  marked: number;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatMember {
  user_id: string;
  name: string;
  avatar: string | null;
  is_creator: boolean;
}

export interface ChatInfo {
  conversation_id: string;
  match_id: string;
  members: ChatMember[];
}

export interface MessageRead {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface MessagePage {
  conversation_id: string;
  items: MessageRead[];
  has_more: boolean;
}

export interface MessageCreate {
  content: string;
}

// ---------------------------------------------------------------------------
// Community posts
// ---------------------------------------------------------------------------

export interface PostRead {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

export interface CommentRead {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface PostCreate {
  content: string;
}


export interface TimeWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface WeeklyAvailability {
  mon: TimeWindow[];
  tue: TimeWindow[];
  wed: TimeWindow[];
  thu: TimeWindow[];
  fri: TimeWindow[];
  sat: TimeWindow[];
  sun: TimeWindow[];
}

export interface CourtRead {
  id: string;
  venue_id: string;
  name: string;
  sport: string;
  availability: WeeklyAvailability | null;
  created_at: string;
}

export interface CourtCreate {
  name: string;
  sport: string;
  availability?: WeeklyAvailability | null;
}

export interface CourtSearchItem extends CourtRead {
  venue_name: string;
  venue_address: string;
}
