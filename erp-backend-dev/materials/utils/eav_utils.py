from materials.models import UserDefinedMaterialAttribute, GenericMaterialVariation


def filter_material_variation(generic_material, material_eav_dict, **filter_kwargs):
    filter_query = {}

    for key, value in material_eav_dict.items():
        field = str(key) + '__iexact'
        filter_query[field] = str(value).strip()

    generic_material_variations = GenericMaterialVariation.objects.filter(
        **filter_query,
        generic_material=generic_material,
        **filter_kwargs
    ).order_by('id')
    return generic_material_variations
