"use client";

import { useState } from "react";
import { Search, Pencil, Mail, ChevronRight } from "lucide-react";

// Mock conversations — empty to match the screenshot
const conversations: {
    id: number;
    name: string;
    avatar: string;
    lastMessage: string;
    time: string;
    unread: number;
}[] = [];

export default function MessagesPage() {
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const filtered = conversations.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
    );

    const selected = conversations.find((c) => c.id === selectedId) ?? null;

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#F2E8D9]">

            {/* ── Left Sidebar ── */}
            <aside className="w-64 flex-shrink-0 flex flex-col bg-[#F2E8D9] border-r border-[#E5D5C0]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-6 pb-4">
                    <h2 className="text-lg font-extrabold text-slate-900">Messages</h2>
                    <button className="text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                        <Search size={14} className="text-slate-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="text-sm bg-transparent outline-none w-full text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Conversation list or empty state */}
                <div className="flex-1 overflow-y-auto px-4">
                    {filtered.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center mt-6 leading-relaxed">
                            You do not have any conversations yet.
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {filtered.map((conv) => (
                                <li key={conv.id}>
                                    <button
                                        onClick={() => setSelectedId(conv.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${selectedId === conv.id
                                                ? "bg-white shadow-sm"
                                                : "hover:bg-white/60"
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                            <img
                                                src={conv.avatar}
                                                alt={conv.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {/* Text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-semibold text-slate-800 text-sm truncate">
                                                    {conv.name}
                                                </p>
                                                <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                                                    {conv.time}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                                        </div>
                                        {/* Unread badge */}
                                        {conv.unread > 0 && (
                                            <span className="w-5 h-5 rounded-full bg-[#D97736] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {conv.unread}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── User Profile Footer ── */}
                <div className="border-t border-[#E5D5C0] px-4 py-4 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                            N
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#F2E8D9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">4</p>
                        <p className="text-xs text-slate-500 truncate">View profile</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                </div>
            </aside>

            {/* ── Right Panel ── */}
            <main className="flex-1 bg-white rounded-tl-3xl rounded-bl-none shadow-inner flex items-center justify-center">
                {selected ? (
                    /* Chat view — placeholder for when a conversation is selected */
                    <div className="flex flex-col h-full w-full p-8">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 overflow-hidden">
                                <img src={selected.avatar} alt={selected.name} className="w-full h-full object-cover" />
                            </div>
                            <p className="font-extrabold text-slate-900">{selected.name}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                            Start of your conversation with {selected.name}
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <input
                                type="text"
                                placeholder="Type a message…"
                                className="flex-1 px-4 py-3 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <button className="bg-[#D97736] hover:bg-[#c26529] text-white font-bold px-6 py-3 rounded-full text-sm transition-colors">
                                Send
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Empty / no selection state */
                    <div className="flex flex-col items-center gap-4 text-center px-8">
                        <div className="w-16 h-16 rounded-full bg-[#F6EBE5] flex items-center justify-center">
                            <Mail size={28} className="text-[#D97736]" />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-800">
                            Select a conversation
                        </h3>
                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                            Choose a conversation to start chatting with{" "}
                            <span className="text-[#D97736] font-semibold">your</span> sports partner.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
