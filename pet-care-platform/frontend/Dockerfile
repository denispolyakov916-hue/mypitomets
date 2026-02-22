# =============================================================================
# Dockerfile для frontend (React + Vite)
# Собирает production bundle в dist/
# =============================================================================

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# Результат сборки — /app/dist
# Используется в nginx/Dockerfile через docker compose COPY --from
