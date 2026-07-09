from django.urls import resolve
from rest_framework.reverse import reverse

from marketing.models import PackItemService, PackItemWashService, EmbellishmentServiceDetail, \
    PackItemEmbellishmentService, SupplierPOGRNMaterial, SupplierPOGRNMaterialDetail, FabricGRNDetail, SupplierPOGRN, PurchaseOrderBom, PurchaseOrderAllocatedMaterial
from materials.models import UserDefinedMaterial, UserDefinedMaterialAttribute, Material, \
    SupplierInquiry, SupplierInquiryDetail, CustomerBrandMaterialCode, PACKAGING_TYPES, CustomerBrandMaterial, \
    GenericMaterialVariation, FabricColorTone
from shared.models import InHouseMaterial
from materials.utils.material_utils import is_user_defined_material, PerMeasuringUnitHelper, MaterialUnitHelper
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from operator import itemgetter

DECIMAL_TYPE = 'decimal'
CHARACTER_TYPE = 'character'
TEXT_TYPE = 'text'
BOOLEAN_TYPE = 'boolean'
INTEGER_TYPE = 'integer'
DROPDOWN_TYPE = 'dropdown'
DROPDOWN_CREATE_TYPE = 'dropdown_create'

ATTRIBUTE_DISPLAY_VALUE_KEY = 'name'
ATTRIBUTE_VALUE_KEY = 'value'
ATTRIBUTE_TYPE_KEY = 'attribute_type'# integer, dropdown etc
MATERIAL_VARIATION_KEY = 'is_material_variation'
IS_PO_EDITABLE_FIELD_KEY = 'is_po_editable'
IS_GRN_FIELD_KEY = 'is_grn_field'

HEADER_LABEL_KEY = 'label'
READ_ONLY_KEY = 'isReadOnly'
IS_EDITABLE = 'isEditable'
IS_VISIBLE = 'is_visible'
DROPDOWN_OPTIONS_KEY = 'dropDownOptions'
OPTION_DISPLAY_VALUE_KEY = 'optionDisplayField'
OPTION_VALUE_KEY = 'optionValueField'
IS_ACTION_KEY = 'isAction'
DROPDOWN_OPTIONS_META_URL = 'dropDownOptionsURL'
IS_ATTACHMENT_FIELD_KEY = 'is_attachment'
ATTACHMENT_FIELD_KEY = 'attachment_field_name'
IS_REFERENCE_CODE_KEY = 'is_reference_code'

DISPLAY_SORT_ORDER_KEY = 'display_sort_order'


def get_supplier_quote_meta_data(include_ratios=True):
    data = [

        {
            HEADER_LABEL_KEY: "Supplier",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'supplier',
            ATTRIBUTE_VALUE_KEY: 'supplier',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        {
            HEADER_LABEL_KEY: "EX Work Price",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'ex_work_price',
            ATTRIBUTE_VALUE_KEY: 'ex_work_price',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },

        {
            HEADER_LABEL_KEY: "FOB Price",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'fob_price',
            ATTRIBUTE_VALUE_KEY: 'fob_price',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        {
            HEADER_LABEL_KEY: "CIF Price",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'cif_price',
            ATTRIBUTE_VALUE_KEY: 'cif_price',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        {
            HEADER_LABEL_KEY: "Transport Charge",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'transport_charges',
            ATTRIBUTE_VALUE_KEY: 'transport_charges',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        {
            HEADER_LABEL_KEY: "Lead Time in Number of Days",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'lead_time',
            ATTRIBUTE_VALUE_KEY: 'lead_time',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        # {
        #     HEADER_LABEL_KEY: "Ship Mode",
        #     ATTRIBUTE_DISPLAY_VALUE_KEY: 'ship_mode',
        #     ATTRIBUTE_VALUE_KEY: 'ship_mode',
        #     ATTRIBUTE_TYPE_KEY: "donotdisplay",
        # },
        # {
        #     HEADER_LABEL_KEY: "Pay Mode",
        #     ATTRIBUTE_DISPLAY_VALUE_KEY: 'pay_mode',
        #     ATTRIBUTE_VALUE_KEY: 'pay_mode',
        #     ATTRIBUTE_TYPE_KEY: "donotdisplay",
        # },
        {
            HEADER_LABEL_KEY: "Cost Per Unit",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.COST_PER_UNIT_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.COST_PER_UNIT_KEY,
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        {
            HEADER_LABEL_KEY: "Costing Units",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.COSTING_UNIT_DISPLAY_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.COSTING_UNIT_KEY,
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },

    ]
    if include_ratios:
        data = [
            *data,
            {
                HEADER_LABEL_KEY: "Consumption Ratio",
                ATTRIBUTE_DISPLAY_VALUE_KEY: 'costing_consumption_ratio',
                ATTRIBUTE_VALUE_KEY: 'costing_consumption_ratio',
                ATTRIBUTE_TYPE_KEY: "donotdisplay",
            },
            {
                HEADER_LABEL_KEY: "Wastage",
                ATTRIBUTE_DISPLAY_VALUE_KEY: 'wastage',
                ATTRIBUTE_VALUE_KEY: 'wastage',
                ATTRIBUTE_TYPE_KEY: "donotdisplay",
            },
            # {
            #     HEADER_LABEL_KEY: "Sub Total",
            #     ATTRIBUTE_DISPLAY_VALUE_KEY: 'sub_total',
            #     ATTRIBUTE_VALUE_KEY: 'sub_total',
            #     ATTRIBUTE_TYPE_KEY: "donotdisplay",
            # },
            {
                HEADER_LABEL_KEY: "Total",
                ATTRIBUTE_DISPLAY_VALUE_KEY: 'total',
                ATTRIBUTE_VALUE_KEY: 'total',
                ATTRIBUTE_TYPE_KEY: "donotdisplay",
            },
        ]
    return data

def get_supplier_inquiry_quote_meta_data():
    data = get_supplier_quote_meta_data()
    data = [*data, {
            HEADER_LABEL_KEY: "Ship Mode",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'ship_mode',
            ATTRIBUTE_VALUE_KEY: 'ship_mode',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        },
        {
            HEADER_LABEL_KEY: "Pay Mode",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'pay_mode',
            ATTRIBUTE_VALUE_KEY: 'pay_mode',
            ATTRIBUTE_TYPE_KEY: "donotdisplay",
        }]
    return data
# def get_fabric_meta_data():
#     data = [
#         {
#             HEADER_LABEL_KEY: "Description/ Texture",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: Fabric.TEXTURE_KEY,
#             ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
#             DROPDOWN_OPTIONS_KEY: [],
#             ATTRIBUTE_VALUE_KEY: Fabric.TEXTURE_ID_KEY,
#             OPTION_DISPLAY_VALUE_KEY: "name",
#             OPTION_VALUE_KEY: "id"
#         },
#         {
#             HEADER_LABEL_KEY: "Composition",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: Fabric.COMPOSITION_KEY,
#             ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
#             DROPDOWN_OPTIONS_KEY: [],
#             ATTRIBUTE_VALUE_KEY: Fabric.COMPOSITION_ID_KEY,
#             OPTION_DISPLAY_VALUE_KEY: "name",
#             OPTION_VALUE_KEY: "id"
#         },
#         {
#             HEADER_LABEL_KEY: "GSM",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: Fabric.GSM_KEY,
#             ATTRIBUTE_TYPE_KEY: INTEGER_TYPE,
#             ATTRIBUTE_VALUE_KEY: Fabric.GSM_KEY
#         },
#         {
#             HEADER_LABEL_KEY: "Color",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: Fabric.COLOR_KEY,
#             "isVariation": True,
#             ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
#             ATTRIBUTE_VALUE_KEY: Fabric.COLOR_KEY
#         },
#         {
#             HEADER_LABEL_KEY: "Fabric Type",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: Fabric.VARIATION_DISPLAY_TYPE_KEY,
#             "isVariation": True,
#             ATTRIBUTE_TYPE_KEY: "dropdown",
#             DROPDOWN_OPTIONS_KEY: [],
#             ATTRIBUTE_VALUE_KEY: Fabric.VARIATION_TYPE_KEY,
#             OPTION_DISPLAY_VALUE_KEY: "name",
#             OPTION_VALUE_KEY: "id"
#         },
#
#     ]
#     return data


def get_userdefined_material_meta_data(material):
    attributes = material.userdefinedmaterialattribute_set.filter(active=True)
    meta_data = []

    for attribute in attributes:
        data = {
            HEADER_LABEL_KEY: attribute.label,
            ATTRIBUTE_DISPLAY_VALUE_KEY: attribute.name,
            ATTRIBUTE_TYPE_KEY: attribute.attribute_type,
            ATTRIBUTE_VALUE_KEY: attribute.name,
            MATERIAL_VARIATION_KEY: attribute.is_material_variation,
            IS_PO_EDITABLE_FIELD_KEY: attribute.po_editable,
            IS_GRN_FIELD_KEY: attribute.is_grn_field
        }

        if attribute.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
            data[ATTRIBUTE_DISPLAY_VALUE_KEY] = attribute.get_display_value_field_name()
            data[attribute.name] = {DROPDOWN_OPTIONS_META_URL: settings.APPLICATION_URL + reverse('materials:material-attribute-dropdown-options', args=[attribute.pk])}
            data[OPTION_DISPLAY_VALUE_KEY] = 'display_value'
            data[OPTION_VALUE_KEY] = 'id'
        meta_data.append(data)

    return meta_data


# def get_pack_item_placement_fabric_meta_data():
#     data = [
#         {
#             HEADER_LABEL_KEY: "Placement",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: "placement",
#             ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
#             ATTRIBUTE_VALUE_KEY: "placement",
#             READ_ONLY_KEY: True
#         },
#         {
#             HEADER_LABEL_KEY: "Material Reference Code",
#             ATTRIBUTE_DISPLAY_VALUE_KEY: 'reference_code',
#             ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
#             ATTRIBUTE_VALUE_KEY: CustomerBrandGenericMaterialCode.REFERENCE_CODE_API_KEY,
#         },
#         *get_fabric_meta_data(),
#
#     ]
#     return data, "Fabric"


def get_user_defined_material_meta_data(user_defined_material_name, include_size_header=False):
    material = UserDefinedMaterial.objects.get(name=user_defined_material_name)
    if material.category == PACKAGING_TYPES:
        label_key = 'Packaging Item Name'
    else:
        label_key = 'Placement'
        
    meta_data = [
        {
            HEADER_LABEL_KEY: label_key,
            ATTRIBUTE_DISPLAY_VALUE_KEY: "placement",
            ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
            ATTRIBUTE_VALUE_KEY: "placement",
            READ_ONLY_KEY: True
        },
        {
            HEADER_LABEL_KEY: "Material Reference Code",
            ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
            ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
            ATTRIBUTE_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
            IS_REFERENCE_CODE_KEY: True,
        },
        *get_userdefined_material_meta_data(material)
    ]
    meta_data = [*meta_data, ]
    return meta_data, material.material


def get_pack_item_placement_material_metadata(material_name, include_size_header=False):
    metadata = []
    material_display_name = None

    if is_user_defined_material(material_name):
        metadata, material_display_name = get_user_defined_material_meta_data(material_name, include_size_header)
    return metadata, material_display_name


def get_fabric_headers():
        headers = [
        {
            HEADER_LABEL_KEY: "Composition",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'composition',
            ATTRIBUTE_VALUE_KEY: 'composition',
        },
        {
            HEADER_LABEL_KEY: "Texture",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'texture',
            ATTRIBUTE_VALUE_KEY: 'texture',
        },
        {
            HEADER_LABEL_KEY: "GSM",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'gsm',
            ATTRIBUTE_VALUE_KEY: 'gsm',
        },
        {
            HEADER_LABEL_KEY: "Color",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'color',
            ATTRIBUTE_VALUE_KEY: 'color',
        },
        {
            HEADER_LABEL_KEY: "Variation",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'variation_display_type',
            ATTRIBUTE_VALUE_KEY: 'variation_display_type',
        },
        {
            HEADER_LABEL_KEY: "Reference Code",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'reference_code',
            ATTRIBUTE_VALUE_KEY: 'reference_code',
        },
        ]
        return headers


def get_user_defined_material_headers(user_defined_material_name):
    try:
        material = UserDefinedMaterial.objects.get(name=user_defined_material_name)
        attributes = material.userdefinedmaterialattribute_set.filter(active=True)

        headers = [
        {
            HEADER_LABEL_KEY: "Category",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'category',
            ATTRIBUTE_VALUE_KEY: material.category,
        },
        {
            HEADER_LABEL_KEY: "Material",
            ATTRIBUTE_DISPLAY_VALUE_KEY: 'material',
            ATTRIBUTE_VALUE_KEY: material.material,
        },
        {
            HEADER_LABEL_KEY: "Material Reference Code",
            ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
            ATTRIBUTE_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
        },
        {
            HEADER_LABEL_KEY: "Attachments",
            ATTACHMENT_FIELD_KEY: CustomerBrandMaterial.ATTACHMENT_KEY,
            ATTRIBUTE_VALUE_KEY: CustomerBrandMaterial.ATTACHMENT_KEY,
            IS_ATTACHMENT_FIELD_KEY: True
        },
        ]

        for attribute in attributes:
            data = {
                HEADER_LABEL_KEY: attribute.label,
                ATTRIBUTE_DISPLAY_VALUE_KEY: attribute.name,
                ATTRIBUTE_VALUE_KEY: attribute.name,
            }

            if attribute.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
                data[ATTRIBUTE_DISPLAY_VALUE_KEY] = attribute.get_display_value_field_name()
                data[attribute.name] = {DROPDOWN_OPTIONS_META_URL: settings.APPLICATION_URL + reverse('materials:material-attribute-dropdown-options', args=[attribute.pk])}
                data[OPTION_DISPLAY_VALUE_KEY] = 'display_value'
                data[OPTION_VALUE_KEY] = 'id'
            headers.append(data)
        return headers
    except ObjectDoesNotExist:
        return []


def get_supplier_inquiry_headers():
    headers = [
        {
            HEADER_LABEL_KEY: "Selected",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.SELECTED_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.SELECTED_KEY,
        },

        {
            HEADER_LABEL_KEY: "Supplier",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.SUPPLIER_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.SUPPLIER_ID_KEY,
        },
        {
            HEADER_LABEL_KEY: "Units",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.UNIT_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.UNIT_ID_KEY,
        },
        {
            HEADER_LABEL_KEY: "Cost Per Unit",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.COST_PER_UNIT_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.COST_PER_UNIT_KEY,
        },
        {
            HEADER_LABEL_KEY: "FOB Price",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.FOB_PRICE_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.FOB_PRICE_KEY,
        },
        {
            HEADER_LABEL_KEY: "CIF Price",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.CIF_PRICE_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.CIF_PRICE_KEY,
        },
        # {
        #     HEADER_LABEL_KEY: "Freight Charge",
        #     ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.FREIGHT_CHARGE_KEY,
        #     ATTRIBUTE_VALUE_KEY: SupplierInquiry.FREIGHT_CHARGE_KEY,
        # },
        {
            HEADER_LABEL_KEY: "Total",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.TOTAL_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.TOTAL_KEY,
        },
        {
            HEADER_LABEL_KEY: "Has Supplier Feedback",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.HAS_SUPPLIER_FEEDBACK_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.HAS_SUPPLIER_FEEDBACK_KEY,
        },
        {
            HEADER_LABEL_KEY: "Customer Brand Material",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.CUSTOMER_BRAND_MATERIAL_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.CUSTOMER_BRAND_MATERIAL_ID_KEY,
        },
        {
            HEADER_LABEL_KEY: "Ship Mode",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.SHIP_MODE_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.SHIP_MODE_KEY,
        },
        {
            HEADER_LABEL_KEY: "Pay Mode",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiry.PAY_MODE_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiry.PAY_MODE_KEY,
        },
    ]
    return headers


def get_supplier_inquiry_detail_headers():
    headers = [
        {
            HEADER_LABEL_KEY: "Cutting Width",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiryDetail.CUTTING_WIDTH_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiryDetail.CUTTING_WIDTH_KEY,
        },
        {
            HEADER_LABEL_KEY: "Cutting Width Units",
            ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierInquiryDetail.CUTTING_WIDTH_UNITS_KEY,
            ATTRIBUTE_VALUE_KEY: SupplierInquiryDetail.CUTTING_WIDTH_UNITS_KEY,
        },
    ]
    return headers


def get_wash_headers():
    headers = [
        {
            HEADER_LABEL_KEY: "Details",
            ATTRIBUTE_DISPLAY_VALUE_KEY: PackItemWashService.WASH_TECHNIQUE_KEY,
            ATTRIBUTE_VALUE_KEY: PackItemWashService.WASH_TECHNIQUE_KEY,
        },
        {
            HEADER_LABEL_KEY: "Country",
            ATTRIBUTE_DISPLAY_VALUE_KEY: PackItemWashService.COUNTRY_KEY,
            ATTRIBUTE_VALUE_KEY: PackItemWashService.COUNTRY_KEY,
        },
        {
            HEADER_LABEL_KEY: "Colorway",
            ATTRIBUTE_DISPLAY_VALUE_KEY: PackItemWashService.COLORWAY_KEY,
            ATTRIBUTE_VALUE_KEY: PackItemWashService.COLORWAY_KEY,
        },
        {
            HEADER_LABEL_KEY: "Size",
            ATTRIBUTE_DISPLAY_VALUE_KEY: PackItemWashService.SIZE_KEY,
            ATTRIBUTE_VALUE_KEY: PackItemWashService.SIZE_KEY,
        },
    ]
    return headers


def get_embellishment_headers():
    headers = [
        # {
        #     HEADER_LABEL_KEY: "Id",
        #     ATTRIBUTE_DISPLAY_VALUE_KEY: EmbellishmentServiceDetail.PK_EMBELLISHMENT_SERVICE_DETAIL_ID_KEY,
        #     ATTRIBUTE_VALUE_KEY: EmbellishmentServiceDetail.PK_EMBELLISHMENT_SERVICE_DETAIL_ID_KEY,
        # },
        {
            HEADER_LABEL_KEY: "Type",
            ATTRIBUTE_DISPLAY_VALUE_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_TYPE_KEY,
            ATTRIBUTE_VALUE_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_TYPE_ID_KEY,
        },

        {
            HEADER_LABEL_KEY: "Sub Type",
            ATTRIBUTE_DISPLAY_VALUE_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_SUB_TYPE_KEY,
            ATTRIBUTE_VALUE_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_SUB_TYPE_ID_KEY,
        },

        # {
        #     HEADER_LABEL_KEY: "Grading",
        #     ATTRIBUTE_DISPLAY_VALUE_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_GRADING_KEY,
        #     ATTRIBUTE_VALUE_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_GRADING_KEY,
        # },
        {
            HEADER_LABEL_KEY: "Embellishment Size",
            ATTRIBUTE_DISPLAY_VALUE_KEY: PackItemEmbellishmentService.EMBELLISHMENT_SIZE_KEY,
            ATTRIBUTE_VALUE_KEY: PackItemEmbellishmentService.EMBELLISHMENT_SIZE_KEY,
        },
        {
            HEADER_LABEL_KEY: "Embellishment Attachment",
            ATTACHMENT_FIELD_KEY: EmbellishmentServiceDetail.EMBELLISHMENT_ATTACHMENT_KEY,
            IS_ATTACHMENT_FIELD_KEY: True
        },

        {
            HEADER_LABEL_KEY: "Item Embellishment Attachment",
            ATTACHMENT_FIELD_KEY: PackItemEmbellishmentService.PACK_ITEM_EMBELLISHMENT_ATTACHMENT_KEY,
            IS_ATTACHMENT_FIELD_KEY: True
        },
    ]
    return headers


def get_services_headers():

    headers = {
        PackItemService.WASH_SERVICE_TYPE: get_wash_headers(),
        PackItemService.EMBELLISHMENT_SERVICE_TYPE: get_embellishment_headers(),
    }
    return headers


def get_grn_meta_material_headers():
    headers = [
    {
        HEADER_LABEL_KEY: "Material",
        ATTRIBUTE_DISPLAY_VALUE_KEY: 'material_label',
        ATTRIBUTE_VALUE_KEY: 'material_label',
    },
    {
        HEADER_LABEL_KEY: "Ritz Reference Code",
        ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
        ATTRIBUTE_VALUE_KEY: CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
    },
    {
        HEADER_LABEL_KEY: "Material Reference Code",
        ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
        ATTRIBUTE_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Total Expected Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
    },
    {
        HEADER_LABEL_KEY: "Total Expected Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_UNITS_VALUE_KEY,
        OPTION_VALUE_KEY: 'value',
    },
    {
        HEADER_LABEL_KEY: "Actual Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Actual Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Barcode",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.BARCODE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.BARCODE_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Attachments",
        ATTACHMENT_FIELD_KEY: CustomerBrandMaterial.ATTACHMENT_KEY,
        ATTRIBUTE_VALUE_KEY: CustomerBrandMaterial.ATTACHMENT_KEY,
        IS_ATTACHMENT_FIELD_KEY: True
    },
    ]
    return headers


def get_grn_headers(supplier_po_grn):
    headers = [
    {
        HEADER_LABEL_KEY: "Material",
        ATTRIBUTE_DISPLAY_VALUE_KEY: 'material_label',
        ATTRIBUTE_VALUE_KEY: 'material_label',
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE
    },
    {
        HEADER_LABEL_KEY: "Ritz Reference Code",
        ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
        ATTRIBUTE_VALUE_KEY: CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE
    },
    {
        HEADER_LABEL_KEY: "Material Reference Code",
        ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
        ATTRIBUTE_VALUE_KEY: CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE
    },
    {
        HEADER_LABEL_KEY: "Total Expected Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
    },
    {
        HEADER_LABEL_KEY: "Total Expected Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterial.TOTAL_EXPECTED_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS],
        OPTION_DISPLAY_VALUE_KEY: 'display_value',
        OPTION_VALUE_KEY: 'value',
    },
    {
        HEADER_LABEL_KEY: "GRN Price",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterial.GRN_PRICE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterial.GRN_PRICE_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
    },
    {
        HEADER_LABEL_KEY: "Attachments",
        ATTACHMENT_FIELD_KEY: SupplierPOGRNMaterial.ATTACHMENT_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterial.ATTACHMENT_KEY,
        IS_ATTACHMENT_FIELD_KEY: True,
    },
    ]
    return headers


def get_userdefined_material_grn_field_data(material):
    attributes = material.get_grn_fields()
    meta_data = []

    for attribute in attributes:
        data = {
            HEADER_LABEL_KEY: attribute.label,
            ATTRIBUTE_DISPLAY_VALUE_KEY: attribute.name,
            ATTRIBUTE_TYPE_KEY: attribute.attribute_type,
            ATTRIBUTE_VALUE_KEY: attribute.name,
            MATERIAL_VARIATION_KEY: attribute.is_material_variation,
        }

        if attribute.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
            data[ATTRIBUTE_DISPLAY_VALUE_KEY] = attribute.get_display_value_field_name()
            data[attribute.name] = {DROPDOWN_OPTIONS_META_URL: settings.APPLICATION_URL + reverse('materials:material-attribute-dropdown-options', args=[attribute.pk])}
            data[OPTION_DISPLAY_VALUE_KEY] = 'display_value'
            data[OPTION_VALUE_KEY] = 'id'
        meta_data.append(data)

    return meta_data


def get_grn_material_common_headers(supplier_po_grn, material):
    get_grn_editable_fields = supplier_po_grn.get_grn_editable_fields(material.name)
    is_complete_grn = supplier_po_grn.state == SupplierPOGRN.GRN_COMPLETE
    grn_field_headers = get_userdefined_material_grn_field_data(material)
    read_only_fields = []

    for field in get_grn_editable_fields:
        if field[READ_ONLY_KEY]:
            read_only_fields.append(field['field_name'])

    visible_fields = []
    for field in get_grn_editable_fields:
        if field[IS_VISIBLE]:
            visible_fields.append(field['field_name'])

    field_is_read_only = lambda field_name: field_name in read_only_fields or is_complete_grn
    field_is_visible = lambda field_name: field_name in visible_fields or is_complete_grn
    headers = [
    {
        HEADER_LABEL_KEY: "Barcode",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.BARCODE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.BARCODE_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
        READ_ONLY_KEY: True,
        IS_VISIBLE: True,
        DISPLAY_SORT_ORDER_KEY: 0
    },

    {
        HEADER_LABEL_KEY: "Supplier Barcode",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.SUPPLIER_BARCODE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.SUPPLIER_BARCODE_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.SUPPLIER_BARCODE_VALUE_KEY),
        IS_VISIBLE: True,
        DISPLAY_SORT_ORDER_KEY: 1
    },
    {
        HEADER_LABEL_KEY: "Indicated Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: True,
        DISPLAY_SORT_ORDER_KEY: 100
    },
    {
        HEADER_LABEL_KEY: "Indicated Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS], 
        OPTION_DISPLAY_VALUE_KEY: 'display_value',
        OPTION_VALUE_KEY: 'value',
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.INDICATED_QUANTITY_UNITS_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: True, # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 200
    },
    {
        HEADER_LABEL_KEY: "Actual Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY),
        IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 300
    },
    {
        HEADER_LABEL_KEY: "Actual Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS], 
        OPTION_DISPLAY_VALUE_KEY: 'display_value',
        OPTION_VALUE_KEY: 'value',
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.ACTUAL_QUANTITY_UNITS_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 400
    },
    {
        HEADER_LABEL_KEY: "Attachments",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.ATTACHMENTS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.ATTACHMENTS_VALUE_KEY,
        IS_ATTACHMENT_FIELD_KEY: True,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.ATTACHMENTS_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: True,   #field_is_visible(SupplierPOGRNMaterialDetail.ATTACHMENTS_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 110000
    },
    {
        HEADER_LABEL_KEY: "QA Pass",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.QA_INSPECTION_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.QA_INSPECTION_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: BOOLEAN_TYPE,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.QA_INSPECTION_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.QA_INSPECTION_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 120000
    }
    ]

    if material.name != Material.FABRIC_MATERIAL:
        headers = [
            *headers,
            {
                HEADER_LABEL_KEY: "Rejected Quantity",
                ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_KEY,
                ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_KEY,
                ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
                READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_KEY),
                IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_KEY),  # in visible_fields,
                DISPLAY_SORT_ORDER_KEY: 400
            },
            {
                HEADER_LABEL_KEY: "Rejected Quantity Unit",
                ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_UNITS_KEY,
                ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_UNITS_KEY,
                ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
                DROPDOWN_OPTIONS_KEY: [{'value': row[0], 'display_value': row[1]} for row in
                                       MaterialUnitHelper.ALL_MEASURING_UNITS],
                OPTION_DISPLAY_VALUE_KEY: 'display_value',
                OPTION_VALUE_KEY: 'value',
                READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_UNITS_KEY),
                # in read_only_fields or is_complete_grn,
                IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.QA_FAILED_QUANTITY_UNITS_KEY),
                # in visible_fields,
                DISPLAY_SORT_ORDER_KEY: 500
            },
        ]
    if supplier_po_grn.state == SupplierPOGRN.QA_VERIFICATION_STATE:
        display_order = 500
        for grn_field_header in grn_field_headers:
            grn_field_header[DISPLAY_SORT_ORDER_KEY] = display_order
            display_order += 100
            headers.append(grn_field_header)
    # actual_quantity, indicated_quantity, units etc.. , material grn fields(Add if QA state is True), barcode
    headers = sorted(headers, key=lambda header_object: header_object.get(DISPLAY_SORT_ORDER_KEY, 1000000))
    return headers


def get_grn_fabric_material_headers(supplier_po_grn_material, material):    
    get_grn_editable_fields = supplier_po_grn_material.supplier_po_grn.get_grn_editable_fields(material.name)
    is_complete_grn =  supplier_po_grn_material.supplier_po_grn.state == SupplierPOGRN.GRN_COMPLETE
    read_only_fields = []
    visible_fields = []
    for field in get_grn_editable_fields:
        if field[READ_ONLY_KEY]:
            read_only_fields.append(field['field_name'])

    visible_fields = []
    for field in get_grn_editable_fields:
        if field[IS_VISIBLE]:
            visible_fields.append(field['field_name'])

    field_is_read_only = lambda field_name: field_name in read_only_fields or is_complete_grn
    field_is_visible = lambda field_name: field_name in visible_fields or is_complete_grn
    color_tones = FabricColorTone.objects.all().order_by('id')
    headers = [
    {
        HEADER_LABEL_KEY: "Batch No",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_CREATE_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row.id, 'display_value': row.batch_number} for row in supplier_po_grn_material.fabricgrnbatchnumber_set.all()],
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10
    },
    {
        HEADER_LABEL_KEY: "Pack No",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.PACK_NUMBER_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.PACK_NUMBER_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.PACK_NUMBER_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.PACK_NUMBER_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 20
    },
    {
        HEADER_LABEL_KEY: "Indicated Width",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.INDICATED_WIDTH_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.INDICATED_WIDTH_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.INDICATED_WIDTH_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.INDICATED_WIDTH_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10000
    },
    {
        HEADER_LABEL_KEY: "Indicated Width Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.INDICATED_WIDTH_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.INDICATED_WIDTH_UNITS_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS],
        OPTION_DISPLAY_VALUE_KEY: 'display_value',
        OPTION_VALUE_KEY: 'value',
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.INDICATED_WIDTH_UNITS_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.INDICATED_WIDTH_UNITS_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10100
    },
    {
        HEADER_LABEL_KEY: "Actual Width (in Inches)",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.ACTUAL_WIDTH_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.ACTUAL_WIDTH_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_CREATE_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row.id, 'display_value':row.actual_width} for row in supplier_po_grn_material.supplier_po_grn.fabricgrnwidth_set.all()],
        OPTION_DISPLAY_VALUE_KEY: 'display_value',
        OPTION_VALUE_KEY: 'value',
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.ACTUAL_WIDTH_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.ACTUAL_WIDTH_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10300
    },
    {
        HEADER_LABEL_KEY: "Indicated GSM",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.INDICATED_GSM_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.INDICATED_GSM_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.INDICATED_GSM_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.INDICATED_GSM_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10200
    },
    # {
    #     HEADER_LABEL_KEY: "Actual Width Unit (in Inches)",
    #     ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.ACTUAL_WIDTH_UNITS_VALUE_KEY,
    #     ATTRIBUTE_VALUE_KEY: FabricGRNDetail.ACTUAL_WIDTH_UNITS_VALUE_KEY,
    #     ATTRIBUTE_TYPE_KEY: DROPDOWN_TYPE,
    #     DROPDOWN_OPTIONS_KEY: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS],
    #     OPTION_DISPLAY_VALUE_KEY: 'display_value',
    #     OPTION_VALUE_KEY: 'value',
    #     READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.ACTUAL_WIDTH_UNITS_VALUE_KEY), # in read_only_fields or is_complete_grn,
    #     IS_VISIBLE: field_is_visible(FabricGRNDetail.ACTUAL_WIDTH_UNITS_VALUE_KEY), # in visible_fields,
    #     DISPLAY_SORT_ORDER_KEY: 10400
    # },
    {
        HEADER_LABEL_KEY: "Actual GSM",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.ACTUAL_GSM_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.ACTUAL_GSM_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.ACTUAL_GSM_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.ACTUAL_GSM_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10500
    },
    {
        HEADER_LABEL_KEY: "Shade",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.SHADE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.SHADE_VALUE_KEY,
        # DROPDOWN_OPTIONS_KEY: [{'value': row.id, 'display_value': row.shade} for row in supplier_po_grn.grnbatchnumbershade_set.all()],
        DROPDOWN_OPTIONS_KEY: [],
        ATTRIBUTE_TYPE_KEY: DROPDOWN_CREATE_TYPE,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.SHADE_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.SHADE_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10700
    },
    {
        HEADER_LABEL_KEY: "Shrink Lot",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.SHRINK_LOT_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.SHRINK_LOT_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.SHRINK_LOT_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.SHRINK_LOT_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10800
    },
    {
        HEADER_LABEL_KEY: "Shrink Width",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.SHRINK_WIDTH_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.SHRINK_WIDTH_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.SHRINK_WIDTH_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.SHRINK_WIDTH_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 10900
    },
    {
        HEADER_LABEL_KEY: "Shrink Length",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.SHRINK_LENGTH_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.SHRINK_LENGTH_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.SHRINK_LENGTH_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.SHRINK_LENGTH_VALUE_KEY),# in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 11000
    },
    {
        HEADER_LABEL_KEY: "Color Tone",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.COLOR_TONE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.COLOR_TONE_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DROPDOWN_CREATE_TYPE,
        DROPDOWN_OPTIONS_KEY: [{'value': row.id, 'display_value':row.display_value} for row in color_tones],
        OPTION_DISPLAY_VALUE_KEY: 'display_value',
        OPTION_VALUE_KEY: 'value',
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.COLOR_TONE_VALUE_KEY), # in read_only_fields or is_complete_grn,
        IS_VISIBLE: field_is_visible(FabricGRNDetail.COLOR_TONE_VALUE_KEY), # in visible_fields,
        DISPLAY_SORT_ORDER_KEY: 11100
    },
    {
        HEADER_LABEL_KEY: "Diameter",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.DIAMETER_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.DIAMETER_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(SupplierPOGRNMaterialDetail.DIAMETER_KEY),
        IS_VISIBLE: field_is_visible(SupplierPOGRNMaterialDetail.DIAMETER_KEY),
        DISPLAY_SORT_ORDER_KEY: 11200
    },
    {
        HEADER_LABEL_KEY: "Indicated Weight",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.INDICATED_WEIGHT_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.INDICATED_WEIGHT_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.INDICATED_WEIGHT_VALUE_KEY),
        IS_VISIBLE: field_is_visible(FabricGRNDetail.INDICATED_WEIGHT_VALUE_KEY),
        DISPLAY_SORT_ORDER_KEY: 11300
    },
    {
        HEADER_LABEL_KEY: "Actual Weight",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.ACTUAL_WEIGHT_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.ACTUAL_WEIGHT_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: DECIMAL_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.ACTUAL_WEIGHT_VALUE_KEY),
        IS_VISIBLE: field_is_visible(FabricGRNDetail.ACTUAL_WEIGHT_VALUE_KEY),
        DISPLAY_SORT_ORDER_KEY: 11400
    },
    {
        HEADER_LABEL_KEY: "Remarks",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.REMARKS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.REMARKS_VALUE_KEY,
        ATTRIBUTE_TYPE_KEY: TEXT_TYPE,
        READ_ONLY_KEY: field_is_read_only(FabricGRNDetail.REMARKS_VALUE_KEY),
        IS_VISIBLE: True,
        DISPLAY_SORT_ORDER_KEY: 11500
    },
    ]
    return headers


def get_grn_material_headers(grn_material):
    material = grn_material.grn_material.customer_brand_material.material_detail.generic_material.user_material
    if material.name == Material.FABRIC_MATERIAL:
        heders = get_grn_material_common_headers(grn_material.supplier_po_grn, material) + get_grn_fabric_material_headers(grn_material, material)
        new_headers = sorted(heders, key=itemgetter(DISPLAY_SORT_ORDER_KEY)) 
        return new_headers
    else:
        return get_grn_material_common_headers(grn_material.supplier_po_grn, material)
    

def get_inhouse_material_headers():
    headers = [
    {
        HEADER_LABEL_KEY: "Material",
        ATTRIBUTE_DISPLAY_VALUE_KEY: 'material_label',
        ATTRIBUTE_VALUE_KEY: 'material_type',
    },
    {
        HEADER_LABEL_KEY: "Ritz Reference Code",
        ATTRIBUTE_DISPLAY_VALUE_KEY: CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
        ATTRIBUTE_VALUE_KEY: CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
    },
    {
        HEADER_LABEL_KEY: "Required Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderBom.REQUIRED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderBom.REQUIRED_QUANTITY_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Required Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderBom.REQUIRED_QUANTITY_UNIT_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderBom.REQUIRED_QUANTITY_UNIT_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Filled Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: 'filled_quantity',
        ATTRIBUTE_VALUE_KEY: 'filled_quantity',
    },
    {
        HEADER_LABEL_KEY: "Filled Quantity Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: 'filled_quantity_unit',
        ATTRIBUTE_VALUE_KEY: 'filled_quantity_unit',
    },
    # {
    #     HEADER_LABEL_KEY: "Material Details",
    #     ATTRIBUTE_DISPLAY_VALUE_KEY: 'material_details',
    #     ATTRIBUTE_VALUE_KEY: 'material_details',
    #     'HEADERS': get_userdefined_material_meta_data(material)
    # },
    ]
    return headers

def get_inhouse_fabric_material_headers():
    headers = [
    {
        HEADER_LABEL_KEY: "Barcode",
        ATTRIBUTE_DISPLAY_VALUE_KEY: InHouseMaterial.BARCODE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: InHouseMaterial.BARCODE_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Roll Number",
        ATTRIBUTE_DISPLAY_VALUE_KEY: FabricGRNDetail.PACK_NUMBER_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: FabricGRNDetail.PACK_NUMBER_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Batch Number",
        ATTRIBUTE_DISPLAY_VALUE_KEY: SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: SupplierPOGRNMaterialDetail.BATCH_NUMBER_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Shade",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderAllocatedMaterial.SHADE_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderAllocatedMaterial.SHADE_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Width",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderAllocatedMaterial.WIDTH_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderAllocatedMaterial.WIDTH_VALUE_KEY,
    },
    {
        HEADER_LABEL_KEY: "Width Unit",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderAllocatedMaterial.WIDTH_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderAllocatedMaterial.WIDTH_UNITS_VALUE_KEY,
    },
    ]
    return headers

def get_inhouse_material_detail_headers(material):
    # print(material)
    headers = []
    if material == Material.FABRIC_MATERIAL:
        fabric_headers = get_inhouse_fabric_material_headers()
        headers.extend(fabric_headers)
    headers.append(
    {
        HEADER_LABEL_KEY: "Allocated Quantity",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderAllocatedMaterial.ALLOCATED_QUANTITY_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderAllocatedMaterial.ALLOCATED_QUANTITY_VALUE_KEY,
    })
    headers.append({
        HEADER_LABEL_KEY: "Allocated Quantity Units",
        ATTRIBUTE_DISPLAY_VALUE_KEY: PurchaseOrderAllocatedMaterial.ALLOCATED_QUANTITY_UNITS_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: PurchaseOrderAllocatedMaterial.ALLOCATED_QUANTITY_UNITS_VALUE_KEY,
    }
    )
    headers.append(
    {
        HEADER_LABEL_KEY: "Manually Added",
        ATTRIBUTE_DISPLAY_VALUE_KEY: InHouseMaterial.MANUALLY_ADDED_VALUE_KEY,
        ATTRIBUTE_VALUE_KEY: InHouseMaterial.MANUALLY_ADDED_VALUE_KEY,
    }
    )
    return headers
