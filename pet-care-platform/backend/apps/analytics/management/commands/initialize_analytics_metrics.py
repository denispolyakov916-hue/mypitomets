"""
Management command for initializing base analytics metrics.

Usage: python manage.py initialize_analytics_metrics
"""

from django.core.management.base import BaseCommand
from apps.analytics.services import AnalyticsMetricsInitializer


class Command(BaseCommand):
    """Initialize base analytics metrics."""

    help = 'Initialize base analytics metrics for the system'

    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(
            self.style.SUCCESS('Initializing analytics metrics...')
        )

        try:
            initializer = AnalyticsMetricsInitializer()
            initializer.initialize_base_metrics()

            self.stdout.write(
                self.style.SUCCESS('Successfully initialized analytics metrics')
            )

        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Error initializing metrics: {e}')
            )
            raise
