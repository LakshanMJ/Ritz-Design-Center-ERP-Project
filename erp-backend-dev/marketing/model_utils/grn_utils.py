from shared.utils import calculate_queryset_total_normalized_quantity, \
    calculate_queryset_total_normalized_quantity_from_property, get_quantity_dictionary


def calculate_material_delivery_quantity_summary(delivery_date, supplier_po_grn_materials, material):
    normalized_unit = material.material_normalized_measuring_unit
    quantity_details = {
        'ordered_quantity': delivery_date.get_delivery_date_ordered_quantity(material),
        'expected_quantity': None,
        'actual_quantity': None,
        'qa_rejected_quantity': None,
        'qa_passed_quantity': calculate_queryset_total_normalized_quantity_from_property(supplier_po_grn_materials, normalized_unit, 'total_expected_quantity', 'total_expected_quantity_units'),
    }
    expected_quantity = calculate_queryset_total_normalized_quantity(supplier_po_grn_materials, normalized_unit, 'total_expected_quantity', 'total_expected_quantity_units')
    quantity_details['expected_quantity'] = get_quantity_dictionary(expected_quantity, normalized_unit)

    actual_quantity = calculate_queryset_total_normalized_quantity(supplier_po_grn_materials, normalized_unit, 'total_actual_quantity', 'total_actual_quantity_units')
    quantity_details['actual_quantity'] = get_quantity_dictionary(actual_quantity, normalized_unit)

    qa_rejected_quantity = calculate_queryset_total_normalized_quantity(supplier_po_grn_materials, normalized_unit, 'total_qa_rejected_quantity', 'total_qa_rejected_quantity_units')
    quantity_details['qa_rejected_quantity'] = get_quantity_dictionary(qa_rejected_quantity, normalized_unit)

    total_qa_passed_quantity = calculate_queryset_total_normalized_quantity_from_property(supplier_po_grn_materials, normalized_unit, 'total_qa_passed_quantity', 'total_qa_passed_quantity', 'total_qa_passed_quantity_units')
    quantity_details['qa_passed_quantity'] = get_quantity_dictionary(total_qa_passed_quantity, normalized_unit)
    return quantity_details