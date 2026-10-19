"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, X, Tag } from "lucide-react";
import { venues } from "../../lib/venues";
import { VenueCard } from "./components/VenueCard";
import { EmptyState } from "./components/EmptyState";

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
                <div className="h-5 w-16 bg-amber-100 rounded-full" />
            </div>
            <div className="h-3 w-48 bg-gray-100 rounded" />
            <div className="flex gap-2">
                <div className="h-5 w-16 bg-emerald-100 rounded-full" />
                <div className="h-5 w-16 bg-yellow-100 rounded-full" />
            </div>
        </div>
    );
}

// ─── Derive unique sports list ────────────────────────────────────────────────
const ALL_SPORTS = Array.from(
    new Set(venues.flatMap((v) => v.sports))
).sort();

const today = new Date().toISOString().split("T")[0];

export default function VenuesListPage() {
    const [search, setSearch] = useState("");
    const [sport, setSport] = useState("");
    const [hasDiscounts, setHasDiscounts] = useState(false);
    const [loading, setLoading] = useState(true);

    // Simulate brief data fetch
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 700);
        return () => clearTimeout(timer);
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return venues.filter((v) => {
            const matchSearch =
                !q ||
                v.name.toLowerCase().includes(q) ||
                v.address.toLowerCase().includes(q) ||
                v.city.toLowerCase().includes(q);
            const matchSport = !sport || v.sports.includes(sport);
            const matchDiscount =
                !hasDiscounts ||
                v.discounts.some((d) => d.validUntil >= today);
            return matchSearch && matchSport && matchDiscount;
        });
    }, [search, sport, hasDiscounts]);

    const clearFilters = () => {
        setSearch("");
        setSport("");
        setHasDiscounts(false);
    };

    const activeFilterCount =
        (search ? 1 : 0) + (sport ? 1 : 0) + (hasDiscounts ? 1 : 0);

    return (
        <div className="min-h-screen bg-[#F8F5F0] pb-20">
            {/* ── Hero header ── */}
            <section className="pt-16 pb-10 px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
                    Discover Venues
                </h1>
                <p className="text-slate-500 text-lg max-w-xl mx-auto">
                    Find the perfect court or ground near you. Some offer exclusive
                    discounts and upcoming events.
                </p>
            </section>

            {/* ── Filter bar ── */}
            <section className="max-w-5xl mx-auto px-6 mb-10">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search */}
                    <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-transparent transition-all">
                        <Search size={16} className="text-slate-400 flex-shrink-0" />
                        <input
                            id="venue-search"
                            type="text"
                            aria-label="Search venues"
                            placeholder="Search by name or location…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Sport dropdown */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
                        <label htmlFor="sport-filter" className="sr-only">Filter by sport</label>
                        <select
                            id="sport-filter"
                            value={sport}
                            onChange={(e) => setSport(e.target.value)}
                            className="bg-transparent outline-none text-sm text-slate-700 appearance-none cursor-pointer pr-2 min-w-[120px]"
                        >
                            <option value="">All sports</option>
                            {ALL_SPORTS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Has discounts checkbox */}
                    <label
                        htmlFor="has-discounts"
                        className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer px-2 select-none"
                    >
                        <input
                            id="has-discounts"
                            type="checkbox"
                            checked={hasDiscounts}
                            onChange={(e) => setHasDiscounts(e.target.checked)}
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <Tag size={14} className="text-amber-500" />
                        Has discounts
                    </label>
                </div>
            </section>

            {/* ── Results ── */}
            <section className="max-w-5xl mx-auto px-6">
                {/* Results count */}
                <div className="flex items-center justify-between mb-5">
                    <p className="text-sm text-slate-500 font-medium">
                        {loading ? "" : `${filtered.length} venue${filtered.length !== 1 ? "s" : ""} found`}
                    </p>
                    {activeFilterCount > 0 && !loading && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                            <X size={12} />
                            Clear filters
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100">
                        <EmptyState
                            icon={<MapPin size={24} />}
                            title="No venues match"
                            description="Try changing your search or filters to find a venue."
                            action={
                                <button
                                    onClick={clearFilters}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-all active:scale-95"
                                >
                                    Clear filters
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((venue) => (
                            <VenueCard key={venue.id} venue={venue} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
