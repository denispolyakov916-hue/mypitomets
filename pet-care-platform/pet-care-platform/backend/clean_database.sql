-- SQL скрипт для полной очистки базы данных от всех пользователей и связанных данных
-- Выполните этот скрипт в psql или pgAdmin как пользователь pitomets

-- ВНИМАНИЕ: Этот скрипт удалит ВСЕ пользовательские данные!
-- Перед выполнением убедитесь, что у вас есть backup!

-- Начинаем транзакцию для безопасности
BEGIN;

-- Удаляем в правильном порядке (от зависимых к независимым)

-- 1. Комментарии и лайки к курсам
DELETE FROM comment_likes;
DELETE FROM comments;

-- 2. Отзывы
DELETE FROM reviews;

-- 3. Платежи
DELETE FROM payments;

-- 4. Элементы заказов и корзины
DELETE FROM order_items;
DELETE FROM cart_items;
DELETE FROM carts;

-- 5. Заказы
DELETE FROM orders;

-- 6. Прогресс по курсам
DELETE FROM user_lesson_progress;
DELETE FROM user_course_progress;

-- 7. Записи на курсы
DELETE FROM user_courses;

-- 8. Напоминания и события календаря
DELETE FROM event_reminders;
DELETE FROM calendar_events;

-- 9. Питомцы
DELETE FROM pets;

-- 10. Токены пользователей
DELETE FROM tokens;

-- 11. Пользователи (в последнюю очередь)
DELETE FROM users;

-- Сбрасываем последовательности (автоинкремент)
-- ALTER SEQUENCE reviews_id_seq RESTART WITH 1;
-- ALTER SEQUENCE comments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE cart_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE carts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_lesson_progress_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_course_progress_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_courses_id_seq RESTART WITH 1;
-- ALTER SEQUENCE event_reminders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE calendar_events_id_seq RESTART WITH 1;
-- ALTER SEQUENCE pets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tokens_id_seq RESTART WITH 1;

-- Подтверждаем транзакцию
COMMIT;

-- Проверяем результаты
SELECT 'users' as table_name, COUNT(*) as remaining_records FROM users
UNION ALL
SELECT 'pets', COUNT(*) FROM pets
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews;