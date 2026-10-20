"use client";

import { useState } from "react";
import { Copy, Check, Tag, Clock } from "lucide-react";
import type { Discount } from "../../../lib/venues";

interface DiscountCardProps {
    discount: Discount;
}

export function DiscountCard({ discount }: DiscountCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!discount.code) return;
        navigator.clipboard.writeText(discount.code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const validDate = new Date(discount.validUntil).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Tag size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{discount.title}</p>
                    {discount.percentOff && (
                        <p className="text-2xl font-extrabold text-emerald-600 leading-tight">
                            {discount.percentOff}% off
                        </p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">{discount.description}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11} />
                    Valid until {validDate}
                </span>

                {discount.code && (
                    <button
                        onClick={handleCopy}
                        aria-label={`Copy code ${discount.code}`}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${copied
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                    >
                        {copied ? (
                            <>
                                <Check size={11} />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy size={11} />
                                {discount.code}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
