# Резервная копия фронтенда (мобильная вёрстка и связанные файлы)

**Дата:** 2026-04-04  
**Ветка Git:** `backup/2026-04-04-mobile-ui`  
**Теги снимка кода:** `backup/mobile-ui-2026-04-04`, `backup/mobile-ui-2026-04-04-stable` (актуальный после iframe/нижней панели)

## Содержимое `frontend-src.tar.gz`

Полная папка `pet-care-platform/pet-care-platform/frontend` без `node_modules` и без `dist` (как в репозитории).

Ключевые файлы для **мобильной** нижней навигации и отступов:

| Файл | Назначение |
|------|------------|
| `src/components/MobileBottomNav.jsx` | Нижняя панель (иконки, таблетка, бейдж корзины) |
| `src/components/Layout.jsx` | Отступы `main` под нижний бар и CTA |
| `src/components/PuffSupportWidget.jsx` | Позиция виджета Пуфа на мобилках |
| `public/landing/index.html` | Лендинг в iframe: мобильная нижняя «шапка», переменные отступов |

## Восстановление из архива

Из корня репозитория:

```bash
rm -rf pet-care-platform/pet-care-platform/frontend
tar -xzf backups/mobile-frontend-2026-04-04/frontend-src.tar.gz -C pet-care-platform/pet-care-platform
cd pet-care-platform/pet-care-platform/frontend && npm install
```

## Восстановление через Git

```bash
git checkout backup/mobile-ui-2026-04-04
# или
git checkout backup/mobile-ui-2026-04-04 -- pet-care-platform/pet-care-platform/frontend
```
