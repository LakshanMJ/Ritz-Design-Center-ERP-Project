from materials.models import FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES
from shared.models import InHouseMaterial


class VirtualWarehouseTableHeaders():
    material_category = ''
    specific_status = ''
    headers = []
    def __init__(self, material_category, specific_status):
        self.material_category = material_category
        self.specific_status = specific_status
        self.headers = []

    def get_headers(self):
        self.headers.extend(self.get_material_category_headers())
        return self.headers
    
    def get_material_category_headers(self):

        material_category_headers = {}
        material_category_headers[FABRIC_TRIM_TYPES] = [
            {
                'display_value': 'Colorway Category',
                'attribute': 'fabric_type_display_value'
            },
            {
                'display_value': 'Description',
                'attribute': 'fabric_composition_display_value'
            },
            {
                'display_value': 'Color',
                'attribute': 'fabric_color'
            },
            {
                'display_value': 'Image',
                'attribute': 'attachments'
            }
        ]

        material_category_headers[SEWING_TRIM_TYPES] = [
            {
                'display_value': 'Item',
                'attribute': 'item'
            },
            {
                'display_value': 'Description',
                'attribute': 'description'
            },
            {
                'display_value': 'Color',
                'attribute': 'color'
            },
            {
                'display_value': 'Shape',
                'attribute': 'shape'
            },
            {
                'display_value': 'Image',
                'attribute': 'attachments'
            }
        ]

        material_category_headers[PACKAGING_TYPES] = [
            {
                'display_value': 'Date',
                'attribute': 'date'
            },
            {
                'display_value': 'Item Code',
                'attribute': 'item_code'
            },
            {
                'display_value': 'Description',
                'attribute': 'description'
            },
            {
                'display_value': 'Color',
                'attribute': 'color'
            },
            {
                'display_value': 'Shape',
                'attribute': 'shape'
            },
            {
                'display_value': 'Size/ Dimention',
                'attribute': 'size'
            },
            {
                'display_value': 'Image',
                'attribute': 'attachments'
            },
            {
                'display_value': 'Quantity',
                'attribute': 'quantity'
            }
        ]
        return material_category_headers[self.material_category]
    

    def get_specific_headers(self):

        order_specific_fabric_headers = [
            {
                'display_value': 'Excess',
                'attribute': 'excess'
            }
        ]
        left_over_fabric_headers = [
            {
                'display_value': 'From SAO',
                'attribute': 'from_sao'
            },
            {
                'display_value': 'From PO',
                'attribute': 'from_po'
            },
            {
                'display_value': 'Aging(Months)',
                'attribute': 'aging'
            },
            {
                'display_value': 'Total Qty',
                'attribute': 'total_quantity'
            }
        ]
        specific_headers = {
            FABRIC_TRIM_TYPES: {
                InHouseMaterial.ORDER_SPECIFIC_RAW_MATERIAL_STATUS: order_specific_fabric_headers,
                InHouseMaterial.LEFT_OVER_STATUS: left_over_fabric_headers
            },
            SEWING_TRIM_TYPES: {},
            PACKAGING_TYPES: {}
        }
        
        return specific_headers[self.material_category][self.specific_status]