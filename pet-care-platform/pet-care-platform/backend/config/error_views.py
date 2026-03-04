"""
Обработчики ошибок для Django

Кастомные страницы ошибок для кодов 400, 403, 404, 500.
"""

from django.shortcuts import render


def bad_request(request, exception):
    """
    Обработчик ошибки 400 - Неверный запрос
    
    Args:
        request: HTTP запрос
        exception: Исключение, вызвавшее ошибку
    
    Returns:
        HttpResponse: Ответ с шаблоном ошибки 400
    """
    return render(request, 'errors/400.html', status=400)


def permission_denied(request, exception):
    """
    Обработчик ошибки 403 - Доступ запрещён
    
    Args:
        request: HTTP запрос
        exception: Исключение, вызвавшее ошибку
    
    Returns:
        HttpResponse: Ответ с шаблоном ошибки 403
    """
    return render(request, 'errors/403.html', status=403)


def page_not_found(request, exception):
    """
    Обработчик ошибки 404 - Страница не найдена
    
    Args:
        request: HTTP запрос
        exception: Исключение, вызвавшее ошибку
    
    Returns:
        HttpResponse: Ответ с шаблоном ошибки 404
    """
    return render(request, 'errors/404.html', status=404)


def server_error(request):
    """
    Обработчик ошибки 500 - Внутренняя ошибка сервера
    
    Args:
        request: HTTP запрос
    
    Returns:
        HttpResponse: Ответ с шаблоном ошибки 500
    """
    return render(request, 'errors/500.html', status=500)
