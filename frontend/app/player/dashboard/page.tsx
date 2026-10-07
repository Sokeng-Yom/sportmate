"use client";

import Link from "next/link";
import { Search, ChevronDown, CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { useVenueOwnerData } from "../../venue-owner/context/VenueOwnerContext";

export default function PlayerDashboard() {
    const { hostedGames } = useVenueOwnerData();

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
            <section className="max-w-4xl mx-auto px-6 mb-16">
                <div className="bg-white rounded-full shadow-sm border border-gray-200 p-2 flex flex-col md:flex-row items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 px-4 py-2 text-slate-500 min-w-40 border-b md:border-b-0 md:border-r border-gray-100 w-full md:w-auto">
                        <Search size={20} className="text-slate-400" />
                        <select className="bg-transparent font-medium text-slate-700 outline-none w-full appearance-none cursor-pointer">
                            <option>Any sport</option>
                            <option>Badminton</option>
                            <option>Football</option>
                            <option>Tennis</option>
                        </select>
                        <ChevronDown size={16} className="text-slate-400 -ml-2 pointer-events-none" />
                    </div>

                    <div className="flex-1 flex items-center gap-3 px-4 py-2 text-slate-500 min-w-40 border-b md:border-b-0 md:border-r border-gray-100 w-full md:w-auto">
                        <select className="bg-transparent font-medium text-slate-700 outline-none w-full appearance-none cursor-pointer">
                            <option>Any location</option>
                            <option>Phnom Penh</option>
                        </select>
                        <ChevronDown size={16} className="text-slate-400 -ml-2 pointer-events-none" />
                    </div>

                    <div className="flex-1 flex items-center gap-3 px-4 py-2 text-slate-500 w-full md:w-auto">
                        <select className="bg-transparent font-medium text-slate-700 outline-none w-full appearance-none cursor-pointer">
                            <option>Any level</option>
                            <option>Beginner</option>
                            <option>Intermediate</option>
                        </select>
                        <ChevronDown size={16} className="text-slate-400 -ml-2 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-end px-2 mt-2 md:mt-0">
                        <button className="bg-[#D97736] hover:bg-[#c26529] text-white px-8 py-2.5 rounded-full font-bold transition-colors">
                            Search
                        </button>
                        <button className="text-slate-500 hover:text-slate-800 font-medium text-sm px-2">
                            Reset
                        </button>
                    </div>
                </div>
            </section>

            {/* List Hosting */}
            <section className="max-w-4xl mx-auto px-6">
                <div className="flex justify-between items-baseline mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900">List hosting</h2>
                    <span className="text-slate-500 font-medium text-sm text-right flex-1">
                        {hostedGames.length} {hostedGames.length === 1 ? "spot" : "spots"} near you
                    </span>
                </div>

                {hostedGames.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                        <span className="text-4xl mb-4">🏟️</span>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No games found</h3>
                        <p className="text-slate-500 max-w-md">There are currently no open spots available. Try adjusting your search filters or check back later.</p>
                        <Link
                            href="/player/host"
                            className="mt-6 bg-[#D97736] hover:bg-[#c26529] text-white px-6 py-2.5 rounded-full font-bold transition-colors"
                        >
                            Host a game
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {hostedGames.map((game) => (
                            <article
                                key={game.id}
                                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="text-xl font-extrabold text-slate-900">
                                            {game.sport}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {game.bookingType}
                                            {game.venueName ? ` · ${game.venueName}` : ""}
                                            {game.courtName ? ` · ${game.courtName}` : ""}
                                        </p>
                                    </div>
                                    <span className="self-start bg-orange-50 text-[#A66138] px-4 py-1 rounded-full text-xs font-bold">
                                        {game.skillLevel}
                                    </span>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
                                    <p className="flex items-center gap-2">
                                        <MapPin size={16} className="text-[#D97736] flex-shrink-0" />
                                        {game.location}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CalendarDays size={16} className="text-[#D97736] flex-shrink-0" />
                                        {game.date}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <Clock3 size={16} className="text-[#D97736] flex-shrink-0" />
                                        {game.time} · {game.duration}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <Users size={16} className="text-[#D97736] flex-shrink-0" />
                                        {game.playersNeeded} {game.playersNeeded === 1 ? "player" : "players"} needed
                                    </p>
                                </div>

                                {game.note && (
                                    <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-slate-500">
                                        {game.note}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
