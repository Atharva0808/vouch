"use client";

import { useState } from "react";

/**
 * Proxied avatar that routes Instagram CDN images through
 * our own /api/image-proxy endpoint to bypass anti-hotlinking.
 * YouTube/other images load directly.
 */
export default function AvatarImg({
    src,
    name,
    handle,
    platform,
    size = 48,
    rounded = "rounded-xl",
}: {
    src: string;
    name: string;
    handle?: string;
    platform?: string;
    size?: number;
    rounded?: string;
}) {
    const [imageError, setImageError] = useState(false);
    const [fallbackError, setFallbackError] = useState(false);
    const px = `${size}px`;
    const textSize = size >= 96 ? "text-3xl" : size >= 64 ? "text-xl" : "text-base";

    const cleanHandle = (handle?.replace("@", "") || name || "creator").toLowerCase().replace(/[^a-z0-9]/g, "");
    const initials = (name || cleanHandle || "?").split(" ").map(w => w[0]).join("+").toUpperCase().slice(0, 2);
    const fallbackUrl = `https://ui-avatars.com/api/?name=${initials}&size=300&background=FF6B9D&color=fff&bold=true&format=png`;
    const initialImgUrl = src ? getProxiedUrl(src) : fallbackUrl;

    if (imageError && fallbackError) {
        return (
            <div
                style={{ width: px, height: px }}
                className={`${rounded} neo-border bg-gradient-to-br from-[var(--color-neo-pink)] to-[var(--color-neo-purple)] flex items-center justify-center text-white font-bold flex-shrink-0 ${textSize}`}
            >
                {name?.[0]?.toUpperCase() || "?"}
            </div>
        );
    }

    if (imageError && !fallbackError) {
        return (
            <img
                src={fallbackUrl}
                alt={name}
                style={{ width: px, height: px }}
                className={`${rounded} neo-border object-cover flex-shrink-0`}
                referrerPolicy="no-referrer"
                onError={() => setFallbackError(true)}
            />
        );
    }

    return (
        <img
            src={initialImgUrl}
            alt={name}
            style={{ width: px, height: px }}
            className={`${rounded} neo-border object-cover flex-shrink-0`}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
        />
    );
}

function getProxiedUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    // Instagram, Facebook, and scraper CDN URLs need proxying
    if (
        url.includes("cdninstagram.com") ||
        url.includes("fbcdn.net") ||
        url.includes("instagram.com") ||
        url.includes("iqsaved.com") ||
        url.includes("stories-viewer")
    ) {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    // YouTube, Google, Wikimedia, and other URLs work directly
    return url;
}
