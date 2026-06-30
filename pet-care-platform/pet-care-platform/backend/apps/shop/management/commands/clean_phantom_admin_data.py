"""
Remove legacy/demo commerce data from beta admin.

The command keeps registered users, pets and Dinozavrik supplier assortment.
By default it is a dry run. Use --execute for a real cleanup.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.payments.models import Payment
from apps.shop.models import Cart, CartItem, Order, Product, Return


SHOP_PAYMENT_TYPES = ['shop_order', 'unified_checkout']


class Command(BaseCommand):
    help = 'Clean phantom commerce data while keeping users, pets and Dinozavrik assortment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--commerce',
            action='store_true',
            help='Delete shop orders, returns, carts and shop payments',
        )
        parser.add_argument(
            '--kotmatros',
            action='store_true',
            help='Delete legacy KotMatros products without a supplier',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Run both --commerce and --kotmatros cleanup scopes',
        )
        parser.add_argument(
            '--execute',
            action='store_true',
            help='Apply cleanup. Without this flag the command only prints counts.',
        )

    def handle(self, *args, **options):
        clean_commerce = options['all'] or options['commerce']
        clean_kotmatros = options['all'] or options['kotmatros']
        execute = options['execute']

        if not clean_commerce and not clean_kotmatros:
            self.stdout.write(self.style.WARNING('Nothing selected. Use --commerce, --kotmatros or --all.'))
            return

        kotmatros_products = Product.objects.filter(
            supplier__isnull=True,
            kotmatros_product_id__isnull=False,
        )
        shop_payments = Payment.objects.filter(payment_type__in=SHOP_PAYMENT_TYPES)

        counts = {
            'orders': Order.objects.count() if clean_commerce else 0,
            'returns': Return.objects.count() if clean_commerce else 0,
            'carts': Cart.objects.count() if clean_commerce else 0,
            'cart_items': CartItem.objects.count() if clean_commerce else 0,
            'shop_payments': shop_payments.count() if clean_commerce else 0,
            'kotmatros_products': kotmatros_products.count() if clean_kotmatros else 0,
        }

        mode = 'EXECUTE' if execute else 'DRY_RUN'
        self.stdout.write(f'mode={mode} scope_commerce={clean_commerce} scope_kotmatros={clean_kotmatros}')
        for key, value in counts.items():
            self.stdout.write(f'{key}={value}')

        if not execute:
            self.stdout.write(self.style.WARNING('Dry run only. Re-run with --execute to delete these records.'))
            return

        with transaction.atomic():
            if clean_commerce:
                Return.objects.all().delete()
                shop_payments.delete()
                Order.objects.all().delete()
                Cart.objects.all().delete()

            if clean_kotmatros:
                kotmatros_products.delete()

        self.stdout.write(self.style.SUCCESS('Phantom admin data cleaned. Users, pets and Dinozavrik supplier data were kept.'))
