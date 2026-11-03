"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, RefreshCw, XCircle, Loader2, User, X, Pencil, Tag } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import {
    cancelMatch,
    createBooking,
    listMatches,
    listVenueDiscounts,
    quoteBooking,
    searchCourts,
    updateMatch,
} from "../../../lib/api";
import type { BookingQuoteRead, CourtSearchItem, MatchRead, VenueDiscountRead } from "../../../lib/types";
import { useAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";

const SPORT_ICONS: Record<string, string> = {
    Basketball: "🏀",
    Tennis: "🎾",
    Football: "⚽",
    Badminton: "🏸",
    Volleyball: "🏐",
    Cricket: "🏏",
    Golf: "⛳",
    Swimming: "🏊",
    Cycling: "🚴",
    Running: "🏃",
};

const SPORTS = Object.keys(SPORT_ICONS);
const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

type Notice = { message: string; kind: "info" | "success" | "error" };

function formatGameDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function hasMatchStarted(date: string, time: string): boolean {
    const start = new Date(`${date}T${time.slice(0, 8)}+07:00`).getTime();
    return Number.isFinite(start) && start <= Date.now();
}

function formatPostedDateTime(dateTime: string): string {
    const d = new Date(dateTime);
    if (Number.isNaN(d.getTime())) return dateTime;
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function skillLabel(level: string): string {
    return level.charAt(0) + level.slice(1).toLowerCase();
}

function gameStatusLabel(status: string): string {
    switch (status) {
        case "FULL": return "Full";
        case "COMPLETED": return "Completed";
        case "CANCELLED": return "Cancelled";
        default: return "";
    }
}

type ListingTab = "active" | "completed" | "cancelled";

function formatPrice(value: number | string): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function localDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function MyListingsPage() {
    const { profile } = useAuth();
    const [matches, setMatches] = useState<MatchRead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [liveUpdateError, setLiveUpdateError] = useState<string | null>(null);
    const [liveUpdatesActive, setLiveUpdatesActive] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [cancelMatchConfirmation, setCancelMatchConfirmation] = useState<MatchRead | null>(null);
    const [listingTab, setListingTab] = useState<ListingTab>("active");
    const [bookingMatch, setBookingMatch] = useState<MatchRead | null>(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingCourts, setBookingCourts] = useState<CourtSearchItem[]>([]);
    const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
    const [bookingDiscounts, setBookingDiscounts] = useState<VenueDiscountRead[]>([]);
    const [promoCode, setPromoCode] = useState("");
    const [bookingQuote, setBookingQuote] = useState<BookingQuoteRead | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [viewMatch, setViewMatch] = useState<MatchRead | null>(null);
    const [editMatch, setEditMatch] = useState<MatchRead | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        sport: "",
        location: "",
        date: "",
        time: "",
        playersNeeded: "",
        skillLevel: "BEGINNER",
    });
    const count = matches.length;

    const load = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
            setError(null);
        }
        try {
            let page = await listMatches({
                created_by_me: true,
                page_size: 100,
                status: "OPEN,FULL,READY,CONFIRMED,COMPLETED,CANCELLED",
            });
            const allMatches = [...page.items];
            while (allMatches.length < page.total) {
                page = await listMatches({
                    created_by_me: true,
                    page_size: 100,
                    page: page.page + 1,
                    status: "OPEN,FULL,READY,CONFIRMED,COMPLETED,CANCELLED",
                });
                if (page.items.length === 0) break;
                allMatches.push(...page.items);
            }
            setMatches(allMatches);
            setViewMatch((current) =>
                current ? allMatches.find((match) => match.id === current.id) ?? current : null
            );
            setLiveUpdateError(null);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to load your listings";
            if (showLoading) {
                setError(message);
            } else {
                setLiveUpdateError(`Could not refresh player counts: ${message}`);
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel(`hosted-match-players-${profile.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "match_players" },
                () => {
                    void load(false);
                },
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    setLiveUpdatesActive(true);
                    setLiveUpdateError(null);
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    setLiveUpdatesActive(false);
                    setLiveUpdateError("Live player updates are unavailable. Refresh to check the latest count.");
                }
            });

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [load, profile?.id]);

    const categorizedMatches = {
        active: matches
            .filter((match) => ["OPEN", "FULL", "READY", "CONFIRMED"].includes(match.status))
            .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
        completed: matches
            .filter((match) => match.status === "COMPLETED")
            .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)),
        cancelled: matches
            .filter((match) => match.status === "CANCELLED")
            .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)),
    };

    const handleCancel = async () => {
        if (!cancelMatchConfirmation) return;
        const match = cancelMatchConfirmation;
        setBusyId(match.id);
        setNotice(null);
        try {
            await cancelMatch(match.id);
            setMatches((prev) => prev.map((item) => item.id === match.id ? { ...item, status: "CANCELLED" } : item));
            setCancelMatchConfirmation(null);
            setNotice({ message: "Game cancelled. It remains available in your Cancelled listings.", kind: "success" });
        } catch (err) {
            setNotice({ message: err instanceof ApiError ? err.message : "Could not cancel the match", kind: "error" });
        } finally {
            setBusyId(null);
        }
    };

    const handleBookCourt = async (match: MatchRead) => {
        if (!match.court_id || !match.venue_id) return;
        if (hasMatchStarted(match.date, match.time)) {
            setNotice({ message: "This game has already started. Court booking requests are no longer available.", kind: "error" });
            return;
        }
        setBusyId(match.id);
        setBookingLoading(true);
        setQuoteError(null);
        try {
            const duration = match.court_duration_minutes ?? 60;
            const [available, discounts] = await Promise.all([
                searchCourts({
                    date: match.date,
                    start_time: match.time.slice(0, 5),
                    duration_minutes: duration,
                    sport: match.sport,
                    location: match.venue_name ?? undefined,
                    page_size: 100,
                }),
                listVenueDiscounts(match.venue_id),
            ]);
            const sameVenue = available.items.filter((court) => court.venue_id === match.venue_id);
            setBookingCourts(sameVenue);
            setSelectedCourtIds(sameVenue.some((court) => court.id === match.court_id) ? [match.court_id] : []);
            setBookingDiscounts(discounts.filter((discount) =>
                discount.active && discount.code && discount.valid_until >= localDate()
                && (discount.usage_limit === null || discount.usage_count < discount.usage_limit)
            ));
            setPromoCode("");
            setBookingQuote(null);
            setBookingMatch(match);
        } catch (err) {
            setNotice({ message: err instanceof ApiError ? err.message : "Could not load available courts.", kind: "error" });
        } finally {
            setBusyId(null);
            setBookingLoading(false);
        }
    };

    useEffect(() => {
        if (!bookingMatch || selectedCourtIds.length === 0) {
            setBookingQuote(null);
            setQuoteError(null);
            return;
        }
        let current = true;
        setQuoteLoading(true);
        setBookingQuote(null);
        setQuoteError(null);
        const timer = window.setTimeout(() => {
            void quoteBooking({
                match_id: bookingMatch.id,
                court_ids: selectedCourtIds,
                duration_minutes: bookingMatch.court_duration_minutes ?? 60,
                promo_code: promoCode.trim() || null,
            }).then((quote) => {
                if (current) setBookingQuote(quote);
            }).catch((err: unknown) => {
                if (current) setQuoteError(err instanceof ApiError ? err.message : "Could not calculate this booking.");
            }).finally(() => {
                if (current) setQuoteLoading(false);
            });
        }, 200);
        return () => {
            current = false;
            window.clearTimeout(timer);
        };
    }, [bookingMatch, selectedCourtIds, promoCode]);

    const toggleCourt = (courtId: string) => {
        setSelectedCourtIds((selected) => selected.includes(courtId)
            ? selected.filter((id) => id !== courtId)
            : [...selected, courtId]);
    };

    const submitBooking = async () => {
        if (!bookingMatch || selectedCourtIds.length === 0) return;
        setBusyId(bookingMatch.id);
        setNotice({ message: "Sending your court booking request…", kind: "info" });
        try {
            const booking = await createBooking({
                match_id: bookingMatch.id,
                court_id: bookingMatch.court_id ?? undefined,
                court_ids: selectedCourtIds,
                duration_minutes: bookingMatch.court_duration_minutes ?? 60,
                promo_code: promoCode.trim() || null,
            });
            setMatches((current) => current.map((item) =>
                item.id === bookingMatch.id ? { ...item, court_booking_status: booking.status } : item
            ));
            setBookingMatch(null);
            setNotice({
                message: `Booking request sent for ${booking.selected_court_names?.join(", ") ?? `${selectedCourtIds.length} court(s)`}. Total: ${formatPrice(booking.final_total ?? bookingQuote?.final_total ?? 0)}. The venue will review it.`,
                kind: "success",
            });
        } catch (err) {
            setNotice({ message: err instanceof ApiError ? err.message : "Could not book the selected courts.", kind: "error" });
        } finally {
            setBusyId(null);
        }
    };

    const openEdit = (match: MatchRead) => {
        setEditMatch(match);
        setEditError(null);
        setEditForm({
            sport: match.sport,
            location: match.location,
            date: match.date,
            time: match.time.slice(0, 5),
            playersNeeded: String(match.players_needed),
            skillLevel: match.skill_level,
        });
    };

    const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editMatch) return;
        setBusyId(editMatch.id);
        setEditError(null);
        try {
            const updated = await updateMatch(editMatch.id, {
                sport: editForm.sport,
                location: editForm.location,
                date: editForm.date,
                time: editForm.time,
                players_needed: Number(editForm.playersNeeded),
                skill_level: editForm.skillLevel,
            });
            setMatches((current) => current.map((match) => match.id === updated.id
                ? { ...match, ...updated }
                : match));
            setEditMatch(null);
            setNotice({ message: "Match updated.", kind: "success" });
        } catch (err) {
            setEditError(err instanceof ApiError ? err.message : "Could not update the match.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="min-h-screen px-4 py-10 sm:px-6 sm:py-12" style={{ background: "#F8F5F0" }}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold" style={{ color: "#2B1A0F" }}>
                            My listings
                        </h1>
                        <p className="mt-1 text-base font-medium" style={{ color: "#8B6147" }}>
                            {count === 0
                                ? "0 games you're hosting"
                                : `${count} game${count > 1 ? "s" : ""} you're hosting`}
                        </p>
                    </div>

                    <Link
                        href="/player/host"
                        className="flex items-center gap-2 font-bold text-white px-5 py-3 rounded-full shadow-md transition-all text-sm active:scale-95"
                        style={{ background: "#D97736" }}
                    >
                        <Plus size={16} />
                        Host a game
                    </Link>
                </div>

                {notice && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`mb-6 text-sm font-medium border rounded-xl px-4 py-3 shadow-sm ${
                            notice.kind === "error"
                                ? "text-red-700 bg-red-50 border-red-200"
                                : notice.kind === "success"
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                    : "text-slate-700 bg-white border-gray-100"
                        }`}
                    >
                        {notice.message}
                    </p>
                )}

                {liveUpdateError && (
                    <p role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {liveUpdateError}
                        <button onClick={() => void load(false)} className="ml-2 font-semibold underline">
                            Refresh
                        </button>
                    </p>
                )}

                {!loading && !error && count > 0 && (
                    <div className="mb-6 flex w-full max-w-xl rounded-2xl border border-[#E8E3DE] bg-white p-1 shadow-sm" role="tablist" aria-label="My game listings">
                        {([
                            ["active", "Active"],
                            ["completed", "Completed"],
                            ["cancelled", "Cancelled"],
                        ] as const).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={listingTab === key}
                                onClick={() => setListingTab(key)}
                                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${listingTab === key ? "bg-[#201405] text-white" : "text-slate-600 hover:bg-slate-50"}`}
                            >
                                {label} <span className="ml-1 opacity-75">{categorizedMatches[key].length}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="space-y-4">
                        {[0, 1].map((i) => (
                            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm animate-pulse">
                                <div className="h-4 w-32 bg-gray-100 rounded mb-3" />
                                <div className="h-4 w-48 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-3xl border py-16 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
                        <p className="text-slate-600 font-medium">{error}</p>
                        <button
                            onClick={() => void load()}
                            className="inline-flex items-center gap-2 font-bold text-white px-5 py-2.5 rounded-full transition-colors"
                            style={{ background: "#D97736" }}
                        >
                            <RefreshCw size={15} /> Try again
                        </button>
                    </div>
                ) : count === 0 ? (
                    <div
                        className="bg-white rounded-3xl border py-24 flex flex-col items-center justify-center text-center gap-4 shadow-sm"
                        style={{ borderColor: "#EAD9C2" }}
                    >
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                            style={{ background: "#FFF3E5" }}
                        >
                            <ClipboardList size={28} style={{ color: "#D97736" }} />
                        </div>
                        <p className="text-lg font-extrabold text-slate-800">
                            You haven't hosted any games yet.
                        </p>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Host your first game and players near you will be able to find and join it.
                        </p>
                        <Link
                            href="/player/host"
                            className="mt-2 font-bold text-white px-6 py-3 rounded-full shadow-md transition-all active:scale-95"
                            style={{ background: "#D97736" }}
                        >
                            Host a game
                        </Link>
                    </div>
                ) : categorizedMatches[listingTab].length === 0 ? (
                    <div className="rounded-3xl border border-[#EAD9C2] bg-white px-6 py-16 text-center shadow-sm">
                        <p className="font-bold text-slate-800">No {listingTab} games</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {listingTab === "active" ? "Upcoming games you host will appear here." : "Your game history will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {categorizedMatches[listingTab].map((match) => {
                            const skill = skillLabel(match.skill_level);
                            const canCancel = match.status === "OPEN" || match.status === "FULL" || match.status === "CONFIRMED";
                            const matchStarted = hasMatchStarted(match.date, match.time);
                            const canEdit = match.status !== "CANCELLED"
                                && match.status !== "COMPLETED";

                            return (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-2xl shadow-sm border border-[#E8E3DE] p-5 sm:p-6"
                                >
                                    <div className="flex gap-4">
                                        <div className="hidden h-[104px] w-[104px] shrink-0 items-center justify-center rounded-2xl bg-[#EAD7C2] text-5xl sm:flex">
                                            {SPORT_ICONS[match.sport] ?? "🏆"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EFE7DE] text-slate-500">
                                                        {profile?.avatar
                                                            ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                                                            : <User size={19} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-slate-900">{profile?.name ?? "You"}</p>
                                                        <p className="text-sm text-slate-500">Host</p>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    {gameStatusLabel(match.status) && (
                                                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${match.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : match.status === "COMPLETED" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700"}`}>
                                                            {gameStatusLabel(match.status)}
                                                        </span>
                                                    )}
                                                    <span className="rounded-full bg-[#FFF0E1] px-3 py-1.5 text-xs font-semibold text-[#B85D14]">
                                                        {skill}
                                                    </span>
                                                </div>
                                            </div>

                                            <h2 className="mb-2 text-lg font-bold text-slate-950 sm:text-xl">
                                                {match.sport}
                                            </h2>
                                            <div className="grid gap-x-8 gap-y-1.5 text-sm text-slate-700 sm:grid-cols-2">
                                                <p><span className="font-semibold text-slate-950">Location:</span> {match.location}</p>
                                                {match.court_id && (
                                                    <p>
                                                        <span className="font-semibold text-slate-950">Court:</span>{" "}
                                                        {match.venue_name} — {match.court_name}{" "}
                                                        <span className={`ml-1 text-xs font-semibold ${match.court_booking_status === "CONFIRMED" ? "text-emerald-700" : match.court_booking_status === "REJECTED" ? "text-rose-700" : "text-amber-700"}`}>
                                                            ({match.court_booking_status === "CONFIRMED" ? "Confirmed" : match.court_booking_status === "PENDING" ? "Awaiting venue approval" : match.court_booking_status === "REJECTED" ? "Request declined" : "Booking not requested"})
                                                        </span>
                                                    </p>
                                                )}
                                                <p><span className="font-semibold text-slate-950">Date:</span> {formatGameDate(match.date)}</p>
                                                <p><span className="font-semibold text-slate-950">Time:</span> {match.time.slice(0, 5)}</p>
                                                <p><span className="font-semibold text-slate-950">Posted:</span> {formatPostedDateTime(match.created_at)}</p>
                                                <p className="flex items-center gap-2">
                                                    <span>
                                                        <span className="font-semibold text-slate-950">Additional players joined:</span>{" "}
                                                        {match.joined_count_excluding_host ?? "—"} / {match.players_needed}
                                                    </span>
                                                    {liveUpdatesActive && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            Live
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFEAE5] pt-4">
                                                <span className="text-sm text-slate-500">{match.venue_name ?? match.location}</span>
                                                <div className="flex items-center gap-2">
                                                    {canEdit && (
                                                        <button
                                                            title="Edit game"
                                                            disabled={busyId === match.id}
                                                            onClick={() => openEdit(match)}
                                                            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                                        >
                                                            <Pencil size={15} />
                                                            Edit game
                                                        </button>
                                                    )}
                                                    {match.court_id && ["AVAILABLE", "REJECTED", "CANCELLED"].includes(match.court_booking_status ?? "") && match.status === "FULL" && matchStarted && (
                                                        <span className="text-xs font-semibold text-slate-500">
                                                            Game time passed; booking unavailable
                                                        </span>
                                                    )}
                                                    {match.court_id && ["AVAILABLE", "REJECTED", "CANCELLED"].includes(match.court_booking_status ?? "") && match.status === "FULL" && !matchStarted && (
                                                        <button
                                                            disabled={busyId === match.id}
                                                            onClick={() => handleBookCourt(match)}
                                                            className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                                        >
                                                            {busyId === match.id
                                                                ? <Loader2 size={15} className="animate-spin" />
                                                                : null}
                                                            {busyId === match.id
                                                                ? bookingLoading ? "Checking courts…" : "Sending request…"
                                                                : match.court_booking_status === "AVAILABLE" ? "Request court booking" : "Request again"}
                                                        </button>
                                                    )}
                                                    {canCancel && (
                                                        <button
                                                            title="Cancel match"
                                                            disabled={busyId === match.id}
                                                            onClick={() => setCancelMatchConfirmation(match)}
                                                            className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            {busyId === match.id
                                                                ? <Loader2 size={15} className="animate-spin" />
                                                                : <XCircle size={15} />}
                                                            Cancel
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setViewMatch(match)}
                                                        className="h-10 rounded-full bg-[#201405] px-6 text-sm font-bold text-white transition-colors hover:bg-[#39260D]"
                                                    >
                                                        View game
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {bookingMatch && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        role="presentation"
                        onClick={() => setBookingMatch(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="booking-title"
                            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <div>
                                    <h2 id="booking-title" className="text-xl font-bold text-slate-950">Book courts</h2>
                                    <p className="mt-1 text-sm text-slate-500">{bookingMatch.venue_name} · {formatGameDate(bookingMatch.date)} at {bookingMatch.time.slice(0, 5)}</p>
                                </div>
                                <button type="button" onClick={() => setBookingMatch(null)} aria-label="Close booking" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                                    <X size={18} />
                                </button>
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="mb-2 text-sm font-bold text-slate-800">Available courts at this venue</legend>
                                {bookingCourts.length > 0 && !bookingCourts.some((court) => court.id === bookingMatch.court_id) && (
                                    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                        The court selected for this game is no longer available for this time slot.
                                    </p>
                                )}
                                {bookingCourts.length === 0 ? (
                                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                        No courts are available for this date and time. Refresh the listing and try again later.
                                    </p>
                                ) : bookingCourts.map((court) => {
                                    const requiredCourt = court.id === bookingMatch.court_id;
                                    return (
                                        <label key={court.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:border-emerald-300 hover:bg-emerald-50/40">
                                            <span className="flex min-w-0 items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCourtIds.includes(court.id)}
                                                    disabled={requiredCourt || !bookingCourts.some((available) => available.id === bookingMatch.court_id) || (selectedCourtIds.length >= 10 && !selectedCourtIds.includes(court.id))}
                                                    onChange={() => toggleCourt(court.id)}
                                                    className="h-4 w-4 accent-emerald-600"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-slate-800">{court.name}{requiredCourt ? " · selected for this game" : ""}</span>
                                                    <span className="block text-xs text-slate-500">{court.sport}</span>
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-sm font-semibold text-slate-700">
                                                {court.price_per_hour !== null ? `${formatPrice(court.price_per_hour)}/hour` : "Price not set"}
                                            </span>
                                        </label>
                                    );
                                })}
                                {bookingCourts.length > 0 && !selectedCourtIds.includes(bookingMatch.court_id ?? "") && (
                                    <p role="alert" className="text-xs text-rose-700">The court selected for this game must be available and included.</p>
                                )}
                            </fieldset>

                            <div className="mt-5">
                                <label htmlFor="booking-promo" className="mb-2 block text-sm font-bold text-slate-800">Promo code</label>
                                <div className="flex gap-2">
                                    <input
                                        id="booking-promo"
                                        value={promoCode}
                                        onChange={(event) => setPromoCode(event.target.value)}
                                        placeholder="Enter a promo code"
                                        maxLength={50}
                                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                                    />
                                    {promoCode && (
                                        <button type="button" onClick={() => setPromoCode("")} className="rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {bookingDiscounts.length > 0 && (
                                    <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800"><Tag size={13} /> Available offers</p>
                                        <ul className="space-y-1.5 text-xs text-emerald-900">
                                            {bookingDiscounts.map((discount) => (
                                                <li key={discount.id}>
                                                    <button type="button" onClick={() => setPromoCode(discount.code ?? "")} className="font-bold underline decoration-emerald-300 underline-offset-2">
                                                        {discount.code}
                                                    </button>
                                                    {" — "}
                                                    {discount.percent_off !== null ? `${discount.percent_off}% off` : `${formatPrice(discount.amount_off ?? 0)} off`}
                                                    {discount.usage_limit !== null && ` · ${Math.max(0, discount.usage_limit - discount.usage_count)} uses left`}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <section aria-label="Booking price summary" className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="mb-3 text-sm font-bold text-slate-900">Price summary</h3>
                                {quoteLoading ? (
                                    <p className="text-sm text-slate-500">Checking availability and calculating total…</p>
                                ) : quoteError ? (
                                    <p role="alert" className="text-sm text-rose-700">{quoteError}</p>
                                ) : bookingQuote ? (
                                    <>
                                        <div className="mb-3 space-y-1.5">
                                            {bookingQuote.courts.map((court) => (
                                                <div key={court.id} className="flex justify-between gap-3 text-sm text-slate-600">
                                                    <span>{court.name} · {formatPrice(court.price_per_hour)}/hour × {bookingQuote.duration_minutes / 60}h</span>
                                                    <span>{formatPrice(court.line_total)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <dl className="space-y-2 border-t border-slate-200 pt-3 text-sm">
                                            <div className="flex justify-between text-slate-600"><dt>Courts selected</dt><dd>{bookingQuote.courts.length}</dd></div>
                                            <div className="flex justify-between text-slate-600"><dt>Duration</dt><dd>{bookingQuote.duration_minutes} minutes</dd></div>
                                            <div className="flex justify-between text-slate-700"><dt>Original total</dt><dd>{formatPrice(bookingQuote.original_total)}</dd></div>
                                            {Number(bookingQuote.discount_amount) > 0 && (
                                                <div className="flex justify-between font-medium text-emerald-700"><dt>Discount{bookingQuote.promo_code ? ` (${bookingQuote.promo_code})` : ""}</dt><dd>−{formatPrice(bookingQuote.discount_amount)}</dd></div>
                                            )}
                                            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-950"><dt>Final total</dt><dd>{formatPrice(bookingQuote.final_total)}</dd></div>
                                        </dl>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-500">Select an available court to see the total.</p>
                                )}
                            </section>

                            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setBookingMatch(null)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button
                                    type="button"
                                    disabled={busyId === bookingMatch.id || quoteLoading || !bookingQuote || !!quoteError}
                                    onClick={() => void submitBooking()}
                                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {busyId === bookingMatch.id ? "Sending request…" : "Request booking"}
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {editMatch && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        role="presentation"
                        onClick={() => setEditMatch(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="edit-game-title"
                            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 id="edit-game-title" className="text-xl font-bold text-slate-950">Edit hosted game</h2>
                                <button
                                    type="button"
                                    onClick={() => setEditMatch(null)}
                                    aria-label="Close edit form"
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            {(editMatch.court_booking_status === "PENDING" || editMatch.court_booking_status === "CONFIRMED") && (
                                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    Cancel the active court booking before changing the sport, date, or time.
                                </p>
                            )}
                            {editError && (
                                <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {editError}
                                </p>
                            )}
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Sport
                                    <select
                                        value={editForm.sport}
                                        onChange={(event) => setEditForm((form) => ({ ...form, sport: event.target.value }))}
                                        disabled={editMatch.court_booking_status === "PENDING" || editMatch.court_booking_status === "CONFIRMED"}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 disabled:bg-slate-100"
                                    >
                                        {SPORTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                                    </select>
                                </label>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Location
                                    <input
                                        required
                                        value={editForm.location}
                                        onChange={(event) => setEditForm((form) => ({ ...form, location: event.target.value }))}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Date
                                        <input
                                            required
                                            type="date"
                                            value={editForm.date}
                                            disabled={editMatch.court_booking_status === "PENDING" || editMatch.court_booking_status === "CONFIRMED"}
                                            onChange={(event) => setEditForm((form) => ({ ...form, date: event.target.value }))}
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                                        />
                                    </label>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Time
                                        <input
                                            required
                                            type="time"
                                            value={editForm.time}
                                            disabled={editMatch.court_booking_status === "PENDING" || editMatch.court_booking_status === "CONFIRMED"}
                                            onChange={(event) => setEditForm((form) => ({ ...form, time: event.target.value }))}
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Additional players needed
                                        <input
                                            required
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={editForm.playersNeeded}
                                            onChange={(event) => setEditForm((form) => ({ ...form, playersNeeded: event.target.value }))}
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                                        />
                                    </label>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Skill level
                                        <select
                                            value={editForm.skillLevel}
                                            onChange={(event) => setEditForm((form) => ({ ...form, skillLevel: event.target.value }))}
                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                                        >
                                            {SKILL_LEVELS.map((level) => (
                                                <option key={level} value={level}>{skillLabel(level)}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditMatch(null)}
                                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={busyId === editMatch.id}
                                        className="rounded-full bg-[#D97736] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                                    >
                                        {busyId === editMatch.id ? "Saving…" : "Save changes"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                {cancelMatchConfirmation && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        role="presentation"
                        onClick={() => {
                            if (busyId !== cancelMatchConfirmation.id) setCancelMatchConfirmation(null);
                        }}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="cancel-game-title"
                            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <h2 id="cancel-game-title" className="text-xl font-bold text-slate-950">
                                Cancel this game?
                            </h2>
                            <p className="mt-3 text-sm text-slate-600">
                                This will remove {cancelMatchConfirmation.sport} from game listings. The game record will be kept.
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={busyId === cancelMatchConfirmation.id}
                                    onClick={() => setCancelMatchConfirmation(null)}
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                                >
                                    Keep game
                                </button>
                                <button
                                    type="button"
                                    disabled={busyId === cancelMatchConfirmation.id}
                                    onClick={() => void handleCancel()}
                                    className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {busyId === cancelMatchConfirmation.id ? "Cancelling…" : "Cancel game"}
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {viewMatch && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        role="presentation"
                        onClick={() => setViewMatch(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="view-game-title"
                            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 id="view-game-title" className="text-xl font-bold text-slate-950">{viewMatch.sport}</h2>
                                    {gameStatusLabel(viewMatch.status) && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{gameStatusLabel(viewMatch.status)}</span>}
                                </div>
                                <button
                                    onClick={() => setViewMatch(null)}
                                    aria-label="Close game details"
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <dl className="space-y-3 text-sm text-slate-700">
                                <div><dt className="inline font-semibold text-slate-950">Location: </dt><dd className="inline">{viewMatch.location}</dd></div>
                                {viewMatch.court_id && (
                                    <>
                                        <div><dt className="inline font-semibold text-slate-950">Venue: </dt><dd className="inline">{viewMatch.venue_name}</dd></div>
                                        <div><dt className="inline font-semibold text-slate-950">Court: </dt><dd className="inline">{viewMatch.court_name} ({viewMatch.court_booking_status === "CONFIRMED" ? "Booking confirmed" : viewMatch.court_booking_status === "PENDING" ? "Awaiting venue approval" : viewMatch.court_booking_status === "REJECTED" ? "Request declined" : "Booking not requested"})</dd></div>
                                    </>
                                )}
                                <div><dt className="inline font-semibold text-slate-950">Date: </dt><dd className="inline">{formatGameDate(viewMatch.date)}</dd></div>
                                <div><dt className="inline font-semibold text-slate-950">Time: </dt><dd className="inline">{viewMatch.time.slice(0, 5)}</dd></div>
                                <div><dt className="inline font-semibold text-slate-950">Posted: </dt><dd className="inline">{formatPostedDateTime(viewMatch.created_at)}</dd></div>
                                <div>
                                    <dt className="inline font-semibold text-slate-950">Additional players joined: </dt>
                                    <dd className="inline">{viewMatch.joined_count_excluding_host ?? "—"} / {viewMatch.players_needed}</dd>
                                    {liveUpdatesActive && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Live
                                        </span>
                                    )}
                                </div>
                                <div><dt className="inline font-semibold text-slate-950">Skill level: </dt><dd className="inline">{skillLabel(viewMatch.skill_level)}</dd></div>
                            </dl>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
