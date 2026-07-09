from abc import abstractmethod

from django.core.exceptions import ObjectDoesNotExist

from marketing.models import OrderPackPlacement, OrderPackPlacementMaterial
from marketing.utils.placement_material_utils import placement_material_errors_empty
from materials.models import Material, CustomerBrandMaterial
from shared.constants.global_constants import FORM_ERRORS_KEY
from shared.models import CustomerBrand

from shared.utils import get_object_or_none


class OrderPackPlacementHelper:
    CREATE_MATERIAL_TYPE = 'create-material'
    SELECT_MATERIAL_TYPE = 'select-material'

    def __init__(self, pack_placement, data_row):
        self.pack_placement = pack_placement
        self.data_row = data_row
        self.material_type = data_row['material_type']

    def limit_placement_to_version_and_not_reviewed(self, pack_placements):
        return pack_placements.filter(order_pack__version=self.version, order_pack__reviewed=False)

    def limit_placement_material_to_version(self, pack_placement_materials):
        return pack_placement_materials.filter(placement__order_pack__version=self.version)

    def update_item_placement_material(self, pack_item_placements, customer_material):
        for placement in pack_item_placements:
            placement_material = OrderPackPlacementMaterial.objects.get_or_create(placement=placement)[0]
            placement_material.material = customer_material
            placement_material.save()

    def get_material_item_placements(self):
        item_placements = OrderPackPlacement.objects.filter(pk=self.pack_placement.id)
        return item_placements

    @abstractmethod
    def validate_and_save_material(self):
        ...

    def handle_material(self): # Used to material_type as param
        errors = {}
        if self.data_row.get('select_type', '') == self.SELECT_MATERIAL_TYPE:

            material = get_object_or_none(CustomerBrandMaterial, {'pk': self.data_row.get('customer_brand_material_id', None)})

            if not material:
                # material = material.material
                errors = {FORM_ERRORS_KEY: "Selected Material Not Found. Please refresh page and try again."}
        else:
            errors, material = self.validate_and_save_material()
        return errors, material

    def placement_material_type_equals_material_type(self, material):
        is_equal = True
        material_type = material.material_detail.generic_material.user_material.name

        if self.order_pack_placement_attribute_object.type != material_type:
            is_equal = False
        return is_equal

    def update_reviewed_placement_materials(self, order_material):
        op_placement_material_ids = self.data_row.get('selected_placements', [])

        order_placements = OrderPackPlacement.objects.filter(pk__in=op_placement_material_ids).prefetch_related('orderpackplacementmaterial')
        order_placements = self.limit_placement_to_version_and_not_reviewed(order_placements)

        for order_placement in order_placements:
            placement_material = OrderPackPlacementMaterial.objects.get_or_create(placement=order_placement)[0]
            placement_material.material = order_material
            placement_material.save()

    def errors_empty(self, errors):
        return placement_material_errors_empty(errors)

    def process_material(self):
        errors = {}
        row_errors, material = self.handle_material()

        if not self.errors_empty(row_errors):
            errors = row_errors
        elif not self.placement_material_type_equals_material_type(material):
            errors = {FORM_ERRORS_KEY: ["Material Type Should be %s" % self.order_pack_placement_attribute_object.type]}

        if self.errors_empty(errors):
            item_placements = self.get_material_item_placements()
            limited_item_placements = self.limit_placement_to_version_and_not_reviewed(item_placements)
            # customer_material = self.get_or_create_material_reference_code(material, self.data_row.get('reference_code', ''))
            self.update_item_placement_material(limited_item_placements, material)
            self.update_reviewed_placement_materials(material)
        return errors

    @property
    def order(self):
        return self.pack_placement.order_pack.colorway.order

    @property
    def version(self):
        return self.pack_placement.order_pack.version

    @property
    def order_pack(self):
        return self.pack_placement.order_pack

    @property
    def order_pack_placement_attribute_other(self):
        return self.pack_placement.item_attribute_other

    @property
    def order_pack_placement_attribute_object(self):
        object = self.order_pack_placement_attribute_other

        return object
