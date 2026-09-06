# Redis Portal

A monitoring and query-execution web portal for Redis, built with Next.js + `ioredis`.

## Features

- **Dashboard** — live-refreshing memory usage, connected clients, ops/sec, hit rate, keyspace, uptime, and replication role.
- **Key browser** — scan/search keys by pattern, view type/TTL/value, edit string values, update TTL, delete keys.
- **Query console** — run arbitrary Redis commands from the browser, redis-cli style, with command history (↑/↓) and command autocomplete (start typing, then `Tab` to accept, arrow keys to navigate suggestions).
- **Slow log & command stats** — inspect `SLOWLOG` entries and per-command `COMMANDSTATS`, with a reset button.
- **Settings** — change the Redis host/port/password/TLS at runtime; the new connection is tested before it's saved.

Login is required for every page and API route (a single admin account, configured via env vars).

## Run with Docker (recommended)

This spins up both Redis and the portal in containers, networked together.

```bash
cp .env.example .env.local   # then edit ADMIN_PASSWORD and AUTH_SECRET
docker compose up -d --build
```

Open http://localhost:3000 and log in with the credentials from `.env.local`.

- The `app` container talks to the `redis` container over the internal Compose network (`REDIS_HOST=redis`), regardless of what's in `.env.local`.
- Redis data persists in the `redis-local-data` volume; the portal's own connection-settings override persists in the `portal-data` volume.
- Rebuild after code changes: `docker compose up -d --build`.
- Stop everything: `docker compose down` (add `-v` to also delete both volumes).

## Run locally without Docker

Prerequisite: a Redis server reachable from your machine, e.g.:

```bash
docker run -d \
  --name redis-local \
  -p 6379:6379 \
  -v redis-local-data:/data \
  --restart always \
  redis redis-server --appendonly yes
```

Then:

```bash
npm install
cp .env.example .env.local   # then edit ADMIN_PASSWORD and AUTH_SECRET
npm run dev
```

Open http://localhost:3000.

## Configuration

Credentials and connection defaults live in `.env.local` (gitignored — copy it from `.env.example`):

- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — login for the portal.
- `AUTH_SECRET` — signs the session cookie. Generate one with `openssl rand -hex 32`.
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` — initial Redis connection. Ignored by the Docker Compose `app` service (which always points at the `redis` service). Can also be changed later from the **Settings** page, which persists overrides to `data/connection.json` (gitignored, or the `portal-data` volume under Docker).

## Notes

- The query console executes any Redis command with the admin's full privileges — treat it like `redis-cli`, including destructive commands (`FLUSHALL`, `FLUSHDB`, etc.).
- Sessions are stateless JWT cookies; "log out" clears the browser cookie but doesn't revoke a copied token before its 7-day expiry. Fine for local/trusted use; rotate `AUTH_SECRET` to invalidate all sessions if needed.
