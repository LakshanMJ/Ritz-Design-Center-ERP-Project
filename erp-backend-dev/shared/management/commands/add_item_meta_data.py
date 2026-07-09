from django.core.management.base import BaseCommand
from shared.scripts.create_item_meta_data import ItemMetaData


class Command(BaseCommand):
    help = "add item and item attributes meta details"

    def handle(self, *args, **options):
        ItemMetaData().create_item_meta_data()
