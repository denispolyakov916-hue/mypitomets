from django.db import migrations, models


def seed_vaccines(apps, schema_editor):
    Vaccine = apps.get_model('pets', 'Vaccine')
    PetVaccination = apps.get_model('pets', 'PetVaccination')

    vaccines = [
        {
            'code': 'rabies',
            'name_ru': 'Бешенство',
            'name_en': 'Rabies',
            'species': 'both',
            'vaccine_type': 'inactivated',
            'protects_against': 'Бешенство',
            'first_vaccination_age_weeks': 12,
            'booster_interval_months': 36,
            'is_mandatory': True,
            'notes': 'Интервал ревакцинации обычно 12-36 месяцев.',
        },
        {
            'code': 'dhpp',
            'name_ru': 'DHPP (чумка, гепатит, парвовирус, парагрипп)',
            'name_en': 'DHPP',
            'species': 'dog',
            'vaccine_type': 'live',
            'protects_against': 'Чума плотоядных, гепатит, парвовирус, парагрипп',
            'first_vaccination_age_weeks': 8,
            'booster_interval_months': 12,
        },
        {
            'code': 'leptospirosis',
            'name_ru': 'Лептоспироз',
            'name_en': 'Leptospirosis',
            'species': 'dog',
            'vaccine_type': 'inactivated',
            'protects_against': 'Лептоспироз',
            'first_vaccination_age_weeks': 12,
            'booster_interval_months': 12,
        },
        {
            'code': 'bordetella',
            'name_ru': 'Бордетеллёз (питомниковый кашель)',
            'name_en': 'Bordetella',
            'species': 'dog',
            'vaccine_type': 'live',
            'protects_against': 'Бордетеллёз',
            'first_vaccination_age_weeks': 8,
            'booster_interval_months': 12,
            'notes': 'Интервал ревакцинации обычно 6-12 месяцев.',
        },
        {
            'code': 'lyme',
            'name_ru': 'Болезнь Лайма',
            'name_en': 'Lyme',
            'species': 'dog',
            'vaccine_type': 'recombinant',
            'protects_against': 'Болезнь Лайма',
            'first_vaccination_age_weeks': 12,
            'booster_interval_months': 12,
        },
        {
            'code': 'canine_influenza',
            'name_ru': 'Грипп собак',
            'name_en': 'Canine Influenza',
            'species': 'dog',
            'vaccine_type': 'inactivated',
            'protects_against': 'Грипп собак',
            'first_vaccination_age_weeks': 12,
            'booster_interval_months': 12,
        },
        {
            'code': 'fvrcp',
            'name_ru': 'FVRCP (панлейкопения, ринотрахеит, калицивирус)',
            'name_en': 'FVRCP',
            'species': 'cat',
            'vaccine_type': 'live',
            'protects_against': 'Панлейкопения, ринотрахеит, калицивирус',
            'first_vaccination_age_weeks': 8,
            'booster_interval_months': 36,
            'notes': 'Интервал ревакцинации обычно 12-36 месяцев.',
        },
        {
            'code': 'felv',
            'name_ru': 'Лейкемия кошек (FeLV)',
            'name_en': 'FeLV',
            'species': 'cat',
            'vaccine_type': 'recombinant',
            'protects_against': 'Лейкемия кошек (FeLV)',
            'first_vaccination_age_weeks': 8,
            'booster_interval_months': 12,
        },
        {
            'code': 'fiv',
            'name_ru': 'Иммунодефицит кошек (FIV)',
            'name_en': 'FIV',
            'species': 'cat',
            'vaccine_type': 'inactivated',
            'protects_against': 'Иммунодефицит кошек (FIV)',
            'first_vaccination_age_weeks': 8,
            'booster_interval_months': 12,
        },
        {
            'code': 'fip',
            'name_ru': 'Инфекционный перитонит кошек (FIP)',
            'name_en': 'FIP',
            'species': 'cat',
            'vaccine_type': 'live',
            'protects_against': 'Инфекционный перитонит кошек (FIP)',
            'first_vaccination_age_weeks': 16,
            'booster_interval_months': 12,
        },
    ]

    for item in vaccines:
        Vaccine.objects.update_or_create(code=item['code'], defaults=item)

    existing_codes = (
        PetVaccination.objects.exclude(vaccine_code__isnull=True)
        .values_list('vaccine_code', flat=True)
        .distinct()
    )
    for code in existing_codes:
        if not Vaccine.objects.filter(code=code).exists():
            Vaccine.objects.create(
                code=code,
                name_ru=code,
                name_en='',
                species='both',
                vaccine_type='inactivated',
                protects_against='Не указано',
                first_vaccination_age_weeks=12,
                booster_interval_months=12,
                is_mandatory=False,
                notes='Добавлено автоматически из существующих записей.',
            )


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0014_add_pet_draft_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='Vaccine',
            fields=[
                ('code', models.CharField(max_length=50, primary_key=True, serialize=False, verbose_name='Код вакцины')),
                ('name_ru', models.CharField(max_length=200, verbose_name='Название (рус)')),
                ('name_en', models.CharField(blank=True, max_length=200, verbose_name='Название (англ)')),
                ('species', models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка'), ('both', 'Оба')], max_length=10, verbose_name='Вид')),
                ('vaccine_type', models.CharField(choices=[('live', 'Live (живые)'), ('inactivated', 'Inactivated (инактивированные)'), ('recombinant', 'Recombinant (рекомбинантные)')], max_length=20, verbose_name='Тип вакцины')),
                ('protects_against', models.TextField(verbose_name='От каких заболеваний')),
                ('first_vaccination_age_weeks', models.PositiveIntegerField(verbose_name='Возраст первой вакцинации (недели)')),
                ('booster_interval_months', models.PositiveIntegerField(verbose_name='Интервал ревакцинации (месяцы)')),
                ('is_mandatory', models.BooleanField(default=False, verbose_name='Обязательная')),
                ('contraindications', models.TextField(blank=True, verbose_name='Противопоказания')),
                ('side_effects', models.TextField(blank=True, verbose_name='Побочные эффекты')),
                ('notes', models.TextField(blank=True, verbose_name='Примечания')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'vaccines',
                'ordering': ['species', 'name_ru'],
            },
        ),
        migrations.RunPython(seed_vaccines, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='petvaccination',
            name='vaccine_code',
            field=models.ForeignKey(db_column='vaccine_code', on_delete=models.deletion.PROTECT, related_name='pet_vaccinations', to='pets.vaccine', verbose_name='Код вакцины'),
        ),
    ]
