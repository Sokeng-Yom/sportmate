"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CalendarDays, Check, CircleAlert,
  Gamepad2, MoreHorizontal, ShieldAlert, Users,
} from "lucide-react";
import { chartSeries, dashboardApplications, dashboardReports, dashboardStats, recentActivity } from "./mock-data";

const statIcons = { users: Users, venues: Building2, games: Gamepad2, reports: ShieldAlert };
const statColors: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
};

function Status({ value }: { value: string }) {
  const color = value === "Approved" || value === "Resolved" ? "bg-emerald-50 text-emerald-700" : value === "Under review" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}><span className="mr-1.5 mt-[3px] h-1.5 w-1.5 rounded-full bg-current" />{value}</span>;
}

function PlatformChart() {
  const [range, setRange] = useState<keyof typeof chartSeries>("30D");
  const points = chartSeries[range];
  const series = [
    { key: "users", color: "#18a779" },
    { key: "games", color: "#5287ef" },
    { key: "reports", color: "#f3a33b" },
  ] as const;
  const pointString = (key: (typeof series)[number]["key"]) => points.map((point, index) => {
    const x = 36 + (index * 568) / Math.max(points.length - 1, 1);
    const y = 184 - (point[key] / 80) * 154;
    return `${x},${y}`;
  }).join(" ");

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,48,43,.03)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-bold text-slate-900">Platform overview</h2><p className="mt-1 text-[11px] text-slate-500">Growth and activity across the platform</p></div>
        <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Chart date range">
          {(Object.keys(chartSeries) as (keyof typeof chartSeries)[]).map((item) => <button key={item} onClick={() => setRange(item)} aria-pressed={range === item} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${range === item ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item}</button>)}
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        {[["New users", "#18a779"], ["Game listings", "#5287ef"], ["Reports", "#f3a33b"]].map(([label, color]) => <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
      </div>
      <div className="mt-3 w-full">
        <svg viewBox="0 0 640 220" role="img" aria-label={`Platform activity chart for the last ${range}`} className="h-[220px] w-full overflow-visible">
          {[30, 68, 106, 144, 182].map((y) => <line key={y} x1="34" x2="608" y1={y} y2={y} stroke="#edf1f0" strokeDasharray="3 5" />)}
          {[0, 20, 40, 60, 80].map((label, index) => <text key={label} x="0" y={186 - index * 38} fill="#a1ada9" fontSize="9">{label}</text>)}
          {series.map(({ key, color }) => <polyline key={key} points={pointString(key)} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />)}
          {points.map((point, index) => {
            const x = 36 + (index * 568) / Math.max(points.length - 1, 1);
            return <text key={point.label} x={x} y="211" textAnchor="middle" fill="#98a49f" fontSize="9">{point.label}</text>;
          })}
        </svg>
      </div>
    </section>
  );
}

function RolesCard() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,48,43,.03)] sm:p-6">
      <div className="flex items-start justify-between"><div><h2 className="text-sm font-bold text-slate-900">Users by role</h2><p className="mt-1 text-[11px] text-slate-500">Community breakdown</p></div><button aria-label="More role statistics" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><MoreHorizontal size={18} /></button></div>
      <div className="mt-7 flex items-center justify-center gap-7">
        <div className="grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#18a779 0% 77%, #5685e8 77% 96%, #a98be9 96% 100%)" }}>
          <div className="grid h-[94px] w-[94px] place-content-center rounded-full bg-white text-center"><span className="text-2xl font-extrabold tracking-tight text-slate-900">1,248</span><span className="mt-0.5 text-[10px] text-slate-500">Total users</span></div>
        </div>
        <div className="space-y-4">
          {[["Players", "962", "77%", "#18a779"], ["Venue owners", "236", "19%", "#5685e8"], ["Administrators", "50", "4%", "#a98be9"]].map(([label, total, percent, color]) => <div key={label} className="flex items-center gap-2.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><div><p className="text-[11px] font-semibold text-slate-700">{label}</p><p className="mt-0.5 text-[10px] text-slate-400">{total} <span className="ml-1">{percent}</span></p></div></div>)}
        </div>
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const formattedDate = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Admin overview <span className="font-normal text-emerald-700/70">· Preview data</span></p>
          <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900 sm:text-[29px]">Welcome back, Admin <span aria-hidden="true">👋</span></h1>
          <p className="mt-1 text-[13px] text-slate-500">Here&apos;s what&apos;s happening on SportMates today.</p></div>
        <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto"><CalendarDays size={15} className="text-slate-400" />{formattedDate}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => {
          const Icon = statIcons[stat.icon];
          return <section key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,48,43,.03)]">
            <div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${statColors[stat.tone]}`}><Icon size={19} /></div><button aria-label={`More about ${stat.label}`} className="rounded-md p-1 text-slate-400 hover:bg-slate-50"><MoreHorizontal size={18} /></button></div>
            <p className="mt-4 text-xs font-medium text-slate-500">{stat.label}</p><div className="mt-1 flex items-end justify-between gap-2"><span className="text-[27px] font-extrabold tracking-tight text-slate-900">{stat.value}</span><span className={`mb-1 inline-flex items-center gap-1 text-[10px] font-semibold ${stat.tone === "orange" ? "text-amber-700" : "text-emerald-700"}`}>{stat.tone === "orange" ? <CircleAlert size={12} /> : <ArrowUpRight size={13} />}{stat.change}</span></div>
          </section>;
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]"><PlatformChart /><RolesCard /></div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,48,43,.03)] sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Pending venue applications</h2><p className="mt-1 text-[11px] text-slate-500">Applications waiting for your review</p></div><Link href="/admin/venue-applications" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900">View all <ArrowRight size={13} /></Link></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[570px] text-left"><thead><tr className="border-y border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{["Venue", "Owner", "Sports", "Status", ""].map((item, index) => <th key={`${item}-${index}`} className="px-2.5 py-3 first:pl-0">{item}</th>)}</tr></thead><tbody>{dashboardApplications.map((app) => <tr key={app.id} className="border-b border-slate-50 last:border-0"><td className="whitespace-nowrap px-2.5 py-3.5 pl-0 text-xs font-semibold text-slate-800">{app.title}</td><td className="whitespace-nowrap px-2.5 py-3.5 text-xs text-slate-600">{app.owner}</td><td className="px-2.5 py-3.5 text-xs text-slate-500">{app.category}</td><td className="px-2.5 py-3.5"><Status value={app.status ?? "Pending"} /></td><td className="px-2.5 py-3.5 text-right"><Link href="/admin/venue-applications" className="text-[11px] font-semibold text-emerald-700 hover:underline">Review</Link></td></tr>)}</tbody></table></div>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,48,43,.03)] sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Recent reports</h2><p className="mt-1 text-[11px] text-slate-500">Latest community reports</p></div><Link href="/admin/reports" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900">View all <ArrowRight size={13} /></Link></div>
          <div className="space-y-1">{dashboardReports.map((report) => <div key={report.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title}</p><p className="mt-1 truncate text-[10px] text-slate-500">{report.reason} · {report.owner}</p></div><div className="flex shrink-0 items-center gap-2"><Status value={report.status ?? "Pending"} /><Link href="/admin/reports" aria-label={`Review ${report.id}`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ArrowRight size={14} /></Link></div></div>)}</div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,48,43,.03)] sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Recent activity</h2><p className="mt-1 text-[11px] text-slate-500">The latest actions across your platform</p></div><Link href="/admin/activity-logs" className="text-[11px] font-semibold text-emerald-700 hover:underline">Activity log</Link></div>
          <div className="space-y-0">{recentActivity.map((item, index) => <div key={item.title} className="relative flex gap-3 pb-4 last:pb-0"><div className="relative flex flex-col items-center"><span className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${item.color}`}>{item.initials}</span>{index < recentActivity.length - 1 && <span className="absolute top-8 h-full w-px bg-slate-100" />}</div><div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-0.5"><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 truncate text-[10px] text-slate-500">{item.detail}</p></div><time className="shrink-0 text-[10px] text-slate-400">{item.time}</time></div></div>)}</div>
        </section>
        <section className="rounded-2xl bg-[#123739] p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold">Quick actions</p><p className="mt-1 text-[10px] text-teal-100/70">Jump into your daily tasks</p></div><span className="rounded-lg bg-white/10 p-2 text-emerald-300"><Check size={17} /></span></div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {[{ title: "Manage users", note: "Review member accounts", href: "/admin/users", icon: Users }, { title: "Review venues", note: "5 applications waiting", href: "/admin/venue-applications", icon: Building2 }, { title: "Review reports", note: "12 need attention", href: "/admin/reports", icon: ShieldAlert }, { title: "Security logs", note: "Monitor platform activity", href: "/admin/activity-logs", icon: ArrowDownRight }].map(({ title, note, href, icon: Icon }) => <Link key={title} href={href} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 transition hover:border-emerald-300/30 hover:bg-white/10"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-emerald-300"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold">{title}</span><span className="mt-0.5 block truncate text-[9px] text-teal-100/60">{note}</span></span><ArrowRight size={14} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" /></Link>)}
          </div>
          <p className="mt-4 text-[9px] leading-relaxed text-teal-100/50">All statistics and actions on this page use sample data for the frontend preview.</p>
        </section>
      </div>
    </div>
  );
}
