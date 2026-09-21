"use client";

import { Search, ChevronDown } from "lucide-react";

export default function PlayerDashboard() {
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
                        3 spots near you
                    </span>
                </div>

                {/* Card Component */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">

                    {/* Card Icon Container */}
                    <div className="bg-[#EAE1D3] w-24 h-24 rounded-2xl flex-shrink-0 flex items-center justify-center">
                        {/* Custom SVG or Emoji for Badminton Racket representing the design */}
                        <span className="text-4xl text-[#725C9E]">🏸</span>
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 flex flex-col">

                        {/* Top row: Avatar & Badge */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-gray-100">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=BC" alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 leading-tight">1</p>
                                    <p className="text-xs text-slate-500 font-medium leading-tight">BC</p>
                                </div>
                            </div>
                            <span className="bg-[#F6EBE5] text-[#A66138] px-4 py-1 rounded-full text-xs font-bold">
                                Beginner
                            </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-extrabold text-slate-900 mb-4">Badminton — Open game</h3>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 text-sm">
                            <div className="text-slate-700"><span className="text-slate-500 font-bold">Location: </span>BC</div>
                            <div className="text-slate-700"><span className="text-slate-500 font-bold">Date: </span>2026-09-26</div>
                            <div className="text-slate-700"><span className="text-slate-500 font-bold">Time: </span>13:42</div>
                            <div className="text-slate-700"><span className="text-slate-500 font-bold">Duration: </span>1 hour</div>
                            <div className="text-slate-700 col-span-2"><span className="text-slate-500 font-bold">Players needed: </span>1</div>
                        </div>

                        {/* Status & Progress Bar */}
                        <div className="mb-4">
                            <span className="inline-block bg-red-100/80 text-red-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                                Hosting full
                            </span>
                            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2">
                                <div className="h-full bg-red-600 rounded-full w-full"></div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">1/1 joined</p>
                        </div>

                        {/* Note */}
                        <p className="text-sm text-slate-700 mb-6 font-medium">
                            <span className="font-bold text-slate-500">Note: </span>
                            Looking for friendly players for a fun match!
                        </p>

                        {/* Footer row */}
                        <div className="flex justify-between items-center mt-auto border-t border-gray-50 pt-4">
                            <p className="text-sm text-[#A66138]">Skill level: Beginner</p>
                            <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-full text-sm transition-colors cursor-pointer">
                                View game
                            </button>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}
