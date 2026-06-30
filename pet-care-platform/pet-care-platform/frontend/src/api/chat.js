/**
 * API ассистента «Пуф».
 *
 * Один эндпоинт: POST /api/assistant/chat/ (требует авторизации).
 * Клиент (./client) сам подставляет JWT, обрабатывает 401 и возвращает данные
 * ответа напрямую (response.data).
 */

import api from './client'

/**
 * Отправить сообщение ассистенту.
 *
 * @param {Object} params
 * @param {string} params.message - текст сообщения пользователя
 * @param {string|null} [params.petId] - id питомца (для вопросов о здоровье/питании)
 * @param {string|null} [params.capability] - принудительная тема: 'support'|'health'|'food'
 * @returns {Promise<{reply: string, capability: string, sources: Array, disclaimer: ?string, provider: string, needs_pet: boolean}>}
 */
export const sendChatMessage = async ({ message, petId = null, capability = null } = {}) => {
  const payload = { message }
  if (petId) payload.pet_id = petId
  if (capability) payload.capability = capability
  return await api.post('/assistant/chat/', payload)
}

/**
 * Отправить оценку ответа ассистента (👍/👎).
 *
 * @param {Object} params
 * @param {'up'|'down'} params.rating - оценка
 * @param {string} [params.message] - вопрос пользователя
 * @param {string} [params.reply] - ответ ассистента
 * @param {string|null} [params.capability] - тема ответа
 * @returns {Promise<{ok: boolean}>}
 */
export const sendChatFeedback = async ({ rating, message = '', reply = '', capability = null } = {}) => {
  const payload = { rating, message, reply }
  if (capability) payload.capability = capability
  return await api.post('/assistant/feedback/', payload)
}
