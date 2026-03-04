from django.db import migrations, models
import django.db.models.deletion
from core.utils import generate_uuid7


class Migration(migrations.Migration):
    dependencies = [
        ('pets', '0012_align_petid_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='PetVaccination',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=36, default=generate_uuid7, editable=False, serialize=False)),
                ('vaccine_code', models.CharField(max_length=50, verbose_name='Код вакцины')),
                ('date_administered', models.DateField(verbose_name='Дата вакцинации')),
                ('next_due_date', models.DateField(blank=True, null=True, verbose_name='Следующая вакцинация')),
                ('manufacturer', models.CharField(blank=True, max_length=200, verbose_name='Производитель')),
                ('batch_number', models.CharField(blank=True, max_length=100, verbose_name='Номер партии')),
                ('administered_by', models.CharField(blank=True, max_length=200, verbose_name='Кем проведена')),
                ('notes', models.TextField(blank=True, verbose_name='Примечания')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('pet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vaccinations', to='pets.pet', verbose_name='Питомец')),
            ],
            options={'db_table': 'pet_vaccinations', 'ordering': ['-date_administered']},
        ),
        migrations.CreateModel(
            name='PetMedication',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=36, default=generate_uuid7, editable=False, serialize=False)),
                ('medication_code', models.CharField(max_length=50, verbose_name='Код препарата')),
                ('medication_name', models.CharField(max_length=200, verbose_name='Название препарата')),
                ('dosage', models.CharField(blank=True, max_length=100, verbose_name='Дозировка')),
                ('frequency', models.CharField(choices=[('three_times_daily', '3 раза в день'), ('twice_daily', '2 раза в день'), ('once_daily', '1 раз в день'), ('every_other_day', 'Через день'), ('weekly', 'Раз в неделю'), ('monthly', 'Раз в месяц')], max_length=30, verbose_name='Периодичность')),
                ('start_date', models.DateField(verbose_name='Дата начала')),
                ('end_date', models.DateField(blank=True, null=True, verbose_name='Дата окончания')),
                ('prescribed_for', models.CharField(blank=True, max_length=200, verbose_name='Для чего назначен')),
                ('prescribing_vet', models.CharField(blank=True, max_length=200, verbose_name='Назначивший ветеринар')),
                ('notes', models.TextField(blank=True, verbose_name='Примечания')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активный приём')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('pet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='medications', to='pets.pet', verbose_name='Питомец')),
            ],
            options={'db_table': 'pet_medications', 'ordering': ['-start_date']},
        ),
        migrations.CreateModel(
            name='PetActivity',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=36, default=generate_uuid7, editable=False, serialize=False)),
                ('activity_type', models.CharField(choices=[('walking', 'Прогулка'), ('running', 'Бег'), ('swimming', 'Плавание'), ('training', 'Тренировка'), ('playing', 'Активные игры'), ('hiking', 'Походы'), ('agility', 'Аджилити'), ('hunting', 'Охота'), ('guarding', 'Служебная работа')], max_length=30, verbose_name='Тип активности')),
                ('duration_minutes', models.PositiveIntegerField(verbose_name='Продолжительность (мин)')),
                ('frequency', models.CharField(choices=[('three_times_daily', '3 раза в день'), ('twice_daily', '2 раза в день'), ('once_daily', '1 раз в день'), ('every_other_day', 'Через день'), ('twice_weekly', '2 раза в неделю'), ('weekly', 'Раз в неделю'), ('twice_monthly', '2 раза в месяц'), ('monthly', 'Раз в месяц'), ('seasonal', 'Сезонно')], max_length=30, verbose_name='Периодичность')),
                ('intensity', models.CharField(blank=True, choices=[('low', 'Низкая'), ('moderate', 'Умеренная'), ('high', 'Высокая')], max_length=10, null=True, verbose_name='Интенсивность')),
                ('notes', models.TextField(blank=True, verbose_name='Примечания')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('pet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='pets.pet', verbose_name='Питомец')),
            ],
            options={'db_table': 'pet_activities', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='PetOtherPet',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=36, default=generate_uuid7, editable=False, serialize=False)),
                ('other_pet_type', models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка'), ('bird', 'Птица'), ('rodent', 'Грызун'), ('fish', 'Рыба'), ('reptile', 'Рептилия'), ('other', 'Другое')], max_length=20, verbose_name='Тип питомца')),
                ('other_pet_name', models.CharField(blank=True, max_length=100, verbose_name='Имя питомца')),
                ('relationship', models.CharField(blank=True, choices=[('friendly', 'Дружелюбные'), ('neutral', 'Нейтральные'), ('tense', 'Напряжённые')], max_length=20, null=True, verbose_name='Отношение')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('linked_pet', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='linked_other_pets', to='pets.pet', verbose_name='Связанный питомец')),
                ('pet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='other_pets', to='pets.pet', verbose_name='Питомец')),
            ],
            options={'db_table': 'pet_other_pets', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='PetAnalysisHistory',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=36, default=generate_uuid7, editable=False, serialize=False)),
                ('analysis_date', models.DateTimeField(verbose_name='Дата анализа')),
                ('analysis_result', models.JSONField(verbose_name='Результат анализа')),
                ('overall_status', models.CharField(choices=[('good', 'Хорошо'), ('attention', 'Требует внимания'), ('warning', 'Предупреждение'), ('critical', 'Критично')], max_length=20, verbose_name='Общий статус')),
                ('warnings_count', models.PositiveIntegerField(default=0, verbose_name='Количество предупреждений')),
                ('recommendations_count', models.PositiveIntegerField(default=0, verbose_name='Количество рекомендаций')),
                ('weight_at_analysis', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='Вес на момент анализа')),
                ('bcs_at_analysis', models.PositiveSmallIntegerField(blank=True, null=True, verbose_name='BCS на момент анализа')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('pet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analysis_history', to='pets.pet', verbose_name='Питомец')),
            ],
            options={'db_table': 'pet_analysis_history', 'ordering': ['-analysis_date']},
        ),
    ]
