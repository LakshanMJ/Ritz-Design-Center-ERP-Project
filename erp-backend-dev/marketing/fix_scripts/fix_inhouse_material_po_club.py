from shared.models import InHouseMaterial

def adding_po_club_to_inhouse_material():
    in_house_materials = (
        InHouseMaterial.objects.filter(
            po_club__isnull=True).select_related(
            'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club'
            )
        )

    update_list = []
    for material in in_house_materials:
        in_house_material_po_club = (
            material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club
        )
        if in_house_material_po_club:
            material.po_club = in_house_material_po_club
            update_list.append(material)

    if update_list:
        InHouseMaterial.objects.bulk_update(update_list, ['po_club'])
