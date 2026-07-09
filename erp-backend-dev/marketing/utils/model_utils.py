from shared.utils import get_object_or_none


'''
@:param: materials: is an orderpackitemplacment material object
return: returns list of materials with key as material and values as details: ex: {'fabric': [{}, {}]}
'''
def get_material_details(materials, material_id_key='material_id'):
    from materials.models import CustomerBrandMaterial
    from marketing.models import AbstractOrderMaterialPlacement

    data = {}
    
    for material in materials:
        customer_brand_material_id = material.get(material_id_key, None)
        material_object = get_object_or_none(CustomerBrandMaterial, {'pk': customer_brand_material_id})
        material_type = material_object.material_detail.generic_material.user_material.name
        if material:
            if not data.get(material_type, None):
                data[material_type] = []
            material_attributes = material_object.get_attributes()
            material_attributes[AbstractOrderMaterialPlacement.CUSTOMER_BRAND_MATERIAL_ID_KEY] = customer_brand_material_id
            data[material_type].append(material_attributes)
    return data


def get_version_service_details(serivices):
    data = {}

    for service in serivices:
        attributes = service.get_attributes()
        attributes['pack_item_size'] = service.pack_item.pack.size.size.name
        attributes['pack_item_colorway'] = service.pack_item.pack.colorway.colorway
        attributes['pack_item_country'] = service.pack_item.pack.country.country.name
        if not data.get(service.service_type, None):
            data[service.service_type] = {
                'service_type_display': service.get_service_type_display(),
                'data': []
            }
        data[service.service_type]['data'].append(attributes)
    return data
