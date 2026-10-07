"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VenueOwnerDataProvider } from "./context/VenueOwnerContext";
import { Suspense } from "react";
import {
    LayoutDashboard,
    Building2,
    CalendarCheck,
    MessageSquare,
    Star,
    Settings,
    Bell,
    ChevronDown,
    ArrowRight
} from "lucide-react";

export default function VenueOwnerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const sidebarLinks = [
        { name: "Dashboard", href: "/venue-owner", icon: LayoutDashboard },
        { name: "My Venues", href: "/venue-owner/venues", icon: Building2 },
        { name: "Bookings", href: "/venue-owner/bookings", icon: CalendarCheck },
        { name: "Messages", href: "/venue-owner/messages", icon: MessageSquare },
        { name: "Reviews", href: "/venue-owner/reviews", icon: Star },
        { name: "Settings", href: "/venue-owner/settings", icon: Settings },
    ];

    const getPageTitle = () => {
        if (pathname === "/venue-owner") return "Dashboard";
        if (pathname.includes("/add-venue")) return "Add Venue";
        if (pathname.includes("/venues")) return "My Venues";
        if (pathname.includes("/bookings")) return "Bookings";
        if (pathname.includes("/messages")) return "Messages";
        if (pathname.includes("/reviews")) return "Reviews";
        if (pathname.includes("/settings")) return "Settings";
        return "Dashboard";
    };

    return (
        <div className="min-h-screen bg-[#F9FBF9] flex text-slate-900 font-sans">
            {/* Sidebar */}
            <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col fixed h-full z-40 p-4">
                {/* Logo */}
                <div className="px-2 mb-8 mt-2 flex items-center gap-2">
                    <div className="flex gap-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-slate-900">
                        Sport<span className="text-emerald-500">Mates</span>
                    </span>
                </div>

                {/* Role Switcher */}
                <div className="mb-8 px-2">
                    <button className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 text-emerald-600">
                            <Building2 size={20} />
                            <span className="font-semibold text-slate-700 text-sm">Venue Owner</span>
                        </div>
                        <ChevronDown size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 space-y-1">
                    {sidebarLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/venue-owner');

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${isActive
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                                    }`}
                            >
                                <Icon size={20} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Promo Card */}
                <div className="bg-emerald-50 rounded-2xl p-5 mt-8 border border-emerald-100">
                    <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm mb-4">
                        <Building2 size={20} className="text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2 text-sm">Grow your venue with SportMates</h4>
                    <p className="text-xs text-slate-600 mb-4 text-balance">
                        More players. More bookings. More revenue.
                    </p>
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2">
                        View Tips <ArrowRight size={14} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="h-[72px] bg-white border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-8 h-full">
                        <h2 className="text-xl font-bold text-slate-900">{getPageTitle()}</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
                            <Bell size={22} />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        </button>

                        <div className="flex items-center gap-2 cursor-pointer">
                            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-gray-100">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sokheng" alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <ChevronDown size={16} className="text-slate-400" />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-8">
                    <Suspense fallback={null}>
                        <VenueOwnerDataProvider>
                            {children}
                        </VenueOwnerDataProvider>
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
