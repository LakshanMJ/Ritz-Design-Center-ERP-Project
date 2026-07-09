from rest_framework.generics import get_object_or_404

from marketing.models import OrderPackOtherCost, OrderPack, OrderSizeGroup, OrderCostingVersion, OrderPackItem, PackItemService
from materials.fieldmetadata.material_metadata import get_services_headers
from materials.models import SupplierInquiry


class OtherCostCombination:

    def __init__(self, request, order_id, version_id, order_colorway_id, order_country_id, order_size_group_id):
            self.version = get_object_or_404(OrderCostingVersion, pk=version_id, order_id=order_id)
            self.request = request
            self.order_colorway_id = order_colorway_id
            self.order_country_id = order_country_id
            self.order_size_group_id = order_size_group_id

    def get_order_size_group_packs(self):
        size_group = OrderSizeGroup.objects.get(pk=self.order_size_group_id)
        packs = OrderPack.objects.filter(
            version=self.version,
            colorway_id=self.order_colorway_id,
            country_id=self.order_country_id,
            size__in=size_group.sizes.all()
        )
        return packs

    def get_size_group_pack_costs(self):
        packs = self.get_order_size_group_packs()
        costs = OrderPackOtherCost.objects.filter(pack__in=packs)

        pack_other_costs = {}

        for cost in costs:
            if not pack_other_costs.get(cost.other_cost_type_id, None):
                pack_other_costs[cost.other_cost_type_id] = {
                    'id': cost.id,
                    'cost_type_id': cost.other_cost_type.id,
                    'cost_type_name': cost.other_cost_type.name,
                }

            cost_type_other_cost = pack_other_costs[cost.other_cost_type_id]

            if not cost_type_other_cost.get(cost.pack_id, None):
                pack_other_costs[cost.other_cost_type_id][cost.pack_id] = 0
            if cost.cost and pack_other_costs[cost.other_cost_type_id][cost.pack_id] is not None: # is not none is needed
                pack_other_costs[cost.other_cost_type_id][cost.pack_id] += cost.cost
            else:
                pack_other_costs[cost.other_cost_type_id][cost.pack_id] = None
        other_costs = pack_other_costs.values()
        return other_costs


class CombinedServiceCosts:

    def __init__(self, request, order_id, version_id, order_colorway_id, order_country_id, order_size_group_id):
        self.version = get_object_or_404(OrderCostingVersion, pk=version_id, order_id=order_id)
        self.request = request
        self.order_colorway_id = order_colorway_id
        self.order_country_id = order_country_id
        self.order_size_group_id = order_size_group_id

    def get_order_size_group_packs(self):
        size_group = OrderSizeGroup.objects.get(pk=self.order_size_group_id)
        packs = OrderPack.objects.filter(
            version=self.version,
            colorway_id=self.order_colorway_id,
            country_id=self.order_country_id,
            size__in=size_group.sizes.all()
        )
        return packs

    def get_service_headers(self, service_type):
        service_headers = get_services_headers()
        return service_headers[service_type]

    def sort_embellishment_data(self, services):
        emb_data = services.get(PackItemService.EMBELLISHMENT_SERVICE_TYPE, {})
        order_items = self.version.order.get_order_items()
        for order_item in order_items:
            has_data = False
            data_row = emb_data.get(order_item.pk, {})
            data = data_row.get('data', [])
            sorted_data = {'unsorted_data': []}

            for row in data:
                has_data = True
                sub_type_id = row.get('sub_type_id', None)
                if sub_type_id:
                    if not sorted_data.get(sub_type_id, None):
                        sorted_data[sub_type_id] = []
                    sorted_data[sub_type_id].append(row)
                else:
                    sorted_data['unsorted_data'].append(row)

            sorted_data_list = []
            for key, val in sorted_data.items():
                sorted_data_list = [*sorted_data_list, *val]
            if has_data:
                services[PackItemService.EMBELLISHMENT_SERVICE_TYPE][order_item.id]['data'] = sorted_data_list
        return services

    def get_service_information(self):
        order_items = self.version.order.get_order_items()
        packs = self.get_order_size_group_packs().order_by('size__size__sorting_order')
        services = {}
        for pack in packs:
            for order_item in order_items:
                pack_item = OrderPackItem.objects.get(pack=pack, item=order_item)
                pack_item_services = PackItemService.objects.filter(pack_item=pack_item).order_by('pack_item__pack__size__size__sorting_order')
                for pack_item_service in pack_item_services:
                    if not services.get(pack_item_service.service_type, None):
                        services[pack_item_service.service_type] = {
                            'service_type': pack_item_service.get_service_type_display(),
                            'headers': self.get_service_headers(pack_item_service.service_type)
                        }

                    if not services[pack_item_service.service_type].get(order_item.id, None):
                        services[pack_item_service.service_type][order_item.id] = {
                            'data': [],
                        }

                    services[pack_item_service.service_type][order_item.id]['data'].append({
                        **pack_item_service.get_attributes(),
                        'pack_size_name': pack.size.size.name,
                        'pack_size_abbreviation': pack.size.size.abbreviation,
                        'supplier_inquiry_details': pack_item_service.get_service_suppliers()
                    })
        services = self.sort_embellishment_data(services)
        return services.values()
