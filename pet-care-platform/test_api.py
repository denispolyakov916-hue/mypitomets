#!/usr/bin/env python
import requests

# Тестируем backend API напрямую
backend_url = "http://localhost:8077/api"

print("=== Тестирование Backend API ===")

# Тест 1: Health check
try:
    response = requests.get(f"{backend_url}/health/")
    print(f"Health check: {response.status_code} - {'OK' if response.status_code == 200 else 'FAIL'}")
except Exception as e:
    print(f"Health check: FAIL - {e}")

# Тест 2: Products API
try:
    response = requests.get(f"{backend_url}/shop/products/?page=1&per_page=1")
    print(f"Products API: {response.status_code} - {'OK' if response.status_code == 200 else 'FAIL'}")
    if response.status_code == 200:
        data = response.json()
        products = data.get('products', [])
        print(f"  Найдено товаров: {len(products)}")
except Exception as e:
    print(f"Products API: FAIL - {e}")

# Тест 3: Payments API (create)
try:
    # Тестовый платеж
    payment_data = {
        'payment_type': 'course',
        'object_id': 1,
        'amount': 1000,
        'payment_method': 'card'
    }
    response = requests.post(f"{backend_url}/payments/create/", json=payment_data)
    print(f"Payments create: {response.status_code} - {'OK' if response.status_code in [200, 201, 400] else 'FAIL'}")
    if response.status_code >= 400:
        print(f"  Error: {response.text}")
except Exception as e:
    print(f"Payments create: FAIL - {e}")

print("\n=== Готово ===")

