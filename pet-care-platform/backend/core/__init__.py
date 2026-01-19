# Core utilities for the backend
# Note: Imports moved to be done lazily to avoid circular dependencies during app loading

__all__ = [
    # CRUD Views - import from core.crud_views
    'BaseCRUDMixin',
    'BaseListCreateView',
    'BaseDetailView',
    'BaseReadOnlyView',

    # Permissions - import from core.permissions
    'IsOwner',
    'IsOwnerOrReadOnly',
    'IsStaffOrReadOnly',
    'IsAuthenticatedOrReadOnly',
    'IsAdminOrReadOnly',

    # Serializers - import from core.serializers
    'TimestampMixin',
    'OwnerMixin',
    'BaseModelSerializer',
    'CreateUpdateSerializerMixin',
    'ListDetailSerializerMixin',
    'DynamicFieldsSerializer',
    'ReadOnlySerializer',
]
