/**
 * API для работы с рейтингами и отзывами
 * 
 * Предоставляет функции для:
 * - Получения рейтингов и отзывов товаров/курсов
 * - Создания и обновления отзывов
 * - Проверки возможности оставить отзыв
 */

import api from './client'

/**
 * Получение рейтинга и отзывов товара
 * 
 * @param {number} productId - ID товара
 * @param {Object} params - Параметры пагинации
 * @returns {Promise<Object>} Рейтинг и список отзывов
 */
export const getProductReviews = async (productId, params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page)
  if (params.per_page) queryParams.append('per_page', params.per_page)
  
  const queryString = queryParams.toString()
  const url = queryString 
    ? `/reviews/products/${productId}/?${queryString}`
    : `/reviews/products/${productId}/`
  
  return await api.get(url)
}

/**
 * Получение рейтинга и отзывов курса
 * 
 * @param {number} courseId - ID курса
 * @param {Object} params - Параметры пагинации
 * @returns {Promise<Object>} Рейтинг и список отзывов
 */
export const getCourseReviews = async (courseId, params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page)
  if (params.per_page) queryParams.append('per_page', params.per_page)
  
  const queryString = queryParams.toString()
  const url = queryString 
    ? `/reviews/courses/${courseId}/?${queryString}`
    : `/reviews/courses/${courseId}/`
  
  return await api.get(url)
}

/**
 * Создание отзыва на товар
 * 
 * @param {number} productId - ID товара
 * @param {Object} reviewData - Данные отзыва
 * @param {number} reviewData.rating - Рейтинг (1-5)
 * @param {string} reviewData.comment - Комментарий
 * @returns {Promise<Object>} Созданный отзыв
 */
export const createProductReview = async (productId, reviewData) => {
  return await api.post(`/reviews/products/${productId}/`, reviewData)
}

/**
 * Создание отзыва на курс
 * 
 * @param {number} courseId - ID курса
 * @param {Object} reviewData - Данные отзыва
 * @param {number} reviewData.rating - Рейтинг (1-5)
 * @param {string} reviewData.comment - Комментарий
 * @returns {Promise<Object>} Созданный отзыв
 */
export const createCourseReview = async (courseId, reviewData) => {
  return await api.post(`/reviews/courses/${courseId}/`, reviewData)
}

/**
 * Обновление отзыва на товар
 * 
 * @param {number} productId - ID товара
 * @param {number} reviewId - ID отзыва
 * @param {Object} reviewData - Обновленные данные отзыва
 * @returns {Promise<Object>} Обновленный отзыв
 */
export const updateProductReview = async (productId, reviewId, reviewData) => {
  return await api.put(`/reviews/products/${productId}/reviews/${reviewId}/`, reviewData)
}

/**
 * Обновление отзыва на курс
 * 
 * @param {number} courseId - ID курса
 * @param {number} reviewId - ID отзыва
 * @param {Object} reviewData - Обновленные данные отзыва
 * @returns {Promise<Object>} Обновленный отзыв
 */
export const updateCourseReview = async (courseId, reviewId, reviewData) => {
  return await api.put(`/reviews/courses/${courseId}/reviews/${reviewId}/`, reviewData)
}

/**
 * Удаление отзыва
 * 
 * @param {string} type - Тип ('products' или 'courses')
 * @param {number} itemId - ID товара или курса
 * @param {number} reviewId - ID отзыва
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteReview = async (type, itemId, reviewId) => {
  return await api.delete(`/reviews/${type}/${itemId}/reviews/${reviewId}/`)
}

/**
 * Проверка возможности оставить отзыв
 * 
 * @param {string} type - Тип ('products' или 'courses')
 * @param {number} itemId - ID товара или курса
 * @returns {Promise<Object>} Информация о возможности оставить отзыв
 */
export const checkReviewEligibility = async (type, itemId) => {
  return await api.get(`/reviews/${type}/${itemId}/eligibility/`)
}

