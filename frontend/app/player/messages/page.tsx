"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, MessageSquare, Search, Send } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { listMatches, listMessages, markChatRead, openChat, sendMessage } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";
import type { ChatMember, MatchRead, MessageRead } from "../../../lib/types";

interface ConversationSummary {
  match: MatchRead;
  conversationId: string;
  members: ChatMember[];
  lastMessage: MessageRead | null;
}

function matchTitle(match: MatchRead): string {
  const date = new Date(`${match.date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${match.sport} · ${date}`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MessagesPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<MessageRead[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [liveUpdatesActive, setLiveUpdatesActive] = useState(false);
  const [liveUpdateError, setLiveUpdateError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const joined = await listMatches({ joined_by_me: true, page_size: 100 });
      const rows = await Promise.all(joined.items.map(async (match) => {
        const [chat, page] = await Promise.all([
          openChat(match.id),
          listMessages(match.id, { limit: 1 }),
        ]);
        return {
          match,
          conversationId: chat.conversation_id,
          members: chat.members,
          lastMessage: page.items.at(-1) ?? null,
        };
      }));
      rows.sort((left, right) => {
        const leftDate = left.lastMessage?.created_at ?? left.match.created_at;
        const rightDate = right.lastMessage?.created_at ?? right.match.created_at;
        return rightDate.localeCompare(leftDate);
      });
      setConversations(rows);
      setError(null);
      setSelectedMatchId((current) => current && rows.some((row) => row.match.id === current)
        ? current
        : rows[0]?.match.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void loadConversations();
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [loadConversations]);

  const selected = conversations.find((item) => item.match.id === selectedMatchId) ?? null;

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      setLiveUpdatesActive(false);
      return;
    }
    let cancelled = false;
    setLiveUpdatesActive(false);
    setLiveUpdateError(null);
    const refreshMessages = async () => {
      let page: Awaited<ReturnType<typeof listMessages>>;
      try {
        page = await listMessages(selected.match.id, { limit: 100 });
      } catch (err) {
        if (!cancelled) {
          setLiveUpdateError(
            err instanceof ApiError
              ? err.message
              : "Could not connect to the server while loading messages.",
          );
        }
        return;
      }

      if (cancelled) return;
      setMessages(page.items);

      try {
        await markChatRead(selected.match.id);
        if (!cancelled) window.dispatchEvent(new Event("sportmate:chat-read"));
      } catch (err) {
        console.error("Failed to update chat read status:", err);
      }
    };
    void refreshMessages();
    const channel = supabase
      .channel(`player-match-chat-${selected.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selected.conversationId}`,
        },
        () => {
          void refreshMessages();
          void loadConversations();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLiveUpdatesActive(true);
          setLiveUpdateError(null);
          void refreshMessages();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setLiveUpdatesActive(false);
          setLiveUpdateError("Live message updates are unavailable. Check your connection or refresh.");
        }
      });
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      void supabase.removeChannel(channel);
    };
  }, [loadConversations, selected?.match.id, selected?.conversationId]);

  const otherMembers = selected?.members.filter((member) => member.user_id !== profile?.id) ?? [];
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return conversations.filter(({ match, members }) =>
      !value || matchTitle(match).toLowerCase().includes(value) ||
      match.location.toLowerCase().includes(value) ||
      members.some((member) => member.name.toLowerCase().includes(value)),
    );
  }, [conversations, query]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedMatchId) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await sendMessage(selectedMatchId, { content });
      setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message]);
      setDraft("");
      await loadConversations();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[500px] bg-[#F2E8D9]">
      <aside className={`${selectedMatchId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-[#E5D5C0] bg-[#F2E8D9] md:w-80`}>
        <div className="px-5 pb-4 pt-6">
          <h1 className="mb-4 text-lg font-extrabold text-slate-900">Match messages</h1>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input type="search" aria-label="Search conversations" placeholder="Search matches or players…" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-slate-700 outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          {loading && conversations.length === 0 ? (
            <p className="px-3 py-5 text-sm text-slate-400">Loading conversations…</p>
          ) : error ? (
            <div role="alert" className="px-3 py-5 text-sm text-red-700">{error}<button onClick={() => void loadConversations()} className="ml-2 font-semibold underline">Retry</button></div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-slate-400">
              <MessageSquare className="mx-auto mb-3" size={24} />
              You do not have any match conversations yet. Join a game to start chatting.
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((conversation) => {
                const participantNames = conversation.members
                  .filter((member) => member.user_id !== profile?.id)
                  .map((member) => member.name);
                return (
                  <li key={conversation.match.id}>
                    <button onClick={() => setSelectedMatchId(conversation.match.id)} className={`w-full rounded-2xl px-3 py-3 text-left transition-colors ${selectedMatchId === conversation.match.id ? "bg-white shadow-sm" : "hover:bg-white/60"}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{matchTitle(conversation.match)}</p>
                        <span className="shrink-0 text-xs text-slate-400">{conversation.lastMessage ? formatTime(conversation.lastMessage.created_at) : ""}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{participantNames.join(", ") || conversation.match.location}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage?.content ?? "No messages yet"}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className={`${selectedMatchId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col rounded-l-3xl bg-white shadow-inner`}>
        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <button aria-label="Back to conversations" onClick={() => setSelectedMatchId(null)} className="text-slate-500 md:hidden"><ArrowLeft size={20} /></button>
              <div className="min-w-0">
                <h2 className="truncate font-extrabold text-slate-900">{matchTitle(selected.match)}</h2>
                <p className="truncate text-xs text-slate-500">{selected.match.location} · {otherMembers.map((member) => member.name).join(", ") || "Just you"}</p>
              </div>
              <span className={`ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold ${liveUpdatesActive ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`h-2 w-2 rounded-full ${liveUpdatesActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                {liveUpdatesActive ? "Live" : liveUpdateError ? "Offline" : "Connecting"}
              </span>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Start the conversation for this match.</div>
              ) : messages.map((message) => {
                const mine = message.sender_id === profile?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {!mine && <p className="mb-1 text-xs font-bold opacity-70">{message.sender_name}</p>}
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                      <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>{formatTime(message.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={submitMessage} className="border-t border-gray-100 p-4">
              {liveUpdateError && <p role="status" className="mb-2 text-sm text-amber-700">{liveUpdateError}</p>}
              {sendError && <p role="alert" className="mb-2 text-sm text-red-600">{sendError}</p>}
              <div className="flex gap-3">
                <input maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message…" aria-label="Message" className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="inline-flex items-center gap-2 rounded-full bg-[#D97736] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c26529] disabled:opacity-50"><Send size={15} /><span className="hidden sm:inline">Send</span></button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-slate-400">
            <MessageSquare size={30} />
            <h2 className="text-lg font-extrabold text-slate-800">Select a match conversation</h2>
            <p className="max-w-xs text-sm">Messages are shared with participants of each match.</p>
          </div>
        )}
      </main>
    </div>
  );
}
