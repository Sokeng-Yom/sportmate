"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import { VenueOwnerDataProvider, useVenueOwnerData } from "../venue-owner/context/VenueOwnerContext";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <VenueOwnerDataProvider>
                <PlayerLayoutContent>{children}</PlayerLayoutContent>
            </VenueOwnerDataProvider>
        </Suspense>
    );
}

function PlayerLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { profile } = useVenueOwnerData();
    const displayName = profile.name || "Account";

    const navLinks = [
        { name: "Explore", href: "/player/dashboard" },
        { name: "Host", href: "/player/host" },
        { name: "My Listings", href: "/player/listings" },
        { name: "Messages", href: "/player/messages" },
    ];

    return (
        <div className="min-h-screen bg-[#F8F5F0] text-slate-900 font-sans">
            {/* Top Navigation */}
            <header className="bg-white px-8 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm sticky top-0 z-50">

                {/* Logo */}
                <Link href="/player/dashboard" className="flex items-center gap-2">
                    {/* A simple placeholder logo resembling the screenshot */}
                    <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-slate-900">
                        Sport<span className="text-emerald-500">Mates</span>
                    </span>
                </Link>

                {/* Nav Links */}
                <nav className="hidden md:flex items-center gap-8 font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`${pathname === link.href
                                ? "text-slate-900 font-bold"
                                : "text-slate-600 hover:text-slate-900"
                                } transition-colors`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-6">
                    <button className="text-slate-600 hover:text-slate-900 transition-colors">
                        <Bell size={20} />
                    </button>

                    <span className="hidden sm:inline max-w-36 truncate text-sm font-semibold text-slate-700">
                        {displayName}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                        <img
                            src={profile.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`}
                            alt={`${displayName} avatar`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="w-full">{children}</main>
        </div>
    );
}
