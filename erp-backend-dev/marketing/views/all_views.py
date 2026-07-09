from django.shortcuts import render, get_object_or_404
from rest_framework import status

from marketing.helpers.cad_interface_helprs import PackItemCadInterfacePlacementMaterial, \
    PackCadInterfacePlacementMaterial
from marketing.helpers.material_helper import *
from marketing.mixins.material_mixins import PlacementInfoMixin, PackItemPlacementInfoMixin, PackPlacementInfoMixin
from marketing.mixins.order_mixins import OrderMixin
from marketing.models import *
from marketing.permissions.costing_permissions import OrderInquiryPermissionMixin
from marketing.utils.aws_utils import handle_uploaded_file
from marketing.utils.placement_material_utils import get_pack_item_placement_material_helper_class, \
    get_order_pack_placement_material_helper
from shared.constants.global_constants import FORM_ERRORS_KEY, FIELD_ERRORS_KEY
from shared.models import *
from marketing.serializers import *
from rest_framework import viewsets
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from shared.permissions.view_permissions import HasPermission
from shared.permissions.roles import MERCHANT_ROLE, MERCHANT_ADMIN_ROLE, CAD_USER_ROLE, IE_USER_ROLE, BUSINESS_ADMIN_ROLE
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse, Http404
from rest_framework import status
from django.db import transaction
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from shared.utils import get_object_or_none, get_object_or_none_qs, make_flat_list_unique, Pagination, clean_search_dictionary, search_qs_from_global_filter, search_qs_from_global_filter_v2
import os
from marketing.imports import item_templates
from materials.fieldmetadata.material_metadata import get_pack_item_placement_material_metadata, \
    get_user_defined_material_meta_data, get_fabric_headers, get_user_defined_material_headers, \
    ATTRIBUTE_DISPLAY_VALUE_KEY, ATTRIBUTE_VALUE_KEY, HEADER_LABEL_KEY, \
    ATTRIBUTE_TYPE_KEY, get_services_headers
from materials.models import Material
from shared.utils import search_qs_from_id
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
import uuid

class ItemCreateListView(generics.ListCreateAPIView):
    queryset = Item.objects.all().order_by('-id')
    serializer_class = ItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get(self,request,*args,**kwargs):
        customer_ids = request.query_params.get('customer_ids')
        if customer_ids:
            customer_ids_list = [int(id) for id in customer_ids.split(',')]
            customer_brand =CustomerBrand.objects.filter(customer_id__in=customer_ids_list)
            items = Item.objects.filter(customer_brand__in=customer_brand)
            self.queryset = items
        else:
            self.queryset = self.queryset.all()
        return super().get(request, *args, **kwargs)


class ItemListView(generics.ListAPIView):
    serializer_class = ItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]
    
    def get_field_list(self):

        field_list = [
            {'field_name': 'name', 'field_type': 'text', 'front_end_field_name': 'name'},
            {'field_name': 'code', 'field_type': 'text', 'front_end_field_name': 'code'},
            {'field_name': 'customer_brand__customer__name', 'field_type': 'text', 'front_end_field_name': 'customer_brand_name'},
            {'field_name': 'customer_brand__brand__name', 'field_type': 'text', 'front_end_field_name': 'customer_brand_name'},
        ]
        return field_list
    
    def get_queryset(self):

        qs = Item.objects.all().order_by('-id')
        field_list = self.get_field_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, Item)
        
        status = self.request.query_params.get('active')     
        if status:
            if status.lower() == 'active':
                qs = qs.filter(active=True)
            elif status.lower() == 'inactive':
                qs = qs.filter(active=False)
        return qs
    
    def get(self, request, *args, **kwargs):

        queryset = self.get_queryset()
        pagination = GeneralLargeResultsSetPagination()
        paginated_items = pagination.paginate_queryset(queryset, request, view=self)
        serializer = self.get_serializer(paginated_items, many=True)
        return pagination.get_paginated_response(serializer.data)
   

class ItemPaginateListView(generics.ListAPIView):
    queryset = Item.objects.all().order_by('-id')
    serializer_class = ItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination
    
    sort_keys = {
        }

    def clean_dictionary(self, dic):
        replace_keys = {
        }
        cleaned_dictionary = clean_search_dictionary(dic, replace_keys)
        return cleaned_dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('search_text', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.sort_keys.get(sort_col, '-id')
        sort_dir = self.request.query_params.get('sort_dir', None)
        search_fields = ['id', 'name', ]
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, None, sort_dir, Item)
        return qs
    
    
class ItemUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Item.objects.all().order_by('-id')
    serializer_class = ItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ItemVariationOperationCloneView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    
    def post(self, request, source_item_variation_id, destination_item_variation_id):
        source_item_variation = get_object_or_404(ItemVariation, pk=source_item_variation_id)
        destination_item_variation = get_object_or_404(ItemVariation, pk=destination_item_variation_id)
        selected_item_operation_ids = request.data.get('selected_item_operation_ids', [])
        errors = []
        source_operations = ItemVariationOperation.objects.filter(id__in=selected_item_operation_ids)
        with transaction.atomic():
            for source_operation in source_operations:
                #machine_type = get_object_or_404(MachineType, pk=)
                data = {
                    'id': None,
                    'video': source_operation.video,
                    'operation_name': source_operation.operation_name,
                    'costing_smv': source_operation.costing_smv,
                    'factory_smv': source_operation.factory_smv,
                    'machine_type': source_operation.machine_type.id,
                    'folder_type': source_operation.folder_type.id if source_operation.folder_type else None,
                    'item': destination_item_variation.item,
                    'variation': destination_item_variation.id,
                }
                serializer = ItemVariationOperationSerializer(data=data)
                if serializer.is_valid():
                    serializer.save()
                else:
                    errors.append(serializer.errors)
            if errors:
                transaction.set_rollback(True)
                http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                http_response = Response({'sucess': True})
        return http_response


class ItemVariationOperationDeleteView(generics.RetrieveDestroyAPIView):
    queryset = ItemVariationOperation.objects.all().order_by('-id')
    serializer_class = ItemVariationOperationSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

# ItemAttribute views
class ItemAttributeCreateListView(generics.ListCreateAPIView):
    serializer_class = ItemAttributeSerializer
    queryset = ItemAttribute.objects.all().order_by('item')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ItemAttributeDetailEditView(generics.RetrieveUpdateAPIView):
    serializer_class = ItemAttributeSerializer
    queryset = ItemAttribute.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ItemAttributeAssignTypeListView(generics.ListAPIView):
    serializer_class = ItemAttributeAssignTypeSerializer
    queryset = ItemAttribute.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        assign_type_objects = []
        for choice in ItemAttribute.PLACEMENT_ASSIGN_TYPE_OPTIONS:
            assign_type_objects.append({"id": choice[0], "name": choice[1]})
        assign_type_serializer = ItemAttributeAssignTypeSerializer(assign_type_objects, many=True)
        response_data = {
            'placement_assign_types': assign_type_serializer.data,
        }

        return Response(response_data)


class ItemAttributeByCountryColorwayListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_id, version_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        countries = order.get_order_countries()
        colorways = order.get_order_colorways()
        items = order.get_order_items()
        sizes = order.get_order_sizes()

        data = {}

        for country in countries:
            for colorway in colorways:
                if not data.get(country.id, None):
                    data[country.id] = {
                        "country_id": country.id,
                        "country_name": country.country.name,
                        "colorways": {}
                    }

                if colorway.id not in data[country.id]["colorways"]:
                    data[country.id]["colorways"][colorway.id] = {
                        "colorway_id":colorway.id,
                        "colorway_name":colorway.colorway,
                        "items": {},
                    }

                for item in items:
                    if item.id not in data[country.id]["colorways"][colorway.id]["items"]:
                        data[country.id]["colorways"][colorway.id]["items"][item.id] = {
                            "item_id": item.id,
                            "item_name": item.item.name,
                            "item_identifier": item.item_identifier,
                            "placements": {},
                            "other_placements": {},
                        }
                        packs = OrderPack.objects.filter(country=country, colorway=colorway, version=version)
                        pack_items = OrderPackItem.objects.filter(item=item, pack__in=packs, pack__version=version)
                        item_placements = OrderPackItemPlacement.objects.filter(order_pack_item__in=pack_items)
                        for placement in item_placements:

                            if placement.item_attribute_other and placement.item_attribute_other.type==Material.FABRIC_MATERIAL:
                                if placement.item_attribute_other_id not in data[country.id]["colorways"][colorway.id]["items"][item.id]["other_placements"]:
                                    data[country.id]["colorways"][colorway.id]["items"][item.id]["other_placements"][placement.item_attribute_other_id] = {
                                        "placement_id":placement.item_attribute_other_id,
                                        "placement_name":placement.item_attribute_other.name,
                                        "sizes":{}
                                    }
                                    for size in sizes:
                                        packs_with_size = OrderPack.objects.filter(country=country, colorway=colorway, size=size, version=version)
                                        pack_items_with_size = OrderPackItem.objects.filter(item=item, pack__in=packs_with_size, pack__version=version)
                                        placements_in_size = OrderPackItemPlacement.objects.filter(order_pack_item__in=pack_items_with_size, item_attribute_other=placement.item_attribute_other)
                                        for placement_in_size in placements_in_size:
                                            if placement_in_size.order_pack_item.pack.size_id not in data[country.id]["colorways"][colorway.id]["items"][item.id] \
                                                ["other_placements"][placement.item_attribute_other_id]["sizes"]:
                                                pattern_details = placement_in_size.get_item_placement_pattern()
                                                data[country.id]["colorways"][colorway.id]["items"][item.id]["other_placements"][placement.item_attribute_other_id]["sizes"][placement_in_size.order_pack_item.pack.size_id] = {
                                                    "size":placement_in_size.order_pack_item.pack.size_id,
                                                    "size_name":placement_in_size.order_pack_item.pack.size.size.name,
                                                    "attachment":pattern_details
                                                }
        return Response(data)


class ItemAttributeByCountryListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_id, version_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        countries = order.get_order_countries()
        colorways = order.get_order_colorways()
        items = order.get_order_items()
        sizes = order.get_order_sizes()

        data = {}

        for country in countries:
            for colorway in colorways:
                if not data.get(country.id, None):
                    data[country.id] = {
                        "country_id": country.id,
                        "country_name": country.country.name,
                        "items": {}
                    }

                for item in items:
                    if item.id not in data[country.id]["items"]:
                        data[country.id]["items"][item.id] = {
                            "item_id": item.id,
                            "item_name": item.item.name,
                            "item_identifier": item.item_identifier,
                            "placements": {},
                            "other_placements": {},
                        }
                        packs = OrderPack.objects.filter(country=country, version=version)
                        pack_items = OrderPackItem.objects.filter(item=item, pack__in=packs, pack__version=version)
                        item_placements = OrderPackItemPlacement.objects.filter(order_pack_item__in=pack_items)
                        for placement in item_placements:
                            if placement.item_attribute_other and placement.item_attribute_other.type==Material.FABRIC_MATERIAL:
                                if placement.item_attribute_other_id not in data[country.id]["items"][item.id]["other_placements"]:
                                    data[country.id]["items"][item.id]["other_placements"][placement.item_attribute_other_id] = {
                                        "placement_id":placement.item_attribute_other_id,
                                        "placement_name":placement.item_attribute_other.name,
                                        "sizes":{}
                                    }
                                    for size in sizes:
                                        packs_with_size = OrderPack.objects.filter(country=country, colorway=colorway, size=size, version=version)
                                        pack_items_with_size = OrderPackItem.objects.filter(item=item, pack__in=packs_with_size, pack__version=version)
                                        placements_in_size = OrderPackItemPlacement.objects.filter(order_pack_item__in=pack_items_with_size, item_attribute_other=placement.item_attribute_other)
                                        for placement_in_size in placements_in_size:
                                            if placement_in_size.order_pack_item.pack.size_id not in data[country.id]["items"][item.id] \
                                                ["other_placements"][placement.item_attribute_other_id]["sizes"]:
                                                pattern_details = placement_in_size.get_item_placement_pattern()
                                                data[country.id]["items"][item.id]["other_placements"][placement.item_attribute_other_id]["sizes"][placement_in_size.order_pack_item.pack.size_id] = {
                                                    "size":placement_in_size.order_pack_item.pack.size_id,
                                                    "size_name":placement_in_size.order_pack_item.pack.size.size.name,
                                                    "attachment":pattern_details
                                                }
        return Response(data)


class ItemAttributeByItemListView(generics.ListAPIView):
    serializer_class = ItemAttributeSerializer
    queryset = ItemAttribute.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(item_id=self.kwargs['item_id']).order_by('material__display_order', 'material__category')
        return qs


class OrderCountryList(generics.ListAPIView):
    queryset = OrderCountry.objects.all().order_by('-id')
    serializer_class = OrderCountrySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_id=self.kwargs['order_id'])
        return qs


class OrderCountryDelete(generics.DestroyAPIView):
    queryset = OrderCountry.objects.all().order_by('-id')
    serializer_class = OrderCountrySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderColorwayCreate(generics.CreateAPIView):
    serializer_class = OrderColorwaySerializer
    queryset = OrderColorway.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        order = OrderInquiry.objects.get(pk=order_id)
        if request.data.get('colorway_count'):
            try:
                number_of_colorways = int(request.data.get('colorway_count'))
                order.number_of_colorways = number_of_colorways
                order.save()
            except ValueError:
                raise serializers.ValidationError({"number_of_colorways": "Number of colorways must be a number"})
        response = super().create(request, *args, **kwargs)
        return response


class OrderColorwayList(generics.ListCreateAPIView):
    serializer_class = OrderColorwaySerializer
    queryset = OrderColorway.objects.all().order_by('id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_id=self.kwargs['order_id'])
        return qs


class OrderColorwayEditDetailDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = OrderColorway.objects.all().order_by('-id')
    serializer_class = OrderColorwaySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def update(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        order = OrderInquiry.objects.get(pk=order_id)
        if request.data.get('colorway_count'):
            try:
                number_of_colorways = int(request.data.get('colorway_count'))
                order.number_of_colorways = number_of_colorways
                order.save()
            except ValueError:
                raise serializers.ValidationError({"number_of_colorways": "Number of colorways must be a number"})
        response = super().update(request, *args, **kwargs)
        return response


class OrderSizeCreate(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request):
        order_id = request.data.get('order_id')
        size_ids = request.data.get('size_ids')

        order = OrderInquiry.objects.get(id=order_id)

        for size_id in size_ids:
            OrderSize.objects.get_or_create(order=order, size_id=size_id)

        OrderSize.objects.filter(order=order).exclude(size_id__in=size_ids).delete()
        data = {
            'order_id': order_id,
            'size_ids': size_ids
        }
        return Response(data, status=status.HTTP_200_OK)


class OrderSizeDelete(generics.DestroyAPIView):
    serializer_class = OrderSizeSerializer
    queryset = OrderSize.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderSizeList(generics.ListAPIView):
    queryset = OrderSize.objects.all().order_by('id')
    serializer_class = OrderSizeSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_id=self.kwargs['order_id'])
        return qs


class OrderSizeEditDetail(generics.RetrieveUpdateAPIView):
    queryset = OrderSize.objects.all().order_by('-id')
    serializer_class = OrderSizeSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderItemCreate(generics.CreateAPIView):
    serializer_class = OrderItemSerializer
    queryset = OrderItem
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderItemList(generics.ListAPIView):
    queryset = OrderItem.objects.all().order_by('id')
    serializer_class = OrderItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_id=self.kwargs['order_id'])
        return qs


class OrderItemEditDetail(generics.RetrieveUpdateAPIView):
    queryset = OrderItem.objects.all().order_by('-id')
    serializer_class = OrderItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderItemDelete(generics.DestroyAPIView):
    queryset = OrderItem.objects.all().order_by('-id')
    serializer_class = OrderItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


######################################## Fabric Information #################################################

class CustomCreateAPIView(generics.CreateAPIView):
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        newserializer = self.get_serializer(instance=serializer.get_instance())
        return Response(newserializer.data, status=status.HTTP_201_CREATED, headers=headers)


class CustomEditAPIView(generics.RetrieveUpdateDestroyAPIView):
    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        newserializer = self.get_serializer(instance=self.get_object())
        return Response(newserializer.data)


class UnitCreate(generics.CreateAPIView):
    queryset = Unit
    serializer_class = UnitSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class UnitList(generics.ListAPIView):
    queryset = Unit.objects.all().order_by('-id')
    serializer_class = UnitSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class UnitDetail(generics.RetrieveAPIView):
    queryset = Unit.objects.all().order_by('-id')
    serializer_class = UnitSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class UnitEdit(generics.RetrieveUpdateDestroyAPIView):
    queryset = Unit.objects.all().order_by('-id')
    serializer_class = UnitSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class OrderDetailView(generics.RetrieveAPIView):
    queryset = OrderInquiry
    serializer_class = OrderInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


# Order Size Group
class OrderSizeGroupCreateView(generics.CreateAPIView):
    serializer_class = OrderSizeGroupSerializer
    queryset = OrderSizeGroup.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderSizeGroupUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrderSizeGroupSerializer
    queryset = OrderSizeGroup.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderPackItemPlacementCreateUpdateView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def update_individual_pattern(self, order_pack_item, other_placement, file_attachment):
        order_pack_item_placement = OrderPackItemPlacement.objects.get(order_pack_item=order_pack_item, item_attribute_other=other_placement)
        order_pack_item_placement_pattern = OrderPackItemPlacementPattern.objects.get_or_create(
            order_pack_item_placement=order_pack_item_placement)[0]
        if order_pack_item_placement_pattern.pattern_url is not None:
            file_attachment_old = order_pack_item_placement_pattern.pattern_url
            file_attachment_old.active = False
            file_attachment_old.save()
        order_pack_item_placement_pattern.pattern_url = file_attachment
        order_pack_item_placement_pattern.save()

    def update_all_applicable_patterns(self, order_item_id, order_country_id, order_size_id, version, item_attribute_other, file_attachment):
        order_item_instance = OrderItem.objects.get(id=order_item_id)
        order_pack_item_placements = OrderPackItemPlacement.objects.filter(
            order_pack_item__pack__version=version,
            order_pack_item__pack__country_id=order_country_id,
            order_pack_item__pack__size_id=order_size_id,
            order_pack_item__item=order_item_instance,
            item_attribute_other_id=item_attribute_other
        )

        for order_pack_item_placement in order_pack_item_placements:
            order_pack_item_placement_pattern = OrderPackItemPlacementPattern.objects.get_or_create(
                order_pack_item_placement=order_pack_item_placement
            )[0]
            if order_pack_item_placement_pattern.pattern_url is not None:
                file_attachment_old = order_pack_item_placement_pattern.pattern_url
                file_attachment_old.active = False
                file_attachment_old.save()
            order_pack_item_placement_pattern.pattern_url = file_attachment
            order_pack_item_placement_pattern.save()

    def post(self, request, order_id, version_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order=order)

        order_colorway_id = request.data.get("order_colorway_id")
        order_country_id = request.data.get("order_country_id")
        order_size_id = request.data.get("order_size_id")
        order_item_id = request.data.get("order_item_id")
        item_attribute_other = request.data.get("item_attribute_other")
        pattern_type = request.data.get("pattern_type")
        file = request.data.get("image")

        display_name = os.path.splitext(file.name)[0]
        file_path = handle_uploaded_file(file, 'costing/patterns')
        file_name, file_ext = os.path.splitext(file_path)
        file_attachment = FileAttachment.objects.create(display_name=display_name, type=file_ext, file_path=file_path)

        other_placement = get_object_or_none(OrderPlacement, {'id':item_attribute_other, 'version': version})

        if pattern_type == OrderInquiry.INDIVIDUAL:

            order_pack_item = get_object_or_404(
                OrderPackItem,
                pack__country_id=order_country_id,
                pack__colorway_id=order_colorway_id,
                pack__size_id=order_size_id,
                item=order_item_id,
                pack__version=version
            )
            self.update_individual_pattern(order_pack_item, other_placement, file_attachment)

        elif pattern_type == OrderInquiry.ALL_APPLICABLE:
            self.update_all_applicable_patterns(order_item_id, order_country_id, order_size_id, version,
                                           item_attribute_other, file_attachment)
        return Response({"status": "Successful"})
    

class OrderPackItemPlacementDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, pk):
        try:
            order_pack_item_placement = OrderPackItemPlacement.objects.get(pk=pk)
        except ObjectDoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        order_pack_item_placement.delete()
        return Response({'status_text': 'Deleted'}, status=status.HTTP_200_OK)


class OrderPackItemPlacementPatternDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def put(self, request, pattern_id):
        pattern_type = request.data.get("pattern_type")
        pattern = get_object_or_404(OrderPackItemPlacementPattern, pk=pattern_id)

        if pattern_type == OrderInquiry.INDIVIDUAL:
            file_attachment = pattern.pattern_url
            file_attachment.active = False
            file_attachment.save()
            pattern.pattern_url = None
            pattern.save()
        elif pattern_type == OrderInquiry.ALL_APPLICABLE:
            order_country = pattern.order_pack_item_placement.order_pack_item.pack.country
            order_size = pattern.order_pack_item_placement.order_pack_item.pack.size
            version = pattern.order_pack_item_placement.order_pack_item.pack.version
            order_item = pattern.order_pack_item_placement.order_pack_item.item

            item_attribute_other = pattern.order_pack_item_placement.item_attribute_other
            pack_item_placements = OrderPackItemPlacement.objects.filter(
                order_pack_item__pack__country=order_country,
                order_pack_item__pack__size=order_size,
                order_pack_item__pack__version=version,
                order_pack_item__item=order_item,
                item_attribute_other=item_attribute_other
            )
            for pack_item_placement in pack_item_placements:
                if hasattr(pack_item_placement, 'orderpackitemplacementpattern') and pack_item_placement.orderpackitemplacementpattern.pattern_url is not None:
                    file_attachment = pack_item_placement.orderpackitemplacementpattern.pattern_url
                    file_attachment.active = False
                    file_attachment.save()
                    delete_pattern = OrderPackItemPlacementPattern.objects.get(id=pack_item_placement.orderpackitemplacementpattern.id)
                    delete_pattern.pattern_url = None
                    delete_pattern.save()

        return Response({"status": "Pattern Image deleted successfully"})
    
    
class OrderPatternTypeUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def put(self, request, order_id, version_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        pattern_type = request.data.get("pattern_type")
        order_pack_items = version.get_order_pack_items()
        if order:
            if pattern_type == OrderInquiry.ALL_APPLICABLE:
                order.pattern_type = OrderInquiry.ALL_APPLICABLE
                order.save()
                pack_item_placements = OrderPackItemPlacement.objects.filter(order_pack_item__in=order_pack_items)
                pack_item_placements_patterns = OrderPackItemPlacementPattern.objects.filter(order_pack_item_placement__in=pack_item_placements)
                for pack_item_placements_pattern in pack_item_placements_patterns:
                    if pack_item_placements_pattern.pattern_url is not None:
                        file_attachment = pack_item_placements_pattern.pattern_url
                        file_attachment.active = False
                        file_attachment.save()
                        pack_item_placements_pattern.pattern_url = None
                        pack_item_placements_pattern.save()
            elif pattern_type == OrderInquiry.INDIVIDUAL:
                order.pattern_type = OrderInquiry.INDIVIDUAL
                order.save()
        response = {
            'pattern_type':order.pattern_type
        }
        return Response(response)


class MaterialTypeMetaView(APIView):
    allowed_methods = ['GET', ]
    permission_classes = (HasPermission,)
    write_roles = ['merchant', ]

    def get(self, request):
        material_type_objects = []
        type = request.query_params.get('type')
        response_data = {
            'material_types': {},
        }
        if type:
            types = type.split(',')
            for type_value in types:
                # if type_value == 'fabric':
                #     material_type_objects.append({'id': 'fabric', 'name': 'Fabric'})
                userdefinematerials = UserDefinedMaterial.objects.filter(category=type_value)
                for userdefinematerial in userdefinematerials:
                    material_type_objects.append({'id': userdefinematerial.name, 'name': userdefinematerial.material, 
                                                  'estimated_consumption_ratio_units':userdefinematerial.estimated_consumption_ratio_units})
            material_type_serializer = MaterialTypeSerializer(material_type_objects, many=True)
            response_data = {
                'material_types': material_type_serializer.data,
            }

        return Response(response_data)


class MaterialUnitCreateListView(generics.ListCreateAPIView):
    queryset = MaterialUnit.objects.all().order_by('-id')
    serializer_class = MaterialUnitSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class MaterialUnitUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = MaterialUnit.objects.all().order_by('-id')
    serializer_class = MaterialUnitSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ItemTemplateImportView(generics.GenericAPIView):
    permission_classes = (HasPermission,)
    write_roles = ['merchant', ]

    def post(self, request, **kwargs):
        data = item_templates.read_templete(templates_file=request.data.get('templates'))
        return Response(data=data, status=status.HTTP_200_OK)


# class OrderFabricTrimDetails(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, ]

#     def get(self, request, order_id):
#         order = get_object_or_404(OrderInquiry, pk=order_id)
#         order_materials = OrderMaterial.objects.filter(order=order)
#         grouped_order_materials = {}
#         grouped_order_materials_list = []
#         for order_material in order_materials:
#             material_type = order_material.material.type
#             material_type_display = order_material.material.get_type_display()
#             if material_type in grouped_order_materials:
#                 material_data = grouped_order_materials[material_type]
#             else:
#                 if material_type=="fabric":
#                     headers = get_fabric_headers()
#                 else:
#                     headers = get_user_defined_material_headers(material_type)
#                 material_data = {
#                 "headers" : headers,
#                 "title": material_type_display,
#                 "name": material_type,
#                 "data": [],
#             }
#             grouped_order_materials[material_type] = material_data
#             orderpackitemplacementmaterial_ids = order_material.orderpackitemplacementmaterial_set \
#                 .distinct('material', 'variation_id') \
#                 .values_list('id', flat=True)

#             for orderpackitemplacementmaterial_id in orderpackitemplacementmaterial_ids:
#                 orderpackitemplacementmaterial_object = get_object_or_none(OrderPackItemPlacementMaterial, {'pk': orderpackitemplacementmaterial_id})
#                 variation_id = orderpackitemplacementmaterial_object.variation_id
#                 material_detail_variation = order_material.material.get_material_variation_object(variation_id=variation_id)
#                 if material_detail_variation:
#                     material_details = material_detail_variation.get_attributes()
#                 else:
#                     material_details = order_material.material.material_child_object.get_attributes()
#                 if material_details:
#                     data = {
#                         **material_details
#                     }
#                     material_data['data'].append(data)
#             grouped_order_materials_list = list(grouped_order_materials.values())
#         return Response(grouped_order_materials_list)


class OrderFabricTrimDetailByType(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_id):
        type = request.query_params.get('type')
        order = get_object_or_404(OrderInquiry, pk=order_id)
        headers = get_user_defined_material_headers(type)
        customer_brand = CustomerBrand.objects.get_or_create(customer=order.customer, brand=order.brand)[0]

        data = customer_brand.get_customer_brand_materials_data(type)
        response = {
            "headers": headers,
            "data": data
        }
        return Response(response)


class OrderPackReviewedUpdate(generics.RetrieveUpdateAPIView):
    queryset = OrderPack.objects.all().order_by('-id')
    serializer_class = OrderPackSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def put(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class OrderPackItemReviewedUpdate(generics.RetrieveUpdateAPIView):
    queryset = OrderPackItem.objects.all().order_by('-id')
    serializer_class = OrderPackItemReviewUpdateSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get(self, request, order_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        data_set = order.get_order_materials()
        response = []
        for type in data_set:
            headers = get_pack_item_placement_material_metadata(type)
            response.append({
                'name': type,
                'display_name': headers[1],
                'headers': [hed for hed in headers[0] if [] != [dat for dat in data_set[type] if hed['value'] in dat]],
                'data': data_set[type]
            })
        return Response(response)


class VersionMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def sort_materials(self, data):
        material_data = { row['name']: row for row in data}
        materials = UserDefinedMaterial.objects.filter(name__in=material_data.keys()).order_by('category')
        sorted_data = []
        for material in materials:
            sorted_data.append(material_data.pop(material.name))
        data = [*sorted_data, *material_data.values()]
        return data

    def get_version_services(self, version):
        services = version.get_version_service_details()
        service_response = []
        service_headers = get_services_headers()

        for service_type in services:
            service = services[service_type]
            service_response.append({
                'name': service_type,
                'display_name': service['service_type_display'],
                'data': service['data'],
                'headers': service_headers[service_type]
            })
        return service_response

    def get(self, request, version_id):
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        data_set = version.get_version_materials()
        response = []
        for type in data_set:
            headers = get_pack_item_placement_material_metadata(type)
            response.append({
                'name': type,
                'display_name': headers[1],
                'supplier_inquiries_complete':version.supplier_inquiries_complete,
                'headers': [hed for hed in headers[0] if [] != [dat for dat in data_set[type] if hed['value'] in dat]],
                'data': data_set[type]
            })

        response_data = self.sort_materials(response)
        response = [*response_data, *self.get_version_services(version)]
        return Response(response)


class OrderUniquePlacementListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_id, version_id):
        type = request.query_params.get('type')
        material_type = request.query_params.get('material_type')
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order=order)

        try:
            material = UserDefinedMaterial.objects.get(name=material_type)
        except ObjectDoesNotExist:
            data = {'message': "Material not found."}
            return Response(data, status=status.HTTP_400_BAD_REQUEST)

        if type == 'material':
            item_id = request.query_params.get('item_id')
            item = get_object_or_404(Item, pk=item_id)
            qs = OrderPlacement.objects.filter(item=item, version=version, type=material_type, material=material, assign_type=ItemAttribute.ORDER_PACK_ITEM)
        else:
            qs = OrderPlacement.objects.filter(version=version, type=material_type, material=material, assign_type=ItemAttribute.ORDER_PACK)

        serializer = OrderPackItemOtherPlacementSerializer(qs, many=True)
        return Response(serializer.data)


class OrderColorwayItemTypesByItemView(generics.ListAPIView):
    queryset = OrderItem.objects.all().order_by('id')
    serializer_class = OrderItemSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_id=self.kwargs['order_id'], item_id=self.kwargs['item_id'])
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for order_item in queryset:
            colorway_item_types = ColorwayItemType.objects.filter(item=order_item)
            colorways = []
            for colorway_item_type in colorway_item_types:
                colorways.append({
                    'id': colorway_item_type.id,
                    'colorway_id': colorway_item_type.colorway_id,
                    'colorway': colorway_item_type.colorway.colorway,
                    'colorway_category_id': colorway_item_type.colorway_type.id,
                    'colorway_item_type': colorway_item_type.colorway_type.name
                })
            data.append({
                'id': order_item.id,
                'item_id': order_item.item.id,
                'item': order_item.item.name,
                'colorways': colorways
            })

        return Response(data)
    

class OrderInquiryGeneralInformationUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, pk):
        order_inquiry = get_object_or_404(OrderInquiry, pk=pk)
        data = request.data
        order_inquiry.season_id = data['season']
        order_inquiry.year = data['year']
        order_inquiry.style_number = data['style_number']
        order_inquiry.style_description = data['style_description']
        order_inquiry.save()
        return Response({'status': True})



class ItemVariationListCreateView(generics.ListCreateAPIView):
    queryset = ItemVariation.objects.all().order_by('id')
    serializer_class = ItemVariationSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class ItemVariationOperationListCreateView(generics.ListCreateAPIView):
    queryset = ItemVariationOperation.objects.all().order_by('id')
    serializer_class = ItemVariationOperationSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class ItemVariationDetailUpdateView(generics.RetrieveUpdateAPIView):
    queryset = ItemVariation.objects.all().order_by('id')
    serializer_class = ItemVariationSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class ItemVariationOperationDetailUpdateView(generics.RetrieveUpdateAPIView):
    queryset = ItemVariationOperation.objects.all().order_by('id')
    serializer_class = ItemVariationOperationSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


# class ItemVariationDetailView(APIView): ################ commented since duplicated 
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, ]

#     def get(self, request, item_id):
#         qs = ItemVariation.objects.filter(item_id=item_id)
#         serializer = ItemVariationSerializer(qs, many=True)
#         return Response(serializer.data)
    

class ItemVariationOperationDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, variation_id):
        qs = ItemVariationOperation.objects.filter(variation_id=variation_id)
        serializer = ItemVariationOperationSerializer(qs, many=True)
        return Response(serializer.data)
    

class ItemVariationListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    

class ItemVariationDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def get(self, request, *args, **kwargs):
        queryset = get_object_or_404(Item, pk = kwargs['item_id'])
        data = ItemSerializer(queryset).data
        return Response(data=data)


class ItemVariationOperationDisplayOrderUpdateView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]

    queryset = ItemVariationOperation.objects.all()
    serializer_class = ItemVariationOperationSerializer

    def put(self, request, *args, **kwargs):
        errors = {}
        with transaction.atomic():
            for row in request.data:
                item_variation_operation = get_object_or_none(ItemVariationOperation, {'pk': row['item_variation_operation_id']})
                if not item_variation_operation == None:
                    item_variation_operation.display_order = row['display_order']
                    serializer = ItemVariationOperationDisplayOrderSerializer(data=ItemVariationOperationDisplayOrderSerializer(item_variation_operation).data)
                    if serializer.is_valid():
                        item_variation_operation.save()
                    else:
                        errors = {**errors, **serializer.errors}
                else:
                    errors['details'] = 'Not Found'
            if not errors == {}:
                transaction.set_rollback(True)
                data = Response(data = errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                data = Response(data={'status': 'Successfully updated'})
        return data


class OrderItemColorwayOperationCopyOperationCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = OrderItemColorwayOperation.objects.all()
    serializer_class = OrderItemColorwayOperationSerializer

    def copy_operations_from_source(self, designated_colorway_operation, source_colorway_operation):
        designated_colorway_operation.operation_name = source_colorway_operation.operation_name
        designated_colorway_operation.video = source_colorway_operation.video
        designated_colorway_operation.costing_smv = source_colorway_operation.costing_smv
        designated_colorway_operation.factory_smv = source_colorway_operation.factory_smv
        designated_colorway_operation.machine_type = source_colorway_operation.machine_type
        designated_colorway_operation.folder_type = source_colorway_operation.folder_type
        designated_colorway_operation.display_order = source_colorway_operation.display_order
        designated_colorway_operation.active = source_colorway_operation.active
        designated_colorway_operation.save()
        return designated_colorway_operation
    
    def deactivate_item_colorway_operations(self, source_colorway_operations, designated_colorway_item_type, version):
        colorway_operations = OrderItemColorwayOperation.objects.filter(colorway_item_category=designated_colorway_item_type, 
                                                              version=version).exclude(operation_name__in=source_colorway_operations.values_list('operation_name', flat=True))
        for colorway_operation in colorway_operations:
            colorway_operation.active = False
            colorway_operation.save()
        return colorway_operations
    
    def post(self, request, *args, **kwargs):
        source_colorway_item_type = get_object_or_404(ColorwayItemType, pk=request.data.get('colorway_item_type_id', None))
        order_item = get_object_or_404(OrderItem, pk = kwargs['order_item_id'])
        order_colorway = get_object_or_404(OrderColorway, pk = kwargs['order_colorway_id'])
        colorway_category = get_object_or_404(ColorwayCategory, pk=kwargs['colorway_category_id'])
        version = get_object_or_404(OrderCostingVersion, pk = kwargs['version_id'])
        designated_colorway_item_type = get_object_or_none(ColorwayItemType, {'item':order_item, 'colorway':order_colorway, 'colorway_category':colorway_category})
        display_order = len(OrderItemColorwayOperation.objects.filter(colorway_item_category=designated_colorway_item_type, version=version))+1

        if not source_colorway_item_type == None:
            source_colorway_operations = OrderItemColorwayOperation.objects.filter(colorway_item_category = source_colorway_item_type, version = version)
            for source_colorway_operation in source_colorway_operations:
                designated_colorway_operation = get_object_or_none(OrderItemColorwayOperation, 
                                                                   {'colorway_item_category':designated_colorway_item_type, 
                                                                    'operation_name':source_colorway_operation.operation_name, 
                                                                    'version':version})
                
                instance = OrderItemColorwayOperation(version=version, 
                                                    colorway_item_category=designated_colorway_item_type,
                                                    display_order=display_order)
                
                if designated_colorway_operation is None:
                    self.copy_operations_from_source(instance, source_colorway_operation)
                else:
                    self.copy_operations_from_source(designated_colorway_operation, source_colorway_operation)
            self.deactivate_item_colorway_operations(source_colorway_operations, designated_colorway_item_type, version)
            return Response({'status':'Item operations successfully copied'}, status=status.HTTP_200_OK)
        else:
            return Response({'errors': 'Please select colorway item type'}, status=status.HTTP_400_BAD_REQUEST)
    

class OrderItemColorwayOperationItemListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]

    def get(self, request, *args, **kwargs):
        order_item = get_object_or_404(OrderItem, pk=kwargs['order_item_id'])
        colorway_category = get_object_or_404(ColorwayCategory, pk=kwargs['colorway_category_id'])
        order_colorway = get_object_or_404(OrderColorway, pk=kwargs['order_colorway_id'])
        version = get_object_or_404(OrderCostingVersion, pk=kwargs['version_id'])
        colorway_item_types = ColorwayItemType.objects.filter(item__order_id=version.order_id, item__item=order_item.item, 
                                                              colorway_category=colorway_category).exclude(colorway=order_colorway)
        serializer = ColorwayItemTypeSerializer(colorway_item_types, many=True, read_only=True).data

        return Response(serializer)


class OrderCostingVersionListByOperatoinStatusView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderCostingVersion.objects.all().order_by('-id')
    serializer_class = OrderVersionListByOperationsStautsSerializer

    def get_queryset(self):
        type = self.request.query_params.get('type')
        if type == 'complete':
            return self.queryset.filter(operations_completed=True)
        elif type == 'pending':
            return self.queryset.filter(operations_completed=False)


class OrderCostingVersionOperatoinStatusUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = OrderCostingVersion.objects.all().order_by('-id')
    serializer_class = OrderVersionListByOperationsStautsSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            version_state = instance.version_state
            if version_state == instance.COMPLETED_VERSION_STATE and 'operations_completed' in serializer.validated_data:
                return Response({'errors': 'This costing is already in complete state'},
                                status=status.HTTP_403_FORBIDDEN)
            else:
                serializer.save()
                return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrderVersionStateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        data = OrderCostingVersion.VERSION_STATE_CHOICES
        response_data = [{'value': row[0], 'display_value': row[1]} for row in data]
        return Response(response_data)


class OrderVersionStateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def create_or_update_pack_item_finance_cost(self, packs):
        for pack in packs:
            pack_items = pack['pack_items']
            for item in pack_items:
                pack_item = get_object_or_404(OrderPackItem, pk=item["id"])
                pack_item.fabric_finance_cost_percentage = item["fabric_finance_cost_percentage"]
                pack_item.trim_finance_cost_percentage = item["trim_finance_cost_percentage"]
                pack_item.earnings_per_minute = item["earnings_per_minute"]
                pack_item.buyer_commission_percentage = item["buyer_commission_percentage"]
                pack_item.save()
        return True
    
    def remove_pack_item_finance_cost(self, version):
        pack_items  = version.get_order_pack_items()
        for pack_item in pack_items:
            pack_item.fabric_finance_cost_percentage = None
            pack_item.trim_finance_cost_percentage = None
            pack_item.earnings_per_minute = None
            pack_item.buyer_commission_percentage = None
            pack_item.save()
        return True

    def post(self, request, *args, **kwargs):
        version = get_object_or_none(OrderCostingVersion, {'order_id': kwargs['order_id'], 'pk': kwargs['pk']})
        user = request.user
        expiration_date = request.data.get("expiration_date")
        version_state = request.data.get("version_state")
        approved = request.data.get("approved")
        approved_date = request.data.get("approved_date")
        fabric_finance_cost_percentage = request.data.get("fabric_finance_cost_percentage")
        trim_finance_cost_percentage = request.data.get("trim_finance_cost_percentage")
        service_finance_cost_percentage = request.data.get("service_finance_cost_percentage")
        earnings_per_minute = request.data.get("earnings_per_minute")
        buyer_commission_percentage = request.data.get("buyer_commission_percentage")
        pack_item_level_administrative_costs = request.data.get("pack_item_level_administrative_costs")
        lock_finance_editing = request.data.get("lock_finance_editing")
        data = request.data.get("data")
        watchlist = request.data.get("watchlist", [])
        
        errors = []

        if user.has_role(ADMIN_ROLE) or user.has_role(MERCHANT_ADMIN_ROLE):
            if version_state:
                version.version_state = version_state
                if version.version_state != OrderCostingVersion.COMPLETED_VERSION_STATE:
                    version.approved = False

            version.fabric_finance_cost_percentage = fabric_finance_cost_percentage
            version.trim_finance_cost_percentage = trim_finance_cost_percentage
            version.service_finance_cost_percentage = service_finance_cost_percentage
            version.earnings_per_minute = earnings_per_minute
            version.buyer_commission_percentage = buyer_commission_percentage
            version.pack_item_level_administrative_costs = pack_item_level_administrative_costs
            version.lock_finance_editing = lock_finance_editing
            
            if pack_item_level_administrative_costs:
                self.create_or_update_pack_item_finance_cost(data)
            else:
                self.remove_pack_item_finance_cost(version)    

        if user.has_role(BUSINESS_ADMIN_ROLE):
            pass

        if expiration_date:
            version.expiration_date = expiration_date

        if approved_date:
            version.approved_date = approved_date

        users = User.objects.filter(id__in=watchlist)
        version.watchlist.add(*users)
        removed_users = version.watchlist.exclude(id__in=watchlist).values_list('id', flat=True)
        version.watchlist.remove(*removed_users)

        if version_state == OrderCostingVersion.COMPLETED_VERSION_STATE and approved:
            version.approved = True
        elif not approved:
            version.approved = False
        else:
            errors.append("Version cannot be approved until version state is complete")

        if len(errors) == 0:
            version.save()
            return Response({'status': 'Update successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        

class PaginatedOrderCostingListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderCostingVersion.objects.all().order_by('-id')
    serializer_class = OrderVersionMinimalSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs
    

class PaginatedPurchaseOrderListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = PurchaseOrder.objects.all().order_by('-id')
    serializer_class = PurchaseOrderBasicSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        qs = qs.filter(name__icontains=search_text)
        return qs
    

class PaginatedPOClubListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = ActualPOClub.objects.all().order_by('-id')
    serializer_class = ActualPOClubMinimalSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs
    

class ConsolidateSupplierInquiryMaterialListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = CustomerBrandMaterial.objects.all().order_by('-id')
    serializer_class = CustomerBrandMaterialV2Serializer
    pagination_class = GeneralLargeResultsSetPagination

    sort_keys = {
        'material_details_material_label': 'material_detail__generic_material__user_material',
        'display_number': 'id',
        'create_date': 'created'
    }

    def clean_dictionary(self, dic):
        replace_keys = {
	        #'supplier_name': 'supplier__name__icontains', 
	        'material_details': 'material_detail1',
            'material_details_reference_code': 'id',
        }
        dictionary = clean_search_dictionary(dic, replace_keys)
        return dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.GET.get('customer_id', None)
        material_categories = self.request.GET.get('material_categories', None)
        from_date = self.request.GET.get('from_date', None)
        to_date = self.request.GET.get('to_date', None)
        filters = {}

        if customer_id:
            filters['material_code__customer_brand__customer_id'] = customer_id

        if from_date and to_date:
            filters['created__date__range'] = [from_date, to_date]

        if material_categories:
            material_categories_list = material_categories.split(',')
            filters['material_detail__generic_material__user_material__category__in'] = material_categories_list

        qs = qs.filter(**filters)
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.sort_keys.get(sort_col, 'id')
        sort_dir = self.request.query_params.get('sort_dir', None)
        search_fields = ['material_detail__generic_material__user_material__name', 'id']
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, CustomerBrandMaterial)
        return qs
    

class ConsolidateSupplierInquiryMaterialCostingListView(generics.ListAPIView):
    write_roles = [MERCHANT_ROLE, ]
    queryset = CustomerBrandMaterial.objects.all().order_by('-id')
    serializer_class = CustomerBrandMaterialCostingSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_brand_material_ids = self.request.GET.get('customer_brand_material_ids', None)
        filters = {}

        if customer_brand_material_ids:
            material_categories_list = customer_brand_material_ids.split(',')
            filters['pk__in'] = material_categories_list
            
        return qs.filter(**filters)
    

class ConsolidateSupplierInquiryMaterialCostingSaveView(APIView):
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, supplier_ids, materials):
        has_errors = False
        errors = {
            'supplier_errors': None,
            'material_errors': {}
        }

        if not supplier_ids:
            has_errors = True
            errors['supplier_errors'] = 'Select suppliers.'

        for index, row in enumerate(materials):
            costings = row.get('costings')
            total_requested_estimated_quantity = row.get('total_requested_estimated_quantity')
            if not total_requested_estimated_quantity:
                if index not in errors['material_errors']:
                    errors['material_errors'][index] = {}
                has_errors = True
                errors['material_errors'][index]['quantity'] = 'Enter quantity.'
        return has_errors, errors

    def post(self, request):
        supplier_ids = request.data.get('supplier_ids')
        materials = request.data.get('materials')
        has_errors, errors = self.validate_data(supplier_ids, materials)
        if not has_errors:
            suppliers = Supplier.objects.filter(id__in=supplier_ids)
            for supplier in suppliers:
                for row in materials:
                    material_id = row['material_id']
                    total_requested_estimated_quantity = row['total_requested_estimated_quantity']
                    customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
                    supplier_inquiry = SupplierInquiry.objects.create(
                        hash_id=str(uuid.uuid4())[0:12],
                        supplier=supplier, customer_brand_material=customer_brand_material,
                        total_requested_quantity=total_requested_estimated_quantity,
                        email_status=SupplierInquiry.QUEUED_EMAIL
                    )
                    supplier_inquiry.excess_threshold = 0
                    supplier_inquiry.save()
                    supplier_inquiry_detail = SupplierInquiryDetail.objects.create(
                        supplier_inquiry=supplier_inquiry
                    )
                    #supplier_inquiry_detail.costing_unit = customer_brand_material.material_normalized_measuring_unit
                    supplier_inquiry_detail.minimum_order_quantity_units = customer_brand_material.material_normalized_measuring_unit
                    if supplier.shipping_mode:
                        supplier_inquiry_detail.ship_mode = supplier.shipping_mode
                    supplier_inquiry_detail.save()
                    costings = row['costings']
                    for costing_row in costings:
                        costing = get_object_or_404(OrderCostingVersion, pk=costing_row['costing_id'])
                        quantity = costing_row['quantity']
                        supplier_inquiry_costing_version, created = SupplierInquiryCostingVersion.objects.get_or_create(
                            supplier_inquiry=supplier_inquiry,
                            costing_version=costing,
                            estimated_quantity=quantity,
                            estimated_quantity_unit=customer_brand_material.material_normalized_measuring_unit
                        )

            http_response = Response({'status': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class SendSupplierInquiryListView(generics.ListAPIView):
    queryset = SupplierInquiry.objects.all().order_by('-id')
    serializer_class = ConsolidatedSupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    # def get_queryset(self):
    #     qs = super().get_queryset()
    #     filter_key = self.request.query_params.get('status', None)
    #     print(filter_key)
    #     if filter_key == 'pending_email':
    #         supplier_inquery_ids = SupplierInquiryDetail.objects.filter(supplier_inquiry__email_status=SupplierInquiry.PENDING_EMAIL).values_list('supplier_inquiry', flat=True) 
    #         qs = qs.filter(id__in=supplier_inquery_ids, version=None).order_by('created')
    #     elif filter_key == 'pending':
    #         supplier_inquery_ids = SupplierInquiryDetail.objects.filter(completed=False).exclude(supplier_inquiry__email_status=SupplierInquiry.PENDING_EMAIL).values_list('supplier_inquiry', flat=True) #TODO ask dasith sir
    #         qs = qs.filter(id__in=supplier_inquery_ids, version=None).order_by('created')
    #     elif filter_key == 'reviewed':
    #         supplier_inquery_ids = SupplierInquiryDetail.objects.filter(completed=True).values_list('supplier_inquiry', flat=True)
    #         qs = qs.filter(id__in=supplier_inquery_ids, version=None).order_by('created')
    #     else:
    #         qs = qs.filter(version=None).order_by('created')

    #     search_data = self.request.GET.dict()
    #     search_dictionary = self.clean_dictionary(search_data)
    #     global_filter = self.request.query_params.get('global_filter', None)
    #     sort_col = self.request.query_params.get('sort_col', None)
    #     sort_col = self.sort_keys.get('sort_col', 'id')
    #     sort_dir = self.request.query_params.get('sort_dir', None)
    #     search_fields = ['supplier__name', 'customer_brand_material__material_detail__generic_material__user_material__category', 'created__date', 'id', 'customer_brand_material_id']
    #     qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, SupplierInquiry)
    #     qs = qs.order_by('-created')
    #     return qs
    
    def get_filed_list(self):
        field_list = [
            {'field_name': 'id', 'field_type': 'id', 'front_end_field_name': 'display_number'},
            {'field_name': 'supplier__name', 'field_type': 'text', 'front_end_field_name': 'supplier_name'},
            {'field_name': 'customer_brand_material__material_detail__generic_material__user_material__category', 'field_type': 'text', 'front_end_field_name': 'material_details'},
            {'field_name': 'create_date', 'field_type': 'text', 'front_end_field_name': 'create_date'},
            {'field_name': 'material_details__ritz_customer_brand_reference_code', 'field_type': 'id', 'front_end_field_name': 'customer_brand_material_id'},
        ]
        return field_list

    def get_queryset(self):
        qs = super().get_queryset()
        field_list = self.get_filed_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, OrderInquiry)
        filter_key = self.request.query_params.get('status', None)
        if filter_key == 'pending_email':
            supplier_inquery_ids = SupplierInquiryDetail.objects.filter(supplier_inquiry__email_status=SupplierInquiry.PENDING_EMAIL).values_list('supplier_inquiry_id', flat=True)
            qs = qs.filter(id__in=supplier_inquery_ids, version=None).order_by('created')
        elif filter_key == 'pending':
            supplier_inquery_ids = SupplierInquiryDetail.objects.filter(completed=False).exclude(supplier_inquiry__email_status=SupplierInquiry.PENDING_EMAIL).values_list('supplier_inquiry_id', flat=True)
            qs = qs.filter(id__in=supplier_inquery_ids, version=None).order_by('created')
        elif filter_key == 'reviewed':
            supplier_inquery_ids = SupplierInquiryDetail.objects.filter(completed=True).values_list('supplier_inquiry_id', flat=True)
            qs = qs.filter(id__in=supplier_inquery_ids).order_by('created')
        #else:
            #qs = qs.filter(version=None) #TODO ask dasith Sir
        return qs
    

class SendSupplierInquiryDetailView(generics.RetrieveAPIView):
    queryset = SupplierInquiry.objects.all().order_by('-id')
    serializer_class = ConsolidatedSupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class SendSupplierInquiryCostingListView(generics.ListAPIView):
    queryset = OrderCostingVersion.objects.all().order_by('-id')
    serializer_class = OrderVersionBasicSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_inquiry_id = self.kwargs['pk']
        supplier_inquiry = get_object_or_404(SupplierInquiry, pk=supplier_inquiry_id)
        costing_ids = SupplierInquiryCostingVersion.objects.filter(supplier_inquiry=supplier_inquiry).values_list('costing_version', flat=True)
        qs = qs.filter(id__in=costing_ids).exclude(version_state__in=[OrderCostingVersion.COMPLETED_VERSION_STATE, OrderCostingVersion.CANCELED_VERSION_STATE])
        return qs


class SendSupplierInquiryUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)
        self.errors = {}

    def process_date(self, date_string, date_field):
        from datetime import datetime
        date_value = date_string
        try:
            if date_value:
                date_value = date_value.split("T")[0]
                date_value = datetime.strptime(date_value, '%Y-%m-%d').strftime('%Y-%m-%d')

        except ValueError as ex:
            self.errors[date_string] = "Date should be in format dd-mm-yyyy"
        return date_value
    
    def validate_data(self, data, customer_brand_material):
        pmuh = PerMeasuringUnitHelper()
        self.errors = {}
        for index, row in enumerate(data['supplier_inquiry_details']):
            errors = {}
            if row.get('completed'):

                if not row.get('supplier_material_reference_code'):
                    errors['supplier_material_reference_code'] = ['Enter supplier material code.']

                if not row.get('excess_threshold'):
                    errors['excess_threshold'] = ['Enter excess threshold.']

                if not row.get('lead_time'):
                    errors['lead_time'] = ['Enter lead time.']

                if not row.get('ship_mode'):
                    errors['ship_mode'] = ['Select ship mode.']

                if customer_brand_material.material_type == Material.FABRIC_MATERIAL:
                        if not row.get('cutting_width'):
                            errors['cutting_width'] = ['Enter fabrci width.']
                        if not row.get('cutting_width_unit'):
                            errors['cutting_width_unit'] = ['Select fabrci width unit.']

                if not row.get('cost_per_unit_type'):
                    errors['cost_per_unit_type'] = ['Select cost per unit type.']

                if not row.get('expiration_date'):
                    errors['expiration_date'] = ['Select date.']
                
            if not row.get('supplier_id'):
                errors['supplier_id'] = ['Select supplier.']

            if not row.get('cost_per_unit'):
                errors['cost_per_unit'] = ['Please enter cost per unit.']

            if not row.get('costing_unit'):
                errors['costing_unit'] = ['Enter cost per unit type.']

            if row.get('costing_unit'):
                    material_measurement_unit = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
                    unit = row.get('costing_unit')
                    valid_material_unit_category = pmuh.get_valid_material_valid_costing_unit(unit)
                    if material_measurement_unit != valid_material_unit_category or valid_material_unit_category == None:
                        errors['costing_unit'] = ['Select valid costing unit']

            if errors:
                self.errors[index] = errors

    def save_supplier_inquiry_data(self, data, customer_brand_material):
        supplier_inquiry_details = data['supplier_inquiry_details']
        supplier_inquiry_id = data.get('id')
        supplier_inquiry = SupplierInquiry.objects.get(pk=supplier_inquiry_id)

        self.errors = {}
        for index, row in enumerate(supplier_inquiry_details):
            supplier_material_reference_code = None
            if row['supplier_material_reference_code']:
                supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(
                    customer_brand_material=supplier_inquiry.customer_brand_material,
                    supplier=supplier_inquiry.supplier,
                    supplier_material_reference_code=row['supplier_material_reference_code']
                )

            supplier_inquiry_detail_id = row.get('id', None)

            if supplier_inquiry_detail_id:
                supplier_inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'pk': supplier_inquiry_detail_id, 'supplier_inquiry': supplier_inquiry})
            else:
                supplier_inquiry_detail = SupplierInquiryDetail.objects.create(
                        supplier_inquiry=supplier_inquiry
                    )
            expiration_date = self.process_date(row.get('expiration_date', None), 'expiration_date')
            supplier_inquiry_detail.supplier_inquiry = supplier_inquiry
            supplier_inquiry_detail.cutting_width = row.get('cutting_width')
            supplier_inquiry_detail.cutting_width_unit = row.get('cutting_width_unit')
            supplier_inquiry_detail.costing_unit = row.get('costing_unit')
            supplier_inquiry_detail.cost_per_unit = row.get('cost_per_unit')
            supplier_inquiry_detail.fob_price = row.get('fob_price') if row.get('fob_price') else 0
            supplier_inquiry_detail.cif_price = row.get('cif_price') if row.get('cif_price') else 0
            supplier_inquiry_detail.transport_charges = row.get('transport_charges') if row.get('transport_charges') else 0
            supplier_inquiry_detail.ex_work_price = row.get('ex_work_price') if row.get('ex_work_price') else 0
            supplier_inquiry_detail.expiration_date = expiration_date
            supplier_inquiry_detail.completed = row.get('completed')
            supplier_inquiry_detail.lead_time = row.get('lead_time') if row.get('lead_time') else 0
            supplier_inquiry_detail.minimum_order_quantity = row.get('minimum_order_quantity')
            supplier_inquiry_detail.minimum_order_quantity_units = row.get('minimum_order_quantity_units')
            supplier_inquiry_detail.supplier_inquiry_material_code = supplier_material_reference_code if supplier_material_reference_code else None
            supplier_inquiry_detail.excess_threshold = row.get('excess_threshold') if row.get('excess_threshold') else 0
            supplier_inquiry_detail.cost_per_unit_type = row.get('cost_per_unit_type')
            supplier_inquiry_detail.pay_mode = row.get('pay_mode')
            supplier_inquiry_detail.save()
        return supplier_inquiry
    
    def update_version_supplier_inquiry_data(self, copy_costings, supplier_inquiry):
        for target_costing_id in copy_costings:
            target_costing = get_object_or_404(OrderCostingVersion, pk=target_costing_id)
            target_supplier_inquiry = get_object_or_none(SupplierInquiry, 
                {'supplier': supplier_inquiry.supplier, 'customer_brand_material': supplier_inquiry.customer_brand_material, 'version': target_costing}
            )

            target_supplier_inquiry_fields_to_copy = [f.name for f in SupplierInquiry._meta.fields if f.name not in ['id', 'version', 'hash_id', 'copied_from']]
            for field in target_supplier_inquiry_fields_to_copy:
                setattr(target_supplier_inquiry, field, getattr(supplier_inquiry, field))
            target_supplier_inquiry.save()

            target_supplier_inquiry_details = SupplierInquiryDetail.objects.filter(supplier_inquiry=target_supplier_inquiry)
            for target_supplier_inquiry_detail in target_supplier_inquiry_details:
                supplier_inquiry_details = supplier_inquiry.supplierinquirydetail_set.all()
                if supplier_inquiry_details:
                    target_supplier_inquiry_detail_fields_to_copy = [f.name for f in SupplierInquiryDetail._meta.fields if f.name not in ['id', 'supplier_inquiry', 'copied_from']]
                    for field in target_supplier_inquiry_detail_fields_to_copy:
                        setattr(target_supplier_inquiry_detail, field, getattr(supplier_inquiry_details[0], field))
                    target_supplier_inquiry_detail.save()
    
    def put(self, request, *args, **kwargs):
        customer_brand_material_id = request.data['customer_brand_material_id']
        copy_costings = request.data.get('copy_costing', [])
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=customer_brand_material_id)
        self.validate_data(request.data, customer_brand_material)
        if not self.errors:
            supplier_inquiry = self.save_supplier_inquiry_data(request.data, customer_brand_material)
            self.update_version_supplier_inquiry_data(copy_costings, supplier_inquiry)
            return Response(data={'status': 'Successfully Updated'})
        else:
            return Response(data=self.errors, status=status.HTTP_400_BAD_REQUEST)
    

class SendSupplierInquiryCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)
        self.errors = {}

    def process_date(self, date_string, date_field):
        from datetime import datetime
        date_value = date_string
        try:
            if date_value:
                date_value = date_value.split("T")[0]
                date_value = datetime.strptime(date_value, '%Y-%m-%d').strftime('%Y-%m-%d')
        except ValueError as ex:
            self.errors[date_string] = "Date should be in format dd-mm-yyyy"
        return date_value
    
    def validate_data(self, data, customer_brand_material):
        pmuh = PerMeasuringUnitHelper()
        self.errors = {}
        for index, row in enumerate(data['supplier_inquiry_details']):
            errors = {}
            if row.get('completed'):

                if not row.get('supplier_material_reference_code'):
                    errors['supplier_material_reference_code'] = ['Enter supplier material code.']

                if not row.get('excess_threshold'):
                    errors['excess_threshold'] = ['Enter excess threshold.']

                if not row.get('lead_time'):
                    errors['lead_time'] = ['Enter lead time.']

                if customer_brand_material.material_type == Material.FABRIC_MATERIAL:
                        if not row.get('cutting_width'):
                            errors['cutting_width'] = ['Enter fabrci width.']
                        if not row.get('cutting_width_unit'):
                            errors['cutting_width_unit'] = ['Select fabrci width unit.']

                if not row.get('cost_per_unit_type'):
                    errors['cost_per_unit_type'] = ['Select cost per unit type.']

                if not row.get('expiration_date'):
                    errors['expiration_date'] = ['Select date.']

                if not row.get('ship_mode'):
                    errors['ship_mode'] = ['Select ship mode.']
                
            if not row.get('supplier_id'):
                errors['supplier_id'] = ['Select supplier.']

            if not row.get('cost_per_unit'):
                errors['cost_per_unit'] = ['Please enter cost per unit.']

            if not row.get('costing_unit'):
                errors['costing_unit'] = ['Enter cost per unit type.']

            if row.get('costing_unit'):
                    material_measurement_unit = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
                    unit = row.get('costing_unit')
                    valid_material_unit_category = pmuh.get_valid_material_valid_costing_unit(unit)
                    if material_measurement_unit != valid_material_unit_category or valid_material_unit_category == None:
                        errors['costing_unit'] = ['Select valid costing unit']

            if not row.get('total_requested_quantity'):
                errors['total_requested_quantity'] = ['Enter requested quantity.']

            if errors:
                self.errors[index] = errors

    def save_supplier_inquiry_data(self, data, customer_brand_material):
        if not self.errors:
            for row in data['supplier_inquiry_details']:
                total_requested_quantity = row['total_requested_quantity']
                supplier_material_reference_code = row['supplier_material_reference_code']
                supplier = get_object_or_404(Supplier, pk=row['supplier_id'])
                supplier_inquiry = SupplierInquiry.objects.create(
                    supplier=supplier,
                    customer_brand_material=customer_brand_material,
                    email_status=SupplierInquiry.NOT_APPLICABLE,
                    total_requested_quantity=total_requested_quantity
                )
                supplier_material_reference_code_obj, created = SupplierInquiryMaterialCode.objects.get_or_create(
                    customer_brand_material=supplier_inquiry.customer_brand_material,
                    supplier=supplier_inquiry.supplier,
                    supplier_material_reference_code=supplier_material_reference_code
                )
                row['supplier_inquiry_material_code'] = supplier_material_reference_code_obj
                row['expiration_date'] = self.process_date(row.get('expiration_date', None), 'expiration_date')
                row['supplier_inquiry'] = supplier_inquiry
                completed = row.get('completed', True)

                supplier_inquiry_detail = SupplierInquiryDetail.objects.create(
                    supplier_inquiry=supplier_inquiry,
                    cutting_width=row.get('cutting_width'),
                    cutting_width_unit=row.get('cutting_width_unit'),
                    costing_unit=row.get('costing_unit'),
                    cost_per_unit=row.get('cost_per_unit'),
                    fob_price=row.get('fob_price') if row.get('fob_price') else 0,
                    cif_price=row.get('cif_price') if row.get('cif_price') else 0,
                    transport_charges=row.get('transport_charges') if row.get('transport_charges') else 0,
                    ex_work_price=row.get('ex_work_price') if row.get('ex_work_price') else 0,
                    expiration_date=self.process_date(row.get('expiration_date', None), 'expiration_date') if row.get('expiration_date') else None,
                    completed=completed,
                    lead_time=row.get('lead_time') if row.get('lead_time') else None,
                    minimum_order_quantity=row.get('minimum_order_quantity'),
                    minimum_order_quantity_units=row.get('minimum_order_quantity_units'),
                    supplier_inquiry_material_code=supplier_material_reference_code_obj,
                    excess_threshold=row.get('excess_threshold') if row.get('lead_time') else 0,
                    cost_per_unit_type=row.get('cost_per_unit_type'),
                    pay_mode=row.get('pay_mode')
                )

    def post(self, request, *args, **kwargs):
        customer_brand_material_id = request.data['customer_brand_material_id']
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=customer_brand_material_id)
        self.validate_data(request.data, customer_brand_material)
        if not self.errors:
            self.save_supplier_inquiry_data(request.data, customer_brand_material)
            return Response(data={'status': 'Successfully Updated'})
        else:
            return Response(data=self.errors, status=status.HTTP_400_BAD_REQUEST)
        

class SendSupplierInquiryDetailDeleteView(generics.DestroyAPIView):
    queryset = SupplierInquiryDetail.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, *args, **kwargs):
        supplier_inquiry_detail_id = kwargs['pk']
        supplier_inquiry_detail = get_object_or_404(SupplierInquiryDetail,pk=supplier_inquiry_detail_id)
        return_status = status.HTTP_200_OK
        supplier_inquiry_detail.delete()
        return Response({'status': True}, return_status)
        

class SendSupplierInquiryDeleteView(generics.DestroyAPIView):
    queryset = SupplierInquiryDetail.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, *args, **kwargs):
        supplier_inquiry_id = kwargs['pk']
        supplier_inquiry = get_object_or_404(SupplierInquiry,pk=supplier_inquiry_id)
        return_status = status.HTTP_200_OK
        supplier_inquiry_details = supplier_inquiry.supplierinquirydetail_set.all()
        for supplier_inquiry_detail in supplier_inquiry_details:
            supplier_inquiry_detail.delete()
        supplier_inquiry.delete()
        return Response({'status': True}, return_status)
    

class ConsolidateSupplierInquiryMoveStateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        type = request.data.get('type', None)
        inquiry_ids	= request.data.get('inquiry_ids', [])
        if type == 'move_to_pending':
            for inquiry_id in inquiry_ids:
                inquiry = get_object_or_404(SupplierInquiry, pk=inquiry_id)
                inquiry.email_status = SupplierInquiry.PENDING_RESPONSE
                inquiry.save()
        elif type == 'send_email':
            for inquiry_id in inquiry_ids:
                inquiry = get_object_or_404(SupplierInquiry, pk=inquiry_id)
                inquiry.email_status = SupplierInquiry.QUEUED_EMAIL
                inquiry.save()
        return Response({'status': True})
    

class PreviousSupplierInquiryListView(generics.ListAPIView):
    queryset = SupplierInquiryDetail.objects.all().order_by('-id')
    serializer_class = ConsolidatedSupplierInquiryMaterialDetailSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_brand_material_id = self.kwargs['customer_brand_material_id']
        costing_inquiry = self.request.query_params.get('costing_inquiry', None)
        if costing_inquiry == 'true':
            qs = qs.filter(supplier_inquiry__customer_brand_material_id=customer_brand_material_id, completed=True).order_by('supplier_inquiry__supplier', 'cost_per_unit', 'id').distinct('supplier_inquiry__supplier', 'cost_per_unit')
        else: 
            qs = qs.filter(supplier_inquiry__customer_brand_material_id=customer_brand_material_id, supplier_inquiry__version=None).order_by('supplier_inquiry__supplier', 'cost_per_unit', 'id').distinct('supplier_inquiry__supplier', 'cost_per_unit')
        return qs
    

class RelatedMaterialListView(generics.ListAPIView):
    queryset = CustomerBrandMaterial.objects.all().order_by('id')
    serializer_class = CustomerBrandMaterialDropDownSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=self.kwargs['customer_brand_material_id'])
        search_text = self.request.query_params.get('search_text', None)
        if search_text:
            qs = search_qs_from_id(qs, search_text)
        else:
            qs = qs.filter(material_detail__generic_material__user_material=customer_brand_material.material_detail.generic_material.user_material)
        return qs
    

class PreviousSupplierInquiryCopyView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def copy_supplier_inquiries(self, version, customer_brand_material, selected_customer_brand_material_id, source_supplier_inquiry_details):
        for source_supplier_inquiry_detail in source_supplier_inquiry_details:
            supplier_inquiry, created = SupplierInquiry.objects.get_or_create(
                hash_id=str(uuid.uuid4())[0:12],
                version=version,
                customer_brand_material=customer_brand_material,
                item_service=source_supplier_inquiry_detail.supplier_inquiry.item_service,
                supplier=source_supplier_inquiry_detail.supplier_inquiry.supplier,
                has_supplier_feedback=source_supplier_inquiry_detail.supplier_inquiry.has_supplier_feedback,
                email_status=source_supplier_inquiry_detail.supplier_inquiry.email_status
            )
            supplier_inquiry.copied_from = source_supplier_inquiry_detail.supplier_inquiry
            supplier_inquiry.save()
            supplier_inquiry_detail, created = SupplierInquiryDetail.objects.get_or_create(
                supplier_inquiry=supplier_inquiry,
                cutting_width=source_supplier_inquiry_detail.cutting_width,
                cutting_width_unit=source_supplier_inquiry_detail.cutting_width_unit,
                selected=source_supplier_inquiry_detail.selected,
                costing_unit=source_supplier_inquiry_detail.costing_unit,
                cost_per_unit=source_supplier_inquiry_detail.cost_per_unit,
                fob_price=source_supplier_inquiry_detail.fob_price,
                cif_price=source_supplier_inquiry_detail.cif_price,
                transport_charges=source_supplier_inquiry_detail.transport_charges,
                ex_work_price=source_supplier_inquiry_detail.ex_work_price,
                expiration_date=source_supplier_inquiry_detail.expiration_date,
                completed=source_supplier_inquiry_detail.completed if customer_brand_material.material_code != selected_customer_brand_material_id.material_code else False,
                lead_time=source_supplier_inquiry_detail.lead_time,
                minimum_order_quantity=source_supplier_inquiry_detail.minimum_order_quantity,
                minimum_order_quantity_units=source_supplier_inquiry_detail.minimum_order_quantity_units,
                supplier_inquiry_material_code=source_supplier_inquiry_detail.supplier_inquiry_material_code if customer_brand_material.material_code != selected_customer_brand_material_id.material_code else None,
                excess_threshold=source_supplier_inquiry_detail.excess_threshold,
                pay_mode=source_supplier_inquiry_detail.pay_mode,
                cost_per_unit_type=source_supplier_inquiry_detail.cost_per_unit_type,
                ship_mode=source_supplier_inquiry_detail.ship_mode
            )
            supplier_inquiry_detail.copied_from = source_supplier_inquiry_detail
            supplier_inquiry_detail.save()

    def post(self, request, costing_version_id, customer_brand_material_id):
        version = get_object_or_404(OrderCostingVersion, pk=costing_version_id)
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=customer_brand_material_id)
        selected_customer_brand_material_id = get_object_or_404(CustomerBrandMaterial, pk=request.data['selected_material_id'])
        supplier_inquiry_ids = request.data.get('supplier_inquiries', [])
        supplier_detail_inquiries = SupplierInquiryDetail.objects.filter(id__in=supplier_inquiry_ids)
        self.copy_supplier_inquiries(version, customer_brand_material, selected_customer_brand_material_id, supplier_detail_inquiries)
        return Response({'status': True})