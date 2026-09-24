"use client";

import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";

// In a real app this would come from an API/store
const myListings: never[] = [];

export default function MyListingsPage() {
    const count = myListings.length;

    return (
        <div className="min-h-screen bg-[#F2E8D9] px-8 py-12">
            <div className="max-w-5xl mx-auto">

                {/* Page Header */}
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#3B2A1A] leading-tight">
                            My Hosting
                        </h1>
                        <p className="text-[#A07850] mt-1 font-medium">
                            {count === 0
                                ? "0 games you're hosting"
                                : `${count} game${count > 1 ? "s" : ""} you're hosting`}
                        </p>
                    </div>

                    <Link
                        href="/player/host"
                        className="flex items-center gap-2 bg-[#D97736] hover:bg-[#c26529] active:scale-95 text-white font-bold px-6 py-3 rounded-full shadow-md transition-all text-sm"
                    >
                        <Plus size={16} />
                        Host a game
                    </Link>
                </div>

                {/* Content */}
                {count === 0 ? (
                    /* Empty State Card */
                    <div className="bg-white rounded-3xl border border-[#EAD9C2] shadow-sm py-24 flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                            <ClipboardList size={28} className="text-[#D97736]" />
                        </div>
                        <p className="text-lg font-extrabold text-slate-800">
                            You haven't hosted any games yet.
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                            Host your first game to find a sports partner.
                        </p>
                        <Link
                            href="/player/host"
                            className="mt-4 bg-[#D97736] hover:bg-[#c26529] active:scale-95 text-white font-bold px-8 py-3 rounded-full shadow transition-all text-sm"
                        >
                            Host a game
                        </Link>
                    </div>
                ) : (
                    /* Listings Grid — shown when there are entries */
                    <div className="space-y-4">
                        {myListings.map((listing: any, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-3xl border border-[#EAD9C2] shadow-sm p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow"
                            >
                                {/* Sport Icon */}
                                <div className="bg-[#EAE1D3] w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-4xl">
                                    🏸
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-extrabold text-slate-900">
                                            {listing.sport} — Open game
                                        </h3>
                                        <span className="bg-[#F6EBE5] text-[#A66138] px-4 py-1 rounded-full text-xs font-bold">
                                            {listing.skillLevel}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-700 mb-4">
                                        <div><span className="font-bold text-slate-500">Location: </span>{listing.location}</div>
                                        <div><span className="font-bold text-slate-500">Date: </span>{listing.date}</div>
                                        <div><span className="font-bold text-slate-500">Time: </span>{listing.time}</div>
                                        <div><span className="font-bold text-slate-500">Duration: </span>{listing.duration}</div>
                                        <div className="col-span-2"><span className="font-bold text-slate-500">Players needed: </span>{listing.playersNeeded}</div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-auto">
                                        <p className="text-sm text-[#A66138]">Skill level: {listing.skillLevel}</p>
                                        <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-full text-sm transition-colors">
                                            View game
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
