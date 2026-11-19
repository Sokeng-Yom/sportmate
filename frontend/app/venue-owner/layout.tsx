"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { VenueOwnerDataProvider } from "./context/VenueOwnerContext";
import { RouteGuard, useAuth } from "../../lib/auth";
import NotificationsBell from "../components/NotificationsBell";
import UserProfileMenu from "../components/UserProfileMenu";
import { Suspense, useCallback, useEffect, useState } from "react";
import { listVenueOwnerConversations } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import {
    LayoutDashboard,
    Building2,
    CalendarCheck,
    MessageSquare,
    Star,
    Settings,
    Tag,
    Menu,
    X,
    LogOut,
    User,
    ArrowRight
} from "lucide-react";

export default function VenueOwnerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const [mobileNav, setMobileNav] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);

    const refreshUnreadMessages = useCallback(async () => {
        try {
            const page = await listVenueOwnerConversations();
            setUnreadMessages(
                page.items.reduce((total, conversation) => total + conversation.unread_count, 0),
            );
        } catch (error) {
            console.error("Failed to load venue-owner unread message count:", error);
        }
    }, []);

    useEffect(() => {
        if (!profile?.id) return;

        void refreshUnreadMessages();
        const channel = supabase
            .channel(`venue-owner-unread-messages-${profile.id}`)
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
        window.addEventListener("sportmate:venue-owner-chat-read", refreshOnChatRead);
        document.addEventListener("visibilitychange", refreshOnFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshOnFocus);
            window.removeEventListener("sportmate:venue-owner-chat-read", refreshOnChatRead);
            document.removeEventListener("visibilitychange", refreshOnFocus);
            void supabase.removeChannel(channel);
        };
    }, [profile?.id, refreshUnreadMessages]);

    // Prevent body scrolling when mobile drawer is open
    useEffect(() => {
        if (mobileNav) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileNav]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && mobileNav) {
                setMobileNav(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileNav]);

    const sidebarLinks = [
        { name: "Dashboard", href: "/venue-owner", icon: LayoutDashboard },
        { name: "My Venues", href: "/venue-owner/venues", icon: Building2 },
        { name: "Bookings", href: "/venue-owner/bookings", icon: CalendarCheck },
        { name: "Offers & Events", href: "/venue-owner/offers", icon: Tag },
        { name: "Messages", href: "/venue-owner/messages", icon: MessageSquare },
        { name: "Reviews", href: "/venue-owner/reviews", icon: Star },
        { name: "Settings", href: "/venue-owner/settings", icon: Settings },
    ];

    const getPageTitle = () => {
        if (pathname === "/venue-owner") return "Dashboard";
        if (pathname.includes("/add-venue")) return "Add Venue";
        if (pathname.includes("/venues")) return "My Venues";
        if (pathname.includes("/bookings")) return "Bookings";
        if (pathname.includes("/offers")) return "Offers & Events";
        if (pathname.includes("/messages")) return "Messages";
        if (pathname.includes("/reviews")) return "Reviews";
        if (pathname.includes("/settings")) return "Settings";
        return "Dashboard";
    };

    const handleLogout = async () => {
        try {
            await signOut();
            router.push("/login");
        } catch (err) {
            console.error("Sign out error:", err);
            router.push("/login");
        }
    };

    const renderSidebar = (isMobile = false) => (
        <aside
            className={`${
                isMobile ? "w-[280px]" : "hidden lg:flex w-[260px]"
            } fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-100 p-4 h-full`}
        >
            {/* Logo */}
            <div className="px-2 mb-6 mt-2 flex items-center justify-between">
                <Link
                    href="/venue-owner"
                    className="flex items-center gap-2"
                    onClick={() => isMobile && setMobileNav(false)}
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
                {isMobile && (
                    <button
                        onClick={() => setMobileNav(false)}
                        aria-label="Close navigation"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Role Switcher / Indicator Pill */}
            <div className="mb-6 px-2">
                <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-xs">
                    <div className="flex items-center gap-3 text-emerald-600">
                        <Building2 size={20} />
                        <span className="font-semibold text-slate-700 text-sm">Venue Owner</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                {sidebarLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                        pathname === link.href ||
                        (pathname.startsWith(link.href) && link.href !== "/venue-owner");

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => isMobile && setMobileNav(false)}
                            aria-current={isActive ? "page" : undefined}
                            aria-label={
                                link.name === "Messages" && unreadMessages > 0
                                    ? `Messages, ${unreadMessages} unread`
                                    : link.name
                            }
                            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${
                                isActive
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                            }`}
                        >
                            <span className="flex min-w-0 items-center gap-3">
                                <Icon
                                    size={19}
                                    className={isActive ? "text-emerald-600" : "text-slate-400"}
                                />
                                <span className="truncate">{link.name}</span>
                            </span>
                            {link.name === "Messages" && unreadMessages > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                    {unreadMessages > 99 ? "99+" : unreadMessages}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Mobile Drawer Quick Account Links */}
            {isMobile && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                    <Link
                        href="/venue-owner/settings"
                        onClick={() => setMobileNav(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-gray-50 text-sm font-semibold"
                    >
                        <User size={18} className="text-slate-400" />
                        <span className="truncate">{profile?.name || "Settings"}</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-sm font-semibold transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Sign out</span>
                    </button>
                </div>
            )}

            {/* Bottom Promo Card */}
            {!isMobile && (
                <div className="bg-emerald-50 rounded-2xl p-4 mt-4 border border-emerald-100">
                    <div className="bg-white w-9 h-9 rounded-xl flex items-center justify-center shadow-xs mb-3 text-emerald-600">
                        <Building2 size={18} />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1 text-xs">Grow your venue</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                        More players, seamless court bookings, and higher revenue.
                    </p>
                    <Link
                        href="/venue-owner/venues"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                        Manage venues <ArrowRight size={13} />
                    </Link>
                </div>
            )}
        </aside>
    );

    return (
        <RouteGuard roles={["VENUE_OWNER", "ADMIN"]}>
            <div className="min-h-screen bg-[#F9FBF9] flex text-slate-900 font-sans">
                {/* Desktop Sidebar */}
                {renderSidebar(false)}

                {/* Mobile Drawer Backdrop & Drawer */}
                {mobileNav && (
                    <div
                        className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs lg:hidden"
                        onClick={() => setMobileNav(false)}
                        role="presentation"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                            className="h-full"
                        >
                            {renderSidebar(true)}
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
                    {/* Top Header */}
                    <header className="h-[72px] bg-white border-b border-gray-100 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
                        <div className="flex items-center gap-3 sm:gap-4 h-full">
                            <button
                                onClick={() => setMobileNav(true)}
                                aria-label="Open navigation menu"
                                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                            >
                                <Menu size={20} />
                            </button>
                            <h2 className="text-xl font-bold text-slate-900 truncate">
                                {getPageTitle()}
                            </h2>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6">
                            <NotificationsBell />
                            <UserProfileMenu />
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 p-4 sm:p-6 md:p-8">
                        <Suspense fallback={null}>
                            <VenueOwnerDataProvider>
                                {children}
                            </VenueOwnerDataProvider>
                        </Suspense>
                    </main>
                </div>
            </div>
        </RouteGuard>
    );
}
