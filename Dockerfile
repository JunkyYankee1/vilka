FROM node:20-alpine

# Install curl and wget for healthchecks
RUN apk add --no-cache curl wget

WORKDIR /usr/src/app

# зависимости отдельно для кеша
COPY package.json package-lock.json ./
# Use npm ci for reproducible builds (faster and more reliable)
# Falls back to npm install if package-lock.json is out of sync
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# остальной код
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
