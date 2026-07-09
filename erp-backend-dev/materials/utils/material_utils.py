from django.core.exceptions import MultipleObjectsReturned
from materials.models import *
import os


def is_user_defined_material(material_name):
    is_user_defined = False
    try:
        UserDefinedMaterial.objects.get(name=material_name)
        is_user_defined = True
    except (ObjectDoesNotExist, MultipleObjectsReturned):
        ...
    return is_user_defined


def add_normalized_material_quantities(quantity1, quantity2, customer_brand_material):
    material_helper = MaterialUnitHelper()
    consumption_measurement_unit = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
    measuring_unit = material_helper.get_normalized_unit_based_on_category(consumption_measurement_unit)
    if not measuring_unit:
        raise Exception(f"Measuring Unit not defined for material {customer_brand_material.pk}")

    normalized_quantity_1 = material_helper.convert_to_units(measuring_unit, quantity1['quantity'], quantity1['quantity_unit'])
    normalized_quantity_2 = material_helper.convert_to_units(measuring_unit, quantity2['quantity'], quantity2['quantity_unit'])

    data = {
        'quantity': normalized_quantity_1 + normalized_quantity_2,
        'quantity_unit': measuring_unit,
    }
    return data


def segregate_material_into_types(customer_brand_materials_qs):
    from materials.serializers.material_serializers import CustomerBrandMaterialV2Serializer
    packaging = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=PACKAGING_TYPES)
    sewing_trims = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=SEWING_TRIM_TYPES)
    fabrics = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)

    data = {
        'fabrics': CustomerBrandMaterialV2Serializer(fabrics, many=True).data,
        'sewing_trims': CustomerBrandMaterialV2Serializer(sewing_trims, many=True).data,
        'packaging': CustomerBrandMaterialV2Serializer(packaging, many=True).data,
    }
    return data


def segregate_material_into_types_and_material(customer_brand_materials_qs, costing):
    from materials.serializers.material_serializers import CustomerBrandMaterialV2Serializer
    from marketing.models import CostingCompletedMaterial

    packaging = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=PACKAGING_TYPES)
    sewing_trims = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=SEWING_TRIM_TYPES)
    fabrics = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)

    fabrics_data = {trim_type: [] for trim_type in fabrics.values_list('material_detail__generic_material__user_material__name', flat=True)}
    sewing_trims_data = {trim_type: [] for trim_type in sewing_trims.values_list('material_detail__generic_material__user_material__name', flat=True)}
    packaging_data = {pkg_type: [] for pkg_type in packaging.values_list('material_detail__generic_material__user_material__name', flat=True)}


    def get_sub_type(obj):
        return obj.material_detail.generic_material.user_material.name
    
    for obj in fabrics:
        sub_type = get_sub_type(obj)
        if sub_type in fabrics_data:
            costing_completed_material = CostingCompletedMaterial.objects.filter(costing_version=costing, material__name=sub_type).exists()
            fabrics_data[sub_type].append(CustomerBrandMaterialV2Serializer(obj).data),
            #fabrics_data[sub_type]['costing_completed_material'] = costing_completed_material

    for obj in sewing_trims:
        sub_type = get_sub_type(obj)
        if sub_type in sewing_trims_data:
            sewing_trims_data[sub_type].append(CustomerBrandMaterialV2Serializer(obj).data)

    for obj in packaging:
        sub_type = get_sub_type(obj)
        if sub_type in packaging_data:
            packaging_data[sub_type].append(CustomerBrandMaterialV2Serializer(obj).data)

    data = {
        'fabrics': fabrics_data,
        'sewing_trims': sewing_trims_data,
        'packaging': packaging_data,
    }
    return data

def get_sub_type(obj):
    return obj.material_detail.generic_material.user_material.name

def add_material_to_data(data_dict, obj, costing):
    from marketing.models import CostingCompletedMaterial
    from materials.serializers.material_serializers import CustomerBrandMaterialV2Serializer
    sub_type = get_sub_type(obj)
    if sub_type not in data_dict:
        costing_completed = CostingCompletedMaterial.objects.filter(
            costing_version=costing,
            material__name=sub_type
        ).exists()
        data_dict[sub_type] = {
            'costing_completed_material': costing_completed,
            'materials': []
        }
    data_dict[sub_type]['materials'].append(CustomerBrandMaterialV2Serializer(obj).data)


def segregate_material_into_types_and_material(customer_brand_materials_qs, costing):
    packaging = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=PACKAGING_TYPES)
    sewing_trims = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=SEWING_TRIM_TYPES)
    fabrics = customer_brand_materials_qs.filter(material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)

    fabrics_data = {}
    sewing_trims_data = {}
    packaging_data = {}

    for obj in fabrics:
        add_material_to_data(fabrics_data, obj, costing)

    for obj in sewing_trims:
        add_material_to_data(sewing_trims_data, obj, costing)

    for obj in packaging:
        add_material_to_data(packaging_data, obj, costing)

    return {
        'fabrics': fabrics_data,
        'sewing_trims': sewing_trims_data,
        'packaging': packaging_data,
    }

def get_is_supplier_po_created(po_club, material):
    from marketing.models import SupplierDeliveryDateQuantity, GeneralPOSupplier
    from supplier_po.models import SupplierPO
    is_created = False
    latest_po_state = None
    latest_po_state_display = None
    general_po_supplier_ids = SupplierDeliveryDateQuantity.objects.filter(
        general_po_material_quantity__material=material,
        supplier_delivery_date__general_po_supplier__general_po__po_club=po_club
    ).values_list('supplier_delivery_date__general_po_supplier', flat=True)
    general_po_suppliers = GeneralPOSupplier.objects.filter(id__in=general_po_supplier_ids)
    for genaral_po_supplier in general_po_suppliers:
        if genaral_po_supplier.supplier_po:
            is_created
    supplier_pos = SupplierPO.objects.filter(id__in=general_po_suppliers.values_list('supplierpo', flat=True)).order_by('-created')
    if supplier_pos:
        latest_po_state = supplier_pos[0].state
        latest_po_state_display = supplier_pos[0].get_state_display()
    return is_created, latest_po_state, latest_po_state_display

def segregate_po_club_material_into_types_and_material(customer_brand_materials_qs, po_club):
    from marketing.models import POClubCompletedMaterial
    from materials.serializers.material_serializers import CustomerBrandMaterialV2Serializer

    data = {}
    materials = customer_brand_materials_qs.values_list('material_detail__generic_material__user_material__name', flat=True)
    for material in materials:
        po_club_completed_material = POClubCompletedMaterial.objects.filter(po_club=po_club, material__name=material).exists()
        if material not in data:
            data[material] = {}
        data[material]['po_club_completed_material'] = po_club_completed_material
        data[material]['materials'] = []

        for customer_brand_material in customer_brand_materials_qs.filter(material_detail__generic_material__user_material__name=material):
            is_po_created, latest_po_state, latest_po_state_display  = get_is_supplier_po_created(po_club, customer_brand_material)
            material_data = CustomerBrandMaterialV2Serializer(customer_brand_material).data
            material_data['is_po_created'] = is_po_created
            material_data['latest_po_state'] = latest_po_state
            material_data['latest_po_state_display'] = latest_po_state_display
            data[material]['materials'].append(
                material_data
            )
        
    return data

