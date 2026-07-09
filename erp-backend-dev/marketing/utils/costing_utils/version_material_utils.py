from abc import abstractmethod

from marketing import models as marketing_models


class MaterialEstimatedQuantity:

    def __init__(self, version, customer_brand_material, *args, **kwargs):
        self.version = version
        self.customer_brand_material = customer_brand_material

    @abstractmethod
    def get_order_pack(self, placement_material):
        ...

    @abstractmethod
    def get_material_placements(self):
        ...

    def get_version_material_estimated_quantity(self):
        placement_materials = self.get_material_placements()
        total_quantity = 0
        quantity_units = None
        for placement_material in placement_materials:
            if placement_material.placement.item_attribute_other.estimated_consumption_ratio_units != quantity_units:
                if not quantity_units:
                    quantity_units = placement_material.placement.item_attribute_other.estimated_consumption_ratio_units
                else:
                    quantity_units = None
                    total_quantity = None
                    break
            estimated_ratio = placement_material.placement.item_attribute_other.estimated_consumption_ratio
            order_pack = self.get_order_pack(placement_material)
            estimated_quantity = order_pack.get_estimated_quantity()
            if estimated_quantity is not None and estimated_ratio is not None and total_quantity is not None:
                placement_quantity = float(estimated_ratio) * float(estimated_quantity)
                total_quantity += placement_quantity
            else:
                total_quantity = None
        return total_quantity, quantity_units


class OrderPackItemMaterialEstimatedQuantity(MaterialEstimatedQuantity):

    def get_order_pack(self, placement_material):
        return placement_material.placement.order_pack_item.pack

    def get_material_placements(self):
        placement_materials = marketing_models.OrderPackItemPlacementMaterial.objects.filter(
            placement__order_pack_item__pack__version=self.version,
            material=self.customer_brand_material
        )
        return placement_materials


class OrderPackMaterialEstimatedQuantity(MaterialEstimatedQuantity):

    def get_order_pack(self, placement_material):
        return placement_material.placement.order_pack

    def get_material_placements(self):
        placement_materials = marketing_models.OrderPackPlacementMaterial.objects.filter(
            placement__order_pack__version=self.version,
            material=self.customer_brand_material
        )
        return placement_materials



