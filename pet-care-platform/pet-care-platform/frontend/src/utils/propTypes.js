/**
 * Общие PropTypes для переиспользования
 * 
 * Предоставляет стандартизированные PropTypes для часто используемых типов данных.
 */

import PropTypes from 'prop-types'

/**
 * PropTypes для пользователя
 */
export const UserPropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  email: PropTypes.string.isRequired,
  first_name: PropTypes.string,
  last_name: PropTypes.string,
  phone: PropTypes.string,
  city: PropTypes.string,
  date_of_birth: PropTypes.string,
  role: PropTypes.oneOf([
    'user',
    'course_creator',
    'supplier_manager',
    'supplier_editor',
    'supplier_analyst',
    'marketing_manager',
    'admin',
  ]),
  is_staff: PropTypes.bool,
  is_superuser: PropTypes.bool,
  is_active: PropTypes.bool,
})

/**
 * PropTypes для питомца
 */
export const PetPropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
  species: PropTypes.oneOf(['dog', 'cat', 'bird', 'other']).isRequired,
  breed: PropTypes.string,
  gender: PropTypes.oneOf(['male', 'female']),
  date_of_birth: PropTypes.string,
  weight: PropTypes.number,
  owner: PropTypes.oneOfType([PropTypes.number, UserPropTypes]),
  favorite_foods: PropTypes.arrayOf(PropTypes.string),
  allergies: PropTypes.arrayOf(PropTypes.string),
  health_issues: PropTypes.arrayOf(PropTypes.string),
  special_needs: PropTypes.arrayOf(PropTypes.string),
  preferred_activities: PropTypes.arrayOf(PropTypes.string),
  behavioral_problems: PropTypes.arrayOf(PropTypes.string),
})

/**
 * PropTypes для товара
 */
export const ProductPropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  price: PropTypes.number.isRequired,
  compare_price: PropTypes.number,
  animal_type: PropTypes.oneOf(['dog', 'cat', 'all']),
  product_type: PropTypes.string,
  images: PropTypes.arrayOf(PropTypes.string),
  image_url: PropTypes.string,
  is_available: PropTypes.bool,
  brand_name: PropTypes.string,
  rating: PropTypes.number,
  reviews_count: PropTypes.number,
})

/**
 * PropTypes для курса
 */
export const CoursePropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  price: PropTypes.number.isRequired,
  duration: PropTypes.number,
  pet_type: PropTypes.oneOf(['dog', 'cat', 'all']),
  is_free: PropTypes.bool,
  is_active: PropTypes.bool,
  image_url: PropTypes.string,
  recommended_behavior_types: PropTypes.arrayOf(PropTypes.string),
  recommended_activity_levels: PropTypes.arrayOf(PropTypes.string),
  recommended_social_levels: PropTypes.arrayOf(PropTypes.string),
  rating: PropTypes.number,
  reviews_count: PropTypes.number,
})

/**
 * PropTypes для элемента корзины
 */
export const CartItemPropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  quantity: PropTypes.number.isRequired,
  price: PropTypes.number.isRequired,
  product: ProductPropTypes,
  course: CoursePropTypes,
})

/**
 * PropTypes для заказа
 */
export const OrderPropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  status: PropTypes.oneOf(['pending', 'processing', 'partially_delivered', 'shipped', 'delivered', 'cancelled']).isRequired,
  total_amount: PropTypes.number.isRequired,
  subtotal_amount: PropTypes.number.isRequired,
  delivery_cost: PropTypes.number.isRequired,
  delivery_type: PropTypes.oneOf(['standard', 'express', 'pickup']),
  shipping_address: PropTypes.string,
  created_at: PropTypes.string,
  user: PropTypes.oneOfType([PropTypes.number, UserPropTypes]),
})

/**
 * PropTypes для отзыва
 */
export const ReviewPropTypes = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  rating: PropTypes.number.isRequired,
  comment: PropTypes.string,
  user: PropTypes.oneOfType([PropTypes.number, UserPropTypes]),
  product: PropTypes.oneOfType([PropTypes.number, ProductPropTypes]),
  course: PropTypes.oneOfType([PropTypes.number, CoursePropTypes]),
  created_at: PropTypes.string,
})

/**
 * PropTypes для пагинации
 */
export const PaginationPropTypes = PropTypes.shape({
  total: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  per_page: PropTypes.number.isRequired,
  total_pages: PropTypes.number.isRequired,
})

/**
 * PropTypes для фильтров
 */
export const FiltersPropTypes = PropTypes.shape({
  pet_type: PropTypes.oneOf(['dog', 'cat', 'all']),
  min_price: PropTypes.number,
  max_price: PropTypes.number,
  category: PropTypes.string,
  search: PropTypes.string,
  sort: PropTypes.string,
})

/**
 * PropTypes для API ответа с данными
 */
export const ApiResponsePropTypes = PropTypes.shape({
  data: PropTypes.any,
  pagination: PaginationPropTypes,
  filters: FiltersPropTypes,
  error: PropTypes.string,
  message: PropTypes.string,
})

/**
 * PropTypes для функции обновления формы
 */
export const UpdateFormDataPropTypes = PropTypes.func.isRequired

/**
 * PropTypes для данных формы
 */
export const FormDataPropTypes = PropTypes.object.isRequired

/**
 * PropTypes для обработчика событий
 */
export const EventHandlerPropTypes = PropTypes.func

/**
 * PropTypes для children
 */
export const ChildrenPropTypes = PropTypes.oneOfType([
  PropTypes.node,
  PropTypes.arrayOf(PropTypes.node),
])

/**
 * PropTypes для className
 */
export const ClassNamePropTypes = PropTypes.string

/**
 * PropTypes для стилей
 */
export const StylePropTypes = PropTypes.object
