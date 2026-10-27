"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, User } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { useAuth } from "../../../lib/auth";
import { updateProfile } from "../../../lib/api";

export default function PlayerProfilePage() {
  const { profile, session, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateProfile({ name: name.trim() });
      await refreshProfile();
      setMessage("Your profile has been updated.");
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/player/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Explore
      </Link>
      <section className="mt-6 overflow-hidden rounded-3xl border border-[#E8E3DE] bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-50 via-white to-orange-50 px-6 py-8 sm:px-9">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow-sm">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={`${profile.name}'s profile`} className="h-full w-full object-cover" />
              ) : (
                <User size={32} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold text-slate-900">{profile?.name || "Your profile"}</h1>
              <p className="mt-1 truncate text-sm text-slate-500">{session?.user.email ?? "Email unavailable"}</p>
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Member</span>
            </div>
          </div>
        </div>
        <form onSubmit={(event) => void saveProfile(event)} className="space-y-5 p-6 sm:p-9">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Profile information</h2>
            <p className="mt-1 text-sm text-slate-500">Update the name other players see on your games.</p>
          </div>
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <label className="block text-sm font-semibold text-slate-700">
            Display name
            <input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {message && !saving ? <Check size={16} aria-hidden="true" /> : null}
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
