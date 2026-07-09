

from django.core.management.base import BaseCommand, CommandError

from shared.email import send_email
from shared.scripts.create_supplier_list import SuppplierListProcessor
from django.utils import timezone


class Command(BaseCommand):
    help = "add supplier details"

    def handle(self, *args, **options):

        email_body= '''
       
                '''

        send_email(to=['dasith2190@gmail.com'], cc=[], subject='Test email',
                   body=email_body, attachments=[])