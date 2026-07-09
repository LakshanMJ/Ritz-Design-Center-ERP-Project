from django.core.management.base import BaseCommand, CommandError
from shared.scripts.create_supplier_list import SuppplierListProcessor
from django.utils import timezone


class Command(BaseCommand):
    help = "add supplier details"

    def handle(self, *args, **options):
        SuppplierListProcessor().create_suppliers()
