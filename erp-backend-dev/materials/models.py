from functools import cached_property
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from django.core.exceptions import ObjectDoesNotExist
from django.db import models
# from eav.decorators import register_eav

from marketing.utils.costing_utils.version_material_utils import OrderPackItemMaterialEstimatedQuantity, \
    OrderPackMaterialEstimatedQuantity
from materials.fieldmetadata.measuring_unit_helpers import PerMeasuringUnitHelper, MaterialUnitHelper
from shared.models import BaseAbstractModel, Supplier, Customer, CustomerBrand, Email, FileAttachment, Size, COSTING_MODE_TYPES, SHIPPING_MODE_TYPES, SEA_TRANSPORT_METHOD, PAYMENT_METHOD_TYPES
from shared.shared_utils.reference_code_utils import ModelReferenceCodeMixin
from shared.utils import get_object_or_none, get_eav_attribute_data, get_eav_dropdown_option_data, \
    get_eav_field_display_value, remove_dupplicate_words_from_string, remove_spaces_from_string
from rest_framework.generics import get_object_or_404


class Material:
    FABRIC_MATERIAL = 'fabric'


SEWING_TRIM_TYPES = 'sewing_trim'
FABRIC_TRIM_TYPES = Material.FABRIC_MATERIAL
PACKAGING_TYPES = 'packaging_trim'
GENERAL_TYPE = 'general'
MATERIAL_TYPES = (
    (SEWING_TRIM_TYPES, 'Sewing Trims'),
    (PACKAGING_TYPES, 'Packaging')
)


class Unit(BaseAbstractModel):
    name = models.CharField(max_length=50)


class UserDefinedMaterial(BaseAbstractModel):
    USER_DEFINED_MATERIAL_TYPES = (
        (FABRIC_TRIM_TYPES, 'Fabric'),
        (SEWING_TRIM_TYPES, 'Sewing Trims'),
        (PACKAGING_TYPES, 'Packaging'),
    )
    category = models.CharField(max_length=100, choices=USER_DEFINED_MATERIAL_TYPES)
    material = models.CharField(max_length=1000) # this is the label field
    name = models.CharField(max_length=200) # this is the name field
    mandatory = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    default_consumption_ratio = models.DecimalField(max_digits=20, decimal_places=6, null=True)
    consumption_measurement_unit = models.CharField(max_length=200, choices=MaterialUnitHelper.CONSUMPTION_MEASURING_OPTIONS, null=True)
    estimated_consumption_ratio_units = models.CharField(max_length=200, default=None, null=True)
    has_shade = models.BooleanField(default=False)
    size_dependent = models.BooleanField(default=False) # get_size_dependent_fields

    def get_material_valid_units(self):
        valid_units = []
        if self.consumption_measurement_unit == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION:
            valid_units = MaterialUnitHelper.LENGTH_UNITS
        elif self.consumption_measurement_unit == MaterialUnitHelper.PIECES_UNIT_OPTION:
            valid_units = MaterialUnitHelper.PIECE_UNITS
        return valid_units

    def get_user_defined_material_fields(self, include_inactive=False):
        attributes = self.userdefinedmaterialattribute_set.all()
        if not include_inactive:
            attributes = attributes.filter(active=True)
        return attributes

    def get_size_dependent_fields(self):
        attributes = self.get_user_defined_material_fields()
        size_fields = attributes.filter(size_field=True)
        return size_fields

    def get_grn_fields(self):
        fields = self.get_user_defined_material_fields().filter(is_grn_field=True)
        return fields

    def get_material_variation_fields(self):
        fields = self.get_user_defined_material_fields()
        return fields.filter(is_material_variation=True)

    def get_material_fields_excluding_variation_fields(self):
        fields = self.get_user_defined_material_fields()
        return fields.filter(is_material_variation=False)

    def get_consumption_measuring_unit_display(self):
        unit = 'Invalid consumption measurement unit. Contact admin.' # If this is the case consumption_measurement_unit must be set properly
        if self.consumption_measurement_unit == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION:
            unit = MaterialUnitHelper.METERS_UNIT_DISPLAY
        elif self.consumption_measurement_unit == MaterialUnitHelper.PIECES_UNIT_OPTION:
            unit = MaterialUnitHelper.PIECES_UNIT_DISPLAY
        return unit

    def get_consumption_measuring_unit(self):
        unit = 'Invalid consumption measurement unit. Contact admin.' # If this is the case consumption_measurement_unit must be set properly
        if self.consumption_measurement_unit == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION:
            unit = MaterialUnitHelper.METERS_UNIT
        elif self.consumption_measurement_unit == MaterialUnitHelper.PIECES_UNIT_OPTION:
            unit = MaterialUnitHelper.PIECE_UNITS
        return unit

    def get_consumption_measuring_unit_details(self):
        unit = None  # If this is the case consumption_measurement_unit must be set properly
        if self.consumption_measurement_unit == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION:
            unit = {
                'display_value': MaterialUnitHelper.METERS_UNIT_DISPLAY,
                'value': MaterialUnitHelper.METERS_UNIT
            }
        elif self.consumption_measurement_unit == MaterialUnitHelper.PIECES_UNIT_OPTION:
            unit = {
                'display_value': MaterialUnitHelper.PIECES_UNIT_DISPLAY,
                'value': MaterialUnitHelper.PIECES_UNIT
            }
        return unit

    @staticmethod
    def get_material_headers(material_name):
        from materials.fieldmetadata.material_metadata import get_userdefined_material_meta_data
        material = UserDefinedMaterial.objects.get(name=material_name)
        metadata = get_userdefined_material_meta_data(material)
        return metadata

    class Meta:
        ordering = ('id', )
        constraints = [
            models.UniqueConstraint(
                fields=('name', ),
                name='unique_material_name'
            )
        ]


class UserDefinedMaterialAttribute(BaseAbstractModel):
    material = models.ForeignKey(UserDefinedMaterial, on_delete=models.CASCADE)

    DECIMAL_ATTRIBUTE = 'decimal'
    CHARACTER_ATTRIBUTE = 'character'
    BOOLEAN_ATTRIBUTE = 'boolean'
    INTEGER_ATTRIBUTE = 'integer'
    DROPDOWN_ATTRIBUTE = 'dropdown'
    ATTRIBUTE_TYPES = (
        (DECIMAL_ATTRIBUTE, 'Decimal'),
        (CHARACTER_ATTRIBUTE, 'Character'),
        (BOOLEAN_ATTRIBUTE, 'Boolean (True or False'),
        (INTEGER_ATTRIBUTE, 'Integer'),
        (DROPDOWN_ATTRIBUTE, 'Dropdown')
    )
    attribute_type = models.CharField(max_length=200, choices=ATTRIBUTE_TYPES)
    name = models.CharField(max_length=500)
    label = models.CharField(max_length=1000)
    display_order = models.IntegerField(null=True, default=0)
    mandatory = models.BooleanField(default=True)
    is_material_variation = models.BooleanField(default=False)
    po_editable = models.BooleanField(default=False)
    is_grn_field = models.BooleanField(default=False)
    size_field = models.BooleanField(default=False) # This will specify whether the value should be same as item size. If this is true, is_material_variation must be true as well for the automatic creation part to work

    def get_dropdown_options(self):
        options = self.userdefineddropdownoption_set.filter(active=True)
        return options

    def get_display_value_field_name(self):
        return '%s%s' % (self.name, GenericMaterial.DROPDOWN_POSTFIX)

    def get_drop_down_option_object(self, dropdown_option_id):
        dropdown_option = None
        if isinstance(dropdown_option_id, int):
            dropdown_option = get_object_or_none(UserDefinedDropDownOption, {'pk': dropdown_option_id, 'attribute_id': self})
        return dropdown_option

    class Meta:
        ordering = ('id', )
        constraints = [
            models.UniqueConstraint(
                fields = ('name', ),
                name = 'unique_user_defined_material_attribute_name'
            )
        ]


class UserDefinedDropDownOption(BaseAbstractModel):
    value = models.CharField(max_length=1000)
    display_value = models.CharField(max_length=1000)
    attribute = models.ForeignKey(UserDefinedMaterialAttribute, on_delete=models.CASCADE)


# @register_eav()
class GenericMaterial(BaseAbstractModel, ModelReferenceCodeMixin):
    MODEL_REFERENCE_CODE_PREFIX = 'MAT'
    USER_MATERIAL_ID_KEY = 'user_material_id'
    MATERIAL_TYPE_KEY = 'material_type'
    MATERIAL_LABEL_KEY = 'material_label'
    GENERIC_MATERIAL_ID_KEY = 'generic_material_id'
    DROPDOWN_POSTFIX = '_display_value'

    user_material = models.ForeignKey(UserDefinedMaterial, on_delete=models.CASCADE)
    user_defined_material_data = models.JSONField(null=True, default=dict)


    def get_attributes(self):
        data = {
            self.GENERIC_MATERIAL_ID_KEY: self.pk,
            self.MATERIAL_TYPE_KEY: self.user_material.name,
            self.MATERIAL_LABEL_KEY: self.user_material.material,
            # self.CUSTOMER_BRAND_MATERIAL_CODE_KEY: self.customer_reference_code,
            self.USER_MATERIAL_ID_KEY: self.user_material_id,
        }
        fields = self.user_material.get_material_fields_excluding_variation_fields()

        for field in fields:
            if not field.is_material_variation:
                value = get_eav_attribute_data(self, field)
                data[field.name] = value

                if field.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
                    display_value = get_eav_dropdown_option_data(field, value)
                    data['%s%s' % (field.name, self.DROPDOWN_POSTFIX)] = display_value
        return data


# @register_eav()
class GenericMaterialVariation(BaseAbstractModel, ModelReferenceCodeMixin):
    generic_material = models.ForeignKey(GenericMaterial, on_delete=models.CASCADE)
    user_defined_material_data = models.JSONField(null=True, default=dict)

    # MATERIAL_ID_KEY = 'material_id'
    DROPDOWN_POSTFIX = GenericMaterial.DROPDOWN_POSTFIX
    PK_MATERIAL_VARIATION_ID = 'generic_material_variation_id'
    MODEL_REFERENCE_CODE_PREFIX = 'MATC'
    MATERIAL_DETAIL_SIZE_ID = 'material_item_size_id'
    MATERIAL_DETAIL_SIZE = 'material_item_size'

    @property
    def material_type(self):
        return self.generic_material.user_material.name

    def get_material_variation_eav_values(self, include_json_field_name=True):
        # This is different from the below method. This doesn't send display values
        fields = self.generic_material.user_material.get_material_variation_fields()
        data = {}
        for field in fields:
            value = get_eav_attribute_data(self, field)
            if include_json_field_name:
                data[f'user_defined_material_data__{field.name}'] = value
            else:
                data[field.name] = value
        return data

    def get_attributes(self):
        fields = self.generic_material.user_material.get_material_variation_fields()
        data = {
            self.PK_MATERIAL_VARIATION_ID: self.pk,
        }

        material_data = self.generic_material.get_attributes()
        for field in fields:
            if field.is_material_variation:
                value = get_eav_attribute_data(self, field)
                #print(value)
                data[field.name] = value

                if field.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
                    display_value = get_eav_dropdown_option_data(field, value)
                    data['%s%s' % (field.name, self.DROPDOWN_POSTFIX)] = display_value
        material_variation_data = {
            **material_data,
            **data
        }
        return material_variation_data

    def get_reference_code_postfix(self):
        attributes = self.generic_material.user_material.get_material_variation_fields()
        postfix = ''
        for attribute in attributes:
            if 'color' in str(attribute.name).lower():
                value = get_eav_field_display_value(attribute, self)
                value = remove_spaces_from_string(value)
                postfix += '-' + value.upper()
        return postfix.strip('-')


class CustomerBrandMaterialCode(BaseAbstractModel, ModelReferenceCodeMixin):
    customer_reference_code = models.CharField(max_length=500, null=True)
    material_definition = models.ForeignKey(GenericMaterial, on_delete=models.SET_NULL, null=True) # Legacy field - do not use this field
    customer_brand = models.ForeignKey(CustomerBrand, on_delete=models.SET_NULL, null=True)

    MODEL_REFERENCE_CODE_PREFIX = 'CMAT'
    CUSTOMER_BRAND_MATERIAL_CODE_KEY = 'reference_code'
    PK_CUSTOMER_BRAND_MATERIAL_CODE_KEY = 'customer_brand_material_code_id'
    MATERIAL_DEFINITION_ATTRIBUTES = 'material_definition_attributes'
    CUSTOMER_BRAND_ID = 'customer_brand_id'

    def get_attributes(self):
        attributes = {
            self.CUSTOMER_BRAND_MATERIAL_CODE_KEY: self.customer_reference_code,
            self.PK_CUSTOMER_BRAND_MATERIAL_CODE_KEY: self.pk,
            # self.MATERIAL_DEFINITION_ATTRIBUTES: self.material_definition.get_attributes(),
            self.CUSTOMER_BRAND_ID: self.customer_brand_id
        }
        return attributes
    
    def get_reference_code_postfix(self):
        return self.customer_reference_code


class CustomerBrandMaterial(BaseAbstractModel, ModelReferenceCodeMixin):
    material_detail = models.ForeignKey(GenericMaterialVariation, on_delete=models.CASCADE)
    material_code = models.ForeignKey(CustomerBrandMaterialCode, on_delete=models.CASCADE)
    marked_duplicate = models.BooleanField(default=False)
    attachments = models.ManyToManyField(FileAttachment, blank=True)

    PK_CUSTOMER_BRAND_MATERIAL_CODE_ID_KEY = 'customer_brand_material_id'
    VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY = 'ritz_customer_brand_reference_code'
    MODEL_REFERENCE_CODE_PREFIX = 'CB'
    ATTACHMENT_KEY = 'attachments'
    CUSTOMER_NAME = 'customer_name'

    @property
    def material_description(self):
        attributes = self.material_detail.generic_material.user_material.get_user_defined_material_fields()
        attribute_values = self.get_attributes()
        description = attribute_values.get('reference_code', '')
        size_dependant_fields = self.get_size_dependant_fields()
        for attribute in attributes:
            display_field = attribute.name + GenericMaterial.DROPDOWN_POSTFIX
            if attribute in size_dependant_fields:
                continue
            if display_field in attribute_values:
                display_value = attribute_values.get(display_field, None)
            else:
                display_value = attribute_values.get(attribute.name, None)
            if 'gsm' in display_field:
                description += ' ' + attribute.label + ' ' + str(display_value)
            elif display_value:
                description += ' ' + str(display_value)
        description = remove_dupplicate_words_from_string(description)
        return description
    
    def is_size_dependent(self):
        return self.material_detail.generic_material.user_material.size_dependent
    
    def get_size_dependant_fields(self):
        size_dependent_fields = self.material_detail.generic_material.user_material.get_size_dependent_fields()
        return size_dependent_fields
    
    def get_size_dependent_value(self):
        value = ''
        attributes = self.material_detail.generic_material.user_material.get_user_defined_material_fields()
        attribute_values = self.get_attributes()
        for attribute in attributes:
            display_field = attribute.name + GenericMaterial.DROPDOWN_POSTFIX
            if '_size_' in display_field:
                value = attribute_values.get(display_field, '') + ' '
        return value.strip()

    @cached_property
    def material_type(self):
        return self.material_detail.generic_material.user_material.name

    @property
    def material_label(self):
        return self.material_detail.generic_material.user_material.material

    @property
    def material_category(self):
        return self.material_detail.generic_material.user_material.category, self.material_detail.generic_material.user_material.get_category_display()

    @property
    def display_number(self):
        return f"CBMAT{self.id:06}"
    
    @property
    def reference_code(self):
        return f"CB{self.id:06}"

    @property
    def material_normalized_measuring_unit(self):
        mh = MaterialUnitHelper()
        consumption_measurement_unit = self.get_user_defined_material().consumption_measurement_unit
        normalized_unit = mh.get_normalized_unit_based_on_category(consumption_measurement_unit)
        return normalized_unit

    @cached_property
    def user_defined_material(self):
        material = self.get_user_defined_material()
        return material

    def get_user_defined_material(self):
        try:
            material = self.material_detail.generic_material.user_material
        except:
            material = None
        return material

    def get_or_create_material_size_variation(self, size):
        from materials.utils.eav_utils import filter_material_variation
        user_defined_material = self.get_user_defined_material()
        size_dependent_fields = user_defined_material.get_size_dependent_fields()
        variation_eav_data = self.material_detail.get_material_variation_eav_values()
        create_variation_eav_data = self.material_detail.get_material_variation_eav_values(False)

        for size_dependent_field in size_dependent_fields:
            size_option, created = UserDefinedDropDownOption.objects.get_or_create(value=size.pk, attribute=size_dependent_field)
            if created:
                size_option.display_value = size.name
                size_option.save()
            variation_eav_data[f'user_defined_material_data__{size_dependent_field.name}'] = size_option.pk
            create_variation_eav_data[f'{size_dependent_field.name}'] = size_option.pk
        matching_variations = filter_material_variation(
            self.material_detail.generic_material,
            variation_eav_data
        )

        if matching_variations.exists():
            variation_object = matching_variations.first()
        else:

            variation_object = GenericMaterialVariation.objects.create(
                generic_material=self.material_detail.generic_material,
                user_defined_material_data=create_variation_eav_data
            )

        new_object = CustomerBrandMaterial.objects.get_or_create(
            material_detail=variation_object,
            material_code=self.material_code
        )[0]
        return new_object


    def get_reference_code_postfix(self):
        ref_code = self.material_code.get_reference_code_postfix()
        material = self.material_detail.get_reference_code_postfix()
        return self.append_reference_code_postfix([ref_code, material])

    def get_version_estimated_quantity(self, version):
        pack_item_quantity, pack_item_quantity_units = OrderPackItemMaterialEstimatedQuantity(version=version, customer_brand_material=self).get_version_material_estimated_quantity()
        pack_quantity, pack_quantity_units = OrderPackMaterialEstimatedQuantity(version=version, customer_brand_material=self).get_version_material_estimated_quantity()
        total_quantity = None
        quantity_display = None
        estimated_units = pack_item_quantity_units or pack_quantity_units or 'Unknown'
        if pack_quantity != None:
            total_quantity = pack_quantity
        if pack_item_quantity != None:
            total_quantity = pack_item_quantity
        quantity_display = '%s %s' % (total_quantity, str(estimated_units))
        data = {'estimated_quantity': total_quantity, 'estimated_quantity_units': str(estimated_units), 'estimated_quantity_display': quantity_display}  # TODO - add costing units
        return data

    @cached_property
    def material_type(self):
        return self.material_detail.generic_material.user_material.name

    @property
    def material_category(self):
        return self.material_detail.generic_material.user_material.category
    
    @property
    def material_category_label(self):
        return self.material_detail.generic_material.user_material.get_category_display()

    def get_customer_brand_material_details(self):
        return self.get_attributes()
    
    def get_attachment_attributes(self):
        attachment_list = []
        if self.attachments:
            for attachment in self.attachments.all():
                attachment_list.append(attachment.get_object_data())
        return attachment_list

    def get_attributes(self):
        data = {
            self.PK_CUSTOMER_BRAND_MATERIAL_CODE_ID_KEY: self.pk,
            self.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY: self.verbose_reference_code,
            self.ATTACHMENT_KEY: self.get_attachment_attributes()
        }

        material_data = self.material_detail.get_attributes()
        code_data = self.material_code.get_attributes()
        material_variation_data = {
            **material_data,
            **data,
            **code_data
        }
        return material_variation_data


# class CustomerBrandMaterialSupplierCode(BaseAbstractModel):
#     customer_brand_material = models.ForeignKey(CustomerBrandMaterial, on_delete = models.SET_NULL, null = True)
#     supplier_material_reference_code = models.CharField(max_length=1000, null=True)


class SupplierInquiryMaterialCode(BaseAbstractModel):
    customer_brand_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.SET_NULL, null=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)
    supplier_material_reference_code = models.CharField(max_length=1000, null=True)
    # customer_brand_material_supplier_code = models.ForeignKey(CustomerBrandMaterialSupplierCode, on_delete=models.SET_NULL, null=True)

    SUPPLIER_MATERIAL_REFERENCE_CODE = 'supplier_material_reference_code'
    PK_SUPPLIER_MATERIAL_CODE_ID = 'pk_supplier_material_code_id'
    MATERIAL_SUPPLIER_KEY = 'material_supplier'
    MATERIAL_SUPPLIER_ID = 'material_supplier_id'

    def get_attributes(self):
        customer_brand_material_attributes = self.customer_brand_material.get_attributes()
        supplier_ref_code_attributes = {
            **customer_brand_material_attributes,
            self.SUPPLIER_MATERIAL_REFERENCE_CODE: self.supplier_material_reference_code,
            self.PK_SUPPLIER_MATERIAL_CODE_ID: self.pk,
            self.MATERIAL_SUPPLIER_KEY: self.supplier.name,
            self.MATERIAL_SUPPLIER_ID: self.supplier_id
        }
        return supplier_ref_code_attributes

    def materials_are_related(self, customer_brand_material_1, customer_brand_material_2):
        return customer_brand_material_1.material_code == customer_brand_material_2.material_code

    @staticmethod
    def get_supplier_material_instance(customer_brand_material, supplier, supplier_material_reference_code, create=False):
        object = SupplierInquiryMaterialCode.objects.filter(customer_brand_material=customer_brand_material, supplier=supplier, supplier_material_reference_code=supplier_material_reference_code).order_by('-id').first()
        if create and not object:
            object, created = SupplierInquiryMaterialCode.objects.get_or_create(customer_brand_material=customer_brand_material, supplier=supplier, supplier_material_reference_code=supplier_material_reference_code)
        return object

    def get_related_supplier_material_for_different_supplier_material(self, customer_brand_material, create=False):
        if not self.materials_are_related(self.customer_brand_material, customer_brand_material):
            create = False # If they dont have the same code. Then it cannot be copied, since it's 2 different materials.

        if self.customer_brand_material == customer_brand_material:
            object = self
        else:
            object = self.get_supplier_material_instance(customer_brand_material, self.supplier, self.supplier_material_reference_code, create)
        return object


SupplierCustomerBrandMaterial = SupplierInquiryMaterialCode # TODO later change the model name to this


class SupplierInquiry(BaseAbstractModel):
    hash_id = models.CharField(max_length=12, null=True)
    version = models.ForeignKey('marketing.OrderCostingVersion',on_delete=models.CASCADE, null=True)
    customer_brand_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE, null=True)
    item_service = models.ForeignKey('marketing.PackItemService', on_delete=models.CASCADE, null=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    has_supplier_feedback = models.BooleanField(default=False)

    QUEUED_EMAIL = 'queued_email'
    PENDING_EMAIL = 'pending_email'
    PENDING_RESPONSE = 'pending_response'
    RECEIVED_AND_PROCESSED = 'received_and_processed'
    RECEIVED_NEED_REVIEW = 'received_need_review'
    NOT_APPLICABLE = 'not_applicable'

    EMAIL_STATUS_CHOICES = (
        (QUEUED_EMAIL, 'Queued Email'),
        (PENDING_EMAIL, 'Pending Email'),
        (PENDING_RESPONSE, 'Pending Response'),
        (RECEIVED_AND_PROCESSED, 'Received and Processed'),
        (RECEIVED_NEED_REVIEW, 'Review Needed'),
        (NOT_APPLICABLE, 'Not Applicable'),
    )

    email_status = models.CharField(choices=EMAIL_STATUS_CHOICES, max_length=100, default=PENDING_EMAIL)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)
    total_requested_quantity = models.FloatField(null=True)


    # These keys are used to build headers
    ORDER_KEY = 'order'
    SELECTED_KEY = 'selected'
    SUPPLIER_KEY = 'supplier'
    SUPPLIER_ID_KEY = 'supplier_id'
    UNIT_KEY = 'DROPDOWN_OPTIONS_KEY'
    UNIT_ID_KEY = 'unit_id'
    COST_PER_UNIT_KEY = 'cost_per_unit'
    COSTING_UNIT_KEY = 'costing_unit'
    COSTING_UNIT_DISPLAY_KEY = 'costing_unit_display'
    FOB_PRICE_KEY = 'fob_price'
    CIF_PRICE_KEY = 'cif_price'
    EXWORK_PRICE_KEY = 'ex_work_price'
    EX_WORK_PRICE_KEY = 'ex_work_price'
    TRANSPORT_CHARGE_KEY = 'transport_charges'
    TOTAL_KEY = 'total'
    HAS_SUPPLIER_FEEDBACK_KEY = 'has_supplier_feedback'
    CUSTOMER_BRAND_MATERIAL_KEY = 'customer_brand_material'
    CUSTOMER_BRAND_MATERIAL_ID_KEY = 'customer_brand_material_id'
    SHIP_MODE_KEY = 'ship_mode'
    PAY_MODE_KEY = 'pay_mode'
    EXPIRATION_DATE_KEY = 'expiration_date'
    PACK_ITEM_SERVICE_ID = 'pack_item_service_id'
    EXCESS_THRESHOLD_KEY = 'excess_threshold'
    SUPPLIER_INQUIRY_MATERIAL_CODE_KEY = 'supplier_inquiry_material_code'
    COST_PER_UNIT_TYPE_KEY = 'cost_per_unit_type'
    SHIP_MODE_KEY = 'ship_mode'

    # TENTATIVE_MATERIAL_IN_HOUSE_DATE_KEY = 'tentative_material_in_house_date'
    LEAD_TIME_KEY = 'lead_time'
    field_mapping = {
        'consumption': "Consumption",
        'wastage': "Wastage",
        EXPIRATION_DATE_KEY: "Expiration Date",
        # TENTATIVE_MATERIAL_IN_HOUSE_DATE_KEY: "Tentative Material In House Date",
        FOB_PRICE_KEY: "FOB Price",
        COST_PER_UNIT_KEY: "Cost Per Unit",
        CIF_PRICE_KEY: "CIF Price",
        TRANSPORT_CHARGE_KEY: "Transport Charge",
        TOTAL_KEY: "Total",
        SHIP_MODE_KEY: "Ship Mode",
        PAY_MODE_KEY: "Pay Mode",
        LEAD_TIME_KEY: "Lead Time in Number of Days",
        SUPPLIER_INQUIRY_MATERIAL_CODE_KEY: 'Supplier Material Reference Code',
        EXCESS_THRESHOLD_KEY: 'Excess Threshold'
    }

    MATERIAL_INQUIRY_TYPE = 'material_inquiry'
    SERVICE_INQUIRY_TYPE = 'service_inquiry'

    @property
    def display_number(self):
        return f"SUPINQ{self.id:06}"

    def get_inquiry_material_type(self):
        material_type = None
        if self.customer_brand_material and self.customer_brand_material.material_type:
            material_type = self.customer_brand_material.material_type
        return material_type

    def inquiry_type(self):
        inquiry_type = self.SERVICE_INQUIRY_TYPE
        if self.customer_brand_material.material_type:
            inquiry_type = self.MATERIAL_INQUIRY_TYPE
        return inquiry_type
    
    def get_lists_of_validation_for_excel(self):
        validation_list = {}
        choice_list = {
            self.SHIP_MODE_KEY: SupplierInquiryDetail.SHIP_MODE_CHOICES,
            self.PAY_MODE_KEY: PAYMENT_METHOD_TYPES,
            'cutting_width_unit': MaterialUnitHelper.ALL_MEASURING_UNITS,
            self.COSTING_UNIT_KEY: PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS,
            'minimum_order_quantity_units': MaterialUnitHelper.ALL_MEASURING_UNITS,
        }
        for choice in choice_list:
            for element in choice_list[choice]:
                if not choice in validation_list:
                    validation_list[choice] = '"' + element[1]
                else:
                    validation_list[choice] = validation_list[choice] + ',' + element[1]
            if choice in validation_list:
                validation_list[choice] = validation_list[choice] + '"'

        return validation_list, choice_list
    @staticmethod
    def get_order_supplier_inquiries(order):
        inquiries = SupplierInquiry.objects.filter(order=order, customer_brand_material__generic_material__user_material__name=FABRIC_TRIM_TYPES)
        return inquiries


class SupplierInquiryDetail(BaseAbstractModel):
    supplier_inquiry = models.ForeignKey(SupplierInquiry, on_delete=models.CASCADE)
    cutting_width = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    cutting_width_unit = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    selected = models.BooleanField(default=False)
    costing_unit = models.CharField(max_length=200, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    cost_per_unit = models.DecimalField(max_digits=20, decimal_places=6, default=None, blank=True, null=True)
    fob_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    cif_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    transport_charges = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    ex_work_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    expiration_date = models.DateField(null=True, blank=True)
    # tentative_material_in_house_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    lead_time = models.IntegerField(null=True, blank = True)
    minimum_order_quantity = models.FloatField(null = True)
    minimum_order_quantity_units = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    supplier_inquiry_material_code = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE, null=True)
    excess_threshold = models.FloatField(null=True)
    
    # These are used to build headers for front end
    CUTTING_WIDTH_KEY = 'cutting_width'
    CUTTING_WIDTH_UNITS_KEY = 'cutting_width_unit'
    CUTTING_WIDTH_UNITS_DISPLAY_KEY = 'cutting_width_unit' + GenericMaterial.DROPDOWN_POSTFIX

    SHIP_MODE_CHOICES = SHIPPING_MODE_TYPES
    SEA_CHOICE = SEA_TRANSPORT_METHOD
    ship_mode = models.CharField(
        max_length=100, choices=SHIP_MODE_CHOICES, default=SEA_TRANSPORT_METHOD)

    # CREDIT = 'credit'
    # CHEQUE = 'cheque'
    # PAY_MODE_CHOICES = (
    #     (CREDIT, 'Credit'),
    #     (CHEQUE, 'Cheque')
    # )
    pay_mode = models.CharField(max_length=200, choices=PAYMENT_METHOD_TYPES, null=True)
    cost_per_unit_type = models.CharField(max_length=200, choices=COSTING_MODE_TYPES, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    @staticmethod
    def get_headers():
        from materials.fieldmetadata.material_metadata import get_supplier_inquiry_headers
        headers = get_supplier_inquiry_headers()
        return headers
    
    @staticmethod
    def get_detail_headers():
        from materials.fieldmetadata.material_metadata import get_supplier_inquiry_detail_headers
        detail_headers = get_supplier_inquiry_detail_headers()
        return detail_headers

    def get_attributes(self):
        inquiry = self
        data = {
            'supplier_inquiry_id': inquiry.supplier_inquiry_id,
            'supplier_inquiry_detail_id': inquiry.pk,
            SupplierInquiry.SUPPLIER_KEY: inquiry.supplier_inquiry.supplier.name,
            SupplierInquiry.COSTING_UNIT_KEY: inquiry.costing_unit,
            SupplierInquiry.COSTING_UNIT_DISPLAY_KEY: inquiry.get_costing_unit_display(),
            SupplierInquiry.COST_PER_UNIT_KEY: inquiry.cost_per_unit,
            SupplierInquiry.FOB_PRICE_KEY: inquiry.fob_price,
            SupplierInquiry.CIF_PRICE_KEY: inquiry.cif_price,
            SupplierInquiry.EX_WORK_PRICE_KEY: inquiry.ex_work_price,
            SupplierInquiry.TRANSPORT_CHARGE_KEY: inquiry.transport_charges,
            SupplierInquiry.EXPIRATION_DATE_KEY: inquiry.expiration_date,
            SupplierInquiry.LEAD_TIME_KEY: inquiry.lead_time,
            # SupplierInquiry.TENTATIVE_MATERIAL_IN_HOUSE_DATE_KEY: inquiry.tentative_material_in_house_date,
            self.CUTTING_WIDTH_KEY: inquiry.cutting_width,
            self.CUTTING_WIDTH_UNITS_KEY: inquiry.cutting_width_unit,
            self.CUTTING_WIDTH_UNITS_DISPLAY_KEY: inquiry.get_cutting_width_unit_display(),
            SupplierInquiry.EXCESS_THRESHOLD_KEY: inquiry.excess_threshold,
            SupplierInquiry.SUPPLIER_INQUIRY_MATERIAL_CODE_KEY: inquiry.supplier_inquiry_material_code.supplier_material_reference_code if inquiry.supplier_inquiry_material_code else None,
            SupplierInquiry.COST_PER_UNIT_TYPE_KEY: inquiry.cost_per_unit_type,
            SupplierInquiry.SHIP_MODE_KEY: inquiry.ship_mode
        }

        if inquiry.supplier_inquiry.inquiry_type == SupplierInquiry.MATERIAL_INQUIRY_TYPE:
            data[CustomerBrandMaterial.PK_CUSTOMER_BRAND_MATERIAL_CODE_ID_KEY] = inquiry.supplier_inquiry.customer_brand_material_id
        else:
            data[SupplierInquiry.PACK_ITEM_SERVICE_ID] = inquiry.supplier_inquiry.item_service_id
        return data


class SupplierInquiryEmail(BaseAbstractModel):
    supplier_inquiry = models.ManyToManyField(SupplierInquiry)
    email = models.ForeignKey(Email, on_delete=models.CASCADE)


class EmbellishmentType(BaseAbstractModel):
    name = models.CharField(max_length=300)


class EmbellishmentSubType(BaseAbstractModel):
    embellishment_type = models.ForeignKey(EmbellishmentType, on_delete=models.CASCADE)
    name = models.CharField(max_length=300)


class UserDefinedMaterialDefect(BaseAbstractModel):
    defect = models.TextField(null=True)
    material = models.ForeignKey(UserDefinedMaterial, on_delete=models.CASCADE)


class FabricColorTone(BaseAbstractModel):
    RED_TONE = 'red'
    BLUE_TONE = 'blue'
    YELLOW_TONE = 'yellow'
    GREEN_TONE = 'green'
    
    COLOR_TONE_CHOICES = (
        (RED_TONE, 'Red'),
        (BLUE_TONE, 'Blue'),
        (YELLOW_TONE, 'Yellow'),
        (GREEN_TONE, 'Green'),
    )
    color_1 = models.CharField(max_length=100)
    color_2 = models.CharField(max_length=100)
    
    @property
    def display_value(self):
        display_value =  '%s - %s ' % (self.color_1, self.color_2)
        return display_value
    

class InHouseMaterialVerification(BaseAbstractModel):
    PENDING_STATE = 'pending'
    IN_PROGRESS_STATE = 'in_progress'
    COMPLETE_STATE = 'complete'
    CANCELED_STATE = 'canceled'

    STATE_CHOICES = (
        (PENDING_STATE, 'Pending'),
        (IN_PROGRESS_STATE, 'IN Progress'),
        (COMPLETE_STATE, 'Complete'),
        (CANCELED_STATE, 'Canceled'),
    )

    state = models.CharField(max_length=200, choices=STATE_CHOICES, default=PENDING_STATE)
    warehouse = models.ForeignKey('shared.PlantWarehouse', on_delete=models.SET_NULL, null=True)

    TRANSFER_MATERIAL_VERIFICATION = 'Transfer Material Verification'
    PO_CLUB_MATERIAL_LEFT_OVER_MATERIAL_VERIFICATION = 'PO Club Leftover Material Verification'

    @property
    def display_number(self):
        return f"INHOUSERVER{self.id:06}"

    def get_verified_materials(self):
        materials = self.inhousematerialverificationmaterial_set.all()
        return materials

    def move_to_next_state(self, new_state):
        self.state = new_state
        self.save()

        if new_state == self.COMPLETE_STATE:
            self.allocate_material()
        return True

    def update_inhouse_material_available_quantity(self):
        verified_materials = self.get_verified_materials()
        for verified_material in verified_materials:
            in_house_material = verified_material.inhouse_material
            in_house_material.available_quantity = verified_material.usable_quantity
            in_house_material.available_quantity_units = verified_material.usable_quantity_units
            in_house_material.save()

    def allocate_material(self):
        self.update_inhouse_material_available_quantity()
        from marketing.models import PurchaseOrderBom
        verified_materials = self.get_verified_materials()

        for verified_material in verified_materials:
            assigned_customer_brand_material = verified_material.inhouse_material.customer_brand_material
            po_club = verified_material.attached_po_club
            purchase_orders = po_club.get_purchase_orders().order_by('id')
            in_house_material = verified_material.inhouse_material

            for purchase_order in purchase_orders:
                po_boms = purchase_order.get_material_purchase_order_boms(assigned_customer_brand_material)
                for po_bom in po_boms:
                    in_house_material.allocate_in_house_material_to_purchase_order_bom(po_bom.quantity, po_bom.measuring_unit, po_bom)
                    in_house_material.refresh_from_db()

                    if in_house_material.available_quantity <= 0:
                        break
                if in_house_material.available_quantity <= 0:
                    break

    def get_entity(self):
        entity = None
        in_house_material_verification_materials = self.inhousematerialverificationmaterial_set.all()
        if in_house_material_verification_materials:
            entity = in_house_material_verification_materials[0].referance_material
        return entity

    @property
    def warehouse_material_transfer(self):
        return self.get_entity().warehouse_material_transfer if isinstance(self.get_entity(), WarehouseMaterialTransferDetail) else None
    
    @property
    def po_club_left_over_material(self):
        from marketing.models import POClubLeftOverMaterial
        return self.get_entity() if isinstance(self.get_entity(), POClubLeftOverMaterial) else None
    
    @property
    def verification_type(self):       
        verification_type = None
        if self.warehouse_material_transfer:
            verification_type = self.TRANSFER_MATERIAL_VERIFICATION
        elif self.po_club_left_over_material:
            verification_type = self.PO_CLUB_MATERIAL_LEFT_OVER_MATERIAL_VERIFICATION
        return verification_type
    
    @property
    def frontend_url(self):
        from shared.constants.frontend_urls import TRANSFER_MATERIAL_VERIFICATION_URL, PO_CLUB_MATERIAL_LEFTOVER_VERIFICATION_URL
        frontend_url = None
        if self.verification_type == self.TRANSFER_MATERIAL_VERIFICATION:
            frontend_url  = TRANSFER_MATERIAL_VERIFICATION_URL + str(self.warehouse_material_transfer.id)
        elif self.verification_type == self.PO_CLUB_MATERIAL_LEFT_OVER_MATERIAL_VERIFICATION:
            frontend_url = PO_CLUB_MATERIAL_LEFTOVER_VERIFICATION_URL
        return frontend_url


class InHouseMaterialVerificationMaterial(BaseAbstractModel):
    inhouse_material_verification = models.ForeignKey(InHouseMaterialVerification, on_delete=models.CASCADE)
    # entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    # entity_id = models.PositiveIntegerField()
    # entity = GenericForeignKey('entity_type', 'entity_id')
    inhouse_material = models.ForeignKey('shared.InHouseMaterial', on_delete=models.CASCADE)
    available_quantity = models.FloatField(null=True)
    available_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    usable_quantity = models.FloatField(null=True)
    usable_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    #po_leftover_material = models.ForeignKey('marketing.POClubLeftOverMaterial', on_delete=models.SET_NULL, null=True) #TODO generic field (referance_material)
    referance_material_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    referance_material_id = models.PositiveIntegerField()
    referance_material  = GenericForeignKey('referance_material_type', 'referance_material_id')
    shade = models.ForeignKey('marketing.POClubShade', on_delete=models.SET_NULL, null=True)
    color_tone = models.ForeignKey(FabricColorTone, on_delete=models.SET_NULL, null=True)

    @property
    def display_number(self):
        return f"INHOUSERVERMAT{self.id:06}"

    @property
    def attached_po_club(self):
        return self.inhouse_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club


class WarehouseMaterialTransfer(BaseAbstractModel):
    entity_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True)
    entity_id = models.PositiveIntegerField(null=True)
    entity = GenericForeignKey('entity_type', 'entity_id')

    FULL_TRANSFER_TYPE = 'full'
    PARTIAL_TRANSFER_TYPE = 'partial'
    PO_TRANSFER_TYPE = 'po_transfer'
    WITHIN_COSTING_TRANSFER = 'within_costing_transfer'
    MATERIAL_TRANSFER = 'material_transfer'

    TRANSFER_TYPE_CHOICES = (
        (FULL_TRANSFER_TYPE, 'Full'),
        (PARTIAL_TRANSFER_TYPE, 'Partial'),
        (PO_TRANSFER_TYPE, 'Purchase Order Transfer'),
        (WITHIN_COSTING_TRANSFER, 'Within Costing Transfer'),
        (MATERIAL_TRANSFER, 'Material Transfer')
    )
    transfer_type = models.CharField(max_length=200, choices=TRANSFER_TYPE_CHOICES, default=FULL_TRANSFER_TYPE)

    PENDING_STATE = 'draft'
    TRNASFER_IN_PROGRESS_STATE = 'transfer_in_progress'
    COMPLETE_STATE = 'complete'
    CANCELED_STATE = 'canceled'

    STATE_CHOICES = (
        (PENDING_STATE, 'Draft'),
        (TRNASFER_IN_PROGRESS_STATE, 'Transfer in Progress'),
        (COMPLETE_STATE, 'Complete'),
        (CANCELED_STATE, 'Canceled'),
    )
    state = models.CharField(max_length=200, choices=STATE_CHOICES, default=PENDING_STATE)
    transfer_warehouse = models.ForeignKey('shared.PlantWarehouse', on_delete=models.SET_NULL, null=True)
    material_verification_started = models.BooleanField(default=False)

    @property
    def display_number(self):
        return f"MATTRANSFER{self.id:06}"

    def get_transfer_materials(self):
        return self.warehousematerialtransferdetail_set.all()
    
    @property
    def actual_po_club(self):
        from marketing.models import ActualPOClub
        actual_po_club = None
        actual_po_club_ct = ContentType.objects.get_for_model(ActualPOClub)
        if self.entity_type == actual_po_club_ct:
            actual_po_club = get_object_or_404(ActualPOClub, pk=self.entity_id)
        return actual_po_club
    
    def get_in_house_material_verifications(self):
        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)
        warehouse_material_transfer_detail_ids = self.get_transfer_materials().values_list('id', flat=True)
        in_house_material_verifications = InHouseMaterialVerification.objects.filter(
            id__in=InHouseMaterialVerificationMaterial.objects.filter(
                referance_material_type=warehouse_material_transfer_detail_ct,
                referance_material_id__in=warehouse_material_transfer_detail_ids,
            ).values_list('inhouse_material_verification', flat=True)
        )
        return in_house_material_verifications
    
    def process_leftover_material_verifications(self):
        transfer_materials = self.get_transfer_materials()
        grouped_by_supplier = {}

        for transfer_material in transfer_materials:
            supplier_po_grn_material = transfer_material.in_house_material.grn_material_detail.supplier_po_grn_material
            if supplier_po_grn_material not in grouped_by_supplier:
                grouped_by_supplier[supplier_po_grn_material] = []
            grouped_by_supplier[supplier_po_grn_material].append(transfer_material)

        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)

        for group in grouped_by_supplier.values():
            inhouse_material_verification = InHouseMaterialVerification.objects.create(
                state=InHouseMaterialVerification.PENDING_STATE,
            )

            for transfer_material in group:
                inhouse_material_verification_material, created = InHouseMaterialVerificationMaterial.objects.get_or_create(
                    inhouse_material_verification=inhouse_material_verification,
                    inhouse_material=transfer_material.in_house_material,
                    referance_material_type=warehouse_material_transfer_detail_ct,
                    referance_material_id=transfer_material.id,
                )
                inhouse_material_verification_material.shade = None
                inhouse_material_verification_material.available_quantity = transfer_material.in_house_material.available_quantity
                inhouse_material_verification_material.available_quantity_units = transfer_material.in_house_material.available_quantity_units
                inhouse_material_verification_material.usable_quantity = transfer_material.in_house_material.quantity
                inhouse_material_verification_material.usable_quantity_units = transfer_material.in_house_material.quantity_units
                inhouse_material_verification_material.save()
        self.material_verification_started = True
        self.save()
    
    def move_to_next_state(self, new_state):
        state_transition_errors = []
        response = {}
        if new_state == self.PENDING_STATE and self.state not in [self.PENDING_STATE]:
            self.state = self.PENDING_STATE
        elif new_state == self.TRNASFER_IN_PROGRESS_STATE:
            self.state = self.TRNASFER_IN_PROGRESS_STATE
            if not self.material_verification_started:
                self.process_leftover_material_verifications()
        elif new_state == self.COMPLETE_STATE:
            if self.get_in_house_material_verifications().filter(state__in=[InHouseMaterialVerification.PENDING_STATE, InHouseMaterialVerification.IN_PROGRESS_STATE]).exists():
                state_transition_errors.append('Material verification pending/inprogress recorder found.')
            else:
                self.state = self.COMPLETE_STATE
        elif new_state == self.CANCELED_STATE:
            self.state = self.CANCELED_STATE
            #TODO cancel all material transfer
        else:
            state_transition_errors.append('Invalid state.')

        if state_transition_errors:
            response = {'valid': False,  'errors': state_transition_errors}
        else:
            response = {'valid': True}
            self.save()
        return response


class WarehouseMaterialTransferDetail(BaseAbstractModel):
    warehouse_material_transfer = models.ForeignKey(WarehouseMaterialTransfer, on_delete=models.CASCADE)
    in_house_material = models.ForeignKey('shared.InHouseMaterial', on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    previous_shade = models.ForeignKey('marketing.POClubShade', on_delete=models.SET, null=True)
    previous_color_tone = models.ForeignKey(FabricColorTone, on_delete=models.DO_NOTHING, null=True)
    previous_quantity = models.FloatField(null=True)
    previous_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    full_quantity = models.BooleanField(default=True)


class PartialDeliveryTransferPackQuantity(BaseAbstractModel):
    warehouse_material_transfer = models.ForeignKey(WarehouseMaterialTransfer, on_delete=models.CASCADE)
    po_pack = models.ForeignKey('marketing.POPack', on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ('warehouse_material_transfer', 'po_pack'),
                name = 'unique_warehouse_material_transfer_and_po_pack'
            )
        ]