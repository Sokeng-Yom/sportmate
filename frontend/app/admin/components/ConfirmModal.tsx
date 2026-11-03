"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle, HelpCircle, Loader2, X } from "lucide-react";

export type ConfirmVariant = "danger" | "success" | "primary" | "warning";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
  disabled = false,
  children,
}: ConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const variantStyles = {
    danger: {
      button:
        "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-600/20",
      icon: <AlertTriangle className="h-6 w-6 text-rose-600" />,
      iconBg: "bg-rose-100",
    },
    success: {
      button:
        "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-600/20",
      icon: <CheckCircle className="h-6 w-6 text-emerald-600" />,
      iconBg: "bg-emerald-100",
    },
    warning: {
      button:
        "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-amber-600/20",
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
      iconBg: "bg-amber-100",
    },
    primary: {
      button:
        "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-900 shadow-slate-900/20",
      icon: <HelpCircle className="h-6 w-6 text-slate-700" />,
      iconBg: "bg-slate-100",
    },
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => {
              if (!isLoading) onClose();
            }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${variantStyles.iconBg}`}
                >
                  {variantStyles.icon}
                </div>
                <div>
                  <h3
                    id="confirm-modal-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {children && <div className="mt-4">{children}</div>}

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 transition"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={disabled || isLoading}
                onClick={onConfirm}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles.button}`}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
