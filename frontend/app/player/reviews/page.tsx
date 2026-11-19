"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Star } from "lucide-react";
import { createVenueReview, listEligibleVenueReviews } from "../../../lib/api";
import { ApiError } from "../../../lib/apiClient";
import type { EligibleVenueReview } from "../../../lib/types";

type Draft = { rating: number; comment: string };

function errorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return "Could not complete the request. Please try again.";
}

export default function PlayerReviewsPage() {
    const [bookings, setBookings] = useState<EligibleVenueReview[]>([]);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        setError(null);
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            setBookings(await listEligibleVenueReviews());
        } catch (loadError) {
            setError(errorMessage(loadError));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const updateDraft = (id: string, update: Partial<Draft>) => {
        setDrafts((current) => ({
            ...current,
            [id]: { rating: current[id]?.rating ?? 0, comment: current[id]?.comment ?? "", ...update },
        }));
    };

    const submit = async (booking: EligibleVenueReview) => {
        const draft = drafts[booking.booking_transaction_id] ?? { rating: 0, comment: "" };
        if (!draft.rating) {
            setError("Choose a star rating before submitting.");
            return;
        }
        setSubmitting(booking.booking_transaction_id);
        setError(null);
        setNotice(null);
        try {
            await createVenueReview({
                booking_transaction_id: booking.booking_transaction_id,
                rating: draft.rating,
                comment: draft.comment.trim() || undefined,
            });
            setBookings((current) => current.filter(
                (item) => item.booking_transaction_id !== booking.booking_transaction_id
            ));
            window.dispatchEvent(new Event("sportmate:feedback-submitted"));
            setNotice(`Thanks for sharing feedback about ${booking.venue_name}.`);
        } catch (submitError) {
            setError(errorMessage(submitError));
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Venue feedback</h1>
                    <p className="mt-1 text-sm text-slate-600">Rate a venue after a confirmed booking has ended.</p>
                </div>
                <button
                    type="button"
                    onClick={() => void load(true)}
                    disabled={refreshing || loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

            {loading ? (
                <p role="status" className="py-12 text-center text-sm text-slate-500">Loading completed bookings…</p>
            ) : error && bookings.length === 0 ? null : bookings.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                    <Star className="mx-auto mb-3 text-amber-400" size={28} />
                    <h2 className="font-bold text-slate-900">No feedback to leave yet</h2>
                    <p className="mt-1 text-sm text-slate-600">Once a confirmed court booking has ended, it will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => {
                        const draft = drafts[booking.booking_transaction_id] ?? { rating: 0, comment: "" };
                        const busy = submitting === booking.booking_transaction_id;
                        return (
                            <form
                                key={booking.booking_transaction_id}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void submit(booking);
                                }}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-bold text-slate-900">{booking.venue_name}</h2>
                                        <p className="mt-1 text-sm text-slate-600">{booking.court_names.join(", ")}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {booking.start_time.slice(0, 16).replace("T", " ")}
                                        </p>
                                    </div>
                                    <div role="radiogroup" aria-label={`Rating for ${booking.venue_name}`} className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                            <button
                                                key={rating}
                                                type="button"
                                                role="radio"
                                                aria-checked={draft.rating === rating}
                                                aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                                                onClick={() => updateDraft(booking.booking_transaction_id, { rating })}
                                                className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                                            >
                                                <Star
                                                    size={22}
                                                    className={rating <= draft.rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <label className="mt-4 block">
                                    <span className="sr-only">Written feedback (optional)</span>
                                    <textarea
                                        value={draft.comment}
                                        onChange={(event) => updateDraft(booking.booking_transaction_id, { comment: event.target.value })}
                                        maxLength={1000}
                                        rows={3}
                                        placeholder="Share what went well or what could be improved (optional)"
                                        className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </label>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="text-xs text-slate-400">{draft.comment.length}/1000</span>
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {busy ? "Submitting…" : "Submit feedback"}
                                    </button>
                                </div>
                            </form>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
