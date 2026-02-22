# Регистрация и аутентификация - Техническая спецификация

## Общее описание и назначение

Система аутентификации платформы "Питомец+" предоставляет полный цикл управления пользователями: от регистрации и активации аккаунта до входа, выхода и управления профилем. Система построена на JWT токенах с refresh механизмом и обеспечивает безопасность через многоуровневую архитектуру.

### Цели системы
- **Безопасность**: Защита пользовательских данных и предотвращение несанкционированного доступа
- **Удобство**: Простой процесс регистрации и входа с email активацией
- **Масштабируемость**: Архитектура, поддерживающая рост количества пользователей
- **Интеграция**: Связь с другими модулями платформы (PetID, заказы, курсы)

### Основные возможности
- Регистрация с email подтверждением
- Аутентификация по email и паролю
- JWT токены с автоматическим обновлением
- Восстановление пароля
- Управление профилем пользователя
- Cookie-based хранение refresh токенов

## Архитектура и компоненты системы

### Backend архитектура

#### Модульная структура
```
apps.users/
├── models.py          # User, Token модели
├── views.py           # API представления
├── serializers.py     # Сериализаторы данных
├── services/          # Бизнес-логика
│   ├── user_service.py    # Основная логика пользователей
│   ├── token_service.py   # Управление токенами
│   └── mail_service.py    # Email рассылки
├── urls.py            # Маршруты API
└── admin.py           # Админка
```

#### Сервисный слой
- **UserService**: Регистрация, вход, активация, управление профилем
- **TokenService**: Генерация и валидация JWT токенов
- **MailService**: Отправка email уведомлений

#### Модели данных
- **User**: Основная модель пользователя с расширенными полями профиля
- **Token**: Хранение refresh токенов в базе данных

### Frontend архитектура

#### API клиент
```
api/auth.js - Клиент для всех auth операций
├── register()         # Регистрация
├── login()           # Вход
├── logout()          # Выход
├── refreshToken()    # Обновление токена
├── getProfile()      # Получение профиля
├── updateProfile()   # Обновление профиля
├── activateByCode()  # Активация по коду
└── exchangeAuthCode() # Обмен кода на токены
```

#### State management
```
store/authStore.js - Zustand хранилище
├── user              # Данные пользователя
├── isAuthenticated   # Статус аутентификации
├── isLoading         # Состояние загрузки
├── error             # Сообщения ошибок
└── actions           # Действия (login, logout, etc.)
```

#### UI компоненты
```
pages/Auth/ - Страницы аутентификации
├── Login.jsx         # Вход
├── Register.jsx      # Регистрация
├── Activate.jsx      # Активация
├── ForgotPassword.jsx # Восстановление пароля
└── ResetPassword.jsx  # Сброс пароля
```

## API эндпоинты

### Базовые настройки
- **Базовый URL**: `/api/auth/`
- **Аутентификация**: JWT Bearer token в заголовке `Authorization`
- **Refresh токены**: Хранятся в httpOnly cookie `refreshToken`
- **Формат данных**: JSON
- **Content-Type**: `application/json`

### Регистрация и активация

#### POST `/api/auth/registration/`
Регистрация нового пользователя с email активацией.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123",
}
```

**Ответ (201 Created):**
```json
{
  "message": "Проверьте email и введите код для активации аккаунта.",
  "email": "user@example.com"
}
```

**Особенности:**
- Пароль не возвращается в ответе
- Токены не выдаются до активации
- Отправляется email с кодом и ссылкой активации

#### GET `/api/auth/activate/{activation_link}/`
Активация по ссылке из email.

**Параметры:**
- `activation_link`: UUID ссылка активации

**Ответ (302 Redirect):**
Перенаправление на клиент с временным кодом:
`http://localhost:5173?activation_success=1&auth_code={temp_code}`

#### POST `/api/auth/activate-by-code/`
Активация по 6-значному коду из email.

**Тело запроса:**
```json
{
  "activation_code": "123456"
}
```

**Ответ (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "isActivated": true
  },
  "accessToken": "jwt.access.token",
  "refreshToken": "jwt.refresh.token"
}
```

#### POST `/api/auth/exchange-auth-code/`
Обмен временного кода на токены (после активации по ссылке).

**Тело запроса:**
```json
{
  "auth_code": "temp_auth_code"
}
```

**Ответ (200 OK):**
```json
{
  "user": {...},
  "accessToken": "jwt.access.token",
  "refreshToken": "jwt.refresh.token"
}
```

#### POST `/api/auth/resend-activation/`
Повторная отправка кода активации.

**Тело запроса:**
```json
{
  "email": "user@example.com"
}
```

**Ответ (200 OK):**
```json
{
  "success": true,
  "message": "Новый код активации отправлен на email"
}
```

**Особенности:**
- Генерирует новый 6-значный код
- Обновляет время создания кода (code_created_at)
- Генерирует новую ссылку активации
- Отправляет email с новым кодом

### Аутентификация

#### POST `/api/auth/login/`
Вход пользователя по email и паролю.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "Иван",
    "last_name": "Фамилия",
    "isActivated": true,
    "is_staff": false,
    "is_superuser": false
  },
  "accessToken": "jwt.access.token",
  "refreshToken": "jwt.refresh.token"
}
```

**Особенности:**
- Проверяется активация аккаунта
- Refresh токен устанавливается в httpOnly cookie
- Access токен возвращается в JSON ответе

#### POST `/api/auth/logout/`
Выход пользователя и инвалидация токенов.

**Требования:** Refresh токен в cookie

**Ответ (200 OK):**
```json
{
  "message": "Выход выполнен успешно"
}
```

**Особенности:**
- Удаляет refresh токен из базы данных
- Очищает httpOnly cookie
- Не требует access токена

#### GET `/api/auth/refresh/`
Обновление access токена по refresh токену.

**Требования:** Refresh токен в cookie

**Ответ (200 OK):**
```json
{
  "user": {...},
  "accessToken": "new.jwt.access.token",
  "refreshToken": "new.jwt.refresh.token"
}
```

**Особенности:**
- Валидирует refresh токен из cookie
- Генерирует новые токены
- Обновляет cookie с новым refresh токеном

### Восстановление пароля

#### POST `/api/auth/password-reset/`
Запрос на восстановление пароля.

**Тело запроса:**
```json
{
  "email": "user@example.com"
}
```

**Ответ (200 OK):**
```json
{
  "message": "Инструкции по восстановлению пароля отправлены на email"
}
```

#### POST `/api/auth/password-reset/confirm/`
Подтверждение восстановления пароля.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "newpassword123",
  "new_password_confirm": "newpassword123"
}
```

**Ответ (200 OK):**
```json
{
  "user": {...},
  "accessToken": "jwt.access.token",
  "refreshToken": "jwt.refresh.token"
}
```

### Профиль пользователя

#### GET `/api/users/profile/`
Получение полного профиля пользователя.

**Требования:** JWT токен

**Ответ (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "Иван",
    "last_name": "Иванов",
    "phone": "+7(999)123-45-67",
    "default_address": "г. Москва, ул. Ленина, д. 1",
    "avatar": "http://example.com/media/users/avatars/avatar.jpg",
    "bio": "Люблю животных",
    "date_of_birth": "1990-01-01",
    "city": "Москва",
    "website": "https://example.com",
    "email_notifications": true,
    "push_notifications": true,
    "order_notifications": true,
    "marketing_notifications": false,
    "preferred_pet_types": ["dog", "cat"],
    "created_at": "2024-01-01T10:00:00Z",
    "isActivated": true,
    "is_staff": false,
    "is_superuser": false
  },
  "pets": [...],      // Список питомцев
  "orders": [...],    // История заказов
  "courses": [...]    // Приобретенные курсы
}
```

#### PUT `/api/users/profile/`
Обновление профиля пользователя.

**Тело запроса:**
```json
{
  "first_name": "Новое имя",
  "phone": "+7(999)999-99-99",
  "email_notifications": false
}
```

**Ответ (200 OK):**
```json
{
  "message": "Профиль обновлен",
  "user": {...}  // Обновленные данные
}
```

### Служебные эндпоинты

#### GET `/api/auth/users/`
Получение списка всех пользователей (для тестирования).

**Требования:** Аутентификация

**Ответ (200 OK):**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "isActivated": true,
    "is_staff": false,
    "is_superuser": false
  }
]
```

#### GET `/api/users/orders/`
Получение заказов пользователя.

**Требования:** Аутентификация

#### GET `/api/users/courses/`
Получение курсов пользователя.

**Требования:** Аутентификация

## Модели данных

### User модель

```python
class User(AbstractBaseUser, PermissionsMixin):
    # Основные поля
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    default_address = models.TextField(blank=True)

    # Активация
    is_activated = models.BooleanField(default=False)
    activation_link = models.CharField(max_length=255, blank=True, null=True, unique=True)
    activation_code = models.CharField(max_length=6, blank=True, null=True)
    code_created_at = models.DateTimeField(blank=True, null=True)  # Для проверки срока действия кодов

    # Права доступа
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Расширенный профиль
    avatar = models.ImageField(upload_to='users/avatars/', blank=True, null=True)
    bio = models.TextField(blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)

    # Настройки уведомлений
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    order_notifications = models.BooleanField(default=True)
    marketing_notifications = models.BooleanField(default=False)

    # Персонализация
    preferred_pet_types = models.JSONField(default=list, blank=True)

    # Метаданные
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
```

### Token модель

```python
class Token(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tokens')
    refresh_token = models.TextField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

## Бизнес-логика и сервисы

### UserService

#### Регистрация пользователя
```python
@staticmethod
def registration(email, password, first_name=None, last_name=None):
    # 1. Проверка существования пользователя
    # 2. Создание пользователя (is_activated=False)
    # 3. Генерация activation_link и activation_code
    # 4. Отправка email активации
    # 5. Возврат сообщения (без токенов)
```

#### Активация пользователя
```python
@staticmethod
def activate(activation_link=None, activation_code=None):
    # 1. Поиск пользователя по link или code
    # 2. Активация аккаунта (is_activated=True)
    # 3. Генерация токенов через TokenService
    # 4. Очистка activation полей
    # 5. Возврат данных пользователя и токенов
```

#### Вход пользователя
```python
@staticmethod
def login(email, password):
    # 1. Поиск пользователя по email
    # 2. Проверка активации аккаунта
    # 3. Валидация пароля
    # 4. Генерация токенов
    # 5. Сохранение refresh токена в БД
    # 6. Возврат данных пользователя и токенов
```

#### Выход пользователя
```python
@staticmethod
def logout(refresh_token):
    # 1. Поиск токена в БД
    # 2. Удаление токена из БД
    # 3. Возврат подтверждения выхода
```

#### Обновление токенов
```python
@staticmethod
def refresh(refresh_token):
    # 1. Валидация refresh токена
    # 2. Поиск токена в БД
    # 3. Генерация новых токенов
    # 4. Обновление токена в БД
    # 5. Возврат новых токенов
```

### TokenService

#### Генерация токенов
```python
@staticmethod
def generate_tokens(user):
    # 1. Создание access токена (короткоживущий)
    # 2. Создание refresh токена (долгоживущий)
    # 3. Возврат пары токенов
```

#### Сохранение refresh токена
```python
@staticmethod
def save_token(user, refresh_token):
    # 1. Создание записи Token в БД
    # 2. Хранение refresh токена в зашифрованном виде
```

#### Валидация токенов
```python
@staticmethod
def validate_access_token(token):
    # 1. Декодирование JWT
    # 2. Проверка подписи и срока действия
    # 3. Возврат payload или исключение
```

### MailService

#### Отправка email активации
```python
@staticmethod
def send_activation_mail(email, activation_url, activation_code):
    # 1. Формирование HTML шаблона
    # 2. Вставка ссылки активации и кода
    # 3. Отправка через Django email backend
```

#### Настройки email
- **Backend**: `django.core.mail.backends.smtp.EmailBackend`
- **SMTP Host**: smtp.mail.ru (для разработки)
- **Порт**: 587 (TLS)
- **Отправитель**: testpetplus@mail.ru

## Security measures

### JWT токены
- **Access токен**: Живет 15 минут, используется для API запросов
- **Refresh токен**: Живет 30 дней, хранится в httpOnly cookie
- **Алгоритм**: HS256
- **Payload**: user_id, exp, iat, token_type

### Cookie настройки
- **httpOnly**: true (защита от XSS)
- **secure**: зависит от DEBUG (HTTPS в продакшене)
- **sameSite**: 'Lax' (баланс безопасности и удобства)
- **max_age**: 30 дней для refresh токена

### Валидация данных
- **Email**: Проверка формата и уникальности
- **Пароль**: Минимум 8 символов, обязательно буквы + цифры + спецсимволы
- **Коды активации**: 6 цифр, уникальные, срок действия 15 минут
- **Ссылки активации**: UUID v4, уникальные, срок действия 15 минут
- **Коды восстановления пароля**: 6 цифр, срок действия 15 минут

### Требования к паролю
- Минимум 8 символов
- Хотя бы одна буква (латиница или кириллица)
- Хотя бы одна цифра
- Хотя бы один специальный символ (!@#$%^&*()_+-=[]{}...)
- Не из списка распространённых паролей

### Защита от атак
- **Отсутствие rate limiting** (планируется)
- **Отсутствие 2FA** (планируется)
- **Отсутствие блокировки аккаунта** (планируется)

## Frontend реализация

### API клиент (api/auth.js)
- **Базовый URL**: `/api`
- **Автоматическая установка токенов** в заголовки
- **Интерцепторы** для обработки 401 ошибок
- **Обработка ошибок** с понятными сообщениями

### Zustand store (store/authStore.js)
- **Инициализация**: Проверка localStorage при загрузке
- **Автоматическое обновление токенов** каждые 14 минут
- **Обработка ошибок** с пользовательскими сообщениями
- **Периодическая валидация** токенов

### UI компоненты
- **Формы валидации** с клиентской и серверной проверкой
- **Loading состояния** для всех операций
- **Error handling** с понятными сообщениями
- **Responsive дизайн** для всех устройств

## Интеграции

### С другими модулями платформы
- **PetID**: Профиль пользователя включает список питомцев
- **Магазин**: История заказов в профиле пользователя
- **Курсы**: Список приобретенных курсов
- **Напоминания**: Связь через профиль питомцев

### Внешние сервисы
- **Email рассылка**: SMTP сервер для уведомлений
- **Файловое хранилище**: Django media для аватаров
- **База данных**: PostgreSQL для всех данных

## Мониторинг и логирование

### Логирование
- **Уровень**: INFO для успешных операций, WARNING для ошибок
- **Формат**: JSON через pythonjsonlogger
- **Файлы**: logs/app.log, logs/error.log
- **Ротация**: По размеру и времени

### Мониторинг
- **Health check**: `/api/health/` эндпоинт
- **Метрики**: Время выполнения запросов
- **Ошибки**: Централизованная обработка исключений
- **Производительность**: Оптимизация запросов к БД

## Тестирование

### Unit тесты
- **Сервисы**: UserService, TokenService, MailService
- **Модели**: User, Token с валидацией
- **Утилиты**: UUID генерация, email валидация

### Integration тесты
- **API эндпоинты**: Все auth маршруты
- **Frontend**: Компоненты и store
- **Email**: Отправка и получение

### E2E тесты
- **Сценарии**: Регистрация → Активация → Вход → Профиль
- **UI**: Формы, валидация, навигация
- **API**: Полный цикл аутентификации