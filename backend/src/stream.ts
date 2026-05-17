import { connectStream, getRules } from "./twitter-api";
import { supabase, logStreamEvent } from "./supabase";

// ── Types ───────────────────────────────────────────────────────────────

interface StreamTweet {
  data: {
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    attachments?: {
      media_keys?: string[];
    };
  };
  includes?: {
    users?: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
    }[];
    media?: {
      media_key: string;
      type: string;
      url?: string;
      preview_image_url?: string;
    }[];
  };
  matching_rules?: { id: string; tag?: string }[];
}

// ── State ───────────────────────────────────────────────────────────────

let isRunning = false;
let waitingForRules = false;
let retryCount = 0;
let lastHeartbeat = Date.now();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let currentAbortController: AbortController | null = null;

const MAX_RETRY_DELAY_MS = 300_000; // 5 minutes
const BASE_RETRY_MS = 1_000;
const HEARTBEAT_TIMEOUT_MS = 30_000; // X sends heartbeats every 20s

export function getStreamStatus() {
  return {
    isRunning,
    waitingForRules,
    retryCount,
    lastHeartbeat: new Date(lastHeartbeat).toISOString(),
  };
}

// ── Main Loop ───────────────────────────────────────────────────────────

export async function startStream() {
  if (isRunning) {
    console.log("[Stream] Already running.");
    return;
  }
  isRunning = true;
  console.log("[Stream] Starting filtered stream consumer...");
  await logStreamEvent("starting", "Stream consumer starting");
  connectWithRetry();
}

export function stopStream() {
  isRunning = false;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (currentAbortController) currentAbortController.abort();
  console.log("[Stream] Stopped.");
  logStreamEvent("stopped", "Stream consumer stopped");
}

const RULE_POLL_INTERVAL_MS = 15_000; // check for rules every 15s when idle

async function connectWithRetry() {
  while (isRunning) {
    // Don't attempt to connect if there are no rules — X API returns 409
    try {
      const { data: rules } = await getRules();
      if (!rules || rules.length === 0) {
        if (!waitingForRules) {
          console.log("[Stream] No rules defined yet — waiting for accounts to be added...");
          await logStreamEvent("idle", "No rules defined, waiting");
        }
        waitingForRules = true;
        await sleep(RULE_POLL_INTERVAL_MS);
        continue;
      }
      waitingForRules = false;
    } catch (checkErr: any) {
      console.warn(`[Stream] Could not check rules: ${checkErr.message}`);
    }

    try {
      await consume();
    } catch (err: any) {
      if (!isRunning) break;
      const delay = Math.min(
        BASE_RETRY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      );
      retryCount++;
      const msg = `Disconnected: ${err.message}. Retry #${retryCount} in ${delay / 1000}s`;
      console.error(`[Stream] ${msg}`);
      await logStreamEvent("disconnected", msg);
      await sleep(delay);
    }
  }
}

async function consume() {
  console.log("[Stream] Connecting...");
  await logStreamEvent("connecting", `Attempt #${retryCount + 1}`);

  const response = await connectStream({
    tweetFields: ["created_at", "author_id", "text", "attachments"],
    expansions: ["author_id", "attachments.media_keys"],
    userFields: ["username", "name", "profile_image_url"],
    mediaFields: ["url", "preview_image_url", "type"],
  });

  if (!response.body) throw new Error("Response body is null");

  // Successfully connected — reset retry counter
  retryCount = 0;
  lastHeartbeat = Date.now();
  console.log("[Stream] Connected. Listening for posts...");
  await logStreamEvent("connected", "Stream connected successfully");

  // Start heartbeat monitor
  startHeartbeatMonitor();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (isRunning) {
      const { value, done } = await reader.read();
      if (done) {
        throw new Error("Stream ended (done=true)");
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || ""; // keep the last incomplete chunk

      for (const line of lines) {
        if (line.trim() === "") {
          // heartbeat
          lastHeartbeat = Date.now();
          continue;
        }

        lastHeartbeat = Date.now();

        try {
          const data = JSON.parse(line) as StreamTweet;
          await handlePost(data);
        } catch (parseErr) {
          console.warn("[Stream] Failed to parse line:", line.substring(0, 200));
        }
      }
    }
  } finally {
    reader.releaseLock();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
}

// ── Heartbeat Monitor ───────────────────────────────────────────────────

function startHeartbeatMonitor() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    const elapsed = Date.now() - lastHeartbeat;
    if (elapsed > HEARTBEAT_TIMEOUT_MS) {
      console.warn(
        `[Stream] No heartbeat for ${elapsed / 1000}s — forcing reconnect`
      );
      logStreamEvent(
        "stall",
        `No heartbeat for ${elapsed / 1000}s, reconnecting`
      );
      if (currentAbortController) currentAbortController.abort();
    }
  }, 10_000);
}

// ── Post Handler ────────────────────────────────────────────────────────

async function handlePost(tweet: StreamTweet) {
  const { data, includes, matching_rules } = tweet;
  if (!data?.id || !data?.text) return;

  // Debug: log raw attachments and media includes
  console.log(`[Debug] Tweet ${data.id} attachments:`, JSON.stringify(data.attachments));
  console.log(`[Debug] Tweet ${data.id} includes.media:`, JSON.stringify(includes?.media));

  const author = includes?.users?.find((u) => u.id === data.author_id);
  const username = author?.username || "unknown";
  const displayName = author?.name || username;
  const profileImageUrl = author?.profile_image_url || null;
  const tweetUrl = `https://x.com/${username}/status/${data.id}`;

  const ruleIds = matching_rules?.map((r) => r.id) || [];
  const ruleTags = matching_rules?.map((r) => r.tag || "").filter(Boolean) || [];

  // Extract media URLs from includes
  const mediaKeys = data.attachments?.media_keys || [];
  const mediaUrls: string[] = [];
  if (mediaKeys.length && includes?.media) {
    for (const key of mediaKeys) {
      const media = includes.media.find((m) => m.media_key === key);
      if (media) {
        const url = media.url || media.preview_image_url;
        if (url) mediaUrls.push(url);
      }
    }
  }
  console.log(`[Debug] Tweet ${data.id} extracted mediaUrls:`, mediaUrls);

  // Determine matched keywords by checking post text against tracked keywords
  const matchedKeywords = await findMatchedKeywords(data.text, username);

  const post = {
    tweet_id: data.id,
    author_username: username,
    author_display_name: displayName,
    author_profile_image_url: profileImageUrl,
    text: data.text,
    tweet_url: tweetUrl,
    matched_rule_ids: ruleIds,
    matched_rule_tags: ruleTags,
    matched_keywords: matchedKeywords,
    media_urls: mediaUrls,
    created_at: data.created_at || new Date().toISOString(),
  };

  const { error } = await supabase
    .from("posts")
    .upsert(post, { onConflict: "tweet_id" });

  if (error) {
    console.error("[DB] Failed to insert post:", error.message);
  } else {
    console.log(`[Post] @${username}: ${data.text.substring(0, 80)}...`);
  }
}

async function findMatchedKeywords(
  text: string,
  authorUsername: string
): Promise<string[]> {
  const { data: accounts } = await supabase
    .from("tracked_accounts")
    .select("keywords")
    .eq("username", authorUsername.toLowerCase())
    .single();

  if (!accounts?.keywords?.length) return [];

  const lowerText = text.toLowerCase();
  return accounts.keywords.filter((kw: string) =>
    lowerText.includes(kw.toLowerCase())
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
