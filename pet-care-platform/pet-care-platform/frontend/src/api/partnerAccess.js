/**
 * Модуль API заявок на партнёрский доступ
 *
 * Логин-пользователь запрашивает доступ к одной из партнёрских панелей:
 *  - 'supplier'           — кабинет поставщика корма
 *  - 'course_specialist'  — кабинет специалиста по курсам
 *
 * Заявку рассматривает владелец платформы (через Django admin) — это вне
 * фронтенда. Здесь только отправка заявки и чтение её статуса.
 *
 * Контракт бэкенда (эндпоинты строго фиксированы):
 *  - POST /api/partner-access/requests/
 *      body { requested_role, company_name?, message? }
 *      → 201 { id, requested_role, status: 'pending', created_at }
 *      → 400 если заявка уже на рассмотрении / доступ уже есть
 *            (axios-клиент разворачивает ошибку в { status, message, errors })
 *  - GET  /api/partner-access/requests/my/
 *      → [{ id, requested_role, status, company_name, created_at, reviewed_at }]
 */

import api from './client'

/**
 * Допустимые роли заявки и их человекочитаемые подписи.
 */
export const PARTNER_ROLES = [
  { value: 'supplier', label: 'Поставщик корма' },
  { value: 'course_specialist', label: 'Специалист по курсам' },
]

/**
 * Человекочитаемые статусы заявки.
 */
export const PARTNER_REQUEST_STATUS_LABELS = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

/**
 * Создание заявки на партнёрский доступ.
 *
 * @param {Object} payload
 * @param {'supplier'|'course_specialist'} payload.requested_role - Запрашиваемая роль
 * @param {string} [payload.company_name] - Название компании (для поставщика)
 * @param {string} [payload.message] - Сопроводительное сообщение (опционально)
 * @returns {Promise<Object>} { id, requested_role, status, created_at }
 * @throws {Object} { status, message, errors } — например 400, если заявка уже есть
 */
export const createPartnerAccessRequest = async ({ requested_role, company_name, message } = {}) => {
  const body = { requested_role }
  if (company_name != null && company_name !== '') body.company_name = company_name
  if (message != null && message !== '') body.message = message
  return await api.post('/partner-access/requests/', body)
}

/**
 * Получение собственных заявок на партнёрский доступ.
 *
 * @returns {Promise<Array>} Массив заявок пользователя
 */
export const getMyPartnerAccessRequests = async () => {
  return await api.get('/partner-access/requests/my/')
}
