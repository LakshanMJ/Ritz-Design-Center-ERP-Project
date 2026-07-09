from marketing.models import Item, ItemAttribute
from materials.models import *


ITEMS = [
    'Baby - Pant',
    'Baby - LS Body Suit',
    'Baby - SS Body Suit',
]

def import_items():

    for item in ITEMS:
        Item.objects.get_or_create(item)


def import_item_placements():
    placements = {
        ITEMS[0]: [
            ['Main Body', Material.FABRIC_MATERIAL],
            ['Sleeves', Material.FABRIC_MATERIAL],
            ['Ribbing Neck', Material.FABRIC_MATERIAL],
            ['Leg Opening', Material.FABRIC_MATERIAL],
            ['Shoulder', Material.FABRIC_MATERIAL],

            ['Left Sleeve Seam', 'satintape'],
            ['Sleeve Hems @Binding', 'thread'],
            ['Back Neck', 'thread'],
            # ['Bodysuit @Crotch', Material.], TODO - this is missing
            ['Center Back', 'heatseal'],
            ["Wearer's Left Top Chest", 'carelabel'],
        ],

        ITEMS[1]: [
            ['Main Body', Material.FABRIC_MATERIAL],
            ['Sleeves', Material.FABRIC_MATERIAL],
            ['Ribbing Neck', Material.FABRIC_MATERIAL],
            ['Leg Opening', Material.FABRIC_MATERIAL],
            ['Shoulder', Material.FABRIC_MATERIAL],

            ['Left Sleeve Seam', 'satintape'],
            ['Sleeve Hems @Binding', 'thread'],
            ['Back Neck', 'thread'],
            # ['Bodysuit @Crotch', Material.], TODO - this is missing
            ['Center Back', 'heatseal'],
            ["Wearer's Left Top Chest", 'carelabel'],
        ],
    }

    for item, placement_vals in placements.items():
        item_obj = Item.objects.get_or_create(name=item)[0]

        for placement in placement_vals:
            ItemAttribute.objects.get_or_create(item=item_obj, placement=placement[0], type=placement[1])