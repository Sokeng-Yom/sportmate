/**
 * Date and timezone utilities for SportMate.
 * Cambodia local time is fixed at UTC+7 (Asia/Phnom_Penh) with no daylight saving.
 */

export const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";

/**
 * Normalizes an ISO datetime string representing an actual moment in time (UTC).
 * If the string contains a time separator ('T') but lacks a timezone indicator (Z or +/-offset),
 * appends 'Z' so JavaScript Date parses it as UTC rather than local time.
 */
export function parseUtcDate(isoString: string): Date {
  if (!isoString) return new Date(NaN);
  const trimmed = isoString.trim();
  const hasTime = trimmed.includes("T");
  const hasTz = trimmed.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed);
  const normalized = hasTime && !hasTz ? `${trimmed}Z` : trimmed;
  return new Date(normalized);
}

/**
 * Safely parses a calendar date-only string (e.g. "YYYY-MM-DD")
 * into a local Date without timezone shift across midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  return new Date(`${dateStr.trim().slice(0, 10)}T00:00:00`);
}

/**
 * Formats a UTC timestamp into Cambodia local time (Asia/Phnom_Penh).
 */
export function formatUtcDateTime(
  isoString: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseUtcDate(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAMBODIA_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

/**
 * Formats a UTC timestamp into Cambodia local time-only (e.g. "2:00 PM").
 */
export function formatUtcTime(
  isoString: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseUtcDate(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    timeZone: CAMBODIA_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Formats a calendar date-only string (e.g. "2026-10-30") into readable text.
 */
export function formatLocalDateString(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseLocalDate(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

/**
 * Formats relative time elapsed since a UTC timestamp (e.g. "just now", "5m ago", "2h ago").
 */
export function formatTimeAgo(isoString: string): string {
  const date = parseUtcDate(isoString);
  const then = date.getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(Math.max(0, diffMs) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

