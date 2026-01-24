from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0013_add_petid_related_tables'),
    ]

    operations = [
        migrations.AddField(
            model_name='pet',
            name='is_draft',
            field=models.BooleanField(default=False, help_text='Флаг незавершенного профиля PetID', verbose_name='Черновик профиля'),
        ),
        migrations.AddField(
            model_name='pet',
            name='draft_step',
            field=models.PositiveSmallIntegerField(blank=True, help_text='Последний шаг заполнения для продолжения', null=True, verbose_name='Шаг черновика'),
        ),
    ]
