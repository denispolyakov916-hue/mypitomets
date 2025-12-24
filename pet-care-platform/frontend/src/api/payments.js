/**
 * Модуль API платежей
 * 
 * Предоставляет функции для работы с платежами через единую систему оплаты.
 */

import api from './client'

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

