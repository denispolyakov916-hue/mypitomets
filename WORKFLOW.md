# Рабочий процесс — Питомец+ (мульти-агентная разработка)

Главный принцип: **1 агент = 1 задача = 1 ветка = 1 папка.**

Никто не коммитит в чужую папку и не пушит в чужую ветку. Единственная
интеграционная ветка — **`main`**; именно её деплоит beta.

## Кто где работает

| Агент / роль | Папка (git worktree) | Префикс веток |
|---|---|---|
| Claude — **новые фичи** | `/Users/denis/petplus-ai-assistant` | `feat/*` |
| Claude — **баг-фиксы** | `/Users/denis/petplus-safari-qa` | `fix/*` |
| Codex — **доки + анализ кода** | `/Users/denis/petplus-docs` | `docs/*` |
| Codex — **админки** (подрядчики, зоопсихологи, ветеринары, владелец) | `/Users/denis/Applications/Мои/Pet — копия` | `admin/*` |
| **Партнёр** | `/Users/denis/petplus-partner` | `partner/*` |
| **Интеграция** (beta = это) | `/Users/denis/petplus-main` | `main` |

Каждая папка — отдельный git worktree одного репозитория `denispolyakov916-hue/mypitomets`.
Симлинк `/Users/denis/petplus` → главная папка (путь с длинным тире — для нативного Read/Edit).

## Цикл задачи

```bash
# 1) В СВОЕЙ папке берём свежий main и заводим ветку под ОДНУ задачу:
cd <своя-папка>
git fetch origin
git switch -c feat/short-task-name origin/main     # префикс по своей роли

# 2) Работаем только в своей папке. Коммитим через хуки (НЕ обходить --no-verify):
git add <свои-файлы>
git commit -m "feat(scope): ..."                    # секреты — только в .env

# 3) Публикуем ветку:
git push -u origin feat/short-task-name

# 4) PR в main → ревью → merge.
# 5) Деплой: см. ниже (beta всегда = main).
```

## Деплой (beta = `main`)

Сервер: `root@217.198.9.185`, путь `/opt/petplus-beta/pet-care-platform/pet-care-platform`, ветка `main`.

```bash
ssh root@217.198.9.185
cd /opt/petplus-beta/pet-care-platform/pet-care-platform
bash scripts/deploy.sh        # backup БД → git pull → build → migrate → up
```

> Нюанс: `deploy.sh` проверяет health по `http` без follow-redirect, а nginx может
> отдавать 301 на https → скрипт иногда пишет ERROR ложно. Истина — `docker compose ps`
> (все контейнеры `healthy`) и `curl -k https://betapitometsplus.ru/api/health/` = 200.

## Правила

- **Одна задача — одна ветка.** Закончил/переключаешься — новая ветка от свежего `main`.
- **Не трогай чужую папку и чужую ветку.** Конфликты решаются через PR в `main`.
- **Не обходи pre-commit** (`.githooks`): без `--no-verify`. Хук блокирует секреты,
  артефакты, мусор и гоняет ruff/eslint.
- **Секреты — только в `.env`** (в `.gitignore`). В коде и `.env.example` — лишь
  плейсхолдеры (`your-...`).
- **`backup/2026-04-04-mobile-ui` — ЛЕГАСИ**, заморожена. Не использовать как базу.
- Перед commit/push — показывать дифф владельцу (договорённость проекта).

## Онбординг партнёра

1. Владелец добавляет партнёра в репозиторий: GitHub → Settings → Collaborators →
   пригласить аккаунт партнёра в `denispolyakov916-hue/mypitomets`.
2. Партнёр работает в папке `/Users/denis/petplus-partner` (или клонирует репозиторий
   у себя), ветки — `partner/*`, по этому же циклу: ветка от `main` → PR → merge.
3. Партнёр читает этот файл и следует тем же правилам.

## Карта веток (актуально на момент наведения порядка)

- `main` — интеграция, деплоится на beta.
- `feat/ai-assistant-puf` — фичи (ассистент «Пуф»), Claude #1.
- `feat/safari-qa-pc` — баг-фиксы/Safari QA, Claude #2 (= содержимое main; следующая задача — `fix/*` от main).
- `codex/dinozavrik-supplier-admin` — админки, Codex #2 (в работе, вольётся в main через PR).
- `docs/start`, `partner/start` — стартовые ветки папок Codex-доки и партнёра.
