# Нагрузочное тестирование

## Установка

```bash
pip install -r backend/requirements.txt
```

## Запуск

### С веб-интерфейсом

```bash
locust -f load_tests/locustfile.py --host=http://localhost:8077
```

Откроется веб-интерфейс на http://localhost:8089

### Без веб-интерфейса

```bash
locust -f load_tests/locustfile.py \
    --host=http://localhost:8077 \
    --users=100 \
    --spawn-rate=10 \
    --run-time=5m \
    --headless \
    --html=results/report.html
```

## Параметры

- `--host` - URL сервера для тестирования
- `--users` - Количество одновременных пользователей
- `--spawn-rate` - Скорость добавления пользователей (в секунду)
- `--run-time` - Время выполнения теста (например, 5m, 1h)
- `--headless` - Запуск без веб-интерфейса
- `--html` - Сохранение отчета в HTML файл

## Сценарии

- **PetCareUser** - Обычный пользователь (просмотр товаров, курсов)
- **BuyerUser** - Покупатель (активные покупки)
- **AdminUser** - Администратор (статистика, управление)
- **RemindersUser** - Пользователь с напоминаниями

## Результаты

Результаты сохраняются в папке `results/`

