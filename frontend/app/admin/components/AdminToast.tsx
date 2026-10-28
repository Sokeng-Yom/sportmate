"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => toast(message, "success", title),
    [toast]
  );

  const error = useCallback(
    (message: string, title?: string) => toast(message, "error", title),
    [toast]
  );

  const info = useCallback(
    (message: string, title?: string) => toast(message, "info", title),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((item) => {
            const isSuccess = item.type === "success";
            const isError = item.type === "error";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md ${
                  isSuccess
                    ? "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100"
                    : isError
                    ? "border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-100"
                    : "border-slate-200 bg-white/95 text-slate-900 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                }`}
                role="status"
              >
                <span className="mt-0.5 shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : isError ? (
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  {item.title && (
                    <p className="text-xs font-bold leading-tight">
                      {item.title}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed opacity-90">
                    {item.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label="Dismiss toast"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useAdminToast must be used within an AdminToastProvider");
  }
  return ctx;
}
