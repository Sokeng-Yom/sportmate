"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, BarChart3, Bell, CalendarCheck, ChevronDown, ChevronLeft, CircleHelp,
  ClipboardList, Gamepad2, LayoutDashboard, Menu, Search, Settings, ShieldAlert,
  ShieldCheck, Users, X, MapPin, Building2,
} from "lucide-react";
import UserProfileMenu from "../components/UserProfileMenu";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Venue applications", href: "/admin/venue-applications", icon: ClipboardList, badge: "5" },
  { label: "Venues", href: "/admin/venues", icon: Building2 },
  { label: "Courts", href: "/admin/courts", icon: MapPin },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
  { label: "Game listings", href: "/admin/listings", icon: Gamepad2 },
  { label: "Reports & moderation", href: "/admin/reports", icon: ShieldAlert, badge: "12" },
  { label: "Activity & security logs", href: "/admin/activity-logs", icon: Activity },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const searchItems = [
  ...navigation.map(({ label, href }) => ({ label, href })),
  { label: "Phnom Penh Sports Club", href: "/admin/venue-applications" },
  { label: "Pending content reports", href: "/admin/reports" },
  { label: "Recently registered players", href: "/admin/users" },
];

function AdminSidebar({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className={`${mobile ? "w-[286px]" : "hidden lg:flex w-[256px]"} fixed inset-y-0 left-0 z-50 flex-col bg-[#102f31] px-4 py-5 text-white`}>
      <div className="flex items-center justify-between px-2 pb-7">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onNavigate}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-[#102f31]"><Activity size={20} strokeWidth={2.8} /></span>
          <span className="text-[18px] font-extrabold tracking-tight">Sport<span className="text-emerald-400">Mates</span></span>
        </Link>
        {mobile && <button onClick={onNavigate} aria-label="Close navigation" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={19} /></button>}
      </div>
      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.06] p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300"><ShieldCheck size={18} /></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p><p className="mt-0.5 text-sm font-semibold">Administration</p></div>
          <ChevronDown size={15} className="ml-auto text-slate-400" />
        </div>
      </div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-500">Platform</p>
      <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto">
        {navigation.map(({ label, href, icon: Icon, badge }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition ${active ? "bg-emerald-400 text-[#102f31] shadow-sm" : "text-slate-300 hover:bg-white/[0.07] hover:text-white"}`}>
              <Icon size={17} className={active ? "text-[#102f31]" : "text-slate-400 group-hover:text-white"} />
              <span className="truncate">{label}</span>
              {badge && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-[#102f31]/10 text-[#102f31]" : "bg-rose-400/15 text-rose-300"}`}>{badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-5 border-t border-white/10 pt-4">
        <Link href="/admin/settings" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.07] hover:text-white">
          <CircleHelp size={16} /> Admin help center <ChevronLeft size={14} className="ml-auto rotate-180" />
        </Link>
        <div className="mt-4 rounded-xl bg-[#1b4142] px-3.5 py-3">
          <div className="flex items-center gap-2 text-emerald-300"><ShieldCheck size={14} /><span className="text-[11px] font-semibold">Admin workspace</span></div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">Preview interface. Changes shown here are not saved to a live account.</p>
        </div>
      </div>
    </aside>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const current = navigation.find((item) => item.href === pathname) ?? navigation.find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
  const matches = search.trim()
    ? searchItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : [];
  return (
    <div className="min-h-screen bg-[#f5f7f6] text-slate-800">
      <AdminSidebar />
      {mobileNav && <div className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden" onClick={() => setMobileNav(false)}><div onClick={(event) => event.stopPropagation()}><AdminSidebar mobile onNavigate={() => setMobileNav(false)} /></div></div>}
      <div className="min-h-screen lg:pl-[256px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
            <div className="hidden sm:block"><p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">SportMates / Admin</p><p className="mt-0.5 text-sm font-bold text-slate-800">{current?.label ?? "Administration"}</p></div>
            <div className="relative ml-1 hidden w-[min(32vw,310px)] sm:block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search admin pages" value={search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }}
                placeholder="Search anything..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
              {searchOpen && search && <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {matches.length ? matches.map((item) => <Link key={`${item.href}-${item.label}`} href={item.href} onClick={() => { setSearch(""); setSearchOpen(false); }} className="block rounded-lg px-3 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">{item.label}</Link>) : <p className="px-3 py-3 text-xs text-slate-500">No matching pages or records.</p>}
              </div>}
              {searchOpen && <button aria-label="Close search suggestions" className="fixed inset-0 z-[-1] cursor-default" onClick={() => setSearchOpen(false)} />}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <button aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
              </button>
              {notificationsOpen && <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><div className="flex justify-between"><p className="text-sm font-bold">Notifications</p><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={15} /></button></div><p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">5 venue applications and 12 reports are waiting for review.</p><Link href="/admin/reports" onClick={() => setNotificationsOpen(false)} className="mt-3 block text-xs font-semibold text-emerald-700">Review reports →</Link></div>}
            </div>
            <div className="border-l border-slate-200 pl-3 sm:pl-4">
              <UserProfileMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
