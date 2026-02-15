# Generated migration - creates missing tables and adds CourseModule

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('training', '0015_alter_coursepage_options_and_more'),
    ]

    operations = [
        # ============================================================
        # 1. Create missing tables that should have been created by
        #    migrations 0011-0015 but weren't (they were faked).
        #    Using IF NOT EXISTS to be idempotent.
        # ============================================================
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS course_pages (
                id bigserial PRIMARY KEY,
                title varchar(200) NOT NULL,
                order_number integer NOT NULL DEFAULT 1,
                page_type varchar(20) NULL,
                settings jsonb NOT NULL DEFAULT '{}'::jsonb,
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                course_id integer NULL
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS course_pages;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS content_blocks (
                id bigserial PRIMARY KEY,
                block_type varchar(30) NOT NULL,
                content jsonb NOT NULL DEFAULT '{}'::jsonb,
                settings jsonb NOT NULL DEFAULT '{}'::jsonb,
                "order" integer NOT NULL DEFAULT 1,
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                page_id bigint NOT NULL REFERENCES course_pages(id) ON DELETE CASCADE
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS content_blocks;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS block_templates (
                id bigserial PRIMARY KEY,
                name varchar(200) NOT NULL,
                description text NOT NULL DEFAULT '',
                block_type varchar(30) NOT NULL,
                content jsonb NOT NULL DEFAULT '{}'::jsonb,
                settings jsonb NOT NULL DEFAULT '{}'::jsonb,
                category varchar(50) NOT NULL DEFAULT 'text',
                is_public boolean NOT NULL DEFAULT true,
                usage_count integer NOT NULL DEFAULT 0,
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                created_by_id uuid NULL REFERENCES users(id) ON DELETE SET NULL
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS block_templates;",
        ),

        # ============================================================
        # 2. Create the new CourseModule model
        # ============================================================
        migrations.CreateModel(
            name='CourseModule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='Название модуля')),
                ('description', models.TextField(blank=True, default='', verbose_name='Описание модуля')),
                ('order_number', models.PositiveIntegerField(default=1, verbose_name='Порядковый номер')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активен')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='modules', to='training.course', verbose_name='Курс')),
            ],
            options={
                'verbose_name': 'Модуль курса',
                'verbose_name_plural': 'Модули курсов',
                'db_table': 'course_modules',
                'ordering': ['course', 'order_number'],
                'unique_together': {('course', 'order_number')},
            },
        ),

        # ============================================================
        # 3. Add module FK to CoursePage
        # ============================================================
        migrations.AddField(
            model_name='coursepage',
            name='module',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='pages', to='training.coursemodule', verbose_name='Модуль'),
        ),
    ]
