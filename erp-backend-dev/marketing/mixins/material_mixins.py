from abc import abstractmethod

from django.core.exceptions import ObjectDoesNotExist
from rest_framework.response import Response

from marketing.models import AbstractOrderPlacementMaterialConsumption, \
    ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, AbstractOrderMaterialPlacement, POPackItemPlacement, \
    POPackPlacement, POPackItem, OrderPackPlacement, PurchaseOrder, ColorwayItemFabricConsumption, POPackItemService, \
    ActualPOClub
from materials.fieldmetadata.material_metadata import get_pack_item_placement_material_metadata, \
    get_supplier_quote_meta_data, get_services_headers
from materials.forms.form_factory import UserDefinedMaterialFormFactory
from materials.models import UserDefinedMaterial, SupplierInquiry, Material, FABRIC_TRIM_TYPES, SupplierInquiryDetail
from shared.constants.global_constants import FORM_ERRORS_KEY, FIELD_ERRORS_KEY
from shared.models import CustomerBrand
from shared.utils import get_object_or_none


class PlacementInfoMixin:
    ORDER_PLACEMENT_ID_FIELD = ''

    def get_placement_info(self, order_placement):
        data = order_placement.get_placement_details()
        return data

    def get_placement_material(self, order_placement):
        return order_placement.get_placement_material_object()

    @abstractmethod
    def get_placement_material_consumption_object(self, order_placement_material):
        ...

    @abstractmethod
    def get_order_version(self, order_placement):
        ...

    @abstractmethod
    def get_order_inquiry(self, order_placement):
        ...

    def get_consumption_ratio_data(self, placement_material, inquiry_detail):
        consumption_data = {}
        if inquiry_detail.supplier_inquiry.customer_brand_material.material_type == Material.FABRIC_MATERIAL:
            consumption_data_object = placement_material.get_order_item_fabric_costing_consumption(inquiry_detail)
        else:
            consumption_data_object = self.get_placement_material_consumption_object(placement_material)

        if consumption_data_object:
            consumption_data = {
                AbstractOrderPlacementMaterialConsumption.COSTING_CONSUMPTION_RATIO_KEY: consumption_data_object.costing_consumption_ratio,
                AbstractOrderPlacementMaterialConsumption.WASTAGE_KEY: consumption_data_object.wastage,
                AbstractOrderPlacementMaterialConsumption.PLACEMENT_SUPPLIER_INQUIRY_TOTAL_COST: consumption_data_object.calculate_cost_for_supplier_inquiry(inquiry_detail),
                AbstractOrderPlacementMaterialConsumption.ATTACHMENTS_KEY: [attachment.get_object_data() for attachment in consumption_data_object.attachments.all()]
            }
        return consumption_data

    def get_supplier_inquiries(self, placement_material, version):
        inquiries = version.get_version_supplier_inquiries().filter(version=version, customer_brand_material=placement_material.material).order_by('supplier__name').prefetch_related('supplier')
        inquiries_data = []
        for inquiry in inquiries:
            inquiry_details = inquiry.supplierinquirydetail_set.filter(completed=True)
            for inquiry_detail in inquiry_details:
                data = {
                    **inquiry_detail.get_attributes(),
                    **self.get_consumption_ratio_data(placement_material, inquiry_detail)
                }
                inquiries_data.append(data)
        return inquiries_data

    def get_order_placement_material_details(self, order_placement, include_supplier_inquiries=True, include_material_data=True):
        placement_data = self.get_placement_info(order_placement)
        placement_material = self.get_placement_material(order_placement)
        order = self.get_order_inquiry(order_placement)
        version = self.get_order_version(order_placement)

        # Build base data
        data = {
            **placement_data,
            'id': order_placement.id,
        }
        # If a material is already added, add the data
        if placement_material and include_material_data:
            customer_brand_material = placement_material.material
            # material = customer_brand_material.material
            material_data = {}
            if customer_brand_material:
                material_data = customer_brand_material.get_customer_brand_material_details()

            data = {
                **data,
                AbstractOrderMaterialPlacement.PK_PLACEMENT_MATERIAL_ID_KEY: placement_material.id,
                **material_data,
            }
            if include_supplier_inquiries:
                data['supplier_inquiries'] = self.get_supplier_inquiries(placement_material, version)

        return data

    def sort_materials_by_material_display_order(self, placement_data):
        materials = placement_data.keys()
        ud_materials = UserDefinedMaterial.objects.filter(name__in=materials).order_by('display_order')
        data = {}
        for ud_material in ud_materials:
            material_name = ud_material.name
            data[material_name] = placement_data.pop(material_name)
        return data

    def get_placement_materials_info(self, order_placements):
        placements = {}
        for order_placement in order_placements:
            placement_material_type = order_placement.placement_material_type

            # If key not present add key
            if not placements.get(placement_material_type, None):
                metadata, display_name = get_pack_item_placement_material_metadata(placement_material_type)
                placements[placement_material_type] = {
                    "headers": metadata,
                    "supplier_headers": get_supplier_quote_meta_data(),
                    "display_name": display_name,
                    "data": []
                }

            data = self.get_order_placement_material_details(order_placement, True, True)
            placements[placement_material_type]['data'].append(data)
        placements = self.sort_materials_by_material_display_order(placements)
        #print(placements)
        return placements

    def get_api_response(self, order_placements):
        return Response(self.get_placement_materials_info(order_placements))


class PackItemPlacementInfoMixin(PlacementInfoMixin):
    ORDER_PLACEMENT_ID_FIELD = 'pack_item_placement_id'

    def get_placement_material_consumption_object(self, order_placement_material):
        consumption_data_object = None
        try:
            consumption_data_object = order_placement_material.orderpackitemplacementmaterialconsumption
        except ObjectDoesNotExist:
            pass
        return consumption_data_object

    def get_order_inquiry(self, order_placement):
        return order_placement.order_pack_item.pack.version.order

    def get_order_version(self, order_placement):
        return order_placement.order_pack_item.pack.version


class PackPlacementInfoMixin(PlacementInfoMixin):
    ORDER_PLACEMENT_ID_FIELD = 'pack_placement_id'

    def get_placement_material_consumption_object(self, order_placement_material):
        consumption_data_object = None
        try:
            consumption_data_object = order_placement_material.orderpackplacementmaterialconsumption
        except ObjectDoesNotExist:
            pass
        return consumption_data_object

    def get_order_inquiry(self, order_placement):
        return order_placement.order_pack.version.order

    def get_order_version(self, order_placement):
        return order_placement.order_pack.version


class POPackItemPlacementInfoMixin(PackItemPlacementInfoMixin):

    def get_placement_materials_info(self, po_order_placements):
        placements = {}
        for po_order_placement in po_order_placements:
            order_placement = po_order_placement.costing_pack_item_placement
            placement_material_type = order_placement.placement_material_type

            # If key not present add key
            if not placements.get(placement_material_type, None):
                metadata, display_name = get_pack_item_placement_material_metadata(placement_material_type)
                placements[placement_material_type] = {
                    "headers": metadata,
                    "display_name": display_name,
                    "data": []
                }

            costing_data = self.get_order_placement_material_details(order_placement, False, False)
            po_data = po_order_placement.get_po_item_placement_material_details()
            po_material_data = po_data.pop(POPackItemPlacement.PO_PACK_ITEM_MATERIAL_DETAILS_KEY)
            data = {
                **costing_data,
                **po_data,
                **po_material_data
            }
            placements[placement_material_type]['data'].append(data)
        return placements


class POPackPlacementInfoMixin(PackPlacementInfoMixin):

    def get_placement_materials_info(self, po_order_placements):
        placements = {}
        for po_order_placement in po_order_placements:
            order_placement = po_order_placement.costing_pack_placement
            placement_material_type = order_placement.placement_material_type

            # If key not present add key
            if not placements.get(placement_material_type, None):
                metadata, display_name = get_pack_item_placement_material_metadata(placement_material_type)
                placements[placement_material_type] = {
                    "headers": metadata,
                    "display_name": display_name,
                    "data": []
                }

            costing_data = self.get_order_placement_material_details(order_placement, False, False)
            po_data = po_order_placement.get_po_pack_placement_material_details()
            po_material_data = po_data.pop(POPackItemPlacement.PO_PACK_ITEM_MATERIAL_DETAILS_KEY)
            data = {
                **costing_data,
                **po_data,
                **po_material_data
            }
            placements[placement_material_type]['data'].append(data)
        return placements


# This will group the data for all the sizes
class POColorwayCountryItemPlacementHelper(PackItemPlacementInfoMixin):

    def __init__(self, po_packs):
        self.po_packs = po_packs

    def get_po_pack_items(self):
        po_pack_items = POPackItem.objects.filter(po_pack__in=self.po_packs)
        return po_pack_items

    def get_service_data(self, po_item_id):
        po_pack_items = self.get_po_pack_items().filter(po_item_id=po_item_id)
        services = POPackItemService.objects.filter(po_pack_item__in=po_pack_items).order_by('po_pack_item__po_pack__po_size__order_size__size__sorting_order')
        data = {}
        headers = get_services_headers()
        for service in services:
            service_data = service.get_attributes()
            if not data.get(service.service_type, None):
                data[service.service_type] = {
                    'display_name': service.get_service_type_display(),
                    'headers': headers.get(service.service_type),
                    'data': []
                }
            data[service.service_type]['data'].append(service_data)
        return data

    def get_material_data(self):
        po_pack_items = self.get_po_pack_items()

        pack_item_placements = POPackItemPlacement.objects.filter(
            po_pack_item_id__in=po_pack_items.values_list('id', flat=True))
        pack_item_data = self.flatten_pack_item_info(pack_item_placements)
        return pack_item_data

    def flatten_pack_item_info(self, po_order_item_placements, include_headers=True, include_service_data=True):
        data = self.get_pack_item_placement_materials_info(po_order_item_placements)
        flat_data = {}
        for po_item_id, item_material_data in data.items():
            if not flat_data.get(po_item_id, None):
                flat_data[po_item_id] = {'materials': {}, }
                if include_service_data:
                    flat_data[po_item_id]['service_data'] = self.get_service_data(po_item_id)

            material_names = item_material_data['materials'].keys()
            materials = UserDefinedMaterial.objects.filter(name__in=material_names).order_by('display_order')
            for material in materials:
                material_name = material.name
                material_data = item_material_data['materials'][material.name]
                headers = material_data['headers']
                display_name = material_data['display_name']

                if not flat_data[po_item_id]['materials'].get(material_name, None):
                    flat_data[po_item_id]['materials'][material_name] = {
                        # 'headers': headers,
                        'display_name': display_name,
                        'fabric_consumption_ratio_complete': False,
                        'data': []
                    }
                    if include_headers:
                        flat_data[po_item_id]['materials'][material_name]['headers'] = headers

                for item_attribute_id, item_attribute_material_data in material_data['data'].items():
                    for po_material_id, po_material_data in item_attribute_material_data.items():
                        flat_data[po_item_id]['materials'][material_name]['data'].append(po_material_data)
        return flat_data

    def get_pack_item_placement_materials_info(self, po_order_item_placements):
        placements = {}
        for po_order_placement in po_order_item_placements:
            order_placement = po_order_placement.costing_pack_item_placement
            po_item_id = po_order_placement.po_pack_item.po_item.pk
            placement_material_type = order_placement.placement_material_type
            item_attribute_id = order_placement.item_attribute_other_id
            po_material_id = po_order_placement.po_material_id
            po_pack_item = po_order_placement.po_pack_item
            po_pack = po_pack_item.po_pack
            po_pack_item_id = po_pack_item.id

            # Add po_item_id key
            if not placements.get(po_item_id, None):
                placements[po_item_id] = {'materials': {}}

            # Add material information if doesn't exist
            if not placements[po_item_id]['materials'].get(placement_material_type, None):
                metadata, display_name = get_pack_item_placement_material_metadata(placement_material_type, True)
                placements[po_item_id]['materials'][placement_material_type] = {
                    "headers": metadata,
                    "display_name": display_name,
                    "data": {}
                }

            # If placement doesn't exist, add it
            if not placements[po_item_id]['materials'][placement_material_type]['data'].get(item_attribute_id, None):
                placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id] = {}

            # If placement material doesnt exist, add it
            if not placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id].get(po_material_id, None):
                costing_data = self.get_order_placement_material_details(order_placement, False, False)
                po_data = po_order_placement.get_po_item_placement_material_details()
                po_material_data = po_data.pop(POPackItemPlacement.PO_PACK_ITEM_MATERIAL_DETAILS_KEY)

                data = {
                    **costing_data,
                    **po_data,
                    **po_material_data,
                    'po_pack_item_id': po_pack_item_id,
                    'po_sizes': {},
                    'po_pack_item_placement_ids': [],
                }
                placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id][po_material_id] = data

            if not placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id][po_material_id]['po_sizes'].get(po_pack.po_size_id, None):
                placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id][po_material_id]['po_sizes'][po_pack.po_size_id] = {
                        'po_size_name': po_pack.po_size.order_size.size.name,
                        'po_size_abbreviation': po_pack.po_size.order_size.size.abbreviation,
                        # 'po_pack_id': po_pack.pk,
                        'po_size_id': po_pack.po_size_id,
                        'consumption_ratio': po_order_placement.consumption_ratio,
                        'wastage': po_order_placement.wastage,
                        'po_pack_item_placement_ids': []
                    }

            placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id][po_material_id]['po_sizes'][po_pack.po_size_id]['po_pack_item_placement_ids'].append(po_order_placement.pk)
            placements[po_item_id]['materials'][placement_material_type]['data'][item_attribute_id][po_material_id]['po_pack_item_placement_ids'].append(po_order_placement.pk)
        return placements


class POColorwayCountryPlacementHelper(PackPlacementInfoMixin):

    def __init__(self, po_packs):
        self.po_packs = po_packs

    def get_material_data(self):
        pack_placements = POPackPlacement.objects.filter(po_pack_id__in=self.po_packs.values_list('id', flat=True))
        pack_data = self.flatten_po_pack_info(pack_placements)
        return pack_data

    def flatten_po_pack_info(self, po_order_placements):
        placement_info = self.get_po_pack_placement_materials_info(po_order_placements)
        flattened_data = {}
        for material_type, placement_data in placement_info.items():
            if not flattened_data.get(material_type, None):
                flattened_data[material_type] = {
                    **placement_data,
                    'data': []
                }
            for item_attribute_id, material_data in placement_data['data'].items():
                for material_id, all_placement_data in material_data.items():
                    flattened_data[material_type]['data'].append(all_placement_data)

        materials = UserDefinedMaterial.objects.filter(name__in=flattened_data.keys()).order_by('display_order')
        organized_data = {}
        for material in materials:
            organized_data[material.name] = flattened_data[material.name]
        return organized_data

    def get_po_pack_placement_materials_info(self, po_order_placements):
        placements = {}
        po_order_placements = po_order_placements.prefetch_related(
            'po_pack__po_size__order_size__size',
            'po_material',
            'po_material__material_code',
            'po_material__material_detail__generic_material',
        )
        for po_order_placement in po_order_placements:
            order_placement = po_order_placement.costing_pack_placement
            placement_material_type = order_placement.placement_material_type
            item_attribute_id = order_placement.item_attribute_other.pk
            material_id = po_order_placement.po_material.id
            po_size_id = po_order_placement.po_pack.po_size_id

            # If key not present add key
            if not placements.get(placement_material_type, None):
                metadata, display_name = get_pack_item_placement_material_metadata(placement_material_type)
                placements[placement_material_type] = {
                    "headers": metadata,
                    "display_name": display_name,
                    "data": {}
                }

            if not placements[placement_material_type]['data'].get(item_attribute_id, None):
                placements[placement_material_type]['data'][item_attribute_id] = {}

            if not placements[placement_material_type]['data'][item_attribute_id].get(material_id, None):
                costing_data = self.get_order_placement_material_details(order_placement, False, False)
                po_data = po_order_placement.get_po_pack_placement_material_details()
                po_material_data = po_data.pop(POPackItemPlacement.PO_PACK_ITEM_MATERIAL_DETAILS_KEY)
                data = {
                    **costing_data,
                    **po_material_data,
                }
                placements[placement_material_type]['data'][item_attribute_id][material_id] = {
                    **data,
                    'po_sizes': {},
                    'po_pack_placement_ids': []
                }

            if not placements[placement_material_type]['data'][item_attribute_id][material_id]['po_sizes'].get(po_size_id, None):

                placements[placement_material_type]['data'][item_attribute_id][material_id]['po_sizes'][po_size_id] = {
                    'po_size_name': po_order_placement.po_pack.po_size.order_size.size.name,
                    'po_size_abbreviation': po_order_placement.po_pack.po_size.order_size.size.abbreviation,
                    'po_size_id': po_size_id,
                    'consumption_ratio': po_order_placement.consumption_ratio,
                    'wastage': po_order_placement.wastage,
                    'po_pack_placement_ids': []
                }
            placements[placement_material_type]['data'][item_attribute_id][material_id]['po_sizes'][po_size_id]['po_pack_placement_ids'].append(po_order_placement.pk)
            placements[placement_material_type]['data'][item_attribute_id][material_id]['po_pack_placement_ids'].append(po_order_placement.pk)
        return placements


class CADPOColorwayCountryItemPlacementHelper(POColorwayCountryItemPlacementHelper):

    def __init__(self, *args, **kwargs):
        self.po_order_item_id = kwargs.pop('po_order_item_id', None)
        self.purchase_order = kwargs.pop('purchase_order', None)
        self.po_colorway_id = kwargs.pop('po_coloCADPOColorwayCountryItemPlacementHelperrway_id', None)
        super().__init__(*args, **kwargs)

    def get_colorway_item_fabrci_consumption_ratio_complete(self):
        is_complete = False
        colorway_item_fabric_consumptions = ColorwayItemFabricConsumption.objects.filter(po_colorway_id=self.po_colorway_id, po_item_id=self.po_order_item_id)
        for colorway_item_fabric_consumption in colorway_item_fabric_consumptions:
            po_item = colorway_item_fabric_consumption.po_item
            po_pack_items = POPackItem.objects.filter(po_item=po_item)
            for po_pack_item in po_pack_items:
                is_complete = po_pack_item.fabric_consumption_ratio_complete
        return is_complete
    
    def get_supplier_inquiry_detail(self, po_placement_id):
        placement = POPackItemPlacement.objects.get(pk=po_placement_id)
        placement_costing_material = placement.costing_pack_item_placement.orderpackitemplacementmaterial.material

        inquiry = placement.costing_pack_item_placement.order_pack_item.pack.get_selected_supplier_inquiry_for_material(placement_costing_material)
        inquiries = [] # Will always be 1 but making this multiple
        if inquiry:
            inquiry_data = inquiry.supplier_inquiry_detail.get_attributes()
            po_pack_consumption = ColorwayItemFabricConsumption.objects.get_or_create(
                po_colorway=placement.po_pack_item.po_pack.po_colorway,
                #po_country=placement.po_pack_item.po_pack.po_country,
                po_item=placement.po_pack_item.po_item,
                supplier_inquiry_detail=inquiry.supplier_inquiry_detail,
                po_material=placement.po_material
            )[0]
            inquiry_data[ColorwayItemFabricConsumption.PK_PO_COLORWAY_ITEM_CONSUMPTION] = po_pack_consumption.pk
            inquiry_data[ColorwayItemFabricConsumption.PO_WASTAGE] = po_pack_consumption.po_wastage
            inquiry_data[ColorwayItemFabricConsumption.PO_CONSUMPTION_RATIO] = po_pack_consumption.po_consumption_ratio
            inquiries.append(inquiry_data) # TODO - add saved consumption data
        return inquiries

    def get_grouped_material_data_by_placement(self):
        material_data = self.get_material_data()
        data = material_data[self.po_order_item_id]['materials'][Material.FABRIC_MATERIAL]['data'].copy()
        grouped_materials = {}

        for row in data:
            customer_brand_material_id = row['customer_brand_material_id']
            if not grouped_materials.get(customer_brand_material_id, None):
                grouped_materials[customer_brand_material_id] = row
            else:
                row_data = grouped_materials[customer_brand_material_id]
                row_data['placement'] = row_data['placement'] + ", " + row['placement']
                row_data['po_pack_item_placement_ids'] = row_data['po_pack_item_placement_ids'] + row['po_pack_item_placement_ids']
        grouped_data = []
        for material_id, material_placements in grouped_materials.items():
            material_placements['supplier_inquiry_details'] = self.get_supplier_inquiry_detail(material_placements['pk_po_pack_item_placement_id'])
            grouped_data.append(material_placements)
        material_data[self.po_order_item_id]['materials'][Material.FABRIC_MATERIAL]['data'] = grouped_data
        material_data[self.po_order_item_id]['materials'][Material.FABRIC_MATERIAL]['fabric_consumption_ratio_complete'] = self.get_colorway_item_fabrci_consumption_ratio_complete()
        return material_data

    def get_material_data(self):
        po_pack_items = POPackItem.objects.filter(po_pack__in=self.po_packs, po_item_id=self.po_order_item_id)
        pack_item_placements = POPackItemPlacement.objects.filter(
            po_pack_item_id__in=po_pack_items.values_list('id', flat=True),
            costing_pack_item_placement__item_attribute_other__material__name=Material.FABRIC_MATERIAL
        )
        pack_item_data = self.flatten_pack_item_info(pack_item_placements)
        return pack_item_data


class ActualClubFabricPlacementHelper(POColorwayCountryItemPlacementHelper):

    def __init__(self, actual_po_club):
        self.actual_po_club = actual_po_club
        packs = self.actual_po_club.get_club_packs()
        super().__init__(packs)

    def clean_pack_item_data(self, po_pack, po_pack_item_data):
        po_item_ids = po_pack_item_data.keys()
        data = []
        for po_item_id in po_item_ids:
            po_pack_item = POPackItem.objects.get(po_pack=po_pack, po_item_id=po_item_id)
            po_pack_item_display = po_pack_item.get_po_pack_item_display()
            fabric_data = po_pack_item_data[po_item_id]['materials'][Material.FABRIC_MATERIAL]['data']
            fabric_data_dict = {
                'po_pack_item_display': po_pack_item_display,
                'data': fabric_data
            }
            data.append(fabric_data_dict)
        return data

    def get_material_data(self):
        pos = self.actual_po_club.get_purchase_orders()
        po_data = {}

        for po in pos:
            packs = po.get_po_packs().order_by('po_country', 'po_colorway', 'po_size__order_size__size__sorting_order')

            if not po_data.get(po.pk, None):
                metadata, display_name = get_pack_item_placement_material_metadata(Material.FABRIC_MATERIAL)
                po_data[po.pk] = {
                    'po_number': po.name,
                    'po_display_number': po.display_number,
                    'headers': metadata,
                    'pack_item_fabrics': []

                }
            for pack in packs:
                pack_items = pack.get_po_pack_items()
                pack_item_placements = POPackItemPlacement.objects.filter(
                    po_pack_item_id__in=pack_items.values_list('id', flat=True),
                    po_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL
                )
                pack_item_data = self.flatten_pack_item_info(pack_item_placements, False, False)
                cleaned_data = self.clean_pack_item_data(pack, pack_item_data)
                po_data[po.pk]['pack_item_fabrics'] = [*po_data[po.pk]['pack_item_fabrics'], *cleaned_data]
        return po_data


class GenericUserDefinedMaterialMixin:

    def get_user_defined_material_object(self, material_type):
        material = get_object_or_none(UserDefinedMaterial, {'name': material_type})
        return material

    def save_user_defined_material(self, material_type, post_data, order):
        errors = {}
        added_material = None
        material = self.get_user_defined_material_object(material_type)
        if material:
            form = UserDefinedMaterialFormFactory(material=material, data=post_data, order=order)
            if form.is_valid():
                errors, added_material = form.get_or_create_object(material_type)
            else:
                errors = form.errors
                errors = {
                    FORM_ERRORS_KEY: errors.pop('__all__', []),
                    FIELD_ERRORS_KEY: errors
                }
        else:

            errors = {FORM_ERRORS_KEY: ["Specified material (%s) does not exist" % material_type]}
        return errors, added_material


class FabricMaterialHelperMixin(GenericUserDefinedMaterialMixin):

    def validate_fabric_and_save(self, post_data_row, order):
        return self.save_user_defined_material(FABRIC_TRIM_TYPES, post_data_row, order)


