"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, MapPin, Calendar, Clock, Users, RefreshCw, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { cancelMatch, listMatches } from "../../../lib/api";
import type { MatchRead } from "../../../lib/types";

const SPORT_IMAGES: Record<string, string> = {
    Basketball: "https://images.unsplash.com/photo-1546519638405-a9f9c2b9b62f?auto=format&fit=crop&q=80&w=400",
    Tennis: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=400",
    Football: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400",
    Badminton: "https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?auto=format&fit=crop&q=80&w=400",
    Volleyball: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=400",
    default: "https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&q=80&w=400",
};

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
    Beginner: { bg: "#FFF3E5", text: "#C26529" },
    Intermediate: { bg: "#FFF3E5", text: "#D97736" },
    Advanced: { bg: "#FDE8E8", text: "#B91C1C" },
};

function formatGameDate(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function skillLabel(level: string): string {
    return level.charAt(0) + level.slice(1).toLowerCase();
}

export default function MyListingsPage() {
    const [matches, setMatches] = useState<MatchRead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
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
        <div className="min-h-screen px-6 py-12" style={{ background: "#F2E3D0" }}>
            <div className="max-w-3xl mx-auto">
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
                    <div className="grid gap-6">

{matches.map((match) => {
                            const img = SPORT_IMAGES[match.sport] ?? SPORT_IMAGES.default;
                            const skill = skillLabel(match.skill_level);
                            const color = SKILL_COLORS[skill] ?? SKILL_COLORS.Intermediate;
                            const spotsText =
                                match.status === "CANCELLED"
                                    ? "Cancelled"
                                    : match.status === "FULL"
                                        ? "Full"
                                        : `${match.players_needed} spot${match.players_needed === 1 ? "" : "s"}`;
                            const canCancel = match.status === "OPEN" || match.status === "FULL" || match.status === "CONFIRMED";

                            return (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col sm:flex-row border border-[#EAD9C2]"
                                >
                                    <div className="sm:w-44 h-44 sm:h-auto flex-shrink-0 relative">
                                        <img src={img} alt={match.sport} className="w-full h-full object-cover" />
                                        <span
                                            className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full shadow-sm"
                                            style={{ background: color.bg, color: color.text }}
                                        >
                                            {skill}
                                        </span>
                                    </div>

                                    <div className="flex-1 p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-xl font-extrabold" style={{ color: "#2B1A0F" }}>
                                                {match.sport}
                                            </h3>
                                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-[#A66138]">
                                                {spotsText}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                                            <p className="flex items-center gap-2">
                                                <MapPin size={14} className="text-[#D97736] flex-shrink-0" />
                                                {match.location}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Calendar size={14} className="text-[#D97736] flex-shrink-0" />
                                                {formatGameDate(match.date)}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Clock size={14} className="text-[#D97736] flex-shrink-0" />
                                                {match.time.slice(0, 5)}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Users size={14} className="text-[#D97736] flex-shrink-0" />
                                                {match.players_needed} {match.players_needed === 1 ? "player" : "players"} needed
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F2E3D0]">
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href="/player/messages"
                                                    title="Message"
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-orange-50"
                                                    style={{ color: "#A07850" }}
                                                >
                                                    <MessageSquare size={14} />
                                                </Link>
                                                {canCancel && (
                                                    <button
                                                        title="Cancel match"
                                                        disabled={busyId === match.id}
                                                        onClick={() => handleCancel(match.id)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-red-50"
                                                        style={{ color: "#A07850" }}
                                                    >
                                                        {busyId === match.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                    </button>
                                                )}
                                            </div>

                                            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ background: "#2B1A0F" }}>
                                                {match.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
