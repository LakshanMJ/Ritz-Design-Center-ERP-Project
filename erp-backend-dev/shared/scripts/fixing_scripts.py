from marketing.models import ItemAttribute, POClubCompletedMaterial, CostingCompletedMaterial, PurchaseOrderBom, PurchaseOrder
from rest_framework.generics import get_object_or_404
from materials.models import UserDefinedMaterial, GenericMaterial, GenericMaterialVariation
from django.db import transaction
from supplier_po.models import SupplierPO, GeneralPOSupplier, GeneralPOMaterialQuantity, GeneralPOSupplierMaterialPrice, SupplierRequestedDeliveryDate, SupplierDeliveryDate, \
                                SupplierDeliveryDateQuantity, SupplierDeliveryDateQuantityPOAllocation, SupplierPOGeneralPOMaterialQuantity, SupplierPODeliveryInvoice, \
                                SupplierPOInvoiceDeliveryNote, SupplierPODeliveryInvoicePackList, SupplierPOGRN, SupplierActualDeliveryDate

def fixing_item_attributes():
    item_attributes = ItemAttribute.objects.filter(material_id=None)
    for item_attribute in item_attributes:
        material = get_object_or_404(UserDefinedMaterial, name=item_attribute.type)
        item_attribute.material = material
        item_attribute.save()

# def get_eav_data(material_attributes, object):
#         data = {}
#         generic_material_eav = object.eav
#         for material_attribute in material_attributes:
#             data[material_attribute.name] = getattr(generic_material_eav, material_attribute.name, None)
#         return data

# def fixing_generic_material_variations():
#     generic_materials = GenericMaterial.objects.filter(id=1)

#     for generic_material in generic_materials:
#         material_attributes = generic_material.user_material.get_material_variation_fields()
#         data = get_eav_data(material_attributes, generic_material)
#         generic_material.user_defined_material_data = data
#         generic_material.save()

def merge_generic_material_variation_data(generic_material):

    if not isinstance(generic_material.user_defined_material_data, dict):
        generic_material.user_defined_material_data = {}

    variations = GenericMaterialVariation.objects.filter(generic_material=generic_material)

    for variation in variations:
        if isinstance(variation.user_defined_material_data, dict):
            for key, value in variation.user_defined_material_data.items():
                if key in generic_material.user_defined_material_data:
                    existing_value = generic_material.user_defined_material_data[key]
                    if isinstance(existing_value, list):
                        if value not in existing_value:
                            existing_value.append(value)
                    else:
                        generic_material.user_defined_material_data[key] = [existing_value, value] if value != existing_value else [existing_value]
                else:
                    generic_material.user_defined_material_data[key] = value

    with transaction.atomic():
        generic_material.save()

def fixing_order_placement_estimated_consumption_ratios():
    from marketing.models import OrderPackItemPlacement, OrderPackPlacement, OrderPlacement
    order_pack_item_placements = OrderPackItemPlacement.objects.all()
    order_pack_placements = OrderPackPlacement.objects.all()
    order_placements = OrderPlacement.objects.all()

    for order_pack_item_placement in order_pack_item_placements:
        if not order_pack_item_placement.estimated_consumption_ratio:
            order_pack_item_placement.estimated_consumption_ratio = order_pack_item_placement.item_attribute_other.item_attribute.estimated_consumption_ratio if order_pack_item_placement.item_attribute_other.item_attribute else None
            order_pack_item_placement.estimated_consumption_ratio_units = order_pack_item_placement.item_attribute_other.item_attribute.estimated_consumption_ratio_units if order_pack_item_placement.item_attribute_other.item_attribute else None
            order_pack_item_placement.save()

    for order_pack_placement in order_pack_placements:
        if not order_pack_placement.estimated_consumption_ratio:
            order_pack_placement.estimated_consumption_ratio = order_pack_placement.item_attribute_other.item_attribute.estimated_consumption_ratio if order_pack_placement.item_attribute_other.item_attribute else None
            order_pack_placement.estimated_consumption_ratio_units = order_pack_placement.item_attribute_other.item_attribute.estimated_consumption_ratio_units if order_pack_placement.item_attribute_other.item_attribute else None
            order_pack_placement.save()

    for order_placement in order_placements:
        if not order_placement.estimated_consumption_ratio:
            order_placement.estimated_consumption_ratio = order_placement.item_attribute.estimated_consumption_ratio if order_placement.item_attribute else None
            order_placement.estimated_consumption_ratio_units = order_placement.item_attribute.estimated_consumption_ratio_units if order_placement.item_attribute else None
            order_placement.save()

def get_item_data():
    from marketing.models import Item, ItemAttribute
    data = []
    items = Item.objects.all()
    for item in items:
        item_data = {
            'name': item.name,
            'code': item.code,
            'brand': item.customer_brand.brand.name,
            'customer': item.customer_brand.customer.name,
            'attributes': []  # Fixed spelling here
        }
        attributes = item.itemattribute_set.all()
        for attribute in attributes:
            item_data['attributes'].append({
                'placement': attribute.placement,
                'type': attribute.type,
                'assign_type': attribute.assign_type,
                'material': attribute.material.name if attribute.material else None,
                'estimated_consumption_ratio': attribute.estimated_consumption_ratio,
                'estimated_consumption_ratio_units': attribute.estimated_consumption_ratio_units,
                'is_mandatory': attribute.is_mandatory
            })
        data.append(item_data)
    return data

def thread_fixing_script():
    material = get_object_or_404(UserDefinedMaterial, name='thread')
    generic_materials = GenericMaterial.objects.filter(user_material=material)
    for generic_material in generic_materials:
        generic_material_variations = GenericMaterialVariation.objects.filter(generic_material=generic_material)
        for generic_material_variation in generic_material_variations:
            print(generic_material.user_defined_material_data, generic_material_variation.user_defined_material_data)
    return True

def delete_supplier_pos():
    delete_supplier_po_ids = [82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99]
    spos = SupplierPO.objects.filter(id__in=delete_supplier_po_ids)
    for spo in spos:
        spo.delete()
	
def delete_supplier_pos_with_related_items():
    delete_supplier_po_ids = [101]
    spos = SupplierPO.objects.filter(id__in=delete_supplier_po_ids)
    for spo in spos:
        general_po_supplier = spo.general_po_supplier
        spo_materials = SupplierPOGeneralPOMaterialQuantity.objects.filter(supplier_po=spo)
        for spo_material in spo_materials:
            spo_material.delete()
            
        delivery_dates = SupplierDeliveryDate.objects.filter(general_po_supplier=general_po_supplier)
        
        for supplier_delivery_date in delivery_dates:
            delivery_date_quantities = SupplierDeliveryDateQuantity.objects.filter(supplier_delivery_date=supplier_delivery_date)
            
            for supplier_delivery_date_quantity in delivery_date_quantities:
                delivery_date_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(supplier_delivery_date_quantity=supplier_delivery_date_quantity)
                for delivery_date_po_allocation in delivery_date_po_allocations:
                    delivery_date_po_allocation.delete()
                    
                supplier_delivery_date_quantity.delete()
            supplier_delivery_date.delete()

        requested_dates = SupplierRequestedDeliveryDate.objects.filter(supplier_po=spo)
        
        for requested_date in requested_dates:
            requested_date.delete()
        
        prices = GeneralPOSupplierMaterialPrice.objects.filter(general_po_supplier=general_po_supplier, supplier_material__customer_brand_material__material_detail__generic_material__user_material__id__in=[63, 41])
        quantities = GeneralPOMaterialQuantity.objects.filter(default_material_supplier__in=prices, material__material_detail__generic_material__user_material__id__in=[63, 41])

        for quantity in quantities:
            quantity.delete()
        for price in prices:
            price.delete()

        general_po_supplier.delete()
        spo.delete()

    po_club_completed_material1 = POClubCompletedMaterial.objects.get(po_club=44, material_id=41)
    po_club_completed_material2 = POClubCompletedMaterial.objects.get(po_club=44, material_id=63)
    po_club_completed_material1.delete()
    po_club_completed_material2.delete()

    costing_completed_material1 = CostingCompletedMaterial.objects.get(costing_version_id=69, material_id=41)
    costing_completed_material2 = CostingCompletedMaterial.objects.get(costing_version_id=69, material_id=63)
    costing_completed_material1.delete()
    costing_completed_material2.delete()

def delete_purchase_order_boms():
    po_ids = [70,71,72,73,74]
    pos = PurchaseOrder.objects.filter(id__in=po_ids)
    boms = PurchaseOrderBom.objects.filter(purchase_order__in=pos, material__material_detail__generic_material__user_material__id__in=[63, 41])
    for bom in boms:
        bom.delete()



def fix_supplier_po_invoice_wrongly_added():

    invoice = SupplierPODeliveryInvoice.objects.create(
        supplier_invoice_number='CK 25000100113',
        ci_state=SupplierPODeliveryInvoice.OPEN_STATE,
        invoice_id=1542
    )

    delivery_note = SupplierPOInvoiceDeliveryNote.objects.create(
        supplier_display_number='TH/2025/RDC/01',
        delivery_note_id=1543,
        supplier_po_delivery_invoice=invoice
    )

    pack_list = SupplierPODeliveryInvoicePackList.objects.create(
        supplier_po_delivery_note=delivery_note,
        pack_list_id=1579,
        supplier_display_number='pack list 01'
    )

    grn_ids = [28, 29, 30]

    grns = SupplierPOGRN.objects.filter(id__in=grn_ids)
    for grn in grns:
        grn.supplier_pack_list=pack_list
        grn.save()

    actual_delivery_date = SupplierActualDeliveryDate.objects.get(pk=26)
    actual_delivery_date.supplier_po_delivery_invoice = invoice
    actual_delivery_date.save()
