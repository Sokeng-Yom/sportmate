"use client";

import Link from "next/link";
import {
  Users, MapPin, Calendar, ShieldCheck,
  MessageSquare, UsersRound, Building, Check,
  PlaySquare, ArrowRight, Shield, Play
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Navbar */}
      <header className="px-6 md:px-12 py-5 flex justify-between items-center fixed top-0 w-full bg-white/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 ml-1">SportMates</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link href="#explore" className="hover:text-brand transition">Explore</Link>
          <Link href="#how-it-works" className="hover:text-brand transition">How It Works</Link>
          <Link href="#features" className="hover:text-brand transition">Features</Link>
          <Link href="#for-you" className="hover:text-brand transition flex items-center gap-1">
            For You <span className="text-xs">▼</span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-slate-800 hover:text-brand transition px-2">Log in</Link>
          <Link href="/register" className="text-sm font-bold bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-full shadow-md shadow-brand/20 transition-all active:scale-95">Get Started</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
        {/* Left Side */}
        <div className="flex-[1.2] relative z-10">
          <div className="flex items-center gap-2 bg-brand/10 text-brand font-bold px-4 py-1.5 rounded-full text-xs md:text-sm mb-6 w-max">
            <Users size={16} /> The ultimate sports network
          </div>
          <h1 className="text-[3.5rem] md:text-[5rem] font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900">
            Find Partners.<br />
            <span className="text-brand">Book Courts.</span> Play.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-xl leading-relaxed">
            SportMate is the secure sports partner matching and court booking platform. Find players at your skill level, chat securely, and secure courts instantly.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/register" className="px-8 py-4 rounded-full font-bold text-white bg-brand hover:bg-brand-dark shadow-xl hover:shadow-brand/40 shadow-brand/20 transition-all text-lg active:scale-95">
              Join the Community
            </Link>
            <Link href="#how-it-works" className="px-8 py-4 flex items-center gap-2 rounded-full font-bold text-brand bg-brand/5 hover:bg-brand/10 transition-all text-lg">
              <Play size={20} strokeWidth={2.5} /> See How It Works
            </Link>
          </div>
        </div>

        {/* Right Side - Image composition */}
        <div className="flex-1 relative w-full h-[550px] hidden md:block">
          {/* Background Green Blob */}
          <div className="absolute top-0 right-0 w-[450px] h-[550px] bg-brand/10 rounded-[4rem] rounded-tr-[10rem] rounded-bl-[10rem] transform rotate-3"></div>

          {/* Main Image Placeholder - user will upload here */}
          <div className="absolute inset-x-4 inset-y-8 rounded-[3rem] overflow-hidden shadow-2xl bg-gray-100 border-4 border-white z-10">
            {/* 
              USER: Replace this div with an img tag using your photo.
              e.g., <img src="/hero.jpg" alt="Players" className="w-full h-full object-cover" />
            */}
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50">
              <span className="text-sm font-semibold mb-2">📸 Main Hero Image Placeholder</span>
              <span className="text-xs">Save your image as 'public/hero.jpg'</span>
              <span className="text-xs">and update page.tsx</span>
            </div>
          </div>

          {/* Floating Card 1 */}
          <div className="absolute top-16 right-[-20px] bg-white p-3.5 pr-8 rounded-full shadow-2xl flex items-center gap-3 animate-bounce z-20 border border-gray-50">
            <div className="bg-brand/10 p-2 rounded-full text-brand">
              <UsersRound size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">Find your</p>
              <p className="text-sm font-bold text-slate-800 leading-tight">perfect match <span className="inline-flex items-center justify-center w-[18px] h-[18px] bg-brand text-white rounded-full text-[10px] ml-1 align-baseline">✓</span></p>
            </div>
          </div>

          {/* Floating Card 2 */}
          <div className="absolute bottom-16 left-[-20px] bg-white p-3 rounded-full shadow-2xl flex items-center gap-4 pr-4 z-20 border border-gray-50">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-2xl shadow-inner shrink-0">
              🏀
            </div>
            <div className="min-w-[120px]">
              <p className="font-extrabold text-slate-900 leading-tight text-[15px]">Basketball</p>
              <p className="text-[13px] text-slate-500 font-medium">Nearby • Today</p>
            </div>
            <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-slate-400 shrink-0">›</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16">
          <div className="w-12 h-1.5 bg-brand mb-6 rounded-full"></div>
          <h2 className="text-3xl md:text-[2.5rem] font-extrabold text-slate-900 mb-4 tracking-tight">How It Works</h2>
          <p className="text-slate-500 text-lg">Get started in just a few simple steps.</p>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between gap-6 overflow-hidden">
          {[
            { id: 1, title: "1. Create Profile", icon: <Users size={28} />, desc: "Sign up and tell us your sports and skill level." },
            { id: 2, title: "2. Find a Match", icon: <MapPin size={28} />, desc: "Browse nearby players or search by sport, time, and location." },
            { id: 3, title: "3. Book a Court", icon: <Calendar size={28} />, desc: "Reserve a court at your preferred venue." },
            { id: 4, title: "4. Play Safely", icon: <ShieldCheck size={28} />, desc: "Chat securely and enjoy your game!" }
          ].map((step, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center relative group w-full px-4">
              <div className="w-24 h-24 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-8 transition-transform group-hover:scale-105 group-hover:bg-brand group-hover:text-white duration-300">
                {step.icon}
              </div>
              <h3 className="font-extrabold text-[#111] text-lg mb-4">{step.title}</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed max-w-[220px]">{step.desc}</p>

              {/* Arrow */}
              {i < 3 && (
                <div className="hidden md:block absolute top-[48px] -right-[15px] text-gray-200">
                  <ArrowRight size={32} strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose SportMate? */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16">
          <div className="w-12 h-1.5 bg-brand mb-6 rounded-full"></div>
          <h2 className="text-3xl md:text-[2.5rem] font-extrabold text-slate-900 mb-4 tracking-tight">Why Choose SportMate?</h2>
          <p className="text-slate-500 text-lg">More than just a platform — it's your sports community.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Smart Partner Matching", icon: <UsersRound size={28} strokeWidth={2.5} />, desc: "Find players at your skill level and nearby location." },
            { title: "Easy Match Management", icon: <Calendar size={28} strokeWidth={2.5} />, desc: "Organize games, manage bookings, and keep track of your schedule." },
            { title: "Secure Chat", icon: <MessageSquare size={28} strokeWidth={2.5} />, desc: "Communicate safely with verified users and build your sports circle." }
          ].map((f, i) => (
            <div key={i} className="bg-white p-10 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col hover:border-brand/20 transition-all group">
              <div className="w-16 h-16 rounded-3xl bg-brand/10 text-brand flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-extrabold text-xl mb-4 text-slate-900">{f.title}</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed flex-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who is it for? */}
      <section id="for-you" className="py-24 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-16">
            <div className="w-12 h-1.5 bg-brand mb-6 rounded-full"></div>
            <h2 className="text-3xl md:text-[2.5rem] font-extrabold text-slate-900 mb-4 tracking-tight">Who is it for?</h2>
            <p className="text-slate-500 text-lg">We bring players and venue owners together.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Players Card */}
            <div className="bg-white rounded-[2.5rem] p-10 pb-0 md:pr-0 shadow-sm border border-gray-100 flex flex-col md:flex-row relative overflow-hidden group">
              <div className="flex-1 md:pb-10 mr-4">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                    <UsersRound size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900 mb-1">Players</h3>
                    <p className="text-slate-500 text-[13px] font-medium">Find your game. Find your people.</p>
                  </div>
                </div>

                <ul className="space-y-5 mb-8 text-slate-600 text-[15px] font-semibold">
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Meet new players</li>
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Play at your skill level</li>
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Book courts easily</li>
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Build your sports community</li>
                </ul>
              </div>

              <div className="h-64 w-full md:w-[45%] md:absolute right-0 bottom-0 bg-gray-100 rounded-tl-[4rem] overflow-hidden self-end">
                {/* 
                  USER: Replace with image of player
                  e.g., <img src="/player.jpg" className="w-full h-full object-cover" alt="Players" />
                */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-slate-400 text-xs text-center p-4">
                  <span className="font-bold text-sm mb-1">Player Image</span>
                  <span>Save as 'public/player.jpg'</span>
                </div>
                <div className="absolute top-[-20px] left-[-20px] w-40 h-40 bg-brand/10 rounded-full z-[-1]"></div>
              </div>
            </div>

            {/* Venue Owners Card */}
            <div className="bg-white rounded-[2.5rem] p-10 pb-0 md:pr-0 shadow-sm border border-gray-100 flex flex-col md:flex-row relative overflow-hidden group">
              <div className="flex-1 md:pb-10 mr-4 z-10 relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                    <Building size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900 mb-1">Venue Owners</h3>
                    <p className="text-slate-500 text-[13px] font-medium">Fill your courts. Grow your business.</p>
                  </div>
                </div>

                <ul className="space-y-5 mb-8 text-slate-600 text-[15px] font-semibold">
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Get more bookings</li>
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Reach local players</li>
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Manage your courts easily</li>
                  <li className="flex items-center gap-4"><Check size={20} strokeWidth={3} className="text-brand flex-shrink-0" /> Grow your community</li>
                </ul>
              </div>

              <div className="h-64 w-full md:w-[45%] md:absolute right-0 bottom-0 bg-gray-100 rounded-tl-[4rem] overflow-hidden self-end z-0">
                {/* 
                  USER: Replace with image of venue
                  e.g., <img src="/venue.jpg" className="w-full h-full object-cover" alt="Venue" />
                */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-slate-400 text-xs text-center p-4">
                  <span className="font-bold text-sm mb-1">Venue Image</span>
                  <span>Save as 'public/venue.jpg'</span>
                </div>
                <div className="absolute bottom-[-20px] left-[-20px] w-40 h-40 bg-brand/10 rounded-full z-[-1]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safe & Trusted */}
      <section className="py-24 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-10 flex flex-col space-y-10 md:space-y-0 md:flex-row items-center gap-10">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">A Safe & Trusted Community</h2>
              <p className="text-slate-500 text-[15px]">Your safety and privacy matter to us.</p>
            </div>

            <div className="w-px h-16 bg-gray-200 hidden md:block"></div>

            <div className="flex-1 flex items-center gap-5">
              <div className="w-14 h-14 rounded-[18px] border border-brand/20 bg-brand/5 text-brand flex items-center justify-center shrink-0">
                <Shield size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-[15px] mb-1">Secure Sessions</h4>
                <p className="text-slate-500 text-[13px] leading-relaxed">Encrypted chats and safe<br />in-app communication.</p>
              </div>
            </div>

            <div className="w-px h-16 bg-gray-200 hidden md:block"></div>

            <div className="flex-1 flex items-center gap-5">
              <div className="w-14 h-14 rounded-[18px] border border-brand/20 bg-brand/5 text-brand flex items-center justify-center shrink-0">
                <UsersRound size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-[15px] mb-1">Role-based Access</h4>
                <p className="text-slate-500 text-[13px] leading-relaxed">Verified users, role control,<br />less risk, more trust.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 pb-12 px-6 md:px-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 font-medium text-[13px]">
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-1">
            <div className="w-[10px] h-[10px] rounded-full bg-orange-500"></div>
            <div className="w-[10px] h-[10px] rounded-full bg-blue-500"></div>
            <div className="w-[10px] h-[10px] rounded-full bg-brand"></div>
          </div>
          <span className="font-extrabold text-slate-900 ml-1 text-base tracking-tight">SportMates</span>
        </div>

        <div className="text-slate-400 font-semibold md:pl-20">
          © {new Date().getFullYear()} SportMate. All rights reserved.
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 text-slate-500 font-bold">
          <Link href="#" className="hover:text-brand transition">About</Link>
          <Link href="#" className="hover:text-brand transition">Privacy</Link>
          <Link href="#" className="hover:text-brand transition">Terms</Link>
          <Link href="#" className="hover:text-brand transition">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
