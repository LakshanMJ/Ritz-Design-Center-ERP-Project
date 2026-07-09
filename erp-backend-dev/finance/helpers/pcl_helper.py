from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_quantity_dictionary, calculate_queryset_total_normalized_quantity
from rest_framework.generics import get_object_or_404

class ActualPOClubPCLHelper:

    def get_purchase_orders(self, actual_po_club):
        data = []
        for purchase_order in actual_po_club.get_purchase_orders():
            fob_total_value = purchase_order.get_fob_total_value()
            max_pcl_value = purchase_order.get_max_pcl_value()
            data.append({
                'id': purchase_order.id,
                'display_number': purchase_order.display_number,
                'fob_total_value':  get_amount_dictionary(fob_total_value),
                'max_pcl_value':  get_amount_dictionary(max_pcl_value),
                'production_cut_date': purchase_order.production_cut_date,
                'production_start_date': purchase_order.production_start_date,
                'production_end_date': purchase_order.production_end_date,
            })
        return data

    def get_fob_total_value(self, actual_po_club):
        fob_total_value = actual_po_club.get_fob_total_value()
        data = get_amount_dictionary(fob_total_value)
        return data
    
    def get_supplier_po_raw_material_total_cost(self, actual_po_club):
        supplier_po_raw_material_total_cost = actual_po_club.get_supplier_po_raw_material_total_cost()
        data = get_amount_dictionary(supplier_po_raw_material_total_cost)
        return data
    
    def get_supplier_po_raw_material_total_paid(self, actual_po_club):
        supplier_po_raw_material_total_paid = actual_po_club.get_supplier_po_raw_material_total_paid()
        data = get_amount_dictionary(supplier_po_raw_material_total_paid)
        return data

    def get_fob_presentage(self, actual_po_club):
        precentage = actual_po_club.get_fob_percentage()
        return precentage
    
    def get_max_pcl_value(self, actual_po_club):
        max_pcl_value = actual_po_club.get_max_pcl_value()
        data = get_amount_dictionary(max_pcl_value)
        return data

    def calculate_pcl_data(self, actual_po_club):

        pcl_data = {
            'fob_total_value': self.get_fob_total_value(actual_po_club),
            'supplier_po_raw_material_total_cost': self.get_fob_total_value(actual_po_club),
            'supplier_po_raw_material_total_paid': self.get_supplier_po_raw_material_total_paid(actual_po_club),
            'fob_presentage': self.get_fob_presentage(actual_po_club),
            'max_pcl_value': self.get_max_pcl_value(actual_po_club),
            'pruchase_order_data': self.get_purchase_orders(actual_po_club)
        }
        return pcl_data