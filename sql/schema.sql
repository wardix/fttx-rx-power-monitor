-- Schema for rx_power monitor

CREATE TABLE IF NOT EXISTS rx_power (
  id SERIAL PRIMARY KEY,
  circuit_id TEXT UNIQUE,
  rx_power_dbm NUMERIC,
  measured_at TIMESTAMPTZ,
  source TEXT,
  raw JSONB
);

CREATE TABLE IF NOT EXISTS subscribers (
  subscriber_id TEXT,
  subscriber_name TEXT,
  circuit_id TEXT,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (subscriber_id, circuit_id)
);

-- Optional index to speed lookups by circuit_id
CREATE INDEX IF NOT EXISTS idx_subscribers_circuit_id ON subscribers(circuit_id);
