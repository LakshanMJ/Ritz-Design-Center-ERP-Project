from django.core.management.base import BaseCommand, CommandError
from shared.models import Email
from marketing.scripts.send_debit_note_emails import SupplierDebitNote


class Command(BaseCommand):
    help = "Send debite note emails"

    def handle(self, *args, **options):
        supplier_debit_note = SupplierDebitNote()
        supplier_debit_note.process_debit_note(1)
        # supplier_debit_note.send_supplier_debit_note_email()