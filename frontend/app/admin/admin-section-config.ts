export type AdminRecord = {
  id: string;
  title: string;
  subtitle?: string;
  owner?: string;
  email?: string;
  role?: string;
  location?: string;
  category?: string;
  paymentProofPath?: string;
  date?: string;
  status?: string;
  reason?: string;
  target?: string;
  result?: string;
  [key: string]: unknown;
};

export type AdminSection = {
  title: string;
  description: string;
  searchLabel: string;
  columns: { key: keyof AdminRecord; label: string }[];
  filters?: { label: string; values: string[]; key: keyof AdminRecord }[];
};

export const adminSections: Record<string, AdminSection> = {
  users: {
    title: "Users",
    description: "Manage SportMates members and account access.",
    searchLabel: "Search name or email...",
    columns: [
      { key: "title", label: "User" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      { key: "date", label: "Joined" },
    ],
    filters: [
      { label: "All roles", key: "role", values: ["Player", "Venue owner", "Admin"] },
      { label: "All statuses", key: "status", values: ["Active", "Restricted"] },
    ],
  },
  venues: {
    title: "Venues",
    description: "Browse registered sports venues across SportMates.",
    searchLabel: "Search venues, owners, or locations...",
    columns: [
      { key: "title", label: "Venue" },
      { key: "owner", label: "Owner" },
      { key: "location", label: "Location" },
      { key: "category", label: "Description" },
      { key: "status", label: "Status" },
    ],
    filters: [
      { label: "All statuses", key: "status", values: ["Active", "Pending", "Suspended"] },
    ],
  },
  courts: {
    title: "Courts",
    description: "Review facilities and availability at registered venues.",
    searchLabel: "Search court, venue, or sport...",
    columns: [
      { key: "title", label: "Court" },
      { key: "owner", label: "Venue" },
      { key: "category", label: "Sport" },
      { key: "location", label: "Location" },
      { key: "status", label: "Availability" },
    ],
    filters: [
      {
        label: "All sports",
        key: "category",
        values: ["Football", "Basketball", "Tennis", "Badminton", "Volleyball"],
      },
      { label: "All availability", key: "status", values: ["Available", "Unavailable"] },
    ],
  },
  listings: {
    title: "Game listings",
    description: "Monitor public games and community activity.",
    searchLabel: "Search games, creators, or location...",
    columns: [
      { key: "title", label: "Game" },
      { key: "owner", label: "Creator" },
      { key: "location", label: "Location" },
      { key: "date", label: "Date & time" },
      { key: "category", label: "Players" },
      { key: "status", label: "Status" },
    ],
    filters: [
      {
        label: "All sports",
        key: "category",
        values: ["Basketball", "Football", "Tennis", "Badminton"],
      },
      { label: "All statuses", key: "status", values: ["Open", "Full", "Completed", "Removed"] },
    ],
  },
  bookings: {
    title: "Bookings",
    description: "Review court reservations across the venue network.",
    searchLabel: "Search booking, player, or venue...",
    columns: [
      { key: "id", label: "Booking" },
      { key: "title", label: "Court & venue" },
      { key: "owner", label: "Player" },
      { key: "date", label: "Date & time" },
      { key: "category", label: "Duration" },
      { key: "status", label: "Status" },
    ],
    filters: [
      {
        label: "All statuses",
        key: "status",
        values: ["Pending", "Confirmed", "Cancelled", "Rejected"],
      },
    ],
  },
  "activity-logs": {
    title: "Activity & security logs",
    description: "A transparent record of important platform events.",
    searchLabel: "Search actor, action, or target...",
    columns: [
      { key: "date", label: "Timestamp" },
      { key: "owner", label: "Actor" },
      { key: "title", label: "Action" },
      { key: "target", label: "Target" },
      { key: "result", label: "Result" },
    ],
    filters: [{ label: "All results", key: "result", values: ["Success", "Review needed"] }],
  },
};
