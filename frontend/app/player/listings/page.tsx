"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, RefreshCw, XCircle, Loader2, User, X } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { cancelMatch, listMatches } from "../../../lib/api";
import type { MatchRead } from "../../../lib/types";
import { useAuth } from "../../../lib/auth";

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

function formatGameDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
    const [notice, setNotice] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [viewMatch, setViewMatch] = useState<MatchRead | null>(null);
    const count = matches.length;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const page = await listMatches({ created_by_me: true, page_size: 100 });
            setMatches(page.items);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load your listings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleCancel = async (id: string) => {
        setBusyId(id);
        setNotice(null);
        try {
            await cancelMatch(id);
            setMatches((prev) => prev.filter((m) => m.id !== id));
            setNotice("Match cancelled.");
        } catch (err) {
            setNotice(err instanceof ApiError ? err.message : "Could not cancel the match");
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
                    <p className="mb-6 text-sm font-medium text-slate-700 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                        {notice}
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
                            onClick={load}
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
                                                <p><span className="font-semibold text-slate-950">Date:</span> {formatGameDate(match.date)}</p>
                                                <p><span className="font-semibold text-slate-950">Time:</span> {match.time.slice(0, 5)}</p>
                                                <p><span className="font-semibold text-slate-950">Players needed:</span> {match.players_needed}</p>
                                            </div>

                                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFEAE5] pt-4">
                                                <p className="text-sm text-slate-600">
                                                    <span className="font-semibold text-slate-900">Skill level:</span> {skill}
                                                    <span className="ml-3 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                        {gameStatusLabel(match.status)}
                                                    </span>
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {canCancel && (
                                                        <button
                                                            title="Cancel match"
                                                            disabled={busyId === match.id}
                                                            onClick={() => handleCancel(match.id)}
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
                                <div><dt className="inline font-semibold text-slate-950">Date: </dt><dd className="inline">{formatGameDate(viewMatch.date)}</dd></div>
                                <div><dt className="inline font-semibold text-slate-950">Time: </dt><dd className="inline">{viewMatch.time.slice(0, 5)}</dd></div>
                                <div><dt className="inline font-semibold text-slate-950">Players needed: </dt><dd className="inline">{viewMatch.players_needed}</dd></div>
                                <div><dt className="inline font-semibold text-slate-950">Skill level: </dt><dd className="inline">{skillLabel(viewMatch.skill_level)}</dd></div>
                            </dl>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
