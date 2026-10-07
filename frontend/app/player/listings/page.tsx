"use client";

import Link from "next/link";
import { Plus, ClipboardList, MapPin, Calendar, Clock, Users, RefreshCw, Type, Edit2, MessageSquare } from "lucide-react";
import { useVenueOwnerData } from "../../venue-owner/context/VenueOwnerContext";

const SPORT_IMAGES: Record<string, string> = {
    Basketball: "https://images.unsplash.com/photo-1546519638405-a9f9c2b9b62f?auto=format&fit=crop&q=80&w=400",
    Tennis: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=400",
    Football: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400",
    Badminton: "https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?auto=format&fit=crop&q=80&w=400",
    Volleyball: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=400",
    default: "https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&q=80&w=400",
};

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
    Beginner: { bg: "#FFF3E5", text: "#C26529" },
    Intermediate: { bg: "#FFF3E5", text: "#D97736" },
    Advanced: { bg: "#FDE8E8", text: "#B91C1C" },
};

function formatGameDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function MyListingsPage() {
    const { hostedGames, profile } = useVenueOwnerData();
    const count = hostedGames.length;

    return (
        <div className="min-h-screen px-6 py-12" style={{ background: "#F2E3D0" }}>
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold" style={{ color: "#2B1A0F" }}>
                            My listings
                        </h1>
                        <p className="mt-1 text-base font-medium" style={{ color: "#8B6147" }}>
                            {count === 0
                                ? "0 games you're hosting"
                                : `${count} game${count > 1 ? "s" : ""} you're hosting`}
                        </p>
                    </div>

                    <Link
                        href="/player/host"
                        className="flex items-center gap-2 font-bold text-white px-5 py-3 rounded-full shadow-md transition-all text-sm active:scale-95"
                        style={{ background: "#D97736" }}
                    >
                        <Plus size={16} />
                        Host a game
                    </Link>
                </div>

                {/* Content */}
                {count === 0 ? (
                    /* Empty State */
                    <div
                        className="bg-white rounded-3xl border py-24 flex flex-col items-center justify-center text-center gap-4 shadow-sm"
                        style={{ borderColor: "#EAD9C2" }}
                    >
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
                            style={{ background: "#FFF3E5" }}
                        >
                            <ClipboardList size={28} style={{ color: "#D97736" }} />
                        </div>
                        <p className="text-lg font-extrabold text-slate-800">
                            You haven't hosted any games yet.
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                            Host your first game to find a sports partner.
                        </p>
                        <Link
                            href="/player/host"
                            className="mt-4 text-white font-bold px-8 py-3 rounded-full shadow transition-all text-sm active:scale-95"
                            style={{ background: "#D97736" }}
                        >
                            Host a game
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {hostedGames.map((game) => {
                            const imgSrc = SPORT_IMAGES[game.sport] ?? SPORT_IMAGES.default;
                            const skillStyle = SKILL_COLORS[game.skillLevel] ?? { bg: "#F5F5F5", text: "#555" };
                            const hostSeed = (profile.name ?? "Host").replace(/\s+/g, "");
                            const spotsText = `${game.playersNeeded} spot${game.playersNeeded !== 1 ? "s" : ""} left`;

                            return (
                                <div
                                    key={game.id}
                                    className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-row"
                                    style={{ border: "1px solid #EAD9C2" }}
                                >
                                    {/* Left: Venue Image */}
                                    <div className="w-36 flex-shrink-0 relative" style={{ minHeight: "160px" }}>
                                        <img
                                            src={imgSrc}
                                            alt={game.sport}
                                            className="w-full h-full object-cover"
                                            style={{ borderRadius: "0 0 0 16px" }}
                                        />
                                    </div>

                                    {/* Right: Details */}
                                    <div className="flex-1 px-5 py-4 flex flex-col justify-between min-w-0">
                                        {/* Top row: Host avatar + name + skill badge */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${hostSeed}`}
                                                        alt={profile.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold leading-tight" style={{ color: "#2B1A0F" }}>
                                                        {profile.name}
                                                    </p>
                                                    {game.location && (
                                                        <p className="text-xs" style={{ color: "#8B6147" }}>
                                                            {game.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Skill Badge */}
                                            <span
                                                className="text-xs font-semibold px-3 py-0.5 rounded-full flex-shrink-0"
                                                style={{ background: skillStyle.bg, color: skillStyle.text }}
                                            >
                                                {game.skillLevel}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-extrabold text-base leading-snug mb-1" style={{ color: "#1A1A1A" }}>
                                            {game.sport} — {game.bookingType}
                                        </h3>

                                        {/* Note / Description */}
                                        {game.note && (
                                            <p className="text-sm mb-2 line-clamp-2" style={{ color: "#4A4A4A" }}>
                                                {game.note}
                                            </p>
                                        )}

                                        {/* Meta row: location · date · spots */}
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mb-3" style={{ color: "#8B6147" }}>
                                            {game.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={11} />
                                                    {game.location}
                                                </span>
                                            )}
                                            {game.date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={11} />
                                                    {formatGameDate(game.date)}
                                                </span>
                                            )}
                                            {game.time && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {game.time}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Users size={11} />
                                                {spotsText}
                                            </span>
                                        </div>

                                        {/* Bottom row: Action icons + Join button */}
                                        <div className="flex items-center justify-between">
                                            {/* Quick-action icons */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    title="Refresh"
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-orange-50"
                                                    style={{ color: "#A07850" }}
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                                <button
                                                    title="Edit title"
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-orange-50"
                                                    style={{ color: "#A07850" }}
                                                >
                                                    <Type size={14} />
                                                </button>
                                                <button
                                                    title="Edit"
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-orange-50"
                                                    style={{ color: "#A07850" }}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    title="Message"
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-orange-50"
                                                    style={{ color: "#A07850" }}
                                                >
                                                    <MessageSquare size={14} />
                                                </button>
                                            </div>

                                            {/* Join Game Button */}
                                            <button
                                                className="text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all active:scale-95 hover:opacity-90"
                                                style={{ background: "#2B1A0F" }}
                                            >
                                                Join game
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
