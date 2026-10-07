"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export type Venue = {
    id: string;
    name: string;
    address: string;
    description: string;
    sports: string[];
    amenities: string[];
    status: "Active" | "Draft";
    coverImage?: string;
};

export type Court = {
    id: string;
    venueId: string;
    name: string;
    sport: string;
    pricePerHour: number;
    openTime: string;
    closeTime: string;
    active: boolean;
};

export type Booking = {
    id: string;
    courtId: string;
    venueId: string;
    playerName: string;
    playerAvatar?: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
    bookingType: "Walking" | "Court Booking";
};

export type HostedGame = {
    id: string;
    sport: string;
    location: string;
    date: string;
    time: string;
    duration: string;
    playersNeeded: number;
    skillLevel: string;
    note: string;
    bookingType: "Walking" | "Court Booking";
    venueName?: string;
    courtName?: string;
};

export type Review = {
    id: string;
    venueId: string;
    playerName: string;
    playerAvatar?: string;
    rating: number;
    comment: string;
    date: string;
};

export type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    isRead: boolean;
};

export type Conversation = {
    id: string;
    playerName: string;
    playerAvatar?: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    messages: Message[];
};

export type OwnerProfile = {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    businessName: string;
};

type VenueOwnerContextType = {
    venues: Venue[];
    courts: Court[];
    bookings: Booking[];
    hostedGames: HostedGame[];
    reviews: Review[];
    conversations: Conversation[];
    profile: OwnerProfile;
    addVenue: (venue: Omit<Venue, "id" | "status">) => void;
    deleteVenue: (id: string) => void;
    addCourt: (court: Omit<Court, "id">) => void;
    updateCourt: (id: string, court: Partial<Court>) => void;
    deleteCourt: (id: string) => void;
    updateBookingStatus: (id: string, status: Booking["status"]) => void;
    addBooking: (booking: Omit<Booking, "id" | "status">) => void;
    addHostedGame: (game: Omit<HostedGame, "id">) => void;
    sendMessage: (conversationId: string, text: string) => void;
    markConversationRead: (conversationId: string) => void;
    updateProfile: (profile: Partial<OwnerProfile>) => void;
};

const VenueOwnerContext = createContext<VenueOwnerContextType | undefined>(undefined);

// Initial Mock Data
const initialVenues: Venue[] = [
    { id: "v1", name: "Downtown Sports Arena", address: "123 Main St, City", description: "Premium indoor sports facility with AC.", sports: ["Basketball", "Volleyball"], amenities: ["Parking", "WiFi", "Locker Room"], status: "Active", coverImage: "https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&q=80&w=800" },
    { id: "v2", name: "Greenfield Tennis Club", address: "45 Park Avenue, City", description: "Outdoor clay and hard courts.", sports: ["Tennis"], amenities: ["Cafe", "Parking"], status: "Active", coverImage: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800" },
    { id: "v3", name: "Future Stadium (Under Construction)", address: "88 Future Blvd, City", description: "State of the art upcoming stadium.", sports: ["Football"], amenities: [], status: "Draft" },
];

const initialCourts: Court[] = [
    { id: "c1", venueId: "v1", name: "Court A", sport: "Basketball", pricePerHour: 50, openTime: "08:00", closeTime: "22:00", active: true },
    { id: "c2", venueId: "v1", name: "Court B", sport: "Volleyball", pricePerHour: 40, openTime: "08:00", closeTime: "22:00", active: true },
    { id: "c3", venueId: "v2", name: "Clay Court 1", sport: "Tennis", pricePerHour: 30, openTime: "06:00", closeTime: "20:00", active: true },
    { id: "c4", venueId: "v2", name: "Hard Court 1", sport: "Tennis", pricePerHour: 25, openTime: "06:00", closeTime: "20:00", active: false },
];

const initialBookings: Booking[] = [
    { id: "b1", courtId: "c1", venueId: "v1", playerName: "John Doe", date: "2026-10-01", startTime: "10:00", endTime: "11:00", price: 50, status: "Confirmed", bookingType: "Court Booking" },
    { id: "b2", courtId: "c3", venueId: "v2", playerName: "Jane Smith", date: "2026-10-02", startTime: "14:00", endTime: "16:00", price: 60, status: "Pending", bookingType: "Walking" },
    { id: "b3", courtId: "c2", venueId: "v1", playerName: "Alice Johnson", date: "2026-10-01", startTime: "18:00", endTime: "19:00", price: 40, status: "Completed", bookingType: "Court Booking" },
    { id: "b4", courtId: "c1", venueId: "v1", playerName: "Bob Williams", date: "2026-10-05", startTime: "09:00", endTime: "11:00", price: 100, status: "Cancelled", bookingType: "Court Booking" },
    { id: "b5", courtId: "c3", venueId: "v2", playerName: "Charlie Brown", date: "2026-10-06", startTime: "07:00", endTime: "09:00", price: 60, status: "Pending", bookingType: "Walking" },
];

const initialReviews: Review[] = [
    { id: "r1", venueId: "v1", playerName: "John Doe", rating: 5, comment: "Amazing courts! Highly recommend.", date: "2026-09-28" },
    { id: "r2", venueId: "v1", playerName: "Alice Johnson", rating: 4, comment: "Good facilities, but parking was full.", date: "2026-09-25" },
    { id: "r3", venueId: "v2", playerName: "Jane Smith", rating: 5, comment: "Loved the clay courts.", date: "2026-09-20" },
    { id: "r4", venueId: "v2", playerName: "Bob Williams", rating: 2, comment: "Court was closed for maintenance unexpectedly.", date: "2026-09-15" },
];

const initialConversations: Conversation[] = [
    {
        id: "conv1", playerName: "John Doe", lastMessage: "See you at 10!", lastMessageTime: "10:30 AM", unreadCount: 1,
        messages: [
            { id: "m1", senderId: "player", text: "Hi, is Court A available earlier?", timestamp: "10:20 AM", isRead: false },
            { id: "m2", senderId: "owner", text: "Sorry, it's booked until 10.", timestamp: "10:25 AM", isRead: true },
            { id: "m3", senderId: "player", text: "See you at 10!", timestamp: "10:30 AM", isRead: false },
        ]
    },
    {
        id: "conv2", playerName: "Jane Smith", lastMessage: "Thanks for confirming.", lastMessageTime: "Yesterday", unreadCount: 0,
        messages: [
            { id: "m4", senderId: "owner", text: "Your booking for the clay court is confirmed.", timestamp: "Yesterday", isRead: true },
            { id: "m5", senderId: "player", text: "Thanks for confirming.", timestamp: "Yesterday", isRead: true }
        ]
    }
];

export const VenueOwnerDataProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const searchParams = useSearchParams();
    const isEmpty = searchParams.get("empty") === "1";

    const [venues, setVenues] = useState<Venue[]>(isEmpty ? [] : initialVenues);
    const [courts, setCourts] = useState<Court[]>(isEmpty ? [] : initialCourts);
    const [bookings, setBookings] = useState<Booking[]>(isEmpty ? [] : initialBookings);
    const [hostedGames, setHostedGames] = useState<HostedGame[]>([]);
    const [reviews, setReviews] = useState<Review[]>(isEmpty ? [] : initialReviews);
    const [conversations, setConversations] = useState<Conversation[]>(isEmpty ? [] : initialConversations);

    const [profile, setProfile] = useState<OwnerProfile>({
        name: "Sokheng",
        email: "sokheng@sportmates.com",
        phone: "+855 12 345 678",
        businessName: "Sokheng Sports Co.",
    });

    const addVenue = (venue: Omit<Venue, "id" | "status">) => {
        const newVenue: Venue = { ...venue, id: `v${Date.now()}`, status: "Active" };
        setVenues((prev) => [...prev, newVenue]);
    };

    const deleteVenue = (id: string) => {
        setVenues((prev) => prev.filter(v => v.id !== id));
        setCourts((prev) => prev.filter(c => c.venueId !== id)); // Cascade mock delete
    };

    const addCourt = (court: Omit<Court, "id">) => {
        setCourts((prev) => [...prev, { ...court, id: `c${Date.now()}` }]);
    };

    const updateCourt = (id: string, courtUpdate: Partial<Court>) => {
        setCourts((prev) => prev.map(c => c.id === id ? { ...c, ...courtUpdate } : c));
    };

    const deleteCourt = (id: string) => {
        setCourts((prev) => prev.filter(c => c.id !== id));
    };

    const updateBookingStatus = (id: string, status: Booking["status"]) => {
        setBookings((prev) => prev.map(b => b.id === id ? { ...b, status } : b));
    };

    const addBooking = (booking: Omit<Booking, "id" | "status">) => {
        const newBooking: Booking = { ...booking, id: `b${Date.now()}`, status: "Pending" };
        setBookings((prev) => [newBooking, ...prev]);
    };

    const addHostedGame = (game: Omit<HostedGame, "id">) => {
        const newGame: HostedGame = { ...game, id: `g${Date.now()}` };
        setHostedGames((prev) => [newGame, ...prev]);
    };

    const sendMessage = (conversationId: string, text: string) => {
        setConversations((prev) => prev.map(c => {
            if (c.id === conversationId) {
                const newMessage: Message = { id: `m${Date.now()}`, senderId: "owner", text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isRead: true };
                return {
                    ...c,
                    lastMessage: text,
                    lastMessageTime: newMessage.timestamp,
                    messages: [...c.messages, newMessage]
                };
            }
            return c;
        }));
    };

    const markConversationRead = (conversationId: string) => {
        setConversations((prev) => prev.map(c => {
            if (c.id === conversationId) {
                return {
                    ...c,
                    unreadCount: 0,
                    messages: c.messages.map(m => ({ ...m, isRead: true }))
                };
            }
            return c;
        }));
    };

    const updateProfile = (newProfile: Partial<OwnerProfile>) => {
        setProfile(prev => ({ ...prev, ...newProfile }));
    };

    return (
        <VenueOwnerContext.Provider value={{
            venues, courts, bookings, hostedGames, reviews, conversations, profile,
            addVenue, deleteVenue, addCourt, updateCourt, deleteCourt, updateBookingStatus, addBooking, addHostedGame, sendMessage, markConversationRead, updateProfile
        }}>
            {children}
        </VenueOwnerContext.Provider>
    );
};

export const useVenueOwnerData = () => {
    const context = useContext(VenueOwnerContext);
    if (!context) throw new Error("useVenueOwnerData must be used within VenueOwnerDataProvider");
    return context;
};
