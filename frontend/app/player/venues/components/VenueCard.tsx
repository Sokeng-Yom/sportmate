"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Heart, MapPin, Tag } from "lucide-react";
import { motion } from "framer-motion";
import type { PublicVenue } from "../../../lib/venues";

interface VenueCardProps {
    venue: PublicVenue;
}

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

function localDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function VenueCard({ venue }: VenueCardProps) {
    const today = localDate();
    const activeDiscounts = venue.discounts.filter((d) => d.active && d.valid_until >= today);
    const upcomingEvents = venue.events.filter((e) => e.event_date >= today);
    const sports = Array.from(new Set(venue.courts.map((court) => court.sport)));
    const sport = sports[0];

    return (
        <motion.div
            whileHover={{ y: -2, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.10)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.07)]"
        >
            <Link
                href={`/player/venues/${venue.id}`}
                aria-label={`View ${venue.name}, ${venue.courts.length} courts, ${venue.address}`}
                className="group flex min-h-28 items-stretch gap-2.5 p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:gap-3"
            >
                <div className="relative w-[36%] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {venue.photo_url ? (
                        <img src={venue.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-100">
                            <MapPin size={28} className="text-emerald-600/70" aria-hidden="true" />
                        </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col py-1.5">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-extrabold leading-tight text-slate-900 sm:text-base">
                            {venue.name}
                        </h3>
                        <Heart size={20} className="mt-0.5 shrink-0 text-slate-700" aria-hidden="true" />
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700 sm:text-sm">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-emerald-600 text-[9px] font-bold text-white" aria-hidden="true">+</span>
                        <span>{venue.courts.length} court{venue.courts.length !== 1 ? "s" : ""}</span>
                    </div>

                    <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-600 sm:text-sm">
                        <MapPin size={14} className="shrink-0 fill-emerald-500 text-emerald-500" aria-hidden="true" />
                        <span className="line-clamp-1">{venue.address}</span>
                    </p>

                    <div className="mt-auto flex min-h-7 items-end justify-between gap-2 pt-2">
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                            {sport && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${SPORT_COLORS[sport] ?? "bg-gray-100 text-gray-600"}`}>
                                    <Tag size={11} aria-hidden="true" />
                                    {sport}
                                </span>
                            )}
                            {activeDiscounts.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                                    <Tag size={11} aria-hidden="true" /> {activeDiscounts.length} offer{activeDiscounts.length !== 1 ? "s" : ""}
                                </span>
                            )}
                            {upcomingEvents.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                                    <CalendarDays size={11} aria-hidden="true" /> {upcomingEvents.length} event{upcomingEvents.length !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-800 shadow-sm transition group-hover:translate-x-0.5 group-hover:text-emerald-700" aria-hidden="true">
                            <ArrowRight size={15} />
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
