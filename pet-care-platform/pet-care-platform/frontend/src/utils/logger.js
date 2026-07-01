/**
 * devLog — консольный логгер клиентского приложения, активный ТОЛЬКО в dev-сборке.
 *
 * В продакшене (vite build → import.meta.env.DEV === false) это no-op: служебные
 * логи (данные заказа, статусы, шаги оформления) не светятся в консоли у пользователей.
 * Использовать вместо прямых console.* в пользовательских страницах.
 */
export const devLog = import.meta.env.DEV
  ? console
  : { log() {}, warn() {}, error() {}, info() {}, debug() {} };

export default devLog;
