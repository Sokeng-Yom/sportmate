"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import {
  approveAdminVenue,
  listAdminVenues,
  rejectAdminVenue,
} from "../../../lib/api";
import { ApiError } from "../../../lib/apiClient";
import { formatUtcDateTime } from "../../../lib/dateUtils";
import type { VenueRead } from "../../../lib/types";
import { useAdminToast } from "../components/AdminToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";

type StatusTab = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ALL";

export default function VenueApplicationsPage() {
  const { success, error: toastError } = useAdminToast();

  const [venues, setVenues] = useState<VenueRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("PENDING_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approve modal state
  const [venueToApprove, setVenueToApprove] = useState<VenueRead | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Reject modal state
  const [venueToReject, setVenueToReject] = useState<VenueRead | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchVenues = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: { status?: string; page: number; page_size: number } = {
          page,
          page_size: pageSize,
        };
        if (statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        const res = await listAdminVenues(params);
        setVenues(res.items);
        setTotal(res.total);
      } catch (err: unknown) {
        let msg = "Failed to load venue applications. Please try again.";
        if (err instanceof ApiError) {
          if (err.status === 403) {
            msg = "Access Denied: You must be an Administrator to view venue applications.";
          } else if (err.status === 401) {
            msg = "Your session has expired. Please sign in again.";
          } else {
            msg = err.message || msg;
          }
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, pageSize, statusFilter]
  );

  useEffect(() => {
    void fetchVenues();
  }, [fetchVenues]);

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!venueToApprove) return;
    setIsApproving(true);
    try {
      await approveAdminVenue(venueToApprove.id);
      success(`"${venueToApprove.name}" has been approved successfully.`);

      // Optimistically update list
      if (statusFilter === "PENDING_REVIEW") {
        setVenues((prev) => prev.filter((v) => v.id !== venueToApprove.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setVenues((prev) =>
          prev.map((v) =>
            v.id === venueToApprove.id
              ? { ...v, status: "APPROVED", reviewed_at: new Date().toISOString() }
              : v
          )
        );
      }
      setVenueToApprove(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not approve venue application.";
      toastError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!venueToReject) return;
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setRejectionError("A rejection reason is required.");
      return;
    }
    if (trimmed.length > 500) {
      setRejectionError("Rejection reason cannot exceed 500 characters.");
      return;
    }

    setIsRejecting(true);
    setRejectionError(null);
    try {
      await rejectAdminVenue(venueToReject.id, { reason: trimmed });
      success(`"${venueToReject.name}" has been rejected.`);

      // Optimistically update list
      if (statusFilter === "PENDING_REVIEW") {
        setVenues((prev) => prev.filter((v) => v.id !== venueToReject.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setVenues((prev) =>
          prev.map((v) =>
            v.id === venueToReject.id
              ? {
                ...v,
                status: "REJECTED",
                rejection_reason: trimmed,
                reviewed_at: new Date().toISOString(),
              }
              : v
          )
        );
      }
      setVenueToReject(null);
      setRejectionReason("");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not reject venue application.";
      setRejectionError(msg);
      toastError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  // Client-side search filtering within the loaded page
  const filteredVenues = venues.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.address.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q)) ||
      v.owner_id.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (isoString: string) => {
    try {
      return formatUtcDateTime(isoString, {

        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <Building2 size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Venue Applications
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Review and approve or reject court partner applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchVenues(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin text-emerald-600" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {(
            [
              { id: "PENDING_REVIEW", label: "Pending Review" },
              { id: "APPROVED", label: "Approved" },
              { id: "REJECTED", label: "Rejected" },
              { id: "ALL", label: "All Venues" },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search venue, address, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
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
            onClick={() => void fetchVenues()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 rounded-lg bg-slate-200" />
                <div className="h-5 w-20 rounded-full bg-slate-100" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <div className="h-9 w-1/2 rounded-xl bg-slate-100" />
                <div className="h-9 w-1/2 rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title={
            statusFilter === "PENDING_REVIEW"
              ? "No pending applications"
              : "No venues found"
          }
          description={
            statusFilter === "PENDING_REVIEW"
              ? "There are currently no venue applications waiting for review. New venue submissions will appear here automatically."
              : searchQuery
                ? `No venues matched "${searchQuery}". Try a different keyword.`
                : "No venue records match the selected status filter."
          }
          actionText="Refresh list"
          onAction={() => void fetchVenues(true)}
          isActionLoading={isRefreshing}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredVenues.map((venue) => {
            const isPending = venue.status === "PENDING_REVIEW";
            const isApproved = venue.status === "APPROVED";
            const isRejected = venue.status === "REJECTED";

            return (
              <div
                key={venue.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
              >
                <div>
                  {/* Header: Name and Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {venue.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">{venue.address}</span>
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0 border ${isApproved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isRejected
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {isPending
                        ? "Pending Review"
                        : isApproved
                          ? "Approved"
                          : isRejected
                            ? "Rejected"
                            : venue.status}
                    </span>
                  </div>

                  {/* Optional Photo or Placeholder */}
                  {venue.photo_url ? (
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 h-36">
                      <img
                        src={venue.photo_url}
                        alt={venue.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Hide broken image gracefully
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Description */}
                  {venue.description && (
                    <p className="mb-4 text-xs text-slate-600 line-clamp-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      {venue.description}
                    </p>
                  )}

                  {/* Metadata fields */}
                  <div className="space-y-2 text-xs text-slate-500 mb-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <User size={12} /> Owner ID
                      </span>
                      <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[170px]" title={venue.owner_id}>
                        {venue.owner_id.substring(0, 8)}...
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> Submitted
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {formatDate(venue.created_at)}
                      </span>
                    </div>

                    {venue.reviewed_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> Reviewed
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {formatDate(venue.reviewed_at)}
                        </span>
                      </div>
                    )}

                    {venue.rejection_reason && (
                      <div className="mt-2 rounded-xl border border-rose-100 bg-rose-50/70 p-2.5 text-xs text-rose-900">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-rose-700">
                          Rejection Reason
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-rose-800">
                          {venue.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 mt-2">
                  {isPending ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectionReason("");
                          setRejectionError(null);
                          setVenueToReject(venue);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2.5 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100/70 hover:border-rose-300 transition focus:outline-none focus:ring-2 focus:ring-rose-400"
                      >
                        <X size={15} />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => setVenueToApprove(venue)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <Check size={15} />
                        Approve
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Decision finalized ({venue.status})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing Page <span className="font-bold text-slate-800">{page}</span>{" "}
            of <span className="font-bold text-slate-800">{totalPages}</span> (
            {total} total venues)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(venueToApprove)}
        onClose={() => setVenueToApprove(null)}
        onConfirm={() => void handleConfirmApprove()}
        title="Approve Venue Application"
        description={`Are you sure you want to approve "${venueToApprove?.name}"? The venue owner will be notified and this venue will become active on the platform.`}
        confirmText="Approve Venue"
        cancelText="Cancel"
        variant="success"
        isLoading={isApproving}
      />

      {/* Reject Modal with Reason Input */}
      <ConfirmModal
        isOpen={Boolean(venueToReject)}
        onClose={() => {
          setVenueToReject(null);
          setRejectionReason("");
          setRejectionError(null);
        }}
        onConfirm={() => void handleConfirmReject()}
        title="Reject Venue Application"
        description={`Provide a reason for rejecting "${venueToReject?.name}". This explanation will be sent directly to the venue owner.`}
        confirmText="Reject Application"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRejecting}
        disabled={!rejectionReason.trim()}
      >
        <div className="space-y-2 mt-3">
          <label className="block text-xs font-bold text-slate-700">
            Rejection Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (rejectionError) setRejectionError(null);
            }}
            placeholder="e.g. Incomplete business documentation, unclear court specifications, or invalid location details..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            maxLength={500}
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            {rejectionError ? (
              <span className="text-rose-600 font-semibold">{rejectionError}</span>
            ) : (
              <span>Required (1 to 500 characters)</span>
            )}
            <span>{rejectionReason.length} / 500</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
