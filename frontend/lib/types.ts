export type Role = "PLAYER" | "VENUE_OWNER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url?: string;
  restricted_until?: string; // ISO date if restricted
}

export interface UserSport {
  id: string;
  user_id: string;
  sport: string;
  skill_level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
}

export interface Match {
  id: string;
  creator_id: string;
  sport: string;
  location: string; // Could be a general location or venue string
  date: string;
  time: string;
  players_needed: number;
  skill_level_required: string;
  status: "OPEN" | "FULL" | "READY" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  user_id: string;
  status: "JOINED" | "LEFT";
  joined_at: string;
}

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  description: string;
  status: "PAYMENT_PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}

export interface Court {
  id: string;
  venue_id: string;
  name: string; // e.g. "Court A"
  sport: string;
  price_per_hour: number;
}
