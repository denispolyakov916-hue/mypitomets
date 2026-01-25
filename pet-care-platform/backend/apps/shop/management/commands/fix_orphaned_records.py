"""
Management команда для исправления orphaned записей.

Исправляет записи, которые ссылаются на несуществующие объекты.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.shop.models import Order, OrderItem, Cart, CartItem
from apps.training.models import CoursePage, ContentBlock
from apps.pets.models import Pet


class Command(BaseCommand):
    help = 'Исправление orphaned записей'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Исправить orphaned записи',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только проверить, не исправлять',
        )

    def handle(self, *args, **options):
        fix = options['fix'] and not options['dry_run']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('Режим dry-run: изменения не будут сохранены'))

        orphaned = []

        # Проверка OrderItem
        self.stdout.write('Проверка OrderItem...')
        order_items = self.check_order_items(fix, dry_run)
        orphaned.extend(order_items)

        # Проверка CartItem
        self.stdout.write('Проверка CartItem...')
        cart_items = self.check_cart_items(fix, dry_run)
        orphaned.extend(cart_items)

        # Проверка ContentBlock
        self.stdout.write('Проверка ContentBlock...')
        content_blocks = self.check_content_blocks(fix, dry_run)
        orphaned.extend(content_blocks)

        # Проверка CoursePage
        self.stdout.write('Проверка CoursePage...')
        course_pages = self.check_course_pages(fix, dry_run)
        orphaned.extend(course_pages)

        # Вывод результатов
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Найдено orphaned записей: {len(orphaned)}'))
        if fix:
            self.stdout.write(self.style.SUCCESS('Исправлено'))
        else:
            self.stdout.write(self.style.WARNING('Используйте --fix для исправления'))

        if orphaned:
            self.stdout.write('\nOrphaned записи:')
            for item in orphaned[:20]:  # Показываем первые 20
                self.stdout.write(self.style.ERROR(f'  - {item}'))
            if len(orphaned) > 20:
                self.stdout.write(self.style.WARNING(f'  ... и еще {len(orphaned) - 20} записей'))

    def check_order_items(self, fix, dry_run):
        """Проверка OrderItem на orphaned записи."""
        orphaned = []

        # OrderItem с несуществующим product
        items_without_product = OrderItem.objects.filter(product__isnull=False).exclude(
            product__in=[item.product_id for item in OrderItem.objects.filter(product__isnull=False)]
        )
        for item in items_without_product:
            try:
                item.product  # Проверяем существование
            except:
                orphaned.append(f'OrderItem {item.id}: product {item.product_id} не существует')
                if fix and not dry_run:
                    item.product = None
                    item.save(update_fields=['product'])

        # OrderItem с несуществующим course
        items_without_course = OrderItem.objects.filter(course__isnull=False)
        for item in items_without_course:
            try:
                item.course  # Проверяем существование
            except:
                orphaned.append(f'OrderItem {item.id}: course {item.course_id} не существует')
                if fix and not dry_run:
                    item.course = None
                    item.save(update_fields=['course'])

        # OrderItem с несуществующим order
        items_without_order = OrderItem.objects.filter(order__isnull=False)
        for item in items_without_order:
            try:
                item.order  # Проверяем существование
            except:
                orphaned.append(f'OrderItem {item.id}: order {item.order_id} не существует')
                if fix and not dry_run:
                    item.delete()

        return orphaned

    def check_cart_items(self, fix, dry_run):
        """Проверка CartItem на orphaned записи."""
        orphaned = []

        # CartItem с несуществующим cart
        items_without_cart = CartItem.objects.filter(cart__isnull=False)
        for item in items_without_cart:
            try:
                item.cart  # Проверяем существование
            except:
                orphaned.append(f'CartItem {item.id}: cart {item.cart_id} не существует')
                if fix and not dry_run:
                    item.delete()

        # CartItem с несуществующим product
        items_without_product = CartItem.objects.filter(product__isnull=False)
        for item in items_without_product:
            try:
                item.product  # Проверяем существование
            except:
                orphaned.append(f'CartItem {item.id}: product {item.product_id} не существует')
                if fix and not dry_run:
                    item.delete()

        return orphaned

    def check_content_blocks(self, fix, dry_run):
        """Проверка ContentBlock на orphaned записи."""
        orphaned = []

        # ContentBlock с несуществующей page
        blocks_without_page = ContentBlock.objects.filter(page__isnull=False)
        for block in blocks_without_page:
            try:
                block.page  # Проверяем существование
            except:
                orphaned.append(f'ContentBlock {block.id}: page {block.page_id} не существует')
                if fix and not dry_run:
                    block.delete()

        return orphaned

    def check_course_pages(self, fix, dry_run):
        """Проверка CoursePage на orphaned записи."""
        orphaned = []

        # CoursePage с несуществующим course (если используется ForeignKey)
        from apps.training.models import Course
        pages_without_course = CoursePage.objects.filter(course_id__isnull=False)
        for page in pages_without_course:
            if page.course_id:
                if not Course.objects.filter(id=page.course_id).exists():
                    orphaned.append(f'CoursePage {page.id}: course {page.course_id} не существует')
                    if fix and not dry_run:
                        page.course_id = None
                        page.save(update_fields=['course_id'])

        return orphaned

