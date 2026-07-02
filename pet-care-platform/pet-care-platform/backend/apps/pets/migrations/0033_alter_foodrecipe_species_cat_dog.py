from django.db import migrations, models


class Migration(migrations.Migration):
    """Добавляет species='cat_dog' (универсальный рецепт для кошки и собаки).

    Изменение только choices — на уровне БД это no-op (choices не являются
    ограничением), но держим миграции в синхроне (makemigrations --check).
    """

    dependencies = [
        ('pets', '0032_suppliercatalogsynclog_supplierproductsubmission_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='foodrecipe',
            name='species',
            field=models.CharField(
                blank=True,
                choices=[
                    ('cat', 'Кошка'),
                    ('dog', 'Собака'),
                    ('cat_dog', 'Кошка и собака'),
                    ('other', 'Другое'),
                ],
                max_length=10,
                verbose_name='Вид животного',
            ),
        ),
    ]
