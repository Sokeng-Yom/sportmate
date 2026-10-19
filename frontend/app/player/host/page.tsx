"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Globe, MapPin, Calendar, Users, BarChart2,
    PenLine, Info, CheckCircle2, Footprints, ShieldCheck, DollarSign
} from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { createBooking, createMatch, joinMatch, listMyVenues, listVenueCourts } from "../../../lib/api";
import type { CourtRead, VenueRead } from "../../../lib/types";

const SPORTS = [
    "Tennis", "Basketball", "Running", "Badminton", "Football",
    "Volleyball", "Swimming", "Cycling", "Golf", "Cricket",
];

const DURATIONS = [
    "30 min", "45 min", "1 hour", "1.5 hours", "2 hours", "2.5 hours", "3 hours",
];

// Backend enums: BEGINNER | INTERMEDIATE | ADVANCED
const SKILL_LEVELS = [
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" },
];

export default function HostPage() {
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [venues, setVenues] = useState<VenueRead[]>([]);
    const [courts, setCourts] = useState<CourtRead[]>([]);

    const [bookingType, setBookingType] = useState<"Walking" | "Court Booking">("Walking");

    const [form, setForm] = useState({
        sport: "",
        location: "",
        venueId: "",
        courtId: "",
        datetime: "",
        duration: "1 hour",
        playersNeeded: "",
        skillLevel: "BEGINNER",
        note: "",
    });

    // Load the owner's venues (for the Court Booking venue picker).
    useEffect(() => {
        listMyVenues()
            .then((rows) => setVenues(rows.filter((v) => v.status === "APPROVED")))
            .catch(() => setVenues([]));
    }, []);

    // Load courts whenever the selected venue changes.
    useEffect(() => {
        if (!form.venueId) {
            setCourts([]);
            return;
        }
        listVenueCourts(form.venueId)
            .then((rows) => setCourts(rows))
            .catch(() => setCourts([]));
    }, [form.venueId]);

    const selectedVenue = venues.find((v) => v.id === form.venueId);
    const selectedCourt = courts.find((c) => c.id === form.courtId);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
            // reset court when venue changes
            ...(name === "venueId" ? { courtId: "" } : {}),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);

        const durationMin: Record<string, number> = {
            "30 min": 30, "45 min": 45, "1 hour": 60,
            "1.5 hours": 90, "2 hours": 120, "2.5 hours": 150, "3 hours": 180,
        };

        const [gameDate, gameTime] = form.datetime.split("T");
        const playersNeeded = Number(form.playersNeeded) || 1;

        // For court bookings the match lives at the chosen venue.
        const matchLocation =
            bookingType === "Court Booking" && selectedVenue
                ? selectedVenue.name
                : form.location.trim() || "TBC";

        try {
            const match = await createMatch({
                sport: form.sport,
                location: matchLocation,
                date: gameDate,
                time: gameTime,
                players_needed: playersNeeded,
                skill_level: form.skillLevel,
            });

            // The creator joins their own match so they can chat and (once it's
            // full) book a court. Best-effort: the match itself is already live.
            let creatorJoined = false;
            try {
                await joinMatch(match.id);
                creatorJoined = true;
            } catch {
                /* ignore — creator can still manage the match */
            }

            // Court Booking: if the match is already full (e.g. a 1-player match)
            // and a court was picked, reserve it right away.
            if (bookingType === "Court Booking" && creatorJoined && selectedCourt && playersNeeded <= 1) {
                try {
                    await createBooking({
                        match_id: match.id,
                        court_id: selectedCourt.id,
                        duration_minutes: durationMin[form.duration] ?? 60,
                    });
                } catch {
                    /* the match is posted regardless; booking can be retried when full */
                }
            }

            setSubmitted(true);
            setTimeout(() => {
                router.push("/player/listings");
            }, 1800);
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.message : "Could not post your game. Please try again.");
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F5F0] py-12 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="grid md:grid-cols-[280px_1fr]">

                        {/* ── Left Panel ── */}
                        <div className="bg-[#F8F5F0] p-8 flex flex-col gap-6 border-r border-gray-100">

                            {/* Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <ShieldCheck size={26} className="text-blue-500" />
                            </div>

                            {/* Title */}
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                                    Host a<br />New Game
                                </h1>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Looking for a sports partner?{" "}
                                <span className="text-blue-500 font-semibold">Fill</span>{" "}
                                out the details below so others can join you.
                            </p>

                            {/* Booking Type Cards */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Type</p>
                                <button
                                    type="button"
                                    onClick={() => setBookingType("Walking")}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${bookingType === "Walking"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bookingType === "Walking" ? "bg-blue-500 text-white" : "bg-gray-100 text-slate-500"}`}>
                                        <Footprints size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${bookingType === "Walking" ? "text-blue-700" : "text-slate-700"}`}>Walking</p>
                                        <p className="text-xs text-slate-400">Drop-in, no court required</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setBookingType("Court Booking")}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${bookingType === "Court Booking"
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bookingType === "Court Booking" ? "bg-emerald-500 text-white" : "bg-gray-100 text-slate-500"}`}>
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${bookingType === "Court Booking" ? "text-emerald-700" : "text-slate-700"}`}>Court Booking</p>
                                        <p className="text-xs text-slate-400">Reserve a specific court</p>
                                    </div>
                                </button>
                            </div>

                            {/* Tip Box */}
                            <div className="bg-blue-50 rounded-2xl p-4 flex gap-3">
                                <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <span className="font-bold text-slate-700">Tip:</span> The more details you
                                    add, the easier it is to find the right sports partner!
                                </p>
                            </div>
                        </div>

                        {/* ── Right Panel (Form) ── */}
                        <div className="p-8 md:p-10">
                            {submitted ? (
                                <div className="flex flex-col items-center justify-center h-full py-20 gap-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                                        <CheckCircle2 size={36} className="text-emerald-500" />
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-slate-900">Game Posted!</h2>
                                    <p className="text-slate-500 text-sm">Your match is now live and open to other players.</p>
                                    <p className="text-slate-400 text-xs">Redirecting you to your hosting…</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {submitError && (
                                        <p className="text-sm text-red-500 font-medium bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                            {submitError}
                                        </p>
                                    )}

                                    {/* Active Type Badge */}
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${bookingType === "Walking" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                                        {bookingType === "Walking" ? <Footprints size={15} /> : <ShieldCheck size={15} />}
                                        {bookingType}
                                    </div>

                                    {/* Sport */}
                                    <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                        <Globe size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Sport
                                            </label>
                                            <select
                                                name="sport"
                                                value={form.sport}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Tennis, Basketball, Running…</option>
                                                {SPORTS.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Venue + Court — only for Court Booking */}
                                    {bookingType === "Court Booking" && (
                                        <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                            <ShieldCheck size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                            <div className="flex-1 space-y-3">
                                                <label className="block text-sm font-semibold text-slate-700">
                                                    Select Venue &amp; Court
                                                </label>
                                                <select
                                                    name="venueId"
                                                    value={form.venueId}
                                                    onChange={handleChange}
                                                    required={bookingType === "Court Booking"}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled>Choose a venue…</option>
                                                    {venues.map((v) => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))}
                                                </select>
                                                {form.venueId && (
                                                    <select
                                                        name="courtId"
                                                        value={form.courtId}
                                                        onChange={handleChange}
                                                        required={bookingType === "Court Booking"}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 appearance-none cursor-pointer"
                                                    >
                                                        <option value="" disabled>Choose a court…</option>
                                                        {courts.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.name} — {c.sport}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Location */}
                                    <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                        <MapPin size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Location
                                            </label>
                                            <input
                                                name="location"
                                                value={form.location}
                                                onChange={handleChange}
                                                type="text"
                                                required
                                                placeholder="Downtown Park, YMCA, etc…"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                        <Calendar size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Date &amp; Time
                                            </label>
                                            <input
                                                name="datetime"
                                                value={form.datetime}
                                                onChange={handleChange}
                                                type="datetime-local"
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700"
                                            />
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                        <DollarSign size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Duration
                                            </label>
                                            <select
                                                name="duration"
                                                value={form.duration}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 appearance-none cursor-pointer"
                                            >
                                                {DURATIONS.map((d) => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Players Needed */}
                                    <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                        <Users size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Players Needed
                                            </label>
                                            <input
                                                name="playersNeeded"
                                                value={form.playersNeeded}
                                                onChange={handleChange}
                                                type="number"
                                                min={1}
                                                max={30}
                                                required
                                                placeholder="e.g. 2"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Skill Level */}
                                    <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
                                        <BarChart2 size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Skill Level
                                            </label>
                                            <select
                                                name="skillLevel"
                                                value={form.skillLevel}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 appearance-none cursor-pointer"
                                            >
                                                {SKILL_LEVELS.map((l) => (
                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Short Note */}
                                    <div className="flex items-start gap-4">
                                        <PenLine size={20} className="text-slate-400 mt-3 flex-shrink-0" />
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Short Note <span className="text-slate-400 font-normal">(Optional)</span>
                                            </label>
                                            <textarea
                                                name="note"
                                                value={form.note}
                                                onChange={handleChange}
                                                rows={3}
                                                placeholder="I'm looking for a casual hitting partner…"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-slate-700 placeholder:text-slate-400 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className={`font-bold py-3 px-10 rounded-full shadow-md transition-all active:scale-95 text-white disabled:opacity-60 ${bookingType === "Walking"
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                                }`}
                                        >
                                            {submitting
                                                ? "Posting…"
                                                : bookingType === "Walking" ? "Post Walking Game" : "Book Court"}
                                        </button>
                                    </div>

                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
