"""
Базовые CRUD View классы для исключения дублирования кода.

Предоставляет готовые классы для типичных CRUD операций:
- BaseListCreateView: GET (список) + POST (создание)
- BaseDetailView: GET (детали) + PUT (обновление) + DELETE (удаление)
- BaseReadOnlyView: GET (список) + GET (детали)

Использование:
    class MyModelView(BaseListCreateView):
        queryset = MyModel.objects.all()
        serializer_class = MyModelSerializer

    class MyModelDetailView(BaseDetailView):
        queryset = MyModel.objects.all()
        serializer_class = MyModelSerializer
        lookup_field = 'id'
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404

from .exceptions import ApiError

logger = logging.getLogger(__name__)


class BaseCRUDMixin:
    """
    Базовый миксин для CRUD операций.

    Предоставляет общие методы для работы с моделями:
    - Получение queryset
    - Проверка прав доступа
    - Обработка ошибок
    """

    # Модель для работы (обязательно указать в наследниках)
    model = None

    # Сериализатор для операций (обязательно указать в наследниках)
    serializer_class = None

    # Поле для поиска объекта (по умолчанию 'pk')
    lookup_field = 'pk'

    # URL kwarg для lookup_field (по умолчанию 'pk')
    lookup_url_kwarg = None

    # Поля для поиска объекта (альтернатива lookup_field)
    lookup_fields = None

    # Разрешить частичное обновление (PATCH)
    allow_partial_update = True

    # Разрешить создание объектов
    allow_create = True

    # Разрешить обновление объектов
    allow_update = True

    # Разрешить удаление объектов
    allow_delete = True

    def get_queryset(self):
        """Получить queryset для модели."""
        if self.model is None:
            raise ValueError("Необходимо указать model в классе представления")

        if hasattr(self, 'queryset') and self.queryset is not None:
            return self.queryset

        return self.model.objects.all()

    def get_serializer_class(self):
        """Получить класс сериализатора."""
        if self.serializer_class is None:
            raise ValueError("Необходимо указать serializer_class в классе представления")
        return self.serializer_class

    def get_serializer(self, *args, **kwargs):
        """Получить экземпляр сериализатора."""
        serializer_class = self.get_serializer_class()
        return serializer_class(*args, **kwargs)

    def get_object(self):
        """Получить объект по lookup полям."""
        queryset = self.get_queryset()

        # Если указаны lookup_fields, используем их
        if self.lookup_fields:
            filter_kwargs = {}
            for field in self.lookup_fields:
                if field in self.kwargs:
                    filter_kwargs[field] = self.kwargs[field]
                elif hasattr(self, f'get_{field}') and callable(getattr(self, f'get_{field}')):
                    filter_kwargs[field] = getattr(self, f'get_{field}')()
                else:
                    raise ValueError(f"Не удалось найти значение для поля {field}")
            return get_object_or_404(queryset, **filter_kwargs)

        # Используем стандартный lookup_field
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is None:
            raise ValueError(f"Не найден параметр {lookup_url_kwarg} в URL")

        filter_kwargs = {self.lookup_field: lookup_value}
        return get_object_or_404(queryset, **filter_kwargs)

    def check_object_permissions(self, request, obj):
        """Проверить права доступа к объекту."""
        # По умолчанию проверяем только владение (для моделей с owner полем)
        if hasattr(obj, 'owner') and hasattr(request, 'user'):
            if obj.owner_id != request.user.id:
                raise ApiError.forbidden("Нет доступа к этому объекту")

    def perform_create(self, serializer):
        """Выполнить создание объекта."""
        # По умолчанию устанавливаем owner если есть user
        if hasattr(serializer, 'save') and hasattr(self.request, 'user'):
            if 'owner' in serializer.validated_data or hasattr(serializer.Meta.model, 'owner'):
                serializer.save(owner=self.request.user)
            else:
                serializer.save()
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Выполнить обновление объекта."""
        serializer.save()

    def perform_delete(self, instance):
        """Выполнить удаление объекта."""
        instance.delete()

    def handle_exception(self, exc):
        """Обработать исключение и вернуть ответ."""
        if isinstance(exc, ApiError):
            return Response(
                exc.get_full_details(),
                status=exc.status_code
            )

        logger.error(f"Необработанная ошибка в {self.__class__.__name__}: {str(exc)}")
        return Response(
            {'error': 'Внутренняя ошибка сервера'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class BaseListCreateView(BaseCRUDMixin, APIView):
    """
    Базовый класс для операций список + создание.

    GET: Получить список объектов
    POST: Создать новый объект
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Получить список объектов."""
        try:
            queryset = self.get_queryset()

            # Применяем фильтры из query_params
            queryset = self.filter_queryset(queryset, request)

            # Применяем сортировку
            queryset = self.order_queryset(queryset, request)

            # Применяем пагинацию
            page = self.paginate_queryset(queryset, request)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'data': serializer.data,
                'count': len(serializer.data)
            })

        except Exception as exc:
            return self.handle_exception(exc)

    def post(self, request, *args, **kwargs):
        """Создать новый объект."""
        if not self.allow_create:
            return Response(
                {'error': 'Создание объектов запрещено'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )

        try:
            logger.info(f"Creating {self.model.__name__} - Raw request data: {request.data}")
            logger.info(f"Breed value: {request.data.get('breed')} (type: {type(request.data.get('breed'))})")
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            logger.info(f"Создан объект {self.model.__name__} через {self.__class__.__name__}")
            return Response({
                'message': f'{self.model._meta.verbose_name} успешно создан',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as exc:
            return self.handle_exception(exc)

    def filter_queryset(self, queryset, request):
        """Применить фильтры к queryset."""
        # Базовая реализация - переопределить в наследниках для кастомной фильтрации
        return queryset

    def order_queryset(self, queryset, request):
        """Применить сортировку к queryset."""
        # Базовая реализация - переопределить в наследниках для кастомной сортировки
        return queryset

    def paginate_queryset(self, queryset, request):
        """Применить пагинацию к queryset."""
        # Базовая реализация без пагинации - переопределить для включения пагинации
        return None

    def get_paginated_response(self, data):
        """Получить ответ с пагинацией."""
        # Базовая реализация - переопределить для кастомной пагинации
        return Response({
            'data': data,
            'count': len(data)
        })


class BaseDetailView(BaseCRUDMixin, APIView):
    """
    Базовый класс для операций с отдельным объектом.

    GET: Получить объект
    PUT: Обновить объект
    PATCH: Частично обновить объект
    DELETE: Удалить объект
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Получить объект."""
        try:
            instance = self.get_object()
            self.check_object_permissions(request, instance)
            serializer = self.get_serializer(instance)
            return Response({'data': serializer.data})

        except Exception as exc:
            return self.handle_exception(exc)

    def put(self, request, *args, **kwargs):
        """Обновить объект полностью."""
        return self._update(request, partial=False)

    def patch(self, request, *args, **kwargs):
        """Частично обновить объект."""
        if not self.allow_partial_update:
            return Response(
                {'error': 'Частичное обновление запрещено'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )
        return self._update(request, partial=True)

    def delete(self, request, *args, **kwargs):
        """Удалить объект."""
        if not self.allow_delete:
            return Response(
                {'error': 'Удаление объектов запрещено'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )

        try:
            instance = self.get_object()
            self.check_object_permissions(request, instance)
            self.perform_delete(instance)

            logger.info(f"Удалён объект {self.model.__name__} #{instance.pk} через {self.__class__.__name__}")
            return Response({
                'message': f'{self.model._meta.verbose_name} удалён'
            }, status=status.HTTP_200_OK)

        except Exception as exc:
            return self.handle_exception(exc)

    def _update(self, request, partial=False):
        """Внутренний метод для обновления."""
        if not self.allow_update:
            return Response(
                {'error': 'Обновление объектов запрещено'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )

        try:
            instance = self.get_object()
            self.check_object_permissions(request, instance)
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            logger.info(f"Обновлён объект {self.model.__name__} #{instance.pk} через {self.__class__.__name__}")
            return Response({
                'message': f'{self.model._meta.verbose_name} обновлён',
                'data': serializer.data
            })

        except Exception as exc:
            return self.handle_exception(exc)


class BaseReadOnlyView(BaseCRUDMixin, APIView):
    """
    Базовый класс для операций чтения (без изменения).

    GET: Получить список объектов
    GET (с ID): Получить объект
    """

    permission_classes = []  # По умолчанию публичный доступ

    def get(self, request, *args, **kwargs):
        """Получить объект или список."""
        try:
            # Если есть lookup параметры - получаем один объект
            if self.lookup_url_kwarg and self.lookup_url_kwarg in kwargs:
                instance = self.get_object()
                serializer = self.get_serializer(instance)
                return Response({'data': serializer.data})
            else:
                # Иначе получаем список
                queryset = self.get_queryset()
                queryset = self.filter_queryset(queryset, request)
                queryset = self.order_queryset(queryset, request)

                page = self.paginate_queryset(queryset, request)
                if page is not None:
                    serializer = self.get_serializer(page, many=True)
                    return self.get_paginated_response(serializer.data)

                serializer = self.get_serializer(queryset, many=True)
                return Response({
                    'data': serializer.data,
                    'count': len(serializer.data)
                })

        except Exception as exc:
            return self.handle_exception(exc)

    def filter_queryset(self, queryset, request):
        """Применить фильтры к queryset."""
        return queryset

    def order_queryset(self, queryset, request):
        """Применить сортировку к queryset."""
        return queryset

    def paginate_queryset(self, queryset, request):
        """Применить пагинацию к queryset."""
        return None

    def get_paginated_response(self, data):
        """Получить ответ с пагинацией."""
        return Response({
            'data': data,
            'count': len(data)
        })


