"use client";

import { useMemo, useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import { useVenueOwnerData } from "../context/VenueOwnerContext";
import { EmptyState } from "../components/ui";

function StarRow({ count, max }: { count: number; max: number }) {
    const pct = max > 0 ? (count / max) * 100 : 0;
    return (
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
    );
}

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
            ))}
        </div>
    );
}

export default function ReviewsPage() {
    const { reviews, venues } = useVenueOwnerData();
    const [venueFilter, setVenueFilter] = useState("all");
    const [starFilter, setStarFilter] = useState("all");

    const filtered = useMemo(() => reviews.filter((r) => {
        if (venueFilter !== "all" && r.venueId !== venueFilter) return false;
        if (starFilter !== "all" && r.rating !== Number(starFilter)) return false;
        return true;
    }), [reviews, venueFilter, starFilter]);

    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

    const distribution = useMemo(() => {
        const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r) => { dist[r.rating] = (dist[r.rating] ?? 0) + 1; });
        return dist;
    }, [reviews]);

    return (
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Reviews</h1>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 flex flex-col sm:flex-row gap-6">
                <div className="text-center sm:text-left flex flex-col items-center sm:items-start border-b sm:border-b-0 sm:border-r border-slate-100 sm:pr-8 pb-4 sm:pb-0">
                    <p className="text-6xl font-extrabold text-slate-900 leading-none">{avgRating ?? "N/A"}</p>
                    {avgRating && <Stars rating={Math.round(Number(avgRating))} />}
                    <p className="text-slate-500 text-xs mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-8 text-sm text-slate-500 font-medium">
                                {star} <Star size={12} className="text-amber-400 fill-amber-400" />
                            </div>
                            <StarRow count={distribution[star] ?? 0} max={reviews.length} />
                            <span className="w-6 text-xs text-slate-500 text-right">{distribution[star] ?? 0}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            {reviews.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative">
                        <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all">
                            <option value="all">All Venues</option>
                            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={starFilter} onChange={(e) => setStarFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all">
                            <option value="all">All Ratings</option>
                            {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} Star{s !== 1 ? "s" : ""}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Review List */}
            {filtered.length === 0 ? (
                <EmptyState icon={<Star size={24} />} title={reviews.length === 0 ? "No reviews yet" : "No reviews match filter"} description={reviews.length === 0 ? "Reviews from players will appear here." : "Try adjusting your filters."} />
            ) : (
                <div className="space-y-4">
                    {filtered.map((r) => {
                        const venueName = venues.find((v) => v.id === r.venueId)?.name ?? "Unknown Venue";
                        return (
                            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.playerName}`} alt="" className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                        <p className="font-bold text-slate-900 text-sm">{r.playerName}</p>
                                        <Stars rating={r.rating} />
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2">{venueName} · {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
