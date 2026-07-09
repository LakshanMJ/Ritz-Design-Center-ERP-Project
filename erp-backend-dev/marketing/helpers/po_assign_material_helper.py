from abc import abstractmethod

from rest_framework import status
from rest_framework.response import Response

from marketing.helpers.material_helper import FabricPlacementHelper
from marketing.mixins.material_mixins import GenericUserDefinedMaterialMixin, FabricMaterialHelperMixin
from marketing.models import POPackItemPlacement, POPackPlacement
from marketing.utils.placement_material_utils import placement_material_errors_empty
from materials.models import CustomerBrandMaterialCode, CustomerBrandMaterial
from shared.constants.global_constants import FORM_ERRORS_KEY, FIELD_ERRORS_KEY
from shared.utils import get_object_or_none


class POPlacementAssignMaterial:
    CREATE_MATERIAL_TYPE = 'create-material'
    SELECT_MATERIAL_TYPE = 'select-material'
    reference_code_key = CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY
    _errors = {FORM_ERRORS_KEY: [], FIELD_ERRORS_KEY: {}}

    def __init__(self, post_data, select_type):
        _errors = {FORM_ERRORS_KEY: [], FIELD_ERRORS_KEY: {}}
        self.post_data = post_data
        self.select_type = select_type

    def errors_empty(self):
        return placement_material_errors_empty(self._errors)

    def add_form_error(self, error):
        self._errors[FORM_ERRORS_KEY].append(error)

    def add_field_error(self, field, error):
        self._errors[FIELD_ERRORS_KEY][field] = error

    def get_customer_brand_material(self):
        customer_brand_material_id = self.post_data.get('customer_brand_material_id', None)
        customer_brand_material = get_object_or_none(CustomerBrandMaterial, {'pk': customer_brand_material_id})
        return customer_brand_material

    def valid_reference_code_value(self, reference_code):
        if self.select_type == self.SELECT_MATERIAL_TYPE:
            customer_brand_material = self.get_customer_brand_material()
            assigned_material_reference_code = customer_brand_material.customer_brand_generic_material_code.customer_reference_code
        else:
            assigned_material_reference_code = self.post_data.get(self.reference_code_key, '')
        return reference_code == assigned_material_reference_code

    def add_limitations(self, placements):
        new_placements = self.filter_out_reviewed_placements(placements)
        new_placements = self.limit_placement_to_purchase_order(new_placements)
        return new_placements

    def save_po_material(self, po_placement_object, material):
        po_placement_object.po_material = material
        po_placement_object.save()
        update_placements = self.get_matching_placements()
        update_placements = self.add_limitations(update_placements)
        update_placements.update(po_material=material)

    def process_data(self):
        reference_code = self.costing_placement_material.material_code.customer_reference_code
        material = None
        if not self.valid_reference_code_value(reference_code):
            self.add_field_error(self.reference_code_key, "Customer reference code should match the reference code entered in the costing")
        else:

            if self.select_type == self.SELECT_MATERIAL_TYPE:
                material = self.get_customer_brand_material()
                if not material:
                    self._errors.append("Please select a material")
                else:
                    self.update_placement_po_materials(material)

            else:
                self._errors, material = self.validate_material_and_save()
                if self.errors_empty():
                    self.update_placement_po_materials(material)
        return self._errors, material

    def process_and_get_http_response(self):
        self.process_data()
        status_code = status.HTTP_200_OK
        response = {'success': True,}
        if not self.errors_empty():
            response = {'success': False, 'errors': self._errors}
            status_code = status.HTTP_400_BAD_REQUEST
        return Response(response, status=status_code)

    @abstractmethod
    def validate_material_and_save(self):
        ...

    @property
    @abstractmethod
    def order(self):
        ...

    @property
    @abstractmethod
    def material_type(self):
        ...

    @property
    @abstractmethod
    def costing_placement_material(self):
        ...

    @abstractmethod
    def limit_placement_to_purchase_order(self, placements):
        ...

    @abstractmethod
    def filter_out_reviewed_placements(self, placements):
        ...

    @abstractmethod
    def get_matching_placements(self):
        ...

    @abstractmethod
    def update_placement_po_materials(self, po_material):
        ...


class POPackItemPlacementAssignMaterial(POPlacementAssignMaterial):

    def __init__(self, po_pack_item_placement, post_data, select_type):
        super().__init__(post_data, select_type)
        self.po_pack_item_placement = po_pack_item_placement

    def update_placement_po_materials(self, po_material):
        self.save_po_material(self.po_pack_item_placement, po_material)

    def limit_placement_to_purchase_order(self, po_pack_item_placements):
        return po_pack_item_placements.filter(po_pack_item__po_pack__purchase_order=self.purchase_order)

    def filter_out_reviewed_placements(self, po_pack_item_placements):
        return po_pack_item_placements.filter(po_pack_item__reviewed=False)

    def get_matching_placements(self):
        po_colorway = self.po_pack.po_colorway

        placements = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__po_colorway=po_colorway,
            po_pack_item__po_item=self.po_pack_item.po_item,
            po_pack_item__po_pack__purchase_order=self.purchase_order,
            costing_pack_item_placement__orderpackitemplacementmaterial__material=self.costing_placement_material,
            po_pack_item__reviewed=False
        )
        placements = placements.filter(costing_pack_item_placement__item_attribute_other=self.po_pack_item_placement.costing_pack_item_placement.item_attribute_other)
        return placements

    def validate_material_and_save(self):
        return None, None

    @property
    def material_type(self):
        return self.po_pack_item_placement.costing_pack_item_placement.placement_material_type

    @property
    def costing_placement_material(self):
        return self.po_pack_item_placement.costing_pack_item_placement.get_placement_material_object().material

    @property
    def order(self):
        return self.version.order

    @property
    def po_pack_item(self):
        return self.po_pack_item_placement.po_pack_item

    @property
    def po_pack(self):
        return self.po_pack_item.po_pack

    @property
    def purchase_order(self):
        return self.po_pack.purchase_order

    @property
    def version(self):
        return self.purchase_order.costing_version


class GenericMaterialPOPackItemPlacementAssignMaterial(POPackItemPlacementAssignMaterial, GenericUserDefinedMaterialMixin):

    def validate_material_and_save(self):
        return self.save_user_defined_material(self.material_type, self.post_data, self.order)


class FabricPOPackItemPlacementAssignMaterial(GenericMaterialPOPackItemPlacementAssignMaterial):
    pass


class POPackPlacementAssignMaterial(POPlacementAssignMaterial, GenericUserDefinedMaterialMixin):

    def __init__(self, po_pack_placement, post_data, select_type):
        super().__init__(post_data, select_type)
        self.po_pack_placement = po_pack_placement

    def limit_placement_to_purchase_order(self, po_pack_placements):
        return po_pack_placements.filter(po_pack__purchase_order=self.purchase_order)

    def filter_out_reviewed_placements(self, po_pack_placements):
        return po_pack_placements.filter(po_pack__reviewed=False)

    def get_matching_placements(self):
        po_colorway = self.po_pack.po_colorway
        placements = POPackPlacement.objects.filter(
            po_pack__po_colorway=po_colorway,
            po_pack__purchase_order=self.purchase_order,
            costing_pack_placement__orderpackplacementmaterial__material=self.costing_placement_material,
            po_pack__reviewed=False
        )

        if self.po_pack_placement.costing_pack_placement.item_attribute:
            placements = placements.filter(costing_pack_placement__item_attribute=self.po_pack_placement.costing_pack_placement.item_attribute)
        else:
            placements = placements.filter(costing_pack_placement__item_attribute_other=self.po_pack_placement.costing_pack_placement.item_attribute_other)
        return placements

    def validate_material_and_save(self):
        return self.save_user_defined_material(self.material_type, self.post_data, self.order)

    @property
    def material_type(self):
        return self.po_pack_placement.costing_pack_placement.placement_material_type

    @property
    def costing_placement_material(self):
        return self.po_pack_placement.costing_pack_placement.get_placement_material_object().material

    @property
    def order(self):
        return self.version.order

    @property
    def po_pack(self):
        return self.po_pack_placement.po_pack

    @property
    def purchase_order(self):
        return self.po_pack.purchase_order

    @property
    def version(self):
        return self.purchase_order.costing_version


