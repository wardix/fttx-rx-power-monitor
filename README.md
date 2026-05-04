FTTx RX Power Monitor (TypeScript + Hono, Bun runtime)

Quickstart:
1. Install Bun: https://bun.sh
2. Copy .env.example to .env and set environment variables (DATABASE_URL, THIRD_PARTY_API_BASE, SUBSCRIBER_API_BASE, X_API_KEY, SUBSCRIBER_BEARER_TOKEN, OPERATOR_ID, ...)
3. Install dependencies: bun install
4. Initialize DB schema: psql $DATABASE_URL -f sql/schema.sql
5. Start server (starts metrics server + background workers): bun run start

Notes:
- Server starts an HTTP metrics server (/metrics) and two background workers: a serial poller and a subscribers-sync job (default every 4 hours).
- Poller queries the third-party Rx power endpoint per circuit and persists the latest measurement to Postgres (rx_power table). The poller does not update in-memory Prometheus metrics.
- /metrics reads the latest measurements from the database on each scrape and exposes a single Prometheus gauge: fttx_rx_power_dbm.
  Labels: circuit_id, subscriber_id, subscriber_name, operator='fbstar', fttx='yes'.
  Only this metric is exported by this service.
- Subscribers-sync uses Bearer token (Authorization: Bearer <token>). If OPERATOR_ID is set in environment, it will be appended as operator_id query parameter to the subscribers API requests.
- Configuration via environment variables. No Docker required; run as a system service or Bun process.
