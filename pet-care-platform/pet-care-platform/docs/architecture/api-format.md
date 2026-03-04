# Формат API

## Базовые правила

- Все эндпоинты начинаются с `/api/`
- Аутентификация: JWT Bearer token в заголовке `Authorization`
- Content-Type: `application/json`
- Кодировка: UTF-8

## Маршруты

| Префикс | Приложение | Описание |
|---------|------------|----------|
| `/api/auth/` | users | Регистрация, вход, обновление токена |
| `/api/users/` | users | Профиль пользователя |
| `/api/pets/` | pets | Управление питомцами, PetID |
| `/api/v1/nutrition/` | pets | Справочники питания, калькулятор |
| `/api/shop/` | shop | Каталог товаров, корзина |
| `/api/checkout/` | shop | Оформление заказов |
| `/api/courses/` | training | Курсы и обучение |
| `/api/payments/` | payments | Платежи |
| `/api/reviews/` | reviews | Отзывы и рейтинги |
| `/api/admin/` | config | REST API админ-панели |
| `/api/health/` | core | Health check |

## Формат успешного ответа

```json
{
  "data": { ... },
  "count": 10,
  "message": "Объект успешно создан"
}
```

## Формат ошибки

```json
{
  "error": "Описание ошибки на русском",
  "code": "ERROR_CODE",
  "errors": ["Детали ошибки 1", "Детали ошибки 2"]
}
```

## Коды ошибок

| Код | HTTP статус | Описание |
|-----|-------------|----------|
| `BAD_REQUEST` | 400 | Некорректный запрос |
| `VALIDATION_ERROR` | 400 | Ошибка валидации данных |
| `UNAUTHORIZED` | 401 | Не авторизован |
| `FORBIDDEN` | 403 | Доступ запрещён |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `CONFLICT` | 409 | Конфликт ресурсов |
| `INTERNAL_ERROR` | 500 | Внутренняя ошибка сервера |

## Аутентификация

1. Регистрация: `POST /api/auth/register/` → получение activation_code на email
2. Активация: `POST /api/auth/activate/` → код из email
3. Вход: `POST /api/auth/login/` → access token в теле, refresh в httpOnly cookie
4. Обновление: `POST /api/auth/refresh/` → новый access token
5. Выход: `POST /api/auth/logout/`

### Заголовок авторизации

```
Authorization: Bearer <access_token>
```
