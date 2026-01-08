"""
CartService - централизованный сервис для работы с корзиной.

Обеспечивает единую точку входа для всех операций с корзиной:
- Добавление товаров и курсов
- Обновление количества
- Удаление элементов
- Валидация доступности
- Расчёт итогов
"""

from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from core.services import BaseService, ServiceResult


@dataclass
class CartSummary:
    """Сводка по корзине."""
    products_count: int
    products_total: Decimal
    courses_count: int
    courses_total: Decimal
    total_items: int
    total_amount: Decimal
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'products_count': self.products_count,
            'products_total': float(self.products_total),
            'courses_count': self.courses_count,
            'courses_total': float(self.courses_total),
            'total_items': self.total_items,
            'total_amount': float(self.total_amount),
        }


class CartService(BaseService):
    """
    Сервис для работы с корзиной пользователя.
    
    Предоставляет методы для:
    - Получения или создания корзины
    - Добавления товаров и курсов
    - Обновления количества
    - Удаления элементов
    - Расчёта итогов
    - Валидации доступности
    """
    
    @staticmethod
    def get_or_create_cart(user):
        """
        Получить или создать корзину пользователя.
        
        Args:
            user: Объект пользователя
            
        Returns:
            Cart: Объект корзины
        """
        from apps.shop.models import Cart
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart
    
    @classmethod
    def get_cart_items(cls, user, item_type: str = 'all') -> List[Any]:
        """
        Получить элементы корзины.
        
        Args:
            user: Объект пользователя
            item_type: 'all', 'products', 'courses'
            
        Returns:
            List: Список элементов корзины
        """
        cart = cls.get_or_create_cart(user)
        items = cart.items.select_related('product', 'course', 'pet').order_by('id')
        
        if item_type == 'products':
            items = items.filter(product__isnull=False)
        elif item_type == 'courses':
            items = items.filter(course__isnull=False)
        
        return list(items)
    
    @classmethod
    def get_cart_summary(cls, user) -> CartSummary:
        """
        Получить сводку по корзине.
        
        Args:
            user: Объект пользователя
            
        Returns:
            CartSummary: Сводка по корзине
        """
        items = cls.get_cart_items(user)
        
        products_count = 0
        products_total = Decimal('0.00')
        courses_count = 0
        courses_total = Decimal('0.00')
        
        for item in items:
            if item.product:
                products_count += item.quantity
                products_total += Decimal(str(item.get_total()))
            elif item.course:
                courses_count += 1
                courses_total += Decimal(str(item.get_total()))
        
        return CartSummary(
            products_count=products_count,
            products_total=products_total,
            courses_count=courses_count,
            courses_total=courses_total,
            total_items=products_count + courses_count,
            total_amount=products_total + courses_total
        )
    
    @classmethod
    @transaction.atomic
    def add_product(cls, user, product_id: int, quantity: int = 1) -> ServiceResult:
        """
        Добавить товар в корзину.
        
        Args:
            user: Объект пользователя
            product_id: ID товара
            quantity: Количество
            
        Returns:
            CartItemResult: Результат операции
        """
        from apps.shop.models import Product, CartItem
        
        # Валидация товара
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return ServiceResult(
                success=False,
                message='Товар не найден',
                error_code='PRODUCT_NOT_FOUND'
            )
        
        # Проверка наличия
        if not product.in_stock:
            return ServiceResult(
                success=False,
                message='Товар отсутствует в наличии',
                error_code='OUT_OF_STOCK'
            )
        
        # Проверка доступного количества
        if product.stock_count < quantity:
            return ServiceResult(
                success=False,
                message=f'Недостаточно товара на складе. Доступно: {product.stock_count}',
                error_code='INSUFFICIENT_STOCK'
            )
        
        cart = cls.get_or_create_cart(user)
        
        # Проверяем, есть ли уже этот товар в корзине
        existing_item = cart.items.filter(product=product).first()
        
        if existing_item:
            new_quantity = existing_item.quantity + quantity
            
            # Проверка общего количества
            if new_quantity > product.stock_count:
                return CartItemResult(
                    success=False,
                    message=f'Превышено доступное количество. В корзине: {existing_item.quantity}, доступно: {product.stock_count}',
                    error_code='EXCEEDS_STOCK'
                )
            
            existing_item.quantity = new_quantity
            existing_item.save()
            
            CartService.log_info(f"Товар обновлён в корзине: {product.name}, количество: {new_quantity}")
            return ServiceResult(
                success=True,
                message='Количество товара обновлено',
                data={'item': existing_item}
            )
        else:
            # Создаём новый элемент
            item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity
            )
            
            CartService.log_info(f"Товар добавлен в корзину: {product.name}, количество: {quantity}")
            return ServiceResult(
                success=True,
                message='Товар добавлен в корзину',
                data={'item': item}
            )
    
    @classmethod
    @transaction.atomic
    def add_course(cls, user, course_id: int, pet_id: Optional[str] = None,
                   disclaimer_accepted: bool = False) -> ServiceResult:
        """
        Добавить курс в корзину.
        
        Args:
            user: Объект пользователя
            course_id: ID курса
            pet_id: ID питомца (опционально)
            disclaimer_accepted: Согласие с условиями
            
        Returns:
            CartItemResult: Результат операции
        """
        from apps.shop.models import CartItem
        from apps.training.models import Course, UserCourse
        from apps.pets.models import Pet
        
        # Валидация курса
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return ServiceResult(
                success=False,
                message='Курс не найден или недоступен',
                error_code='COURSE_NOT_FOUND'
            )
        
        # Проверка: уже куплен?
        if UserCourse.objects.filter(user=user, course=course).exists():
            return ServiceResult(
                success=False,
                message='Вы уже приобрели этот курс',
                error_code='ALREADY_PURCHASED'
            )
        
        # Проверка согласия для платных курсов
        if course.price > 0 and not disclaimer_accepted:
            return ServiceResult(
                success=False,
                message='Необходимо принять условия использования курса',
                error_code='DISCLAIMER_REQUIRED'
            )
        
        # Валидация питомца
        pet = None
        if pet_id:
            try:
                pet = Pet.objects.get(id=pet_id, owner=user)
                
                # Проверка совместимости курса с видом питомца
                if course.pet_type != 'all' and course.pet_type != pet.species:
                    return ServiceResult(
                        success=False,
                        message=f'Этот курс не подходит для {pet.get_species_display()}',
                        error_code='PET_TYPE_MISMATCH'
                    )
            except Pet.DoesNotExist:
                return ServiceResult(
                    success=False,
                    message='Питомец не найден',
                    error_code='PET_NOT_FOUND'
                )
        
        cart = cls.get_or_create_cart(user)
        
        # Проверяем, есть ли уже этот курс в корзине
        existing_item = cart.items.filter(course=course).first()
        
        if existing_item:
            # Обновляем данные если нужно
            if pet and existing_item.pet != pet:
                existing_item.pet = pet
                existing_item.save()
            
            return ServiceResult(
                success=True,
                message='Курс уже в корзине',
                data={'item': existing_item}
            )
        
        # Создаём новый элемент
        item = CartItem.objects.create(
            cart=cart,
            course=course,
            pet=pet,
            quantity=1,
            disclaimer_accepted=disclaimer_accepted
        )
        
        CartService.log_info(f"Курс добавлен в корзину: {course.title}, пользователь: {user.email}")
        return ServiceResult(
            success=True,
            message='Курс добавлен в корзину',
            data={'item': item}
        )
    
    @classmethod
    @transaction.atomic
    def update_product_quantity(cls, user, product_id: int, 
                                quantity: Optional[int] = None,
                                delta: Optional[int] = None) -> ServiceResult:
        """
        Обновить количество товара в корзине.
        
        Args:
            user: Объект пользователя
            product_id: ID товара
            quantity: Абсолютное количество (None = использовать delta)
            delta: Относительное изменение (+1, -1)
            
        Returns:
            CartItemResult: Результат операции
        """
        from apps.shop.models import Product
        
        cart = cls.get_or_create_cart(user)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return ServiceResult(
                success=False,
                message='Товар не найден',
                error_code='PRODUCT_NOT_FOUND'
            )
        
        item = cart.items.filter(product=product).first()
        
        if not item:
            return ServiceResult(
                success=False,
                message='Товар не найден в корзине',
                error_code='ITEM_NOT_IN_CART'
            )
        
        # Вычисляем новое количество
        if quantity is not None:
            new_quantity = quantity
        elif delta is not None:
            new_quantity = item.quantity + delta
        else:
            return ServiceResult(
                success=False,
                message='Укажите quantity или delta',
                error_code='INVALID_PARAMS'
            )
        
        # Удаление при нулевом количестве
        if new_quantity <= 0:
            item.delete()
            CartService.log_info(f"Товар удалён из корзины: {product.name}")
            return ServiceResult(
                success=True,
                message='Товар удалён из корзины'
            )
        
        # Проверка наличия
        if new_quantity > product.stock_count:
            return ServiceResult(
                success=False,
                message=f'Недостаточно товара. Доступно: {product.stock_count}',
                error_code='INSUFFICIENT_STOCK'
            )
        
        item.quantity = new_quantity
        item.save()
        
        CartService.log_info(f"Количество товара обновлено: {product.name}, новое количество: {new_quantity}")
        return ServiceResult(
            success=True,
            message='Количество обновлено',
            data={'item': item}
        )
    
    @classmethod
    @transaction.atomic
    def remove_item(cls, user, product_id: Optional[int] = None,
                    course_id: Optional[int] = None) -> ServiceResult:
        """
        Удалить элемент из корзины.
        
        Args:
            user: Объект пользователя
            product_id: ID товара
            course_id: ID курса
            
        Returns:
            CartItemResult: Результат операции
        """
        cart = cls.get_or_create_cart(user)
        
        if product_id:
            item = cart.items.filter(product_id=product_id).first()
            item_name = f"товар ID={product_id}"
        elif course_id:
            item = cart.items.filter(course_id=course_id).first()
            item_name = f"курс ID={course_id}"
        else:
            return ServiceResult(
                success=False,
                message='Укажите product_id или course_id',
                error_code='INVALID_PARAMS'
            )
        
        if not item:
            return ServiceResult(
                success=False,
                message='Элемент не найден в корзине',
                error_code='ITEM_NOT_IN_CART'
            )
        
        item.delete()
        CartService.log_info(f"Удалён из корзины: {item_name}, пользователь: {user.email}")
        
        return ServiceResult(
            success=True,
            message='Элемент удалён из корзины'
        )
    
    @classmethod
    @transaction.atomic
    def clear_cart(cls, user, item_type: str = 'all') -> Dict[str, int]:
        """
        Очистить корзину.
        
        Args:
            user: Объект пользователя
            item_type: 'all', 'products', 'courses'
            
        Returns:
            Dict: Количество удалённых элементов
        """
        cart = cls.get_or_create_cart(user)
        
        items = cart.items.all()
        
        if item_type == 'products':
            items = items.filter(product__isnull=False)
        elif item_type == 'courses':
            items = items.filter(course__isnull=False)
        
        count = items.count()
        items.delete()
        
        CartService.log_info(f"Корзина очищена: {count} элементов, тип: {item_type}, пользователь: {user.email}")
        
        return {'deleted_count': count}
    
    @classmethod
    def validate_cart_for_checkout(cls, user, selected_item_ids: Optional[List[int]] = None) -> Tuple[bool, List[str], List[Any]]:
        """
        Валидация корзины перед оформлением заказа.
        
        Args:
            user: Объект пользователя
            selected_item_ids: Список ID выбранных элементов (опционально)
            
        Returns:
            Tuple[bool, List[str], List[Any]]: 
                - Успех валидации
                - Список ошибок
                - Список валидных элементов
        """
        cart = cls.get_or_create_cart(user)
        
        if selected_item_ids:
            items = cart.items.filter(id__in=selected_item_ids).select_related('product', 'course', 'pet')
        else:
            items = cart.items.select_related('product', 'course', 'pet').all()
        
        items = list(items)
        
        if not items:
            return False, ['Корзина пуста'], []
        
        errors = []
        valid_items = []
        
        for item in items:
            if item.product:
                # Проверка наличия товара
                if not item.product.in_stock:
                    errors.append(f'Товар "{item.product.name}" отсутствует в наличии')
                    continue
                
                # Проверка количества
                if item.quantity > item.product.stock_count:
                    errors.append(
                        f'Товара "{item.product.name}" недостаточно. '
                        f'В корзине: {item.quantity}, доступно: {item.product.stock_count}'
                    )
                    continue
                
                valid_items.append(item)
                
            elif item.course:
                from apps.training.models import UserCourse
                
                # Проверка активности курса
                if not item.course.is_active:
                    errors.append(f'Курс "{item.course.title}" недоступен')
                    continue
                
                # Проверка: уже куплен?
                if UserCourse.objects.filter(user=user, course=item.course).exists():
                    errors.append(f'Курс "{item.course.title}" уже приобретён')
                    continue
                
                valid_items.append(item)
        
        is_valid = len(errors) == 0 and len(valid_items) > 0
        
        return is_valid, errors, valid_items
    
    @classmethod
    def get_cart_data(cls, user) -> Dict[str, Any]:
        """
        Получить полные данные корзины для API.
        
        Args:
            user: Объект пользователя
            
        Returns:
            Dict: Данные корзины
        """
        items = cls.get_cart_items(user)
        summary = cls.get_cart_summary(user)
        
        products = []
        courses = []
        
        for item in items:
            item_data = {
                'id': item.id,
                'quantity': item.quantity,
                'price': float(item.get_total()),
            }
            
            if item.product:
                item_data['product'] = item.product.to_dict()
                products.append(item_data)
            elif item.course:
                item_data['course'] = item.course.to_dict(detailed=True)
                item_data['disclaimer_accepted'] = item.disclaimer_accepted
                if item.pet:
                    item_data['pet'] = {
                        'id': str(item.pet.id),
                        'name': item.pet.name,
                        'species': item.pet.species,
                        'species_display': item.pet.get_species_display(),
                    }
                courses.append(item_data)
        
        return {
            'products': products,
            'courses': courses,
            'summary': summary.to_dict(),
            'has_products': len(products) > 0,
            'has_courses': len(courses) > 0,
        }


# Сокращённый импорт
cart_service = CartService()

