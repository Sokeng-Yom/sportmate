"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    MapPin,
    Phone,
    Clock,
    DollarSign,
    Tag,
    CalendarDays,
    ExternalLink,
    ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getVenue } from "../../../lib/venues";
import { DiscountCard } from "../components/DiscountCard";
import { EventCard } from "../components/EventCard";
import { EmptyState } from "../components/EmptyState";

const today = new Date().toISOString().split("T")[0];

const SPORT_COLORS: Record<string, string> = {
    Badminton: "bg-emerald-100 text-emerald-700",
    Tennis: "bg-yellow-100 text-yellow-700",
    Football: "bg-blue-100 text-blue-700",
    Futsal: "bg-blue-100 text-blue-700",
    Basketball: "bg-orange-100 text-orange-700",
    Volleyball: "bg-purple-100 text-purple-700",
    Swimming: "bg-cyan-100 text-cyan-700",
    Squash: "bg-red-100 text-red-700",
    Running: "bg-green-100 text-green-700",
};

type Tab = "about" | "discounts" | "events";

export default function VenueDetailPage({
    params,
}: {
    params: { venueId: string };
}) {
    const { venueId } = params;
    const venue = getVenue(venueId);
    const [activeTab, setActiveTab] = useState<Tab>("about");

    // ── Not found ─────────────────────────────────────────────────────────────
    if (!venue) {
        return (
            <div className="min-h-screen bg-[#F8F5F0] flex flex-col items-center justify-center gap-6 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <MapPin size={28} className="text-slate-400" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">Venue not found</h1>
                <p className="text-slate-500 max-w-xs">
                    We couldn't find a venue with that ID. It may have been removed or the
                    link might be incorrect.
                </p>
                <Link
                    href="/player/venues"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-full text-sm transition-all active:scale-95"
                >
                    <ArrowLeft size={16} />
                    Back to Venues
                </Link>
            </div>
        );
    }

    const activeDiscounts = venue.discounts.filter((d) => d.validUntil >= today);
    const upcomingEvents = venue.events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "about", label: "About" },
        { key: "discounts", label: "Discounts", count: activeDiscounts.length },
        { key: "events", label: "Events", count: upcomingEvents.length },
    ];

    return (
        <div className="min-h-screen bg-[#F8F5F0] pb-20">
            {/* ── Sticky header ── */}
            <header className="bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-5">
                    {/* Back + title row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <Link
                                href="/player/venues"
                                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 mb-2 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                All Venues
                            </Link>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                                {venue.name}
                            </h1>
                            <p className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                                <MapPin size={13} className="text-emerald-500 flex-shrink-0" />
                                {venue.address}, {venue.city}
                            </p>
                        </div>

                        {/* Book here CTA */}
                        <Link
                            href={`/player/host?venueId=${venue.id}`}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-full shadow-md transition-all active:scale-95 text-sm self-start"
                        >
                            Book here
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="max-w-4xl mx-auto px-6 mt-6">
                <div
                    role="tablist"
                    aria-label="Venue sections"
                    className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 w-fit shadow-sm"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            role="tab"
                            id={`tab-${tab.key}`}
                            aria-selected={activeTab === tab.key}
                            aria-controls={`panel-${tab.key}`}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key
                                ? "bg-emerald-600 text-white shadow"
                                : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                                }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span
                                    className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none ${activeTab === tab.key
                                        ? "bg-white/20"
                                        : "bg-slate-100"
                                        }`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab panels ── */}
                <div className="mt-6">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={activeTab}
                            id={`panel-${activeTab}`}
                            role="tabpanel"
                            aria-labelledby={`tab-${activeTab}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            {/* ── ABOUT ── */}
                            {activeTab === "about" && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Info panel */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                                        <h2 className="font-extrabold text-slate-900 text-lg">Details</h2>

                                        <InfoRow
                                            icon={<Clock size={16} className="text-emerald-500" />}
                                            label="Open hours"
                                            value={venue.openHours}
                                        />
                                        <InfoRow
                                            icon={<DollarSign size={16} className="text-emerald-500" />}
                                            label="Price"
                                            value={`$${venue.pricePerHour} / hour`}
                                        />
                                        {venue.phone && (
                                            <InfoRow
                                                icon={<Phone size={16} className="text-emerald-500" />}
                                                label="Phone"
                                                value={venue.phone}
                                            />
                                        )}

                                        {/* Sports */}
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                Sports
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {venue.sports.map((s) => (
                                                    <span
                                                        key={s}
                                                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${SPORT_COLORS[s] ?? "bg-gray-100 text-gray-600"}`}
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Amenities */}
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                Amenities
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {venue.amenities.map((a) => (
                                                    <span
                                                        key={a}
                                                        className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full"
                                                    >
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map panel */}
                                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                                        <iframe
                                            title={`Map showing location of ${venue.name}`}
                                            src={`https://maps.google.com/maps?q=${venue.lat},${venue.lng}&z=15&output=embed`}
                                            className="w-full flex-1 min-h-64"
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            aria-label={`Embedded Google Map for ${venue.name}`}
                                        />
                                        <div className="p-4 border-t border-gray-100">
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                Get directions
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── DISCOUNTS ── */}
                            {activeTab === "discounts" && (
                                <div>
                                    {activeDiscounts.length === 0 ? (
                                        <div className="bg-white rounded-2xl border border-gray-100">
                                            <EmptyState
                                                icon={<Tag size={24} />}
                                                title="No discounts right now"
                                                description="Check back later — new offers are added regularly."
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {activeDiscounts.map((d) => (
                                                <DiscountCard key={d.id} discount={d} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── EVENTS ── */}
                            {activeTab === "events" && (
                                <div>
                                    {upcomingEvents.length === 0 ? (
                                        <div className="bg-white rounded-2xl border border-gray-100">
                                            <EmptyState
                                                icon={<CalendarDays size={24} />}
                                                title="No upcoming events"
                                                description="There are no events scheduled here at the moment."
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {upcomingEvents.map((e) => (
                                                <EventCard key={e.id} event={e} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ─── Helper sub-component ─────────────────────────────────────────────────────
function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {label}
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
}
