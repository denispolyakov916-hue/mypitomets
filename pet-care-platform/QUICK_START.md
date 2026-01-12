# 🚀 Быстрый старт Pet Care Platform

**Дата:** 12 января 2026  
**Версия:** 2.0

---

## ✅ ЧТО ГОТОВО

### База знаний оптимизирована:
- ✅ 128 пород (58 кошек, 66 собак) - без дубликатов
- ✅ 220 генетических рисков здоровья
- ✅ 55 рекомендаций по питанию
- ✅ 31 специфичная процедура ухода
- ✅ Общие данные (вакцинации, уход)

### Django модели созданы:
- ✅ Breed, BreedHealth, BreedNutrition, BreedCare
- ✅ Pet.breed → ForeignKey(Breed)
- ✅ Product.nutrition_params (JSON)
- ✅ Product.health_targets (JSON)

### Данные загружены в БД:
- ✅ 124 породы в таблице breeds
- ✅ 220 рисков в таблице breed_health
- ✅ 55 рекомендаций в таблице breed_nutrition
- ✅ 31 процедура в таблице breed_care

---

## 🎯 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

### Необходимое ПО:
1. **Python 3.12+** - для бекенда
2. **Node.js 18+** - для фронтенда
3. **PostgreSQL 14+** - база данных
4. **Git** - для клонирования репозитория

### Первоначальная настройка:

#### 1. Создать виртуальное окружение (если не создано):
```bash
cd backend
python -m venv venv
```

#### 2. Активировать окружение и установить зависимости:
```bash
# Windows
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. Создать базу данных PostgreSQL:
```sql
CREATE DATABASE pitomets_db;
CREATE USER pitomets WITH PASSWORD '578321';
GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;
```

#### 4. Установить зависимости фронтенда:
```bash
cd frontend
npm install
```

#### 5. Применить миграции:
```bash
cd backend
python manage.py migrate
```

#### 6. Создать суперпользователя (опционально):
```bash
python manage.py createsuperuser
# Username: admin
# Password: admin123
```

---

## 🚀 ЗАПУСК ПРОЕКТА

### Вариант 1: Запуск всего (рекомендуется)

**Двойной клик на файл или в командной строке:**
```batch
start-all.bat
```

Автоматически откроет 2 окна:
- **Backend (Django):** http://localhost:8077 или http://127.0.0.1:8077
- **Frontend (React):** http://localhost:5199 или http://127.0.0.1:5199

### Вариант 2: Запуск по отдельности

**Backend (сначала запустите бекенд):**
```batch
start-backend.bat
```

**Frontend (потом запустите фронтенд):**
```batch
start-frontend.bat
```

> **💡 Совет:** Бекенд запускается на `127.0.0.1:8077` (IPv4), фронтенд на `0.0.0.0:5199` (все интерфейсы).

---

## 📋 ВАЖНЫЕ URL

| Сервис | URL | Альтернативный URL | Описание |
|--------|-----|-------------------|----------|
| **Frontend** | http://localhost:5199 | http://127.0.0.1:5199 | Главная страница |
| **API** | http://localhost:8077/api/ | http://127.0.0.1:8077/api/ | API эндпоинты |
| **Admin** | http://localhost:8077/admin/ | http://127.0.0.1:8077/admin/ | Админ-панель |
| **Swagger** | http://localhost:8077/api/docs/ | http://127.0.0.1:8077/api/docs/ | API документация |

**Админ логин:**
- Username: `admin`
- Password: `admin123`

**Конфигурация портов:**
- Бекенд: `127.0.0.1:8077` (IPv4 localhost)
- Фронтенд: `0.0.0.0:5199` (все интерфейсы, включая IPv4)
- API Proxy: Vite автоматически проксирует `/api/*` на бекенд

---

## 🔧 ДОСТУПНЫЕ КОМАНДЫ

### Загрузка данных о породах:
```bash
cd backend
python manage.py load_breeds
```

### Загрузка данных о породах (с очисткой):
```bash
cd backend
python manage.py load_breeds --clear
```

### Создание суперпользователя:
```bash
cd backend
python manage.py createsuperuser
```

---

## 📊 ПРОВЕРКА ДАННЫХ

### Проверить количество пород в БД:
```bash
cd backend
python manage.py shell -c "from apps.pets.models import Breed; print(f'Пород: {Breed.objects.count()}')"
```

### Проверить данные о породе:
```bash
cd backend
python manage.py shell -c "from apps.pets.models import Breed; b = Breed.objects.first(); print(f'{b.name}: {b.size_category}, {b.energy_level}')"
```

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Проверка API пород:
```
GET http://localhost:8077/api/pets/breeds/
GET http://localhost:8077/api/pets/breeds/1/
```

### 2. Проверка создания PetID:
```
POST http://localhost:8077/api/pets/
{
  "name": "Барсик",
  "species": "cat",
  "breed": 1,
  "date_of_birth": "2020-01-01",
  "weight": 5.5,
  "gender": "male"
}
```

### 3. Проверка магазина:
```
GET http://localhost:8077/api/shop/products/?animal=dog
GET http://localhost:8077/api/shop/products/?pet_id={pet_id}
```

---

## ⚠️ ИЗВЕСТНЫЕ ПРОБЛЕМЫ

1. **Описания пород:** Заполнены только для топ-15 пород, остальные имеют базовые описания
2. **Товары:** nutrition_params пока пустой, требуется заполнение
3. **API:** Эндпоинты для сравнения с эталоном породы еще не созданы

---

## 📚 ДОКУМЕНТАЦИЯ

- `docs/KNOWLEDGE_BASE_ANALYSIS.md` - Полный анализ базы знаний
- `docs/FOOD_RECOMMENDATION_ALGORITHM.md` - Алгоритм подбора корма
- `docs/IMPLEMENTATION_PROGRESS.md` - Прогресс реализации
- `data_breeds/README.md` - Описание базы знаний
- `data_breeds/FINAL_DATABASE_SUMMARY.md` - Итоговая сводка

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. Заполнить `nutrition_params` для товаров категории "Корм"
2. Создать API эндпоинты для работы с породами
3. Реализовать алгоритм подбора корма
4. Создать UI компоненты для PetID

---

**Статус:** ✅ Готово к тестированию  
**Дата:** 12.01.2026, 18:10

