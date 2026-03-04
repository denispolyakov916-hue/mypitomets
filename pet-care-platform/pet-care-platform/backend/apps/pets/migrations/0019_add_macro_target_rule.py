from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0018_add_nutrition_rules_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='MacroTargetRule',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('context_key', models.CharField(help_text='Например: ckd_early, lactation, growth_early, senior, high_activity, baseline', max_length=80, verbose_name='Контекст')),
                ('context_type', models.CharField(choices=[('disease', 'Заболевание'), ('reproductive', 'Репродукция'), ('growth', 'Рост'), ('age', 'Возраст'), ('activity', 'Активность'), ('bcs', 'BCS/Вес'), ('baseline', 'Базовый')], db_index=True, default='baseline', max_length=20, verbose_name='Тип контекста')),
                ('priority', models.PositiveSmallIntegerField(default=10, help_text='0=highest (disease), 10=baseline', verbose_name='Приоритет')),
                ('scope', models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка'), ('both', 'Оба')], default='both', max_length=10, verbose_name='Вид')),
                ('protein_min', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Белок мин (%)')),
                ('protein_max', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Белок макс (%)')),
                ('fat_min', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Жир мин (%)')),
                ('fat_max', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Жир макс (%)')),
                ('fiber_min', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Клетчатка мин (%)')),
                ('fiber_max', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Клетчатка макс (%)')),
                ('age_from_months', models.PositiveIntegerField(blank=True, null=True, verbose_name='Возраст от (мес)')),
                ('age_to_months', models.PositiveIntegerField(blank=True, null=True, verbose_name='Возраст до (мес)')),
                ('disease_code', models.CharField(blank=True, max_length=50, verbose_name='Код заболевания')),
                ('notes', models.TextField(blank=True, verbose_name='Заметки/Источник')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Правило БЖУ',
                'verbose_name_plural': 'Правила БЖУ',
                'db_table': 'macro_target_rules',
                'ordering': ['priority', 'context_type', 'context_key'],
            },
        ),
        migrations.AddIndex(
            model_name='macrotargetrule',
            index=models.Index(fields=['scope', 'context_type'], name='macro_targe_scope_8a2b1c_idx'),
        ),
        migrations.AddIndex(
            model_name='macrotargetrule',
            index=models.Index(fields=['priority'], name='macro_targe_priorit_d3e4f5_idx'),
        ),
    ]
