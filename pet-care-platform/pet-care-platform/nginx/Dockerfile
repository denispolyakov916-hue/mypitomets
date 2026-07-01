# =============================================================================
# Dockerfile для Nginx (reverse proxy + раздача frontend)
# =============================================================================

FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
# --include=dev обязателен: vite/@vitejs — в devDependencies, нужны для сборки.
# (Раньше слой брался из кэша и маскировал проблему; при холодной сборке devDeps
# не доставлялись, и `vite build` падал с "vite: not found".)
RUN npm ci --include=dev --no-audit --no-fund
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
