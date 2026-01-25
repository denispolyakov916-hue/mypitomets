/**
 * Модуль API комментариев
 *
 * Предоставляет функции для работы с комментариями:
 * - Получение комментариев к урокам
 * - Добавление комментариев
 * - Лайки/дизлайки комментариев
 *
 * Все функции требуют аутентификации.
 */

import api from './client'

/**
 * Получение комментариев к уроку
 *
 * @param {number} lessonId - ID урока
 * @returns {Promise<Object>} Список комментариев с реакциями пользователя
 */
export const getLessonComments = async (lessonId) => {
  return await api.get(`/courses/lessons/${lessonId}/comments/`)
}

/**
 * Добавление комментария к уроку
 *
 * @param {number} lessonId - ID урока
 * @param {string} content - Текст комментария
 * @param {string} [parentId] - ID родительского комментария (для ответов)
 * @param {Array} [attachments] - Массив вложений (фото/видео)
 * @returns {Promise<Object>} Созданный комментарий
 */
export const addLessonComment = async (lessonId, content, parentId = null, attachments = []) => {
  const body = {
    content: content,
    attachments: attachments
  }

  if (parentId) {
    body.parent_id = parentId
  }

  return await api.post(`/courses/lessons/${lessonId}/comments/`, body)
}

/**
 * Лайк комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат лайка
 */
export const likeComment = async (commentId) => {
  return await api.post(`/courses/comments/${commentId}/like/`, { is_like: true })
}

/**
 * Дизлайк комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат дизлайка
 */
export const dislikeComment = async (commentId) => {
  return await api.post(`/courses/comments/${commentId}/like/`, { is_like: false })
}

/**
 * Удаление реакции на комментарий
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат удаления
 */
export const removeCommentReaction = async (commentId) => {
  return await api.delete(`/courses/comments/${commentId}/like/`)
}

// Функции комментариев курсов перенесены в courses.js для логичности
// export const getCourseComments, addCourseComment, createCourseComment

/**
 * Получение деталей комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Детали комментария
 */
export const getCommentDetails = async (commentId) => {
  return await api.get(`/courses/comments/${commentId}/`)
}

// Псевдоним для обратной совместимости
export { getCommentDetails as getComment }

/**
 * Редактирование комментария
 *
 * @param {string} commentId - UUID комментария
 * @param {string} content - Новый текст комментария
 * @param {Array} [attachments] - Новые вложения
 * @returns {Promise<Object>} Обновленный комментарий
 */
export const updateComment = async (commentId, content, attachments = []) => {
  return await api.put(`/courses/comments/${commentId}/`, {
    content: content,
    attachments: attachments
  })
}

/**
 * Удаление комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteComment = async (commentId) => {
  return await api.delete(`/courses/comments/${commentId}/`)
}

/**
 * Добавление реакции на комментарий (лайк/дизлайк)
 *
 * @param {string} commentId - UUID комментария
 * @param {string} action - 'like' или 'dislike'
 * @returns {Promise<Object>} Результат реакции
 */
export const addCommentReaction = async (commentId, action) => {
  return await api.post(`/courses/comments/${commentId}/${action}/`)
}

// Псевдоним для обратной совместимости
export { addCommentReaction as reactToComment }
export { removeCommentReaction as unlikeComment }
