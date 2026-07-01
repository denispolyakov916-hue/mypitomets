# Sync Course JSON list fields with model: add validate_string_list validator
# and reconcile auto-named indexes (no DB data change — validators are
# Python-level; index renames are instant DDL).

import core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('training', '0023_behavior_correction_course_fields'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='course',
            new_name='courses_course__5167aa_idx',
            old_name='courses_course__d7a983_idx',
        ),
        migrations.RenameIndex(
            model_name='course',
            new_name='courses_course__4da38b_idx',
            old_name='courses_course__8511b7_idx',
        ),
        migrations.AlterField(
            model_name='course',
            name='contraindications',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Противопоказания'),
        ),
        migrations.AlterField(
            model_name='course',
            name='correction_problem_tags',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Теги проблем коррекции'),
        ),
        migrations.AlterField(
            model_name='course',
            name='correction_symptoms',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Симптомы проблемы'),
        ),
        migrations.AlterField(
            model_name='course',
            name='excluded_behavioral_problems',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Исключающие поведенческие проблемы'),
        ),
        migrations.AlterField(
            model_name='course',
            name='excluded_health_issues',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Исключающие проблемы здоровья'),
        ),
        migrations.AlterField(
            model_name='course',
            name='red_flags',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Красные флаги'),
        ),
        migrations.AlterField(
            model_name='course',
            name='required_equipment',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Необходимые предметы'),
        ),
        migrations.AlterField(
            model_name='course',
            name='success_metrics',
            field=models.JSONField(blank=True, default=list, validators=[core.validators.validate_string_list], verbose_name='Критерии успеха'),
        ),
    ]
