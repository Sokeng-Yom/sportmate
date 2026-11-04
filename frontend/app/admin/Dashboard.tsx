"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { listAdminVenues, listReportedPosts } from "../../lib/api";
import { formatUtcDateTime } from "../../lib/dateUtils";
import type { ReportedPostRead, VenueRead } from "../../lib/types";
import { useAuth } from "../../lib/auth";

export default function AdminDashboard() {
  const { profile } = useAuth();

  const [pendingVenues, setPendingVenues] = useState<VenueRead[]>([]);
  const [pendingVenuesCount, setPendingVenuesCount] = useState<number | null>(null);

  const [reportedPosts, setReportedPosts] = useState<ReportedPostRead[]>([]);
  const [reportedPostsCount, setReportedPostsCount] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [venuesRes, postsRes] = await Promise.allSettled([
        listAdminVenues({ status: "PENDING_REVIEW", page_size: 5 }),
        listReportedPosts({ page_size: 5 }),
      ]);

      let hasError = false;
      if (venuesRes.status === "fulfilled") {
        setPendingVenues(venuesRes.value.items);
        setPendingVenuesCount(venuesRes.value.total);
      } else {
        hasError = true;
        console.error("Venues load error:", venuesRes.reason);
      }
      if (postsRes.status === "fulfilled") {
        setReportedPosts(postsRes.value.items);
        setReportedPostsCount(postsRes.value.total);
      } else {
        hasError = true;
        console.error("Posts load error:", postsRes.reason);
      }
      if (hasError) {
        setError("Could not load some dashboard metrics. Please check connection and try again.");
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setError("Failed to fetch dashboard metrics.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const adminName = profile?.name || "Administrator";

  const formatDate = (isoString: string) => {
    try {
      return formatUtcDateTime(isoString, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Greeting & Action Row (matching Venue Owner) */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-emerald-600 font-bold mb-1">Welcome back,</h2>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
            {adminName}!
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Here's what requires administrative review and platform moderation today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs">
            <CalendarDays size={15} className="text-slate-400" />
            <span>{formattedDate}</span>
          </div>
          <button
            onClick={() => void fetchDashboardData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin text-emerald-600" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => void fetchDashboardData(true)}
            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Pending Venue Applications */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[130px] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Building2 size={20} />
              </div>
              <h3 className="text-slate-500 text-sm font-medium">Pending Venues</h3>
            </div>
            <Link
              href="/admin/venue-applications"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              Review <ArrowRight size={13} />
            </Link>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {isLoading ? (
                <span className="inline-block h-8 w-14 animate-pulse rounded bg-slate-200" />
              ) : (
                pendingVenuesCount ?? 0
              )}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Awaiting Approval
            </span>
          </div>
        </div>

        {/* Card 2: Reported Posts */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[130px] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-slate-500 text-sm font-medium">Reported Posts</h3>
            </div>
            <Link
              href="/admin/reported-posts"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800"
            >
              Review <ArrowRight size={13} />
            </Link>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {isLoading ? (
                <span className="inline-block h-8 w-14 animate-pulse rounded bg-slate-200" />
              ) : (
                reportedPostsCount ?? 0
              )}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Needs Moderation
            </span>
          </div>
        </div>

        {/* Card 3: Platform Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[130px] hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-slate-500 text-sm font-medium">System Health</h3>
            </div>
            <span className="text-xs font-bold text-emerald-600">Protected</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {(pendingVenuesCount ?? 0) === 0 && (reportedPostsCount ?? 0) === 0
                ? "Optimal"
                : "Active"}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live & Secure
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Pending Applications & Recent Reported Posts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Venue Applications Section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={18} className="text-emerald-600" />
                  <span>Pending Venue Applications</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Submissions awaiting partner verification
                </p>
              </div>
              <Link
                href="/admin/venue-applications"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
              >
                <span>View all ({pendingVenuesCount ?? 0})</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : pendingVenues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">
                  No pending venue applications
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  All venue submissions have been reviewed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {venue.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="shrink-0 text-slate-400" />
                        <span>{venue.address}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Submitted: {formatDate(venue.created_at)}
                      </p>
                    </div>

                    <Link
                      href="/admin/venue-applications"
                      className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link
              href="/admin/venue-applications"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-bold text-white transition-colors shadow-sm"
            >
              <span>Review Venue Applications</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Recent Reported Posts Section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-600" />
                  <span>Reported Content Queue</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Community reports requiring moderator action
                </p>
              </div>
              <Link
                href="/admin/reported-posts"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition"
              >
                <span>View all ({reportedPostsCount ?? 0})</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : reportedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={24} />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">
                  No reported content
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  The community feed has zero unresolved reports.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reportedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {post.author_name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {post.report_count} {post.report_count === 1 ? "report" : "reports"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        "{post.content}"
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {post.reasons.length > 0
                          ? `Reasons: ${post.reasons.slice(0, 2).join(", ")}`
                          : "No reason text"}
                      </p>
                    </div>

                    <Link
                      href="/admin/reported-posts"
                      className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0"
                    >
                      Moderate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link
              href="/admin/reported-posts"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-bold text-white transition-colors shadow-sm"
            >
              <span>Moderate Reported Posts</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>

      {/* Quick Action Navigation Grid (light theme with emerald accents matching Venue Owner) */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Admin Quick Access</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Direct access to main SportMate administration modules
            </p>
          </div>
          <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <ShieldCheck size={20} />
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/venue-applications"
            className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50/30"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Venue Applications</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Review partner court submissions
              </p>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/admin/reported-posts"
            className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs transition hover:border-rose-200 hover:bg-rose-50/30"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
              <ShieldAlert size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Reported Posts</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Dismiss reports or remove content
              </p>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/admin/users"
            className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50/30 sm:col-span-2 lg:col-span-1"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Users size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">User Accounts</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                View platform players and owners
              </p>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </section>
    </div>
  );
}
