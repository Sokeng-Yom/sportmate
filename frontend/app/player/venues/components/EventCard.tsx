"use client";

import { CalendarDays, Clock, DollarSign } from "lucide-react";
import type { VenueEvent } from "../../../lib/venues";

interface EventCardProps {
    event: VenueEvent;
}

const SPORT_COLORS: Record<string, string> = {
    Badminton: "bg-emerald-100 text-emerald-700",
    Tennis: "bg-yellow-100 text-yellow-700",
    Football: "bg-blue-100 text-blue-700",
    Basketball: "bg-orange-100 text-orange-700",
    Volleyball: "bg-purple-100 text-purple-700",
    Swimming: "bg-cyan-100 text-cyan-700",
    Squash: "bg-red-100 text-red-700",
    Running: "bg-green-100 text-green-700",
};

export function EventCard({ event }: EventCardProps) {
    const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-slate-900 text-base leading-snug">{event.title}</h4>
                <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${SPORT_COLORS[event.sport] ?? "bg-gray-100 text-gray-600"}`}
                >
                    {event.sport}
                </span>
            </div>

            <p className="text-sm text-slate-500">{event.description}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-gray-100 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <CalendarDays size={12} className="text-emerald-500" />
                    {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                    <Clock size={12} className="text-emerald-500" />
                    {event.time}
                </span>
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <DollarSign size={12} className="text-emerald-500" />
                    {event.priceLabel}
                </span>
            </div>
        </div>
    );
}
