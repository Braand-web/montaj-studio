-- Montaj Studio billing: credit wallets, usage ledger, purchases, daily counters.
-- Plain SQL (SQLite / D1 today, portable to Postgres / Supabase later: INTEGER epoch ms,
-- TEXT ids, no SQLite-only types). owner_user_id will hold the Supabase auth user id.

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,                 -- device wallet id today, user-linked with accounts later
  owner_user_id TEXT,                  -- Supabase auth.users.id (later)
  plan TEXT NOT NULL DEFAULT 'free',   -- free | creator | pro | team
  seats INTEGER NOT NULL DEFAULT 1,
  sub_credits INTEGER NOT NULL DEFAULT 0,   -- monthly plan credits (reset each period)
  pack_credits INTEGER NOT NULL DEFAULT 0,  -- purchased packs (expire after 12 months)
  pack_expires_at INTEGER,
  period_start INTEGER NOT NULL,
  stripe_customer TEXT,
  stripe_subscription TEXT,
  created_ip TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS wallets_sub ON wallets (stripe_subscription);
CREATE INDEX IF NOT EXISTS wallets_owner ON wallets (owner_user_id);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,          -- ai | scrape | transcribe | grant | refill | purchase | plan | refund
  credits INTEGER NOT NULL,    -- negative = debit
  balance_after INTEGER NOT NULL,
  model TEXT, tier TEXT,
  tokens_in INTEGER, tokens_out INTEGER, cache_read INTEGER, cache_write INTEGER,
  cost_usd REAL,
  ref TEXT
);
CREATE INDEX IF NOT EXISTS ledger_wallet_at ON ledger (wallet_id, at DESC);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,          -- provider event / session / invoice id (idempotency)
  wallet_id TEXT NOT NULL,
  provider TEXT NOT NULL,       -- stripe | mobile_money
  item TEXT NOT NULL,
  amount_cents INTEGER, currency TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily (
  key TEXT NOT NULL,            -- wallet id, or ip:<address> for wallet creation
  day TEXT NOT NULL,            -- YYYY-MM-DD (UTC)
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);
