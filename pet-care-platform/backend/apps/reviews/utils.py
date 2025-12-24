"""
Утилиты для проверки возможности оставить отзыв.
"""


def can_user_review_product(user, product):
    """
    Проверка возможности оставить отзыв на товар.
    
    Пользователь может оставить отзыв, если:
    1. Существует заказ (Order) с товаром в статусе 'delivered' или 'shipped'
    2. Пользователь является владельцем заказа
    3. Товар присутствует в элементах заказа (OrderItem)
    """
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


def can_user_review_course(user, course):
    """
    Проверка возможности оставить отзыв на курс.
    
    Пользователь может оставить отзыв, если:
    1. Существует запись UserCourse для пользователя и курса
    2. Курс был приобретен (через оплату или бесплатно)
    """
    from apps.training.models import UserCourse
    
    return UserCourse.objects.filter(
        user=user,
        course=course
    ).exists()

