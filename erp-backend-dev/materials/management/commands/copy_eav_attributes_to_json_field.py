from django.core.management.base import BaseCommand

from materials.models import GenericMaterial, GenericMaterialVariation


class Command(BaseCommand):
    help = "This will run once to copy eav data to"

    def get_eav_data(self, material_attributes, object):
        data = {}
        generic_material_eav = object.eav
        for material_attribute in material_attributes:
            data[material_attribute.name] = getattr(generic_material_eav, material_attribute.name, None)
        return data

    def copy_generic_material_variation_eav_data(self):
        generic_material_variations = GenericMaterialVariation.objects.all()

        for generic_material_variation in generic_material_variations:
            material_attributes = generic_material_variation.generic_material.user_material.get_material_variation_fields()
            data = self.get_eav_data(material_attributes, generic_material_variation)

            generic_material_variation.user_defined_material_data =data
            generic_material_variation.save()

    def copy_generic_material_eav_data(self):
        generic_materials = GenericMaterial.objects.all()

        for generic_material in generic_materials:

            material_attributes = generic_material.user_material.get_material_fields_excluding_variation_fields()
            data = self.get_eav_data(material_attributes, generic_material)

            generic_material.user_defined_material_data = data
            generic_material.save()

    def handle(self, *args, **options):
        self.copy_generic_material_eav_data()
        self.copy_generic_material_variation_eav_data()
