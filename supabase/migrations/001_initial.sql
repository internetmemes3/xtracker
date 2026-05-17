-- Tracked X accounts
CREATE TABLE tracked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  profile_image_url TEXT,
  keywords TEXT[] DEFAULT '{}',
  rule_id TEXT,
  rule_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Posts received from the stream
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT NOT NULL UNIQUE,
  author_username TEXT NOT NULL,
  author_display_name TEXT,
  author_profile_image_url TEXT,
  text TEXT NOT NULL,
  tweet_url TEXT NOT NULL,
  matched_rule_ids TEXT[] DEFAULT '{}',
  matched_rule_tags TEXT[] DEFAULT '{}',
  matched_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Stream connection logs
CREATE TABLE stream_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_posts_received_at ON posts (received_at DESC);
CREATE INDEX idx_posts_author ON posts (author_username);
CREATE INDEX idx_stream_logs_created ON stream_logs (created_at DESC);

-- Enable Supabase Realtime on posts and stream_logs
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_logs;
