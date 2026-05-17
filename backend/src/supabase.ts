import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { config } from "./config";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  realtime: { transport: ws as any },
});

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
  created_at: string;
  received_at: string;
}

export interface StreamLog {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
}

export async function logStreamEvent(eventType: string, message?: string) {
  const { error } = await supabase.from("stream_logs").insert({
    event_type: eventType,
    message: message || null,
  });
  if (error) {
    console.error("[DB] Failed to log stream event:", error.message);
  }
}
