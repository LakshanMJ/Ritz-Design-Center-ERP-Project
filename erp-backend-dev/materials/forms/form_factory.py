from django import forms
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Q

from materials.models import UserDefinedMaterialAttribute, UserDefinedMaterial, UserDefinedDropDownOption, \
    CustomerBrandMaterialCode, GenericMaterial, GenericMaterialVariation, CustomerBrandMaterial
from shared.models import CustomerBrand
from shared.utils import get_object_or_none


class UserDefinedMaterialFormFactory(forms.Form):
    other_errors = []

    def __init__(self, *args, **kwargs):
        self.other_errors = []
        self.material = kwargs.pop('material')
        self.order = kwargs.pop('order', None)
        self.fields_qs = self.material.get_user_defined_material_fields()

        self.drop_down_fields = []
        super().__init__(*args, **kwargs)

        for field in self.fields_qs:
            attribute_type = field.attribute_type
            if attribute_type == UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE:
                self.fields[field.name] = forms.FloatField(required=field.mandatory) # TODO - add whether required or not (add for all fields)
            elif attribute_type == UserDefinedMaterialAttribute.INTEGER_ATTRIBUTE:
                self.fields[field.name] = forms.IntegerField(required=field.mandatory)
            elif attribute_type == UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE:
                self.fields[field.name] = forms.CharField(required=field.mandatory)
            elif attribute_type == UserDefinedMaterialAttribute.BOOLEAN_ATTRIBUTE:
                self.fields[field.name] = forms.BooleanField(required=field.mandatory)
            elif attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
                self.fields[field.name] = forms.IntegerField(required=field.mandatory)
                self.drop_down_fields.append(field.name)
            self.fields[CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY] = forms.CharField(required=False)

    def get_customer_brand(self):
        return CustomerBrand.objects.get_or_create(customer=self.order.customer, brand=self.order.brand)[0]

    def get_customer_brand_generic_material_code(self):
        customer_brand =self.get_customer_brand()
        customer_reference_code = self.data.get(CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY, None).strip()
        ref_code_material = None
        try:
            ref_code_material = CustomerBrandMaterialCode.objects.get(
                customer_reference_code__iexact=customer_reference_code,
                customer_brand=customer_brand,
                material_definition__user_material=self.material
            )
        except ObjectDoesNotExist:
            pass
        return ref_code_material

    def get_fields_from_post_data(self, fields_qs, include_json_field_name):
        material_eav_dict = {}

        for field in fields_qs:
            field_name = field.name
            if include_json_field_name:
                field_name = 'user_defined_material_data__' + field.name
            material_eav_dict[field_name] = self.data.get(field.name, '')
        return material_eav_dict

    def get_material_fields_from_post_data(self, include_json_field_name=True):
        fields = self.material.get_material_fields_excluding_variation_fields().filter(is_material_variation=False)
        return self.get_fields_from_post_data(fields, include_json_field_name)

    def get_material_variation_fields_from_post_data(self, include_json_field_name=True):
        fields = self.material.get_material_variation_fields().filter(is_material_variation=True)
        return self.get_fields_from_post_data(fields, include_json_field_name)

    def material_exists_with_another_ref_code(self):
        # generic_material = self.get_generic_material()
        # customer_brand = self.get_customer_brand()
        material_exists = False
        # if generic_material:
        #     data_ref_code = self.data.get(CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY, None)
        #     material_exists = CustomerBrandMaterialCode.objects.filter(
        #         material_definition=generic_material,
        #         customer_brand=customer_brand,
        #         customer_reference_code__isnull=False
        #     ).exclude(Q(customer_reference_code=data_ref_code) | Q(customer_reference_code__isnull=True) | Q(customer_reference_code='')).exists()
        return material_exists

    def validate_material_reference_code(self):
        valid = True
        # ref_code_material = self.get_customer_brand_generic_material_code()
        #
        # if ref_code_material:
        #     ref_code_material_attributes = ref_code_material.get_attributes()[CustomerBrandMaterialCode.MATERIAL_DEFINITION_ATTRIBUTES]
        #     material_fields = self.material.get_material_fields_excluding_variation_fields()
        #     for material_field in material_fields:
        #         current_value = str(ref_code_material_attributes.get(material_field.name, '')).strip()
        #         post_value = str(self.data.get(material_field.name, '')).strip()
        #         if str(current_value).lower() != str(post_value).lower():
        #             valid = False
        #             break
        return valid

    def clean(self):
        cleaned_data = super().clean()

        for field in self.drop_down_fields:
            input_value = cleaned_data.get(field, None)
            if input_value:
                options = UserDefinedDropDownOption.objects.filter(pk=input_value, attribute__name=field)

                if options.count() == 0:
                    self.add_error(field, ValidationError("Select a valid choice"))

        customer_reference_code = self.data.get(CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY, None)

        if customer_reference_code:

            if not self.validate_material_reference_code():
                self.add_error('', ValidationError("A material with the matching reference code already exists in the system that doesn't match the entered attributes"))
            elif self.material_exists_with_another_ref_code():
                self.add_error('', ValidationError("The material specified exists with another reference code. Please check the reference code and material details"))

    def get_generic_material(self):
        filter_query = {}
        material_eav_dict = self.get_material_fields_from_post_data()
        for key, value in material_eav_dict.items():
            field = str(key) + '__iexact'
            filter_query[field] = str(value).strip()

        generic_material = GenericMaterial.objects.filter(**filter_query, user_material=self.material).order_by('id')
        generic_material_object = None
        if generic_material.exists():
            generic_material_object = generic_material.first()
        return generic_material_object

    def get_material_variation(self, generic_material):
        filter_query = {}
        material_eav_dict = self.get_material_variation_fields_from_post_data()

        for key, value in material_eav_dict.items():
            field = str(key) + '__iexact'
            filter_query[field] = str(value).strip()
        generic_material_variation = GenericMaterialVariation.objects.filter(**filter_query, generic_material=generic_material).order_by('id')
        variation_object = None
        if generic_material_variation.exists():
            variation_object = generic_material_variation.first()
        return variation_object
    
    def get_attachment_ids(self, attachment_list):
        attachment_ids = []
        for row in attachment_list:
            attachment_id = row['id']
            attachment_ids.append(attachment_id)
        return attachment_ids

    def get_or_create_object(self, material_type):
        attachment_ids = self.get_attachment_ids(self.data.get('attachments', {})) 
        self.data = self.cleaned_data
        errors = {}
        customer_brand = self.get_customer_brand()
        material_data = self.get_material_fields_from_post_data(False)
        variation_data = self.get_material_variation_fields_from_post_data(False)
        customer_reference_code = self.data.get(CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY, '').strip()

        generic_material = self.get_generic_material()
        if not generic_material:
            generic_material = GenericMaterial.objects.create(user_material=self.material, user_defined_material_data=material_data)
        material_variation = self.get_material_variation(generic_material)
        if not material_variation:
            material_variation = GenericMaterialVariation.objects.create(generic_material=generic_material, user_defined_material_data=variation_data)

        try:
            customer_reference_code_filter = {'customer_reference_code__iexact': customer_reference_code}
            if not customer_reference_code:
                customer_reference_code_filter = {'customer_reference_code': None}

            material_code = CustomerBrandMaterialCode.objects.get(
                **customer_reference_code_filter,
                # material_definition=generic_material,
                customer_brand=customer_brand
            )

            if not material_code.customer_reference_code and customer_reference_code:
                material_code.customer_reference_code = customer_reference_code
                material_code.save()

        except ObjectDoesNotExist:
            material_code = CustomerBrandMaterialCode.objects.create(
                customer_reference_code=customer_reference_code,
                # material_definition=generic_material,
                customer_brand=customer_brand
            )
        material_variation = CustomerBrandMaterial.objects.get_or_create(material_detail=material_variation, material_code=material_code)[0]
        material_variation.attachments.add(*attachment_ids)
        remove_attachments = material_variation.attachments.exclude(id__in=attachment_ids).values_list('id', flat=True)
        material_variation.attachments.remove(*remove_attachments)

        return errors, material_variation
