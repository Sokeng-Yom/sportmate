"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { listNotifications, markAllNotificationsRead } from "../../lib/api";
import { ApiError } from "../../lib/apiClient";
import type { NotificationRead } from "../../lib/types";
import { formatTimeAgo } from "../../lib/dateUtils";

/** Human-friendly label for a notification type. */
function notificationLabel(type: string, payload: Record<string, unknown> | null): string {
  const names: Record<string, string> = {
    MATCH_PLAYER_JOINED: "A player joined your match",
    MATCH_FULL: "Your match is full",
    MATCH_PLAYER_LEFT: "A player left your match",
    WAITING_LIST_OFFER: "A spot opened up in your match",
    BOOKING_REQUESTED: "A new court booking needs review",
    BOOKING_CONFIRMED: "Court booking confirmed",
    BOOKING_REJECTED: "Court booking request declined",
    BOOKING_CANCELLED: "A court booking was cancelled",
    VENUE_APPROVED: "Your venue was approved",
    VENUE_REJECTED: "Your venue application was rejected",
    ACCOUNT_RESTRICTED: "Your account is restricted",
  };
  const label = names[type] ?? type.replace(/_/g, " ").toLowerCase();
  if (payload && typeof payload.venue_name === "string") {
    return `${label} · ${payload.venue_name}`;
  }
  if (payload && typeof payload.match_id === "string") {
    return `${label}`;
  }
  return label;
}

function notificationMessage(type: string, payload: Record<string, unknown> | null): string | null {
  if (!payload || !["BOOKING_CONFIRMED", "BOOKING_REJECTED"].includes(type)) return null;

  const court = typeof payload.court_name === "string" ? payload.court_name : "the selected court";
  const venue = typeof payload.venue_name === "string" ? payload.venue_name : "the venue";
  const startTime = typeof payload.start_time === "string" ? payload.start_time : null;
  const endTime = typeof payload.end_time === "string" ? payload.end_time : null;
  const formatTime = (value: string | null): string | null => {
    if (!value) return null;
    const time = value.split("T")[1];
    const match = time?.match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  };
  const formatDate = (value: string | null): string | null => {
    if (!value) return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  };
  const startDate = formatDate(startTime);
  const endDate = formatDate(endTime);
  const startClock = formatTime(startTime);
  const endClock = formatTime(endTime);
  const bookingDate = startDate && endDate && startDate !== endDate
    ? `${startDate} – ${endDate}`
    : startDate ?? endDate;
  const bookingTime = startClock && endClock
    ? `${startClock} – ${endClock}`
    : startClock ?? endClock;
  const bookingDetails = [bookingDate, bookingTime].filter(Boolean).join(" · ");
  const action = type === "BOOKING_CONFIRMED" ? "confirmed" : "declined";
  const reason = type === "BOOKING_REJECTED" && typeof payload.reason === "string"
    ? ` Reason: ${payload.reason}`
    : "";

  return `The venue ${action} your booking for ${court} at ${venue}${bookingDetails ? ` on ${bookingDetails}` : ""}.${reason}`;
}

function timeAgo(iso: string): string {
  return formatTimeAgo(iso);
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRead[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<NotificationRead | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const requestInFlightRef = useRef(false);

  const load = useCallback(async (options: { announceNew?: boolean; showLoading?: boolean } = {}) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    if (options.showLoading) setLoading(true);
    try {
      const page = await listNotifications({ page: 1, page_size: 20 });
      setItems(page.items);
      setUnreadCount(page.unread_count);
      const knownIds = knownIdsRef.current;
      if (knownIds) {
        const latestNewNotification = page.items.find(
          (item) => !knownIds.has(item.id) && !item.read,
        );
        if (options.announceNew && latestNewNotification) {
          setToast(latestNewNotification);
        }
        page.items.forEach((item) => knownIds.add(item.id));
      } else {
        knownIdsRef.current = new Set(page.items.map((item) => item.id));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load notifications");
    } finally {
      requestInFlightRef.current = false;
      if (options.showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ showLoading: true });

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void load({ announceNew: true });
      }
    };
    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // Close when clicking outside.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load({ showLoading: true });
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update notifications");
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative text-slate-600 hover:text-slate-900 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 bg-red-500 border-2 border-white rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[60] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-emerald-100 bg-white p-4 shadow-xl">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">New notification</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {notificationLabel(toast.type, toast.payload)}
            </p>
            {notificationMessage(toast.type, toast.payload) && (
              <p className="mt-1 text-sm text-slate-600">{notificationMessage(toast.type, toast.payload)}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">{timeAgo(toast.created_at)}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {open && (
        <div className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-sm text-slate-900">Notifications</p>
            <button
              onClick={markAll}
              className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button onClick={() => void load({ showLoading: true })} className="mt-2 text-xs font-semibold text-brand hover:underline">
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {items.map((n) => (
                  <li key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-brand/5"}`}>
                    <p className="text-sm text-slate-800 font-medium leading-snug">
                      {notificationLabel(n.type, n.payload)}
                    </p>
                    {notificationMessage(n.type, n.payload) && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{notificationMessage(n.type, n.payload)}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
