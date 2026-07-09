from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

import marketing.models
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from materials.models import Material
from shared.utils import get_object_or_none, get_float_or_zero, convert_quantity_to_unit, calculate_queryset_total_normalized_quantity
from datetime import date

class SupplierPOGRNModelMixin:
    def calculate_grn_summary_and_inhouse_materials(self: 'supplier_po.models.SupplierPOGRN', force_run=False):
        with transaction.atomic():
            if not self.calculated_summary or force_run:
                self.copy_materials_to_in_house_data()
                self.allocate_grn_inhoused_materials()
                self.supplier_po.copy_color_tones()
                self.copy_material_quantities()
                self.set_material_quantities()
                self.calculated_summary = True
                self.refresh_from_db()
                self.save()

    def move_to_next_state(self: 'supplier_po.models.SupplierPOGRN', new_state, user):
        from supplier_po.models import SupplierPOGRN
        errors = None
        if new_state == SupplierPOGRN.GRN_VERIFICATION:
            unit_errors = self.validate_units()
            fabric_errors = self.validate_fabrics()
            shade_erros = self.validate_shades()
            inspection_errors = self.validate_inspection()
            if unit_errors['errors'] or fabric_errors['errors'] or shade_erros['errors'] or inspection_errors['errors']:
                errors = {
                    'unit_errors': unit_errors,
                    'fabric_errors': fabric_errors,
                    'shade_errors': shade_erros,
                    'inspection_errors': inspection_errors,
                    'status': True
                }
                return errors
            else:
                self.state = SupplierPOGRN.GRN_VERIFICATION
                self.save()
                self.calculate_grn_summary_and_inhouse_materials()
                self.refresh_from_db()
                # self.copy_materials_to_in_house_data()
                # self.allocate_grn_inhoused_materials()
                # self.supplier_po.copy_color_tones()
                # self.copy_material_quantities()
                # self.set_material_quantities()
                # self.calculate_quantity_summary()
                # self.copy_material_quantities()
                # if not self.complete_date:
                #     self.complete_date = date.today()
                # self.save()
        elif new_state == SupplierPOGRN.GRN_COMPLETE:
            unit_errors = self.validate_units()
            fabric_errors = self.validate_fabrics()
            shade_erros = self.validate_shades()
            inspection_errors = self.validate_inspection()
            supplier_po_approver_users, role_errors = self.get_plant_stores_managers()
            if unit_errors['errors'] or fabric_errors['errors'] or shade_erros['errors'] or inspection_errors['errors'] or role_errors['errors']:
                errors = {
                    'unit_errors': unit_errors,
                    'fabric_errors': fabric_errors,
                    'shade_errors': shade_erros,
                    'inspection_errors': inspection_errors,
                    'role_errors': role_errors,
                    'status': True
                }
                return errors
            else:
                # self.state = SupplierPOGRN.GRN_COMPLETE
                # self.save()
                # if not self.complete_date:
                #     self.complete_date = date.today()
                # self.save()
                from shared.approvals.constants.approval_choices import GRN_APPROVAL
                self.create_approval(supplier_po_approver_users, user, GRN_APPROVAL)

        elif self.state == SupplierPOGRN.QUANTITY_VERIFICATION_STATE and (new_state == SupplierPOGRN.QA_VERIFICATION_STATE or new_state == SupplierPOGRN.GRN_COMPLETE):
            verification_errors = self.validate_fabric_verification_quantities()
            if verification_errors['errors']:
                errors = {
                    'unit_errors': verification_errors,
                    'status': True
                }
                return errors
            else:
                self.get_or_create_shrinkages()
                self.state = SupplierPOGRN.QA_VERIFICATION_STATE
                self.save()
            return errors
        elif new_state == SupplierPOGRN.QUANTITY_VERIFICATION_STATE:
            from marketing.utils.po_utils.po_processor_utils import FabricGRNDetailInspection
            unit_errors = self.validate_fabric_draft_quantities()
            fabric_grn_detail_inspection = FabricGRNDetailInspection(self)
            for material_detail in self.supplierpogrnmaterial_set.all():
                material_detail.set_material_inistial_quantity()
                material_detail.calculate_material_quantity_summary()
            fabric_grn_detail_inspection.set_inspection()
            if unit_errors['errors']:
                errors = {
                    'unit_errors': unit_errors,
                    'status': True
                }
                return errors
            else:
                self.state = new_state
                self.save()
        else:
            self.state = new_state
            self.save()
            return errors

    def get_grn_material_editable_fields(self: 'supplier_po.models.SupplierPOGRN', material):
        from materials.fieldmetadata.material_metadata import READ_ONLY_KEY, IS_VISIBLE
        from supplier_po.models import SupplierPOGRNMaterialDetail, SupplierPOGRN, FabricGRNDetail
        from materials.models import Material, UserDefinedMaterial

        # Will only be not editable in complete state
        ALWAYS_EDITABLE_FIELDS = []

        if material and (material.has_shade or material.name == Material.FABRIC_MATERIAL):
            ALWAYS_EDITABLE_FIELDS.append(
                {
                'field_name': SupplierPOGRNMaterialDetail.SHADE_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
                }
            )

        DRAFT_STATE_FIELDS = [
            {
                'field_name': SupplierPOGRNMaterialDetail.SUPPLIER_BARCODE_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.BARCODE_VALUE_KEY,
                READ_ONLY_KEY: True,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
        ]

        QUANTITY_VERIFICATION_STATE_FIELDS = [
            *[{'field_name': field['field_name'], READ_ONLY_KEY: True, IS_VISIBLE: True} for field in DRAFT_STATE_FIELDS],
            {
                'field_name': SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.ACTUAL_GRN_FIELD_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.DIAMETER_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
        ]

        QA_VERIFICATION_STATE_FIELDS = [
            *[{'field_name': field['field_name'], READ_ONLY_KEY: True, IS_VISIBLE: True} for field in QUANTITY_VERIFICATION_STATE_FIELDS],
            {
                'field_name': SupplierPOGRNMaterialDetail.QA_INSPECTION_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.SHADE_CATEGORY_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_UNITS_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
        ]

        field_mapping = {
            SupplierPOGRN.DRAFT_STATE: DRAFT_STATE_FIELDS + ALWAYS_EDITABLE_FIELDS,
            SupplierPOGRN.QUANTITY_VERIFICATION_STATE: QUANTITY_VERIFICATION_STATE_FIELDS + ALWAYS_EDITABLE_FIELDS,
            SupplierPOGRN.QA_VERIFICATION_STATE: QA_VERIFICATION_STATE_FIELDS + ALWAYS_EDITABLE_FIELDS,
            SupplierPOGRN.GRN_VERIFICATION: QA_VERIFICATION_STATE_FIELDS + ALWAYS_EDITABLE_FIELDS + QUANTITY_VERIFICATION_STATE_FIELDS,
            SupplierPOGRN.GRN_COMPLETE: [{'field_name': field, READ_ONLY_KEY: True, IS_VISIBLE: True } for field in QA_VERIFICATION_STATE_FIELDS + ALWAYS_EDITABLE_FIELDS]
        }
        return field_mapping.get(self.state, [])

    def get_grn_fabric_editable_fields(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import SupplierPOGRNMaterialDetail, FabricGRNDetail, SupplierPOGRN
        from materials.fieldmetadata.material_metadata import READ_ONLY_KEY, IS_VISIBLE

        DRAFT_STATE_FIELDS = [
            {
                'field_name': SupplierPOGRNMaterialDetail.SUPPLIER_BARCODE_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True,
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.BARCODE_VALUE_KEY,
                READ_ONLY_KEY: True,
                IS_VISIBLE: True,
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.PACK_NUMBER_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_UNITS_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.INDICATED_WIDTH_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.INDICATED_WIDTH_UNITS_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.INDICATED_GSM_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.INDICATED_WEIGHT_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.REMARKS_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
        ]


        QUANTITY_VERIFICATION_FIELDS = [
            *[{'field_name': field['field_name'], READ_ONLY_KEY: True, IS_VISIBLE: True} for field in DRAFT_STATE_FIELDS],
            {
                'field_name': FabricGRNDetail.COLOR_TONE_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.REMARKS_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            # {
            #     'field_name': FabricGRNDetail.ACTUAL_WIDTH_VALUE_KEY,
            #     READ_ONLY_KEY: False,
            #     IS_VISIBLE: True
            # },
            # {
            #     'field_name': FabricGRNDetail.ACTUAL_WIDTH_UNITS_VALUE_KEY,
            #     READ_ONLY_KEY: False,
            #     IS_VISIBLE: True
            # },
            # {
            #     'field_name': FabricGRNDetail.ACTUAL_GSM_VALUE_KEY,
            #     READ_ONLY_KEY: False,
            #     IS_VISIBLE: True
            # },
            {
                'field_name': SupplierPOGRNMaterialDetail.DIAMETER_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            }
               
        ]

        QA_VERIFICATION_STATE_FIELDS = [
            *[{'field_name': field['field_name'], READ_ONLY_KEY: True, IS_VISIBLE: True} for field in
              QUANTITY_VERIFICATION_FIELDS],
            {
                'field_name': FabricGRNDetail.SHRINK_LOT_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.SHRINK_WIDTH_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.SHRINK_LENGTH_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.ACTUAL_WIDTH_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.ACTUAL_GSM_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.QA_INSPECTION_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': FabricGRNDetail.ACTUAL_WEIGHT_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
            {
                'field_name': SupplierPOGRNMaterialDetail.SHADE_VALUE_KEY,
                READ_ONLY_KEY: False,
                IS_VISIBLE: True
            },
        ]
        field_mapping = {
            SupplierPOGRN.DRAFT_STATE: DRAFT_STATE_FIELDS,
            SupplierPOGRN.QUANTITY_VERIFICATION_STATE: QUANTITY_VERIFICATION_FIELDS,
            SupplierPOGRN.QA_VERIFICATION_STATE: QA_VERIFICATION_STATE_FIELDS,
            SupplierPOGRN.GRN_VERIFICATION: [{'field_name': field['field_name'], READ_ONLY_KEY: True, IS_VISIBLE: True} for field in
              QUANTITY_VERIFICATION_FIELDS + QA_VERIFICATION_STATE_FIELDS],
            SupplierPOGRN.GRN_COMPLETE: [{'field_name': field['field_name'], READ_ONLY_KEY: True, IS_VISIBLE: True} for field in
              QUANTITY_VERIFICATION_FIELDS]
        }
        return field_mapping.get(self.state, [])

    def get_grn_editable_fields(self, material):
        from marketing.models import Material, UserDefinedMaterial
        material_object = get_object_or_none(UserDefinedMaterial, {'name': material})
        if material == Material.FABRIC_MATERIAL:
            return self.get_grn_fabric_editable_fields()
        else:
            return self.get_grn_material_editable_fields(material_object)

    # DS Reviewed 08/01
    def get_grn_purchase_order_allocation_quantity_from_current_grn(self: 'supplier_po.models.SupplierPOGRN', purchase_order_bom, normalized_unit):
        from shared.utils import calculate_queryset_total_normalized_quantity
        from marketing.models import PurchaseOrderAllocatedMaterial
        allocations = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom=purchase_order_bom,
            in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn=self
        )
        normalized_quantity = calculate_queryset_total_normalized_quantity(allocations, normalized_unit, 'allocated_quantity', 'allocated_quantity_units')
        return normalized_quantity

    # DS Reviewed 08/01
    def sort_delivery_quantities(self: 'supplier_po.models.SupplierPOGRN', deliveries, quantity_units, material):
        data = {}
        # TODO major - add replacement quantity in here as well?
        for invoice_delivery in deliveries:
            deliveries = invoice_delivery.supplierdeliverydatequantity_set.filter(material_supplier__supplier_material=material)
            for delivery in deliveries:
                delivery_allocations = delivery.supplierdeliverydatequantitypoallocation_set.all()

                for delivery_allocation in delivery_allocations:
                    purchase_order = delivery_allocation.purchase_order

                    if not data.get(purchase_order.pk, None):
                        data[purchase_order.pk] = {
                            'purchase_order': purchase_order,
                            'quantity': 0,
                            'quantity_units': quantity_units
                        }
                    data[purchase_order.pk]['quantity'] += convert_quantity_to_unit(quantity_units, delivery_allocation.proforma_invoice_quantity, delivery_allocation.proforma_invoice_quantity_units)['quantity']
        return data.values()

    def get_allocation_quantities_for_purchase_order_material(self: 'supplier_po.models.SupplierPOGRN', quantity_units, material):
        from supplier_po.models import SupplierDeliveryDate, SupplierPOGRN, SupplierPO, SupplierPODeliveryInvoice
        commercial_invoice = self.get_invoice()
        invoice_deliveries = commercial_invoice.get_invoice_material_delivery_dates(material, self.supplier_po).order_by('confirmed_delivery_date')
        deliveries = self.sort_delivery_quantities(invoice_deliveries, quantity_units, material)

        grn_supplier_po = self.supplier_po
        if invoice_deliveries.count() > 0:
            previous_deliveries = SupplierDeliveryDate.objects.filter(general_po_supplier=grn_supplier_po.general_po_supplier, confirmed_delivery_date__lt=invoice_deliveries[0].confirmed_delivery_date)
            previous_delivery_data = self.sort_delivery_quantities(previous_deliveries, quantity_units, material)
            deliveries = [*deliveries, *previous_delivery_data]

            next_deliveries = SupplierDeliveryDate.objects.filter(general_po_supplier__supplierpo=grn_supplier_po, confirmed_delivery_date__gt=invoice_deliveries.last().confirmed_delivery_date)
            next_delivery_data = self.sort_delivery_quantities(next_deliveries, quantity_units, material)
            deliveries = [*deliveries, *next_delivery_data]
        else:
            previous_deliveries = SupplierDeliveryDate.objects.filter(
                general_po_supplier=grn_supplier_po.general_po_supplier,
            ).order_by('confirmed_delivery_date')
            previous_delivery_data = self.sort_delivery_quantities(previous_deliveries, quantity_units, material)
            deliveries = [*deliveries, *previous_delivery_data]

            # TODO major - handle processing of replacement data
            # supplier_deliveries = SupplierDeliveryDate.objects.filter(
            #     supplier_po__supplier=self.get_supplier_po_from_commercial_invoice().supplier,
            # ).order_by('confirmed_delivery_date')
            # supplier_delivery_data = self.sort_delivery_quantities(previous_deliveries, quantity_units, material)
            # deliveries = [*deliveries, *supplier_delivery_data]
        return deliveries

    # DS Reviewed 08/01
    def allocate_in_house_material(self: 'supplier_po.models.SupplierPOGRN', in_house_material):
        from marketing.models import PurchaseOrderBom
        material_helper = MaterialUnitHelper()
        normalized_unit = in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        invoice_purchase_order_allocations = self.get_allocation_quantities_for_purchase_order_material(normalized_unit, in_house_material.grn_material_detail.supplier_po_grn_material.grn_material)
        po_bom_allocated_quantity = {}
        for invoice_purchase_order_allocation in invoice_purchase_order_allocations:
            purchase_order = invoice_purchase_order_allocation['purchase_order']
            purchase_order_bom = PurchaseOrderBom.objects.get(purchase_order=purchase_order, material=in_house_material.supplier_material.customer_brand_material)
            po_bom_allocated_quantity_value = po_bom_allocated_quantity.get(purchase_order_bom.pk, 0)

            normalized_allocated_quantity = self.get_grn_purchase_order_allocation_quantity_from_current_grn(purchase_order_bom, normalized_unit)

            required_quantity = invoice_purchase_order_allocation.get('quantity', None)
            required_quantity_unit = invoice_purchase_order_allocation.get('quantity_units', None)
            normalized_required_quantity = material_helper.convert_to_units(normalized_unit, required_quantity, required_quantity_unit)
            # Add current required quantity to previous one. If not pending quantity will be wrong.
            total_normalized_required_quantity = po_bom_allocated_quantity_value + normalized_required_quantity
            po_bom_allocated_quantity[purchase_order_bom.pk] = total_normalized_required_quantity
            pending_required_quantity = total_normalized_required_quantity - normalized_allocated_quantity
            if pending_required_quantity > 0:
                in_house_material.allocate_in_house_material_to_purchase_order_bom(pending_required_quantity, normalized_unit, purchase_order_bom)

    def allocate_grn_inhoused_materials(self: 'supplier_po.models.SupplierPOGRN'):
        from shared.models import InHouseMaterial
        in_house_materials = InHouseMaterial.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn=self,
            available_quantity__gt=0
        )
        for in_house_material in in_house_materials:
            self.allocate_in_house_material(in_house_material)

    def create_inhouse_material_object(self, grn_material_detail, state, quantity, quantity_units, parent_material=None):
        from shared.models import InHouseMaterial
        material_unit = grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit

        quantity = convert_quantity_to_unit(material_unit, quantity, quantity_units)['quantity']
        in_house_material = None
        if quantity and quantity > 0:
            in_house_material, created = InHouseMaterial.objects.get_or_create(
                barcode=grn_material_detail.barcode,
                supplier_material=grn_material_detail.supplier_po_grn_material.grn_material,
                grn_material_detail=grn_material_detail,
                state=state
            )
            in_house_material.quantity = quantity
            in_house_material.quantity_units = material_unit
            in_house_material.parent_material = parent_material

            # Only gets updated when it is created, if not it will keep allocating to the same purchase order. If there is a change it has to be manually updated
            allocated_quantity = in_house_material.get_allocated_quantity()
            available_quantity_value = quantity - convert_quantity_to_unit(quantity_units, allocated_quantity['quantity'], allocated_quantity['quantity_units'])['quantity']
            if state == InHouseMaterial.ACCEPTED_STATUS and available_quantity_value > 0:
                in_house_material.available_quantity = available_quantity_value
                in_house_material.available_quantity_units = quantity_units

            try:
                fabric_grn_detail = grn_material_detail.fabricgrndetail
                in_house_material.cutting_width = fabric_grn_detail.actual_width.actual_width if fabric_grn_detail.actual_width else None
                in_house_material.cutting_width_units = fabric_grn_detail.actual_width.actual_width_units
            except ObjectDoesNotExist:
                pass
            in_house_material.save()
        return in_house_material

    # DS Reviewed 08/01
    def copy_materials_to_in_house_data(self: 'supplier_po.models.SupplierPOGRN'):
        from shared.models import InHouseMaterial
        from supplier_po.models import SupplierPOGRNMaterialDetail, FabricGRNDetail
        grn_materials = self.supplierpogrnmaterial_set.all().prefetch_related(
            'supplierpogrnmaterialdetail_set',
            'supplierpogrnmaterialdetail_set__fabricgrndetail',
        )

        for grn_material in grn_materials:
            grn_material.set_grnable_material_details()
            grn_material_details = grn_material.supplierpogrnmaterialdetail_set.all().order_by('batch_number', 'grn_quantity')
            for grn_material_detail in grn_material_details:

                if grn_material_detail.actual_quantity > 0:
                    self.create_inhouse_material_object(grn_material_detail, InHouseMaterial.ACCEPTED_STATUS, grn_material_detail.grn_quantity, grn_material_detail.grn_quantity_units)
                    self.create_inhouse_material_object(grn_material_detail, InHouseMaterial.EXCESS_STATUS, grn_material_detail.excess_quantity, grn_material_detail.excess_quantity_units)

                    if grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL:
                        fabric_grn_detail = grn_material_detail.fabricgrndetail
                        state = None
                        if fabric_grn_detail.qa_inspection_failed_reason == FabricGRNDetail.COLOR_TONE_MISMATCH:
                            state = InHouseMaterial.COLOR_TONE_REJECTION
                        elif fabric_grn_detail.qa_inspection_failed_reason in [FabricGRNDetail.BATCH_HIGH_FAILURE, FabricGRNDetail.COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE]:
                            state = InHouseMaterial.BATCH_REJECTION
                        elif fabric_grn_detail.qa_inspection_failed_reason == FabricGRNDetail.OTHER_REASON:
                            state = InHouseMaterial.OTHER_REJECTION
                        if state:
                            self.create_inhouse_material_object(grn_material_detail, state, grn_material_detail.actual_quantity, grn_material_detail.actual_quantity_units)
                    else:
                        self.create_inhouse_material_object(grn_material_detail, InHouseMaterial.OTHER_REJECTION, grn_material_detail.qa_failed_quantity, grn_material_detail.qa_failed_quantity_units)

    def validate_units(self: 'supplier_po.models.SupplierPOGRN'):
        supplier_po_grn_materials = self.supplierpogrnmaterial_set.all()

        errors = {
            'display_value': 'Unit Errors',
            'errors': []
        }
        for material in supplier_po_grn_materials:
            material_valid_units = material.grn_material.customer_brand_material.get_user_defined_material().get_material_valid_units()
            if not material.total_expected_quantity_units or material.total_expected_quantity_units not in material_valid_units:
                errors['errors'].append({
                    'id': material.id,
                    'error': 'Total expected quantity unit is not valid or not specified.'
                })
            else:
                material_details = material.get_all_material_details().values_list('actual_quantity_units', flat=True).distinct()

                for material_detail in material_details:
                    if material_detail not in material_valid_units:
                        errors['errors'].append({
                            'id': material.id,
                            'error': 'Please make sure Actual Quantity Units is valid for all of the materials.'
                        })

            # if material.total_actual_quantity_units is not None and material.total_actual_quantity_units != material_valid_units:
            #     errors['errors'].append({
            #         'id': material.id,
            #         'error': 'Total actual quantity unit is not valid or not specified.'
            #     })

        return errors
    
    def validate_fabric_draft_quantities(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import SupplierPOGRNMaterialDetail
        supplier_po_grn_materials = self.supplierpogrnmaterial_set.filter()

        errors = {
            'display_value': 'Fabric Errors',
            'errors': []
        }
        for material in supplier_po_grn_materials:
            material_details = material.supplierpogrnmaterialdetail_set.all()
            for material_detail in material_details:
                if material_detail.indicated_quantity is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Indicated quantity of barcode number ', material_detail.barcode, ' is not enteres.')
                })
                if material_detail.indicated_quantity_units is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Indicated quantity units of barcode number ', material_detail.barcode, ' is not enteres.')
                })
                if material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category==Material.FABRIC_MATERIAL:
                    if material_detail.batch_number is None:
                        errors['errors'].append({
                        'id': material_detail.id,
                        'error': '%s %s %s' % ('Batch number of barcode number ', material_detail.barcode, ' is not selected.')
                    })
                    if hasattr(material_detail, 'fabricgrndetail') and material_detail.fabricgrndetail.indicated_width is None:
                        errors['errors'].append({
                        'id': material_detail.id,
                        'error': '%s %s %s' % ('Indicated width of barcode number ', material_detail.barcode, ' is not selected.')
                    })
                    if hasattr(material_detail, 'fabricgrndetail') and material_detail.fabricgrndetail.indicated_width_units is None:
                        errors['errors'].append({
                        'id': material_detail.id,
                        'error': '%s %s %s' % ('Indicated width unit of barcode number', material_detail.barcode, ' is not selected.')
                    })
        return errors
    
    def validate_fabric_verification_quantities(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import SupplierPOGRNMaterialDetail
        supplier_po_grn_materials = self.supplierpogrnmaterial_set.filter()

        errors = {
            'display_value': 'Fabric Errors',
            'errors': []
        }
        for material in supplier_po_grn_materials:
            material_details = material.supplierpogrnmaterialdetail_set.all()
            for material_detail in material_details:
                if material_detail.actual_quantity is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Actual quantity of barcode number ', material_detail.barcode, ' is not enteres.')
                })
                if material_detail.actual_quantity_units is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Actual quantity units of barcode number ', material_detail.barcode, ' is not enteres.')
                })
                if material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category==Material.FABRIC_MATERIAL:
                    pass
                    # if hasattr(material_detail, 'fabricgrndetail') and material_detail.fabricgrndetail.actual_width is None:
                    #     errors['errors'].append({
                    #     'id': material_detail.id,
                    #     'error': '%s %s %s' % ('Actual width of barcode number ', material_detail.barcode, ' is not selected.')
                    # })
        return errors

    def validate_fabrics(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import SupplierPOGRNMaterialDetail
        supplier_po_grn_materials = self.supplierpogrnmaterial_set.filter(grn_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)

        errors = {
            'display_value': 'Fabric Errors',
            'errors': []
        }
        for material in supplier_po_grn_materials:
            material_details = material.supplierpogrnmaterialdetail_set.all()
            for material_detail in material_details:
                if material_detail.shade is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Shade of barcode number ', material_detail.barcode, ' is not selected.')
                })
                if material_detail.batch_number is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Batch number of barcode number ', material_detail.barcode, ' is not selected.')
                })
                if hasattr(material_detail, 'fabricgrndetail') and material_detail.fabricgrndetail.actual_width is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Actual width of barcode number ', material_detail.barcode, ' is not selected.')
                })
                if hasattr(material_detail, 'fabricgrndetail') and material_detail.fabricgrndetail.indicated_width is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Indicated width of barcode number ', material_detail.barcode, ' is not selected.')
                })
                if hasattr(material_detail, 'fabricgrndetail') and material_detail.fabricgrndetail.indicated_width_units is None:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Indicated width unit of barcode number', material_detail.barcode, ' is not selected.')
                })
                if material_detail.inspection_state!=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED and \
                material_detail.inspection_state != SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_COMPLETE:
                    errors['errors'].append({
                    'id': material_detail.id,
                    'error': '%s %s %s' % ('Inspection of barcode number ', material_detail.barcode, ' is not completed.')
                })
        return errors

    # def validate_shades(self: 'supplier_po.models.SupplierPOGRN'):
    #     from supplier_po.models import FabricGRNBatchNumber, GRNBatchNumberShade
    #     supplier_po_grn_materials = self.supplierpogrnmaterial_set.all()

    #     errors = {
    #         'display_value': 'Shade Errors',
    #         'errors': []
    #     }
    #     batch_numbers = FabricGRNBatchNumber.objects.filter(grn_material__in=supplier_po_grn_materials)
    #     shades = GRNBatchNumberShade.objects.filter(batch_number__in=batch_numbers)
    #     for shade in shades:
    #         if shade.supplier_po_shade is None:
    #                 errors['errors'].append({
    #                 'id': shade.id,
    #                 'error': '%s %s' % (shade.shade, ' has not map in shade group')
    #             })

    #     return errors
    
    def validate_shades(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import FabricGRNBatchNumber, GRNBatchNumberShade
        supplier_po_grn_materials = self.supplierpogrnmaterial_set.all()
        is_exist = False

        errors = {
            'display_value': 'Shade Errors',
            'errors': []
        }
        batch_numbers = FabricGRNBatchNumber.objects.filter(grn_material__in=supplier_po_grn_materials)
        grn_batch_number_shades = GRNBatchNumberShade.objects.filter(batch_number__in=batch_numbers, supplier_po_shade=None)

        for grn_batch_number_shade in grn_batch_number_shades:
            error_msg = '%s %s %s' % ( "Please map the shade ", grn_batch_number_shade.shade, " to the Shade Group")
            errors['errors'].append({"id": grn_batch_number_shade.id, "error": error_msg})
        return errors

    def validate_inspection(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import FabricGRNBatchNumber
        supplier_po_grn_materials = self.supplierpogrnmaterial_set.all()

        errors = {
            'display_value': 'Inspection Errors',
            'errors': []
        }
        batch_numbers = FabricGRNBatchNumber.objects.filter(grn_material__in=supplier_po_grn_materials)
        for batch in batch_numbers:
            if batch.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS:
                errors['errors'].append({
                    'id': batch.id,
                    'error': '%s %s' % (batch.batch_number, ' is in Inspection')
                })
        return errors

    def validate_tolerance(self: 'supplier_po.models.SupplierPOGRN', material):

        errors = {
            'display_value': 'Tolerance Errors',
            'errors': []
        }
        total_expected_quantity =  self.supplierpogrnmaterial_set.filter(grn_material=material)
        total_actual_quantity_total = self.supplierpogrnmaterial_set.filter(grn_material=material)

        if total_expected_quantity and total_actual_quantity_total:
            total_quantity_with_tolerance = total_expected_quantity * 1.05
            if total_quantity_with_tolerance < total_actual_quantity_total:
                errors['errors'].append({
                    'id': material.id,
                    'error': '%s %s' % (material.grn_material.verbose_reference_code, ' is exceed 5% Tolerance')
                })
        return errors

    def get_type_of_garment(self: 'supplier_po.models.SupplierPOGRN'):
        from marketing.models import PackItemService
        costing_version = self.supplier_po.general_po_supplier.general_po.costing
        is_wash_garment = PackItemService.objects.filter(
            service_type=PackItemService.WASH_SERVICE_TYPE, pack_item__pack__version=costing_version
        ).exists()
        return is_wash_garment

    def get_roll_details(self: 'supplier_po.models.SupplierPOGRN', material):
        from supplier_po.models import SupplierPOGRNMaterialDetail
        materil_details_id_list = []
        is_wash_garment = self.get_type_of_garment()
        if is_wash_garment:
            materil_details_id_list = material.supplierpogrnmaterialdetail_set.all()
            return materil_details_id_list
        else:
            batches = material.fabricgrnbatchnumber_set.all()
            for batch in batches:
                first_material_detail = SupplierPOGRNMaterialDetail.objects.filter(batch_number=batch).exclude(
                    inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED
                ).first()
                if first_material_detail:
                    materil_details_id_list.append(first_material_detail)
            return materil_details_id_list

    def get_or_create_shrinkages(self: 'supplier_po.models.SupplierPOGRN'):
        from supplier_po.models import SupplierPOMaterialShrinkage, SupplierPOShrinkageValue
        from materials.models import Material
        materials = self.supplierpogrnmaterial_set.filter(
            grn_material__customer_brand_material__material_code__material_definition__user_material__name=Material.FABRIC_MATERIAL
        )
        for material in materials:
            material_details = self.get_roll_details(material)
            shrinkage, created = SupplierPOMaterialShrinkage.objects.get_or_create(
                supplier_po=self.supplier_po,
                supplier_material=material.grn_material
            )
            for material_detail in material_details:
                shrinkage_value = SupplierPOShrinkageValue.objects.get_or_create(
                    supplier_po_shrinkage=shrinkage,
                    grn_material_detail=material_detail,
                    shrinkage_unit=MaterialUnitHelper.INCHES_UNIT
                )

    def set_material_quantities(self: 'supplier_po.models.SupplierPOGRN'):
        grn_materials = self.supplierpogrnmaterial_set.filter()
        for grn_material in grn_materials:
            grn_material.set_material_quantities()

    def copy_material_quantities(self: 'supplier_po.models.SupplierPOGRN'):
        grn_materials = self.supplierpogrnmaterial_set.filter()
        for grn_material in grn_materials:
            if not grn_material.calculated_value_status:
                data = {
                    'total_expected_quantity': grn_material.total_expected_quantity,
                    'total_expected_quantity_units': grn_material.total_expected_quantity_units,
                    'total_expected_quantity_units_display_value': grn_material.get_total_expected_quantity_units_display(),
                    'grn_price': grn_material.grn_price,
                    'total_price': grn_material.total_price,
                    'total_actual_quantity': grn_material.total_actual_quantity,
                    'total_actual_quantity_units': grn_material.total_actual_quantity_units,
                    'total_actual_quantity_units_display_value': grn_material.get_total_actual_quantity_units_display(),
                    'total_qa_rejected_quantity': grn_material.total_qa_rejected_quantity,
                    'total_qa_rejected_quantity_units': grn_material.total_qa_rejected_quantity_units,
                    'total_qa_rejected_quantity_units_display_value': grn_material.get_total_qa_rejected_quantity_units_display(),
                    'total_indicated_quantity': grn_material.total_indicated_quantity,
                    'total_indicated_quantity_units': grn_material.total_indicated_quantity_units,
                    'total_indicated_quantity_units_display_value': grn_material.get_total_indicated_quantity_units_display(),
                    'total_excess_quantity': grn_material.total_excess_quantity,
                    'total_excess_quantity_units': grn_material.total_excess_quantity_units,
                    'total_excess_quantity_units_display_value': grn_material.get_total_excess_quantity_units_display(),
                    'total_deficit_quantity': grn_material.total_deficit_quantity,
                    'total_deficit_quantity_units': grn_material.total_deficit_quantity_units,
                    'total_deficit_quantity_units_display_value': grn_material.get_total_deficit_quantity_units_display(),
                    'usable_quantity': grn_material.usable_quantity,
                    'usable_quantity_units': grn_material.usable_quantity_units,
                    'usable_quantity_units_display_value': grn_material.get_usable_quantity_units_display(),
                    'mismatch_quantity': grn_material.mismatch_quantity,
                    'mismatch_quantity_units': grn_material.mismatch_quantity_units,
                    'mismatch_quantity_units_display_value': grn_material.get_mismatch_quantity_units_display(),
                    'width_replacement_quantity': grn_material.width_replacement_quantity,
                    'width_replacement_quantity_units': grn_material.width_replacement_quantity_units,
                    'width_replacement_quantity_units_display_value': grn_material.get_width_replacement_quantity_units_display(),
                }
                grn_material.calculated_values = data
                grn_material.calculated_value_status = True
                grn_material.save()
            
    def get_material_allocation_by_purchase_order(self: 'supplier_po.models.SupplierPOGRN', customer_brand_material):
        from marketing.models import PurchaseOrderAllocatedMaterial, CustomerBrandMaterial
        allocations = PurchaseOrderAllocatedMaterial.objects.filter(
            in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn=self,
            purchase_order_bom__material=customer_brand_material
        ).prefetch_related(
            'purchase_order_bom__purchase_order'
        )
        user_defined_material = customer_brand_material.get_user_defined_material()
        mh = MaterialUnitHelper()
        normalized_unit = mh.get_normalized_unit_based_on_category(user_defined_material.consumption_measurement_unit)

        po_allocations = {}

        for allocation in allocations:

            if not po_allocations.get(allocation.purchase_order_bom.purchase_order_id, None):
                po_allocations[allocation.purchase_order_bom.purchase_order_id] = {
                    'id': allocation.purchase_order_bom.purchase_order_id,
                    'po_number': allocation.purchase_order_bom.ritz_code,
                    'quantity': 0,
                    'quantity_units': normalized_unit,
                }
            allocated_quantity = allocation.normalized_allocated_quantity
            allocated_quantity_unit = allocation.normalized_allocated_quantity_unit
            value = mh.convert_to_units(normalized_unit, allocated_quantity, allocated_quantity_unit)
            po_allocations[allocation.purchase_order_bom.purchase_order_id]['quantity'] += value

        return po_allocations.values()
    
    def get_plant(self: 'supplier_po.models.SupplierPOGRN'):
        return self.supplier_po.plant
    
    def get_plant_stores_managers(self: 'supplier_po.models.SupplierPOGRN'):
        from shared.models import Role
        from shared.approvals.constants.approval_choices import GRN_APPROVAL
        from shared.permissions.roles import GRN_APPROVER
        errors = {
            'display_value': 'Missing approval users Errors',
            'errors': []
        }
        plant = self.get_plant()
        plant_users = plant.get_plant_users()
        role = Role.objects.get(name=GRN_APPROVER)
        print(role, plant_users)
        supplier_po_approver_users = plant_users.filter(id__in=role.users.all().values_list('id', flat=True))
        if not supplier_po_approver_users.exists():
            errors['errors'].append({
                'id': self.id,
                'error': 'No approver user found, please contact admin'
            })
        return supplier_po_approver_users, errors

