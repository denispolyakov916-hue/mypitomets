# Generated manually on 2026-01-12 17:55

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0008_add_breed_model'),
    ]

    operations = [
        # Сначала удаляем Pet.breed FK (если есть)
        migrations.RemoveField(
            model_name='pet',
            name='breed',
        ),
        
        # Удаляем старую модель Breed
        migrations.DeleteModel(
            name='Breed',
        ),
        
        # Создаем новую оптимизированную модель Breed
        migrations.CreateModel(
            name='Breed',
            fields=[
                ('id', models.IntegerField(primary_key=True, serialize=False, help_text='ID из breeds.json')),
                ('species', models.CharField(max_length=10, choices=[('dog', 'Собака'), ('cat', 'Кошка')], db_index=True)),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='Название')),
                ('name_en', models.CharField(max_length=100, verbose_name='Название (EN)')),
                ('slug', models.SlugField(max_length=120, unique=True, db_index=True)),
                ('description', models.TextField(blank=True, null=True, verbose_name='Описание')),
                ('short_description', models.TextField(blank=True, null=True, verbose_name='Краткое описание')),
                
                # Размеры
                ('size_category', models.CharField(max_length=20, choices=[('toy', 'Toy'), ('small', 'Small'), ('medium', 'Medium'), ('large', 'Large'), ('giant', 'Giant')], db_index=True)),
                ('weight_min', models.DecimalField(max_digits=5, decimal_places=2, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Мин. вес (кг)')),
                ('weight_max', models.DecimalField(max_digits=5, decimal_places=2, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Макс. вес (кг)')),
                ('height_min', models.IntegerField(null=True, blank=True, verbose_name='Мин. рост (см)')),
                ('height_max', models.IntegerField(null=True, blank=True, verbose_name='Макс. рост (см)')),
                ('lifespan_min', models.IntegerField(verbose_name='Мин. продолжительность жизни (лет)')),
                ('lifespan_max', models.IntegerField(verbose_name='Макс. продолжительность жизни (лет)')),
                
                # Поведение
                ('energy_level', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')], db_index=True)),
                ('trainability', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                ('intelligence', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                ('friendliness_to_children', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                ('friendliness_to_pets', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                ('friendliness_to_strangers', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                ('independence', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                
                # Уход
                ('grooming_frequency', models.CharField(max_length=20, choices=[('daily', 'Ежедневно'), ('weekly', 'Еженедельно'), ('monthly', 'Ежемесячно')])),
                ('shedding_level', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')])),
                ('coat_type', models.CharField(max_length=20, choices=[('short', 'Короткая'), ('medium', 'Средняя'), ('long', 'Длинная')])),
                
                # Здоровье
                ('health_risk_level', models.CharField(max_length=20, choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')], db_index=True)),
                ('hypoallergenic', models.BooleanField(default=False)),
                ('brachycephalic', models.BooleanField(default=False, db_index=True)),
                
                # Другое
                ('apartment_friendly', models.BooleanField(default=True)),
                ('good_for_novice', models.BooleanField(default=True)),
                
                # Метаданные
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'breeds',
                'verbose_name': 'Порода',
                'verbose_name_plural': 'Породы',
                'ordering': ['species', 'name'],
            },
        ),
        
        # Индексы для Breed
        migrations.AddIndex(
            model_name='breed',
            index=models.Index(fields=['species', 'size_category'], name='breeds_sp_size_idx'),
        ),
        migrations.AddIndex(
            model_name='breed',
            index=models.Index(fields=['energy_level'], name='breeds_energy_idx'),
        ),
        migrations.AddIndex(
            model_name='breed',
            index=models.Index(fields=['health_risk_level'], name='breeds_health_idx'),
        ),
        
        # Создаем модель BreedHealth
        migrations.CreateModel(
            name='BreedHealth',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('condition_name', models.CharField(max_length=200, verbose_name='Название заболевания')),
                ('condition_type', models.CharField(max_length=20, choices=[('genetic', 'Генетическое'), ('congenital', 'Врожденное')])),
                ('affected_system', models.CharField(max_length=50, choices=[
                    ('musculoskeletal', 'Опорно-двигательная'), ('cardiovascular', 'Сердечно-сосудистая'),
                    ('respiratory', 'Дыхательная'), ('digestive', 'Пищеварительная'),
                    ('urinary', 'Мочевыделительная'), ('reproductive', 'Репродуктивная'),
                    ('endocrine', 'Эндокринная'), ('nervous', 'Нервная'),
                    ('immune', 'Иммунная'), ('integumentary', 'Кожа и шерсть'),
                    ('ophthalmologic', 'Офтальмологическая'), ('dental', 'Стоматологическая'),
                    ('renal', 'Почечная'), ('neurological', 'Неврологическая'),
                    ('general', 'Общая')
                ], db_index=True)),
                ('severity', models.CharField(max_length=20, choices=[('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая')], db_index=True)),
                ('prevalence_percent', models.DecimalField(max_digits=5, decimal_places=2, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)], verbose_name='Распространенность (%)')),
                ('age_of_onset', models.CharField(max_length=50, blank=True, verbose_name='Возраст проявления')),
                ('prevention', models.TextField(verbose_name='Профилактика')),
                ('screening', models.TextField(verbose_name='Рекомендуемые обследования')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('breed', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='health_risks', to='pets.breed', verbose_name='Порода')),
            ],
            options={
                'db_table': 'breed_health',
                'verbose_name': 'Риск здоровья породы',
                'verbose_name_plural': 'Риски здоровья пород',
                'ordering': ['breed', '-severity', '-prevalence_percent'],
            },
        ),
        
        migrations.AddIndex(
            model_name='breedhealth',
            index=models.Index(fields=['breed', 'severity'], name='breedhlth_br_sev_idx'),
        ),
        migrations.AddIndex(
            model_name='breedhealth',
            index=models.Index(fields=['affected_system'], name='breedhlth_sys_idx'),
        ),
        
        # Создаем модель BreedNutrition
        migrations.CreateModel(
            name='BreedNutrition',
            fields=[
                ('breed', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='nutrition', serialize=False, to='pets.breed', verbose_name='Порода')),
                ('protein_need', models.CharField(max_length=20, choices=[('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая'), ('very_high', 'Очень высокая')])),
                ('calorie_density', models.CharField(max_length=20, choices=[('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая')])),
                ('diet_type', models.CharField(max_length=20, choices=[('dry', 'Сухой'), ('wet', 'Влажный'), ('mixed', 'Смешанный')])),
                ('feeding_frequency', models.CharField(max_length=50, verbose_name='Частота кормлений')),
                ('special_considerations', models.TextField(blank=True, verbose_name='Особые рекомендации')),
                ('common_allergens', models.JSONField(default=list, blank=True, verbose_name='Аллергены')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'breed_nutrition',
                'verbose_name': 'Рекомендации по питанию',
                'verbose_name_plural': 'Рекомендации по питанию',
            },
        ),
        
        # Создаем модель BreedCare
        migrations.CreateModel(
            name='BreedCare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('care_category', models.CharField(max_length=20, choices=[('coat', 'Шерсть'), ('skin', 'Кожа'), ('ears', 'Уши'), ('eyes', 'Глаза'), ('respiratory', 'Дыхание'), ('dental', 'Зубы'), ('nails', 'Когти')], db_index=True)),
                ('procedure', models.CharField(max_length=200, verbose_name='Процедура')),
                ('frequency', models.CharField(max_length=50, verbose_name='Частота')),
                ('importance', models.CharField(max_length=20, choices=[('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая'), ('critical', 'Критическая')], db_index=True)),
                ('season', models.CharField(max_length=20, choices=[('all', 'Круглый год'), ('spring', 'Весна'), ('summer', 'Лето'), ('autumn', 'Осень'), ('winter', 'Зима')], default='all')),
                ('notes', models.TextField(blank=True, verbose_name='Примечания')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('breed', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='care_procedures', to='pets.breed', verbose_name='Порода')),
            ],
            options={
                'db_table': 'breed_care',
                'verbose_name': 'Процедура ухода',
                'verbose_name_plural': 'Процедуры ухода',
                'ordering': ['breed', '-importance'],
            },
        ),
        
        migrations.AddIndex(
            model_name='breedcare',
            index=models.Index(fields=['breed', 'importance'], name='breedcare_br_imp_idx'),
        ),
        migrations.AddIndex(
            model_name='breedcare',
            index=models.Index(fields=['care_category'], name='breedcare_cat_idx'),
        ),
        
        # Добавляем обратно Pet.breed как ForeignKey к новой модели
        migrations.AddField(
            model_name='pet',
            name='breed',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                related_name='pets',
                to='pets.breed',
                verbose_name='Порода',
                help_text='Порода из справочника'
            ),
        ),
    ]

