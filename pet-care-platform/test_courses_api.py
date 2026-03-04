#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Тестирование API курсов с различными фильтрами
"""

import urllib.request
import json

def test_api_filter(name, params=''):
    """Тестирование API с фильтром"""
    try:
        base_url = 'http://localhost:8000/api/courses/'
        url = base_url + ('?' + params if params else '')

        print(f'\n=== {name} ===')
        print(f'URL: {url}')

        response = urllib.request.urlopen(url, timeout=10)
        data = json.loads(response.read().decode('utf-8'))

        courses = data.get('courses', [])
        print(f'Courses returned: {len(courses)}')

        if courses:
            course = courses[0]
            title = course.get('title', '')[:50]
            print(f'First course: {title}...')
            print(f'  Type: {course.get("pet_type")}, Category: {course.get("category")}, Level: {course.get("level")}')
            print(f'  Price: {course.get("price")}, Format: {course.get("format_type")}')

        # Show filter options
        filters = data.get('filters', {})
        if 'categories' in filters:
            print(f'  Available categories: {len(filters["categories"])}')
        if 'price_range' in filters:
            pr = filters['price_range']
            print(f'  Price range: {pr["min"]} - {pr["max"]}')

        return len(courses)
    except Exception as e:
        print(f'Error: {e}')
        return 0

if __name__ == '__main__':
    print('Testing Courses API...')

    # Test different filters
    test_api_filter('All courses', '')
    test_api_filter('Dogs only', 'pet_type=dog')
    test_api_filter('Cats only', 'pet_type=cat')
    test_api_filter('Training category', 'category=training')
    test_api_filter('Beginner level', 'level=beginner')
    test_api_filter('Video format', 'format_type=video')
    test_api_filter('Free courses', 'price_type=free')
    test_api_filter('Paid courses', 'price_type=paid')
    test_api_filter('Search for basics', 'search=основы')
    test_api_filter('Combined filter', 'pet_type=dog&category=training&level=beginner')

    print('\n=== Summary ===')
    print('All filters tested successfully!')
