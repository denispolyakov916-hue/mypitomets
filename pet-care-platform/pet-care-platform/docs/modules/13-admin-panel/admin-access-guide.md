# Admin Access Guide

Дата ревизии: 2026-06-30

## Назначение

Документ описывает административные панели Питомец+, их URL, роли доступа и зоны ответственности.

В проекте есть три административных уровня:

1. Django admin.
2. React admin panel.
3. Admin REST API.

Их нельзя путать: они решают разные задачи и имеют разные механизмы доступа.

## Панели и URL

| Панель | URL | Назначение | Доступ |
|--------|-----|------------|--------|
| Django admin | `/admin/` | Низкоуровневое управление Django-моделями. | `is_staff`, для полного доступа `is_superuser`. |
| React admin panel | `/admin-panel/` | Основная продуктовая админка для управления сервисом. | Frontend допускает staff/superuser/course_creator. |
| Admin REST API | `/api/admin/` | API для React админки. | В основном `IsAdminUser`; часть курсовых операций может допускать course creator. |

## Django admin

URL:

```text
/admin/
```

Используется для:

- ручной диагностики данных;
- работы с Django-моделями;
- создания superuser;
- emergency-операций;
- проверки записей, которые еще не вынесены в React admin.

Риски:

- можно изменить критичные данные напрямую;
- можно случайно выдать права;
- можно удалить связанные записи;
- не все действия имеют продуктовые ограничения.

Правило: Django admin использовать осторожно, преимущественно для технической поддержки и superuser-операций.

## React admin panel

URL:

```text
/admin-panel/
```

Файлы:

```text
frontend/src/admin/App.jsx
frontend/src/components/AdminRoute.jsx
frontend/src/admin/components/Layout/AdminLayout.jsx
```

Маршруты:

| URL | Раздел | Компонент |
|-----|--------|-----------|
| `/admin-panel` | Редирект по роли | `AdminDefaultRedirect` |
| `/admin-panel/login` | Вход в админку | `AdminLoginPage` |
| `/admin-panel/dashboard` | Дашборд | `DashboardSelector` |
| `/admin-panel/analytics` | Аналитика | `AnalyticsDashboard` |
| `/admin-panel/analytics/builder` | Конструктор графиков | `ChartBuilder` |
| `/admin-panel/users` | Пользователи | `UsersTable` |
| `/admin-panel/pets` | Питомцы | `PetsTable` |
| `/admin-panel/products` | Товары | `ProductsTable` |
| `/admin-panel/orders` | Заказы | `OrdersTable` |
| `/admin-panel/courses` | Курсы | `CoursesTable` |
| `/admin-panel/courses/:id/edit` | Редактор курса | `CourseEditorPage` |

## Frontend-проверка доступа

`AdminRoute` разрешает доступ, если:

```text
user.is_staff || user.is_superuser || user.role === 'course_creator'
```

Если пользователь не авторизован, показывается `AdminLoginPage`.

Если пользователь авторизован, но не имеет прав, показывается экран "Доступ ограничен".

## Роли

| Роль | Доступ в React admin | Доступ в backend admin API |
|------|----------------------|----------------------------|
| `user` | Нет | Нет |
| `course_creator` | Да, frontend допускает | Только там, где backend явно разрешает course creator. |
| `admin` | Да | Да, через `is_staff=True`. |
| `superuser` | Да | Да, полный Django-доступ. |

Важная особенность текущей модели:

- `role=admin` автоматически выставляет `is_staff=True` и `is_superuser=True`;
- `role=course_creator` не является staff;
- многие `/api/admin/*` endpoint-ы требуют `IsAdminUser`, поэтому course creator может видеть admin shell, но получать 403 на части API.

## Admin REST API

URL-префикс:

```text
/api/admin/
```

Файлы:

```text
backend/config/urls_admin.py
backend/config/admin_api.py
```

Основные endpoint-группы:

| URL | Назначение |
|-----|------------|
| `/api/admin/analytics/` | Аналитика, метрики, графики. |
| `/api/admin/management/` | Bulk-операции, экспорт. |
| `/api/admin/users/` | Пользователи. |
| `/api/admin/pets/` | Питомцы. |
| `/api/admin/products/` | Товары. |
| `/api/admin/orders/` | Заказы. |
| `/api/admin/courses/` | Курсы. |
| `/api/admin/stats/summary/` | Сводка. |

## Что можно делать в React admin

| Раздел | Ожидаемые операции |
|--------|--------------------|
| Dashboard | Смотреть основные показатели. |
| Analytics | Смотреть аналитику, графики, тренды. |
| Users | Просматривать и управлять пользователями. |
| Pets | Просматривать и управлять питомцами. |
| Products | Управлять товарами. |
| Orders | Управлять заказами. |
| Courses | Управлять курсами и редактировать курс. |
| Chart Builder | Собирать визуальные отчеты. |

Фактические права зависят от backend endpoint-ов. UI не должен считать действие успешным, пока backend не подтвердил операцию.

## Course creator

Для course creator целевой маршрут:

```text
/admin-panel/courses
```

Course creator должен видеть только курсовую часть, если backend не дает ему прав на пользователей, заказы, товары и аналитику.

Рекомендация по доработке:

- скрывать недоступные пункты меню в `Sidebar`;
- не запрашивать admin endpoint-ы, которые точно вернут 403;
- показывать понятное сообщение, если курс не принадлежит автору;
- покрыть тестом доступ course creator к курсам.

## Как выдать доступ

### Через Django admin

1. Открыть `/admin/`.
2. Найти пользователя.
3. Изменить `role`.
4. Сохранить.
5. Проверить `is_staff` и `is_superuser`.

Важно: из-за логики `User.save()` роль `admin` синхронизирует staff/superuser.

### Через management command

Для superuser:

```bash
cd backend
python manage.py createsuperuser
```

Для тестовых пользователей в проекте есть команды и фикстуры, но их нельзя использовать для production-доступов без ревизии паролей.

## Как отозвать доступ

1. Открыть пользователя в Django admin.
2. Поменять `role` на `user` или нужную роль.
3. Убедиться, что `is_staff=False` и `is_superuser=False`.
4. При необходимости сбросить пароль.
5. При необходимости отозвать refresh tokens, если реализована такая операция.

## Проверка доступа

Минимальные проверки:

| Проверка | Ожидаемый результат |
|----------|---------------------|
| Обычный пользователь открывает `/admin-panel/` | Экран "Доступ ограничен". |
| Гость открывает `/admin-panel/` | Страница входа админки. |
| Admin открывает `/admin-panel/dashboard` | Дашборд загружается. |
| Admin открывает `/api/admin/stats/summary/` | API возвращает данные. |
| Обычный пользователь открывает `/api/admin/stats/summary/` | 401 или 403. |
| Superuser открывает `/admin/` | Django admin доступен. |
| Course creator открывает `/admin-panel/courses` | Курсовой раздел доступен, остальные разделы не должны мешать UX. |

## Ошибки доступа

Правильное поведение:

- 401: пользователь не авторизован;
- 403: пользователь авторизован, но прав недостаточно;
- 404: объект не найден или скрыт по правам;
- 500: только реальная серверная ошибка, не ошибка доступа.

Frontend должен показывать понятный экран, а не пустую страницу.

## Безопасность

Запрещено:

- хранить реальные admin-пароли в документации;
- передавать access token в query string;
- логировать admin payload с персональными данными без необходимости;
- давать обычному пользователю доступ к admin API только через скрытие UI;
- полагаться на frontend-проверку как единственную защиту.

## Что нужно доработать

| Приоритет | Задача |
|-----------|--------|
| P0 | Сверить backend permissions для каждого `/api/admin/*` endpoint. |
| P0 | Ограничить меню React admin по роли. |
| P0 | Добавить тесты: user не имеет доступа, admin имеет доступ, course_creator ограничен курсами. |
| P1 | Документировать каждую admin-операцию: чтение, создание, изменение, удаление, bulk/export. |
| P1 | Добавить audit log административных действий. |
| P1 | Добавить процедуру отзыва refresh tokens при снятии прав. |

