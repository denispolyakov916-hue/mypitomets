# -*- coding: utf-8 -*-
"""
Скрипт для конвертации каталога из XML в JSON
Фильтрует только нужные категории для собак и кошек
"""

import xml.etree.ElementTree as ET
import json
from collections import defaultdict

# Нужные категории по ID
ALLOWED_CATEGORIES = {
    # ДЛЯ КОШЕК (parent: 2133)
    # Корма
    2322,  # Сухой
    2319,  # Консервы
    2317,  # Паштет
    2320,  # Влажный
    2316,  # Холистики
    2315,  # Диетический
    
    # Ветаптека
    2152,  # Средства от паразитов
    
    # Амуниция (2156) - подкатегории не указаны в XML, берем родительскую
    2156,  # Амуниция для кошек
    
    # Средства по уходу
    2157,  # Средства по уходу для кошек
    
    # Транспортировка и содержание
    2158,  # Транспортировка и содержание для кошек
    
    # Игрушки
    2155,  # Игрушки для кошек
    
    # ДЛЯ СОБАК (parent: 2132)
    # Корма
    2305,  # Сухой
    2308,  # Консервы
    2309,  # Паучи
    2310,  # Паштет
    2307,  # Влажный
    2311,  # Холистики
    2312,  # Диетический
    2313,  # Гипоаллергенный
    
    # Ветаптека
    2144,  # Средства от паразитов
    
    # Амуниция
    2162,  # Поводки
    2161,  # Ошейники
    2164,  # Шлейки
    2169,  # Намордники
    2168,  # Кликеры
    2167,  # Рулетки
    2166,  # Подсветки
    2165,  # Мультибоксы
    
    # Средства по уходу
    2147,  # Средства по уходу для собак
    
    # Транспортировка и содержание
    2148,  # Транспортировка и содержание для собак
    2285,  # Вольеры
    2234,  # Пеленки
    
    # Игрушки
    2142,  # Игрушки для собак
}

# Маппинг категорий на человекочитаемые названия
CATEGORY_NAMES = {
    # Кошки - Корма
    2322: {"animal": "cat", "category": "food", "subcategory": "dry", "name": "Сухой корм"},
    2319: {"animal": "cat", "category": "food", "subcategory": "canned", "name": "Консервы"},
    2317: {"animal": "cat", "category": "food", "subcategory": "pate", "name": "Паштет"},
    2320: {"animal": "cat", "category": "food", "subcategory": "wet", "name": "Влажный корм"},
    2316: {"animal": "cat", "category": "food", "subcategory": "holistic", "name": "Холистики"},
    2315: {"animal": "cat", "category": "food", "subcategory": "diet", "name": "Диетический"},
    
    # Кошки - Ветаптека
    2152: {"animal": "cat", "category": "pharmacy", "subcategory": "antiparasite", "name": "Средства от паразитов"},
    
    # Кошки - Амуниция
    2156: {"animal": "cat", "category": "ammunition", "subcategory": "general", "name": "Амуниция"},
    
    # Кошки - Уход
    2157: {"animal": "cat", "category": "care", "subcategory": "general", "name": "Средства по уходу"},
    
    # Кошки - Транспортировка
    2158: {"animal": "cat", "category": "transport", "subcategory": "general", "name": "Транспортировка и содержание"},
    
    # Кошки - Игрушки
    2155: {"animal": "cat", "category": "toys", "subcategory": "general", "name": "Игрушки"},
    
    # Собаки - Корма
    2305: {"animal": "dog", "category": "food", "subcategory": "dry", "name": "Сухой корм"},
    2308: {"animal": "dog", "category": "food", "subcategory": "canned", "name": "Консервы"},
    2309: {"animal": "dog", "category": "food", "subcategory": "pouch", "name": "Паучи"},
    2310: {"animal": "dog", "category": "food", "subcategory": "pate", "name": "Паштет"},
    2307: {"animal": "dog", "category": "food", "subcategory": "wet", "name": "Влажный корм"},
    2311: {"animal": "dog", "category": "food", "subcategory": "holistic", "name": "Холистики"},
    2312: {"animal": "dog", "category": "food", "subcategory": "diet", "name": "Диетический"},
    2313: {"animal": "dog", "category": "food", "subcategory": "hypoallergenic", "name": "Гипоаллергенный"},
    
    # Собаки - Ветаптека
    2144: {"animal": "dog", "category": "pharmacy", "subcategory": "antiparasite", "name": "Средства от паразитов"},
    
    # Собаки - Амуниция
    2162: {"animal": "dog", "category": "ammunition", "subcategory": "leashes", "name": "Поводки"},
    2161: {"animal": "dog", "category": "ammunition", "subcategory": "collars", "name": "Ошейники"},
    2164: {"animal": "dog", "category": "ammunition", "subcategory": "harnesses", "name": "Шлейки"},
    2169: {"animal": "dog", "category": "ammunition", "subcategory": "muzzles", "name": "Намордники"},
    2168: {"animal": "dog", "category": "ammunition", "subcategory": "clickers", "name": "Кликеры"},
    2167: {"animal": "dog", "category": "ammunition", "subcategory": "retractable", "name": "Рулетки"},
    2166: {"animal": "dog", "category": "ammunition", "subcategory": "lights", "name": "Подсветки"},
    2165: {"animal": "dog", "category": "ammunition", "subcategory": "multiboxes", "name": "Мультибоксы"},
    
    # Собаки - Уход
    2147: {"animal": "dog", "category": "care", "subcategory": "general", "name": "Средства по уходу"},
    
    # Собаки - Транспортировка
    2148: {"animal": "dog", "category": "transport", "subcategory": "general", "name": "Транспортировка и содержание"},
    2285: {"animal": "dog", "category": "transport", "subcategory": "enclosures", "name": "Вольеры"},
    2234: {"animal": "dog", "category": "transport", "subcategory": "pads", "name": "Пеленки"},
    
    # Собаки - Игрушки
    2142: {"animal": "dog", "category": "toys", "subcategory": "general", "name": "Игрушки"},
}


def parse_offer(offer_elem):
    """Парсинг одного товара из XML"""
    product = {
        "id": offer_elem.get("id"),
        "available": offer_elem.get("available") == "true",
        "group_id": offer_elem.get("group_id"),
    }
    
    # Основные поля
    for field in ["name", "vendor", "vendorCode", "price", "barcode", "weight", "url", "count", "currencyId", "categoryId", "description"]:
        elem = offer_elem.find(field)
        if elem is not None and elem.text:
            if field == "price":
                try:
                    product[field] = float(elem.text)
                except:
                    product[field] = 0.0
            elif field == "count":
                try:
                    product[field] = int(elem.text)
                except:
                    product[field] = 0
            elif field == "weight":
                try:
                    product[field] = float(elem.text)
                except:
                    product[field] = None
            elif field == "categoryId":
                try:
                    product[field] = int(elem.text)
                except:
                    product[field] = None
            elif field == "description":
                text = elem.text.strip() if elem.text else ""
                product[field] = text if text else None
            else:
                product[field] = elem.text.strip() if elem.text else None
    
    # Картинки
    pictures = []
    for pic in offer_elem.findall("picture"):
        if pic.text:
            pictures.append(pic.text.strip())
    product["pictures"] = pictures
    
    # Параметры
    params = {}
    for param in offer_elem.findall("param"):
        param_name = param.get("name")
        if param_name and param.text:
            params[param_name] = param.text.strip()
    product["params"] = params
    
    return product


def main():
    print("Загрузка XML файла...")
    tree = ET.parse(r"D:\1 pitometsplus\Каталог.xml")
    root = tree.getroot()
    
    # Получаем информацию о магазине
    shop = root.find("shop")
    shop_info = {
        "name": shop.find("name").text if shop.find("name") is not None else None,
        "company": shop.find("company").text if shop.find("company") is not None else None,
        "url": shop.find("url").text if shop.find("url") is not None else None,
    }
    
    # Парсим категории
    categories_elem = shop.find("categories")
    all_categories = {}
    for cat in categories_elem.findall("category"):
        cat_id = int(cat.get("id"))
        all_categories[cat_id] = {
            "id": cat_id,
            "name": cat.text,
            "parent_id": int(cat.get("parentId")) if cat.get("parentId") else None
        }
    
    # Фильтруем товары
    print("Фильтрация товаров...")
    offers = shop.find("offers")
    
    filtered_products = []
    stats = defaultdict(int)
    
    for offer in offers.findall("offer"):
        category_id_elem = offer.find("categoryId")
        if category_id_elem is None:
            continue
            
        try:
            category_id = int(category_id_elem.text)
        except:
            continue
        
        if category_id in ALLOWED_CATEGORIES:
            product = parse_offer(offer)
            
            # Добавляем информацию о категории
            cat_info = CATEGORY_NAMES.get(category_id, {})
            product["animal"] = cat_info.get("animal", "unknown")
            product["category"] = cat_info.get("category", "unknown")
            product["subcategory"] = cat_info.get("subcategory", "unknown")
            product["category_name"] = cat_info.get("name", "Неизвестно")
            
            filtered_products.append(product)
            stats[f"{product['animal']}_{product['category']}"] += 1
    
    # Формируем итоговый JSON
    result = {
        "source": shop_info,
        "export_date": root.get("date"),
        "statistics": {
            "total_products": len(filtered_products),
            "by_category": dict(stats)
        },
        "categories": {
            "dogs": {
                "food": ["dry", "wet", "canned", "pouch", "pate", "holistic", "diet", "hypoallergenic"],
                "pharmacy": ["antiparasite"],
                "ammunition": ["leashes", "collars", "harnesses", "muzzles", "clickers", "retractable", "lights", "multiboxes"],
                "care": ["general"],
                "transport": ["general", "enclosures", "pads"],
                "toys": ["general"]
            },
            "cats": {
                "food": ["dry", "wet", "canned", "pate", "holistic", "diet"],
                "pharmacy": ["antiparasite"],
                "ammunition": ["general"],
                "care": ["general"],
                "transport": ["general"],
                "toys": ["general"]
            }
        },
        "products": filtered_products
    }
    
    # Сохраняем JSON
    output_file = r"D:\1 pitometsplus\catalog_filtered.json"
    print(f"Сохранение в {output_file}...")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\nГотово!")
    print(f"Всего товаров: {len(filtered_products)}")
    print("\nСтатистика по категориям:")
    for key, count in sorted(stats.items()):
        print(f"  {key}: {count}")


if __name__ == "__main__":
    main()

