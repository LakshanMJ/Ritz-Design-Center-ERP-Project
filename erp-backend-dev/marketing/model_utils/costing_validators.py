from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q

from marketing.models import AbstractOrderMaterialPlacement, OrderPackItemPlacement, OrderPackPlacement, \
    ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, ColorwayItemType, \
    ItemColorwayColorwayCategoryFabricConsumptionRatio, ItemColorwayCategoryFabricConsumptionRatio, \
    ItemColorwayCategoryFabricConsumptionComplete, ItemColorwayTypeFabricConsumptionComplete, OrderPackItemPlacementMaterialConsumption, OrderPackPlacementMaterialConsumption
from materials.models import Material, SupplierInquiry


class OrderCostingVersionValidator:

    def __init__(self, version):
        self.version = version
        self.order_packs = self.version.get_order_version_packs()
        self.order_pack_items = self.version.get_order_pack_items()

    def quantities_entry_complete(self):
        return not self.order_packs.filter(cad_quantity__isnull=True).exists() # If null data exists then quantities not complete

    def order_packs_materials_complete(self):
        return not self.order_packs.exclude(reviewed=True).exists()

    def order_pack_items_materials_complete(self):
        pack_items = self.order_pack_items
        return not pack_items.exclude(reviewed=True).exists()

    def order_pack_items_consumption_data_complete(self):
        order_pack_items = self.order_pack_items#.select_related('orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption')
        valid = True
        for order_pack_item in order_pack_items:
            if not order_pack_item.placements_have_consumption_data_exclude_fabrics():
                valid = False
        return valid

    def order_packs_consumption_data_complete(self):
        order_packs = self.order_packs#.select_related('orderpackplacementmaterial__orderpackplacementmaterialconsumption')
        valid = True
        for order_pack in order_packs:
            if not order_pack.placements_have_consumption_data():
                valid = False
        return valid

    def validate_material_consumption_data(self):
        material_consumption_data_valid = True

        if not self.order_packs_consumption_data_complete() or not self.order_pack_items_consumption_data_complete():
            material_consumption_data_valid = False
        return material_consumption_data_valid

    def verify_fabric_consumption_ratios(self):
        pack_items = self.version.get_order_pack_items().filter(consumption_data_reviewed=False)# T
        packs = self.version.get_order_version_packs().filter(consumption_data_reviewed=False)# F
        return not (pack_items.exists() or packs.exists())
    
    def verify_fabric_consumption_ratios_complete(self):
        pack_items = self.version.get_order_pack_items().filter(fabric_consumption_data_reviewed=False)# T
        return not (pack_items.exists())
    
    def verify_sewing_trim_consumption_ratios_complete(self, material):
        qs = OrderPackItemPlacementMaterialConsumption.objects.filter(
            Q(pack_item_placement_material__placement__order_pack_item__pack__version=self.version) &
            Q(pack_item_placement_material__material__material_detail__generic_material__user_material=material) &
            (Q(wastage__isnull=True) | Q(costing_consumption_ratio__isnull=True))
        )
        return not qs.exists()
    
    def verify_packing_trim_consumption_ratios_complete(self, material):
        qs = OrderPackPlacementMaterialConsumption.objects.filter(
            Q(pack_placement_material__placement__order_pack__version=self.version) &
            Q(pack_placement_material__material__material_detail__generic_material__user_material=material) &
            (Q(wastage__isnull=True) | Q(costing_consumption_ratio__isnull=True))
        )
        return not qs.exists()

    def verify_colorway_item_colorway_type_consumption_ratios(self):
        colorways = self.version.order.get_order_colorways()
        order_items = self.version.order.get_order_items()
        ratios = ItemColorwayCategoryFabricConsumptionComplete.objects.filter(version=self.version)
        valid = True
        for colorway in colorways:
            for order_item in order_items:
                cw_item_type = ColorwayItemType.objects.get(item=order_item, colorway=colorway)
                try:
                    ratio = ratios.get(
                        order_colorway=colorway,
                        item=order_item.item,
                        colorway_category=cw_item_type.colorway_category,
                    )
                except ObjectDoesNotExist:
                    ratio = None
                if not ratio or not ratio.fabric_consumption_data_reviewed:
                    valid = False
                    break
        return valid

    def verify_item_colorway_type_consumption_ratios(self):
        order_items = self.version.order.get_order_items()
        item_cw_type_ratios = ItemColorwayTypeFabricConsumptionComplete.objects.filter(version=self.version)
        valid = True
        for order_item in order_items:
            cw_item_categories = ColorwayItemType.objects.filter(item=order_item).values_list('colorway_category_id', flat=True).distinct()

            for cw_category in cw_item_categories:
                try:
                    ratio = item_cw_type_ratios.get(colorway_category=cw_category, item=order_item.item)
                except ObjectDoesNotExist:
                    ratio = None

                if not ratio or not ratio.fabric_consumption_data_reviewed:
                    valid = False
                    break
                if not valid:
                    break
            return valid