from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0019_add_macro_target_rule'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupplementRule',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('context_key', models.CharField(help_text='Например: growth_puppy_early, senior_dog, lactation, arthritis', max_length=50, verbose_name='Контекст')),
                ('context_type', models.CharField(choices=[('growth', 'Рост'), ('age', 'Возраст'), ('reproductive', 'Репродукция'), ('disease', 'Заболевание'), ('activity', 'Активность'), ('breed_risk', 'Породный риск'), ('baseline', 'Базовый')], db_index=True, default='baseline', max_length=20, verbose_name='Тип контекста')),
                ('priority', models.PositiveSmallIntegerField(default=5, help_text='0=highest (критически важно), 10=baseline', verbose_name='Приоритет')),
                ('scope', models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка'), ('both', 'Оба')], default='both', max_length=10, verbose_name='Вид')),
                ('supplement_type', models.CharField(help_text='calcium, omega3, joint, vitamins, probiotics, taurine, senior и др.', max_length=30, verbose_name='Тип добавки')),
                ('reason_ru', models.TextField(help_text='Текст для UI: "Для роста костей и зубов"', verbose_name='Причина рекомендации')),
                ('dosage_factor', models.DecimalField(decimal_places=2, default=1.0, help_text='Множитель к стандартной дозе (1.0 = норма, 1.5 = повышенная)', max_digits=4, verbose_name='Множитель дозы')),
                ('age_from_months', models.PositiveIntegerField(blank=True, null=True, verbose_name='Возраст от (мес)')),
                ('age_to_months', models.PositiveIntegerField(blank=True, null=True, verbose_name='Возраст до (мес)')),
                ('disease_code', models.CharField(blank=True, max_length=50, verbose_name='Код заболевания')),
                ('size_category', models.CharField(blank=True, max_length=20, verbose_name='Размер (large, giant и т.д.)')),
                ('notes', models.TextField(blank=True, verbose_name='Заметки')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Правило добавки',
                'verbose_name_plural': 'Правила добавок',
                'db_table': 'supplement_rules',
                'ordering': ['priority', 'context_type', 'supplement_type'],
            },
        ),
        migrations.AddIndex(
            model_name='supplementrule',
            index=models.Index(fields=['scope', 'context_type'], name='supplement__scope_a1b2c3_idx'),
        ),
        migrations.AddIndex(
            model_name='supplementrule',
            index=models.Index(fields=['priority'], name='supplement__priorit_d4e5f6_idx'),
        ),
        migrations.AddIndex(
            model_name='supplementrule',
            index=models.Index(fields=['supplement_type'], name='supplement__supplem_g7h8i9_idx'),
        ),
    ]
