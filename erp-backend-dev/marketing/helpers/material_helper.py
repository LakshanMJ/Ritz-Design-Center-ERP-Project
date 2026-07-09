from abc import abstractmethod

from marketing.helpers.material_order_pack_helpers import OrderPackPlacementHelper
from marketing.helpers.material_order_pack_item_helpers import OrderPackItemPlacementHelper
from marketing.mixins.material_mixins import GenericUserDefinedMaterialMixin, FabricMaterialHelperMixin
from marketing.models import OrderPackItemPlacementMaterial, OrderPackItem, OrderPackItemPlacement, \
    ColorwayItemType
from materials.serializers.material_serializers import *
from shared.utils import get_object_or_none


class FabricPlacementHelper(OrderPackItemPlacementHelper, FabricMaterialHelperMixin):

    def validate_and_save_material(self):
        errors, fabric = self.validate_fabric_and_save(self.data_row, self.order)
        return errors, fabric


class UserDefinedMaterialPackItemHelper(OrderPackItemPlacementHelper, GenericUserDefinedMaterialMixin):

    def validate_and_save_material(self):
        errors, material = self.save_user_defined_material(self.material_type, self.data_row, self.order)
        return errors, material


class UserDefinedMaterialPackHelper(OrderPackPlacementHelper, GenericUserDefinedMaterialMixin):

    def validate_and_save_material(self):
        errors, material = self.save_user_defined_material(self.material_type, self.data_row, self.order)
        return errors, material

