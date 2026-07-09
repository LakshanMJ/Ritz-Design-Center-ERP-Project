from abc import abstractmethod
from abc import abstractmethod

from django.core.exceptions import ObjectDoesNotExist

from marketing.models import OrderPackItemPlacementMaterial, OrderPackItem, OrderPackItemPlacement
from materials.models import Material, CustomerBrandMaterial
from shared.constants.global_constants import FORM_ERRORS_KEY, FIELD_ERRORS_KEY
from shared.models import CustomerBrand

from shared.utils import get_object_or_none


class OrderPackItemPlacementHelper:
    CREATE_MATERIAL_TYPE = 'create-material'
    SELECT_MATERIAL_TYPE = 'select-material'

    def __init__(self, pack_item_placement, data_row):
        self.pack_item_placement = pack_item_placement
        self.data_row = data_row
        self.material_type = data_row['material_type']

    def limit_placement_to_order_version_and_not_reviewed(self, pack_item_placements):
        return pack_item_placements.filter(order_pack_item__item__order=self.order, order_pack_item__reviewed=False, order_pack_item__pack__version=self.version)

    def update_selected_placement_materials(self, order_material):
        reviewed_opi_placements_to_update = self.data_row.get('selected_placements', [])

        order_placements = OrderPackItemPlacement.objects.filter(pk__in=reviewed_opi_placements_to_update).prefetch_related('orderpackitemplacementmaterial')
        order_placements = self.limit_placement_to_order_version_and_not_reviewed(order_placements)
        for order_placement in order_placements:
            placement_material = OrderPackItemPlacementMaterial.objects.get_or_create(placement=order_placement)[0]
            placement_material.material = order_material
            placement_material.save()

    def process_material(self):
        errors = {FORM_ERRORS_KEY: []}

        row_errors, material = self.handle_material()

        has_errors = False

        if len(row_errors.get(FORM_ERRORS_KEY, [])) > 0 or row_errors.get(FIELD_ERRORS_KEY, {}) != {}:
            errors = row_errors
            has_errors = True
        elif self.order_pack_item_placement_item_attribute_other is not None:
            if self.order_pack_item_placement_item_attribute_other.type != material.material_type:
                errors[FORM_ERRORS_KEY].append("The material selected must be a %s" % material.material_type)
                has_errors = True

        if not has_errors:
            # item_placements = self.get_material_item_placements()
            # limited_item_placements = self.limit_placement_to_order_version_and_not_reviewed(item_placements)
            # self.update_item_placement_material(limited_item_placements, material)
            self.update_selected_placement_materials(material)
        return errors

    # To ensure that only the order's placements get updated
    def update_item_placement_material_variation(self, item_variation_placements, material_variation):
        item_variation_placements.update(variation_id=material_variation.pk)

    # To ensure that only the order's placement materials get updated
    # def get_material_variation_item_placements(self):
    #     return OrderPackItemPlacementMaterial.objects.filter(placement=self.pack_item_placement)

    def handle_material(self): # Used to material_type as param
        if self.data_row.get('select_type', '') == self.SELECT_MATERIAL_TYPE:
            errors = {FORM_ERRORS_KEY: []}
            material = get_object_or_none(CustomerBrandMaterial, {'pk': self.data_row.get('customer_brand_material_id', None)})

            if not material:
                errors[FORM_ERRORS_KEY].append("Selected Material Not Found. Please refresh page and try again.")
        else:
            errors, material = self.validate_and_save_material()
        return errors, material

    # def update_item_placement_material(self, pack_item_placements, customer_brand_material):
    #     for placement in pack_item_placements:
    #         placement_material = OrderPackItemPlacementMaterial.objects.get_or_create(placement=placement)[0]
    #         placement_material.material = customer_brand_material
            # if placement_material.placement_id == current_placement.pk:
            #     placement_material.variation_id = material_variation.pk
            # placement_material.save()

    def filter_placement_colorway_and_item(self, item_placements):
        return item_placements.filter(order_pack_item__item=self.order_item, order_pack_item__pack__colorway=self.order_colorway)

    # def get_material_item_placements(self):
    #     order_pack_item = self.order_pack_item
    #     order = self.order
    #     order_pack_items = OrderPackItem.objects.filter(pack__version=self.version, item=order_pack_item.item)
    #     order_pack_item_ids = order_pack_items.values_list('id', flat=True)
    #
    #     item_placements = OrderPackItemPlacement.objects.filter(order_pack_item_id__in=order_pack_item_ids)
    #     item_placements = self.filter_item_attributes(item_placements)
    #     item_placements = self.filter_placement_colorway_and_item(item_placements)
    #     return item_placements

    def filter_item_attributes(self, order_pack_item_placement_qs):
        return order_pack_item_placement_qs.filter(item_attribute_other=self.order_pack_item_placement_item_attribute_other)

    @property
    def version(self):
        return self.order_pack.version

    @property
    def order(self):
        return self.order_item.order

    @property
    def order_pack(self):
        return self.order_pack_item.pack

    @property
    def order_pack_item(self):
        return self.pack_item_placement.order_pack_item

    @property
    def order_item(self):
        return self.order_pack_item.item

    @property
    def order_colorway(self):
        return self.order_pack.colorway

    @property
    def order_size(self):
        return self.order_pack().size

    @property
    def order_country(self):
        return self.order_pack().country
    #
    # @property
    # def order_pack_item_placement_item_attribute(self):
    #     return self.pack_item_placement.item_attribute

    @property
    def order_pack_item_placement_item_attribute_other(self):
        return self.pack_item_placement.item_attribute_other

    @abstractmethod
    def validate_and_save_material(self):
        ... # return errors[], material_obj, material_varation_object
