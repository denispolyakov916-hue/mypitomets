from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0017_create_pet_autofill_trigger'),
    ]

    operations = [
        migrations.CreateModel(
            name='NutritionFactorRule',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('factor_key', models.CharField(help_text='Например: activity, neutering, bcs, disease, size, coat, climate', max_length=50, verbose_name='Ключ фактора')),
                ('priority', models.PositiveSmallIntegerField(default=1, help_text='0=base, 1=cap, 2=secondary', verbose_name='Приоритет')),
                ('max_delta_pct', models.DecimalField(blank=True, decimal_places=2, help_text='Ограничение влияния фактора, например 15.0 = ±15%', max_digits=5, null=True, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Макс. коррекция (%)')),
                ('scope', models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка'), ('both', 'Оба')], default='both', max_length=10, verbose_name='Вид')),
                ('notes', models.TextField(blank=True, verbose_name='Заметки')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Правило фактора MER',
                'verbose_name_plural': 'Правила факторов MER',
                'db_table': 'nutrition_factor_rules',
                'ordering': ['priority', 'factor_key'],
            },
        ),
        migrations.CreateModel(
            name='NutritionCapRule',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('context_key', models.CharField(help_text='Например: weight_loss_obesity_2_3, growth, lactation, critical', max_length=50, verbose_name='Контекст')),
                ('min_mer_rer', models.DecimalField(decimal_places=2, max_digits=4, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Мин. MER/RER')),
                ('max_mer_rer', models.DecimalField(decimal_places=2, max_digits=4, validators=[django.core.validators.MinValueValidator(0.1)], verbose_name='Макс. MER/RER')),
                ('scope', models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка'), ('both', 'Оба')], default='both', max_length=10, verbose_name='Вид')),
                ('notes', models.TextField(blank=True, verbose_name='Заметки')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Кап MER/RER',
                'verbose_name_plural': 'Капы MER/RER',
                'db_table': 'nutrition_cap_rules',
                'ordering': ['context_key'],
            },
        ),
        migrations.AddIndex(
            model_name='nutritionfactorrule',
            index=models.Index(fields=['scope', 'factor_key'], name='nutrition_f_scope_641f6b_idx'),
        ),
        migrations.AddIndex(
            model_name='nutritioncaprule',
            index=models.Index(fields=['scope', 'context_key'], name='nutrition_c_scope_258d0c_idx'),
        ),
    ]
