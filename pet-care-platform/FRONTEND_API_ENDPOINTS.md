# Эндпоинты API, используемые на фронтенде

## Аутентификация (Auth)

### POST /api/auth/registration/
**Где используется:** `pages/Auth/Register.jsx`, `store/authStore.js`

**Запрос:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123"
}
```

**Ответ:**
```json
{
  "message": "Регистрация успешна. Код активации отправлен на email.",
  "email": "user@example.com"
}
```

---

### POST /api/auth/login/
**Где используется:** `pages/Auth/Login.jsx`, `store/authStore.js`

**Запрос:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": null,
    "last_name": null,
    "phone": null,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /api/auth/logout/
**Где используется:** `store/authStore.js`

**Запрос:**
```json
{}
```

**Ответ:**
```json
{
  "message": "Выход выполнен успешно"
}
```

---

### GET /api/auth/refresh/
**Где используется:** `api/client.js` (интерцептор при 401 ошибках)

**Запрос:** Без тела (refresh token из cookie)

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /api/auth/activate-by-code/
**Где используется:** `pages/Auth/Register.jsx`, `store/authStore.js`

**Запрос:**
```json
{
  "activation_code": "123456"
}
```

**Ответ:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /api/auth/exchange-auth-code/
**Где используется:** `pages/Auth/Activate.jsx`

**Запрос:**
```json
{
  "auth_code": "abc123def456"
}
```

**Ответ:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Профиль пользователя

### GET /api/users/profile/
**Где используется:** `pages/Dashboard/Profile.jsx`, `store/authStore.js`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "Иван",
    "last_name": "Иванов",
    "phone": "+79001234567",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "pets": [
    {
      "id": "uuid",
      "name": "Барсик",
      "species": "cat",
      "breed": "Персидская"
    }
  ],
  "orders": [
    {
      "id": 1,
      "total_amount": 5000,
      "status": "delivered",
      "created_at": "2024-01-15T00:00:00Z",
      "items": []
    }
  ],
  "courses": []
}
```

---

## Питомцы (Pets)

### GET /api/pets/
**Где используется:** `hooks/usePets.js`, `pages/PetProfile/PetList.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "pets": [
    {
      "id": "uuid",
      "name": "Барсик",
      "species": "cat",
      "breed": "Персидская",
      "date_of_birth": "2020-01-15",
      "weight": 5.2,
      "gender": "male",
      "is_neutered": true,
      "favorite_foods": ["рыба", "мясо"],
      "allergies": [],
      "photo": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/pets/{id}/
**Где используется:** `pages/PetProfile/PetProfile.jsx`, `pages/PetProfile/PetForm.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "pet": {
    "id": "uuid",
    "name": "Барсик",
    "species": "cat",
    "breed": "Персидская",
    "date_of_birth": "2020-01-15",
    "weight": 5.2,
    "gender": "male",
    "is_neutered": true,
    "favorite_foods": ["рыба", "мясо"],
    "allergies": [],
    "photo": "/media/pets/photo.jpg",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### POST /api/pets/
**Где используется:** `pages/PetProfile/PetForm.jsx`

**Запрос:**
```json
{
  "name": "Барсик",
  "species": "cat",
  "breed": "Персидская",
  "date_of_birth": "2020-01-15",
  "weight": 5.2,
  "gender": "male",
  "is_neutered": true,
  "favorite_foods": ["рыба", "мясо"],
  "allergies": []
}
```

**Ответ:**
```json
{
  "message": "Питомец успешно добавлен",
  "pet": {
    "id": "uuid",
    "name": "Барсик",
    "species": "cat",
    "breed": "Персидская",
    "date_of_birth": "2020-01-15",
    "weight": 5.2,
    "gender": "male",
    "is_neutered": true,
    "favorite_foods": ["рыба", "мясо"],
    "allergies": [],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### PUT /api/pets/{id}/
**Где используется:** `pages/PetProfile/PetForm.jsx`

**Запрос:**
```json
{
  "name": "Барсик",
  "weight": 5.5
}
```

**Ответ:**
```json
{
  "message": "Данные питомца обновлены",
  "pet": {
    "id": "uuid",
    "name": "Барсик",
    "species": "cat",
    "breed": "Персидская",
    "weight": 5.5,
    "updated_at": "2024-01-02T00:00:00Z"
  }
}
```

---

### DELETE /api/pets/{id}/
**Где используется:** `pages/PetProfile/PetProfile.jsx`, `pages/PetProfile/PetList.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "message": "Питомец удалён"
}
```

---

## Магазин (Shop)

### GET /api/shop/products/
**Где используется:** `pages/Shop/Shop.jsx`

**Запрос:** Query параметры: `?animal=dog&category=food&min_price=100&max_price=1000&search=корм&page=1&per_page=20`

**Ответ:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Корм для собак",
      "description": "Описание",
      "price": 1500,
      "discount_percent": 10,
      "final_price": 1350,
      "animal": "dog",
      "category": "food",
      "subcategory": "dry_food",
      "vendor": "Royal Canin",
      "stock_count": 100,
      "in_stock": true,
      "main_image": "/media/products/image.jpg",
      "url": "https://example.com/product"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  },
  "filters": {
    "animals": [
      {"value": "dog", "label": "Для собак"},
      {"value": "cat", "label": "Для кошек"}
    ],
    "categories": [],
    "subcategories": [],
    "vendors": [],
    "price_range": {
      "min_price": 100,
      "max_price": 5000
    }
  }
}
```

---

### GET /api/shop/products/{id}/
**Где используется:** `pages/Shop/ProductDetail.jsx`

**Запрос:** Без тела

**Ответ:**
```json
{
  "product": {
    "id": 1,
    "name": "Корм для собак",
    "description": "Описание",
    "price": 1500,
    "discount_percent": 10,
    "final_price": 1350,
    "animal": "dog",
    "category": "food",
    "subcategory": "dry_food",
    "vendor": "Royal Canin",
    "stock_count": 100,
    "in_stock": true,
    "main_image": "/media/products/image.jpg",
    "url": "https://example.com/product"
  }
}
```

---

### GET /api/shop/cart/
**Где используется:** `store/cartStore.js`, `pages/Shop/Cart.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "products": [
    {
      "id": "uuid",
      "product": {
        "id": 1,
        "name": "Корм для собак",
        "price": 1500,
        "final_price": 1350
      },
      "quantity": 2,
      "total": 2700
    }
  ],
  "courses": [],
  "totals": {
    "products": 2700,
    "courses": 0,
    "total": 2700
  },
  "items_count": 2
}
```

---

### GET /api/shop/cart/refresh/
**Где используется:** `store/cartStore.js`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:** Аналогично GET /api/shop/cart/

---

### POST /api/shop/cart/
**Где используется:** `store/cartStore.js`, `pages/Shop/ProductDetail.jsx`

**Добавление товара - Запрос:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

**Добавление курса - Запрос:**
```json
{
  "course_id": 5,
  "pet_id": "uuid",
  "disclaimer_accepted": true
}
```

**Ответ:**
```json
{
  "cart": [
    {
      "id": "uuid",
      "product": {
        "id": 1,
        "name": "Корм для собак",
        "price": 1500
      },
      "quantity": 2,
      "total": 3000
    }
  ],
  "total": 3000,
  "items_count": 2,
  "message": "Товар добавлен в корзину"
}
```

---

### PUT /api/shop/cart/item/
**Где используется:** `store/cartStore.js`, `pages/Shop/Cart.jsx`

**Запрос:**
```json
{
  "product_id": 1,
  "quantity": 3
}
```

**Ответ:**
```json
{
  "cart": [
    {
      "id": "uuid",
      "product": {
        "id": 1,
        "name": "Корм для собак",
        "price": 1500
      },
      "quantity": 3,
      "total": 4500
    }
  ],
  "total": 4500
}
```

---

### DELETE /api/shop/cart/item/
**Где используется:** `store/cartStore.js`, `pages/Shop/Cart.jsx`

**Запрос:**
```json
{
  "product_id": 1
}
```

**Или для курса:**
```json
{
  "course_id": 5
}
```

**Ответ:**
```json
{
  "cart": [],
  "total": 0,
  "message": "Элемент удалён из корзины"
}
```

---

### GET /api/shop/orders/history/
**Где используется:** `components/OrdersDropdown.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "orders": [
    {
      "id": 1,
      "total_amount": 5000,
      "status": "delivered",
      "created_at": "2024-01-15T00:00:00Z",
      "delivery_date": "2024-01-20",
      "delivery_cost": 500,
      "items": [
        {
          "product_name": "Корм для собак",
          "quantity": 2,
          "total": 3000
        }
      ],
      "shipping_address": "Москва, ул. Примерная, д. 1"
    }
  ],
  "count": 1
}
```

---

### GET /api/shop/addresses/
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "addresses": [
    {
      "id": "uuid",
      "address": "Москва, ул. Примерная, д. 1, кв. 10",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/shop/addresses/
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:**
```json
{
  "address": "Москва, ул. Примерная, д. 1, кв. 10"
}
```

**Ответ:**
```json
{
  "address": {
    "id": "uuid",
    "address": "Москва, ул. Примерная, д. 1, кв. 10",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### GET /api/shop/addresses/search/?query=Москва
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:** Query параметр `query`

**Ответ:**
```json
{
  "suggestions": [
    "Москва, ул. Примерная, д. 1",
    "Москва, ул. Примерная, д. 2"
  ]
}
```

---

## Курсы (Courses)

### GET /api/courses/
**Где используется:** `pages/Training/Courses.jsx`

**Запрос:** Query параметры: `?pet_type=dog&category=basics&level=beginner&page=1&per_page=12`

**Ответ:**
```json
{
  "courses": [
    {
      "id": 1,
      "title": "Основы ухода за собакой",
      "description": "Описание курса",
      "price": 5000,
      "pet_type": "dog",
      "category": "basics",
      "subcategory": "care",
      "level": "beginner",
      "format_type": "video",
      "duration_minutes": 120,
      "instructor": "Иван Иванов",
      "cover_image": "/media/courses/cover.jpg",
      "is_owned": false
    }
  ],
  "pagination": {
    "total": 30,
    "page": 1,
    "per_page": 12,
    "total_pages": 3
  },
  "filters": {
    "categories": [],
    "subcategories": [],
    "levels": [],
    "format_types": [],
    "price_range": {
      "min_price": 0,
      "max_price": 10000
    }
  }
}
```

---

### GET /api/courses/{id}/
**Где используется:** `pages/Training/CourseDetail.jsx`

**Запрос:** Без тела

**Ответ:**
```json
{
  "course": {
    "id": 1,
    "title": "Основы ухода за собакой",
    "description": "Подробное описание",
    "price": 5000,
    "pet_type": "dog",
    "category": "basics",
    "level": "beginner",
    "format_type": "video",
    "duration_minutes": 120,
    "instructor": "Иван Иванов",
    "cover_image": "/media/courses/cover.jpg",
    "what_you_will_learn": ["Уход за шерстью", "Правильное питание"],
    "is_owned": false
  }
}
```

---

### GET /api/courses/{id}/checkout/
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "course": {
    "id": 1,
    "title": "Основы ухода за собакой",
    "price": 5000,
    "description": "Описание"
  }
}
```

---

### GET /api/courses/my/
**Где используется:** `pages/Dashboard/Profile.jsx`, `pages/Training/Courses.jsx`

**Запрос:** Query параметр `?pet_id=uuid` (опционально)

**Ответ:**
```json
{
  "courses": [
    {
      "course": {
        "id": 1,
        "title": "Основы ухода за собакой",
        "price": 5000,
        "cover_image": "/media/courses/cover.jpg"
      },
      "pet": {
        "id": "uuid",
        "name": "Барсик"
      },
      "purchased_at": "2024-01-15T00:00:00Z",
      "progress": 45
    }
  ],
  "count": 1
}
```

---

### POST /api/courses/{id}/purchase/
**Где используется:** `pages/Training/CourseDetail.jsx`

**Запрос:**
```json
{
  "disclaimer_accepted": true,
  "pet_id": "uuid"
}
```

**Ответ:**
```json
{
  "message": "Курс успешно приобретён",
  "course": {
    "id": 1,
    "title": "Основы ухода за собакой"
  }
}
```

---

## Единый Checkout

### GET /api/checkout/
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "products": {
    "items": [
      {
        "id": "uuid",
        "product": {
          "id": 1,
          "name": "Корм для собак",
          "price": 1500
        },
        "quantity": 2,
        "total": 3000
      }
    ],
    "subtotal": 3000,
    "delivery_options": [
      {
        "type": "standard",
        "label": "Стандартная доставка",
        "cost": 500,
        "days": 3
      },
      {
        "type": "express",
        "label": "Экспресс доставка",
        "cost": 1000,
        "days": 1
      },
      {
        "type": "pickup",
        "label": "Самовывоз",
        "cost": 0,
        "days": 0
      }
    ]
  },
  "courses": {
    "items": [
      {
        "id": "uuid",
        "course": {
          "id": 1,
          "title": "Основы ухода",
          "price": 5000
        },
        "pet_id": "uuid"
      }
    ],
    "subtotal": 5000
  },
  "addresses": [
    {
      "id": "uuid",
      "address": "Москва, ул. Примерная, д. 1"
    }
  ],
  "totals": {
    "products": 3000,
    "courses": 5000,
    "delivery": 500,
    "grand_total": 8500
  },
  "reservation": {
    "id": "reservation-uuid",
    "expires_at": "2024-01-01T12:10:00Z"
  }
}
```

---

### POST /api/checkout/
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:**
```json
{
  "delivery_type": "standard",
  "address_id": "uuid",
  "shipping_address": "Москва, ул. Примерная, д. 1",
  "courses_disclaimer_accepted": true
}
```

**Ответ:**
```json
{
  "reservation_id": "reservation-uuid",
  "orders": {
    "products_order": {
      "id": 1,
      "total_amount": 3500,
      "status": "pending"
    },
    "courses": [
      {
        "id": 1,
        "title": "Основы ухода",
        "purchased_at": "2024-01-01T12:00:00Z"
      }
    ]
  },
  "payment": {
    "id": "payment-uuid",
    "amount": 8500,
    "url": "/payment/payment-uuid"
  }
}
```

---

### DELETE /api/checkout/reservation/{id}/
**Где используется:** `pages/Checkout/UnifiedCheckout.jsx`

**Запрос:** Без тела (JWT токен в заголовке)

**Ответ:**
```json
{
  "message": "Резервирование отменено"
}
```

---

## Платежи (Payments)

### POST /api/payments/page/
**Где используется:** `pages/Payment/Payment.jsx`

**Запрос:**
```json
{
  "payment_type": "shop_order",
  "object_id": "1",
  "card_number": "4111111111111111",
  "cardholder_name": "IVAN IVANOV",
  "expiry_month": "12",
  "expiry_year": "2025",
  "cvv": "123"
}
```

**Ответ:**
```json
{
  "message": "Платеж успешно обработан",
  "payment": {
    "id": "payment-uuid",
    "amount": 8500,
    "status": "completed",
    "payment_type": "shop_order",
    "object_id": "1",
    "created_at": "2024-01-01T12:00:00Z"
  },
  "success": true
}
```

---

