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
    - Получение queryset с оптимизацией запросов
    - Фильтрация, сортировка, пагинация
    - Проверка прав доступа
    - Единообразная обработка ошибок
    """

    model = None
    serializer_class = None
    lookup_field = 'pk'
    lookup_url_kwarg = None
    lookup_fields = None

    allow_partial_update = True
    allow_create = True
    allow_update = True
    allow_delete = True

    select_related_fields = []
    prefetch_related_fields = []

    def get_queryset(self):
        """Получить queryset с оптимизацией запросов через select/prefetch_related."""
        if self.model is None:
            raise ValueError("Необходимо указать model в классе представления")

        if hasattr(self, 'queryset') and self.queryset is not None:
            qs = self.queryset
        else:
            qs = self.model.objects.all()

        if self.select_related_fields:
            qs = qs.select_related(*self.select_related_fields)
        if self.prefetch_related_fields:
            qs = qs.prefetch_related(*self.prefetch_related_fields)

        return qs

    def get_serializer_class(self):
        """Получить класс сериализатора."""
        if self.serializer_class is None:
            raise ValueError("Необходимо указать serializer_class в классе представления")
        return self.serializer_class

    def get_serializer(self, *args, **kwargs):
        """Получить экземпляр сериализатора."""
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {})
        if 'request' not in kwargs['context'] and hasattr(self, 'request'):
            kwargs['context']['request'] = self.request
        return serializer_class(*args, **kwargs)

    def get_object(self):
        """Получить объект по lookup полям."""
        queryset = self.get_queryset()

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

        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is None:
            raise ValueError(f"Не найден параметр {lookup_url_kwarg} в URL")

        filter_kwargs = {self.lookup_field: lookup_value}
        return get_object_or_404(queryset, **filter_kwargs)

    def check_object_permissions(self, request, obj):
        """Проверить права доступа к объекту через permission-классы или owner."""
        from .permissions import IsOwner
        if hasattr(obj, 'owner') and hasattr(request, 'user'):
            perm = IsOwner()
            if not perm.has_object_permission(request, self, obj):
                raise ApiError.forbidden("Нет доступа к этому объекту")

    def perform_create(self, serializer):
        """Выполнить создание объекта с автоустановкой owner."""
        if hasattr(self.request, 'user') and hasattr(serializer.Meta.model, 'owner'):
            serializer.save(owner=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Выполнить обновление объекта."""
        serializer.save()

    def perform_delete(self, instance):
        """Выполнить удаление объекта."""
        instance.delete()

    def filter_queryset(self, queryset, request):
        """Применить фильтры к queryset (переопределить в наследниках)."""
        return queryset

    def order_queryset(self, queryset, request):
        """Применить сортировку к queryset (переопределить в наследниках)."""
        return queryset

    def paginate_queryset(self, queryset, request):
        """Применить пагинацию (переопределить для включения пагинации)."""
        return None

    def get_paginated_response(self, data):
        """Получить ответ с пагинацией."""
        return Response({
            'data': data,
            'count': len(data)
        })

    def make_response(self, data=None, message=None, count=None, status_code=status.HTTP_200_OK):
        """Единый формат API-ответа."""
        body = {}
        if data is not None:
            body['data'] = data
        if message:
            body['message'] = message
        if count is not None:
            body['count'] = count
        return Response(body, status=status_code)

    def handle_exception(self, exc):
        """Обработать исключение и вернуть ответ."""
        if isinstance(exc, ApiError):
            return Response(
                exc.get_full_details(),
                status=exc.status_code
            )

        logger.error(f"Необработанная ошибка в {self.__class__.__name__}: {str(exc)}")
        return Response(
            {'error': 'Внутренняя ошибка сервера', 'code': 'INTERNAL_ERROR'},
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


