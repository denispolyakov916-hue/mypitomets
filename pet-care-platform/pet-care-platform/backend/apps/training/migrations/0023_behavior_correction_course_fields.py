from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('training', '0022_alter_course_pet_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='course_type',
            field=models.CharField(choices=[('general', 'Обычный курс'), ('behavior_correction', 'Коррекция поведения')], db_index=True, default='general', max_length=40, verbose_name='Тип курса'),
        ),
        migrations.AddField(
            model_name='course',
            name='correction_problem',
            field=models.CharField(blank=True, db_index=True, max_length=80, null=True, verbose_name='Основная проблема коррекции'),
        ),
        migrations.AddField(
            model_name='course',
            name='correction_problem_tags',
            field=models.JSONField(blank=True, default=list, verbose_name='Теги проблем коррекции'),
        ),
        migrations.AddField(
            model_name='course',
            name='correction_symptoms',
            field=models.JSONField(blank=True, default=list, verbose_name='Симптомы проблемы'),
        ),
        migrations.AddField(
            model_name='course',
            name='correction_goal',
            field=models.TextField(blank=True, null=True, verbose_name='Цель коррекции'),
        ),
        migrations.AddField(
            model_name='course',
            name='success_metrics',
            field=models.JSONField(blank=True, default=list, verbose_name='Критерии успеха'),
        ),
        migrations.AddField(
            model_name='course',
            name='risk_level',
            field=models.CharField(choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий')], db_index=True, default='low', max_length=20, verbose_name='Уровень риска'),
        ),
        migrations.AddField(
            model_name='course',
            name='contraindications',
            field=models.JSONField(blank=True, default=list, verbose_name='Противопоказания'),
        ),
        migrations.AddField(
            model_name='course',
            name='red_flags',
            field=models.JSONField(blank=True, default=list, verbose_name='Красные флаги'),
        ),
        migrations.AddField(
            model_name='course',
            name='safety_notes',
            field=models.TextField(blank=True, null=True, verbose_name='Инструкция по безопасности'),
        ),
        migrations.AddField(
            model_name='course',
            name='required_equipment',
            field=models.JSONField(blank=True, default=list, verbose_name='Необходимые предметы'),
        ),
        migrations.AddField(
            model_name='course',
            name='owner_daily_time_minutes',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Время занятий в день'),
        ),
        migrations.AddField(
            model_name='course',
            name='min_age_months',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Минимальный возраст питомца'),
        ),
        migrations.AddField(
            model_name='course',
            name='max_age_months',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Максимальный возраст питомца'),
        ),
        migrations.AddField(
            model_name='course',
            name='excluded_behavioral_problems',
            field=models.JSONField(blank=True, default=list, verbose_name='Исключающие поведенческие проблемы'),
        ),
        migrations.AddField(
            model_name='course',
            name='excluded_health_issues',
            field=models.JSONField(blank=True, default=list, verbose_name='Исключающие проблемы здоровья'),
        ),
        migrations.AddField(
            model_name='course',
            name='requires_specialist_supervision',
            field=models.BooleanField(default=False, verbose_name='Нужен контроль специалиста'),
        ),
        migrations.AddField(
            model_name='course',
            name='requires_vet_clearance',
            field=models.BooleanField(default=False, verbose_name='Нужна консультация ветеринара'),
        ),
        migrations.AddField(
            model_name='course',
            name='review_status',
            field=models.CharField(choices=[('not_submitted', 'Не отправлен'), ('in_review', 'На проверке'), ('changes_requested', 'Нужны правки'), ('approved', 'Одобрен')], db_index=True, default='not_submitted', max_length=30, verbose_name='Статус проверки'),
        ),
        migrations.AddField(
            model_name='course',
            name='review_notes',
            field=models.TextField(blank=True, null=True, verbose_name='Заметки проверки'),
        ),
        migrations.AddIndex(
            model_name='course',
            index=models.Index(fields=['course_type', 'status'], name='courses_course__d7a983_idx'),
        ),
        migrations.AddIndex(
            model_name='course',
            index=models.Index(fields=['course_type', 'risk_level'], name='courses_course__8511b7_idx'),
        ),
    ]
