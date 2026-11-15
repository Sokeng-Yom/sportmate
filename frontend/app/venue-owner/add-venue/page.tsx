"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building, MapPin, Target, CheckCircle2, ChevronRight, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVenueOwnerData } from "../context/VenueOwnerContext";
import { SPORTS } from "../../../lib/sports";

const venueSchema = z.object({
    name: z.string().min(3, "Venue name must be at least 3 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    description: z.string().min(20, "Provide a brief description (at least 20 chars)"),
    sports: z.array(z.string()).length(1, "Select one sport"),
    amenities: z.array(z.string()).optional(),
});

type VenueFormValues = z.infer<typeof venueSchema>;

const AMENITIES = ["Parking", "WiFi", "Locker Room", "Cafe", "Equipment Rental"];
const MAX_VENUE_PHOTO_SIZE = 5 * 1024 * 1024;
const VENUE_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function AddVenuePage() {
    const router = useRouter();
    const { addVenue } = useVenueOwnerData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [venuePhoto, setVenuePhoto] = useState<File | null>(null);
    const [venuePhotoPreview, setVenuePhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);

    useEffect(() => {
        if (!venuePhoto) {
            setVenuePhotoPreview(null);
            return;
        }

        const previewUrl = URL.createObjectURL(venuePhoto);
        setVenuePhotoPreview(previewUrl);
        return () => URL.revokeObjectURL(previewUrl);
    }, [venuePhoto]);

    const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<VenueFormValues>({
        resolver: zodResolver(venueSchema),
        defaultValues: { sports: [], amenities: [] },
    });

    const { field: sportsField } = useController({ control, name: "sports" });
    const { field: amenitiesField } = useController({ control, name: "amenities" });
    const selectedSports = sportsField.value;
    const selectedAmenities = amenitiesField.value ?? [];

    const toggleAmenity = (value: string, current: string[]) => {
        if (current.includes(value)) {
            setValue("amenities", current.filter((item) => item !== value), { shouldValidate: true });
        } else {
            setValue("amenities", [...current, value], { shouldValidate: true });
        }
    };

    const handleVenuePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = "";
        setPhotoError(null);
        if (!file) return;
        setVenuePhoto(null);
        if (!VENUE_PHOTO_TYPES.has(file.type)) {
            setPhotoError("Choose a JPG, PNG, or WebP image.");
            return;
        }
        if (file.size > MAX_VENUE_PHOTO_SIZE) {
            setPhotoError("Venue photos must be 5 MB or smaller.");
            return;
        }
        setVenuePhoto(file);
    };

    const onSubmit = async (data: VenueFormValues) => {
        if (photoError) return;
        setIsSubmitting(true);
        setSubmitError(null);
        const result = await addVenue({
            name: data.name,
            address: data.address,
            description: data.description,
            sports: data.sports,
            amenities: data.amenities ?? [],
        }, venuePhoto ?? undefined);
        setIsSubmitting(false);
        if (!result.ok) {
            setSubmitError(result.error ?? "Unable to create the venue. Please try again.");
            if (result.created) setSuccess(true);
            return;
        }
        setSuccess(true);
        setTimeout(() => router.push("/venue-owner/venues"), 2000);
    };

    if (success) {
        return (
            <div className="max-w-[800px] mx-auto pb-12 pt-16 flex flex-col items-center justify-center min-h-[60vh]">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} strokeWidth={2.5} />
                </motion.div>
                <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="text-3xl font-extrabold text-slate-900 mb-2">Venue Added!</motion.h2>
                {submitError ? (
                    <p role="alert" className="text-amber-700 text-center mb-6">{submitError}</p>
                ) : (
                    <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-slate-500 mb-8">Redirecting to My Venues…</motion.p>
                )}
                <Link href="/venue-owner/venues" className="text-emerald-700 font-semibold hover:underline">
                    Go to My Venues
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-[800px] mx-auto pb-12">
            <div className="mb-8">
                <Link href="/venue-owner/venues" className="text-emerald-600 font-medium text-sm flex items-center gap-1 hover:text-emerald-700 transition-colors mb-4 inline-flex">
                    <ChevronRight size={16} className="rotate-180" /> Back to My Venues
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Create New Venue</h1>
                <p className="text-slate-500">Provide the details for your new sports facility.</p>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">

                        {/* Basic Details */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Building size={20} className="text-emerald-500" /> Basic Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Venue Name</label>
                                    <input {...register("name")} placeholder="e.g. Premium Sports Complex"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400" />
                                    {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input {...register("address")} placeholder="123 Sports Avenue, City"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400" />
                                    </div>
                                    {errors.address && <p className="text-red-500 text-xs mt-1 font-medium">{errors.address.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                    <textarea {...register("description")} placeholder="Describe your venue, opening hours, and rules..."
                                        className="w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-y placeholder:text-slate-400" />
                                    {errors.description && <p className="text-red-500 text-xs mt-1 font-medium">{errors.description.message}</p>}
                                </div>
                                <div>
                                    <label htmlFor="venue-photo" className="block text-sm font-semibold text-slate-700 mb-2">Venue Photo (optional)</label>
                                    <input
                                        id="venue-photo"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleVenuePhotoChange}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="venue-photo"
                                        className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:bg-emerald-50"
                                    >
                                        <ImagePlus size={18} className="text-emerald-600" />
                                        {venuePhoto ? "Choose a different photo" : "Upload a venue photo"}
                                    </label>
                                    <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP, up to 5 MB.</p>
                                    {photoError && <p role="alert" className="mt-1 text-xs font-medium text-red-500">{photoError}</p>}
                                    {venuePhotoPreview && (
                                        <img
                                            src={venuePhotoPreview}
                                            alt="Venue photo preview"
                                            className="mt-3 h-40 w-full rounded-xl object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-slate-100" />

                        {/* Facilities */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Target size={20} className="text-emerald-500" /> Facilities
                            </h3>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Available Sport (select one)</label>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Available sport">
                                    {SPORTS.map((sport) => {
                                        const active = selectedSports.includes(sport);
                                        return (
                                            <button type="button" key={sport} role="radio" aria-checked={active}
                                                onClick={() => setValue("sports", [sport], { shouldValidate: true })}
                                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${active ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"}`}>
                                                {sport}
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.sports && <p className="text-red-500 text-xs mt-2 font-medium">{errors.sports.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Amenities</label>
                                <div className="flex flex-wrap gap-2">
                                    {AMENITIES.map((amenity) => {
                                        const active = selectedAmenities.includes(amenity);
                                        return (
                                            <button type="button" key={amenity}
                                                onClick={() => toggleAmenity(amenity, selectedAmenities)}
                                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${active ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                                                {amenity}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="bg-slate-50 p-4 sm:p-6 sm:px-8 border-t border-slate-100 flex flex-col sm:flex-row items-center sm:justify-end gap-3">
                        {submitError && <p className="text-red-500 text-sm font-medium w-full sm:w-auto text-center sm:text-right">{submitError}</p>}
                        <button type="submit" disabled={isSubmitting}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed min-h-[46px]">
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Saving Venue…
                                </>
                            ) : "Create Venue"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
