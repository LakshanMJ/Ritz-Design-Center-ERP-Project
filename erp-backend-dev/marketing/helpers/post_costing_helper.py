from marketing.models import POPackItemPlacement, POPackItem, POPackItemService, POPack, POFabricMarkerPlacement, \
    POFabricMarker
from materials.models import FABRIC_TRIM_TYPES, CustomerBrandMaterial
from shared.utils import convert_per_unit_cost, convert_quantity_to_unit, is_none, get_float_or_zero, \
    convert_to_float_or_none
from supplier_po.models import GeneralPOSupplierMaterialPrice, SupplierDeliveryDateQuantityPOAllocation
from marketing.serializers import OrderInquirySerializer

# POPackPostCostingHelper
class POPackPreSeenCostingHelper:

    def get_material_average_cost(self, purchase_order, customer_brand_material):
        average_cost = purchase_order.get_material_average_order_cost(customer_brand_material)
        return average_cost

    def get_material_suppliers(self, purchase_order, customer_brand_material):
        supplier_material_prices = purchase_order.get_material_supplier_prices(customer_brand_material)
        return supplier_material_prices

    def get_supplier_material_price_attributes(self, material_supplier_prices):
        data = []
        for material_supplier_price in material_supplier_prices:
            data.append({
                'id': material_supplier_price.pk,
                'supplier': {
                    'id': material_supplier_price.general_po_supplier.supplier.id,
                    'name': material_supplier_price.general_po_supplier.supplier.name,
                },
                'order_price': {
                    'price': material_supplier_price.order_price,
                    'price_unit': material_supplier_price.order_price_unit,
                },
                'discount': material_supplier_price.discount
            })
        return data

    def pack_item_placement_attributes(self, placement, cost, material_suppliers, type):
        data = {
            'id': placement.pk,
            'consumption_ratio': placement.consumption_ratio,
            'wastage': placement.wastage,
            'type': type,
            'required_quantity': {
                'quantity': convert_to_float_or_none(placement.material_quantity),
                'quantity_unit': placement.material_quantity_units
            },
            'cost': cost,
            'material_data': placement.po_material.get_attributes(),
            'material_suppliers': material_suppliers
        }
        return data

    def calculate_fabric_placement_average_consumption_and_wastage(self, placement):
        marker_placements = self.get_fabric_booking_marker_placements(placement)
        total_ply_count = 0
        consumption_total = 0
        wastage_total = 0
        for marker_placement in marker_placements:
            ply_count = marker_placement.marker.number_of_plies

            # if total_ply_count == 0:
            #     ply_count = 1
            consumption_total += (marker_placement.calculated_consumption_ratio * ply_count)
            wastage_total += (marker_placement.marker.wastage * ply_count)
            total_ply_count += ply_count

        average_consumption = None
        average_wastage = None
        if total_ply_count > 0:
            average_consumption = consumption_total / total_ply_count
            average_wastage = wastage_total / total_ply_count
        return average_consumption, average_wastage

    def calculate_fabric_costs(self, placements, purchase_order, po_pack):
        cost_data = []
        total_cost = 0
        for placement in placements:
            required_quantity_units = placement.material_quantity_units

            average_cost = self.get_material_average_cost(purchase_order, placement.po_material)
            material_suppliers = self.get_material_supplier_inquiry_data(purchase_order, placement.po_material)
            normalized_average_cost = convert_per_unit_cost(required_quantity_units, get_float_or_zero(average_cost['cost']), average_cost['cost_unit'])

            consumption, wastage = self.calculate_fabric_placement_average_consumption_and_wastage(placement)

            cost = None
            if not (is_none(normalized_average_cost['cost']) or is_none(consumption) or is_none(wastage) or is_none(total_cost)):
                cost = float(consumption) * (1 + wastage/100) * float(normalized_average_cost['cost'])
                total_cost += cost
            else:
                total_cost = None

            placement_data = self.pack_item_placement_attributes(placement, cost, material_suppliers, 'po_pack_item_placement')
            placement_data['average_cost'] = average_cost
            placement_data['consumption_ratio'] = consumption
            placement_data['wastage'] = wastage
            cost_data.append(placement_data)
        data = {
            'cost_data': cost_data,
            'total_cost': total_cost
        }
        return data

    # def calculate_fabric_costs(self, placements, purchase_order, po_pack):
    #     cost_data = {}
    #     total_cost = 0
    # 
    #     for placement in placements:
    #         required_quantity = placement.material_quantity
    #         required_quantity_units = placement.material_quantity_units
    #         average_cost = self.get_material_average_cost(purchase_order, placement.po_material)
    #         normalized_average_cost = convert_per_unit_cost(required_quantity_units, get_float_or_zero(average_cost['cost']), average_cost['cost_unit'])
    # 
    #         cost = None
    #         if not is_none(normalized_average_cost['cost']):
    #             cost = (float(required_quantity) * float(normalized_average_cost['cost'])) / po_pack.quantity
    #             total_cost += cost
    # 
    #         if not cost_data.get(placement.po_material.id, None):
    #             cost_data[placement.po_material_id] = self.pack_item_placement_attributes(placement, cost, 'po_pack_item_placement')
    #         else:
    #             normalized_quantity = convert_quantity_to_unit(cost_data[placement.po_material_id]['required_quantity']['quantity_unit'], get_float_or_zero(placement.material_quantity), placement.material_quantity_units)
    #             if is_none(cost_data[placement.po_material_id]['required_quantity']['quantity']) or is_none(normalized_quantity['quantity']):
    #                 cost_data[placement.po_material_id]['required_quantity']['quantity'] = None
    #             else:
    #                 cost_data[placement.po_material_id]['required_quantity']['quantity'] += float(normalized_quantity['quantity'])
    # 
    #             if is_none(cost_data[placement.po_material_id]['cost']) or is_none(cost):
    #                 cost_data[placement.po_material_id]['cost'] = None
    #             else:
    #                 cost_data[placement.po_material_id]['cost'] += cost
    #     data = {
    #         'cost_data': list(cost_data.values()),
    #         'total_cost': total_cost
    #     }
    #     return data

    def get_fabric_booking_marker_placements(self, fabric_placement):
        marker_placements = POFabricMarkerPlacement.objects.filter(
            marker__marker_classification=POFabricMarker.BOOKING_MARKER,
            placement=fabric_placement,
            marker__reviewed=True
        )
        return marker_placements

    def get_material_supplier_inquiry_data(self, purchase_order, customer_brand_material):
        material_price_ids = purchase_order.get_material_supplier_deliver_date_po_allocations(customer_brand_material).values_list('supplier_delivery_date_quantity__material_supplier_id', flat=True)

        data = []

        material_prices = GeneralPOSupplierMaterialPrice.objects.filter(pk__in=material_price_ids)

        for material_price in material_prices:
            data.append({
                'general_po_supplier_material_price_id': material_price.pk,
                'order_price': {
                    'price': material_price.order_price,
                    'price_unit': material_price.order_price_units,
                    'price_unit_display': material_price.get_order_price_units_display(),
                },
                'discount': material_price.discount,
                'excess_threshold': material_price.excess_threshold,
                'supplier_name': material_price.general_po_supplier.supplier.name,
            })
        return data

    def calculate_placement_costs(self, placements, purchase_order, po_pack):
        cost_data = []
        total_cost = 0
        for placement in placements:
            # required_quantity = placement.material_quantity
            # required_quantity_units = placement.material_quantity_units
            consumption_ratio = placement.consumption_ratio
            wastage = placement.wastage
            consumption_ratio_units = placement.po_material.material_normalized_measuring_unit
            average_cost = self.get_material_average_cost(purchase_order, placement.po_material)
            material_suppliers = self.get_material_supplier_inquiry_data(purchase_order, placement.po_material)
            # TODO - reduce the leftover allocation quantity (might have to average it out)
            # print(consumption_ratio_units, average_cost)
            cost = None
            if not (is_none(average_cost['cost']) or is_none(average_cost['cost_unit'])):
                normalized_average_cost = convert_per_unit_cost(consumption_ratio_units, average_cost['cost'], average_cost['cost_unit'])
                # cost = (float(required_quantity) * normalized_average_cost['cost']) / po_pack.quantity
                cost = float(consumption_ratio) * (1 + wastage/100) * normalized_average_cost['cost']
            else:
                total_cost = None

            if not (is_none(cost) or is_none(total_cost)):
                total_cost += cost

            placment_data = self.pack_item_placement_attributes(placement, cost, material_suppliers, 'po_pack_item_placement')
            placment_data['average_cost'] = average_cost
            cost_data.append(placment_data)

        data = {
            'total_cost': total_cost,
            'cost_data': cost_data,
        }
        return data

    def calculate_po_pack_item_placement_cost(self, po_pack_item):
        placements = po_pack_item.get_po_pack_item_placements()
        fabrics = placements.filter(po_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)
        sewing_trims = placements.exclude(po_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)

        fabric_costs = self.calculate_fabric_costs(fabrics, po_pack_item.po_pack.purchase_order, po_pack_item.po_pack)
        sewing_trim_costs = self.calculate_placement_costs(sewing_trims, po_pack_item.po_pack.purchase_order, po_pack_item.po_pack)
        data = {
            'fabric_costs': fabric_costs,
            'sewing_trim_costs': sewing_trim_costs
        }
        return data

    def calculate_po_pack_item_service_cost(self, po_pack_item):
        return po_pack_item.order_pack_item.calculate_pack_item_service_cost()

    def calculate_po_pack_item_smv(self, po_pack_item):
        return po_pack_item.order_pack_item.calculate_ie_operation_cost()

    def calculate_po_pack_item_post_costing(self, po_pack_item):
        placement_costs = self.calculate_po_pack_item_placement_cost(po_pack_item)
        service_costs = self.calculate_po_pack_item_service_cost(po_pack_item)
        ie_operation_costs = self.calculate_po_pack_item_smv(po_pack_item)

        fabric_cost = placement_costs['fabric_costs']['total_cost']
        sewing_trim_cost = placement_costs['sewing_trim_costs']['total_cost']
        service_cost = service_costs['total_cost']
        ie_operation_cost = float(ie_operation_costs['total_cost'])

        pack_item_cost = None
        fabric_financing_cost = None
        trim_financing_cost = None
        if not (is_none(fabric_cost) or is_none(sewing_trim_cost) or is_none(service_cost) or is_none(ie_operation_cost)):

            fabric_financing_percentage = po_pack_item.po_pack.order_pack.version.get_version_fabric_financing_percentage(po_pack_item.order_pack_item)
            fabric_financing_cost = fabric_cost * (get_float_or_zero(fabric_financing_percentage)/100)

            trim_financing_percentage = po_pack_item.po_pack.order_pack.version.get_version_trim_financing_percentage(po_pack_item.order_pack_item)
            trim_financing_cost = sewing_trim_cost * (get_float_or_zero(trim_financing_percentage)/100)
            # print(fabric_cost , sewing_trim_cost , service_cost , ie_operation_cost , trim_financing_cost , fabric_financing_cost)
            pack_item_cost = fabric_cost + sewing_trim_cost + service_cost + ie_operation_cost + trim_financing_cost + fabric_financing_cost

        cost_data = {
            **placement_costs,
            'service_costs': service_costs,
            'ie_costs': ie_operation_costs,
            'total_cost': pack_item_cost,
            'trim_financing_cost': trim_financing_cost,
            'fabric_financing_cost': fabric_financing_cost
        }
        return cost_data

    def calculate_packaging_costs(self, po_pack):
        pack_placements = po_pack.get_po_pack_placements()
        placement_costs = self.calculate_placement_costs(pack_placements, po_pack.purchase_order, po_pack)
        trim_financing_percentage = po_pack.order_pack.version.get_version_trim_financing_percentage(po_pack.order_pack)

        trim_financing_cost = None
        if not (is_none(placement_costs['total_cost']) or is_none(trim_financing_percentage)):
            trim_financing_cost = placement_costs['total_cost'] * (get_float_or_zero(trim_financing_percentage) / 100)
        placement_costs['trim_financing_cost'] = trim_financing_cost
        return placement_costs

    def calculate_buyer_commision_cost(self, po_pack, total_cost):
        buyer_commission_cost = 0
        brokerage_percentage = po_pack.order_pack.version.get_version_buyer_commission_percentage()
        if total_cost and brokerage_percentage:
            buyer_commission_cost = get_float_or_zero(total_cost) * (get_float_or_zero(brokerage_percentage) / 100)
        return buyer_commission_cost

    def calculate_po_pack_post_costing(self, po_pack):
        # Placement costs, other costs, financing costs, commissions
        packaging_placement_costs = self.calculate_packaging_costs(po_pack)
        other_costs = po_pack.order_pack.calculate_other_costs()
        po_pack_items = po_pack.get_po_pack_items()

        total_cost = None
        if not (is_none(packaging_placement_costs['total_cost']) or is_none(other_costs['total_cost'])):
            total_cost = packaging_placement_costs['total_cost'] + float(other_costs['total_cost'])

        pack_item_costs = []
        fabric_financing_total_cost = 0
        trim_financing_total_cost = packaging_placement_costs['trim_financing_cost']
        total_fabric_cost = 0
        total_sewing_trim_cost = 0
        for po_pack_item in po_pack_items:
            po_pack_item_cost = self.calculate_po_pack_item_post_costing(po_pack_item)
            pack_item_costs.append(po_pack_item_cost)

            if not (is_none(total_cost) or is_none(po_pack_item_cost['total_cost'])):
                total_cost += po_pack_item_cost['total_cost']
                fabric_financing_total_cost += po_pack_item_cost['fabric_financing_cost']
                trim_financing_total_cost += po_pack_item_cost['trim_financing_cost']

                total_fabric_cost += po_pack_item_cost['fabric_costs']['total_cost']
                total_sewing_trim_cost += po_pack_item_cost['sewing_trim_costs']['total_cost']
            else:
                total_cost = None
                total_sewing_trim_cost = None
                total_fabric_cost = None
                break

        buyer_commission = None
        if total_cost:
            buyer_commission = self.calculate_buyer_commision_cost(po_pack, total_cost)
            total_cost += buyer_commission

        cost_data = {
            'meta_data': OrderInquirySerializer(po_pack.order_pack.size.order, many=False).data,
            'packaging_costs': packaging_placement_costs,
            'other_costs': other_costs,
            'buyer_commission': buyer_commission,
            'total_fabric_financing_cost': fabric_financing_total_cost,
            'total_trim_financing_cost': trim_financing_total_cost,
            'pack_total_cost': total_cost,
            'total_fabric_cost': total_fabric_cost,
            'total_sewing_trim_cost': total_sewing_trim_cost,
            'total_packaging_cost': packaging_placement_costs['total_cost'],
            'pack_item_costs': pack_item_costs
        }
        return cost_data


