from django.db import migrations, models


def set_platform_owner(apps, schema_editor):
    """Владелец платформы (по email) — superuser; прочие admin — только staff."""
    User = apps.get_model('users', 'User')
    User.objects.filter(email__iexact='denispolyakov916@yandex.ru').update(
        role='platform_owner', is_staff=True, is_superuser=True,
    )
    # Все остальные с role='admin' (в т.ч. зам) — staff, но НЕ superuser.
    User.objects.filter(role='admin').exclude(email__iexact='denispolyakov916@yandex.ru').update(
        is_staff=True, is_superuser=False,
    )


def reverse_platform_owner(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='platform_owner').update(
        role='admin', is_staff=True, is_superuser=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0017_consentevent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('user', 'Пользователь'),
                    ('course_creator', 'Создатель курсов'),
                    ('supplier_manager', 'Менеджер поставщика'),
                    ('supplier_editor', 'Редактор поставщика'),
                    ('supplier_analyst', 'Аналитик поставщика'),
                    ('marketing_manager', 'Маркетолог'),
                    ('admin', 'Администратор'),
                    ('platform_owner', 'Владелец платформы'),
                ],
                db_index=True, default='user', max_length=20, verbose_name='Роль',
            ),
        ),
        migrations.RunPython(set_platform_owner, reverse_platform_owner),
    ]
