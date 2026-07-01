# =============================================================================
# Dockerfile для Nginx (reverse proxy + раздача frontend)
# =============================================================================

# Пин конкретной версии: плавающий node:20-alpine подтянул npm с багом
# "Exit handler never called!" (краш npm при установке). 20.17.0 = npm 10.8.2 (стабильный).
FROM node:20.17.0-alpine AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
# vite/@vitejs — в devDependencies (нужны для сборки), поэтому --include=dev.
# node:20-alpine — плавающий тег; на части версий npm падает внутренней ошибкой
# "Exit handler never called!" и не доставляет пакеты. Поэтому: чистим кэш,
# повторяем ci, а при упорном крахе npm — фолбэк на npm install (лишь бы devDeps
# и vite встали и сборка прошла). Раньше слой брался из кэша и это маскировалось.
ENV npm_config_audit=false npm_config_fund=false
RUN npm cache clean --force \
    && ( npm ci --include=dev \
         || ( echo ">>> retry npm ci" && npm cache clean --force && npm ci --include=dev ) \
         || ( echo ">>> fallback npm install" && npm install --include=dev ) ) \
    && test -x node_modules/.bin/vite
COPY frontend/ .
RUN npm run build

# ---------- nginx ----------
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/ /etc/nginx/conf.d/
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/robots.txt || exit 1

CMD ["nginx", "-g", "daemon off;"]
