from marketing.helpers.costing_pack_material_wise_summary_helper import MaterialWiseSummary
from materials.models import CustomerBrandMaterial
from marketing.serializers import OrderInquirySerializer
from rest_framework.generics import get_object_or_404

class MaterialCostingDifferenceSummaryMixin:

    def calculate_cost_difference(self, marketing_value, pre_costing_value):
        return round(marketing_value, 5) - round(pre_costing_value, 5)

    def set_difference_data(self, marketing_summary, pre_costing_summary, cost_types):
        data = {}
        for cost_type in cost_types:
            data[cost_type] = {
                'cost': self.calculate_cost_difference(
                    marketing_summary[cost_type]['cost'], 
                    pre_costing_summary[cost_type]['cost']
                ),
                'finance_cost': self.calculate_cost_difference(
                    marketing_summary[cost_type]['finance_cost'], 
                    pre_costing_summary[cost_type]['finance_cost']
                ),
                'total_cost': self.calculate_cost_difference(
                    marketing_summary[cost_type]['total_cost'], 
                    pre_costing_summary[cost_type]['total_cost']
                ),
            }
        return data
    
    def calculate_other_cost_difference(self, marketing_other_cost, pre_costing_other_cost):
        marketing_dict = {}
        marketing_total_dict = {}
        marketing_total_other_cost = 0
        pre_costing_total_other_cost = 0

        for item in marketing_other_cost:
            cost_name = item.get("cost_name")
            total_quantity = item.get("total_quantity")
            cost = item.get("cost")
            marketing_total_dict[cost_name] = total_quantity * cost

        for item in marketing_other_cost:
            cost_name = item.get("cost_name")
            cost = item.get("cost")
            marketing_dict[cost_name] = cost

        pre_costing_dict = {}
        pre_costing_total_dict = {}

        for item in pre_costing_other_cost:
            cost_name = item.get("cost_name")
            cost = item.get("cost")
            pre_costing_dict[cost_name] = cost

        for item in pre_costing_other_cost:
            cost_name = item.get("cost_name")
            total_quantity = item.get("total_quantity")
            cost = item.get("cost")
            pre_costing_total_dict[cost_name] = total_quantity * cost

        all_cost_names = set()
        for name in marketing_dict.keys():
            all_cost_names.add(name)
        for name in pre_costing_dict.keys():
            all_cost_names.add(name)

        data = []
        
        for cost_name in all_cost_names:
            marketing_cost = marketing_dict.get(cost_name)
            marketing_cost_total = marketing_total_dict.get(cost_name)
            pre_costing_cost = pre_costing_dict.get(cost_name)
            pre_costing_cost_total = pre_costing_total_dict.get(cost_name)
            marketing_total_other_cost += marketing_cost_total
            pre_costing_total_other_cost += pre_costing_cost_total


            if marketing_cost is None or pre_costing_cost is None:
                difference = 0.0
            else:
                difference = marketing_cost - pre_costing_cost

            data.append({
                "cost_name": cost_name,
                "marketing_cost": marketing_cost,
                "marketing_cost_total": marketing_cost_total,
                "pre_costing_cost": pre_costing_cost,
                "pre_costing_cost_total": pre_costing_cost_total,
                "difference": difference,
            })

        return data, marketing_total_other_cost, pre_costing_total_other_cost
    
    def get_material_data(self, marketing_data, pre_costing_data):
        marketing_dict = {
            row["material_detail"]["customer_brand_material_id"]: row
            for row in marketing_data
        }
        pre_costing_dict = {
            row["material_detail"]["customer_brand_material_id"]: row
            for row in pre_costing_data
        }

        merged_data = []
        total_cost_per_unit = 0
        total_total_quantity = 0
        total_total_price = 0
        total_cost = 0
        total_pre_costing_cost_per_unit = 0
        total_pre_costing_total_quantity = 0
        total_pre_costing_total_cost = 0
        total_pre_costing_total_price = 0

        for material_id, marketing_row in marketing_dict.items():
            customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
            if material_id in pre_costing_dict:
                pre_row = pre_costing_dict[material_id]
                merged_consumptions = []

                marketing_cons_dict = {
                    cons["supplier_id"]: cons
                    for cons in marketing_row.get("consumption_summary", [])
                }
                pre_cons_dict = {
                    cons["supplier_id"]: cons
                    for cons in pre_row.get("consumption_summary", [])
                }

                all_suppliers = set(marketing_cons_dict.keys()) | set(pre_cons_dict.keys())

                for supplier_id in all_suppliers:
                    difference = 0
                    m_cons = marketing_cons_dict.get(supplier_id, {})
                    p_cons = pre_cons_dict.get(supplier_id, {})

                    if m_cons.get("cost_per_unit", None) and p_cons.get("cost_per_unit", None):
                        difference =  m_cons.get("cost") - p_cons.get("cost")
                    merged_consumptions.append({
                        "supplier_inquiry_detail_id":  m_cons.get("supplier_inquiry_detail_id"),
                        "supplier_id": supplier_id,
                        "supplier": m_cons.get("supplier") if m_cons.get("supplier") else p_cons.get("supplier"),
                        "cost_per_unit": m_cons.get("cost_per_unit"),
                        "cost_per_unit_display": m_cons.get("cost_per_unit_display"),
                        "average_consumption": m_cons.get("average_consumption"),
                        "total_quantity": m_cons.get("total_quantity"),
                        "cost": m_cons.get("cost"),
                        "total_price": m_cons.get("total_price"),
                        "average_wastage": m_cons.get("average_wastage"),
                        "pre_costing_cost_per_unit": p_cons.get("cost_per_unit"),
                        "pre_costing_cost_per_unit_display": p_cons.get("cost_per_unit_display"),
                        "pre_costing_average_consumption": p_cons.get("average_consumption"),
                        "pre_costing_total_quantity": p_cons.get("total_quantity"),
                        "pre_costing_average_wastage": p_cons.get("average_wastage"),
                        "pre_costing_cost": p_cons.get("cost"),
                        "pre_costing_total_price": p_cons.get("total_price"),
                        "difference":  difference
                    })

                    total_cost_per_unit += m_cons.get("cost_per_unit") if m_cons.get("cost_per_unit") else 0
                    total_cost += m_cons.get("cost") if m_cons.get("cost") else 0
                    total_total_quantity += m_cons.get("total_quantity") if m_cons.get("total_quantity") else 0
                    total_total_price += m_cons.get("total_price") if m_cons.get("total_price") else 0
                    total_pre_costing_cost_per_unit += p_cons.get("cost_per_unit") if p_cons.get("cost_per_unit") else 0
                    total_pre_costing_total_quantity += p_cons.get("total_quantity") if p_cons.get("total_quantity") else 0
                    total_pre_costing_total_cost += p_cons.get("cost") if p_cons.get("cost") else 0
                    total_pre_costing_total_price += p_cons.get("total_price") if p_cons.get("total_price") else 0

                merged_data.append({
                    "material_detail": marketing_row["material_detail"],
                    "headers": marketing_row['headers'],
                    "consumption_summary": merged_consumptions,
                    "material_type": marketing_row['material_type'],
                    "material_label": marketing_row['material_label'],
                    "material_category": marketing_row['material_category'],
                })

            else:
                new_row = {
                    "material_detail": marketing_row["material_detail"],
                    "headers": marketing_row['headers'],
                    "consumption_summary": [],
                    "material_type": marketing_row['material_type'],
                    "material_label": marketing_row['material_label'],
                    "material_category": marketing_row['material_category'],
                }
                for cons in marketing_row.get("consumption_summary", []):
                    new_row["consumption_summary"].append({
                        "supplier_inquiry_detail_id":  cons.get("supplier_inquiry_detail_id"),
                        "supplier_id": cons.get("supplier_id"),
                        "supplier": cons.get("supplier"),
                        "cost_per_unit": cons.get("cost_per_unit"),
                        "cost_per_unit_display": cons.get("cost_per_unit_display"),
                        "average_consumption": cons.get("average_consumption"),
                        "total_quantity": cons.get("total_quantity"),
                        "cost": cons.get("cost"),
                        "total_price": cons.get("total_price"),
                        "average_wastage": cons.get("average_wastage"),
                        "pre_costing_cost_per_unit": None,
                        "pre_costing_cost_per_unit_display": None,
                        "pre_costing_average_consumption": None,
                        "pre_costing_total_quantity": None,
                        "pre_costing_average_wastage": None,
                        "pre_costing_cost": None,
                        "pre_costing_total_price": None,
                        "difference": 0
                    })
                    total_cost_per_unit += cons.get("cost_per_unit") if cons.get("cost_per_unit") else 0
                    total_cost += cons.get("cost")
                    total_total_quantity += cons.get("total_quantity") if cons.get("total_quantity") else 0
                    total_total_price += cons.get("total_price") if cons.get("total_price") else 0

                merged_data.append(new_row)

        for material_id, pre_costing_row in pre_costing_dict.items():
            customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
            if material_id not in marketing_dict:
                pre_row = pre_costing_dict[material_id]
                merged_consumptions = []

                pre_cons_dict = {
                    cons["supplier_id"]: cons
                    for cons in pre_row.get("consumption_summary", [])
                }
                
                all_suppliers = set(pre_cons_dict.keys())

                for supplier_id in all_suppliers:
                    difference = 0
                    m_cons = marketing_cons_dict.get(supplier_id, {})
                    p_cons = pre_cons_dict.get(supplier_id, {})
                    # if material_id == 452:
                    #     print(material_id, p_cons.get("total_quantity"))

                    merged_consumptions.append({
                        "supplier_inquiry_detail_id":  p_cons.get("supplier_inquiry_detail_id"),
                        "supplier_id": supplier_id,
                        "supplier": p_cons.get("supplier"),
                        "cost_per_unit":  None,
                        "cost_per_unit_display": None,
                        "average_consumption": None,
                        "total_quantity": None,
                        "cost": None,
                        "total_price": None,
                        "average_wastage": None,
                        "pre_costing_cost_per_unit": p_cons.get("cost_per_unit"),
                        "pre_costing_cost_per_unit_display": p_cons.get("cost_per_unit_display"),
                        "pre_costing_average_consumption": p_cons.get("average_consumption"),
                        "pre_costing_total_quantity": p_cons.get("total_quantity"),
                        "pre_costing_average_wastage": p_cons.get("average_wastage"),
                        "pre_costing_cost": p_cons.get("cost"),
                        "pre_costing_total_price": p_cons.get("total_price"),
                        "difference":  0
                    })

                    total_pre_costing_cost_per_unit += p_cons.get("cost_per_unit") if p_cons.get("cost_per_unit") else 0
                    total_pre_costing_total_quantity += p_cons.get("total_quantity") if p_cons.get("total_quantity") else 0
                    total_pre_costing_total_cost += p_cons.get("cost")
                    total_pre_costing_total_price += p_cons.get("total_price") if p_cons.get("total_price") else 0

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
            'total_pre_costing_cost_per_unit': total_pre_costing_cost_per_unit,
            'total_pre_costing_total_quantity': total_pre_costing_total_quantity,
            'total_pre_costing_total_cost': round(total_pre_costing_total_cost, 5),
            'total_pre_costing_total_price': total_pre_costing_total_price,
            'cost_difference': round(total_cost - total_pre_costing_total_cost, 5)
        }
        return sorted_materials, total_quantity_summary

    def get_cost_difference_summary(self, marketing_costing, pre_costing, marketing_costing_packs, pre_costing_packs):
        marketing_costing_helper = MaterialWiseSummary(marketing_costing, marketing_costing_packs)
        pre_costing_helper = MaterialWiseSummary(pre_costing, pre_costing_packs)
        marketing_costing_data = marketing_costing_helper.get_cost_summary()
        pre_costing_data = pre_costing_helper.get_cost_summary()
        marketing_summary = marketing_costing_data['top_level_summary']
        pre_costing_summary = pre_costing_data['top_level_summary']

        cost_types = ['fabric_costs', 'trim_costs', 'service_cost']
        percentage_fields = [
            'fabric_financing_cost_percentage',
            'trim_financing_cost_percentage',
            'service_financing_cost_percentage',
            'buyer_commission_cost_percentage'
        ]
        cost_fields = ['pack_total_cost', 'commission_cost', 'total_other_cost', 
                       'total_ie_operation_cost', 'pack_normalized_total_cost']

        difference = self.set_difference_data(marketing_summary, pre_costing_summary, cost_types)
        
        for field in percentage_fields + cost_fields:
            difference[field] = marketing_summary[field] - pre_costing_summary[field]

        fabric_material_summary, fabric_total_quantity_summary = self.get_material_data(marketing_costing_data['fabric_material_summary'], pre_costing_data['fabric_material_summary'])
        sewing_trim_material_summary, sewing_trim_total_quantity_summary = self.get_material_data(marketing_costing_data['sewing_trim_material_summary'], pre_costing_data['sewing_trim_material_summary'])
        packing_trim_material_summary, packing_trim_total_quantity_summaryt = self.get_material_data(marketing_costing_data['packing_trim_material_summary'], pre_costing_data['packing_trim_material_summary'])

        other_cost_data, marketing_total_other_cost, pre_costing_total_other_cost = self.calculate_other_cost_difference(marketing_costing_data['other_cost'], pre_costing_data['other_cost'])
        marketing_summary['marketing_total_other_cost'] = marketing_total_other_cost
        pre_costing_summary['pre_costing_total_other_cost'] = pre_costing_total_other_cost

        data = {
            'meta_data': OrderInquirySerializer(pre_costing.order, many=False).data,
            'fabric_material_summary': fabric_material_summary,
            'fabric_total_quantity_summary': fabric_total_quantity_summary,
            'sewing_trim_material_summary': sewing_trim_material_summary,
            'sewing_trim_total_quantity_summary': sewing_trim_total_quantity_summary,
            'packing_trim_material_summary': packing_trim_material_summary,
            'packing_trim_total_quantity_summaryt': packing_trim_total_quantity_summaryt,
            'costing_top_level_summary': {
                'marketing_costing_summary': marketing_summary,
                'pre_costing_summary': pre_costing_summary,
                'difference': difference
            },
            'other_cost_summary': other_cost_data
        }
        
        return data