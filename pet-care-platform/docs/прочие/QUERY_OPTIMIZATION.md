# Документация по оптимизации QuerySet

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.2 - Оптимизация QuerySet

---

## 📋 Содержание

1. [Выполненные оптимизации](#выполненные-оптимизации)
2. [Оптимизированные views](#оптимизированные-views)
3. [Методы оптимизации](#методы-оптимизации)
4. [Рекомендации](#рекомендации)

---

## Выполненные оптимизации

### 1. Product Views

#### ProductListView
**Статус**: ✅ Уже оптимизирован  
**Метод**: Использует `Product.objects.catalog()` который включает:
- `available()` - фильтрация доступных товаров
- `with_ratings()` - аннотации рейтинга и количества отзывов

**Оптимизация**: Аннотации рейтинга устраняют N+1 проблему при вызове `to_dict()`

#### ProductDetailView
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
product = Product.objects.get(id=product_id)

# Стало:
product = Product.objects.with_ratings().get(id=product_id)
```

**Результат**: Предзагрузка рейтинга для детального просмотра

### 2. Order Views

#### OrderListView (OrderHistoryView)
**Статус**: ✅ Уже оптимизирован  
**Метод**: Использует `prefetch_related` и `select_related`:
```python
orders = Order.objects.filter(user=request.user).prefetch_related(
    'items__product', 
    'items__course', 
    'items__pet'
).select_related('address').order_by('-created_at')
```

#### OrderDetailView (OrderUpdateView)
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
order = Order.objects.get(id=order_id, user=request.user)

# Стало:
order = Order.objects.select_related('user', 'address').prefetch_related(
    'items__product', 'items__course', 'items__pet'
).get(id=order_id, user=request.user)
```

**Результат**: Предзагрузка всех связанных объектов одним запросом

#### OrderConfirmPaymentView
**Статус**: ✅ Оптимизировано  
**Изменения**: Аналогично OrderDetailView

### 3. Pet Views

#### PetListCreateView
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
pets = Pet.objects.filter(owner=request.user)

# Стало:
pets = Pet.objects.select_related('owner').filter(owner=request.user)
```

**Результат**: Предзагрузка owner для консистентности

#### PetDetailView
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
pet = Pet.objects.get(id=pet_id)

# Стало:
pet = Pet.objects.select_related('owner').get(id=pet_id)
```

### 4. Course Views

#### CourseListView
**Статус**: ✅ Уже оптимизирован  
**Метод**: Использует `Course.objects.catalog()` который включает:
- `active()` - фильтрация активных курсов
- `with_ratings()` - аннотации рейтинга

#### CourseDetailView
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
course = Course.objects.get(id=course_id, is_active=True)
pet = Pet.objects.get(id=pet_id, owner=request.user)

# Стало:
course = Course.objects.with_ratings().get(id=course_id, is_active=True)
pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
```

**Результат**: Предзагрузка рейтинга курса и owner питомца

#### CourseLessonsView
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
course = Course.objects.get(id=course_id, is_active=True)
# В цикле для каждого урока:
course_progress = UserCourseProgress.objects.get(...)
lesson_progress = UserLessonProgress.objects.filter(...).first()

# Стало:
course = Course.objects.with_ratings().get(id=course_id, is_active=True)
# Предзагрузка прогресса всех уроков одним запросом:
progresses = UserLessonProgress.objects.filter(
    course_progress=course_progress,
    lesson__in=lessons
).select_related('lesson')
lesson_progresses = {p.lesson_id: p for p in progresses}
```

**Результат**: Устранение N+1 проблемы при загрузке прогресса уроков

#### UserCoursesView
**Статус**: ✅ Уже оптимизирован  
**Метод**: Использует `select_related('course', 'pet')`

---

## Оптимизированные views

### Shop App

| View | Статус | Оптимизация |
|------|--------|-------------|
| ProductListView | ✅ | `Product.objects.catalog()` с аннотациями |
| ProductDetailView | ✅ | `with_ratings()` |
| CartView | ⏳ | Требуется проверка |
| OrderCreateView | ⏳ | Требуется проверка |
| OrderHistoryView | ✅ | `prefetch_related` + `select_related` |
| OrderUpdateView | ✅ | `prefetch_related` + `select_related` |
| OrderConfirmPaymentView | ✅ | `prefetch_related` + `select_related` |

### Training App

| View | Статус | Оптимизация |
|------|--------|-------------|
| CourseListView | ✅ | `Course.objects.catalog()` с аннотациями |
| CourseDetailView | ✅ | `with_ratings()` + `select_related` для pet |
| CourseLessonsView | ✅ | Предзагрузка прогресса всех уроков |
| UserCoursesView | ✅ | `select_related('course', 'pet')` |
| LessonDetailView | ✅ | `select_related('course')` |

### Pets App

| View | Статус | Оптимизация |
|------|--------|-------------|
| PetListCreateView | ✅ | `select_related('owner')` |
| PetDetailView | ✅ | `select_related('owner')` |

---

## Методы оптимизации

### 1. select_related()

Используется для ForeignKey и OneToOne полей.

**Пример**:
```python
# Плохо: N+1 запросов
pets = Pet.objects.filter(owner=request.user)
for pet in pets:
    print(pet.owner.email)  # Дополнительный запрос для каждого pet

# Хорошо: 1 запрос
pets = Pet.objects.select_related('owner').filter(owner=request.user)
for pet in pets:
    print(pet.owner.email)  # Нет дополнительных запросов
```

### 2. prefetch_related()

Используется для ManyToMany и обратных ForeignKey.

**Пример**:
```python
# Плохо: N+1 запросов
orders = Order.objects.filter(user=request.user)
for order in orders:
    for item in order.items.all():  # Дополнительный запрос для каждого order
        print(item.product.name)

# Хорошо: 2 запроса (1 для orders, 1 для items)
orders = Order.objects.prefetch_related('items__product').filter(user=request.user)
for order in orders:
    for item in order.items.all():  # Нет дополнительных запросов
        print(item.product.name)
```

### 3. Аннотации (annotate)

Используются для вычисления агрегатов на уровне SQL.

**Пример**:
```python
# Плохо: N+1 запросов
products = Product.objects.all()
for product in products:
    rating = product.get_average_rating()  # Дополнительный запрос для каждого product

# Хорошо: 1 запрос с аннотацией
products = Product.objects.with_ratings()
for product in products:
    rating = product._avg_rating  # Используем аннотированное значение
```

---

## Рекомендации

### 1. Всегда используйте select_related для ForeignKey

```python
# ✅ Хорошо
pet = Pet.objects.select_related('owner').get(id=pet_id)

# ❌ Плохо
pet = Pet.objects.get(id=pet_id)
```

### 2. Всегда используйте prefetch_related для обратных ForeignKey и ManyToMany

```python
# ✅ Хорошо
orders = Order.objects.prefetch_related('items__product').filter(user=user)

# ❌ Плохо
orders = Order.objects.filter(user=user)
for order in orders:
    items = order.items.all()  # N+1 проблема
```

### 3. Используйте аннотации для агрегатов

```python
# ✅ Хорошо
products = Product.objects.with_ratings()

# ❌ Плохо
products = Product.objects.all()
for product in products:
    rating = product.get_average_rating()  # N+1 проблема
```

### 4. Предзагружайте связанные объекты в циклах

```python
# ✅ Хорошо
progresses = UserLessonProgress.objects.filter(
    course_progress=course_progress,
    lesson__in=lessons
)
lesson_progresses = {p.lesson_id: p for p in progresses}

# ❌ Плохо
for lesson in lessons:
    progress = UserLessonProgress.objects.filter(
        course_progress=course_progress,
        lesson=lesson
    ).first()  # N+1 проблема
```

---

## Admin API Views

### AdminOrderViewSet
**Статус**: ✅ Оптимизировано  
**Метод**: Использует `select_related` и `prefetch_related`:
```python
queryset = Order.objects.select_related('user', 'address').prefetch_related(
    'items__product',
    'items__course',
    'items__pet'
).all()
```

### AdminPetViewSet
**Статус**: ✅ Оптимизировано  
**Метод**: Использует `select_related('owner')`

### AdminUserViewSet
**Статус**: ✅ Оптимизировано  
**Метод**: Использует аннотации для подсчета связанных объектов

### AdminCourseViewSet
**Статус**: ✅ Оптимизировано  
**Изменения**:
```python
# Было:
queryset = Course.objects.all()

# Стало:
queryset = Course.objects.prefetch_related('lessons').all()
```

**Результат**: Предзагрузка уроков для избежания N+1 проблемы

---

## Следующие шаги

1. ✅ Проверено CartView - оптимизирован
2. ✅ Проверено OrderCreateView - оптимизирован
3. ✅ Проверено Admin API views - оптимизированы
3. ⏳ Проверить Admin API views на оптимизацию
4. ⏳ Добавить django-debug-toolbar для профилирования
5. ⏳ Создать тесты производительности

---

*Документ создан в рамках Этапа 1.2 рефакторинга*  
*Последнее обновление: Январь 2026*

