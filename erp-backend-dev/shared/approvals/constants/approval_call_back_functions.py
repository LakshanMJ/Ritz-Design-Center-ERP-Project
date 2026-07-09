from marketing.models import OrderCostingVersion, BOMChangeRequest, BOMChangeRequestChangeType, POPackItemPlacement, POPackPlacement, GeneralPOMaterialQuantity, SupplierInquiryDetail, \
                            PurchaseOrderBom, BOMChangeRequestFabricVoidMarker, POFabricMarker, BOMChangeRequestFabricMarker
from supplier_po.models import SupplierPO, SupplierDeliveryDateQuantity, GeneralPOSupplierMaterialPrice, SupplierPOGRN
from service_po.models import ServicePO
from shared.models import Approval, Role, Supplier
from materials.models import CustomerBrandMaterial, FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES
from shared.utils import get_object_or_none
from shared.approvals.constants.approval_choices import FINANCE_COSTING_APPROVER_APPROVAL, SUPPLIER_PO_APPROVAL
from shared.permissions.roles import FINANCE_COSTING_APPROVER, SUPPLIER_PO_APPROVER
from rest_framework.generics import get_object_or_404
from shared.utils import get_object_or_none, calculate_queryset_total_normalized_quantity, get_quantity_dictionary, ceil_number
from marketing.helpers.po_club_bcr_change_request import POClubBOMChangeRequestHelper
from datetime import date
from rest_framework.response import Response

def update_costing_first_approval(approval, approval_status):
    has_errors = False
    errors = []
    entities = approval.entity
    for entity in entities:
        id = entity['entity_id']
        costing = get_object_or_none(OrderCostingVersion, {'pk':id})
        if costing and isinstance(costing, OrderCostingVersion):
            if approval_status == Approval.APPROVED_APPROVAL:
                costing.version_state = OrderCostingVersion.COMPLETED_VERSION_STATE
                costing.save()
                role = Role.objects.get(name=FINANCE_COSTING_APPROVER)
                finance_costing_approver_users = role.users.all()
                costing.create_costing_approvals(finance_costing_approver_users, approval.action_user, FINANCE_COSTING_APPROVER_APPROVAL)
            elif approval_status == Approval.REJECTED_APPROVAL:
                if approval.taskcomment_set.all().count() > 0:
                    costing.version_state = OrderCostingVersion.REJECTED_STATE
                    costing.save()
                else:
                    has_errors = True
                    errors.append('Enter comments to reject approval.')
    return has_errors, errors

def update_costing_second_approval(approval, approval_status):
    has_errors = False
    errors = []
    entities = approval.entity
    for entity in entities:
        id = entity['entity_id']
        costing = get_object_or_none(OrderCostingVersion, {'pk':id})
        if costing and isinstance(costing, OrderCostingVersion):
            if approval_status == Approval.APPROVED_APPROVAL:
                costing.approved = True
                costing.save()
            elif approval_status == Approval.REJECTED_APPROVAL:
                if approval.taskcomment_set.all().count() > 0:
                    costing.version_state = OrderCostingVersion.REJECTED_STATE
                    costing.save()
                else:
                    has_errors = True
                    errors.append('Enter comments to reject approval.')
    return has_errors, errors

def update_supplier_po_approval(approval, approval_status):
    has_errors = False
    errors = []
    entities = approval.entity
    for entity in entities:
        id = entity['entity_id']
        supplier_po = get_object_or_none(SupplierPO, {'pk':id})
        if supplier_po and isinstance(supplier_po, SupplierPO):
            if approval_status == Approval.APPROVED_APPROVAL:
                supplier_po.state = SupplierPO.PENDING_EMAIL_STATE
                supplier_po.checked_by = approval.action_user
                supplier_po.save()
            elif approval_status == Approval.REJECTED_APPROVAL:
                if approval.taskcomment_set.all().count() > 0:
                    supplier_po.state = SupplierPO.REJECTED_STATE
                    supplier_po.checked_by = approval.action_user
                    supplier_po.save()
                else:
                    has_errors = True
                    errors.append('Enter comments to reject approval.')
            if not has_errors:
                supplier_po.set_approval(approval_status)
    return has_errors, errors

def update_service_po_approval(approval, approval_status):
    has_errors = False
    errors = []
    entities = approval.entity
    for entity in entities:
        id = entity['entity_id']
        service_po = get_object_or_none(ServicePO, {'pk':id})
        if service_po and isinstance(service_po, ServicePO):
            if approval_status == Approval.APPROVED_APPROVAL:
                service_po.state = ServicePO.PENDING_EMAIL_STATE
                service_po.checked_by = approval.action_user
                service_po.save()
            elif approval_status == Approval.REJECTED_APPROVAL:
                if approval.taskcomment_set.all().count() > 0:
                    service_po.state = ServicePO.REJECTED_STATE
                    service_po.checked_by = approval.action_user
                    service_po.save()
                else:
                    has_errors = True
                    errors.append('Enter comments to reject approval.')
            if not has_errors:
                service_po.set_approval(approval_status)
    return has_errors, errors


def update_grn_approval(approval, approval_status):
    has_errors = False
    errors = []
    entities = approval.entity
    for entity in entities:
        id = entity['entity_id']
        grn = get_object_or_none(SupplierPOGRN, {'pk':id})
        if grn and isinstance(grn, SupplierPOGRN):
            if approval_status == Approval.APPROVED_APPROVAL:
                grn.state = SupplierPOGRN.GRN_COMPLETE
                if not grn.complete_date:
                    grn.complete_date = date.today()
                grn.save()
            elif approval_status == Approval.REJECTED_APPROVAL:
                if approval.taskcomment_set.all().count() > 0:
                    grn.state = SupplierPOGRN.GRN_REJECTED
                    grn.save()
                else:
                    has_errors = True
                    errors.append('Enter comments to reject approval.')
    return has_errors, errors


def get_old_supplier_inquiry(bom_change_request_material_applied_pack_and_pack_item_placements):
    for item in bom_change_request_material_applied_pack_and_pack_item_placements:
        if isinstance(item.entity, POPackPlacement):
            return item.placement.supplier_inquiry_detail
        elif isinstance(item.entity, POPackItemPlacement):
            return item.placement.supplier_inquiry_detail
        else:
            return None

def update_bom_change_request_approval(approval, approval_status):
    has_errors = False
    errors = []
    entities = approval.entity

    for entity in entities:
        id = entity['entity_id']
        bcr = get_object_or_none(BOMChangeRequest, {'pk':id})

        if bcr and isinstance(bcr, BOMChangeRequest):
            if approval_status == Approval.APPROVED_APPROVAL:
                for request_type in bcr.bomchangerequestchangetype_set.all():
                    material_id = request_type.get_material_id()
                    if request_type.state == BOMChangeRequestChangeType.PRICE_CHANGE:
                        for price_change in request_type.bomchangerequestpricechange_set.all():
                            price_change.material_price.order_price = price_change.new_price
                            #price_change.material_price.order_price_units = price_change.new_price_units
                            price_change.material_price.save()
                            material_quantities = GeneralPOMaterialQuantity.objects.filter(default_material_supplier=price_change.material_price)
                            for material_quantity in material_quantities:
                                material_quantity.completed = False
                                material_quantity.save()

                        if bcr.po_club and material_id:
                            material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
                            request_type.bom_change_request.po_club.generate_po_club_purchase_order_bom(material.material_detail.generic_material.user_material)
                            request_type.bom_change_request.po_club.aggregate_bom_by_material_and_supplier_inquiry_detail_and_create_bom(material.material_detail.generic_material.user_material)

                    elif request_type.state == BOMChangeRequestChangeType.MATERIAL_CHANGE:
                        for material_change in request_type.bomchangerequestmaterialchange_set.all():
                            po_club_helper = POClubBOMChangeRequestHelper(bcr.po_club)
                            supplier_inquiry, supplier_inquiry_detail = po_club_helper.create_supplier_inquiry(bcr.po_club.pre_costing, material_change)
                            old_supplier_inquiry_detail = get_old_supplier_inquiry(material_change.bomchangerequestmaterialappliedpackandpackitemplacements_set.all())
                            for item in material_change.bomchangerequestmaterialappliedpackandpackitemplacements_set.all():

                                if isinstance(item.entity, POPackPlacement):
                                    pack_placement = get_object_or_none(POPackPlacement, {'id': item.entity_id})
                                    if pack_placement:
                                        pack_placement.supplier_inquiry_detail = supplier_inquiry_detail
                                        pack_placement.po_material = material_change.new_material
                                        pack_placement.save()

                                elif isinstance(item.entity, POPackItemPlacement):
                                    pack_item_placement = get_object_or_none(POPackItemPlacement, {'id': item.entity_id})
                                    if pack_item_placement:
                                        pack_item_placement.supplier_inquiry_detail = supplier_inquiry_detail
                                        pack_item_placement.po_material = material_change.new_material
                                        pack_item_placement.save()
                            if bcr.po_club:
                                if supplier_inquiry_detail:
                                    old_supplier_pos = SupplierPO.objects.filter(
                                        supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material__customer_brand_material=old_supplier_inquiry_detail.supplier_inquiry.customer_brand_material,
                                        general_po_supplier__general_po__po_club=bcr.po_club,
                                        general_po_supplier__supplier=old_supplier_inquiry_detail.supplier_inquiry.supplier
                                    )
                                    print(old_supplier_pos)
                                    for old_supplier_po in old_supplier_pos:
                                        old_supplier_po.state = SupplierPO.CANCEL_STATE
                                        old_supplier_po.save()
                                marker_ids = BOMChangeRequestFabricVoidMarker.objects.filter(bom_change_request_type=request_type).values_list('void_marker', flat=True)
                                markers = POFabricMarker.objects.filter(id__in=marker_ids)
                                for marker in markers:
                                    marker.void_marker = True
                                    marker.save()

                                material_quantities = GeneralPOMaterialQuantity.objects.filter(
                                    general_po__po_club=bcr.po_club,
                                    material=material_change.old_material
                                )
                                print(material_quantities)
                                for material_quantity in material_quantities:
                                    material_quantity.completed = False
                                    material_quantity.save()

                                request_type.bom_change_request.po_club.generate_po_club_purchase_order_bom(material_change.new_material.material_detail.generic_material.user_material)
                                po_club_helper.generate_general_po_materials(material_change.new_material, supplier_inquiry_detail)

                    elif request_type.state == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
                        po_club_helper = POClubBOMChangeRequestHelper(bcr.po_club)
                        for consumtion_change in request_type.bomchangerequestconsumptionchange_set.all():
                            if isinstance(consumtion_change.entity, POPackPlacement):
                                pack_placement = get_object_or_none(POPackPlacement, {'id': consumtion_change.entity_id})
                                if pack_placement:
                                    pack_placement.consumption_ratio = consumtion_change.new_consumption_ratio
                                    pack_placement.wastage = consumtion_change.new_wastage
                                    pack_placement.save()

                            elif isinstance(consumtion_change.entity, POPackItemPlacement):
                                pack_item_placement = get_object_or_none(POPackItemPlacement, {'id': consumtion_change.entity_id})
                                if pack_item_placement:
                                    pack_item_placement.consumption_ratio = consumtion_change.new_consumption_ratio
                                    pack_item_placement.wastage = consumtion_change.new_wastage
                                    pack_item_placement.save()

                        if bcr.po_club and material_id:
                            material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
                            material_quantities = GeneralPOMaterialQuantity.objects.filter(
                                general_po__po_club=bcr.po_club,
                                material=material
                            )
                            for material_quantity in material_quantities:
                                material_quantity.completed = False
                                material_quantity.save()
                            select_marker_ids = BOMChangeRequestFabricMarker.objects.filter(bom_change_request_type=request_type).values_list('marker', flat=True)
                            void_markers = POFabricMarker.objects.filter(actual_club=bcr.po_club, po_material=material).exclude(id__in=select_marker_ids)
                            for void_marker in void_markers:
                                void_marker.void_marker = True
                                void_marker.save()
                            request_type.bom_change_request.po_club.generate_po_club_purchase_order_bom(material.material_detail.generic_material.user_material)
                            po_club_helper.generate_general_po_materials(material, None)

                            old_supplier_pos = SupplierPO.objects.filter(
                                supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material__customer_brand_material=material,
                                general_po_supplier__general_po__po_club=bcr.po_club
                            )

                            for old_supplier_po in old_supplier_pos:
                                old_supplier_po.state = SupplierPO.CANCEL_STATE
                                old_supplier_po.save()

                    if request_type.state == BOMChangeRequestChangeType.SUPPLIER_CHANGE:
                        for supplier_change in request_type.bomchangerequestsupplierchange_set.all():
                            marker_ids = BOMChangeRequestFabricVoidMarker.objects.filter(bom_change_request_type=request_type).values_list('void_marker', flat=True)
                            markers = POFabricMarker.objects.filter(id__in=marker_ids)
                            for marker in markers:

                                marker.void_marker = True
                                marker.save()
                            if bcr.po_club:
                                material_quantities = GeneralPOMaterialQuantity.objects.filter(
                                    general_po__po_club=bcr.po_club,
                                    material=supplier_change.material
                                )
                                for material_quantity in material_quantities:
                                    material_quantity.completed = False
                                    material_quantity.save()
                                old_supplier_pos = SupplierPO.objects.filter(
                                    supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material__customer_brand_material=supplier_change.material,
                                    general_po_supplier__general_po__po_club=bcr.po_club
                                )
                                for old_supplier_po in old_supplier_pos:
                                    old_supplier_po.state = SupplierPO.CANCEL_STATE
                                    old_supplier_po.save()
                                po_club_helper = POClubBOMChangeRequestHelper(bcr.po_club)
                                supplier_inquiry, supplier_inquiry_detail = po_club_helper.create_supplier_inquiry(bcr.po_club.pre_costing, supplier_change)
                                request_type.bom_change_request.po_club.generate_po_club_purchase_order_bom(supplier_change.material.material_detail.generic_material.user_material)
                                po_club_helper.generate_general_po_materials(supplier_change.material, supplier_inquiry_detail)

                bcr.state = BOMChangeRequest.APPROVED_STATE
                bcr.save()
            elif approval_status == Approval.REJECTED_APPROVAL:
                if approval.taskcomment_set.all().count() > 0:
                    bcr.state = BOMChangeRequest.REJECTED_STATE
                    bcr.save()
                else:
                    has_errors = True
                    errors.append('Enter comments to reject approval.')
    return has_errors, errors