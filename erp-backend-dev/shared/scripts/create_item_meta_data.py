import os
from django.conf import settings
import json
from shared.utils import get_object_or_none
from marketing.models import CustomerBrand, Item, ItemAttribute
from materials.models import UserDefinedMaterial

class ItemMetaData:

    def create_item_meta_data(self):
        self.create_item_and_item_attributes()

    def read_item_data_from_file(self):
        file_path = os.path.join(settings.BASE_DIR, 'shared', 'dataimports/data_files', 'item_data_matalan.json')
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data

    def create_item_and_item_attributes(self):
        data = self.read_item_data_from_file()
        for row in data:
            item_name = row['name']
            code = row['code']
            brand = row['brand']
            customer = row['customer']
            attributes_data = row['attributes']
            customer_brand = get_object_or_none(CustomerBrand, {'customer__name': customer, 'brand__name': brand})
            if customer_brand:
                item, created = Item.objects.get_or_create(
                    name=item_name,
                    code=code,
                    customer_brand=customer_brand
                )
                item.create_item_variations()
                for attribute_row in attributes_data:
                    placement = attribute_row['placement']
                    type = attribute_row['type']
                    assign_type = attribute_row['assign_type']
                    material = attribute_row['material']
                    estimated_consumption_ratio = attribute_row['estimated_consumption_ratio']
                    estimated_consumption_ratio_units = attribute_row['estimated_consumption_ratio_units']
                    is_mandatory = attribute_row['is_mandatory']
                    
                    user_material = get_object_or_none(UserDefinedMaterial, {'name': type})
                    print(user_material, type)
                    if user_material:
                        item_attribute, created = ItemAttribute.objects.get_or_create(
                            item=item,
                            placement=placement,
                            type=user_material.name,
                            assign_type=assign_type,
                            material=user_material,
                            estimated_consumption_ratio =estimated_consumption_ratio,
                            estimated_consumption_ratio_units =estimated_consumption_ratio_units,
                            is_mandatory=is_mandatory
                        )