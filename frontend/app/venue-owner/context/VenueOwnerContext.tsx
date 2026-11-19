"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
    listMyVenues,
    listVenueCourts,
    listVenueBookings,
    createVenue,
    updateVenue as updateVenueApi,
    confirmVenuePayment,
    createCourt,
    updateCourt as updateCourtApi,
    cancelBooking,
    approveBooking as approveBookingApi,
    rejectBooking as rejectBookingApi,
    updateProfile as updateProfileApi,
    listOwnerVenueReviews,
} from "../../../lib/api";
import { ApiError } from "../../../lib/apiClient";
import { useAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
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
    transactionId?: string;
    courtId: string;
    courtNames: string[];
    venueId: string;
    playerName: string;
    playerAvatar?: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    status: "Pending" | "Confirmed" | "Rejected" | "Completed" | "Cancelled";
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
    venueName: string;
    playerName: string;
    playerAvatar?: string;
    rating: number;
    comment: string;
    date: string;
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
    profile: OwnerProfile;
    loading: boolean;
    loadError: string | null;
    refresh: () => Promise<void>;
    confirmPayment: (venueId: string, paymentProofPath: string) => Promise<MutationResult>;
    addVenue: (venue: Omit<Venue, "id" | "status">, photo?: File) => Promise<MutationResult>;
    addCourt: (court: Omit<Court, "id">) => Promise<MutationResult>;
    updateCourt: (id: string, court: Partial<Court>) => Promise<MutationResult>;
    updateBookingStatus: (id: string, status: Booking["status"], reason?: string) => Promise<MutationResult>;
    updateProfile: (profile: Partial<OwnerProfile>) => Promise<MutationResult>;
};

const VenueOwnerContext = createContext<VenueOwnerContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// API → UI adapters (backend schemas in lib/types, routers in
// app/api/v1/{venues,courts,bookings}.py). Fields the backend does not expose
// (court/booking pricing, player display names, amenities) map to a neutral
// value and the pages render them as "—".
// ---------------------------------------------------------------------------

type MutationResult = { ok: boolean; error?: string; created?: boolean };

const VENUE_STATUS_LABELS: Record<string, string> = {
    PAYMENT_PENDING: "Payment pending",
    PENDING_REVIEW: "Pending review",
    APPROVED: "Active",
    REJECTED: "Rejected",
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const VENUE_PHOTO_EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

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
        pricePerHour: Number(c.price_per_hour ?? 0),
        openTime: open,
        closeTime: close,
        active: true,
    };
}

function toUiBooking(b: BookingRead): Booking {
    return {
        id: b.id,
        transactionId: b.transaction_id ?? undefined,
        courtId: b.court_id,
        courtNames: b.selected_court_names?.length ? b.selected_court_names : b.court_name ? [b.court_name] : [],
        venueId: b.venue_id ?? "",
        playerName: b.booker_name ?? "",
        date: b.start_time.slice(0, 10),
        startTime: b.start_time.slice(11, 16),
        endTime: b.end_time.slice(11, 16),
        price: Number(b.final_total ?? b.line_total ?? 0),
        status: b.status === "PENDING" ? "Pending" : b.status === "REJECTED" ? "Rejected" : b.status === "CANCELLED" ? "Cancelled" : "Confirmed",
        bookingType: "Court Booking",
    };
}

export const VenueOwnerDataProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const { profile: authProfile, session, refreshProfile } = useAuth();

    // Real data from the FastAPI backend (venues, courts, bookings).
    const [venues, setVenues] = useState<Venue[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    // Review data is empty until a backend review endpoint is available.
    const [reviews, setReviews] = useState<Review[]>([]);

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
            const bookingPages = await Promise.all(
                venueRows.map((v: VenueRead) => listVenueBookings(v.id, { page_size: 100 }))
            );
            const reviewPage = await listOwnerVenueReviews({ page_size: 100 });

            setVenues(venueRows.map((v: VenueRead, i: number) => toUiVenue(v, courtSets[i] ?? [])));
            setCourts(courtSets.flatMap((rows) => rows).map(toUiCourt));
            setBookings(bookingPages.flatMap((page) => page.items).map(toUiBooking));
            setReviews(reviewPage.items.map((review) => ({
                id: review.id,
                venueId: review.venue_id,
                venueName: review.venue_name,
                playerName: review.player_name || "Player",
                playerAvatar: review.player_avatar ?? undefined,
                rating: review.rating,
                comment: review.comment ?? "",
                date: review.created_at,
            })));
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
        const metadata = session?.user.user_metadata;
        const metadataName = [metadata?.name, metadata?.full_name, metadata?.display_name]
            .find((value): value is string => typeof value === "string" && value.trim().length > 0)
            ?.trim();
        const profileName = authProfile?.name?.trim();
        const displayName = profileName && !["member", "venue owner"].includes(profileName.toLowerCase())
            ? profileName
            : metadataName || session?.user.email?.split("@")[0]?.trim() || "Venue Owner";

        setProfile((prev) => ({
            ...prev,
            name: displayName,
            avatar: authProfile?.avatar || prev.avatar,
            email: session?.user.email || prev.email,
        }));
    }, [authProfile, session]);

    const addVenue = useCallback(async (venue: Omit<Venue, "id" | "status">, photo?: File): Promise<MutationResult> => {
        let created = false;
        try {
            const createdVenue = await createVenue({
                name: venue.name,
                address: venue.address,
                description: venue.description || null,
            });
            created = true;

            if (photo) {
                const extension = VENUE_PHOTO_EXTENSIONS[photo.type];
                if (!extension) throw new Error("Choose a JPG, PNG, or WebP image.");

                const photoPath = `${createdVenue.id}/cover.${extension}`;
                const { error: uploadError } = await supabase.storage
                    .from("venue-photos")
                    .upload(photoPath, photo, {
                        cacheControl: "3600",
                        contentType: photo.type,
                        upsert: true,
                    });
                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from("venue-photos").getPublicUrl(photoPath);
                await updateVenueApi(createdVenue.id, { photo_url: data.publicUrl });
            }

            await refresh();
            return { ok: true };
        } catch (err) {
            if (created) {
                await refresh();
                const detail = err instanceof Error ? err.message : errorMessage(err);
                return {
                    ok: false,
                    created: true,
                    error: `Venue was created, but its photo could not be saved: ${detail}`,
                };
            }
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const confirmPayment = useCallback(async (venueId: string, paymentProofPath: string): Promise<MutationResult> => {
        try {
            await confirmVenuePayment(venueId, paymentProofPath);
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
                price_per_hour: court.pricePerHour,
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
                price_per_hour: courtUpdate.pricePerHour,
                availability: availability ?? undefined,
            });
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

    const updateBookingStatus = useCallback(async (
        id: string,
        status: Booking["status"],
        reason?: string,
    ): Promise<MutationResult> => {
        try {
            if (status === "Confirmed") await approveBookingApi(id);
            else if (status === "Rejected") {
                if (!reason?.trim()) return { ok: false, error: "Please provide a reason for rejecting this booking." };
                await rejectBookingApi(id, reason.trim());
            }
            else if (status === "Cancelled") await cancelBooking(id);
            else return { ok: false, error: "Unsupported booking status change." };
            await refresh();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: errorMessage(err) };
        }
    }, [refresh]);

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
            venues, courts, bookings, reviews, profile,
            loading, loadError, refresh, confirmPayment,
            addVenue, addCourt, updateCourt, updateBookingStatus,
            updateProfile
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
