from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0015_partneraccessrequest'),
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
                ],
                db_index=True,
                default='user',
                max_length=20,
                verbose_name='Роль',
            ),
        ),
    ]
