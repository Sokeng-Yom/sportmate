"use client";

import Link from "next/link";
import {
  Users, MapPin, Calendar, MessageSquare, NotebookPen, Anchor,
  ShieldCheck, Activity, BicepsFlexed, Shield, Lock, Bell
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">

      {/* Navbar */}
      <header className="px-6 py-4 flex justify-between items-center fixed top-0 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg z-50 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-brand text-white p-2 rounded-xl shadow-lg shadow-brand/20">
            <Activity size={24} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">SportMate</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold hover:text-brand transition">Log in</Link>
          <Link href="/register" className="text-sm font-bold bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-full shadow-md shadow-brand/20 transition-all active:scale-95">Get Started</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col justify-center items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="bg-brand/10 text-brand font-semibold px-4 py-1.5 rounded-full text-sm mb-6 inline-block">The ultimate sports network</span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-balance text-slate-900 dark:text-white">
            Find <span className="text-brand">Partners</span>. <br className="hidden md:block" />Book Courts. Play.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 text-balance">
            SportMate is the secure sports partner matching and court booking platform. Find players at your skill level, chat securely, and secure courts instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 rounded-full font-bold text-white bg-brand hover:bg-brand-dark shadow-xl hover:shadow-brand/40 shadow-brand/20 transition-all text-lg active:scale-95">
              Join the Community
            </Link>
            <Link href="#how-it-works" className="px-8 py-4 rounded-full font-bold text-slate-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 transition-all text-lg">
              See How It Works
            </Link>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4">How it works</h2>
            <p className="text-slate-500">Four easy steps to get you on the court.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "Create profile", icon: <Users size={32} />, desc: "Set your sports, skill levels, and availability." },
              { title: "Find a match", icon: <MapPin size={32} />, desc: "Discover local open games or create your own." },
              { title: "Book a court", icon: <Calendar size={32} />, desc: "Instantly secure a playing slot at top venues." },
              { title: "Play safely", icon: <BicepsFlexed size={32} />, desc: "Chat securely and manage replacements easily." }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-slate-950 rounded-3xl border border-gray-100 dark:border-slate-800 hover:border-brand/30 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-6">
                  {step.icon}
                </div>
                <h3 className="font-bold text-xl mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-extrabold mb-12 text-center">Everything you need</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Partner matching", icon: <Users />, desc: "Advanced algorithm scores matches based on skill and availability." },
            { title: "Match management", icon: <NotebookPen />, desc: "Organize games with open, full, ready, and completed lifecycle states." },
            { title: "Secure match chat", icon: <MessageSquare />, desc: "Built-in rate-limited chat keeps your personal number private." },
            { title: "Court booking", icon: <Calendar />, desc: "Double-booking protection with real-time venue availabilities." },
            { title: "Leave-risk protection", icon: <Anchor />, desc: "Dynamic dropout policies restrict users who leave at the last minute." },
            { title: "Community updates", icon: <Bell />, desc: "Stay up to date with posts and waitlist notifications." }
          ].map((f, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all group">
              <div className="text-slate-400 group-hover:text-brand transition-colors mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-24 bg-brand text-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-16 text-center text-white">Who is it for?</h2>
          <div className="grid md:grid-cols-2 gap-8">

            <div className="bg-white/10 backdrop-blur-sm p-10 rounded-[3rem] border border-white/20">
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                <Users size={32} className="text-brand" />
              </div>
              <h3 className="font-bold text-3xl mb-4">Players</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="bg-white/20 p-1 rounded-full"><ShieldCheck size={16} /></div>
                  Find partners suited to your skill level
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-white/20 p-1 rounded-full"><ShieldCheck size={16} /></div>
                  Join or create open matches in your area
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-white/20 p-1 rounded-full"><ShieldCheck size={16} /></div>
                  Book courts directly with local venues
                </li>
              </ul>
            </div>

            <div className="bg-white text-slate-900 p-10 rounded-[3rem] shadow-2xl">
              <div className="bg-brand w-16 h-16 rounded-2xl flex items-center justify-center mb-8 text-white">
                <MapPin size={32} />
              </div>
              <h3 className="font-bold text-3xl mb-4">Venue Owners</h3>
              <ul className="space-y-4 text-slate-600">
                <li className="flex items-center gap-3">
                  <div className="bg-brand/20 p-1 rounded-full text-brand"><ShieldCheck size={16} /></div>
                  List your sports facility and manage courts
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-brand/20 p-1 rounded-full text-brand"><ShieldCheck size={16} /></div>
                  Weekly availability scheduling & automatic bookings
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-brand/20 p-1 rounded-full text-brand"><ShieldCheck size={16} /></div>
                  Reduce empty slots with automated waiting lists
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="py-24 max-w-5xl mx-auto px-6 text-center">
        <Shield className="mx-auto text-brand w-16 h-16 mb-6" />
        <h2 className="text-3xl font-extrabold mb-8">Safe & Secure Environment</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3 justify-center text-slate-500 font-medium">
            <Lock size={20} className="text-slate-400" /> Secure Sessions
          </div>
          <div className="flex items-center gap-3 justify-center text-slate-500 font-medium">
            <Users size={20} className="text-slate-400" /> Role-based Access
          </div>
          <div className="flex items-center gap-3 justify-center text-slate-500 font-medium">
            <Activity size={20} className="text-slate-400" /> Rate Limiting
          </div>
          <div className="flex items-center gap-3 justify-center text-slate-500 font-medium">
            <ShieldCheck size={20} className="text-slate-400" /> Audit Logs
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 py-12 border-t border-gray-100 dark:border-slate-800 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Activity className="text-brand" size={20} />
          <span className="font-bold text-lg">SportMate</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">© {new Date().getFullYear()} SportMate Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
