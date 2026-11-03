"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  deleteAdminPost,
  dismissPostReports,
  listReportedPosts,
} from "../../../lib/api";
import { ApiError } from "../../../lib/apiClient";
import type { ReportedPostRead } from "../../../lib/types";
import { formatUtcDateTime } from "../../../lib/dateUtils";
import { useAdminToast } from "../components/AdminToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";

export default function ReportedPostsPage() {
  const { success, error: toastError } = useAdminToast();

  const [posts, setPosts] = useState<ReportedPostRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dismiss modal state
  const [postToDismiss, setPostToDismiss] = useState<ReportedPostRead | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  // Remove/Delete modal state
  const [postToRemove, setPostToRemove] = useState<ReportedPostRead | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchReportedPosts = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await listReportedPosts({
          page,
          page_size: pageSize,
        });
        setPosts(res.items);
        setTotal(res.total);
      } catch (err: unknown) {
        let msg = "Failed to load reported posts. Please try again.";
        if (err instanceof ApiError) {
          if (err.status === 403) {
            msg = "Access Denied: You must be an Administrator to moderate reported posts.";
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
    [page, pageSize]
  );

  useEffect(() => {
    void fetchReportedPosts();
  }, [fetchReportedPosts]);

  // Handle Dismiss Reports
  const handleConfirmDismiss = async () => {
    if (!postToDismiss) return;
    setIsDismissing(true);
    try {
      const res = await dismissPostReports(postToDismiss.id);
      success(
        `Reports dismissed (${res.dismissed || "all"} open reports cleared). The post remains active.`
      );

      // Optimistically remove from reported list
      setPosts((prev) => prev.filter((p) => p.id !== postToDismiss.id));
      setTotal((t) => Math.max(0, t - 1));
      setPostToDismiss(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not dismiss reports.";
      toastError(msg);
    } finally {
      setIsDismissing(false);
    }
  };

  // Handle Remove Post
  const handleConfirmRemove = async () => {
    if (!postToRemove) return;
    setIsRemoving(true);
    try {
      await deleteAdminPost(postToRemove.id);
      success("The post was permanently removed from the community feed.");

      // Optimistically remove from reported list
      setPosts((prev) => prev.filter((p) => p.id !== postToRemove.id));
      setTotal((t) => Math.max(0, t - 1));
      setPostToRemove(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not remove post.";
      toastError(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.author_name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.reasons.some((r) => r.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (isoString: string) => {
    return formatUtcDateTime(isoString);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-800">
              <ShieldAlert size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Reported Posts
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Moderate community content reported by players for inappropriate or spam behavior.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchReportedPosts(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin text-rose-600" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Summary Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="flex h-6 items-center rounded-lg bg-rose-100 px-2 text-rose-800 font-bold">
            {total}
          </span>
          <span>Open reported {total === 1 ? "post" : "posts"} awaiting review</span>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search content, author, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-100"
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
            onClick={() => void fetchReportedPosts()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-20 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-6 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="h-16 rounded-xl bg-slate-50" />
              <div className="flex justify-end gap-3 pt-3">
                <div className="h-9 w-28 rounded-xl bg-slate-100" />
                <div className="h-9 w-28 rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={32} className="text-emerald-600" />}
          title="No reported posts"
          description={
            searchQuery
              ? `No reported posts matched "${searchQuery}".`
              : "All reported content has been resolved! There are currently no reports waiting for moderator review."
          }
          actionText="Refresh list"
          onAction={() => void fetchReportedPosts(true)}
          isActionLoading={isRefreshing}
        />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Author Info & Timestamp */}
                <div className="flex items-center gap-3">
                  {post.author_avatar ? (
                    <img
                      src={post.author_avatar}
                      alt={post.author_name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 border border-emerald-200">
                      {post.author_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {post.author_name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded" title={post.author_id}>
                        ID: {post.author_id.substring(0, 6)}...
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Calendar size={12} />
                      <span>Posted on {formatDate(post.created_at)}</span>
                    </p>
                  </div>
                </div>

                {/* Report Count Pill */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-700 border border-rose-200">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <span>
                      {post.report_count} {post.report_count === 1 ? "Report" : "Reports"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Post Content Box */}
              <div className="my-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Engagement metrics */}
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-200/60">
                  <span className="flex items-center gap-1">
                    <Heart size={13} className={post.liked_by_me ? "fill-rose-500 text-rose-500" : ""} />
                    <span>{post.like_count} likes</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={13} />
                    <span>{post.comment_count} comments</span>
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-slate-400" title={post.id}>
                    Post ID: {post.id}
                  </span>
                </div>
              </div>

              {/* Report Reasons Section */}
              <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50/40 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5 mb-2">
                  <Tag size={13} className="text-rose-600" />
                  Reported Reasons:
                </p>
                {post.reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {post.reasons.map((reason, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-rose-900 border border-rose-200/80 shadow-2xs"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        {reason}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Flagged without a specific reason text.
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end pt-3 border-t border-slate-100">
                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setPostToDismiss(post)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <CheckCircle2 size={15} className="text-slate-500" />
                  <span>Dismiss Reports</span>
                </button>

                {/* Destructive Remove Button */}
                <button
                  type="button"
                  onClick={() => setPostToRemove(post)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 transition focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <Trash2 size={15} />
                  <span>Remove Post</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing Page <span className="font-bold text-slate-800">{page}</span>{" "}
            of <span className="font-bold text-slate-800">{totalPages}</span> (
            {total} reported posts)
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

      {/* Dismiss Reports Modal */}
      <ConfirmModal
        isOpen={Boolean(postToDismiss)}
        onClose={() => setPostToDismiss(null)}
        onConfirm={() => void handleConfirmDismiss()}
        title="Dismiss Reports"
        description={`Are you sure you want to dismiss all reports for this post by ${postToDismiss?.author_name}? The reports will be marked as resolved and the post will remain visible in the community feed.`}
        confirmText="Dismiss All Reports"
        cancelText="Cancel"
        variant="primary"
        isLoading={isDismissing}
      />

      {/* Remove Post Destructive Modal */}
      <ConfirmModal
        isOpen={Boolean(postToRemove)}
        onClose={() => setPostToRemove(null)}
        onConfirm={() => void handleConfirmRemove()}
        title="Permanently Remove Post"
        description={`Are you sure you want to delete this post by ${postToRemove?.author_name}? This action is permanent and cannot be undone. All comments and likes associated with this post will also be deleted.`}
        confirmText="Yes, Remove Post"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
}
