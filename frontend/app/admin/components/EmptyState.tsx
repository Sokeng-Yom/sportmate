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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 px-6 text-center shadow-sm">
      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={isActionLoading}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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
