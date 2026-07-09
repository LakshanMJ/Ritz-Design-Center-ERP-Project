import copy
from abc import abstractmethod

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from rest_framework.generics import get_object_or_404
from marketing.mixins.material_mixins import PackItemPlacementInfoMixin, PackPlacementInfoMixin
from materials.models import Material, SupplierInquiry, SupplierInquiryDetail, UserDefinedMaterial, \
    FABRIC_TRIM_TYPES, CustomerBrandMaterial, CustomerBrandMaterialCode, PACKAGING_TYPES
from marketing.models import OrderSizeGroup, OrderPackItem, OrderPack, OrderInquiry, \
    OrderPackItemPlacementMaterialConsumption, OrderPackItemPlacementMaterial, PackItemFabricConsumptionRatio, \
    OrderCostingVersion, OrderItem, OrderPackPlacementMaterialConsumption, \
    ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, \
    ItemColorwayColorwayCategoryFabricConsumptionRatio, ItemColorwayCategoryFabricConsumptionRatio, \
    AbstractOrderPlacementMaterialConsumption, OrderColorway, \
    ItemColorwayCategoryFabricConsumptionComplete, ItemColorwayTypeFabricConsumptionComplete, AbstractOrderPlacement, POClubCutInstruction
from materials.fieldmetadata.material_metadata import ATTRIBUTE_DISPLAY_VALUE_KEY, HEADER_LABEL_KEY, \
    ATTRIBUTE_VALUE_KEY, get_supplier_inquiry_headers, get_supplier_quote_meta_data, ATTRIBUTE_TYPE_KEY, \
    IS_REFERENCE_CODE_KEY, TEXT_TYPE
from materials.utils.shared_utils import filter_header_columns
from shared.models import ColorwayCategory
from shared.utils import get_object_or_none, dictionary_in_list
from materials.fieldmetadata.measuring_unit_helpers import PerMeasuringUnitHelper, MaterialUnitHelper
from supplier_po.models import SupplierPOGRNMaterialDetail
from math import ceil


class CadInterfacePlacementMaterialMixin:
    PLACEMENT_DATA_KEY = 'placement_data'
    MATERIAL_DATA_KEY = 'material_data'
    CONSUMPTION_DATA_KEY = 'consumption_data'

    SUPPLIER_ID_KEY = 'supplier_id'
    SUPPLIER_DISPLAY_VALUE_KEY = 'supplier'
    CUTTING_WIDTH_KEY = 'cutting_width'
    SUPPLIER_INQUIRY_ID_KEY = 'supplier_inquiry_id'
    MATERIAL_ID_KEY = 'material_id'
    SUPPLIER_INQUIRY_DETAIL_ID_KEY = 'supplier_inquiry_detail_id'

    pack_ids = []
    sorted_packs = None
    sorted_pack_objects = None

    def get_placement_key(self, placement):
        placement_key = placement.get('placement_id')

        if not placement_key and placement.get('placement_other_id'):
            placement_key = 'other_' + str(placement.get('placement_other_id', ''))
        return placement_key

    def get_material_key(self, material, placement):
        material_key = placement.get('customer_brand_material_id')
        # if material == Material.FABRIC_MATERIAL:
        #     placement.get('variation_id')
        return material_key

    def get_organized_material_data(self, pack_item_placment_data, material_name):
        headers = UserDefinedMaterial.get_material_headers(material_name)
        placement_other_id_key = AbstractOrderPlacement.ITEM_ATTRIBUTE_OTHER_ID_KEY
        material_data = {
            # 'variation_id': pack_item_placment_data.get('variation_id', None),
            self.MATERIAL_ID_KEY: pack_item_placment_data.get(CustomerBrandMaterial.PK_CUSTOMER_BRAND_MATERIAL_CODE_ID_KEY, None),
            "reference_code": pack_item_placment_data.get('reference_code', None),
            placement_other_id_key: pack_item_placment_data.get(placement_other_id_key, None)
        }

        for header in headers:
            display_value_key = header.get(ATTRIBUTE_DISPLAY_VALUE_KEY, None)
            value_key = header.get(ATTRIBUTE_VALUE_KEY, None)

            if display_value_key and value_key:
                material_data[display_value_key] = pack_item_placment_data.get(display_value_key, None)
                material_data[value_key] = pack_item_placment_data.get(value_key, None)
        return material_data

    def group_placements(self, pack_item_placements):
        display_names = {}
        placement_data_key = self.PLACEMENT_DATA_KEY
        material_data_key = self.MATERIAL_DATA_KEY
        consumption_data_key = self.CONSUMPTION_DATA_KEY
        grouped_data = {}
        for pack_item_placement in pack_item_placements:
            pack_id = pack_item_placement.pop('order_pack_id', None)
            for material, placement in pack_item_placement.items():
                placement_data = placement.get('data', [])
                display_names[material] = placement.get('display_name', 'Unknown Material')
                for placement in placement_data:
                    if not grouped_data.get(material, None):
                        is_supplier_based = False
                        if material == Material.FABRIC_MATERIAL:
                            is_supplier_based = True
                        grouped_data[material] = {"is_supplier_based": is_supplier_based}

                    if not grouped_data[material].get(placement_data_key, None):
                        grouped_data[material][placement_data_key] = {}

                    placement_key = self.get_placement_key(placement)
                    item_attribute_other_id_key = AbstractOrderPlacement.ITEM_ATTRIBUTE_OTHER_ID_KEY

                    if not grouped_data[material][placement_data_key].get(placement_key, None):
                        grouped_data[material][placement_data_key][placement_key] = {
                            'placement': placement.get('placement', None),
                            item_attribute_other_id_key: placement.get(item_attribute_other_id_key, None)
                        }

                    if not grouped_data[material][placement_data_key][placement_key].get(material_data_key, None):
                        grouped_data[material][placement_data_key][placement_key][material_data_key] = {}

                    material_key = self.get_material_key(material, placement)  # material_id or variatioN_id
                    if not grouped_data[material][placement_data_key][placement_key][material_data_key].get(
                            material_key, None):
                        grouped_data[material][placement_data_key][placement_key][material_data_key][
                            material_key] = self.get_organized_material_data(placement, material)

                    order_placement_material_id = placement.get('order_placement_material_id')
                    consumption_data = self.get_consumption_ratio_object(order_placement_material_id, material)

                    if not grouped_data[material][placement_data_key][placement_key][material_data_key][
                        material_key].get(consumption_data_key, None):
                        grouped_data[material][placement_data_key][placement_key][material_data_key][material_key][consumption_data_key] = {}


                    grouped_data[material][placement_data_key][placement_key][material_data_key][material_key][
                        consumption_data_key][order_placement_material_id] = {
                        'consumption_ratio': consumption_data.costing_consumption_ratio if consumption_data else None,
                        'order_placement_material_id': order_placement_material_id,
                        'order_placement_id': self.get_order_placement_id(placement),
                        'wastage': consumption_data.wastage if consumption_data else None,
                        'pack_id': pack_id,
                        'attachments': [attachment.get_object_data() for attachment in consumption_data.attachments.all()] if consumption_data else []
                    }

        return grouped_data, display_names

    def get_sorted_pack_objects(self, pack_ids):
        if not self.sorted_pack_objects:
            self.sorted_pack_objects = OrderPack.objects.filter(pk__in=self.pack_ids).order_by(
                'size__size__sorting_order')
        return self.sorted_pack_objects

    def get_sorted_packs(self, pack_ids):
        if not self.sorted_packs:
            self.sorted_packs = self.get_sorted_pack_objects(pack_ids).values('size_id', 'id')
        return self.sorted_packs

    def sort_consumption_data(self, consumption_data):
        pack_ids = [row['pack_id'] for row in consumption_data]
        sorted_pack_ids = self.get_sorted_packs(pack_ids)

        pack_id_dict = {row['pack_id']: row for row in consumption_data}
        # data = []
        # for sorted_pack_id in sorted_pack_ids:
        #     data.append(pack_id_dict.get(sorted_pack_id.get('id', None), {}))
        return pack_id_dict

    def append_sizes_to_headers(self):
        packs = self.get_sorted_pack_objects(self.pack_ids)
        header = []

        for pack in packs:
            header.append({
                HEADER_LABEL_KEY: pack.size.size.name,
                'is_size_field': True,
                'pack_id': pack.id
            })
        return header

    def get_fabric_cad_consumption_ratios(self):
        fabric_headers = [
            {
                HEADER_LABEL_KEY: "Supplier",
                ATTRIBUTE_DISPLAY_VALUE_KEY: self.SUPPLIER_DISPLAY_VALUE_KEY
            },
            {
                HEADER_LABEL_KEY: "Cutting Width",
                ATTRIBUTE_DISPLAY_VALUE_KEY: self.CUTTING_WIDTH_KEY
            },
        ]
        return fabric_headers

    def flatten_dictionary(self, cad_data, display_names):
        flatten_data = {}

        for material, data in cad_data.items():

            if not flatten_data.get(material, None):
                display_name = display_names.get(material, "Unknown Material")
                material_object = UserDefinedMaterial.objects.get(name=material)
                measuring_unit = material_object.get_consumption_measuring_unit_display()

                if material == Material.FABRIC_MATERIAL:
                    headers = [
                        {
                            HEADER_LABEL_KEY: 'Placement',
                            ATTRIBUTE_DISPLAY_VALUE_KEY: 'placement',
                            # ATTRIBUTE_VALUE_KEY: 'total',
                            # ATTRIBUTE_TYPE_KEY: "donotdisplay"
                        },
                        {
                            HEADER_LABEL_KEY: "Material Reference Code",
                            ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
                            ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
                            ATTRIBUTE_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
                            IS_REFERENCE_CODE_KEY: True,
                        },
                        *UserDefinedMaterial.get_material_headers(material),
                        *self.get_fabric_cad_consumption_ratios(),
                        *self.append_sizes_to_headers()
                    ]
                else:
                    if material_object.category == PACKAGING_TYPES:
                        header_label_key = 'Packaging Item Name'
                    else:
                        header_label_key = 'Placement'
                    headers = [
                        {
                            HEADER_LABEL_KEY: header_label_key,
                            ATTRIBUTE_DISPLAY_VALUE_KEY: 'placement',
                            # ATTRIBUTE_VALUE_KEY: 'total',
                            # ATTRIBUTE_TYPE_KEY: "donotdisplay"
                        },
                        {
                            HEADER_LABEL_KEY: "Material Reference Code",
                            ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
                            ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
                            ATTRIBUTE_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
                            IS_REFERENCE_CODE_KEY: True,
                        },
                        *UserDefinedMaterial.get_material_headers(material),
                        *self.append_sizes_to_headers()
                    ]

                flatten_data[material] = {
                    "data": [],
                    "headers": headers,
                    "display_name": display_name,
                    "material_name": material,
                    'consumption_measuring_units': measuring_unit,
                }

            placement_data = data.get(self.PLACEMENT_DATA_KEY, {})
            for placement_id, p_data in placement_data.items():
                item_attribute_other_id_key = AbstractOrderPlacement.ITEM_ATTRIBUTE_OTHER_ID_KEY
                material_data = p_data.get(self.MATERIAL_DATA_KEY, {})
                data_row = {
                    'is_supplier_based': data.get('is_supplier_based', None),
                    'placement': p_data.get('placement', ''),
                    item_attribute_other_id_key: p_data.get(item_attribute_other_id_key, '')
                }

                for material_id, m_data in material_data.items():
                    consumption_data = self.sort_consumption_data(m_data.get(self.CONSUMPTION_DATA_KEY, {}).values())

                    placement_material_data = {
                        **data_row,
                        **m_data,
                        self.CONSUMPTION_DATA_KEY: consumption_data
                    }
                    flatten_data[material]["data"].append(placement_material_data)
        return flatten_data

    @abstractmethod
    def get_consumption_ratio_object(self, material_placement_id, material):
        ...

    @abstractmethod
    def get_order_placement_id(self, data):
        ...

class BaseOrderFabric(CadInterfacePlacementMaterialMixin, PackItemPlacementInfoMixin):
    CUSTOMER_BRAND_MATERIAL_ID_KEY = SupplierInquiry.CUSTOMER_BRAND_MATERIAL_ID_KEY
    CUTTING_WIDTH_KEY = SupplierInquiryDetail.CUTTING_WIDTH_KEY
    SUPPLIER_NAME_KEY = SupplierInquiry.SUPPLIER_KEY
    EDITABLE_KEY = 'ratios_editable'
    SUPPLIER_FILTER_KEYS = [SupplierInquiry.SUPPLIER_ID_KEY]
    SUPPLIER_MATERIAL_DETAIL_FILTER_KEYS = [SupplierInquiryDetail.CUTTING_WIDTH_KEY]
    CONSUMPTION_RATIO_KEY = 'consumption_ratio'
    WASTAGE_KEY = 'wastage'
    PLACEMENTS_KEY = 'placements'
    COLORWAY_SIZE_KEY = 'placement_colorway_sizes'
    COLORWAY_SIZE_DISPLAY_KEY = 'placement_colorway_sizes_display'
    SIZE_DISPLAY_ORDER_KEY = 'size_display_order'
    SIZE_NAME_KEY = 'size_name'
    COLORWAY_NAME_KEY = 'colorway_name'
    ORDER_COLORWAY_ID_KEY = 'order_colorway_id'
    ORDER_SIZE_ID_KEY = 'order_size_id'
    PLACEMENTS_HEADERS = [
        {
            HEADER_LABEL_KEY: 'Placements',
            ATTRIBUTE_DISPLAY_VALUE_KEY: PLACEMENTS_KEY,
        },
        {
            HEADER_LABEL_KEY: 'Colorway Sizes',
            ATTRIBUTE_DISPLAY_VALUE_KEY: COLORWAY_SIZE_DISPLAY_KEY,
        }
    ]

    def __init__(self, request, order_id, version_id, colorway_category_id):
        self.order = get_object_or_404(OrderInquiry, pk=order_id)
        self.version = get_object_or_404(OrderCostingVersion, pk=version_id, order_id=order_id)
        self.request = request
        self.colorway_category_id = colorway_category_id
        headers = UserDefinedMaterial.get_material_headers(FABRIC_TRIM_TYPES)
        supplier_inquiry_headers = filter_header_columns(SupplierInquiryDetail.get_headers(), self.SUPPLIER_FILTER_KEYS)
        supplier_inquiry_detail_headers = filter_header_columns(SupplierInquiryDetail.get_detail_headers(), self.SUPPLIER_MATERIAL_DETAIL_FILTER_KEYS)
        self.headers = [*self.PLACEMENTS_HEADERS, *headers, *supplier_inquiry_headers, *supplier_inquiry_detail_headers]

    def add_supplier_inquiries_to_data(self, material_data):
        data = []
        for material in material_data:
            customer_brand_material_id = material[self.CUSTOMER_BRAND_MATERIAL_ID_KEY]
            inquiries = SupplierInquiry.objects.filter(version=self.version, customer_brand_material_id=customer_brand_material_id)
            for inquiry in inquiries:
                supplier_material_details = inquiry.supplierinquirydetail_set.all()

                for supplier_material_detail in supplier_material_details:
                    material_copy = material.copy()
                    if supplier_material_detail.cutting_width and supplier_material_detail.cutting_width_unit:
                        material_copy[self.CUTTING_WIDTH_KEY] = str(supplier_material_detail.cutting_width) + " " + supplier_material_detail.cutting_width_unit

                    material_copy[self.SUPPLIER_NAME_KEY] = inquiry.supplier.name
                    material_copy[self.SUPPLIER_INQUIRY_ID_KEY] = inquiry.id
                    material_copy[self.SUPPLIER_INQUIRY_DETAIL_ID_KEY] = supplier_material_detail.id
                    ratio = self.get_consumption_data_object_or_none(
                        supplier_material_detail.id,
                        self.colorway_category_id,
                        customer_brand_material_id
                    )
                    material_copy[self.CONSUMPTION_RATIO_KEY] = ratio.costing_consumption_ratio if ratio else None
                    material_copy[self.WASTAGE_KEY] = ratio.wastage if ratio else None
                    material_copy[AbstractOrderPlacementMaterialConsumption.ATTACHMENTS_KEY] = [attachment.get_object_data() for attachment in ratio.attachments.all()] if ratio else []
                    data.append(material_copy)

            if not inquiries.exists():
                material[self.EDITABLE_KEY] = False
                material[self.CUTTING_WIDTH_KEY] = 'N/A'
                material[self.SUPPLIER_NAME_KEY] = 'There are no supplier inquiries for this material'
                data.append(material)
        return data

    def get_colorway_size_display_value(self, colorway_size_dict_list):
        data = sorted(colorway_size_dict_list, key=lambda dict: dict[self.SIZE_DISPLAY_ORDER_KEY])
        return ', '.join([row[self.SIZE_NAME_KEY] for row in data])

    def get_placement_material_colorway_size_information(self, placement_material):
        colorway_size_dict = {
            self.COLORWAY_NAME_KEY: placement_material.placement.order_pack_item.pack.colorway.colorway,
            self.SIZE_NAME_KEY: placement_material.placement.order_pack_item.pack.size.size.name,
            self.ORDER_COLORWAY_ID_KEY: placement_material.placement.order_pack_item.pack.colorway_id,
            self.ORDER_SIZE_ID_KEY: placement_material.placement.order_pack_item.pack.size_id,
            self.SIZE_DISPLAY_ORDER_KEY: placement_material.placement.order_pack_item.pack.size.size.sorting_order
        }
        return colorway_size_dict

    def sort_placements_by_fabric(self, placement_materials):
        placement_materials = self.limit_to_fabrics(placement_materials)
        material_placements = {}
        for placement_material in placement_materials:
            if not material_placements.get(placement_material.material_id, None) and placement_material.material:
                customer_brand_material = placement_material.material

                material_placements[placement_material.material_id] = customer_brand_material.get_attributes()
                material_placements[placement_material.material_id][self.CUSTOMER_BRAND_MATERIAL_ID_KEY] = customer_brand_material.id
                material_placements[placement_material.material_id][self.PLACEMENTS_KEY] = None
                material_placements[placement_material.material_id][self.COLORWAY_SIZE_KEY] = []
                material_placements[placement_material.material_id][self.COLORWAY_SIZE_DISPLAY_KEY] = ''

            # Add all the colorway sizes the placement is in
            colorway_size_dict = self.get_placement_material_colorway_size_information(placement_material)
            if not dictionary_in_list(material_placements[placement_material.material_id][self.COLORWAY_SIZE_KEY], colorway_size_dict):
                material_placements[placement_material.material_id][self.COLORWAY_SIZE_KEY].append(colorway_size_dict)
                material_placements[placement_material.material_id][self.COLORWAY_SIZE_DISPLAY_KEY] = self.get_colorway_size_display_value(material_placements[placement_material.material_id][self.COLORWAY_SIZE_KEY])

            placement_name = placement_material.placement.get_placement_details()[AbstractOrderPlacement.ITEM_ATTRIBUTE_KEY]
            if placement_name not in str(material_placements[placement_material.material_id][self.PLACEMENTS_KEY]):
                current_placement = material_placements[placement_material.material_id][self.PLACEMENTS_KEY]
                current_placement = current_placement + ", " + placement_name if current_placement else placement_name
                material_placements[placement_material.material_id][self.PLACEMENTS_KEY] = current_placement

        return self.add_supplier_inquiries_to_data(list(material_placements.values()))

    def limit_to_fabrics(self, pack_placement_materials):
        return pack_placement_materials.filter(
            Q(placement__item_attribute_other__type=Material.FABRIC_MATERIAL)
        )

    def get_order_pack_item_placement_materials(self, order_pack_item_ids):
        return OrderPackItemPlacementMaterial.objects.filter(placement__order_pack_item_id__in=order_pack_item_ids, placement__order_pack_item__pack__version=self.version)

    def get_colorway_type(self):
        cw_type = get_object_or_404(ColorwayCategory, pk=self.colorway_category_id)
        return cw_type

    '''
    :param item_id - item's id (NOT order item id)
    :param colorway_id - colorway's id
    :return order items in that colorway that has the instance's colorway type and item_id
    '''
    def get_colorway_type_item_colorway_order_items(self, item_id, colorway_id):
        cw_type = self.get_colorway_type()
        colorway = OrderColorway.objects.get(pk=colorway_id)
        order_items = cw_type.get_order_items_for_item_and_colorway(item_id=item_id, colorway=colorway)
        return order_items

    def get_fabric_data(self):
        data = {
            'data': [],
            'headers': self.headers
        }
        return data

    def get_order_placement_id(self, data):
        return data.get('pack_item_placement_id', None)

    @abstractmethod
    def get_consumption_data_object_or_none(self, supplier_inquiry_detail_id, colorway_category_id, customer_brand_material_id):
        ...


class PackItemSizeGroupFabrics(BaseOrderFabric):

    def __init__(self, request, order_id, version_id, item_id, colorway_id, country_id, size_group_id, colorway_category_id):
        super().__init__(request, order_id, version_id, colorway_category_id)
        self.item_id = item_id
        self.colorway_id = colorway_id
        self.country_id = country_id
        self.size_group_id = size_group_id

    def get_pack_items(self):
        order_size_group = get_object_or_404(OrderSizeGroup, pk=self.size_group_id)
        order_items = self.get_colorway_type_item_colorway_order_items(item_id=self.item_id,
                                                                       colorway_id=self.colorway_id)
        order_size_ids = order_size_group.sizes.values_list('id', flat=True)
        pack_items = OrderPackItem.objects.filter(
            item__in=order_items,
            pack__colorway_id=self.colorway_id,
            pack__country_id=self.country_id,
            pack__version=self.version,
            pack__size_id__in=order_size_ids
        )
        return pack_items

    def get_fabric_consumption_ratio_status(self, pack_items):
        return not pack_items.filter(fabric_consumption_data_reviewed=False).exists()

    def get_fabric_data(self):
        fabric_data = super().get_fabric_data()
        pack_items = self.get_pack_items()
        pack_item_ids = pack_items.values_list('id', flat=True).distinct()
        pack_placement_materials = self.get_order_pack_item_placement_materials(pack_item_ids)
        fabric_data['data'] = self.sort_placements_by_fabric(pack_placement_materials)
        fabric_data['complete_status'] = self.get_fabric_consumption_ratio_status(pack_items)
        fabric_data['costing_version_state'] = self.version.version_state
        return fabric_data

    def get_consumption_data_object_or_none(self, supplier_inquiry_detail_id, colorway_category_id, customer_brand_material_id):
        filter_params = {
            'item_id': self.item_id,
            'order_colorway_id': self.colorway_id,
            'order_country_id': self.country_id,
            'order_size_group_id': self.size_group_id,
            'version_id': self.version.id,
            'supplier_inquiry_detail_id': supplier_inquiry_detail_id,
            'colorway_category_id': colorway_category_id,
            'customer_brand_fabric_id': customer_brand_material_id,
         }
        object = get_object_or_none(
            ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio,
            filter_params
        ) # TODO - what about colorway type?

        return object


class OrderItemColorwayFabrics(BaseOrderFabric):
    def __init__(self, request, order_id, version_id, item_id, colorway_id, colorway_category_id):
        super().__init__(request, order_id, version_id, colorway_category_id)
        self.colorway_id = colorway_id
        self.item_id = item_id

    def get_pack_items(self):
        order_items = self.get_colorway_type_item_colorway_order_items(self.item_id, self.colorway_id)
        pack_items = OrderPackItem.objects.filter(
            item__in=order_items,
            pack__colorway_id=self.colorway_id,
            pack__version=self.version
        )
        return pack_items

    def get_fabric_data(self):
        fabric_data = super().get_fabric_data()
        pack_items = self.get_pack_items()
        pack_item_ids = pack_items.values_list('id', flat=True).distinct()

        pack_placement_materials = self.get_order_pack_item_placement_materials(pack_item_ids)
        fabric_data['data'] = self.sort_placements_by_fabric(pack_placement_materials)
        
        item_colorway_category_fabric_consumption_complete = ItemColorwayCategoryFabricConsumptionComplete.objects.get_or_create(
            order_colorway_id=self.colorway_id, colorway_category_id=self.colorway_category_id, item_id=self.item_id,
            version=self.version)[0]
        fabric_data['complete_status'] = item_colorway_category_fabric_consumption_complete.fabric_consumption_data_reviewed
        fabric_data['costing_version_state'] = item_colorway_category_fabric_consumption_complete.version.version_state
        return fabric_data

    def get_consumption_data_object_or_none(self, supplier_inquiry_detail_id, colorway_category_id, customer_brand_material_id):
        filter_params = {
            'item_id': self.item_id,
            'order_colorway_id': self.colorway_id,
            'colorway_category_id': colorway_category_id,
            'version_id': self.version.id,
            'supplier_inquiry_detail_id': supplier_inquiry_detail_id,
            'customer_brand_fabric_id': customer_brand_material_id
        }

        object = get_object_or_none(
            ItemColorwayColorwayCategoryFabricConsumptionRatio,
            filter_params
        )  # TODO - what about colorway type?
        return object


class ItemColorwayTypeFabrics(BaseOrderFabric):
    def __init__(self, request, order_id, version_id, item_id, colorway_category_id):
        super().__init__(request, order_id, version_id, colorway_category_id)
        self.item_id = item_id

    def get_pack_item_ids(self):
        pack_item_ids = []

        order_items = OrderItem.objects.filter(item_id=self.item_id)
        for order_item in order_items:
            colorways = order_item.get_colorway_type_colorways(self.colorway_category_id)
            pack_items = OrderPackItem.objects.filter(item=order_item, pack__colorway_id__in=colorways,
                                                      pack__version=self.version).values_list('pk', flat=True)
            pack_item_ids = [*pack_item_ids, *list(pack_items)]

        unique_pack_items_ids = list(set(pack_item_ids))
        return unique_pack_items_ids

    def get_fabric_data(self):
        fabric_data = super().get_fabric_data()
        unique_pack_items_ids = self.get_pack_item_ids()
        pack_placement_materials = self.get_order_pack_item_placement_materials(unique_pack_items_ids)
        fabric_data['data'] = self.sort_placements_by_fabric(pack_placement_materials)
        fabric_data['complete_status'] = ItemColorwayTypeFabricConsumptionComplete.objects.get_or_create(
            colorway_category_id=self.colorway_category_id, item_id=self.item_id,
            version=self.version)[0].fabric_consumption_data_reviewed
        return fabric_data

    def get_consumption_data_object_or_none(self, supplier_inquiry_detail_id, colorway_category_id, customer_brand_material_id):
        filter_params = {
            'item_id': self.item_id,
            'colorway_category_id': colorway_category_id, #self.colorway_category_id,
            'version_id': self.version.id,
            'supplier_inquiry_detail_id': supplier_inquiry_detail_id,
            'customer_brand_fabric_id': customer_brand_material_id,
        }
        object = get_object_or_none(
            ItemColorwayCategoryFabricConsumptionRatio,
            filter_params
        )
        return object

    def get_colorway_size_display_value(self, colorway_size_dict_list):
        colorway_grouped_data = {}
        for colorway_size_dict in colorway_size_dict_list:
            if not colorway_grouped_data.get(colorway_size_dict[self.ORDER_COLORWAY_ID_KEY], None):
                colorway_grouped_data[colorway_size_dict[self.ORDER_COLORWAY_ID_KEY]] = {'colorway_name': colorway_size_dict[self.COLORWAY_NAME_KEY],'cw_sizes': []}
            colorway_grouped_data[colorway_size_dict[self.ORDER_COLORWAY_ID_KEY]]['cw_sizes'].append(colorway_size_dict)

        cw_size_data = []
        for key, cw_size_dict in colorway_grouped_data.items():
            cw_size_dict_list = cw_size_dict['cw_sizes']
            data = sorted(cw_size_dict_list, key=lambda dict: dict[self.SIZE_DISPLAY_ORDER_KEY])
            combined_sizes = ', '.join([row[self.SIZE_NAME_KEY] for row in data])
            cw_size_data.append(str(cw_size_dict['colorway_name']) + ' (' + str(combined_sizes) + ')')
        return ', '.join(cw_size_data)


class PackItemCadInterfacePlacementMaterial(CadInterfacePlacementMaterialMixin, PackItemPlacementInfoMixin):

    def __init__(self, request, order_id, order_colorway_id, order_country_id, order_item_id, order_size_group_id, version_id):
        self.order = get_object_or_404(OrderInquiry, pk=order_id)
        self.version = get_object_or_404(OrderCostingVersion, pk=version_id, order_id=order_id)
        self.request = request
        self.order_colorway_id = order_colorway_id
        self.order_country_id = order_country_id
        self.order_item_id = order_item_id
        self.order_size_group_id = order_size_group_id

    def get_consumption_ratio_object(self, placement_material_id, material):
        consumption = None
        # If fabric the logic is different
        if material != Material.FABRIC_MATERIAL:
            consumption = get_object_or_none(OrderPackItemPlacementMaterialConsumption, {
                'pack_item_placement_material_id':placement_material_id,
            })
        return consumption

    def get_fabric_consumption_ratio_object(self, pack_item_id, variation_id, supplier_inquiry_id):
        consumption = get_object_or_none(
            PackItemFabricConsumptionRatio,
            {
                'pack_item_id': pack_item_id,
                'fabric_variation_id': variation_id,
                'supplier_inquiry__order': self.order,
                'supplier_inquiry_id': supplier_inquiry_id,
            }
        )
        return consumption

    def add_supplier_data_for_fabrics(self, sorted_data):
        fabric_cad_data = []
        # fabric_inquiries = SupplierInquiry.objects.filter(order=self.order, variation_id=variation_id)

        for data in sorted_data:
            variation_id = data['variation_id']
            if variation_id:
                supplier_inquiries = SupplierInquiry.objects.filter(
                    order=self.order,
                    variation_id=variation_id,
                    has_supplier_feedback=True
                ).prefetch_related('supplierinquirymaterialdetail')

                if not supplier_inquiries.exists():
                    data[self.SUPPLIER_DISPLAY_VALUE_KEY] = "N/A"
                    data[self.CUTTING_WIDTH_KEY] = "N/A"
                    data[self.CONSUMPTION_DATA_KEY] = {'has_data': False}
                    fabric_cad_data.append(data)

                for supplier_inquiry in supplier_inquiries:
                    data_copy = {**data}
                    data_copy[self.SUPPLIER_DISPLAY_VALUE_KEY] = supplier_inquiry.supplier.name
                    data_copy[self.SUPPLIER_ID_KEY] = supplier_inquiry.supplier_id
                    data_copy[self.CUTTING_WIDTH_KEY] = supplier_inquiry.supplierinquirymaterialdetail.cutting_width
                    data_copy[self.SUPPLIER_INQUIRY_ID_KEY] = supplier_inquiry.pk
                    fabric_cad_data.append(data_copy)
                    for pack_id, values in data[self.CONSUMPTION_DATA_KEY].items():
                        consumption_data = self.get_fabric_consumption_ratio_object(
                            values['pack_item_id'],
                            variation_id,
                            supplier_inquiry.pk,
                        )
                        if consumption_data:
                            data[self.CONSUMPTION_DATA_KEY][pack_id]['consumption_ratio'] = consumption_data.costing_consumption_ratio
                            data[self.CONSUMPTION_DATA_KEY][pack_id]['wastage'] = consumption_data.wastage

        return fabric_cad_data

    def group_fabric_placements_by_variation_id(self, data):
        grouped_data = {}
        for row in data:
            variation_id = row.get('variation_id')

            if not grouped_data.get(variation_id, None):
                if not grouped_data.get(variation_id, None):
                    row_copy = {**row}
                    row_copy.pop(self.CONSUMPTION_DATA_KEY)
                    grouped_data[variation_id] = {
                        'placements': [],
                        self.CONSUMPTION_DATA_KEY: {},
                        'order_placement_material_id': [],
                        **row_copy,
                    }
            grouped_data[variation_id]['placements'].append(row.pop('placement', 'N/A'))
            consumption_data = row[self.CONSUMPTION_DATA_KEY]
            for pack_id, consumption in consumption_data.items():
                grouped_data[variation_id]['order_placement_material_id'].append(consumption['order_placement_material_id'])
                grouped_data[variation_id][self.CONSUMPTION_DATA_KEY][consumption.get('pack_id')] = consumption
                if not grouped_data[variation_id][self.CONSUMPTION_DATA_KEY][consumption.get('pack_id')].get('pack_item_id', None):
                    pack_item_placement = OrderPackItemPlacementMaterial.objects.get(
                        pk=consumption['order_placement_material_id'],
                        placement__order_pack_item__pack_id=consumption.get('pack_id')
                    )
                    grouped_data[variation_id][self.CONSUMPTION_DATA_KEY][consumption.get('pack_id')]['pack_item_id'] = pack_item_placement.placement.order_pack_item.id
        # Sort consumption ratios
        sorted_data = grouped_data.values()
        for data in sorted_data:
            consumption_data = data[self.CONSUMPTION_DATA_KEY]
            data[self.CONSUMPTION_DATA_KEY] = self.sort_consumption_data(consumption_data.values())
        sorted_data = self.add_supplier_data_for_fabrics(sorted_data)

        return sorted_data

    def get_pack_item_placement_material_info(self, order_pack_items):
        pack_item_placements_list = []
        for order_pack_item in order_pack_items:
            pack_item_placements = order_pack_item.orderpackitemplacement_set.all().prefetch_related(
                'orderpackitemplacementmaterial',
                'item_attribute_other',
                'orderpackitemplacementmaterial__material',
                'orderpackitemplacementmaterial__material__material_code',
                'orderpackitemplacementmaterial__material__material_detail__generic_material',
                'orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption'
            )
            data = self.get_placement_materials_info(pack_item_placements)
            data['order_pack_id'] = order_pack_item.pack_id
            pack_item_placements_list.append(data)
        return pack_item_placements_list

    def pop_key_from_dict(self, dictionary, key):
        dictionary.pop(key)

    def get_placement_material_details(self):
        order_sizes = get_object_or_404(OrderSizeGroup, pk=self.order_size_group_id, order_id=self.order.pk).sizes.all().values_list('id', flat=True)
        order_pack_items = OrderPackItem.objects.filter(
            item_id=self.order_item_id,
            pack__colorway_id=self.order_colorway_id,
            pack__country_id=self.order_country_id,
            pack__size_id__in=order_sizes,
            pack__version=self.version,
            pack__version__order=self.order
        )
        # int:order_id>/<int:version_id>/<int:order_colorway_id>/<int:order_country_id>/<int:order_size_group_id
        complete_status = not order_pack_items.filter(consumption_data_reviewed=False).exists()
        self.pack_ids = list(order_pack_items.values_list('pack_id', flat=True))

        pack_item_info = self.get_pack_item_placement_material_info(order_pack_items)
        response_data, display_names = self.group_placements(pack_item_info)
        cad_data = self.flatten_dictionary(response_data, display_names)

        if cad_data.get(Material.FABRIC_MATERIAL, {}).get('data', None):
            self.pop_key_from_dict(cad_data, Material.FABRIC_MATERIAL)
            # cad_data.pop(Material.FABRIC_MATERIAL)
        return {'cad_data': cad_data, 'complete_status': complete_status}

    def get_order_placement_id(self, data):
        return data.get('pack_item_placement_id', None)


class PackCadInterfacePlacementMaterial(CadInterfacePlacementMaterialMixin, PackPlacementInfoMixin):

    def __init__(self, request, order_id, order_colorway_id, order_country_id, order_size_group_id, version_id):
        self.order = get_object_or_404(OrderInquiry, pk=order_id)
        self.version = get_object_or_404(OrderCostingVersion, pk=version_id, order=self.order)
        self.request = request
        self.order_colorway_id = order_colorway_id
        self.order_country_id = order_country_id
        self.order_size_group_id = order_size_group_id

    def get_pack_item_placement_material_info(self, order_packs):
        pack_placements_list = []
        for order_pack in order_packs:
            pack_item_placements = order_pack.orderpackplacement_set.all().prefetch_related(
                'orderpackplacementmaterial',
                'orderpackplacementmaterial__material',
                'orderpackplacementmaterial__material__material_code',
                'item_attribute_other',
                'orderpackplacementmaterial__material__material_detail__generic_material',
                'orderpackplacementmaterial__orderpackplacementmaterialconsumption',
            )

            data = self.get_placement_materials_info(pack_item_placements)
            data['order_pack_id'] = order_pack.id
            pack_placements_list.append(data)
        return pack_placements_list

    def get_consumption_ratio_object(self, placement_material_id, material):
        consumption = None
        # If fabric the logic is different
        if material != Material.FABRIC_MATERIAL:
            consumption = get_object_or_none(OrderPackPlacementMaterialConsumption, {
                'pack_placement_material_id':placement_material_id,
            })
        return consumption

    def get_placement_material_details(self):
        order_sizes = get_object_or_404(OrderSizeGroup, pk=self.order_size_group_id, order_id=self.order.pk).sizes.all().values_list('id', flat=True)
        order_packs = OrderPack.objects.filter(
            colorway_id=self.order_colorway_id,
            country_id=self.order_country_id,
            size_id__in=order_sizes,
            version__order=self.order,
            version=self.version
        )
        complete_status = not order_packs.filter(consumption_data_reviewed=False).exists()
        self.pack_ids = list(order_packs.values_list('id', flat=True))

        pack_item_info = self.get_pack_item_placement_material_info(order_packs)
        response_data, display_names = self.group_placements(pack_item_info)
        cad_data = self.flatten_dictionary(response_data, display_names)
        return {'cad_data': cad_data, 'complete_status': complete_status}

    def get_order_placement_id(self, data):
        return data.get('pack_placement_id', None)


class CombinedCostingPackItemInterface(PackItemCadInterfacePlacementMaterial):
    PLACEMENT_MATERIAL_INQUIRY_CONSUMPTION_DATA_KEY = 'supplier_inquiry_material_cost_data'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order_supplier_inquiries = SupplierInquiry.objects.filter(order=self.order)
        self.include_supplier_inquiries = True

    def pop_key_from_dict(self, dictionary, key):
        if key == Material.FABRIC_MATERIAL:
            self.material_data = dictionary.pop(key)

    def get_consumption_data_for_inquiry(self, consumption_data, inquiry):
        placement_material_ids = [ placement_material_data.get('order_placement_material_id', None) for placement_material_data in consumption_data.values()]
        placement_materials = OrderPackItemPlacementMaterial.objects.filter(pk__in=placement_material_ids)

        inquiry_consumption_data = copy.deepcopy(consumption_data)
        for key, value in consumption_data.items():
            for placement_material in placement_materials:
                consumption_object = placement_material.placement.get_material_consumption_object()
                total = None
                if consumption_object:
                    total = consumption_object.calculate_cost_for_supplier_inquiry(inquiry)
                    inquiry_consumption_data[key]['total_cost'] = total
        return inquiry_consumption_data

    def get_supplier_data_for_material(self, customer_brand_material_id, consumption_data):
        inquiries = self.order_supplier_inquiries.filter(order=self.order, customer_brand_material_id=customer_brand_material_id)
        inquiry_data = []
        for inquiry in inquiries:
            inquiry_attributes = inquiry.get_attributes()
            consumption_cost_data = self.get_consumption_data_for_inquiry(consumption_data, inquiry)
            inquiry_attributes[self.PLACEMENT_MATERIAL_INQUIRY_CONSUMPTION_DATA_KEY] = consumption_cost_data
            inquiry_data.append(inquiry_attributes)
        return inquiry_data


    def add_supplier_data_to_cad_data(self, cad_data):
        for material_type, material_values in cad_data.items():
            material_data = material_values.get('data', [])
            for material_row in material_data:
                material_id = material_row[self.MATERIAL_ID_KEY]
                consumption_data = material_row.get(self.CONSUMPTION_DATA_KEY, {})

                inquiry_data = self.get_supplier_data_for_material(material_id, consumption_data)
                material_row['supplier_inquiries'] = inquiry_data

    # Overriding this to return empty list. The headers will be added in the expand header tab
    def append_sizes_to_headers(self):
        return []

    def get_supplier_headers(self):
        return get_supplier_quote_meta_data(False)

    def get_placement_material_details(self):
        material_data = super().get_placement_material_details()
        fabric_data = self.material_data

        material_cad_data = material_data.get('cad_data', None)
        self.add_supplier_data_to_cad_data(material_cad_data)
        material_data['supplier_inquiry_headers'] = self.get_supplier_headers()
        material_data['size_headers'] = super().append_sizes_to_headers()
        return material_data


class CombinedCostingPackCadInterfacePlacementMaterial(PackCadInterfacePlacementMaterial):
    pass


class FabricOtherWidthCalculation():

    po_club = None

    def __init__(self, po_club):
        self.po_club = po_club
    
    def get_narrow_width_marker_re_order_quantity(self, po_club_cut_instruction):
        re_order_quantity = 0
        narrow_width_marker = po_club_cut_instruction.marker
        booking_width_marker = narrow_width_marker.derived_from_marker
        if booking_width_marker:
            booking_width_marker_consumption = booking_width_marker.consumption_ratio + (booking_width_marker.consumption_ratio*booking_width_marker.wastage/100)
        else:
            booking_width_marker_consumption = 1
        narrow_width_fabric_length = narrow_width_marker.marker_length*po_club_cut_instruction.ply_count
        narrow_width_marker_consuption = narrow_width_marker.consumption_ratio + (narrow_width_marker.consumption_ratio*narrow_width_marker.wastage/100)
        pcs_from_narrow_width_marker = int(narrow_width_fabric_length/narrow_width_marker_consuption)
        pcs_from_booking_width_marker = int(narrow_width_fabric_length/booking_width_marker_consumption)

        re_order_quantity = (pcs_from_booking_width_marker - pcs_from_narrow_width_marker)*booking_width_marker_consumption

        return re_order_quantity
    
    def get_po_club_material_re_order_quantity(self, material):

        po_club_cut_instructions = POClubCutInstruction.objects.filter(marker__po_material=material, marker__actual_club=self.po_club)
        re_order_quantity = 0
        for po_club_cut_instruction in po_club_cut_instructions:
            re_order_quantity += self.get_narrow_width_marker_re_order_quantity(po_club_cut_instruction)
        re_order_quantity = ceil(re_order_quantity)
        return re_order_quantity