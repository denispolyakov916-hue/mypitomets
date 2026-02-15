/**
 * API для загрузки файлов в S3 хранилище
 *
 * Поддерживает:
 * - Загрузку изображений (до 10 MB)
 * - Загрузку видео (до 2 GB, через presigned URL)
 * - Загрузку файлов (до 100 MB)
 * - Получение presigned URL для воспроизведения видео
 */

import api from './client'

/**
 * Загрузка изображения
 *
 * @param {File} file - Файл изображения
 * @param {string} [prefix='images'] - Префикс пути в S3
 * @param {Function} [onProgress] - Callback прогресса загрузки
 * @returns {Promise<Object>} { url, key, filename, size }
 */
export const uploadImage = async (file, prefix = 'images', onProgress = null) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('prefix', prefix)

  return await api.post('/upload/image/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  })
}

/**
 * Загрузка видео через сервер (для небольших файлов < 100 MB)
 *
 * @param {File} file - Видео файл
 * @param {Function} [onProgress] - Callback прогресса
 * @returns {Promise<Object>} { key, filename, size }
 */
export const uploadVideoViaServer = async (file, onProgress = null) => {
  const formData = new FormData()
  formData.append('file', file)

  return await api.post('/upload/video/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000, // 10 минут для больших файлов
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  })
}

/**
 * Загрузка видео напрямую в S3 через presigned URL (для больших файлов)
 *
 * @param {File} file - Видео файл
 * @param {Function} [onProgress] - Callback прогресса (0-100)
 * @returns {Promise<Object>} { key } - S3 ключ файла
 */
export const uploadVideo = async (file, onProgress = null) => {
  // Если файл маленький (< 100 MB) — загружаем через сервер
  if (file.size < 100 * 1024 * 1024) {
    return await uploadVideoViaServer(file, onProgress)
  }

  // Для больших файлов — используем presigned URL
  // Шаг 1: Получаем presigned URL для загрузки
  const presignResponse = await api.post('/upload/presign/', {
    filename: file.name,
    content_type: file.type,
    prefix: 'courses/videos',
  })

  const { upload_url, key } = presignResponse

  // Шаг 2: Загружаем файл напрямую в S3
  await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (onProgress) onProgress(100)

  return { key, filename: file.name, size: file.size }
}

/**
 * Загрузка файла (PDF, DOC и т.д.)
 *
 * @param {File} file - Файл для загрузки
 * @param {Function} [onProgress] - Callback прогресса
 * @returns {Promise<Object>} { key, filename, size }
 */
export const uploadFile = async (file, onProgress = null) => {
  const formData = new FormData()
  formData.append('file', file)

  return await api.post('/upload/file/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  })
}

/**
 * Получение presigned URL для воспроизведения видео
 *
 * @param {string} s3Key - S3 ключ видео файла
 * @param {number} [courseId] - ID курса (для проверки доступа)
 * @returns {Promise<Object>} { url, expires_in }
 */
export const getVideoPlaybackUrl = async (s3Key, courseId = null) => {
  const params = new URLSearchParams({ key: s3Key })
  if (courseId) params.append('course_id', courseId)
  return await api.get(`/media/video/?${params.toString()}`)
}

/**
 * Получение presigned URL для загрузки файла
 *
 * @param {string} filename - Имя файла
 * @param {string} contentType - MIME-тип
 * @param {string} [prefix] - Префикс пути
 * @returns {Promise<Object>} { upload_url, key, expires_in }
 */
export const getPresignedUploadUrl = async (filename, contentType, prefix = null) => {
  const body = { filename, content_type: contentType }
  if (prefix) body.prefix = prefix
  return await api.post('/upload/presign/', body)
}
