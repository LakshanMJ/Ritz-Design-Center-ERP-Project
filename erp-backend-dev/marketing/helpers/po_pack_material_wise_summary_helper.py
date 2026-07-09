from marketing.constants.costing_constants import MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES
from marketing.models import OrderPackItem, POPack, OrderPackItemPlacement, OrderPackPlacement, OrderPackItemPlacementMaterial, \
    OrderPackItemPlacementMaterialConsumption, OrderPackPlacementMaterialConsumption, OrderPack, OrderPackPlacementMaterial, OrderItemColorwayOperation, \
    OrderPackOtherCost, SupplierInquiryDetail, POPack
from materials.models import UserDefinedMaterial, FABRIC_TRIM_TYPES, CustomerBrandMaterial, SEWING_TRIM_TYPES
from rest_framework.generics import get_object_or_404
from shared.utils import convert_per_unit_cost


class POClubMaterialCostingSummaryMixin:
    # TODO - major should the dividing total cost be the total quantity of all the packs
    def __init__(self, club):
        self.po_club = club
        self.packs = POPack.objects.filter(purchase_order__actual_po_club=club)

    def calcuate_cost(self, material, cost_per_unit, unit, costing_consumption_ratio, wastage):
        total_cost = 0.00
        normalized_cost_per_unit = convert_per_unit_cost(material.material_normalized_measuring_unit, cost_per_unit, unit)

        total_consumption = costing_consumption_ratio + (costing_consumption_ratio * wastage / 100)
        total_cost = normalized_cost_per_unit['cost'] * float(total_consumption)
        total_cost = round(total_cost, 5)

        return total_cost

    def calculate_average_ratios(self, material_data):
        for material_row in material_data:
            consumption_summary = material_row.pop('consumption_summary', {})
            processed_data = []
            for supplier_inquiry_detail_id, consumption_data in consumption_summary.items():
                supplier_inquiry_detail = get_object_or_404(SupplierInquiryDetail, pk=supplier_inquiry_detail_id)
                material = supplier_inquiry_detail.supplier_inquiry.customer_brand_material
                average_consumption = 0
                average_wastage = 0
                total_quantity = 0
                for row in consumption_data['consumption_summary']:
                    
                    row_consumption = row['consumption_ratio']
                    row_wastage = row['wastage']
                    row_quantity = row['quantity']
                    if row_quantity:
                        average_consumption = (average_consumption * total_quantity + row_consumption * row_quantity) / (total_quantity + row_quantity)
                        average_wastage = (average_wastage * total_quantity + row_wastage * row_quantity) / (total_quantity + row_quantity)
                        total_quantity += row_quantity
                    
                processed_data.append({
                    'supplier_inqury_detail_id': supplier_inquiry_detail.id,
                    'supplier_id': supplier_inquiry_detail.supplier_inquiry.supplier.id,
                    'supplier': supplier_inquiry_detail.supplier_inquiry.supplier.name,
                    'cost_per_unit': supplier_inquiry_detail.cost_per_unit,
                    'cost_per_unit_display': supplier_inquiry_detail.get_costing_unit_display(),
                    'average_consumption': average_consumption,
                    'total_quantity': total_quantity,
                    'total_price': total_quantity * supplier_inquiry_detail.cost_per_unit,
                    'average_wastage': average_wastage,
                    'cost': self.calcuate_cost(material, supplier_inquiry_detail.cost_per_unit, supplier_inquiry_detail.costing_unit, average_consumption, average_wastage)
                })
            material_row['consumption_summary'] = processed_data  

        return material_data
    
    def get_fabric_material_summary(self, placement_materials, get_quantity_func):
        material_data = {}
        for placement_material in placement_materials:
            material_category = placement_material.po_material.material_category
            material_category_display = placement_material.po_material.material_detail.generic_material.user_material.get_category_display()
            headers = UserDefinedMaterial.get_material_headers(placement_material.po_material.material_detail.generic_material.user_material.name)

            if placement_material.po_material_id not in material_data:
                material_data[placement_material.po_material_id] = {
                    'material_detail': placement_material.po_material.get_attributes(),
                    'headers': headers,
                    'consumption_summary': {},
                    'material_type': placement_material.po_material.material_type,
                    'material_label': placement_material.po_material.material_label,
                    'material_category': {'category': material_category, 'category_display': material_category_display},
                }

            supplier_inquiry_detail = placement_material.get_material_costing_supplier_inquiry().supplier_inquiry_detail
            consumption_ratio = placement_material.costing_pack_item_placement.get_placement_material_consumption(supplier_inquiry_detail)

            if supplier_inquiry_detail.pk not in material_data[placement_material.po_material_id]['consumption_summary']:
                material_data[placement_material.po_material_id]['consumption_summary'][supplier_inquiry_detail.pk] = {
                    'consumption_summary': []
                }

            material_data[placement_material.po_material_id]['consumption_summary'][supplier_inquiry_detail.pk]['consumption_summary'].append({
                'placement_material_id': placement_material.id,
                'consumption_ratio': consumption_ratio.costing_consumption_ratio,
                'wastage': consumption_ratio.wastage,
                'quantity': get_quantity_func(placement_material),
                'cost_per_unit': supplier_inquiry_detail.cost_per_unit,
                'total_cost': supplier_inquiry_detail.cost_per_unit * get_quantity_func(placement_material)
            })
            
        return self.calculate_average_ratios(material_data.values())

    def get_material_summary(self, placement_materials, get_quantity_func):
        material_data = {}
        for placement_material in placement_materials:
            material_category = placement_material.po_material.material_category
            material_category_display = placement_material.po_material.material_detail.generic_material.user_material.get_category_display()
            supplier_inquiry_detail = placement_material.get_material_costing_supplier_inquiry().supplier_inquiry_detail
            consumption_ratio = placement_material.get_material_consumption_ratio_object(supplier_inquiry_detail)
            headers = UserDefinedMaterial.get_material_headers(placement_material.po_material.material_detail.generic_material.user_material.name)

            if placement_material.po_material_id not in material_data:
                material_data[placement_material.po_material_id] = {
                    'material_detail': placement_material.po_material.get_attributes(),
                    'headers': headers,
                    'consumption_summary': {},
                    'material_type': placement_material.po_material.material_type,
                    'material_label': placement_material.po_material.material_label,
                    'material_category': {'category': material_category, 'category_display': material_category_display},
                }

            if supplier_inquiry_detail.pk not in material_data[placement_material.po_material_id]['consumption_summary']:
                material_data[placement_material.po_material_id]['consumption_summary'][supplier_inquiry_detail.pk] = {
                    'consumption_summary': []
                }

            material_data[placement_material.po_material_id]['consumption_summary'][supplier_inquiry_detail.pk]['consumption_summary'].append({
                'placement_material_id': placement_material.id,
                'consumption_ratio': consumption_ratio.costing_consumption_ratio,
                'wastage': consumption_ratio.wastage,
                'quantity': get_quantity_func(placement_material),
                'cost_per_unit': supplier_inquiry_detail.cost_per_unit,
                'total_cost': consumption_ratio.calculate_cost_for_supplier_inquiry(supplier_inquiry_detail)
            })
            
        return self.calculate_average_ratios(material_data.values())

    def get_ie_operation_costs_summary(self, pack_items):
        data = {}
        for pack_item in pack_items:
            item_operations = pack_item.order_pack_item.get_colorway_item_operations()

            for item_operation in item_operations:
                item_operation_id = item_operation.pk
                if not data.get(item_operation_id, None):
                    data[item_operation_id] = {
                        **item_operation.get_attributes(),
                        'operation_summary': [],
                        'total_pack_item_quantity': 0,
                        'average_epm': 0,
                        'average_total_cost': 0
                    }

                pack_item_epm = pack_item.po_pack.order_pack.version.get_version_earnings_per_minute(pack_item)
                data[item_operation_id]['average_epm'] = (float(data[item_operation_id]['costing_smv']) * float(data[item_operation_id]['average_epm']) *
                                                                 float(data[item_operation_id]['total_pack_item_quantity']) + float(pack_item_epm) * float(item_operation.costing_smv) * float(pack_item.po_pack.quantity)) / (
                                                                 data[item_operation_id]['total_pack_item_quantity'] + pack_item.po_pack.quantity
                                                         )
                data[item_operation_id]['average_total_cost'] = data[item_operation_id]['average_epm'] * data[item_operation_id]['costing_smv']

                data[item_operation_id]['total_pack_item_quantity'] += pack_item.po_pack.quantity
                data[item_operation_id]['operation_summary'].append({'pack_item_display': pack_item.get_po_pack_item_display(), 'quantity': pack_item.po_pack.quantity, 'epm': pack_item_epm})
        return data.values()

    def get_service_costs(self, order_item):
        pass

    def get_other_costs(self):
        data = {}
        
        for pack in self.packs:
            pack_other_costs = pack.order_pack.get_other_costs()
            total_quantity = 0
            for pack_other_cost in pack_other_costs:
                other_cost_type_id = pack_other_cost.other_cost_type_id

                if not data.get(other_cost_type_id, None):
                    data[other_cost_type_id] = {
                        'cost_name': pack_other_cost.other_cost_type.name,
                        'cost': pack_other_cost.cost,
                        'total_quantity': 0,
                        'other_cost_summary': []
                    }
                total_quantity += pack.quantity
                data[other_cost_type_id]['other_cost_summary'].append({'pack_display': pack.get_po_pack_display(), 'quantity': pack.quantity})
                data[other_cost_type_id]['total_quantity'] += total_quantity
        return data.values()

    def get_material_summary_for_packs(self):
        placement_materials = OrderPackPlacementMaterial.objects.filter(placement__order_pack__in=self.packs)
        get_quantity_func = lambda placement_material_object: placement_material_object.placement.order_pack.cad_quantity
        material_summary = self.get_material_summary(placement_materials, 'orderpackplacementmaterialconsumption', get_quantity_func)
        return material_summary

    def get_pack_levelcost_summary(self):
        data = {
            'packaging_summary': self.get_material_summary_for_packs(),
            'other_cost_summary': self.get_other_costs()
        }
        return data

    def calculate_top_level_summary(self):
        total_quantity = 0
        fabric_cost = 0
        fabric_financing_cost = 0
        fabric_total_cost = 0

        trim_cost = 0
        trim_financing_cost = 0
        trim_total_cost = 0

        service_cost = 0
        service_financing_cost = 0
        service_total_cost = 0

        commission_cost = 0
        pack_total_cost = 0
        fabric_financing_cost_percentage = 0
        trim_financing_cost_percentage = 0
        service_financing_cost_percentage = 0
        buyer_commission_cost_percentage = 0
        total_other_cost = 0
        total_ie_operation_cost = 0
        pack_normalized_total_cost = 0

        for pack in self.packs:
            cost_summary = pack.order_pack.get_cost_summary()
            pack_quantity = pack.quantity
            total_quantity += pack_quantity

            fabric_cost += cost_summary['fabric_cost_summary']['fabric_cost'] * pack_quantity
            fabric_financing_cost += cost_summary['fabric_cost_summary']['total_fabric_finance_cost'] * pack_quantity
            fabric_total_cost += cost_summary['fabric_cost_summary']['total_fabric_cost'] * pack_quantity

            trim_cost += cost_summary['trim_cost_summary']['trim_cost'] * pack_quantity
            trim_financing_cost += cost_summary['trim_cost_summary']['total_trim_finance_cost'] * pack_quantity
            trim_total_cost += cost_summary['trim_cost_summary']['total_trim_cost'] * pack_quantity

            service_cost += cost_summary['service_cost_summary']['service_cost'] * pack_quantity
            service_financing_cost += cost_summary['service_cost_summary']['total_service_finance_cost'] * pack_quantity
            service_total_cost += cost_summary['service_cost_summary']['total_service_cost'] * pack_quantity

            pack_total_cost += cost_summary['pack_total_cost'] * pack_quantity
            commission_cost += cost_summary['buyer_commission_cost'] * pack_quantity
            fabric_financing_cost_percentage += cost_summary['fabric_financing_cost_percentage'] * pack_quantity
            trim_financing_cost_percentage += cost_summary['trim_financing_cost_percentage'] * pack_quantity
            service_financing_cost_percentage += cost_summary['service_financing_cost_percentage'] * pack_quantity if cost_summary['service_financing_cost_percentage'] else 0
            buyer_commission_cost_percentage += cost_summary['buyer_commission_cost_percentage'] * pack_quantity
            total_other_cost += cost_summary['total_other_cost'] * pack_quantity
            total_ie_operation_cost += cost_summary['total_ie_operation_cost'] * pack_quantity
            pack_normalized_total_cost += cost_summary['pack_normalized_total_cost'] * pack_quantity

        data = {
            'fabric_costs': {
                'cost': fabric_cost / total_quantity,
                'finance_cost': fabric_financing_cost / total_quantity,
                'total_cost': fabric_total_cost / total_quantity,
            },
            'trim_costs': {
                'cost': trim_cost / total_quantity,
                'finance_cost': trim_financing_cost / total_quantity,
                'total_cost': trim_total_cost / total_quantity,
            },
            'service_cost': {
                'cost': service_cost / total_quantity,
                'finance_cost': service_financing_cost / total_quantity,
                'total_cost': service_total_cost / total_quantity,
            },
            'pack_total_cost': pack_total_cost / total_quantity,
            'commission_cost': commission_cost / total_quantity,
            'fabric_financing_cost_percentage': fabric_financing_cost_percentage / total_quantity,
            'trim_financing_cost_percentage': trim_financing_cost_percentage / total_quantity,
            'service_financing_cost_percentage': service_financing_cost_percentage / total_quantity,
            'buyer_commission_cost_percentage': buyer_commission_cost_percentage / total_quantity,
            'total_other_cost': total_other_cost / total_quantity,
            'total_ie_operation_cost': total_ie_operation_cost / total_quantity,
            'pack_normalized_total_cost': pack_normalized_total_cost / total_quantity,
        }
        return data


class POClubMaterialWiseSummary(POClubMaterialCostingSummaryMixin):

    def get_cost_summary(self):
        from marketing.models import POPackItemPlacement, POPackPlacement, POPackItem
        get_quantity_func = lambda placement_material_object: placement_material_object.po_pack_item.po_pack.quantity
        get_quantity_func_b = lambda placement_material_object: placement_material_object.po_pack.quantity

        po_pack_items = POPackItem.objects.filter(po_pack__in=self.packs)
        
        pack_item_placements = POPackItemPlacement.objects.filter(po_pack_item__po_pack__in=self.packs).exclude(
            po_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES
        ).order_by('po_material__material_detail__generic_material__user_material__category')

        pack_placements = POPackPlacement.objects.filter(po_pack__in=self.packs).exclude(
            po_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES
        ).order_by('po_material__material_detail__generic_material__user_material__category')

        fabric_placements = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__in=self.packs,
            po_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES
        ).order_by('po_material__material_detail__generic_material__user_material__category')

        fabric_material_summary = self.get_fabric_material_summary(fabric_placements, get_quantity_func)
        sewing_trim_material_summary = self.get_material_summary(pack_item_placements, get_quantity_func)
        packing_trim_material_summary = self.get_material_summary(pack_placements, get_quantity_func_b)

        operation_costs = self.get_ie_operation_costs_summary(po_pack_items)
        # pack_level_costs = self.get_pack_levelcost_summary()

        data = {
            'fabric_material_summary': fabric_material_summary,
            'packing_trim_material_summary': packing_trim_material_summary,
            'sewing_trim_material_summary': sewing_trim_material_summary,
            #'operation_cost_summary': operation_costs,
            # **pack_level_costs,
            'top_level_summary': self.calculate_top_level_summary(),
            'other_cost': self.get_other_costs()
        }
        return data