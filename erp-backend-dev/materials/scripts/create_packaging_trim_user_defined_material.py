from materials.models import *


def create_packaging_trim_variation_eav(material):
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
    #     name='%s_color' % material.name,
    #     label='Color'
    # )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
    #     name='%s_size' % material.name,
    #     label='Size'
    # )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM'
    # )
    pass


def create_carton_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Carton',
        name='carton',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name= '%s_type' % material.name,
        label='Type',
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length',
        is_material_variation=True
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width',
        is_material_variation=True
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_height' % material.name,
        label='Height',
        is_material_variation=True
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )


def create_carton_divider_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Carton Divider',
        name='carton_divider',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )

    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    create_packaging_trim_variation_eav(material)

def create_carton_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Carton Sticker',
        name='carton_sticker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )

def create_hook_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hook Sticker',
        name='hook_sticker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )


def create_hanger_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger',
        name='hanger',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    create_packaging_trim_variation_eav(material)


def create_hanger_size_clip_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger Size Clip',
        name='hanger_size_clip',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    # create_packaging_trim_variation_eav(material)


def create_hanger_sizer_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger Sizer',
        name='hanger_sizer',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    # create_packaging_trim_variation_eav(material)


def create_rfid_sticker_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='RFID Sticker/Tag',
        name='rfid_sticker_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    # create_packaging_trim_variation_eav(material)


def create_hang_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hang Tag',
        name='hang_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_master_poly_bag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Poly Bag',
        name='poly_bag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    create_packaging_trim_variation_eav(material)


def create_tissues_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Tissue',
        name='tissue',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    # create_packaging_trim_variation_eav(material)


def create_tag_pin_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Tag Pin',
        name='tag_pin',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    # create_packaging_trim_variation_eav(material)


def create_kimble_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Kimble',
        name='kimble',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_length' % material.name,
        label='Length'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    create_packaging_trim_variation_eav(material)


def create_cello_tape_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Cello Tape',
        name='cello_tape',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_type' % material.name,
        label='Type'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    create_packaging_trim_variation_eav(material)


def create_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Packing Label',
        name='packing_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    # create_packaging_trim_variation_eav(material)


def create_mrp_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='MRP Tag',
        name='mrp_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_insert_card_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Insert Card',
        name='insert_card',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_swing_ticket_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Swing Ticket',
        name='swing_ticket',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_size_pip_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Size Pip',
        name='size_pip',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)

def create_waterfall_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Waterfall',
        name='waterfall',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_loop_locker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Loop Locker',
        name='loop_locker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_dessicant_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Descant',
        name='descant',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    create_packaging_trim_variation_eav(material)


def create_barcode_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Barcode Sticker',
        name='barcode_sticker',
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
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_size' % material.name,
        label='Size'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE,
        name='%s_width' % material.name,
        label='Width'
    )
    UserDefinedMaterialAttribute.objects.get_or_create(
        material_id=material.pk,
        attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
        name='%s_uom' % material.name,
        label='Measurement Units',
        is_material_variation=True
    )
    create_packaging_trim_variation_eav(material)


def create_swing_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Swing Tag',
        name='swing_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )
    # UserDefinedMaterialAttribute.objects.get_or_create(
    #     material_id=material.pk,
    #     attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE,
    #     name='%s_uom' % material.name,
    #     label='UOM',
    #     is_material_variation=True
    # )
    # create_packaging_trim_variation_eav(material)


def create_insert_cardboard_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Insert Cardboard',
        name='insert_cardboard',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_kinble_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Kinble Tag',
        name='kinble_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_laminate_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Laminate Sticker',
        name='laminate_sticker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_collor_card_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Collor Card',
        name='collor_card',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )


def create_new_fit_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='New Fit',
        name='new_fit',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_hanger_plaque_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger Plaquet',
        name='hanger_plaque',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_box_end_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Box End Label',
        name='box_end_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_kaff_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Kaff Label',
        name='kaff_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_attribute_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Attribute Label',
        name='attribute_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_inner_label_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Inner Label',
        name='inner_label',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Sticker',
        name='sticker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_poly_bag_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Poly Bag Sticker',
        name='poly_bag_sticker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_price_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Price Sticker',
        name='price_sticker',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_hanger_size_sticker_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger Size Sticker',
        name='hanger_size_sticker',
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

def create_security_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Security Tag',
        name='security_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_string_code_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='String Code',
        name='string_code',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_special_tag_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Special Tag',
        name='special_tag',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_cascade_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Cascade',
        name='cascade',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_hanger_hook_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger Hook',
        name='hanger_hook',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_hanger_sizer_eav():
    material = UserDefinedMaterial.objects.get_or_create(
        category=PACKAGING_TYPES,
        material='Hanger Sizer',
        name='hanger_sizer',
        consumption_measurement_unit = MaterialUnitHelper.PIECES_UNIT_OPTION,
        estimated_consumption_ratio_units = 'Pieces'
    )[0]
    UserDefinedMaterialAttribute.objects.get_or_create(
        material=material,
        attribute_type=UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE,
        name='%s_description' % material.name,
        label='Description'
    )

def create_packaging_trims():
    create_carton_eav()
    create_hanger_size_clip_eav()
    create_rfid_sticker_tag_eav()
    create_hang_tag_eav()
    create_carton_divider_eav()
    create_sticker_eav()
    create_carton_sticker_eav()
    create_hook_sticker_eav()
    create_hanger_eav()
    create_master_poly_bag_eav()
    create_tissues_eav()
    create_tag_pin_eav()
    create_kimble_eav()
    create_cello_tape_eav()
    create_label_eav()
    create_mrp_tag_eav()
    create_insert_card_eav()
    create_swing_ticket_eav()
    create_hanger_sizer_eav()
    create_size_pip_eav()
    create_waterfall_eav()
    create_loop_locker_eav()
    create_dessicant_eav()
    create_barcode_sticker_eav()
    create_swing_tag_eav()
    create_kinble_tag_eav()
    create_laminate_sticker_eav()
    create_insert_cardboard_eav()
    create_collor_card_eav()
    create_new_fit_eav()
    create_hanger_plaque_eav()
    create_box_end_label_eav()
    create_inner_label_eav()
    create_kaff_label_eav()
    create_attribute_label_eav()
    create_poly_bag_sticker_eav()
    create_price_sticker_eav()
    create_hanger_size_sticker_eav()
    create_security_tag_eav()
    create_string_code_eav()
    create_special_tag_eav()
    create_cascade_eav()
    create_hanger_hook_eav()
    create_hanger_sizer_eav()