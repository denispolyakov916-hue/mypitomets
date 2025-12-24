# Техническое задание: Система рейтингов и отзывов для товаров и курсов

## Описание

Реализация системы рейтингов и отзывов для товаров и курсов с возможностью оставлять отзывы только после покупки. Система должна обеспечивать надежное хранение данных, валидацию и безопасность.

---

## 1. Модели данных

### 1.1 Модель Review (Отзыв)

**Расположение:** `apps/shop/models.py` или новая app `apps/reviews/models.py`

```python
class Review(models.Model):
    """
    Отзыв на товар или курс.
    
    Пользователь может оставить только один отзыв на каждый товар/курс.
    Отзыв можно редактировать и удалять.
    """
    
    REVIEW_TYPE_CHOICES = [
        ('product', 'Отзыв на товар'),
        ('course', 'Отзыв на курс'),
    ]
    
    id = models.AutoField(primary_key=True)
    
    # Тип отзыва и связь с объектом
    review_type = models.CharField(
        max_length=20,
        choices=REVIEW_TYPE_CHOICES,
        verbose_name='Тип отзыва'
    )
    product = models.ForeignKey(
        'shop.Product',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name='Товар'
    )
    course = models.ForeignKey(
        'training.Course',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name='Курс'
    )
    
    # Пользователь
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='Пользователь'
    )
    
    # Рейтинг (1-5)
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='Рейтинг'
    )
    
    # Комментарий
    comment = models.TextField(
        max_length=2000,
        blank=True,
        null=True,
        verbose_name='Комментарий'
    )
    
    # Подтверждение покупки
    is_verified_purchase = models.BooleanField(
        default=False,
        verbose_name='Подтвержденная покупка',
        help_text='Отмечает, что пользователь действительно приобрел товар/курс'
    )
    
    # Модерация
    is_approved = models.BooleanField(
        default=True,
        verbose_name='Одобрен',
        help_text='Отзыв виден всем пользователям'
    )
    is_edited = models.BooleanField(
        default=False,
        verbose_name='Отредактирован'
    )
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')
    
    class Meta:
        db_table = 'reviews'
        verbose_name = 'Отзыв'
        verbose_name_plural = 'Отзывы'
        ordering = ['-created_at']
        # Один отзыв от пользователя на товар/курс
        unique_together = [
            ('user', 'product'),
            ('user', 'course'),
        ]
        indexes = [
            models.Index(fields=['product', 'is_approved']),
            models.Index(fields=['course', 'is_approved']),
            models.Index(fields=['user', 'review_type']),
        ]
    
    def __str__(self):
        item = self.product or self.course
        return f"Отзыв от {self.user.email} на {item}"
    
    def clean(self):
        """Валидация: должен быть указан либо product, либо course."""
        if not self.product and not self.course:
            raise ValidationError('Необходимо указать товар или курс')
        if self.product and self.course:
            raise ValidationError('Нельзя указывать и товар, и курс одновременно')
        
        # Устанавливаем review_type автоматически
        if self.product:
            self.review_type = 'product'
        elif self.course:
            self.review_type = 'course'
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'user_name': self.user.first_name or self.user.email.split('@')[0],
            'rating': self.rating,
            'comment': self.comment,
            'is_verified_purchase': self.is_verified_purchase,
            'is_edited': self.is_edited,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
```

### 1.2 Обновление моделей Product и Course

**Добавить методы для расчета рейтинга:**

```python
# В apps/shop/models.py (Product)
class Product(models.Model):
    # ... существующие поля ...
    
    def get_average_rating(self):
        """Средний рейтинг товара."""
        from apps.reviews.models import Review
        reviews = Review.objects.filter(
            product=self,
            is_approved=True
        )
        if not reviews.exists():
            return 0.0
        return reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0
    
    def get_reviews_count(self):
        """Количество одобренных отзывов."""
        from apps.reviews.models import Review
        return Review.objects.filter(
            product=self,
            is_approved=True
        ).count()
    
    def to_dict(self):
        """Обновить метод to_dict для включения рейтинга."""
        data = {
            # ... существующие поля ...
            'rating': round(self.get_average_rating(), 1),
            'reviews_count': self.get_reviews_count(),
        }
        return data

# В apps/training/models.py (Course)
class Course(models.Model):
    # ... существующие поля ...
    
    def get_average_rating(self):
        """Средний рейтинг курса."""
        from apps.reviews.models import Review
        reviews = Review.objects.filter(
            course=self,
            is_approved=True
        )
        if not reviews.exists():
            return 0.0
        return reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0
    
    def get_reviews_count(self):
        """Количество одобренных отзывов."""
        from apps.reviews.models import Review
        return Review.objects.filter(
            course=self,
            is_approved=True
        ).count()
    
    def to_dict(self):
        """Обновить метод to_dict для включения рейтинга."""
        data = {
            # ... существующие поля ...
            'rating': round(self.get_average_rating(), 1),
            'reviews_count': self.get_reviews_count(),
        }
        return data
```

---

## 2. API Эндпоинты

### 2.1 Получение отзывов товара

**Эндпоинт:** `GET /api/reviews/products/{product_id}/`

**Описание:** Возвращает список отзывов товара с пагинацией и статистикой рейтинга.

**Параметры запроса:**
- `page` (int, опционально) - Номер страницы (по умолчанию 1)
- `per_page` (int, опционально) - Количество на странице (по умолчанию 10, максимум 50)

**Запрос:**
```http
GET /api/reviews/products/5/?page=1&per_page=10
Authorization: Bearer <token>
```

**Ответ (200 OK):**
```json
{
  "reviews": [
    {
      "id": 1,
      "user_name": "Иван",
      "rating": 5,
      "comment": "Отличный товар! Очень доволен покупкой.",
      "is_verified_purchase": true,
      "is_edited": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "user_name": "Мария",
      "rating": 4,
      "comment": "Хороший товар, но есть небольшие недостатки.",
      "is_verified_purchase": true,
      "is_edited": true,
      "created_at": "2024-01-14T15:20:00Z",
      "updated_at": "2024-01-14T16:45:00Z"
    }
  ],
  "rating": 4.5,
  "reviews_count": 25,
  "rating_distribution": {
    "5": 10,
    "4": 8,
    "3": 5,
    "2": 1,
    "1": 1
  },
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 25,
    "total_pages": 3
  },
  "user_review": {
    "id": 1,
    "rating": 5,
    "comment": "Отличный товар!",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Ошибки:**
- `404 Not Found` - Товар не найден

---

### 2.2 Получение отзывов курса

**Эндпоинт:** `GET /api/reviews/courses/{course_id}/`

**Описание:** Аналогично отзывам товаров.

**Запрос:**
```http
GET /api/reviews/courses/10/?page=1&per_page=10
Authorization: Bearer <token>
```

**Ответ:** Аналогично ответу для товаров.

---

### 2.3 Создание отзыва на товар

**Эндпоинт:** `POST /api/reviews/products/{product_id}/`

**Описание:** Создает новый отзыв на товар. Доступно только для пользователей, которые приобрели товар.

**Запрос:**
```http
POST /api/reviews/products/5/
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Отличный товар! Очень доволен покупкой. Качество на высоте."
}
```

**Валидация:**
- `rating` - обязательное, целое число от 1 до 5
- `comment` - опциональное, строка от 10 до 2000 символов

**Ответ (201 Created):**
```json
{
  "message": "Отзыв успешно создан",
  "review": {
    "id": 1,
    "user_name": "Иван",
    "rating": 5,
    "comment": "Отличный товар! Очень доволен покупкой. Качество на высоте.",
    "is_verified_purchase": true,
    "is_edited": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Ошибки:**
- `400 Bad Request` - Неверные данные (rating не в диапазоне, comment слишком короткий/длинный)
- `403 Forbidden` - Пользователь не приобрел товар
- `409 Conflict` - Отзыв уже существует (можно обновить через PUT)
- `404 Not Found` - Товар не найден

---

### 2.4 Создание отзыва на курс

**Эндпоинт:** `POST /api/reviews/courses/{course_id}/`

**Описание:** Аналогично созданию отзыва на товар.

**Запрос:**
```http
POST /api/reviews/courses/10/
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Хороший курс, много полезной информации. Рекомендую!"
}
```

**Ответ:** Аналогично ответу для товаров.

---

### 2.5 Обновление отзыва

**Эндпоинт:** `PUT /api/reviews/products/{product_id}/reviews/{review_id}/`
**Эндпоинт:** `PUT /api/reviews/courses/{course_id}/reviews/{review_id}/`

**Описание:** Обновляет существующий отзыв. Доступно только автору отзыва.

**Запрос:**
```http
PUT /api/reviews/products/5/reviews/1/
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Обновленный комментарий с дополнительной информацией."
}
```

**Ответ (200 OK):**
```json
{
  "message": "Отзыв успешно обновлен",
  "review": {
    "id": 1,
    "user_name": "Иван",
    "rating": 4,
    "comment": "Обновленный комментарий с дополнительной информацией.",
    "is_verified_purchase": true,
    "is_edited": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:45:00Z"
  }
}
```

**Ошибки:**
- `403 Forbidden` - Пользователь не является автором отзыва
- `404 Not Found` - Отзыв не найден

---

### 2.6 Удаление отзыва

**Эндпоинт:** `DELETE /api/reviews/products/{product_id}/reviews/{review_id}/`
**Эндпоинт:** `DELETE /api/reviews/courses/{course_id}/reviews/{review_id}/`

**Описание:** Удаляет отзыв. Доступно только автору отзыва.

**Запрос:**
```http
DELETE /api/reviews/products/5/reviews/1/
Authorization: Bearer <token>
```

**Ответ (200 OK):**
```json
{
  "message": "Отзыв успешно удален"
}
```

**Ошибки:**
- `403 Forbidden` - Пользователь не является автором отзыва
- `404 Not Found` - Отзыв не найден

---

### 2.7 Проверка возможности оставить отзыв

**Эндпоинт:** `GET /api/reviews/products/{product_id}/eligibility/`
**Эндпоинт:** `GET /api/reviews/courses/{course_id}/eligibility/`

**Описание:** Проверяет, может ли пользователь оставить отзыв (приобрел ли товар/курс).

**Запрос:**
```http
GET /api/reviews/products/5/eligibility/
Authorization: Bearer <token>
```

**Ответ (200 OK):**
```json
{
  "can_review": true,
  "has_review": false,
  "purchase_date": "2024-01-10T14:20:00Z",
  "message": "Вы можете оставить отзыв"
}
```

**Если пользователь не приобрел:**
```json
{
  "can_review": false,
  "has_review": false,
  "purchase_date": null,
  "message": "Для оставления отзыва необходимо приобрести товар"
}
```

**Если отзыв уже существует:**
```json
{
  "can_review": true,
  "has_review": true,
  "purchase_date": "2024-01-10T14:20:00Z",
  "existing_review_id": 1,
  "message": "Вы уже оставили отзыв. Вы можете обновить его."
}
```

---

## 3. Логика проверки покупки

### 3.1 Для товаров

Пользователь может оставить отзыв, если:
1. Существует заказ (`Order`) с товаром в статусе `delivered` или `shipped`
2. Пользователь является владельцем заказа
3. Товар присутствует в элементах заказа (`OrderItem`)

**Реализация:**
```python
def can_user_review_product(user, product):
    """Проверка возможности оставить отзыв на товар."""
    from apps.shop.models import Order, OrderItem
    
    # Проверяем наличие доставленных заказов с этим товаром
    orders = Order.objects.filter(
        user=user,
        status__in=['delivered', 'shipped']
    )
    
    order_items = OrderItem.objects.filter(
        order__in=orders,
        product=product
    )
    
    return order_items.exists()
```

### 3.2 Для курсов

Пользователь может оставить отзыв, если:
1. Существует запись `UserCourse` для пользователя и курса
2. Курс был приобретен (через оплату или бесплатно)

**Реализация:**
```python
def can_user_review_course(user, course):
    """Проверка возможности оставить отзыв на курс."""
    from apps.training.models import UserCourse
    
    return UserCourse.objects.filter(
        user=user,
        course=course
    ).exists()
```

---

## 4. Сериализаторы

### 4.1 ReviewCreateSerializer

```python
# apps/reviews/serializers.py

from rest_framework import serializers

class ReviewCreateSerializer(serializers.Serializer):
    """Сериализатор для создания отзыва."""
    
    rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        help_text="Рейтинг от 1 до 5"
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        min_length=10,
        max_length=2000,
        help_text="Комментарий (10-2000 символов)"
    )
    
    def validate_comment(self, value):
        """Валидация комментария."""
        if value and len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Комментарий должен содержать минимум 10 символов"
            )
        return value.strip() if value else None
```

### 4.2 ReviewUpdateSerializer

```python
class ReviewUpdateSerializer(serializers.Serializer):
    """Сериализатор для обновления отзыва."""
    
    rating = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=5
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        min_length=10,
        max_length=2000
    )
    
    def validate(self, attrs):
        """Проверка, что указано хотя бы одно поле для обновления."""
        if not attrs:
            raise serializers.ValidationError(
                "Необходимо указать хотя бы одно поле для обновления"
            )
        return attrs
```

---

## 5. Views (Контроллеры)

### 5.1 ProductReviewsView

```python
# apps/reviews/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.paginator import Paginator
from apps.shop.models import Product
from .models import Review
from .serializers import ReviewCreateSerializer, ReviewUpdateSerializer

class ProductReviewsView(APIView):
    """
    Получение отзывов товара.
    
    GET /api/reviews/products/{product_id}/
    """
    
    permission_classes = [AllowAny]  # Публичный доступ для просмотра
    
    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получаем одобренные отзывы
        reviews = Review.objects.filter(
            product=product,
            is_approved=True
        ).select_related('user').order_by('-created_at')
        
        # Пагинация
        page = int(request.query_params.get('page', 1))
        per_page = min(int(request.query_params.get('per_page', 10)), 50)
        paginator = Paginator(reviews, per_page)
        page_obj = paginator.get_page(page)
        
        # Отзыв текущего пользователя (если авторизован)
        user_review = None
        if request.user.is_authenticated:
            try:
                user_review_obj = Review.objects.get(
                    product=product,
                    user=request.user
                )
                user_review = user_review_obj.to_dict()
            except Review.DoesNotExist:
                pass
        
        # Распределение рейтингов
        rating_distribution = {}
        for rating_value in [5, 4, 3, 2, 1]:
            rating_distribution[str(rating_value)] = reviews.filter(
                rating=rating_value
            ).count()
        
        return Response({
            'reviews': [review.to_dict() for review in page_obj],
            'rating': round(product.get_average_rating(), 1),
            'reviews_count': product.get_reviews_count(),
            'rating_distribution': rating_distribution,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginator.count,
                'total_pages': paginator.num_pages
            },
            'user_review': user_review
        }, status=status.HTTP_200_OK)
```

### 5.2 CreateProductReviewView

```python
class CreateProductReviewView(APIView):
    """
    Создание отзыва на товар.
    
    POST /api/reviews/products/{product_id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка возможности оставить отзыв
        if not can_user_review_product(request.user, product):
            return Response(
                {'error': 'Для оставления отзыва необходимо приобрести товар'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверка существования отзыва
        existing_review = Review.objects.filter(
            product=product,
            user=request.user
        ).first()
        
        if existing_review:
            return Response(
                {'error': 'Отзыв уже существует. Используйте PUT для обновления.'},
                status=status.HTTP_409_CONFLICT
            )
        
        # Валидация данных
        serializer = ReviewCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создание отзыва
        review = Review.objects.create(
            product=product,
            user=request.user,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data.get('comment'),
            is_verified_purchase=True,
            review_type='product'
        )
        
        return Response({
            'message': 'Отзыв успешно создан',
            'review': review.to_dict()
        }, status=status.HTTP_201_CREATED)
```

### 5.3 UpdateProductReviewView

```python
class UpdateProductReviewView(APIView):
    """
    Обновление отзыва на товар.
    
    PUT /api/reviews/products/{product_id}/reviews/{review_id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request, product_id, review_id):
        try:
            review = Review.objects.get(
                id=review_id,
                product_id=product_id
            )
        except Review.DoesNotExist:
            return Response(
                {'error': 'Отзыв не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка прав
        if review.user != request.user:
            return Response(
                {'error': 'Нет прав на редактирование этого отзыва'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Валидация данных
        serializer = ReviewUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновление отзыва
        if 'rating' in serializer.validated_data:
            review.rating = serializer.validated_data['rating']
        if 'comment' in serializer.validated_data:
            review.comment = serializer.validated_data['comment']
        
        review.is_edited = True
        review.save()
        
        return Response({
            'message': 'Отзыв успешно обновлен',
            'review': review.to_dict()
        }, status=status.HTTP_200_OK)
```

### 5.4 DeleteProductReviewView

```python
class DeleteProductReviewView(APIView):
    """
    Удаление отзыва на товар.
    
    DELETE /api/reviews/products/{product_id}/reviews/{review_id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, product_id, review_id):
        try:
            review = Review.objects.get(
                id=review_id,
                product_id=product_id
            )
        except Review.DoesNotExist:
            return Response(
                {'error': 'Отзыв не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка прав
        if review.user != request.user:
            return Response(
                {'error': 'Нет прав на удаление этого отзыва'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        review.delete()
        
        return Response({
            'message': 'Отзыв успешно удален'
        }, status=status.HTTP_200_OK)
```

### 5.5 ProductReviewEligibilityView

```python
class ProductReviewEligibilityView(APIView):
    """
    Проверка возможности оставить отзыв на товар.
    
    GET /api/reviews/products/{product_id}/eligibility/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        can_review = can_user_review_product(request.user, product)
        has_review = Review.objects.filter(
            product=product,
            user=request.user
        ).exists()
        
        # Получаем дату покупки
        purchase_date = None
        if can_review:
            from apps.shop.models import Order, OrderItem
            order_item = OrderItem.objects.filter(
                order__user=request.user,
                order__status__in=['delivered', 'shipped'],
                product=product
            ).order_by('-order__created_at').first()
            
            if order_item:
                purchase_date = order_item.order.created_at
        
        return Response({
            'can_review': can_review,
            'has_review': has_review,
            'purchase_date': purchase_date.isoformat() if purchase_date else None,
            'message': (
                'Вы можете оставить отзыв' if can_review and not has_review
                else 'Вы уже оставили отзыв. Вы можете обновить его.' if has_review
                else 'Для оставления отзыва необходимо приобрести товар'
            )
        }, status=status.HTTP_200_OK)
```

---

## 6. URL маршруты

### 6.1 Создание файла urls.py

**Расположение:** `apps/reviews/urls.py`

```python
from django.urls import path
from .views import (
    ProductReviewsView,
    CreateProductReviewView,
    UpdateProductReviewView,
    DeleteProductReviewView,
    ProductReviewEligibilityView,
    CourseReviewsView,
    CreateCourseReviewView,
    UpdateCourseReviewView,
    DeleteCourseReviewView,
    CourseReviewEligibilityView,
)

urlpatterns = [
    # Отзывы на товары
    path('products/<int:product_id>/', ProductReviewsView.as_view(), name='product-reviews'),
    path('products/<int:product_id>/eligibility/', ProductReviewEligibilityView.as_view(), name='product-review-eligibility'),
    path('products/<int:product_id>/', CreateProductReviewView.as_view(), name='create-product-review'),
    path('products/<int:product_id>/reviews/<int:review_id>/', UpdateProductReviewView.as_view(), name='update-product-review'),
    path('products/<int:product_id>/reviews/<int:review_id>/', DeleteProductReviewView.as_view(), name='delete-product-review'),
    
    # Отзывы на курсы
    path('courses/<int:course_id>/', CourseReviewsView.as_view(), name='course-reviews'),
    path('courses/<int:course_id>/eligibility/', CourseReviewEligibilityView.as_view(), name='course-review-eligibility'),
    path('courses/<int:course_id>/', CreateCourseReviewView.as_view(), name='create-course-review'),
    path('courses/<int:course_id>/reviews/<int:review_id>/', UpdateCourseReviewView.as_view(), name='update-course-review'),
    path('courses/<int:course_id>/reviews/<int:review_id>/', DeleteCourseReviewView.as_view(), name='delete-course-review'),
]
```

### 6.2 Добавление в главный urls.py

**Расположение:** `config/urls.py`

```python
urlpatterns = [
    # ... существующие маршруты ...
    path('api/reviews/', include('apps.reviews.urls')),
]
```

---

## 7. Миграции

### 7.1 Создание миграции

```bash
python manage.py makemigrations reviews
python manage.py migrate
```

---

## 8. Обновление существующих эндпоинтов

### 8.1 GET /api/shop/products/{id}/

Добавить в ответ поле `is_purchased`:

```json
{
  "product": {
    "id": 5,
    "name": "Корм для собак",
    "rating": 4.5,
    "reviews_count": 25,
    "is_purchased": true,
    // ... остальные поля ...
  }
}
```

**Реализация:**
```python
# В apps/shop/views.py (ProductDetailView)

def get(self, request, product_id):
    # ... существующий код ...
    
    product_data = product.to_dict()
    
    # Добавляем информацию о покупке (если пользователь авторизован)
    if request.user.is_authenticated:
        product_data['is_purchased'] = can_user_review_product(request.user, product)
    else:
        product_data['is_purchased'] = False
    
    return Response({'product': product_data}, status=status.HTTP_200_OK)
```

### 8.2 GET /api/courses/{id}/

Аналогично добавить `is_purchased`:

```json
{
  "course": {
    "id": 10,
    "title": "Дрессировка щенка",
    "rating": 4.8,
    "reviews_count": 42,
    "is_purchased": true,
    // ... остальные поля ...
  },
  "is_owned": true
}
```

---

## 9. Безопасность и валидация

### 9.1 Проверки безопасности

1. **Авторизация:** Все операции создания/обновления/удаления требуют аутентификации
2. **Права доступа:** Пользователь может редактировать/удалять только свои отзывы
3. **Валидация покупки:** Строгая проверка наличия покупки перед созданием отзыва
4. **Защита от спама:** Один отзыв от пользователя на товар/курс (unique_together)
5. **Модерация:** Отзывы могут быть скрыты администратором (is_approved)

### 9.2 Валидация данных

- `rating`: 1-5, обязательное
- `comment`: 10-2000 символов, опциональное
- Проверка существования товара/курса
- Проверка прав пользователя

---

## 10. Производительность

### 10.1 Оптимизация запросов

1. Использовать `select_related('user')` для отзывов
2. Кэширование средних рейтингов (опционально)
3. Индексы на часто используемые поля
4. Пагинация для больших списков отзывов

### 10.2 Индексы базы данных

```python
# Уже указаны в Meta модели Review
indexes = [
    models.Index(fields=['product', 'is_approved']),
    models.Index(fields=['course', 'is_approved']),
    models.Index(fields=['user', 'review_type']),
]
```

---

## 11. Тестирование

### 11.1 Тестовые сценарии

1. Создание отзыва на приобретенный товар/курс
2. Попытка создать отзыв без покупки (должна быть ошибка 403)
3. Обновление своего отзыва
4. Попытка обновить чужой отзыв (должна быть ошибка 403)
5. Удаление своего отзыва
6. Получение списка отзывов с пагинацией
7. Проверка расчета среднего рейтинга
8. Проверка распределения рейтингов

---

## 12. Приоритет реализации

1. **Высокий:**
   - Модель Review
   - Эндпоинты для получения отзывов
   - Эндпоинты для создания отзывов
   - Проверка возможности оставить отзыв

2. **Средний:**
   - Обновление и удаление отзывов
   - Добавление рейтинга в Product.to_dict() и Course.to_dict()
   - Обновление эндпоинтов деталей товаров/курсов

3. **Низкий:**
   - Модерация отзывов
   - Статистика и аналитика
   - Кэширование рейтингов

---

## 13. Дополнительные возможности (опционально)

1. **Модерация отзывов:** Админ-панель для управления отзывами
2. **Ответы на отзывы:** Возможность продавцу/администратору отвечать на отзывы
3. **Полезность отзывов:** Кнопки "Полезно" / "Не полезно"
4. **Фильтрация отзывов:** По рейтингу, дате, наличию фото
5. **Фото в отзывах:** Загрузка изображений к отзывам
6. **Уведомления:** Уведомления о новых отзывах

---

## Заключение

Данное техническое задание описывает полную реализацию системы рейтингов и отзывов для товаров и курсов. Все эндпоинты должны быть реализованы с учетом безопасности, валидации и производительности.

