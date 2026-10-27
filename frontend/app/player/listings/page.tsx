"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, RefreshCw, XCircle, Loader2, User, X, Pencil } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { cancelMatch, createBooking, listMatches, updateMatch } from "../../../lib/api";
import type { MatchRead } from "../../../lib/types";
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
        case "OPEN": return "Open game";
        case "FULL": return "Hosting full";
        case "READY": return "Ready";
        case "CONFIRMED": return "Confirmed";
        case "COMPLETED": return "Completed";
        case "CANCELLED": return "Cancelled";
        default: return status;
    }
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
            const page = await listMatches({ created_by_me: true, page_size: 100 });
            setMatches(page.items);
            setViewMatch((current) =>
                current ? page.items.find((match) => match.id === current.id) ?? current : null
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

    const handleCancel = async () => {
        if (!cancelMatchConfirmation) return;
        const match = cancelMatchConfirmation;
        setBusyId(match.id);
        setNotice(null);
        try {
            await cancelMatch(match.id);
            setMatches((prev) => prev.filter((item) => item.id !== match.id));
            setCancelMatchConfirmation(null);
            setNotice({ message: "Game cancelled and removed from listings.", kind: "success" });
        } catch (err) {
            setNotice({ message: err instanceof ApiError ? err.message : "Could not cancel the match", kind: "error" });
        } finally {
            setBusyId(null);
        }
    };

    const handleBookCourt = async (match: MatchRead) => {
        if (!match.court_id) return;
        if (hasMatchStarted(match.date, match.time)) {
            setNotice({ message: "This game has already started. Court booking requests are no longer available.", kind: "error" });
            return;
        }
        setBusyId(match.id);
        setNotice({ message: "Sending your court booking request…", kind: "info" });
        try {
            const booking = await createBooking({
                match_id: match.id,
                court_id: match.court_id,
                duration_minutes: match.court_duration_minutes ?? 60,
            });
            setMatches((current) => current.map((item) =>
                item.id === match.id
                    ? { ...item, court_booking_status: booking.status }
                    : item
            ));
            setNotice({ message: "Booking request sent to the venue. You’ll be notified when it’s reviewed.", kind: "success" });
        } catch (err) {
            setNotice({ message: err instanceof ApiError ? err.message : "Could not book the selected court.", kind: "error" });
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
                ) : (
                    <div className="grid gap-4">
                        {matches.map((match) => {
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
                                                <span className="shrink-0 rounded-full bg-[#FFF0E1] px-3 py-1.5 text-xs font-semibold text-[#B85D14]">
                                                    {skill}
                                                </span>
                                            </div>

                                            <h2 className="mb-2 text-lg font-bold text-slate-950 sm:text-xl">
                                                {match.sport} — {gameStatusLabel(match.status)}
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
                                                <p className="text-sm text-slate-600">
                                                    <span className="font-semibold text-slate-900">Skill level:</span> {skill}
                                                    <span className="ml-3 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                        {gameStatusLabel(match.status)}
                                                    </span>
                                                </p>
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
                                                                ? "Sending request…"
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
                                <h2 id="view-game-title" className="text-xl font-bold text-slate-950">
                                    {viewMatch.sport} — {gameStatusLabel(viewMatch.status)}
                                </h2>
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
