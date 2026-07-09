from datetime import datetime

import marketing.models
from marketing.exceptions.po_exceptions import POMaterialMismatchException
from materials.fieldmetadata.measuring_unit_helpers import PerMeasuringUnitHelper, MaterialUnitHelper
from shared.utils import is_none
from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary
from materials.models import FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES

class PurchaseOrderBOMModelMixin:
    def get_standardized_order_quantity(self: 'marketing.models.PurchaseOrderBom'):
        material_quantity = self.order_quantity
        quantity_units = self.measuring_unit
        material_helper = MaterialUnitHelper()

        if not is_none(self.order_quantity):
            unit_conversion = 1
            if self.measuring_unit in MaterialUnitHelper.LENGTH_UNITS:
                unit_conversion = material_helper.get_meter_conversion_amount(self.measuring_unit)
                quantity_units = MaterialUnitHelper.METERS_UNIT

            if not is_none(self.order_quantity):
                material_quantity = self.order_quantity * unit_conversion
        data = {
            'quantity': material_quantity,
            'quantity_units': quantity_units,
        }
        return data


class PurchaseOrderModelMixin:

    def set_ritz_purchase_order_number(self: 'marketing.models.PurchaseOrder'):
        date_string = datetime.today().strftime('%d/%m/%Y')
        po_number = f'PO{self.pk} / {date_string}'
        self.ritz_po_number = po_number
        self.save()

    def get_purchase_order_display_name(self: 'marketing.models.PurchaseOrder'):
        return self.name

    def validate_po_items(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import POItem, ActualPOClub,ActualPOClubItem

        # order_items = self.costing_version.order.get_order_items()

        # for order_item in order_items:
        #     POItem.objects.get_or_create(purchase_order=self, order_item=order_item)
        self.actual_po_club.validate_po_club_items()
        po_club_items = self.actual_po_club.get_actual_po_club_items()
        for po_club_item in po_club_items:
            POItem.objects.get_or_create(
                purchase_order=self,
                po_club_item=po_club_item,
                order_item=po_club_item.pre_costing_order_item
            )

    def get_po_colorways(self: 'marketing.models.PurchaseOrder'):
        return self.pocolorway_set.all()

    def get_po_items(self: 'marketing.models.PurchaseOrder'):
        return self.poitem_set.all()

    def get_po_countries(self: 'marketing.models.PurchaseOrder'):
        return self.pocountry_set.all()

    def get_po_sizes(self: 'marketing.models.PurchaseOrder'):
        return self.posize_set.all()

    def get_po_packs(self: 'marketing.models.PurchaseOrder'):
        return self.popack_set.all()

    def validate_mappings(self: 'marketing.models.PurchaseOrder'):
        has_invalid_po_cws = self.get_po_colorways().filter(order_colorway__isnull=True).exists()
        has_invalid_po_sizes = self.get_po_sizes().filter(order_size__isnull=True).exists()
        has_invalid_po_countries = self.get_po_countries().filter(order_country__isnull=True).exists()
        valid = True
        if has_invalid_po_sizes or has_invalid_po_cws or has_invalid_po_countries:
            valid = False
        return valid

    def validate_po_materials_assigned(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import POPackItem
        is_reviewed = True
        po_packs = self.get_po_packs().filter(po_materials_reviewed=False)
        po_pack_items = POPackItem.objects.filter(po_pack__in=po_packs, po_materials_reviewed=False)
        if po_packs.exists() or po_pack_items.exists():
            is_reviewed = False
        else:
            is_reviewed = True
        return is_reviewed  # TODO major - check if materials assigned everywhere

    def validate_po_club_completed(self: 'marketing.models.PurchaseOrder'):
        return self.uploaded_purchase_order.clubbing_complete
    
    def copy_packaging_instruction_from_costing(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import PurchaseOrderPackaging, PurchaseOrderPackagingInstruction, PurchaseOrderPackagingInstructionOrderPack, POPack
        pack_packagings = self.costing_version.get_pack_packagings()
        for pack_packaging in pack_packagings:
            po_packging, created = PurchaseOrderPackaging.objects.get_or_create(
                purchase_order=self
            )
            pack_instructions = pack_packaging.packinstruction_set.all()
            for pack_instruction in pack_instructions:
                po_pack_instruction, created = PurchaseOrderPackagingInstruction.objects.get_or_create(
                    po_pack_packaging=po_packging,
                    carton=pack_instruction.carton
                )
                pack_instruction_order_packs = pack_instruction.packinstructionorderpack_set.all()
                for pack_instruction_order_pack in pack_instruction_order_packs:
                    po_packs = POPack.objects.filter(order_pack=pack_instruction_order_pack.order_pack, purchase_order=self)
                    if po_packs:
                        for po_pack in po_packs:
                            po_pack_instruction_pack, created = PurchaseOrderPackagingInstructionOrderPack.objects.get_or_create(
                                po_pack_instruction=po_pack_instruction,
                                po_pack=po_pack,
                                quantity=pack_instruction_order_pack.quantity,
                                ratio=pack_instruction_order_pack.ratio
                            )

    def copy_packaging_instruction_from_purchase_order(self: 'marketing.models.PurchaseOrder', from_purchase_order):
        from marketing.models import PurchaseOrderPackaging, PurchaseOrderPackagingInstruction, PurchaseOrderPackagingInstructionOrderPack, POPack
        if hasattr(from_purchase_order, 'purchaseorderpackaging'):
            from_po_packaging = from_purchase_order.purchaseorderpackaging
            po_packging, created = PurchaseOrderPackaging.objects.get_or_create(
                purchase_order=self
            )
            from_pack_instructions = from_po_packaging.purchaseorderpackaginginstruction_set.all()
            for from_pack_instruction in from_pack_instructions:
                po_pack_instruction, created = PurchaseOrderPackagingInstruction.objects.get_or_create(
                    po_pack_packaging=po_packging,
                    carton=from_pack_instruction.carton
                )
                from_pack_instruction_order_packs = from_pack_instruction.purchaseorderpackaginginstructionorderpack_set.all()
                for  from_pack_instruction_order_pack in from_pack_instruction_order_packs:
                    po_packs = POPack.objects.filter(
                        purchase_order=self,
                        po_country__order_country=from_pack_instruction_order_pack.po_pack.po_country.order_country,
                        po_size__order_size=from_pack_instruction_order_pack.po_pack.po_size.order_size,
                        po_colorway__order_colorway=from_pack_instruction_order_pack.po_pack.po_colorway.order_colorway
                    )
                    if po_packs:
                        for po_pack in po_packs:
                            po_pack_instruction_pack, created = PurchaseOrderPackagingInstructionOrderPack.objects.get_or_create(
                                po_pack_instruction=po_pack_instruction,
                                po_pack=po_pack,
                                quantity=from_pack_instruction_order_pack.quantity,
                                ratio=from_pack_instruction_order_pack.ratio
                        )

    def move_to_next_state(self: 'marketing.models.PurchaseOrder', new_state):
        errors = []
        if new_state == self.MAPPINGS_COMPLETE and self.state == self.OPEN: #TODO ask dasith sir this is ok old value is if new_state == self.MAPPINGS_COMPLETE and self.state == self.OPEN:
            if self.validate_mappings():
                # if not self.mappings_created:
                self.state = self.MAPPINGS_COMPLETE
                #self.finalize_po_packs_and_create_dependencies()  # Will create the pack items, placements etc
                #self.copy_packaging_instructions()
                self.mappings_created = True
            else:
                errors.append(
                    "Please map purchase order Countries, Colorways and Sizes with costing Countries, Colorways and Sizes")
        elif new_state == self.MATERIALS_ASSIGNED:
            is_material_assigned = self.validate_po_materials_assigned()
            is_club_completed = self.validate_po_club_completed()
            # print(is_material_assigned, is_club_completed, "is_material_assigned, is_club_completed")
            if is_material_assigned and is_club_completed:
                self.state = self.MATERIALS_ASSIGNED
            else:
                if not is_material_assigned:
                    errors.append("Please make sure that materials are assigned")
                if not is_club_completed:
                    errors.append("Please make sure that club is completed")
        else:
            valid_states = [state[0] for state in self.STATE_CHOICE]

            if new_state in valid_states:
                self.state = new_state
                self.save()
            else:
                errors.append("Invalid state")

        response = {'valid': True}
        if errors:
            response = {'valid': False, 'errors': errors}
        else:
            self.save()

        return response

    def create_colorway_country_combined_placement_data(self: 'marketing.models.PurchaseOrder'):
        from marketing.model_utils.po_pack_material_utils import POPackItemColorwayCountryPlacementBuilder, POPackColorwayCountryPlacementBuilder
        POPackItemColorwayCountryPlacementBuilder(self).create_colorway_country_item_placement_data()
        POPackColorwayCountryPlacementBuilder(self).create_colorway_country_placement_data()

    def create_po_colorway_items(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import POColorwayItem
        po_colorways = self.get_po_colorways()
        po_items = self.get_po_items()
        for po_colorway in po_colorways:
            for po_item in po_items:
                POColorwayItem.objects.get_or_create(po_colorway=po_colorway, po_item=po_item)

    def create_po_embelishment_service_data(self: 'marketing.models.PurchaseOrder', po_pack_items):
        from marketing.models import PackItemEmbellishmentService, POEmbellishmentServiceDetail, POPackItemEmbellishmentService
        for po_pack_item in po_pack_items:
            pack_item_embellishments = PackItemEmbellishmentService.objects.filter(
                pack_item=po_pack_item.order_pack_item)
            for pack_item_embellishment in pack_item_embellishments:
                po_embellishment_service_detail, created = POEmbellishmentServiceDetail.objects.get_or_create(
                    purchase_order=self,
                    sub_type=pack_item_embellishment.embellishment_detail.sub_type,
                    grading=pack_item_embellishment.embellishment_detail.grading,
                    embellishment_attachment=pack_item_embellishment.embellishment_detail.embellishment_attachment)
                po_embellishment_service_detail.costing_embellishment_service_detail = pack_item_embellishment.embellishment_detail
                po_embellishment_service_detail.save()
                po_pack_item_embellishment_service, created = POPackItemEmbellishmentService.objects.get_or_create(
                    embellishment_detail=po_embellishment_service_detail,
                    po_pack_item=po_pack_item,
                    service_type=pack_item_embellishment.service_type,
                    size=po_pack_item.po_pack.po_size.po_size_name,
                    pack_item_embellishment_attachment=pack_item_embellishment.pack_item_embellishment_attachment
                )
                po_pack_item_embellishment_service.costing_po_pack_item_service = pack_item_embellishment
                po_pack_item_embellishment_service.save()

    def create_po_wash_service_data(self: 'marketing.models.PurchaseOrder', po_pack_items):
        from marketing.models import PackItemWashService, POPackItemWashService
        for po_pack_item in po_pack_items:
            pack_item_wash_services = PackItemWashService.objects.filter(pack_item=po_pack_item.order_pack_item)
            for pack_item_wash_service in pack_item_wash_services:
                po_pack_item_wash_service, created = POPackItemWashService.objects.get_or_create(
                    po_pack_item=po_pack_item,
                    service_type=pack_item_wash_service.service_type,
                    technique=pack_item_wash_service.technique,
                    wash_service_attachment=pack_item_wash_service.wash_service_attachment
                )
                po_pack_item_wash_service.costing_po_pack_item_service = pack_item_wash_service
                po_pack_item_wash_service.save()

    def create_po_operation_data(self: 'marketing.models.PurchaseOrder', po_pack_items):
        from marketing.models import OrderItemColorwayOperation, POPackItemOperation
        for po_pack_item in po_pack_items:
            order_item_operations = OrderItemColorwayOperation.objects.filter(colorway_item_category__item=po_pack_item.order_pack_item.item)
            for order_item_operation in order_item_operations:
                po_pack_item_operation, created = POPackItemOperation.objects.get_or_create(
                    costing_colorway_item_operation=order_item_operation,
                    po_pack_item=po_pack_item,
                )
                po_pack_item_operation.display_order=order_item_operation.display_order
                po_pack_item_operation.actual_smv=order_item_operation.factory_smv
                po_pack_item_operation.operation_name = order_item_operation.operation_name
                po_pack_item_operation.video = order_item_operation.video
                po_pack_item_operation.costing_smv = order_item_operation.costing_smv
                po_pack_item_operation.factory_smv = order_item_operation.factory_smv
                po_pack_item_operation.machine_type = order_item_operation.machine_type
                po_pack_item_operation.folder_type = order_item_operation.folder_type
                po_pack_item_operation.save()

    def get_po_placement_material(self: 'marketing.models.PurchaseOrder', po_placement):
        material = po_placement.get_costing_material()
        user_defined_material = material.get_user_defined_material()
        if user_defined_material.size_dependent:
            pack = po_placement.get_po_pack()
            size = pack.po_size.order_size.size
            material = material.get_or_create_material_size_variation(size)
        return material
    
    def copy_other_cost_type(self: 'marketing.models.PurchaseOrder'):
        for other_cost_type in self.costing_version.othercosttype_set.all():
            purchase_order_other_cost_type, created = marketing.models.PurchaseOrderOtherCostType.objects.get_or_create(
                purchase_order=self,
                name=other_cost_type.other_cost.name,
                other_cost =other_cost_type.other_cost,
                costing_other_cost_type=other_cost_type
            )
            source_order_pack_other_costs = other_cost_type.orderpackothercost_set.all()
            for source_order_pack_other_cost in source_order_pack_other_costs:
                po_packs = marketing.models.POPack.objects.filter(purchase_order=self, order_pack=source_order_pack_other_cost.pack)
                for po_pack in po_packs:
                    marketing.models.POPackOtherCost.objects.get_or_create(
                        pack=po_pack,
                        other_cost_type=purchase_order_other_cost_type,
                        cost=source_order_pack_other_cost.cost,
                        other_cost_type_name=other_cost_type.other_cost.name,
                        costing_order_pack_other_cost=source_order_pack_other_cost
                    )

    def finalize_po_packs_and_create_dependencies_from_material(self: 'marketing.models.PurchaseOrder', material_type):
        from marketing.models import POPackItemPlacement,POPackItem, POPackPlacement
        self.create_colorway_country_combined_placement_data() # TODO - is this needed DS 06/21/2025
        self.validate_po_items() #TODO check with dasith sir. this is related Colorway Category Mappings error in purchase order
        self.create_po_colorway_items()
        po_packs = self.popack_set.all()
        po_items = self.poitem_set.all()
        po_pack_items = []

        for po_pack in po_packs:
            # If order_pack is not there, set matching order_pack.
            if not po_pack.order_pack:
                po_pack.order_pack = po_pack.get_matching_costing_order_pack()
                po_pack.save()
                # Create order pack placements
            # pack_placements = po_pack.order_pack.get_pack_placements_from_material_type(material_type)
            pack_placement_materials = po_pack.order_pack.get_pack_placement_material_by_material_type(material_type)
            for pack_placement_material in pack_placement_materials:
                pack_placement = pack_placement_material.placement
                po_pack_placement = POPackPlacement.objects.get_or_create(po_pack=po_pack, costing_pack_placement=pack_placement)[0]
                po_pack_placement.po_material = self.get_po_placement_material(po_pack_placement)
                consumption_object = pack_placement.get_placement_material_consumption()

                if consumption_object:
                    po_pack_placement.consumption_ratio = float(
                        consumption_object.costing_consumption_ratio) if consumption_object.costing_consumption_ratio else None
                    po_pack_placement.wastage = float(
                        consumption_object.wastage) if consumption_object.wastage else None
                po_pack_placement.save()

            # Create po pack items
            for po_item in po_items:
                po_pack_item, created = POPackItem.objects.get_or_create(po_item=po_item, po_pack=po_pack)
                if created or True:
                    po_pack_item.order_pack_item = po_pack_item.get_matching_costing_order_pack_item()
                    po_pack_item.save()

                    # pack_item_placements = po_pack_item.order_pack_item.get_pack_item_placements_from_material_type(material_type)
                    pack_item_placement_materials = po_pack_item.order_pack_item.get_pack_item_placement_materials_by_material_type(material_type)

                    for pack_item_placement_material in pack_item_placement_materials:
                        pack_item_placement = pack_item_placement_material.placement
                        po_pack_item_placement, created = POPackItemPlacement.objects.get_or_create(
                            po_pack_item=po_pack_item,
                            costing_pack_item_placement=pack_item_placement)

                        po_pack_item_placement.po_material = self.get_po_placement_material(po_pack_item_placement)
                        consumption_object = po_pack_item_placement.costing_pack_item_placement.get_material_consumption_object()

                        if consumption_object:
                            po_pack_item_placement.consumption_ratio = float(
                                consumption_object.costing_consumption_ratio) if consumption_object.costing_consumption_ratio else None
                            po_pack_item_placement.wastage = float(
                                consumption_object.wastage) if consumption_object.wastage else None
                        po_pack_item_placement.save()
                po_pack_items.append(po_pack_item)

        # TODO - 06/21/2025 - this needs to be moved somewhere else
        self.create_po_embelishment_service_data(po_pack_items)
        self.create_po_wash_service_data(po_pack_items)
        self.create_po_operation_data(po_pack_items)
        self.copy_other_cost_type()

    def validate_placements_complete(self: 'marketing.models.PurchaseOrder', placements):
        from materials.models import Material
        valid_placements = placements.filter(
            material_quantity__isnull=False,
            supplier_inquiry_detail__isnull=False).exclude(
            po_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)
        count_placements = placements.filter(
            material_quantity__isnull=False,
            supplier_inquiry_detail__isnull=False
        ).exclude(
            po_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)
        return valid_placements.count() == count_placements.count()

    def organize_placement_material_bom_data(self, placements, material_data):
        for placement in placements:
            material = placement.po_material
            material_quantity = placement.material_quantity
            material_quantity_units = placement.material_quantity_units
            supplier_inquiry = placement.supplier_inquiry_detail

            if not material_data.get(material.pk, None):
                material_data[material.pk] = {}
            if supplier_inquiry:
                if not material_data[material.pk].get(supplier_inquiry.pk, None):
                    material_data[material.pk][supplier_inquiry.pk] = {"quantity": 0,
                                                                    "measuring_unit": material_quantity_units}

                material_data[material.pk][supplier_inquiry.pk]["quantity"] += material_quantity

                if material_data[material.pk][supplier_inquiry.pk]["measuring_unit"] != material_quantity_units:
                    raise POMaterialMismatchException("Units mismatch")
        return material_data

    def organize_placement_fabric_bom_data(self: 'marketing.models.PurchaseOrder', fabric_placements, material_data):
        data = {}
        from marketing.models import POFabricMarker
        for fabric_placement in fabric_placements:
            marker_details = fabric_placement.po_pack_item.get_placement_marker_detail(fabric_placement, POFabricMarker.BOOKING_MARKER)

            for marker_detail in marker_details:
                material = marker_detail.marker.po_material
                fabric_width_supplier = marker_detail.marker.width
                supplier_inquiry_detail = fabric_width_supplier.get_default_fabric_width_supplier()
                material_quantity = marker_detail.calculated_material_quantity

                material_quantity_units = marker_detail.material_quantity_units
                if not material_data.get(material.pk, None):
                    material_data[material.pk] = {}

                if not material_data[material.pk].get(supplier_inquiry_detail.supplier_inquiry_detail.pk, None):
                    material_data[material.pk][supplier_inquiry_detail.supplier_inquiry_detail.pk] = {
                        "quantity": 0,
                      "measuring_unit": material_quantity_units
                    }
                material_data[material.pk][supplier_inquiry_detail.supplier_inquiry_detail.pk]["quantity"] += material_quantity

                if material_data[material.pk][supplier_inquiry_detail.supplier_inquiry_detail.pk]["measuring_unit"] != material_quantity_units:
                    raise POMaterialMismatchException("Units mismatch")
        return material_data

    def aggregate_bom_by_po_and_create_bom(self: 'marketing.models.PurchaseOrder', material):
        from marketing.models import POPackItemPlacement, POPackPlacement, Material, PurchaseOrderBom
        po_packs = self.get_po_packs()
        success = True
        failed_po_colorways = []
        #print(po_packs.values_list('po_material__material_detail__generic_material__user_material', flat=True))

        po_pack_placements = POPackPlacement.objects.filter(po_pack__in=po_packs, po_pack__purchase_order=self, po_material__material_detail__generic_material__user_material=material)
        po_pack_item_placements = POPackItemPlacement.objects.filter(
            po_material__material_detail__generic_material__user_material=material,
            po_pack_item__po_pack__in=po_packs, po_pack_item__po_pack__purchase_order=self).exclude(
            po_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)

        fabric_placements = POPackItemPlacement.objects.filter(
            costing_pack_item_placement__item_attribute_other__material=material,
            po_pack_item__po_pack__in=po_packs, po_pack_item__po_pack__purchase_order=self,
            po_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)

        if self.validate_placements_complete(po_pack_placements) and self.validate_placements_complete(po_pack_item_placements):
            PurchaseOrderBom.objects.filter(purchase_order=self, material__material_detail__generic_material__user_material=material).update(quantity=0, measuring_unit=None)
            try:
                material_data = self.organize_placement_material_bom_data(po_pack_placements, {})
                material_data = self.organize_placement_material_bom_data(po_pack_item_placements, material_data)
                material_data = self.organize_placement_fabric_bom_data(fabric_placements, material_data)  # TODO chack with dasith sir

                for material_id, supplier_inquiry_data in material_data.items():
                    for supplier_inquiry_id, quantity_data in supplier_inquiry_data.items():
                        quantity = quantity_data['quantity']
                        measuring_unit = quantity_data['measuring_unit']
                        po_bom, created = PurchaseOrderBom.objects.get_or_create(
                            purchase_order=self,
                            supplier_inquiry_detail_id=supplier_inquiry_id,
                            material_id=material_id,
                            # po_colorway=po_colorway
                        )
                        if created:
                            po_bom.quantity = quantity
                            po_bom.measuring_unit = measuring_unit
                            po_bom.order_quantity = quantity
                            po_bom.order_quantity_units = measuring_unit
                        else:
                            po_bom.quantity = float(po_bom.quantity) + float(quantity)
                            po_bom.measuring_unit = measuring_unit
                            po_bom.order_quantity = round(po_bom.quantity, 2)
                            po_bom.order_quantity_units = measuring_unit
                        po_bom.save()
            except POMaterialMismatchException:
                success = False
                failed_po_colorways.append("Failed to create BOM")
        return success

    def build_purchase_order_bom(self: 'marketing.models.PurchaseOrder', material, exclude_fabric_creation=False):
        '''
        :param exclude_fabric_creation: if True it will not create bom for fabrics
        '''
        po_packs = self.popack_set.all()
        bom_success = True
        aggregate_success = None
        for po_pack in po_packs:
            po_pack_items = po_pack.popackitem_set.all()
            po_success = po_pack.build_bom(material)

            for po_pack_item in po_pack_items:
                success = po_pack_item.build_bom(material, exclude_fabric_creation)

                if not success:
                    po_success = False

            if not po_success:
                bom_success = False
        self.successfully_built_bom = bom_success
        self.save()
        #if bom_success:
        aggregate_success = self.aggregate_bom_by_po_and_create_bom(material)
        return bom_success, aggregate_success

    def get_purchase_order_bom_objects(self: 'marketing.models.PurchaseOrder'):
        bom_objects = self.purchaseorderbom_set.all()
        return bom_objects

    def get_allocated_quantity(self, customer_brand_material):
        allocated_materials = self.get_allocated_material_objects(customer_brand_material)
        material_helper = MaterialUnitHelper()
        material_consumption_measurement_unit = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
        consumption_measurement_unit = material_consumption_measurement_unit

        measuring_unit = material_helper.get_normalized_unit_based_on_category(consumption_measurement_unit)

        if not measuring_unit:
            raise Exception(f"Measuring Unit not defined for material {customer_brand_material.pk}")

        quantity = 0
        for allocated_material in allocated_materials:
            allocated_quantity = material_helper.convert_to_units(measuring_unit, allocated_material.allocated_quantity, allocated_material.allocated_quantity_units)
            quantity += allocated_quantity

        data = {
            'quantity': quantity,
            'quantity_unit': measuring_unit,
            'quantity_units_display': material_helper.all_measuring_units_dictionary.get(measuring_unit, measuring_unit)
        }
        return data

    def get_allocated_material_objects(self: 'marketing.models.PurchaseOrder', customer_brand_material):
        from marketing.models import PurchaseOrderAllocatedMaterial, CustomerBrandMaterial
        allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order=self,
            purchase_order_bom__material=customer_brand_material
        )
        return allocated_materials

    def get_material_required_quantity(self: 'marketing.models.PurchaseOrder', customer_brand_material):
        from marketing.models import PurchaseOrderBom
        bom_objects = PurchaseOrderBom.objects.filter(
            purchase_order=self,
            material=customer_brand_material
        ).prefetch_related(
            'material__material_detail__generic_material__user_material'
        ) # This will only return one

        consumption_measurement_unit = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
        material_helper = MaterialUnitHelper()

        measuring_unit = material_helper.get_normalized_unit_based_on_category(consumption_measurement_unit)

        if not measuring_unit:
            raise Exception(f"Measuring Unit not defined for material {customer_brand_material.pk}")

        quantity = 0
        for bom_object in bom_objects:
            required_quantity = material_helper.convert_to_units(measuring_unit, bom_object.order_quantity, bom_object.measuring_unit)
            quantity += required_quantity

        if quantity:
            quantity = round(quantity, 2)

        data = {
            'quantity': quantity,
            'quantity_unit': measuring_unit,
            'quantity_units_display': material_helper.all_measuring_units_dictionary.get(measuring_unit, measuring_unit)
        }
        return data
    
    def set_po_pack_cost(self: 'marketing.models.PurchaseOrder'):
        for po_pack in self.get_po_packs():
            order_pack_cost = po_pack.order_pack.calculate_pack_cost() #TODO set order pack normalize cost
            po_pack.pack_cost = po_pack.quantity * order_pack_cost['pack_total_cost']
            po_pack.normalized_requested_cost = po_pack.quantity * order_pack_cost['pack_total_cost']
            po_pack.save()

    def calculate_total_fob_value(self: 'marketing.models.PurchaseOrder'):
        deliveries = self.purchaseorderdelivery_set.all()
        fob_total_value = calculate_queryset_total_amount_normalized_amount(deliveries, 'total_amount')
        return fob_total_value
    
    def calculate_max_pcl_value(self: 'marketing.models.PurchaseOrder'):
        fob_total_value = self.calculate_total_fob_value()
        max_pcl_value = fob_total_value * (70/100)
        return max_pcl_value
    
    def get_total_raw_material_costs(self):
        from marketing.models import SupplierDeliveryDateQuantityPOAllocation
        total_cost = 0
        order_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(purchase_order=self)
        for order_po_allocation in order_po_allocations:
            cost = order_po_allocation.calculate_quantity_price()
            total_cost = total_cost + cost
        return total_cost

    def calculate_total_fabric_costs(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import SupplierDeliveryDateQuantityPOAllocation
        total_cost = 0
        order_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order=self, supplier_delivery_date_quantity__general_po_material_quantity__material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES
        )
        for order_po_allocation in order_po_allocations:
            cost = order_po_allocation.calculate_quantity_price()
            total_cost = total_cost + cost
        return total_cost
    
    def calculate_total_sewing_trim_costs(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import SupplierDeliveryDateQuantityPOAllocation
        total_cost = 0
        order_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order=self, supplier_delivery_date_quantity__general_po_material_quantity__material__material_detail__generic_material__user_material__category=SEWING_TRIM_TYPES
        )
        for order_po_allocation in order_po_allocations:
            cost = order_po_allocation.calculate_quantity_price()
            total_cost = total_cost + cost
        return total_cost
    
    def calculate_total_packing_trim_costs(self: 'marketing.models.PurchaseOrder'):
        from marketing.models import SupplierDeliveryDateQuantityPOAllocation
        total_cost = 0
        order_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order=self, supplier_delivery_date_quantity__general_po_material_quantity__material__material_detail__generic_material__user_material__category=PACKAGING_TYPES
        )
        for order_po_allocation in order_po_allocations:
            cost = order_po_allocation.calculate_quantity_price()
            total_cost = total_cost + cost
        return total_cost
    
    def calculate_total_wash_service_costs(self: 'marketing.models.PurchaseOrder'):
        from service_po.models import GeneralServicePODeliveryPOAllocation
        total_wash_cost = 0
        service_allocations = GeneralServicePODeliveryPOAllocation.objects.filter(
            purchase_order=self
        )
        for service_allocation in service_allocations:
            if service_allocation.general_service_po_service_delivery.general_service_po_supplier_price.po_pack_item_wash_service:
                cost = service_allocation.calculate_quantity_price()
                total_wash_cost += cost
        return total_wash_cost
    
    def calculate_total_embellishment_service_costs(self: 'marketing.models.PurchaseOrder'):
        from service_po.models import GeneralServicePODeliveryPOAllocation
        total_embellishment_cost = 0
        service_allocations = GeneralServicePODeliveryPOAllocation.objects.filter(
            purchase_order=self
        )
        for service_allocation in service_allocations:
            if service_allocation.general_service_po_service_delivery.general_service_po_supplier_price.po_pack_item_embellishment_service:
                cost = cost = service_allocation.calculate_quantity_price()
                total_embellishment_cost += cost
        return total_embellishment_cost
    
    def calculate_material_fob_percentage(self):
        raw_material_cost = self.get_total_raw_material_costs()
        fob_value = self.calculate_total_fob_value()
        if raw_material_cost > 0 and fob_value > 0:
            precentage = (raw_material_cost / fob_value) * 100
            return round(precentage, 2)
        return 0



