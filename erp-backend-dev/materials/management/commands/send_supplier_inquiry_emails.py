from django.core.management.base import BaseCommand, CommandError
from materials.scripts import supplier_inquiry_email
from materials.models import SupplierInquiry
from materials.scripts.supplier_inquiry_email import OrderVersionSupplierInquiryEmailSender, OrderProgramSupplierInquiryEmailSender, ConsolidateSupplierInquiryEmailSender


class Command(BaseCommand):
    help = "sending_supplier_inquiry"

    def handle(self, *args, **options):

        # for inquiry in SupplierInquiry.objects.filter(
        #     email_status=SupplierInquiry.QUEUED_EMAIL,
        #     version__order__order_program__isnull=True,
        #     version__supplier_inquiries_complete=True
        # ):
        #     inquiry.email_status=SupplierInquiry.RECEIVED_AND_PROCESSED
        #     inquiry.save()

        # Handle Non program supplier inquiries
        inquiries = SupplierInquiry.objects.filter(
            email_status=SupplierInquiry.QUEUED_EMAIL,
            version__order__order_program__isnull=True,
            version__supplier_inquiries_complete=True
        ).distinct('version')

        version_ids = [inquiry.version_id for inquiry in inquiries]
        for version_id in version_ids:
            if version_id:
                OrderVersionSupplierInquiryEmailSender(version_id=version_id).send_supplier_inquiry_email()

        # Handle program supplier inquiries
        program_ids = SupplierInquiry.objects.filter(
            email_status=SupplierInquiry.QUEUED_EMAIL,
            version__order__order_program__isnull=False
        ).values_list('version__order__order_program', flat=True).distinct()

        for program_id in program_ids:
            if program_id:
                OrderProgramSupplierInquiryEmailSender(program_id=program_id).send_supplier_inquiry_email()

        #Handle consolidate supplier inquiries

        ConsolidateSupplierInquiryEmailSender().send_supplier_inquiry_email()
