-- Users' own provider API keys (Pro and Team plans), encrypted with AES-256-GCM.
-- The key never leaves the server once saved; only its last 4 characters are shown back.
CREATE TABLE IF NOT EXISTS provider_keys (
  wallet_id TEXT NOT NULL,
  provider TEXT NOT NULL,       -- anthropic (live); openai, fal, elevenlabs… later
  ciphertext TEXT NOT NULL,     -- base64(AES-GCM(key)), additional data = wallet_id|provider
  iv TEXT NOT NULL,             -- base64, 12 bytes
  last4 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (wallet_id, provider)
);
