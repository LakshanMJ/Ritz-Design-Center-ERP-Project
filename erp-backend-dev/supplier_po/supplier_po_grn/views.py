import uuid
from datetime import timedelta

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from marketing.serializers import SupplierPOGRNSerializer, SupplierPOGRNMaterialSerializer, SupplierPOFabricShadeSerializer, POClubShadeMappingSerializer, SupplierPOGRNMaterialBasicDetailSerializer
from materials.models import Material, CustomerBrandMaterial, SupplierInquiryMaterialCode
from shared.models import FileAttachment, User, Plant
from shared.permissions.roles import FABRIC_INSPECTION_USER_ROLE, STORES_USER_ROLE, STORES_MANAGER_ROLE
from shared.utils import get_object_or_none, get_float_or_zero
from supplier_po.helpers.pack_list_processor import PackListProcessor
from supplier_po.helpers.pack_list_qr_code_generator import PackListQRGenerator
from supplier_po.helpers.summary_calculator_helper import DeliveryDateSummary
from shared.permissions.view_permissions import HasPermission
from supplier_po.models import SupplierPO, SupplierDeliveryDate, SupplierPOGRN, \
    SupplierPOGRNMaterial, SupplierPOInvoiceDeliveryNote, SupplierPOGRNMaterialQA, SupplierPOGRNMaterialDetail, \
    FabricGRNBatchNumber, FabricGRNDetail, SupplierPOFabricShade, FabricGRNWidth, GRNBatchNumberShade
from supplier_po.supplier_po.serializers import SupplierPOBasicListSerializer, SupplierPOGRNBasicSerializer
from supplier_po.supplier_po_grn.serializers import SupplierPOGRNMaterialQASerializer, MaterialGRNDetailSerializer, \
    SupplierPOGRNMaterialDetailSerializer, FabricGRNSerializer, GRNShadeSummarySerializer, GRNFabricMaterialDetailSerializer, \
    FabricGRNBatchNumberSerializer, SupplierPOGRNMinimalSerializer
from marketing.models import POClubShade, SupplierPOClubMaterialShadeMapping, ActualPOClub, SupplierDeliveryDateQuantityPOAllocation
from supplier_po.supplier_po_grn.serializers import SupplierPOGRNMaterialAdjestmentSerializer, SupplierPOMetaDataSearchableListSerializer
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from shared.serializers import PlantSerializer

class GRNMetaDataView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request):
        grn_states = []
        for choice in SupplierPOGRN.STATE_OPTIONS:
            grn_states.append({"id": choice[0], "name": choice[1]})

        metadata = {
            'grn_states': grn_states,
        }
        return Response(metadata)


# class GRNMetaDataUnitsView(APIView):
#     permission_classes = (HasPermission, )
#     write_roles = [STORES_USER_ROLE, ]
#
#     def get(self, request):
#         units = []
#         for choice in MaterialUnitHelper.ALL_MEASURING_UNITS:
#             units.append({"id": choice[0], "name": choice[1]})
#
#         metadata = {
#             'units': units,
#         }
#         return Response(metadata)


class CalculationSummaryBreakdownByDeliveryDateDetailView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        delivery_date_id = kwargs.get('delivery_date_id', None)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)
        delivery_date= get_object_or_404(SupplierDeliveryDate, pk=delivery_date_id)
        # data = DeliveryDateSummary(delivery_date, supplier_po).get_delivery_date_summarized_data()
        data = DeliveryDateSummary(delivery_date).get_delivery_date_summarized_data()
        return Response(data)


# class GRNDashBoardDetailView(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [STORES_USER_ROLE, ]
#     pagination_class = GeneralLargeResultsSetPagination

#     PO_DUE_TODAY_COUNT_KEY = 'po_due_today_count'
#     PO_DUE_IN_7_DAYS_COUNT_KEY = 'po_due_in_7_days_count'
#     PO_PAST_DUE_COUNT_KEY = 'po_past_due_count'
#     PO_FUTURE_EXPECTED_COUNT = 'po_future_expected_count'
#     GRN_COMPLETE_COUNT_KEY = 'grn_complete_count'
#     GRN_IN_PROGRESS_COUNT_KEY = 'grn_in_progress_count'

#     def get_supplier_po_ids(self, general_po_supplier_ids, plant_id):
#         if not plant_id == 'all':
#             supplier_po_ids = list(SupplierPO.objects.filter(general_po_supplier__id__in=general_po_supplier_ids, plant__id=plant_id).values_list('id', flat=True))
#         else:
#             supplier_po_ids = list(SupplierPO.objects.filter(general_po_supplier__id__in=general_po_supplier_ids).values_list('id', flat=True))
        
#         return supplier_po_ids

#     def get(self, request):
#         type = request.query_params.get('filter_type')
#         plant_id = request.query_params.get('plant_id', 'all')
#         current_date = timezone.now().date()
#         today = current_date
#         next_week = current_date + timedelta(days=7)

#         paginator = self.pagination_class()
#         supplier_delivery_dates = SupplierDeliveryDate.objects.all()

#         if type == self.PO_DUE_TODAY_COUNT_KEY:
#             general_po_supplier_ids = supplier_delivery_dates.filter(
#                 confirmed_delivery_date=today
#             ).values_list('general_po_supplier', flat=True)
#             po_ids = self.get_supplier_po_ids(general_po_supplier_ids, plant_id)
#             pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

#             paginated_data = paginator.paginate_queryset(pos, request, view=self)
#             if paginated_data:
#                 serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
#                 return paginator.get_paginated_response(serializer.data, meta_data=None)
#             else:
#                 serializer = SupplierPOBasicListSerializer(pos, many=True)
#                 return Response(serializer.data)

#         elif type == self.PO_DUE_IN_7_DAYS_COUNT_KEY:
#             general_po_supplier_ids = supplier_delivery_dates.filter(
#                 confirmed_delivery_date__gte=today,
#                 confirmed_delivery_date__lte=next_week
#             ).values_list('general_po_supplier', flat=True)
#             po_ids = self.get_supplier_po_ids(general_po_supplier_ids, plant_id)
#             pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

#             paginated_data = paginator.paginate_queryset(pos, request, view=self)
#             if paginated_data:
#                 serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
#                 return paginator.get_paginated_response(serializer.data, meta_data=None)
#             else:
#                 serializer = SupplierPOBasicListSerializer(pos, many=True)
#                 return Response(serializer.data)

#         elif type == self.PO_PAST_DUE_COUNT_KEY:
#             general_po_supplier_ids = supplier_delivery_dates.filter(
#                 confirmed_delivery_date__lt=today
#             ).values_list('general_po_supplier', flat=True)
#             po_ids = self.get_supplier_po_ids(general_po_supplier_ids, plant_id)
#             pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

#             paginated_data = paginator.paginate_queryset(pos, request, view=self)
#             if paginated_data:
#                 serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
#                 return paginator.get_paginated_response(serializer.data, meta_data=None)
#             else:
#                 serializer = SupplierPOBasicListSerializer(pos, many=True)
#                 return Response(serializer.data)
            
#         elif type == self.PO_FUTURE_EXPECTED_COUNT:
#             general_po_supplier_ids = supplier_delivery_dates.filter(
#                 confirmed_delivery_date__gt=today
#             ).values_list('general_po_supplier', flat=True)
#             po_ids = self.get_supplier_po_ids(general_po_supplier_ids, plant_id)
#             pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

#             paginated_data = paginator.paginate_queryset(pos, request, view=self)
#             if paginated_data:
#                 serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
#                 return paginator.get_paginated_response(serializer.data, meta_data=None)
#             else:
#                 serializer = SupplierPOBasicListSerializer(pos, many=True)
#                 return Response(serializer.data)

#         elif type == self.GRN_IN_PROGRESS_COUNT_KEY:
#             grns = SupplierPOGRN.objects.exclude(
#                 state=SupplierPOGRN.GRN_COMPLETE,
#             ).order_by('-id')
#             if not plant_id == 'all':
#                 grns = grns.filter(
#                     supplier_po__plant__id=plant_id
#                 )

#             paginated_data = paginator.paginate_queryset(grns, request, view=self)
#             if paginated_data:
#                 serializer = SupplierPOGRNBasicSerializer(paginated_data, many=True)
#                 return paginator.get_paginated_response(serializer.data, meta_data=None)
#             else:
#                 serializer = SupplierPOGRNBasicSerializer(grns, many=True)
#                 return Response(serializer.data)

#         elif type == self.GRN_COMPLETE_COUNT_KEY:
#             grns = SupplierPOGRN.objects.filter(
#                 state=SupplierPOGRN.GRN_COMPLETE
#             ).order_by('-id')
#             if not plant_id == 'all':
#                 grns = grns.filter(
#                     supplier_po__plant__id=plant_id
#                 )

#             paginated_data = paginator.paginate_queryset(grns, request, view=self)
#             if paginated_data is not None:
#                 serializer = SupplierPOGRNBasicSerializer(paginated_data, many=True)
#                 return paginator.get_paginated_response(serializer.data, meta_data=None)
#             else:
#                 serializer = SupplierPOGRNBasicSerializer(grns, many=True)
#                 return Response(serializer.data)


class GRNDashBoardDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    PO_DUE_TODAY_COUNT_KEY = 'po_due_today_count'
    PO_DUE_IN_7_DAYS_COUNT_KEY = 'po_due_in_7_days_count'
    PO_PAST_DUE_COUNT_KEY = 'po_past_due_count'
    PO_FUTURE_EXPECTED_COUNT = 'po_future_expected_count'
    GRN_COMPLETE_COUNT_KEY = 'grn_complete_count'
    GRN_IN_PROGRESS_COUNT_KEY = 'grn_in_progress_count'

    def get_supplier_po_ids(self, user_plant_ids, general_po_supplier_ids, plant_ids, supplier_po_id):
        
        user_plant_supplier_pos = SupplierPO.objects.filter(plant__id__in=user_plant_ids)
        supplier_pos = user_plant_supplier_pos.filter(general_po_supplier__id__in=general_po_supplier_ids)
        if plant_ids:
            supplier_pos = supplier_pos.filter(plant__id__in=plant_ids)
        if not supplier_po_id == 'all':
            supplier_pos = supplier_pos.filter(id=supplier_po_id)
        
        supplier_po_ids = list(supplier_pos.values_list('id', flat=True)) 
        return supplier_po_ids
    
    def filtering_spo_details(self, request, spos):

        order_details = request.query_params.get('order_details_ritz_code', None)
        supplier_name = request.query_params.get('supplier_name', None)
        supplier_po = request.query_params.get('supplier_po_number', None)
        customer_name = request.query_params.get('customer_name', None)
        global_filter = request.query_params.get('global_filter', None)

        if order_details:
            spos = [spo for spo in spos if order_details.lower() in spo.general_po_supplier.general_po.costing.order.ritz_code.lower()]
        if supplier_name:
            spos = [spo for spo in spos if supplier_name.lower() in spo.general_po_supplier.supplier.name.lower()]
        if supplier_po:
            spos = [spo for spo in spos if supplier_po.lower() in spo.display_number.lower()]
        if customer_name:
            spos = [spo for spo in spos if customer_name.lower() in spo.general_po_supplier.general_po.costing.order.customer.name.lower()]
        if global_filter:
            spos = [spo for spo in spos 
                    if global_filter.lower() in spo.general_po_supplier.general_po.costing.order.ritz_code.lower()
                    or global_filter.lower() in spo.general_po_supplier.supplier.name.lower()
                    or global_filter.lower() in spo.display_number.lower()
                    or global_filter.lower() in spo.general_po_supplier.general_po.costing.order.customer.name.lower()]
        return spos
    
    def filtering_spo_grn_details(self, request, spo_grns):

        grn = request.query_params.get('id', None)
        order_details = request.query_params.get('order_details_ritz_code', None)
        supplier_name = request.query_params.get('supplier_name', None)
        supplier_po = request.query_params.get('supplier_po_number', None)
        customer_name = request.query_params.get('customer_name', None)
        state = request.query_params.get('state_display', None)
        global_filter = request.query_params.get('global_filter', None)

        if grn:
            spo_grns = [spo_grn for spo_grn in spo_grns if grn.lower() in spo_grn.grn_number.lower()]
        if order_details:
            spo_grns = [spo_grn for spo_grn in spo_grns if order_details.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.ritz_code.lower()]
        if supplier_name:
            spo_grns = [spo_grn for spo_grn in spo_grns if supplier_name.lower() in spo_grn.supplier_po.general_po_supplier.supplier.name.lower()]
        if supplier_po:
            spo_grns = [spo_grn for spo_grn in spo_grns if supplier_po.lower() in spo_grn.supplier_po.display_number.lower()]
        if customer_name:
            spo_grns = [spo_grn for spo_grn in spo_grns if customer_name.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.customer.name.lower()]
        if state:
            spo_grns = [spo_grn for spo_grn in spo_grns if state.lower() in spo_grn.state.lower()]
        if global_filter:
            spo_grns = [spo_grn for spo_grn in spo_grns
                        if global_filter.lower() in spo_grn.grn_number.lower()
                        or global_filter.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.ritz_code.lower()
                        or global_filter.lower() in spo_grn.supplier_po.general_po_supplier.supplier.name.lower()
                        or global_filter.lower() in spo_grn.supplier_po.display_number.lower()
                        or global_filter.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.customer.name.lower()
                        or global_filter.lower() in spo_grn.state.lower()]
        return spo_grns

    def post(self, request):
        user = request.user
        user_plant_ids = list(user.plants.values_list('id', flat=True))

        type = request.query_params.get('filter_type')
        plant_ids = request.data.get('plant_ids', [])
        supplier_po_id = request.query_params.get('supplier_po_id', 'all')

        current_date = timezone.now().date()
        today = current_date
        next_week = current_date + timedelta(days=7)
        paginator = self.pagination_class()
        supplier_delivery_dates = SupplierDeliveryDate.objects.all()

        if type == self.PO_DUE_TODAY_COUNT_KEY:
            general_po_supplier_ids = list(supplier_delivery_dates.filter(confirmed_delivery_date=today).values_list('general_po_supplier', flat=True))
            po_ids = self.get_supplier_po_ids(user_plant_ids, general_po_supplier_ids, plant_ids, supplier_po_id)
            pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')
            
            pos = self.filtering_spo_details(request, pos)
            paginated_data = paginator.paginate_queryset(pos, request, view=self)
            if paginated_data:
                serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
                return paginator.get_paginated_response(serializer.data, meta_data=None)
            else:
                serializer = SupplierPOBasicListSerializer(pos, many=True)
                return Response(serializer.data)

        elif type == self.PO_DUE_IN_7_DAYS_COUNT_KEY:
            general_po_supplier_ids = list(supplier_delivery_dates.filter(confirmed_delivery_date__gte=today, confirmed_delivery_date__lte=next_week).values_list('general_po_supplier', flat=True))
            po_ids = self.get_supplier_po_ids(user_plant_ids, general_po_supplier_ids, plant_ids, supplier_po_id)
            pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

            pos = self.filtering_spo_details(request, pos)
            paginated_data = paginator.paginate_queryset(pos, request, view=self)
            if paginated_data:
                serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
                return paginator.get_paginated_response(serializer.data, meta_data=None)
            else:
                serializer = SupplierPOBasicListSerializer(pos, many=True)
                return Response(serializer.data)

        elif type == self.PO_PAST_DUE_COUNT_KEY:
            general_po_supplier_ids = list(supplier_delivery_dates.filter(confirmed_delivery_date__lt=today).values_list('general_po_supplier', flat=True))
            po_ids = self.get_supplier_po_ids(user_plant_ids, general_po_supplier_ids, plant_ids, supplier_po_id)
            pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

            pos = self.filtering_spo_details(request, pos)
            paginated_data = paginator.paginate_queryset(pos, request, view=self)
            if paginated_data:
                serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
                return paginator.get_paginated_response(serializer.data, meta_data=None)
            else:
                serializer = SupplierPOBasicListSerializer(pos, many=True)
                return Response(serializer.data)
            
        elif type == self.PO_FUTURE_EXPECTED_COUNT:
            general_po_supplier_ids = list(supplier_delivery_dates.filter(confirmed_delivery_date__gt=today).values_list('general_po_supplier', flat=True))
            po_ids = self.get_supplier_po_ids(user_plant_ids, general_po_supplier_ids, plant_ids, supplier_po_id)
            pos = SupplierPO.objects.filter(id__in=po_ids).order_by('-id')

            pos = self.filtering_spo_details(request, pos)
            paginated_data = paginator.paginate_queryset(pos, request, view=self)
            if paginated_data:
                serializer = SupplierPOBasicListSerializer(paginated_data, many=True)
                return paginator.get_paginated_response(serializer.data, meta_data=None)
            else:
                serializer = SupplierPOBasicListSerializer(pos, many=True)
                return Response(serializer.data)

        elif type == self.GRN_IN_PROGRESS_COUNT_KEY:
            grns = SupplierPOGRN.objects.filter(supplier_po__plant__id__in=user_plant_ids).exclude(state=SupplierPOGRN.GRN_COMPLETE).order_by('-id')

            if plant_ids:
                grns = grns.filter(supplier_po__plant__id__in=plant_ids)
            if not supplier_po_id == 'all':
                grns = grns.filter(supplier_po__id=supplier_po_id)

            grns = self.filtering_spo_grn_details(request, grns)
            paginated_data = paginator.paginate_queryset(grns, request, view=self)
            if paginated_data:
                serializer = SupplierPOGRNBasicSerializer(paginated_data, many=True)
                return paginator.get_paginated_response(serializer.data, meta_data=None)
            else:
                serializer = SupplierPOGRNBasicSerializer(grns, many=True)
                return Response(serializer.data)

        elif type == self.GRN_COMPLETE_COUNT_KEY:
            grns = SupplierPOGRN.objects.filter(state=SupplierPOGRN.GRN_COMPLETE, supplier_po__plant__id__in=user_plant_ids).order_by('-id')
            
            if plant_ids:
                grns = grns.filter(supplier_po__plant__id__in=plant_ids)
            if not supplier_po_id == 'all':
                grns = grns.filter(supplier_po__id=supplier_po_id)

            grns = self.filtering_spo_grn_details(request, grns)
            paginated_data = paginator.paginate_queryset(grns, request, view=self)
            if paginated_data is not None:
                serializer = SupplierPOGRNBasicSerializer(paginated_data, many=True)
                return paginator.get_paginated_response(serializer.data, meta_data=None)
            else:
                serializer = SupplierPOGRNBasicSerializer(grns, many=True)
                return Response(serializer.data)


# class GRNDashBoardView(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [FABRIC_INSPECTION_USER_ROLE, ]

#     def get_supplier_po_count(self, general_po_supplier_ids, plant_id):
#         if not plant_id == 'all':
#             count = SupplierPO.objects.filter(
#                 general_po_supplier__id__in=general_po_supplier_ids, plant__id=plant_id).count()
#         else:
#             count = SupplierPO.objects.filter(
#                 general_po_supplier__id__in=general_po_supplier_ids).count()
#         return count

#     def get(self, request):
#         current_date = timezone.now().date()
#         today = current_date
#         next_week = current_date + timedelta(days=7)
#         plant_id = request.query_params.get('plant_id', 'all')

#         today_general_po_supplier_ids = SupplierDeliveryDate.objects.filter(
#             confirmed_delivery_date=today
#         ).values_list('general_po_supplier', flat=True)
#         due_today_count = self.get_supplier_po_count(today_general_po_supplier_ids, plant_id)

#         due_in_7_days_general_po_supplier_ids = SupplierDeliveryDate.objects.filter(
#             confirmed_delivery_date__gt=today,
#             confirmed_delivery_date__lte=next_week
#         ).values_list('general_po_supplier', flat=True)
#         due_in_7_days_count = self.get_supplier_po_count(due_in_7_days_general_po_supplier_ids, plant_id)

#         past_due_general_po_supplier_ids = SupplierDeliveryDate.objects.filter(
#             confirmed_delivery_date__lt=today
#         ).values_list('general_po_supplier', flat=True)
#         past_due_count = self.get_supplier_po_count(past_due_general_po_supplier_ids, plant_id)

#         future_general_po_supplier_ids = SupplierDeliveryDate.objects.filter(
#             confirmed_delivery_date__gt=today
#         ).values_list('general_po_supplier', flat=True)
#         future_count = self.get_supplier_po_count(future_general_po_supplier_ids, plant_id)

#         if not plant_id == "all":
#             grn_complete_count = SupplierPOGRN.objects.filter(
#                 state=SupplierPOGRN.GRN_COMPLETE, supplier_po__plant__id=plant_id
#             ).count()
#         else:
#             grn_complete_count = SupplierPOGRN.objects.filter(
#                 state=SupplierPOGRN.GRN_COMPLETE
#             ).count()

#         if not plant_id == "all":
#             grn_in_progress_count = SupplierPOGRN.objects.exclude(
#                 state=SupplierPOGRN.GRN_COMPLETE).filter(
#                     supplier_po__plant__id=plant_id
#             ).count()
#         else:
#             grn_in_progress_count = SupplierPOGRN.objects.exclude(
#                 state=SupplierPOGRN.GRN_COMPLETE
#             ).count()

#         response = {
#             'po_due_today_count': due_today_count,
#             'po_due_in_7_days_count': due_in_7_days_count,
#             'po_past_due_count': past_due_count,
#             'po_future_expected_count': future_count,
#             'grn_complete_count': grn_complete_count,
#             'grn_in_progress_count': grn_in_progress_count,
#         }

#         return Response(response)


class GRNDashBoardView(APIView):
    permission_classes = (HasPermission,)
    # write_roles = [FABRIC_INSPECTION_USER_ROLE, ]
    write_roles = [STORES_USER_ROLE, ]

    def get_supplier_po_count(self, user_plant_ids, general_po_supplier_ids, plant_ids, supplier_po_id):

        user_plant_supplier_pos = SupplierPO.objects.filter(plant__id__in=user_plant_ids)
        supplier_pos = user_plant_supplier_pos.filter(general_po_supplier__id__in=general_po_supplier_ids)

        if plant_ids:
            supplier_pos = supplier_pos.filter(plant__id__in=plant_ids)
        if not supplier_po_id == 'all':
            supplier_pos = supplier_pos.filter(id=supplier_po_id)
        count = supplier_pos.count()

        return count

    def post(self, request):
        user = request.user
        user_plant_ids = list(user.plants.values_list('id', flat=True))
        
        user_plants = Plant.objects.filter(id__in=user_plant_ids)
        user_plant_list = PlantSerializer(user_plants, many=True).data
        plant_ids = request.data.get('plant_ids', [])
        supplier_po_id = request.query_params.get('supplier_po_id', 'all')

        current_date = timezone.now().date()
        today = current_date
        next_week = current_date + timedelta(days=7)

        today_general_po_supplier_ids = list(SupplierDeliveryDate.objects.filter(confirmed_delivery_date=today).values_list('general_po_supplier', flat=True))
        due_today_count = self.get_supplier_po_count(user_plant_ids, today_general_po_supplier_ids, plant_ids, supplier_po_id)

        due_in_7_days_general_po_supplier_ids = list(SupplierDeliveryDate.objects.filter(confirmed_delivery_date__gte=today, confirmed_delivery_date__lte=next_week).values_list('general_po_supplier', flat=True))
        due_in_7_days_count = self.get_supplier_po_count(user_plant_ids, due_in_7_days_general_po_supplier_ids, plant_ids, supplier_po_id)

        past_due_general_po_supplier_ids = list(SupplierDeliveryDate.objects.filter(confirmed_delivery_date__lt=today).values_list('general_po_supplier', flat=True))
        past_due_count = self.get_supplier_po_count(user_plant_ids, past_due_general_po_supplier_ids, plant_ids, supplier_po_id)

        future_general_po_supplier_ids = list(SupplierDeliveryDate.objects.filter(confirmed_delivery_date__gt=today).values_list('general_po_supplier', flat=True))
        future_count = self.get_supplier_po_count(user_plant_ids, future_general_po_supplier_ids, plant_ids, supplier_po_id)

        grn_complete_supplier_po_grns = SupplierPOGRN.objects.filter(supplier_po__plant__id__in=user_plant_ids, state=SupplierPOGRN.GRN_COMPLETE)
        if plant_ids:
            grn_complete_supplier_po_grns = grn_complete_supplier_po_grns.filter(supplier_po__plant__id__in=plant_ids)
        if not supplier_po_id == 'all':
            grn_complete_supplier_po_grns = grn_complete_supplier_po_grns.filter(supplier_po__id=supplier_po_id)
        grn_complete_count = grn_complete_supplier_po_grns.count()

        grn_in_progress_supplier_po_grns = SupplierPOGRN.objects.filter(supplier_po__plant__id__in=user_plant_ids).exclude(state=SupplierPOGRN.GRN_COMPLETE)
        if plant_ids:
            grn_in_progress_supplier_po_grns = grn_in_progress_supplier_po_grns.filter(supplier_po__plant__id__in=plant_ids)
        if not supplier_po_id == 'all':
            grn_in_progress_supplier_po_grns = grn_in_progress_supplier_po_grns.filter(supplier_po__id=supplier_po_id)
        grn_in_progress_count = grn_in_progress_supplier_po_grns.count()

        response = {
            'user_plants': user_plant_list,
            'po_due_today_count': due_today_count,
            'po_due_in_7_days_count': due_in_7_days_count,
            'po_past_due_count': past_due_count,
            'po_future_expected_count': future_count,
            'grn_complete_count': grn_complete_count,
            'grn_in_progress_count': grn_in_progress_count,
        }

        return Response(response)


class GRNDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOGRNSerializer
    queryset = SupplierPOGRN.objects.all().order_by('-id')


class GRNBasicDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOGRNMinimalSerializer
    queryset = SupplierPOGRN.objects.all().order_by('-id')


class GRNMaterialBasicDetailView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOGRNMaterialBasicDetailSerializer
    queryset = SupplierPOGRNMaterial.objects.all().order_by('-id')

    def get_queryset(self):
        qs = super().get_queryset().filter(
            supplier_po_grn_id=self.kwargs['supplier_po_grn_id']
        )
        return qs


class ReplacementGRNListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, grn_id):
        current_grn = get_object_or_404(SupplierPOGRN, pk=grn_id)
        po_grns = current_grn.supplier_po.supplierpogrn_set.all().filter(state=SupplierPOGRN.GRN_COMPLETE).exclude()

        data = []
        for grn in po_grns:
            actual_delivery_date = grn.get_actual_delivery_date()
            if actual_delivery_date:
                data.append({
                    'id': grn.id,
                    'display_name': '%s / %s / %s' % (actual_delivery_date.delivery_date, grn.supplier_pack_list.display_number, grn.grn_number)
                })
        return Response(data)


class GRNCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def create_grn_materials(self, grn, supplier_po):
        material_list = self.request.data.get('material_list', [])
        grn_material_list = []
        for material in material_list:
            grn_material, created = SupplierPOGRNMaterial.objects.get_or_create(
                supplier_po_grn=grn,
                grn_material_id=material
            )
            grn_material_list.append(grn_material)
        return grn_material_list

    def save_attachments(self, grn, attachments):
        for attachment in attachments:
            file = get_object_or_404(FileAttachment, pk=attachment)
            grn.attachments.add(file)

    def update_delivery_note(self, delivery_note_data):
        if delivery_note_data:
            delivery_note_id = delivery_note_data['id']
            file_attachment = delivery_note_data['delivery_note']
            delivery_note = get_object_or_404(SupplierPOInvoiceDeliveryNote, pk=delivery_note_id)
            if file_attachment:
                delivery_note.delivery_note_id = file_attachment['id']
                delivery_note.save()

    def post(self, request, *args, **kwargs):
        supplier_po = request.data.get('supplier_po', None)
        supplier_pack_list = request.data.get('supplier_pack_list', None)
        delivery_note = request.data.get('delivery_note', {})
        remarks = request.data.get('remark', None)
        attachments = request.data.get('attachments', [])
        replacement_grn_ids = request.data.get('replacement_grns', [])
        warehouse = request.data.get('warehouse', None)

        grn = SupplierPOGRN.objects.create(
            supplier_po_id=supplier_po,
            supplier_pack_list_id=supplier_pack_list,
            state=SupplierPOGRN.DRAFT_STATE,
            remarks=remarks
        )
        if warehouse:
            grn.warehouse_id = warehouse
            grn.save()
        if replacement_grn_ids:
            for replacement_grn_id in replacement_grn_ids:
                replacement_grn = get_object_or_none(SupplierPOGRN, {'pk': replacement_grn_id})
                grn.replacement_grn.add(replacement_grn)

        self.create_grn_materials(grn, supplier_po)
        self.save_attachments(grn, attachments)
        self.update_delivery_note(delivery_note)

        response = SupplierPOGRNSerializer(grn).data
        return Response(response)


class GRNUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def update_replacement_grns(self, supplier_po_grn, replacement_grn_ids):
        if replacement_grn_ids:
            for replacement_grn_id in replacement_grn_ids:
                replacement_grn = get_object_or_none(SupplierPOGRN, {'pk': replacement_grn_id})
                supplier_po_grn.replacement_grn.add(replacement_grn)

        current_replacement_grns = supplier_po_grn.replacement_grn.all()
        for current_grn in current_replacement_grns:
            if current_grn.pk not in replacement_grn_ids:
                supplier_po_grn.replacement_grn.remove(current_grn)

    def update_grn(self, supplier_po_grn):
        invoice_number = self.request.data.get('invoice_number')
        pack_list_attachment = self.request.data.get('pack_list_attachment', None)
        commercial_invoice_attachment = self.request.data.get('commercial_invoice_attachment', None)
        delete_pack_list_attachment = self.request.data.get('delete_pack_list_attachment', None)
        delete_commercial_invoice_attachment = self.request.data.get('delete_commercial_invoice_attachment', None)
        #state = self.request.data.get('state', None)
        remarks = self.request.data.get('remark', None)
        warehouse =  self.request.data.get('warehouse', None)

        pack_list_attachment_list = []
        commercial_invoice_attachment_list = []
        validation_errors = []
        if commercial_invoice_attachment:
            file = get_object_or_404(FileAttachment, pk=commercial_invoice_attachment)
            supplier_po_grn.commercial_invoice_attachment = file
        if delete_commercial_invoice_attachment:
            supplier_po_grn.commercial_invoice_attachment = None

        if pack_list_attachment:
            file = get_object_or_404(FileAttachment, pk=pack_list_attachment['id'])
            supplier_po_grn.pack_list_attachment = file
        if delete_pack_list_attachment:
            supplier_po_grn.pack_list_attachment = None

        supplier_po_grn.invoice_number = invoice_number

        # if state:
        #     validation_errors = supplier_po_grn.move_to_next_state(state)

        if warehouse:
            supplier_po_grn.warehouse_id = warehouse


        supplier_po_grn.remarks = remarks
        supplier_po_grn.save()

        return validation_errors

    def get_barcode(self):
        lowercase_str = uuid.uuid4().hex
        return lowercase_str

    def process_material_packList(self):
        pass #TODO set pack_list processor

    def update_material_data(self, supplier_po_grn_material, row):
        material_pack_list_attachment_id = row.get('material_pack_list_attachment', None)
        total_expected_quantity = row.get('total_expected_quantity', None)
        total_expected_quantity_units = row.get('total_expected_quantity_units', None)
        grn_price = row.get('grn_price', None)
        delete_material_pack_list_attachment_id = row.get('delete_material_pack_list_attachment_id', None)
        if supplier_po_grn_material:
            if delete_material_pack_list_attachment_id:
                supplier_po_grn_material.material_pack_list_attachment_id = None
            else:
                supplier_po_grn_material.material_pack_list_attachment_id = material_pack_list_attachment_id
            # supplier_po_grn_material.total_expected_quantity = total_expected_quantity
            # supplier_po_grn_material.total_expected_quantity_units = total_expected_quantity_units
            supplier_po_grn_material.grn_price = grn_price

            supplier_po_grn_material.total_price = get_float_or_zero(total_expected_quantity) * get_float_or_zero(grn_price) if total_expected_quantity and grn_price else 0
            supplier_po_grn_material.save()

        return supplier_po_grn_material

    def post(self, request, *args, **kwargs):
        supplier_po_grn_id = kwargs.get('supplier_po_grn_id', None)
        replacement_grn_ids = request.data.get('replacement_grns', [])
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        errors = self.update_grn(supplier_po_grn)
        self.update_replacement_grns(supplier_po_grn, replacement_grn_ids)

        for row in self.request.data.get('data'):
            grn_material_id = row.get('supplier_po_grn_material_id', None)
            supplier_po_grn_material = SupplierPOGRNMaterial.objects.get(pk=grn_material_id)
            self.update_material_data(supplier_po_grn_material, row)

        if not errors:
            http_response = Response({'success': True})
        else:
            http_response = Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        return http_response
    

class SupplierPOGRNStateChangeView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request, supplier_po_grn_id):
        new_state = request.data.get('new_state', None)
        if new_state == SupplierPOGRN.GRN_CANCEL:
            if request.user and not request.user.has_role(STORES_MANAGER_ROLE):
                return Response('User has not permission to cancel GRN', status=status.HTTP_403_FORBIDDEN)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        errors = supplier_po_grn.move_to_next_state(new_state, request.user)
        if not errors:
            http_response = Response({'status': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class SupplierPOGRNMaterialDetailBinLocationUpdateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    editable_states = [SupplierPOGRN.GRN_VERIFICATION]

    def get_object_current_state(self):
        return self.get_supplier_po_grn().state

    def get_supplier_po_grn(self):
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        return supplier_po_grn
    
    def post(self, request, supplier_po_grn_id):
        from shared.models import PlantWarehouseRackBin
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        data = request.data
        for row in data:
            material_data = row['supplierpogrnmaterialdetail_set']
            for material_row in material_data:
                suppier_po_grn_material_detail = get_object_or_404(SupplierPOGRNMaterialDetail, pk=material_row['id'])
                bin_location = get_object_or_404(PlantWarehouseRackBin, pk=material_row['bin_location'])
                suppier_po_grn_material_detail.bin_location = bin_location
                suppier_po_grn_material_detail.save()
        http_response = Response({'status': True})
        return http_response
    
    

class GRNMaterialQuantityAdjustmentDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, *args, **kwargs):
        supplier_po_grn_id = kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn_id=supplier_po_grn_id)
        data = SupplierPOGRNMaterialAdjestmentSerializer(supplier_po_grn_materials, many=True).data
        http_response = Response(data)
        return http_response
    

class GRNMaterialQuantityAdjustmentUpdateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    editable_states = [SupplierPOGRN.GRN_VERIFICATION]

    def get_object_current_state(self):
        return self.get_supplier_po_grn().state

    def get_supplier_po_grn(self):
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        return supplier_po_grn

    def post(self, request, *args, **kwargs):
        data = request.data.get('data', [])
        errors = []
        for row in data:
            grn_material_id = row.get('id', None)
            instance = SupplierPOGRNMaterial.objects.get(pk=grn_material_id)
            serializer = SupplierPOGRNMaterialAdjestmentSerializer(instance=instance, data=row)
            if serializer.is_valid():
                serializer.save()
            else:
                errors.append(serializer.errors)

        if not errors: 
            http_response = Response({'success': True})
        else:
            http_response = Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        return http_response
    

class GRNMaterialQuantityAdjustmentRecalculateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    editable_states = [SupplierPOGRN.GRN_VERIFICATION]

    def get_object_current_state(self):
        return self.get_supplier_po_grn().state

    def get_supplier_po_grn(self):
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        return supplier_po_grn

    def post(self, request, *args, **kwargs):
        supplier_po_grn_id = kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN ,pk=supplier_po_grn_id)
        for supplier_po_grn_material in supplier_po_grn.supplierpogrnmaterial_set.all():
            supplier_po_grn_material.calculated_value_status = False
            supplier_po_grn_material.save()
        # supplier_po_grn.copy_material_quantities()
        supplier_po_grn.calculate_grn_summary_and_inhouse_materials()
        return Response({'status': True})


class SupplierPOGRNMaterialDetailRowSaveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def handle_defects(self, supplier_po_grn_material_detail, defects, deleted_defect_ids):
        errors = {}
        if defects:
            index = 0
            for row in defects:
                id = row['id']
                supplier_po_gen_material_qa = None
                row['supplier_po_grn_material_detail'] = supplier_po_grn_material_detail.pk
                if id:
                    supplier_po_gen_material_qa = SupplierPOGRNMaterialQA.objects.get(pk=id)

                supplier_po_gen_material_qa_serializer = SupplierPOGRNMaterialQASerializer(data=row, instance=supplier_po_gen_material_qa)
                if supplier_po_gen_material_qa_serializer.is_valid():
                    supplier_po_gen_material_qa_serializer.save()
                else:
                    errors[str(index)]= supplier_po_gen_material_qa_serializer.errors
                index +=1
        if deleted_defect_ids:
            SupplierPOGRNMaterialQA.objects.filter(id__in=deleted_defect_ids).delete()
        return errors

    def handle_attachments(self, material_detail, attachments, delete_attachment_ids):
        if attachments:
            attachment_ids = [attachment['id'] for attachment in attachments]
            attachments = FileAttachment.objects.filter(pk__in=attachment_ids)
            material_detail.attachments.add(*attachments)
        if delete_attachment_ids:
            delete_attahcments = FileAttachment.objects.filter(id__in=delete_attachment_ids)
            material_detail.attachments.remove(*delete_attahcments)

    def select_inspection_rolls(self, supplier_po_grn_material_detail, row):
        material_data = {}
        success = True
        skipped_supplier_po_grn_material_details = None
        http_response = Response({'modal_status': 'success' if success else 'unsuccess'})
        if row.get('complete_state', None):
            supplier_po_grn_material_detail.inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_COMPLETE
            supplier_po_grn_material_detail.save()
            supplier_po_grn_material_detail.calculate_defect_rate()
        elif not supplier_po_grn_material_detail.inspection_state == supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_NOT_NEED and supplier_po_grn_material_detail.inspection_state:
            supplier_po_grn_material_detail.inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_IN_PROGRESS
            supplier_po_grn_material_detail.save()
        supplier_po_grn_material_detail.batch_number.set_inspection_status()
        next_supplier_po_grn_material_detail = None
        supplier_po_grn_material_details = supplier_po_grn_material_detail.batch_number.supplierpogrnmaterialdetail_set.filter(inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_READY_FOR_INSPECTION).order_by('id')
        if not supplier_po_grn_material_details:
            supplier_po_grn_material_details = supplier_po_grn_material_detail.batch_number.supplierpogrnmaterialdetail_set.filter(inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_IN_PROGRESS).order_by('id')
        modal_status = 'load_next'
        inspection_pending_supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
            inspection_state__in = [supplier_po_grn_material_detail.INSPECTION_STATE_READY_FOR_INSPECTION ,supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_IN_PROGRESS],
            supplier_po_grn_material = supplier_po_grn_material_detail.supplier_po_grn_material,
        ).exclude(batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED).order_by('batch_number', 'id')
        if supplier_po_grn_material_details:
            next_supplier_po_grn_material_detail = supplier_po_grn_material_details[0]
            if len(supplier_po_grn_material_details) == 1:
                if not inspection_pending_supplier_po_grn_material_details.exclude(batch_number=next_supplier_po_grn_material_detail.batch_number).exists():
                    modal_status = 'last_inspection_roll'
        else:
            supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
                inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_READY_FOR_INSPECTION,
                supplier_po_grn_material = supplier_po_grn_material_detail.supplier_po_grn_material,
            ).exclude(batch_number__inspection_status=FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED).exclude(
                batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS).order_by('batch_number', 'id')

            if supplier_po_grn_material_details:
                next_supplier_po_grn_material_detail = supplier_po_grn_material_details[0]
                if len(supplier_po_grn_material_details) == 1:
                    if not inspection_pending_supplier_po_grn_material_details.exclude(batch_number = next_supplier_po_grn_material_detail.batch_number).exists():
                        modal_status = 'last_inspection_roll'
            else:
                modal_status = 'skipped_batches'
                skipped_supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
                    inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_READY_FOR_INSPECTION,
                    supplier_po_grn_material = supplier_po_grn_material_detail.supplier_po_grn_material,
                    batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS
                ).distinct('batch_number').order_by('batch_number', 'id')

                if not skipped_supplier_po_grn_material_details:
                    skipped_supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
                        inspection_state = supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_IN_PROGRESS,
                        supplier_po_grn_material = supplier_po_grn_material_detail.supplier_po_grn_material,
                        batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS
                    ).distinct('batch_number').order_by('batch_number', 'id')


        if next_supplier_po_grn_material_detail:
            material_data = SupplierPOGRNMaterialDetailSerializer(next_supplier_po_grn_material_detail).data
            material_data['modal_status'] = modal_status
            http_response = Response(material_data)
        elif skipped_supplier_po_grn_material_details and skipped_supplier_po_grn_material_details.exists():
            material_data['rolls'] = SupplierPOGRNMaterialDetailSerializer(skipped_supplier_po_grn_material_details, many=True).data
            material_data['modal_status'] = modal_status
            http_response = Response(material_data)
        return http_response

    def post(self, request, grn_material_id):
        row = request.data
        supplier_po_grn_material_detail_id = row['id']
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)
        context = {'supplier_po_grn_material': supplier_po_grn_material, 'supplier_po_grn': supplier_po_grn_material.supplier_po_grn}
        material_is_fabric = supplier_po_grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL
        attachments = row.get('attachment_details', [])
        delete_attahcments = row.get('deleted_attachment_ids', [])
        deleted_defect_ids = row.get('deleted_deffect_ids', [])
        row['supplier_po_grn_material'] = supplier_po_grn_material.pk
        defects = []
        if 'defects' in row:
            defects = row['defects']

        supplier_po_grn_material_detail = None
        fabric_grn_detail = None
        serializer_errors = {}
        success = True
        if supplier_po_grn_material_detail_id:
            supplier_po_grn_material_detail = SupplierPOGRNMaterialDetail.objects.get(pk=supplier_po_grn_material_detail_id)
            if material_is_fabric:
                fabric_grn_detail, created = FabricGRNDetail.objects.get_or_create(grn_material_detail=supplier_po_grn_material_detail)
        material_grn_serializer = MaterialGRNDetailSerializer(data=row, context=context, instance=supplier_po_grn_material_detail)
        if material_grn_serializer.is_valid():
            if not row.get('complete_state', None) or not supplier_po_grn_material_detail.inspection_state == supplier_po_grn_material_detail.INSPECTION_STATE_INSPECTION_COMPLETE:
                if row.get('complete_state', None) and not row.get('shade_category' ,None):
                    serializer_errors['shade_category'] = 'please select a category'
                if material_is_fabric:
                    if not row.get('batch_number', None):
                        serializer_errors['batch_number'] = 'please select a batch number'
                if not row.get('indicated_quantity_units', None):
                    serializer_errors['indicated_quantity_units'] = 'please select a indiacated quantity units'
                if not row.get('indicated_quantity', None):
                    serializer_errors['indicated_quantity'] = 'please enter a indiacated quantity'
                else:
                    supplier_po_grn_material_detail = material_grn_serializer.save()
                    self.handle_attachments(supplier_po_grn_material_detail, attachments, delete_attahcments)
                    defects_errors = self.handle_defects(supplier_po_grn_material_detail, defects, deleted_defect_ids)
                    if len(defects_errors) > 0:
                        serializer_errors['defect_errors'] = defects_errors
                    if material_is_fabric:
                        row['grn_material_detail'] = supplier_po_grn_material_detail.pk
                        fabric_serializer = FabricGRNSerializer(data=row, context=context, instance=fabric_grn_detail)
                        if fabric_serializer.is_valid():
                            fabric_serializer.save()
                            fabric_serializer.instance.set_qa_inspection_failed_reason()
                        else:
                            serializer_errors['fabric_grn_errors'] = fabric_serializer.errors
            else:
                success = False
        else:
            serializer_errors = material_grn_serializer.errors
        if not serializer_errors:
            data = {'modal_status': 'success' if success else 'unsuccess'}
            if not success:
                data['errors']={
                    'fabric_inspection_errors': 'Unable to edit. This roll has been inspected and marked as complete.'
                }
            http_response = Response(data,
                                     status=status.HTTP_200_OK if success else status.HTTP_403_FORBIDDEN)
            if supplier_po_grn_material_detail.batch_number and success:
                http_response = self.select_inspection_rolls(supplier_po_grn_material_detail, row)
            supplier_po_grn_material.set_material_quantities()
        else:
            http_response = Response({'modal_status': 'unsuccess', 'errors': serializer_errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class SupplierPOGRNMaterialDetailRowListSaveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def create_actual_width(self, supplier_po_grn, actual_width):
        grn_width = FabricGRNWidth.objects.create(
                    actual_width=actual_width, grn=supplier_po_grn, actual_width_units=MaterialUnitHelper.INCHES_UNIT
                )
        return grn_width
    
    def set_supplier_po_shade(self, roll_shade, supplier_po_grn_material):
        po_shade, created = SupplierPOFabricShade.objects.get_or_create(
            supplier_po=supplier_po_grn_material.supplier_po_grn.supplier_po,
            material=supplier_po_grn_material.grn_material.customer_brand_material,
            shade_name=roll_shade.shade
        )
        return po_shade
    
    def set_club_shade(self, po_club, roll_shade, supplier_po_grn_material):
        club_shade, created = POClubShade.objects.get_or_create(
            po_club=po_club,
            material=supplier_po_grn_material.grn_material.customer_brand_material,
            shade_name =roll_shade.shade
        )
        return club_shade
    
    def map_shade(self, po_shade, club_shade):
        map_shade = SupplierPOClubMaterialShadeMapping.objects.get_or_create(
            po_club_shade=club_shade,
            supplier_po_shade=po_shade
        )
        return map_shade

    def set_shade(self, shade, batch_number, supplier_po_grn_material):
        grn_batch_shade, created = GRNBatchNumberShade.objects.get_or_create(
                shade=shade, batch_number=batch_number
        )
        po_shade = self.set_supplier_po_shade(grn_batch_shade, supplier_po_grn_material)
        club_shade = self.set_club_shade(grn_batch_shade.batch_number.grn_material.supplier_po_grn.supplier_po.general_po.po_club, grn_batch_shade, supplier_po_grn_material)
        grn_batch_shade.supplier_po_shade = po_shade
        self.map_shade(po_shade, club_shade)
        grn_batch_shade.save()
        return grn_batch_shade

    def post(self, request, grn_material_id):
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)
        data = request.data
        for row in data['supplierpogrnmaterialdetail_set']:
            grn_material_detail = get_object_or_404(SupplierPOGRNMaterialDetail, pk=row['id'])
            shade_name = row['shade']['display_value']
            shade = self.set_shade(shade_name, grn_material_detail.batch_number, supplier_po_grn_material)
            actual_width = self.create_actual_width(grn_material_detail.supplier_po_grn_material.supplier_po_grn, row['actual_width']['display_value'])
            grn_material_detail.fabricgrndetail.actual_gsm = row['actual_gsm']
            grn_material_detail.fabricgrndetail.indicated_gsm = row['indicated_gsm']
            grn_material_detail.fabricgrndetail.shrink_lot = row['shrink_lot']
            grn_material_detail.fabricgrndetail.shrink_width = row['shrink_width']
            grn_material_detail.fabricgrndetail.shrink_length = row['shrink_length']
            grn_material_detail.fabricgrndetail.actual_width = actual_width
            grn_material_detail.fabricgrndetail.save()
            grn_material_detail.shade = shade
            grn_material_detail.save()

            http_response = Response({'status': True})
        return http_response


class ShadeByBatchNumberListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, fabric_batch_number_id):
        batch_number = get_object_or_404(FabricGRNBatchNumber, pk=fabric_batch_number_id)
        shades = batch_number.grnbatchnumbershade_set.all()

        response = []
        for shade in shades:
            data = {
                'value': shade.id,
                'display_value': shade.shade
            }
            response.append(data)

        return Response(response)


class GRNFabricDetailRowDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = MaterialGRNDetailSerializer
    queryset = SupplierPOGRNMaterialDetail.objects.all().order_by('-id')


class MaterialPackListDownloadTemplateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, grn_material_id):
        grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)
        response = PackListProcessor(grn_material).download_pack_list_template()
        return response


class FabricBarcodeGenerator(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, grn_material_id):
        grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)
        response = PackListQRGenerator(grn_material).process_qr()
        return response


class FabricInspectionListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterialDetail.objects.all()

    def get(self, request, *args, **kwargs):
        from materials.fieldmetadata.material_metadata import get_grn_meta_material_headers, get_grn_material_headers

        supplier_po_grn_material_detail_list = {}
        supplier_po_grn_material_detail_list['grn_headers'] = get_grn_meta_material_headers()
        supplier_po_grn_material_detail_list['supplier_po_grn_material_set'] = []
        supplier_po_grn_id = kwargs['supplier_po_grn_id']
        supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
            supplier_po_grn_material__supplier_po_grn__id=supplier_po_grn_id
        ).exclude(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)

        for material in supplier_po_grn_material_details.distinct('supplier_po_grn_material'):
            material_data = SupplierPOGRNMaterialSerializer(material.supplier_po_grn_material).data
            if 'material_details' in material_data:
                if 'headers' in material_data['material_details']:
                    material_data['material_details'].pop('headers')
            material_details = material_data
            material_details['qa_inspection_complete'] = not supplier_po_grn_material_details.filter(
                supplier_po_grn_material__grn_material = material.supplier_po_grn_material.grn_material
                ).exclude(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_COMPLETE).exists()

            material_details['material_headers'] = get_grn_material_headers(material.supplier_po_grn_material)

            material_detail_qs = supplier_po_grn_material_details.filter(
                supplier_po_grn_material__grn_material = material.supplier_po_grn_material.grn_material
            ).order_by('batch_number', 'id')

            material_details['supplierpogrnmaterialdetail_set'] = SupplierPOGRNMaterialDetailSerializer(material_detail_qs, many=True).data

            supplier_po_grn_material_detail_list['supplier_po_grn_material_set'].append(material_details)
        return Response(supplier_po_grn_material_detail_list)


class FabricInspectionSummaryView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterialDetail.objects.all()

    def get(self, request, *args, **kwargs):
        supplier_po_grn_id = kwargs['supplier_po_grn_id']
        data_set = []
        supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
            supplier_po_grn_material__supplier_po_grn__id=supplier_po_grn_id
        ).exclude(inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)

        supplier_po_grn_materials = [supplier_po_grn_material_detail.supplier_po_grn_material for supplier_po_grn_material_detail in supplier_po_grn_material_details.distinct('supplier_po_grn_material')]

        for supplier_po_grn_material in supplier_po_grn_materials:
            material_data = SupplierPOGRNMaterialSerializer(supplier_po_grn_material).data
            material_data = {data: material_data[data] for data in material_data if not data in ['supplierpogrnmaterialdetail_set']}
            material_data['batch_details'] = []
            material_details = supplier_po_grn_material_details.filter(supplier_po_grn_material=supplier_po_grn_material)
            batch_numbers = [material_detail.batch_number for material_detail in material_details.distinct('batch_number')]

            for batch_number in batch_numbers:
                batch_data = {}
                batch_material_details = material_details.filter(batch_number=batch_number)
                batch_data['avg_defect_rate_per_100_square_yards'] = batch_number.avg_defect_rate_per_100_square_yards
                batch_data['inspection_status'] = batch_number.inspection_status
                batch_data['batch_number'] = batch_number.batch_number

                for shade_category in SupplierPOGRNMaterialDetail.SHADE_CATEGORY_CHOICES:
                    batch_data[shade_category[0]] = [roll.fabricgrndetail.pack_number for roll in batch_material_details.filter(shade_category=shade_category[0])]
                batch_data['fail_rolls'] = [roll.fabricgrndetail.pack_number for roll in batch_material_details.filter(qa_inspection_passed=False)]
                material_data['batch_details'].append(batch_data)

            data_set.append(material_data)

        return Response(data_set)


class GRNFabricShadeSummary(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = GRNShadeSummarySerializer

    def get_queryset(self):
        material_ids = FabricGRNDetail.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn_id=self.kwargs['grn_id']
        ).values_list(
            'grn_material_detail__supplier_po_grn_material__grn_material_id', flat=True
        )
        queryset = SupplierInquiryMaterialCode.objects.filter(id__in=material_ids).order_by('-id')
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['grn_id'] = self.kwargs['grn_id']
        return context


class GRNFabricWidthShadeSummaryView(generics.GenericAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterial.objects.filter(grn_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)

    def structure_width_data(self, width_data):
        width_data_list = []
        for row in width_data.values():
            shade_data = row.pop('shades')
            row['width_shade_group'] = shade_data.values()
            width_data_list.append(row)
        return width_data_list

    def get(self, request, supplier_po_grn_id, *args, **kwargs):
        supplier_po_grn_materials = SupplierPOGRNMaterial.objects.filter(
            grn_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL,
            supplier_po_grn_id=supplier_po_grn_id
        )
        return_data = []
        for supplier_po_grn_material in supplier_po_grn_materials:
            material_details = supplier_po_grn_material.supplierpogrnmaterialdetail_set.all()
            data = SupplierPOGRNMaterialSerializer(supplier_po_grn_material).data
            data.pop('supplierpogrnmaterialdetail_set')
            data.pop('material_headers')
            summary_data = {
                'grn_material_details': data,
            }

            width_data = {}

            for material_detail in material_details:
                try:
                    fabric_detail = material_detail.fabricgrndetail

                    if not width_data.get(fabric_detail.actual_width_id, None):
                        width_data[fabric_detail.actual_width_id] = {
                            'total_quantity': 0,
                            'quantity_units': material_detail.normalized_actual_quantity_unit,
                            'width': fabric_detail.actual_width.actual_width_display_value if fabric_detail.actual_width else None,
                            'shades': {}
                        }
                    width_data[fabric_detail.actual_width_id]['total_quantity'] += material_detail.normalized_actual_quantity

                    shade_id = None
                    shade_display = 'Shade Not Defined'
                    if material_detail.shade and material_detail.shade.supplier_po_shade:
                        shade_display = material_detail.shade.supplier_po_shade.shade_name
                        shade_id = material_detail.shade.supplier_po_shade_id

                    if not width_data[fabric_detail.actual_width_id]['shades'].get(shade_id, None):
                        width_data[fabric_detail.actual_width_id]['shades'][shade_id] = {
                            'shade_display': shade_display,
                            'total_quantity': 0
                        }

                    width_data[fabric_detail.actual_width_id]['shades'][shade_id]['total_quantity'] += material_detail.normalized_actual_quantity

                except ObjectDoesNotExist:
                    continue
            stuctured_data = self.structure_width_data(width_data)
            summary_data['width_group'] = stuctured_data
            return_data.append(summary_data)
        return Response(return_data)


class GRNFabricDetailListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = GRNFabricMaterialDetailSerializer
    queryset = CustomerBrandMaterial.objects.all().order_by('id')

    def get_queryset(self):
        qs = SupplierPOGRNMaterial.objects.filter(
            supplier_po_grn=self.kwargs['grn_id'],
            grn_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL
        )
        return qs


class ShadeByBatchListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = FabricGRNBatchNumberSerializer
    queryset = FabricGRNBatchNumber.objects.all().order_by('batch_number')

    def get_queryset(self):
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=self.kwargs['supplier_po_grn_material_id'])
        qs = super().get_queryset().filter(
            grn_material=supplier_po_grn_material
        )
        return qs
    

class SupplierPOClubMaterialShadeMappingListView(generics.ListAPIView):
    queryset = ActualPOClub.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (STORES_USER_ROLE, )
    serializer_class = POClubShadeMappingSerializer

    def get_queryset(self):
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        #purchase_orders_in_supplier_po = 
        po_club_ids = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo=supplier_po_grn.supplier_po
        ).values_list('purchase_order__actual_po_club', flat=True)
        qs = ActualPOClub.objects.filter(id__in=po_club_ids)
        return qs
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        context['supplier_po_grn'] = supplier_po_grn
        return context
    

class SupplierPOClubMaterialShadeMappingCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = (STORES_USER_ROLE, )

    errors = {}
    has_errors = False

    def __init__(self, *args, **kwargs):
        self.errors = {}
        super(APIView, self).__init__(*args, **kwargs)

    def validate_data(self, data):
        po_club_errors = {}
        for data_row in data:
            club_id = data_row['id']
            for material_row in data_row['materials']:
                index = 0
                material_id = material_row['id']
                for shade_mapping in material_row['shade_mappings']:
                    po_club_shade_data = shade_mapping['po_club_shade']
                    if not po_club_shade_data:
                        if club_id not in po_club_errors:
                            po_club_errors[club_id] = {}
                        if material_id not in po_club_errors[club_id]:
                             po_club_errors[club_id][material_id] = {}
                        po_club_errors[club_id][material_id] [index] = "Select mapping club shade."
                        self.has_errors = True
                    index += 1
        if self.has_errors:
            self.errors['po_club_errors'] = po_club_errors

    def post(self, request, supplier_po_grn_id):
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        data = request.data.get('data', None)
        self.validate_data(data)

        if not self.has_errors:
            for data_row in data:
                po_club_id = data_row['id']
                materials = data_row['materials']

                for material_row in materials:
                    material_id = material_row['id']
                    for shade_mapping in material_row['shade_mappings']:
                        supplier_po_shade = SupplierPOFabricShade.objects.get(id=shade_mapping['id'])

                        shade_id = str(shade_mapping['po_club_shade']['id'])
                        if not shade_id.startswith("new_po_shade_"):
                            po_club_shade = POClubShade.objects.get(id=shade_mapping['po_club_shade']['id'])
                        else:
                            po_club_shade, created = POClubShade.objects.get_or_create(
                                po_club_id=po_club_id,
                                shade_name=shade_mapping['po_club_shade']['shade_name'],
                                material_id=material_id
                            )
                            if created:
                                shade_swatch = FileAttachment()
                                shade_swatch.id = None
                                shade_swatch.display_name = supplier_po_shade.shade_swatch.display_name
                                shade_swatch.file_path = supplier_po_shade.shade_swatch.file_path
                                shade_swatch.type = supplier_po_shade.shade_swatch.type
                                shade_swatch.save()
                                po_club_shade.shade_swatch=supplier_po_shade.shade_swatch
                            po_club_shade.save()
                    
                        supplier_po_club_material_shade_mapping = get_object_or_none(SupplierPOClubMaterialShadeMapping, {'supplier_po_shade': supplier_po_shade, 'po_club_shade__po_club_id': po_club_id})

                        if supplier_po_club_material_shade_mapping:
                            supplier_po_club_material_shade_mapping.po_club_shade=po_club_shade
                            supplier_po_club_material_shade_mapping.save()
                        else:
                            supplier_po_club_material_shade_mapping = SupplierPOClubMaterialShadeMapping.objects.get_or_create(
                                supplier_po_shade=supplier_po_shade,
                                po_club_shade=po_club_shade
                            )
            http_response = Response({'success': True})
        else:
            http_response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class POClubGRNMaterialDetailListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, actual_po_club_id):
        from shared.utils import get_quantity_dictionary, calculate_queryset_total_normalized_quantity
        from materials.models import UserDefinedMaterial, SEWING_TRIM_TYPES, FABRIC_TRIM_TYPES, PACKAGING_TYPES
        from marketing.models import PurchaseOrderBom, SupplierDeliveryDateQuantity, GeneralPOSupplierMaterialPrice
        po_club = get_object_or_404(ActualPOClub, pk=actual_po_club_id)
        data = {
            FABRIC_TRIM_TYPES: [],
            SEWING_TRIM_TYPES: [],
            PACKAGING_TYPES: []
        }
        #grns = SupplierPOGRN.objects.filter(supplier_po__in=supplier_pos)
        #materil_ids = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grns).values_list('grn_material__customer_brand_material', flat=True)
        materials = po_club.get_materials_in_club()
        for material in materials:
            material_type = material.material_detail.generic_material.user_material.category
            material_unit = material.material_normalized_measuring_unit
            headers = UserDefinedMaterial.get_material_headers(material.material_detail.generic_material.user_material.name)
            material_boms = PurchaseOrderBom.objects.filter(purchase_order__actual_po_club=po_club, material=material)
            bom_quantity = calculate_queryset_total_normalized_quantity(material_boms, material_unit, 'order_quantity', 'order_quantity_units')
            material_data = {
                'id': material.id,
                'headers': headers,
                'attributes': material.get_attributes(),
                'bom_quantity': get_quantity_dictionary(bom_quantity, material_unit),
                'supplier_pos': []
            }
            
            supplier_pos = SupplierPO.objects.filter(id__in=GeneralPOSupplierMaterialPrice.objects.filter(
                general_po_supplier__general_po__po_club=po_club, supplier_material__customer_brand_material=material).values_list('general_po_supplier__supplierpo', flat=True)
            ).order_by('id')
            for supplier_po in supplier_pos:
                delivery_quantities = SupplierDeliveryDateQuantity.objects.filter(
                    material_supplier__supplier_material__customer_brand_material=material,
                    supplier_delivery_date__in=supplier_po.supplier_po_delivery_dates
                )
                pi_total_quantity = calculate_queryset_total_normalized_quantity(delivery_quantities, material_unit, 'proforma_invoice_quantity', 'proforma_invoice_quantity_units')
                supplier_data = {
                    'id': supplier_po.id,
                    'display_number': supplier_po.supplier_po_number,
                    'pi_quantity': get_quantity_dictionary(pi_total_quantity, material_unit),
                    'deliveries': []
                }
                deliveries = supplier_po.supplier_po_delivery_dates
                for delivery in deliveries:

                    delivery_data = {
                        'id': delivery.id,
                        'display_number': delivery.display_number,
                        'confirmed_delivery_date': delivery.confirmed_delivery_date,
                        'actual_delivery_date': delivery.actual_delivery_date.delivery_date if delivery.actual_delivery_date else None,
                        'grns': []
                    }
                    grns = delivery.get_delivery_date_grns()
                    for grn in grns:
                        grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn=grn, grn_material__customer_brand_material=material)
                        usable_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_unit, 'usable_quantity', 'usable_quantity_units')
                        grn_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_unit, 'total_actual_quantity', 'total_actual_quantity_units')
                        replacements = delivery.replacementquantitydeliverydate_set.filter(supplier_po_grn_material__grn_material__customer_brand_material=material)
                        replacement_quantity = calculate_queryset_total_normalized_quantity(replacements, material_unit, 'total_qa_rejected_quantity', 'total_qa_rejected_quantity_units')
                        grn_data = {
                            'id': grn.id,
                            'display_number': grn.grn_number,
                            'usable_quantity': get_quantity_dictionary(usable_quantity, material.material_normalized_measuring_unit),
                            'replacement_quantity': get_quantity_dictionary(replacement_quantity, material.material_normalized_measuring_unit),
                            'grn_quantity': get_quantity_dictionary(grn_quantity, material.material_normalized_measuring_unit)
                        }
                        delivery_data['grns'].append(grn_data)
                    supplier_data['deliveries'].append(delivery_data)
                material_data['supplier_pos'].append(supplier_data)
            if material_type == FABRIC_TRIM_TYPES:
                data[FABRIC_TRIM_TYPES].append(material_data)
            elif material_type == SEWING_TRIM_TYPES:
                data[SEWING_TRIM_TYPES].append(material_data)
            elif material_type == PACKAGING_TYPES:
                data[PACKAGING_TYPES].append(material_data)
        return Response(data)
    

class WarehouseActionsGRNDashBoardDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOGRNBasicSerializer
    pagination_class = GeneralLargeResultsSetPagination

    DRAFT_STATE = 'draft'
    QUANTITY_VERIFICATION = 'quantity_verification'
    QA_VERIFICATION = 'quality_verification'
    GRN_VERIFICATION = 'grn_verification'
    GRN_COMPLETE = 'grn_complete'
    GRN_CANCEL = 'grn_cancel'

    def filtering_spo_details(self, request, spo_grns):

        grn = request.query_params.get('id', None)
        order_details = request.query_params.get('order_details_ritz_code', None)
        supplier_name = request.query_params.get('supplier_name', None)
        supplier_po = request.query_params.get('supplier_po_number', None)
        customer_name = request.query_params.get('customer_name', None)
        global_filter = request.query_params.get('global_filter', None)

        if grn:
            spo_grns = [spo_grn for spo_grn in spo_grns if grn.lower() in spo_grn.grn_number.lower()]
        if order_details:
            spo_grns = [spo_grn for spo_grn in spo_grns if order_details.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.ritz_code.lower()]
        if supplier_name:
            spo_grns = [spo_grn for spo_grn in spo_grns if supplier_name.lower() in spo_grn.supplier_po.general_po_supplier.supplier.name.lower()]
        if supplier_po:
            spo_grns = [spo_grn for spo_grn in spo_grns if supplier_po.lower() in spo_grn.supplier_po.display_number.lower()]
        if customer_name:
            spo_grns = [spo_grn for spo_grn in spo_grns if customer_name.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.customer.name.lower()]
        if global_filter:
            spo_grns = [spo_grn for spo_grn in spo_grns
                        if global_filter.lower() in spo_grn.grn_number.lower()
                        or global_filter.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.ritz_code.lower()
                        or global_filter.lower() in spo_grn.supplier_po.general_po_supplier.supplier.name.lower()
                        or global_filter.lower() in spo_grn.supplier_po.display_number.lower()
                        or global_filter.lower() in spo_grn.supplier_po.general_po_supplier.general_po.costing.order.customer.name.lower()]
        return spo_grns

    def post(self, request):
        user = request.user
        user_plant_ids = list(user.plants.values_list('id', flat=True))
        type = request.query_params.get('filter_type')
        plant_ids = request.data.get('plant_ids', [])

        grns = SupplierPOGRN.objects.filter(supplier_po__plant__id__in=user_plant_ids)
        if plant_ids:
            grns = grns.filter(supplier_po__plant__id__in=plant_ids)
        if type == self.DRAFT_STATE:
            grns = grns.filter(state=SupplierPOGRN.DRAFT_STATE)
        elif type == self.QUANTITY_VERIFICATION:
            grns = grns.filter(state=SupplierPOGRN.QUANTITY_VERIFICATION_STATE)
        elif type == self.QA_VERIFICATION:
            grns = grns.filter(state=SupplierPOGRN.QA_VERIFICATION_STATE)
        elif type == self.GRN_VERIFICATION:
            grns = grns.filter(state=SupplierPOGRN.GRN_VERIFICATION)
        elif type == self.GRN_COMPLETE:
            grns = grns.filter(state=SupplierPOGRN.GRN_COMPLETE)
        elif type == self.GRN_CANCEL:
            grns = grns.filter(state=SupplierPOGRN.GRN_CANCEL)

        grns = self.filtering_spo_details(request, grns)
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(grns, request, view=self)
        if paginated_data:
            serializer = self.serializer_class(paginated_data, many=True)
            return paginator.get_paginated_response(serializer.data, meta_data=None)
        else:
            serializer = self.serializer_class(grns, many=True)
            return Response(serializer.data)

class WarehouseActionsGRNDashBoardCountView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request):

        user = request.user
        user_plant_ids = list(user.plants.values_list('id', flat=True))
        user_plants = Plant.objects.filter(id__in=user_plant_ids)
        user_plant_list = PlantSerializer(user_plants, many=True).data
        
        plant_ids = request.data.get('plant_ids', [])

        grns = SupplierPOGRN.objects.filter(supplier_po__plant__id__in=user_plant_ids)
        if plant_ids:
            grns = grns.filter(supplier_po__plant__id__in=plant_ids)
        draft_grn_count = grns.filter(state=SupplierPOGRN.DRAFT_STATE).count()
        quantity_verification_grn_count = grns.filter(state=SupplierPOGRN.QUANTITY_VERIFICATION_STATE).count()
        qa_verification_grn_count = grns.filter(state=SupplierPOGRN.QA_VERIFICATION_STATE).count()
        verification_grn_count = grns.filter(state=SupplierPOGRN.GRN_VERIFICATION).count()
        complete_grn_count = grns.filter(state=SupplierPOGRN.GRN_COMPLETE).count()
        cancel_grn_count = grns.filter(state=SupplierPOGRN.GRN_CANCEL).count()

        response = {
            'user_plants': user_plant_list,
            'draft': draft_grn_count,
            'quantity_verification': quantity_verification_grn_count,
            'quality_verification': qa_verification_grn_count,
            'grn_verification': verification_grn_count,
            'grn_complete': complete_grn_count,
            'grn_cancel': cancel_grn_count    
        }
        return Response(response)
    

class SupplierPOMetaDataSearchableList(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOMetaDataSearchableListSerializer
    
    def get(self, request, *args, **kwargs):

        supplier_pos = SupplierPO.objects.all().order_by('-id')
        supplier_po_id = self.request.query_params.get('supplier_po_id', None)
        search_text = self.request.query_params.get('search_text', None) 

        if supplier_po_id:
            supplier_pos = supplier_pos.filter(id=supplier_po_id)
        if search_text:
            supplier_pos = [supplier_po for supplier_po in supplier_pos if search_text.lower() in supplier_po.display_number.lower()]

        serializer = self.serializer_class(supplier_pos, many=True)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(serializer.data, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        return Response(serializer.data)