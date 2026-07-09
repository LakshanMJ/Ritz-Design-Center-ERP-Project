from marketing.models import OrderPack, OrderPackItem
from materials.models import Material
import re

from shared.constants.global_constants import FORM_ERRORS_KEY, FIELD_ERRORS_KEY


def get_pack_item_placement_material_helper_class(material_type):
    from marketing.helpers.material_helper import UserDefinedMaterialPackItemHelper, FabricPlacementHelper

    material_helper_class = None
    if material_type == Material.FABRIC_MATERIAL:
        material_helper_class = FabricPlacementHelper
    else:
        material_helper_class = UserDefinedMaterialPackItemHelper
    return material_helper_class


def simplify_string(string):
    string = string.replace(' ', '_')
    string = re.sub(r'[^a-zA-Z0-9_%]', '', string)
    string = re.sub(r'_+', '_', string)
    string = string.strip('_')
    string = string.lower()
    return string


def get_order_pack_placement_material_helper(material):
    from marketing.helpers.material_helper import UserDefinedMaterialPackHelper
    return UserDefinedMaterialPackHelper


def placement_material_errors_empty(errors):
    errors_empty = False
    if not errors.get(FORM_ERRORS_KEY, []) and not bool(errors.get(FIELD_ERRORS_KEY, {})):
        errors_empty = True
    return errors_empty


