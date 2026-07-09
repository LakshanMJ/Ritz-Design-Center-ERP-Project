from marketing.helpers.po_pack_material_wise_summary_helper import POClubMaterialWiseSummary
from marketing.helpers.costing_pack_material_wise_summary_helper import MaterialWiseSummary
from materials.models import CustomerBrandMaterial
from marketing.serializers import OrderInquirySerializer
from rest_framework.generics import get_object_or_404

class POClubMaterialCostingDifferenceSummaryMixin:

    def calculate_cost_difference(self, pre_costing_value, po_club_value):
        return round(pre_costing_value, 5) - round(po_club_value, 5)

    def set_difference_data(self, pre_costing_summary, po_club_summary, cost_types):
        data = {}
        for cost_type in cost_types:
            data[cost_type] = {
                'cost': self.calculate_cost_difference(
                    pre_costing_summary[cost_type]['cost'], 
                    po_club_summary[cost_type]['cost']
                ),
                'finance_cost': self.calculate_cost_difference(
                    pre_costing_summary[cost_type]['finance_cost'], 
                    po_club_summary[cost_type]['finance_cost']
                ),
                'total_cost': self.calculate_cost_difference(
                    pre_costing_summary[cost_type]['total_cost'], 
                    po_club_summary[cost_type]['total_cost']
                ),
            }
        return data
    
    def calculate_other_cost_difference(self, pre_costing_other_cost, po_club_other_cost):
        pre_costing_dict = {}
        pre_costing_total_dict = {}
        pre_costing_total_other_cost = 0
        po_club_total_other_cost = 0
        
        for item in pre_costing_other_cost:
            cost_name = item.get("cost_name")
            cost = item.get("cost")
            pre_costing_dict[cost_name] = cost

        for item in pre_costing_other_cost:
            cost_name = item.get("cost_name")
            total_quantity = item.get("total_quantity")
            cost = item.get("cost")
            pre_costing_total_dict[cost_name] = total_quantity * cost

        po_club_dict = {}
        po_club_total_dict = {}

        for item in po_club_other_cost:
            cost_name = item.get("cost_name")
            cost = item.get("cost")
            po_club_dict[cost_name] = cost

        for item in po_club_other_cost:
            cost_name = item.get("cost_name")
            total_quantity = item.get("total_quantity")
            cost = item.get("cost")
            po_club_total_dict[cost_name] = total_quantity * cost

        all_cost_names = set()
        for name in pre_costing_dict.keys():
            all_cost_names.add(name)

        for name in po_club_dict.keys():
            all_cost_names.add(name)

        data = []

        for cost_name in all_cost_names:
            pre_costing_cost = pre_costing_dict.get(cost_name)
            pre_costing_cost_total = pre_costing_total_dict.get(cost_name)
            po_club_cost = po_club_dict.get(cost_name)
            po_club_cost_total = po_club_total_dict.get(cost_name)
            po_club_total_other_cost += po_club_cost_total
            pre_costing_total_other_cost += pre_costing_cost_total

            if pre_costing_cost is None or po_club_cost is None:
                difference = 0.0
            else:
                difference = pre_costing_cost - po_club_cost

            data.append({
                "cost_name": cost_name,
                "pre_costing_cost": pre_costing_cost,
                "pre_costing_cost_total": pre_costing_cost_total,
                "po_club_cost": po_club_cost,
                "po_club_cost_total": po_club_cost_total,
                "difference": difference
            })

        return data, pre_costing_total_other_cost, po_club_total_other_cost
    
    def get_material_data(self, pre_costing_data, po_club_data):
        pre_costing_dict = {
            row["material_detail"]["customer_brand_material_id"]: row
            for row in pre_costing_data
        }

        po_club_dict = {
            row["material_detail"]["customer_brand_material_id"]: row
            for row in po_club_data
        }

        merged_data = []
        total_cost_per_unit = 0
        total_total_quantity = 0
        total_total_price = 0
        total_cost = 0
        total_po_club_cost_per_unit = 0
        total_po_club_total_quantity = 0
        total_po_club_total_cost = 0
        total_po_club_total_price = 0

        for material_id, pre_costing_row in pre_costing_dict.items():
            customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
            if material_id in pre_costing_dict:
                pre_row = pre_costing_dict[material_id]
                merged_consumptions = []

                pre_costing_consupmtion_dict = {
                    cons["supplier_id"]: cons
                    for cons in pre_costing_row.get("consumption_summary", [])
                }
                po_club_consumption_dict = {
                    cons["supplier_id"]: cons
                    for cons in pre_row.get("consumption_summary", [])
                }

                all_suppliers = set(pre_costing_consupmtion_dict.keys()) | set(po_club_consumption_dict.keys())

                for supplier_id in all_suppliers:
                    difference = 0
                    pre_costing_consumption = pre_costing_consupmtion_dict.get(supplier_id, {})
                    po_club_consumption = po_club_consumption_dict.get(supplier_id, {})

                    if pre_costing_consumption.get("cost_per_unit", None) and po_club_consumption.get("cost_per_unit", None):
                        difference =  pre_costing_consumption.get("cost") - po_club_consumption.get("cost")

                    merged_consumptions.append({
                        "supplier_inquiry_detail_id":  pre_costing_consumption.get("supplier_inquiry_detail_id"),
                        "supplier_id": supplier_id,
                        "supplier": pre_costing_consumption.get("supplier") if pre_costing_consumption.get("supplier") else pre_costing_consumption.get("supplier"),
                        "cost_per_unit": pre_costing_consumption.get("cost_per_unit"),
                        "cost_per_unit_display": pre_costing_consumption.get("cost_per_unit_display"),
                        "average_consumption": pre_costing_consumption.get("average_consumption"),
                        "total_quantity": pre_costing_consumption.get("total_quantity"),
                        "cost": pre_costing_consumption.get("cost"),
                        "total_price": pre_costing_consumption.get("total_price"),
                        "average_wastage": pre_costing_consumption.get("average_wastage"),
                        "po_club_cost_per_unit": po_club_consumption.get("cost_per_unit"),
                        "po_club_cost_per_unit_display": po_club_consumption.get("cost_per_unit_display"),
                        "po_club_average_consumption": po_club_consumption.get("average_consumption"),
                        "po_club_total_quantity": po_club_consumption.get("total_quantity"),
                        "po_club_average_wastage": po_club_consumption.get("average_wastage"),
                        "po_club_cost": po_club_consumption.get("cost"),
                        "po_club_total_price": po_club_consumption.get("total_price"),
                        "difference":  difference
                    })

                    total_cost_per_unit += pre_costing_consumption.get("cost_per_unit") if pre_costing_consumption.get("cost_per_unit") else 0
                    total_cost += pre_costing_consumption.get("cost") if pre_costing_consumption.get("cost") else 0
                    total_total_quantity += pre_costing_consumption.get("total_quantity") if pre_costing_consumption.get("total_quantity") else 0
                    total_total_price += pre_costing_consumption.get("total_price") if pre_costing_consumption.get("total_price") else 0
                    total_po_club_cost_per_unit += po_club_consumption.get("cost_per_unit") if po_club_consumption.get("cost_per_unit") else 0
                    total_po_club_total_quantity += po_club_consumption.get("total_quantity") if po_club_consumption.get("total_quantity") else 0
                    total_po_club_total_cost += po_club_consumption.get("cost") if po_club_consumption.get("cost") else 0
                    total_po_club_total_price += po_club_consumption.get("total_price") if po_club_consumption.get("total_price") else 0

                merged_data.append({
                    "material_detail": pre_costing_row["material_detail"],
                    "headers": pre_costing_row['headers'],
                    "consumption_summary": merged_consumptions,
                    "material_type": pre_costing_row['material_type'],
                    "material_label": pre_costing_row['material_label'],
                    "material_category": pre_costing_row['material_category'],
                })

            else:
                new_row = {
                    "material_detail": pre_costing_row["material_detail"],
                    "headers": pre_costing_row['headers'],
                    "consumption_summary": [],
                    "material_type": pre_costing_row['material_type'],
                    "material_label": pre_costing_row['material_label'],
                    "material_category": pre_costing_row['material_category'],
                }
                for pre_costing_consumption in pre_costing_row.get("consumption_summary", []):
                    new_row["consumption_summary"].append({
                        "supplier_inquiry_detail_id":  pre_costing_consumption.get("supplier_inquiry_detail_id"),
                        "supplier_id": pre_costing_consumption.get("supplier_id"),
                        "supplier": pre_costing_consumption.get("supplier"),
                        "cost_per_unit": pre_costing_consumption.get("cost_per_unit"),
                        "cost_per_unit_display": pre_costing_consumption.get("cost_per_unit_display"),
                        "average_consumption": pre_costing_consumption.get("average_consumption"),
                        "total_quantity": pre_costing_consumption.get("total_quantity"),
                        "cost": pre_costing_consumption.get("cost"),
                        "total_price": pre_costing_consumption.get("total_price"),
                        "average_wastage": pre_costing_consumption.get("average_wastage"),
                        "po_club_cost_per_unit": None,
                        "po_club_cost_per_unit_display": None,
                        "po_club_average_consumption": None,
                        "po_club_total_quantity": None,
                        "po_club_average_wastage": None,
                        "po_club_cost": None,
                        "po_club_total_price": None,
                        "difference": 0
                    })
                    total_cost_per_unit += pre_costing_consumption.get("cost_per_unit") if pre_costing_consumption.get("cost_per_unit") else 0
                    total_cost += pre_costing_consumption.get("cost")
                    total_total_quantity += pre_costing_consumption.get("total_quantity") if pre_costing_consumption.get("total_quantity") else 0
                    total_total_price += pre_costing_consumption.get("total_price") if pre_costing_consumption.get("total_price") else 0

                merged_data.append(new_row)

        for material_id, po_club_row in po_club_dict.items():
            customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
            if material_id not in pre_costing_dict:
                pre_costing_row = po_club_dict[material_id]
                merged_consumptions = []

                po_club_consumption_dict = {
                    cons["supplier_id"]: cons
                    for cons in po_club_row.get("consumption_summary", [])
                }
                
                all_suppliers = set(po_club_consumption_dict.keys())

                for supplier_id in all_suppliers:
                    difference = 0
                    pre_costing_consumption = po_club_consumption_dict.get(supplier_id, {})
                    po_club_consumption = po_club_consumption_dict.get(supplier_id, {})

                    merged_consumptions.append({
                        "supplier_inquiry_detail_id":  po_club_consumption.get("supplier_inquiry_detail_id"),
                        "supplier_id": supplier_id,
                        "supplier": po_club_consumption.get("supplier"),
                        "cost_per_unit":  None,
                        "cost_per_unit_display": None,
                        "average_consumption": None,
                        "total_quantity": None,
                        "cost": None,
                        "total_price": None,
                        "average_wastage": None,
                        "po_club_cost_per_unit": po_club_consumption.get("cost_per_unit"),
                        "po_club_cost_per_unit_display": po_club_consumption.get("cost_per_unit_display"),
                        "po_club_average_consumption": po_club_consumption.get("average_consumption"),
                        "po_club_total_quantity": po_club_consumption.get("total_quantity"),
                        "po_club_average_wastage": po_club_consumption.get("average_wastage"),
                        "po_club_cost": po_club_consumption.get("cost"),
                        "po_club_total_price": po_club_consumption.get("total_price"),
                        "difference":  0
                    })

                    total_po_club_cost_per_unit += po_club_consumption.get("cost_per_unit") if po_club_consumption.get("cost_per_unit") else 0
                    total_po_club_total_quantity += po_club_consumption.get("total_quantity") if po_club_consumption.get("total_quantity") else 0
                    total_po_club_total_cost += po_club_consumption.get("cost")
                    total_po_club_total_price += po_club_consumption.get("total_price") if po_club_consumption.get("total_price") else 0

                merged_data.append({
                    "material_detail": pre_costing_row["material_detail"],
                    "headers": pre_costing_row['headers'],
                    "consumption_summary": merged_consumptions,
                    "material_type": pre_costing_row['material_type'],
                    "material_label": pre_costing_row['material_label'],
                    "material_category": pre_costing_row['material_category'],
                })
        sorted_materials = sorted(merged_data, key=lambda x: x["material_type"])
        total_quantity_summary = {
            'total_cost_per_unit': total_cost_per_unit,
            'total_total_quantity': total_total_quantity,
            'total_total_price': total_total_price,
            'total_cost': round(total_cost, 5),
            'total_po_club_cost_per_unit': total_po_club_cost_per_unit,
            'total_po_club_total_quantity': total_po_club_total_quantity,
            'total_po_club_total_cost': round(total_po_club_total_cost, 5),
            'total_po_club_total_price': total_po_club_total_price,
            'cost_difference': round(total_cost - total_po_club_total_cost, 5)
        }
        return sorted_materials, total_quantity_summary

    def get_cost_difference_summary(self, pre_costing, po_club):
        pre_costing_packs = pre_costing.get_order_version_packs()
        pre_costing_helper = MaterialWiseSummary(pre_costing, pre_costing_packs)
        po_club_helper = POClubMaterialWiseSummary(po_club)
        pre_costing_data = pre_costing_helper.get_cost_summary()
        po_club_data = po_club_helper.get_cost_summary()

        pre_costing_summary = pre_costing_data['top_level_summary']
        po_club_summary = po_club_data['top_level_summary']

        cost_types = ['fabric_costs', 'trim_costs', 'service_cost']

        percentage_fields = [
            'fabric_financing_cost_percentage',
            'trim_financing_cost_percentage',
            'service_financing_cost_percentage',
            'buyer_commission_cost_percentage'
        ]
        cost_fields = ['pack_total_cost', 'commission_cost', 'total_other_cost', 
                       'total_ie_operation_cost', 'pack_normalized_total_cost']

        difference = self.set_difference_data(pre_costing_summary, po_club_summary, cost_types)
        
        for field in percentage_fields + cost_fields:
            difference[field] = pre_costing_summary[field] - po_club_summary[field]

        fabric_material_summary, fabric_total_quantity_summary = self.get_material_data(pre_costing_data['fabric_material_summary'], po_club_data['fabric_material_summary'])
        sewing_trim_material_summary, sewing_trim_total_quantity_summary = self.get_material_data(pre_costing_data['sewing_trim_material_summary'], po_club_data['sewing_trim_material_summary'])
        packing_trim_material_summary, packing_trim_total_quantity_summaryt = self.get_material_data(pre_costing_data['packing_trim_material_summary'], po_club_data['packing_trim_material_summary'])
        meta_data = OrderInquirySerializer(pre_costing.order, many=False).data
        meta_data['po_club_id'] = po_club.id,
        meta_data['po_club_display_number'] = po_club.display_number

        other_cost_data, pre_costing_total_other_cost, po_club_total_other_cost = self.calculate_other_cost_difference(pre_costing_data['other_cost'], po_club_data['other_cost'])
        po_club_summary['po_club_total_other_cost'] = po_club_total_other_cost
        pre_costing_summary['pre_costing_total_other_cost'] = pre_costing_total_other_cost

        data = {
            'meta_data': meta_data,
            'fabric_material_summary': fabric_material_summary,
            'fabric_total_quantity_summary': fabric_total_quantity_summary,
            'sewing_trim_material_summary': sewing_trim_material_summary,
            'sewing_trim_total_quantity_summary': sewing_trim_total_quantity_summary,
            'packing_trim_material_summary': packing_trim_material_summary,
            'packing_trim_total_quantity_summaryt': packing_trim_total_quantity_summaryt,
            'costing_top_level_summary': {
                'pre_costing_summary': pre_costing_summary,
                'po_club_summary': po_club_summary,
                'difference': difference
            },
            'other_cost_summary': other_cost_data
        }
        
        return data