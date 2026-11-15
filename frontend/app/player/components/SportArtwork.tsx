"use client";

import { useState } from "react";

const SPORT_ICONS: Record<string, string> = {
    Basketball: "🏀",
    Tennis: "🎾",
    Football: "⚽",
    Badminton: "🏸",
    Volleyball: "🏐",
    Cricket: "🏏",
    Golf: "⛳",
    Swimming: "🏊",
    Cycling: "🚴",
    Running: "🏃",
};

const SPORT_IMAGES: Record<string, string> = {
    Basketball: "/sports/basketball.jpg",
    Tennis: "/sports/tennis.jpg",
    Football: "/sports/football.jpg",
    Badminton: "/sports/badminton.png",
    Volleyball: "/sports/volleyball.jpg",
    Cricket: "/sports/cricket.jpg",
    Golf: "/sports/golf.jpg",
    Swimming: "/sports/swimming.jpg",
    Cycling: "/sports/cycling.jpg",
    Running: "/sports/running.jpg",
    Pickleball: "/sports/pickleball.jpg",
};

export function SportArtwork({ sport, className }: { sport: string; className: string }) {
    const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
    const imageSrc = SPORT_IMAGES[sport];

    if (!imageSrc || failedImageSrc === imageSrc) {
        return <span className={`${className} inline-flex items-center justify-center`} aria-hidden="true">{SPORT_ICONS[sport] ?? "🏆"}</span>;
    }

    return (
        <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            className={className}
            onError={() => setFailedImageSrc(imageSrc)}
        />
    );
}
