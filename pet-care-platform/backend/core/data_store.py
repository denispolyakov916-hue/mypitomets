"""
In-Memory хранилище данных для MVP Питомец+

Этот модуль предоставляет централизованное решение для хранения данных в памяти.
Вместо реальной базы данных все данные хранятся в структурах Python.

Паттерн проектирования: Singleton-подобный модульный паттерн
    Python модули по своей природе являются синглтонами - импортируются один раз и разделяются.
    Это делает модуль идеальным для хранения глобального состояния при разработке MVP.

Архитектура:
    - DataStore класс: Основной контейнер хранения с CRUD операциями
    - Генераторы тестовых данных: Создают начальные данные для товаров и курсов
    - Потокобезопасные операции: Используют блокировки для безопасного конкурентного доступа

Безопасность:
    - Пароли хэшируются с использованием Argon2id (рекомендация OWASP)
    - Идентификаторы генерируются с использованием UUIDv7 (сортируемые по времени)

Ограничения:
    - Данные теряются при перезапуске сервера (намеренно для MVP)
    - Не подходит для продакшена (используйте PostgreSQL)
    - Ограниченные возможности запросов по сравнению с реальным ORM

Пример использования:
    from core.data_store import data_store
    
    # Создание нового пользователя
    user = data_store.create_user(email='test@example.com', password='secure_pass')
    
    # Получение всех питомцев пользователя
    pets = data_store.get_user_pets(user_id=user.id)
"""

import logging
import threading
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

# Argon2id для безопасного хэширования паролей
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash

# UUIDv7 для генерации уникальных идентификаторов
import uuid7

# Настройка логгера для этого модуля
logger = logging.getLogger('apps.data_store')

# Инициализация Argon2id hasher с параметрами по умолчанию
# Параметры: time_cost=3, memory_cost=65536, parallelism=4
password_hasher = PasswordHasher(
    time_cost=3,        # Количество итераций
    memory_cost=65536,  # Память в КБ (64 МБ)
    parallelism=4,      # Количество потоков
    hash_len=32,        # Длина хэша в байтах
    salt_len=16         # Длина соли в байтах
)


# =============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ UUIDv7
# =============================================================================

def generate_uuid7() -> str:
    """
    Генерация нового UUIDv7 идентификатора.
    
    UUIDv7 - это сортируемый по времени UUID, который включает:
    - 48-битную временную метку Unix (миллисекунды)
    - 4-битную версию (7)
    - 12 бит случайных данных
    - 2 бита варианта
    - 62 бита случайных данных
    
    Преимущества UUIDv7:
    - Сортируемость по времени создания
    - Глобальная уникальность без центральной координации
    - Совместимость с индексами базы данных
    - Не раскрывает информацию о системе (в отличие от UUIDv1)
    
    Возвращает:
        str: UUIDv7 в строковом формате (36 символов)
    
    Пример:
        >>> id = generate_uuid7()
        >>> print(id)  # '018d3e5f-8c7b-7abc-9def-1234567890ab'
    """
    return str(uuid7.uuid7())


# =============================================================================
# КЛАССЫ ДАННЫХ (СУЩНОСТИ)
# =============================================================================

@dataclass
class User:
    """
    Сущность пользователя - представляет зарегистрированного пользователя платформы.
    
    Атрибуты:
        id: Уникальный идентификатор UUIDv7
        email: Email пользователя (используется как логин)
        password_hash: Хеш пароля Argon2id (никогда не храним в открытом виде!)
        created_at: Временная метка регистрации
        
    Заметка по безопасности:
        Пароль хранится как Argon2id хеш - рекомендуемый алгоритм OWASP.
        Argon2id устойчив к атакам по времени и использованию GPU/ASIC.
    """
    id: str  # UUIDv7
    email: str
    password_hash: str
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Конвертация в словарь, исключая конфиденциальные данные."""
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class Pet:
    """
    Сущность питомца - ядро системы PetID.
    
    Хранит всю базовую информацию о питомце, которая используется
    во всех модулях платформы (рекомендации магазина, события календаря и т.д.)
    
    Атрибуты:
        id: Уникальный идентификатор UUIDv7
        owner_id: Ссылка на User - владельца питомца (UUIDv7)
        name: Кличка питомца
        species: Вид животного (собака, кошка, птица и т.д.)
        breed: Порода (опционально)
        date_of_birth: Дата рождения для расчёта возраста и календаря
        weight: Вес в кг для рекомендаций по питанию
        created_at: Когда был создан профиль питомца
        updated_at: Временная метка последнего изменения
    """
    id: str  # UUIDv7
    owner_id: str  # UUIDv7
    name: str
    species: str
    breed: Optional[str] = None
    date_of_birth: Optional[str] = None  # Строка в ISO формате
    weight: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Конвертация питомца в словарь для API ответа."""
        return {
            'id': self.id,
            'owner_id': self.owner_id,
            'name': self.name,
            'species': self.species,
            'breed': self.breed,
            'date_of_birth': self.date_of_birth,
            'weight': self.weight,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class Product:
    """
    Сущность товара для магазина кормов.
    
    Представляет товары, доступные для покупки в магазине.
    Товары можно фильтровать по виду животного и типу продукта.
    
    Атрибуты:
        id: Уникальный идентификатор товара (int для совместимости с каталогом)
        name: Название товара, отображаемое пользователям
        description: Краткое описание товара
        price: Цена в рублях
        image_url: URL изображения товара (заглушка для MVP)
        pet_type: Целевой вид животного (dog, cat, all)
        product_type: Категория (dry_food, wet_food, treats)
        in_stock: Флаг наличия
    """
    id: int
    name: str
    description: str
    price: float
    image_url: str
    pet_type: str  # 'dog', 'cat', 'all'
    product_type: str  # 'dry_food', 'wet_food', 'treats'
    in_stock: bool = True
    
    def to_dict(self) -> Dict:
        """Конвертация товара в словарь для API ответа."""
        return asdict(self)


@dataclass
class CartItem:
    """
    Элемент корзины, связывающий товар с корзиной пользователя.
    
    Атрибуты:
        product_id: Ссылка на Product
        quantity: Количество товара
    """
    product_id: int
    quantity: int
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Order:
    """
    Сущность заказа - представляет завершённую покупку.
    
    Атрибуты:
        id: Уникальный идентификатор заказа UUIDv7
        user_id: Ссылка на User, оформившего заказ (UUIDv7)
        items: Список купленных товаров с количеством
        total_amount: Общая стоимость заказа
        shipping_address: Адрес доставки
        status: Статус заказа (pending, processing, shipped, delivered)
        created_at: Когда был оформлен заказ
    """
    id: str  # UUIDv7
    user_id: str  # UUIDv7
    items: List[Dict]  # [{product_id, quantity, price}]
    total_amount: float
    shipping_address: str
    status: str = 'pending'
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Конвертация заказа в словарь для API ответа."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'items': self.items,
            'total_amount': self.total_amount,
            'shipping_address': self.shipping_address,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class Course:
    """
    Сущность образовательного курса.
    
    Представляет курс обучения/образования, доступный на платформе.
    Курсы могут быть бесплатными или платными.
    
    Атрибуты:
        id: Уникальный идентификатор курса (int для совместимости с каталогом)
        title: Название курса
        description: Описание курса
        duration: Длительность в минутах
        price: Цена в рублях (0 для бесплатных курсов)
        image_url: URL обложки курса
        pet_type: Целевой вид животного (dog, cat, all)
        is_free: Удобный флаг для бесплатных курсов
    """
    id: int
    title: str
    description: str
    duration: int  # в минутах
    price: float
    image_url: str
    pet_type: str  # 'dog', 'cat', 'all'
    
    @property
    def is_free(self) -> bool:
        """Проверка, является ли курс бесплатным."""
        return self.price == 0
    
    def to_dict(self) -> Dict:
        """Конвертация курса в словарь для API ответа."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'duration': self.duration,
            'price': self.price,
            'image_url': self.image_url,
            'pet_type': self.pet_type,
            'is_free': self.is_free
        }


@dataclass
class UserCourse:
    """
    Представляет курс, приобретённый/начатый пользователем.
    
    Атрибуты:
        user_id: Ссылка на User (UUIDv7)
        course_id: Ссылка на Course
        purchased_at: Когда курс был приобретён
        progress: Процент завершения (0-100)
    """
    user_id: str  # UUIDv7
    course_id: int
    purchased_at: datetime = field(default_factory=datetime.now)
    progress: int = 0
    
    def to_dict(self) -> Dict:
        return {
            'user_id': self.user_id,
            'course_id': self.course_id,
            'purchased_at': self.purchased_at.isoformat(),
            'progress': self.progress
        }


# =============================================================================
# КЛАСС ХРАНИЛИЩА ДАННЫХ
# =============================================================================

class DataStore:
    """
    Централизованное in-memory хранилище данных для MVP.
    
    Этот класс управляет всеми данными приложения в памяти с использованием
    структур данных Python. Предоставляет CRUD операции для всех сущностей
    и обеспечивает изоляцию данных между пользователями.
    
    Безопасность:
        - Пароли хэшируются с использованием Argon2id
        - Идентификаторы генерируются с использованием UUIDv7
    
    Потокобезопасность:
        Все операции записи защищены threading.Lock() для предотвращения
        состояния гонки при конкурентной обработке запросов.
    
    Паттерн проектирования:
        Паттерн Repository - инкапсулирует логику доступа к данным и
        предоставляет чистый интерфейс для остальной части приложения.
    
    Использование:
        # Импортируем экземпляр-синглтон
        from core.data_store import data_store
        
        # Используем методы для работы с данными
        user = data_store.create_user('email@example.com', 'password')
        pets = data_store.get_user_pets(user.id)
    
    Атрибуты:
        _lock: Блокировка потоков для операций записи
        _users: Словарь объектов User, индексированный по UUIDv7
        _pets: Словарь объектов Pet, индексированный по UUIDv7
        _products: Словарь объектов Product, индексированный по int ID
        _carts: Словарь, связывающий user_id (UUIDv7) со списком CartItems
        _orders: Словарь объектов Order, индексированный по UUIDv7
        _courses: Словарь объектов Course, индексированный по int ID
        _user_courses: Список объектов UserCourse
        _id_counters: Счётчики автоинкремента для товаров и курсов
    """
    
    def __init__(self):
        """
        Инициализация хранилища данных с пустыми коллекциями и загрузка тестовых данных.
        
        Конструктор:
        1. Создаёт блокировку потоков для безопасного конкурентного доступа
        2. Инициализирует пустые словари для каждого типа сущности
        3. Настраивает счётчики ID для товаров и курсов (для совместимости)
        4. Загружает начальные тестовые данные для товаров и курсов
        """
        # Блокировка потоков для операций записи
        self._lock = threading.Lock()
        
        # Коллекции данных
        self._users: Dict[str, User] = {}  # UUIDv7 -> User
        self._pets: Dict[str, Pet] = {}  # UUIDv7 -> Pet
        self._products: Dict[int, Product] = {}
        self._carts: Dict[str, List[CartItem]] = {}  # UUIDv7 -> элементы корзины
        self._orders: Dict[str, Order] = {}  # UUIDv7 -> Order
        self._courses: Dict[int, Course] = {}
        self._user_courses: List[UserCourse] = []
        
        # Счётчики автоинкремента ID (только для товаров и курсов)
        self._id_counters = {
            'product': 1,
            'course': 1,
        }
        
        # Загрузка начальных тестовых данных
        self._init_stub_data()
        
        logger.info("DataStore инициализирован с Argon2id и UUIDv7")
    
    # =========================================================================
    # ПРИВАТНЫЕ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    # =========================================================================
    
    def _get_next_id(self, entity_type: str) -> int:
        """
        Генерация следующего автоинкрементного ID для товаров и курсов.
        
        Аргументы:
            entity_type: Тип сущности ('product' или 'course')
            
        Возвращает:
            Следующий доступный ID для типа сущности
            
        Потокобезопасность:
            Должен вызываться только в контексте блокировки.
        """
        current_id = self._id_counters[entity_type]
        self._id_counters[entity_type] += 1
        return current_id
    
    def _hash_password(self, password: str) -> str:
        """
        Хеширование пароля с использованием Argon2id.
        
        Argon2id - победитель конкурса Password Hashing Competition и
        рекомендуемый алгоритм OWASP для хеширования паролей.
        
        Преимущества Argon2id:
        - Устойчивость к атакам по времени
        - Устойчивость к GPU/ASIC атакам (memory-hard)
        - Настраиваемые параметры сложности
        - Комбинирует Argon2i (защита от side-channel) и Argon2d (защита от GPU)
        
        Аргументы:
            password: Пароль в открытом виде
            
        Возвращает:
            Argon2id хеш пароля с встроенной солью и параметрами
            
        Пример вывода:
            $argon2id$v=19$m=65536,t=3,p=4$salt$hash
        """
        return password_hasher.hash(password)
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """
        Проверка пароля против его Argon2id хеша.
        
        Использует constant-time сравнение для защиты от timing attacks.
        
        Аргументы:
            password: Пароль в открытом виде для проверки
            password_hash: Сохранённый Argon2id хеш для сравнения
            
        Возвращает:
            True если пароль совпадает, False в противном случае
        """
        try:
            password_hasher.verify(password_hash, password)
            return True
        except (VerifyMismatchError, InvalidHash):
            return False
    
    def _init_stub_data(self):
        """
        Инициализация тестовых данных для товаров и курсов.
        
        Этот метод заполняет хранилище реалистичными тестовыми данными,
        которые можно использовать для разработки и демонстрации.
        
        Данные включают:
        - 15 товаров для животных (различные типы и целевые животные)
        - 7 образовательных курсов (смесь бесплатных и платных)
        """
        # Инициализация товаров
        products_data = [
            # Сухой корм для собак
            {"name": "Royal Canin Adult Dog", "description": "Полнорационный сухой корм для взрослых собак", "price": 4500, "pet_type": "dog", "product_type": "dry_food"},
            {"name": "Purina Pro Plan Large", "description": "Сухой корм для крупных пород собак", "price": 3800, "pet_type": "dog", "product_type": "dry_food"},
            {"name": "Hill's Science Plan", "description": "Научно разработанный корм для собак", "price": 5200, "pet_type": "dog", "product_type": "dry_food"},
            {"name": "Acana Heritage", "description": "Беззерновой корм премиум-класса", "price": 6500, "pet_type": "dog", "product_type": "dry_food"},
            
            # Сухой корм для кошек
            {"name": "Royal Canin Indoor Cat", "description": "Корм для домашних кошек", "price": 3200, "pet_type": "cat", "product_type": "dry_food"},
            {"name": "Purina ONE для кошек", "description": "Сбалансированный корм для кошек", "price": 2100, "pet_type": "cat", "product_type": "dry_food"},
            {"name": "Brit Premium Cat", "description": "Премиум корм чешского производства", "price": 2800, "pet_type": "cat", "product_type": "dry_food"},
            
            # Влажный корм для собак
            {"name": "Cesar в соусе", "description": "Влажный корм для собак мелких пород", "price": 89, "pet_type": "dog", "product_type": "wet_food"},
            {"name": "Pedigree паштет", "description": "Паштет для взрослых собак", "price": 65, "pet_type": "dog", "product_type": "wet_food"},
            
            # Влажный корм для кошек
            {"name": "Whiskas в желе", "description": "Влажный корм для кошек в желе", "price": 45, "pet_type": "cat", "product_type": "wet_food"},
            {"name": "Felix Sensations", "description": "Корм с хрустящим топпингом", "price": 55, "pet_type": "cat", "product_type": "wet_food"},
            {"name": "Sheba Classic", "description": "Премиум влажный корм для кошек", "price": 75, "pet_type": "cat", "product_type": "wet_food"},
            
            # Лакомства
            {"name": "Лакомство Titbit", "description": "Сушёное лёгкое для собак", "price": 350, "pet_type": "dog", "product_type": "treats"},
            {"name": "Dreamies для кошек", "description": "Хрустящие подушечки с начинкой", "price": 120, "pet_type": "cat", "product_type": "treats"},
            {"name": "Мнямс лакомство", "description": "Палочки для собак и кошек", "price": 180, "pet_type": "all", "product_type": "treats"},
        ]
        
        for i, prod_data in enumerate(products_data, start=1):
            product = Product(
                id=i,
                name=prod_data["name"],
                description=prod_data["description"],
                price=prod_data["price"],
                image_url=f"/images/products/{i}.jpg",  # URL-заглушка
                pet_type=prod_data["pet_type"],
                product_type=prod_data["product_type"]
            )
            self._products[i] = product
        
        self._id_counters['product'] = len(products_data) + 1
        
        # Инициализация курсов
        courses_data = [
            {"title": "Основы дрессировки собак", "description": "Базовые команды и послушание для начинающих владельцев", "duration": 120, "price": 0, "pet_type": "dog"},
            {"title": "Приучение щенка к туалету", "description": "Пошаговое руководство по приучению щенка к выгулу", "duration": 45, "price": 0, "pet_type": "dog"},
            {"title": "Продвинутая дрессировка", "description": "Сложные трюки и команды для опытных владельцев", "duration": 180, "price": 1990, "pet_type": "dog"},
            {"title": "Уход за шерстью кошки", "description": "Как правильно вычёсывать и мыть кошку", "duration": 60, "price": 0, "pet_type": "cat"},
            {"title": "Игры с кошкой", "description": "Интерактивные игры для активной и счастливой кошки", "duration": 90, "price": 990, "pet_type": "cat"},
            {"title": "Питание домашних животных", "description": "Как составить правильный рацион для питомца", "duration": 150, "price": 1490, "pet_type": "all"},
            {"title": "Первая помощь питомцу", "description": "Что делать в экстренных ситуациях до приезда ветеринара", "duration": 75, "price": 2490, "pet_type": "all"},
        ]
        
        for i, course_data in enumerate(courses_data, start=1):
            course = Course(
                id=i,
                title=course_data["title"],
                description=course_data["description"],
                duration=course_data["duration"],
                price=course_data["price"],
                image_url=f"/images/courses/{i}.jpg",  # URL-заглушка
                pet_type=course_data["pet_type"]
            )
            self._courses[i] = course
        
        self._id_counters['course'] = len(courses_data) + 1
        
        logger.info(f"Загружено {len(self._products)} товаров и {len(self._courses)} курсов")
    
    # =========================================================================
    # ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ
    # =========================================================================
    
    def create_user(self, email: str, password: str) -> Optional[User]:
        """
        Создание нового аккаунта пользователя.
        
        Регистрирует нового пользователя с указанными email и паролем.
        Email должен быть уникальным среди всех пользователей.
        
        Безопасность:
            - Пароль хэшируется с использованием Argon2id
            - ID генерируется с использованием UUIDv7
        
        Аргументы:
            email: Email адрес пользователя (используется как идентификатор для входа)
            password: Пароль в открытом виде (будет захеширован перед сохранением)
            
        Возвращает:
            User: Только что созданный объект пользователя при успехе
            None: Если email уже существует
            
        Побочные эффекты:
            - Создаёт новую запись в словаре _users
            
        Пример:
            >>> user = data_store.create_user('john@example.com', 'secret123')
            >>> print(user.id)
            '018d3e5f-8c7b-7abc-9def-1234567890ab'
        """
        with self._lock:
            # Проверка на дублирование email
            if any(u.email == email for u in self._users.values()):
                logger.warning(f"Регистрация не удалась: email {email} уже существует")
                return None
            
            user_id = generate_uuid7()
            user = User(
                id=user_id,
                email=email,
                password_hash=self._hash_password(password)
            )
            self._users[user_id] = user
            
            # Инициализация пустой корзины для нового пользователя
            self._carts[user_id] = []
            
            logger.info(f"Пользователь создан: id={user_id}, email={email}")
            return user
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Аутентификация пользователя по email и паролю.
        
        Проверяет учётные данные пользователя и возвращает объект пользователя при успехе.
        
        Аргументы:
            email: Email адрес пользователя
            password: Пароль в открытом виде для проверки
            
        Возвращает:
            User: Объект пользователя если учётные данные верны
            None: Если пользователь не найден или пароль неверный
            
        Заметка по безопасности:
            Возвращает None и для "пользователь не найден" и для "неверный пароль"
            для предотвращения атак перечисления email.
            
        Пример:
            >>> user = data_store.authenticate_user('john@example.com', 'secret123')
            >>> if user:
            ...     print(f"Добро пожаловать, {user.email}!")
        """
        for user in self._users.values():
            if user.email == email:
                if self._verify_password(password, user.password_hash):
                    logger.info(f"Пользователь аутентифицирован: {email}")
                    return user
                else:
                    logger.warning(f"Ошибка аутентификации: неверный пароль для {email}")
                    return None
        
        logger.warning(f"Ошибка аутентификации: пользователь {email} не найден")
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Получение пользователя по его UUIDv7 ID.
        
        Аргументы:
            user_id: Уникальный идентификатор пользователя (UUIDv7)
            
        Возвращает:
            Объект User если найден, None в противном случае
        """
        return self._users.get(user_id)
    
    # =========================================================================
    # ОПЕРАЦИИ С ПИТОМЦАМИ
    # =========================================================================
    
    def create_pet(self, owner_id: str, name: str, species: str,
                   breed: str = None, date_of_birth: str = None,
                   weight: float = None) -> Optional[Pet]:
        """
        Создание нового профиля питомца.
        
        Создаёт запись PetID для питомца пользователя со всей предоставленной информацией.
        Питомец привязывается к владельцу и доступен только ему.
        
        Аргументы:
            owner_id: UUIDv7 ID пользователя-владельца питомца
            name: Кличка питомца
            species: Вид животного ('dog', 'cat', 'bird' и т.д.)
            breed: Порода (опционально)
            date_of_birth: Дата рождения в ISO формате 'YYYY-MM-DD' (опционально)
            weight: Вес в килограммах (опционально)
            
        Возвращает:
            Pet: Только что созданный объект питомца с UUIDv7 ID
            None: Если owner_id не существует
            
        Побочные эффекты:
            - Создаёт новую запись в словаре _pets
            
        Пример:
            >>> pet = data_store.create_pet(
            ...     owner_id='018d3e5f-...',
            ...     name='Бадди',
            ...     species='dog',
            ...     breed='Золотистый ретривер',
            ...     weight=32.5
            ... )
        """
        with self._lock:
            # Проверка существования владельца
            if owner_id not in self._users:
                logger.warning(f"Создание питомца не удалось: владелец {owner_id} не найден")
                return None
            
            pet_id = generate_uuid7()
            pet = Pet(
                id=pet_id,
                owner_id=owner_id,
                name=name,
                species=species,
                breed=breed,
                date_of_birth=date_of_birth,
                weight=weight
            )
            self._pets[pet_id] = pet
            
            logger.info(f"Питомец создан: id={pet_id}, name={name}, owner={owner_id}")
            return pet
    
    def get_user_pets(self, owner_id: str) -> List[Pet]:
        """
        Получение всех питомцев, принадлежащих конкретному пользователю.
        
        Аргументы:
            owner_id: UUIDv7 ID пользователя, чьих питомцев нужно получить
            
        Возвращает:
            Список объектов Pet, принадлежащих пользователю (может быть пустым)
        """
        return [pet for pet in self._pets.values() if pet.owner_id == owner_id]
    
    def get_pet_by_id(self, pet_id: str) -> Optional[Pet]:
        """
        Получение питомца по его UUIDv7 ID.
        
        Аргументы:
            pet_id: Уникальный идентификатор питомца (UUIDv7)
            
        Возвращает:
            Объект Pet если найден, None в противном случае
        """
        return self._pets.get(pet_id)
    
    def update_pet(self, pet_id: str, owner_id: str, **kwargs) -> Optional[Pet]:
        """
        Обновление информации существующего питомца.
        
        Только владелец может обновлять информацию о своём питомце.
        Обновляются только предоставленные поля.
        
        Аргументы:
            pet_id: UUIDv7 ID питомца для обновления
            owner_id: UUIDv7 ID запрашивающего пользователя (для авторизации)
            **kwargs: Поля для обновления (name, species, breed, date_of_birth, weight)
            
        Возвращает:
            Pet: Обновлённый объект питомца
            None: Если питомец не найден или пользователь не авторизован
            
        Авторизация:
            Только владелец питомца может его обновлять.
            
        Пример:
            >>> updated = data_store.update_pet('018d3e5f-...', owner_id='018d3e5f-...', weight=33.0)
        """
        with self._lock:
            pet = self._pets.get(pet_id)
            
            if not pet:
                logger.warning(f"Обновление питомца не удалось: питомец {pet_id} не найден")
                return None
            
            # Проверка авторизации
            if pet.owner_id != owner_id:
                logger.warning(f"Обновление питомца не удалось: пользователь {owner_id} не владелец питомца {pet_id}")
                return None
            
            # Обновление только предоставленных полей
            allowed_fields = {'name', 'species', 'breed', 'date_of_birth', 'weight'}
            for field, value in kwargs.items():
                if field in allowed_fields:
                    setattr(pet, field, value)
            
            pet.updated_at = datetime.now()
            
            logger.info(f"Питомец обновлён: id={pet_id}")
            return pet
    
    def delete_pet(self, pet_id: str, owner_id: str) -> bool:
        """
        Удаление профиля питомца.
        
        Аргументы:
            pet_id: UUIDv7 ID питомца для удаления
            owner_id: UUIDv7 ID запрашивающего пользователя (для авторизации)
            
        Возвращает:
            True если успешно удалено, False в противном случае
        """
        with self._lock:
            pet = self._pets.get(pet_id)
            
            if not pet or pet.owner_id != owner_id:
                return False
            
            del self._pets[pet_id]
            logger.info(f"Питомец удалён: id={pet_id}")
            return True
    
    # =========================================================================
    # ОПЕРАЦИИ С ТОВАРАМИ
    # =========================================================================
    
    def get_all_products(self, pet_type: str = None, 
                         product_type: str = None) -> List[Product]:
        """
        Получение товаров с опциональной фильтрацией.
        
        Возвращает все товары из каталога, опционально отфильтрованные
        по типу животного и/или типу товара.
        
        Аргументы:
            pet_type: Фильтр по целевому животному ('dog', 'cat', 'all') - опционально
            product_type: Фильтр по категории товара ('dry_food', 'wet_food', 'treats') - опционально
            
        Возвращает:
            Список объектов Product, соответствующих фильтрам
            
        Логика фильтрации:
            - Товары с pet_type='all' соответствуют любому фильтру по животному
            - Множественные фильтры объединяются логикой И
            
        Пример:
            >>> dogs_food = data_store.get_all_products(pet_type='dog')
            >>> cat_treats = data_store.get_all_products(pet_type='cat', product_type='treats')
        """
        products = list(self._products.values())
        
        if pet_type:
            products = [p for p in products 
                       if p.pet_type == pet_type or p.pet_type == 'all']
        
        if product_type:
            products = [p for p in products if p.product_type == product_type]
        
        return products
    
    def get_product_by_id(self, product_id: int) -> Optional[Product]:
        """
        Получение товара по его ID.
        
        Аргументы:
            product_id: Уникальный идентификатор товара
            
        Возвращает:
            Объект Product если найден, None в противном случае
        """
        return self._products.get(product_id)
    
    # =========================================================================
    # ОПЕРАЦИИ С КОРЗИНОЙ
    # =========================================================================
    
    def get_cart(self, user_id: str) -> List[Dict]:
        """
        Получение корзины пользователя с деталями товаров.
        
        Возвращает все элементы в корзине пользователя, обогащённые
        полной информацией о товарах.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя, чью корзину нужно получить
            
        Возвращает:
            Список словарей с информацией об элементах корзины:
            [{'product': {...}, 'quantity': int}, ...]
        """
        cart_items = self._carts.get(user_id, [])
        result = []
        
        for item in cart_items:
            product = self._products.get(item.product_id)
            if product:
                result.append({
                    'product': product.to_dict(),
                    'quantity': item.quantity
                })
        
        return result
    
    def add_to_cart(self, user_id: str, product_id: int, 
                    quantity: int = 1) -> bool:
        """
        Добавление товара в корзину пользователя.
        
        Если товар уже есть в корзине, увеличивает количество.
        Если нет, добавляет новый элемент корзины.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя
            product_id: ID товара для добавления
            quantity: Количество для добавления (по умолчанию: 1)
            
        Возвращает:
            True если успешно добавлено, False если товар не найден
            
        Побочные эффекты:
            - Модифицирует словарь _carts
            - Создаёт корзину для пользователя если её нет
            
        Пример:
            >>> data_store.add_to_cart(user_id='018d3e5f-...', product_id=5, quantity=2)
            True
        """
        with self._lock:
            # Проверка существования товара
            if product_id not in self._products:
                logger.warning(f"Добавление в корзину не удалось: товар {product_id} не найден")
                return False
            
            # Убеждаемся, что у пользователя есть корзина
            if user_id not in self._carts:
                self._carts[user_id] = []
            
            # Проверяем, есть ли товар уже в корзине
            for item in self._carts[user_id]:
                if item.product_id == product_id:
                    item.quantity += quantity
                    logger.info(f"Корзина обновлена: user={user_id}, product={product_id}, qty={item.quantity}")
                    return True
            
            # Добавление нового элемента
            self._carts[user_id].append(CartItem(product_id=product_id, quantity=quantity))
            logger.info(f"Добавлено в корзину: user={user_id}, product={product_id}, qty={quantity}")
            return True
    
    def update_cart_item(self, user_id: str, product_id: int, 
                         quantity: int) -> bool:
        """
        Обновление количества элемента в корзине.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя
            product_id: ID товара для обновления
            quantity: Новое количество (0 удаляет элемент)
            
        Возвращает:
            True если успешно обновлено, False если элемент не в корзине
        """
        with self._lock:
            if user_id not in self._carts:
                return False
            
            for i, item in enumerate(self._carts[user_id]):
                if item.product_id == product_id:
                    if quantity <= 0:
                        # Удаление элемента если количество 0 или отрицательное
                        self._carts[user_id].pop(i)
                        logger.info(f"Удалено из корзины: user={user_id}, product={product_id}")
                    else:
                        item.quantity = quantity
                        logger.info(f"Элемент корзины обновлён: user={user_id}, product={product_id}, qty={quantity}")
                    return True
            
            return False
    
    def remove_from_cart(self, user_id: str, product_id: int) -> bool:
        """
        Удаление товара из корзины пользователя.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя
            product_id: ID товара для удаления
            
        Возвращает:
            True если удалено, False если не найдено
        """
        return self.update_cart_item(user_id, product_id, 0)
    
    def clear_cart(self, user_id: str):
        """
        Очистка всех элементов из корзины пользователя.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя, чью корзину нужно очистить
        """
        with self._lock:
            self._carts[user_id] = []
            logger.info(f"Корзина очищена: user={user_id}")
    
    # =========================================================================
    # ОПЕРАЦИИ С ЗАКАЗАМИ
    # =========================================================================
    
    def create_order(self, user_id: str, shipping_address: str) -> Optional[Order]:
        """
        Создание заказа из корзины пользователя.
        
        Конвертирует все элементы корзины в заказ, рассчитывает итого
        и очищает корзину.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя, оформляющего заказ
            shipping_address: Адрес доставки
            
        Возвращает:
            Order: Созданный объект заказа с UUIDv7 ID
            None: Если корзина пуста
            
        Побочные эффекты:
            - Создаёт новую запись в словаре _orders
            - Очищает корзину пользователя
            
        Бизнес-логика:
            1. Получение всех элементов корзины
            2. Расчёт итого по текущим ценам товаров
            3. Создание заказа со снимком элементов (цены на момент заказа)
            4. Очистка корзины
            
        Пример:
            >>> order = data_store.create_order(user_id='018d3e5f-...', shipping_address='Москва, ул. Ленина 1')
        """
        with self._lock:
            cart_items = self._carts.get(user_id, [])
            
            if not cart_items:
                logger.warning(f"Создание заказа не удалось: корзина пуста для user {user_id}")
                return None
            
            # Построение элементов заказа с текущими ценами
            order_items = []
            total_amount = 0
            
            for cart_item in cart_items:
                product = self._products.get(cart_item.product_id)
                if product:
                    item_total = product.price * cart_item.quantity
                    order_items.append({
                        'product_id': product.id,
                        'product_name': product.name,
                        'quantity': cart_item.quantity,
                        'price': product.price,
                        'total': item_total
                    })
                    total_amount += item_total
            
            # Создание заказа с UUIDv7
            order_id = generate_uuid7()
            order = Order(
                id=order_id,
                user_id=user_id,
                items=order_items,
                total_amount=total_amount,
                shipping_address=shipping_address
            )
            self._orders[order_id] = order
            
            # Очистка корзины
            self._carts[user_id] = []
            
            logger.info(f"Заказ создан: id={order_id}, user={user_id}, total={total_amount}")
            return order
    
    def get_user_orders(self, user_id: str) -> List[Order]:
        """
        Получение всех заказов конкретного пользователя.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя, чьи заказы нужно получить
            
        Возвращает:
            Список объектов Order (сначала новые)
        """
        orders = [o for o in self._orders.values() if o.user_id == user_id]
        return sorted(orders, key=lambda o: o.created_at, reverse=True)
    
    # =========================================================================
    # ОПЕРАЦИИ С КУРСАМИ
    # =========================================================================
    
    def get_all_courses(self, pet_type: str = None) -> List[Course]:
        """
        Получение всех курсов с опциональной фильтрацией.
        
        Аргументы:
            pet_type: Фильтр по целевому животному ('dog', 'cat', 'all') - опционально
            
        Возвращает:
            Список объектов Course
        """
        courses = list(self._courses.values())
        
        if pet_type:
            courses = [c for c in courses 
                      if c.pet_type == pet_type or c.pet_type == 'all']
        
        return courses
    
    def get_course_by_id(self, course_id: int) -> Optional[Course]:
        """
        Получение курса по его ID.
        
        Аргументы:
            course_id: Уникальный идентификатор курса
            
        Возвращает:
            Объект Course если найден, None в противном случае
        """
        return self._courses.get(course_id)
    
    def purchase_course(self, user_id: str, course_id: int) -> Optional[UserCourse]:
        """
        Регистрация покупки или записи на курс.
        
        Добавляет курс в список приобретённых курсов пользователя.
        Для бесплатных курсов это представляет запись.
        Для платных курсов это обычно следует за оплатой (имитация для MVP).
        
        Аргументы:
            user_id: UUIDv7 ID пользователя, покупающего курс
            course_id: ID курса для покупки
            
        Возвращает:
            UserCourse: Запись о покупке
            None: Если курс не найден или уже куплен
            
        Побочные эффекты:
            - Добавляет запись в список _user_courses
            
        Бизнес-логика:
            - Проверка существования курса
            - Проверка, что пользователь ещё не купил курс
            - Создание записи о покупке
        """
        with self._lock:
            # Проверка существования курса
            if course_id not in self._courses:
                logger.warning(f"Покупка курса не удалась: курс {course_id} не найден")
                return None
            
            # Проверка, не куплен ли уже
            for uc in self._user_courses:
                if uc.user_id == user_id and uc.course_id == course_id:
                    logger.warning(f"Курс уже куплен: user={user_id}, course={course_id}")
                    return None
            
            user_course = UserCourse(user_id=user_id, course_id=course_id)
            self._user_courses.append(user_course)
            
            logger.info(f"Курс куплен: user={user_id}, course={course_id}")
            return user_course
    
    def get_user_courses(self, user_id: str) -> List[Dict]:
        """
        Получение всех курсов, приобретённых пользователем.
        
        Возвращает полную информацию о курсе вместе с деталями покупки.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя
            
        Возвращает:
            Список словарей с информацией о курсе и покупке
        """
        result = []
        
        for uc in self._user_courses:
            if uc.user_id == user_id:
                course = self._courses.get(uc.course_id)
                if course:
                    result.append({
                        'course': course.to_dict(),
                        'purchased_at': uc.purchased_at.isoformat(),
                        'progress': uc.progress
                    })
        
        return result
    
    def has_course(self, user_id: str, course_id: int) -> bool:
        """
        Проверка, приобрёл ли пользователь конкретный курс.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя
            course_id: ID курса для проверки
            
        Возвращает:
            True если пользователь владеет курсом, False в противном случае
        """
        return any(
            uc.user_id == user_id and uc.course_id == course_id 
            for uc in self._user_courses
        )


# =============================================================================
# ЭКЗЕМПЛЯР-СИНГЛТОН
# =============================================================================

# Создание глобального экземпляра хранилища данных
# Импортируется другими модулями: from core.data_store import data_store
data_store = DataStore()
