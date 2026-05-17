"use client";

import { useEffect, useState, useRef } from "react";
import { getPosts, type Post } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import PostCard from "./PostCard";
import { Loader2, Inbox } from "lucide-react";

export default function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const isAtTopRef = useRef(true);

  // Initial load
  useEffect(() => {
    getPosts(100)
      .then((data) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Supabase Realtime subscription for new posts
  useEffect(() => {
    const sb = getSupabase();
    const channel = sb
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const newPost = payload.new as Post;
          setPosts((prev) => {
            if (prev.some((p) => p.tweet_id === newPost.tweet_id)) return prev;
            return [newPost, ...prev].slice(0, 500);
          });

          if (!isAtTopRef.current) {
            setNewCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // Track scroll position
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const handleScroll = () => {
      isAtTopRef.current = el.scrollTop < 50;
      if (isAtTopRef.current) setNewCount(0);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setNewCount(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#71767b]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading posts...
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#71767b]">
        <Inbox className="h-12 w-12" />
        <p className="text-lg font-medium">No posts yet</p>
        <p className="text-sm">
          Add accounts to track and posts will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* New posts banner */}
      {newCount > 0 && (
        <button
          onClick={scrollToTop}
          className="sticky top-14 z-40 w-full bg-brand/90 py-2 text-center text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-brand"
        >
          {newCount} new post{newCount > 1 ? "s" : ""} — click to scroll up
        </button>
      )}

      <div
        ref={feedRef}
        className="scrollbar-thin max-h-[calc(100vh-12rem)] overflow-y-auto"
      >
        {posts.map((post) => (
          <PostCard key={post.tweet_id} post={post} />
        ))}
      </div>
    </div>
  );
}
