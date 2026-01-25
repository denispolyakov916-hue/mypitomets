/**
 * Модуль API платежей
 * 
 * Предоставляет функции для работы с платежами через единую систему оплаты.
 */

import api from './client'

/**
 * Получение списка платежей пользователя
 * 
 * @returns {Promise<Object>} Список платежей
 */
export const getPayments = async () => {
  return await api.get('/payments/')
}

/**
 * Обработка платежа через единую страницу оплаты
 * 
 * @param {Object} paymentData - Данные платежа
 * @param {string} paymentData.payment_type - Тип платежа ('shop_order', 'course')
 * @param {string} paymentData.object_id - ID объекта (заказа или курса)
 * @param {string} paymentData.card_number - Номер карты
 * @param {string} paymentData.cardholder_name - Имя держателя
 * @param {string} paymentData.expiry_month - Месяц (MM)
 * @param {string} paymentData.expiry_year - Год (YYYY)
 * @param {string} paymentData.cvv - CVV код
 * @returns {Promise<Object>} Результат платежа
 */
export const processPayment = async (paymentData) => {
  return await api.post('/payments/page/', paymentData)
}

// Псевдоним для обратной совместимости
export { processPayment as submitPaymentPage }

/**
 * Подтверждение существующего платежа
 * 
 * @param {string} paymentId - ID платежа
 * @returns {Promise<Object>} Результат подтверждения
 */
export const confirmPayment = async (paymentId) => {
  return await api.post(`/payments/${paymentId}/confirm/`, {})
}

/**
 * Создание платежа
 *
 * @param {Object} paymentData - Данные платежа
 * @param {string} paymentData.payment_type - Тип платежа ('shop_order', 'course')
 * @param {string} paymentData.object_id - ID объекта (заказа или курса)
 * @param {number} paymentData.amount - Сумма платежа
 * @param {string} paymentData.payment_method - Метод оплаты (опционально)
 * @param {Object} paymentData.metadata - Дополнительные данные (опционально)
 * @returns {Promise<Object>} Созданный платеж
 */
export const createPayment = async (paymentData) => {
  return await api.post('/payments/create/', paymentData)
}

/**
 * Получение информации о платеже
 *
 * @param {string} paymentId - ID платежа
 * @returns {Promise<Object>} Данные платежа
 */
export const getPayment = async (paymentId) => {
  return await api.get(`/payments/${paymentId}/`)
}

/**
 * Получение платежа по ID заказа
 *
 * @param {string} orderId - ID заказа
 * @returns {Promise<Object>} Данные платежа
 */
export const getPaymentByOrder = async (orderId) => {
  return await api.get(`/payments/by-order/${orderId}/`)
}

/**
 * Отмена платежа
 *
 * @param {string} paymentId - ID платежа
 * @returns {Promise<Object>} Результат отмены
 */
export const cancelPayment = async (paymentId) => {
  return await api.post(`/payments/${paymentId}/cancel/`, {})
}

/**
 * Получение статистики платежей
 *
 * @returns {Promise<Object>} Статистика платежей
 */
export const getPaymentStatistics = async () => {
  return await api.get('/payments/statistics/')
}

