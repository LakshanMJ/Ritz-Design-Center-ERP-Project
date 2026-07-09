from marketing.models import OrderCostingServiceSupplierInquiry, OrderCostingColorwayMaterialSupplierInquiry


def get_service_inquiries_for_colorway(version, colorway):
    service_suppliers = OrderCostingServiceSupplierInquiry.objects.filter(
        order_costing_version=version,
        item_service__pack_item__pack__colorway=colorway
    )
    service_response = []
    for service_supplier in service_suppliers:
        service_response.append({
            'item_service_id': service_supplier.item_service_id,
            'supplier_inquiry_detail_id': service_supplier.supplier_inquiry_detail_id
        })
    return service_response


def get_material_inquiries_for_colorway(version, colorway):
    material_suppliers = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
        order_costing_version=version,
        colorway=colorway,
    )
    material_response = []
    for material_supplier in material_suppliers:
        material_response.append({
            'customer_brand_material_id': material_supplier.customer_brand_material_id,
            'supplier_inquiry_detail_id': material_supplier.supplier_inquiry_detail_id
        })
    return material_response
