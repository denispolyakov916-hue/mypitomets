/**
 * devLog — консольный логгер админки, активный ТОЛЬКО в dev-сборке.
 *
 * В продакшене (vite build → import.meta.env.DEV === false) это no-op: служебные
 * запросы/статусы/ошибки админки не светятся в консоли у пользователей.
 * Использовать вместо прямых console.* во всех компонентах и хуках админки.
 */
export const devLog = import.meta.env.DEV
  ? console
  : { log() {}, warn() {}, error() {}, info() {}, debug() {} };

export default devLog;
