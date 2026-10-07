"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, Search, MoreVertical, Eye, Pencil, Trash2, MapPin } from "lucide-react";
import { useVenueOwnerData, Venue } from "../context/VenueOwnerContext";
import { PageHeader, EmptyState, StatusBadge, ConfirmModal, useToast, ToastProvider } from "../components/ui";

function VenueCard({ venue, courtsCount, onDelete }: { venue: Venue; courtsCount: number; onDelete: () => void }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const sportColors: Record<string, string> = {
        Football: "bg-orange-50 text-orange-700",
        Basketball: "bg-amber-50 text-amber-700",
        Tennis: "bg-lime-50 text-lime-700",
        Badminton: "bg-teal-50 text-teal-700",
        Volleyball: "bg-purple-50 text-purple-700",
    };

    return (
        <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Cover */}
            <div className="h-44 relative overflow-hidden">
                {venue.coverImage ? (
                    <img src={venue.coverImage} alt={venue.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                        <Building2 size={40} className="text-white/60" />
                    </div>
                )}
                <div className="absolute top-3 left-3">
                    <StatusBadge status={venue.status} />
                </div>
                <div className="absolute top-3 right-3 relative">
                    <button onClick={() => setMenuOpen((o) => !o)}
                        className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                        aria-label="Menu">
                        <MoreVertical size={16} className="text-slate-600" />
                    </button>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-10 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-10 w-36 py-1 overflow-hidden">
                                <Link href={`/venue-owner/venues/${venue.id}`} onClick={() => setMenuOpen(false)}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors w-full">
                                    <Eye size={15} /> View
                                </Link>
                                <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors w-full">
                                    <Pencil size={15} /> Edit
                                </button>
                                <button onClick={() => { setMenuOpen(false); onDelete(); }}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full">
                                    <Trash2 size={15} /> Delete
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{venue.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                    <MapPin size={12} /> {venue.address}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {venue.sports.map((s) => (
                        <span key={s} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sportColors[s] ?? "bg-slate-100 text-slate-600"}`}>{s}</span>
                    ))}
                </div>
                <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">{courtsCount} court{courtsCount !== 1 ? "s" : ""}</span>
                    <Link href={`/venue-owner/venues/${venue.id}`}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                        View Details →
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

function VenuesContent() {
    const { venues, courts, deleteVenue } = useVenueOwnerData();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const filtered = useMemo(() =>
        venues.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()) || v.address.toLowerCase().includes(search.toLowerCase())),
        [venues, search]
    );

    const handleDelete = () => {
        if (deleteTarget) {
            deleteVenue(deleteTarget);
            toast("Venue deleted.", "info");
            setDeleteTarget(null);
        }
    };

    return (
        <div>
            <PageHeader
                title="My Venues"
                description="Manage your sports facilities"
                action={
                    <Link href="/venue-owner/add-venue"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-colors">
                        <Plus size={16} /> Add Venue
                    </Link>
                }
            />

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search venues…"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all" />
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={<Building2 size={28} />}
                    title={search ? "No venues match your search" : "No venues yet"}
                    description={search ? "Try a different search term." : "Add your first venue to start receiving bookings."}
                    action={!search ? (
                        <Link href="/venue-owner/add-venue" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors inline-block">
                            + Add Venue
                        </Link>
                    ) : undefined}
                />
            ) : (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filtered.map((v) => (
                            <VenueCard key={v.id} venue={v}
                                courtsCount={courts.filter((c) => c.venueId === v.id).length}
                                onDelete={() => setDeleteTarget(v.id)} />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            <ConfirmModal
                open={!!deleteTarget}
                title="Delete Venue?"
                description="This will permanently remove the venue and all its courts. This action cannot be undone."
                confirmLabel="Delete"
                danger
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default function MyVenuesPage() {
    return (
        <ToastProvider>
            <VenuesContent />
        </ToastProvider>
    );
}
