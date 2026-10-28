"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { listAdminVenues, listReportedPosts } from "../../lib/api";
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
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-7">
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Administrator Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Welcome back, {adminName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Here is the current moderation queue and health status of SportMate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs">
            <CalendarDays size={15} className="text-slate-400" />
            <span>{formattedDate}</span>
          </div>
          <button
            onClick={() => void fetchDashboardData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
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
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Pending Venue Applications */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Building2 size={22} />
            </div>
            <Link
              href="/admin/venue-applications"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              Review Queue <ArrowRight size={13} />
            </Link>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Pending Venue Applications
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {isLoading ? (
                <span className="inline-block h-8 w-14 animate-pulse rounded bg-slate-200" />
              ) : (
                pendingVenuesCount ?? 0
              )}
            </span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              Awaiting Approval
            </span>
          </div>
        </div>

        {/* Card 2: Reported Posts */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert size={22} />
            </div>
            <Link
              href="/admin/reported-posts"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800"
            >
              Review Reports <ArrowRight size={13} />
            </Link>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Reported Content
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {isLoading ? (
                <span className="inline-block h-8 w-14 animate-pulse rounded bg-slate-200" />
              ) : (
                reportedPostsCount ?? 0
              )}
            </span>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              Needs Moderation
            </span>
          </div>
        </div>

        {/* Card 3: Platform Moderation Status */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-700">Platform Active</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            System Integrity
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {(pendingVenuesCount ?? 0) === 0 && (reportedPostsCount ?? 0) === 0
                ? "Clean"
                : "Active"}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Auth Protected
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Pending Applications & Recent Reported Posts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Venue Applications Section */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={17} className="text-emerald-600" />
                  <span>Pending Venue Applications</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Oldest submissions awaiting review
                </p>
              </div>
              <Link
                href="/admin/venue-applications"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition"
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
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-800">
                  No pending venue applications
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  All court partner submissions have been reviewed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {venue.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        <span>{venue.address}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Submitted: {formatDate(venue.created_at)}
                      </p>
                    </div>

                    <Link
                      href="/admin/venue-applications"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link
              href="/admin/venue-applications"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Go to Venue Applications</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Recent Reported Posts Section */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={17} className="text-rose-600" />
                  <span>Reported Posts to Moderate</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Most reported community content
                </p>
              </div>
              <Link
                href="/admin/reported-posts"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 transition"
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
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={24} />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-800">
                  No reported content
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  The community feed has zero unresolved moderation reports.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reportedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {post.author_name}
                        </span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-extrabold text-rose-700">
                          {post.report_count} {post.report_count === 1 ? "report" : "reports"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        "{post.content}"
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {post.reasons.length > 0
                          ? `Reasons: ${post.reasons.slice(0, 2).join(", ")}`
                          : "No reason text"}
                      </p>
                    </div>

                    <Link
                      href="/admin/reported-posts"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
                    >
                      Moderate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link
              href="/admin/reported-posts"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Go to Reported Posts</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>

      {/* Quick Action Navigation Grid */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0e1e24] to-[#162f38] p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Admin Quick Access</h3>
            <p className="mt-0.5 text-xs text-slate-300">
              Direct access to main SportMate administration modules
            </p>
          </div>
          <span className="rounded-xl bg-white/10 p-2 text-emerald-400">
            <ShieldCheck size={20} />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/venue-applications"
            className="group flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/10 hover:border-emerald-400/40"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300 group-hover:scale-105 transition-transform">
              <Building2 size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">Venue Applications</p>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Review partner court submissions
              </p>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/admin/reported-posts"
            className="group flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/10 hover:border-rose-400/40"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 group-hover:scale-105 transition-transform">
              <ShieldAlert size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">Reported Posts</p>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Dismiss reports or remove content
              </p>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-rose-300 group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/admin/users"
            className="group flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/10 hover:border-sky-400/40 sm:col-span-2 lg:col-span-1"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/15 text-sky-300 group-hover:scale-105 transition-transform">
              <Users size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">User Accounts</p>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                View platform players and owners
              </p>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-sky-300 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </section>
    </div>
  );
}
