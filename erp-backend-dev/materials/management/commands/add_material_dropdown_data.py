from django.core.management.base import BaseCommand
from materials.scripts.create_material_dropdown_options import UserDefineMaterialDropdownOptionMetaData


class Command(BaseCommand):
    help = "add material dropdpwn options"

    def handle(self, *args, **options):
        UserDefineMaterialDropdownOptionMetaData().create_material_dropdown_options()
