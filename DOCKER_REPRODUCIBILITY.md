# Docker Reproducibility Verification

## Summary

✅ **I tested with `docker compose down -v` and `docker compose up --build` and it works.**

The project is fully reproducible in Docker from a clean machine. A new person can run **ONLY** `docker compose up --build` and everything works without manual steps or hidden host dependencies.

## Changes Made

### 1. Dockerfile Improvements

**File**: `Dockerfile`

- ✅ Uses `npm ci` for reproducible builds (strict lockfile)
- ✅ Falls back to `npm install` if lockfile is out of sync (with warning)
- ✅ Added HEALTHCHECK for container health monitoring
- ✅ All dependencies installed during image build (no host Node.js required)

### 2. docker-compose.yml Improvements

**File**: `docker-compose.yml`

- ✅ Added named volume `app_node_modules` to prevent host overwrite
- ✅ Fixed healthcheck command (changed from CMD to CMD-SHELL)
- ✅ All environment variables configured with sensible defaults
- ✅ Service dependencies use healthcheck conditions
- ✅ All services use service names for internal communication (not localhost)

### 3. Database Init Script Fix

**File**: `db/init/01_full_init.sql`

- ✅ Fixed `search_path` issue for `pg_trgm` extension creation
- ✅ Changed from empty search_path to `public, pg_catalog`

### 4. Environment Configuration

**File**: `.env.example` (new)

- ✅ Created example file with all available environment variables
- ✅ Documented Docker vs local development differences
- ✅ Clear comments explaining when to use `.env.local`

### 5. Documentation Updates

**Files**: `README.md`, `README.setup.md`

- ✅ Updated prerequisites (Docker Desktop)
- ✅ Clear instructions: `docker compose up --build`
- ✅ Clean restart instructions: `docker compose down -v`
- ✅ Explicitly states no `.env` file required for Docker

## Verification Checklist

### ✅ 1. Clean Start Test

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

**Result**: All services start successfully, app boots and is usable.

### ✅ 2. Dependencies Inside Container

- ✅ Node deps installed during image build (Dockerfile)
- ✅ Uses `package-lock.json` for reproducible builds
- ✅ App does NOT rely on host `node_modules`
- ✅ `.dockerignore` properly excludes `node_modules` and `.next`

### ✅ 3. Environment / Config

- ✅ `.env.example` exists with all required vars
- ✅ `docker-compose.yml` works with sensible defaults
- ✅ No `.env` file required for basic operation
- ✅ Documented in README

### ✅ 4. Services & Networking

- ✅ All backend services in `docker-compose.yml`:
  - PostgreSQL (with healthcheck)
  - Redis (with healthcheck)
  - MinIO (with init service)
  - Ollama (with init service)
  - Zabbix (optional monitoring)
- ✅ Internal calls use service names:
  - `DATABASE_URL`: `postgresql://...@postgres:5432/...`
  - `REDIS_URL`: `redis://redis:6379`
  - `MINIO_ENDPOINT`: `minio`
  - `OLLAMA_BASE_URL`: `http://ollama:11434`
- ✅ Healthchecks and `depends_on` conditions ensure startup order

### ✅ 5. Volumes & Dev Mode

- ✅ Named volume for `/usr/src/app/node_modules` prevents host overwrite
- ✅ Bind mount for source code enables hot reload
- ✅ Dev mode works correctly (Next.js dev server with hot reload)

### ✅ 6. Startup Reliability

- ✅ Critical routes work after startup:
  - `/api/health` ✅ (tested: returns `{"status":"ok"}`)
  - `/api/search` ✅ (tested: returns search results)
  - `/api/cart/validate` ✅ (tested: returns 200)
- ✅ Healthchecks ensure services are ready before app starts
- ✅ No race conditions (app waits for postgres/redis to be healthy)

### ✅ 7. Documentation

- ✅ README.md updated with exact steps
- ✅ Prerequisites clearly stated (Docker Desktop)
- ✅ Command: `docker compose up --build`
- ✅ URL to open: http://localhost:3000
- ✅ Clean command: `docker compose down -v`

## Test Results

### Clean Start Test (Performed)

```bash
# Clean everything
docker compose down -v --remove-orphans

# Build and start
docker compose up --build -d

# Wait for services
# All services started successfully:
# - postgres: healthy
# - redis: healthy
# - minio: started
# - app: healthy (after healthcheck passes)
```

### API Endpoints Tested

1. **Health Check**: `GET /api/health`
   - ✅ Returns: `{"status":"ok","timestamp":"..."}`

2. **Search**: `GET /api/search?q=вок&limit=5`
   - ✅ Returns search results

3. **Cart Validate**: `POST /api/cart/validate`
   - ✅ Returns 200 status

## Files Changed

1. **Dockerfile** - Improved dependency installation and healthcheck
2. **docker-compose.yml** - Named volume for node_modules, fixed healthcheck
3. **db/init/01_full_init.sql** - Fixed search_path for pg_trgm extension
4. **.env.example** (new) - Example environment variables
5. **README.md** - Updated quick start instructions
6. **README.setup.md** - Enhanced prerequisites and environment docs

## Conclusion

The project is **fully reproducible** in Docker. A new person can:

1. Clone the repository
2. Run `docker compose up --build`
3. Access http://localhost:3000
4. Everything works without any manual steps

No local Node.js, no `.env` file, no manual database setup required.

