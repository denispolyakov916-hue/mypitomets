# Чеклист перед Git Push

## ✅ Проверка готовности проекта

### 1. Обязательные файлы присутствуют

- [x] `.gitignore` в корне проекта
- [x] `backend/.env.example` - шаблон конфигурации бэкенда
- [x] `frontend/.env.example` - шаблон конфигурации фронтенда
- [x] `backend/requirements.txt` - зависимости Python
- [x] `frontend/package.json` и `package-lock.json` - зависимости Node.js
- [x] `GIT_GUIDE.md` - инструкция по работе

### 2. Скрипты запуска

- [x] `backend/start_backend.bat` (Windows)
- [x] `backend/start_backend.sh` (Linux)
- [x] `frontend/start_frontend.bat` (Windows)
- [x] `frontend/start_frontend.sh` (Linux)
- [x] `sync_after_pull.bat` (Windows)
- [x] `sync_after_pull.sh` (Linux)

### 3. Миграции Django

- [x] Все миграции присутствуют в `apps/*/migrations/`
- [x] Миграции не в `.gitignore`
- [x] `__init__.py` в каждой папке migrations

### 4. Конфигурация

- [x] `backend/config/settings.py` настроен для работы с .env
- [x] `frontend/vite.config.js` использует переменные окружения
- [x] `.gitignore` правильно настроен (игнорирует .env.local, но не .env)

### 5. Документация

- [x] `GIT_GUIDE.md` - инструкция по работе
- [x] `backend/README.md` - документация бэкенда
- [x] `frontend/README.md` - документация фронтенда

## ⚠️ Важные замечания

1. **.env файлы** - должны быть созданы из .env.example при первом запуске
2. **Миграции** - все должны быть закоммичены
3. **Зависимости** - requirements.txt и package.json должны быть актуальными
4. **Скрипты** - должны быть исполняемыми (Linux: `chmod +x *.sh`)

## 🚀 Команды для проверки перед push

```bash
# Проверить статус Git
git status

# Убедиться, что нет лишних файлов
git status --ignored

# Проверить, что миграции добавлены
git ls-files | grep migrations

# Проверить, что .env.example есть
ls backend/.env.example frontend/.env.example
```

## 📝 Что должно быть в Git

✅ **Должно быть:**
- Все исходные файлы (.py, .jsx, .js)
- Миграции Django
- requirements.txt, package.json, package-lock.json
- .env.example файлы
- Скрипты запуска (.bat, .sh)
- Документация (.md)
- Конфигурационные файлы

❌ **Не должно быть:**
- __pycache__/
- node_modules/
- venv/, .venv/
- .env (если не синхронизируете)
- .env.local
- *.log
- media/, staticfiles/

