"""
URL маршруты для загрузки файлов и медиа.

/api/upload/image/   — загрузка изображения
/api/upload/video/   — загрузка видео
/api/upload/file/    — загрузка файла
/api/upload/presign/ — presigned URL для прямой загрузки в S3
/api/media/video/    — presigned URL для воспроизведения видео
"""

from django.urls import path

from core.upload_views import (
    ImageUploadView,
    VideoUploadView,
    FileUploadView,
    PresignedUploadUrlView,
    VideoPlaybackUrlView,
)

urlpatterns = [
    # Загрузка файлов
    path('upload/image/', ImageUploadView.as_view(), name='upload-image'),
    path('upload/video/', VideoUploadView.as_view(), name='upload-video'),
    path('upload/file/', FileUploadView.as_view(), name='upload-file'),
    path('upload/presign/', PresignedUploadUrlView.as_view(), name='upload-presign'),

    # Воспроизведение медиа
    path('media/video/', VideoPlaybackUrlView.as_view(), name='video-playback'),
]
