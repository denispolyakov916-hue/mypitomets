"""
Views для работы с отзывами и рейтингами.
"""

import logging
from django.core.paginator import Paginator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Avg

from .models import Review
from .serializers import ReviewCreateSerializer, ReviewUpdateSerializer
from .utils import can_user_review_product, can_user_review_course

logger = logging.getLogger('apps.reviews')


class ProductReviewsView(APIView):
    """
    Получение и создание отзывов товара.
    
    GET  /api/reviews/products/{product_id}/ - получение отзывов
    POST /api/reviews/products/{product_id}/ - создание отзыва
    """
    
    def get(self, request, product_id):
        try:
            from apps.shop.models import Product
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
        
        # Получаем средний рейтинг и количество отзывов
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0
        reviews_count = reviews.count()
        
        return Response({
            'reviews': [review.to_dict() for review in page_obj],
            'rating': round(avg_rating, 1),
            'reviews_count': reviews_count,
            'rating_distribution': rating_distribution,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginator.count,
                'total_pages': paginator.num_pages
            },
            'user_review': user_review
        }, status=status.HTTP_200_OK)
    
    def post(self, request, product_id):
        # Проверка аутентификации для POST
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Требуется аутентификация'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            from apps.shop.models import Product
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


class ProductReviewEligibilityView(APIView):
    """
    Проверка возможности оставить отзыв на товар.
    
    GET /api/reviews/products/{product_id}/eligibility/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, product_id):
        try:
            from apps.shop.models import Product, OrderItem
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
            order_item = OrderItem.objects.filter(
                order__user=request.user,
                order__status__in=['processing', 'shipped', 'delivered'],
                product=product
            ).order_by('-order__created_at').first()
            
            if order_item:
                purchase_date = order_item.order.created_at
        
        existing_review_id = None
        if has_review:
            existing_review = Review.objects.filter(
                product=product,
                user=request.user
            ).first()
            if existing_review:
                existing_review_id = existing_review.id
        
        return Response({
            'can_review': can_review,
            'has_review': has_review,
            'purchase_date': purchase_date.isoformat() if purchase_date else None,
            'existing_review_id': existing_review_id,
            'message': (
                'Вы можете оставить отзыв' if can_review and not has_review
                else 'Вы уже оставили отзыв. Вы можете обновить его.' if has_review
                else 'Для оставления отзыва необходимо приобрести товар'
            )
        }, status=status.HTTP_200_OK)


class CourseReviewsView(APIView):
    """
    Получение и создание отзывов курса.
    
    GET  /api/reviews/courses/{course_id}/ - получение отзывов
    POST /api/reviews/courses/{course_id}/ - создание отзыва
    """
    
    def get(self, request, course_id):
        try:
            from apps.training.models import Course
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получаем одобренные отзывы
        reviews = Review.objects.filter(
            course=course,
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
                    course=course,
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
        
        # Получаем средний рейтинг и количество отзывов
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0
        reviews_count = reviews.count()
        
        return Response({
            'reviews': [review.to_dict() for review in page_obj],
            'rating': round(avg_rating, 1),
            'reviews_count': reviews_count,
            'rating_distribution': rating_distribution,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginator.count,
                'total_pages': paginator.num_pages
            },
            'user_review': user_review
        }, status=status.HTTP_200_OK)
    
    def post(self, request, course_id):
        # Проверка аутентификации для POST
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Требуется аутентификация'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            from apps.training.models import Course
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка возможности оставить отзыв
        if not can_user_review_course(request.user, course):
            return Response(
                {'error': 'Для оставления отзыва необходимо приобрести курс'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверка существования отзыва
        existing_review = Review.objects.filter(
            course=course,
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
            course=course,
            user=request.user,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data.get('comment'),
            is_verified_purchase=True,
            review_type='course'
        )
        
        return Response({
            'message': 'Отзыв успешно создан',
            'review': review.to_dict()
        }, status=status.HTTP_201_CREATED)


class UpdateCourseReviewView(APIView):
    """
    Обновление отзыва на курс.
    
    PUT /api/reviews/courses/{course_id}/reviews/{review_id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request, course_id, review_id):
        try:
            review = Review.objects.get(
                id=review_id,
                course_id=course_id
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


class DeleteCourseReviewView(APIView):
    """
    Удаление отзыва на курс.
    
    DELETE /api/reviews/courses/{course_id}/reviews/{review_id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, course_id, review_id):
        try:
            review = Review.objects.get(
                id=review_id,
                course_id=course_id
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


class CourseReviewEligibilityView(APIView):
    """
    Проверка возможности оставить отзыв на курс.
    
    GET /api/reviews/courses/{course_id}/eligibility/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, course_id):
        try:
            from apps.training.models import Course, UserCourse
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        can_review = can_user_review_course(request.user, course)
        has_review = Review.objects.filter(
            course=course,
            user=request.user
        ).exists()
        
        # Получаем дату покупки
        purchase_date = None
        existing_review_id = None
        if can_review:
            user_course = UserCourse.objects.filter(
                user=request.user,
                course=course
            ).order_by('-purchased_at').first()
            
            if user_course:
                purchase_date = user_course.purchased_at
        
        if has_review:
            existing_review = Review.objects.filter(
                course=course,
                user=request.user
            ).first()
            if existing_review:
                existing_review_id = existing_review.id
        
        return Response({
            'can_review': can_review,
            'has_review': has_review,
            'purchase_date': purchase_date.isoformat() if purchase_date else None,
            'existing_review_id': existing_review_id,
            'message': (
                'Вы можете оставить отзыв' if can_review and not has_review
                else 'Вы уже оставили отзыв. Вы можете обновить его.' if has_review
                else 'Для оставления отзыва необходимо приобрести курс'
            )
        }, status=status.HTTP_200_OK)


class RecentPurchasesForReviewView(APIView):
    """
    Получение недавно приобретенных товаров и курсов с предложением оставить отзыв.
    
    GET /api/reviews/recent-purchases/
    
    Возвращает список товаров и курсов, которые были приобретены недавно
    и на которые пользователь еще не оставил отзыв.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from apps.shop.models import Order, OrderItem
        from apps.training.models import UserCourse
        from datetime import timedelta
        from django.utils import timezone
        
        # Период "недавно" - последние 90 дней
        recent_date = timezone.now() - timedelta(days=90)
        
        # Получаем недавно приобретенные товары
        recent_orders = Order.objects.filter(
            user=request.user,
            status__in=['processing', 'shipped', 'delivered'],
            created_at__gte=recent_date
        ).order_by('-created_at')
        
        recent_products = []
        product_ids_seen = set()
        
        for order in recent_orders:
            order_items = OrderItem.objects.filter(
                order=order,
                product__isnull=False
            ).select_related('product')
            
            for item in order_items:
                product = item.product
                product_id = product.id
                
                # Пропускаем дубликаты
                if product_id in product_ids_seen:
                    continue
                product_ids_seen.add(product_id)
                
                # Проверяем, может ли пользователь оставить отзыв
                can_review = can_user_review_product(request.user, product)
                
                # Проверяем, есть ли уже отзыв
                has_review = Review.objects.filter(
                    product=product,
                    user=request.user
                ).exists()
                
                # Добавляем только если может оставить отзыв и еще не оставил
                if can_review and not has_review:
                    recent_products.append({
                        'id': product.id,
                        'name': product.name,
                        'price': float(product.price),
                        'image': product.main_image,
                        'purchase_date': order.created_at.isoformat(),
                        'type': 'product',
                        'can_review': True,
                        'has_review': False
                    })
        
        # Получаем недавно приобретенные курсы
        recent_user_courses = UserCourse.objects.filter(
            user=request.user,
            purchased_at__gte=recent_date
        ).select_related('course').order_by('-purchased_at')
        
        recent_courses = []
        course_ids_seen = set()
        
        for user_course in recent_user_courses:
            course = user_course.course
            course_id = course.id
            
            # Пропускаем дубликаты
            if course_id in course_ids_seen:
                continue
            course_ids_seen.add(course_id)
            
            # Проверяем, может ли пользователь оставить отзыв
            can_review = can_user_review_course(request.user, course)
            
            # Проверяем, есть ли уже отзыв
            has_review = Review.objects.filter(
                course=course,
                user=request.user
            ).exists()
            
            # Добавляем только если может оставить отзыв и еще не оставил
            if can_review and not has_review:
                recent_courses.append({
                    'id': course.id,
                    'title': course.title,
                    'description': course.description,
                    'price': float(course.price),
                    'image': course.image_url,
                    'purchase_date': user_course.purchased_at.isoformat() if user_course.purchased_at else None,
                    'type': 'course',
                    'can_review': True,
                    'has_review': False
                })
        
        # Сортируем по дате покупки (от новых к старым)
        all_items = recent_products + recent_courses
        all_items.sort(key=lambda x: x['purchase_date'], reverse=True)
        
        # Ограничиваем до последних 10
        all_items = all_items[:10]
        
        return Response({
            'recent_purchases': all_items,
            'products_count': len(recent_products),
            'courses_count': len(recent_courses),
            'total_count': len(all_items)
        }, status=status.HTTP_200_OK)

