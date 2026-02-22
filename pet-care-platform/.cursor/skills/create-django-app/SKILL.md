---
name: create-django-app
description: Создание нового Django приложения со всеми слоями архитектуры проекта. Используется когда пользователь просит создать новый app, модуль, новую фичу бэкенда или новое Django-приложение.
---

# Создание нового Django App

## Воркфлоу

Чеклист создания:

```
- [ ] Шаг 1: Создать структуру app
- [ ] Шаг 2: Написать модели
- [ ] Шаг 3: Написать serializers
- [ ] Шаг 4: Написать сервис
- [ ] Шаг 5: Написать views
- [ ] Шаг 6: Написать urls
- [ ] Шаг 7: Зарегистрировать в settings и корневых urls
- [ ] Шаг 8: Создать и применить миграции
```

## Шаг 1: Структура app

Создать в `backend/apps/{app_name}/`:

```
backend/apps/{app_name}/
├── __init__.py
├── models.py
├── serializers.py
├── services.py
├── views.py
├── urls.py
├── admin.py
└── tests/
    ├── __init__.py
    └── test_{app_name}.py
```

## Шаг 2: Модели

```python
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.utils import generate_uuid7


class MyModel(models.Model):
    """Описание модели на русском."""

    id = models.CharField(primary_key=True, max_length=36, default=generate_uuid7, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='{app_name}_items', verbose_name='Владелец'
    )
    name = models.CharField(max_length=255, verbose_name='Название')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        db_table = '{app_name}_items'
        verbose_name = 'Элемент'
        verbose_name_plural = 'Элементы'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['owner', '-created_at'])]

    def __str__(self):
        return self.name
```

## Шаг 3: Serializers

Раздельные serializers — для записи и чтения:

```python
from rest_framework import serializers
from .models import MyModel


class MyModelCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания."""

    class Meta:
        model = MyModel
        fields = ['name']  # Только поля для записи

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Название не может быть пустым')
        return value.strip()


class MyModelSerializer(serializers.ModelSerializer):
    """Сериализатор для чтения."""

    class Meta:
        model = MyModel
        fields = ['id', 'name', 'created_at', 'updated_at']
```

## Шаг 4: Сервис

```python
from core.services import BaseCRUDService, ServiceResult


class MyModelService(BaseCRUDService):
    """Сервис для работы с MyModel."""

    def __init__(self):
        from .models import MyModel
        super().__init__(MyModel)

    def get_queryset(self, user=None):
        qs = super().get_queryset(user)
        if user:
            qs = qs.filter(owner=user)
        return qs

    def create_item(self, data, user):
        """Создание элемента."""
        data['owner'] = user
        success, result = self.create(data, user)
        if success:
            return ServiceResult(success=True, data=result, message='Создано')
        return ServiceResult(success=False, message=str(result))


my_model_service = MyModelService()
```

## Шаг 5: Views

```python
from rest_framework.permissions import IsAuthenticated
from core.crud_views import BaseListCreateView, BaseDetailView
from .models import MyModel
from .serializers import MyModelCreateSerializer, MyModelSerializer


class MyModelListView(BaseListCreateView):
    model = MyModel
    serializer_class = MyModelCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MyModel.objects.filter(owner=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return MyModelSerializer
        return MyModelCreateSerializer


class MyModelDetailView(BaseDetailView):
    model = MyModel
    serializer_class = MyModelSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
```

## Шаг 6: URLs

```python
from django.urls import path
from . import views

urlpatterns = [
    path('', views.MyModelListView.as_view(), name='{app}-list-create'),
    path('<str:pk>/', views.MyModelDetailView.as_view(), name='{app}-detail'),
]
```

## Шаг 7: Регистрация

1. В `config/settings.py` — добавить `'apps.{app_name}'` в `INSTALLED_APPS`
2. В `config/urls.py` — добавить `path('api/{app_name}/', include('apps.{app_name}.urls'))`

## Шаг 8: Миграции

```bash
cd backend
python manage.py makemigrations {app_name}
python manage.py migrate
```

Проверить: `python manage.py runserver 0.0.0.0:8077`
