# Проверка конфигурации бекенд-фронтенд

## ✅ ТЕКУЩИЕ НАСТРОЙКИ

### Frontend (Vite)
- **Порт:** 5199
- **Host:** 0.0.0.0 (все интерфейсы)
- **Прокси target:** http://192.168.1.11:8077
- **API baseURL:** /api (относительный путь)

### Backend (Django)
- **Порт:** 8077
- **Host:** 0.0.0.0 (все интерфейсы)
- **API URL:** http://192.168.1.11:8077
- **CLIENT URL:** http://192.168.1.11:5199
- **ALLOWED_HOSTS:** localhost,127.0.0.1,0.0.0.0,192.168.1.139,192.168.1.11

### CORS
- **CORS_ALLOW_ALL_ORIGINS:** True (в DEBUG режиме)
- **CORS_ALLOW_CREDENTIALS:** True
- **Разрешенные origins:** localhost:5199, 192.168.1.11:5199, и другие

## 🔍 ПРОВЕРКА

### 1. Запуск бекенда
```bash
cd backend
python manage.py runserver 0.0.0.0:8077
```

**Ожидаемый вывод:**
```
Starting development server at http://0.0.0.0:8077/
```

### 2. Запуск фронтенда
```bash
cd frontend
npm run dev
```

**Ожидаемый вывод:**
```
[Vite] API proxy target: http://192.168.1.11:8077
  ➜  Local:   http://localhost:5199/
  ➜  Network: http://192.168.1.11:5199/
```

### 3. Тест API напрямую
```bash
curl http://192.168.1.11:8077/api/auth/login/ -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test123\"}"
```

### 4. Проверка прокси
В консоли Vite должны появиться логи:
```
[Proxy Request] POST /api/auth/login/
[Proxy Target] http://192.168.1.11:8077/api/auth/login/
[Proxy Response] /api/auth/login/ Status: 200
```

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

1. **Бекенд не запущен** - проверьте порт 8077
2. **Прокси не работает** - проверьте логи Vite
3. **CORS блокирует** - проверьте DEBUG=True в settings.py
4. **Неправильный IP** - убедитесь что 192.168.1.11 - ваш IP

## 🔧 РЕШЕНИЕ ОШИБКИ 500

Если ошибка 500 сохраняется:

1. Проверьте логи бекенда - там должна быть детальная информация об ошибке
2. Проверьте логи прокси в консоли Vite
3. Убедитесь что бекенд доступен: `curl http://192.168.1.11:8077/api/`
4. Проверьте что прокси работает: в Network tab браузера запрос должен идти на localhost:5199, но в логах Vite должен быть прокси на 192.168.1.11:8077

