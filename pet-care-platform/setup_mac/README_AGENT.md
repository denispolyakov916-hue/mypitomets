# macOS setup (AI agent checklist)

Goal: fully bootstrap the project on a clean macOS machine. Keep DB password `578321`.

## Steps

1) Install system deps + create DB
```bash
bash setup_mac/install_mac.sh
```

2) Restore data (optional)
```bash
export PGPASSWORD="578321"
psql -U pitomets -h localhost -d pitomets_db -f setup_mac/pitomets_db_dump.sql
```
or:
```bash
bash setup_mac/restore_db_mac.sh
```

3) Start backend + frontend
```bash
bash setup_mac/start_all_mac.sh
```

## Verification checklist

- `python3 --version` returns 3.11+
- `node --version` is available
- `psql` connects to `pitomets_db` with user `pitomets` and password `578321`
- Backend runs on `http://localhost:8077`
- Frontend runs on `http://localhost:5199`

## Notes / possible blockers

- Homebrew installs PostgreSQL with the current macOS user as superuser.
  If role creation fails, run:
  `psql -d postgres -c "CREATE ROLE pitomets WITH LOGIN PASSWORD '578321';"`
  `psql -d postgres -c "CREATE DATABASE pitomets_db OWNER pitomets;"`
- If a fresh dump is needed, run on the source machine:
  `python manage.py backup_database`
  (requires `pg_dump` in PATH)
  Then copy `backend/backup_*.sql` into `setup_mac/pitomets_db_dump.sql`.
- Keep DB password `578321` so no project env changes are required.
