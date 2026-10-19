"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Search, ChevronDown, CalendarDays, Clock3, MapPin, Users,
    Star, RefreshCw, Calendar, Trophy,
} from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { joinMatch, leaveMatch, listMatches, listRecommendedMatches, searchCourts } from "../../../lib/api";
import type { MatchRead, RecommendedMatch, CourtSearchItem } from "../../../lib/types";

const SPORTS = ["Any sport", "Badminton", "Football", "Tennis", "Basketball", "Volleyball"];

function formatTime(time: string): string {
    // "18:00:00" -> "18:00"
    return time.slice(0, 5);
}

function formatDate(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function skillLabel(level: string): string {
    return level.charAt(0) + level.slice(1).toLowerCase();
}

function MatchCard({
    match,
    isJoined,
    onJoin,
    onLeave,
    busy,
}: {
    match: MatchRead;
    isJoined: boolean;
    onJoin: (id: string) => void;
    onLeave: (id: string) => void;
    busy: boolean;
}) {
    return (
        <article className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{match.sport}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {match.status === "OPEN" ? "Open spot" : match.status === "FULL" ? "Match full" : match.status}
                    </p>
                </div>
                <span className="self-start bg-orange-50 text-[#A66138] px-4 py-1 rounded-full text-xs font-bold">
                    {skillLabel(match.skill_level)}
                </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#D97736] flex-shrink-0" />
                    {match.location}
                </p>
                <p className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-[#D97736] flex-shrink-0" />
                    {formatDate(match.date)}
                </p>
                <p className="flex items-center gap-2">
                    <Clock3 size={16} className="text-[#D97736] flex-shrink-0" />
                    {formatTime(match.time)}
                </p>
                <p className="flex items-center gap-2">
                    <Users size={16} className="text-[#D97736] flex-shrink-0" />
                    {match.players_needed} {match.players_needed === 1 ? "player" : "players"} needed
                </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                {isJoined ? (
                    <button
                        onClick={() => onLeave(match.id)}
                        disabled={busy}
                        className="text-sm font-bold px-4 py-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        Leave
                    </button>
                ) : (
                    <button
                        onClick={() => onJoin(match.id)}
                        disabled={busy}
                        className="text-sm font-bold bg-[#D97736] hover:bg-[#c26529] text-white px-5 py-2 rounded-full transition-colors disabled:opacity-50"
                    >
                        Join game
                    </button>
                )}
            </div>
        </article>
    );
}

function LoadingCards({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-pulse">
                    <div className="h-5 w-40 bg-gray-100 rounded mb-3" />
                    <div className="h-4 w-64 bg-gray-100 rounded mb-2" />
                    <div className="h-4 w-48 bg-gray-100 rounded" />
                </div>
            ))}
        </div>
    );
}

export default function PlayerDashboard() {
    const [matches, setMatches] = useState<MatchRead[]>([]);
    const [recommended, setRecommended] = useState<RecommendedMatch[]>([]);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // Filters (Search bar)
    const [sport, setSport] = useState("Any sport");
    const [location, setLocation] = useState("");
    const [skill, setSkill] = useState("Any level");
    const [applied, setApplied] = useState(false);

    // Court search
    const [courtDate, setCourtDate] = useState("");
    const [courtTime, setCourtTime] = useState("18:00");
    const [courtSport, setCourtSport] = useState("");
    const [courtResults, setCourtResults] = useState<CourtSearchItem[]>([]);
    const [courtLoading, setCourtLoading] = useState(false);
    const [courtError, setCourtError] = useState<string | null>(null);
    const [courtSearched, setCourtSearched] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                status: "OPEN",
                ...(sport !== "Any sport" ? { sport } : {}),
                ...(location.trim() ? { location: location.trim() } : {}),
            };
            const [open, rec, joined] = await Promise.all([
                listMatches(params),
                listRecommendedMatches({ page_size: 6 }),
                listMatches({ joined_by_me: true, page_size: 100 }),
            ]);
            setMatches(open.items);
            setRecommended(rec.items);
            setJoinedIds(new Set(joined.items.map((m) => m.id)));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load matches");
        } finally {
            setLoading(false);
        }
    }, [sport, location, applied]);

    useEffect(() => {
        load();
    }, [load]);

    const handleJoin = async (id: string) => {
        setBusyId(id);
        setNotice(null);
        try {
            await joinMatch(id);
            setJoinedIds((prev) => new Set(prev).add(id));
            setNotice("You joined the match!");
        } catch (err) {
            setNotice(err instanceof ApiError ? err.message : "Could not join the match");
        } finally {
            setBusyId(null);
        }
    };

    const handleLeave = async (id: string) => {
        setBusyId(id);
        setNotice(null);
        try {
            await leaveMatch(id);
            setJoinedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            setNotice("You left the match.");
        } catch (err) {
            setNotice(err instanceof ApiError ? err.message : "Could not leave the match");
        } finally {
            setBusyId(null);
        }
    };

    const runCourtSearch = async () => {
        if (!courtDate) {
            setCourtError("Pick a date first.");
            return;
        }
        setCourtLoading(true);
        setCourtError(null);
        setCourtSearched(true);
        try {
            const page = await searchCourts({
                date: courtDate,
                start_time: courtTime,
                duration_minutes: 60,
                sport: courtSport || undefined,
            });
            setCourtResults(page.items);
        } catch (err) {
            setCourtError(err instanceof ApiError ? err.message : "Could not search courts");
        } finally {
            setCourtLoading(false);
        }
    };

    const showSearch = applied || sport !== "Any sport" || location !== "" || skill !== "Any level";


    return (
        <div className="pb-24">
            {/* Hero Section */}
            <section className="pt-20 pb-12 px-6 flex flex-col items-center text-center max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
                    Find your next game, together
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl text-balance">
                    Browse open spots from players near you and lock in a match before the light fades.
                </p>
            </section>

            {/* Search / Filter Bar */}
            <section className="max-w-4xl mx-auto px-6 mb-12">
                <div className="bg-white rounded-full shadow-sm border border-gray-200 p-2 flex flex-col md:flex-row items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 px-4 py-2 text-slate-500 min-w-40 border-b md:border-b-0 md:border-r border-gray-100 w-full md:w-auto">
                        <Search size={20} className="text-slate-400" />
                        <select
                            value={sport}
                            onChange={(e) => setSport(e.target.value)}
                            className="bg-transparent font-medium text-slate-700 outline-none w-full appearance-none cursor-pointer"
                        >
                            {SPORTS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={16} className="text-slate-400 -ml-2 pointer-events-none" />
                    </div>

                    <div className="flex-1 flex items-center gap-3 px-4 py-2 text-slate-500 min-w-40 border-b md:border-b-0 md:border-r border-gray-100 w-full md:w-auto">
                        <MapPin size={18} className="text-slate-400" />
                        <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Any location"
                            className="bg-transparent font-medium text-slate-700 outline-none w-full"
                        />
                    </div>

                    <div className="flex-1 flex items-center gap-3 px-4 py-2 text-slate-500 w-full md:w-auto">
                        <select
                            value={skill}
                            onChange={(e) => setSkill(e.target.value)}
                            className="bg-transparent font-medium text-slate-700 outline-none w-full appearance-none cursor-pointer"
                        >
                            <option>Any level</option>
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                        <ChevronDown size={16} className="text-slate-400 -ml-2 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-end px-2 mt-2 md:mt-0">
                        <button
                            onClick={() => setApplied((a) => !a)}
                            disabled={loading}
                            className="bg-[#D97736] hover:bg-[#c26529] text-white px-8 py-2.5 rounded-full font-bold transition-colors disabled:opacity-60"
                        >
                            Search
                        </button>
                        <button
                            onClick={() => {
                                setSport("Any sport");
                                setLocation("");
                                setSkill("Any level");
                                setApplied(false);
                            }}
                            className="text-slate-500 hover:text-slate-800 font-medium text-sm px-2"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {notice && (
                    <p className="mt-4 text-sm font-medium text-slate-700 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                        {notice}
                    </p>
                )}
            </section>


            {/* Match list */}
            <section className="max-w-4xl mx-auto px-6">
                {loading ? (
                    <LoadingCards />
                ) : error ? (
                    <div className="bg-white rounded-3xl p-12 flex flex-col items-center text-center gap-4 border border-gray-100">
                        <p className="text-slate-600 font-medium">{error}</p>
                        <button
                            onClick={load}
                            className="inline-flex items-center gap-2 bg-[#D97736] hover:bg-[#c26529] text-white px-6 py-2.5 rounded-full font-bold transition-colors"
                        >
                            <RefreshCw size={16} /> Try again
                        </button>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 flex flex-col items-center text-center gap-3 border border-gray-100">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                            <Users size={22} className="text-[#D97736]" />
                        </div>
                        <p className="text-lg font-extrabold text-slate-800">
                            {showSearch ? "No matches match your filters" : "No open spots right now"}
                        </p>
                        <p className="text-sm text-slate-500 max-w-md">
                            There are currently no open spots available. Try adjusting your search filters or check back later.
                        </p>
                        <Link
                            href="/player/host"
                            className="mt-2 bg-[#D97736] hover:bg-[#c26529] text-white px-6 py-2.5 rounded-full font-bold transition-colors"
                        >
                            Host a game
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map((match) => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                isJoined={joinedIds.has(match.id)}
                                onJoin={handleJoin}
                                onLeave={handleLeave}
                                busy={busyId === match.id}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Recommended matches */}
            {!loading && !error && recommended.length > 0 && (
                <section className="max-w-4xl mx-auto px-6 mt-16">
                    <div className="flex items-center gap-2 mb-5">
                        <Star size={20} className="text-[#D97736]" />
                        <h2 className="text-2xl font-extrabold text-slate-900">Recommended for you</h2>
                    </div>
                    <div className="space-y-4">
                        {recommended.map((match) => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                isJoined={joinedIds.has(match.id)}
                                onJoin={handleJoin}
                                onLeave={handleLeave}
                                busy={busyId === match.id}
                            />
                        ))}
                    </div>
                </section>
            )}


            {/* Court search */}
            <section className="max-w-4xl mx-auto px-6 mt-16">
                <div className="flex items-center gap-2 mb-5">
                    <Trophy size={20} className="text-[#D97736]" />
                    <h2 className="text-2xl font-extrabold text-slate-900">Find a free court</h2>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="grid sm:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                            <Calendar size={16} className="text-slate-400" />
                            <input
                                type="date"
                                value={courtDate}
                                onChange={(e) => setCourtDate(e.target.value)}
                                className="outline-none text-sm text-slate-700 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                            <Clock3 size={16} className="text-slate-400" />
                            <input
                                type="time"
                                value={courtTime}
                                onChange={(e) => setCourtTime(e.target.value)}
                                className="outline-none text-sm text-slate-700 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                            <Trophy size={16} className="text-slate-400" />
                            <select
                                value={courtSport}
                                onChange={(e) => setCourtSport(e.target.value)}
                                className="outline-none text-sm text-slate-700 w-full bg-transparent appearance-none cursor-pointer"
                            >
                                <option value="">Any sport</option>
                                {SPORTS.filter((s) => s !== "Any sport").map((s) => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={runCourtSearch}
                            disabled={courtLoading}
                            className="bg-[#2B1A0F] hover:opacity-90 text-white font-bold text-sm px-6 py-2 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {courtLoading ? "Searching…" : "Search courts"}
                        </button>
                    </div>

                    {courtError && <p className="mt-4 text-sm text-red-500">{courtError}</p>}

                    {courtSearched && !courtLoading && !courtError && (
                        courtResults.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                                No free courts found for that time. Try another date or time.
                            </p>
                        ) : (
                            <ul className="mt-4 divide-y divide-gray-50">
                                {courtResults.map((court) => (
                                    <li key={court.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{court.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {court.venue_name} · {court.venue_address}
                                            </p>
                                        </div>
                                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full self-start">
                                            {court.sport}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                </div>
            </section>
        </div>
    );
}

