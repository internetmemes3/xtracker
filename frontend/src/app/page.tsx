"use client";

import { useEffect, useState } from "react";
import { getAccounts, type TrackedAccount } from "@/lib/api";
import Header from "@/components/Header";
import StreamStatus from "@/components/StreamStatus";
import AddAccountForm from "@/components/AddAccountForm";
import RulesList from "@/components/RulesList";
import PostFeed from "@/components/PostFeed";
import { Users, Rss } from "lucide-react";

export default function Home() {
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);

  useEffect(() => {
    getAccounts().then(setAccounts).catch(console.error);
  }, []);

  const handleAdded = (account: TrackedAccount) => {
    setAccounts((prev) => [...prev, account]);
  };

  const handleRemoved = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdated = (updated: TrackedAccount) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            {/* Stream Status */}
            <StreamStatus />

            {/* Add Account */}
            <section className="rounded-xl border border-[#2f3336] bg-[#16181c] p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#e7e9ea]">
                <Users className="h-4 w-4 text-brand" />
                Track Account
              </h2>
              <AddAccountForm onAdded={handleAdded} />
            </section>

            {/* Tracked Accounts */}
            <section className="rounded-xl border border-[#2f3336] bg-[#16181c] p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#e7e9ea]">
                <Rss className="h-4 w-4 text-brand" />
                Tracked Accounts
                <span className="ml-auto text-xs font-normal text-[#71767b]">
                  {accounts.length}/1000 rules
                </span>
              </h2>
              <RulesList
                accounts={accounts}
                onRemoved={handleRemoved}
                onUpdated={handleUpdated}
              />
            </section>
          </aside>

          {/* ── Feed ── */}
          <section className="rounded-xl border border-[#2f3336] bg-[#16181c]">
            <div className="border-b border-[#2f3336] px-4 py-3">
              <h2 className="text-sm font-bold text-[#e7e9ea]">Live Feed</h2>
            </div>
            <PostFeed />
          </section>
        </div>
      </main>
    </div>
  );
}
