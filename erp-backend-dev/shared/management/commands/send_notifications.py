from django.core.management.base import BaseCommand
from shared.scripts.create_email_event import EmailNotification


class Command(BaseCommand):
    help = "send user notifications"

    def handle(self, *args, **options):
        EmailNotification().process_notifications()
