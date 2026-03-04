"""
API представления для системы напоминаний.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from .reminder_models import Reminder, ReminderCategory, ReminderFrequency
from .models import Pet


class ReminderListView(APIView):
    """
    Получение списка напоминаний пользователя.
    GET /api/pets/reminders/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Фильтры
        pet_id = request.query_params.get('pet_id')
        category = request.query_params.get('category')
        show_completed = request.query_params.get('show_completed', 'false').lower() == 'true'
        upcoming_only = request.query_params.get('upcoming_only', 'false').lower() == 'true'
        
        reminders = Reminder.objects.filter(
            user=request.user,
            is_active=True
        ).select_related('pet')
        
        if not show_completed:
            reminders = reminders.filter(is_completed=False)
        
        if pet_id:
            reminders = reminders.filter(pet_id=pet_id)
        
        if category:
            reminders = reminders.filter(category=category)
        
        if upcoming_only:
            today = timezone.now().date()
            week_later = today + timedelta(days=7)
            reminders = reminders.filter(
                reminder_date__gte=today,
                reminder_date__lte=week_later
            )
        
        reminders = reminders.order_by('reminder_date', 'reminder_time')
        
        # Группировка по статусу
        overdue = []
        upcoming = []
        future = []
        completed = []
        
        for reminder in reminders:
            reminder_data = reminder.to_dict()
            if reminder.is_completed:
                completed.append(reminder_data)
            elif reminder.is_overdue:
                overdue.append(reminder_data)
            elif reminder.is_upcoming:
                upcoming.append(reminder_data)
            else:
                future.append(reminder_data)
        
        return Response({
            'overdue': overdue,
            'upcoming': upcoming,
            'future': future,
            'completed': completed if show_completed else [],
            'total_count': len(overdue) + len(upcoming) + len(future),
            'overdue_count': len(overdue),
        })
    
    def post(self, request):
        """Создание нового напоминания."""
        pet_id = request.data.get('pet_id')
        title = request.data.get('title')
        description = request.data.get('description', '')
        category = request.data.get('category', 'other')
        frequency = request.data.get('frequency', 'once')
        reminder_date = request.data.get('reminder_date')
        reminder_time = request.data.get('reminder_time')
        notify_email = request.data.get('notify_email', True)
        notify_push = request.data.get('notify_push', True)
        notify_before = request.data.get('notify_before', 60)
        
        # Валидация
        if not pet_id:
            return Response(
                {'error': 'Укажите питомца'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not title:
            return Response(
                {'error': 'Укажите название напоминания'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reminder_date:
            return Response(
                {'error': 'Укажите дату напоминания'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что питомец принадлежит пользователю
        try:
            pet = Pet.objects.get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            return Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Валидация категории и частоты
        if category not in dict(ReminderCategory.choices):
            category = 'other'
        
        if frequency not in dict(ReminderFrequency.choices):
            frequency = 'once'
        
        try:
            reminder = Reminder.objects.create(
                user=request.user,
                pet=pet,
                title=title,
                description=description,
                category=category,
                frequency=frequency,
                reminder_date=reminder_date,
                reminder_time=reminder_time if reminder_time else None,
                notify_email=notify_email,
                notify_push=notify_push,
                notify_before=notify_before,
            )
            
            return Response({
                'message': 'Напоминание создано',
                'reminder': reminder.to_dict()
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Ошибка при создании напоминания: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReminderDetailView(APIView):
    """
    Получение, обновление и удаление конкретного напоминания.
    GET/PUT/DELETE /api/pets/reminders/<id>/
    """
    permission_classes = [IsAuthenticated]
    
    def get_reminder(self, reminder_id, user):
        """Получение напоминания с проверкой доступа."""
        try:
            return Reminder.objects.select_related('pet').get(
                id=reminder_id,
                user=user
            )
        except Reminder.DoesNotExist:
            return None
    
    def get(self, request, reminder_id):
        reminder = self.get_reminder(reminder_id, request.user)
        if not reminder:
            return Response(
                {'error': 'Напоминание не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({'reminder': reminder.to_dict()})
    
    def put(self, request, reminder_id):
        reminder = self.get_reminder(reminder_id, request.user)
        if not reminder:
            return Response(
                {'error': 'Напоминание не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Обновляем поля
        updatable_fields = [
            'title', 'description', 'category', 'frequency',
            'reminder_date', 'reminder_time', 'is_active',
            'notify_email', 'notify_push', 'notify_before'
        ]
        
        for field in updatable_fields:
            if field in request.data:
                setattr(reminder, field, request.data[field])
        
        reminder.save()
        
        return Response({
            'message': 'Напоминание обновлено',
            'reminder': reminder.to_dict()
        })
    
    def delete(self, request, reminder_id):
        reminder = self.get_reminder(reminder_id, request.user)
        if not reminder:
            return Response(
                {'error': 'Напоминание не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        reminder.delete()
        
        return Response({
            'message': 'Напоминание удалено'
        }, status=status.HTTP_200_OK)


class ReminderCompleteView(APIView):
    """
    Отметка напоминания как выполненного.
    POST /api/pets/reminders/<id>/complete/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, reminder_id):
        try:
            reminder = Reminder.objects.get(
                id=reminder_id,
                user=request.user
            )
        except Reminder.DoesNotExist:
            return Response(
                {'error': 'Напоминание не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        reminder.mark_completed()
        
        return Response({
            'message': 'Напоминание выполнено',
            'reminder': reminder.to_dict()
        })


class ReminderCategoriesView(APIView):
    """
    Получение списка категорий напоминаний.
    GET /api/pets/reminders/categories/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        categories = [
            {'value': choice[0], 'label': choice[1], 'icon': self.get_icon(choice[0])}
            for choice in ReminderCategory.choices
        ]
        
        frequencies = [
            {'value': choice[0], 'label': choice[1]}
            for choice in ReminderFrequency.choices
        ]
        
        return Response({
            'categories': categories,
            'frequencies': frequencies
        })
    
    @staticmethod
    def get_icon(category):
        """Получение иконки для категории."""
        icons = {
            'feeding': '🍖',
            'medication': '💊',
            'vaccination': '💉',
            'vet_visit': '🏥',
            'grooming': '✂️',
            'walk': '🚶',
            'training': '🎓',
            'hygiene': '🛁',
            'other': '📋',
        }
        return icons.get(category, '📋')


class UpcomingRemindersView(APIView):
    """
    Получение предстоящих напоминаний для дашборда.
    GET /api/pets/reminders/upcoming/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        
        today = timezone.now().date()
        
        reminders = Reminder.objects.filter(
            user=request.user,
            is_active=True,
            is_completed=False,
            reminder_date__gte=today
        ).select_related('pet').order_by('reminder_date', 'reminder_time')[:limit]
        
        # Также получаем просроченные
        overdue = Reminder.objects.filter(
            user=request.user,
            is_active=True,
            is_completed=False,
            reminder_date__lt=today
        ).select_related('pet').count()
        
        return Response({
            'reminders': [r.to_dict() for r in reminders],
            'overdue_count': overdue
        })

