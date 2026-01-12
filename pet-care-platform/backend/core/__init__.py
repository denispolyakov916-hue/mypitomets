# Core utilities for the backend

from .crud_views import (
    BaseCRUDMixin,
    BaseListCreateView,
    BaseDetailView,
    BaseReadOnlyView
)

from .permissions import (
    IsOwner,
    IsOwnerOrReadOnly,
    IsStaffOrReadOnly,
    IsAuthenticatedOrReadOnly,
    IsAdminOrReadOnly
)

from .serializers import (
    TimestampMixin,
    OwnerMixin,
    BaseModelSerializer,
    CreateUpdateSerializerMixin,
    ListDetailSerializerMixin,
    DynamicFieldsSerializer,
    ReadOnlySerializer
)

__all__ = [
    # CRUD Views
    'BaseCRUDMixin',
    'BaseListCreateView',
    'BaseDetailView',
    'BaseReadOnlyView',

    # Permissions
    'IsOwner',
    'IsOwnerOrReadOnly',
    'IsStaffOrReadOnly',
    'IsAuthenticatedOrReadOnly',
    'IsAdminOrReadOnly',

    # Serializers
    'TimestampMixin',
    'OwnerMixin',
    'BaseModelSerializer',
    'CreateUpdateSerializerMixin',
    'ListDetailSerializerMixin',
    'DynamicFieldsSerializer',
    'ReadOnlySerializer',
]

