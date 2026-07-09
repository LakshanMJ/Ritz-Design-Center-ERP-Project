from django.core.management.base import BaseCommand
from shared.scripts.create_operations import ItemOperationMetaData


class Command(BaseCommand):
    help = "add item operation details"

    def handle(self, *args, **options):
        ItemOperationMetaData().create_operations()
