from supplier_po.models import GeneralPO, GeneralPOMaterialQuantity, GeneralPOSupplierMaterialPrice, GeneralPOSupplier, SupplierDeliveryDateQuantity
from marketing.models import OrderCostingColorwayMaterialSupplierInquiry, ItemColorwayCategoryFabricConsumptionRatio
from shared.utils import get_object_or_none
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from math import ceil


class GeneralPOBOM():

    general_po = None
    def __init__(self, general_po):
        self.general_po = general_po

    def create_general_po_material_quantity(self, general_po_material_quantities):
        for key in general_po_material_quantities:
            material_quantity_data = general_po_material_quantities[key]
            supplier_inquiry_detail = material_quantity_data['supplier_inquiry_detail']
            supplier = supplier_inquiry_detail.supplier_inquiry.supplier
            supplier_material = supplier_inquiry_detail.supplier_inquiry_material_code
            general_po_supplier, created = GeneralPOSupplier.objects.get_or_create(
                supplier=supplier,
                general_po=material_quantity_data['general_po']
            )
            new_supplier_material = supplier_inquiry_detail.supplier_inquiry_material_code.get_related_supplier_material_for_different_supplier_material(material_quantity_data['material'], True)
            general_po_supplier_material_price, price_created = GeneralPOSupplierMaterialPrice.objects.get_or_create(
                general_po_supplier=general_po_supplier,
                supplier_material=new_supplier_material,
                supplier_inquiry_detail=supplier_inquiry_detail
            )
            if price_created:
                general_po_supplier_material_price.lead_time = supplier_inquiry_detail.lead_time
                general_po_supplier_material_price.costing_price = supplier_inquiry_detail.cost_per_unit
                general_po_supplier_material_price.costing_price_units = supplier_inquiry_detail.costing_unit
                general_po_supplier_material_price.order_price = supplier_inquiry_detail.cost_per_unit
                general_po_supplier_material_price.order_price_units = supplier_inquiry_detail.costing_unit
            if not general_po_supplier_material_price.incoterm:
                general_po_supplier_material_price.incoterm = supplier_inquiry_detail.pay_mode
            if not general_po_supplier_material_price.transport_method:
                general_po_supplier_material_price.transport_method = supplier_inquiry_detail.ship_mode
            general_po_supplier_material_price.save()

            general_po_material_quantity, material_quantity_created = GeneralPOMaterialQuantity.objects.get_or_create(
                general_po=material_quantity_data['general_po'],
                material=material_quantity_data['material'],
                default_material_supplier=general_po_supplier_material_price
            )
            general_po_material_quantity.quantity = material_quantity_data['quantity']
            general_po_material_quantity.measuring_unit = material_quantity_data['measuring_unit']
            general_po_material_quantity.order_quantity = material_quantity_data['quantity']
            general_po_material_quantity.order_quantity_units = material_quantity_data['measuring_unit']
            general_po_material_quantity.save()

            supplier_delivery_date_quantity, supplier_delivery_date_quantity_created = SupplierDeliveryDateQuantity.objects.get_or_create(
                general_po_material_quantity=general_po_material_quantity,
                material_supplier=general_po_supplier_material_price,
                default_supplier=True
            )
            supplier_delivery_date_quantity.quantity = general_po_material_quantity.quantity
            supplier_delivery_date_quantity.quantity_units = general_po_material_quantity.order_quantity_units
            supplier_delivery_date_quantity.save()

    def create_general_po_bom(self):
        general_po_material_quantities = {}
        general_po_quantities = self.general_po.generalpoquantity_set.all()
        for general_po_quantity in general_po_quantities:
            quantity = general_po_quantity.quantity
            pack = general_po_quantity.pack

            size = pack.size
            colorway = pack.colorway
            country = pack.country
            cad_quantity = pack.cad_quantity
            order_costing_version = pack.version
            placements = pack.get_pack_placements()
            items = pack.get_pack_items()
            for item in items:
                pack_item_placements = item.get_pack_item_placements()
                for pack_item_placement in pack_item_placements:
                    pack_item_placement_material = pack_item_placement.get_placement_material_object()
                    material = pack_item_placement_material.material
                    material_id = str(material.id)
                    order_costing_colorway_material_supplier_inquiry = get_object_or_none(OrderCostingColorwayMaterialSupplierInquiry,{'order_costing_version':order_costing_version,
                                                                                                                                      'customer_brand_material':material,
                                                                                                                                      'colorway':colorway})
                    supplier_inquiry_detail = pack.get_selected_supplier_inquiry_for_material(material).supplier_inquiry_detail
                    order_pack_item_colorway_type = pack_item_placement.order_pack_item.get_order_pack_item_colorway_type()
                    colorway_category = order_pack_item_colorway_type.colorway_category if order_pack_item_colorway_type else None
                    column_3_consumption = get_object_or_none(ItemColorwayCategoryFabricConsumptionRatio,{'item':item.item.item,
                                                                                    'supplier_inquiry_detail':supplier_inquiry_detail,
                                                                                    'version':order_costing_version,
                                                                                    'colorway_category':colorway_category})
                    if column_3_consumption:
                        consumption = column_3_consumption.costing_consumption_ratio
                        wastage = consumption*column_3_consumption.wastage/100
                        consumption += wastage
                        consumption = round(consumption,4)
                    else:
                        costing_data = pack_item_placement.get_placement_material_consumption(supplier_inquiry_detail)
                        consumption = costing_data.costing_consumption_ratio
                        wastage = consumption*costing_data.wastage/100
                        consumption += wastage
                        consumption = round(consumption,4)
                    if not material_id in general_po_material_quantities:
                        general_po_material_quantities[material_id] = {
                            'material': material,
                            'general_po': self.general_po,
                            'quantity': 0,
                            'measuring_unit': material.material_normalized_measuring_unit,
                            'supplier_inquiry_detail': supplier_inquiry_detail
                        }
                    general_po_material_quantities[material_id]['quantity'] += float(quantity*consumption)
                    general_po_material_quantities[material_id]['quantity'] = ceil(general_po_material_quantities[material_id]['quantity'])
            for placement in placements:
                # placement_material_consumption = placement.get_placement_material_consumption()
                placement_material = placement.get_placement_material_object()
                placement_material_consumption = placement_material.orderpackplacementmaterialconsumption
                material = placement_material.material if placement_material else None
                consumption = placement_material_consumption.costing_consumption_ratio if placement_material_consumption else 0
                if material and consumption > 0:
                    material_id = str(material.id)
                    if not material_id in general_po_material_quantities:
                        order_costing_colorway_material_supplier_inquiry = get_object_or_none(OrderCostingColorwayMaterialSupplierInquiry,{'order_costing_version':order_costing_version,
                                                                                                                                      'customer_brand_material':material,
                                                                                                                                      'colorway':colorway})
                        supplier_inquiry_detail = order_costing_colorway_material_supplier_inquiry.supplier_inquiry_detail # remove this
                        supplier_inquiry_detail = pack.get_selected_supplier_inquiry_for_material(material).supplier_inquiry_detail
                        general_po_material_quantities[material_id] = {
                            'material': material,
                            'general_po': self.general_po,
                            'quantity': 0,
                            'measuring_unit': material.material_normalized_measuring_unit,
                            'supplier_inquiry_detail': supplier_inquiry_detail
                        }
                    general_po_material_quantities[material_id]['quantity'] += float(quantity*consumption)
                    general_po_material_quantities[material_id]['quantity'] = ceil(general_po_material_quantities[material_id]['quantity'])
        self.create_general_po_material_quantity(general_po_material_quantities)
                    