"use client";

import React from "react";

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-slate-400">
                {icon}
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">{title}</h3>
            <p className="text-slate-500 text-sm max-w-xs">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
