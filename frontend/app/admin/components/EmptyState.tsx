"use client";

import { type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  isActionLoading = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-500 shadow-inner">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={isActionLoading}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`}
          />
          {actionText}
        </button>
      )}
    </div>
  );
}
