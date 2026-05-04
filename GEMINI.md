# FTTx RX Power Monitor

## Project Overview

FTTx RX Power Monitor is a backend service built with TypeScript, Hono, and designed to run on the Bun runtime. Its primary purpose is to continuously poll a third-party API for RX power metrics (measured in dBm) across FTTx circuits, and persist these measurements into a PostgreSQL database. It concurrently syncs subscriber information and exposes the collected data as Prometheus metrics via an HTTP endpoint.

### Key Components:
- **Metrics Server (`src/server.ts`)**: A Hono-based HTTP server exposing `/metrics` (Prometheus format) and `/health` endpoints. It reads the latest measurements directly from the database upon each scrape request.
- **Poller (`src/poller.ts`)**: A background worker that periodically fetches Rx power data from a third-party endpoint for each circuit and stores it in the `rx_power` table.
- **Subscribers Sync (`src/subscribers_sync.ts`)**: A background worker that periodically synchronizes subscriber data from a designated API and stores it in the `subscribers` table.
- **Database (`src/db.ts`, `sql/schema.sql`)**: PostgreSQL is used to persist measurements and subscriber mappings. The metrics are state-free in memory and always read from the database.

## Architecture & Code Structure

The project follows a standard layered architecture:
- `src/clients/`: Handles external HTTP requests (e.g., to the third-party Rx power endpoint and subscribers API).
- `src/controllers/`: Handles HTTP route logic (e.g., formatting Prometheus metrics).
- `src/services/`: Contains the core business logic (polling mechanism, subscriber synchronization).
- `src/repositories/`: Manages database interactions (e.g., upserting Rx measurements, fetching latest records).
- `sql/`: Contains raw SQL scripts for schema initialization.

## Building and Running

### Prerequisites
- [Bun](https://bun.sh/)
- PostgreSQL database

### Setup Instructions
1. **Environment Setup**: Copy `.env.example` to `.env` and populate all necessary environment variables:
   - `DATABASE_URL`
   - `THIRD_PARTY_API_BASE`, `X_API_KEY`
   - `SUBSCRIBER_API_BASE`, `SUBSCRIBER_BEARER_TOKEN`
   - `OPERATOR_ID`
   - `METRICS_PORT` (defaults to 3000)
2. **Install Dependencies**:
   ```bash
   bun install
   ```
3. **Database Initialization**: Apply the schema to your Postgres database:
   ```bash
   psql $DATABASE_URL -f sql/schema.sql
   ```

### Execution Commands
- **Start the full application** (Metrics server + background workers):
  ```bash
  bun run start
  ```
- **Run standalone modules**:
  - Run poller only: `bun run poller`
  - Run subscribers sync only: `bun run sync-subscribers`

## Development Conventions

- **Runtime & Tooling**: Uses Bun exclusively as the runtime and package manager.
- **Language**: TypeScript is used for type safety and modern JavaScript features.
- **Configuration**: Strictly environment-variable driven (no hardcoded credentials or external config files).
- **State Management**: The application is designed to be stateless in memory regarding metrics. The source of truth is always the PostgreSQL database.
- **Database Access**: Uses raw SQL queries via the `pg` driver (no heavy ORM) managed in repository files.
