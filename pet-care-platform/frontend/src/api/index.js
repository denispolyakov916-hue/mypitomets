/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *                         🐾 ПИТОМЕЦ+ API CLIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Единая точка входа для всех API модулей.
 * 
 * Использование:
 *   import { auth, pets, shop, courses } from '@/api'
 *   
 *   // Или отдельные функции:
 *   import { login, getPets, getProducts } from '@/api'
 * 
 * Структура API:
 *   auth      - Аутентификация (login, register, logout, refreshToken)
 *   pets      - Питомцы и породы (getPets, createPet, getBreeds)
 *   shop      - Магазин (getProducts, getCart, createOrder)
 *   courses   - Курсы (getCourses, purchaseCourse)
 *   payments  - Платежи (createPayment, confirmPayment)
 *   reviews   - Отзывы (getReviews, createReview)
 *   reminders - Напоминания (getReminders, createReminder)
 *   calendar  - Календарь (getEvents, createEvent)
 *   comments  - Комментарии (getComments, createComment)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Base API utilities
export { default as api } from './client'
export { createCrudApi, createReadOnlyApi, createCachedApi } from './baseApi'

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH - Аутентификация
// ═══════════════════════════════════════════════════════════════════════════════
export {
  login,
  register,
  logout,
  refreshToken,
  activateByCode,
  exchangeAuthCode,
  getProfile,
  updateProfile,
  hasToken,
} from './auth'

// ═══════════════════════════════════════════════════════════════════════════════
// PETS - Питомцы и породы
// ═══════════════════════════════════════════════════════════════════════════════
export {
  // CRUD питомцев
  getPets,
  getPet,
  createPet,
  updatePet,
  deletePet,
  
  // Черновики
  savePetDraft,
  getPetDrafts,
  deletePetDraft,
  
  // Справочник пород
  getBreeds,
  getBreed,
  getBreedSuggestions,
  
  // Анализ
  getPetAnalysis,
  
  // Константы
  SPECIES_OPTIONS,
  BEHAVIOR_TYPE_OPTIONS,
  SOCIAL_LEVEL_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  SIZE_OPTIONS,
  BODY_TYPE_OPTIONS,
  DIET_TYPE_OPTIONS,
  FEEDING_FREQUENCY_OPTIONS,
  HOUSING_TYPE_OPTIONS,
  DENTAL_HEALTH_OPTIONS,
  CHARACTER_TRAITS,
  HEALTH_ISSUES_OPTIONS,
  EXCLUDED_INGREDIENTS_OPTIONS,
  BEHAVIORAL_PROBLEMS,
} from './pets'

// ═══════════════════════════════════════════════════════════════════════════════
// SHOP - Магазин
// ═══════════════════════════════════════════════════════════════════════════════
export {
  // Товары
  getProducts,
  getProduct,
  getFrequentlyBoughtTogether,
  getPersonalRecommendations,
  getCartRecommendations,
  getHealthFilteredProducts,
  getHealthFilters,
  
  // Корзина
  getCart,
  addToCart,
  addCourseToCart,
  updateCartItem,
  removeFromCart,
  removeCourseFromCart,
  refreshCart,
  
  // Заказы
  getCheckoutInfo,
  createOrder,
  getOrders,
  updateOrder,
  
  // Адреса
  getAddresses,
  createAddress,
  searchAddresses,
  
  // Checkout
  getUnifiedCheckout,
  submitUnifiedCheckout,
  cancelReservation,
  
  // Возвраты
  createReturn,
  getReturns,
  getReturn,
  
  // Константы
  HEALTH_ISSUES,
  PET_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from './shop'

// ═══════════════════════════════════════════════════════════════════════════════
// COURSES - Курсы
// ═══════════════════════════════════════════════════════════════════════════════
export {
  getCourses,
  getCourse,
  getUserCourses,
  getPersonalizedCourses,
  purchaseCourse,
  enrollFreeCourse,
  getCourseCheckout,
  
  // Уроки
  getCourseLessons,
  getLesson,
  completeLesson,
  updateLessonProgress,
  getCourseProgress,
  
  // Комментарии и оценки курса
  getCourseComments,
  getCourseRatings,
  rateCourse,
  
  // Конструктор курсов
  getCourseBuilder,
  getCoursePages,
  getCoursePage,
  createCoursePage,
  updateCoursePage,
  deleteCoursePage,
  completeCoursePage,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  duplicateContentBlock,
  getBlockTemplates,
  createBlockTemplate,
  useBlockTemplate,
  saveCourseBuilder,
  publishCourse,
  previewCourse,
} from './courses'

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS - Платежи
// ═══════════════════════════════════════════════════════════════════════════════
export {
  getPayments,
  getPayment,
  createPayment,
  getPaymentByOrder,
  confirmPayment,
  cancelPayment,
  processPayment,
  submitPaymentPage,
  getPaymentStatistics,
} from './payments'

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS - Отзывы
// ═══════════════════════════════════════════════════════════════════════════════
export {
  getProductReviews,
  createProductReview,
  updateProductReview,
  deleteProductReview,
  getProductReviewEligibility,
  getCourseReviews,
  createCourseReview,
  updateCourseReview,
  deleteCourseReview,
  getCourseReviewEligibility,
  checkReviewEligibility,
  deleteReview,
  getRecentPurchasesForReview,
} from './reviews'

// ═══════════════════════════════════════════════════════════════════════════════
// REMINDERS - Напоминания
// ═══════════════════════════════════════════════════════════════════════════════
export {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  completeReminder,
  getReminderCategories,
  getUpcomingReminders,
} from './reminders'

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR - Календарь событий (УДАЛЕН - не используется)
// ═══════════════════════════════════════════════════════════════════════════════
// Функции календаря удалены, так как не используются в приложении

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS - Комментарии (уроков)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  getLessonComments,
  addLessonComment,
  // addCourseComment,     // ПЕРЕНЕСЕНО в courses.js
  // createCourseComment,  // ПЕРЕНЕСЕНО в courses.js
  getComment,
  getCommentDetails,
  updateComment,
  deleteComment,
  likeComment,
  dislikeComment,
  removeCommentReaction,
  unlikeComment,
  addCommentReaction,
  reactToComment,
} from './comments'

// ═══════════════════════════════════════════════════════════════════════════════
// API MODULES - Для группового импорта
// ═══════════════════════════════════════════════════════════════════════════════

import * as authModule from './auth'
import * as petsModule from './pets'
import * as shopModule from './shop'
import * as coursesModule from './courses'
import * as paymentsModule from './payments'
import * as reviewsModule from './reviews'
import * as remindersModule from './reminders'
// import * as calendarModule from './calendar' // УДАЛЕН - не используется
import * as commentsModule from './comments'

export const auth = authModule
export const pets = petsModule
export const shop = shopModule
export const courses = coursesModule
export const payments = paymentsModule
export const reviews = reviewsModule
export const reminders = remindersModule
// export const calendar = calendarModule // УДАЛЕН - не используется
export const comments = commentsModule

// Default export - все модули
export default {
  auth: authModule,
  pets: petsModule,
  shop: shopModule,
  courses: coursesModule,
  payments: paymentsModule,
  reviews: reviewsModule,
  reminders: remindersModule,
  // calendar: calendarModule, // УДАЛЕН - не используется
  comments: commentsModule,
}
