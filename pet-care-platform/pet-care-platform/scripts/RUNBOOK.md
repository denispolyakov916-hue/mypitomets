# Runbook: деплой, бэкапы, откат (beta)

Единый регламент эксплуатации `betapitometsplus.ru` (сервер `217.198.9.185`,
`/opt/petplus-beta`, деплой-ветка **`main`**). Всё делается **только** описанными
здесь скриптами. Ручные `git reset`/правки на сервере вне скриптов — запрещены.

## 1. Деплой — единственный способ

```bash
cd /opt/petplus-beta/pet-care-platform/pet-care-platform
./scripts/deploy.sh
```

Что делает по шагам (см. `scripts/deploy.sh`):
1. **preflight** — проверяет docker/compose/.env, `git fetch`, показывает ветку,
   текущий и целевой (`origin/main`) commit, фиксирует `PREV_COMMIT`.
2. **обязательный бэкап** — вызывает `backup-db.sh`; при любой ошибке бэкапа
   **деплой останавливается** (правило «нет бэкапа → нет деплоя»).
3. **обновление кода** — `git checkout main` + `git reset --hard origin/main`
   (сервер = точное зеркало origin/main).
4. **rollback-точка** — пишет `.last-deploy` (PREV_COMMIT, NEW_COMMIT, файл бэкапа).
5. **сборка → проверка дрейфа миграций → migrate → up -d** (без `down`).
6. **health-check** `http://127.0.0.1/api/health/` (до 60с); при провале — ошибка
   с подсказкой по откату.
7. **cleanup** — прунинг старых образов и build cache.

Лог **накапливается** в `deploy.log` (ротация через `logrotate`, + страховочная
внутри скрипта при >5 МБ). Никогда не перезаписывается.

## 2. Бэкапы

Скрипт `scripts/backup-db.sh` (БД + media-volume):
- дамп PostgreSQL → gzip, проверка `gunzip -t` + минимальный размер, `sha256`;
- бэкап media-тома (tar.gz + sha256);
- ротация: **7 дневных / 4 недельных / 6 месячных** (недельная — по воскресеньям,
  месячная — 1-го числа);
- off-site: если задан `BACKUP_REMOTE=user@host:/path` в `backend/.env` — каталог
  бэкапов синхронизируется `rsync` по ssh.

Расписание: **systemd-таймер `petplus-backup.timer` каждый день в 03:30**
(ставится `install-stabilization.sh timers`).

Проверка/тест:
```bash
./scripts/backup-db.sh --verify        # целостность + checksum последних бэкапов
./scripts/backup-db.sh --restore-test  # тест восстановления во ВРЕМЕННУЮ БД (без риска), затем удаляет её
```
Ежемесячно рекомендуется прогонять `--restore-test` (проверка, что бэкапы реально восстановимы).

## 3. Откат (rollback)

**Кто решает:** владелец проекта (Денис). Признак необходимости — провал health-check
после деплоя или подтверждённая критическая регрессия на бете.

- **Код + контейнеры** (на предыдущий commit из `.last-deploy`):
  ```bash
  ./scripts/deploy.sh --rollback     # спросит подтверждение (yes)
  ```
  Делает `git reset --hard <PREV_COMMIT>` → build → migrate → up.
- **База данных** (если релиз испортил данные) — из конкретного бэкапа:
  ```bash
  ./scripts/backup-db.sh --restore backups/pitomets_YYYYMMDD_HHMMSS.sql.gz
  ```
  Файл бэкапа этого релиза записан в `.last-deploy` (`BACKUP=`).
- Порядок при серьёзной аварии: сначала откат кода, затем — при необходимости — БД.
  Миграции, добавляющие новые таблицы/поля, обычно обратно совместимы; при
  несовместимых изменениях данных используйте восстановление БД из бэкапа.

## 4. Разовая настройка сервера

```bash
sudo ./scripts/install-stabilization.sh timers      # таймеры бэкапа + reload nginx по флагу certbot + logrotate
sudo ./scripts/install-stabilization.sh cache       # разовая чистка build cache
sudo ./scripts/install-stabilization.sh bak         # перенос *.bak в /root/petplus-attic (chmod 600)
sudo ./scripts/install-stabilization.sh env-secret  # убрать $TS из DJANGO_SECRET_KEY (sha256-проверка: ключ не меняется)
```

## 5. SSL / nginx reload

Certbot (контейнер) при **успешном обновлении** сертификата ставит флаг
`certbot/www/.nginx-reload`. Хостовый таймер `petplus-cert-reload.timer` (ежечасно)
по флагу делает `nginx -s reload` и удаляет флаг. Так nginx гарантированно начинает
отдавать новый сертификат без ручного рестарта.

## 6. Логи и диск

- Docker-логи: `json-file`, `max-size 10m`, `max-file 5` (в `docker-compose.yml`,
  применяется при пересоздании контейнеров, т.е. на ближайшем деплое).
- `deploy.log`: `logrotate` (еженедельно, 8 архивов, сжатие).
- Build cache: чистится в конце каждого деплоя + разово через `install-stabilization.sh cache`.
