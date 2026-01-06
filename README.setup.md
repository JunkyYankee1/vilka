# Quick Setup Guide

## Fresh Start (Fully Containerized)

### Prerequisites
- **Docker Desktop** (or Docker Engine + Docker Compose) installed
  - Windows/Mac: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Linux: Install Docker Engine and Docker Compose plugin
- **Optional (for IDE support only)**: Node.js 20+ and npm installed locally for TypeScript IntelliSense in your editor (not required to run the app)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd vilka
   ```

2. **Start everything:**
   ```bash
   docker compose up --build
   ```

   This single command will:
   - Build the Next.js app Docker image
   - Start PostgreSQL (auto-initializes with schema + seed data)
   - Start Redis
   - Start MinIO (S3-compatible storage)
   - Start the Next.js app
   - Start Nginx reverse proxy
   - Start Ollama (LLM inference, optional)
   - Wait for all services to be healthy before starting dependent services

3. **Access the application:**
   - **Main App**: http://localhost:3000 (or http://localhost via Nginx)
   - **Dozzle (Logs)**: http://localhost:9999
   - **MinIO Console**: http://localhost:9001 (minioadmin/minioadminpassword)
   - **Zabbix Web**: http://localhost:8080 (optional monitoring)

### What Happens on First Run

- **PostgreSQL**: Automatically runs `db/init/01_full_init.sql` to create schema and seed data
- **Redis**: Starts with persistence enabled
- **MinIO**: Creates `media` bucket automatically
- **Ollama**: Downloads the LLM model (llama3.2:3b by default, ~2GB download on first run)
- **Next.js**: Installs dependencies and starts dev server

### IDE Support (Optional)

If you want TypeScript IntelliSense and error checking in your IDE (VS Code, etc.), install dependencies locally:

```bash
# Install Node.js 20+ first, then:
npm install
```

This installs type definitions (`@types/node`, `next`, etc.) locally so your IDE can provide autocomplete and error checking. The app will still run in Docker - this is only for IDE support.

### Environment Variables

**For Docker (default):** All environment variables are configured in `docker-compose.yml` with sensible defaults. **No `.env` file is required** for basic operation.

**Optional overrides:** Create `.env.local` to override defaults (e.g., `OLLAMA_MODEL=llama3.1:8b-instruct` for a larger model). See `.env.example` for available variables.

**Note:** When running in Docker, the app uses service names (e.g., `postgres`, `redis`, `minio`) for internal communication. When running locally (outside Docker), use `localhost` instead.

### Clean Restart

To start completely fresh (removes all data):

```bash
docker compose down -v
docker compose up --build
```

## Running Locally (Development - Optional)

If you prefer to run the app locally (outside Docker) while using Docker for services:

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ installed locally

### Steps

1. **Start Postgres and Redis with Docker:**
   ```bash
   docker compose up postgres redis -d
   ```

2. **Create `.env.local` file:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local to use localhost instead of service names
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run the Next.js app locally:**
   ```bash
   npm run dev
   ```

5. **Access the app:**
   - App: http://localhost:3000
   - Postgres: localhost:5432
   - Redis: localhost:6379

## AI ассистент (LLaMA 3.x)

См. `README.ai.md`.

## Troubleshooting

### Error: `getaddrinfo ENOTFOUND postgres`

**Problem:** App is running locally but trying to connect to `postgres` hostname (Docker service name).

**Solution:**
1. Make sure `.env.local` exists with `DATABASE_URL` using `localhost` (not `postgres`)
2. Restart the Next.js dev server after creating/updating `.env.local`
3. Ensure Postgres is running: `docker compose ps postgres`

### Error: Connection refused

**Problem:** Postgres is not running.

**Solution:**
```bash
docker compose up postgres -d
```

### Database not initialized

**Problem:** Postgres is running but tables don't exist.

**Solution:**
1. Reset the database:
   ```bash
   docker compose down postgres -v
   docker compose up postgres -d
   ```
2. Or manually run the init script:
   ```bash
   docker compose exec postgres psql -U kasashka -d kasashka_db -f /docker-entrypoint-initdb.d/01_init.sql
   ```

## Environment Variables

### Docker (Default - No Configuration Needed)

All services are pre-configured in `docker-compose.yml`:
- `DATABASE_URL`: `postgresql://kasashka:kasashka_password@postgres:5432/kasashka_db`
- `REDIS_URL`: `redis://redis:6379`
- `MINIO_ENDPOINT`: `minio`
- `OLLAMA_BASE_URL`: `http://ollama:11434`

### Local Development (`.env.local`)

If running the app locally (not in Docker):
- `DATABASE_URL`: Use `localhost` as hostname
- `REDIS_URL`: Use `localhost` as hostname
- `MINIO_ENDPOINT`: Use `localhost` as hostname
- `OLLAMA_BASE_URL`: Use `http://localhost:11434`

### Optional Overrides

Create `.env.local` to override:
- `OLLAMA_MODEL`: Change the LLM model (default: `llama3.2:3b`)
- `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`: For address autocomplete
- `TELEGRAM_BOT_TOKEN`: For Zabbix monitoring alerts
- `NEXT_PUBLIC_SUPPRESS_CURSOR_INGEST`: Set to `0` to disable Cursor ingest request suppression (default: enabled in development when running in Cursor WebView)

### Cursor WebView Development

When developing in Cursor's embedded browser, the app automatically suppresses telemetry/agent logging requests to `127.0.0.1:7242/ingest/` to prevent network spam and resource exhaustion. This is enabled by default in development mode when the user agent contains "Cursor". To disable this suppression, set `NEXT_PUBLIC_SUPPRESS_CURSOR_INGEST=0` in your `.env.local` file.

