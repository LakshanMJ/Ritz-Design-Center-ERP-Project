import copy
from abc import abstractmethod

from rest_framework.generics import get_object_or_404

from marketing.helpers.cad_interface_helprs import PackItemCadInterfacePlacementMaterial, \
    PackCadInterfacePlacementMaterial, BaseOrderFabric
from marketing.models import OrderPackItemPlacementMaterial, OrderInquiry, OrderPackPlacementMaterial, \
    OrderCostingVersion, OrderSizeGroup, OrderPack, OrderPackOtherCost
from materials.fieldmetadata.material_metadata import get_supplier_quote_meta_data
from materials.models import SupplierInquiry, Material, CustomerBrandMaterial
from shared.utils import get_object_or_none


class CombineCostingInterfaceMixin:
    PLACEMENT_MATERIAL_INQUIRY_CONSUMPTION_DATA_KEY = 'supplier_inquiry_material_cost_data'

    def pop_key_from_dict(self, dictionary, key):
        if key == Material.FABRIC_MATERIAL:
            self.material_data = dictionary.pop(key)

    def get_supplier_headers(self):
        return get_supplier_quote_meta_data(False)

    def add_consumption_data(self, data_key, data, consumption_object):
        if consumption_object:
            data[data_key][BaseOrderFabric.WASTAGE_KEY] = consumption_object.wastage
            data[data_key][BaseOrderFabric.CONSUMPTION_RATIO_KEY] = consumption_object.costing_consumption_ratio

    def get_consumption_data_for_inquiry(self, consumption_data, inquiry):
        placement_material_ids = [ placement_material_data.get('order_placement_material_id', None) for placement_material_data in consumption_data.values()]
        placement_materials = self.get_placement_material_qs(placement_material_ids)

        inquiry_consumption_data = copy.deepcopy(consumption_data)
        for key, value in consumption_data.items():
            for placement_material in placement_materials:
                # consumption_object = placement_material.placement.get_material_consumption_object()
                consumption_object = placement_material.placement.get_placement_material_consumption(inquiry)
                if placement_material.placement.placement_material_type == Material.FABRIC_MATERIAL:
                    self.add_consumption_data(key, inquiry_consumption_data, consumption_object)
                total = None
                if consumption_object:
                    total = consumption_object.calculate_cost_for_supplier_inquiry(inquiry)
                inquiry_consumption_data[key]['total_cost'] = total
        return inquiry_consumption_data

    def get_supplier_data_for_material(self, customer_brand_material_id, consumption_data, order_supplier_inquiries, version):
        inquiries = order_supplier_inquiries.filter(version=version, customer_brand_material_id=customer_brand_material_id)
        inquiry_data = []
        for inquiry in inquiries:
            inquiry_details = inquiry.supplierinquirydetail_set.all().filter(completed=True)
            for inquiry_detail in inquiry_details:
                inquiry_attributes = inquiry_detail.get_attributes()
                consumption_cost_data = self.get_consumption_data_for_inquiry(consumption_data, inquiry_detail)
                # print(consumption_cost_data)
                inquiry_attributes[CombinedCostingPackItemInterface.PLACEMENT_MATERIAL_INQUIRY_CONSUMPTION_DATA_KEY] = consumption_cost_data
                inquiry_data.append(inquiry_attributes)
        return inquiry_data


    def add_supplier_data_to_cad_data(self, cad_data, order_supplier_inquiries, version):
        for material_type, material_values in cad_data.items():
            material_data = material_values.get('data', [])
            for material_row in material_data:
                material_id = material_row[CombinedCostingPackItemInterface.MATERIAL_ID_KEY]
                consumption_data = material_row.get(CombinedCostingPackItemInterface.CONSUMPTION_DATA_KEY, {})

                inquiry_data = self.get_supplier_data_for_material(material_id, consumption_data, order_supplier_inquiries, version)
                material_row['supplier_inquiries'] = inquiry_data

    @abstractmethod
    def get_placement_material_qs(self, placement_material_ids):
        ...


class CombinedCostingPackItemInterface(PackItemCadInterfacePlacementMaterial, CombineCostingInterfaceMixin):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order_supplier_inquiries = self.version.get_version_supplier_inquiries()#SupplierInquiry.objects.filter(order=self.order)

    # Overriding this to return empty list. The headers will be added in the expand header tab
    def append_sizes_to_headers(self):
        return []

    def get_fabric_cad_consumption_ratios(self):
        return []

    # This is overriding the parent to save material_data to self
    def pop_key_from_dict(self, dictionary, key):
        ...

    def get_placement_material_qs(self, placement_material_ids):
        placement_materials = OrderPackItemPlacementMaterial.objects.filter(pk__in=placement_material_ids)
        return placement_materials

    def get_placement_material_details(self):
        material_data = super().get_placement_material_details()
        # print(material_data)

        # fabric_data = self.material_data
        # return fabric_data
        material_cad_data = material_data.get('cad_data', None)
        self.add_supplier_data_to_cad_data(material_cad_data, self.order_supplier_inquiries, self.version)
        material_data['supplier_inquiry_headers'] = self.get_supplier_headers()
        material_data['size_headers'] = super().append_sizes_to_headers()
        return material_data


class CombinedCostingPackCadInterfacePlacementMaterial(PackCadInterfacePlacementMaterial, CombineCostingInterfaceMixin):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order_supplier_inquiries = self.version.get_version_supplier_inquiries()

    # Overriding this to return empty list. The headers will be added in the expand header tab
    def append_sizes_to_headers(self):
        return []

    def get_placement_material_qs(self, placement_material_ids):
        placement_materials = OrderPackPlacementMaterial.objects.filter(pk__in=placement_material_ids)
        return placement_materials

    def get_placement_material_details(self):
        material_data = super().get_placement_material_details()

        material_cad_data = material_data.get('cad_data', None)
        self.add_supplier_data_to_cad_data(material_cad_data, self.order_supplier_inquiries, self.version)
        material_data['supplier_inquiry_headers'] = self.get_supplier_headers()
        material_data['size_headers'] = super().append_sizes_to_headers()
        return material_data



