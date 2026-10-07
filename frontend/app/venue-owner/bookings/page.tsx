"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, Check, X, Search, ChevronDown, Footprints, ShieldCheck } from "lucide-react";
import { useVenueOwnerData, Booking } from "../context/VenueOwnerContext";
import { EmptyState, StatusBadge, ToastProvider, useToast } from "../components/ui";

type Status = Booking["status"] | "All";
const STATUSES: Status[] = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

function BookingTypeBadge({ type }: { type: Booking["bookingType"] }) {
    if (type === "Walking") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                <Footprints size={11} /> Walking
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
            <ShieldCheck size={11} /> Court Booking
        </span>
    );
}

function BookingsContent() {
    const { bookings, venues, courts, updateBookingStatus } = useVenueOwnerData();
    const { toast } = useToast();
    const [activeStatus, setActiveStatus] = useState<Status>("All");
    const [venueFilter, setVenueFilter] = useState("all");
    const [search, setSearch] = useState("");

    const counts = useMemo(() => {
        const c: Record<string, number> = { All: bookings.length };
        bookings.forEach((b) => { c[b.status] = (c[b.status] ?? 0) + 1; });
        return c;
    }, [bookings]);

    const filtered = useMemo(() => bookings.filter((b) => {
        if (activeStatus !== "All" && b.status !== activeStatus) return false;
        if (venueFilter !== "all" && b.venueId !== venueFilter) return false;
        if (search && !b.playerName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [bookings, activeStatus, venueFilter, search]);

    const getVenueName = (venueId: string) => venues.find(v => v.id === venueId)?.name ?? "Unknown";
    const getCourtName = (courtId: string) => courts.find(c => c.id === courtId)?.name ?? "Unknown";

    const handleAction = (id: string, status: Booking["status"]) => {
        updateBookingStatus(id, status);
        toast(status === "Confirmed" ? "Booking confirmed!" : "Booking declined.", status === "Confirmed" ? "success" : "info");
    };

    return (
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Bookings</h1>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 flex-wrap mb-6">
                {STATUSES.map((s) => (
                    <button key={s} onClick={() => setActiveStatus(s)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${activeStatus === s ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                        {s} <span className="ml-1 opacity-70">({counts[s] ?? 0})</span>
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player name…"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all" />
                </div>
                <div className="relative">
                    <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all">
                        <option value="all">All Venues</option>
                        {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={<CalendarCheck size={24} />} title="No bookings found" description="No bookings match your current filters." />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {["Player", "Type", "Venue / Court", "Date", "Time", "Price", "Status", "Actions"].map((h) => (
                                        <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {filtered.map((b) => (
                                        <motion.tr key={b.id} layout exit={{ opacity: 0 }}
                                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${b.playerName}`} alt="" className="w-8 h-8 rounded-full bg-slate-100" />
                                                    <span className="font-semibold text-slate-900 text-sm">{b.playerName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <BookingTypeBadge type={b.bookingType} />
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">
                                                <p className="font-medium text-slate-800">{getVenueName(b.venueId)}</p>
                                                <p className="text-xs text-slate-400">{getCourtName(b.courtId)}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{b.startTime} – {b.endTime}</td>
                                            <td className="px-5 py-3.5 text-sm font-bold text-slate-900">${b.price}</td>
                                            <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                                            <td className="px-5 py-3.5">
                                                {b.status === "Pending" && (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleAction(b.id, "Confirmed")}
                                                            className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors">
                                                            <Check size={12} /> Confirm
                                                        </button>
                                                        <button onClick={() => handleAction(b.id, "Cancelled")}
                                                            className="flex items-center gap-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                                                            <X size={12} /> Decline
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((b) => (
                            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${b.playerName}`} alt="" className="w-9 h-9 rounded-full bg-slate-100" />
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{b.playerName}</p>
                                            <p className="text-xs text-slate-500">{getCourtName(b.courtId)} @ {getVenueName(b.venueId)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <StatusBadge status={b.status} />
                                        <BookingTypeBadge type={b.bookingType} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{new Date(b.date).toLocaleDateString()} · {b.startTime}–{b.endTime}</span>
                                    <span className="font-bold text-slate-900">${b.price}</span>
                                </div>
                                {b.status === "Pending" && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleAction(b.id, "Confirmed")} className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-emerald-700 transition-colors">Confirm</button>
                                        <button onClick={() => handleAction(b.id, "Cancelled")} className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-red-600 transition-colors">Decline</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function BookingsPage() {
    return <ToastProvider><BookingsContent /></ToastProvider>;
}
