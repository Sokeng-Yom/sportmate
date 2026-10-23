"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { listNotifications, markAllNotificationsRead } from "../../lib/api";
import { ApiError } from "../../lib/apiClient";
import type { NotificationRead } from "../../lib/types";

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

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRead[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listNotifications({ page: 1, page_size: 20 });
      setItems(page.items);
      setUnreadCount(page.unread_count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (next) load();
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore — the dropdown still refreshes next time */
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
                <button onClick={load} className="mt-2 text-xs font-semibold text-brand hover:underline">
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
