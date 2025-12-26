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
  return await api.get(`/lessons/${lessonId}/comments/`)
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

  return await api.post(`/lessons/${lessonId}/comments/`, body)
}

/**
 * Лайк комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат лайка
 */
export const likeComment = async (commentId) => {
  return await api.post(`/comments/${commentId}/like/`, { is_like: true })
}

/**
 * Дизлайк комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат дизлайка
 */
export const dislikeComment = async (commentId) => {
  return await api.post(`/comments/${commentId}/like/`, { is_like: false })
}

/**
 * Удаление реакции на комментарий
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Результат удаления
 */
export const removeCommentReaction = async (commentId) => {
  return await api.delete(`/comments/${commentId}/like/`)
}

/**
 * Получение комментариев к курсу
 *
 * @param {number} courseId - ID курса
 * @param {Object} params - Параметры запроса (page, per_page)
 * @returns {Promise<Object>} Список комментариев с пагинацией
 */
export const getCourseComments = async (courseId, params = {}) => {
  return await api.get(`/courses/${courseId}/comments/`, { params })
}

/**
 * Добавление комментария к курсу
 *
 * @param {number} courseId - ID курса
 * @param {string} content - Текст комментария
 * @param {string} [parentId] - ID родительского комментария
 * @param {Array} [attachments] - Массив вложений
 * @returns {Promise<Object>} Созданный комментарий
 */
export const addCourseComment = async (courseId, content, parentId = null, attachments = []) => {
  const body = {
    content: content,
    attachments: attachments
  }

  if (parentId) {
    body.parent = parentId
  }

  return await api.post(`/courses/${courseId}/comments/create/`, body)
}

/**
 * Получение деталей комментария
 *
 * @param {string} commentId - UUID комментария
 * @returns {Promise<Object>} Детали комментария
 */
export const getCommentDetails = async (commentId) => {
  return await api.get(`/comments/${commentId}/`)
}

/**
 * Редактирование комментария
 *
 * @param {string} commentId - UUID комментария
 * @param {string} content - Новый текст комментария
 * @param {Array} [attachments] - Новые вложения
 * @returns {Promise<Object>} Обновленный комментарий
 */
export const updateComment = async (commentId, content, attachments = []) => {
  return await api.put(`/comments/${commentId}/`, {
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
  return await api.delete(`/comments/${commentId}/`)
}

/**
 * Добавление реакции на комментарий (лайк/дизлайк)
 *
 * @param {string} commentId - UUID комментария
 * @param {string} action - 'like' или 'dislike'
 * @returns {Promise<Object>} Результат реакции
 */
export const addCommentReaction = async (commentId, action) => {
  return await api.post(`/comments/${commentId}/${action}/`)
}
