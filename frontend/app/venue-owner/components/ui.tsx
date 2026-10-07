"use client";

import { useState, createContext, useContext, ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextType = { toast: (message: string, type?: ToastType) => void };
const ToastContext = createContext<ToastContextType>({ toast: () => { } });

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toast = useCallback((message: string, type: ToastType = "success") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }, []);

    const icons = { success: <CheckCircle2 size={18} />, error: <XCircle size={18} />, info: <Info size={18} /> };
    const colors = {
        success: "bg-emerald-600 text-white",
        error: "bg-red-500 text-white",
        info: "bg-slate-800 text-white",
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl pointer-events-auto text-sm font-semibold ${colors[t.type]}`}>
                            {icons[t.type]}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

// ─── ConfirmModal ──────────────────────────────────────────────────────────

type ConfirmModalProps = {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
};

export function ConfirmModal({ open, title, description, confirmLabel = "Confirm", onConfirm, onCancel, danger = false }: ConfirmModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={onCancel}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="font-extrabold text-slate-900 text-lg mb-2">{title}</h3>
                        {description && <p className="text-slate-500 text-sm mb-6">{description}</p>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${danger ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── EmptyState ────────────────────────────────────────────────────────────

type EmptyStateProps = { icon: ReactNode; title: string; description: string; action?: ReactNode };
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">{icon}</div>
            <h4 className="font-bold text-slate-900 text-lg mb-2">{title}</h4>
            <p className="text-slate-500 text-sm max-w-xs mb-5">{description}</p>
            {action}
        </div>
    );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────

const badgeStyles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Draft: "bg-slate-100 text-slate-600 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-100",
    Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Completed: "bg-blue-50 text-blue-700 border-blue-100",
    Cancelled: "bg-red-50 text-red-700 border-red-100",
};

export function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {status}
        </span>
    );
}

// ─── StatCard ─────────────────────────────────────────────────────────────

type StatCardProps = { icon: ReactNode; label: string; value: string };
export function StatCard({ icon, label, value }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[120px]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">{icon}</div>
                <h3 className="text-slate-500 text-sm font-medium">{label}</h3>
            </div>
            <div className="flex items-end justify-between">
                <span className="text-3xl font-extrabold text-slate-900">{value}</span>
            </div>
        </div>
    );
}

// ─── PageHeader ───────────────────────────────────────────────────────────

type PageHeaderProps = { title: string; description?: string; action?: ReactNode };
export function PageHeader({ title, description, action }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
                {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
}

// ─── Spinner ──────────────────────────────────────────────────────────────

export function Spinner() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
    );
}
