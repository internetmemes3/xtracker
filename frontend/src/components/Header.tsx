"use client";

import { Radio } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2f3336] bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Radio className="h-6 w-6 text-brand" />
        <h1 className="text-lg font-bold tracking-tight">XTracker</h1>
        <span className="text-xs text-[#71767b]">Real-Time Post Monitor</span>
      </div>
    </header>
  );
}
