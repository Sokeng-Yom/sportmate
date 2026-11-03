"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CalendarCheck,
  ChevronDown,
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
        // Silently ignore counter failures; page itself will show errors if relevant
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
      label: "Dashboard Overview",
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

  const adminName = profile?.name || "Administrator";
  const adminRole = profile?.role || "ADMIN";
  const initials = adminName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

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
        isMobile ? "w-[286px]" : "hidden lg:flex w-[260px]"
      } fixed inset-y-0 left-0 z-50 flex-col bg-[#0e1e24] px-4 py-5 text-white border-r border-slate-800/60 shadow-xl`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 pb-6 border-b border-white/[0.08]">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 group"
          onClick={() => isMobile && setMobileNav(false)}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            SM
          </span>
          <div>
            <span className="text-[17px] font-black tracking-tight text-white flex items-center gap-1">
              Sport<span className="text-emerald-400">Mate</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
              Admin Console
            </span>
          </div>
        </Link>
        {isMobile && (
          <button
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="mt-5 flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {/* Core Admin Navigation */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Main Management
          </p>
          <nav aria-label="Primary Admin navigation" className="space-y-1">
            {primaryNavigation.map(({ label, href, icon: Icon, badge, badgeTone }) => {
              const active =
                href === "/admin"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/") || (href === "/admin/reported-posts" && pathname === "/admin/reports");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => isMobile && setMobileNav(false)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition ${
                    active
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-slate-950"
                        : "text-slate-400 group-hover:text-emerald-300"
                    }
                  />
                  <span className="truncate flex-1">{label}</span>
                  {badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        active
                          ? "bg-slate-950/20 text-slate-950"
                          : badgeTone === "rose"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
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
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
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
                  className={`group flex min-h-9 items-center gap-3 rounded-lg px-3 text-xs font-medium transition ${
                    active
                      ? "bg-white/10 text-emerald-300"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                >
                  <Icon size={16} className="text-slate-500 group-hover:text-slate-300" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer with Account & Logout */}
      <div className="mt-4 border-t border-white/[0.08] pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/20 text-xs font-bold text-emerald-300 border border-emerald-400/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{adminName}</p>
            <p className="truncate text-[10px] text-emerald-400 font-semibold">{adminRole}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-200 transition"
        >
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-slate-800">
      {/* Desktop Sidebar */}
      {renderSidebar(false)}

      {/* Mobile Drawer */}
      {mobileNav && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>{renderSidebar(true)}</div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="min-h-screen lg:pl-[260px] flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="hidden text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:block">
                SportMate Admin
              </p>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {current?.label ?? "Dashboard Overview"}
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative ml-4 hidden w-[min(30vw,280px)] md:block">
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
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              {searchOpen && search && (
                <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {searchMatches.length ? (
                    searchMatches.map((item) => (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        onClick={() => {
                          setSearch("");
                          setSearchOpen(false);
                        }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                      >
                        <item.icon size={14} className="text-slate-400" />
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

          {/* Right Header: Notifications & Account */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications Button */}
            <div className="relative">
              <button
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                <Bell size={17} />
                {(pendingVenuesCount ?? 0) + (reportedPostsCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {(pendingVenuesCount ?? 0) + (reportedPostsCount ?? 0)}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">
                      Moderation Summary
                    </p>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <Link
                      href="/admin/venue-applications"
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-amber-50/80 p-3 text-amber-900 hover:bg-amber-100/80 transition"
                    >
                      <span className="font-medium">
                        Venue Applications Pending
                      </span>
                      <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {pendingVenuesCount ?? 0}
                      </span>
                    </Link>
                    <Link
                      href="/admin/reported-posts"
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-rose-50/80 p-3 text-rose-900 hover:bg-rose-100/80 transition"
                    >
                      <span className="font-medium">Reported Posts to Review</span>
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {reportedPostsCount ?? 0}
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative border-l border-slate-200 pl-3">
              <button
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-50 transition"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-xs font-extrabold text-emerald-800">
                  {initials}
                </span>
                <div className="hidden sm:block text-left">
                  <p className="max-w-28 truncate text-xs font-bold text-slate-800">
                    {adminName}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase">
                    {adminRole}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {adminName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Role: {adminRole}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard size={14} />
                      <span>Dashboard Overview</span>
                    </Link>
                    <Link
                      href="/admin/venue-applications"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Building2 size={14} />
                      <span>Venue Applications</span>
                    </Link>
                    <Link
                      href="/admin/reported-posts"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ShieldAlert size={14} />
                      <span>Reported Posts</span>
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut size={14} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1500px] mx-auto p-4 sm:p-7 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
