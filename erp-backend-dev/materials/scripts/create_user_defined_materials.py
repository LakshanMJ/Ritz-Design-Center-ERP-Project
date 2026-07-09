from materials.models import * #UserDefinedMaterial, UserDefinedMaterialAttribute, UserDefinedDropDownOptions


def create_sewing_trim_variation_eav(material):
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_color' % material.name,
        label='Color',
        is_material_variation=True,
        po_editable=True
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_size' % material.name,
        label='Size',
        is_material_variation=True
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )


def create_elastic_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Elastic',
        name='elastic',
        consumption_measurement_unit = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION,
        estimated_consumption_ratio_units = 'Metres'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='elastic_composition',
        label='Composition'
    )

    elastic_type, created = UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='elastic_type',
        label='Type'
    )

    UserDefinedDropDownOption.objects.get_or_create(
        value='woven',
        display_value='WOVEN',
        attribute=elastic_type
    )

    UserDefinedDropDownOption.objects.get_or_create(
        value='knit',
        display_value='KINT',
        attribute=elastic_type
    )

    create_sewing_trim_variation_eav(material)
    return material

def create_button_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Button',
        name='button',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces',
        display_order=200
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='button_composition',
        label='Composition'
    )
    create_sewing_trim_variation_eav(material)
    return material


def create_popper_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Popper',
        name='popper',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces',
        display_order=300
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='popper_composition',
        label='Composition'
    )
    create_sewing_trim_variation_eav(material)


def create_thread_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Thread',
        name='thread',
        consumption_measurement_unit = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION,
        estimated_consumption_ratio_units = 'Meters',
        display_order=100
    )[0]
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='thread_composition',
    #     label='Composition'
    # )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='tktnumber',
        label='TKTNumber'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_color' % material.name,
        label='Color',
        is_material_variation=True,
        po_editable=True
    )


def create_bow_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Bow',
        name='bow',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='bow_composition',
        label='Composition'
    )
    create_sewing_trim_variation_eav(material)


def create_zipper_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Zipper',
        name='zipper',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )

    create_sewing_trim_variation_eav(material)


def create_heatseal_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Heat Seal',
        name='heat_seal',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_color' % material.name,
        label='Color',
        is_material_variation=True,
        po_editable=True
    )


def create_staintape_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES, # to be verify
        material='Satin Tape',
        name='satin_tape',
        consumption_measurement_unit = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )
    create_sewing_trim_variation_eav(material)


def create_heringbonetape_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES, # to be verify
        material='Herringbone Tape',
        name='herringbone_tape',
        consumption_measurement_unit = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )
    create_sewing_trim_variation_eav(material)

def create_mobilon_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Mobilon',
        name='mobilon',
        consumption_measurement_unit = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION,
        estimated_consumption_ratio_units = 'Metres'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width',
        is_material_variation=True
    )

    create_sewing_trim_variation_eav(material)

#
# def create_flatknitcollor_eav():
#     material = UserDefinedMaterial.objects.get_or_create(
#         category=SEWING_TRIM_TYPES,
#         material='Flat Knit Collar',
#         name='flatknitcollar',
#         consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
#         estimated_consumption_ratio_units = 'Pieces'
#     )[0]
#
#     UserDefinedMaterialAttribute.objects.get_or_create(
#         material_id=material.pk,
#         attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
#         name='flatknitcollor_composition',
#         label='Composition'
#     )
#     create_sewing_trim_variation_eav(material)


def create_fabric():
    material = UserDefinedMaterial.objects.get_or_create(
        category=FABRIC_TRIM_TYPES,
        material="Fabric",
        name='fabric',
        consumption_measurement_unit = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION,
        estimated_consumption_ratio_units = 'Meters',
        display_order=0
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='fabric_composition',
        label='Composition'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='fabric_texture_description',
        label='Description'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.INTEGER_ATTRIBUTE,
        name='fabric_gsm',
        label='GSM'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='fabric_color',
        label='Color',
        is_material_variation=True,
        po_editable=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='fabric_type',
        label='Fabric Type',
        is_material_variation=True
    )
    return material


# def create_main_label_eav():
#     material = UserDefinedMaterial.objects.get_or_create(
#         category=SEWING_TRIM_TYPES,
#         material='Main Label',
#         name='mainlabel',
#         consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
#         estimated_consumption_ratio_units = 'Pieces'
#     )[0]
#     UserDefinedMaterialAttribute.objects.get_or_create(
#         material=material,
#         attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
#         name='%s_description' % material.name,
#         label='Description'
#     )
#     create_sewing_trim_variation_eav(material)

# def create_sewing_label_eav():
#     material = UserDefinedMaterial.objects.get_or_create(
#         category=SEWING_TRIM_TYPES,
#         material='Labels',
#         name='sewinglabels',
#         consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
#         estimated_consumption_ratio_units = 'Pieces'
#     )[0]

#     UserDefinedMaterialAttribute.objects.get_or_create(
#         material=material,
#         attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
#         name='%s_description' % material.name,
#         label='Description'
#     )

#     # UserDefinedMaterialAttribute.objects.get_or_create(
#     #     material_id=material.pk,
#     #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
#     #     name='carelabel_composition',
#     #     label='Composition'
#     # )
#     create_sewing_trim_variation_eav(material)


def create_main_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Main Label',
        name='main_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    create_sewing_trim_variation_eav(material)


def create_care_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Care Label',
        name='care_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    create_sewing_trim_variation_eav(material)


def create_size_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Size Label',
        name='size_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces',
        size_dependent=True
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    create_sewing_trim_variation_eav(material)

def create_vendor_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Vendor Label',
        name='vendor_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    create_sewing_trim_variation_eav(material)

def create_woven_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Woven Label',
        name='woven_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_international_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='International Label',
        name='international_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_miteredfold_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Miteredfold Label',
        name='miteredfold_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )


def create_flat_knit_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Flat Knit',
        name='flat_knit',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    create_sewing_trim_variation_eav(material)

def create_collar_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Collar',
        name='collar',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_height' % material.name,
        label='Height',
        is_material_variation=True
    )
    create_sewing_trim_variation_eav(material)

def create_cuff_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Cuff',
        name='cuff',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_height' % material.name,
        label='Height',
        is_material_variation=True
    )
    create_sewing_trim_variation_eav(material)

def create_interlining_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Interlining',
        name='interlining',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_color' % material.name,
        label='Color',
        is_material_variation=True,
        po_editable=True
    )

def create_rib_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Rib',
        name='rib',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_color' % material.name,
        label='Color',
        is_material_variation=True,
        po_editable=True
    )

def create_date_pip_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Date Pip',
        name='date_pip',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_tape_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Tape',
        name='tape',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_color' % material.name,
        label='Color',
        is_material_variation=True,
        po_editable=True
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width',
        is_material_variation=True
    )

def create_draw_code_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Draw Cord',
        name='draw_cord',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_hanger_loop_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Hanger Loop',
        name='hanger_loop',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_size_tab_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Size Tab',
        name='size_tab',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters',
        size_dependent=True
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_loop_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Loop',
        name='loop',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters',
        size_dependent=True
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_lace_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Lace',
        name='lace',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters',
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_bungee_code_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Bungee Code',
        name='bungee_code',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters',
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_ring_slider_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=SEWING_TRIM_TYPES,
        material='Ring & Slider',
        name='ring_slider',
        consumption_measurement_unit = MaterialUnitHelper.LENGTH_UNITS,
        estimated_consumption_ratio_units = 'Meters',
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )



def create_trims():
    # Fabric EVA's
    create_fabric()

    #Other Sewing Lables

    create_flat_knit_eav()
    create_mobilon_eav()
    create_heringbonetape_eav()
    create_staintape_eav()
    
    create_heatseal_eav()
    create_zipper_eav()
    create_bow_eav()
    create_thread_eav()
    create_popper_eav()
    create_elastic_eav()
    create_button_eav()

    # Lables EAV's
    create_main_label_eav()
    create_care_label_eav()
    create_size_label_eav()
    create_vendor_label_eav()
    create_woven_label_eav()
    create_international_label_eav()

    create_collar_eav()
    create_cuff_eav()
    create_interlining_eav()
    create_rib_eav()
    create_date_pip_eav()
    create_tape_eav()
    create_draw_code_eav()
    create_hanger_loop_eav()
    create_size_tab_eav()
    create_loop_eav()
    create_lace_eav()
    create_bungee_code_eav()
    create_ring_slider_eav()
    create_miteredfold_label_eav()

    materials  = UserDefinedMaterial.objects.all().order_by('category', 'material')
    counter = 400
    for material in materials:
        if material.name != 'fabric':
            material.display_order = counter
            material.save()
            counter += 100



    
