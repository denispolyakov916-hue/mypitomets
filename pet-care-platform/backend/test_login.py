#!/usr/bin/env python
"""
Test script to debug login issues
"""
import os
import sys
import traceback

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from apps.users.services.user_service import UserService
from apps.users.services.token_service import TokenService

User = get_user_model()

def test_login():
    print("=" * 60)
    print("Testing Login Functionality")
    print("=" * 60)
    
    # Find a test admin user
    test_emails = [
        'testadmin@test.com',
        'admin@example.com',
        'admin@admin.com',
        'admin@pitomets.ru'
    ]
    
    test_user = None
    for email in test_emails:
        try:
            user = User.objects.get(email=email)
            print(f"Found user: {email}")
            print(f"  - is_active: {user.is_active}")
            print(f"  - is_activated: {user.is_activated}")
            print(f"  - is_staff: {user.is_staff}")
            print(f"  - is_superuser: {user.is_superuser}")
            print(f"  - has password: {bool(user.password)}")
            test_user = user
            break
        except User.DoesNotExist:
            print(f"User {email} not found")
    
    if not test_user:
        print("No test user found! Creating one...")
        try:
            test_user = User.objects.create_user(
                email='test@login.com',
                password='test123',
                is_staff=True,
                is_superuser=True,
                is_active=True,
                is_activated=True
            )
            print(f"Created test user: test@login.com")
        except Exception as e:
            print(f"Failed to create user: {e}")
            return
    
    # Test password check
    print("\n--- Testing password check ---")
    test_password = 'admin123'  # Common test password
    password_ok = test_user.check_password(test_password)
    print(f"Password check for '{test_password}': {password_ok}")
    
    if not password_ok:
        print("Setting new password...")
        test_user.set_password(test_password)
        test_user.is_activated = True  # Ensure activated
        test_user.save()
        print("Password updated")
        password_ok = test_user.check_password(test_password)
        print(f"Password check after update: {password_ok}")
    
    # Test token generation
    print("\n--- Testing token generation ---")
    try:
        tokens = TokenService.generate_tokens(test_user)
        print(f"Access token generated: {tokens['accessToken'][:50]}...")
        print(f"Refresh token generated: {tokens['refreshToken'][:50]}...")
    except Exception as e:
        print(f"Token generation FAILED: {e}")
        traceback.print_exc()
        return
    
    # Test to_dict
    print("\n--- Testing to_dict ---")
    try:
        user_dict = test_user.to_dict()
        print(f"to_dict result: {user_dict}")
    except Exception as e:
        print(f"to_dict FAILED: {e}")
        traceback.print_exc()
        return
    
    # Test full login service
    print("\n--- Testing full login service ---")
    try:
        result = UserService.login(test_user.email, test_password)
        print(f"Login SUCCESS!")
        print(f"  - accessToken: {result['accessToken'][:50]}...")
        print(f"  - refreshToken: {result['refreshToken'][:50]}...")
        print(f"  - user: {result['user']}")
    except Exception as e:
        print(f"Login FAILED: {e}")
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test complete")
    print("=" * 60)

if __name__ == '__main__':
    test_login()

