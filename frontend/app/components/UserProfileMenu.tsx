"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ChevronDown,
  LogOut,
  Pencil,
  Settings,
  User,
  UserRound,
} from "lucide-react";
import { updateProfile } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabaseClient";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function UserProfileMenu() {
  const { profile, role, session, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const profileHref = role === "PLAYER"
    ? "/player/profile"
    : role === "VENUE_OWNER"
      ? "/venue-owner/settings"
      : "/admin/settings";
  const email = session?.user.email ?? "Email unavailable";
  const metadata = session?.user.user_metadata;
  const metadataName = [metadata?.name, metadata?.full_name, metadata?.display_name]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim();
  const emailName = session?.user.email?.split("@")[0]?.trim();
  const profileName = profile?.name?.trim();
  const name = profileName && profileName.toLowerCase() !== "member"
    ? profileName
    : metadataName || emailName || (role === "VENUE_OWNER" ? "Venue Owner" : "Member");

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile?.id) return;

    setAvatarError(null);
    if (!AVATAR_TYPES.has(file.type)) {
      setAvatarError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("Profile pictures must be smaller than 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${profile.id}/avatar`, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(`${profile.id}/avatar`);
      const avatarUrl = `${data.publicUrl}?updated=${Date.now()}`;
      await updateProfile({ avatar: avatarUrl });
      if (!await refreshProfile()) {
        throw new Error("The picture uploaded, but the profile could not be refreshed.");
      }
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      setAvatarError("Could not update your profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/login");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-profile-menu"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => {
              containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
            });
          }
        }}
        className="flex items-center gap-2 rounded-full p-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:gap-2.5 sm:pl-2"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500 shadow-sm sm:h-10 sm:w-10">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={19} aria-hidden="true" />
          )}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-800 sm:block">
          {name}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`hidden text-slate-400 transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="user-profile-menu"
            role="menu"
            aria-label="Profile menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
              );
              const currentIndex = items.indexOf(document.activeElement as HTMLElement);
              let nextIndex = currentIndex;
              if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = items.length - 1;
              else if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
              else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
              event.preventDefault();
              items[nextIndex]?.focus();
            }}
            className="absolute right-0 top-[calc(100%+0.75rem)] z-[60] w-[min(22rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.28)] sm:p-5"
          >
            <div className="flex items-center gap-4 px-1 py-1 sm:gap-5">
              <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border border-slate-100 bg-slate-100 text-slate-500">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt={`${name}'s profile`} className="h-full w-full object-cover" />
                  ) : (
                    <User size={36} aria-hidden="true" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Choose a profile picture"
                  onChange={(event) => void handleAvatarChange(event)}
                />
                <button
                  type="button"
                  aria-label="Change profile picture"
                  title="Change profile picture"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-700 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Camera size={15} aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900">{name}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{email}</p>
                <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {role === "PLAYER" ? "Member" : name}
                </span>
              </div>
            </div>

            {avatarError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {avatarError}
              </p>
            )}

            <div className="my-4 border-t border-slate-100" />
            <nav aria-label="Profile actions" className="space-y-1">
              <Link
                role="menuitem"
                href={profileHref}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <UserRound size={19} className="text-slate-500" aria-hidden="true" />
                <span>View Profile</span>
                <span aria-hidden="true" className="ml-auto text-lg text-slate-400">›</span>
              </Link>
              <Link
                role="menuitem"
                href={profileHref}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Pencil size={19} className="text-slate-500" aria-hidden="true" />
                <span>Edit Profile</span>
                <span aria-hidden="true" className="ml-auto text-lg text-slate-400">›</span>
              </Link>
              <Link
                role="menuitem"
                href={profileHref}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Settings size={19} className="text-slate-500" aria-hidden="true" />
                <span>Settings</span>
                <span aria-hidden="true" className="ml-auto text-lg text-slate-400">›</span>
              </Link>
            </nav>

            <div className="my-3 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#e5543d] transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <LogOut size={19} aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
