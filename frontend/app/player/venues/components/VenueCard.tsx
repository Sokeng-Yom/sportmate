"use client";

import Link from "next/link";
import { MapPin, Tag, CalendarDays } from "lucide-react";
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

const today = new Date().toISOString().split("T")[0];

export function VenueCard({ venue }: VenueCardProps) {
    const activeDiscounts = venue.discounts.filter((d) => d.validUntil >= today);
    const upcomingEvents = venue.events.filter((e) => e.date >= today);

    return (
        <motion.div
            whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.10)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
            <Link href={`/player/venues/${venue.id}`} className="block p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                            {venue.name}
                        </h3>
                        <p className="text-emerald-600 font-bold text-sm mt-0.5">
                            ${venue.pricePerHour} / hr
                        </p>
                    </div>
                    {/* Discount + event badges */}
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        {activeDiscounts.length > 0 && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                <Tag size={10} />
                                {activeDiscounts.length} offer{activeDiscounts.length > 1 ? "s" : ""}
                            </span>
                        )}
                        {upcomingEvents.length > 0 && (
                            <span className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                <CalendarDays size={10} />
                                {upcomingEvents.length} event{upcomingEvents.length > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </div>

                {/* Address */}
                <p className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                    <MapPin size={13} className="text-emerald-500 flex-shrink-0" />
                    {venue.address}, {venue.city}
                </p>

                {/* Sport tags */}
                <div className="flex flex-wrap gap-1.5">
                    {venue.sports.map((sport) => (
                        <span
                            key={sport}
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${SPORT_COLORS[sport] ?? "bg-gray-100 text-gray-600"}`}
                        >
                            {sport}
                        </span>
                    ))}
                </div>
            </Link>
        </motion.div>
    );
}
