"use client";

import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { Post } from "@/lib/api";

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;

  const regex = new RegExp(`(${keywords.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = keywords.some(
      (kw) => part.toLowerCase() === kw.toLowerCase()
    );
    return isMatch ? (
      <mark key={i} className="rounded bg-brand/25 px-0.5 text-brand">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTrailingUrls(text: string): string {
  return text.replace(/\s*https:\/\/t\.co\/\S+$/g, "").trim();
}

export default function PostCard({ post }: { post: Post }) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  });
  const fullTime = format(new Date(post.created_at), "MMM d, yyyy h:mm a");
  const initial = (post.author_display_name || post.author_username)
    .charAt(0)
    .toUpperCase();

  return (
    <article className="animate-slide-in border-b border-[#2f3336] px-4 py-3 transition-colors hover:bg-[#080808]">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {post.author_profile_image_url ? (
            <img
              src={post.author_profile_image_url}
              alt={post.author_username}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
              {initial}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <span className="truncate font-bold text-[#e7e9ea]">
              {post.author_display_name || post.author_username}
            </span>
            <span className="truncate text-[#71767b]">
              @{post.author_username}
            </span>
            <span className="text-[#71767b]">&middot;</span>
            <time className="whitespace-nowrap text-[#71767b]" title={fullTime}>
              {timeAgo}
            </time>
          </div>

          {/* Post text */}
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#e7e9ea]">
            {highlightKeywords(stripTrailingUrls(post.text), post.matched_keywords || [])}
          </p>

          {/* Media */}
          {post.media_urls?.length > 0 && (
            <div className={`mt-2 grid gap-1 ${post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {post.media_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Media ${i + 1}`}
                  className="w-full rounded-xl border border-[#2f3336] object-cover"
                  style={{ maxHeight: post.media_urls.length > 1 ? 200 : 400 }}
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center gap-4 text-xs text-[#71767b]">
            {post.matched_rule_tags?.length > 0 && (
              <span className="rounded-full bg-[#1d1f23] px-2 py-0.5">
                {post.matched_rule_tags.join(", ")}
              </span>
            )}
            <a
              href={post.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-brand transition-colors hover:text-brand-dark"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on X
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
