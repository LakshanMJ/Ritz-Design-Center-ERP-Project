from django.db import transaction
from rest_framework import status, generics
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from marketing.mixins.order_mixins import OrderMixin
from marketing.models import *
from marketing.permissions.costing_permissions import OrderInquiryPermissionMixin
from marketing.serializers import *
from shared.permissions.roles import MERCHANT_ROLE, MERCHANT_ADMIN_ROLE
from shared.permissions.view_permissions import HasPermission
from shared.utils import make_flat_list_unique, get_object_or_none, get_object_or_none_qs, search_qs_from_dic, search_qs_from_id, clean_search_dictionary, search_qs_from_global_filter, search_qs_from_global_filter_v2
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination


# Order Inquiry  Views
class OrderInquiryList(generics.ListAPIView):
    queryset = OrderInquiry.objects.all()
    serializer_class = DetailedOrderInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    sort_keys = {
	        'customer.name': 'customer__name',
	        'brand.name': 'brand__name',
            'state.display_value': 'state',
            'id': 'id'
        }

    def clean_dictionary(self, dic):
        replace_keys = {
	        'customer.name': 'customer__name__icontains', 
	        'brand.name': 'brand__name__icontains',
            'year': 'year',
            'style_number': 'style_number',
            'date': 'date',
        }
        dictionary = clean_search_dictionary(dic, replace_keys)
        return dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.sort_keys.get(sort_col, None)
        sort_dir = self.request.query_params.get('sort_dir', None)
        search_fields = ['customer__name', 'style_number', 'brand__name', 'year', 'date', 'id']
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, OrderInquiry)

        customer_id = self.request.query_params.get('customer_id', None)

        if customer_id != '0':
            qs = qs.filter(customer_id=customer_id).order_by('-id')
        return qs
    

class OrderInquiryListTest(generics.ListAPIView):
    queryset = OrderInquiry.objects.all()
    serializer_class = DetailedOrderInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    def get_filed_list(self):
        field_list = [
            {'field_name': 'id', 'field_type': 'id', 'front_end_field_name': 'id'},
            {'field_name': 'customer__name', 'field_type': 'text', 'front_end_field_name': 'customer.name'},
            {'field_name': 'brand__name', 'field_type': 'text', 'front_end_field_name': 'brand.name'},
            {'field_name': 'style_number', 'field_type': 'text', 'front_end_field_name': 'style_number'},
            {'field_name': 'state', 'field_type': 'choice', 'front_end_field_name': 'state'},
            {'field_name': 'date', 'field_type': 'date', 'front_end_field_name': 'date'}
        ]
        return field_list

    def get_queryset(self):
        qs = super().get_queryset()
        field_list = self.get_filed_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, OrderInquiry)
        customer_id = self.request.query_params.get('customer_id', None)
        if customer_id != '0':
            qs = qs.filter(customer_id=customer_id).order_by('-id')
        return qs

class OrderInquiryCreate(generics.CreateAPIView):
    queryset = OrderInquiry.objects.all()
    serializer_class = OrderInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def perform_create(self, serializer):
        object = serializer.save()
        object.merchant = self.request.user
        object.save()


class OrderInquiryUpdateDetailView(OrderInquiryPermissionMixin, generics.RetrieveUpdateAPIView):
    queryset = OrderInquiry.objects.all()
    serializer_class = OrderInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderCountryCreateOrUpdate(OrderInquiryPermissionMixin, APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_order_inquiry(self):
        order_id = self.request.data.get('order_id')
        order_inquiry = self.get_order_inquiry_or_raise_http404(order_id)
        return order_inquiry
    
    def handle_other_countries(self, order):
        customer = order.customer
        brand = order.brand
        OrderCountry.objects.filter(order=order).exclude(country__customer_brand__customer=customer, country__customer_brand__brand=brand).delete()
        return 'success'

    def post(self, request):
        order_id = request.data.get('order_id')
        country_ids = request.data.get('country_ids')
        order = self.get_order_inquiry()

        for country_id in country_ids:
            OrderCountry.objects.get_or_create(order=order, country_id=country_id)

        OrderCountry.objects.filter(order=order).exclude(country_id__in=country_ids).delete()
        data = {
            'order_id': order_id,
            'country_ids': country_ids
        }
        order_countries = OrderCountry.objects.filter(order=order)
        self.handle_other_countries(order)
        response = OrderCountrySerializer(order_countries, many=True).data

        return Response(response, status=status.HTTP_200_OK)


class OrderInquirySizesCreateUpdateDetailView(OrderInquiryPermissionMixin, APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_order_inquiry(self):
        order_id = self.kwargs.get('order_id')
        order_inquiry = self.get_order_inquiry_or_raise_http404(order_id)
        return order_inquiry

    def order_size_groups_has_changed(self, group_sizeids, order):
        has_changed = False
        for group_sizeid in group_sizeids:
            if OrderSizeGroup.objects.filter(order=order, sizes__size_id__in=group_sizeid).exists():
                has_changed = True
        return has_changed

    def validate_size_groups(self, size_groups):
        errors = {}
        validated_size_groups = []
        for size_group in size_groups:
            # Checks if one size is in two groups
            if bool(set(size_group) & set(validated_size_groups)):
                errors = {'size_groups': "Two Size Groups cannot share the same size"}
                return True, errors
            # Checks if there is at least 1 size in the group
            elif len(size_groups) == 0:
                errors = {'size_groups': "Select at least one Size for each Size Group"}
                return True, errors
            validated_size_groups = [*validated_size_groups, *size_group]
        return False, errors

    def get_or_create_order_size_group(self, order, size_ids):
        create = False
        size_group = None
        order_sizes = OrderSize.objects.filter(order=order, size_id__in=size_ids)
        try:
            size_group = OrderSizeGroup.objects.filter(order=order, sizes__in=order_sizes.values_list('id', flat=True)).distinct()[0]
            if size_group.sizes.count() != len(size_ids):
                create = True
        except (ObjectDoesNotExist, IndexError) as ex:
            create = True

        if create:
            size_group = OrderSizeGroup.objects.create(order=order)
            size_group.sizes.add(*order_sizes)
        return size_group

    def post(self, request, order_id):
        errors = {}
        has_error = False

        costing_method = request.data.get('costing_method')
        size_category_id = request.data.get('size_category')
        size_ids = make_flat_list_unique(request.data.get('sizes'))
        size_groups = request.data.get('size_groups')

        order = self.get_order_inquiry_or_raise_http404(order_id)
        size_category = get_object_or_404(SizeCategory, pk=size_category_id)

        order.costing_method = costing_method
        order.size_category = size_category
        order.save()

        # TODO - validate size_ids
        for size_id in size_ids:
            OrderSize.objects.get_or_create(order=order, size_id=size_id)
        OrderSize.objects.filter(order=order).exclude(size_id__in=size_ids).delete()
        # [[1,2],[3]]

        if costing_method == OrderInquiry.GROUP_BY_SIZES:  # and self.order_size_groups_has_changed(size_groups, order):
            has_error, errors = self.validate_size_groups(size_groups)
            if not has_error:
                valid_order_size_groups_ids = []
                for size_group in size_groups:
                    size_group_object = self.get_or_create_order_size_group(order, size_group)
                    valid_order_size_groups_ids.append(size_group_object.pk)
                OrderSizeGroup.objects.filter(order=order).exclude(id__in=valid_order_size_groups_ids).delete()
        elif costing_method == OrderInquiry.COMMON_PRICE:
            size_group_object = self.get_or_create_order_size_group(order, size_ids)
            OrderSizeGroup.objects.filter(order=order).exclude(id=size_group_object.pk).delete()
        elif costing_method == OrderInquiry.PRICE_FOR_EACH_SIZE:
            valid_order_size_groups_ids = []
            for size_id in size_ids:
                size_group_object = self.get_or_create_order_size_group(order, [size_id])
                valid_order_size_groups_ids.append(size_group_object.pk)
            OrderSizeGroup.objects.filter(order=order).exclude(id__in=valid_order_size_groups_ids).delete()
        if has_error:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        data = {
            'success': True,
        }
        return Response(data, status=status.HTTP_200_OK)


class OrderSizeGroupList(generics.ListAPIView):
    serializer_class = OrderSizeGroupSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        if 'pk' in self.kwargs:
            id = self.kwargs['pk']
            return OrderSizeGroup.objects.filter(id=id).order_by('id')
        elif 'order_id' in self.kwargs:
            order = self.kwargs['order_id']
            return OrderSizeGroup.objects.filter(order=order).order_by('id')
        else:
            return []


class OrderInquiryItemsCreateUpdateDetailView(OrderInquiryPermissionMixin, APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_order_inquiry(self):
        order_id = self.kwargs.get('order_id')
        order_inquiry = self.get_order_inquiry_or_raise_http404(order_id)
        return order_inquiry

    def validate_pack_items(self, pack_type, items, quantity_per_pack):
        errors = {}
        if pack_type == OrderInquiry.MULTI_PACK_TYPE:
            if len(items) == 1:
                errors = {'pack_items': "More than one item required for multi pack"}
                return True, errors
            elif len(items) != quantity_per_pack:
                errors = {'pack_items': "Quantity for pack item and selected pack type does not match"}
                return True, errors
        elif pack_type == OrderInquiry.SINGLE_PACK_TYPE:
            if len(items) > 1:
                errors = {'pack_items': "More than one selected items for single pack"}
                return True, errors
            elif quantity_per_pack > 1:
                errors = {'pack_items': "Quantity for pack item and selected pack type are not match"}
                return True, errors
        return False, errors

    def set_order_item_identifier(self, order):
        if order.state == OrderInquiry.OPEN_STATE:
            order_items = order.get_order_items()
            item_ids = {}
            for order_item in order_items:
                item_id_seq = item_ids.get(order_item.item_id, 0) + 1
                item_ids[order_item.item_id] = item_id_seq
                order_item.item_identifier = item_id_seq
                order_item.save()

    def post(self, request, order_id):
        pack_type = request.data.get('pack_type')
        quantity_per_pack = request.data.get('quantity_per_pack')
        items = request.data.get('items')
        order = self.get_order_inquiry_or_raise_http404(order_id)
        order.pack_type = pack_type
        order.quantity_per_pack = quantity_per_pack
        order.save()
        order_item_id_list = []
        has_error, errors = self.validate_pack_items(pack_type, items, quantity_per_pack)
        current_items = []
        if not has_error:
            for item in items:
                id = item.get("id", None)
                item_id = item.get("item_id")
                if id is None:
                    order_item = OrderItem.objects.create(order=order, item_id=item_id)
                    order_item_id_list.append(order_item.id)
                else:
                    order_item = OrderItem.objects.get(id=id, order=order)
                    order_item.item_id = item_id
                    order_item.save()
                    order_item_id_list.append(order_item.id)
                current_items.append({'id': order_item.pk, 'item': order_item.item.id,
                                      'name': order_item.item.name})  # The order data is being sent should be preserved
            OrderItem.objects.filter(order=order).exclude(id__in=order_item_id_list).delete()
        if has_error:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        self.set_order_item_identifier(order)
        data = {
            'success': True,
            'items': current_items
        }
        return Response(data, status=status.HTTP_200_OK)


# class OrderColorwayCategoryListView(OrderInquiryPermissionMixin, generics.ListCreateAPIView, OrderMixin):
#     queryset = OrderColorwayCategory.objects.all().order_by('id')
#     serializer_class = OrderColorwayCategorySerializer
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, ]
#
#     def get_order_inquiry(self):
#         order_id = self.kwargs.get('order_id')
#         order_inquiry = self.get_order_inquiry_or_raise_http404(order_id)
#         return order_inquiry
#
#     def get_queryset(self):
#         qs = super().get_queryset()
#         qs = qs.filter(order_id=self.kwargs.get('order_id', None))
#         return qs
#
#     def create(self, request, *args, **kwargs):
#         has_errors = False
#         cw_categories = request.data
#         order_id = kwargs.get('order_id', None)
#         order = self.get_order_inquiry_or_raise_http404(order_id)
#
#         errors = {
#             'cw_categories': [],
#             'cw_category_types': []
#         }
#
#         # Loop through categories
#         processed_cat_ids = []
#         processed_cat_type_ids = []
#         try:
#             with transaction.atomic():
#                 for cw_category in cw_categories:
#                     cw_category['order'] = order_id
#                     cw_cat_id = cw_category.get('id', None)
#                     cw_cat_instance = None
#
#                     if cw_cat_id:
#                         cw_cat_instance = get_object_or_none(OrderColorwayCategory, {"order": order, "pk": cw_cat_id})
#                         if not cw_cat_instance:
#                             has_errors = True
#                             errors['cw_categories'] = 'Matching Colorway Category does not Found'
#                             continue
#
#                     cw_cat = OrderColorwayCategorySerializer(data=cw_category, instance=cw_cat_instance)
#
#                     if cw_cat.is_valid():
#                         cw_cat_obj = cw_cat.save()
#                         cw_cat_id = cw_cat_obj.id
#                         cw_cat_types = cw_category['types']
#
#                         for cw_cat_type in cw_cat_types:
#                             cw_cat_type['order_colorway_category'] = cw_cat_id
#                             cw_cat_type_id = cw_cat_type.get('id', None)
#                             cw_cat_type_obj = None
#                             if cw_cat_type_id:
#                                 cw_cat_type_obj = get_object_or_none(OrderColorwayCategoryType, {'pk': cw_cat_type_id,
#                                                                                                  'order_colorway_category': cw_cat_obj})
#                                 if not cw_cat_type_obj:
#                                     has_errors = True
#                                     errors['cw_category_types'].append(
#                                         "Invalid Category Type for %s" % (cw_cat_obj.colorway_category.name))
#                                     continue
#
#                             cw_cat_type_ser = OrderColorwayCategoryTypeSerializer(data=cw_cat_type,
#                                                                                   instance=cw_cat_type_obj)
#                             if cw_cat_type_ser.is_valid():
#                                 cw_cat_type_obj = cw_cat_type_ser.save()
#                                 cw_cat_type_id = cw_cat_type_obj.id
#                             else:
#                                 has_errors = True
#                                 errors['cw_category_types'].append("Invalid Category Types")
#                             processed_cat_type_ids.append(cw_cat_type_id)
#
#                     else:
#                         has_errors = True
#                         errors['cw_categories'].append("Select Valid Colorway Categories")
#
#                     processed_cat_ids.append(cw_cat_id)
#                 if has_errors:
#                     raise ValidationError("Errors occurred While Processing Data")
#                 else:
#                     OrderColorwayCategory.objects.filter(order=order).exclude(id__in=processed_cat_ids).delete()
#                     OrderColorwayCategoryType.objects.filter(order_colorway_category__order=order).exclude(
#                         id__in=processed_cat_type_ids).delete()
#         except:
#             has_errors = True
#         if has_errors:
#             Response(errors, status=status.HTTP_400_BAD_REQUEST)
#
#         response = self.list(request, args, kwargs)
#         return response
#
#
class OrderColorwayCategoryTypeListView(generics.ListAPIView):
    pass
    # serializer_class = OrderColorwayCategoryTypeSerializer
    # permission_classes = (HasPermission,)
    # write_roles = [MERCHANT_ADMIN_ROLE, ]
    #
    # def get_queryset(self):
    #     order_id = self.kwargs['order_id']
    #     queryset = OrderColorwayCategoryType.objects.filter(order_colorway_category__order=order_id)
    #     return queryset


class OrderColorwayListUpdateView(OrderInquiryPermissionMixin, generics.RetrieveUpdateAPIView, OrderMixin):
    serializer_class = OrderInquiryColorwayCountColorwaySerializer
    queryset = OrderInquiry.objects.all().order_by('id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def update(self, request, *args, **kwargs):
        number_of_cws = self.request.data.get('number_of_colorways', None)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        errors = []
        if number_of_cws:
            instance.number_of_colorways = number_of_cws
            instance.save()

        processed_ids = []
        for colorway in request.data.get('colorways', []):
            cw_instance = get_object_or_none(OrderColorway, {'pk': colorway.get('id', None)})
            colorway['order'] = instance.id
            cw_ser = OrderColorwaySerializer(instance=cw_instance, data=colorway)
            if cw_ser.is_valid():
                cw_object = cw_ser.save()
                processed_ids.append(cw_object.id)
            else:
                errors.append(cw_ser.errors)

        if len(errors) > 0:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            OrderColorway.objects.filter(order=instance).exclude(pk__in=processed_ids).delete()

        return self.retrieve(request, *args, **kwargs)


class ColorwayItemTypeListCreateView(OrderInquiryPermissionMixin, generics.ListCreateAPIView, OrderMixin):
    queryset = ColorwayItemType.objects.all().order_by('-id')
    serializer_class = ColorwayItemTypeSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_order_inquiry(self):
        order_id = self.kwargs.get('order_id')
        order_inquiry = self.get_order_inquiry_or_raise_http404(order_id)
        return order_inquiry

    def create(self, request, *args, **kwargs):
        order_id = self.kwargs.get('order_id', None)
        order = self.get_order_inquiry_or_raise_http404(order_id)
        has_errors = True
        errors = {"category_type": []}
        colorway_items = request.data
        cw_item_types = ColorwayItemType.objects.filter(colorway__order=order, item__order=order)
        for colorway_item in colorway_items:
            cw_id = colorway_item.get('colorway', None)
            item_id = colorway_item.get('item', None)
            if cw_id and item_id:
                colorway_item_type_instance = get_object_or_none_qs(cw_item_types,
                                                                    {"colorway_id": cw_id, "item_id": item_id})
                cw_item_type_ser = ColorwayItemTypeSerializer(data=colorway_item, instance=colorway_item_type_instance)

                if cw_item_type_ser.is_valid():
                    cw_item_type_ser.save()
                else:
                    has_errors = True
                    error = "Error Saving Data"
                    try:
                        cw = OrderColorway.objects.get(pk=cw_id)
                        item = OrderItem.objects.get(pk=item_id)
                        error = "Error Saving Data for %s %s" % (cw.colorway, item.item.name)
                    except ObjectDoesNotExist:
                        pass
                    errors['category_type'].append(error)

        if has_errors:
            Response(errors, status=status.HTTP_400_BAD_REQUEST)
        response = self.list(request, args, kwargs)
        return response

    def get_queryset(self):
        order_id = self.kwargs['order_id']
        queryset = ColorwayItemType.objects.filter(item__order=order_id, colorway__order=order_id)
        return queryset