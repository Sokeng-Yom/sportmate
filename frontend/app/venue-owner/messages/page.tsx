"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { useVenueOwnerData, Conversation } from "../context/VenueOwnerContext";
import { EmptyState } from "../components/ui";

function ChatThread({ conv, onBack }: { conv: Conversation; onBack: () => void }) {
    const { sendMessage, markConversationRead } = useVenueOwnerData();
    const [text, setText] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        markConversationRead(conv.id);
    }, [conv.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conv.messages]);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        sendMessage(conv.id, trimmed);
        setText("");
    };

    return (
        <div className="flex flex-col h-full">
            {/* Thread Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-white">
                <button onClick={onBack} className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100">
                    <ArrowLeft size={18} />
                </button>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.playerName}`} alt="" className="w-9 h-9 rounded-full bg-slate-100" />
                <div>
                    <p className="font-bold text-slate-900 text-sm">{conv.playerName}</p>
                    <p className="text-xs text-emerald-500 font-medium">Online</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
                {conv.messages.map((m) => {
                    const isOwner = m.senderId === "owner";
                    return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isOwner ? "bg-emerald-600 text-white rounded-br-sm" : "bg-white text-slate-800 shadow-sm rounded-bl-sm border border-slate-100"}`}>
                                <p>{m.text}</p>
                                <p className={`text-[10px] mt-1 ${isOwner ? "text-emerald-100" : "text-slate-400"} text-right`}>{m.timestamp}</p>
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white flex items-center gap-3">
                <input value={text} onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message…"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all" />
                <button onClick={handleSend} disabled={!text.trim()}
                    className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}

export default function MessagesPage() {
    const { conversations } = useVenueOwnerData();
    const [selected, setSelected] = useState<string | null>(conversations[0]?.id ?? null);
    const [mobileView, setMobileView] = useState<"list" | "thread">("list");

    const activeConv = conversations.find((c) => c.id === selected);

    if (conversations.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[60vh] flex items-center justify-center">
                <EmptyState icon={<MessageSquare size={28} />} title="No messages yet" description="When players message you about a venue, their conversation will appear here." />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-160px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
            {/* Conversation List */}
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-slate-100 flex flex-col ${mobileView === "thread" ? "hidden md:flex" : "flex"}`}>
                <div className="px-4 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.map((c) => (
                        <button key={c.id} onClick={() => { setSelected(c.id); setMobileView("thread"); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left ${selected === c.id ? "bg-emerald-50 border-l-4 border-l-emerald-500" : ""}`}>
                            <div className="relative flex-shrink-0">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.playerName}`} alt="" className="w-10 h-10 rounded-full bg-slate-100" />
                                {c.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{c.unreadCount}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="font-bold text-slate-900 text-sm truncate">{c.playerName}</p>
                                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{c.lastMessageTime}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{c.lastMessage}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Thread Panel */}
            <div className={`flex-1 flex flex-col ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
                {activeConv ? (
                    <ChatThread conv={activeConv} onBack={() => setMobileView("list")} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <p className="text-sm">Select a conversation to view messages</p>
                    </div>
                )}
            </div>
        </div>
    );
}
