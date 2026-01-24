from django.db import migrations, models
from django.core.validators import MinValueValidator, MaxValueValidator


def normalize_petid_fields(apps, schema_editor):
    Pet = apps.get_model('pets', 'Pet')

    # diet_type: home -> homemade
    Pet.objects.filter(diet_type='home').update(diet_type='homemade')

    # feeding_frequency: free -> NULL (per new 1-6 schema)
    Pet.objects.filter(feeding_frequency='free').update(feeding_frequency=None)


class Migration(migrations.Migration):
    dependencies = [
        ('pets', '0011_allergy_healthcondition_nutritioncoefficient_and_more'),
    ]

    operations = [
        migrations.RunPython(normalize_petid_fields, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='pet',
            name='diet_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('dry', 'Сухой корм'),
                    ('wet', 'Влажный корм'),
                    ('mixed', 'Смешанное питание'),
                    ('raw', 'Натуральное питание'),
                    ('homemade', 'Домашняя еда'),
                ],
                max_length=20,
                null=True,
                verbose_name='Тип питания',
            ),
        ),
        migrations.AlterField(
            model_name='pet',
            name='feeding_frequency',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(6)],
                verbose_name='Частота кормления',
            ),
        ),
        migrations.AlterField(
            model_name='pet',
            name='body_condition_score',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(9)],
                verbose_name='Оценка упитанности (BCS)',
                help_text='Шкала от 1 до 9',
            ),
        ),
    ]
