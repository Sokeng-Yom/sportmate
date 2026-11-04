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
  BookingQuoteCreate,
  BookingQuoteRead,
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
  MatchUpdate,
  MessagePage,
  NotificationPage,
  Paginated,
  Profile,
  ProfileUpdate,
  RecommendedMatch,
  UserSport,
  UserSportCreate,
  UnreadMessageCount,
  VenueCreate,
  VenueOwnerConversationPage,
  VenueBrowseRead,
  VenueDiscountCreate,
  VenueDiscountRead,
  VenueEventCreate,
  VenueEventRead,
  VenueRead,
  VenueUpdate,
  WaitingListJoined,
  PostCreate,
  PostRead,
  DismissResult,
  ReportedPostRead,
  VenueRejectionPayload,
  AdminUserRead,
  RestrictUserPayload,
  SecurityLogRead,
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
  skill_level?: string;
  date?: string;
  location?: string;
  created_by_me?: boolean;
  joined_by_me?: boolean;
  status?: string;
  page?: number;
  page_size?: number;
}

export const listMatches = (params?: MatchListParams & { sort_by?: "game_time" | "posted_at" }) =>
  apiClient.get<Paginated<MatchRead>>(`/api/v1/matches${qs(params)}`);

export const listRecommendedMatches = (params?: MatchListParams) =>
  apiClient.get<Paginated<RecommendedMatch>>(`/api/v1/matches/recommended${qs(params)}`);

export const getMatch = (matchId: string) =>
  apiClient.get<MatchDetailRead>(`/api/v1/matches/${matchId}`);

export const createMatch = (payload: MatchCreate) =>
  apiClient.post<MatchRead>("/api/v1/matches", payload);

export const updateMatch = (matchId: string, payload: MatchUpdate) =>
  apiClient.patch<MatchDetailRead>(`/api/v1/matches/${matchId}`, payload);

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

export const browseVenues = (params?: VenueListParams) =>
  apiClient.get<Paginated<VenueBrowseRead>>(`/api/v1/venues/browse${qs(params)}`);

export const listMyVenues = () => apiClient.get<VenueRead[]>("/api/v1/venues/mine");

export const createVenue = (payload: VenueCreate) =>
  apiClient.post<VenueRead>("/api/v1/venues", payload);

export const getVenue = (venueId: string) =>
  apiClient.get<VenueRead>(`/api/v1/venues/${venueId}`);

export const updateVenue = (venueId: string, payload: VenueUpdate) =>
  apiClient.patch<VenueRead>(`/api/v1/venues/${venueId}`, payload);

export const confirmVenuePayment = (venueId: string, paymentProofPath: string) =>
  apiClient.post<VenueRead>(`/api/v1/venues/${venueId}/confirm-payment`, {
    payment_proof_path: paymentProofPath,
  });

export const listVenueDiscounts = (venueId: string) =>
  apiClient.get<VenueDiscountRead[]>(`/api/v1/venues/${venueId}/discounts`);

export const createVenueDiscount = (venueId: string, payload: VenueDiscountCreate) =>
  apiClient.post<VenueDiscountRead>(`/api/v1/venues/${venueId}/discounts`, payload);

export const updateVenueDiscount = (
  venueId: string,
  discountId: string,
  payload: Partial<VenueDiscountCreate>,
) => apiClient.patch<VenueDiscountRead>(`/api/v1/venues/${venueId}/discounts/${discountId}`, payload);

export const deleteVenueDiscount = (venueId: string, discountId: string) =>
  apiClient.delete<void>(`/api/v1/venues/${venueId}/discounts/${discountId}`);

export const listVenueEvents = (venueId: string) =>
  apiClient.get<VenueEventRead[]>(`/api/v1/venues/${venueId}/events`);

export const createVenueEvent = (venueId: string, payload: VenueEventCreate) =>
  apiClient.post<VenueEventRead>(`/api/v1/venues/${venueId}/events`, payload);

export const updateVenueEvent = (
  venueId: string,
  eventId: string,
  payload: Partial<VenueEventCreate>,
) => apiClient.patch<VenueEventRead>(`/api/v1/venues/${venueId}/events/${eventId}`, payload);

export const deleteVenueEvent = (venueId: string, eventId: string) =>
  apiClient.delete<void>(`/api/v1/venues/${venueId}/events/${eventId}`);

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

export const deleteCourt = (courtId: string) =>
  apiClient.delete<void>(`/api/v1/courts/${courtId}`);

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

export const quoteBooking = (payload: BookingQuoteCreate) =>
  apiClient.post<BookingQuoteRead>("/api/v1/bookings/quote", payload);

export const listMyBookings = (params?: { status?: string; page?: number; page_size?: number }) =>
  apiClient.get<Paginated<BookingRead>>(`/api/v1/bookings${qs(params)}`);

export const cancelBooking = (bookingId: string) =>
  apiClient.post<BookingRead>(`/api/v1/bookings/${bookingId}/cancel`);

export const approveBooking = (bookingId: string) =>
  apiClient.post<BookingRead>(`/api/v1/bookings/${bookingId}/approve`);

export const rejectBooking = (bookingId: string, reason: string) =>
  apiClient.post<BookingRead>(`/api/v1/bookings/${bookingId}/reject`, { reason });

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

export const getUnreadMessageCount = () =>
  apiClient.get<UnreadMessageCount>("/api/v1/matches/chat/unread-count");

export const markChatRead = (matchId: string) =>
  apiClient.post<{ marked: boolean }>(`/api/v1/matches/${matchId}/chat/read`);

export const listVenueOwnerConversations = () =>
  apiClient.get<VenueOwnerConversationPage>("/api/v1/venue-owner/messages");

export const listVenueOwnerMessages = (conversationId: string) =>
  apiClient.get<MessagePage>(`/api/v1/venue-owner/messages/${conversationId}/messages`);

export const sendVenueOwnerMessage = (conversationId: string, payload: { content: string }) =>
  apiClient.post<MessagePage["items"][number]>(`/api/v1/venue-owner/messages/${conversationId}/messages`, payload);

export const markVenueOwnerMessagesRead = (conversationId: string) =>
  apiClient.post<{ marked: boolean }>(`/api/v1/venue-owner/messages/${conversationId}/read`);

export const listPlayerVenueConversations = () =>
  apiClient.get<VenueOwnerConversationPage>("/api/v1/player/venue-messages");

export const listPlayerVenueMessages = (conversationId: string) =>
  apiClient.get<MessagePage>(`/api/v1/player/venue-messages/${conversationId}/messages`);

export const sendPlayerVenueMessage = (conversationId: string, payload: { content: string }) =>
  apiClient.post<MessagePage["items"][number]>(`/api/v1/player/venue-messages/${conversationId}/messages`, payload);

export const markPlayerVenueMessagesRead = (conversationId: string) =>
  apiClient.post<{ marked: boolean }>(`/api/v1/player/venue-messages/${conversationId}/read`);

// ---------------------------------------------------------------------------
// Community posts
// ---------------------------------------------------------------------------

export const createPost = (payload: PostCreate) =>
  apiClient.post<PostRead>("/api/v1/posts", payload);

export const listPosts = (params?: { mine?: boolean; page?: number; page_size?: number }) =>
  apiClient.get<Paginated<PostRead>>(`/api/v1/posts${qs(params)}`);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminVenueListParams {
  status?: string;
  page?: number;
  page_size?: number;
}

export const listAdminVenues = (params?: AdminVenueListParams) =>
  apiClient.get<Paginated<VenueRead>>(`/api/v1/admin/venues${qs(params)}`);

export const getAdminVenuePaymentProofUrl = (venueId: string) =>
  apiClient.get<{ signed_url: string }>(
    `/api/v1/admin/venues/${venueId}/payment-proof-url`,
  );

export const approveAdminVenue = (venueId: string) =>
  apiClient.post<VenueRead>(`/api/v1/admin/venues/${venueId}/approve`);

export const rejectAdminVenue = (venueId: string, payload: VenueRejectionPayload) =>
  apiClient.post<VenueRead>(`/api/v1/admin/venues/${venueId}/reject`, payload);

export const listReportedPosts = (params?: { page?: number; page_size?: number }) =>
  apiClient.get<Paginated<ReportedPostRead>>(`/api/v1/admin/posts/reported${qs(params)}`);

export const dismissPostReports = (postId: string) =>
  apiClient.post<DismissResult>(`/api/v1/admin/posts/${postId}/dismiss-reports`);

export const deleteAdminPost = (postId: string) =>
  apiClient.delete<void>(`/api/v1/admin/posts/${postId}`);

export interface AdminUserListParams {
  q?: string;
  role?: "PLAYER" | "VENUE_OWNER" | "ADMIN" | string;
  restricted?: boolean;
  page?: number;
  page_size?: number;
}

export const listAdminUsers = (params?: AdminUserListParams) =>
  apiClient.get<Paginated<AdminUserRead>>(`/api/v1/admin/users${qs(params)}`);

export const restrictAdminUser = (userId: string, payload: RestrictUserPayload) =>
  apiClient.post<AdminUserRead>(`/api/v1/admin/users/${userId}/restrict`, payload);

export const unrestrictAdminUser = (userId: string) =>
  apiClient.post<AdminUserRead>(`/api/v1/admin/users/${userId}/unrestrict`);

export interface AdminSecurityLogListParams {
  action?: string;
  user_id?: string;
  page?: number;
  page_size?: number;
}

export const listAdminSecurityLogs = (params?: AdminSecurityLogListParams) =>
  apiClient.get<Paginated<SecurityLogRead>>(`/api/v1/admin/security-logs${qs(params)}`);

export interface AdminBookingListParams {
  q?: string;
  status?: string;
  venue_id?: string;
  page?: number;
  page_size?: number;
}

export const listAdminBookings = (params?: AdminBookingListParams) =>
  apiClient.get<Paginated<BookingRead>>(`/api/v1/admin/bookings${qs(params)}`);

export interface AdminCourtListParams {
  q?: string;
  sport?: string;
  venue_id?: string;
  page?: number;
  page_size?: number;
}

export const listAdminCourts = (params?: AdminCourtListParams) =>
  apiClient.get<Paginated<CourtSearchItem>>(`/api/v1/admin/courts${qs(params)}`);
