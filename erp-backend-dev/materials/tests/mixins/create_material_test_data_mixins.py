import random
import uuid

from django.core.exceptions import ObjectDoesNotExist
from model_bakery import baker

from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper, PerMeasuringUnitHelper
from materials.forms.form_factory import UserDefinedMaterialFormFactory
from materials.models import UserDefinedMaterial, Material, SEWING_TRIM_TYPES, UserDefinedMaterialAttribute, \
    UserDefinedDropDownOption, SupplierInquiryDetail, CustomerBrandMaterial, SupplierInquiryMaterialCode
from materials.scripts.create_user_defined_materials import create_fabric, create_button_popper_eav, create_elastic_eav


class MaterialTestDataMixin:

    def get_or_create_fabric_user_defined_material(self):
        fabric_material = Material.FABRIC_MATERIAL
        try:
            material = UserDefinedMaterial.objects.get(category=fabric_material)
        except ObjectDoesNotExist:
            material = create_fabric()
        return material

    def get_or_create_button_user_defined_material(self):
        button_material = 'button'
        try:
            material = UserDefinedMaterial.objects.get(name=button_material)
        except ObjectDoesNotExist:
            material = create_button_popper_eav()
        return material

    def get_or_create_elastic_user_defined_material(self):
        try:
            material = UserDefinedMaterial.objects.get(name='elastic')
        except ObjectDoesNotExist:
            material = create_elastic_eav()
        return material

    def create_customer_brand_material_object(self, order, user_defined_material, **kwargs):
        material_attributes = user_defined_material.userdefinedmaterialattribute_set.all()
        for material_attribute in material_attributes:
            if kwargs.get(material_attribute.name, None) == None:
                value = None
                if material_attribute.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
                    drop_down_option = baker.make('materials.UserDefinedDropDownOption', attribute=material_attribute)
                    value = drop_down_option.pk
                elif material_attribute.attribute_type == UserDefinedMaterialAttribute.DECIMAL_ATTRIBUTE:
                    value = float(random.randint(10, 1000))
                elif material_attribute.attribute_type == UserDefinedMaterialAttribute.CHARACTER_ATTRIBUTE:
                    value = uuid.uuid4().hex.upper()[0:6]
                elif material_attribute.attribute_type == UserDefinedMaterialAttribute.BOOLEAN_ATTRIBUTE:
                    value = random.randint(0, 1) == 1
                elif material_attribute.attribute_type == UserDefinedMaterialAttribute.INTEGER_ATTRIBUTE:
                    value = random.randint(10, 1000)

                if value != None:
                    kwargs[material_attribute.name] = value

        if kwargs.get('reference_code', None) == None:
            kwargs['reference_code'] = uuid.uuid4().hex.upper()[0:6]


        form = UserDefinedMaterialFormFactory(order=order, material=user_defined_material, data=kwargs)
        if form.is_valid():
            errors, added_material = form.get_or_create_object(user_defined_material.name)
        else:
            raise Exception("INVALID DATA in create_customer_brand_material_object function")

        return added_material

    def create_costing_supplier_inquiry_detail(self, costing, customer_brand_material, supplier, **supplier_inquiry_detail_kwargs):
        supplier_inquiry_data = {
            'version': costing,
            'customer_brand_material': customer_brand_material,
            'supplier': supplier,
        }
        supplier_inquiry = baker.make('materials.SupplierInquiry', **supplier_inquiry_data)
        ud_material = customer_brand_material.user_defined_material

        costing_unit = PerMeasuringUnitHelper.PER_PIECE_UNIT
        if ud_material.consumption_measurement_unit == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION:
            costing_unit = PerMeasuringUnitHelper.PER_METER_UNIT

        supplier_inquiry_material_code = SupplierInquiryMaterialCode.objects.get_or_create(supplier=supplier, customer_brand_material=customer_brand_material, supplier_material_reference_code=uuid.uuid4().hex.upper()[0:6])[0]

        supplier_inquiry_detail_data = {
            'supplier_inquiry': supplier_inquiry,
            'cutting_width': 2,
            'cutting_width_unit': MaterialUnitHelper.METERS_UNIT,
            'selected': True,
            'costing_unit': costing_unit,
            'cost_per_unit': random.randint(1,4),
            'completed': True,
            'excess_threshold': 5,
            'supplier_inquiry_material_code': supplier_inquiry_material_code
        }

        supplier_inquiry_detail_data = { ** supplier_inquiry_detail_data, **supplier_inquiry_detail_kwargs }
        supplier_inquiry_detail = baker.make('materials.SupplierInquiryDetail', **supplier_inquiry_detail_data)
        return supplier_inquiry_detail




