import { config } from "./config";

const BASE_URL = "https://api.x.com/2";
const RULES_URL = `${BASE_URL}/tweets/search/stream/rules`;
const STREAM_URL = `${BASE_URL}/tweets/search/stream`;

function headers(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${config.xBearerToken}`,
  };
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

// ── Rule Types ──────────────────────────────────────────────────────────

export interface XRule {
  id: string;
  value: string;
  tag?: string;
}

export interface XRuleMeta {
  sent: string;
  summary: {
    created: number;
    not_created: number;
    valid: number;
    invalid: number;
  };
}

// ── Rule Management ─────────────────────────────────────────────────────

export async function getRules(): Promise<{ data: XRule[]; meta: XRuleMeta }> {
  const res = await fetch(RULES_URL, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET rules failed (${res.status}): ${body}`);
  }
  const json: any = await res.json();
  return { data: json.data || [], meta: json.meta };
}

export async function addRules(
  rules: { value: string; tag?: string }[]
): Promise<{ data: XRule[]; meta: XRuleMeta }> {
  const res = await fetch(RULES_URL, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify({ add: rules }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST add rules failed (${res.status}): ${body}`);
  }
  const json: any = await res.json();
  return { data: json.data || [], meta: json.meta };
}

export async function deleteRules(ids: string[]): Promise<void> {
  const res = await fetch(RULES_URL, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify({ delete: { ids } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST delete rules failed (${res.status}): ${body}`);
  }
}

// ── Stream Connection ───────────────────────────────────────────────────

export interface StreamOptions {
  tweetFields?: string[];
  expansions?: string[];
  userFields?: string[];
  mediaFields?: string[];
}

export async function connectStream(
  options: StreamOptions = {}
): Promise<Response> {
  const params = new URLSearchParams();
  if (options.tweetFields?.length) {
    params.set("tweet.fields", options.tweetFields.join(","));
  }
  if (options.expansions?.length) {
    params.set("expansions", options.expansions.join(","));
  }
  if (options.userFields?.length) {
    params.set("user.fields", options.userFields.join(","));
  }
  if (options.mediaFields?.length) {
    params.set("media.fields", options.mediaFields.join(","));
  }

  const url = params.toString()
    ? `${STREAM_URL}?${params.toString()}`
    : STREAM_URL;

  const res = await fetch(url, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stream connection failed (${res.status}): ${body}`);
  }

  return res;
}
