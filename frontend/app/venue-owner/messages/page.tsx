"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import {
    listVenueOwnerConversations,
    listVenueOwnerMessages,
    markVenueOwnerMessagesRead,
    sendVenueOwnerMessage,
} from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { MessageRead, VenueOwnerConversation } from "../../../lib/types";

function formatTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

export default function MessagesPage() {
    const { profile } = useAuth();
    const [conversations, setConversations] = useState<VenueOwnerConversation[]>([]);
    const [messages, setMessages] = useState<MessageRead[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<"list" | "thread">("list");
    const bottomRef = useRef<HTMLDivElement>(null);
    const messageIdsRef = useRef<Set<string>>(new Set());

    const loadConversations = useCallback(async () => {
        try {
            const page = await listVenueOwnerConversations();
            setConversations(page.items);
            setError(null);
            setSelectedConversationId((current) =>
                current && page.items.some((item) => item.conversation_id === current)
                    ? current
                    : page.items[0]?.conversation_id ?? null,
            );
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not load booking messages.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadConversations();
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") void loadConversations();
        }, 15000);
        const refreshOnFocus = () => {
            if (document.visibilityState === "visible") void loadConversations();
        };
        window.addEventListener("focus", refreshOnFocus);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshOnFocus);
        };
    }, [loadConversations]);

    const selected = conversations.find((item) => item.conversation_id === selectedConversationId) ?? null;

    useEffect(() => {
        if (!selected) {
            setMessages([]);
            messageIdsRef.current.clear();
            return;
        }
        let cancelled = false;
        messageIdsRef.current.clear();
        const refreshMessages = async (markRead = false) => {
            try {
                const page = await listVenueOwnerMessages(selected.conversation_id);
                if (cancelled) return;
                setMessages(page.items);
                const hasNewIncoming = page.items.some(
                    (message) => message.sender_id !== profile?.id && !messageIdsRef.current.has(message.id),
                );
                page.items.forEach((message) => messageIdsRef.current.add(message.id));
                if (markRead || hasNewIncoming) {
                    await markVenueOwnerMessagesRead(selected.conversation_id);
                    if (!cancelled) void loadConversations();
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ApiError ? err.message : "Could not load this conversation.");
                }
            }
        };
        void refreshMessages(true);
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") void refreshMessages();
        }, 5000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [loadConversations, profile?.id, selected?.conversation_id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content || !selected || sending) return;
        setSending(true);
        setSendError(null);
        try {
            const message = await sendVenueOwnerMessage(selected.conversation_id, { content });
            setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message]);
            setDraft("");
            await loadConversations();
        } catch (err) {
            setSendError(err instanceof ApiError ? err.message : "Could not send this message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-160px)] min-h-[500px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <aside className={`${selectedConversationId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-slate-100 md:w-80`}>
                <div className="border-b border-slate-100 px-5 py-4">
                    <h1 className="font-bold text-slate-900">Booking messages</h1>
                    <p className="mt-1 text-xs text-slate-500">Conversations with hosts who booked your courts</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading && conversations.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-slate-400">Loading conversations…</p>
                    ) : error && conversations.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-red-700" role="alert">
                            {error}
                            <button onClick={() => void loadConversations()} className="ml-2 font-semibold underline">Retry</button>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">
                            <MessageSquare className="mx-auto mb-3" size={24} />
                            Messages will appear when a host books one of your courts.
                        </div>
                    ) : (
                        conversations.map((conversation) => {
                            const preview = conversation.last_message;
                            const personName = conversation.host_name;
                            return (
                                <button
                                    key={conversation.conversation_id}
                                    onClick={() => {
                                        setSelectedConversationId(conversation.conversation_id);
                                        setMobileView("thread");
                                    }}
                                    className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                                        selectedConversationId === conversation.conversation_id ? "border-l-4 border-l-emerald-500 bg-emerald-50" : ""
                                    }`}
                                >
                                    {conversation.host_avatar ? (
                                        <img src={conversation.host_avatar} alt="" className="h-10 w-10 rounded-full bg-slate-100 object-cover" />
                                    ) : (
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                            {initials(personName)}
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="mb-0.5 flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-bold text-slate-900">{personName}</span>
                                            <span className="shrink-0 text-[10px] text-slate-400">{preview ? formatTime(preview.created_at) : ""}</span>
                                        </span>
                                        <span className="block truncate text-xs text-slate-500">
                                            {conversation.venue_names.join(", ")} · {conversation.court_names.join(", ")}
                                        </span>
                                        <span className="mt-1 flex items-center justify-between gap-2">
                                            <span className="truncate text-xs text-slate-500">
                                                {preview?.content ?? "Booking conversation"}
                                            </span>
                                            {conversation.unread_count > 0 && (
                                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                                                    {conversation.unread_count}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            <main className={`${selectedConversationId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
                {selected ? (
                    <>
                        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                            <button
                                aria-label="Back to conversations"
                                onClick={() => setMobileView("list")}
                                className="text-slate-500 md:hidden"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            {selected.host_avatar ? (
                                <img src={selected.host_avatar} alt="" className="h-10 w-10 rounded-full bg-slate-100 object-cover" />
                            ) : (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                    {initials(selected.host_name)}
                                </span>
                            )}
                            <div className="min-w-0">
                                <h2 className="truncate font-bold text-slate-900">{selected.host_name}</h2>
                                <p className="truncate text-xs text-slate-500">
                                    {selected.venue_names.join(", ")} · {selected.court_names.join(", ")}
                                </p>
                            </div>
                        </header>
                        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
                            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                            {messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                    Start a conversation with the host.
                                </div>
                            ) : messages.map((message) => {
                                const mine = message.sender_id === profile?.id;
                                return (
                                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                                            mine ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm border border-slate-100 bg-white text-slate-800 shadow-sm"
                                        }`}>
                                            {!mine && <p className="mb-1 text-xs font-bold opacity-70">{message.sender_name}</p>}
                                            <p>{message.content}</p>
                                            <p className={`mt-1 text-right text-[10px] ${mine ? "text-emerald-100" : "text-slate-400"}`}>
                                                {formatTime(message.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>
                        <form onSubmit={submitMessage} className="border-t border-slate-100 bg-white p-4">
                            {sendError && <p role="alert" className="mb-2 text-sm text-red-600">{sendError}</p>}
                            <div className="flex gap-3">
                                <input
                                    maxLength={1000}
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder="Type a message…"
                                    aria-label="Message"
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !draft.trim()}
                                    aria-label="Send message"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-slate-400">
                        <MessageSquare size={30} />
                        <h2 className="text-lg font-extrabold text-slate-800">No booking conversation selected</h2>
                        <p className="max-w-xs text-sm">
                            {error ?? "A conversation appears here after a host requests one of your courts."}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
