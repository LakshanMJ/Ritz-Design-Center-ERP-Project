from django.conf import settings
from marketing.models import Item, ItemVariation, ItemVariationOperation
from shared.models import ColorwayCategory, MachineType, FolderType
from django.core.exceptions import ObjectDoesNotExist
import os
from django.conf import settings
import json

class ItemOperationMetaData:

    def create_operations(self):
        self.create_machine_types()
        self.create_folder_types()

    def read_machine_type_from_file(self):
        file_path = os.path.join(settings.BASE_DIR, 'shared', 'dataimports/data_files', 'machine_types.json')
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data

    def create_machine_types(self):
        data = self.read_machine_type_from_file()
        for row in data:
            name = row['name']
            short_name = row['short_name']
            machine_type, created = MachineType.objects.get_or_create(
                name=name,
                short_name=short_name
            )

    def create_folder_types(self):
        folder_type, created = FolderType.objects.get_or_create(name='Folder')
    # def create_operations_legging_aop_all_garment(self):
    #     try:
    #         item = Item.objects.get(name='Ladies - Legging')
    #         colorway_category = ColorwayCategory.objects.get(name='AOP - All Garment One Way')
    #         item_variations = ItemVariation.objects.filter(item=item, colorway_category=colorway_category)

    #         data = []
    #         data.append({
    #             "CODE": "LGFRRIJO",
    #             "OPERATION DESCRIPTION": "FRONT RISE JOING",
    #             "SEWING SMV": 0.20,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGBKRIJO",
    #             "OPERATION DESCRIPTION": "BACK RISE JOING",
    #             "SEWING SMV": 0.20,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASISAT",
    #             "OPERATION DESCRIPTION": "INSEAM ATTACH",
    #             "SEWING SMV": 0.52,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASBTHM",
    #             "OPERATION DESCRIPTION": "BTM HEM",
    #             "SEWING SMV": 0.51,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "FLHLC",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWEAT",
    #             "OPERATION DESCRIPTION": "WAIST ELASTIC ATTACH",
    #             "SEWING SMV": 0.27,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLC",
    #             "FOLDER": "RAM",
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWETK",
    #             "OPERATION DESCRIPTION": "WAIST ELASTIC TACK",
    #             "SEWING SMV": 0.15,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASLBTG",
    #             "OPERATION DESCRIPTION": "LABLE TACK TOGEDER",
    #             "SEWING SMV": 0.12,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASLBAT",
    #             "OPERATION DESCRIPTION": "WAIST LABLE TACK",
    #             "SEWING SMV": 0.15,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASHGTK",
    #             "OPERATION DESCRIPTION": "HANGERLOOP TACK",
    #             "SEWING SMV": 0.22,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWBTS",
    #             "OPERATION DESCRIPTION": "WAIST BAND OUT LINE",
    #             "SEWING SMV": 0.45,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "FLCB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASCRBT",
    #             "OPERATION DESCRIPTION": "CROTCH BTK",
    #             "SEWING SMV": 0.12,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "BT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         for row in data:
    #             for item_variation in item_variations:
    #                 machine_type = None
    #                 folder_type = None
    #                 if row['MACHINE CODE'] != None:
    #                     machine_type, created = MachineType.objects.get_or_create(name=row['MACHINE CODE'], short_name=row['MACHINE CODE'])
    #                 if row['FOLDER'] != None:
    #                     folder_type, created = FolderType.objects.get_or_create(name=row['FOLDER'])
    #                 item_variation_operations, created = ItemVariationOperation.objects.get_or_create(variation=item_variation, operation_name=row['OPERATION DESCRIPTION'])
    #                 item_variation_operations.costing_smv=None
    #                 item_variation_operations.factory_smv=row['SEWING SMV']
    #                 item_variation_operations.machine_type=machine_type
    #                 item_variation_operations.folder_type=folder_type
    #                 item_variation_operations.save()

    #     except ObjectDoesNotExist:
    #         return 'Objects not found'
        
    # def create_operations_legging_aop_one_garment(self):
    #     try:
    #         item = Item.objects.get(name='Ladies - Legging')
    #         colorway_category = ColorwayCategory.objects.get(name='AOP - One Garment One Way')
    #         item_variations = ItemVariation.objects.filter(item=item, colorway_category=colorway_category)

    #         data = []
    #         data.append({
    #             "CODE": "LGFRRIJO",
    #             "OPERATION DESCRIPTION": "FRONT RISE JOING",
    #             "SEWING SMV": 0.20,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGBKRIJO",
    #             "OPERATION DESCRIPTION": "BACK RISE JOING",
    #             "SEWING SMV": 0.20,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASISAT",
    #             "OPERATION DESCRIPTION": "INSEAM ATTACH",
    #             "SEWING SMV": 0.52,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASBTHM",
    #             "OPERATION DESCRIPTION": "BTM HEM",
    #             "SEWING SMV": 0.51,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "FLHLC",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWEAT",
    #             "OPERATION DESCRIPTION": "WAIST ELASTIC ATTACH",
    #             "SEWING SMV": 0.27,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLC",
    #             "FOLDER": "RAM",
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWETK",
    #             "OPERATION DESCRIPTION": "WAIST ELASTIC TACK",
    #             "SEWING SMV": 0.15,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASLBTG",
    #             "OPERATION DESCRIPTION": "LABLE TACK TOGEDER",
    #             "SEWING SMV": 0.12,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASLBAT",
    #             "OPERATION DESCRIPTION": "WAIST LABLE TACK",
    #             "SEWING SMV": 0.15,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASHGTK",
    #             "OPERATION DESCRIPTION": "HANGERLOOP TACK",
    #             "SEWING SMV": 0.22,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWBTS",
    #             "OPERATION DESCRIPTION": "WAIST BAND OUT LINE",
    #             "SEWING SMV": 0.45,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "FLCB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASCRBT",
    #             "OPERATION DESCRIPTION": "CROTCH BTK",
    #             "SEWING SMV": 0.12,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "BT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         for row in data:
    #             for item_variation in item_variations:
    #                 machine_type = None
    #                 folder_type = None
    #                 if row['MACHINE CODE'] != None:
    #                     machine_type, created = MachineType.objects.get_or_create(name=row['MACHINE CODE'], short_name=row['MACHINE CODE'])
    #                 if row['FOLDER'] != None:
    #                     folder_type, created = FolderType.objects.get_or_create(name=row['FOLDER'])
    #                 item_variation_operations, created = ItemVariationOperation.objects.get_or_create(variation=item_variation, operation_name=row['OPERATION DESCRIPTION'])
    #                 item_variation_operations.costing_smv=None
    #                 item_variation_operations.factory_smv=row['SEWING SMV']
    #                 item_variation_operations.machine_type=machine_type
    #                 item_variation_operations.folder_type=folder_type
    #                 item_variation_operations.save()

    #     except ObjectDoesNotExist:
    #         return 'Objects not found'
        
    # def create_operations_legging_solid(self):
    #     try:
    #         item = Item.objects.get(name='Ladies - Legging')
    #         colorway_category = ColorwayCategory.objects.get(name='Solid')
    #         item_variations = ItemVariation.objects.filter(item=item, colorway_category=colorway_category)

    #         data = []
    #         data.append({
    #             "CODE": "LGFRRIJO",
    #             "OPERATION DESCRIPTION": "FRONT RISE JOING",
    #             "SEWING SMV": 0.20,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGBKRIJO",
    #             "OPERATION DESCRIPTION": "BACK RISE JOING",
    #             "SEWING SMV": 0.20,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASISAT",
    #             "OPERATION DESCRIPTION": "INSEAM ATTACH",
    #             "SEWING SMV": 0.52,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLSB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASBTHM",
    #             "OPERATION DESCRIPTION": "BTM HEM",
    #             "SEWING SMV": 0.51,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "FLHLC",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWEAT",
    #             "OPERATION DESCRIPTION": "WAIST ELASTIC ATTACH",
    #             "SEWING SMV": 0.27,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "4THOLC",
    #             "FOLDER": "RAM",
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWETK",
    #             "OPERATION DESCRIPTION": "WAIST ELASTIC TACK",
    #             "SEWING SMV": 0.15,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASLBTG",
    #             "OPERATION DESCRIPTION": "LABLE TACK TOGEDER",
    #             "SEWING SMV": 0.12,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASLBAT",
    #             "OPERATION DESCRIPTION": "WAIST LABLE TACK",
    #             "SEWING SMV": 0.15,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASHGTK",
    #             "OPERATION DESCRIPTION": "HANGERLOOP TACK",
    #             "SEWING SMV": 0.22,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "SNUBT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASWBTS",
    #             "OPERATION DESCRIPTION": "WAIST BAND OUT LINE",
    #             "SEWING SMV": 0.45,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "FLCB",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         data.append({
    #             "CODE": "LGASCRBT",
    #             "OPERATION DESCRIPTION": "CROTCH BTK",
    #             "SEWING SMV": 0.12,
    #             "HELPER SMV": None,
    #             "MACHINE CODE": "BT",
    #             "FOLDER": None,
    #             "VIDEO": None
    #         })

    #         for row in data:
    #             for item_variation in item_variations:
    #                 machine_type = None
    #                 folder_type = None
    #                 if row['MACHINE CODE'] != None:
    #                     machine_type, created = MachineType.objects.get_or_create(name=row['MACHINE CODE'], short_name=row['MACHINE CODE'])
    #                 if row['FOLDER'] != None:
    #                     folder_type, created = FolderType.objects.get_or_create(name=row['FOLDER'])
    #                 item_variation_operations, created = ItemVariationOperation.objects.get_or_create(variation=item_variation, operation_name=row['OPERATION DESCRIPTION'])
    #                 item_variation_operations.costing_smv=None
    #                 item_variation_operations.factory_smv=row['SEWING SMV']
    #                 item_variation_operations.machine_type=machine_type
    #                 item_variation_operations.folder_type=folder_type
    #                 item_variation_operations.save()

    #     except ObjectDoesNotExist:
    #         return 'Objects not found'