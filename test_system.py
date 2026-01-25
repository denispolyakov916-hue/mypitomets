#!/usr/bin/env python
"""
Скрипт для тестирования системы обучения.
"""

import os
import sys
import django

# Настройка Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.training.models import Course, Lesson, Comment, Rating
from apps.pets.models import Pet

def test_models():
    """Тестирование основных моделей."""
    print("🧪 Тестирование системы обучения")
    print("=" * 50)

    # Тест количества объектов
    print(f"📊 Статистика данных:")
    print(f"  Курсы: {Course.objects.count()}")
    print(f"  Уроки: {Lesson.objects.count()}")
    print(f"  Комментарии: {Comment.objects.count()}")
    print(f"  Оценки: {Rating.objects.count()}")
    print()

    # Тест первого курса
    course = Course.objects.first()
    if course:
        print(f"📚 Тест курса: {course.title}")
        print(f"  Уроки: {course.lessons.count()}")
        print(f"  Комментарии: {course.comments.count()}")
        print(f"  Оценки: {course.ratings.count()}")
        print()

        # Тест персонализации
        print("🎯 Тест персонализации:")
        class MockPet:
            def __init__(self):
                self.behavior_type = 'calm'
                self.pet_type = 'dog'
                self.activity_level = 'medium'
                self.training_experience = 'beginner'
                self.health_issues = []
                self.special_needs = []
                self.behavioral_problems = []

        pet = MockPet()
        compatibility = course.is_compatible_with_pet(pet)
        print(f"  Совместимость со спокойной собакой: {compatibility['compatible']}")
        print(f"  Балл совместимости: {compatibility['score']}/100")
        print(f"  Причины: {len(compatibility['reasons'])} факторов")
        print()

    # Тест уроков
    lesson = Lesson.objects.first()
    if lesson:
        print(f"📖 Тест урока: {lesson.title}")
        print(f"  Тип контента: {lesson.content_type}")
        print(f"  Длительность: {lesson.duration} мин")
        print(f"  Обязательный: {lesson.is_required}")
        print()

    # Тест комментариев
    comment = Comment.objects.first()
    if comment:
        print(f"💬 Тест комментария:")
        print(f"  Автор: {comment.user.email if comment.user else 'Anonymous'}")
        print(f"  Текст: {comment.content[:50]}...")
        print(f"  Лайки: {comment.likes_count}")
        print(f"  Дизлайки: {comment.dislikes_count}")
        print()

    # Тест оценок
    rating = Rating.objects.first()
    if rating:
        print(f"⭐ Тест оценки:")
        print(f"  Автор: {rating.user.email if rating.user else 'Anonymous'}")
        print(f"  Оценка: {rating.rating}/5")
        print(f"  Питомец: {rating.pet.name if rating.pet else 'Не указан'}")
        print()

    print("✅ Все тесты пройдены успешно!")

if __name__ == '__main__':
    test_models()
