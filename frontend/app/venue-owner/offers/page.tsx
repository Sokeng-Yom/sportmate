"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import {
  createVenueDiscount,
  createVenueEvent,
  deleteVenueDiscount,
  deleteVenueEvent,
  listMyVenues,
  listVenueDiscounts,
  listVenueEvents,
  updateVenueDiscount,
  updateVenueEvent,
} from "../../../lib/api";
import type { VenueDiscountRead, VenueEventRead, VenueRead } from "../../../lib/types";

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function VenueOffersPage() {
  const [venues, setVenues] = useState<VenueRead[]>([]);
  const [venueId, setVenueId] = useState("");
  const [discounts, setDiscounts] = useState<VenueDiscountRead[]>([]);
  const [events, setEvents] = useState<VenueEventRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [discountForm, setDiscountForm] = useState({
    title: "",
    description: "",
    percent_off: "",
    code: "",
    valid_until: today(),
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: today(),
    event_time: "18:00",
    sport: "",
    price_label: "Free",
  });

  useEffect(() => {
    listMyVenues()
      .then((items) => {
        setVenues(items);
        const approved = items.find((venue) => venue.status === "APPROVED");
        if (approved) setVenueId(approved.id);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Could not load your venues.");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadMarketing = useCallback(async () => {
    if (!venueId) {
      setDiscounts([]);
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [discountRows, eventRows] = await Promise.all([
        listVenueDiscounts(venueId),
        listVenueEvents(venueId),
      ]);
      setDiscounts(discountRows);
      setEvents(eventRows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load offers and events.");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void loadMarketing();
  }, [loadMarketing]);

  const submitDiscount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!venueId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: discountForm.title,
        description: discountForm.description,
        valid_until: discountForm.valid_until,
        percent_off: discountForm.percent_off ? Number(discountForm.percent_off) : null,
        code: discountForm.code || null,
      };
      if (editingDiscountId) {
        await updateVenueDiscount(venueId, editingDiscountId, payload);
      } else {
        await createVenueDiscount(venueId, payload);
      }
      setEditingDiscountId(null);
      setDiscountForm({ title: "", description: "", percent_off: "", code: "", valid_until: today() });
      setNotice(editingDiscountId ? "Discount updated." : "Discount added.");
      await loadMarketing();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the discount.");
    } finally {
      setSaving(false);
    }
  };

  const submitEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!venueId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editingEventId) {
        await updateVenueEvent(venueId, editingEventId, eventForm);
      } else {
        await createVenueEvent(venueId, eventForm);
      }
      setEditingEventId(null);
      setEventForm({
        title: "",
        description: "",
        event_date: today(),
        event_time: "18:00",
        sport: "",
        price_label: "Free",
      });
      setNotice(editingEventId ? "Event updated." : "Event added.");
      await loadMarketing();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the event.");
    } finally {
      setSaving(false);
    }
  };

  const removeDiscount = async (id: string) => {
    if (!venueId) return;
    setError(null);
    try {
      await deleteVenueDiscount(venueId, id);
      setDiscounts((items) => items.filter((item) => item.id !== id));
      if (editingDiscountId === id) setEditingDiscountId(null);
      setNotice("Discount removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove the discount.");
    }
  };

  const removeEvent = async (id: string) => {
    if (!venueId) return;
    setError(null);
    try {
      await deleteVenueEvent(venueId, id);
      setEvents((items) => items.filter((item) => item.id !== id));
      if (editingEventId === id) setEditingEventId(null);
      setNotice("Event removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove the event.");
    }
  };

  const changeVenue = (nextVenueId: string) => {
    setVenueId(nextVenueId);
    setEditingDiscountId(null);
    setEditingEventId(null);
    setDiscountForm({ title: "", description: "", percent_off: "", code: "", valid_until: today() });
    setEventForm({ title: "", description: "", event_date: today(), event_time: "18:00", sport: "", price_label: "Free" });
  };

  const approvedVenues = venues.filter((venue) => venue.status === "APPROVED");
  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Offers & events</h1>
        <p className="mt-1 text-sm text-slate-500">
          Publish discounts and upcoming activities for players to discover.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {loading && venues.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading venues…</p>
      ) : approvedVenues.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-600">
          An approved venue is required before you can publish offers or events.
        </p>
      ) : (
        <>
          <label className="block max-w-md text-sm font-semibold text-slate-700">
            Venue
            <select className={`${fieldClass} mt-2`} value={venueId} onChange={(e) => changeVenue(e.target.value)}>
              {approvedVenues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Tag size={18} /> Discounts</h2>
              <form onSubmit={submitDiscount} className="space-y-3">
                <input className={fieldClass} required maxLength={120} placeholder="Offer title" value={discountForm.title} onChange={(e) => setDiscountForm({ ...discountForm, title: e.target.value })} />
                <textarea className={fieldClass} required maxLength={2000} placeholder="Description" value={discountForm.description} onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={fieldClass} type="number" min={1} max={100} placeholder="% off (optional)" value={discountForm.percent_off} onChange={(e) => setDiscountForm({ ...discountForm, percent_off: e.target.value })} />
                  <input className={fieldClass} maxLength={50} placeholder="Promo code (optional)" value={discountForm.code} onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <label className="flex-1 text-xs font-semibold text-slate-500">Valid until<input className={`${fieldClass} mt-1`} type="date" required value={discountForm.valid_until} onChange={(e) => setDiscountForm({ ...discountForm, valid_until: e.target.value })} /></label>
                  <div className="mt-5 flex gap-2">
                    {editingDiscountId && <button type="button" onClick={() => { setEditingDiscountId(null); setDiscountForm({ title: "", description: "", percent_off: "", code: "", valid_until: today() }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>}
                    <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} /> {editingDiscountId ? "Save discount" : "Add discount"}</button>
                  </div>
                </div>
              </form>
              <ul className="divide-y divide-slate-100">
                {discounts.map((discount) => (
                  <li key={discount.id} className="flex items-start justify-between gap-3 py-3">
                    <div><p className="font-semibold text-slate-800">{discount.title}</p><p className="text-sm text-slate-500">{discount.description}</p><p className="mt-1 text-xs text-slate-400">Valid until {discount.valid_until}</p></div>
                    <div className="flex shrink-0">
                      <button aria-label={`Edit ${discount.title}`} onClick={() => { setEditingDiscountId(discount.id); setDiscountForm({ title: discount.title, description: discount.description, percent_off: discount.percent_off?.toString() ?? "", code: discount.code ?? "", valid_until: discount.valid_until }); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                      <button aria-label={`Remove ${discount.title}`} onClick={() => void removeDiscount(discount.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><CalendarDays size={18} /> Events</h2>
              <form onSubmit={submitEvent} className="space-y-3">
                <input className={fieldClass} required maxLength={120} placeholder="Event title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
                <textarea className={fieldClass} required maxLength={2000} placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={fieldClass} required placeholder="Sport" value={eventForm.sport} onChange={(e) => setEventForm({ ...eventForm, sport: e.target.value })} />
                  <input className={fieldClass} required maxLength={80} placeholder="Price (e.g. Free, $5 / person)" value={eventForm.price_label} onChange={(e) => setEventForm({ ...eventForm, price_label: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <label className="flex-1 text-xs font-semibold text-slate-500">Date<input className={`${fieldClass} mt-1`} type="date" required value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} /></label>
                  <label className="flex-1 text-xs font-semibold text-slate-500">Time<input className={`${fieldClass} mt-1`} type="time" required value={eventForm.event_time} onChange={(e) => setEventForm({ ...eventForm, event_time: e.target.value })} /></label>
                  <div className="mt-5 flex gap-2">
                    {editingEventId && <button type="button" onClick={() => { setEditingEventId(null); setEventForm({ title: "", description: "", event_date: today(), event_time: "18:00", sport: "", price_label: "Free" }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>}
                    <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} /> {editingEventId ? "Save event" : "Add event"}</button>
                  </div>
                </div>
              </form>
              <ul className="divide-y divide-slate-100">
                {events.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                    <div><p className="font-semibold text-slate-800">{item.title} · {item.sport}</p><p className="text-sm text-slate-500">{item.description}</p><p className="mt-1 text-xs text-slate-400">{item.event_date} at {item.event_time.slice(0, 5)} · {item.price_label}</p></div>
                    <div className="flex shrink-0">
                      <button aria-label={`Edit ${item.title}`} onClick={() => { setEditingEventId(item.id); setEventForm({ title: item.title, description: item.description, event_date: item.event_date, event_time: item.event_time.slice(0, 5), sport: item.sport, price_label: item.price_label }); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                      <button aria-label={`Remove ${item.title}`} onClick={() => void removeEvent(item.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
              {loading && <p className="text-sm text-slate-400">Refreshing…</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
