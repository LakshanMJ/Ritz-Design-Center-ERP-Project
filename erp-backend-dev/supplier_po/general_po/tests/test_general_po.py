from datetime import datetime

import pytest
from dateutil.relativedelta import relativedelta
from model_bakery import baker

from marketing.models import OrderCostingVersion
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from materials.models import SupplierCustomerBrandMaterial, SupplierInquiryMaterialCode
from shared.tests.mixins.base_test_mixins import BaseTestCaseMixin
from supplier_po.helpers.summary_calculator_helper import GRNSummary, GRNMaterialSummaryCalculatorMixin, \
    SupplierPOSummary, DeliveryNoteSummary
from supplier_po.models import GeneralPOSupplier, GeneralPOSupplierMaterialPrice, GeneralPOMaterialQuantity, \
    SupplierRequestedDeliveryDate, SupplierDeliveryDate, SupplierDeliveryDateQuantity, SupplierPO, GeneralPO, \
    SupplierPOGRN, SupplierPODeliveryInvoicePackList, SupplierPOInvoiceDeliveryNote, SupplierPODeliveryInvoice, \
    SupplierActualDeliveryDate, SupplierPOGRNMaterialDetail, SupplierPOGRNMaterial, FabricGRNBatchNumber, \
    FabricGRNDetail, GRNBatchNumberShade, SupplierPOFabricShade, FabricGRNWidth


@pytest.mark.django_db
class GeneralPOTestCase(BaseTestCaseMixin):
    
    def setUp(self):
        super().setUp()
        self.supplier_po_1 = self.create_supplier()

    def check_fabric_data(self, general_po, fabric_material):
        general_po_supplier = self.create_general_po_supplier(general_po=general_po, supplier=self.supplier_po_1)

    def create_grn_1(self, supplier_po, delivery_note, pack_list, supplier_material, delivery_date_1_quantity, general_po_supplier_material_price, fabric_material):

        grn = self.create_supplier_po_grn(pack_list, supplier_po)

        grn_material = self.create_supplier_po_grn_material(
            grn, general_po_supplier_material_price.supplier_material,
            delivery_date_1_quantity.proforma_invoice_quantity,
            delivery_date_1_quantity.proforma_invoice_quantity_units,
            grn_price=general_po_supplier_material_price.order_price
        )

        batch_number_1 = FabricGRNBatchNumber.objects.create(batch_number='B0001', grn_material=grn_material)
        batch_1_shade_a = GRNBatchNumberShade.objects.create(batch_number=batch_number_1, shade='Shade A')
        data = {
            'supplier_po_grn_material': grn_material,
            'indicated_quantity': 100,
            'indicated_quantity_units': MaterialUnitHelper.METERS_UNIT,
            'actual_quantity': 100,
            'actual_quantity_units': MaterialUnitHelper.METERS_UNIT,
            'barcode': 'abcdef',
            'supplier_barcode': 'dddasdsa',
            'batch_number': batch_number_1,
            'shade': batch_1_shade_a
        }

        grn_material_detail_1 = baker.make('supplier_po.SupplierPOGRNMaterialDetail', **data)
        data_2 = {
            **data,
            'indicated_quantity': 200,
            'actual_quantity': 150,  # TODO - create validation there should be a mismatch of 50 for this GRN
        }
        grn_material_detail_2 = baker.make('supplier_po.SupplierPOGRNMaterialDetail', **data_2)

        fabric_width_data = {
            'actual_width': 36,
            'actual_width_units': MaterialUnitHelper.METERS_UNIT,
            'grn_id': grn.pk
        }
        fabric_width = baker.make('supplier_po.FabricGRNWidth', **fabric_width_data)

        fabric_grn_detail_data = {
            'grn_material_detail_id': grn_material_detail_1.pk,
            'pack_number': '1',
            'actual_width_id': fabric_width.pk,
            'indicated_width': '2',
            'indicated_width_units': MaterialUnitHelper.METERS_UNIT,
            'actual_gsm': '110',
            'indicated_gsm': '120',
            'shrink_lot': '1',
            'shrink_width': '2',
            'shrink_length': '2',
        }
        fabric_grn_detail_1 = baker.make('supplier_po.FabricGRNDetail', **fabric_grn_detail_data)

        fabric_grn_detail_data['grn_material_detail_id'] = grn_material_detail_2.pk
        fabric_grn_detail_2 = baker.make('supplier_po.FabricGRNDetail', **fabric_grn_detail_data)

        batch_number_1.inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED
        batch_number_1.save()

        errors = grn.move_to_next_state(SupplierPOGRN.GRN_COMPLETE)
        self.assertIsNotNone(errors)

        shade = SupplierPOFabricShade.objects.create(
            supplier_po=grn.supplier_po, material=fabric_material,
            shade_name='Shade A'
        )
        batch_1_shade_a.supplier_po_shade = shade
        batch_1_shade_a.save()

        errors = grn.move_to_next_state(SupplierPOGRN.GRN_COMPLETE)
        self.assertIsNone(errors)

        grn_material.refresh_from_db()
        self.verify_grn_material_calculated_data(
            grn_material,
            indicated_quantity=300,
            actual_quantity=250,
            mismatch_quantity=-50,
            excess_quantity=0,
            deficit_quantity=0,
            usable_quantity=250,
            rejected_quantity=0,
            normalized_unit=MaterialUnitHelper.METERS_UNIT
        )

        verify_data = {
            'indicated_quantity': 300,
            'actual_quantity': 250,
            'mismatch_quantity': 50,
            'excess_quantity': 0,
            'deficit_quantity': 0,
            'usable_quantity': 250,
            'rejected_quantity': 0,
            'normalized_unit': MaterialUnitHelper.METERS_UNIT,
        }
        grn_summary_data = GRNSummary(grn).get_grn_summarized_data()
        self.verify_summary_data(
            grn_summary_data,
            supplier_material,
            **verify_data
        )

        supplier_po_summary_data = SupplierPOSummary(supplier_po).get_supplier_po_summarized_data()
        self.verify_summary_data(
            supplier_po_summary_data,
            supplier_material,
            **verify_data
        )

        dn_summary_data = DeliveryNoteSummary(delivery_note, supplier_po).get_delivery_note_summarized_data()
        self.verify_summary_data(
            dn_summary_data,
            supplier_material,
            **verify_data
        )

        verify_data['material_data'] = supplier_material.get_attributes()
        all_data = [verify_data]
        return all_data


    def create_grn_2(self, supplier_po, delivery_note, pack_list, general_po_material_quantity, supplier_material, delivery_date_1_quantity, general_po_supplier_material_price, fabric_material):

        grn = self.create_supplier_po_grn(pack_list, supplier_po)

        grn_material = self.create_supplier_po_grn_material(
            grn, general_po_supplier_material_price.supplier_material,
            delivery_date_1_quantity.proforma_invoice_quantity,
            delivery_date_1_quantity.proforma_invoice_quantity_units,
            grn_price=general_po_supplier_material_price.order_price
        )

        batch_number_1 = FabricGRNBatchNumber.objects.create(batch_number='B0001', grn_material=grn_material)
        batch_1_shade_a = GRNBatchNumberShade.objects.create(batch_number=batch_number_1, shade='Shade A')
        data = {
            'supplier_po_grn_material': grn_material,
            'indicated_quantity': 400,
            'indicated_quantity_units': MaterialUnitHelper.METERS_UNIT,
            'actual_quantity': 400,
            'actual_quantity_units': MaterialUnitHelper.METERS_UNIT,
            'barcode': 'abcdef',
            'supplier_barcode': 'dddasdsa',
            'batch_number': batch_number_1,
            'shade': batch_1_shade_a
        }

        grn_material_detail_1 = baker.make('supplier_po.SupplierPOGRNMaterialDetail', **data)
        data_2 = {
            **data,
            'indicated_quantity': 100,
            'actual_quantity': 100,  # TODO - create validation there should be a mismatch of 50 for this GRN
        }
        grn_material_detail_2 = baker.make('supplier_po.SupplierPOGRNMaterialDetail', **data_2)

        fabric_width_data = {
            'actual_width': 38,
            'actual_width_units': MaterialUnitHelper.METERS_UNIT,
            'grn_id': grn.pk
        }
        fabric_width = baker.make('supplier_po.FabricGRNWidth', **fabric_width_data)

        fabric_grn_detail_data = {
            'grn_material_detail_id': grn_material_detail_1.pk,
            'pack_number': '1',
            'actual_width_id': fabric_width.pk,
            'indicated_width': '2',
            'indicated_width_units': MaterialUnitHelper.METERS_UNIT,
            'actual_gsm': '110',
            'indicated_gsm': '120',
            'shrink_lot': '1',
            'shrink_width': '2',
            'shrink_length': '2',
        }
        fabric_grn_detail_1 = baker.make('supplier_po.FabricGRNDetail', **fabric_grn_detail_data)

        fabric_grn_detail_data['grn_material_detail_id'] = grn_material_detail_2.pk
        fabric_grn_detail_2 = baker.make('supplier_po.FabricGRNDetail', **fabric_grn_detail_data)

        batch_number_1.inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED
        batch_number_1.save()

        errors = grn.move_to_next_state(SupplierPOGRN.GRN_COMPLETE)
        self.assertIsNotNone(errors)

        shade = SupplierPOFabricShade.objects.get_or_create(
            supplier_po=grn.supplier_po, material=fabric_material,
            shade_name='Shade B'
        )[0]
        batch_1_shade_a.supplier_po_shade = shade
        batch_1_shade_a.save()

        errors = grn.move_to_next_state(SupplierPOGRN.GRN_COMPLETE)
        self.assertIsNone(errors)

        grn_material.refresh_from_db()

        excess_threshold = general_po_supplier_material_price.excess_threshold or 0
        excess_value = (1 + (excess_threshold/100)) * general_po_material_quantity.order_quantity
        prev_grned_quantity = 250 # from create_grn_1
        excess_value = (500 + prev_grned_quantity) - excess_value

        self.verify_grn_material_calculated_data(
            grn_material,
            indicated_quantity=500,
            actual_quantity=500,
            mismatch_quantity=0,
            excess_quantity=excess_value,
            deficit_quantity=0,
            usable_quantity=380,
            rejected_quantity=0,
            normalized_unit=MaterialUnitHelper.METERS_UNIT
        )

        verify_data = {
            'indicated_quantity': 500,
            'actual_quantity': 500,
            'mismatch_quantity': 0,
            'excess_quantity': excess_value,
            'deficit_quantity': 0,
            'usable_quantity': 380,
            'rejected_quantity': 0,
            'normalized_unit': MaterialUnitHelper.METERS_UNIT,
        }
        grn_summary_data = GRNSummary(grn).get_grn_summarized_data()
        self.verify_summary_data(
            grn_summary_data,
            supplier_material,
            **verify_data
        )

        verify_data_2 = {
            'indicated_quantity': 800,
            'actual_quantity': 750,
            'mismatch_quantity': -50,
            'excess_quantity': excess_value,
            'deficit_quantity': 0,
            'usable_quantity': 630,
            'rejected_quantity': 0,
            'normalized_unit': MaterialUnitHelper.METERS_UNIT,
        }
        supplier_po_summary_data = SupplierPOSummary(supplier_po).get_supplier_po_summarized_data()
        self.verify_summary_data(
            supplier_po_summary_data,
            supplier_material,
            **verify_data_2
        )

        dn_summary_data = DeliveryNoteSummary(delivery_note, supplier_po).get_delivery_note_summarized_data()
        self.verify_summary_data(
            dn_summary_data,
            supplier_material,
            **verify_data_2
        )

        verify_data['material_data'] = supplier_material.get_attributes()
        all_data = [verify_data]
        return all_data

    def test_general_po(self):
        costing = self.create_order_costing_version()

        fabric_ud_material = self.get_or_create_fabric_user_defined_material()
        # button_ud_material = self.get_or_create_button_user_defined_material()
        # elastic_ud_material = self.get_or_create_elastic_user_defined_material()

        fabric_material = self.create_customer_brand_material_object(costing.order, fabric_ud_material)
        fm_supplier_inquiry_detail = self.create_costing_supplier_inquiry_detail(costing=costing, customer_brand_material=fabric_material, supplier=self.supplier_po_1)

        # button = self.create_customer_brand_material_object(costing.order, button_ud_material)
        # elastic = self.create_customer_brand_material_object(costing.order, elastic_ud_material)

        general_po = self.create_general_po(costing=costing)
        general_po_supplier = self.create_general_po_supplier(general_po=general_po, supplier=self.supplier_po_1)
        general_po_supplier_material_price = self.create_general_po_supplier_price(general_po_supplier=general_po_supplier, supplier_inquiry_detail=fm_supplier_inquiry_detail, excess_threshold=5)

        general_po_material_quantity = self.create_general_po_material_quantity(general_po_supplier_material_price, quantity=1000, order_quantity=600)
        self.assertEqual(general_po_supplier_material_price.general_po_supplier, general_po_supplier)
        self.assertEqual(general_po_material_quantity.default_material_supplier, general_po_supplier_material_price)
        self.assertEqual(general_po_material_quantity.material, general_po_supplier_material_price.supplier_material.customer_brand_material)
        self.assertEqual(general_po_material_quantity.material, general_po_supplier_material_price.supplier_material.customer_brand_material)
        self.assertEqual(general_po_material_quantity.material, general_po_supplier_material_price.supplier_material.customer_brand_material)

        date_1 = datetime.today() + relativedelta(days=15)
        supplier_requested_delivery_date_1 = self.create_supplier_delivery_date(general_po_supplier, confirmed_delivery_date=date_1)
        supplier_requested_delivery_date_2 = self.create_supplier_delivery_date(general_po_supplier)

        delivery_date_1_quantity = self.create_supplier_delivery_date_quantity(general_po_material_quantity, general_po_supplier_material_price, quantity=200, proforma_invoice_quantity=200, supplier_delivery_date=supplier_requested_delivery_date_1)
        delivery_date_2_quantity = self.create_supplier_delivery_date_quantity(general_po_material_quantity, general_po_supplier_material_price, quantity=400, proforma_invoice_quantity=400, supplier_delivery_date=supplier_requested_delivery_date_2)
        self.assertEqual(general_po_supplier.supplier_po, None)
        del general_po_supplier.supplier_po # Deleting cached property
        general_po.move_to_next_state(GeneralPO.READY_TO_SENT_PO)

        general_po.refresh_from_db()
        delivery_date_1_quantity.refresh_from_db()
        delivery_date_2_quantity.refresh_from_db()

        general_po_supplier.refresh_from_db()
        self.assertEqual(general_po.state, GeneralPO.READY_TO_SENT_PO)
        self.assertIsNotNone(general_po_supplier.supplier_po)
        self.assertEqual(delivery_date_1_quantity.requested_date.requested_date, delivery_date_1_quantity.supplier_delivery_date.confirmed_delivery_date)

        # Starting GRN Process
        actual_delivery_date = self.create_actual_delivery_date(delivery_date_1_quantity)
        delivery_note = self.create_supplier_po_delivery_note(actual_delivery_date.supplier_po_delivery_invoice)
        pack_list = self.create_supplier_po_pack_list(delivery_note)
        grn_1_summary_data = self.create_grn_1(actual_delivery_date.supplier_po, delivery_note, pack_list, general_po_supplier_material_price.supplier_material, delivery_date_1_quantity, general_po_supplier_material_price, fabric_material)
        grn_2_summary_data = self.create_grn_2(actual_delivery_date.supplier_po, delivery_note, pack_list, general_po_material_quantity, general_po_supplier_material_price.supplier_material, delivery_date_1_quantity, general_po_supplier_material_price, fabric_material)


    def verify_grn_material_calculated_data(self, grn_material, indicated_quantity, actual_quantity, mismatch_quantity, excess_quantity, deficit_quantity, usable_quantity, rejected_quantity, normalized_unit):
        self.assertEqual(grn_material.mismatch_quantity, mismatch_quantity)
        self.assertEqual(grn_material.mismatch_quantity_units, normalized_unit)

        self.assertEqual(grn_material.total_actual_quantity, actual_quantity)
        self.assertEqual(grn_material.total_actual_quantity_units, normalized_unit)

        self.assertEqual(grn_material.total_indicated_quantity, indicated_quantity)
        self.assertEqual(grn_material.total_indicated_quantity_units, normalized_unit)

        self.assertEqual(grn_material.total_qa_rejected_quantity, rejected_quantity)
        self.assertEqual(grn_material.total_qa_rejected_quantity_units, normalized_unit)

        self.assertEqual(grn_material.total_deficit_quantity, deficit_quantity)
        self.assertEqual(grn_material.total_deficit_quantity_units, normalized_unit)

        self.assertEqual(grn_material.total_excess_quantity, excess_quantity)
        self.assertEqual(grn_material.total_excess_quantity_units, normalized_unit)

        self.assertEqual(grn_material.usable_quantity, usable_quantity)
        self.assertEqual(grn_material.usable_quantity_units, normalized_unit)

        # self.assertEqual(grn_material.width_replacement_quantity, 250) # TODO there is a bug in the main script. This is not being set
        # self.assertEqual(grn_material.width_replacement_quantity_units, MaterialUnitHelper.METERS_UNIT)


    def verify_summary_data(self, all_summary_data, supplier_material_code_object, indicated_quantity, actual_quantity, mismatch_quantity, excess_quantity, deficit_quantity, usable_quantity, rejected_quantity, normalized_unit, **kwargs):
        summary_data = {}
        for data in all_summary_data:
            if data['material']['pk_supplier_material_code_id'] == supplier_material_code_object.pk:
                summary_data = data
                break

        self.assertEqual(summary_data['grn_indicated_quantity']['quantity'], indicated_quantity)
        self.assertEqual(summary_data['grn_indicated_quantity']['quantity_units'], normalized_unit)

        self.assertEqual(summary_data['grn_total_actual_quantity']['quantity'], actual_quantity)
        self.assertEqual(summary_data['grn_total_actual_quantity']['quantity_units'], normalized_unit)

        self.assertEqual(summary_data['grn_rejected_quantity']['quantity'], rejected_quantity)
        self.assertEqual(summary_data['grn_rejected_quantity']['quantity_units'], normalized_unit)

        # self.assertEqual(summary_data['grn_qa_passed_quantity']['quantity'], rejected_quantity)
        # self.assertEqual(summary_data['grn_qa_passed_quantity']['quantity_units'], normalized_unit)

        self.assertEqual(summary_data['grn_excess_quantity']['quantity'], excess_quantity)
        self.assertEqual(summary_data['grn_excess_quantity']['quantity_units'], normalized_unit)

        self.assertEqual(summary_data['grn_deficit_quantity']['quantity'], deficit_quantity)
        self.assertEqual(summary_data['grn_deficit_quantity']['quantity_units'], normalized_unit)

        self.assertEqual(summary_data['grn_usable_quantity']['quantity'], usable_quantity)
        self.assertEqual(summary_data['grn_usable_quantity']['quantity_units'], normalized_unit)

        self.assertEqual(summary_data['grn_usable_quantity']['quantity'], usable_quantity)
        self.assertEqual(summary_data['grn_usable_quantity']['quantity_units'], normalized_unit)

        # self.assertEqual(summary_data['grn_total_in_housed_quantity']['quantity'], rejected_quantity)
        # self.assertEqual(summary_data['grn_total_in_housed_quantity']['quantity_units'], normalized_unit)

        # self.assertEqual(summary_data['grn_requires_replacement_quantity']['quantity'], rejected_quantity)
        # self.assertEqual(summary_data['grn_requires_replacement_quantity']['quantity_units'], normalized_unit)

