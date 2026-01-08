"""
Нагрузочное тестирование для платформы "Питомец+"

Использование:
    locust -f load_tests/locustfile.py --host=http://localhost:8077

С веб-интерфейсом:
    locust -f load_tests/locustfile.py
    # Откроется на http://localhost:8089

Без веб-интерфейса:
    locust -f load_tests/locustfile.py --host=http://localhost:8077 \
        --users=100 --spawn-rate=10 --run-time=5m --headless \
        --html=results/report.html
"""

from locust import HttpUser, task, between, events
import random


class PetCareUser(HttpUser):
    """
    Базовый пользователь платформы "Питомец+"
    
    Симулирует поведение обычного пользователя:
    - Просмотр каталога товаров
    - Просмотр каталога курсов
    - Просмотр корзины
    """
    wait_time = between(1, 3)  # Пауза между запросами 1-3 секунды
    
    def on_start(self):
        """Авторизация перед началом тестов"""
        # В реальном сценарии здесь должна быть авторизация
        # Для тестирования можно использовать тестового пользователя
        try:
            response = self.client.post("/api/auth/login/", json={
                "email": "test@example.com",
                "password": "test123"
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                if self.token:
                    self.client.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
        except Exception as e:
            print(f"Ошибка авторизации: {e}")
    
    @task(10)
    def view_products(self):
        """Просмотр каталога товаров (высокая частота)"""
        # Базовый запрос
        self.client.get("/api/shop/products/")
        
        # С фильтрами
        filters = [
            "?animal=dog",
            "?animal=cat",
            "?animal=dog&category=food",
            "?animal=cat&category=toys",
            "?search=корм",
            "?page=2"
        ]
        filter_param = random.choice(filters)
        self.client.get(f"/api/shop/products/{filter_param}")
    
    @task(5)
    def view_product_detail(self):
        """Просмотр деталей товара"""
        # В реальном сценарии ID товара должен браться из списка
        product_id = random.randint(1, 100)
        self.client.get(f"/api/shop/products/{product_id}/")
    
    @task(3)
    def view_courses(self):
        """Просмотр каталога курсов"""
        self.client.get("/api/courses/")
        
        # С фильтрами
        filters = [
            "?pet_type=dog",
            "?pet_type=cat",
            "?category=training",
            "?page=2"
        ]
        filter_param = random.choice(filters)
        self.client.get(f"/api/courses/{filter_param}")
    
    @task(2)
    def view_cart(self):
        """Просмотр корзины (требует авторизации)"""
        if hasattr(self, 'token'):
            self.client.get("/api/shop/cart/")
    
    @task(1)
    def view_pets(self):
        """Просмотр списка питомцев (требует авторизации)"""
        if hasattr(self, 'token'):
            self.client.get("/api/pets/")


class BuyerUser(HttpUser):
    """
    Пользователь, который активно покупает товары
    
    Симулирует поведение покупателя:
    - Просмотр товаров
    - Добавление в корзину
    - Оформление заказа
    """
    wait_time = between(2, 5)
    weight = 2  # Вес класса (встречается реже чем PetCareUser)
    
    def on_start(self):
        """Авторизация"""
        try:
            response = self.client.post("/api/auth/login/", json={
                "email": "buyer@example.com",
                "password": "test123"
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                if self.token:
                    self.client.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
        except Exception as e:
            print(f"Ошибка авторизации: {e}")
    
    @task(5)
    def browse_products(self):
        """Просмотр каталога товаров"""
        self.client.get("/api/shop/products/?animal=dog")
    
    @task(3)
    def view_product_detail(self):
        """Просмотр деталей товара"""
        product_id = random.randint(1, 100)
        self.client.get(f"/api/shop/products/{product_id}/")
    
    @task(2)
    def add_to_cart(self):
        """Добавление товара в корзину"""
        if hasattr(self, 'token'):
            self.client.post("/api/shop/cart/", json={
                "product_id": random.randint(1, 100),
                "quantity": random.randint(1, 3)
            })
    
    @task(1)
    def view_cart(self):
        """Просмотр корзины"""
        if hasattr(self, 'token'):
            self.client.get("/api/shop/cart/")


class AdminUser(HttpUser):
    """
    Администратор платформы
    
    Симулирует поведение администратора:
    - Просмотр статистики
    - Просмотр заказов
    - Просмотр пользователей
    """
    wait_time = between(3, 6)
    weight = 1  # Вес класса (встречается реже всего)
    
    def on_start(self):
        """Авторизация как администратор"""
        try:
            response = self.client.post("/api/auth/login/", json={
                "email": "admin@example.com",
                "password": "admin123"
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                if self.token:
                    self.client.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
        except Exception as e:
            print(f"Ошибка авторизации: {e}")
    
    @task(3)
    def view_stats(self):
        """Просмотр статистики"""
        if hasattr(self, 'token'):
            self.client.get("/api/admin/stats/")
    
    @task(2)
    def view_orders(self):
        """Просмотр заказов"""
        if hasattr(self, 'token'):
            self.client.get("/api/admin/orders/")
    
    @task(2)
    def view_products_admin(self):
        """Просмотр товаров в админке"""
        if hasattr(self, 'token'):
            self.client.get("/api/admin/products/")
    
    @task(1)
    def view_users(self):
        """Просмотр пользователей"""
        if hasattr(self, 'token'):
            self.client.get("/api/admin/users/")


class RemindersUser(HttpUser):
    """
    Пользователь, работающий с напоминаниями
    
    Симулирует поведение пользователя, управляющего напоминаниями:
    - Просмотр напоминаний
    - Просмотр предстоящих напоминаний
    """
    wait_time = between(2, 4)
    weight = 1
    
    def on_start(self):
        """Авторизация"""
        try:
            response = self.client.post("/api/auth/login/", json={
                "email": "user@example.com",
                "password": "test123"
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                if self.token:
                    self.client.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
        except Exception as e:
            print(f"Ошибка авторизации: {e}")
    
    @task(5)
    def view_reminders(self):
        """Просмотр списка напоминаний"""
        if hasattr(self, 'token'):
            self.client.get("/api/pets/reminders/")
    
    @task(3)
    def view_upcoming_reminders(self):
        """Просмотр предстоящих напоминаний"""
        if hasattr(self, 'token'):
            self.client.get("/api/pets/reminders/upcoming/")


# Обработчики событий для логирования
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Вызывается при начале теста"""
    print("Начало нагрузочного тестирования")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Вызывается при завершении теста"""
    print("Завершение нагрузочного тестирования")


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Вызывается при каждом запросе"""
    if exception:
        print(f"Ошибка запроса: {name} - {exception}")

