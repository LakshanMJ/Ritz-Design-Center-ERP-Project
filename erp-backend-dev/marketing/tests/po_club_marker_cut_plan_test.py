from shared.tests.mixins.base_test_mixins import BaseTestCaseMixin
from marketing.models import ActualPOClub
from supplier_po.models import SupplierPOGRNMaterial, GRNBatchNumberShade, FabricGRNBatchNumber
import pytest

@pytest.mark.django_db
class MarkerCutPlanTestCase(BaseTestCaseMixin):

    def setUp(self):
        super().setUp()
        
    
    def test_marker_cut_plan(self):
        # supplier_po_1 = self.create_supplier()
        # costing = self.create_order_costing_version()
        # fabric_ud_material = self.get_or_create_fabric_user_defined_material()
        # fabric_material = self.create_customer_brand_material_object(costing.order, fabric_ud_material)
        # fm_supplier_inquiry_detail = self.create_costing_supplier_inquiry_detail(costing=costing, customer_brand_material=fabric_material, supplier=supplier_po_1)
        # po_club = self.create_po_club()
        po_club = ActualPOClub.objects.get(pk=114)
        costing = po_club.get_costing()
        purchase_order = self.create_purchase_order(actual_po_club=po_club, costing_version=costing)
        general_po = self.create_general_po(costing=costing, po_club=po_club)

        # grn_price
        # expected_quantity_units
        # expected_quantity
        # supplier_inquiry_material_code
        # general_po_supplier = self.create_general_po_supplier()
        # supplier_po = self.create_supplier_po(general_po_supplier)
        # commercial_invoice = self.create_supplier_po_delivery_invoice()
        # delivery_note = self.create_supplier_po_delivery_note(commercial_invoice)
        # pack_list = self.create_supplier_po_pack_list(delivery_note)
        # supplier_po_grn = self.create_supplier_po_grn(pack_list, supplier_po)
        # self.create_supplier_po_grn_material(supplier_po_grn, supplier_inquiry_material_code, expected_quantity, expected_quantity_units, grn_price)
        supplier_po_grn_material = SupplierPOGRNMaterial.objects.get(pk=174)
        batch_number = FabricGRNBatchNumber.objects.get(pk=28)
        shade = GRNBatchNumberShade.objects.get(pk=28)
        supplier_po_grn_material_detail = self.create_supplier_po_grn_material_detail(supplier_po_grn_material, batch_number, shade)


marker_cut_plan_test_case = MarkerCutPlanTestCase()
marker_cut_plan_test_case.test_marker_cut_plan()
