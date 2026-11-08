"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarCheck,
  ClipboardList,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { listAdminVenues, listReportedPosts } from "../../lib/api";
import NotificationsBell from "../components/NotificationsBell";
import UserProfileMenu from "../components/UserProfileMenu";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string | number | null;
  badgeTone?: "rose" | "amber" | "emerald";
  section?: "primary" | "secondary";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [pendingVenuesCount, setPendingVenuesCount] = useState<number | null>(null);
  const [reportedPostsCount, setReportedPostsCount] = useState<number | null>(null);

  // Fetch live counts for sidebar badges
  useEffect(() => {
    let isMounted = true;

    async function fetchCounts() {
      try {
        const [venuesRes, postsRes] = await Promise.allSettled([
          listAdminVenues({ status: "PENDING_REVIEW", page_size: 1 }),
          listReportedPosts({ page_size: 1 }),
        ]);

        if (!isMounted) return;

        if (venuesRes.status === "fulfilled") {
          setPendingVenuesCount(venuesRes.value.total);
        }
        if (postsRes.status === "fulfilled") {
          setReportedPostsCount(postsRes.value.total);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar counts:", err);
      }
    }

    void fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const primaryNavigation: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      section: "primary",
    },
    {
      label: "Venue Applications",
      href: "/admin/venue-applications",
      icon: Building2,
      badge: pendingVenuesCount !== null && pendingVenuesCount > 0 ? pendingVenuesCount : null,
      badgeTone: "amber",
      section: "primary",
    },
    {
      label: "Reported Posts",
      href: "/admin/reported-posts",
      icon: ShieldAlert,
      badge: reportedPostsCount !== null && reportedPostsCount > 0 ? reportedPostsCount : null,
      badgeTone: "rose",
      section: "primary",
    },
  ];

  const secondaryNavigation: NavItem[] = [
    { label: "Users", href: "/admin/users", icon: Users, section: "secondary" },
    { label: "Venues", href: "/admin/venues", icon: ClipboardList, section: "secondary" },
    { label: "Courts", href: "/admin/courts", icon: MapPin, section: "secondary" },
    { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck, section: "secondary" },
    { label: "Game listings", href: "/admin/listings", icon: Gamepad2, section: "secondary" },
    { label: "Activity logs", href: "/admin/activity-logs", icon: Activity, section: "secondary" },
    { label: "Settings", href: "/admin/settings", icon: Settings, section: "secondary" },
  ];

  const allNavItems = [...primaryNavigation, ...secondaryNavigation];

  const current =
    allNavItems.find((item) => item.href === pathname) ??
    allNavItems.find(
      (item) => item.href !== "/admin" && pathname.startsWith(item.href)
    );

  const searchMatches = search.trim()
    ? allNavItems
      .filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 5)
    : [];

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/login");
    }
  };

  const totalModerationCount = (pendingVenuesCount ?? 0) + (reportedPostsCount ?? 0);

  const renderSidebar = (isMobile = false) => (
    <aside
      className={`${isMobile ? "w-[280px]" : "hidden lg:flex w-[260px]"
        } fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-100 p-4 h-full`}
    >
      {/* Brand Header with SportMates Logo */}
      <div className="px-2 mb-6 mt-2 flex items-center justify-between">
        <Link
          href="/admin"
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

      {/* Role Switcher / Indicator Pill (matching Venue Owner) */}
      <div className="mb-6 px-2">
        <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-3 text-emerald-600">
            <ShieldCheck size={20} />
            <span className="font-semibold text-slate-700 text-sm">Administrator</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Core Admin Navigation */}
        <div>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Main Management
          </p>
          <nav aria-label="Primary Admin navigation" className="space-y-1">
            {primaryNavigation.map(({ label, href, icon: Icon, badge, badgeTone }) => {
              const active =
                href === "/admin"
                  ? pathname === href
                  : pathname === href ||
                  pathname.startsWith(href + "/") ||
                  (href === "/admin/reported-posts" && pathname === "/admin/reports");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => isMobile && setMobileNav(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors font-semibold text-sm ${active
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                    }`}
                >
                  <Icon
                    size={19}
                    className={active ? "text-emerald-600" : "text-slate-400"}
                  />
                  <span className="truncate flex-1">{label}</span>
                  {badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeTone === "rose"
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Secondary Navigation */}
        <div>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Platform Records
          </p>
          <nav aria-label="Secondary navigation" className="space-y-1">
            {secondaryNavigation.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => isMobile && setMobileNav(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors font-semibold text-sm ${active
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                    }`}
                >
                  <Icon
                    size={18}
                    className={active ? "text-emerald-600" : "text-slate-400"}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Promo / Info Card (matching Venue Owner) */}
      <div className="bg-emerald-50 rounded-2xl p-4 mt-4 border border-emerald-100">
        <div className="bg-white w-9 h-9 rounded-xl flex items-center justify-center shadow-xs mb-3 text-emerald-600">
          <ShieldCheck size={18} />
        </div>
        <h4 className="font-bold text-slate-900 mb-1 text-xs">Platform Governance</h4>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Oversee venue applications, court bookings, user roles, and platform integrity.
        </p>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F9FBF9] flex text-slate-900 font-sans">
      {/* Desktop Sidebar */}
      {renderSidebar(false)}

      {/* Mobile Drawer */}
      {mobileNav && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileNav(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>{renderSidebar(true)}</div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-[72px] bg-white border-b border-gray-100 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-900 truncate">
              {current?.label ?? "Dashboard Overview"}
            </h2>

            {/* Quick Search */}
            <div className="relative ml-4 hidden md:block w-64 lg:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label="Search admin navigation"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Search admin pages..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              {searchOpen && search && (
                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {searchMatches.length ? (
                    searchMatches.map((item) => (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        onClick={() => {
                          setSearch("");
                          setSearchOpen(false);
                        }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <item.icon size={15} className="text-slate-400" />
                        <span>{item.label}</span>
                      </Link>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-slate-400">
                      No matching pages.
                    </p>
                  )}
                </div>
              )}
              {searchOpen && (
                <button
                  aria-label="Close search"
                  className="fixed inset-0 z-[-1] cursor-default"
                  onClick={() => setSearchOpen(false)}
                />
              )}
            </div>
          </div>

          {/* Right Header: Moderation Quick-Action, Notifications & User Menu */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Moderation Alert Popover (if pending items exist) */}
            {totalModerationCount > 0 && (
              <div className="relative">
                <button
                  aria-label="Moderation queue alerts"
                  aria-expanded={moderationOpen}
                  onClick={() => setModerationOpen(!moderationOpen)}
                  className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                >
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="hidden sm:inline">Review Queue</span>
                  <span className="rounded-full bg-amber-600 px-1.5 py-0.2 text-[10px] text-white font-extrabold">
                    {totalModerationCount}
                  </span>
                </button>

                {moderationOpen && (
                  <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">
                        Pending Moderation
                      </p>
                      <button
                        onClick={() => setModerationOpen(false)}
                        className="rounded p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="mt-2.5 space-y-2 text-xs">
                      <Link
                        href="/admin/venue-applications"
                        onClick={() => setModerationOpen(false)}
                        className="flex items-center justify-between rounded-xl bg-amber-50 p-2.5 text-amber-900 hover:bg-amber-100 transition-colors"
                      >
                        <span className="font-semibold">Venue Applications</span>
                        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {pendingVenuesCount ?? 0}
                        </span>
                      </Link>
                      <Link
                        href="/admin/reported-posts"
                        onClick={() => setModerationOpen(false)}
                        className="flex items-center justify-between rounded-xl bg-rose-50 p-2.5 text-rose-900 hover:bg-rose-100 transition-colors"
                      >
                        <span className="font-semibold">Reported Posts</span>
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {reportedPostsCount ?? 0}
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shared Realtime Notifications Bell */}
            <NotificationsBell />

            {/* Shared User Profile Menu */}
            <UserProfileMenu />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-7 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
