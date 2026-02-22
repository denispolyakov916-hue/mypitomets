---
name: create-api-endpoint
description: Добавление нового API эндпоинта в существующий Django app. Создание view, serializer, URL маршрута и метода сервиса. Используется когда пользователь просит добавить новый эндпоинт, API метод, маршрут или ручку в существующее приложение.
---

# Добавление нового API эндпоинта

## Воркфлоу

```
- [ ] Шаг 1: Определить тип эндпоинта
- [ ] Шаг 2: Добавить serializer (если нужен)
- [ ] Шаг 3: Добавить метод в сервис
- [ ] Шаг 4: Создать view
- [ ] Шаг 5: Добавить URL
```

## Шаг 1: Определить тип

| Тип | Базовый класс | Когда |
|-----|---------------|-------|
| CRUD список + создание | `BaseListCreateView` | GET список, POST создание |
| CRUD детали | `BaseDetailView` | GET/PUT/PATCH/DELETE одного объекта |
| Только чтение | `BaseReadOnlyView` | Публичные справочники |
| Кастомный | `APIView` | Специфичная логика (анализ, расчёты) |
| ViewSet | `ViewSet` | Вложенные ресурсы (`pet/{id}/vaccinations/`) |

## Шаг 2: Serializer

Добавить в `serializers.py` существующего app:

```python
class NewFeatureSerializer(serializers.Serializer):
    """Сериализатор для новой фичи."""

    input_field = serializers.CharField(required=True)
    result = serializers.SerializerMethodField()

    def get_result(self, obj):
        return obj.get('computed_value')
```

Для модели — раздельные serializers:
- `FeatureCreateSerializer` — для POST (только записываемые поля)
- `FeatureSerializer` — для GET (все поля + computed)

## Шаг 3: Метод сервиса

Добавить в `services.py` существующего app:

```python
def process_feature(self, data, user):
    """Обработка новой фичи."""
    self.log_info(f"Обработка фичи для user={user.id}")

    # Бизнес-логика
    result = self._compute(data)

    return ServiceResult(
        success=True,
        data=result,
        message='Обработка завершена'
    )
```

## Шаг 4: View

**CRUD эндпоинт:**

```python
from core.crud_views import BaseListCreateView
from core.exceptions import ApiError

class FeatureView(BaseListCreateView):
    model = MyModel
    serializer_class = FeatureCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MyModel.objects.select_related('owner').filter(owner=self.request.user)
```

**Кастомный эндпоинт:**

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.exceptions import ApiError

class FeatureAnalysisView(APIView):
    """Анализ фичи."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FeatureInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = my_service.process_feature(serializer.validated_data, request.user)

        if not result.success:
            raise ApiError.bad_request(result.message)

        return Response({
            'data': result.data,
            'message': result.message
        })
```

## Шаг 5: URL

Добавить в `urls.py` существующего app:

```python
# CRUD
path('features/', FeatureView.as_view(), name='feature-list'),
path('features/<str:pk>/', FeatureDetailView.as_view(), name='feature-detail'),

# Кастомный
path('features/analysis/', FeatureAnalysisView.as_view(), name='feature-analysis'),

# Вложенный ресурс
path('<str:parent_id>/features/', FeatureViewSet.as_view({'get': 'list', 'post': 'create'})),
```

## Правила

- Бизнес-логика в сервисе, НЕ во view
- Ошибки через `ApiError.bad_request()`, `ApiError.not_found()`, `ApiError.forbidden()`
- `select_related()` / `prefetch_related()` для оптимизации
- Permissions: `IsAuthenticated` по умолчанию, `AllowAny` для публичных
- Формат ответа: `{"data": ..., "message": "..."}` для успеха
