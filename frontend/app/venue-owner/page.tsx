"use client";

import Link from "next/link";
import {
    Calendar, Users, Banknote, Star, ArrowRight,
    Building, ShieldCheck, Lock,
} from "lucide-react";
import { useVenueOwnerData } from "./context/VenueOwnerContext";
import { StatusBadge } from "./components/ui";

function StarInline({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={12} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
            ))}
        </div>
    );
}

export default function VenueOwnerDashboard() {
    const { venues, courts, bookings, reviews, profile } = useVenueOwnerData();

    const totalBookings = bookings.length;
    const totalPlayers = new Set(bookings.map(b => b.playerName)).size;
    const revenue = bookings.filter(b => b.status === "Completed").reduce((s, b) => s + b.price, 0);
    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const upcomingBookings = bookings
        .filter(b => b.status === "Confirmed" || b.status === "Pending")
        .slice(0, 5);

    return (
        <div className="max-w-[1200px] mx-auto pb-12">

            {/* Greeting & Banner Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-center">
                <div>
                    <h2 className="text-emerald-600 font-bold mb-1">Welcome back,</h2>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{profile.name}!</h1>
                    <p className="text-slate-500 font-medium">Here's what's happening with your venues today.</p>
                </div>

                <div className="bg-emerald-50 rounded-2xl overflow-hidden flex items-center border border-emerald-100 shadow-sm relative h-[140px]">
                    <div className="w-1/2 h-full">
                        <img
                            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop"
                            alt="Sports Field"
                            className="w-full h-full object-cover rounded-r-[40px]"
                        />
                    </div>
                    <div className="w-1/2 p-6 flex flex-col justify-center">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-2">
                            <Building size={16} />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1 text-sm">Manage your venues</h3>
                        <p className="text-xs text-slate-500 mb-2 leading-tight">Keep your schedule updated, respond to bookings, and grow your sports community.</p>
                        <Link href="/venue-owner/venues" className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors">
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Calendar size={20} /></div>
                        <h3 className="text-slate-500 text-sm font-medium">Total Bookings</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-slate-900">{totalBookings}</span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Users size={20} /></div>
                        <h3 className="text-slate-500 text-sm font-medium">Active Players</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-slate-900">{totalPlayers}</span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Banknote size={20} /></div>
                        <h3 className="text-slate-500 text-sm font-medium">Revenue (Completed)</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-slate-900">${revenue}</span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[120px]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Star size={20} /></div>
                        <h3 className="text-slate-500 text-sm font-medium">Average Rating</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-extrabold text-slate-900">{avgRating ?? "N/A"}</span>
                        {avgRating && <span className="text-xs text-slate-400 mb-1">/ {reviews.length} reviews</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Bookings */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar size={20} className="text-emerald-500" />
                            <h3 className="text-lg font-bold text-slate-900">Upcoming Bookings</h3>
                        </div>
                        <Link href="/venue-owner/bookings" className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>

                    {upcomingBookings.length === 0 ? (
                        <div className="flex flex-col p-12 items-center justify-center text-center text-slate-500">
                            <Calendar size={32} className="mb-3 text-slate-300" />
                            <h4 className="font-bold text-slate-900 mb-1">No upcoming bookings</h4>
                            <p className="text-sm max-w-sm">When players book a spot at your venues, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {upcomingBookings.map((b) => (
                                <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${b.playerName}`} alt="" className="w-9 h-9 rounded-full bg-slate-100" />
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm">{b.playerName}</p>
                                            <p className="text-xs text-slate-500">{b.date} · {b.startTime}–{b.endTime}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={b.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Your Venues */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building size={20} className="text-emerald-500" />
                            <h3 className="text-lg font-bold text-slate-900">Your Venues</h3>
                        </div>
                        <Link href="/venue-owner/venues" className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>

                    {venues.length === 0 ? (
                        <div className="flex-1 flex flex-col p-12 items-center justify-center text-center text-slate-500">
                            <Building size={32} className="mb-3 text-slate-300" />
                            <h4 className="font-bold text-slate-900 mb-1">No venues yet</h4>
                            <p className="text-sm max-w-sm mb-4">Add your first venue to start receiving bookings.</p>
                            <Link href="/venue-owner/add-venue" className="text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors inline-block">
                                + Add Venue
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {venues.slice(0, 4).map((v) => (
                                <Link key={v.id} href={`/venue-owner/venues/${v.id}`}
                                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                            <Building size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 text-sm truncate">{v.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{courts.filter(c => c.venueId === v.id).length} courts</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={v.status} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Banner */}
            <div className="mt-8 bg-emerald-50/50 rounded-2xl p-6 border border-emerald-50 flex flex-col md:flex-row items-center gap-8 justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">Safe & Trusted Community</h4>
                        <p className="text-sm text-slate-500">Verified venues, secure payments, and a better experience for everyone.</p>
                    </div>
                </div>

                <div className="flex items-center gap-12 border-t md:border-t-0 md:border-l border-emerald-100 pt-6 md:pt-0 md:pl-12 w-full md:w-auto">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><ShieldCheck size={16} /></div>
                        <div>
                            <h5 className="font-bold text-slate-900 text-sm">Verified Venues</h5>
                            <p className="text-xs text-slate-500">All venues are verified and reviewed.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Lock size={16} /></div>
                        <div>
                            <h5 className="font-bold text-slate-900 text-sm">Secure Payments</h5>
                            <p className="text-xs text-slate-500">Safe and transparent transactions.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
