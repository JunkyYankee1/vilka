# Вилка — быстрая доставка еды и продуктов

Next.js приложение для онлайн-сервиса быстрой доставки еды и продуктов.

## 🚀 Quick Start (Fully Containerized)

**Prerequisites:** Docker Desktop (or Docker Engine + Docker Compose)

```bash
# Clone the repository
git clone <repository-url>
cd vilka

# Start everything (builds images and starts all services)
docker compose up --build
```

**Access the app:** http://localhost:3000

That's it! The app will:
- ✅ Auto-initialize the database with schema and seed data
- ✅ Start all required services (PostgreSQL, Redis, MinIO, Ollama)
- ✅ Install all dependencies inside Docker (no local Node.js required)
- ✅ Start the Next.js development server with hot reload

**To stop and clean up:**
```bash
docker compose down -v  # Removes containers and volumes
```

See [README.setup.md](./README.setup.md) for detailed setup instructions and troubleshooting.

## 📚 Documentation

- **[README.setup.md](./README.setup.md)** - Setup and troubleshooting guide
- **[README.seeding.md](./README.seeding.md)** - Database seeding documentation
- **[README.smart-cart.md](./README.smart-cart.md)** - Smart cart system documentation
- **[README.ai.md](./README.ai.md)** - AI assistant (LLM) documentation
- **[README.zabbix.md](./README.zabbix.md)** - Monitoring setup
- **[ПОИСК.md](./ПОИСК.md)** - Menu search system documentation (in Russian)

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **AI**: Ollama (LLaMA 3.x)
- **Containerization**: Docker & Docker Compose

## 📦 Services

When running `docker compose up`, the following services are available:

- **App**: http://localhost:3000 - Main Next.js application
- **PostgreSQL**: localhost:5432 - Database
- **Redis**: localhost:6379 - Cache
- **MinIO**: localhost:9000 (API), localhost:9001 (Console) - Object storage
- **Ollama**: localhost:11434 - LLM inference server
- **Dozzle**: http://localhost:9999 - Docker logs viewer
- **Zabbix**: http://localhost:8080 - Monitoring (optional)

## 🔧 Development

See [README.setup.md](./README.setup.md) for local development setup (running app outside Docker while using Docker for services).
