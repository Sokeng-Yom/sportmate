"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { adminSections, type AdminRecord } from "./mock-data";
import {
  approveAdminVenue,
  approveBooking,
  cancelBooking,
  createCourt,
  deleteCourt,
  listAdminBookings,
  listAdminCourts,
  listAdminSecurityLogs,
  listAdminUsers,
  listAdminVenues,
  listMatches,
  rejectAdminVenue,
  rejectBooking,
  restrictAdminUser,
  unrestrictAdminUser,
  updateCourt,
} from "../../lib/api";
import { ApiError } from "../../lib/apiClient";
import { formatLocalDateString, formatUtcDateTime } from "../../lib/dateUtils";
import type { VenueRead, WeeklyAvailability } from "../../lib/types";

function formatTime12h(timeStr?: string): string {
  if (!timeStr) return "";
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatBookingSlot(startTime?: string, endTime?: string): string {
  if (!startTime) return "—";
  const datePart = startTime.slice(0, 10);
  const formattedDate = formatLocalDateString(datePart);
  const startT = startTime.includes("T") ? startTime.split("T")[1] : startTime.slice(11);
  const endT = endTime && (endTime.includes("T") ? endTime.split("T")[1] : endTime.slice(11));
  const timeSlot = endT
    ? `${formatTime12h(startT)} – ${formatTime12h(endT)}`
    : formatTime12h(startT);
  return `${formattedDate} · ${timeSlot}`;
}

function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const sStr = start.endsWith("Z") ? start : `${start}Z`;
  const eStr = end.endsWith("Z") ? end : `${end}Z`;
  const s = new Date(sStr).getTime();
  const e = new Date(eStr).getTime();
  const diffMs = e - s;
  if (isNaN(diffMs) || diffMs <= 0) return "—";
  const mins = Math.round(diffMs / 60000);
  if (mins >= 60) {
    const hrs = (mins / 60).toFixed(mins % 60 === 0 ? 0 : 1);
    return `${hrs} hr${hrs === "1" ? "" : "s"} (${mins}m)`;
  }
  return `${mins} mins`;
}

function formatWeeklyAvailability(availability?: WeeklyAvailability | null): string {
  if (!availability) return "No schedule configured";
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const summary: string[] = [];
  for (const day of days) {
    const windows = availability[day];
    if (windows && windows.length > 0) {
      const winStrs = windows.map((w) => `${formatTime12h(w.start)}–${formatTime12h(w.end)}`).join(", ");
      summary.push(`${day.toUpperCase()}: ${winStrs}`);
    }
  }
  return summary.length > 0 ? summary.join(" | ") : "No open hours";
}

function buildWeeklyAvailability(
  openTime: string,
  closeTime: string,
  isAvailable: boolean
): WeeklyAvailability | null {
  if (!isAvailable || !openTime || !closeTime) return null;
  const window = { start: openTime, end: closeTime };
  return {
    mon: [window],
    tue: [window],
    wed: [window],
    thu: [window],
    fri: [window],
    sat: [window],
    sun: [window],
  };
}

type AdminDataPageProps = { section: string };

function StatusBadge({ status }: { status?: string }) {
  const value = status ?? "Unknown";
  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Success: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Open: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    "Under review": "bg-blue-50 text-blue-700 ring-blue-600/10",
    "Review needed": "bg-blue-50 text-blue-700 ring-blue-600/10",
    Full: "bg-blue-50 text-blue-700 ring-blue-600/10",
    Pending: "bg-amber-50 text-amber-700 ring-amber-600/10",
    "Pending review": "bg-amber-50 text-amber-700 ring-amber-600/10",
    Restricted: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Rejected: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Dismissed: "bg-slate-100 text-slate-600 ring-slate-500/10",
    Suspended: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Unavailable: "bg-slate-100 text-slate-600 ring-slate-500/10",
    Maintenance: "bg-amber-50 text-amber-700 ring-amber-600/10",
    Completed: "bg-violet-50 text-violet-700 ring-violet-600/10",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Removed: "bg-slate-100 text-slate-600 ring-slate-500/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${
        styles[value] ?? "bg-slate-100 text-slate-600 ring-slate-500/10"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="admin-dialog-title" className="mt-4 text-lg font-bold text-slate-900">
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}

export default function AdminDataPage({ section }: AdminDataPageProps) {
  const isRealDataSection = [
    "users",
    "venues",
    "activity-logs",
    "listings",
    "bookings",
    "courts",
  ].includes(section);

  const config = adminSections[section];
  const [records, setRecords] = useState<AdminRecord[]>(config?.records ?? []);
  const [totalCount, setTotalCount] = useState<number>(config?.records?.length ?? 0);
  const [isLoading, setIsLoading] = useState<boolean>(isRealDataSection);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPerforming, setIsPerforming] = useState<boolean>(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{
    key: keyof AdminRecord;
    direction: "asc" | "desc";
  } | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const [pending, setPending] = useState<{ record: AdminRecord; action: string } | null>(
    null
  );
  const [toast, setToast] = useState("");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [preferences, setPreferences] = useState({
    email: true,
    security: true,
    weekly: false,
  });

  const [editingCourt, setEditingCourt] = useState<AdminRecord | null>(null);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [approvedVenues, setApprovedVenues] = useState<VenueRead[]>([]);
  const [courtForm, setCourtForm] = useState({
    venueId: "",
    name: "",
    sport: "Football",
    openTime: "08:00",
    closeTime: "22:00",
    isAvailable: true,
  });
  const [editCourtForm, setEditCourtForm] = useState({
    name: "",
    sport: "Football",
    openTime: "08:00",
    closeTime: "22:00",
    isAvailable: true,
  });
  const pageSize = 8;

  // Debounce search input for real API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page state on section change
  useEffect(() => {
    setSearch("");
    setDebouncedSearch("");
    setFilters({});
    setSort(null);
    setPage(1);
    setError(null);
    if (!isRealDataSection) {
      setRecords(config?.records ?? []);
      setTotalCount(config?.records?.length ?? 0);
      setIsLoading(false);
    }
  }, [section, config, isRealDataSection]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Fetch real data from backend endpoints
  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      if (!isRealDataSection) return;
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        if (section === "users") {
          let roleParam: "PLAYER" | "VENUE_OWNER" | "ADMIN" | undefined = undefined;
          if (filters.role === "Player") roleParam = "PLAYER";
          else if (filters.role === "Venue owner") roleParam = "VENUE_OWNER";
          else if (filters.role === "Admin") roleParam = "ADMIN";

          let restrictedParam: boolean | undefined = undefined;
          if (filters.status === "Active") restrictedParam = false;
          else if (filters.status === "Restricted") restrictedParam = true;

          const res = await listAdminUsers({
            q: debouncedSearch.trim() || undefined,
            role: roleParam,
            restricted: restrictedParam,
            page,
            page_size: pageSize,
          });

          const mapped: AdminRecord[] = res.items.map((u) => ({
            id: u.id,
            title: u.name || "Unnamed User",
            email: u.email || "—",
            role:
              u.role === "VENUE_OWNER"
                ? "Venue owner"
                : u.role === "ADMIN"
                ? "Admin"
                : "Player",
            status: u.restricted ? "Restricted" : "Active",
            date: u.created_at
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(u.created_at))
              : "—",
            avatar: u.avatar || undefined,
            restrictedUntil: u.restricted_until
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(u.restricted_until))
              : undefined,
          }));

          setRecords(mapped);
          setTotalCount(res.total);
        } else if (section === "venues") {
          let statusParam: string | undefined = undefined;
          if (filters.status === "Active") statusParam = "APPROVED";
          else if (filters.status === "Pending") statusParam = "PENDING_REVIEW";
          else if (filters.status === "Suspended") statusParam = "REJECTED";

          const res = await listAdminVenues({
            status: statusParam,
            page,
            page_size: pageSize,
          });

          let items = res.items;
          if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            items = items.filter(
              (v) =>
                v.name.toLowerCase().includes(q) ||
                v.address.toLowerCase().includes(q) ||
                (v.description && v.description.toLowerCase().includes(q))
            );
          }

          const mapped: AdminRecord[] = items.map((v) => ({
            id: v.id,
            title: v.name,
            owner: v.owner_id ? `${v.owner_id.slice(0, 8)}...` : "—",
            location: v.address,
            category: v.description
              ? v.description.length > 30
                ? v.description.slice(0, 30) + "..."
                : v.description
              : "Sports Venue",
            status:
              v.status === "APPROVED"
                ? "Active"
                : v.status === "PENDING_REVIEW"
                ? "Pending"
                : v.status === "REJECTED"
                ? "Suspended"
                : v.status,
            date: v.created_at
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(v.created_at))
              : "—",
            address: v.address,
            rejectionReason: v.rejection_reason || undefined,
          }));

          setRecords(mapped);
          setTotalCount(res.total);
        } else if (section === "activity-logs") {
          const res = await listAdminSecurityLogs({
            page,
            page_size: pageSize,
          });

          let items = res.items;
          if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            items = items.filter(
              (l) =>
                l.action.toLowerCase().includes(q) ||
                (l.user_name && l.user_name.toLowerCase().includes(q)) ||
                (l.details && l.details.toLowerCase().includes(q))
            );
          }

          const mapped: AdminRecord[] = items.map((l) => ({
            id: l.id,
            date: l.created_at
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(l.created_at))
              : "—",
            owner:
              l.user_name ||
              (l.user_id ? `User (${l.user_id.slice(0, 8)})` : "System"),
            title: l.action.replace(/_/g, " "),
            target: l.details || "—",
            result: "Success",
            ipAddress: l.ip_address || undefined,
          }));

          setRecords(mapped);
          setTotalCount(res.total);
        } else if (section === "listings") {
          let statusParam: string | undefined = undefined;
          if (filters.status === "Open") statusParam = "OPEN";
          else if (filters.status === "Full") statusParam = "FULL";
          else if (filters.status === "Completed") statusParam = "CONFIRMED";
          else if (filters.status === "Removed") statusParam = "CANCELLED";

          const res = await listMatches({
            sport: filters.category || undefined,
            status: statusParam,
            page,
            page_size: pageSize,
          });

          let items = res.items;
          if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            items = items.filter(
              (m) =>
                m.sport.toLowerCase().includes(q) ||
                m.location.toLowerCase().includes(q) ||
                (m.host_name && m.host_name.toLowerCase().includes(q))
            );
          }

          const mapped: AdminRecord[] = items.map((m) => ({
            id: m.id,
            title: `${m.sport} match`,
            owner:
              m.host_name ||
              (m.created_by ? `Host (${m.created_by.slice(0, 8)})` : "Host"),
            location: m.location,
            date: m.date ? `${m.date} · ${m.time || ""}` : "—",
            category: `${m.joined_count ?? 1} / ${m.players_needed} · ${m.sport}`,
            status:
              m.status === "OPEN"
                ? "Open"
                : m.status === "FULL"
                ? "Full"
                : m.status === "CONFIRMED"
                ? "Completed"
                : m.status === "CANCELLED"
                ? "Removed"
                : m.status,
            sport: m.sport,
          }));

          setRecords(mapped);
          setTotalCount(res.total);
        } else if (section === "bookings") {
          let statusParam: string | undefined = undefined;
          if (filters.status) statusParam = filters.status.toUpperCase();

          const res = await listAdminBookings({
            q: debouncedSearch.trim() || undefined,
            status: statusParam,
            page,
            page_size: pageSize,
          });

          const mapped: AdminRecord[] = res.items.map((b) => {
            const duration = calculateDuration(b.start_time, b.end_time);
            const slotDisplay = formatBookingSlot(b.start_time, b.end_time);
            return {
              id: b.id,
              title: `${b.court_name || "Court"} · ${b.venue_name || "Venue"}`,
              owner:
                b.booker_name ||
                (b.booked_by ? `User (${b.booked_by.slice(0, 8)})` : "—"),
              date: slotDisplay,
              category: duration,
              status:
                b.status === "PENDING"
                  ? "Pending"
                  : b.status === "CONFIRMED"
                  ? "Confirmed"
                  : b.status === "CANCELLED"
                  ? "Cancelled"
                  : b.status === "REJECTED"
                  ? "Rejected"
                  : b.status,
              courtName: b.court_name || "—",
              venueName: b.venue_name || "—",
              venueId: b.venue_id || "—",
              bookerName: b.booker_name || "—",
              bookerId: b.booked_by,
              timeSlot: slotDisplay,
              duration,
              matchId: b.match_id || "Direct Court Reservation",
              created: b.created_at ? formatUtcDateTime(b.created_at) : "—",
            };
          });

          setRecords(mapped);
          setTotalCount(res.total);
        } else if (section === "courts") {
          const res = await listAdminCourts({
            q: debouncedSearch.trim() || undefined,
            sport: filters.category || undefined,
            page,
            page_size: pageSize,
          });

          let items = res.items;
          if (filters.status === "Available") {
            items = items.filter((c) => {
              if (!c.availability) return false;
              return Object.values(c.availability).some(
                (arr) => Array.isArray(arr) && arr.length > 0
              );
            });
          } else if (filters.status === "Unavailable") {
            items = items.filter((c) => {
              if (!c.availability) return true;
              return !Object.values(c.availability).some(
                (arr) => Array.isArray(arr) && arr.length > 0
              );
            });
          }

          const mapped: AdminRecord[] = items.map((c) => {
            const hasHours =
              c.availability &&
              Object.values(c.availability).some(
                (arr) => Array.isArray(arr) && arr.length > 0
              );
            const scheduleText = formatWeeklyAvailability(c.availability);
            return {
              id: c.id,
              title: c.name,
              owner: c.venue_name || "—",
              category: c.sport,
              location: c.venue_address || "—",
              status: hasHours ? "Available" : "Unavailable",
              courtId: c.id,
              courtName: c.name,
              venueName: c.venue_name || "—",
              venueId: c.venue_id,
              venueAddress: c.venue_address || "—",
              sport: c.sport,
              operatingHours: scheduleText,
              created: c.created_at ? formatUtcDateTime(c.created_at) : "—",
            };
          });

          setRecords(mapped);
          setTotalCount(res.total);
        }
      } catch (err: unknown) {
        let msg = "Failed to load records from backend.";
        if (err instanceof ApiError) {
          if (err.status === 403) {
            msg = "Access Denied: You must be an Administrator.";
          } else if (err.status === 401) {
            msg = "Session expired. Please sign in again.";
          } else {
            msg = err.message || msg;
          }
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
        setRecords([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isRealDataSection, section, debouncedSearch, filters, page, pageSize]
  );

  useEffect(() => {
    if (isRealDataSection) {
      void fetchData();
    }
  }, [isRealDataSection, fetchData]);

  const sortedRecords = useMemo(() => {
    let result = [...records];
    if (!isRealDataSection) {
      result = result.filter((record) => {
        const matchesSearch =
          !search ||
          Object.values(record).some((value) =>
            String(value ?? "").toLowerCase().includes(search.toLowerCase())
          );
        const matchesFilters = Object.entries(filters).every(
          ([key, value]) => !value || record[key as keyof AdminRecord] === value
        );
        return matchesSearch && matchesFilters;
      });
    }
    if (sort) {
      result.sort((a, b) => {
        const compared = String(a[sort.key] ?? "").localeCompare(
          String(b[sort.key] ?? ""),
          undefined,
          { numeric: true }
        );
        return sort.direction === "asc" ? compared : -compared;
      });
    }
    return result;
  }, [records, search, filters, sort, isRealDataSection]);

  const totalRecordsCount = isRealDataSection ? totalCount : sortedRecords.length;
  const pages = Math.max(1, Math.ceil(totalRecordsCount / pageSize));
  const visibleRecords = isRealDataSection
    ? sortedRecords
    : sortedRecords.slice((page - 1) * pageSize, page * pageSize);

  if (section === "settings") {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Settings"
          description="Manage your admin profile and display preferences."
        />
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-slate-900">Administrator profile</p>
            <p className="mt-1 text-xs text-slate-500">
              Your profile is shown to other administrators.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                AD
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">SportMates Admin</p>
                <p className="mt-1 text-xs text-slate-500">admin@sportmates.app</p>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
              This profile is preview content. Profile updates are managed in user settings.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-slate-900">Display preferences</p>
            <p className="mt-1 text-xs text-slate-500">
              Customize what you see in the admin workspace.
            </p>
            <label className="mt-5 flex max-w-sm flex-col gap-2 text-xs font-semibold text-slate-700">
              Default analytics period
              <select
                value={dateRange}
                onChange={(event) => {
                  setDateRange(event.target.value);
                  setToast("Display preference updated for this preview.");
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500"
              >
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </label>
            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold text-slate-800">Notifications</p>
              {(
                [
                  ["email", "Important admin updates"],
                  ["security", "Security alerts"],
                  ["weekly", "Weekly platform summary"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="mt-4 flex cursor-pointer items-center justify-between gap-4 text-xs text-slate-600"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={() => {
                      setPreferences((old) => ({ ...old, [key]: !old[key] }));
                      setToast("Notification preference updated for this preview.");
                    }}
                    className="h-4 w-4 accent-emerald-600"
                  />
                </label>
              ))}
            </div>
            <p className="mt-5 text-[10px] text-slate-400">
              Preferences are held in temporary page state and reset when you leave.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (section === "analytics") {
    const values =
      dateRange === "Last 7 days"
        ? [32, 46, 40, 58, 53, 71, 62]
        : dateRange === "Last 90 days"
        ? [37, 46, 42, 68, 61, 75, 82]
        : [28, 39, 36, 55, 49, 66, 74];
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <PageHeading
            title="Analytics"
            description="Explore user growth and platform engagement."
          />
          <div className="flex items-center gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Preview data · Aggregation pending
            </span>
            <label className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 sm:self-auto">
              <span className="text-slate-400">Period</span>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                className="h-9 bg-transparent font-semibold outline-none"
              >
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Users", "1,248", "+12.8%"],
            ["New users", "142", "+9.4%"],
            ["Game listings", "186", "+8.2%"],
            ["Active venues", "36", "+4"],
          ].map(([label, value, trend]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
              <p className="mt-2 text-[10px] font-semibold text-emerald-700">
                {trend} <span className="font-normal text-slate-400">vs. previous period</span>
              </p>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold text-slate-900">User growth</h2>
          <p className="mt-1 text-xs text-slate-500">
            New users registered during {dateRange.toLowerCase()} · preview data
          </p>
          <div className="mt-7 flex h-64 items-end gap-3 border-b border-slate-100 px-1 sm:gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[9px] text-slate-400">{value}</span>
                <div
                  className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-300 transition-all"
                  style={{ height: `${value}%` }}
                />
                <span className="pb-2 text-[9px] text-slate-400">
                  {dateRange === "Last 7 days" ? `D${index + 1}` : `W${index + 1}`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ["Role distribution", "77% players · 19% venue owners · 4% admins"],
              ["Game activity", "186 active listings across 4 sports"],
              ["Venue network", "36 active venues with 81 courts"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-bold text-slate-800">Admin page not found</p>
        <p className="mt-2 text-xs text-slate-500">Choose a page from the admin navigation.</p>
      </div>
    );
  }

  const updateSort = (key: keyof AdminRecord) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const openAddCourt = async () => {
    try {
      const venuesRes = await listAdminVenues({ status: "APPROVED", page_size: 100 });
      setApprovedVenues(venuesRes.items);
      if (venuesRes.items.length > 0) {
        setCourtForm({
          venueId: venuesRes.items[0].id,
          name: "",
          sport: "Football",
          openTime: "08:00",
          closeTime: "22:00",
          isAvailable: true,
        });
        setShowAddCourtModal(true);
      } else {
        setToast("No approved venues available. Please approve a venue first.");
      }
    } catch {
      setToast("Could not load venues for court creation.");
    }
  };

  const handleCreateCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtForm.name.trim()) {
      setToast("Court name is required.");
      return;
    }
    setIsPerforming(true);
    try {
      const availability = buildWeeklyAvailability(
        courtForm.openTime,
        courtForm.closeTime,
        courtForm.isAvailable
      );
      await createCourt(courtForm.venueId, {
        name: courtForm.name.trim(),
        sport: courtForm.sport,
        availability: availability ?? undefined,
      });
      setShowAddCourtModal(false);
      setToast(`Court "${courtForm.name}" created successfully.`);
      void fetchData(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create court.";
      setToast(`Error: ${msg}`);
    } finally {
      setIsPerforming(false);
    }
  };

  const handleStartEditCourt = (record: AdminRecord) => {
    setEditingCourt(record);
    setEditCourtForm({
      name: record.title || "",
      sport: (record.category as string) || "Football",
      openTime: "08:00",
      closeTime: "22:00",
      isAvailable: record.status !== "Unavailable",
    });
  };

  const handleUpdateCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt || !editCourtForm.name.trim()) return;
    setIsPerforming(true);
    try {
      const availability = buildWeeklyAvailability(
        editCourtForm.openTime,
        editCourtForm.closeTime,
        editCourtForm.isAvailable
      );
      await updateCourt(editingCourt.id, {
        name: editCourtForm.name.trim(),
        sport: editCourtForm.sport,
        availability: availability ?? undefined,
      });
      setEditingCourt(null);
      setToast(`Court "${editCourtForm.name}" updated successfully.`);
      void fetchData(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update court.";
      setToast(`Error: ${msg}`);
    } finally {
      setIsPerforming(false);
    }
  };

  const performAction = async () => {
    if (!pending) return;
    setIsPerforming(true);

    try {
      if (section === "users") {
        if (pending.action === "Restrict") {
          await restrictAdminUser(pending.record.id, {
            days: 7,
            reason: "Account restricted by administrator",
          });
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Restricted" }
                : record
            )
          );
          setToast(`${pending.record.title}: user restricted for 7 days.`);
        } else if (pending.action === "Reactivate") {
          await unrestrictAdminUser(pending.record.id);
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Active" }
                : record
            )
          );
          setToast(`${pending.record.title}: user reactivated.`);
        }
      } else if (section === "venues") {
        if (pending.action === "Approve") {
          await approveAdminVenue(pending.record.id);
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Active" }
                : record
            )
          );
          setToast(`${pending.record.title}: venue approved successfully.`);
        } else if (pending.action === "Reject") {
          await rejectAdminVenue(pending.record.id, {
            reason: "Application rejected by administrator",
          });
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Suspended" }
                : record
            )
          );
          setToast(`${pending.record.title}: venue rejected.`);
        }
      } else if (section === "bookings") {
        if (pending.action === "Approve booking") {
          await approveBooking(pending.record.id);
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Confirmed" }
                : record
            )
          );
          setToast(`${pending.record.title}: booking approved.`);
        } else if (pending.action === "Reject booking") {
          await rejectBooking(pending.record.id, "Rejected by administrator");
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Rejected" }
                : record
            )
          );
          setToast(`${pending.record.title}: booking rejected.`);
        } else if (pending.action === "Cancel booking") {
          await cancelBooking(pending.record.id);
          setRecords((current) =>
            current.map((record) =>
              record.id === pending.record.id
                ? { ...record, status: "Cancelled" }
                : record
            )
          );
          setToast(`${pending.record.title}: booking cancelled.`);
        }
      } else if (section === "courts") {
        if (pending.action === "Delete court") {
          await deleteCourt(pending.record.id);
          setRecords((current) =>
            current.filter((record) => record.id !== pending.record.id)
          );
          setTotalCount((c) => Math.max(0, c - 1));
          setToast(`${pending.record.title}: court deleted successfully.`);
        }
      } else {
        const nextStatus =
          pending.action === "Restrict"
            ? "Restricted"
            : pending.action === "Reactivate"
            ? "Active"
            : pending.action === "Approve"
            ? "Approved"
            : pending.action === "Reject"
            ? "Rejected"
            : pending.action === "Resolve"
            ? "Resolved"
            : pending.action === "Dismiss"
            ? "Dismissed"
            : "Removed";
        setRecords((current) =>
          current.map((record) =>
            record.id === pending.record.id
              ? { ...record, status: nextStatus }
              : record
          )
        );
        setToast(
          `${pending.record.title}: ${pending.action.toLowerCase()} completed in preview.`
        );
      }
      setPending(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Action failed. Please try again.";
      setToast(`Error: ${msg}`);
    } finally {
      setIsPerforming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeading title={config.title} description={config.description} />
        {!isRealDataSection && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Sample data · changes are temporary
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => void fetchData()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(20,48,43,.03)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="relative block w-full sm:max-w-[330px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder={config.searchLabel}
              aria-label={config.searchLabel}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {config.filters?.map((filter) => (
              <label key={filter.key} className="relative">
                <SlidersHorizontal
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={filters[filter.key] ?? ""}
                  onChange={(event) => {
                    setFilters((current) => ({
                      ...current,
                      [filter.key]: event.target.value,
                    }));
                    setPage(1);
                  }}
                  aria-label={filter.label}
                  className="h-9 min-w-32 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[11px] font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-emerald-400"
                >
                  {[filter.label, ...filter.values].map((value, index) => (
                    <option key={value} value={index === 0 ? "" : value}>
                      {value}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </label>
            ))}

            {isRealDataSection && (
              <button
                type="button"
                onClick={() => void fetchData(true)}
                disabled={isLoading || isRefreshing}
                title="Refresh real data"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <RefreshCw
                  size={13}
                  className={isRefreshing ? "animate-spin text-emerald-600" : ""}
                />
              </button>
            )}

            {section === "courts" && (
              <button
                type="button"
                onClick={() => void openAddCourt()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
              >
                <Plus size={13} />
                <span>Add Court</span>
              </button>
            )}

            <span className="ml-1 text-[11px] text-slate-400">
              <strong className="font-semibold text-slate-600">
                {totalRecordsCount}
              </strong>{" "}
              records
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left">
            <thead className="bg-slate-50/70">
              <tr>
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-5"
                  >
                    <button
                      className="inline-flex items-center gap-1.5 hover:text-slate-700"
                      onClick={() => updateSort(column.key)}
                    >
                      {column.label}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp size={11} />
                        ) : (
                          <ArrowDown size={11} />
                        )
                      ) : (
                        <Settings2 size={11} className="opacity-30" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 pr-5 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(pageSize)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {config.columns.map((col, idx) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 ${idx === 0 ? "pl-5" : ""}`}
                      >
                        <div className="h-4 w-3/4 rounded bg-slate-100" />
                      </td>
                    ))}
                    <td className="px-4 py-3.5 pr-5 text-right">
                      <div className="h-6 w-16 ml-auto rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : visibleRecords.length > 0 ? (
                visibleRecords.map((record) => (
                  <tr key={record.id} className="transition hover:bg-slate-50/70">
                    {config.columns.map((column, index) => {
                      const value = record[column.key];
                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-3.5 text-xs ${
                            index === 0
                              ? "pl-5 font-semibold text-slate-800"
                              : "text-slate-600"
                          }`}
                        >
                          {column.key === "status" || column.key === "result" ? (
                            <StatusBadge status={String(value)} />
                          ) : column.key === "title" && section === "users" ? (
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800">
                                {record.title
                                  .split(/\s+/)
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                              <span>{String(value)}</span>
                            </div>
                          ) : (
                            <span
                              className={
                                column.key === "id"
                                  ? "font-mono text-[10px] text-slate-400"
                                  : ""
                              }
                            >
                              {String(value || "—")}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3.5 pr-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSelected(record)}
                          aria-label={`View details for ${record.title}`}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800"
                        >
                          <Eye size={14} />
                        </button>
                        {section === "users" && (
                          <button
                            onClick={() =>
                              setPending({
                                record,
                                action:
                                  record.status === "Active" ? "Restrict" : "Reactivate",
                              })
                            }
                            className={`rounded-md px-2 py-1.5 text-[10px] font-semibold ${
                              record.status === "Active"
                                ? "text-rose-700 hover:bg-rose-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {record.status === "Active" ? "Restrict" : "Reactivate"}
                          </button>
                        )}
                        {section === "venues" && record.status === "Pending" && (
                          <>
                            <button
                              onClick={() => setPending({ record, action: "Approve" })}
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setPending({ record, action: "Reject" })}
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {section === "venue-applications" &&
                          record.status !== "Approved" &&
                          record.status !== "Rejected" && (
                            <>
                              <button
                                onClick={() =>
                                  setPending({ record, action: "Approve" })
                                }
                                className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setPending({ record, action: "Reject" })}
                                className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        {section === "reports" &&
                          record.status !== "Resolved" &&
                          record.status !== "Dismissed" && (
                            <>
                              <button
                                onClick={() =>
                                  setPending({ record, action: "Resolve" })
                                }
                                className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() =>
                                  setPending({ record, action: "Dismiss" })
                                }
                                className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        {section === "listings" && record.status !== "Removed" && (
                          <button
                            onClick={() =>
                              setPending({ record, action: "Remove listing" })
                            }
                            className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        )}
                        {section === "bookings" && record.status === "Pending" && (
                          <>
                            <button
                              onClick={() =>
                                setPending({ record, action: "Approve booking" })
                              }
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setPending({ record, action: "Reject booking" })
                              }
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {section === "bookings" &&
                          (record.status === "Pending" ||
                            record.status === "Confirmed") && (
                            <button
                              onClick={() =>
                                setPending({ record, action: "Cancel booking" })
                              }
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              Cancel
                            </button>
                          )}
                        {section === "courts" && (
                          <>
                            <button
                              onClick={() => handleStartEditCourt(record)}
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                setPending({ record, action: "Delete court" })
                              }
                              className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <Search size={18} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No matching records
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {isRealDataSection
                        ? "No records found in this view. Try adjusting your search query or status filter."
                        : "Try changing your search or filters."}
                    </p>
                    {(search || Object.values(filters).some(Boolean)) && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilters({});
                          setPage(1);
                        }}
                        className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {totalRecordsCount ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, totalRecordsCount)}
            </span>{" "}
            of {totalRecordsCount} records
          </p>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                aria-current={page === number ? "page" : undefined}
                onClick={() => setPage(number)}
                className={`h-8 min-w-8 rounded-md px-2 text-[10px] font-semibold ${
                  page === number
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {number}
              </button>
            ))}
            <button
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
              className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {!isRealDataSection && (
        <p className="text-[10px] text-slate-400">
          Actions on these sample records only update the current page state. No live data is changed.
        </p>
      )}

      {selected && (
        <Dialog title={selected.title} onClose={() => setSelected(null)}>
          <div className="flex items-center justify-between">
            <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
              <Users size={18} />
            </span>
            <button
              aria-label="Close details"
              onClick={() => setSelected(null)}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            {selected.id}
          </p>
          <div className="mt-4 space-y-3">
            {Object.entries(selected)
              .filter(
                ([key, value]) =>
                  key !== "id" && value && typeof value !== "object"
              )
              .map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-xs"
                >
                  <span className="capitalize text-slate-400">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="text-right font-medium text-slate-700">
                    {String(value)}
                  </span>
                </div>
              ))}
          </div>
        </Dialog>
      )}

      {pending && (
        <Dialog
          title={`${pending.action}?`}
          onClose={() => !isPerforming && setPending(null)}
        >
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl ${
              pending.action === "Approve" ||
              pending.action === "Resolve" ||
              pending.action === "Reactivate"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <ShieldAlert size={19} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Confirm you want to {pending.action.toLowerCase()}{" "}
            <strong className="text-slate-800">{pending.record.title}</strong>.
            {isRealDataSection
              ? " This action directly executes on the live backend."
              : " This only changes the preview state."}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              disabled={isPerforming}
              onClick={() => setPending(null)}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={isPerforming}
              onClick={() => void performAction()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {isPerforming ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Confirm
            </button>
          </div>
        </Dialog>
      )}

      {showAddCourtModal && (
        <Dialog
          title="Add New Court"
          onClose={() => !isPerforming && setShowAddCourtModal(false)}
        >
          <form onSubmit={handleCreateCourtSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Venue
              </label>
              <select
                value={courtForm.venueId}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, venueId: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
              >
                {approvedVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.address})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Court Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Court A or Pitch 1"
                value={courtForm.name}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, name: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Sport
              </label>
              <select
                value={courtForm.sport}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, sport: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
              >
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Badminton">Badminton</option>
                <option value="Volleyball">Volleyball</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={courtForm.openTime}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, openTime: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={courtForm.closeTime}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, closeTime: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={courtForm.isAvailable}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, isAvailable: e.target.checked })
                }
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Set as active / available immediately</span>
            </label>
            <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPerforming}
                onClick={() => setShowAddCourtModal(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPerforming}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isPerforming ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Create Court
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {editingCourt && (
        <Dialog
          title={`Edit Court: ${editingCourt.title}`}
          onClose={() => !isPerforming && setEditingCourt(null)}
        >
          <form onSubmit={handleUpdateCourtSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Court Name
              </label>
              <input
                type="text"
                required
                value={editCourtForm.name}
                onChange={(e) =>
                  setEditCourtForm({ ...editCourtForm, name: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Sport
              </label>
              <select
                value={editCourtForm.sport}
                onChange={(e) =>
                  setEditCourtForm({ ...editCourtForm, sport: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
              >
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Badminton">Badminton</option>
                <option value="Volleyball">Volleyball</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={editCourtForm.openTime}
                  onChange={(e) =>
                    setEditCourtForm({ ...editCourtForm, openTime: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={editCourtForm.closeTime}
                  onChange={(e) =>
                    setEditCourtForm({ ...editCourtForm, closeTime: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={editCourtForm.isAvailable}
                onChange={(e) =>
                  setEditCourtForm({ ...editCourtForm, isAvailable: e.target.checked })
                }
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Set as active / available</span>
            </label>
            <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPerforming}
                onClick={() => setEditingCourt(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPerforming}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isPerforming ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl"
        >
          <Check size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}
