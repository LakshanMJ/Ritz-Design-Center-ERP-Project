from django.core.management.base import BaseCommand, CommandError
from materials.scripts import supplier_inquiry_email
from materials.scripts.supplier_inquiry_email import ProcessSupplierInquiryEmail
from shared.email import read_mailbox
from shared.models import Email


class Command(BaseCommand):
    help = "Read emails from the inbox and store it to the email table"

    def handle(self, *args, **options):
        read_mailbox()

        # supplier_inquiry_email.read_email_body(body="email body")
        # Email.objects.filter(type=Email.EMAIL_RECEIVED).delete()
        emails = Email.objects.filter(type=Email.EMAIL_RECEIVED)
        for email in emails:
            # print(email.body)
            # break
            processor = ProcessSupplierInquiryEmail(email)
            processor.process_email()
            # email.type = Email.EMAIL_RECEIVED_PROCESSED
            # email.save()