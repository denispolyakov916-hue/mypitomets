# Настройка macOS (пользователь)

В этой папке лежит готовый SQL-дамп и скрипты для macOS:
- `install_mac.sh` — установка Homebrew, Python, Node.js, PostgreSQL и создание БД.
- `restore_db_mac.sh` — восстановление данных из дампа.
- `start_all_mac.sh` — миграции и запуск backend + frontend (порты 8077/5199).

Важно: пароль БД **явно задан как `578321`**, чтобы соответствовать настройкам проекта.

## Порядок запуска (по пунктам)

1) **Установить зависимости и создать БД**

Из корня проекта:

```bash
bash setup_mac/install_mac.sh
```

Скрипт создаст:
- пользователя БД: `pitomets`
- БД: `pitomets_db`
- пароль: `578321`

2) **Восстановить базу (если нужны данные)**

Дамп находится здесь:
`setup_mac/pitomets_db_dump.sql`

Восстановление:

```bash
export PGPASSWORD="578321"
psql -U pitomets -h localhost -d pitomets_db -f setup_mac/pitomets_db_dump.sql
```

Если нужны чистые таблицы без данных — пропустите этот шаг.

Также можно использовать скрипт:
```bash
bash setup_mac/restore_db_mac.sh
```

3) **Запустить backend + frontend**

```bash
bash setup_mac/start_all_mac.sh
```

После запуска:
- Backend: http://localhost:8077
- Frontend: http://localhost:5199
- Admin: http://localhost:8077/admin/

## Если что-то не работает

- Если PostgreSQL не запущен:
  - `brew services start postgresql@15`
- Если порты заняты:
  - остановите другие приложения на `8077` / `5199` или поменяйте порты в скриптах.
- Если `psql` просит пароль:
  - используйте `578321`.
