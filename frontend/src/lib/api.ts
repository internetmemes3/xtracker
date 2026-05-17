const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface TrackedAccount {
  id: string;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  keywords: string[];
  rule_id: string | null;
  rule_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  tweet_id: string;
  author_username: string;
  author_display_name: string | null;
  author_profile_image_url: string | null;
  text: string;
  tweet_url: string;
  matched_rule_ids: string[];
  matched_rule_tags: string[];
  matched_keywords: string[];
  media_urls: string[];
  created_at: string;
  received_at: string;
}

export interface XRule {
  id: string;
  value: string;
  tag?: string;
}

export interface StreamStatus {
  isRunning: boolean;
  waitingForRules: boolean;
  retryCount: number;
  lastHeartbeat: string;
}

// ── API Calls ───────────────────────────────────────────────────────────

export async function getAccounts(): Promise<TrackedAccount[]> {
  const res = await request<{ data: TrackedAccount[] }>("/accounts");
  return res.data;
}

export async function addAccount(
  username: string,
  keywords: string[] = []
): Promise<TrackedAccount> {
  const res = await request<{ data: TrackedAccount }>("/accounts", {
    method: "POST",
    body: JSON.stringify({ username, keywords }),
  });
  return res.data;
}

export async function removeAccount(id: string): Promise<void> {
  await request(`/accounts/${id}`, { method: "DELETE" });
}

export async function updateKeywords(
  id: string,
  keywords: string[]
): Promise<TrackedAccount> {
  const res = await request<{ data: TrackedAccount }>(
    `/accounts/${id}/keywords`,
    {
      method: "PUT",
      body: JSON.stringify({ keywords }),
    }
  );
  return res.data;
}

export async function getRules(): Promise<XRule[]> {
  const res = await request<{ data: XRule[] }>("/rules");
  return res.data;
}

export async function getPosts(limit = 50): Promise<Post[]> {
  const res = await request<{ data: Post[] }>(`/posts?limit=${limit}`);
  return res.data;
}

export async function getStreamStatus(): Promise<StreamStatus> {
  const res = await request<{ data: StreamStatus }>("/stream/status");
  return res.data;
}
