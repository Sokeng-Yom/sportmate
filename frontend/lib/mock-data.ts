import { User, Match, Venue, Court } from "./types";

export const mockUsers: User[] = [
    { id: "u1", name: "Alice", email: "alice@example.com", role: "PLAYER" },
    { id: "u2", name: "Bob (Venue)", email: "bob@venue.com", role: "VENUE_OWNER" }
];

export const mockMatches: Match[] = [
    {
        id: "m1",
        creator_id: "u1",
        sport: "Badminton",
        location: "Phnom Penh Sports Club",
        date: "2026-10-15",
        time: "18:00",
        players_needed: 2,
        skill_level_required: "INTERMEDIATE",
        status: "OPEN",
        created_at: new Date().toISOString()
    }
];

export const mockVenues: Venue[] = [
    {
        id: "v1",
        owner_id: "u2",
        name: "Phnom Penh Central Arena",
        location: "Phnom Penh",
        description: "Premium badminton and futsal courts.",
        status: "APPROVED"
    }
];

export const mockCourts: Court[] = [
    {
        id: "c1",
        venue_id: "v1",
        name: "Court 1",
        sport: "Badminton",
        price_per_hour: 8
    }
];
