from django.core.management.base import BaseCommand
from shared.scripts.create_order_inquiry_meta_data import OrderInquiryMetaData
from django.utils import timezone


class Command(BaseCommand):
    help = "add order inquiry meta details"

    def handle(self, *args, **options):
        OrderInquiryMetaData().create_order_inquiry_meta_data()
