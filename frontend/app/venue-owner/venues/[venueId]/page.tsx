"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, MapPin, Plus, Pencil, X, ShieldCheck, Upload, FileText } from "lucide-react";
import { useVenueOwnerData, Court } from "../../context/VenueOwnerContext";
import { StatusBadge, EmptyState, ToastProvider, useToast } from "../../components/ui";
import { supabase } from "../../../../lib/supabaseClient";

const PAYMENT_PROOF_MAX_SIZE = 5 * 1024 * 1024;
const PAYMENT_PROOF_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};

const courtSchema = z.object({
    name: z.string().trim().min(1, "Court name is required"),
    sport: z.string().trim().min(1, "Sport is required"),
    pricePerHour: z.preprocess(
        (value) => {
            if (typeof value === "string" && value.trim() === "") return undefined;
            if (typeof value === "string" || typeof value === "number") return Number(value);
            return value;
        },
        z.number().min(1, "Price must be greater than 0")
    ),
    openTime: z.string().trim().min(1, "Open time required"),
    closeTime: z.string().trim().min(1, "Close time required"),
    active: z.boolean(),
});
type CourtFormValues = z.infer<typeof courtSchema>;
const SPORTS = ["Football", "Basketball", "Tennis", "Badminton", "Volleyball"];

function CourtModal({ open, venueId, court, onClose }: { open: boolean; venueId: string; court?: Court; onClose: () => void }) {
    const { addCourt, updateCourt } = useVenueOwnerData();
    const { toast } = useToast();
    const isEdit = !!court;
    const defaultValues = court ? {
        name: court.name,
        sport: court.sport,
        pricePerHour: court.pricePerHour,
        openTime: court.openTime,
        closeTime: court.closeTime,
        active: court.active,
    } : {
        name: "",
        sport: "",
        pricePerHour: 0,
        openTime: "08:00",
        closeTime: "22:00",
        active: true,
    };
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(courtSchema),
        defaultValues,
    });

    const onSubmit = async (data: z.infer<typeof courtSchema>) => {
        const result = isEdit && court
            ? await updateCourt(court.id, data)
            : await addCourt({ ...data, venueId });
        if (!result.ok) {
            toast(result.error ?? "Could not save the court.", "error");
            return;
        }
        toast(isEdit ? "Court updated successfully." : "Court added successfully.");
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={onClose}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-extrabold text-slate-900 text-lg">{isEdit ? "Edit Court" : "Add Court"}</h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Court Name</label>
                                <input {...register("name")} placeholder="e.g. Court A"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Sport</label>
                                <select {...register("sport")}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                    <option value="">Select sport…</option>
                                    {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {errors.sport && <p className="text-red-500 text-xs mt-1">{errors.sport.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Price per Hour ($)</label>
                                <input type="number" {...register("pricePerHour", { valueAsNumber: true })} min={1} step="0.01" inputMode="decimal"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                {errors.pricePerHour && <p className="text-red-500 text-xs mt-1">{errors.pricePerHour.message}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Open Time</label>
                                    <input type="time" {...register("openTime")}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Close Time</label>
                                    <input type="time" {...register("closeTime")}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input type="checkbox" {...register("active")} className="sr-only peer" />
                                <div className="w-10 h-6 bg-slate-200 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                                <span className="text-sm font-semibold text-slate-700">Active (accepting bookings)</span>
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors">
                                    {isEdit ? "Save Changes" : "Add Court"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function VenueDetailContent() {
    const params = useParams();
    const venueId = params.venueId as string;
    const { venues, courts, addCourt, updateCourt, confirmPayment } = useVenueOwnerData();
    const { toast } = useToast();
    const [courtModal, setCourtModal] = useState<{ open: boolean; court?: Court }>({ open: false });
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const paymentInputRef = useRef<HTMLInputElement>(null);

    const venue = venues.find((v) => v.id === venueId);
    const venueCourts = courts.filter((c) => c.venueId === venueId);

    if (!venue) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400 text-3xl">⚠️</div>
                <h2 className="font-extrabold text-slate-900 text-2xl mb-2">Venue Not Found</h2>
                <p className="text-slate-500 mb-6">This venue doesn't exist or may have been deleted.</p>
                <Link href="/venue-owner/venues" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors">Back to My Venues</Link>
            </div>
        );
    }

    const handlePaymentProofChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = "";
        setPaymentError(null);
        if (!file) return;
        setPaymentProof(null);
        if (!PAYMENT_PROOF_TYPES[file.type]) {
            setPaymentError("Choose a JPG, PNG, WebP, or PDF file.");
            return;
        }
        if (file.size > PAYMENT_PROOF_MAX_SIZE) {
            setPaymentError("Payment proof must be 5 MB or smaller.");
            return;
        }
        setPaymentProof(file);
    };

    const handleConfirmPayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!paymentProof) {
            setPaymentError("Upload your payment proof before confirming.");
            return;
        }

        setIsSubmittingPayment(true);
        setPaymentError(null);
        const filePath = `${venueId}/payment-proof.${PAYMENT_PROOF_TYPES[paymentProof.type]}`;
        try {
            const { error: uploadError } = await supabase.storage
                .from("venue-payment-proofs")
                .upload(filePath, paymentProof, {
                    cacheControl: "3600",
                    contentType: paymentProof.type,
                    upsert: true,
                });
            if (uploadError) throw uploadError;

            const result = await confirmPayment(venueId, filePath);
            if (!result.ok) {
                setPaymentError(result.error ?? "Could not confirm payment.");
                return;
            }
            toast("Payment proof submitted — your venue is now under review.");
            setPaymentModalOpen(false);
            setPaymentProof(null);
        } catch (error) {
            console.error("Failed to upload venue payment proof:", error);
            const message = error instanceof Error
                ? error.message
                : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
                    ? error.message
                    : "Please try again.";
            setPaymentError(`Could not upload payment proof: ${message}`);
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    return (
        <div className="max-w-[900px] mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Link href="/venue-owner/venues" className="hover:text-emerald-600 transition-colors font-medium">My Venues</Link>
                <ChevronRight size={14} />
                <span className="text-slate-900 font-semibold">{venue.name}</span>
            </div>

            {/* Venue Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
                {venue.coverImage && <img src={venue.coverImage} alt={venue.name} className="w-full h-48 object-cover" />}
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-extrabold text-slate-900">{venue.name}</h1>
                                <StatusBadge status={venue.status} />
                            </div>
                            <p className="text-slate-500 text-sm flex items-center gap-1 mb-3"><MapPin size={14} />{venue.address}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {venue.sports.map((s) => <span key={s} className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">{s}</span>)}
                                {venue.amenities.map((a) => <span key={a} className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{a}</span>)}
                            </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                            {venue.rawStatus === "PAYMENT_PENDING" && (
                                <button onClick={() => {
                                    setPaymentError(null);
                                    setPaymentModalOpen(true);
                                }}
                                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                                    <ShieldCheck size={16} /> Confirm payment & submit
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm mt-4 leading-relaxed">{venue.description}</p>
                </div>
            </div>

            <AnimatePresence>
                {paymentModalOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="payment-proof-title"
                            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                            initial={{ scale: 0.96, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, y: 12 }}
                        >
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                    <h2 id="payment-proof-title" className="text-xl font-extrabold text-slate-900">Upload payment proof</h2>
                                    <p className="mt-1 text-sm text-slate-500">Attach your payment receipt before submitting this venue for review.</p>
                                </div>
                                <button type="button" onClick={() => setPaymentModalOpen(false)} aria-label="Close dialog" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleConfirmPayment}>
                                <input
                                    ref={paymentInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handlePaymentProofChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => paymentInputRef.current?.click()}
                                    className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-left hover:border-emerald-400 hover:bg-emerald-50/40"
                                >
                                    {paymentProof ? <FileText size={22} className="shrink-0 text-emerald-600" /> : <Upload size={22} className="shrink-0 text-slate-400" />}
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-bold text-slate-800">{paymentProof?.name ?? "Choose a receipt or payment screenshot"}</span>
                                        <span className="mt-1 block text-xs text-slate-500">JPG, PNG, WebP, or PDF · up to 5 MB</span>
                                    </span>
                                </button>

                                {paymentError && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{paymentError}</p>}

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentModalOpen(false)}
                                        disabled={isSubmittingPayment}
                                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!paymentProof || isSubmittingPayment}
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ShieldCheck size={16} />
                                        {isSubmittingPayment ? "Uploading…" : "Confirm & submit"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Courts Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Courts ({venueCourts.length})</h2>
                    {venue.rawStatus === "APPROVED" ? (
                        <button onClick={() => setCourtModal({ open: true })}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                            <Plus size={15} /> Add Court
                        </button>
                    ) : (
                        <span className="text-xs font-medium text-slate-500">Courts can be added once the venue is approved.</span>
                    )}
                </div>

                {venueCourts.length === 0 ? (
                    <EmptyState icon={<Plus size={24} />} title="No courts yet" description="Add your first court to start accepting bookings for this venue." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Court</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sport</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price/hr</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {venueCourts.map((c) => (
                                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3.5 font-semibold text-slate-900 text-sm">{c.name}</td>
                                        <td className="px-5 py-3.5 text-slate-600 text-sm">{c.sport}</td>
                                        <td className="px-5 py-3.5 text-slate-500 text-sm">{c.openTime ? `${c.openTime} – ${c.closeTime}` : "—"}</td>
                                        <td className="px-5 py-3.5 text-slate-900 font-bold text-sm">{c.pricePerHour > 0 ? `$${c.pricePerHour}` : "—"}</td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={c.active ? "Active" : "Draft"} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button onClick={() => setCourtModal({ open: true, court: c })}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Pencil size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CourtModal open={courtModal.open} venueId={venueId} court={courtModal.court} onClose={() => setCourtModal({ open: false })} />
        </div>
    );
}

export default function VenueDetailPage() {
    return <ToastProvider><VenueDetailContent /></ToastProvider>;
}
