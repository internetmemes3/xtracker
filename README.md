# XTracker — Real-Time X Post Tracker

A personal dashboard that monitors X (Twitter) accounts in real-time using the X API v2 Filtered Stream. Posts appear live the moment they're published.

## Architecture

```
X Filtered Stream (persistent HTTP)
        |
Node.js backend (runs 24/7 on Railway)
        |
PostgreSQL (Supabase) + Supabase Realtime
        |
Next.js frontend (Vercel)
```

## Prerequisites

- **Node.js 18+** (uses native `fetch` with streaming)
- **Supabase project** (free tier works) — [supabase.com](https://supabase.com)
- **X API access** (pay-per-use) — [developer.x.com](https://developer.x.com)
  - You need a **Bearer Token** (App-Only auth)
  - Pay-per-use: $0.005/post, 1,000 rules max, 1 stream connection

## Setup

### 1. Create the Supabase database

Run `supabase/migrations/001_initial.sql` in your Supabase SQL Editor to create tables and enable Realtime.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your X_BEARER_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

The backend starts an Express API on port 3001 **and** a persistent stream consumer.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Add an account** in the UI (e.g. `elonmusk`)
2. The backend creates a `from:elonmusk` rule via the X API
3. The persistent stream receives matching posts in real-time
4. Posts are stored in Supabase (PostgreSQL)
5. Supabase Realtime pushes new posts to the browser instantly

## API Endpoints (Backend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts` | List tracked accounts |
| POST | `/api/accounts` | Add account `{ username, keywords? }` |
| DELETE | `/api/accounts/:id` | Remove account + rule |
| PUT | `/api/accounts/:id/keywords` | Update keywords `{ keywords }` |
| GET | `/api/rules` | Get live rules from X API |
| GET | `/api/posts?limit=50` | Get recent posts |
| GET | `/api/stream/status` | Stream connection status |
| GET | `/api/stream/logs` | Stream event logs |

## Key Technical Details

- **Stream connection**: Persistent HTTP chunked transfer from X API. NOT a WebSocket.
- **Reconnection**: Exponential backoff (1s to 5min max). Disconnects lose data — no backfill.
- **Heartbeat monitoring**: X sends blank lines every 20s. If none for 30s, force reconnect.
- **Rule sync**: On cold start, the backend checks which DB rules are still active on X and re-registers missing ones.
- **Deduplication**: X deduplicates within a 24h UTC window. Posts are also upserted by `tweet_id`.

## Deployment

### Backend (Railway)

The backend must run as a **persistent process** (not serverless). Deploy to Railway (~$5/mo):

1. Create a new Railway project
2. Connect your repo, set root directory to `backend`
3. Set environment variables
4. Build: `npm run build`, Start: `npm start`

### Frontend (Vercel)

1. Import repo to Vercel
2. Set root directory to `frontend`
3. Set environment variables
4. Deploy

## Phase 2 (Multi-User SaaS)

When expanding to multiple users, the single stream connection serves all users. The backend fans out incoming posts by matching them against each user's tracked accounts and keyword filters, then pushes to per-user Supabase Realtime channels.
