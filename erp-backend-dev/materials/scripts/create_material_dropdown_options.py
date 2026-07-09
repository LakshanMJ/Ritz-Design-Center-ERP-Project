from django.conf import settings
from materials.models import UserDefinedMaterialAttribute, UserDefinedDropDownOption
import os, json, re
from django.conf import settings
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper

class UserDefineMaterialDropdownOptionMetaData:

    def create_material_dropdown_options(self):
        self.create_fabric_material_dropdown_options()
        self.create_user_defined_material_attribute_measurement_units_dropdown_options()

    def simplify_string(self, string):
        string = string.replace(' ', '_')
        string = re.sub(r'[^a-zA-Z0-9_%]', '', string)
        string = re.sub(r'_+', '_', string)
        string = string.strip('_')
        string = string.lower()
        return string

    def read_fabric_material_dropdown_options_from_file(self):
        file_path = os.path.join(settings.BASE_DIR, 'materials', 'data_files', 'material_dropdown_data.json')
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data

    def create_fabric_material_dropdown_options(self):
        data = self.read_fabric_material_dropdown_options_from_file()
        for row in data:
            material = row['material']
            display_value = row['display_value']
            attribute_id = row['attribute_id']
            value = self.simplify_string(display_value)
            machine_type, created = UserDefinedDropDownOption.objects.get_or_create(
                display_value=display_value,
                attribute_id=attribute_id,
                value=value
            )

    def get_units(self):
        data = []
        for value, display_value in MaterialUnitHelper().get_length_measuring_units():
            data.append({'value': value, 'display_value': display_value})

        for value, display_value in MaterialUnitHelper().get_piece_units():
            data.append({'value': value, 'display_value': display_value})
        return data
    
    def create_user_defined_material_attribute_measurement_units_dropdown_options(self):
        units = self.get_units()
        attributes = UserDefinedMaterialAttribute.objects.filter(attribute_type='dropdown', label='Measurement Units')
        for attribute in attributes:
            for unit in units:
                UserDefinedDropDownOption.objects.get_or_create(
                    value=unit['value'],
                    display_value=unit['display_value'],
                    attribute=attribute
                )