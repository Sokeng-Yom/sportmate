"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
    listMyVenues,
    listVenueCourts,
    listVenueBookings,
    createVenue,
    confirmVenuePayment,
    createCourt,
    updateCourt as updateCourtApi,
    cancelBooking,
    updateProfile as updateProfileApi,
} from "../../../lib/api";
import { ApiError } from "../../../lib/apiClient";
import { useAuth } from "../../../lib/auth";
import type { BookingRead, CourtRead, VenueRead, WeeklyAvailability } from "../../../lib/types";

export type Venue = {
    id: string;
    name: string;
    address: string;
    description: string;
    sports: string[];
    amenities: string[];
    status: string;       // display label, e.g. "Active" | "Payment pending"
    rawStatus?: string;   // backend status: PAYMENT_PENDING | PENDING_REVIEW | APPROVED | REJECTED
    coverImage?: string;
};

export type Court = {
    id: string;
    venueId: string;
    name: string;
    sport: string;
    pricePerHour: number;
    openTime: string;
    closeTime: string;
    active: boolean;
};

export type Booking = {
    id: string;
    courtId: string;
    venueId: string;
    playerName: string;
    playerAvatar?: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
    bookingType: "Walking" | "Court Booking";
};

export type HostedGame = {
    id: string;
    sport: string;
    location: string;
    date: string;
    time: string;
    duration: string;
    playersNeeded: number;
    skillLevel: string;
    note: string;
    bookingType: "Walking" | "Court Booking";
    venueName?: string;
    courtName?: string;
};

export type Review = {
    id: string;
    venueId: string;
    playerName: string;
    playerAvatar?: string;
    rating: number;
    comment: string;
    date: string;
};

export type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    isRead: boolean;
};

export type Conversation = {
    id: string;
    playerName: string;
    playerAvatar?: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    messages: Message[];
};

export type OwnerProfile = {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    businessName: string;
};

type VenueOwnerContextType = {
    venues: Venue[];
    courts: Court[];
    bookings: Booking[];
    reviews: Review[];
    conversations: Conversation[];
    profile: OwnerProfile;
    loading: boolean;
    loadError: string | null;
    refresh: () => Promise<void>;
    confirmPayment: (venueId: string) => Promise<MutationResult>;
    addVenue: (venue: Omit<Venue, "id" | "status">) => Promise<MutationResult>;
    addCourt: (court: Omit<Court, "id">) => Promise<MutationResult>;
    updateCourt: (id: string, court: Partial<Court>) => Promise<MutationResult>;
    updateBookingStatus: (id: string, status: Booking["status"]) => Promise<MutationResult>;
    sendMessage: (conversationId: string, text: string) => void;
    markConversationRead: (conversationId: string) => void;
    updateProfile: (profile: Partial<OwnerProfile>) => Promise<MutationResult>;
};

const VenueOwnerContext = createContext<VenueOwnerContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// API → UI adapters (backend schemas in lib/types, routers in
// app/api/v1/{venues,courts,bookings}.py). Fields the backend does not expose
// (court/booking pricing, player display names, amenities) map to a neutral
// value and the pages render them as "—".
// ---------------------------------------------------------------------------

type MutationResult = { ok: boolean; error?: string };

const VENUE_STATUS_LABELS: Record<string, string> = {
    PAYMENT_PENDING: "Payment pending",
    PENDING_REVIEW: "Pending review",
    APPROVED: "Active",
    REJECTED: "Rejected",
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function errorMessage(err: unknown): string {
    return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

function venueSportsFromCourts(courts: CourtRead[]): string[] {
    return Array.from(new Set(courts.map((c) => c.sport).filter(Boolean))).sort();
}

function availabilityWindowTimes(availability: WeeklyAvailability | null): { open: string; close: string } {
    if (!availability) return { open: "", close: "" };
    let open = "";
    let close = "";
    for (const day of DAY_KEYS) {
        for (const window of availability[day] ?? []) {
            if (!open || window.start < open) open = window.start;
            if (!close || window.end > close) close = window.end;
        }
    }
    return { open, close };
}

function toWeeklyAvailability(openTime: string, closeTime: string): WeeklyAvailability | null {
    if (!openTime || !closeTime) return null;
    const window = { start: openTime, end: closeTime };
    return { mon: [window], tue: [window], wed: [window], thu: [window], fri: [window], sat: [window], sun: [window] };
}

function toUiVenue(v: VenueRead, venueCourts: CourtRead[]): Venue {
    return {
        id: v.id,
        name: v.name,
        address: v.address,
        description: v.description ?? "",
        sports: venueSportsFromCourts(venueCourts),
        amenities: [], // not part of the backend venue schema yet
        status: VENUE_STATUS_LABELS[v.status] ?? v.status,
        rawStatus: v.status,
        coverImage: v.photo_url ?? undefined,
    };
}

function toUiCourt(c: CourtRead): Court {
    const { open, close } = availabilityWindowTimes(c.availability);
    return {
        id: c.id,
        venueId: c.venue_id,
        name: c.name,
        sport: c.sport,
        pricePerHour: 0, // pricing is not part of the backend court model
        openTime: open,
        closeTime: close,
        active: true,
    };
}

function toUiBooking(b: BookingRead): Booking {
    return {
        id: b.id,
        courtId: b.court_id,
        venueId: b.venue_id ?? "",
        playerName: "", // backend returns the booker's id, not a display name
        date: b.start_time.slice(0, 10),
        startTime: b.start_time.slice(11, 16),
        endTime: b.end_time.slice(11, 16),
        price: 0, // pricing is not part of the backend booking model
        status: b.status === "CANCELLED" ? "Cancelled" : "Confirmed",
        bookingType: "Court Booking",
    };
}

const initialReviews: Review[] = [
    { id: "r1", venueId: "v1", playerName: "John Doe", rating: 5, comment: "Amazing courts! Highly recommend.", date: "2026-09-28" },
    { id: "r2", venueId: "v1", playerName: "Alice Johnson", rating: 4, comment: "Good facilities, but parking was full.", date: "2026-09-25" },
    { id: "r3", venueId: "v2", playerName: "Jane Smith", rating: 5, comment: "Loved the clay courts.", date: "2026-09-20" },
    { id: "r4", venueId: "v2", playerName: "Bob Williams", rating: 2, comment: "Court was closed for maintenance unexpectedly.", date: "2026-09-15" },
];

const initialConversations: Conversation[] = [
    {
        id: "conv1", playerName: "John Doe", lastMessage: "See you at 10!", lastMessageTime: "10:30 AM", unreadCount: 1,
        messages: [
            { id: "m1", senderId: "player", text: "Hi, is Court A available earlier?", timestamp: "10:20 AM", isRead: false },
            { id: "m2", senderId: "owner", text: "Sorry, it's booked until 10.", timestamp: "10:25 AM", isRead: true },
            { id: "m3", senderId: "player", text: "See you at 10!", timestamp: "10:30 AM", isRead: false },
        ]
    },
    {
        id: "conv2", playerName: "Jane Smith", lastMessage: "Thanks for confirming.", lastMessageTime: "Yesterday", unreadCount: 0,
        messages: [
            { id: "m4", senderId: "owner", text: "Your booking for the clay court is confirmed.", timestamp: "Yesterday", isRead: true },
            { id: "m5", senderId: "player", text: "Thanks for confirming.", timestamp: "Yesterday", isRead: true }
        ]
    }
];

export const VenueOwnerDataProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const { profile: authProfile, session, refreshProfile } = useAuth();

    // Real data from the FastAPI backend (venues, courts, bookings).
    const [venues, setVenues] = useState<Venue[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    // Mock-only areas with no backend endpoints yet.
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [profile, setProfile] = useState<OwnerProfile>({
        name: authProfile?.name ?? "Venue Owner",
        email: session?.user?.email ?? "",
        phone: "",
        businessName: "",
        avatar: authProfile?.avatar ?? undefined,
    });

    const refresh = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const venueRows = await listMyVenues();
            const courtSets = await Promise.all(
                venueRows.map((v: VenueRead) => listVenueCourts(v.id).catch(() => [] as CourtRead[]))
            );
            const bookingSets = await Promise.all(
                venueRows.map((v: VenueRead) =>
                    listVenueBookings(v.id, { page_size: 100 })
                        .then((p) => p.items)
                        .catch(() => [] as BookingRead[])
                )
            );

            setVenues(venueRows.map((v: VenueRead, i: number) => toUiVenue(v, courtSets[i] ?? [])));
            setCourts(courtSets.flatMap((rows) => rows).map(toUiCourt));
            setBookings(bookingSets.flatMap((rows) => rows).map(toUiBooking));
        } catch (err) {
            setLoadError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Keep the owner profile shown in the UI in sync with the authenticated profile.
    useEffect(() => {
        if (!authProfile) return;
        setProfile((prev) => ({
            ...prev,
            name: authProfile.name || prev.name,
            avatar: authProfile.avatar || prev.avatar,
            email: session?.user?.email || prev.email,
        }));
    }, [authProfile, session]);

    const addVenue = useCallback(async (venue: Omit<Venue, "id" | "status">): Promise<MutationResult> => {
        try {
            await createVenue({ name: venue.name, address: venue.address, description: venue.description || null });
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const confirmPayment = useCallback(async (venueId: string): Promise<MutationResult> => {
        try {
            await confirmVenuePayment(venueId);
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const addCourt = useCallback(async (court: Omit<Court, "id">): Promise<MutationResult> => {
        try {
            await createCourt(court.venueId, {
                name: court.name,
                sport: court.sport,
                availability: toWeeklyAvailability(court.openTime, court.closeTime) ?? undefined,
            });
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const updateCourt = useCallback(async (id: string, courtUpdate: Partial<Court>): Promise<MutationResult> => {
        try {
            const availability = courtUpdate.openTime && courtUpdate.closeTime
                ? toWeeklyAvailability(courtUpdate.openTime, courtUpdate.closeTime)
                : undefined;
            await updateCourtApi(id, {
                name: courtUpdate.name,
                sport: courtUpdate.sport,
                availability: availability ?? undefined,
            });
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const updateBookingStatus = useCallback(async (id: string, status: Booking["status"]): Promise<MutationResult> => {
        if (status !== "Cancelled") {
            return { ok: false, error: "Bookings are confirmed automatically; only cancelling is supported by the API." };
        }
        try {
            await cancelBooking(id);
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const sendMessage = (conversationId: string, text: string) => {
        setConversations((prev) => prev.map(c => {
            if (c.id === conversationId) {
                const newMessage: Message = { id: `m${Date.now()}`, senderId: "owner", text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isRead: true };
                return {
                    ...c,
                    lastMessage: text,
                    lastMessageTime: newMessage.timestamp,
                    messages: [...c.messages, newMessage]
                };
            }
            return c;
        }));
    };

    const markConversationRead = (conversationId: string) => {
        setConversations((prev) => prev.map(c => {
            if (c.id === conversationId) {
                return {
                    ...c,
                    unreadCount: 0,
                    messages: c.messages.map(m => ({ ...m, isRead: true }))
                };
            }
            return c;
        }));
    };

    const updateProfile = useCallback(async (newProfile: Partial<OwnerProfile>): Promise<MutationResult> => {
        try {
            if (newProfile.name !== undefined && newProfile.name !== authProfile?.name) {
                await updateProfileApi({ name: newProfile.name });
                await refreshProfile();
            }
            setProfile((prev) => ({ ...prev, ...newProfile }));
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [authProfile, refreshProfile]);

    return (
        <VenueOwnerContext.Provider value={{
            venues, courts, bookings, reviews, conversations, profile,
            loading, loadError, refresh, confirmPayment,
            addVenue, addCourt, updateCourt, updateBookingStatus,
            sendMessage, markConversationRead, updateProfile
        }}>
            {children}
        </VenueOwnerContext.Provider>
    );
};

export const useVenueOwnerData = () => {
    const context = useContext(VenueOwnerContext);
    if (!context) throw new Error("useVenueOwnerData must be used within VenueOwnerDataProvider");
    return context;
};
