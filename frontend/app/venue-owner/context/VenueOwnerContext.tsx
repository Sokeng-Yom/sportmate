"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../../../lib/supabaseClient";

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

export const VenueOwnerDataProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [hostedGames, setHostedGames] = useState<HostedGame[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);

    const [profile, setProfile] = useState<OwnerProfile>({
        name: "",
        email: "",
        phone: "",
        businessName: "",
    });

    useEffect(() => {
        const syncUserProfile = (user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]) => {
            const metadataName = user?.user_metadata?.name ?? user?.user_metadata?.full_name;
            const name = typeof metadataName === "string" ? metadataName.trim() : "";
            const email = user?.email ?? "";
            const displayName = name || email.split("@")[0] || "";

            setProfile((current) => ({
                ...current,
                name: displayName,
                email,
            }));
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            syncUserProfile(session?.user ?? null);
        });

        void supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Failed to load the signed-in user profile:", error.message);
                return;
            }
            syncUserProfile(data.session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

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
