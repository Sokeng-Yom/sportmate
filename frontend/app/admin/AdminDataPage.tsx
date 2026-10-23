"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Search, Settings2, ShieldAlert,
  SlidersHorizontal, Users,
} from "lucide-react";
import { adminSections, type AdminRecord } from "./mock-data";

type AdminDataPageProps = { section: string };

function StatusBadge({ status }: { status?: string }) {
  const value = status ?? "Unknown";
  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Success: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Open: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    "Under review": "bg-blue-50 text-blue-700 ring-blue-600/10",
    "Review needed": "bg-blue-50 text-blue-700 ring-blue-600/10",
    Full: "bg-blue-50 text-blue-700 ring-blue-600/10",
    Pending: "bg-amber-50 text-amber-700 ring-amber-600/10",
    "Pending review": "bg-amber-50 text-amber-700 ring-amber-600/10",
    Restricted: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Rejected: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Dismissed: "bg-slate-100 text-slate-600 ring-slate-500/10",
    Suspended: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Unavailable: "bg-slate-100 text-slate-600 ring-slate-500/10",
    Maintenance: "bg-amber-50 text-amber-700 ring-amber-600/10",
    Completed: "bg-violet-50 text-violet-700 ring-violet-600/10",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/10",
    Removed: "bg-slate-100 text-slate-600 ring-slate-500/10",
  };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${styles[value] ?? "bg-slate-100 text-slate-600 ring-slate-500/10"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value}</span>;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="admin-dialog-title" className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  </div>;
}

export default function AdminDataPage({ section }: AdminDataPageProps) {
  const config = adminSections[section];
  const [records, setRecords] = useState<AdminRecord[]>(config?.records ?? []);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: keyof AdminRecord; direction: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const [pending, setPending] = useState<{ record: AdminRecord; action: string } | null>(null);
  const [toast, setToast] = useState("");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [preferences, setPreferences] = useState({ email: true, security: true, weekly: false });
  const pageSize = 6;

  useEffect(() => {
    setRecords(config?.records ?? []);
    setSearch("");
    setFilters({});
    setPage(1);
  }, [section, config]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredRecords = useMemo(() => {
    let result = records.filter((record) => {
      const matchesSearch = !search || Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase()));
      const matchesFilters = Object.entries(filters).every(([key, value]) => !value || record[key as keyof AdminRecord] === value);
      return matchesSearch && matchesFilters;
    });
    if (sort) {
      result = [...result].sort((a, b) => {
        const compared = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), undefined, { numeric: true });
        return sort.direction === "asc" ? compared : -compared;
      });
    }
    return result;
  }, [records, search, filters, sort]);
  const pages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const visibleRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  if (section === "settings") {
    return <div className="space-y-6">
      <PageHeading title="Settings" description="Manage your admin profile and display preferences." />
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold text-slate-900">Administrator profile</p><p className="mt-1 text-xs text-slate-500">Your profile is shown to other administrators.</p>
          <div className="mt-6 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">AD</div><div><p className="text-sm font-semibold text-slate-800">SportMates Admin</p><p className="mt-1 text-xs text-slate-500">admin@sportmates.app</p></div></div>
          <div className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">This profile is sample content. Profile updates are not connected to an account.</div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold text-slate-900">Display preferences</p><p className="mt-1 text-xs text-slate-500">Customize what you see in the admin workspace.</p>
          <label className="mt-5 flex max-w-sm flex-col gap-2 text-xs font-semibold text-slate-700">Default analytics period<select value={dateRange} onChange={(event) => { setDateRange(event.target.value); setToast("Display preference updated for this preview."); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select></label>
          <div className="mt-7 border-t border-slate-100 pt-5"><p className="text-xs font-semibold text-slate-800">Notifications</p>{([["email", "Important admin updates"], ["security", "Security alerts"], ["weekly", "Weekly platform summary"]] as const).map(([key, label]) => <label key={key} className="mt-4 flex cursor-pointer items-center justify-between gap-4 text-xs text-slate-600"><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={() => { setPreferences((old) => ({ ...old, [key]: !old[key] })); setToast("Notification preference updated for this preview."); }} className="h-4 w-4 accent-emerald-600" /></label>)}</div>
          <p className="mt-5 text-[10px] text-slate-400">Preferences are held in temporary page state and reset when you leave.</p>
        </section>
      </div>
    </div>;
  }

  if (section === "analytics") {
    const values = dateRange === "Last 7 days" ? [32, 46, 40, 58, 53, 71, 62] : dateRange === "Last 90 days" ? [37, 46, 42, 68, 61, 75, 82] : [28, 39, 36, 55, 49, 66, 74];
    return <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeading title="Analytics" description="Explore user growth and platform engagement." /><label className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 sm:self-auto"><span className="text-slate-400">Period</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="h-9 bg-transparent font-semibold outline-none"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select></label></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Users", "1,248", "+12.8%"], ["New users", "142", "+9.4%"], ["Game listings", "186", "+8.2%"], ["Active venues", "36", "+4"]].map(([label, value, trend]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-2 text-[10px] font-semibold text-emerald-700">{trend} <span className="font-normal text-slate-400">vs. previous period</span></p></div>)}</div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-sm font-bold text-slate-900">User growth</h2><p className="mt-1 text-xs text-slate-500">New users registered during {dateRange.toLowerCase()} · preview data</p><div className="mt-7 flex h-64 items-end gap-3 border-b border-slate-100 px-1 sm:gap-6">{values.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[9px] text-slate-400">{value}</span><div className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-300 transition-all" style={{ height: `${value}%` }} /><span className="pb-2 text-[9px] text-slate-400">{dateRange === "Last 7 days" ? `D${index + 1}` : `W${index + 1}`}</span></div>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-3">{[["Role distribution", "77% players · 19% venue owners · 4% admins"], ["Game activity", "186 active listings across 4 sports"], ["Venue network", "36 active venues with 81 courts"]].map(([title, text]) => <div key={title} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{text}</p></div>)}</div></section>
    </div>;
  }

  if (!config) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><p className="text-sm font-bold text-slate-800">Admin page not found</p><p className="mt-2 text-xs text-slate-500">Choose a page from the admin navigation.</p></div>;

  const updateSort = (key: keyof AdminRecord) => {
    setSort((current) => current?.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  };
  const performAction = () => {
    if (!pending) return;
    const nextStatus = pending.action === "Restrict" ? "Restricted" : pending.action === "Reactivate" ? "Active"
      : pending.action === "Approve" ? "Approved" : pending.action === "Reject" ? "Rejected"
        : pending.action === "Resolve" ? "Resolved" : pending.action === "Dismiss" ? "Dismissed" : "Removed";
    setRecords((current) => current.map((record) => record.id === pending.record.id ? { ...record, status: nextStatus } : record));
    setToast(`${pending.record.title}: ${pending.action.toLowerCase()} completed in this preview.`);
    setPending(null);
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <PageHeading title={config.title} description={config.description} />
      <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Sample data · changes are temporary</span>
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(20,48,43,.03)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <label className="relative block w-full sm:max-w-[330px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={config.searchLabel} aria-label={config.searchLabel} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label>
        <div className="flex flex-wrap items-center gap-2">
          {config.filters?.map((filter) => <label key={filter.key} className="relative"><SlidersHorizontal size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><select value={filters[filter.key] ?? ""} onChange={(event) => { setFilters((current) => ({ ...current, [filter.key]: event.target.value })); setPage(1); }} aria-label={filter.label} className="h-9 min-w-32 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[11px] font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-emerald-400">{[filter.label, ...filter.values].map((value, index) => <option key={value} value={index === 0 ? "" : value}>{value}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>)}
          <span className="ml-1 text-[11px] text-slate-400"><strong className="font-semibold text-slate-600">{filteredRecords.length}</strong> records</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-left">
          <thead className="bg-slate-50/70"><tr>{config.columns.map((column) => <th key={column.key} className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-5"><button className="inline-flex items-center gap-1.5 hover:text-slate-700" onClick={() => updateSort(column.key)}>{column.label}{sort?.key === column.key ? sort.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <Settings2 size={11} className="opacity-30" />}</button></th>)}<th className="px-4 py-3 pr-5 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRecords.map((record) => <tr key={record.id} className="transition hover:bg-slate-50/70">
              {config.columns.map((column, index) => {
                const value = record[column.key];
                return <td key={column.key} className={`px-4 py-3.5 text-xs ${index === 0 ? "pl-5 font-semibold text-slate-800" : "text-slate-600"}`}>{column.key === "status" || column.key === "result" ? <StatusBadge status={value} /> : column.key === "title" && section === "users" ? <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800">{record.title.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span>{value}</span></div> : <span className={column.key === "id" ? "font-mono text-[10px] text-slate-400" : ""}>{value || "—"}</span>}</td>;
              })}
              <td className="px-4 py-3.5 pr-5 text-right"><div className="flex justify-end gap-1">
                <button onClick={() => setSelected(record)} aria-label={`View details for ${record.title}`} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800"><Eye size={14} /></button>
                {section === "users" && <button onClick={() => setPending({ record, action: record.status === "Active" ? "Restrict" : "Reactivate" })} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold ${record.status === "Active" ? "text-rose-700 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`}>{record.status === "Active" ? "Restrict" : "Reactivate"}</button>}
                {section === "venue-applications" && record.status !== "Approved" && record.status !== "Rejected" && <><button onClick={() => setPending({ record, action: "Approve" })} className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50">Approve</button><button onClick={() => setPending({ record, action: "Reject" })} className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50">Reject</button></>}
                {section === "reports" && record.status !== "Resolved" && record.status !== "Dismissed" && <><button onClick={() => setPending({ record, action: "Resolve" })} className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50">Resolve</button><button onClick={() => setPending({ record, action: "Dismiss" })} className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100">Dismiss</button></>}
                {section === "listings" && record.status !== "Removed" && <button onClick={() => setPending({ record, action: "Remove listing" })} className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50">Remove</button>}
              </div></td>
            </tr>)}
            {!visibleRecords.length && <tr><td colSpan={config.columns.length + 1} className="px-6 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400"><Search size={18} /></div><p className="mt-3 text-sm font-semibold text-slate-700">No matching records</p><p className="mt-1 text-xs text-slate-500">Try changing your search or filters.</p><button onClick={() => { setSearch(""); setFilters({}); setPage(1); }} className="mt-3 text-xs font-semibold text-emerald-700 hover:underline">Clear filters</button></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-slate-500">Showing <span className="font-semibold text-slate-700">{filteredRecords.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredRecords.length)}</span> of {filteredRecords.length} records</p><div className="flex items-center gap-1"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={15} /></button>{Array.from({ length: pages }, (_, index) => index + 1).map((number) => <button key={number} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)} className={`h-8 min-w-8 rounded-md px-2 text-[10px] font-semibold ${page === number ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{number}</button>)}<button aria-label="Next page" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
    </section>
    <p className="text-[10px] text-slate-400">Actions on these sample records only update the current page state. No live data is changed.</p>
    {selected && <Dialog title={selected.title} onClose={() => setSelected(null)}><div className="flex items-center justify-between"><span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700"><Users size={18} /></span><button aria-label="Close details" onClick={() => setSelected(null)} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Close</button></div><p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">{selected.id}</p><div className="mt-4 space-y-3">{Object.entries(selected).filter(([key, value]) => key !== "id" && value).map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-xs"><span className="capitalize text-slate-400">{key.replace(/([A-Z])/g, " $1")}</span><span className="text-right font-medium text-slate-700">{value}</span></div>)}</div></Dialog>}
    {pending && <Dialog title={`${pending.action}?`} onClose={() => setPending(null)}><div className={`grid h-10 w-10 place-items-center rounded-xl ${pending.action === "Approve" || pending.action === "Resolve" || pending.action === "Reactivate" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><ShieldAlert size={19} /></div><p className="mt-2 text-sm text-slate-600">Confirm you want to {pending.action.toLowerCase()} <strong className="text-slate-800">{pending.record.title}</strong>. This only changes the preview state.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setPending(null)} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button onClick={performAction} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"><Check size={14} />Confirm</button></div></Dialog>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl"><Check size={15} className="text-emerald-400" />{toast}</div>}
  </div>;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1><p className="mt-1.5 text-xs text-slate-500">{description}</p></div>;
}
