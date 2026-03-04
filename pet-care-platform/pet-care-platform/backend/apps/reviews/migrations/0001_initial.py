# Generated manually

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('shop', '0010_alter_order_subtotal_amount_alter_order_total_amount'),
        ('training', '0004_alter_usercourse_unique_together_usercourse_pet_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('review_type', models.CharField(choices=[('product', 'Отзыв на товар'), ('course', 'Отзыв на курс')], max_length=20, verbose_name='Тип отзыва')),
                ('rating', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name='Рейтинг')),
                ('comment', models.TextField(blank=True, max_length=2000, null=True, verbose_name='Комментарий')),
                ('is_verified_purchase', models.BooleanField(default=False, help_text='Отмечает, что пользователь действительно приобрел товар/курс', verbose_name='Подтвержденная покупка')),
                ('is_approved', models.BooleanField(default=True, help_text='Отзыв виден всем пользователям', verbose_name='Одобрен')),
                ('is_edited', models.BooleanField(default=False, verbose_name='Отредактирован')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлен')),
                ('course', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='training.course', verbose_name='Курс')),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='shop.product', verbose_name='Товар')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Отзыв',
                'verbose_name_plural': 'Отзывы',
                'db_table': 'reviews',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['product', 'is_approved'], name='reviews_product_approved_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['course', 'is_approved'], name='reviews_course_approved_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['user', 'review_type'], name='reviews_user_type_idx'),
        ),
        # Уникальные ограничения добавляем отдельно для product и course
        # Используем Q объект для условий (синтаксис кортежа как в существующих миграциях)
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(condition=models.Q(('product__isnull', False)), fields=['user', 'product'], name='unique_user_product_review'),
        ),
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(condition=models.Q(('course__isnull', False)), fields=['user', 'course'], name='unique_user_course_review'),
        ),
    ]

