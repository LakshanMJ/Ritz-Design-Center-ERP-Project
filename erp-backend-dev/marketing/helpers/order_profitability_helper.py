from marketing.models import POCountry, POPackOtherCost
from shared.utils import get_amount_dictionary, get_float_or_zero, calculate_queryset_total_amount_normalized_amount
from django.db.models import Sum, F, FloatField

class PurchaseOrderOrderProfitabilityHelper:

    def get_total_fob_value(self, purchase_order):
        return purchase_order.total_fob_value

    def get_total_fabric_costs(self, purchase_order):
        return purchase_order.total_fabric_cost
    
    def get_total_sewing_trim_costs(self, purchase_order):
        return purchase_order.total_sewing_trim_cost
    
    def get_total_packing_trim_costs(self, purchase_order):
        return purchase_order.total_packing_trim_cost

    def calculate_total_cost(self, purchase_order):
        total = 0
        total = purchase_order.total_fabric_cost + purchase_order.total_sewing_trim_cost + purchase_order.total_packing_trim_cost + self.get_fabric_financing_cost(purchase_order) + \
                self.get_trim_financing_cost(purchase_order) + self.get_total_other_costs(purchase_order)
        return total
    
    def get_shipto_countries(self, purchase_order):
        data = set()
        po_countries = purchase_order.get_po_countries()
        for country in po_countries:
            data.add(country.po_country_name)
        return data
    
    def get_order_name(self, purchase_order):
        order_name = None
        if purchase_order.costing_version:
            order_name = purchase_order.costing_version.order.ritz_code
        return order_name
    
    def get_profit(self, purchase_order):
        profit = 0
        fob_total = purchase_order.total_fob_value
        total_cost = self.calculate_total_cost(purchase_order)
        profit = fob_total - total_cost
        return profit
    
    def get_profit_ratio(self, purchase_order):
        profit_ratio = 0
        profit = self.get_profit(purchase_order)
        total_cost = self.calculate_total_cost(purchase_order)
        if profit > 0 and total_cost > 0:
            profit_ratio = (profit / total_cost) * 100
        return round(profit_ratio, 2)
    
    def get_total_other_costs(self, purchase_order):
        total_cost = POPackOtherCost.objects.filter(
            pack__purchase_order=purchase_order
        ).aggregate(total_cost=Sum(F('cost') * F('pack__quantity')))['total_cost']
    
        return float(total_cost) or 0 
    
    def get_other_costs_data(self, purchase_order):
        costs = (
            POPackOtherCost.objects
            .filter(pack__purchase_order=purchase_order)
            .annotate(
                total_cost=F('cost') * F('pack__quantity')
            )
            .values('other_cost_type__name')
            .annotate(
                total_cost=Sum('total_cost', output_field=FloatField())
            )
            .values('other_cost_type_id', 'other_cost_type__name', 'total_cost')
        )
        result = [
            {
                'name': cost['other_cost_type__name'],
                'total_cost': get_amount_dictionary(cost['total_cost'])
            }
            for cost in costs
        ]
        return result

    def get_fabric_financing_cost(self, purchase_order):
        fabric_financing_cost = 0
        fabric_cost = self.get_total_fabric_costs(purchase_order)
        if purchase_order.costing_version:
            fabric_financing_percentage = purchase_order.costing_version.fabric_finance_cost_percentage
            fabric_financing_cost = fabric_cost * (get_float_or_zero(fabric_financing_percentage)/100)
        return fabric_financing_cost

    def get_trim_financing_cost(self, purchase_order):
        trim_financing_cost = 0
        trim_cost = self.get_total_sewing_trim_costs(purchase_order)
        if purchase_order.costing_version:
            trim_financing_percentage = purchase_order.costing_version.trim_finance_cost_percentage
            trim_financing_cost = trim_cost * (get_float_or_zero(trim_financing_percentage)/100)
        return trim_financing_cost    
    
    def calculate_order_profitability_data(self, purchase_order):
        data = {
            'order_number': self.get_order_name(purchase_order),
            'shipto': self.get_shipto_countries(purchase_order),
            'total_fob_value': get_amount_dictionary(self.get_total_fob_value(purchase_order)),
            'total_fabric_cost': get_amount_dictionary(self.get_total_fabric_costs(purchase_order)),
            'total_sewing_trim_cost': get_amount_dictionary(self.get_total_sewing_trim_costs(purchase_order)),
            'total_packing_trim_cost': get_amount_dictionary(self.get_total_packing_trim_costs(purchase_order)),
            'fabric_financing_cost': get_amount_dictionary(self.get_fabric_financing_cost(purchase_order)),
            'trim_financing_cost': get_amount_dictionary(self.get_trim_financing_cost(purchase_order)),
            'total_embelishment_cost': get_amount_dictionary(0),
            'other_costs_data': self.get_other_costs_data(purchase_order),
            'total_finance_cost': get_amount_dictionary(0),
            'total_sub_contract_cost': get_amount_dictionary(0),
            'total_order_profit': get_amount_dictionary(self.get_profit(purchase_order)),
            'total': get_amount_dictionary(self.calculate_total_cost(purchase_order)),
            'total_profitability_ratio': self.get_profit_ratio(purchase_order),
        }
        return data
    

class ActualPOClubOrderProfitabilityHelper:

    def get_po_countries(self, po_club):
        purchase_orders = po_club.get_purchase_orders()
        countries = POCountry.objects.filter(purchase_order__in=purchase_orders)
        return countries
    
    def get_total_fob_value(self, actual_po_club):
        return actual_po_club.total_fob_value

    def get_total_fabric_costs(self, actual_po_club):
        return actual_po_club.total_fabric_cost
    
    def get_total_sewing_trim_costs(self, actual_po_club):
        return actual_po_club.total_sewing_trim_cost
    
    def get_total_packing_trim_costs(self, actual_po_club):
        return actual_po_club.total_packing_trim_cost
    
    def get_total_embellishment_service_costs(self, actual_po_club):
        return actual_po_club.total_embellishment_service_cost
    
    def get_total_wash_service_costs(self, actual_po_club):
        return actual_po_club.total_wash_service_cost

    def get_total(self, actual_po_club):
        total = 0
        total = actual_po_club.total_fabric_cost + actual_po_club.total_sewing_trim_cost + actual_po_club.total_packing_trim_cost + self.get_fabric_financing_cost(actual_po_club) + \
                self.get_trim_financing_cost(actual_po_club) + self.get_total_other_costs(actual_po_club) + actual_po_club.total_embellishment_service_cost + actual_po_club.total_wash_service_cost
        return total
    
    def get_shipto_countries(self, actual_po_club):
        data = set()
        po_countries = self.get_po_countries(actual_po_club)
        for country in po_countries:
            data.add(country.po_country_name)
        return data
    
    def get_order_name(self, actual_po_club):
        order_name = None
        if actual_po_club.pre_costing:
            order_name = actual_po_club.pre_costing.order.ritz_code
        return order_name
    
    def get_profit(self, actual_po_club):
        profit = 0
        fob_total = actual_po_club.total_fob_value
        total_cost = self.get_total(actual_po_club)
        profit = fob_total - total_cost
        return profit
    
    def get_profit_ratio(self, actual_po_club):
        profit_ratio = 0
        profit = self.get_profit(actual_po_club)
        total_cost = self.get_total(actual_po_club)
        if profit > 0 and total_cost > 0:
            profit_ratio = (profit / total_cost) * 100
        return round(profit_ratio, 2)
    
    def get_fabric_financing_cost(self, actual_po_club):
        fabric_financing_cost = 0
        purchase_orders = actual_po_club.get_purchase_orders()
        for purchase_order in purchase_orders:
            fabric_cost = purchase_order.total_fabric_cost
            if purchase_order.costing_version:
                fabric_financing_percentage = purchase_order.costing_version.fabric_finance_cost_percentage
                if fabric_cost:
                    fabric_financing_cost += fabric_cost * (get_float_or_zero(fabric_financing_percentage)/100)
        return fabric_financing_cost

    def get_trim_financing_cost(self, actual_po_club):
        trim_financing_cost = 0
        purchase_orders = actual_po_club.get_purchase_orders()
        for purchase_order in purchase_orders:
            trim_cost = purchase_order.total_sewing_trim_cost
            if purchase_order.costing_version:
                trim_financing_percentage = purchase_order.costing_version.trim_finance_cost_percentage
                if trim_cost:
                    trim_financing_cost += trim_cost * (get_float_or_zero(trim_financing_percentage)/100)
        return trim_financing_cost 
    
    def get_total_other_costs(self, actual_po_club):
        total_cost = POPackOtherCost.objects.filter(
            pack__purchase_order__actual_po_club=actual_po_club
        ).aggregate(total_cost=Sum(F('cost') * F('pack__quantity')))['total_cost']
        if total_cost:
            return float(total_cost) or 0
        else:
            return 0
    
    def get_other_costs_data(self, actual_po_club):
        costs = (
            POPackOtherCost.objects
            .filter(pack__purchase_order_id__actual_po_club=actual_po_club)
            .annotate(
                total_cost=F('cost') * F('pack__quantity')
            )
            .values('other_cost_type__name')
            .annotate(
                total_cost=Sum('total_cost', output_field=FloatField())
            )
            .values('other_cost_type__name', 'total_cost')
        )

        data = [
            {
                'name': cost['other_cost_type__name'],
                'total_cost': get_amount_dictionary(cost['total_cost'])
            }
            for cost in costs
        ]
        return data
    
    def calculate_order_profitability_data(self, actual_po_club):
        data = {
            'order_number': self.get_order_name(actual_po_club),
            'shipto': self.get_shipto_countries(actual_po_club),
            'total_fob_value': get_amount_dictionary(self.get_total_fob_value(actual_po_club)),
            'total_fabric_cost': get_amount_dictionary(self.get_total_fabric_costs(actual_po_club)),
            'total_sewing_trim_cost': get_amount_dictionary(self.get_total_sewing_trim_costs(actual_po_club)),
            'total_packing_trim_cost': get_amount_dictionary(self.get_total_packing_trim_costs(actual_po_club)),
            'total_embellishment_cost': get_amount_dictionary(self.get_total_embellishment_service_costs(actual_po_club)),
            'total_wash_service_cost': get_amount_dictionary(self.get_total_wash_service_costs(actual_po_club)),
            'fabric_financing_cost': get_amount_dictionary(self.get_fabric_financing_cost(actual_po_club)),
            'trim_financing_cost': get_amount_dictionary(self.get_trim_financing_cost(actual_po_club)),
            'other_costs_data': self.get_other_costs_data(actual_po_club),
            'total_order_profit': get_amount_dictionary(self.get_profit(actual_po_club)),
            'total': get_amount_dictionary(self.get_total(actual_po_club)),
            'total_profitability_ratio': self.get_profit_ratio(actual_po_club),
        }
        return data


