# Git-хуки проекта (Pet_dev / Питомец+)

Версионируемые хуки. Включить один раз после клонирования репозитория:

```bash
git config core.hooksPath .githooks
```

## pre-commit
Строгий контроль качества перед каждым коммитом. Блокирует:
- секреты и чувствительные файлы (`.env`, `.htpasswd`, `*.pem/*.key`, приватные SSH-ключи);
- дампы/архивы/БД (`*.sql`-дампы, `*.sqlite`, `pitomets_db`, `*.tar.gz`, `*.zip`, большие `catalog_filtered.json`/`Каталог.xml`);
- build/dep артефакты (`dist/`, `node_modules/`, `.venv/`);
- файлы > 5 MB;
- маркеры конфликтов слияния;
- отладочный мусор: `console.log`, `debugger`, `pdb`/`breakpoint`;
- «AI-slop» / placeholder-комментарии и похожие на реальные секреты значения;
- код, не проходящий **ruff** (Python) и **eslint** (JS) на staged-файлах.

Линтеры запускаются, если доступны `backend/.venv` (ruff) и `frontend/node_modules` (eslint).

**Обход `--no-verify` запрещён** правилами проекта (`.cursor/rules/ai-dev-workflow.mdc`).
