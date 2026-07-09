from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.http import Http404
from django.urls import resolve
from rest_framework import status
from rest_framework.generics import get_object_or_404, RetrieveUpdateAPIView, ListCreateAPIView, ListAPIView, CreateAPIView, UpdateAPIView, DestroyAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from marketing.helpers.cad_interface_helprs import PackCadInterfacePlacementMaterial, \
    PackItemCadInterfacePlacementMaterial, PackItemSizeGroupFabrics, OrderItemColorwayFabrics, ItemColorwayTypeFabrics
from marketing.mixins.material_mixins import PackPlacementInfoMixin, PackItemPlacementInfoMixin
from marketing.mixins.order_mixins import OrderMixin
from marketing.models import OrderInquiry, OrderSizeGroup, OrderItem, ColorwayItemType, PackItemFabricConsumptionRatio, \
    OrderPackItemPlacementMaterial, OrderPackItemPlacementMaterialConsumption, \
    OrderPackPlacementMaterialConsumption, OrderPackPlacementMaterial, \
    ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, OrderCountry, OrderColorway, \
    ItemColorwayColorwayCategoryFabricConsumptionRatio, ItemColorwayCategoryFabricConsumptionRatio, \
    OrderCostingColorwayMaterialSupplierInquiry, OrderPackItem, OrderPack, OrderCostingVersion, \
    ItemColorwayCategoryFabricConsumptionComplete, ItemColorwayTypeFabricConsumptionComplete, POPack, \
    PurchaseOrderAllocatedMaterial, ActualPOClub, MarkerCutPlan, POFabricMarker, RollSequence, SelectedRoll, Item, OrderPlacement, OrderPackItemPlacement, \
    CostingCompletedMaterial
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin
from materials.models import Material, CustomerBrandMaterial, SupplierInquiry, SupplierInquiryDetail, FABRIC_TRIM_TYPES
from materials.serializers.material_serializers import CustomerBrandMaterialSerializer, CustomerBrandMaterialBasicSerializer
from shared.models import FileAttachment, ColorwayCategory
from shared.permissions.roles import CAD_USER_ROLE, MERCHANT_ROLE, CAD_ADMIN_ROLE, MERCHANT_ADMIN_ROLE
from shared.permissions.view_permissions import HasPermission
from shared.utils import get_object_or_none, MaterialUnitHelper
from marketing.serializers import OrderVersionSerializer, OrderVersionOrderInquirySerializer, POPackSerializer, CADPurchaseOrderAllocatedMaterialSerializer, OrderPlacementSpeedConsumptionCADSerializer
from marketing.serializer.cad_serializer import MarkerCutPlanSerializer, PurchaseOrderAllocatedMaterialRollListSerializer, RollSequenceSerializer, SelectedRollSerializer
from marketing.scripts.roll_sequence import RollSequenceGenerator, MarkerCutPlanGenerator
from django.contrib.contenttypes.models import ContentType
from shared.models import ActionTask, Customer
from shared.approvals.constants.task_descriptions import COSTING_SPEED_CONSUMPTION_DESCRIPTION

# CAD Interface Views
class OrderPackItemSizeGroupPlacementMaterials(APIView, PackItemPlacementInfoMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, version_id, order_id, order_colorway_id, order_country_id, order_item_id, order_size_group_id):
        cad_data = PackItemCadInterfacePlacementMaterial(
            request,
            order_id,
            order_colorway_id,
            order_country_id,
            order_item_id,
            order_size_group_id,
            version_id
        ).get_placement_material_details()
        return Response(cad_data)


class OrderPackSizeGroupPlacementMaterials(APIView, PackPlacementInfoMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, order_id, version_id, order_colorway_id, order_country_id, order_size_group_id):
        cad_data = PackCadInterfacePlacementMaterial(
            request,
            order_id,
            order_colorway_id,
            order_country_id,
            order_size_group_id,
            version_id
        ).get_placement_material_details()
        return Response(cad_data)


class CADInterfaceNavigation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    _pack_size_groups = {}
    def get_order_countries_data(self, order_countries):
        countries = []
        for order_country in order_countries:
            data = {}

            data['country_name'] = order_country.country.name
            data['order_country_id'] = order_country.id
            countries.append(data)
        return countries

    def get_order_groups_data(self, order_size_groups):
        order_groups = []

        for order_group in order_size_groups:
            data = {}
            data['order_group_id'] = order_group.id
            data['order_sizes'] = []

            for order_group_size in order_group.sizes.all().order_by('size__sorting_order'):
                data['order_sizes'].append({
                    'order_size_id': order_group_size.id,
                    'size_id': order_group_size.size_id,
                    'size_name': order_group_size.size.name
                })
            order_groups.append(data)
        return order_groups

    def group_by_colorway(self, colorway_categories):
        sorted_cw_types = {}
        for colorway_category in colorway_categories:
            colorway_category_id = colorway_category.pop('colorway_category_id')
            if not sorted_cw_types.get(colorway_category_id, None):
                sorted_cw_types[colorway_category_id] = {
                    "colorway_category_id": colorway_category_id,
                    "colorway_category": colorway_category.pop('colorway_category__name'),
                    "colorways": []
                }
            colorway_category['colorway'] = colorway_category.pop('colorway__colorway')
            sorted_cw_types[colorway_category_id]["colorways"].append(colorway_category)
        return sorted_cw_types.values()

    def get_colorway_item_types(self, order, order_items):
        item_colorways = []
        for order_item in order_items:
            cw_item_types = ColorwayItemType.objects.filter(
                item__order=order,
                colorway__order=order,
                item=order_item
            ).order_by('colorway_category_id', 'colorway_id').values('colorway_id', 'colorway_category__name',
                                                                 'colorway_category_id', 'colorway__colorway')
            grouped_item_cws = self.group_by_colorway(cw_item_types)
            item_colorways.append({
                "order_item_id": order_item.pk,
                "item_name": order_item.item.name,
                "item_display_name": order_item.item_display,
                "item_id": order_item.item_id,
                "colorway_categories": grouped_item_cws,
            })
        return item_colorways

    def get_pack_complete_status_of_consumption_data(self, version):
        packs = version.get_order_version_packs()
        pack_data = []
        for pack in packs:
            size_group = self.get_pack_size_group(pack)
            pack_data.append({'colorway_id': pack.colorway_id, 'size_id': pack.size_id, 'country_id': pack.country_id,
                              'complete_status': pack.consumption_data_reviewed, 'size_group_id': size_group.id})
        return pack_data

    def get_pack_size_group(self, pack):
        size_group = self._pack_size_groups.get(pack.pk, None)
        if not size_group:
            size_group = pack.get_pack_size_group()
            self._pack_size_groups[pack.id] = size_group
        return size_group

    def get_pack_item_complete_status_of_consumption_data(self, version):
        pack_items = version.get_order_pack_items().prefetch_related('pack')
        pack_item_data = []
        for pack_item in pack_items:
            size_group = self.get_pack_size_group(pack_item.pack)
            pack = pack_item.pack
            pack_item_data.append({'colorway_id': pack.colorway_id, 'order_item_id': pack_item.item_id, 'size_id': pack.size_id,
                                   'country_id': pack.country_id, 'complete_status': pack_item.consumption_data_reviewed, 'size_group_id': size_group.id})
        return pack_item_data

    def get(self, request, order_id, version_id):
        self._pack_size_groups = {}
        order = get_object_or_404(OrderInquiry, pk=order_id)
        order_groups = order.get_order_size_groups()
        order_items = order.get_order_items()
        order_countries = order.get_order_countries()
        version = self.get_order_version_or_raise_http404(order_id, version_id)
        response = {
            'item_colorway_categories': self.get_colorway_item_types(order, order_items),
            'order_countries': self.get_order_countries_data(order_countries),
            'order_groups': self.get_order_groups_data(order_groups),
            'pack_items_complete_status': self.get_pack_item_complete_status_of_consumption_data(version),
            'packs_complete_status': self.get_pack_complete_status_of_consumption_data(version),
        }
        return Response(response)


class ItemColorwayCategoryNavigation(APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, order_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        item_ids = OrderItem.objects.filter(order=order).values_list('item_id').order_by('item__name')
        nav_items = []
        for item_id in item_ids:
            item_types = ColorwayItemType.objects.filter(item__item_id=item_id, item__order=order).distinct(
                'colorway_category_id').order_by('colorway_category_id')
            for item_type in item_types:
                nav_items.append({
                    'item': item_type.item.item_id,
                    'item_name': item_type.item.item.name,
                    'colorway_category': item_type.colorway_category.name,
                    'colorway_category_id': item_type.colorway_category_id,
                })
        return Response(nav_items)


class OrderItemCountryColorwaySizeGroupFabricsView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, **kwargs):
        country_id = kwargs.get('country_id')
        colorway_id = kwargs.get('colorway_id')
        item_id = kwargs.get('item_id')
        size_group_id = kwargs.get('size_group_id')
        colorway_category_id = kwargs.get('colorway_category_id')
        order_id = kwargs.get('order_id')
        version_id = kwargs.get('version_id')
        data = PackItemSizeGroupFabrics(request, order_id, version_id, item_id, colorway_id, country_id, size_group_id, colorway_category_id)
        return Response(data.get_fabric_data())


class OrderItemColorwayFabricsView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, **kwargs):
        colorway_id = kwargs.get('colorway_id')
        item_id = kwargs.get('item_id')
        order_id = kwargs.get('order_id')
        version_id = kwargs.get('version_id')
        colorway_category_id = kwargs.get('colorway_category_id')
        data = OrderItemColorwayFabrics(request, order_id, version_id, item_id, colorway_id, colorway_category_id)
        return Response(data.get_fabric_data())


class OrderItemColorwayTypeFabricsView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, **kwargs):
        colorway_category_id = kwargs.get('colorway_category_id')
        item_id = kwargs.get('item_id')
        order_id = kwargs.get('order_id')
        version_id = kwargs.get('version_id')
        data = ItemColorwayTypeFabrics(request, order_id, version_id, item_id, colorway_category_id)
        return Response(data.get_fabric_data())


class AssignConsumptionRatio(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, MERCHANT_ROLE, CAD_ADMIN_ROLE, CAD_USER_ROLE]
    errors = {}
    has_errors = False
    placement_parent_pks = []
    #editable_states = [OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE, ]

    def __init__(self, *args, **kwargs):
        self.errors = {}
        self.placement_parent_pks = []
        super(APIView, self).__init__(*args, **kwargs)

    def get_object_current_state(self):
        version = self.get_order_version_or_raise_http404(self.kwargs['order_id'], self.kwargs.get('version_id', None))
        return version.version_state

    def get_material_type(self, material_data):
        return material_data.get('material_type', None)

    def add_error(self, material, error):
        self.has_errors = True
        material_errors = self.errors.get(material, [])

        if not self.errors.get(material, None):
            self.errors[material] = []

        if error not in material_errors:
            self.errors[material] = []

            self.errors[material].append(error)

    def get_placement_material_or_none(self, order_placement_material_id, pack_id, order_id, version_id):
        pack_placement_material = None
        try:
            pack_placement_material = OrderPackItemPlacementMaterial.objects.get(
                pk=order_placement_material_id,
                placement__order_pack_item__pack_id=pack_id,
                placement__order_pack_item__item__order_id=order_id,
                placement__order_pack_item__pack__version_id=version_id
            )
            self.placement_parent_pks.append(pack_placement_material.placement.order_pack_item_id)
        except ObjectDoesNotExist:
            pass
        return pack_placement_material

    def validate_decimal(self, value, error_key):
        valid = True
        try:
            float(value)
        except (ValueError, TypeError) as ex:
            if value:
                self.add_error(error_key, "Consumption ratio and Wastage must be numbers")
            valid = False
        return valid

    def get_or_create_pack_placement_material_consumption(self, pack_placement_material):
        object = OrderPackItemPlacementMaterialConsumption.objects.get_or_create(
            pack_item_placement_material=pack_placement_material
        )[0]
        return object

    def save_file_attachments(self, attachment_data, consumption_object):
        attachment_ids = [attachment.get('id', None) for attachment in attachment_data]
        attachments = FileAttachment.objects.filter(id__in=attachment_ids)
        for attachment in attachments:
            if not consumption_object.attachments.filter(id=attachment.id).exists():
                consumption_object.attachments.add(attachment)
        consumption_object.attachments.remove(*consumption_object.attachments.all().exclude(id__in=attachment_ids))

    def save_material_data(self, material, material_data, version_id, order_id):
        material_type = self.get_material_type(material_data)
        material_id = material_data.get('material_id', None)
        pack_id = material_data.get('pack_id', None)
        consumption_ratio = material_data.get('consumption_ratio', None)
        wastage = material_data.get('wastage', None)
        attachments = material_data.get('attachments', [])
        order_placement_material_id = material_data.get('order_placement_material_id', None)

        pack_placement_material = self.get_placement_material_or_none(order_placement_material_id, pack_id, order_id, version_id)

        if not pack_placement_material:
            self.add_error(material_type, "Pack Placement material doesn't exist")
            return

        pack_placement_material_consumption = self.get_or_create_pack_placement_material_consumption(pack_placement_material)

        if not pack_placement_material_consumption:
            self.add_error(material_type, "Pack Placement Consumption doesn't exist")
            return

        if self.validate_decimal(consumption_ratio, material):
            pack_placement_material_consumption.costing_consumption_ratio = float(consumption_ratio)
        elif not consumption_ratio:
            pack_placement_material_consumption.costing_consumption_ratio = None

        if self.validate_decimal(wastage, material):
            if wastage == 0:
                wastage = 0.0
            pack_placement_material_consumption.wastage = float(wastage)
        elif not wastage:
            pack_placement_material_consumption.wastage = None

        self.save_file_attachments(attachments, pack_placement_material_consumption)
        pack_placement_material_consumption.save()

    def validate_consumption_data_and_mark_as_complete(self, mark_as_complete):
        pack_item_ids = list(set(self.placement_parent_pks))
        pack_items = OrderPackItem.objects.filter(pk__in=pack_item_ids)
        is_valid = True
        if mark_as_complete:
            for pack_item in pack_items:
                if not pack_item.placements_have_consumption_data_exclude_fabrics():
                    is_valid = False
                    break
            pack_items.update(consumption_data_reviewed=is_valid)
        else:
            pack_items.update(consumption_data_reviewed=False)
        return is_valid
    
    def validate_pre_costing_completed_materail(self, costing):
        has_complete = False
        if costing.costing_type == OrderCostingVersion.PRE_COSTING:
            has_complete = CostingCompletedMaterial.objects.filter(material__name=FABRIC_TRIM_TYPES).exists()
        else:
            if costing.version_state == OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE:
                has_complete = True
        return has_complete
		

    def post(self, request, order_id, version_id):
        self.errors = {}

        version = self.get_order_version_or_raise_http404(self.kwargs['order_id'], self.kwargs.get('version_id', None))

        has_complete = self.validate_pre_costing_completed_materail(version)
        consumption_data = request.data.get('consumption_data')
        mark_as_complete = request.data.get('complete_status', False)

        if has_complete:
            for material_data in consumption_data:
                material = self.get_material_type(material_data)

                if not material:
                    self.add_error('', "Something went wrong. Material Type is missing. Please refresh and try again")
                elif material == Material.FABRIC_MATERIAL:
                    self.add_error('', "Something went wrong. Please use Fabrics Consumptions tab to enter data")
                else:
                    self.save_material_data(material, material_data, version_id, order_id)

            if not self.validate_consumption_data_and_mark_as_complete(mark_as_complete):
                self.add_error('complete_status', 'Cannot mark consumption data as complete. Make sure that consumption data is entered for each placement and size.')

            http_response = Response({'errors': self.errors})
            if self.has_errors:
                http_response.status_code = status.HTTP_400_BAD_REQUEST
        else:
            return Response("Invalid operation. Editing is not allowed in current state.", status=status.HTTP_400_BAD_REQUEST)

        return http_response


class AssignPackConsumptionRatio(AssignConsumptionRatio):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, MERCHANT_ADMIN_ROLE, ]

    def validate_consumption_data_and_mark_as_complete(self, mark_as_complete):
        pack_ids = list(set(self.placement_parent_pks))
        packs = OrderPack.objects.filter(pk__in=pack_ids)
        is_valid = True
        if mark_as_complete:
            for pack in packs:
                if not pack.placements_have_consumption_data():
                    is_valid = False
                    break
            packs.update(consumption_data_reviewed=is_valid)
        else:
            packs.update(consumption_data_reviewed=False)
        return is_valid

    def get_placement_material_or_none(self, order_placement_material_id, pack_id, order_id, version_id):
        pack_placement_material = None
        try:
            pack_placement_material = OrderPackPlacementMaterial.objects.get(
                pk=order_placement_material_id,
                placement__order_pack_id=pack_id,
                placement__order_pack__version__order_id=order_id,
                placement__order_pack__version_id=version_id
            )
            self.placement_parent_pks.append(pack_id)
        except ObjectDoesNotExist:
            pass
        return pack_placement_material

    def get_or_create_pack_placement_material_consumption(self, pack_placement_material):
        object = OrderPackPlacementMaterialConsumption.objects.get_or_create(
            pack_placement_material=pack_placement_material
        )[0]
        return object


class FabricCadNavigation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get_order_countries_data(self, order_countries):
        countries = []
        for order_country in order_countries:
            data = {}

            data['country_name'] = order_country.country.name
            data['order_country_id'] = order_country.id
            countries.append(data)
        return countries

    def get_order_groups_data(self, order_size_groups):
        order_groups = []

        for order_group in order_size_groups:
            data = {}
            data['order_group_id'] = order_group.id
            data['order_sizes'] = []

            for order_group_size in order_group.sizes.all().order_by('size__sorting_order'):
                data['order_sizes'].append({
                    'order_size_id': order_group_size.id,
                    'size_id': order_group_size.size_id,
                    'size_name': order_group_size.size.name
                })
            order_groups.append(data)
        return order_groups

    def flatten_response(self, data):
        response_data = []
        for item_id, item_data in data.items():
            new_data = item_data

            colorway_categories = item_data.pop('colorway_categories')

            flatten_colorway_categories = []

            for colorway_category_id, colorway_category_data in colorway_categories.items():
                new_colorway_category_data = colorway_category_data
                new_colorway_category_data['colorways'] = colorway_category_data['colorways']['colorways']
                flatten_colorway_categories.append(new_colorway_category_data)
            new_data['colorway_categories'] = flatten_colorway_categories
            response_data.append(new_data)
        return response_data

    def get_item_colorway_type_fabric_status(self, version):
        statuses = ItemColorwayTypeFabricConsumptionComplete.objects.filter(version=version)
        data = []
        for status in statuses:
            data.append({
                'colorway_category_id': status.colorway_category_id,
                'item_id': status.item_id,
                'completion_status': status.fabric_consumption_data_reviewed,
            })
        return data

    def get_item_colorway_colorway_type_fabric_status(self, version):
        statuses = ItemColorwayCategoryFabricConsumptionComplete.objects.filter(version=version)
        data = []
        for status in statuses:
            data.append({
                'colorway_id': status.order_colorway_id,
                'colorway_category_id': status.colorway_category_id,
                'item_id': status.item_id,
                'completion_status': status.fabric_consumption_data_reviewed,
            })
        return data

    def get_pack_item_fabric_status(self, version):
        pack_items = version.get_order_pack_items().prefetch_related('item', 'pack')

        fabric_status_data = []

        for pack_item in pack_items:

            fabric_status_data.append({
                'item_id': pack_item.item.item_id,
                'order_item_id': pack_item.item_id,
                'colorway_id': pack_item.pack.colorway_id,
                'order_country_id': pack_item.pack.country_id,
                'order_size_id': pack_item.pack.size_id,
                'completion_status': pack_item.fabric_consumption_data_reviewed,
                'size_group_id': pack_item.pack.get_pack_size_group().id,
                'colorway_category_id': pack_item.get_order_pack_item_colorway_type().colorway_category_id
            })
        return fabric_status_data

    def get(self, request, order_id, version_id):
        order = self.get_order_inquiry_or_raise_http404(order_id)
        version = self.get_order_version_or_raise_http404(order_id, version_id) # validation to check if valid version
        cw_item_types = ColorwayItemType.objects.filter(item__order=order).order_by('colorway_category', 'item__item_id', 'colorway__colorway')
        navigation = {}

        for cw_item_type in cw_item_types:

            if not navigation.get(cw_item_type.item.item_id, None):
                navigation[cw_item_type.item.item_id] = {
                    'item_name': cw_item_type.item.item.name,
                    'item_id': cw_item_type.item.item_id,
                    'item_identifier': cw_item_type.item.item_identifier,
                    'colorway_categories': {}
                }

            if not navigation[cw_item_type.item.item_id]['colorway_categories'].get(cw_item_type.colorway_category_id, None):
                navigation[cw_item_type.item.item_id]['colorway_categories'][cw_item_type.colorway_category_id] = {
                    'colorway_category': cw_item_type.colorway_category.name,
                    'colorway_category_id': cw_item_type.colorway_category_id,
                    'colorways': {'colorways': []}
                }

            if not navigation[cw_item_type.item.item_id]['colorway_categories'][cw_item_type.colorway_category_id]['colorways'].get(cw_item_type.colorway_id, None):
                navigation[cw_item_type.item.item_id]['colorway_categories'][cw_item_type.colorway_category_id]['colorways'][cw_item_type.colorway_id] = True
                navigation[cw_item_type.item.item_id]['colorway_categories'][cw_item_type.colorway_category_id]['colorways']['colorways'].append({
                    'colorway_name': cw_item_type.colorway.colorway,
                    'colorway_id': cw_item_type.colorway_id
                })
        response = {
            'colorway_item_categories': self.flatten_response(navigation),
            'order_countries': self.get_order_countries_data(order.get_order_countries()),
            'size_groups': self.get_order_groups_data(order.get_order_size_groups()),
            'pack_items_completion_status': self.get_pack_item_fabric_status(version),
            'colorway_item_colorway_type_status': self.get_item_colorway_colorway_type_fabric_status(version),
            'item_colorway_type_status': self.get_item_colorway_type_fabric_status(version),
        }
        return Response(response)


class SaveItemSizeGroupColorwayTypeFabricConsumptionRatio(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, MERCHANT_ADMIN_ROLE ]
    _errors = {}
    #editable_states = [OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE, ]

    def get_object_current_state(self):
        version = self.get_order_version_or_raise_http404(self.kwargs['order_id'], self.kwargs.get('version_id', None))
        return version.version_state

    def add_error(self, error, key='fabric_errors'):
        if error not in self._errors:
            if key == 'fabric_errors':
                if not self._errors.get(key, None):
                    self._errors[key] = []
                self._errors[key].append(error)
            else:
                self._errors[key] = error

    def get_order_country(self, kwargs, order_id):
        return get_object_or_404(OrderCountry, order_id=order_id, pk=kwargs['country_id'])

    def get_order_item(self, kwargs, order_id):
        return get_object_or_404(OrderItem, order_id=order_id, item_id=kwargs['item_id'])

    def get_colorway_type(self, colorway_category_id):
        return ColorwayCategory.objects.get(pk=colorway_category_id)

    def get_order_colorway(self, kwargs, order_id):
        order_colorway_id = kwargs['colorway_id']
        order_colorway = get_object_or_404(OrderColorway, order_id=order_id, pk=order_colorway_id)
        return order_colorway

    def get_item_colorway_type(self, item_id, colorway_category_id, order_colorway):
        colorway_type = ColorwayItemType.objects.filter(item__item_id=item_id, colorway=order_colorway, colorway_category_id=colorway_category_id)
        return colorway_type

    def get_decimal_value(self, value):
        value = value
        if not value:
            value = None
        return value

    def value_is_decimal(self, value):
        valid = True
        if value:
            try:
                float(value)
            except (ValueError, TypeError) as ex:
                valid = False
        return valid

    def save_file_attachments(self, attachment_data, consumption_object):
        attachment_ids = [attachment.get('id', None) for attachment in attachment_data]
        attachments = FileAttachment.objects.filter(id__in=attachment_ids)
        for attachment in attachments:
            if not consumption_object.attachments.filter(id=attachment.id).exists() and attachment:
                consumption_object.attachments.add(attachment)
        consumption_object.attachments.remove(*consumption_object.attachments.all().exclude(id__in=attachment_ids))

    def validate_and_save_row_data(self, row, object, brand_material):
        consumption_ratio = row.get('consumption_ratio')
        wastage = row.get('wastage')
        attachments = row.get('attachments', [])
        if self.value_is_decimal(consumption_ratio):
            object.costing_consumption_ratio = self.get_decimal_value(consumption_ratio)
        else:
            if consumption_ratio:
                self.add_error('Enter numbers for Consumption Ratio and Wastage')

        if self.value_is_decimal(wastage):
            object.wastage = self.get_decimal_value(wastage)
        else:
            if wastage:
                self.add_error('Enter numbers for Consumption Ratio and Wastage')

        self.save_file_attachments(attachments, object)
        object.save()

    def get_brand_material_and_supplier_inquiry(self, post_data_row, version_id):
        brand_material_id = post_data_row.get('customer_brand_material_id')
        supplier_inquiry_id = post_data_row.get('supplier_inquiry_id')
        supplier_inquiry_detail_id = post_data_row.get('supplier_inquiry_detail_id')
        brand_material = get_object_or_none(CustomerBrandMaterial, {'pk': brand_material_id})
        if not brand_material:
            self.add_error("Fabric %s doesn't exist" % (brand_material_id))

        supplier_inquiry = get_object_or_404(SupplierInquiry, pk=supplier_inquiry_id, version_id=version_id)

        if supplier_inquiry.customer_brand_material != brand_material:
            self.add_error('There is no Supplier Inquiry for material code %s from supplier %s' % (
                brand_material.customer_brand_material_code, brand_material.supplier.name))

        supplier_inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'pk': supplier_inquiry_detail_id, 'supplier_inquiry': supplier_inquiry})
        if not supplier_inquiry_detail:
            self.add_error('Supplier inquiry for given width not found.')

        return {'brand_material': brand_material, 'supplier_inquiry': supplier_inquiry, 'supplier_inquiry_detail': supplier_inquiry_detail}

    def get_response(self):
        response = Response({'success': True})
        if self._errors:
            response = Response({'success': False, 'errors': self._errors}, status=status.HTTP_400_BAD_REQUEST)
        return response

    def validate_and_update_fabric_complete(self, **kwargs):
        version = kwargs['version']
        order_country = kwargs['order_country']
        order_colorway = kwargs['order_colorway']
        order_size_group = kwargs['size_group']
        colorway_category_id = kwargs['colorway_category_id']
        item_id = kwargs['item_id']
        mark_as_complete = kwargs['mark_as_complete']
        cw_type = self.get_colorway_type(colorway_category_id)
        order_items = cw_type.get_order_items_for_item_and_colorway(item_id, order_colorway)
        pack_items = OrderPackItem.objects.filter(pack__version=version, pack__country=order_country,
                                     pack__colorway=order_colorway, pack__size__in=order_size_group.sizes.all(), item__in=order_items)
        valid = True
        for pack_item in pack_items:
            if not pack_item.validate_fabrics_consumption_ratio():
                self.add_error("Make sure that the merchant has reviewed and marked all supplier inquiries as complete.")
                valid = False
                break
        if mark_as_complete and valid:
            pack_items.update(fabric_consumption_data_reviewed=True)
        else:
            pack_items.update(fabric_consumption_data_reviewed=False)
        return valid
        # for pack_item in pack_items:
        #     if pack_item.validate

    def validate_pre_costing_completed_materail(self, costing):
        has_complete = False
        if costing.costing_type == OrderCostingVersion.PRE_COSTING:
            has_complete = CostingCompletedMaterial.objects.filter(material__name=FABRIC_TRIM_TYPES).exists()
        else:
            if costing.version_state == OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE:
                has_complete = True
        return has_complete

    def post(self, request, **kwargs):
        self._errors = {}
        order_id = kwargs['order_id']
        version_id = kwargs['version_id']
        version = self.get_order_version_or_raise_http404(order_id, version_id)

        order_country = self.get_order_country(kwargs, order_id)
        order_colorway = self.get_order_colorway(kwargs, order_id)

        item_id = kwargs['item_id'] # item id not the order item id
        mark_as_complete = request.data.get('complete_status', False)

        colorway_category_id = kwargs['colorway_category_id']
        colorway_type = self.get_item_colorway_type(item_id, colorway_category_id, order_colorway)
        if not colorway_type.exists():
            raise Http404("Colorway Item Type doesn't exist")

        size_group_id = kwargs['size_group_id']

        size_group = get_object_or_404(OrderSizeGroup, pk=size_group_id, order_id=order_id)
        data = request.data.get('data', [])
        has_complete = self.validate_pre_costing_completed_materail(version)
        if has_complete:
            for row in data:
                brand_material_supplier_inquiry = self.get_brand_material_and_supplier_inquiry(row, version_id)
                brand_material = brand_material_supplier_inquiry['brand_material']
                supplier_inquiry = brand_material_supplier_inquiry['supplier_inquiry']
                supplier_inquiry_detail = brand_material_supplier_inquiry['supplier_inquiry_detail']
                if supplier_inquiry and brand_material and supplier_inquiry_detail.supplier_inquiry.customer_brand_material == brand_material:
                    consumption_ratio_object = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.objects.get_or_create(
                        order_size_group=size_group,
                        order_country=order_country,
                        order_colorway=order_colorway,
                        colorway_category_id=colorway_category_id,
                        item_id=item_id,
                        version=version,
                        customer_brand_fabric=brand_material,
                        supplier_inquiry_detail=supplier_inquiry_detail
                    )[0]
                    self.validate_and_save_row_data(row, consumption_ratio_object, brand_material)

            if mark_as_complete and not self.validate_and_update_fabric_complete(version=version, order_country=order_country, order_colorway=order_colorway,
                                                            size_group=size_group, colorway_category_id=colorway_category_id, item_id=item_id, mark_as_complete=mark_as_complete):
                self.add_error('Cannot mark consumption data as complete. Make sure that consumption data is entered for each placement and size.', 'complete_status')
            if not mark_as_complete:
                cw_type = self.get_colorway_type(colorway_category_id)
                order_items = cw_type.get_order_items_for_item_and_colorway(item_id, order_colorway)
                pack_items = OrderPackItem.objects.filter(pack__version=version, pack__country=order_country,
                                     pack__colorway=order_colorway, pack__size__in=size_group.sizes.all(), item__in=order_items)
                pack_items.update(fabric_consumption_data_reviewed=False)
        else:
            return Response("Invalid operation. Editing is not allowed in current state.", status=status.HTTP_400_BAD_REQUEST)

        return self.get_response()


class SaveItemColorwayTypeColorwayFabricConsumptionRatio(SaveItemSizeGroupColorwayTypeFabricConsumptionRatio):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, MERCHANT_ADMIN_ROLE]

    def validate_and_update_fabric_complete(self, **kwargs):
        colorway = kwargs.get('colorway')
        item_id = kwargs.get('item_id')
        colorway_category_id = kwargs.get('colorway_category_id')
        version = kwargs.get('version')
        mark_as_complete = kwargs.get('mark_as_complete')
        cw_type = self.get_colorway_type(colorway_category_id)
        # Get order items for item and colorway
        order_items = cw_type.get_order_items_for_item_and_colorway(item_id, colorway)
        # Get all the order pack items
        pack_items = OrderPackItem.objects.filter(item__in=order_items, pack__colorway=colorway, pack__version=version)
        # Get fabrics for all orderpackitems
        materials = OrderPackItem.get_pack_items_materials(pack_items, Material.FABRIC_MATERIAL)
        inquiries = version.get_version_supplier_inquiries().filter(customer_brand_material__in=materials, version=version)
        # inquiries = SupplierInquiry.objects.filter(customer_brand_material__in=materials, version=version, has_supplier_feedback=True) #TODO -major

        valid = True
        for material in materials:
            material_inquiries = inquiries.filter(customer_brand_material=material)
            material_inquiry_details = SupplierInquiryDetail.objects.filter(supplier_inquiry__in=material_inquiries, completed=True)
            ratios = ItemColorwayColorwayCategoryFabricConsumptionRatio.objects.filter(
                version=version,
                customer_brand_fabric=material,
                supplier_inquiry_detail__in=material_inquiry_details,
                order_colorway=colorway,
                item_id=item_id,
                colorway_category_id=colorway_category_id
            )

            for ratio in ratios:
                if not ratio.validate_consumption_object():
                    valid = False

            if not ratios.exists() or not valid:
                valid = False
                self.add_error("Make sure that the merchant has reviewed and marked all supplier inquiries as complete.")
                break

        ratio_valid = ItemColorwayCategoryFabricConsumptionComplete.objects.get_or_create(
            order_colorway=colorway,
            colorway_category_id=colorway_category_id,
            item_id=item_id,
            version=version
        )[0]

        if mark_as_complete and valid:
            ratio_valid.fabric_consumption_data_reviewed = True
        else:
            ratio_valid.fabric_consumption_data_reviewed = False
        ratio_valid.save()

        return valid

    def post(self, request, **kwargs):
        self._errors = {}
        order_id = kwargs['order_id']
        version_id = kwargs['version_id']
        version = self.get_order_version_or_raise_http404(order_id, version_id)
        order_colorway = self.get_order_colorway(kwargs, order_id)

        item_id = kwargs['item_id']  # item id not the version id
        colorway_category_id = kwargs['colorway_category_id']
        colorway_type = self.get_item_colorway_type(item_id, colorway_category_id, order_colorway)
        if not colorway_type.exists():
            raise Http404("Colorway Item Type doesn't exist")
        data = request.data.get('data', [])
        mark_as_complete = request.data.get('complete_status', False)

        for row in data:
            brand_material_supplier_inquiry = self.get_brand_material_and_supplier_inquiry(row, version_id)
            brand_material = brand_material_supplier_inquiry['brand_material']
            supplier_inquiry = brand_material_supplier_inquiry['supplier_inquiry']
            supplier_inquiry_detail = brand_material_supplier_inquiry['supplier_inquiry_detail']
            if supplier_inquiry and brand_material and supplier_inquiry_detail.supplier_inquiry.customer_brand_material == brand_material:
                consumption_ratio_object = ItemColorwayColorwayCategoryFabricConsumptionRatio.objects.get_or_create(
                    order_colorway=order_colorway,
                    colorway_category_id=colorway_category_id,
                    item_id=item_id,
                    version=version,
                    customer_brand_fabric=brand_material,
                    supplier_inquiry_detail=supplier_inquiry_detail
                )[0]
                self.validate_and_save_row_data(row, consumption_ratio_object, brand_material)

        if mark_as_complete and not self.validate_and_update_fabric_complete(colorway=order_colorway, item_id=item_id, colorway_category_id=colorway_category_id,
                                                        version=version, mark_as_complete=mark_as_complete):
            self.add_error('Cannot mark consumption data as complete. Make sure that consumption data is entered for every material.', 'complete_status')
        return self.get_response()


class SaveItemColorwayTypeFabricConsumptionRatio(SaveItemSizeGroupColorwayTypeFabricConsumptionRatio):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, MERCHANT_ADMIN_ROLE, ]

    def validate_and_update_fabric_complete(self, **kwargs):
        item_id = kwargs.get('item_id')
        version = kwargs.get('version')
        colorway_category = kwargs.get('colorway_category')
        mark_as_complete = kwargs.get('mark_as_complete')

        cw_type_colorway_items = colorway_category.colorwayitemtype_set.filter(item__item_id=item_id)
        filter_q_objects = Q()
        for cw_type_colorway_item in cw_type_colorway_items:
            filter_q_objects |= Q(pack__colorway=cw_type_colorway_item.colorway, item=cw_type_colorway_item.item, pack__version=version)
        pack_items = OrderPackItem.objects.filter(filter_q_objects)
        customer_brand_materials = OrderPackItem.get_pack_items_materials(pack_items, Material.FABRIC_MATERIAL)

        supplier_inquiries = self.version.get_version_supplier_inquiries().filter(
            customer_brand_material__in=customer_brand_materials, version=version)
        valid = True

        for customer_brand_material in customer_brand_materials:
            material_inquiries = supplier_inquiries.filter(customer_brand_material=customer_brand_material)
            material_inquiry_details = SupplierInquiryDetail.objects.filter(supplier_inquiry__in=material_inquiries, completed=True)

            ratios = ItemColorwayCategoryFabricConsumptionRatio.objects.filter(
                version=version,
                customer_brand_fabric=customer_brand_material,
                supplier_inquiry_detail__in=material_inquiry_details,
                colorway_category=colorway_category,
                item_id=item_id
            )
            for ratio in ratios:
                if not ratio.validate_consumption_object():
                    valid = False
            if not ratios.exists() or not valid:
                valid = False
                self.add_error("Make sure that the merchant has reviewed and marked all supplier inquiries as complete.")
                break
        ratio_valid = ItemColorwayTypeFabricConsumptionComplete.objects.get_or_create(
            colorway_category=colorway_category,
            item_id=item_id,
            version=version
        )[0]
        if mark_as_complete and valid:
            ratio_valid.fabric_consumption_data_reviewed = True
        else:
            ratio_valid.fabric_consumption_data_reviewed = False
        ratio_valid.save()

        return valid

    def post(self, request, **kwargs):
        self._errors = {}
        order_id = kwargs['order_id']
        version_id = kwargs['version_id']
        self.version = self.get_order_version_or_raise_http404(order_id, version_id)
        mark_as_complete = request.data.get('complete_status', False)

        item_id = kwargs['item_id']  # item id not the version id

        colorway_category = self.get_colorway_type(kwargs['colorway_category_id'])

        data = request.data.get('data', [])

        for row in data:
            brand_material_supplier_inquiry = self.get_brand_material_and_supplier_inquiry(row, version_id)
            brand_material = brand_material_supplier_inquiry['brand_material']
            supplier_inquiry = brand_material_supplier_inquiry['supplier_inquiry']
            supplier_inquiry_detail = brand_material_supplier_inquiry['supplier_inquiry_detail']

            if supplier_inquiry_detail and brand_material and  supplier_inquiry_detail.supplier_inquiry.customer_brand_material == brand_material:
                consumption_ratio_object = ItemColorwayCategoryFabricConsumptionRatio.objects.get_or_create(
                    colorway_category=colorway_category,
                    item_id=item_id,
                    version=self.version,
                    customer_brand_fabric=brand_material,
                    supplier_inquiry_detail=supplier_inquiry_detail
                )[0]
                self.validate_and_save_row_data(row, consumption_ratio_object, brand_material)
        if mark_as_complete and not self.validate_and_update_fabric_complete(version=self.version, item_id=item_id, colorway_category=colorway_category, mark_as_complete=mark_as_complete):
            self.add_error(
                'Cannot mark consumption data as complete. Make sure that consumption data is entered for every material.',
                'complete_status')

        return self.get_response()


class CADInquiryView(ListAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = OrderVersionOrderInquirySerializer

    def get_queryset(self):
        current_url = resolve(self.request.path_info).url_name
        qs = OrderCostingVersion.objects.all().prefetch_related('order')
        if current_url == 'completed-consumption-ratios':
            qs = qs.filter().exclude(
                Q(version_state=OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE) |
                Q(version_state=OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE)
            )
        elif current_url == 'pending-consumption-ratios':
            qs = qs.filter(version_state=OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE)
        elif current_url == 'upcoming-consumption-ratios':
            qs = qs.filter(version_state=OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE)
        return qs


class CADPurchaseOrderAllocatedMaterialListMaterialView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = CADPurchaseOrderAllocatedMaterialSerializer
    
    def get_delivery_dates(self, material_queryset):
        delivery_dates = {}
        for material in material_queryset:
            if material:
                supplier_delivery_dates = material.in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplierdeliverydate_set.all()
                material_delivery_dates = [supplier_delivery_date.actual_delivery_date.delivery_date for supplier_delivery_date in supplier_delivery_dates.distinct('actual_delivery_date__delivery_date') if supplier_delivery_date.actual_delivery_date]
                for material_delivery_date in material_delivery_dates:
                    material_delivery_date_string = str(material_delivery_date)
                    if not material_delivery_date_string in delivery_dates:
                        delivery_dates[material_delivery_date_string] = []
                    for supplier_delivery_date in supplier_delivery_dates.filter(actual_delivery_date__delivery_date=material_delivery_date):
                        delivery_dates[material_delivery_date_string].append(supplier_delivery_date.general_po_supplier.supplier_po)

        
        return delivery_dates
    
    def get_object_attribute(self, object, path):
            attributes = path.split('__')
            for i in range(0, len(attributes)):
                object = object.__getattribute__(attributes[i])
                if not object:
                    break
            return object

    def get(self, request, *args, **kwargs):
        
        club_id = kwargs['club_id']
        self.queryset = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__actual_po_club=club_id)
        filters = {
            'material':{'filter': 'in_house_material__grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material',
                        'filter_name': 'material',
                        'attribute': 'verbose_reference_code'},
            'delivery_date': {'filter': 'in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__in',
                              'filter_name': 'delevery_date',
                              'attribute': None},
            'batch_number': {'filter': 'in_house_material__grn_material_detail__batch_number',
                             'filter_name': 'batch_number',
                             'attribute': 'batch_number'},
            'shade_group': {'filter': 'in_house_material__grn_material_detail__shade__supplier_po_shade',
                            'filter_name': 'shade_group',
                            'attribute': 'shade_name'},
            'width': {'filter': 'in_house_material__grn_material_detail__fabricgrndetail__actual_width',
                      'filter_name': 'width',
                      'attribute': 'actual_width'}
        }
        cad_purchase_order_allocated_material_data = []
        materials = [self.get_object_attribute(purchase_order_allocated_material,filters['material']['filter'])
                     for purchase_order_allocated_material in self.queryset.distinct(filters['material']['filter'])]
        for material in materials:
            all_widths = []
            material_data = {
                    'material_name': material.verbose_reference_code,
                    'material_id': material.id,
                    'deliveries':[]
                }
            material_queryset = self.queryset.filter(in_house_material__supplier_material__customer_brand_material=material)
            supplier_delivery_dates = self.get_delivery_dates(material_queryset)
            for delivery_date in supplier_delivery_dates:
                delivery_date_data = {
                        'delivery_date': delivery_date,
                        'batch_numbers': []
                    }
                delivery_date_queryset = material_queryset.filter(**{filters['delivery_date']['filter']: supplier_delivery_dates[delivery_date]})
                batch_numbers = [self.get_object_attribute(purchase_order_allocated_material,filters['batch_number']['filter'])
                                 for purchase_order_allocated_material in delivery_date_queryset.distinct(filters['batch_number']['filter'])]
                if material.material_type == FABRIC_TRIM_TYPES:
                    for batch_number in batch_numbers:
                        batch_number_data = {
                                'batch_number': batch_number.id,
                                'batch_number': batch_number.batch_number,
                                'shade_groups': []
                            }
                        batch_number_queryset = delivery_date_queryset.filter(**{filters['batch_number']['filter']: batch_number})
                        shade_groups = [self.get_object_attribute(purchase_order_allocated_material,filters['shade_group']['filter'])
                                        for purchase_order_allocated_material in batch_number_queryset.distinct(filters['shade_group']['filter'])]
                        for shade_group in shade_groups:
                            if shade_group:
                                shade_group_data = {
                                        'id': shade_group.id,
                                        'shade_group': shade_group.shade_name,
                                        'widths': []
                                    }
                                shade_group_queryset = batch_number_queryset.filter(**{filters['shade_group']['filter']: shade_group})
                                widths = [self.get_object_attribute(purchase_order_allocated_material,filters['width']['filter'])
                                        for purchase_order_allocated_material in shade_group_queryset.distinct(filters['width']['filter'])]
                                for width_group in widths:
                                    width_group_details = {
                                        'id': width_group.id,
                                        'width': width_group.actual_width,
                                        'width_units': width_group.actual_width_units
                                    }
                                    if not width_group_details in all_widths:
                                        all_widths.append(width_group_details)
                                    width_group_data = {
                                            'id': width_group.id,
                                            'width': width_group.actual_width,
                                            'width_units': width_group.actual_width_units,
                                            'rolls': []
                                        }
                                    width_queryset = shade_group_queryset.filter(**{filters['width']['filter']: width_group})
                                    for width in width_queryset:
                                        width_group_data['rolls'].append(width.in_house_material.grn_material_detail.fabricgrndetail.pack_number)
                                    shade_group_data['widths'].append(width_group_data)
                                batch_number_data['shade_groups'].append(shade_group_data)
                        delivery_date_data['batch_numbers'].append(batch_number_data)
                material_data['deliveries'].append(delivery_date_data)
            material_data['unique_widths'] = all_widths
            cad_purchase_order_allocated_material_data.append(material_data)
        return Response(data=cad_purchase_order_allocated_material_data)
    

class CADPurchaseOrderAllocatedMaterialListDeliveryDateView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = CADPurchaseOrderAllocatedMaterialSerializer

    def get_delivery_dates(self, material_queryset):
        delivery_dates = {}
        for material in material_queryset:
            supplier_delivery_dates = material.in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplierdeliverydate_set.all()
            material_delivery_dates = [supplier_delivery_date.actual_delivery_date.delivery_date for supplier_delivery_date in supplier_delivery_dates.distinct('actual_delivery_date__delivery_date') if supplier_delivery_date.actual_delivery_date]
            for material_delivery_date in material_delivery_dates:
                material_delivery_date_string = str(material_delivery_date)
                if not material_delivery_date_string in delivery_dates:
                    delivery_dates[material_delivery_date_string] = []
                for supplier_delivery_date in supplier_delivery_dates.filter(actual_delivery_date__delivery_date=material_delivery_date):
                    delivery_dates[material_delivery_date_string].append(supplier_delivery_date.general_po_supplier.supplier_po)

        
        return delivery_dates
    
    def get_object_attribute(self, object, path):
            attributes = path.split('__')
            for i in range(0, len(attributes)):
                object = object.__getattribute__(attributes[i])
                if not object:
                    break
            return object

    def get(self, request, *args, **kwargs):
        club_id = kwargs['club_id']
        self.queryset = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__actual_po_club=club_id)
        filters = {
            'material':{'filter': 'in_house_material__material',
                        'filter_name': 'material',
                        'attribute': 'verbose_reference_code'},
            'delivery_date': {'filter': 'in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__in',
                              'filter_name': 'delevery_date',
                              'attribute': None},
            'batch_number': {'filter': 'in_house_material__grn_material_detail__batch_number',
                             'filter_name': 'batch_number',
                             'attribute': 'batch_number'},
            'shade_group': {'filter': 'in_house_material__grn_material_detail__shade__supplier_po_shade',
                            'filter_name': 'shade_group',
                            'attribute': 'shade_name'},
            'width': {'filter': 'in_house_material__grn_material_detail__fabricgrndetail__actual_width',
                      'filter_name': 'width',
                      'attribute': 'actual_width'}
        }
        cad_purchase_order_allocated_material_data = []
        delivery_dates = self.get_delivery_dates(self.queryset)
        delivery_count = 0
        for delivery_date in delivery_dates:
            all_widths = []
            delivery_count += 1
            delivery_date_data = {
                'delivery_date': delivery_date,
                'delivery_name': 'Delivery ' + str(delivery_count),
                'shade_groups': []
            }
            delivery_date_queryset = self.queryset.filter(**{filters['delivery_date']['filter']:delivery_dates[delivery_date]})
            shade_groups = [self.get_object_attribute(purchase_order_allocated_material,filters['shade_group']['filter'])
                              for purchase_order_allocated_material in delivery_date_queryset.distinct(filters['shade_group']['filter'])]
            for shade_group in shade_groups:
                if shade_group:
                    shade_group_data = {
                        'id': shade_group.id,
                        'shade_group': shade_group.shade_name,
                        'qty': 0,
                        'widths': []
                    }
                    shade_group_queryset = delivery_date_queryset.filter(**{filters['shade_group']['filter']: shade_group})
                    widths = [self.get_object_attribute(purchase_order_allocated_material,filters['width']['filter'])
                                    for purchase_order_allocated_material in shade_group_queryset.distinct(filters['width']['filter'])]
                    for width_group in widths:
                        width_group_details = {
                            'id': width_group.id,
                            'width': width_group.actual_width,
                            'width_units': width_group.actual_width_units
                        }
                        if not width_group_details in all_widths:
                            all_widths.append(width_group_details)
                        width_group_data = {
                            'qty': 0,
                            'id': width_group.id,
                            'width': width_group.actual_width,
                            'width_units': width_group.actual_width_units,
                            'rolls': []
                        }
                        width_queryset = shade_group_queryset.filter(**{filters['width']['filter']: width_group})
                        for width in width_queryset:
                            width_group_data['rolls'].append(width.in_house_material.grn_material_detail.fabricgrndetail.pack_number)
                            width_group_data['qty'] += width.normalized_allocated_quantity['quantity']
                            shade_group_data['qty'] += width.normalized_allocated_quantity['quantity']
                            width_group_data['qty'] = round(width_group_data['qty'], 2)
                            shade_group_data['qty'] = round(shade_group_data['qty'], 2)
                        shade_group_data['widths'].append(width_group_data)
                    delivery_date_data['shade_groups'].append(shade_group_data)
            delivery_date_data['unique_widths'] = all_widths
            cad_purchase_order_allocated_material_data.append(delivery_date_data)
                            
        return Response(data=cad_purchase_order_allocated_material_data)
    

class CADPurchaseOrderAllocatedMaterialListShadeGroupView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = CADPurchaseOrderAllocatedMaterialSerializer

    def get_delivery_dates(self, material_queryset):
        delivery_dates = {}
        for material in material_queryset:
            supplier_delivery_dates = material.in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplierdeliverydate_set.all()
            material_delivery_dates = [supplier_delivery_date.actual_delivery_date.delivery_date for supplier_delivery_date in supplier_delivery_dates.distinct('actual_delivery_date__delivery_date') if supplier_delivery_date.actual_delivery_date]
            for material_delivery_date in material_delivery_dates:
                material_delivery_date_string = str(material_delivery_date)
                if not material_delivery_date_string in delivery_dates:
                    delivery_dates[material_delivery_date_string] = []
                for supplier_delivery_date in supplier_delivery_dates.filter(actual_delivery_date__delivery_date=material_delivery_date):
                    delivery_dates[material_delivery_date_string].append(supplier_delivery_date.general_po_supplier.supplier_po)

        
        return delivery_dates
    
    def get_object_attribute(self, object, path):
            attributes = path.split('__')
            for i in range(0, len(attributes)):
                object = object.__getattribute__(attributes[i])
                if not object:
                    break
            return object

    def get(self, request, *args, **kwargs):
        club_id = kwargs['club_id']
        self.queryset = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__actual_po_club=club_id)
        filters = {
            'material':{'filter': 'in_house_material__material',
                        'filter_name': 'material',
                        'attribute': 'verbose_reference_code'},
            'delivery_date': {'filter': 'in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__in',
                              'filter_name': 'delevery_date',
                              'attribute': None},
            'batch_number': {'filter': 'in_house_material__grn_material_detail__batch_number',
                             'filter_name': 'batch_number',
                             'attribute': 'batch_number'},
            'shade_group': {'filter': 'in_house_material__grn_material_detail__shade__supplier_po_shade',
                            'filter_name': 'shade_group',
                            'attribute': 'shade_name'},
            'width': {'filter': 'in_house_material__grn_material_detail__fabricgrndetail__actual_width',
                      'filter_name': 'width',
                      'attribute': 'actual_width'}
        }
        cad_purchase_order_allocated_material_data = []
        shade_groups = [self.get_object_attribute(purchase_order_allocated_material,filters['shade_group']['filter'])
                              for purchase_order_allocated_material in self.queryset.distinct(filters['shade_group']['filter'])]
        all_widths = []
        for shade_group in shade_groups:
            # all_widths = []
            if shade_group:
                shade_group_data = {
                    'id': shade_group.id,
                    'shade_group': shade_group.shade_name,
                    'qty': 0,
                    'deliveries': []
                }
                shade_group_queryset = self.queryset.filter(**{filters['shade_group']['filter']:shade_group})
                delivery_dates = self.get_delivery_dates(shade_group_queryset)
                for delivery_date in delivery_dates:
                    delivery_date_data = {
                        'delivery_date': delivery_date,
                        'widths': []
                    }
                    delivery_date_queryset = shade_group_queryset.filter(**{filters['delivery_date']['filter']: delivery_dates[delivery_date]})
                    widths = [self.get_object_attribute(purchase_order_allocated_material,filters['width']['filter'])
                                    for purchase_order_allocated_material in delivery_date_queryset.distinct(filters['width']['filter'])]
                    for width_group in widths:
                        width_group_details = {
                            'id': width_group.id,
                            'width': width_group.actual_width,
                            'width_units': width_group.actual_width_units
                        }
                        if not width_group_details in all_widths:
                            all_widths.append(width_group_details)
                        width_group_data = {
                            'qty': 0,
                            'id': width_group.id,
                            'width': width_group.actual_width,
                            'width_units': width_group.actual_width_units,
                            'rolls': []
                        }
                        width_queryset = shade_group_queryset.filter(**{filters['width']['filter']: width_group})
                        for width in width_queryset:
                            width_group_data['rolls'].append(width.in_house_material.grn_material_detail.fabricgrndetail.pack_number)
                            width_group_data['qty'] += width.normalized_allocated_quantity['quantity']
                            shade_group_data['qty'] += width.normalized_allocated_quantity['quantity']
                            width_group_data['qty'] = round(width_group_data['qty'], 2)
                            shade_group_data['qty'] = round(shade_group_data['qty'], 2)
                        delivery_date_data['widths'].append(width_group_data)
                    shade_group_data['deliveries'].append(delivery_date_data)
                shade_group_data['unique_widths'] = all_widths
                cad_purchase_order_allocated_material_data.append(shade_group_data)
                            
        return Response(data=cad_purchase_order_allocated_material_data)
    

class CutPlanMetaView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def get(self, request, *args, **kwargs):
        data = {}
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        po_club_markers = po_club.get_markers().filter(reviewed=True)
        # item_ids = po_club_markers.distinct('item').values_list('item', flat=True)
        # items = Item.objects.filter(pk__in=item_ids)
        
        layering_type_option = []
        marker_length_allowance_units_option = []
        for key, value in MaterialUnitHelper.ALL_LENGTH_UNITS:
            marker_length_allowance_units_option.append({
                "key": key,
                "value": value
            })
        for key, value in MarkerCutPlan.LAYERING_TYPE_CHOICE:
            layering_type_option.append({
                "key": key,
                "value": value
            })
        data = {
            "layering_type_options": layering_type_option,
            "marker_length_allowance_units_options": marker_length_allowance_units_option,
            "materials": []
        }
        po_club_item_markers = po_club_markers.filter()
        material_ids = po_club_item_markers.distinct('po_material').values_list('po_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        for material in materials:
            material_data = {
                "material_id": material.id,
                "material_name": material.verbose_reference_code,
                "widths": []
            }
            material_widths = po_club_item_markers.filter(po_material = material).distinct('width')
            for material_width in material_widths:
                material_width_data = {
                    "width_id": material_width.width.id,
                    "width": material_width.width.width,
                    "width_unit": material_width.width.width_unit,
                    "markers": []
                }
                material_width_markers = po_club_item_markers.filter(po_material=material, width=material_width.width)
                for material_width_marker in material_width_markers:
                    material_width_data['markers'].append({
                        "marker_id": material_width_marker.id,
                        "marker_name": material_width_marker.marker_name,
                        "marker_length": material_width_marker.marker_length,
                        "marker_length_unit": material_width_marker.marker_length_unit
                    })
                material_data["widths"].append(material_width_data)
            data["materials"].append(material_data)
        return Response(data)
    

class MarkerCutPlanSaveView(CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def post(self, request, *args, **kwargs):
        marker = get_object_or_none(POFabricMarker, {'id':request.data.get('marker', None)})
        data = Response({})
        if not marker:
            data = Response(data={
                'marker': ['Please select valid marker']
            },
            status=status.HTTP_400_BAD_REQUEST)
        else:
            if marker.reviewed:
                cut_plans = MarkerCutPlan.objects.filter(marker__po_material=marker.po_material)
                cut_number = 0
                for cut_plan in cut_plans:
                    if cut_number < cut_plan.cut_number:
                        cut_number = cut_plan.cut_number
                    
                cut_number += 1
                request.data['cut_number'] = cut_number
                if marker.marker_length:
                    ply_count = request.data.get('ply_count', None)
                    
                    if not ply_count == None:
                        if ply_count <= 0:
                            ply_count = None
                        else:
                            request.data['required_fabric_qty'] = marker.marker_length*ply_count

                data = super().post(request, *args, **kwargs)
            else:
                data = Response(data={
                    "marker": ["This marker is not reviewed"]
                }, status=status.HTTP_400_BAD_REQUEST                                   )
        return data
    

class POClubMaterialMarkerCutPlanDetailView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def get_queryset(self):
        queryset = []
        temp_queryset = MarkerCutPlan.objects.filter(
            marker__actual_club__id=self.kwargs['po_club_id'],
            marker__po_material__id=self.kwargs['material_id'],
            # marker__item__id=self.kwargs['item_id']
        )
        for state in MarkerCutPlan.STATE_CHOICE:
            state_queryset = temp_queryset.filter(state=state[0])
            for element in state_queryset:
                queryset.append(element)
        return queryset



class POClubMarkerCutPlanDetailView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()


    def get(self, request, *args, **kwargs):
        data=[]
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        po_club_marker_cut_plans = MarkerCutPlan.objects.filter(marker__actual_club=po_club)
        # item_ids = po_club_marker_cut_plans.distinct('marker__item').values_list('marker__item')
        # items = Item.objects.filter(pk__in=item_ids)

        # for item in items:
        #     item_data = {
        #         "item_id": item.id,
        #         "item_name": item.name,
        #         "materials": []
        #     }
        # po_club_item_marker_cut_plans = po_club_marker_cut_plans.filter(marker__item=item)
        material_ids = po_club_marker_cut_plans.distinct('marker__po_material').values_list('marker__po_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        for material in materials:
            po_club_material_marker_cut_plans = po_club_marker_cut_plans.filter(marker__po_material=material)
            data.append({
                "material_id": material.id,
                **CustomerBrandMaterialBasicSerializer(material).data,
                "marker_cut_plans": MarkerCutPlanSerializer(po_club_material_marker_cut_plans, many=True).data
            })
            # data.append(item_data)
        return Response(data)
    

class POClubMarkerCutPlanUpdateView(UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, CAD_ADMIN_ROLE]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def is_marker_cut_plan_attributes_and_data_equal(self, marker_cut_plan, data):
        for key, value in data:
            pass

    def put(self, request, *args, **kwargs):
        admin_user = False
        if request.user.has_role(CAD_ADMIN_ROLE):
            admin_user = True
        marker = get_object_or_none(POFabricMarker, {'id':request.data.get('marker', None)})
        marker_cut_plan = get_object_or_404(MarkerCutPlan, id=kwargs['pk'])
        current_state = marker_cut_plan.state
        new_state = request.data.get('state', None)
        return_data = Response({})
        if marker:
            if marker.reviewed:
                ply_count = request.data.get('ply_count', None)
                cut_number = request.data.get('cut_number', None)
                if not cut_number == None:
                    if cut_number == 0:
                        request.data['cut_number'] = None
                if not ply_count == None:
                    if ply_count > 0:
                        request.data['required_fabric_qty'] = marker.marker_length*ply_count
                    else:
                        request.data['ply_count'] = None
                if not admin_user:
                    if current_state == marker_cut_plan.DRAFT_STATE and new_state == current_state:
                        return_data = super().put(request, *args, **kwargs)
                    elif current_state == marker_cut_plan.ROLL_SEQUENCE_GENARETED_STATE and new_state == marker_cut_plan.FINALIZED_STATE:
                        marker_cut_plan.state = new_state
                        marker_cut_plan.save()
                        return_data = Response(MarkerCutPlanSerializer(marker_cut_plan).data)
                else:
                    return_data = super().put(request, *args, **kwargs)
            else:
                return_data = Response(data={
                    "marker": ["This marker is not reviewed"]
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return_data = Response(data={
                'marker': ['Please select valid marker']
            },
            status=status.HTTP_400_BAD_REQUEST)
        return return_data


class POClubMarkerCutPlanDeleteView(DestroyAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()


class POClubItemMaterialRollSequenceGenarete(RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def get(self, request, *args, **kwargs):
        return_data = []
        # item_id = kwargs['item_id']
        material_id = kwargs['material_id']
        po_club_id = kwargs['po_club_id']
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        # item = get_object_or_404(Item, pk=item_id)
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        roll_sequence_generator = RollSequenceGenerator(po_club)
        roll_sequence_generator.get_roll_sequence(customer_brand_material)
        return Response(return_data)
    

class POClubMarkerCutPlanRollSequenceSelectedRollDetailView(RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = RollSequenceSerializer
    queryset = RollSequence.objects.all()

    def get(self, request, *args, **kwargs):
        data = []
        marker_cut_plan = get_object_or_404(MarkerCutPlan, pk=kwargs['marker_cut_plan_id'])

        # data = RollSequenceSerializer(marker_cut_plan.rollsequence_set.all(), many=True).data
        for roll_sequence in marker_cut_plan.rollsequence_set.all():
            selected_rolls = SelectedRollSerializer(roll_sequence.selectedroll_set.all(), many=True).data
            selected_rolls = []
            cumulative_ply_count = 0
            for selected_roll in roll_sequence.selectedroll_set.all().order_by('sequence_number'):
                cumulative_ply_count += selected_roll.ply_count
                selected_roll_data = SelectedRollSerializer(selected_roll).data
                selected_roll_data['cumulative_ply_count'] = cumulative_ply_count
                selected_rolls.append(selected_roll_data)
            data.extend(selected_rolls)
        return Response(data)
    

class POClubMarkerCutPlanGenarete(RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def get(self, request, *args, **kwargs):
        errors = {}
        has_errors = False
        return_status = status.HTTP_200_OK
        data = {
            'status': 'Success'
        }
        po_club_id = kwargs.get('po_club_id', None)
        # item_id = kwargs.get('item_id', None)
        material_id = kwargs.get('material_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        # item = get_object_or_404(Item, pk=item_id)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        marker_cut_plan_generator = MarkerCutPlanGenerator(po_club)

        marker_cut_plan_generator.create_marker_cut_plans(material)

        return Response(data, return_status)


class POClubMarkerCutPlanRollSequenceItemMaterialFinalizedView(UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = MarkerCutPlanSerializer
    queryset = MarkerCutPlan.objects.all()

    def put(self, request, *args, **kwargs):
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        # item = get_object_or_404(Item, pk=kwargs['item_id'])
        material = get_object_or_404(CustomerBrandMaterial, pk=kwargs['material_id'])
        marker_cut_plans = MarkerCutPlan.objects.filter(marker__actual_club=po_club,
                                                        # marker__item=item,
                                                        marker__po_material=material)
        if not marker_cut_plans.filter(state=MarkerCutPlan.DRAFT_STATE).exists():
            response = Response({"Successful"})
            for marker_cut_plan in marker_cut_plans:
                marker_cut_plan.state = MarkerCutPlan.FINALIZED_STATE
                marker_cut_plan.save()
        else:
            response = Response(data={"All marker cut plan should have roll sequence"}, status=status.HTTP_400_BAD_REQUEST)
        return response
    

class POClubMaterialRollListView(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderAllocatedMaterialRollListSerializer
    queryset = PurchaseOrderAllocatedMaterial.objects.all()

    def get_queryset(self):
        po_club_id = self.kwargs['po_club_id']
        material_id = self.kwargs['material_id']
        roll_state = self.request.GET['roll_state']
        queryset = PurchaseOrderAllocatedMaterial.objects.filter(
            in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club__id=po_club_id,
            in_house_material__grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material__id=material_id
        )
        return_queryset = []
        for element in queryset:
            if element.in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_type == FABRIC_TRIM_TYPES:
                if roll_state == 'finalized':
                    if element.normalized_used_quantity['quantity'] > 0:
                        return_queryset.append(element)
                elif roll_state == 'available':
                    if element.normalized_available_quantity > 0:
                        return_queryset.append(element)
        return return_queryset
    

class PendingSpeedConsumptionListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        from shared.models import ActionTask, Customer
        from shared.approvals.constants.task_descriptions import COSTING_SPEED_CONSUMPTION_DESCRIPTION

        action_tasks = ActionTask.objects.filter(
            task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE],
            task_name=COSTING_SPEED_CONSUMPTION_DESCRIPTION
        )
        
        costing_ids = [
            entity["entity_id"]
            for action_task in action_tasks
            for entity in action_task.get_task_or_approval_entities()
        ]

        costings = OrderCostingVersion.objects.filter(id__in=costing_ids)

        customers = Customer.objects.filter(id__in=costings.values_list("order__customer", flat=True))

        customer_data = {}

        for customer in customers:
            customer_name = customer.name
            customer_data[customer_name] = []

        for costing in costings:
            customer_name = costing.order.customer.name
            customer_data[customer_name].append({
                'id': costing.id,
                'display_number': costing.display_number,
                'short_code': costing.short_code,
                'long_code': costing.long_code
            })

        updated_customer_data = {
            f"{customer_name} | {len(records)}": records
            for customer_name, records in customer_data.items()
        }
        data = {
            'count': costings.count(),
            'customer_data': updated_customer_data
        }

        return Response(data)
    

class PendingSpeedConsumptionDetailView(RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderPlacementSpeedConsumptionCADSerializer
    queryset = OrderCostingVersion.objects.all()


class OrderPlacementSpeedConsumptionCADSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request):
        item_data = request.data.get('item_data')
        for row in item_data['placements']:
            id = row['id']
            estimated_consumption_ratio = row['estimated_consumption_ratio']
            material_id = row['material_id']
            order_placement = get_object_or_404(OrderPlacement, pk=id)
            order_placement.estimated_consumption_ratio = estimated_consumption_ratio
            order_placement.estimated_consumption_ratio_units = order_placement.material.get_consumption_measuring_unit() if order_placement.material else None
            order_placement.save()
            if material_id:
                customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
                order_pack_item_placements = order_placement.orderpackitemplacement_set.all()
                for order_pack_item_placement in order_pack_item_placements:
                    order_pack_item_placement_material, created = OrderPackItemPlacementMaterial.objects.get_or_create(
                        placement=order_pack_item_placement
                    )
                    order_pack_item_placement_material.material = customer_brand_material
                    order_pack_item_placement_material.save()
        return Response({'success': True})
    

class OrderPlacementSpeedConsumptionCADTaskCompleteUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get_action_task(self, version_id):
        from django.db.models import Q
        action_task = ActionTask.objects.filter(
            Q(task_state__in=[ActionTask.OPEN_STATE, ActionTask.IN_PROGRESS_STATE]) & 
            Q(task_name=COSTING_SPEED_CONSUMPTION_DESCRIPTION) & 
            Q(entity__contains=[{"entity_id": version_id}])
        )
        if action_task:
            return action_task[0]
        return None

    
    def post(self, request, version_id):
        data = []
        action_task = self.get_action_task(version_id)
        if action_task:
            action_task.task_state = ActionTask.CLOSED_COMPLETE_STATE
            action_task.save()
            http_response = Response({'status': True})
        else:
            http_response = Response({'status': 'No task found'}, status=status.HTTP_400_BAD_REQUEST)
        return http_response