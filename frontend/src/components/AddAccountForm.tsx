"use client";

import { useState } from "react";
import { addAccount, type TrackedAccount } from "@/lib/api";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  onAdded: (account: TrackedAccount) => void;
}

export default function AddAccountForm({ onAdded }: Props) {
  const [username, setUsername] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const kw = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const account = await addAccount(username.trim(), kw);
      onAdded(account);
      setUsername("");
      setKeywords("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#71767b]">
          X Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="elonmusk"
          disabled={loading}
          className="w-full rounded-lg border border-[#2f3336] bg-[#16181c] px-3 py-2 text-sm text-[#e7e9ea] placeholder-[#71767b] outline-none transition-colors focus:border-brand"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#71767b]">
          Keywords (optional, comma-separated)
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="AI, GPT, Tesla"
          disabled={loading}
          className="w-full rounded-lg border border-[#2f3336] bg-[#16181c] px-3 py-2 text-sm text-[#e7e9ea] placeholder-[#71767b] outline-none transition-colors focus:border-brand"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !username.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {loading ? "Adding..." : "Track Account"}
      </button>
    </form>
  );
}
