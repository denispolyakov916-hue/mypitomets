"""
Кастомные storage backends для Yandex Cloud Object Storage (S3-совместимый).

Два бакета:
- PublicYandexS3Storage  — публичные файлы (аватары, обложки курсов, фото питомцев)
- PrivateYandexS3Storage — приватные файлы (видео курсов, материалы для скачивания)

Приватные файлы отдаются через presigned URL с ограниченным временем жизни.
"""

import os
import uuid
from datetime import datetime

from django.conf import settings

try:
    from storages.backends.s3boto3 import S3Boto3Storage
    import boto3
    from botocore.config import Config as BotoConfig

    HAS_STORAGES = True
except ImportError:
    HAS_STORAGES = False


def _get_s3_setting(name, default=''):
    """Получить настройку S3 из settings или переменных окружения."""
    return getattr(settings, name, None) or os.getenv(name, default)


def generate_upload_path(prefix, filename):
    """Генерирует уникальный путь для загрузки файла.

    Формат: prefix/YYYY/MM/uuid4_filename
    Исключает коллизии имён и организует файлы по дате.
    """
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"
    date_path = datetime.now().strftime('%Y/%m')
    return f"{prefix}/{date_path}/{unique_name}"


if HAS_STORAGES:

    class PublicYandexS3Storage(S3Boto3Storage):
        """
        Публичное хранилище Yandex Cloud S3.

        Используется для файлов, доступных без авторизации:
        - Аватары пользователей
        - Фото питомцев
        - Обложки курсов
        """

        def __init__(self, **kwargs):
            kwargs.setdefault('bucket_name',
                              _get_s3_setting('YANDEX_S3_BUCKET_PUBLIC', 'petplus-media-public'))
            kwargs.setdefault('endpoint_url',
                              _get_s3_setting('YANDEX_S3_ENDPOINT_URL', 'https://storage.yandexcloud.net'))
            kwargs.setdefault('region_name',
                              _get_s3_setting('YANDEX_S3_REGION', 'ru-central1'))
            kwargs.setdefault('access_key',
                              _get_s3_setting('YANDEX_S3_ACCESS_KEY_ID', ''))
            kwargs.setdefault('secret_key',
                              _get_s3_setting('YANDEX_S3_SECRET_ACCESS_KEY', ''))
            kwargs.setdefault('default_acl', 'public-read')
            kwargs.setdefault('file_overwrite', False)
            kwargs.setdefault('querystring_auth', False)  # Публичные URL без подписи
            super().__init__(**kwargs)

    class PrivateYandexS3Storage(S3Boto3Storage):
        """
        Приватное хранилище Yandex Cloud S3.

        Используется для защищённого контента:
        - Видео курсов
        - Файлы для скачивания
        - Материалы уроков

        Файлы доступны только через presigned URL с ограниченным TTL.
        """

        def __init__(self, **kwargs):
            kwargs.setdefault('bucket_name',
                              _get_s3_setting('YANDEX_S3_BUCKET_PRIVATE', 'petplus-media-private'))
            kwargs.setdefault('endpoint_url',
                              _get_s3_setting('YANDEX_S3_ENDPOINT_URL', 'https://storage.yandexcloud.net'))
            kwargs.setdefault('region_name',
                              _get_s3_setting('YANDEX_S3_REGION', 'ru-central1'))
            kwargs.setdefault('access_key',
                              _get_s3_setting('YANDEX_S3_ACCESS_KEY_ID', ''))
            kwargs.setdefault('secret_key',
                              _get_s3_setting('YANDEX_S3_SECRET_ACCESS_KEY', ''))
            kwargs.setdefault('default_acl', 'private')
            kwargs.setdefault('file_overwrite', False)
            kwargs.setdefault('querystring_auth', True)  # Presigned URL
            kwargs.setdefault('querystring_expire', 7200)  # 2 часа
            super().__init__(**kwargs)

        def get_presigned_url(self, key, expiration=7200):
            """
            Генерирует presigned URL для доступа к приватному файлу.

            Args:
                key: S3 ключ файла (путь в бакете)
                expiration: время жизни URL в секундах (по умолчанию 2 часа)

            Returns:
                Presigned URL для GET-запроса
            """
            return self.connection.meta.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key,
                },
                ExpiresIn=expiration,
            )

        def get_presigned_upload_url(self, key, content_type, expiration=3600):
            """
            Генерирует presigned URL для загрузки файла напрямую с фронтенда.

            Args:
                key: S3 ключ файла (путь в бакете)
                content_type: MIME-тип файла
                expiration: время жизни URL в секундах (по умолчанию 1 час)

            Returns:
                dict с URL и полями для загрузки
            """
            return self.connection.meta.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key,
                    'ContentType': content_type,
                },
                ExpiresIn=expiration,
            )

    def get_private_storage():
        """Получить экземпляр приватного хранилища."""
        return PrivateYandexS3Storage()

    def get_public_storage():
        """Получить экземпляр публичного хранилища."""
        return PublicYandexS3Storage()

else:
    # Fallback для локальной разработки без django-storages
    from django.core.files.storage import default_storage

    def get_private_storage():
        return default_storage

    def get_public_storage():
        return default_storage
