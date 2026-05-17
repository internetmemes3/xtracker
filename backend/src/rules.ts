import { supabase, TrackedAccount } from "./supabase";
import * as xApi from "./twitter-api";

// ── Build Rule Value ────────────────────────────────────────────────────

function buildRuleValue(username: string, keywords: string[]): string {
  const base = `from:${username}`;
  if (keywords.length === 0) return base;
  const kw = keywords.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" OR ");
  return `${base} (${kw})`;
}

function buildRuleTag(username: string): string {
  return `track-${username.toLowerCase()}`;
}

// ── Sync Rules ──────────────────────────────────────────────────────────

export async function syncAccountRule(account: TrackedAccount): Promise<void> {
  const ruleValue = buildRuleValue(account.username, account.keywords);
  const ruleTag = buildRuleTag(account.username);

  // Delete old rule if it exists
  if (account.rule_id) {
    try {
      await xApi.deleteRules([account.rule_id]);
      console.log(`[Rules] Deleted old rule ${account.rule_id} for @${account.username}`);
    } catch (err: any) {
      console.warn(`[Rules] Failed to delete old rule: ${err.message}`);
    }
  }

  // Add new rule
  const result = await xApi.addRules([{ value: ruleValue, tag: ruleTag }]);
  const newRule = result.data?.[0];

  if (!newRule) {
    throw new Error(`Failed to create rule for @${account.username}`);
  }

  // Update DB with rule info
  await supabase
    .from("tracked_accounts")
    .update({
      rule_id: newRule.id,
      rule_value: newRule.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  console.log(
    `[Rules] Created rule ${newRule.id} for @${account.username}: ${newRule.value}`
  );
}

// ── Add Account ─────────────────────────────────────────────────────────

export async function addAccount(
  username: string,
  keywords: string[] = []
): Promise<TrackedAccount> {
  const cleanUsername = username.replace(/^@/, "").toLowerCase();

  // Check if already tracked
  const { data: existing } = await supabase
    .from("tracked_accounts")
    .select("*")
    .eq("username", cleanUsername)
    .single();

  if (existing) {
    throw new Error(`@${cleanUsername} is already being tracked`);
  }

  // Insert into DB
  const { data: account, error } = await supabase
    .from("tracked_accounts")
    .insert({ username: cleanUsername, keywords })
    .select()
    .single();

  if (error || !account) {
    throw new Error(`Failed to insert account: ${error?.message}`);
  }

  // Create X API rule
  await syncAccountRule(account as TrackedAccount);

  // Fetch updated account
  const { data: updated } = await supabase
    .from("tracked_accounts")
    .select("*")
    .eq("id", account.id)
    .single();

  return updated as TrackedAccount;
}

// ── Remove Account ──────────────────────────────────────────────────────

export async function removeAccount(accountId: string): Promise<void> {
  const { data: account } = await supabase
    .from("tracked_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  // Delete X API rule
  if (account.rule_id) {
    try {
      await xApi.deleteRules([account.rule_id]);
      console.log(`[Rules] Deleted rule for @${account.username}`);
    } catch (err: any) {
      console.warn(`[Rules] Failed to delete rule: ${err.message}`);
    }
  }

  // Delete from DB
  await supabase.from("tracked_accounts").delete().eq("id", accountId);
}

// ── Update Keywords ─────────────────────────────────────────────────────

export async function updateKeywords(
  accountId: string,
  keywords: string[]
): Promise<TrackedAccount> {
  const { data: account } = await supabase
    .from("tracked_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  // Update DB
  await supabase
    .from("tracked_accounts")
    .update({ keywords, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  // Re-sync rule with new keywords
  const updated = { ...account, keywords } as TrackedAccount;
  await syncAccountRule(updated);

  // Fetch final state
  const { data: final } = await supabase
    .from("tracked_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  return final as TrackedAccount;
}

// ── List Accounts ───────────────────────────────────────────────────────

export async function listAccounts(): Promise<TrackedAccount[]> {
  const { data, error } = await supabase
    .from("tracked_accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list accounts: ${error.message}`);
  return (data || []) as TrackedAccount[];
}

// ── Get X API Rules (live from X) ───────────────────────────────────────

export async function getActiveRules(): Promise<xApi.XRule[]> {
  const result = await xApi.getRules();
  return result.data;
}

// ── Restore rules on cold start ─────────────────────────────────────────

export async function restoreRules(): Promise<void> {
  console.log("[Rules] Checking for rules to restore...");
  const accounts = await listAccounts();
  const { data: xRules } = await xApi.getRules();
  const xRuleIds = new Set(xRules.map((r) => r.id));

  for (const account of accounts) {
    if (account.rule_id && xRuleIds.has(account.rule_id)) {
      console.log(`[Rules] Rule for @${account.username} still active on X`);
      continue;
    }
    console.log(`[Rules] Restoring rule for @${account.username}...`);
    try {
      await syncAccountRule(account);
    } catch (err: any) {
      console.error(
        `[Rules] Failed to restore rule for @${account.username}: ${err.message}`
      );
    }
  }
  console.log("[Rules] Restore complete.");
}
