"use client";

import { useState } from "react";
import {
  removeAccount,
  updateKeywords,
  type TrackedAccount,
} from "@/lib/api";
import { Trash2, Tag, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  accounts: TrackedAccount[];
  onRemoved: (id: string) => void;
  onUpdated: (account: TrackedAccount) => void;
}

export default function RulesList({ accounts, onRemoved, onUpdated }: Props) {
  if (accounts.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[#71767b]">
        No accounts tracked yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-[#2f3336]">
      {accounts.map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          onRemoved={onRemoved}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}

function AccountRow({
  account,
  onRemoved,
  onUpdated,
}: {
  account: TrackedAccount;
  onRemoved: (id: string) => void;
  onUpdated: (account: TrackedAccount) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingKw, setEditingKw] = useState(false);
  const [kwInput, setKwInput] = useState(account.keywords.join(", "));
  const [savingKw, setSavingKw] = useState(false);

  const handleRemove = async () => {
    if (!confirm(`Stop tracking @${account.username}?`)) return;
    setRemoving(true);
    try {
      await removeAccount(account.id);
      onRemoved(account.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRemoving(false);
    }
  };

  const handleSaveKeywords = async () => {
    setSavingKw(true);
    try {
      const keywords = kwInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const updated = await updateKeywords(account.id, keywords);
      onUpdated(updated);
      setEditingKw(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingKw(false);
    }
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm"
        >
          <span className="font-bold text-[#e7e9ea]">
            @{account.username}
          </span>
          {account.keywords.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#71767b]">
              <Tag className="h-3 w-3" />
              {account.keywords.length} keyword
              {account.keywords.length > 1 ? "s" : ""}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#71767b]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#71767b]" />
          )}
        </button>

        <button
          onClick={handleRemove}
          disabled={removing}
          className="rounded p-1.5 text-[#71767b] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 pl-0">
          <div className="text-xs text-[#71767b]">
            <span className="font-medium">Rule:</span>{" "}
            <code className="rounded bg-[#1d1f23] px-1.5 py-0.5 text-[#e7e9ea]">
              {account.rule_value || "pending"}
            </code>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#71767b]">
              Keywords
            </label>
            {editingKw ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  className="flex-1 rounded border border-[#2f3336] bg-[#16181c] px-2 py-1 text-xs text-[#e7e9ea] outline-none focus:border-brand"
                />
                <button
                  onClick={handleSaveKeywords}
                  disabled={savingKw}
                  className="rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {savingKw ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingKw(false)}
                  className="rounded border border-[#2f3336] px-3 py-1 text-xs text-[#71767b] hover:text-[#e7e9ea]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setKwInput(account.keywords.join(", "));
                  setEditingKw(true);
                }}
                className="text-xs text-brand hover:underline"
              >
                {account.keywords.length > 0
                  ? account.keywords.join(", ")
                  : "Add keywords..."}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
