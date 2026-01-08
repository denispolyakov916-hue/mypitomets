class CourseRatingsView(APIView):
    """
    Оценки курса.

    GET /api/courses/{id}/ratings/ - получить оценки
    POST /api/courses/{id}/ratings/ - поставить оценку
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        ratings = Rating.objects.filter(
            course=course,
            is_approved=True
        ).select_related('user', 'pet').order_by('-created_at')

        ratings_data = []
        for rating in ratings:
            rating_data = {
                'id': str(rating.id),
                'user': {
                    'id': rating.user.id,
                    'username': rating.user.first_name or rating.user.email.split('@')[0],
                },
                'rating': rating.rating,
                'review': rating.review,
                'pet_name': rating.pet.name if rating.pet else None,
                'created_at': rating.created_at.isoformat(),
            }
            ratings_data.append(rating_data)

        # Статистика рейтингов
        from django.db.models import Avg, Count
        stats = ratings.aggregate(
            avg_rating=Avg('rating'),
            total_ratings=Count('id')
        )

        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = ratings.filter(rating=i).count()

        return Response({
            'ratings': ratings_data,
            'stats': {
                'average_rating': round(stats['avg_rating'], 1) if stats['avg_rating'] else 0,
                'total_ratings': stats['total_ratings'],
                'distribution': rating_distribution,
            }
        }, status=status.HTTP_200_OK)

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Проверка, что пользователь имеет доступ к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        rating_value = request.data.get('rating')
        if not rating_value or not isinstance(rating_value, int) or rating_value < 1 or rating_value > 5:
            return Response(
                {'error': 'Оценка должна быть целым числом от 1 до 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review_text = request.data.get('review', '').strip()
        pet_id = request.data.get('pet_id')

        # Проверка, не ставил ли уже оценку
        existing_rating = Rating.objects.filter(
            user=request.user,
            course=course,
            pet_id=pet_id
        ).first()

        if existing_rating:
            # Обновляем существующую оценку
            existing_rating.rating = rating_value
            existing_rating.review = review_text
            existing_rating.save()
            message = 'Оценка обновлена'
        else:
            # Создаем новую оценку
            pet = None
            if pet_id:
                try:
                    pet = Pet.objects.get(id=pet_id, owner=request.user)
                except Pet.DoesNotExist:
                    pass

            Rating.objects.create(
                user=request.user,
                course=course,
                rating=rating_value,
                review=review_text,
                pet=pet
            )
            message = 'Оценка добавлена'

        return Response({
            'message': message,
            'rating': rating_value,
            'review': review_text,
        }, status=status.HTTP_201_CREATED)


# ===== ВЬЮСЫ ДЛЯ КОММЕНТАРИЕВ =====

