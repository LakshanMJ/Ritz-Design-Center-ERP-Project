import marketing.models
from marketing import models as marketing_models
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from shared.utils import convert_to_float_or_none, get_quantity_dictionary, calculate_queryset_total_amount_normalized_amount
from shared.approvals.utils import ApprovalUtils
from shared.approvals.constants.task_descriptions import LEFT_OVER_MATERIAL_VERIFIATION_DESCRIPTION, PO_CLUB_MARKER_CREATION_DESCRIPTION
from shared.approvals.constants.task_entities import IN_HOUSE_MATERIAL_VERIFIATION_ENTITY, PO_CLUB_ENTITY
from shared.permissions.roles import STORES_USER_ROLE, CAD_USER_ROLE
from shared.models import Role
from materials.models import FABRIC_TRIM_TYPES, CustomerBrandMaterial, InHouseMaterialVerification, InHouseMaterialVerificationMaterial
from shared.utils import get_object_or_none
from django.contrib.contenttypes.models import ContentType

class ActualPOClubModelMixin:

    def validate_po_club_items(self: 'marketing.models.ActualPOClub'):
        from marketing.models import ActualPOClubItem, OrderItem
        if self.pre_costing:
            order_items = self.pre_costing.order.get_order_items()
            for order_item in order_items:
                po_club_item, created = ActualPOClubItem.objects.get_or_create(po_club=self, pre_costing_order_item=order_item)
                if created:
                    po_club_item.item_name = order_item.item.name
                    po_club_item.item_identifier = order_item.item_identifier
                    po_club_item.marketing_costing_order_item = order_item.copied_from
                    po_club_item.save()

    def get_club_bom(self: 'marketing.models.ActualPOClub'):
        boms = marketing_models.ActualClubBom.objects.filter(actual_club=self)
        return boms

    def get_completed_grns(self: 'marketing.models.ActualPOClub'):
        supplier_pos = self.get_supplier_pos()
        grns = marketing_models.SupplierPOGRN.objects.filter(supplier_po__in=supplier_pos, state=marketing_models.SupplierPOGRN.GRN_COMPLETE)
        return grns

    def get_purchase_orders(self: 'marketing.models.ActualPOClub'):
        pos = self.purchaseorder_set.all().filter(active=True)
        return pos

    def get_allocations(self: 'marketing.models.ActualPOClub'):
        pass

    def get_material_allocated_quantity(self, customer_brand_material):
        material_helper = MaterialUnitHelper()
        pos = self.get_purchase_orders()
        material_unit_category = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit

        material_unit = material_helper.get_normalized_unit_based_on_category(material_unit_category)
        material_unit_display = material_helper.all_measuring_units_dictionary.get(material_unit, "N/A")

        total_quantity = 0
        for po in pos:
            quantity_data = po.get_allocated_quantity(customer_brand_material)
            quantity = quantity_data.get('quantity', 0)
            quantity_unit = quantity_data.get('quantity_unit', None)
            normalized_quanity = material_helper.convert_to_units(material_unit, quantity, quantity_unit)
            total_quantity += normalized_quanity

        data = {
            'quantity': total_quantity,
            'quantity_unit': material_unit,
            'quantity_units_display': material_unit_display
        }
        return data

    def get_material_required_quantity(self, customer_brand_material):
        material_helper = MaterialUnitHelper()
        pos = self.get_purchase_orders()
        material_unit = customer_brand_material.material_normalized_measuring_unit

        total_quantity = 0
        for po in pos:
            quantity_data = po.get_material_required_quantity(customer_brand_material)
            quantity = quantity_data.get('quantity', 0)
            quantity_unit = quantity_data.get('quantity_units', None)
            normalized_quantity = material_helper.convert_to_units(material_unit, quantity, quantity_unit)
            total_quantity += normalized_quantity

        data = get_quantity_dictionary(total_quantity, material_unit)
        return data

    def get_po_club_bom_summary(self):
        from marketing.models import PurchaseOrderBom
        from materials.models import CustomerBrandMaterial
        bom_material_ids = PurchaseOrderBom.objects.filter(purchase_order__in=self.get_purchase_orders()).values_list('material_id', flat=True).distinct()
        materials = CustomerBrandMaterial.objects.filter(pk__in=bom_material_ids).order_by('material_detail__generic_material__user_material__display_order')
        bom_summary = []
        for material in materials:
            required_quantity = self.get_material_required_quantity(material)
            allocated_quantity = self.get_material_allocated_quantity(material)
            pending_quantity_display = "N/A"
            if convert_to_float_or_none(required_quantity['quantity']) != None and convert_to_float_or_none(allocated_quantity['quantity']) != None:
                pending_quantity = convert_to_float_or_none(required_quantity['quantity']) - convert_to_float_or_none(allocated_quantity['quantity'])
                pending_quantity_display = 0 if pending_quantity < 0 else pending_quantity

            pending_quantity = {
                'quantity': pending_quantity_display,
                'quantity_units': required_quantity['quantity_units_display']
            }
            data = {
                'customer_brand_material': material, # Do not change this to the ID
                'required_quantity': required_quantity,
                'allocated_quantity': allocated_quantity,
                'pending_quantity': pending_quantity,
            }
            bom_summary.append(data)
        return bom_summary
    
    def get_inhouse_material_verification(self, left_over_materials, material_type=FABRIC_TRIM_TYPES):
        po_club_left_over_material_ct = ContentType.objects.get_for_model(marketing_models.POClubLeftOverMaterial)
        if material_type == FABRIC_TRIM_TYPES:
            for left_over_material in left_over_materials:
                inhouse_material_verification_material = get_object_or_none(
                    InHouseMaterialVerificationMaterial, 
                    {'referance_material_type': po_club_left_over_material_ct, 'referance_material_type_id': left_over_material.id}
                )
                if inhouse_material_verification_material:
                    return inhouse_material_verification_material.inhouse_material_verification
            return None
        else:
            left_over_material_ids = left_over_materials.values_list('id', flat=True)
            inhouse_material_verification_materials = InHouseMaterialVerificationMaterial.objects.filter(referance_material_type=po_club_left_over_material_ct,
                referance_material_id__in=left_over_material_ids,                                                                                   
                inhouse_material__supplier_material__customer_brand_material__material_detail__generic_material__user_material__name=material_type
            )
            if inhouse_material_verification_materials:
                return inhouse_material_verification_materials[0].inhouse_material_verification
            return None

    def create_fabric_material_inhouse_verification(self: 'marketing.models.ActualPOClub'):
        verification_entity = []
        role = Role.objects.get(name=STORES_USER_ROLE)
        stroes_users = role.users.all()

        material_ids = self.poclubleftovermaterial_set.filter().values_list('assigned_customer_brand_material', flat=True)
        fabric_materials = CustomerBrandMaterial.objects.filter(id__in=material_ids, material_detail__generic_material__user_material__name=FABRIC_TRIM_TYPES)
        for fabric_material in fabric_materials:
            left_over_fabric_materials = self.poclubleftovermaterial_set.filter(assigned_customer_brand_material=fabric_material)
            inhouse_material_verification =  self.get_inhouse_material_verification(left_over_fabric_materials)

            if not inhouse_material_verification:
                inhouse_material_verification = InHouseMaterialVerification.objects.create(
                    state=InHouseMaterialVerification.PENDING_STATE
                )

            for left_over_fabric_material in left_over_fabric_materials:
                content_type = ContentType.objects.get_for_model(marketing_models.POClubLeftOverMaterial)
                inhouse_material_verification_material, created = InHouseMaterialVerificationMaterial.objects.get_or_create(
                    inhouse_material_verification=inhouse_material_verification,
                    inhouse_material=left_over_fabric_material.in_house_material,
                    referance_material_type=content_type, 
                    referance_material_id=left_over_fabric_material.id
                )
                inhouse_material_verification_material.available_quantity=left_over_fabric_material.quantity
                inhouse_material_verification_material.available_quantity_units=left_over_fabric_material.quantity_units
                inhouse_material_verification_material.usable_quantity=None
                inhouse_material_verification_material.usable_quantity_units=None
                inhouse_material_verification_material.save()
            
            verification_entity.append({
                'entity_id': inhouse_material_verification.id,
                'entity_name': IN_HOUSE_MATERIAL_VERIFIATION_ENTITY
            })
        if verification_entity:
            ApprovalUtils.assign_action_task(stroes_users, verification_entity, LEFT_OVER_MATERIAL_VERIFIATION_DESCRIPTION, 'Left Over Material Verification')

    def create_other_material_inhouse_verification(self: 'marketing.models.ActualPOClub'):
        verification_entity = []
        role = Role.objects.get(name=STORES_USER_ROLE)
        stroes_users = role.users.all()
        material_ids = self.poclubleftovermaterial_set.filter().values_list('assigned_customer_brand_material', flat=True)
        other_materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).exclude(material_detail__generic_material__user_material__name=FABRIC_TRIM_TYPES)
        material_types = other_materials.filter().values_list('material_detail__generic_material__user_material__name', flat=True).distinct()

        for material_type in material_types:
            inhouse_material_verification =  self.get_inhouse_material_verification(self.poclubleftovermaterial_set.filter(), material_type)
            if not inhouse_material_verification:
                inhouse_material_verification = InHouseMaterialVerification.objects.create(
                    state=InHouseMaterialVerification.PENDING_STATE
                )

            for other_material in other_materials:
                left_over_other_materials = self.poclubleftovermaterial_set.filter(
                    assigned_customer_brand_material=other_material,
                    assigned_customer_brand_material__material_detail__generic_material__user_material__name=material_type
                )

                for left_over_fabric_material in left_over_other_materials:
                    content_type = ContentType.objects.get_for_model(marketing_models.POClubLeftOverMaterial)
                    inhouse_material_verification_material, created = InHouseMaterialVerificationMaterial.objects.get_or_create(
                        inhouse_material_verification=inhouse_material_verification,
                        inhouse_material=left_over_fabric_material.in_house_material,
                        referance_material_type=content_type, 
                        referance_material_type_id=inhouse_material_verification_material.id
                    )
                    inhouse_material_verification_material.available_quantity=left_over_fabric_material.quantity
                    inhouse_material_verification_material.available_quantity_units=left_over_fabric_material.quantity_units
                    inhouse_material_verification_material.usable_quantity=None
                    inhouse_material_verification_material.usable_quantity_units=None
                    inhouse_material_verification_material.save()

            verification_entity.append({
                'entity_id': inhouse_material_verification.id,
                'entity_name': IN_HOUSE_MATERIAL_VERIFIATION_ENTITY
            })
        
        if verification_entity:
            ApprovalUtils.assign_action_task(stroes_users, verification_entity, LEFT_OVER_MATERIAL_VERIFIATION_DESCRIPTION, 'Left Over Material Verification')

    def create_marker_action_task(self: 'marketing.models.ActualPOClub'):
        verification_entity = []
        verification_entity.append({
            'entity_id': self.id,
            'entity_name': PO_CLUB_ENTITY
        })
        role = Role.objects.get(name=CAD_USER_ROLE)
        cad_users = role.users.all()
        ApprovalUtils.assign_action_task(cad_users, verification_entity, PO_CLUB_MARKER_CREATION_DESCRIPTION, 'Club Leftover and Booking Marker Creation')

    def calculate_material_fob_percentage(self):
        pos = self.get_purchase_orders()
        total_raw_material_cost = 0
        total_fob_value = 0
        for po in pos:
            raw_material_cost = po.get_total_raw_material_costs()
            fob_value = po.calculate_total_fob_value()
            total_fob_value += fob_value
            total_raw_material_cost += raw_material_cost
        if raw_material_cost > 0 and total_fob_value > 0:
            precentage = (total_raw_material_cost / total_fob_value) * 100
            return round(precentage, 2)
        return 0