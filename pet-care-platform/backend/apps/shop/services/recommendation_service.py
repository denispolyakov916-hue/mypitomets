"""
RecommendationEngine - интеллектуальный движок рекомендаций.

Обеспечивает формирование рекомендаций на основе:
- Анализа истории покупок («Часто покупают вместе»)
- Правил связывания категорий
- Контекста PetID для персонализации
- Популярности товаров
"""

import logging
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Q, Avg
from django.core.cache import cache

logger = logging.getLogger('apps.shop')


# Правила связывания категорий товаров
CATEGORY_LINKS = {
    # Корма → Аксессуары для кормления
    'food': ['care', 'toys'],
    # Лекарства → Уход
    'pharmacy': ['care', 'food'],
    # Амуниция → Игрушки
    'ammunition': ['toys', 'care'],
    # Уход → Корма
    'care': ['food', 'toys'],
    # Игрушки → Лакомства, уход
    'toys': ['food', 'care'],
    # Переноски → Амуниция
    'transport': ['ammunition', 'care'],
}

# Правила связывания подкатегорий
SUBCATEGORY_LINKS = {
    # Сухой корм → Консервы, лакомства
    'dry': ['wet', 'canned', 'treats'],
    # Влажный корм → Сухой корм
    'wet': ['dry', 'treats'],
    # Лакомства → Игрушки
    'treats': ['toys', 'dry'],
    # Витамины → Корма
    'vitamins': ['dry', 'wet'],
    # Ошейники → Поводки
    'collars': ['leashes', 'harnesses'],
    # Поводки → Ошейники
    'leashes': ['collars', 'harnesses'],
}


@dataclass
class RecommendationItem:
    """Элемент рекомендации."""
    product_id: int
    product_data: Dict[str, Any]
    score: float
    reason: str
    reason_type: str  # 'frequently_bought', 'category_link', 'popular', 'pet_match'


@dataclass
class RecommendationResult:
    """Результат генерации рекомендаций."""
    items: List[RecommendationItem] = field(default_factory=list)
    source_product_id: Optional[int] = None
    total_analyzed_orders: int = 0
    
    def to_list(self) -> List[Dict[str, Any]]:
        """Преобразование в список для API."""
        return [
            {
                'id': item.product_id,
                'score': round(item.score, 2),
                'reason': item.reason,
                'reason_type': item.reason_type,
                **item.product_data
            }
            for item in self.items
        ]


class RecommendationEngine:
    """
    Движок рекомендаций товаров.
    
    Использует комбинацию алгоритмов:
    1. Collaborative Filtering (на основе истории заказов)
    2. Content-Based (на основе категорий и атрибутов)
    3. PetID Matching (на основе профиля питомца)
    """
    
    # Веса для разных типов рекомендаций
    WEIGHTS = {
        'frequently_bought': 1.0,
        'category_link': 0.6,
        'popular': 0.4,
        'pet_match': 0.8,
    }
    
    # Время кэширования (секунды)
    CACHE_TTL = 300  # 5 минут
    
    @classmethod
    def get_frequently_bought_together(
        cls,
        product_id: int,
        limit: int = 6,
        user=None
    ) -> RecommendationResult:
        """
        Получить товары, которые часто покупают вместе.
        
        Args:
            product_id: ID исходного товара
            limit: Максимальное количество рекомендаций
            user: Пользователь для персонализации (опционально)
            
        Returns:
            RecommendationResult: Результат с рекомендациями
        """
        from apps.shop.models import Product, OrderItem, Order
        
        # Проверяем кэш
        cache_key = f'fbt_{product_id}_{limit}'
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Получаем исходный товар
        try:
            source_product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return RecommendationResult()
        
        result = RecommendationResult(source_product_id=product_id)
        seen_ids: Set[int] = {product_id}
        recommendations: List[RecommendationItem] = []
        
        # 1. Анализ истории заказов
        orders_with_product = OrderItem.objects.filter(
            product_id=product_id,
            order__status__in=['processing', 'shipped', 'delivered']
        ).values_list('order_id', flat=True).distinct()
        
        result.total_analyzed_orders = len(orders_with_product)
        
        if orders_with_product:
            # Находим товары из тех же заказов
            related_items = OrderItem.objects.filter(
                order_id__in=orders_with_product,
                product__isnull=False,
                product__in_stock=True
            ).exclude(
                product_id=product_id
            ).values('product_id').annotate(
                frequency=Count('product_id')
            ).order_by('-frequency')[:limit * 2]
            
            # Получаем данные товаров
            product_ids = [item['product_id'] for item in related_items]
            products = Product.objects.catalog().filter(id__in=product_ids)
            products_dict = {p.id: p for p in products}
            
            for item in related_items:
                pid = item['product_id']
                if pid in products_dict and pid not in seen_ids:
                    product = products_dict[pid]
                    frequency = item['frequency']
                    
                    # Вычисляем score на основе частоты
                    score = min(1.0, frequency / max(1, result.total_analyzed_orders)) * cls.WEIGHTS['frequently_bought']
                    
                    recommendations.append(RecommendationItem(
                        product_id=pid,
                        product_data=product.to_dict(),
                        score=score,
                        reason=f'Покупают вместе ({frequency} раз)',
                        reason_type='frequently_bought'
                    ))
                    seen_ids.add(pid)
                    
                    if len(recommendations) >= limit:
                        break
        
        # 2. Если мало данных, добавляем по категориям
        if len(recommendations) < limit:
            category_recs = cls._get_category_based_recommendations(
                source_product, 
                limit - len(recommendations),
                seen_ids
            )
            recommendations.extend(category_recs)
            seen_ids.update(r.product_id for r in category_recs)
        
        # 3. Добавляем популярные товары как fallback
        if len(recommendations) < limit:
            popular_recs = cls._get_popular_recommendations(
                source_product.animal,
                limit - len(recommendations),
                seen_ids
            )
            recommendations.extend(popular_recs)
        
        # 4. Применяем персонализацию если есть пользователь
        if user and user.is_authenticated:
            recommendations = cls._apply_personalization(recommendations, user)
        
        # Сортируем по score
        recommendations.sort(key=lambda x: x.score, reverse=True)
        result.items = recommendations[:limit]
        
        # Кэшируем результат
        cache.set(cache_key, result, cls.CACHE_TTL)
        
        return result
    
    @classmethod
    def _get_category_based_recommendations(
        cls,
        source_product,
        limit: int,
        exclude_ids: Set[int]
    ) -> List[RecommendationItem]:
        """Рекомендации на основе связей категорий."""
        from apps.shop.models import Product
        
        recommendations = []
        
        # Получаем связанные категории
        linked_categories = CATEGORY_LINKS.get(source_product.category, [])
        linked_subcategories = SUBCATEGORY_LINKS.get(source_product.subcategory, [])
        
        if not linked_categories and not linked_subcategories:
            return recommendations
        
        # Запрос товаров из связанных категорий
        q_filter = Q()
        
        if linked_categories:
            q_filter |= Q(category__in=linked_categories)
        
        if linked_subcategories:
            q_filter |= Q(subcategory__in=linked_subcategories)
        
        related_products = Product.objects.catalog().filter(
            q_filter,
            animal=source_product.animal,
            in_stock=True
        ).exclude(
            id__in=exclude_ids
        ).order_by('-order_count', '-_avg_rating')[:limit]
        
        for product in related_products:
            # Определяем причину рекомендации
            if product.category in linked_categories:
                reason = f'Подходит к {source_product.category_name or source_product.category}'
            else:
                reason = 'Часто покупают вместе'
            
            recommendations.append(RecommendationItem(
                product_id=product.id,
                product_data=product.to_dict(),
                score=cls.WEIGHTS['category_link'],
                reason=reason,
                reason_type='category_link'
            ))
        
        return recommendations
    
    @classmethod
    def _get_popular_recommendations(
        cls,
        animal: str,
        limit: int,
        exclude_ids: Set[int]
    ) -> List[RecommendationItem]:
        """Популярные товары как fallback."""
        from apps.shop.models import Product
        
        recommendations = []
        
        popular_products = Product.objects.catalog().filter(
            animal=animal,
            in_stock=True
        ).exclude(
            id__in=exclude_ids
        ).order_by('-order_count', '-_avg_rating')[:limit]
        
        for product in popular_products:
            recommendations.append(RecommendationItem(
                product_id=product.id,
                product_data=product.to_dict(),
                score=cls.WEIGHTS['popular'],
                reason='Популярный товар',
                reason_type='popular'
            ))
        
        return recommendations
    
    @classmethod
    def _apply_personalization(
        cls,
        recommendations: List[RecommendationItem],
        user
    ) -> List[RecommendationItem]:
        """Применить персонализацию на основе PetID."""
        from apps.pets.services import PersonalizationService
        
        context = PersonalizationService.get_context(user)
        
        if context.is_empty:
            return recommendations
        
        # Повышаем score для товаров, соответствующих питомцам пользователя
        for rec in recommendations:
            product_data = rec.product_data
            
            # Проверяем соответствие виду животного
            product_animal = product_data.get('animal')
            if product_animal in context.animal_types:
                rec.score += 0.2
            
            # Проверяем на аллергены (понижаем score)
            product_name = product_data.get('name', '').lower()
            for allergen in context.all_allergies:
                if allergen.lower() in product_name:
                    rec.score -= 0.5
                    break
            
            # Проверяем на любимые продукты (повышаем score)
            for favorite in context.all_favorites:
                if favorite.lower() in product_name:
                    rec.score += 0.3
                    rec.reason_type = 'pet_match'
                    rec.reason = f'Подходит для ваших питомцев'
                    break
        
        return recommendations
    
    @classmethod
    def get_cart_recommendations(
        cls,
        user,
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Получить рекомендации для корзины.
        
        Анализирует товары в корзине и предлагает дополнения.
        
        Args:
            user: Пользователь
            limit: Максимальное количество рекомендаций
            
        Returns:
            List[Dict]: Список рекомендаций
        """
        from apps.shop.models import Cart, Product
        from apps.shop.services import CartService
        
        cart_items = CartService.get_cart_items(user, 'products')
        
        if not cart_items:
            return []
        
        # Собираем ID товаров в корзине
        cart_product_ids = {item.product_id for item in cart_items if item.product}
        
        all_recommendations: Dict[int, RecommendationItem] = {}
        
        # Для каждого товара в корзине получаем рекомендации
        for item in cart_items:
            if not item.product:
                continue
            
            result = cls.get_frequently_bought_together(
                item.product_id,
                limit=4,
                user=user
            )
            
            for rec in result.items:
                if rec.product_id in cart_product_ids:
                    continue
                
                if rec.product_id in all_recommendations:
                    # Увеличиваем score если товар рекомендуется для нескольких позиций
                    all_recommendations[rec.product_id].score += rec.score * 0.5
                else:
                    all_recommendations[rec.product_id] = rec
        
        # Сортируем по score
        sorted_recs = sorted(
            all_recommendations.values(),
            key=lambda x: x.score,
            reverse=True
        )[:limit]
        
        return [
            {
                'id': rec.product_id,
                'score': round(rec.score, 2),
                'reason': rec.reason,
                'reason_type': rec.reason_type,
                **rec.product_data
            }
            for rec in sorted_recs
        ]
    
    @classmethod
    def get_cross_sell_for_courses(
        cls,
        course_id: int,
        user=None,
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Получить рекомендации товаров для курса (кросс-продажи).
        
        Args:
            course_id: ID курса
            user: Пользователь
            limit: Лимит рекомендаций
            
        Returns:
            List[Dict]: Рекомендуемые товары
        """
        from apps.training.models import Course
        from apps.shop.models import Product
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return []
        
        # Определяем категории товаров по категории курса
        course_to_product_categories = {
            'basics': ['food', 'care'],
            'training': ['ammunition', 'toys', 'treats'],
            'care': ['care', 'pharmacy'],
            'health': ['pharmacy', 'food'],
            'nutrition': ['food'],
            'behavior': ['toys', 'ammunition'],
            'specialized': ['pharmacy', 'care'],
            'fun': ['toys'],
        }
        
        product_categories = course_to_product_categories.get(
            course.category, ['food', 'toys']
        )
        
        # Запрос товаров
        products = Product.objects.catalog().filter(
            category__in=product_categories,
            in_stock=True
        )
        
        # Фильтруем по виду животного
        if course.pet_type != 'all':
            products = products.filter(
                Q(animal=course.pet_type) | Q(animal='all')
            )
        
        products = products.order_by('-order_count', '-_avg_rating')[:limit]
        
        recommendations = []
        for product in products:
            recommendations.append({
                **product.to_dict(),
                'reason': f'Рекомендуем к курсу "{course.title}"',
                'reason_type': 'course_cross_sell'
            })
        
        return recommendations


# Сокращённый импорт
recommendation_engine = RecommendationEngine()

