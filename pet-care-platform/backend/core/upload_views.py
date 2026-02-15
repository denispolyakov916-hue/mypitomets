"""
API endpoints для загрузки файлов в Yandex Cloud S3.

Эндпоинты:
- POST /api/upload/image/   — загрузка изображения (до 10 MB)
- POST /api/upload/video/   — загрузка видео (до 2 GB, chunked)
- POST /api/upload/file/    — загрузка файла (до 100 MB)
- POST /api/upload/presign/ — получение presigned URL для прямой загрузки в S3
- GET  /api/media/video/    — получение presigned URL для воспроизведения видео
"""

import logging
import uuid
from datetime import datetime

from django.conf import settings
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.storage_backends import (
    get_private_storage,
    get_public_storage,
    generate_upload_path,
    HAS_STORAGES,
)

logger = logging.getLogger(__name__)


def _validate_file_type(file, allowed_types):
    """Проверить MIME-тип файла."""
    content_type = file.content_type
    if content_type not in allowed_types:
        return False, f'Недопустимый тип файла: {content_type}. Разрешены: {", ".join(allowed_types)}'
    return True, ''


def _validate_file_size(file, max_size):
    """Проверить размер файла."""
    if file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        file_mb = file.size / (1024 * 1024)
        return False, f'Файл слишком большой: {file_mb:.1f} MB. Максимум: {max_mb:.0f} MB'
    return True, ''


class ImageUploadView(APIView):
    """
    Загрузка изображения в публичное хранилище S3.

    POST /api/upload/image/
    Content-Type: multipart/form-data
    Body: file (image), prefix (optional, default: 'images')

    Returns: { url, key, filename, size }
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Валидация типа
        allowed = getattr(settings, 'ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        valid, error = _validate_file_type(file, allowed)
        if not valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        # Валидация размера
        max_size = getattr(settings, 'MAX_IMAGE_SIZE', 10 * 1024 * 1024)
        valid, error = _validate_file_size(file, max_size)
        if not valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        prefix = request.data.get('prefix', 'images')
        storage = get_public_storage()
        key = generate_upload_path(prefix, file.name)

        try:
            saved_name = storage.save(key, file)
            url = storage.url(saved_name)
            logger.info(f'Image uploaded: {saved_name} by user {request.user.id}')
            return Response({
                'url': url,
                'key': saved_name,
                'filename': file.name,
                'size': file.size,
                'content_type': file.content_type,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Image upload failed: {e}')
            return Response(
                {'error': 'Не удалось загрузить изображение'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VideoUploadView(APIView):
    """
    Загрузка видео в приватное хранилище S3.

    POST /api/upload/video/
    Content-Type: multipart/form-data
    Body: file (video)

    Returns: { key, filename, size, content_type }
    Видео не доступно по прямому URL — используйте VideoPlaybackUrlView.
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Валидация типа
        allowed = getattr(settings, 'ALLOWED_VIDEO_TYPES', ['video/mp4', 'video/webm', 'video/quicktime'])
        valid, error = _validate_file_type(file, allowed)
        if not valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        # Валидация размера
        max_size = getattr(settings, 'MAX_VIDEO_SIZE', 2 * 1024 * 1024 * 1024)
        valid, error = _validate_file_size(file, max_size)
        if not valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        storage = get_private_storage()
        key = generate_upload_path('courses/videos', file.name)

        try:
            saved_name = storage.save(key, file)
            logger.info(f'Video uploaded: {saved_name} by user {request.user.id}')
            return Response({
                'key': saved_name,
                'filename': file.name,
                'size': file.size,
                'content_type': file.content_type,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Video upload failed: {e}')
            return Response(
                {'error': 'Не удалось загрузить видео'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FileUploadView(APIView):
    """
    Загрузка файла (PDF, DOC и т.д.) в приватное хранилище S3.

    POST /api/upload/file/
    Content-Type: multipart/form-data
    Body: file

    Returns: { key, filename, size, content_type }
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Валидация типа
        allowed = getattr(settings, 'ALLOWED_FILE_TYPES', []) + getattr(settings, 'ALLOWED_IMAGE_TYPES', [])
        valid, error = _validate_file_type(file, allowed)
        if not valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        # Валидация размера
        max_size = getattr(settings, 'MAX_FILE_SIZE', 100 * 1024 * 1024)
        valid, error = _validate_file_size(file, max_size)
        if not valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        storage = get_private_storage()
        key = generate_upload_path('courses/files', file.name)

        try:
            saved_name = storage.save(key, file)
            logger.info(f'File uploaded: {saved_name} by user {request.user.id}')
            return Response({
                'key': saved_name,
                'filename': file.name,
                'size': file.size,
                'content_type': file.content_type,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'File upload failed: {e}')
            return Response(
                {'error': 'Не удалось загрузить файл'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PresignedUploadUrlView(APIView):
    """
    Генерация presigned URL для прямой загрузки файла в S3.
    Используется для больших файлов (видео), чтобы загружать напрямую в S3 с фронта.

    POST /api/upload/presign/
    Body: { filename, content_type, prefix (optional) }

    Returns: { upload_url, key, expires_in }
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        filename = request.data.get('filename')
        content_type = request.data.get('content_type')

        if not filename or not content_type:
            return Response(
                {'error': 'Необходимо указать filename и content_type'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Определяем бакет по типу файла
        is_public = content_type in getattr(settings, 'ALLOWED_IMAGE_TYPES', [])
        prefix = request.data.get('prefix', 'courses/videos' if not is_public else 'images')

        key = generate_upload_path(prefix, filename)

        if not HAS_STORAGES:
            return Response(
                {'error': 'S3 хранилище не настроено'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            storage = get_public_storage() if is_public else get_private_storage()
            upload_url = storage.get_presigned_upload_url(key, content_type, expiration=3600)
            return Response({
                'upload_url': upload_url,
                'key': key,
                'expires_in': 3600,
            })
        except Exception as e:
            logger.error(f'Presigned URL generation failed: {e}')
            return Response(
                {'error': 'Не удалось сгенерировать URL для загрузки'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VideoPlaybackUrlView(APIView):
    """
    Генерация presigned URL для воспроизведения приватного видео.
    Проверяет, что у пользователя есть доступ к курсу.

    GET /api/media/video/?key=<s3_key>&course_id=<course_id>

    Returns: { url, expires_in }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        key = request.query_params.get('key')
        course_id = request.query_params.get('course_id')

        if not key:
            return Response(
                {'error': 'Параметр key обязателен'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка доступа к курсу (если указан course_id)
        if course_id:
            from apps.training.models import UserCourse
            has_access = UserCourse.objects.filter(
                user=request.user,
                course_id=course_id,
            ).exists()

            # Администраторы имеют полный доступ
            if not has_access and not request.user.is_staff:
                return Response(
                    {'error': 'У вас нет доступа к этому курсу'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if not HAS_STORAGES:
            # Fallback для локальной разработки — вернуть ключ как URL
            return Response({
                'url': f'{settings.MEDIA_URL}{key}',
                'expires_in': 7200,
            })

        try:
            storage = get_private_storage()
            url = storage.get_presigned_url(key, expiration=7200)
            return Response({
                'url': url,
                'expires_in': 7200,
            })
        except Exception as e:
            logger.error(f'Video playback URL generation failed: {e}')
            return Response(
                {'error': 'Не удалось получить URL видео'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
