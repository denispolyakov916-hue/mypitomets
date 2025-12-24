# User Flow: Выбор товаров в корзине для оформления заказа

## Оглавление
1. [Обзор](#обзор)
2. [User Flow 1: Выбор только товаров из магазина](#user-flow-1-выбор-только-товаров-из-магазина)
3. [User Flow 2: Выбор только курсов из каталога](#user-flow-2-выбор-только-курсов-из-каталога)
4. [User Flow 3: Выбор товаров и курсов одновременно](#user-flow-3-выбор-товаров-и-курсов-одновременно)
5. [Техническая реализация](#техническая-реализация)
6. [Изменения в API](#изменения-в-api)
7. [Изменения во фронтенде](#изменения-во-фронтенде)

---

## Обзор

Данный документ описывает функционал выборочного оформления товаров из корзины. Пользователь может выбрать конкретные товары и/или курсы через чекбоксы и оформить только выбранные позиции. При одновременном выборе товаров и курсов создаются два отдельных заказа для возможности независимого возврата.

### Ключевые особенности:
- ✅ Выборочное оформление через чекбоксы
- ✅ Кнопка "Выбрать все" для быстрого выбора
- ✅ Раздельное оформление товаров и курсов
- ✅ Создание двух отдельных заказов при смешанном оформлении
- ✅ Единый эндпоинт для всех типов оформления

---

## User Flow 1: Выбор только товаров из магазина

### Сценарий
Пользователь имеет в корзине несколько товаров из магазина и хочет оформить только часть из них.

### Шаги пользователя

#### Шаг 1: Открытие корзины
**Что видит пользователь:**
- Страница корзины (`/cart`)
- Список всех товаров в корзине
- Каждый товар имеет:
  - Чекбокс для выбора (по умолчанию выбран)
  - Изображение товара
  - Название товара
  - Цену за единицу
  - Количество (с кнопками +/-)
  - Общую стоимость позиции
  - Кнопки: "В избранное" (сердечко), "Удалить" (корзина), "Купить"
- В верхней части:
  - Чекбокс "Выбрать все" (по умолчанию выбран)
  - Кнопка "Поделиться"
  - Кнопка "Удалить выбранное"

**Что может сделать:**
- Снять чекбокс с товаров, которые не хочет оформлять
- Нажать "Выбрать все" для выбора/снятия всех товаров
- Изменить количество товаров
- Удалить товар из корзины
- Нажать "Купить" на конкретном товаре (быстрое оформление одного товара)

#### Шаг 2: Выбор товаров
**Что видит пользователь:**
- Чекбоксы у выбранных товаров отмечены
- В правой панели "Оформление заказа" отображается:
  - Количество выбранных позиций
  - Итоговая сумма только выбранных товаров
  - Кнопка "Оформить заказ" (активна, если выбрано ≥ 1 товар)

**Что может сделать:**
- Снять/поставить чекбоксы у отдельных товаров
- Нажать "Оформить заказ"

#### Шаг 3: Переход на страницу оформления
**Что видит пользователь:**
- Страница единого checkout (`/checkout`)
- Таймер резервирования товаров (10 минут)
- Секция "Товары" с выбранными товарами:
  - Список товаров (только выбранные)
  - Выбор способа доставки:
    - Стандартная доставка (3 дня, 500₽)
    - Экспресс доставка (1 день, 1000₽)
    - Самовывоз (бесплатно)
  - Выбор адреса доставки:
    - Список сохранённых адресов (радио-кнопки)
    - Поле для ввода нового адреса
- Секция "Итого к оплате" (правая панель):
  - Товары: [сумма]
  - Доставка: [стоимость]
  - Итого: [общая сумма]
  - Кнопка "Оплатить [сумма]"

**Что может сделать:**
- Выбрать способ доставки
- Выбрать или ввести адрес
- Нажать "Оплатить"

#### Шаг 4: Оформление заказа
**Что происходит:**
- Создаётся один заказ товаров (`Order`)
- Товары резервируются на складе
- Создаётся платёж
- Пользователь перенаправляется на страницу оплаты

**Что видит пользователь:**
- Страница оплаты с формой ввода карты
- После оплаты - страница профиля с сообщением об успешном оформлении

---

## User Flow 2: Выбор только курсов из каталога

### Сценарий
Пользователь имеет в корзине несколько курсов и хочет оформить только часть из них.

### Шаги пользователя

#### Шаг 1: Открытие корзины
**Что видит пользователь:**
- Страница корзины (`/cart`)
- Список всех курсов в корзине
- Каждый курс имеет:
  - Чекбокс для выбора (по умолчанию выбран)
  - Иконка курса
  - Название курса
  - Информация о питомце (для кого курс)
  - Цена курса
  - Кнопки: "В избранное", "Удалить", "Купить"
- В верхней части:
  - Чекбокс "Выбрать все"
  - Кнопка "Поделиться"
  - Кнопка "Удалить выбранное"

**Что может сделать:**
- Снять чекбокс с курсов, которые не хочет оформлять
- Нажать "Выбрать все"
- Удалить курс из корзины
- Нажать "Купить" на конкретном курсе

#### Шаг 2: Выбор курсов
**Что видит пользователь:**
- Чекбоксы у выбранных курсов отмечены
- В правой панели "Оформление заказа":
  - Количество выбранных курсов
  - Итоговая сумма только выбранных курсов
  - Кнопка "Оформить заказ" (активна, если выбрано ≥ 1 курс)

**Что может сделать:**
- Снять/поставить чекбоксы у отдельных курсов
- Нажать "Оформить заказ"

#### Шаг 3: Переход на страницу оформления
**Что видит пользователь:**
- Страница единого checkout (`/checkout`)
- Секция "Курсы" с выбранными курсами:
  - Список курсов (только выбранные)
  - Для каждого курса: название, питомец, цена
  - Блок с условиями использования курсов:
    - Предупреждение о цифровом контенте
    - Чекбокс "Я принимаю условия использования курсов"
- Секция "Итого к оплате":
  - Курсы: [сумма]
  - Итого: [общая сумма]
  - Кнопка "Оплатить [сумма]" (неактивна, пока не приняты условия)

**Что может сделать:**
- Прочитать условия использования
- Принять условия (чекбокс)
- Нажать "Оплатить"

#### Шаг 4: Оформление заказа
**Что происходит:**
- Создаются записи `UserCourse` для каждого выбранного курса
- Создаётся платёж (если курсы платные)
- Пользователь перенаправляется на страницу оплаты или в профиль

**Что видит пользователь:**
- Если курсы платные: страница оплаты
- Если курсы бесплатные: страница профиля с сообщением об успешном оформлении
- Курсы доступны в разделе "Мои курсы"

---

## User Flow 3: Выбор товаров и курсов одновременно

### Сценарий
Пользователь имеет в корзине и товары, и курсы, и хочет оформить часть товаров и часть курсов одновременно.

### Шаги пользователя

#### Шаг 1: Открытие корзины
**Что видит пользователь:**
- Страница корзины (`/cart`)
- Список всех товаров и курсов, сгруппированных по типу:
  - Секция "Товары" (если есть товары)
  - Секция "Курсы" (если есть курсы)
- Каждый элемент имеет чекбокс для выбора
- В верхней части:
  - Чекбокс "Выбрать все" (выбирает и товары, и курсы)
  - Кнопки управления

**Что может сделать:**
- Выбрать товары и курсы независимо друг от друга
- Нажать "Оформить заказ" (активна, если выбрано ≥ 1 товар или курс)

#### Шаг 2: Выбор товаров и курсов
**Что видит пользователь:**
- Чекбоксы у выбранных элементов отмечены
- В правой панели "Оформление заказа":
  - Количество выбранных позиций (товары + курсы)
  - Итоговая сумма (товары + курсы)
  - Кнопка "Оформить заказ"

**Что может сделать:**
- Настроить выбор товаров и курсов
- Нажать "Оформить заказ"

#### Шаг 3: Переход на страницу оформления
**Что видит пользователь:**
- Страница единого checkout (`/checkout`)
- Таймер резервирования товаров (10 минут)
- Секция "Товары" (если выбраны товары):
  - Список выбранных товаров
  - Выбор способа доставки
  - Выбор адреса доставки
- Секция "Курсы" (если выбраны курсы):
  - Список выбранных курсов
  - Условия использования курсов
  - Чекбокс принятия условий
- Секция "Итого к оплате":
  - Товары: [сумма]
  - Доставка: [стоимость] (если есть товары)
  - Курсы: [сумма]
  - Итого: [общая сумма]
  - Кнопка "Оплатить [сумма]"

**Что может сделать:**
- Заполнить данные для товаров (доставка, адрес)
- Принять условия для курсов
- Нажать "Оплатить"

#### Шаг 4: Оформление заказа
**Что происходит:**
- Создаётся заказ товаров (`Order`) - если выбраны товары
- Создаются записи `UserCourse` - если выбраны курсы
- Создаётся единый платёж на общую сумму
- Товары резервируются на складе

**Важно:** При одновременном оформлении товаров и курсов создаются **два отдельных заказа**:
1. Заказ товаров (`Order` с `order_type='products'`)
2. Заказ курсов (группа `UserCourse` записей, связанных через транзакцию)

Это позволяет:
- Возвращать товары и курсы независимо
- Отслеживать статусы отдельно
- Управлять доставкой товаров независимо от курсов

**Что видит пользователь:**
- Страница оплаты с общей суммой
- После оплаты - страница профиля с двумя заказами:
  - Заказ товаров (статус: "Ожидает оплаты" → "Оплачен" → "В доставке")
  - Заказ курсов (статус: "Оплачен", курсы доступны сразу)

---

## Техническая реализация

### Архитектура решения

```
┌─────────────────┐
│   Cart Page     │
│  (с чекбоксами) │
└────────┬────────┘
         │
         │ Выбранные items
         ▼
┌─────────────────┐
│  UnifiedCheckout│
│  (GET /checkout/)│
└────────┬────────┘
         │
         │ selected_items: [item_ids]
         ▼
┌─────────────────┐
│  POST /checkout/ │
│  (с selected_items)│
└────────┬────────┘
         │
         ├─► Order (товары)
         └─► UserCourse (курсы)
```

### Логика разделения заказов

При оформлении товаров и курсов одновременно:
1. **Товары** → создаётся `Order` с типом `'products'`
2. **Курсы** → создаются `UserCourse` записи, связанные через `Payment` транзакцию

Это позволяет:
- Возвращать товары отдельно от курсов
- Отслеживать доставку товаров независимо
- Предоставлять доступ к курсам сразу после оплаты

---

## Изменения в API

### 1. GET /api/checkout/ - Добавление поддержки выбранных товаров

**Текущий формат:**
```json
GET /api/checkout/
```

**Новый формат:**
```json
GET /api/checkout/?selected_items=uuid1,uuid2,uuid3
```

**Query параметры:**
- `selected_items` (опционально) - список ID элементов корзины через запятую
- Если не указан - возвращает все товары из корзины (обратная совместимость)

**Ответ:** Без изменений, но возвращает только выбранные товары/курсы

**Пример запроса:**
```javascript
// Выбрать только товары с ID корзины uuid1 и uuid2
GET /api/checkout/?selected_items=uuid1,uuid2
```

### 2. POST /api/checkout/ - Создание раздельных заказов

**Текущий формат запроса:**
```json
{
  "delivery_type": "standard",
  "address_id": "uuid",
  "shipping_address": "Москва, ул. Примерная, д. 1",
  "courses_disclaimer_accepted": true
}
```

**Новый формат запроса:**
```json
{
  "selected_items": ["uuid1", "uuid2", "uuid3"],  // Опционально, если не указано - все из корзины
  "delivery_type": "standard",                    // Только если есть товары
  "address_id": "uuid",                           // Только если есть товары
  "shipping_address": "Москва, ул. Примерная, д. 1",  // Только если есть товары
  "courses_disclaimer_accepted": true             // Только если есть курсы
}
```

**Новый формат ответа:**
```json
{
  "reservation_id": "reservation-uuid",
  "orders": {
    "products_order": {                           // null, если нет товаров
      "id": 1,
      "total_amount": 3500,
      "status": "pending",
      "order_type": "products"
    },
    "courses_order": {                            // null, если нет курсов
      "id": null,                                 // Для курсов нет Order, только UserCourse
      "courses": [
        {
          "id": 1,
          "title": "Основы ухода",
          "purchased_at": "2024-01-01T12:00:00Z",
          "user_course_id": "uuid"
        }
      ],
      "total_amount": 5000
    }
  },
  "payment": {
    "id": "payment-uuid",
    "amount": 8500,                               // Сумма товаров + курсов
    "url": "/payment/payment-uuid"
  }
}
```

**Логика создания заказов:**

```python
def post(self, request):
    selected_items = request.data.get('selected_items', [])
    cart = Cart.objects.get(user=request.user)
    
    # Фильтруем элементы корзины по selected_items
    if selected_items:
        cart_items = cart.items.filter(id__in=selected_items)
    else:
        cart_items = cart.items.all()
    
    # Разделяем на товары и курсы
    product_items = [item for item in cart_items if item.product]
    course_items = [item for item in cart_items if item.course]
    
    orders_data = {
        'products_order': None,
        'courses_order': None
    }
    
    # Создаём заказ товаров (если есть)
    if product_items:
        orders_data['products_order'] = self._create_products_order(
            product_items, 
            request.data
        )
    
    # Создаём записи курсов (если есть)
    if course_items:
        orders_data['courses_order'] = self._create_courses_order(
            course_items,
            request.data.get('courses_disclaimer_accepted', False)
        )
    
    # Создаём единый платёж
    total_amount = (
        (orders_data['products_order']['total_amount'] if orders_data['products_order'] else 0) +
        (orders_data['courses_order']['total_amount'] if orders_data['courses_order'] else 0)
    )
    
    payment = self._create_unified_payment(total_amount, orders_data)
    
    return Response({
        'orders': orders_data,
        'payment': payment.to_dict()
    })
```

### 3. Обновление сериализатора

```python
class UnifiedOrderSerializer(serializers.Serializer):
    selected_items = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        help_text="Список ID элементов корзины для оформления. Если не указан - все элементы."
    )
    delivery_type = serializers.ChoiceField(
        choices=['standard', 'express', 'pickup'],
        required=False,
        allow_blank=True
    )
    address_id = serializers.UUIDField(required=False, allow_null=True)
    shipping_address = serializers.CharField(required=False, allow_blank=True)
    courses_disclaimer_accepted = serializers.BooleanField(required=False, default=False)
    
    def validate(self, data):
        selected_items = data.get('selected_items', [])
        delivery_type = data.get('delivery_type')
        address_id = data.get('address_id')
        shipping_address = data.get('shipping_address')
        
        # Проверка: если есть товары, нужна доставка
        # (проверка выполняется в view после фильтрации cart_items)
        
        return data
```

---

## Изменения во фронтенде

### 1. Обновление компонента Cart.jsx

**Добавить состояние выбранных элементов:**
```javascript
const [selectedItems, setSelectedItems] = useState(new Set())
const [selectAll, setSelectAll] = useState(true)

// При загрузке корзины - выбрать все по умолчанию
useEffect(() => {
  if (items.length > 0) {
    const allIds = items.map(item => item.id)
    setSelectedItems(new Set(allIds))
    setSelectAll(true)
  }
}, [items])

// Обработчик выбора отдельного элемента
const handleItemSelect = (itemId, checked) => {
  const newSelected = new Set(selectedItems)
  if (checked) {
    newSelected.add(itemId)
  } else {
    newSelected.delete(itemId)
  }
  setSelectedItems(newSelected)
  setSelectAll(newSelected.size === items.length)
}

// Обработчик "Выбрать все"
const handleSelectAll = (checked) => {
  if (checked) {
    const allIds = items.map(item => item.id)
    setSelectedItems(new Set(allIds))
  } else {
    setSelectedItems(new Set())
  }
  setSelectAll(checked)
}

// Удаление выбранных элементов
const handleDeleteSelected = async () => {
  for (const itemId of selectedItems) {
    const item = items.find(i => i.id === itemId)
    if (item) {
      const isCourse = isCourseItem(item)
      if (isCourse) {
        await removeCourseFromCart(item.course.id)
      } else {
        await removeItem(item.product.id)
      }
    }
  }
  setSelectedItems(new Set())
  setSelectAll(false)
}
```

**Обновить UI с чекбоксами:**
```jsx
{/* Верхняя панель управления */}
<div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={selectAll}
      onChange={(e) => handleSelectAll(e.target.checked)}
      className="w-5 h-5"
    />
    <span className="font-medium">Выбрать все</span>
  </label>
  
  <div className="flex gap-2">
    <button
      onClick={handleDeleteSelected}
      disabled={selectedItems.size === 0}
      className="btn-secondary text-sm"
    >
      Удалить выбранное ({selectedItems.size})
    </button>
  </div>
</div>

{/* Чекбокс у каждого товара */}
<div className="flex gap-4">
  <label className="flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={selectedItems.has(item.id)}
      onChange={(e) => handleItemSelect(item.id, e.target.checked)}
      className="w-5 h-5"
    />
  </label>
  
  {/* Остальной контент товара */}
  ...
</div>
```

**Обновить кнопку оформления:**
```jsx
{/* Итог и оформление заказа */}
<div className="lg:col-span-1">
  <div className="card sticky top-24">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">
      Оформление заказа
    </h2>
    
    {/* Итог только выбранных товаров */}
    <div className="space-y-2 pb-4 border-b border-gray-100">
      <div className="flex justify-between text-gray-600">
        <span>Выбрано позиций:</span>
        <span>{selectedItems.size} шт.</span>
      </div>
      
      {/* Расчёт суммы только выбранных */}
      <div className="flex justify-between text-lg font-semibold text-gray-900">
        <span>Итого:</span>
        <span>{formatPrice(calculateSelectedTotal())}</span>
      </div>
    </div>
    
    {/* Кнопка оформления */}
    <div className="pt-4">
      <Link
        to="/checkout"
        state={{ selectedItems: Array.from(selectedItems) }}
        className={`block w-full btn-primary py-3 text-center ${
          selectedItems.size === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
      >
        Оформить заказ ({selectedItems.size})
      </Link>
    </div>
  </div>
</div>

{/* Функция расчёта суммы выбранных */}
const calculateSelectedTotal = () => {
  return items
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => {
      const price = isCourseItem(item) 
        ? (item.course?.price || 0)
        : (item.product?.price || 0) * (item.quantity || 1)
      return sum + price
    }, 0)
}
```

### 2. Обновление компонента UnifiedCheckout.jsx

**Получение выбранных элементов из state:**
```javascript
function UnifiedCheckout() {
  const location = useLocation()
  const selectedItemsFromCart = location.state?.selectedItems || []
  
  // Загрузка checkout с выбранными элементами
  const loadCheckout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Если есть выбранные элементы - передаём их в запрос
      const params = selectedItemsFromCart.length > 0
        ? `?selected_items=${selectedItemsFromCart.join(',')}`
        : ''
      
      const response = await getUnifiedCheckout(params)
      setCheckoutData(response)
      // ... остальная логика
    } catch (err) {
      // ... обработка ошибок
    }
  }, [selectedItemsFromCart])
}
```

**Обновление API функции:**
```javascript
// frontend/src/api/shop.js

export const getUnifiedCheckout = async (selectedItems = []) => {
  const params = selectedItems.length > 0
    ? `?selected_items=${selectedItems.join(',')}`
    : ''
  return await api.get(`/checkout/${params}`)
}

export const submitUnifiedCheckout = async (checkoutData) => {
  return await api.post('/checkout/', checkoutData)
}
```

**Обновление отправки заказа:**
```javascript
const handleSubmit = async () => {
  // ... валидация
  
  const submitData = {}
  
  // Добавляем выбранные элементы, если они были переданы
  if (selectedItemsFromCart.length > 0) {
    submitData.selected_items = selectedItemsFromCart
  }
  
  // ... остальные данные
  
  const response = await submitUnifiedCheckout(submitData)
  // ... обработка ответа
}
```

### 3. Обновление store/cartStore.js

**Добавить метод для работы с выбранными элементами:**
```javascript
export const useCartStore = create((set, get) => ({
  // ... существующие поля
  
  selectedItems: new Set(),
  
  setSelectedItems: (items) => {
    set({ selectedItems: new Set(items) })
  },
  
  toggleItemSelection: (itemId) => {
    const { selectedItems } = get()
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    set({ selectedItems: newSelected })
  },
  
  selectAllItems: () => {
    const { items } = get()
    set({ selectedItems: new Set(items.map(item => item.id)) })
  },
  
  deselectAllItems: () => {
    set({ selectedItems: new Set() })
  }
}))
```

---

## Примеры использования

### Пример 1: Оформление только товаров

```javascript
// Пользователь выбрал товары с ID: uuid1, uuid2
// Переход на /checkout с state
navigate('/checkout', {
  state: { selectedItems: ['uuid1', 'uuid2'] }
})

// GET /api/checkout/?selected_items=uuid1,uuid2
// Возвращает только эти два товара

// POST /api/checkout/
{
  "selected_items": ["uuid1", "uuid2"],
  "delivery_type": "standard",
  "address_id": "address-uuid"
}

// Ответ:
{
  "orders": {
    "products_order": { "id": 1, "total_amount": 3000 },
    "courses_order": null
  },
  "payment": { "id": "payment-uuid", "amount": 3500 }
}
```

### Пример 2: Оформление только курсов

```javascript
// Пользователь выбрал курсы с ID: uuid3, uuid4
navigate('/checkout', {
  state: { selectedItems: ['uuid3', 'uuid4'] }
})

// GET /api/checkout/?selected_items=uuid3,uuid4
// Возвращает только эти два курса

// POST /api/checkout/
{
  "selected_items": ["uuid3", "uuid4"],
  "courses_disclaimer_accepted": true
}

// Ответ:
{
  "orders": {
    "products_order": null,
    "courses_order": {
      "courses": [
        { "id": 1, "title": "Курс 1" },
        { "id": 2, "title": "Курс 2" }
      ],
      "total_amount": 10000
    }
  },
  "payment": { "id": "payment-uuid", "amount": 10000 }
}
```

### Пример 3: Оформление товаров и курсов одновременно

```javascript
// Пользователь выбрал товары uuid1, uuid2 и курсы uuid3, uuid4
navigate('/checkout', {
  state: { selectedItems: ['uuid1', 'uuid2', 'uuid3', 'uuid4'] }
})

// GET /api/checkout/?selected_items=uuid1,uuid2,uuid3,uuid4
// Возвращает товары и курсы

// POST /api/checkout/
{
  "selected_items": ["uuid1", "uuid2", "uuid3", "uuid4"],
  "delivery_type": "standard",
  "address_id": "address-uuid",
  "courses_disclaimer_accepted": true
}

// Ответ:
{
  "orders": {
    "products_order": { "id": 1, "total_amount": 3000 },
    "courses_order": {
      "courses": [
        { "id": 1, "title": "Курс 1" },
        { "id": 2, "title": "Курс 2" }
      ],
      "total_amount": 10000
    }
  },
  "payment": { "id": "payment-uuid", "amount": 13500 }
}

// Создаются два отдельных заказа:
// 1. Order (id=1) для товаров - можно вернуть товары отдельно
// 2. UserCourse записи для курсов - можно вернуть курсы отдельно
```

---

## Тестирование

### Тест-кейсы

1. **Выбор всех товаров**
   - Добавить 3 товара в корзину
   - Нажать "Выбрать все"
   - Проверить, что все чекбоксы отмечены
   - Оформить заказ
   - Проверить, что все товары в заказе

2. **Выбор части товаров**
   - Добавить 3 товара в корзину
   - Снять чекбокс у одного товара
   - Оформить заказ
   - Проверить, что в заказе только 2 товара

3. **Выбор товаров и курсов**
   - Добавить 2 товара и 2 курса
   - Выбрать 1 товар и 1 курс
   - Оформить заказ
   - Проверить, что созданы два отдельных заказа

4. **Оформление без выбора**
   - Добавить товары в корзину
   - Не выбирать ничего
   - Проверить, что кнопка "Оформить заказ" неактивна

5. **Удаление выбранных**
   - Выбрать несколько товаров
   - Нажать "Удалить выбранное"
   - Проверить, что выбранные товары удалены

---

## Заключение

Данная реализация позволяет:
- ✅ Выборочно оформлять товары и курсы из корзины
- ✅ Создавать раздельные заказы для товаров и курсов
- ✅ Возвращать товары и курсы независимо
- ✅ Сохранять обратную совместимость (если не указаны selected_items - все товары)

Все изменения реализованы с учётом существующей архитектуры и не нарушают работу текущего функционала.

