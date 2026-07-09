

from django.core.management.base import BaseCommand, CommandError
from materials.scripts import supplier_inquiry_email
from materials.scripts.supplier_inquiry_email import ProcessSupplierInquiryEmail
from shared.email import read_mailbox
from shared.models import Email
from materials.scripts.supplier_po_bom_generator import *
from datetime import datetime
from io import StringIO, FileIO
from xhtml2pdf import pisa
from django.conf import settings
# import pdfkit
from django.template.loader import render_to_string
from materials.models import GenericMaterialVariation
from django.db.models import Q

class Command(BaseCommand):
    help = "Send Supplier POs"

    def handle(self, *args, **options):
        start = datetime.now()
        ActualPOBOMSupplierBOM().send_supplier_boms()
        end = datetime.now()
        # print(end - start)