export type AdminRecord = {
  id: string;
  title: string;
  subtitle?: string;
  owner?: string;
  email?: string;
  role?: string;
  location?: string;
  category?: string;
  date?: string;
  status?: string;
  reason?: string;
  target?: string;
  result?: string;
};

export type AdminSection = {
  title: string;
  description: string;
  searchLabel: string;
  columns: { key: keyof AdminRecord; label: string }[];
  records: AdminRecord[];
  filters?: { label: string; values: string[]; key: keyof AdminRecord }[];
};

export const dashboardStats = [
  { label: "Total users", value: "1,248", change: "+12.8%", tone: "green", icon: "users" },
  { label: "Total venues", value: "36", change: "+4 this month", tone: "blue", icon: "venues" },
  { label: "Active game listings", value: "186", change: "+8.2%", tone: "purple", icon: "games" },
  { label: "Pending reports", value: "12", change: "Needs attention", tone: "orange", icon: "reports" },
] as const;

export const chartSeries: Record<string, { label: string; users: number; games: number; reports: number }[]> = {
  "7D": [
    { label: "Mon", users: 22, games: 12, reports: 5 }, { label: "Tue", users: 32, games: 22, reports: 8 },
    { label: "Wed", users: 27, games: 19, reports: 6 }, { label: "Thu", users: 48, games: 30, reports: 12 },
    { label: "Fri", users: 43, games: 26, reports: 9 }, { label: "Sat", users: 63, games: 41, reports: 16 },
    { label: "Sun", users: 56, games: 36, reports: 11 },
  ],
  "30D": [
    { label: "Week 1", users: 24, games: 18, reports: 7 }, { label: "Week 2", users: 40, games: 27, reports: 12 },
    { label: "Week 3", users: 35, games: 22, reports: 9 }, { label: "Week 4", users: 68, games: 43, reports: 16 },
  ],
  "90D": [
    { label: "Aug", users: 30, games: 23, reports: 8 }, { label: "Sep", users: 48, games: 35, reports: 12 },
    { label: "Oct", users: 72, games: 49, reports: 18 },
  ],
};

export const recentActivity = [
  { initials: "SK", color: "bg-emerald-100 text-emerald-700", title: "New player registered", detail: "Sokha K. joined SportMates", time: "4 min ago" },
  { initials: "VP", color: "bg-blue-100 text-blue-700", title: "Venue application submitted", detail: "Phnom Penh Sports Club", time: "28 min ago" },
  { initials: "GM", color: "bg-violet-100 text-violet-700", title: "Game listing created", detail: "Sunday evening basketball", time: "1 hr ago" },
  { initials: "!", color: "bg-orange-100 text-orange-700", title: "Content reported", detail: "A listing needs review", time: "2 hrs ago" },
  { initials: "✓", color: "bg-teal-100 text-teal-700", title: "Venue application approved", detail: "Riverside Tennis Center", time: "Yesterday" },
];

export const dashboardApplications: AdminRecord[] = [
  { id: "APP-1048", title: "Phnom Penh Sports Club", owner: "Dara Sok", category: "Basketball · Football", date: "Oct 22, 2026", status: "Pending" },
  { id: "APP-1047", title: "Riverside Tennis Center", owner: "Maly Chan", category: "Tennis", date: "Oct 21, 2026", status: "Pending" },
  { id: "APP-1046", title: "Olympic Badminton Hall", owner: "Vannak Lim", category: "Badminton", date: "Oct 20, 2026", status: "Under review" },
];

export const dashboardReports: AdminRecord[] = [
  { id: "RPT-2091", title: "Inappropriate listing", reason: "Misleading content", owner: "Sreyneang P.", status: "Pending" },
  { id: "RPT-2090", title: "Player profile", reason: "Harassment", owner: "Bopha S.", status: "Under review" },
  { id: "RPT-2088", title: "Game listing", reason: "Spam", owner: "Dara K.", status: "Pending" },
];

export const adminSections: Record<string, AdminSection> = {
  users: {
    title: "Users", description: "Manage SportMates members and account access.", searchLabel: "Search name or email...",
    columns: [{ key: "title", label: "User" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }, { key: "date", label: "Joined" }],
    filters: [{ label: "All roles", key: "role", values: ["Player", "Venue owner", "Admin"] }, { label: "All statuses", key: "status", values: ["Active", "Restricted"] }],
    records: [
      { id: "USR-1248", title: "Sokha Kim", email: "sokha.kim@email.com", role: "Player", status: "Active", date: "Oct 22, 2026" },
      { id: "USR-1247", title: "Dara Sok", email: "dara.sok@email.com", role: "Venue owner", status: "Active", date: "Oct 21, 2026" },
      { id: "USR-1246", title: "Maly Chan", email: "maly.chan@email.com", role: "Player", status: "Active", date: "Oct 20, 2026" },
      { id: "USR-1245", title: "Vannak Lim", email: "vannak.lim@email.com", role: "Venue owner", status: "Restricted", date: "Oct 19, 2026" },
      { id: "USR-1244", title: "Sreyneang P.", email: "sreyneang.p@email.com", role: "Player", status: "Active", date: "Oct 18, 2026" },
      { id: "USR-1243", title: "Bopha S.", email: "bopha.s@email.com", role: "Admin", status: "Active", date: "Oct 17, 2026" },
      { id: "USR-1242", title: "Rithy N.", email: "rithy.n@email.com", role: "Player", status: "Active", date: "Oct 16, 2026" },
      { id: "USR-1241", title: "Mony T.", email: "mony.t@email.com", role: "Player", status: "Active", date: "Oct 15, 2026" },
    ],
  },
  "venue-applications": {
    title: "Venue applications", description: "Review and approve new venues joining the platform.", searchLabel: "Search venues or owners...",
    columns: [{ key: "title", label: "Venue" }, { key: "owner", label: "Owner" }, { key: "location", label: "Location" }, { key: "category", label: "Sports" }, { key: "date", label: "Submitted" }, { key: "status", label: "Status" }],
    filters: [{ label: "All statuses", key: "status", values: ["Pending", "Under review", "Approved", "Rejected"] }],
    records: [
      { ...dashboardApplications[0], location: "Chamkarmon, Phnom Penh" },
      { ...dashboardApplications[1], location: "Daun Penh, Phnom Penh" },
      { ...dashboardApplications[2], location: "Olympic, Phnom Penh" },
      { id: "APP-1045", title: "Greenfield Football Park", owner: "Rithy N.", location: "Sen Sok, Phnom Penh", category: "Football", date: "Oct 18, 2026", status: "Pending" },
      { id: "APP-1044", title: "Tonle Bassac Fitness", owner: "Mony T.", location: "Tonle Bassac, Phnom Penh", category: "Fitness · Basketball", date: "Oct 16, 2026", status: "Approved" },
    ],
  },
  venues: {
    title: "Venues", description: "Browse registered sports venues across SportMates.", searchLabel: "Search venues, owners, or locations...",
    columns: [{ key: "title", label: "Venue" }, { key: "owner", label: "Owner" }, { key: "location", label: "Location" }, { key: "category", label: "Courts" }, { key: "status", label: "Status" }],
    filters: [{ label: "All statuses", key: "status", values: ["Active", "Pending", "Suspended"] }],
    records: [
      { id: "VEN-0036", title: "Riverside Tennis Center", owner: "Maly Chan", location: "Daun Penh", category: "4 courts", status: "Active" },
      { id: "VEN-0035", title: "Olympic Badminton Hall", owner: "Vannak Lim", location: "Olympic", category: "8 courts", status: "Active" },
      { id: "VEN-0034", title: "Phnom Penh Sports Club", owner: "Dara Sok", location: "Chamkarmon", category: "6 courts", status: "Pending" },
      { id: "VEN-0033", title: "Greenfield Football Park", owner: "Rithy N.", location: "Sen Sok", category: "3 courts", status: "Active" },
      { id: "VEN-0032", title: "Tonle Bassac Fitness", owner: "Mony T.", location: "Tonle Bassac", category: "2 courts", status: "Suspended" },
    ],
  },
  courts: {
    title: "Courts", description: "Review facilities and availability at registered venues.", searchLabel: "Search court, venue, or sport...",
    columns: [{ key: "title", label: "Court" }, { key: "owner", label: "Venue" }, { key: "category", label: "Sport" }, { key: "location", label: "Location" }, { key: "status", label: "Availability" }],
    filters: [{ label: "All sports", key: "category", values: ["Basketball", "Tennis", "Badminton", "Football"] }, { label: "All status", key: "status", values: ["Available", "Maintenance", "Unavailable"] }],
    records: [
      { id: "CRT-081", title: "Court A", owner: "Riverside Tennis Center", category: "Tennis", location: "Daun Penh", status: "Available" },
      { id: "CRT-080", title: "Court 3", owner: "Olympic Badminton Hall", category: "Badminton", location: "Olympic", status: "Available" },
      { id: "CRT-079", title: "Main Court", owner: "Phnom Penh Sports Club", category: "Basketball", location: "Chamkarmon", status: "Maintenance" },
      { id: "CRT-078", title: "Pitch 1", owner: "Greenfield Football Park", category: "Football", location: "Sen Sok", status: "Available" },
    ],
  },
  listings: {
    title: "Game listings", description: "Monitor public games and community activity.", searchLabel: "Search games, creators, or location...",
    columns: [{ key: "title", label: "Game" }, { key: "owner", label: "Creator" }, { key: "location", label: "Location" }, { key: "date", label: "Date & time" }, { key: "category", label: "Players" }, { key: "status", label: "Status" }],
    filters: [{ label: "All sports", key: "category", values: ["Basketball", "Football", "Tennis", "Badminton"] }, { label: "All statuses", key: "status", values: ["Open", "Full", "Completed", "Removed"] }],
    records: [
      { id: "GM-0186", title: "Sunday evening basketball", owner: "Sokha Kim", location: "Chamkarmon", date: "Oct 25 · 5:30 PM", category: "8 / 10 · Basketball", status: "Open" },
      { id: "GM-0185", title: "Friendly 5-a-side", owner: "Dara Sok", location: "Sen Sok", date: "Oct 24 · 7:00 PM", category: "10 / 10 · Football", status: "Full" },
      { id: "GM-0184", title: "Beginner tennis doubles", owner: "Maly Chan", location: "Daun Penh", date: "Oct 24 · 8:00 AM", category: "3 / 4 · Tennis", status: "Open" },
      { id: "GM-0183", title: "Badminton after work", owner: "Vannak Lim", location: "Olympic", date: "Oct 22 · 6:00 PM", category: "4 / 4 · Badminton", status: "Completed" },
    ],
  },
  bookings: {
    title: "Bookings", description: "Review court reservations across the venue network.", searchLabel: "Search booking, player, or venue...",
    columns: [{ key: "id", label: "Booking" }, { key: "title", label: "Court & venue" }, { key: "owner", label: "Player" }, { key: "date", label: "Date & time" }, { key: "category", label: "Amount" }, { key: "status", label: "Status" }],
    filters: [{ label: "All statuses", key: "status", values: ["Confirmed", "Completed", "Cancelled", "Pending"] }],
    records: [
      { id: "BKG-0921", title: "Court A · Riverside Tennis Center", owner: "Sokha Kim", date: "Oct 23 · 6:00 PM", category: "$18.00", status: "Confirmed" },
      { id: "BKG-0920", title: "Court 3 · Olympic Badminton Hall", owner: "Dara Sok", date: "Oct 23 · 5:30 PM", category: "$12.00", status: "Confirmed" },
      { id: "BKG-0919", title: "Main Court · Phnom Penh Sports Club", owner: "Maly Chan", date: "Oct 22 · 7:00 PM", category: "$24.00", status: "Completed" },
      { id: "BKG-0918", title: "Court B · Riverside Tennis Center", owner: "Vannak Lim", date: "Oct 22 · 4:00 PM", category: "$18.00", status: "Cancelled" },
    ],
  },
  reports: {
    title: "Reports & moderation", description: "Review community reports and take appropriate action.", searchLabel: "Search reports or reported content...",
    columns: [{ key: "id", label: "Report" }, { key: "title", label: "Reported content" }, { key: "reason", label: "Reason" }, { key: "owner", label: "Reporter" }, { key: "date", label: "Submitted" }, { key: "status", label: "Status" }],
    filters: [{ label: "All statuses", key: "status", values: ["Pending", "Under review", "Resolved", "Dismissed"] }],
    records: [
      { ...dashboardReports[0], date: "Oct 22, 2026" },
      { ...dashboardReports[1], date: "Oct 21, 2026" },
      { ...dashboardReports[2], date: "Oct 20, 2026" },
      { id: "RPT-2087", title: "Player profile", reason: "Inappropriate photo", owner: "Maly C.", date: "Oct 19, 2026", status: "Resolved" },
      { id: "RPT-2086", title: "Game listing", reason: "Duplicate content", owner: "Rithy N.", date: "Oct 18, 2026", status: "Dismissed" },
    ],
  },
  "activity-logs": {
    title: "Activity & security logs", description: "A transparent record of important platform events.", searchLabel: "Search actor, action, or target...",
    columns: [{ key: "date", label: "Timestamp" }, { key: "owner", label: "Actor" }, { key: "title", label: "Action" }, { key: "target", label: "Target" }, { key: "result", label: "Result" }],
    filters: [{ label: "All results", key: "result", values: ["Success", "Review needed"] }],
    records: [
      { id: "LOG-7741", date: "Oct 22 · 10:42 AM", owner: "Admin · Bopha S.", title: "Approved venue application", target: "Riverside Tennis Center", result: "Success" },
      { id: "LOG-7740", date: "Oct 22 · 10:18 AM", owner: "System", title: "Flagged reported listing", target: "GM-0182", result: "Review needed" },
      { id: "LOG-7739", date: "Oct 22 · 9:55 AM", owner: "Admin · Bopha S.", title: "Reviewed user account", target: "USR-1241", result: "Success" },
      { id: "LOG-7738", date: "Oct 21 · 6:20 PM", owner: "System", title: "New owner registration", target: "USR-1247", result: "Success" },
    ],
  },
};
