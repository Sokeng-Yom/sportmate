"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Globe, MapPin, Calendar, DollarSign, Users, BarChart2,
    PenLine, Info, CheckCircle2, Footprints, ShieldCheck
} from "lucide-react";
import { useVenueOwnerData } from "../../venue-owner/context/VenueOwnerContext";

const SPORTS = [
    "Tennis", "Basketball", "Running", "Badminton", "Football",
    "Volleyball", "Swimming", "Cycling", "Golf", "Cricket",
];

const DURATIONS = [
    "30 min", "45 min", "1 hour", "1.5 hours", "2 hours", "2.5 hours", "3 hours",
];

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];

export default function HostPage() {
    const router = useRouter();
    const { venues, courts, addBooking, addHostedGame } = useVenueOwnerData();
    const [submitted, setSubmitted] = useState(false);

    const [bookingType, setBookingType] = useState<"Walking" | "Court Booking">("Walking");

    const [form, setForm] = useState({
        sport: "",
        location: "",
        venueId: "",
        courtId: "",
        datetime: "",
        duration: "30 min",
        playersNeeded: "",
        skillLevel: "Beginner",
        note: "",
    });

    const selectedVenueCourts = courts.filter(
        (c) => c.venueId === form.venueId && c.active
    );

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Build a booking and push it to the venue-owner system as "Pending"
        const selectedVenue = venues.find((v) => v.id === form.venueId);
        const selectedCourt = courts.find((c) => c.id === form.courtId);

        const dateObj = form.datetime ? new Date(form.datetime) : new Date();
        const date = dateObj.toISOString().split("T")[0];
        const startTime = dateObj.toTimeString().slice(0, 5);
        const [gameDate, gameTime] = form.datetime.split("T");

        // Calculate end time from duration
        const durationMin: Record<string, number> = {
            "30 min": 30, "45 min": 45, "1 hour": 60,
            "1.5 hours": 90, "2 hours": 120, "2.5 hours": 150, "3 hours": 180,
        };
        const endDate = new Date(dateObj.getTime() + (durationMin[form.duration] ?? 60) * 60000);
        const endTime = endDate.toTimeString().slice(0, 5);

        const price = bookingType === "Court Booking" && selectedCourt
            ? Math.round((selectedCourt.pricePerHour * (durationMin[form.duration] ?? 60)) / 60)
            : 0;

        addHostedGame({
            sport: form.sport,
            location: form.location,
            date: gameDate,
            time: gameTime,
            duration: form.duration,
            playersNeeded: Number(form.playersNeeded),
            skillLevel: form.skillLevel,
            note: form.note,
            bookingType,
            venueName: selectedVenue?.name,
            courtName: selectedCourt?.name,
        });

        addBooking({
            courtId: form.courtId || "walk-in",
            venueId: form.venueId || (venues[0]?.id ?? "v1"),
            playerName: "You (Player)",
            date,
            startTime,
            endTime,
            price,
            bookingType,
        });

        setSubmitted(true);
        setTimeout(() => {
            router.push("/player/listings");
        }, 1800);
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
                                    <p className="text-slate-500 text-sm">Your booking is now <span className="font-bold text-amber-500">Pending</span> approval from the venue owner.</p>
                                    <p className="text-slate-400 text-xs">Redirecting you to your hosting…</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">

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
                                                    {venues.filter(v => v.status === "Active").map((v) => (
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
                                                        {selectedVenueCourts.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.name} — ${c.pricePerHour}/hr</option>
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
                                                    <option key={l} value={l}>{l}</option>
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
                                            className={`font-bold py-3 px-10 rounded-full shadow-md transition-all active:scale-95 text-white ${bookingType === "Walking"
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                                }`}
                                        >
                                            {bookingType === "Walking" ? "Post Walking Game" : "Book Court"}
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
