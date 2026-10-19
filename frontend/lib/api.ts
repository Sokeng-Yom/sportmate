/**
 * Typed wrappers around the low-level `apiClient` (lib/apiClient.ts).
 *
 * Every call here talks to the FastAPI backend with the current Supabase
 * access token attached as `Authorization: Bearer <token>` (done inside
 * apiClient.ts). Never use raw `fetch` in pages — go through these functions
 * so auth and error handling stay consistent.
 */
import { apiClient } from "./apiClient";
import type {
  BookingCreate,
  BookingRead,
  ChatInfo,
  CourtCreate,
  CourtRead,
  CourtSearchItem,
  LeaveRiskPreview,
  MarkedCount,
  MatchCreate,
  MatchDetailRead,
  MatchRead,
  MessagePage,
  NotificationPage,
  Paginated,
  Profile,
  ProfileUpdate,
  RecommendedMatch,
  UserSport,
  UserSportCreate,
  VenueCreate,
  VenueRead,
  VenueUpdate,
  WaitingListJoined,
  PostCreate,
  PostRead,
} from "./types";

/** Builds a query string from an object, skipping undefined/null/empty-string values. */
function qs(params: object | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const getProfile = () => apiClient.get<Profile>("/api/v1/profiles/me");

export const updateProfile = (payload: ProfileUpdate) =>
  apiClient.patch<Profile>("/api/v1/profiles/me", payload);

export const listMySports = () =>
  apiClient.get<UserSport[]>("/api/v1/profiles/me/sports");

export const addMySport = (payload: UserSportCreate) =>
  apiClient.post<UserSport>("/api/v1/profiles/me/sports", payload);

export const deleteMySport = (sportId: string) =>
  apiClient.delete<never>(`/api/v1/profiles/me/sports/${sportId}`);

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export interface MatchListParams {
  sport?: string;
  date?: string;
  location?: string;
  created_by_me?: boolean;
  joined_by_me?: boolean;
  status?: string;
  page?: number;
  page_size?: number;
}

export const listMatches = (params?: MatchListParams) =>
  apiClient.get<Paginated<MatchRead>>(`/api/v1/matches${qs(params)}`);

export const listRecommendedMatches = (params?: MatchListParams) =>
  apiClient.get<Paginated<RecommendedMatch>>(`/api/v1/matches/recommended${qs(params)}`);

export const getMatch = (matchId: string) =>
  apiClient.get<MatchDetailRead>(`/api/v1/matches/${matchId}`);

export const createMatch = (payload: MatchCreate) =>
  apiClient.post<MatchRead>("/api/v1/matches", payload);

export const joinMatch = (matchId: string) =>
  apiClient.post<MatchDetailRead>(`/api/v1/matches/${matchId}/join`);

export const leaveMatch = (matchId: string) =>
  apiClient.post<MatchRead>(`/api/v1/matches/${matchId}/leave`);

export const cancelMatch = (matchId: string) =>
  apiClient.patch<MatchDetailRead>(`/api/v1/matches/${matchId}/cancel`);

export const getLeaveRiskPreview = (matchId: string) =>
  apiClient.get<LeaveRiskPreview>(`/api/v1/matches/${matchId}/leave-risk-preview`);

export const joinWaitingList = (matchId: string) =>
  apiClient.post<WaitingListJoined>(`/api/v1/matches/${matchId}/waiting-list`);

export const acceptWaitingList = (entryId: string) =>
  apiClient.post<{ status: string }>(`/api/v1/waiting-list/${entryId}/accept`);

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export interface VenueListParams {
  q?: string;
  page?: number;
  page_size?: number;
}

export const listVenues = (params?: VenueListParams) =>
  apiClient.get<Paginated<VenueRead>>(`/api/v1/venues${qs(params)}`);

export const listMyVenues = () => apiClient.get<VenueRead[]>("/api/v1/venues/mine");

export const createVenue = (payload: VenueCreate) =>
  apiClient.post<VenueRead>("/api/v1/venues", payload);

export const getVenue = (venueId: string) =>
  apiClient.get<VenueRead>(`/api/v1/venues/${venueId}`);

export const updateVenue = (venueId: string, payload: VenueUpdate) =>
  apiClient.patch<VenueRead>(`/api/v1/venues/${venueId}`, payload);

export const confirmVenuePayment = (venueId: string) =>
  apiClient.post<VenueRead>(`/api/v1/venues/${venueId}/confirm-payment`);

// ---------------------------------------------------------------------------
// Courts
// ---------------------------------------------------------------------------

export const listVenueCourts = (venueId: string) =>
  apiClient.get<CourtRead[]>(`/api/v1/venues/${venueId}/courts`);

export const createCourt = (venueId: string, payload: CourtCreate) =>
  apiClient.post<CourtRead>(`/api/v1/venues/${venueId}/courts`, payload);

export const getCourt = (courtId: string) =>
  apiClient.get<CourtRead>(`/api/v1/courts/${courtId}`);

export const updateCourt = (courtId: string, payload: Partial<CourtCreate>) =>
  apiClient.patch<CourtRead>(`/api/v1/courts/${courtId}`, payload);

export interface CourtSearchParams {
  date: string;
  start_time: string; // "HH:MM"
  duration_minutes?: number;
  sport?: string;
  location?: string;
  page?: number;
  page_size?: number;
}

export const searchCourts = (params: CourtSearchParams) =>
  apiClient.get<Paginated<CourtSearchItem>>(`/api/v1/courts/search${qs(params)}`);

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const createBooking = (payload: BookingCreate) =>
  apiClient.post<BookingRead>("/api/v1/bookings", payload);

export const listMyBookings = (params?: { status?: string; page?: number; page_size?: number }) =>
  apiClient.get<Paginated<BookingRead>>(`/api/v1/bookings${qs(params)}`);

export const cancelBooking = (bookingId: string) =>
  apiClient.post<BookingRead>(`/api/v1/bookings/${bookingId}/cancel`);

export const listVenueBookings = (
  venueId: string,
  params?: { status?: string; date?: string; page?: number; page_size?: number },
) => apiClient.get<Paginated<BookingRead>>(`/api/v1/venues/${venueId}/bookings${qs(params)}`);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const listNotifications = (params?: { unread_only?: boolean; page?: number; page_size?: number }) =>
  apiClient.get<NotificationPage>(`/api/v1/notifications${qs(params)}`);

export const markAllNotificationsRead = () =>
  apiClient.post<MarkedCount>("/api/v1/notifications/read-all");

export const markNotificationRead = (notificationId: string) =>
  apiClient.post<NotificationPage["items"][number]>(`/api/v1/notifications/${notificationId}/read`);

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const openChat = (matchId: string) =>
  apiClient.get<ChatInfo>(`/api/v1/matches/${matchId}/chat`);

export const listMessages = (matchId: string, params?: { before?: string; limit?: number }) =>
  apiClient.get<MessagePage>(`/api/v1/matches/${matchId}/messages${qs(params)}`);

export const sendMessage = (matchId: string, payload: { content: string }) =>
  apiClient.post<MessagePage["items"][number]>(`/api/v1/matches/${matchId}/messages`, payload);

// ---------------------------------------------------------------------------
// Community posts
// ---------------------------------------------------------------------------

export const createPost = (payload: PostCreate) =>
  apiClient.post<PostRead>("/api/v1/posts", payload);

export const listPosts = (params?: { mine?: boolean; page?: number; page_size?: number }) =>
  apiClient.get<Paginated<PostRead>>(`/api/v1/posts${qs(params)}`);

