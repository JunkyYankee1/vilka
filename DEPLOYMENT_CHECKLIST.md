# Deployment Checklist

## ✅ Pre-Deployment Verification

### Docker Configuration
- ✅ `Dockerfile` - Properly configured with Node.js 20-alpine
- ✅ `docker-compose.yml` - All services configured with health checks
- ✅ `.dockerignore` - Excludes unnecessary files from build context
- ✅ `package.json` - Dependencies defined
- ✅ `package-lock.json` - Present for reproducible builds

### Database Initialization
- ✅ `db/init/01_full_init.sql` - Schema and initial data
- ✅ `db/init/02_seed_extra.sql` - Additional menu items (ensures 3+ per category)
- ✅ PostgreSQL auto-initializes on first run

### Required Services
- ✅ PostgreSQL (port 5432) - Database
- ✅ Redis (port 6379) - Caching and cart storage
- ✅ MinIO (ports 9000, 9001) - Image storage
- ✅ Ollama (port 11434) - LLM inference (optional)
- ✅ Next.js App (port 3000) - Main application
- ✅ Nginx (port 80) - Reverse proxy (optional)

### Environment Variables
All environment variables are configured in `docker-compose.yml`:
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `REDIS_URL` - Redis connection
- ✅ `MINIO_*` - MinIO configuration
- ✅ `OLLAMA_*` - Ollama configuration
- ✅ `NEXT_PUBLIC_API_BASE_URL` - API base URL

**Note**: No `.env` file required for basic operation. All defaults are in `docker-compose.yml`.

### Code Quality
- ✅ All identified bugs fixed (see `bugs_to_fix.md`)
- ✅ No linter errors
- ✅ TypeScript compilation successful
- ✅ Dependencies installed successfully

### Build Status
- ✅ Docker image builds successfully
- ✅ All services start correctly
- ✅ Health checks pass

## Deployment Steps

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd vilka
   ```

2. **Build and start all services:**
   ```bash
   docker compose up --build -d
   ```

3. **Verify services are running:**
   ```bash
   docker compose ps
   ```

4. **Check application logs:**
   ```bash
   docker compose logs app --tail 50
   ```

5. **Access the application:**
   - Main App: http://localhost:3000
   - Dozzle (Logs): http://localhost:9999
   - MinIO Console: http://localhost:9001 (minioadmin/minioadminpassword)

## Post-Deployment Verification

- [ ] Application loads at http://localhost:3000
- [ ] Database initialized with menu items
- [ ] Search functionality works
- [ ] Cart functionality works
- [ ] Authentication works
- [ ] Theme switching works
- [ ] All pages load correctly

## Troubleshooting

If services fail to start:
1. Check logs: `docker compose logs <service-name>`
2. Verify ports are not in use: `netstat -an | findstr "3000 5432 6379"`
3. Check Docker resources (memory, disk space)
4. Try clean restart: `docker compose down -v && docker compose up --build`

## Notes

- First run will download Ollama model (~2GB) if not cached
- Database initialization happens automatically on first PostgreSQL start
- All data persists in Docker volumes (postgres_data, redis_data, minio_data, ollama_data)

