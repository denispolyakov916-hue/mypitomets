# Generated manually for ShareableWishlist and ShareableWishlistItem

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def default_share_token():
    import secrets
    return secrets.token_urlsafe(16)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('shop', '0026_remove_category_details'),
    ]

    operations = [
        migrations.CreateModel(
            name='ShareableWishlist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='Мой вишлист', max_length=255, verbose_name='Название')),
                ('share_token', models.CharField(default=default_share_token, editable=False, max_length=64, unique=True, verbose_name='Токен для шаринга')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлён')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='shareable_wishlist', to=settings.AUTH_USER_MODEL, verbose_name='Владелец')),
            ],
            options={
                'verbose_name': 'Вишлист (подарочный список)',
                'verbose_name_plural': 'Вишлисты (подарочные списки)',
                'db_table': 'shop_shareable_wishlists',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='ShareableWishlistItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Добавлено')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shareable_wishlist_items', to='shop.product', verbose_name='Товар')),
                ('wishlist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='shop.shareablewishlist', verbose_name='Вишлист')),
            ],
            options={
                'verbose_name': 'Элемент вишлиста',
                'verbose_name_plural': 'Элементы вишлиста',
                'db_table': 'shop_shareable_wishlist_items',
                'ordering': ['-created_at'],
                'unique_together': {('wishlist', 'product')},
            },
        ),
    ]
