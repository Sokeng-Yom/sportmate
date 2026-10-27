"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { RouteGuard, useAuth } from "../../lib/auth";
import { getUnreadMessageCount } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import NotificationsBell from "../components/NotificationsBell";
import UserProfileMenu from "../components/UserProfileMenu";
import { VenueOwnerDataProvider } from "../venue-owner/context/VenueOwnerContext";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { profile } = useAuth();
    const [unreadMessages, setUnreadMessages] = useState(0);

    const refreshUnreadMessages = useCallback(async () => {
        try {
            const result = await getUnreadMessageCount();
            setUnreadMessages(result.unread_count);
        } catch (error) {
            console.error("Failed to load unread message count:", error);
        }
    }, []);

    useEffect(() => {
        if (!profile?.id) return;

        void refreshUnreadMessages();
        const channel = supabase
            .channel(`player-unread-messages-${profile.id}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages" },
                () => void refreshUnreadMessages(),
            )
            .subscribe();
        const intervalId = window.setInterval(() => void refreshUnreadMessages(), 15000);
        const refreshOnFocus = () => {
            if (document.visibilityState === "visible") void refreshUnreadMessages();
        };
        const refreshOnChatRead = () => void refreshUnreadMessages();
        window.addEventListener("focus", refreshOnFocus);
        window.addEventListener("sportmate:chat-read", refreshOnChatRead);
        document.addEventListener("visibilitychange", refreshOnFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshOnFocus);
            window.removeEventListener("sportmate:chat-read", refreshOnChatRead);
            document.removeEventListener("visibilitychange", refreshOnFocus);
            void supabase.removeChannel(channel);
        };
    }, [profile?.id, refreshUnreadMessages]);

    const navLinks = [
        { name: "Explore", href: "/player/dashboard" },
        { name: "Host", href: "/player/host" },
        { name: "My Listings", href: "/player/listings" },
        { name: "Venues", href: "/player/venues" },
        { name: "Messages", href: "/player/messages" },
    ];

    return (
        <RouteGuard roles={["PLAYER"]}>
            <VenueOwnerDataProvider>
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
                                aria-label={link.name === "Messages" && unreadMessages > 0
                                    ? `Messages, ${unreadMessages} unread`
                                    : link.name}
                                className={`${pathname === link.href
                                        ? "text-slate-900 font-bold"
                                        : "text-slate-600 hover:text-slate-900"
                                    } transition-colors`}
                            >
                                <span className="relative">
                                    {link.name}
                                    {link.name === "Messages" && unreadMessages > 0 && pathname !== link.href && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"
                                        />
                                    )}
                                </span>
                            </Link>
                        ))}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-6">
                        <NotificationsBell />

                        <UserProfileMenu />
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="w-full">
                    <Suspense fallback={null}>
                        {children}
                    </Suspense>
                </main>
                </div>
            </VenueOwnerDataProvider>
        </RouteGuard>
    );
}
