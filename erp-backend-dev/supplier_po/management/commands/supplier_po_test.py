from django.core.management.base import BaseCommand, CommandError
from materials.scripts import supplier_inquiry_email
from materials.scripts.supplier_inquiry_email import ProcessSupplierInquiryEmail
from shared.email import read_mailbox
from shared.models import Email
from supplier_po.helpers.supplier_po_bom_generator import SupplierPOBOM
from supplier_po.models import GeneralPO, SupplierInquiryDetail, SupplierPO, SupplierPOGRN
from marketing.models import ActualPOClub, ItemColorwayCategoryFabricConsumptionRatio
from shared.utils import get_object_or_none


class Command(BaseCommand):
    help = "supplier po test"
    
    def handle(self, *args, **options):
        from supplier_po.helpers.general_po_processor import GeneralPOBOM
        supplier_po_bom = SupplierPOBOM()
        supplier_po_bom.process_boms(ActualPOClub.objects.get(pk=105))
        # print(SupplierPO.objects.get(pk=1).supplier_po_file.file_path)

        # general_po = GeneralPO.objects.get(pk=6)
        # supplier_pos = SupplierPO.objects.filter(general_po_supplier__general_po=general_po)
        # for supplier_po in supplier_pos:

        # general_po_bom = GeneralPOBOM(GeneralPO.objects.get(pk=7))
        # general_po_bom.create_general_po_bom()