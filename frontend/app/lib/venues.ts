// ─── Types ──────────────────────────────────────────────────────────────────

export type Discount = {
    id: string;
    title: string;
    description: string;
    percentOff?: number;
    code?: string;
    validUntil: string; // YYYY-MM-DD
};

export type VenueEvent = {
    id: string;
    title: string;
    description: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    sport: string;
    priceLabel: string; // e.g. "Free", "$5 / person"
};

export type PublicVenue = {
    id: string;
    name: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    sports: string[];
    amenities: string[];
    pricePerHour: number;
    openHours: string;
    phone?: string;
    discounts: Discount[];
    events: VenueEvent[];
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const venues: PublicVenue[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getVenue(id: string): PublicVenue | undefined {
    return venues.find((v) => v.id === id);
}
