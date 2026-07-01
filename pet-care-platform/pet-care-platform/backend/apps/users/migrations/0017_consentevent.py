import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_add_marketing_manager_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConsentEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('consent_type', models.CharField(choices=[('terms', 'Пользовательское соглашение'), ('personal_data', 'Обработка персональных данных'), ('marketing', 'Рекламные сообщения'), ('cookie_functional', 'Cookie: функциональные'), ('cookie_analytics', 'Cookie: аналитические'), ('cookie_advertising', 'Cookie: рекламные'), ('distribution', 'ПДн для распространения')], db_index=True, max_length=32, verbose_name='Тип согласия')),
                ('granted', models.BooleanField(default=True, verbose_name='Дано')),
                ('doc_version', models.CharField(blank=True, default='', max_length=64, verbose_name='Версия документа')),
                ('source', models.CharField(blank=True, default='', max_length=32, verbose_name='Источник')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP-адрес')),
                ('user_agent', models.CharField(blank=True, default='', max_length=400, verbose_name='User-Agent')),
                ('meta', models.JSONField(blank=True, default=dict, verbose_name='Доп. сведения')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Дата')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='consent_events', to='users.user', verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Согласие (запись)',
                'verbose_name_plural': 'Журнал согласий',
                'db_table': 'consent_event',
                'ordering': ['-created_at'],
            },
        ),
    ]
