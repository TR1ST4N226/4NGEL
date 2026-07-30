// src/lib/platforms.ts

export type Platform = {
  key: string;
  label: string;
};

const PLATFORMS = [
  { hosts: ["youtube.com", "youtu.be", "music.youtube.com"], key: "youtube", label: "YouTube" },
  { hosts: ["x.com", "twitter.com"], key: "x", label: "X / Twitter" },
  { hosts: ["instagram.com"], key: "instagram", label: "Instagram" },
  { hosts: ["threads.net", "threads.com"], key: "threads", label: "Threads" },
  { hosts: ["tiktok.com"], key: "tiktok", label: "TikTok" },
  { hosts: ["vimeo.com"], key: "vimeo", label: "Vimeo" },
  { hosts: ["twitch.tv"], key: "twitch", label: "Twitch" },
  { hosts: ["reddit.com"], key: "reddit", label: "Reddit" },
  { hosts: ["facebook.com", "fb.watch"], key: "facebook", label: "Facebook" },
];

export function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    for (const platform of PLATFORMS) {
      for (const host of platform.hosts) {
        if (hostname === host || hostname.endsWith(`.${host}`)) {
          return { key: platform.key, label: platform.label };
        }
      }
    }

    return { key: "generic", label: hostname };
  } catch {
    return { key: "unknown", label: "Unknown site" };
  }
}

export function isProbablyUrl(input: string): boolean {
  try {
    const trimmed = input.trim();
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}