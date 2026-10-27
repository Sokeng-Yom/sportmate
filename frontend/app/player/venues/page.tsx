"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, X, Tag, RefreshCw } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { browseVenues } from "../../../lib/api";
import type { PublicVenue } from "../../lib/venues";
import { VenueCard } from "./components/VenueCard";
import { EmptyState } from "./components/EmptyState";

function localDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function SkeletonCard() {
    return (
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-3 w-52 rounded bg-gray-100" />
            <div className="h-5 w-24 rounded bg-emerald-100" />
        </div>
    );
}

export default function VenuesListPage() {
    const [search, setSearch] = useState("");
    const [sport, setSport] = useState("");
    const [hasDiscounts, setHasDiscounts] = useState(false);
    const [venues, setVenues] = useState<PublicVenue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const page = await browseVenues({ q: search.trim() || undefined, page_size: 100 });
                if (!cancelled) setVenues(page.items);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ApiError ? err.message : "Could not load venues.");
                    setVenues([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search, reloadKey]);

    const sports = useMemo(
        () => Array.from(new Set(venues.flatMap((venue) => venue.courts.map((court) => court.sport)))).sort(),
        [venues],
    );
    const filtered = useMemo(() => {
        const today = localDate();
        return venues.filter((venue) => {
            const matchesSport = !sport || venue.courts.some((court) => court.sport === sport);
            const matchesDiscount = !hasDiscounts || venue.discounts.some((discount) => discount.valid_until >= today);
            return matchesSport && matchesDiscount;
        });
    }, [venues, sport, hasDiscounts]);

    const clearFilters = () => {
        setSearch("");
        setSport("");
        setHasDiscounts(false);
    };
    const activeFilterCount = (search ? 1 : 0) + (sport ? 1 : 0) + (hasDiscounts ? 1 : 0);

    return (
        <div className="min-h-screen bg-[#F8F5F0] pb-20">
            <section className="px-6 pb-10 pt-16 text-center">
                <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Discover Venues</h1>
                <p className="mx-auto max-w-xl text-lg text-slate-500">
                    Browse approved venues, courts, current discounts, and upcoming events.
                </p>
            </section>

            <section className="mx-auto mb-10 max-w-5xl px-6">
                <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus-within:ring-2 focus-within:ring-emerald-400">
                        <Search size={16} className="shrink-0 text-slate-400" />
                        <input
                            type="search"
                            aria-label="Search venues by name or location"
                            placeholder="Search by name or location…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        />
                        {search && <button onClick={() => setSearch("")} aria-label="Clear search" className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                    </div>
                    <select aria-label="Filter by sport" value={sport} onChange={(event) => setSport(event.target.value)} className="min-w-36 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-slate-700">
                        <option value="">All sports</option>
                        {sports.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <label className="flex cursor-pointer select-none items-center gap-2 px-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={hasDiscounts} onChange={(event) => setHasDiscounts(event.target.checked)} className="h-4 w-4 cursor-pointer accent-emerald-600" />
                        <Tag size={14} className="text-amber-500" />
                        Has discounts
                    </label>
                </div>
            </section>

            <section className="mx-auto max-w-5xl px-6">
                <div className="mb-5 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                        {loading ? "Loading venues…" : `${filtered.length} venue${filtered.length !== 1 ? "s" : ""} found`}
                    </p>
                    <div className="flex items-center gap-4">
                        {activeFilterCount > 0 && !loading && <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><X size={12} /> Clear filters</button>}
                        {error && <button onClick={() => setReloadKey((key) => key + 1)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><RefreshCw size={12} /> Retry</button>}
                    </div>
                </div>

                {error ? (
                    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
                ) : loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-white">
                        <EmptyState
                            icon={<MapPin size={24} />}
                            title="No venues match"
                            description="Try changing your search or filters to find an approved venue."
                            action={<button onClick={clearFilters} className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Clear filters</button>}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
                    </div>
                )}
            </section>
        </div>
    );
}
