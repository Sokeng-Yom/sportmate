"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { RouteGuard, useAuth } from "../../lib/auth";
import { getUnreadMessageCount, listEligibleVenueReviews } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import NotificationsBell from "../components/NotificationsBell";
import UserProfileMenu from "../components/UserProfileMenu";
import {
    Compass,
    PlusCircle,
    ClipboardList,
    Building2,
    MessageSquare,
    Star,
    Menu,
    X,
    UserRound,
    LogOut,
    User
} from "lucide-react";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [hasNewGameJoin, setHasNewGameJoin] = useState(false);
    const [hasPendingFeedback, setHasPendingFeedback] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleGameJoined = () => setHasNewGameJoin(true);
        window.addEventListener("sportmate:game-joined", handleGameJoined);
        return () => window.removeEventListener("sportmate:game-joined", handleGameJoined);
    }, []);

    useEffect(() => {
        if (pathname.startsWith("/player/messages")) {
            setHasNewGameJoin(false);
        }
    }, [pathname]);

    // Prevent background scrolling when mobile drawer is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    // Close mobile drawer on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileMenuOpen]);

    const refreshUnreadMessages = useCallback(async () => {
        try {
            const result = await getUnreadMessageCount();
            setUnreadMessages(result.unread_count);
        } catch (error) {
            console.error("Failed to load unread message count:", error);
        }
    }, []);

    const refreshPendingFeedback = useCallback(async () => {
        try {
            const eligibleReviews = await listEligibleVenueReviews();
            setHasPendingFeedback(eligibleReviews.length > 0);
        } catch (error) {
            console.error("Failed to load pending feedback:", error);
        }
    }, []);

    useEffect(() => {
        if (!profile?.id) return;

        void refreshPendingFeedback();
        const intervalId = window.setInterval(() => void refreshPendingFeedback(), 60000);
        const refreshOnFocus = () => {
            if (document.visibilityState === "visible") void refreshPendingFeedback();
        };
        const refreshOnFeedbackSubmitted = () => void refreshPendingFeedback();
        window.addEventListener("focus", refreshOnFocus);
        window.addEventListener("sportmate:feedback-submitted", refreshOnFeedbackSubmitted);
        document.addEventListener("visibilitychange", refreshOnFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshOnFocus);
            window.removeEventListener("sportmate:feedback-submitted", refreshOnFeedbackSubmitted);
            document.removeEventListener("visibilitychange", refreshOnFocus);
        };
    }, [profile?.id, refreshPendingFeedback]);

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
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "venue_direct_messages" },
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
        { name: "Explore", href: "/player/dashboard", icon: Compass },
        { name: "Host", href: "/player/host", icon: PlusCircle },
        { name: "My Listings", href: "/player/listings", icon: ClipboardList },
        { name: "Venues", href: "/player/venues", icon: Building2 },
        { name: "Feedback", href: "/player/reviews", icon: Star },
        { name: "Messages", href: "/player/messages", icon: MessageSquare },
    ];

    const handleLogout = async () => {
        try {
            await signOut();
            router.push("/login");
        } catch (err) {
            console.error("Sign out error:", err);
            router.push("/login");
        }
    };

    const isLinkActive = (href: string) => {
        if (href === "/player/dashboard") {
            return pathname === "/player/dashboard";
        }
        return pathname === href || pathname.startsWith(href + "/");
    };

    return (
        <RouteGuard roles={["PLAYER"]}>
            <div className="min-h-screen bg-[#F8F5F0] text-slate-900 font-sans flex flex-col">
                {/* Top Navigation */}
                <header className="h-[72px] bg-white px-4 sm:px-8 flex items-center justify-between border-b border-gray-100 shadow-xs sticky top-0 z-40">
                    {/* Left: Mobile hamburger & Logo */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Open navigation menu"
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                        >
                            <Menu size={22} />
                        </button>

                        <Link href="/player/dashboard" className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-slate-900">
                                Sport<span className="text-emerald-500">Mates</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-medium">
                        {navLinks.map((link) => {
                            const active = isLinkActive(link.href);
                            const hasBadge = link.name === "Messages" && unreadMessages > 0;
                            const hasGameJoinDot = link.name === "Messages" && hasNewGameJoin;
                            const hasFeedbackBadge = link.name === "Feedback" && hasPendingFeedback;

                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    aria-current={active ? "page" : undefined}
                                    aria-label={
                                        hasGameJoinDot && hasBadge
                                            ? `Messages, game joined, ${unreadMessages} unread`
                                            : hasGameJoinDot
                                            ? "Messages, game joined"
                                            : hasBadge
                                            ? `Messages, ${unreadMessages} unread`
                                            : hasFeedbackBadge
                                            ? "Feedback, unfinished reviews"
                                            : link.name
                                    }
                                    className={`relative py-1 text-sm transition-colors ${
                                        active
                                            ? "text-emerald-600 font-bold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <span className="relative flex items-center gap-1.5">
                                        {link.name}
                                        {hasGameJoinDot && (
                                            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
                                        )}
                                        {hasFeedbackBadge && (
                                            <span
                                                aria-hidden="true"
                                                className="h-2 w-2 rounded-full bg-red-500"
                                            />
                                        )}
                                        {hasBadge && (
                                            <span
                                                className={`flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1.5 py-0.2 ${
                                                    active ? "bg-emerald-600" : "bg-red-500"
                                                }`}
                                            >
                                                {unreadMessages}
                                            </span>
                                        )}
                                    </span>
                                    {active && (
                                        <span className="absolute -bottom-2 inset-x-0 h-0.5 bg-emerald-500 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        <NotificationsBell />
                        <UserProfileMenu />
                    </div>
                </header>

                {/* Mobile Slide-Out Navigation Drawer */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                        role="presentation"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Player navigation menu"
                            className="w-[280px] bg-white h-full p-4 flex flex-col shadow-2xl"
                        >
                            {/* Drawer Header */}
                            <div className="px-2 mb-6 mt-2 flex items-center justify-between">
                                <Link
                                    href="/player/dashboard"
                                    className="flex items-center gap-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <div className="flex gap-0.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                    </div>
                                    <span className="font-extrabold text-xl tracking-tight text-slate-900">
                                        Sport<span className="text-emerald-500">Mates</span>
                                    </span>
                                </Link>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    aria-label="Close navigation"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Role Indicator Card */}
                            <div className="mb-6 px-2">
                                <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-xs">
                                    <div className="flex items-center gap-3 text-emerald-600">
                                        <UserRound size={20} />
                                        <span className="font-semibold text-slate-700 text-sm">Player</span>
                                    </div>
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            </div>

                            {/* Nav Links */}
                            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                                {navLinks.map((link) => {
                                    const Icon = link.icon;
                                    const active = isLinkActive(link.href);
                                    const hasBadge = link.name === "Messages" && unreadMessages > 0;
                                    const hasGameJoinDot = link.name === "Messages" && hasNewGameJoin;
                                    const hasFeedbackBadge = link.name === "Feedback" && hasPendingFeedback;

                                    return (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            aria-current={active ? "page" : undefined}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${
                                                active
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon
                                                    size={19}
                                                    className={active ? "text-emerald-600" : "text-slate-400"}
                                                />
                                                <span>{link.name}</span>
                                            </div>
                                            {hasBadge && (
                                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                                    {unreadMessages}
                                                </span>
                                            )}
                                            {hasGameJoinDot && (
                                                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
                                            )}
                                            {hasFeedbackBadge && (
                                                <span
                                                    aria-hidden="true"
                                                    className="h-2 w-2 rounded-full bg-red-500"
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Drawer Footer: Profile & Sign Out */}
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                                <Link
                                    href="/player/profile"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-gray-50 text-sm font-semibold"
                                >
                                    <User size={18} className="text-slate-400" />
                                    <span className="truncate">{profile?.name || "Player Profile"}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-sm font-semibold transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span>Sign out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="w-full flex-1">
                    <Suspense fallback={null}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </RouteGuard>
    );
}
