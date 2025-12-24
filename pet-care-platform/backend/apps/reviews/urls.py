"""
URL маршруты для эндпоинтов отзывов и рейтингов.
"""

from django.urls import path
from .views import (
    ProductReviewsView,
    UpdateProductReviewView,
    DeleteProductReviewView,
    ProductReviewEligibilityView,
    CourseReviewsView,
    UpdateCourseReviewView,
    DeleteCourseReviewView,
    CourseReviewEligibilityView,
    RecentPurchasesForReviewView,
)

urlpatterns = [
    # Отзывы на товары
    # GET, POST /api/reviews/products/{product_id}/
    path('products/<int:product_id>/', ProductReviewsView.as_view(), name='product-reviews'),
    
    # GET /api/reviews/products/{product_id}/eligibility/
    path('products/<int:product_id>/eligibility/', ProductReviewEligibilityView.as_view(), name='product-review-eligibility'),
    
    # PUT, DELETE /api/reviews/products/{product_id}/reviews/{review_id}/
    path('products/<int:product_id>/reviews/<int:review_id>/', UpdateProductReviewView.as_view(), name='update-product-review'),
    path('products/<int:product_id>/reviews/<int:review_id>/delete/', DeleteProductReviewView.as_view(), name='delete-product-review'),
    
    # Отзывы на курсы
    # GET, POST /api/reviews/courses/{course_id}/
    path('courses/<int:course_id>/', CourseReviewsView.as_view(), name='course-reviews'),
    
    # GET /api/reviews/courses/{course_id}/eligibility/
    path('courses/<int:course_id>/eligibility/', CourseReviewEligibilityView.as_view(), name='course-review-eligibility'),
    
    # PUT, DELETE /api/reviews/courses/{course_id}/reviews/{review_id}/
    path('courses/<int:course_id>/reviews/<int:review_id>/', UpdateCourseReviewView.as_view(), name='update-course-review'),
    path('courses/<int:course_id>/reviews/<int:review_id>/delete/', DeleteCourseReviewView.as_view(), name='delete-course-review'),
    
    # Недавно приобретенные товары и курсы для отзывов
    # GET /api/reviews/recent-purchases/
    path('recent-purchases/', RecentPurchasesForReviewView.as_view(), name='recent-purchases-for-review'),
]

