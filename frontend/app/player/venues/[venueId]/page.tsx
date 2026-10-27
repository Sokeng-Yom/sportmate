"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    ExternalLink,
    MapPin,
    RefreshCw,
    Tag,
} from "lucide-react";
import { ApiError } from "../../../../lib/apiClient";
import { getVenue, listVenueCourts, listVenueDiscounts, listVenueEvents } from "../../../../lib/api";
import type { CourtRead, VenueDiscountRead, VenueEventRead, VenueRead } from "../../../../lib/types";
import { DiscountCard } from "../components/DiscountCard";
import { EventCard } from "../components/EventCard";
import { EmptyState } from "../components/EmptyState";

type Tab = "about" | "discounts" | "events";

function localDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function VenueDetailPage({ params }: { params: { venueId: string } }) {
    const { venueId } = params;
    const [venue, setVenue] = useState<VenueRead | null>(null);
    const [courts, setCourts] = useState<CourtRead[]>([]);
    const [discounts, setDiscounts] = useState<VenueDiscountRead[]>([]);
    const [events, setEvents] = useState<VenueEventRead[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>("about");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [venueData, courtRows, discountRows, eventRows] = await Promise.all([
                getVenue(venueId),
                listVenueCourts(venueId),
                listVenueDiscounts(venueId),
                listVenueEvents(venueId),
            ]);
            setVenue(venueData);
            setCourts(courtRows);
            setDiscounts(discountRows);
            setEvents(eventRows);
        } catch (err) {
            setVenue(null);
            setError(err instanceof ApiError ? err.message : "Could not load this venue.");
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => {
        void load();
    }, [load, reloadKey]);

    const today = localDate();
    const activeDiscounts = useMemo(
        () => discounts.filter((discount) => discount.valid_until >= today),
        [discounts, today],
    );
    const upcomingEvents = useMemo(
        () => events.filter((event) => event.event_date >= today),
        [events, today],
    );
    const sports = Array.from(new Set(courts.map((court) => court.sport))).sort();

    if (loading) {
        return <div className="mx-auto max-w-4xl px-6 py-16 text-center text-slate-500">Loading venue…</div>;
    }

    if (error || !venue) {
        const notFound = error?.toLowerCase().includes("not found");
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
                <MapPin size={28} className="text-slate-400" />
                <h1 className="text-2xl font-extrabold text-slate-900">{notFound ? "Venue not found" : "Could not load venue"}</h1>
                <p role="alert" className="max-w-md text-sm text-slate-500">{error ?? "This venue is unavailable."}</p>
                {!notFound && <button onClick={() => setReloadKey((key) => key + 1)} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"><RefreshCw size={14} /> Try again</button>}
                <Link href="/player/venues" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowLeft size={15} /> Back to venues</Link>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "about", label: "About" },
        { key: "discounts", label: "Discounts", count: activeDiscounts.length },
        { key: "events", label: "Events", count: upcomingEvents.length },
    ];
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`;

    return (
        <div className="min-h-screen bg-[#F8F5F0] pb-20">
            <header className="border-b border-gray-100 bg-white shadow-sm">
                <div className="mx-auto max-w-4xl px-6 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <Link href="/player/venues" className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
                                <ArrowLeft size={14} /> All venues
                            </Link>
                            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">{venue.name}</h1>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={13} className="shrink-0 text-emerald-500" />{venue.address}</p>
                        </div>
                        <Link href={`/player/host?venueId=${venue.id}`} className="self-start rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700">
                            Book here
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto mt-6 max-w-4xl px-6">
                <div role="tablist" aria-label="Venue sections" className="flex w-fit gap-1 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
                    {tabs.map((tab) => (
                        <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold ${activeTab === tab.key ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:bg-gray-50"}`}>
                            {tab.label}
                            {tab.count !== undefined && <span className={`rounded-full px-1.5 text-xs ${activeTab === tab.key ? "bg-white/20" : "bg-slate-100"}`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === "about" && (
                        <div className="grid gap-6 md:grid-cols-2">
                            <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6">
                                <h2 className="text-lg font-extrabold text-slate-900">Venue details</h2>
                                <InfoRow icon={<MapPin size={16} className="text-emerald-500" />} label="Address" value={venue.address} />
                                <InfoRow icon={<Clock size={16} className="text-emerald-500" />} label="Courts" value={`${courts.length} available court${courts.length === 1 ? "" : "s"}`} />
                                {venue.description && <p className="text-sm leading-relaxed text-slate-600">{venue.description}</p>}
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Sports</p>
                                    {sports.length ? <div className="flex flex-wrap gap-2">{sports.map((item) => <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item}</span>)}</div> : <p className="text-sm text-slate-500">No courts listed yet.</p>}
                                </div>
                                {courts.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Courts</p>
                                        <ul className="space-y-2">{courts.map((court) => <li key={court.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-800">{court.name}</span><span className="ml-2 text-slate-500">{court.sport}</span></li>)}</ul>
                                    </div>
                                )}
                            </section>
                            <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white">
                                <iframe title={`Map showing location of ${venue.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(venue.address)}&z=15&output=embed`} className="min-h-64 w-full flex-1" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                                <div className="border-t border-gray-100 p-4">
                                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"><ExternalLink size={14} /> Get directions</a>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === "discounts" && (activeDiscounts.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white"><EmptyState icon={<Tag size={24} />} title="No discounts right now" description="Check back later for current offers." /></div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">{activeDiscounts.map((discount) => <DiscountCard key={discount.id} discount={discount} />)}</div>
                    ))}

                    {activeTab === "events" && (upcomingEvents.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white"><EmptyState icon={<CalendarDays size={24} />} title="No upcoming events" description="Check back later to see what's happening at this venue." /></div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">{upcomingEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p></div>
        </div>
    );
}
