# Питомец+ Frontend

## Быстрый запуск

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск dev-сервера
npm run dev
```

Откройте http://localhost:5173

## Требования

- Node.js 18+
- npm

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер на порту 5173 |
| `npm run build` | Сборка для production |
| `npm run preview` | Предпросмотр сборки |

## Конфигурация

Файл `.env`:
```
VITE_API_URL=http://localhost:8000/api
```

## Технологии

- React 18
- Vite 5
- Tailwind CSS 3
- Zustand (state management)
- Axios (HTTP client)
