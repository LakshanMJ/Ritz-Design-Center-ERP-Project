from typing import Any
from rest_framework.generics import get_object_or_404, ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response

from marketing.helpers.po_assign_material_helper import POPackItemPlacementAssignMaterial, \
    FabricPOPackItemPlacementAssignMaterial, GenericMaterialPOPackItemPlacementAssignMaterial, \
    POPackPlacementAssignMaterial
from marketing.mixins.material_mixins import POPackItemPlacementInfoMixin, POPackPlacementInfoMixin, \
    POColorwayCountryItemPlacementHelper, POColorwayCountryPlacementHelper, CADPOColorwayCountryItemPlacementHelper
from marketing.mixins.order_mixins import OrderMixin
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin
from materials.forms.form_factory import UserDefinedMaterialFormFactory
from materials.models import Material, UserDefinedMaterial, CustomerBrandMaterial, SupplierInquiry, SupplierInquiryMaterialCode
from materials.scripts.supplier_po_bom_generator import NewGenerateSupplierPOs
from shared.constants.customer_processors import NEXT_PO_PROCESSOR, SANMAR_PO_PROCESSOR, MANDS_PO_PROCESSOR, LIDL_PO_PROCESSOR, GENERAL_PO_PROCESSOR
from shared.models import FileAttachment, Customer, CustomerBrand, Supplier, User, InHouseMaterial, Plant
from shared.permissions.roles import BUSINESS_ADMIN_ROLE, MERCHANT_ROLE, CAD_USER_ROLE, ADMIN_ROLE
from shared.helpers.field_validators import valid_float_field
from rest_framework import generics, status
from shared.permissions.view_permissions import HasPermission
from django.db.models import Q

from marketing.models import OrderInquiry, OrderColorway, OrderCountry, OrderSize, OrderCostingVersion, PurchaseOrder, \
    POColorway, POCountry, POSize, POPack, OrderPack, POPackItem, POPackItemPlacement, POPackPlacement, \
    PurchaseOrderBom, POItem, POCountryColorwayItemPlacement, POCountryColorwayPlacement, POColorwayItem, \
    ColorwayItemFabricConsumption, OriginalPOClub, ActualPOClub, UploadedPurchaseOrder, ActualClubBom, PurchaseOrderClubBomSupplier, SupplierBOMFile, SupplierPO, \
    PurchaseOrderAllocatedMaterial, SupplierDeliveryDate, PurchaseOrderPackaging, PurchaseOrderPackagingInstruction, PurchaseOrderPackagingInstructionOrderPack, \
    PackPackaging, PurchaseOrderDelivery, PurchaseOrderDeliveryPack
from marketing.serializers import OrderColorwaySerializer, OrderCountrySerializer, OrderSizeSerializer, \
    POColorwaySerializer, POCountrySerializer, POSizeSerializer, POInformationListSerializer, POPack, \
    PurchaseOrderSerializer, POPackSerializer, OrderVersionSerializer, BomSerializer, POPackItemSerializer, \
    POCountryColorwayItemPlacementSerializer, POCountryColorwayPlacementSerializer, OrderInquirySerializer, \
    ColorwayItemFabricConsumptionSerializer, UploadedPurchaseOrderSerializer, ActualPOClubSerializer, \
    SupplierBOMFileSerializer, PurchaseOrderPOClubBomSetSerailzier, InHouseMaterialSerializer, POAllocatedMaterialDetailSerializer, PurchaseOrderBomBasicSerializer, \
    PurchaseOrderPackagingInstructionOrderPackSerializer, PurchaseOrderPackagingSerializer, PurchaseOrderShadeSummarySerializer, PurchaseOrderDeliverySerializer, \
    PurchaseOrderDeliveryListSerializer

from supplier_po.supplier_po.serializers import SupplierDeliveryDateQuantitySerializer
from supplier_po.general_po.serializers import GeneralPOSupplierMaterialPriceSerializer, GeneralPOMaterialQuantityDetailSerializer
from django.db import transaction
from shared.utils import clean_search_dictionary, get_object_or_none, clean_search_dictionary, search_qs_from_global_filter, convert_search_text_to_numeric_search, search_qs_from_global_filter_v2
from shared.serializers import SupplierSerializer
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from materials.serializers.material_serializers import InHouseMaterialListDataSerializer, InHouseMaterialChartSummaryByPOSerializer, CustomerBrandMaterialBasicSerializer
from supplier_po.models import GeneralPOMaterialQuantity, SupplierDeliveryDateQuantityPOAllocation, SupplierDeliveryDateQuantity, GeneralPOSupplierMaterialPrice
from materials.models import PACKAGING_TYPES
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination

class PurchaseOrderListCreateView(generics.ListCreateAPIView):
    queryset = PurchaseOrder.objects.all().order_by('id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderSerializer

    def get_queryset(self):
        version_id = self.kwargs.get('version_id')
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        qs = PurchaseOrder.objects.filter(costing_version=version)
        return qs

    def create(self, request, *args, **kwargs):
        order_id = self.kwargs.get('order_id')
        version_id = self.kwargs.get('version_id')
        order_costing_version = get_object_or_404(OrderCostingVersion, order_id=order_id, pk=version_id)
        order_costing_version.is_purchase_order = True
        order_costing_version.save()
        request.data['costing_version'] = order_costing_version.id

        return super().create(request, *args, **kwargs)


class PurchaseOrderCaptureData(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        attachment_id = request.data['attachment_id']
        customer = get_object_or_404(Customer, pk = kwargs['customer_id'])
        attachment = get_object_or_404(FileAttachment, pk=attachment_id)
        template = customer.po_processor_name

        media_url = attachment.file_path

        if(template == SANMAR_PO_PROCESSOR):
            from marketing.utils.po_utils.sanmar_po_processor import SanmarPOProcessor
            response = SanmarPOProcessor(media_url, customer.id, attachment.id).process_and_create_purchase_orders()
            http_response = Response(response)
            if not response.get('created'):
                http_response.status_code = status.HTTP_400_BAD_REQUEST
            return http_response

        elif(template == NEXT_PO_PROCESSOR):
            from marketing.utils.po_utils.next_po_processor import NextPOProcessor
            response = NextPOProcessor(media_url, customer.id, attachment.id).process_and_create_purchase_orders()
            http_response = Response(response)
            if not response.get('created'):
                http_response.status_code = status.HTTP_400_BAD_REQUEST
            return http_response

        elif(template == MANDS_PO_PROCESSOR):
            from marketing.utils.po_utils.mands_po_processor import MandSPOProcessor
            response = MandSPOProcessor(media_url, customer.id, attachment.id).process_and_create_purchase_orders()
            http_response = Response(response)
            if not response.get('created'):
                http_response.status_code = status.HTTP_400_BAD_REQUEST
            return http_response
        
        elif(template == LIDL_PO_PROCESSOR):
            from marketing.utils.po_utils.lidl_po_processor import LIDLPOProcessor
            response = LIDLPOProcessor(media_url, customer.id, attachment.id).process_and_create_purchase_orders()
            http_response = Response(response)
            if not response.get('created'):
                http_response.status_code = status.HTTP_400_BAD_REQUEST
            return http_response
        
        elif(template == GENERAL_PO_PROCESSOR):
            from marketing.utils.po_utils.general_po_processor import GeneralPOProcessor
            response = GeneralPOProcessor(media_url, customer.id, attachment.id).process_and_create_purchase_orders()
            http_response = Response(response)
            if not response.get('created'):
                http_response.status_code = status.HTTP_400_BAD_REQUEST
            return http_response
        
        else:
            return Response(data={'errors': ['Customer does not have a processor template defined. Please contact the dev team.']}, status=status.HTTP_400_BAD_REQUEST)


class PurchaseOrderFileListCreateView(generics.ListCreateAPIView):
    queryset = PurchaseOrder.objects.all().order_by('id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        order_id = self.kwargs.get('order_id')
        version_id = self.kwargs.get('version_id')
        order_costing_version = get_object_or_404(OrderCostingVersion, order_id=order_id, pk=version_id)
        order_costing_version.is_purchase_order = True
        order_costing_version.save()
        return super().create(request, *args, **kwargs)


class PurchaseOrderList(generics.ListAPIView):
    queryset = PurchaseOrder.objects.all().order_by('-id')
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderSerializer
    pagination_class = GeneralLargeResultsSetPagination
    
    filter_field_list = [
        {'field_name': 'id', 'field_type': 'id', 'front_end_field_name': 'id'},
        {'field_name': 'costing_version_id', 'field_type': 'id', 'front_end_field_name': 'costing_version_id'},
        {'field_name': 'actual_po_club_id', 'field_type': 'id', 'front_end_field_name': 'actual_po_club_id'},
        {'field_name': 'customer__name', 'field_type': 'text', 'front_end_field_name': 'customer_name'},
        {'field_name': 'costing_version__order__brand__name', 'field_type': 'text', 'front_end_field_name': 'brand_name'},
        {'field_name': 'state', 'field_type': 'choice', 'front_end_field_name': 'state_display_value'},
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = search_qs_from_global_filter_v2(qs, self.filter_field_list, self.request, PurchaseOrder)
        return qs
    

class PurchaseOrderFileRetriveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = PurchaseOrder.objects.all().order_by('id')
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderSerializer


class PurchaseOrderPackDetailView(generics.ListAPIView):
    serializer_class = POPackSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        purchase_order_id = self.kwargs['purchase_order_id']
        return POPack.objects.filter(po_colorway__purchase_order_id=purchase_order_id).order_by('id')


class PurchaseOrderListView(generics.ListAPIView):
    serializer_class = PurchaseOrderSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        order_id = self.kwargs['order_id']
        version_id = self.kwargs['version_id']
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order_id=order_id)
        return PurchaseOrder.objects.filter(costing_version=version).order_by('id')
    

class POClubPurchaseOrderListView(generics.ListAPIView):
    serializer_class = PurchaseOrderSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        actual_po_club_id = self.kwargs['po_club_id']
        actual_po_club = get_object_or_404(ActualPOClub, pk=actual_po_club_id)
        return PurchaseOrder.objects.filter(actual_po_club=actual_po_club).order_by('id')


class POColorwayCountrySizeCreateEditView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrder

    def get_order(self):
        order_id = self.kwargs['order_id']
        order = get_object_or_404(OrderInquiry, pk=order_id)
        return order

    def get_version(self):
        order = self.get_order()
        version_id = self.kwargs.get('version_id', None)
        version = get_object_or_404(OrderCostingVersion, order=order, pk=version_id)
        return version

    def post(self, request, *args, **kwargs):
        po_id = self.kwargs['po_id']
        order_country_ids = request.data.get("order_country_ids")
        order_size_ids = request.data.get("order_size_ids")

        version = self.get_version()
        order = self.get_order()

        order_colorways = version.order.get_order_colorways()
        order_countries = version.order.get_order_countries()
        order_sizes = version.order.get_order_sizes()

        filtered_country_ids = [country_id for country_id in order_countries if country_id in order_country_ids]
        filtered_size_ids = [size_id for size_id in order_sizes if size_id in order_size_ids]

        for order_colorway in order_colorways:
            for filtered_country_id in filtered_country_ids:
                for filtered_size_id in filtered_size_ids:
                    POColorway.objects.create(purchase_order_id=po_id, order_colorway=order_colorway, colorway=order_colorway.colorway)
                    POCountry.objects.create(purchase_order_id=po_id, order_country_id=filtered_country_id)
                    POSize.objects.create(purchase_order_id=po_id, order_size_id=filtered_size_id)

        order_colorway_ids = order_colorways.values_list('id', flat=True)

        POColorway.objects.filter(purchase_order_id=po_id).exclude(order_colorway_id__in=order_colorway_ids).delete()
        POCountry.objects.filter(purchase_order_id=po_id).exclude(order_country_id__in=filtered_country_ids).delete()
        POSize.objects.filter(purchase_order_id=po_id).exclude(order_size_id__in=filtered_size_ids).delete()

        return Response({"status":"Completed"})


class POColorwayOrderColorwayListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
        order = None
        if purchase_order.costing_version:
            order = purchase_order.costing_version.order
        data = {
            'order_colorways': OrderColorwaySerializer(OrderColorway.objects.filter(order=order), many=True).data,
            'po_colorways': POColorwaySerializer(POColorway.objects.filter(purchase_order = purchase_order), many=True).data
            }
        return Response(data=data)


class POColorwayOrderColorwayMatchingListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        error_validation = request.query_params['error_validation'].lower()
        return_status = status.HTTP_200_OK
        error = False
        purchase_order = None
        all_po_colorways_matched = True
        with transaction.atomic():
            for data_set in request.data:
                po_colorway_id = data_set['po_colorway_id']
                order_colorway_id = data_set['order_colorway_id']
                if order_colorway_id == None:
                    continue
                po_colorway = get_object_or_none(POColorway, {'pk': po_colorway_id})
                order_colorway = get_object_or_none(OrderColorway, {'pk': order_colorway_id})
                if po_colorway == None or order_colorway == None:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    continue
                if purchase_order == None:
                    purchase_order = po_colorway.purchase_order
                elif not purchase_order == po_colorway.purchase_order:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                if po_colorway.purchase_order.costing_version.order == order_colorway.order:
                    po_colorway.order_colorway = order_colorway
                    po_colorway.save()
                else:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
            if (not purchase_order == None) and error_validation == 'true':
                if len(POColorway.objects.filter(purchase_order = purchase_order, order_colorway = None)) > 0:
                    all_po_colorways_matched = False
                    error = True
            if error:
                transaction.set_rollback(True)
                data = {
                    'status': 'Invalid Data'
                }
                if not all_po_colorways_matched:
                    data = {
                        'error': 'Please Match All PO Colorways'
                    }
            else:
                data = {
                    'status': 'Successfully Updated'
                }
        return Response(data=data, status=return_status)
    

class POCountryOrderCountryListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
        order = purchase_order.costing_version.order
        data = {
            'order_countries': OrderCountrySerializer(OrderCountry.objects.filter(order=order), many=True).data,
            'po_countries': POCountrySerializer(POCountry.objects.filter(purchase_order = purchase_order,
                                                                           purchase_order__costing_version__order = order), many=True).data
            }
        return Response(data=data)
    

class POCountryOrderCountryMatchingListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        error_validation = request.query_params['error_validation'].lower()
        return_status = status.HTTP_200_OK
        error = False
        purchase_order = None
        all_po_countries_matched = True
        error_details = {}
        order_country_ids = []
        with transaction.atomic():
            for data_set in request.data:
                po_country_id = data_set['po_country_id']
                order_country_id = data_set['order_country_id']
                if order_country_id == None:
                    continue
                po_country = get_object_or_none(POCountry, {'pk': po_country_id})
                order_country = get_object_or_none(OrderCountry, {'pk': order_country_id})
                if po_country == None or order_country == None:
                    if po_country == None:
                        error_details['PO Country'] = "PO country not found"
                    if order_country == None:
                        error_details['Order Country'] = "Order country not found"
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    continue
                if purchase_order == None:
                    purchase_order = po_country.purchase_order
                if purchase_order == po_country.purchase_order:
                    if not order_country.id in order_country_ids:
                        order_country_ids.append(order_country.id)
                        if po_country.purchase_order.costing_version.order == order_country.order:
                            po_country.order_country = order_country
                            po_country.save()
                        else:
                            error = True
                            return_status = status.HTTP_400_BAD_REQUEST
                            error_details[po_country.po_country_name] = "Order inquiry mismatch"
                    else:
                        error = True
                        return_status = status.HTTP_400_BAD_REQUEST
                        error_details[order_country.country.name] = order_country.country.name + " duplicated. Two purchase order countries can't be mapped to the same Order Country"
                else:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    error_details[po_country.po_country_name] = "Order inquiry mismatch"
            if (not purchase_order == None) and error_validation == 'true':
                if len(POCountry.objects.filter(purchase_order = purchase_order, order_country = None)) > 0:
                    all_po_countries_matched = False
                    error = True
            if error:
                transaction.set_rollback(True)
                if not error_details == []:
                    data = {
                        'status': error_details
                    }
                else:
                    if all_po_countries_matched == False:
                        data = {
                            'error': 'Please Match All PO Countries'
                        }
            else:
                data = {
                    'status': 'Successfully Updated'
                }
        return Response(data=data, status=return_status)
    

class POSizeOrderSizeListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
        order = purchase_order.costing_version.order
        data = {
            'order_sizes': OrderSizeSerializer(OrderSize.objects.filter(order=order), many=True).data,
            'po_sizes': POSizeSerializer(POSize.objects.filter(purchase_order = purchase_order), many=True).data
            }
        return Response(data=data)
    

class POSizeOrderSizeMatchingListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        error_validation = request.query_params['error_validation'].lower()
        return_status = status.HTTP_200_OK
        error = False
        purchase_order = None
        all_po_sizes_matched = True
        error_details = {}
        order_size_ids = []
        with transaction.atomic():
            for data_set in request.data:
                po_size_id = data_set['po_size_id']
                order_size_id = data_set['order_size_id']
                if order_size_id == None:
                    continue
                po_size = get_object_or_none(POSize, {'pk': po_size_id})
                order_size = get_object_or_none(OrderSize, {'pk': order_size_id})
                if po_size == None or order_size == None:
                    if po_size == None:
                        error_details['PO Size'] = "PO size not found"
                    if order_size == None:
                        error_details['Order Size'] = "Order size not found"
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    continue
                if purchase_order == None:
                    purchase_order = po_size.purchase_order
                if purchase_order == po_size.purchase_order:
                    if not order_size.id in order_size_ids:
                        order_size_ids.append(order_size.id)
                        if po_size.purchase_order.costing_version.order == order_size.order:
                            po_size.order_size = order_size
                            po_size.save()
                        else:
                            error = True
                            return_status = status.HTTP_400_BAD_REQUEST
                            error_details[po_size.po_size_name]= "Order inquiry mismatch"
                    else:
                        error = True
                        return_status = status.HTTP_400_BAD_REQUEST
                        error_details[order_size.size.name]= order_size.size.name + " duplicated. Two purchase order sizes can't be mapped to the same Order Size"
                else:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    error_details[po_size.po_size_name] = "Order inquiry mismatch"
            if (not purchase_order == None) and error_validation == 'true':
                if len(POSize.objects.filter(purchase_order = purchase_order, order_size = None)) > 0:
                    all_po_sizes_matched = False
                    error = True
            if error:
                transaction.set_rollback(True)
                if not error_details == []:
                    data = {
                        'status': error_details
                    }
                else:
                    if not all_po_sizes_matched:
                        data = {
                            'error': 'Please Match All PO Sizes'
                        }
            else:
                data = {
                    'status': 'Successfully Updated'
                }
        return Response(data=data, status=return_status)


class POInformationCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        error = False
        error_details = {}
        return_status = status.HTTP_200_OK
        order_costing_version_id = kwargs['order_costing_version_id']
        order_id = kwargs['order_id']
        data_array = request.data['purchase_order']['data_array']
        if data_array == []:
            error = True
            return_status = status.HTTP_400_BAD_REQUEST
        if 'deleted_po_pack_ids' in request.data['purchase_order']:
            POPack.objects.filter(pk__in = request.data['purchase_order']['deleted_po_pack_ids']).delete()
        if 'deleted_po_colorway_ids' in request.data['purchase_order']:
            POColorway.objects.filter(pk__in = request.data['purchase_order']['deleted_po_colorway_ids']).delete()
        order_costing_version = get_object_or_404(OrderCostingVersion, pk = order_costing_version_id)
        order = get_object_or_404(OrderInquiry, pk = order_id)
        return_data = {}
        with transaction.atomic():
            if not order == order_costing_version.order:
                error = True
                return_status = status.HTTP_400_BAD_REQUEST
            else:
                purchase_order = PurchaseOrder.objects.create(costing_version = order_costing_version)
                return_data = PurchaseOrderSerializer(purchase_order).data
                po_colorway_ids = []
                empty_colorway_name = False
                for data in data_array:
                    po_colorway_id = data['po_colorway_id']
                    colorway_name = data['colorway_name']
                    if colorway_name == "":
                        error = True
                        return_status = status.HTTP_400_BAD_REQUEST
                        empty_colorway_name = True
                        continue
                    order_colorway = get_object_or_none(OrderColorway, {"pk": data['order_colorway_id']})
                    if order_colorway == None:
                        error = True
                        return_status = status.HTTP_400_BAD_REQUEST
                        error_details[colorway_name] = 'Order colorway not found'
                        continue
                    if po_colorway_id == None: # new PO Colorway
                        if len(POColorway.objects.filter(purchase_order = purchase_order, colorway = colorway_name)) == 0:
                            po_colorway = POColorway.objects.create(purchase_order = purchase_order, colorway = colorway_name, order_colorway = order_colorway)
                        else:
                            error = True
                            return_status = status.HTTP_400_BAD_REQUEST
                            error_details[colorway_name] = 'PO colorway not found'
                            continue
                    else:
                        po_colorway = get_object_or_none(POColorway, {'pk': po_colorway_id})
                        if po_colorway == None:
                            error = True
                            return_status = status.HTTP_400_BAD_REQUEST
                            error_details[colorway_name] = 'PO colorway cannot duplicate'
                            continue
                        po_colorway.colorway = colorway_name
                        po_colorway.order_colorway = order_colorway
                        po_colorway.save()
                    po_colorway_ids.append(po_colorway.id)
                    colorway_error = []
                    if not order == po_colorway.purchase_order.costing_version.order:
                        error = True
                        return_status = status.HTTP_400_BAD_REQUEST
                        error_details[colorway_name] = "Order inquiry mismatch"
                    else:
                        for country_size in data['country_size']:
                            order_country = get_object_or_none(OrderCountry, {'pk': country_size['order_country_id']})
                            order_size = get_object_or_none(OrderSize, {'pk': country_size['order_size_id']})
                            if order_country == None or order_size == None:
                                error = True
                                return_status = status.HTTP_400_BAD_REQUEST
                                if order_country == None:
                                    temp_error = "Order country not found"
                                    if not temp_error in colorway_error:
                                        colorway_error.append(temp_error)
                                if order_size == None:
                                    temp_error = "order size not found"
                                    if not temp_error in colorway_error:
                                        colorway_error.append(temp_error)
                                continue

                            if (not order == order_country.order) or (not order == order_size.order) or (not order == order_colorway.order):
                                error = True
                                return_status = status.HTTP_400_BAD_REQUEST
                                colorway_error.append(order_country.country.name + " - " + order_size.size.name + " Order inquiry mismatch")
                            else:
                                po_country = POCountry.objects.get_or_create(purchase_order = purchase_order, order_country = order_country)
                                po_size = POSize.objects.get_or_create(purchase_order = purchase_order, order_size = order_size)
                                quantity = country_size['quantity']
                                if isinstance(quantity, int):
                                    POPack.objects.create(po_colorway = po_colorway, po_size = po_size[0], po_country = po_country[0], quantity = quantity, purchase_order = purchase_order)
                                else:
                                    colorway_error.append(order_country.country.name + " - " + order_size.size.name + " Inavlid quantity, Please enter a number")
                                    error = True
                                    return_status = status.HTTP_400_BAD_REQUEST
                        if not colorway_error == []:
                            error_details[colorway_name] = colorway_error
            if error == True:
                transaction.set_rollback(True)
                if empty_colorway_name:
                    data = {
                        'status': 'Colorway name cannot be duplicated'
                    }
                else:
                    if not error_details == {}:
                        data = {
                            'status': error_details
                        }
                    elif data_array == []:
                        data = {
                            'status': 'detail not found'
                        }
                    else:
                        data = {
                            'status': 'Invalid Order Inquiry'
                        }
            else:
                po_colorways = POColorway.objects.filter(pk__in = po_colorway_ids)
                return_data['data_array'] = POInformationListSerializer(po_colorways, many=True).data
                return_data['deleted_po_pack_ids'] = []
                return_data['deleted_po_colorway_ids'] = []
                data = {'purchase_order': return_data}
        return Response(data=data, status=return_status)


class POInformationUpdateView(generics.UpdateAPIView, OrderMixin):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def put(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
        return_data = PurchaseOrderSerializer(purchase_order).data
        order = purchase_order.costing_version.order
        error = False
        error_details = {}
        return_status = status.HTTP_200_OK
        data_array = request.data['purchase_order']['data_array']
        if data_array == []:
            error = True
            return_status = status.HTTP_400_BAD_REQUEST
        if 'deleted_po_pack_ids' in request.data['purchase_order']:
            POPack.objects.filter(pk__in = request.data['purchase_order']['deleted_po_pack_ids']).delete()
        if 'deleted_po_colorway_ids' in request.data['purchase_order']:
            POColorway.objects.filter(pk__in = request.data['purchase_order']['deleted_po_colorway_ids']).delete()
        po_pack_ids=[]
        po_country_ids = []
        po_size_ids = []
        with transaction.atomic():
            po_colorway_ids = []
            empty_colorway_name = False
            for data in data_array:
                colorway_name = data['colorway_name']
                if colorway_name == "":
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    empty_colorway_name = True
                    continue
                po_colorway_id = data['po_colorway_id']
                if not po_colorway_id == None:
                    po_colorway = get_object_or_none(POColorway, {'pk':po_colorway_id})
                else:
                    po_colorway = POColorway.objects.get_or_create(purchase_order = purchase_order, colorway = colorway_name)[0]
                order_colorway = get_object_or_none(OrderColorway, {'pk': data['order_colorway_id']})

                if po_colorway == None or order_colorway == None:
                    if order_colorway == None:
                        error_details[colorway_name] = "Order colorway not found"
                    if po_colorway == None:
                        error_details[colorway_name] = "PO colorway not found"
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    continue

                po_colorway_ids.append(po_colorway.id)
                if (order == po_colorway.purchase_order.costing_version.order) and (order == order_colorway.order):
                    po_colorway.colorway = colorway_name
                    po_colorway.order_colorway = order_colorway
                    po_colorway.save()
                    colorway_error = []
                    for country_size in data['country_size']:
                        order_country = get_object_or_none(OrderCountry, {'pk': country_size['order_country_id']})
                        order_size = get_object_or_none(OrderSize, {'pk': country_size['order_size_id']})
                        if order_country == None or order_size == None:
                            if order_country == None:
                                temp_error = "Order country not found"
                                if not temp_error in colorway_error:
                                    colorway_error.append(temp_error)
                                temp_error = "Order size not found"
                                if not temp_error in colorway_error:
                                    colorway_error.append(temp_error)
                            error = True
                            return_status = status.HTTP_400_BAD_REQUEST
                            continue
                        if (order == order_country.order) and (order == order_size.order):
                            quantity = country_size['quantity']
                            if isinstance(quantity, int):
                                po_country = POCountry.objects.get_or_create(purchase_order = purchase_order, order_country = order_country)[0]
                                po_country_ids.append(po_country.id)

                                po_size = POSize.objects.get_or_create(purchase_order = purchase_order, order_size = order_size)[0]
                                po_size_ids.append(po_size.id)

                                po_pack = POPack.objects.get_or_create(po_colorway = po_colorway, po_size = po_size, po_country = po_country, purchase_order = purchase_order)[0]
                                po_pack.quantity = quantity
                                po_pack.save()
                                po_pack_ids.append(po_pack.id)
                            else:
                                error = True
                                return_status = status.HTTP_400_BAD_REQUEST
                                colorway_error.append(order_country.country.name + " - " + order_size.size.name + " Inavlid quantity, Please enter a number")
                        else:
                            error = True
                            return_status = status.HTTP_400_BAD_REQUEST
                            colorway_error.append(order_country.country.name + " - " + order_size.size.name + " Order inquiry mismatch")
                    if not colorway_error == []:
                        error_details[colorway_name] = colorway_error
                else:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    error_details[colorway_name] = "Order inquiry mismatch"

            POPack.objects.filter(po_colorway__purchase_order = purchase_order).exclude(pk__in = po_pack_ids).delete()
            POCountry.objects.filter(purchase_order = purchase_order).exclude(pk__in = po_country_ids).delete()
            POSize.objects.filter(purchase_order = purchase_order).exclude(pk__in = po_size_ids).delete()

            if error:
                transaction.set_rollback(True)
                if empty_colorway_name:
                    data = {
                        'status': 'Colorway name cannot be empty'
                    }
                else:
                    if error_details == {}:
                        data = {
                            'status': 'detail not found'
                        }
                    else:
                        data = {
                            'status': error_details
                        }
            else:
                po_colorways = POColorway.objects.filter(pk__in = po_colorway_ids)
                return_data['data_array'] = POInformationListSerializer(po_colorways, many =True).data
                return_data['deleted_po_pack_ids'] = []
                return_data['deleted_po_colorway_ids'] = []
                data = {'purchase_order': return_data}

        return Response(data=data, status=return_status)
    

class POInformationListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    queryset = POColorway.objects.all()

    def get(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
        po_colorways = POColorway.objects.filter(purchase_order = purchase_order)
        data = PurchaseOrderSerializer(purchase_order).data
        data['data_array'] = POInformationListSerializer(po_colorways, many=True).data
        data['deleted_po_pack_ids'] = []
        data['deleted_po_colorway_ids'] = []
        return Response(data={'purchase_order': data})
    

class POPackUpdateListView(generics.GenericAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def put(self, request, *args, **kwargs):
        error = False
        error_details = []
        return_status = status.HTTP_200_OK
        order = None
        with transaction.atomic():
            for po_pack_data in request.data:
                po_pack = get_object_or_404(POPack, pk = po_pack_data['po_pack_id'])
                quantity = po_pack_data['quantity']
                if order == None:
                    order = po_pack.po_colorway.purchase_order.costing_version.order
                if order == po_pack.po_colorway.purchase_order.costing_version.order:
                    if isinstance(quantity, int):
                        po_pack.quantity = quantity
                        po_pack.save()
                    else:
                        error = True
                        return_status = status.HTTP_400_BAD_REQUEST
                        error_details.append({'id': po_pack.id,
                                            'error': 'Invalid quantity, Please enter a number'})
                else:
                    error = True
                    return_status = status.HTTP_400_BAD_REQUEST
                    error_details.append({'id': po_pack.id,
                                            'error': 'Order inquiry mismatch'})
            if error:
                transaction.set_rollback(True)
                data = {
                    'status': error_details
                }
            else:
                data = {
                    'status': 'Successfully Updated'
                }

            return Response(data=data, status=return_status)


class POStatusListView(generics.RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = PurchaseOrder.objects.all()

    def get(self, request, *args, **kwargs):

        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
        return_status = status.HTTP_200_OK
        ACTIVE = 'Active'
        INACTIVE = 'Inactive'

        data = []
        for po in PurchaseOrder.objects.filter(uploaded_purchase_order = purchase_order.uploaded_purchase_order):
            po_status = ACTIVE
            has_po_sizes = False
            has_po_countries = False
            has_po_colorways = False
            error = {}
            for po_attribute_model in [POSize, POColorway, POCountry]:
                po_attribute_model_filter = po_attribute_model.objects.filter(purchase_order = po)
                if len(po_attribute_model_filter) > 0:
                    if po_attribute_model == POSize:
                        has_po_sizes = True
                    if po_attribute_model == POCountry:
                        has_po_countries = True
                    if po_attribute_model == POColorway:
                        has_po_colorways = True
                for po_attribute in po_attribute_model_filter:
                    if po_attribute.is_valid() == False:
                        po_status = INACTIVE
                if po_attribute_model == POSize:
                    error['po_size'] = po_status
                if po_attribute_model == POCountry:
                    error['po_country'] = po_status
                if po_attribute_model == POColorway:
                    error['po_colorway'] = po_status
            if (has_po_sizes == False or has_po_colorways == False or has_po_countries == False) and po_status == ACTIVE:
                po_status = INACTIVE
            data.append({'id': po.id,
                         'name': po.name,
                         'display_number': po.display_number,
                         'status': po_status,
                         'error': error})
        return Response(data=data, status=status.HTTP_200_OK)


class POPackListView(ListAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get_queryset(self):
        po_id = self.kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        packs = POPack.objects.filter(purchase_order=purchase_order).order_by('id')
        return packs


class POColorwayCountrySizeDetailsView(generics.GenericAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = PurchaseOrder.objects.all()

    def get(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order'])
        watchlist = list(purchase_order.watchlist.values_list('id', flat=True))
        main_json = {
            'po_colorways': {'model': POColorway, 'serializer': POColorwaySerializer},
            'po_countries': {'model': POCountry, 'serializer': POCountrySerializer},
            'po_sizes': {'model': POSize, 'serializer': POSizeSerializer},
        }
        state = {
            'value':purchase_order.state,
            'display_value':purchase_order.get_state_display()
        }
        data = {attribute: main_json[attribute]['serializer'](main_json[attribute]['model'].objects.filter(purchase_order=purchase_order), many = True).data for attribute in main_json}
        data['state'] = purchase_order.state
        data['state_display'] = purchase_order.get_state_display()
        data['po_club_id'] = purchase_order.actual_po_club.id
        data['state'] = state
        data['customer_id'] = None
        data['customer_name'] = None
        data['po_name'] = purchase_order.name
        data['display_number'] = purchase_order.display_number
        data['short_code'] = purchase_order.short_code
        data['long_code'] = purchase_order.long_code
        data['production_cut_date'] = purchase_order.production_cut_date.date() if purchase_order.production_cut_date else None
        data['production_start_date'] = purchase_order.production_start_date.date() if purchase_order.production_start_date else None
        data['production_end_date'] = purchase_order.production_end_date.date() if purchase_order.production_end_date else None
        data['ex_factory_date'] = purchase_order.ex_factory_date.date() if purchase_order.ex_factory_date else None
        data['watchlist'] = watchlist
        if purchase_order.customer:
            data['customer_id'] = purchase_order.customer.id
            data['customer_name'] = purchase_order.customer.name
        file = None
        # if not purchase_order.purchase_order_excel == None:
        #     file = purchase_order.purchase_order_excel
        # elif not purchase_order.purchase_order_pdf == None:
        #     file = purchase_order.purchase_order_pdf
        if not purchase_order.uploaded_purchase_order == None:
            file = purchase_order.uploaded_purchase_order.attachment

        if not file == None:
            data['file_id'] = file.id
            data['file_display_name'] = file.display_name
            data['file_path'] = file.file_path
            data['file_type'] = file.type
            data['uploaded_purchase_order_id'] = purchase_order.uploaded_purchase_order.id
        costing_version = purchase_order.costing_version
        if costing_version == None:
            data['version_id'] = None
        else:
            data['version_id'] = costing_version.id
            data['version_name'] = costing_version.name
            data['order_inquiry'] = {
                'display_number': costing_version.display_number,
                'short_code': costing_version.short_code,
                'long_code': costing_version.long_code,
                'id': costing_version.id
            }
            data['order_id'] = costing_version.order.id
            if hasattr(purchase_order, 'purchaseorderpackaging'):
                data['po_packaging_id'] = purchase_order.purchaseorderpackaging.id
            else:
                data['po_packaging_id'] = None

            data['pre_costing'] = purchase_order.actual_po_club.pre_costing.id if purchase_order.actual_po_club.pre_costing else None
            data['pre_costing_display_number'] = purchase_order.actual_po_club.pre_costing.display_number if purchase_order.actual_po_club.pre_costing else None
            data['pre_costing_short_code'] = purchase_order.actual_po_club.pre_costing.short_code if purchase_order.actual_po_club.pre_costing else None
            data['pre_costing_long_code'] = purchase_order.actual_po_club.pre_costing.long_code if purchase_order.actual_po_club.pre_costing else None
            data['pre_costing_order'] = purchase_order.actual_po_club.pre_costing.order.id if purchase_order.actual_po_club.pre_costing else None
            data['pre_costing_state'] = purchase_order.actual_po_club.pre_costing.version_state if purchase_order.actual_po_club.pre_costing else None

            data['marketing_costing'] = purchase_order.actual_po_club.marketing_costing.id if purchase_order.actual_po_club.marketing_costing else None
            data['marketing_costing_display_number'] = purchase_order.actual_po_club.marketing_costing.display_number if purchase_order.actual_po_club.marketing_costing else None
            data['marketing_costing_short_code'] = purchase_order.actual_po_club.marketing_costing.short_code if purchase_order.actual_po_club.marketing_costing else None
            data['marketing_costing_long_code'] = purchase_order.actual_po_club.marketing_costing.long_code if purchase_order.actual_po_club.marketing_costing else None
            data['marketing_costing_order'] = purchase_order.actual_po_club.marketing_costing.order.id if purchase_order.actual_po_club.marketing_costing else None
            data['marketing_costing_state'] = purchase_order.actual_po_club.marketing_costing.version_state if purchase_order.actual_po_club.marketing_costing else None
            data['costing_type'] = purchase_order.costing_version.costing_type
            data['plant_id'] = purchase_order.plant.id if purchase_order.plant else None
            data['plant_name'] = purchase_order.plant.name if purchase_order.plant else None
        data['clubbing_complete'] = purchase_order.uploaded_purchase_order.clubbing_complete
        return Response(data=data)


class ChangePOState(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        state = request.data.get('new_state', None)
        watchlist = request.data.get('watchlist', [])
        plant_id = request.data.get('factories', None)
        if not isinstance(plant_id, int):
            plant_id = None
        plant = get_object_or_none(Plant, {'pk': plant_id})
        production_cut_date = request.data.get('production_cut_date', None)
        production_start_date = request.data.get('production_start_date', None)
        production_end_date = request.data.get('production_end_date', None)
        ex_factory_date = request.data.get('ex_factory_date', None)
        plant = get_object_or_none(Plant, {'pk': request.data.get('factories', None)})
        print(plant)
        response = purchase_order.move_to_next_state(state)
        purchase_order.production_cut_date = production_cut_date
        purchase_order.production_start_date = production_start_date
        purchase_order.production_end_date = production_end_date
        purchase_order.ex_factory_date = ex_factory_date
        purchase_order.plant = plant
        purchase_order.save()

        users = User.objects.filter(id__in=watchlist)
        purchase_order.watchlist.add(*users)
        removed_users = purchase_order.watchlist.exclude(id__in=watchlist).values_list('id', flat=True)
        purchase_order.watchlist.remove(*removed_users)

        http_response = Response(response)
        if not response.get('valid', None):
            http_response.status_code = status.HTTP_400_BAD_REQUEST
        else:
            http_response.status_code = status.HTTP_200_OK
        return http_response


class POMaterialNavigation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        packs = POPack.objects.filter(purchase_order=purchase_order).order_by('po_colorway__colorway',
                                                                              'po_country__po_country_name',
                                                                              'po_size__order_size__size__sorting_order')
        data = []
        for pack in packs:
            pack_details = {
                'po_pack_id': pack.pk,
                'po_colorway': '%s' % (pack.po_colorway.colorway),
                'po_colorway_id': '%s' % (pack.po_colorway_id),
                'po_size': '%s' % (pack.po_size.po_size_name),
                'po_size_id': '%s' % (pack.po_size_id),
                'po_country': '%s' % (pack.po_country.po_country_name),
                'po_country_id': '%s' % (pack.po_country_id),
                'po_pack_items': [],
            }
            pack_items = pack.popackitem_set.all().order_by('po_item__order_item__item_id')
            for pack_item in pack_items:
                item_type = pack_item.get_po_pack_item_colorway()
                pack_details['po_pack_items'].append({
                    'po_item_name': pack_item.po_item.order_item.item.name,
                    'po_pack_item_id': pack_item.pk,
                    'po_pack_item_colorway_category': item_type.colorway_category_color if item_type else 'N/A'
                })
            data.append(pack_details)
        return Response(data)


class POColorwayCountrySizeList(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_cws = purchase_order.get_po_colorways()
        po_countries = purchase_order.get_po_countries()
        po_sizes = purchase_order.get_po_sizes()
        po_items = purchase_order.get_po_items()
        data = {
            'po_colorways': [],
            'po_countries': [],
            'po_sizes': [],
            'po_items': [],
        }
        for po_cw in po_cws:
            data['po_colorways'].append({
                'po_colorway_name': po_cw.colorway,
                'po_colorway_id': po_cw.pk,
            })
        for po_country in po_countries:
            data['po_countries'].append({
                'po_country_name': po_country.po_country_name,
                'po_country_id': po_country.pk,
            })
        for po_size in po_sizes:
            data['po_sizes'].append({
                'po_size_name': po_size.po_size_name,
                'po_size_id': po_size.pk,
            })
        for po_item in po_items:
            data['po_items'].append({
                'po_item_name': po_item.order_item.item.name,
                'po_item_id': po_item.pk,
                'po_item_identifier': po_item.order_item.item_identifier,
            })
        return Response(data)


class POPackItemMaterialView(APIView, OrderMixin, POPackItemPlacementInfoMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, **kwargs):
        po_id = kwargs.get('purchase_order_id')
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)

        po_pack_item_id = kwargs.get('po_pack_item_id')
        po_pack_item = get_object_or_404(POPackItem, pk=po_pack_item_id, po_pack__purchase_order=purchase_order)
        order_placements = po_pack_item.get_po_pack_item_placements()
        response = self.get_api_response(order_placements)
        return response


class POPackMaterialView(APIView, OrderMixin, POPackPlacementInfoMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, **kwargs):
        po_id = kwargs.get('purchase_order_id')
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_pack_id = kwargs.get('po_pack_id')
        po_pack = get_object_or_404(POPack, pk=po_pack_id, purchase_order=purchase_order)
        order_placements = po_pack.get_po_pack_placements()
        response = self.get_api_response(order_placements)
        return response


class PurchaseOrderPackItemSaveMaterial(APIView, OrderMixin):
    # TODO - test this
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def post(self, request, *args, **kwargs):
        po_pack_item_id = self.kwargs.get('po_pack_item_id', None)
        po_pack_item = get_object_or_404(POPackItem, pk=po_pack_item_id)
        purchase_order = po_pack_item.po_pack.purchase_order
        post_data = request.data[0]
        placement_id = post_data.get('pk_po_pack_item_placement_id', None)
        placement = get_object_or_404(POPackItemPlacement, pk=placement_id, po_pack_item__po_pack__purchase_order=purchase_order)

        select_type = POPackItemPlacementAssignMaterial.CREATE_MATERIAL_TYPE
        if post_data.get('select_type') == POPackItemPlacementAssignMaterial.SELECT_MATERIAL_TYPE:
            select_type = POPackItemPlacementAssignMaterial.SELECT_MATERIAL_TYPE

        helper = GenericMaterialPOPackItemPlacementAssignMaterial
        # if placement.costing_pack_item_placement.placement_material_type == Material.FABRIC_MATERIAL:
        #     helper = FabricPOPackItemPlacementAssignMaterial

        save_helper = helper(po_pack_item_placement=placement, post_data=post_data, select_type=select_type)
        response = save_helper.process_and_get_http_response()
        return response


class PurchaseOrderColorwayCountryMaterial(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_po_materials_review_status(self, po_country_id, po_colorway_id, purchase_order):
        has_reviewed = False
        po_packs = POPack.objects.filter(po_country_id=po_country_id, po_colorway_id=po_colorway_id, purchase_order=purchase_order)
        exist_not_review_po_packs = po_packs.filter(po_materials_reviewed=False).exists()
        exist_not_review_po_pack_items = POPackItem.objects.filter(po_pack__in=po_packs, po_materials_reviewed=False).exists()
        if not exist_not_review_po_packs or not exist_not_review_po_pack_items:
            has_reviewed = True
        return has_reviewed

    def get(self, request, *args, **kwargs):
        po_colorway_id = kwargs.get('po_colorway_id', None)
        po_country_id = kwargs.get('po_country_id', None)
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_packs = POPack.objects.filter(purchase_order_id=purchase_order, po_colorway_id=po_colorway_id, po_country_id=po_country_id).order_by('po_size__order_size__size__sorting_order')
        pack_item_data = POColorwayCountryItemPlacementHelper(po_packs).get_material_data()
        pack_data = POColorwayCountryPlacementHelper(po_packs).get_material_data()
        po_items = purchase_order.get_po_items()
        po_materials_reviewed = self.get_po_materials_review_status(po_country_id, po_colorway_id, purchase_order)
        po_item_data = []
        po_size_data = []

        for po_item in po_items:
            po_item_data.append({
                'po_item_id': po_item.pk,
                'item_name': po_item.order_item.item.name,
            })

        for po_pack in po_packs:
            po_size_data.append(
                {  
                    'po_size_name': po_pack.po_size.order_size.size.name,
                    'po_size_abbreviation': po_pack.po_size.order_size.size.abbreviation,
                    'po_size_id': po_pack.po_size_id
                }
            )

        data = {
            'pack_data': pack_data,
            'pack_item_data': pack_item_data, # pack_data
            'po_items': po_item_data,
            'po_materials_reviewed': po_materials_reviewed,
            'po_sizes': po_size_data
        }
        return Response(data)


class SavePurchaseOrderColorwayCountryMaterial(ObjectStatePermissionMixin, APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    _po_pack_item_errors = []
    _po_pack_errors = []
    editable_states = [PurchaseOrder.MAPPINGS_COMPLETE, ]

    def get_object_current_state(self):
        purchase_order_id = self.kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(purchase_order_id)
        return purchase_order.state

    def update_consumption_ratio_and_wastage(self, row, placements):
        consumption = row.get('consumption_ratio', None)
        wastage = row.get('wastage', None)
        valid = True
        if consumption:
            if valid_float_field(consumption):
                placements.update(consumption_ratio=consumption)
            else:
                valid = False
        if wastage:
            if valid_float_field(wastage):
                placements.update(wastage=wastage)
            else:
                valid = False
        return valid

    def save_po_pack_item_consumption_data(self, request):
        pack_item_placement_data = request.data.get('po_pack_item_consumption_data', [])

        for row in pack_item_placement_data:
            edited_placements = row.get('po_pack_item_placement_ids', [])
            placements = POPackItemPlacement.objects.filter(pk__in=edited_placements)
            if placements.exists():
                valid = self.update_consumption_ratio_and_wastage(row, placements)
                if not valid:
                    self._po_pack_item_errors.append("Please enter valid numbers for consumption ratio and wastage %s" % (str(edited_placements)))
            else:
                if edited_placements:
                    self._po_pack_item_errors.append("Pack Item Placement doesn't exist %s" % (str(edited_placements)))

    def save_po_packaging_consumption_data(self, request):
        pack_placement_data = request.data.get('po_pack_consumption_data', [])

        for row in pack_placement_data:
            edited_placements = row.get('po_pack_placement_ids', [])
            placements = POPackPlacement.objects.filter(pk__in=edited_placements)
            if placements.exists():
                valid = self.update_consumption_ratio_and_wastage(row, placements)
                if not valid:
                    self._po_pack_item_errors.append("Please enter valid numbers for consumption ratio and wastage %s" % (str(edited_placements)))

            else:
                if edited_placements:
                    self._po_pack_item_errors.append("Pack Item Placement doesn't exist %s" % (str(edited_placements)))

    def save_po_pack_item_data(self, request):
        pack_item_placement_data = request.data.get('po_pack_item_data', [])

        for row in pack_item_placement_data:
            edited_placements = row.get('po_pack_item_placement_ids', [])
            placements = POPackItemPlacement.objects.filter(pk__in=edited_placements)
            customer_brand_material_id = row.get('customer_brand_material_id', None)
            customer_brand_material = CustomerBrandMaterial.objects.get(pk=customer_brand_material_id)
            data = {**customer_brand_material.get_attributes(), **row}
            if placements.exists():
                material_helper = GenericMaterialPOPackItemPlacementAssignMaterial(
                    placements[0],
                    data,
                    GenericMaterialPOPackItemPlacementAssignMaterial.CREATE_MATERIAL_TYPE
                )
                errors, material = material_helper.process_data()
                if not material_helper.errors_empty():

                    self._po_pack_item_errors.append(errors)
                else:
                    placements.update(po_material=material)
            else:
                self._po_pack_item_errors.append("Pack Item Placement doesn't exist")

    def save_po_pack_data(self, request):
        pack_item_placement_data = request.data.get('po_pack_data', [])

        for row in pack_item_placement_data:
            edited_placements = row.get('po_pack_placement_ids', [])
            placements = POPackPlacement.objects.filter(pk__in=edited_placements)
            customer_brand_material_id = row.get('customer_brand_material_id', None)
            customer_brand_material = CustomerBrandMaterial.objects.get(pk=customer_brand_material_id)
            data = {**customer_brand_material.get_attributes(), **row}
            if placements.exists():
                material_helper = POPackPlacementAssignMaterial(
                    placements[0],
                    data,
                    POPackPlacementAssignMaterial.CREATE_MATERIAL_TYPE
                )
                errors, material = material_helper.process_data()
                if not material_helper.errors_empty():
                    self._po_pack_errors.append(errors)
                    placements.update(po_material=material)
            else:
                self._po_pack_errors.append("Pack Placement doesn't exist")

    def post(self, request, *args, **kwargs):
        self._po_pack_item_errors = []
        self._po_pack_errors = []
        self.save_po_pack_data(request)
        self.save_po_pack_item_data(request)
        self.save_po_pack_item_consumption_data(request)
        self.save_po_packaging_consumption_data(request)
        http_response = Response({"success": True})
        if self._po_pack_item_errors or self._po_pack_errors:
            errors = {
                'pack_item_errors': self._po_pack_item_errors,
                'pack_errors': self._po_pack_errors
            }
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class PurchaseOrderColorwayCountryNavigation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_colorways = POColorway.objects.filter(purchase_order=purchase_order)
        po_countries = POCountry.objects.filter(purchase_order=purchase_order)
        packs = POPack.objects.filter(purchase_order=purchase_order).order_by('po_colorway__colorway', 'po_size__order_size__size__sorting_order')
        data = []
        for po_colorway in po_colorways:
            for po_country in po_countries:
                po_size_data = []

                country_size_packs = packs.filter(po_colorway=po_colorway, po_country=po_country)
                packs_data = {
                    'po_colorway': po_colorway.colorway,
                    'po_colorway_id': po_colorway.pk,
                    'po_country_id': po_country.pk,
                    'po_country': po_country.order_country.country.name,
                }
                for country_size_pack in country_size_packs:
                    po_size_data.append(
                        {
                            'po_size_name': country_size_pack.po_size.order_size.size.name,
                            'po_size_abbreviation': country_size_pack.po_size.order_size.size.abbreviation,
                            'po_size_id': country_size_pack.po_size_id,
                        }
                    )
                packs_data['po_sizes'] = po_size_data
                data.append(packs_data)
        return Response(data)


class PurchaseOrderPackSaveMaterial(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def post(self, request, *args, **kwargs):
        po_pack_id = self.kwargs.get('po_pack_id', None)
        po_pack = get_object_or_404(POPack, pk=po_pack_id)
        purchase_order = po_pack.purchase_order
        post_data = request.data[0]
        placement_id = post_data.get('pk_po_pack_placement_id', None)
        placement = get_object_or_404(POPackPlacement, pk=placement_id, po_pack__purchase_order=purchase_order)
        select_type = POPackItemPlacementAssignMaterial.CREATE_MATERIAL_TYPE
        if post_data.get('select_type') == POPackItemPlacementAssignMaterial.SELECT_MATERIAL_TYPE:
            select_type = POPackItemPlacementAssignMaterial.SELECT_MATERIAL_TYPE

        save_helper = POPackPlacementAssignMaterial(po_pack_placement=placement, post_data=post_data, select_type=select_type)
        response = save_helper.process_and_get_http_response()
        return response


class POCustomerBrandMaterialView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        reference_code_id = kwargs.get('reference_code_id', None)
        material_type = request.data.get('material_type', None)
        po = self.get_purchase_order_or_raise_http404(po_id)
        customer = po.costing_version.order.customer
        brand = po.costing_version.order.brand

        customer_brand = CustomerBrand.objects.get_or_create(customer=customer, brand=brand)[0]

        customer_brand_materials = customer_brand.get_customer_brand_materials_qs(material_type).filter(customer_brand_generic_material_code=reference_code_id)

        all_materials = []
        for customer_brand_material in customer_brand_materials:
            all_materials.append(customer_brand_material.get_customer_brand_material_details())
        return Response({'data': all_materials})


class POBuildBom(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, *args, **kwargs):
        return Response({"success": True}) # TODO - 06/21/2025 (this can be done later). Need to specify material and instead of doing it from the top level it has to be done at a material level.
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        bom_success, aggregate_success = purchase_order.build_purchase_order_bom()
        success = True
        if not (bom_success and aggregate_success):
            success = False

        http_response = Response({"success": success})

        if not success:
            http_response.status_code = status.HTTP_400_BAD_REQUEST
        return http_response


class PurchaseOrderVersionMatchingListView(generics.GenericAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        error_validation = request.query_params['error_validation'].lower()
        return_status = status.HTTP_200_OK
        error = False
        all_po_sizes_matched = True
        error_details = {}
        file = None
        file_type = ""
        with transaction.atomic():
            for data_set in request.data:
                purchase_order = get_object_or_none(PurchaseOrder, {'pk': data_set['purchase_order_id']})
                version = get_object_or_none(OrderCostingVersion, {'pk': data_set['version_id']})
                if version == None and purchase_order == None:
                    if error_validation == 'true':
                        all_po_sizes_matched = True
                    continue
                # if not purchase_order.purchase_order_excel == None:
                #     uploaded_file = purchase_order.purchase_order_excel
                #     file_type = "purchase_order_excel"
                # elif not purchase_order.purchase_order_pdf == None:
                #     uploaded_file = purchase_order.purchase_order_pdf
                #     file_type = "purchase_order_pdf"
                if not purchase_order.uploaded_purchase_order == None:
                    uploaded_file = purchase_order.uploaded_purchase_order.attachment
                    file_type = "uploaded_purchase_order__attachment"
                if file == None:
                    file = uploaded_file
                if file == uploaded_file:
                    purchase_order.costing_version = version
                    purchase_order.save()
                else:
                    error = True
                    error_details[purchase_order.name] = "Uploaded file mismatch"
            if error == False and error_validation == 'true':
                if len(PurchaseOrder.objects.filter(**{file_type: file, "costing_version": None}))>0:
                    all_po_sizes_matched = False
                    error = True
            if error:
                return_status = status.HTTP_400_BAD_REQUEST
                transaction.set_rollback(True)
                if not error_details == {}:
                    data = {
                        'status': error_details
                    }
                else:
                    if not all_po_sizes_matched:
                        data = {
                            'error': 'Please match all purchase orders'
                        }
            else:
                data = {
                    'status': 'Successfully Updated'
                }
        return Response(data=data, status=return_status)


class CustomerOrderVerisionListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    queryset = OrderInquiry.objects.all()

    def get(self, request, *args, **kwargs):
        data = {}
        if 'customer_id' in kwargs:
            customer = get_object_or_404(Customer, pk = kwargs['customer_id'])
        elif 'purchase_order_id' in kwargs:
            purchase_order = get_object_or_404(PurchaseOrder, pk = kwargs['purchase_order_id'])
            data['purchase_orders'] = [PurchaseOrderSerializer(purchase_order).data]
            customer = purchase_order.customer
        orders = [*set([costing_version.order for costing_version in OrderCostingVersion.objects.filter(order__customer = customer).order_by('id')])]
        data['order_inquiries'] = [{'order_id': order.id,
                 'versions': [OrderVersionSerializer(version).data
                              for version in OrderCostingVersion.objects.filter(order = order, version_state = OrderCostingVersion.COMPLETED_VERSION_STATE).order_by('id')]}
                 for order in orders]
        if 'file_id' in kwargs:
            file  = get_object_or_404(FileAttachment, pk = kwargs['file_id'])
            purchase_orders = PurchaseOrder.objects.filter(uploaded_purchase_order__attachment = file)
            if len(purchase_orders) == 0:
                purchase_orders = PurchaseOrder.objects.filter(uploaded_purchase_order__attachment = file)
            data['purchase_orders'] = [PurchaseOrderSerializer(purchase_order).data for purchase_order in purchase_orders]
        return Response(data=data)


class CostingVSPOQuantitiesListView(APIView, OrderMixin):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_ratio(self, data):
        for colorway_id, colorway_data in data.items():
            for country_id, country_data in colorway_data['order_country_id'].items():
                costing_quantities = country_data['costing_quantities']
                po_colorways = country_data['po_colorways']
                
                for costing_quantity in costing_quantities:
                    estimated_quantity = costing_quantity['estimated_quantity']
                    for po_colorway in po_colorways:
                        po_size_quantities = po_colorway['po_size_quantities']
                        for po_size_quantity in po_size_quantities:
                            po_quantity = po_size_quantity.get('po_quantity', 0)
                            if estimated_quantity != po_quantity:
                                return False
        return True

    def get(self, request, *args, **kwargs):
        po_id = kwargs['purchase_order_id']
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)

        ########## TODO major precosting -fix this
        if purchase_order.costing_version:
            costing_version = purchase_order.costing_version
        else:
            costing_version = purchase_order.marketing_costing
        ## END OF TODO
        order = costing_version.order
        data = {}
        po_colorways = purchase_order.get_po_colorways().values_list('order_colorway_id', flat=True)
        order_colorways = order.get_order_colorways().filter(pk__in=po_colorways)
        po_sizes = purchase_order.get_po_sizes().values_list('order_size_id', flat=True)
        for order_colorway in order_colorways:
            order_colorway_id = {'colorway_name': order_colorway.colorway, 'colorway_id': order_colorway.id}
            order_colorway_id['order_country_id'] = {}
            for order_country in order.get_order_countries():
                cosing_quantities = []
                po_quantities = []

                costing_packs = costing_version.get_order_version_packs().filter(
                    country=order_country, colorway=order_colorway, size_id__in=po_sizes
                ).order_by('size__size__sorting_order')
                po_packs = purchase_order.get_po_packs().filter(po_country__order_country=order_country, po_colorway__order_colorway=order_colorway)
                unique_po_colorways = po_packs.values_list('po_colorway_id', flat=True).distinct()
                po_colorway_data = {}

                if po_packs.exists():
                    for costing_pack in costing_packs:
                        cosing_quantities.append({'order_size_id': costing_pack.size.id,
                                                  'order_country_id': costing_pack.country.id,
                                                  'order_size_name': costing_pack.size.size.name,
                                                  'order_country_name': costing_pack.country.country.name,
                                                  'order_quantity': costing_pack.cad_quantity,
                                                  'estimated_quantity': costing_pack.get_estimated_quantity(),
                                                  'colorway_id': costing_pack.colorway.id,
                                                  'colorway_name': costing_pack.colorway.colorway})

                        # Loop through unique colorways
                        for unique_po_colorway in unique_po_colorways:
                            matching_po_packs = po_packs.filter(po_size__order_size=costing_pack.size, po_colorway_id=unique_po_colorway)
                            first_po_pack = matching_po_packs.first()
                            if first_po_pack:
                                if not po_colorway_data.get(unique_po_colorway, None):
                                    po_colorway_data[unique_po_colorway] = {
                                        'po_colorway_id': first_po_pack.po_colorway.id,
                                        'po_colorway_name': first_po_pack.po_colorway.colorway,
                                        'po_country_name': first_po_pack.po_country.po_country_name,
                                        'po_country_id': first_po_pack.po_country_id,
                                        'po_size_quantities': []
                                    }
                                if matching_po_packs.exists():
                                    quantity = 0
                                    po_size_data = {
                                        'po_size_id': None,
                                        'po_size_name': None,
                                    }

                                    for matching_po_pack in matching_po_packs:
                                        po_size_data['po_size_id'] = matching_po_pack.po_size_id
                                        po_size_data['po_size_name'] = matching_po_pack.po_size.po_size_name
                                        if matching_po_pack.quantity:
                                            quantity += matching_po_pack.quantity

                                    po_size_data['po_quantity'] = quantity
                                    # po_quantities.append(po_size_data)
                                    po_colorway_data[unique_po_colorway]['po_size_quantities'].append(po_size_data)

                                else:
                                    # If empty append an empty dict
                                    po_colorway_data[unique_po_colorway]['po_size_quantities'].append({})
                    order_colorway_id['order_country_id'][order_country.id] = {
                        'order_country_name': order_country.country.name,
                        'order_country_id': order_country.country_id,
                        'costing_quantities': cosing_quantities,
                        'po_colorways': po_colorway_data.values()}
                    data[order_colorway.id] = order_colorway_id
            ratio_flag = self.validate_ratio(data)
            order_colorway_id['ratio_flag'] = ratio_flag
        return Response(data=data)


class PurchaseOrderBomView(ListAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = BomSerializer

    def get_queryset(self):
        purchase_order_id = self.kwargs.get('purchase_order_id', None)
        po = self.get_purchase_order_or_raise_http404(purchase_order_id)
        bom = PurchaseOrderBom.objects.filter(purchase_order=po).order_by('material__material_detail__generic_material__user_material')
        return bom


class POPackReviewUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    queryset = POPack.objects.all()
    serializer_class = POPackSerializer

    def put(self, request, *args, **kwargs):
        MATERIAL = 'material'
        PACKAGING = 'packaging'
        type = request.data['type']
        object_id = request.data['object_id']
        reviewed = request.data['reviewed']
        type_details = {
            MATERIAL: {'model': POPackItem, 'serializer': POPackItemSerializer},
            PACKAGING: {'model': POPack, 'serializer': POPackSerializer}
        }
        object = get_object_or_404(type_details[type]['model'], pk=object_id)
        payload = type_details[type]['serializer'](object).data
        payload['reviewed'] = reviewed
        serializer = type_details[type]['serializer'](data=payload)
        if serializer.is_valid():
            to_be_reviewe_dependencies = 0
            if type == PACKAGING:
                to_be_reviewe_dependencies = len(object.popackitem_set.all().filter(reviewed=False))
            if to_be_reviewe_dependencies == 0 or reviewed == False:
                object.reviewed = reviewed
                object.save()
                data = type_details[type]['serializer'](object).data
                return_status = status.HTTP_200_OK
            else:
                data = {"po_pack_items": ["Please review PO Pack Items first"]}
                return_status = status.HTTP_400_BAD_REQUEST
        else:
            data = serializer.errors
            return_status = status.HTTP_400_BAD_REQUEST
        return Response(data=data, status=return_status)


class POPackReviewStatusView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = POPack.objects.all()
    serializer_class = POPackSerializer

    def get(self, request, *args, **kwargs):
        MATERIAL = 'material'
        PACKAGING = 'packaging'
        type = request.GET['type']
        object_id = kwargs['object_id']
        type_details = {
            MATERIAL: {'model': POPackItem, 'serializer': POPackItemSerializer},
            PACKAGING: {'model': POPack, 'serializer': POPackSerializer}
        }
        object = get_object_or_404(type_details[type]['model'], pk=object_id)
        return Response(data={'reviewed': object.reviewed})


class POColorwayItemView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        purchase_order = get_object_or_404(PurchaseOrder, pk=kwargs['po_id'])
        po_colorways = POColorway.objects.filter(purchase_order=purchase_order)
        response_data = []
        for po_colorway in po_colorways:
            data = {
                'po_colorway':po_colorway.id,
                'po_colorway_name':po_colorway.colorway,
                'po_colorway_items':[]
            }
            
            po_colorway_items = POColorwayItem.objects.filter(po_colorway=po_colorway)
            for po_colorway_item in po_colorway_items:
                data['po_colorway_items'].append({
                    'po_colorway_item_id':po_colorway_item.id,
                    'item_id':po_colorway_item.po_item.order_item.item.id,
                    'po_item_id':po_colorway_item.po_item.id,
                    'po_item_name':po_colorway_item.po_item.order_item.item.name,
                    'colorway_category_color': po_colorway_item.colorway_category_color,
                    'po_item_colorway_category_type':po_colorway_item.get_po_colorway_item_category_type()
                })
            response_data.append(data)
        return Response(response_data)


class POColorwayItemMappingUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        items = request.data['po_colorway_items']
        data = []

        for item in items:
            po_colorway_item_id = item.get('po_colorway_item_id')
            po_colorway_item_color = item.get('po_colorway_item_color')
            po_colorway_item = get_object_or_none(POColorwayItem,  {'pk':po_colorway_item_id})
            if po_colorway_item:
                po_colorway_item.colorway_category_color = po_colorway_item_color
                po_colorway_item.save()
                data.append({
                    'po_colorway_item_id':po_colorway_item.id,
                    'po_colorway_item_color':po_colorway_item.colorway_category_color
                })

        return Response(data={'updated':data})


class POColorwayCountryNavigation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_item_data(self, purchase_order):
        po_items = POItem.objects.filter(purchase_order=purchase_order)

        po_items_data = []
        for po_item in po_items:
            po_items_data.append({'po_item_id': po_item.pk, 'po_item_name': po_item.order_item.item.name})
        return po_items_data

    def get_colorway_country_data(self, purchase_order):
        cw_country_data = []
        po_cws = POColorway.objects.filter(purchase_order=purchase_order)
        po_countries = POCountry.objects.filter(purchase_order=purchase_order)

        for po_cw in po_cws:

            for po_country in po_countries:
                nav_item = {
                    'po_colorway_name': po_cw.colorway,
                    'po_colorway_id': po_cw.id,
                    'po_country_name': '%s (%s)' % (po_country.order_country.country.name, po_country.po_country_name),
                    'po_country_id': po_country.id
                }
                cw_country_data.append(nav_item)
        return cw_country_data

    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id')
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)

        po_items_data = self.get_item_data(purchase_order)
        cw_country_data = self.get_colorway_country_data(purchase_order)

        response = {
            'po_items': po_items_data,
            'po_colorway_countries': cw_country_data
        }
        return Response(response)


# PO Country Colorway views
class POColorwayCountryItemPlacementView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def sort_data(self, data):
        organized_data = {}
        for row in data:
            material_type = row['material_type']
            if not organized_data.get(material_type, None):
                material = UserDefinedMaterial.objects.get(name=material_type)
                material_headers = [
                    {"label":"Placement","name":"placement","attribute_type":"text","value":"placement","isReadOnly": True},
                    *UserDefinedMaterial.get_material_headers(material_type)
                ]
                organized_data[material_type] = {
                    'material_type': material.name,
                    'material_type_display': material.material,
                    'data': [],
                    'material_headers': material_headers
                }
            organized_data[material_type]['data'].append(row)
        return organized_data


    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_item_id = kwargs.get('po_item_id')
        po_cw_id = kwargs.get('po_colorway_id')
        po_country_id = kwargs.get('po_country_id')

        po_cw = get_object_or_404(POColorway, pk=po_cw_id, purchase_order=purchase_order)
        po_item = get_object_or_404(POItem, pk=po_item_id, purchase_order=purchase_order)
        po_country = get_object_or_404(POCountry, pk=po_country_id, purchase_order=purchase_order)
        data = POCountryColorwayItemPlacement.objects.filter(
            purchase_order=purchase_order,
            po_item=po_item,
            po_colorway=po_cw,
            po_country=po_country
        ).order_by('costing_material__customer_brand_generic_material_code__user_material__name')
        response = self.sort_data(POCountryColorwayItemPlacementSerializer(data, many=True).data)
        return Response(response)


class POColorwayCountryPlacementView(POColorwayCountryItemPlacementView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_cw_id = kwargs.get('po_colorway_id')
        po_country_id = kwargs.get('po_country_id')

        po_cw = get_object_or_404(POColorway, pk=po_cw_id, purchase_order=purchase_order)
        po_country = get_object_or_404(POCountry, pk=po_country_id, purchase_order=purchase_order)
        data = POCountryColorwayPlacement.objects.filter(
            purchase_order=purchase_order,
            po_colorway=po_cw,
            po_country=po_country
        )
        response = self.sort_data(POCountryColorwayPlacementSerializer(data, many=True).data)
        return Response(response)


class POColorwayMatrixDetailView(generics.RetrieveAPIView):
    serializer_class = OrderInquirySerializer
    queryset = OrderInquiry.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_object(self):
        po = get_object_or_404(PurchaseOrder, pk=self.kwargs['po_id'])
        object = po.costing_version.order if po.costing_version else None
        return object
    

class PurchaseOrderStateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        data = PurchaseOrder.STATE_CHOICE
        response_data = [{'value': row[0], 'display_value': row[1]} for row in data]
        return Response(response_data)
    
    
class PurchaseOrderStateUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderSerializer
    queryset = PurchaseOrder.objects.all()

    def partial_update(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)



class UploadedPurchaseOrderListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = UploadedPurchaseOrderSerializer
    queryset = UploadedPurchaseOrder.objects.all()


class UploadedPurchaseOrderDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = UploadedPurchaseOrderSerializer
    queryset = UploadedPurchaseOrder.objects.all()


class PurchaseOrderActualClubUpdateView(generics.ListCreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        data = request.data.get('data', [])
        
        for item in data:
            purchase_order_list = item["purchaseorder_set"]
            actual_club = get_object_or_none(ActualPOClub, {'id':item["id"]})
            original_club = get_object_or_none(OriginalPOClub, {'id':item["original_po_club"]})

            for purchase_order_item in purchase_order_list:
                purchase_order_id = purchase_order_item["id"]
                uploaded_purchase_order_id = purchase_order_item["uploaded_purchase_order"]
                uploaded_purchase_order = get_object_or_none(UploadedPurchaseOrder, {'id':uploaded_purchase_order_id})
                po = get_object_or_404(PurchaseOrder, pk=purchase_order_id)

                if actual_club and purchase_order_list:
                    po.actual_po_club = actual_club
                    po.save()
                elif not actual_club and purchase_order_list:
                    actual_club = ActualPOClub.objects.create(original_po_club=original_club, uploaded_purchase_order=uploaded_purchase_order)
                    po = get_object_or_404(PurchaseOrder, pk=purchase_order_id)
                    po.actual_po_club = actual_club
                    po.save()

            if not purchase_order_list and actual_club:
                actual_club.delete()

        serializer = UploadedPurchaseOrderSerializer(uploaded_purchase_order).data
        return Response(serializer, status=status.HTTP_200_OK)


# Purchase Order Fabric Cad Views
class PurchaseOrderFabricDataCad(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_colorway_id = kwargs.get('po_colorway_id', None)
        # po_country_id = kwargs.get('po_country_id', None)
        po_order_item_id = kwargs.get('po_order_item_id', None)
        po_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        po_packs = POPack.objects.filter(purchase_order=purchase_order, po_colorway_id=po_colorway_id)
        pack_item_data = CADPOColorwayCountryItemPlacementHelper(po_packs, po_order_item_id=po_order_item_id, purchase_order=purchase_order, po_colorway_id=po_colorway_id).get_grouped_material_data_by_placement()
        return Response(pack_item_data.get(po_order_item_id, {}))


class PurchaseOrderColorwayCountryView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_po_colorway_sizes(self, po_colorway, po):
        po_size_ids = POPack.objects.filter(po_colorway=po_colorway, purchase_order=po).values_list('po_size_id', flat=True)
        po_sizes = POSize.objects.filter(pk__in=po_size_ids).prefetch_related('order_size__size')
        return po_sizes

    def get_po_countries(self, po_colorway, po):
        po_pack_ids = POPack.objects.filter(po_colorway=po_colorway, purchase_order=po).values_list('po_country_id', flat=True)
        po_countries = POCountry.objects.filter(pk__in=po_pack_ids).prefetch_related('order_country__country')
        return po_countries

    def get(self, request, *args, **kwargs):
        purchase_order_id = kwargs.get('purchase_order_id', None)
        purchase_order = self.get_purchase_order_or_raise_http404(purchase_order_id)

        po_cws = purchase_order.get_po_colorways()
        po_items = purchase_order.get_po_items()
        items = []
        for po_item in po_items:
            items.append({
                'po_item_id': po_item.pk,
                'po_item_name': po_item.order_item.item.name,
            })

        response = []
        for po_cw in po_cws:
            data = {}
            data['po_colorway'] = po_cw.colorway
            data['po_colorway_id'] = po_cw.pk
            po_sizes = self.get_po_colorway_sizes(po_cw, purchase_order)
            sizes = []
            for po_size in po_sizes:
                sizes.append({
                    'po_size_id': po_size.pk,
                    'po_size_name': po_size.order_size.size.name,
                    'po_size_abbreviation': po_size.order_size.size.abbreviation,
                })
            data['po_sizes'] = sizes

            countries = []
            po_countries = self.get_po_countries(po_cw, purchase_order)
            for po_country in po_countries:
                countries.append({
                    'po_country_id': po_country.pk,
                    'po_country_name': po_country.order_country.country.name,
                })
            data['po_countries'] = countries
            response.append(data)


        response_data = {
            'po_items': items,
            'colorway_country_sizes': response
        }
        return Response(response_data)


class SavePOColorwayItemCadData(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def validate_po_pack_item_fabric_placement_complete(self, colorway_fabric_consumptions):
        is_valid = False
        po_pack_items_list = []
        for colorway_fabric_consumption in colorway_fabric_consumptions:
            po_item = colorway_fabric_consumption.po_item
            po_pack_items = POPackItem.objects.filter(po_item=po_item)
            for po_pack_item in po_pack_items:
                is_valid = po_pack_item.validate_fabric_placements_complete()
                po_pack_items_list.append(po_pack_item)
        return is_valid, po_pack_items_list

    def set_fabric_consumption_ratio_complete(self, complete_status, instance):
        colorway_fabric_consumptions = ColorwayItemFabricConsumption.objects.filter(po_colorway=instance.po_colorway,
                                                                                    po_item=instance.po_item)
        is_valid, po_pack_items = self.validate_po_pack_item_fabric_placement_complete(colorway_fabric_consumptions)
        if complete_status and is_valid and po_pack_items:
            for po_pack_item in po_pack_items:
                po_pack_item.fabric_consumption_ratio_complete = True
                po_pack_item.save()

    def post(self, request, *args, **kwargs):
        po_id = kwargs.get('purchase_order_id')
        purchase_order = self.get_purchase_order_or_raise_http404(po_id)
        data = request.data.get('data', [])
        complete_status = request.data.get('complete_status')
        pk_key = ColorwayItemFabricConsumption.PK_PO_COLORWAY_ITEM_CONSUMPTION
        errors = []
        colorway_fabric_consumption_list = []
        for row in data:

            instance = ColorwayItemFabricConsumption.objects.get(pk=row[pk_key])
            serializer = ColorwayItemFabricConsumptionSerializer(instance=instance, data=row)
            if serializer.is_valid():
                serializer.save()
                colorway_fabric_consumption_list.append(instance)
            else:
                errors.append(serializer.errors)
        # if colorway_fabric_consumption_list:
        #     self.set_fabric_consumption_ratio_complete(complete_status, colorway_fabric_consumption_list[0])
        return Response(errors)


class PurchaseOrderMaterialFilteredView(generics.GenericAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        purchase_order_id = kwargs.get('purchase_order_id', None)
        po = self.get_purchase_order_or_raise_http404(purchase_order_id)
        pack_ids = request.data.get('pack_ids', [])
        pack_item_ids = request.data.get('pack_item_ids', [])

        response = {
            'po_packs': pack_ids,
            'po_pack_items': pack_item_ids,
            'data': []
        }
        data = {}

        po_pack_placements = POPackPlacement.objects.filter(po_pack_id__in=pack_ids)
        data.update(po.organize_placement_material_bom_data(po_pack_placements, {}))

        po_pack_item_placements = POPackItemPlacement.objects.filter(po_pack_item_id__in=pack_item_ids)
        data.update(po.organize_placement_material_bom_data(po_pack_item_placements, {}))
        for material_id, values in data.items():
            for supplier_inquiry_detail_id, inner_data in values.items():
                quantity = inner_data["quantity"]
                measuring_unit = inner_data["measuring_unit"]
                po_bom = get_object_or_none(PurchaseOrderBom,
                    {
                        'supplier_inquiry_detail_id': supplier_inquiry_detail_id,
                        'material_id': material_id,
                        'purchase_order_id' :purchase_order_id
                    }
                )
                
                if po_bom:
                    serializer = BomSerializer(po_bom, context={'quantity': quantity, 'measuring_unit': measuring_unit})
                    serialized_data = serializer.data
                    response['data'].append(serialized_data)
        return Response(response)


class POMaterialReviewDetailUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, po_id):
        po = get_object_or_404(PurchaseOrder, pk=po_id)
        po_materials_reviewed = request.data.get("po_materials_reviewed", False)
        po_country_id = request.data.get("po_country_id", None)
        po_colorway_id = request.data.get("po_colorway_id", None)


        has_review = False

        po_packs = POPack.objects.filter(po_country_id=po_country_id, po_colorway_id=po_colorway_id, purchase_order=po)
        po_pack_items = POPackItem.objects.filter(po_pack__in=po_packs)

        if po_materials_reviewed:
            exists_material_not_exist_po_pack_placements = POPackPlacement.objects.filter(po_pack__in=po_packs, po_material__isnull=True).exists()
            exists_material_not_exist_po_pack_item_placements = POPackItemPlacement.objects.filter(po_pack_item__in=po_pack_items, po_material__isnull=True).exists()

            if exists_material_not_exist_po_pack_placements or exists_material_not_exist_po_pack_item_placements:
                has_review = False
            else:
                po_packs.update(po_materials_reviewed=True)
                po_pack_items.update(po_materials_reviewed=True)
                has_review = True
        else:
            po_packs.update(po_materials_reviewed=False)
            po_pack_items.update(po_materials_reviewed=False)
            has_review = False

        data = {
            'po_materials_reviewed': has_review
            }

        return Response(data, status=status.HTTP_200_OK)


class ActualPOClubStateOptionView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        state_options = []

        for choice in ActualPOClub.STATE_OPTIONS:
            state_options.append({"id": choice[0], "name": choice[1]})
        response = {
            'state_options': state_options,
        }
        return Response(response)


class UploadedPurchaseOrderCompleteStatusUpdateView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = UploadedPurchaseOrderSerializer
    queryset = UploadedPurchaseOrder.objects.all()

    def mapping_po_club_colorway_country_size_and_states(self):
        from marketing.scripts.actual_po_club_colorway_country_size_mapping import ActualPOClubColorwayCountrySizeMapper
        instance = self.get_object()
        po_club_ids = instance.purchaseorder_set.all().values_list('actual_po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
        for po_club in po_clubs:
            actual_po_club_colorway_country_size_mapper = ActualPOClubColorwayCountrySizeMapper(po_club)
            actual_po_club_colorway_country_size_mapper.map_data()
            po_club.state = ActualPOClub.OPEN_STATE
            marketing_costing = po_club.get_marketing_costing()
            po_club.marketing_costing = marketing_costing
            po_club.save()

        purchase_orders = instance.purchaseorder_set.all()
        for po in purchase_orders:
            po.state = PurchaseOrder.OPEN
            po.save()

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.clubbing_complete = True
        instance.save()
        self.mapping_po_club_colorway_country_size_and_states()
        return super().get(request, *args, **kwargs)


class POMappingCompleteOpenListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderSerializer
    
    def get_queryset(self):
        actual_po_id = self.kwargs.get('pk')
        actual_po_club = ActualPOClub.objects.get(id=actual_po_id)
        purchaseorder_set = actual_po_club.purchaseorder_set
        pos = purchaseorder_set.filter(Q(state=PurchaseOrder.OPEN) | Q(state=PurchaseOrder.MAPPINGS_COMPLETE))
        return pos


class ActualPOClubListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActualPOClubSerializer
    queryset = ActualPOClub.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    # replace_keys = {
	#         'id': 'id',
    #         'marketing_costing_id': 'marketing_costing_id',
    #         'pre_costing_id': 'pre_costing_id',
    #         'state_display_value': 'state',
    #     }

    # def clean_dictionary(self, dic):
        
    #     dictionary = clean_search_dictionary(dic, self.replace_keys)
    #     return dictionary

    # def get_queryset(self):
    #     qs = super().get_queryset()
    #     search_data = self.request.GET.dict()
    #     search_dictionary = self.clean_dictionary(search_data)
    #     global_filter = self.request.query_params.get('global_filter', None)
    #     sort_col = self.request.query_params.get('sort_col', None)
    #     sort_col = self.replace_keys.get(sort_col, None)
    #     sort_dir = self.request.query_params.get('sort_dir', None)
    #     search_fields = ['id', 'marketing_costing_id', 'pre_costing_id']
    #     qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, ActualPOClub)
    #     return qs
    
    
    filter_field_list = [
        {'field_name': 'id', 'field_type': 'id', 'front_end_field_name': 'id'},
        {'field_name': 'marketing_costing', 'field_type': 'id', 'front_end_field_name': 'marketing_costing_id'},
        {'field_name': 'pre_costing', 'field_type': 'id', 'front_end_field_name': 'pre_costing_id'},
        {'field_name': 'pre_costing__order__style_number', 'field_type': 'text', 'front_end_field_name': 'style_number'},
        {'field_name': 'state', 'field_type': 'choice', 'front_end_field_name': 'state_display_value'},
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = search_qs_from_global_filter_v2(qs, self.filter_field_list, self.request, ActualPOClub)
        return qs

    # def get_queryset(self):
    #     plant_id = self.kwargs.get('plant_id', None)
    #     customer_id = self.kwargs.get('customer_id', None)
    #     queryset = ActualPOClub.objects.all().order_by('-id')
    #     if plant_id and customer_id:
    #         actual_po_club_ids = PurchaseOrder.objects.filter(plant__id=plant_id, costing_version__order__customer__id=customer_id).distinct('actual_po_club').values_list('actual_po_club')
    #         queryset = self.queryset.filter(pk__in=actual_po_club_ids)
    #     elif plant_id:
    #         actual_po_club_ids = PurchaseOrder.objects.filter(plant__id=plant_id).distinct('actual_po_club').values_list('actual_po_club')
    #         queryset = self.queryset.filter(pk__in=actual_po_club_ids)
    #     return queryset


class ActualPOClubDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActualPOClubSerializer
    queryset = ActualPOClub.objects.all()   


class ChangePOClubState(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def post(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        state = request.data.get('new_state', None)

        response = po_club.move_to_next_state(state)
        http_response = Response(response)
        if not response.get('valid', None):
            http_response.status_code = status.HTTP_400_BAD_REQUEST
        else:
            http_response.status_code = status.HTTP_200_OK
        return http_response
    

class POClubMaterialFilteredView(generics.GenericAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = BomSerializer

    def post(self, request, *args, **kwargs):
        club_id = kwargs.get('club_id', None)
        club = self.get_po_club_or_raise_http404(club_id)
        pack_ids = request.data.get('pack_ids', [])
        pack_item_ids = request.data.get('pack_item_ids', [])
        data = {}
        general_po_material_quantity_list = []

        response = ({
            'pack_ids': pack_ids,
            'pack_item_ids': pack_item_ids,
            'data': []
        })

        po_pack_item_placements = POPackItemPlacement.objects.filter(po_pack_item_id__in=pack_item_ids).order_by('po_material__material_detail__generic_material__user_material__display_order')
        data.update(club.organize_club_placement_material_bom_data(po_pack_item_placements, {}))

        po_pack_placements = POPackPlacement.objects.filter(po_pack_id__in=pack_ids).order_by('po_material__material_detail__generic_material__user_material__display_order')
        data.update(club.organize_club_placement_material_bom_data(po_pack_placements, {}))

        for material_id, values in data.items():
            for supplier_inquiry_detail_id, inner_data in values.items():
                quantity = inner_data["quantity"]
                measuring_unit = inner_data["measuring_unit"]
                general_po_material_quantity = get_object_or_none(
                    GeneralPOMaterialQuantity, 
                    {
                        'material_id': material_id,
                        'general_po__po_club': club
                    }
                )
                if general_po_material_quantity:
                    serializer = GeneralPOMaterialQuantityDetailSerializer(general_po_material_quantity, context={'quantity': quantity, 'measuring_unit': measuring_unit})
                    serialized_data = serializer.data
                    # if general_po_material_quantity.material.material_type == 'fabric':
                    #     print(serialized_data)
                    general_po_material_quantity_list.append(serialized_data)
        # sorted_data = sorted(general_po_material_quantity_list, key=lambda x: x['id'])
        response['data'] = general_po_material_quantity_list
        return Response(response)
    
class POClubBOMGenerateExcelView(generics.ListAPIView):
    pass # TODO - what is this for?


class POClubBOMMaterialDetailView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = BomSerializer
    queryset = PurchaseOrderBom.objects.all()

    def get_queryset(self):
        actual_club_bom_id = self.kwargs.get('actual_club_bom_id')
        actual_club_bom = get_object_or_404(ActualClubBom, pk=actual_club_bom_id)
        material_id = self.kwargs.get('material_id')
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        purchase_orders = actual_club_bom.actual_club.purchaseorder_set.all()
        qs = PurchaseOrderBom.objects.filter(purchase_order__in=purchase_orders, material=material).order_by('-id')
        return qs

class POClubBOMMaterialDetailTestView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_supplier_prices(self, general_po, material):
        supplier_prices = GeneralPOSupplierMaterialPrice.objects.filter(
            material=material,
            general_po_supplier__general_po=general_po
        )
        return supplier_prices

    def get(self, request, *args, **kwargs):
        general_po_material_quntity_id = self.kwargs.get('general_po_material_quntity_id')
        general_po_material_quantity = get_object_or_404(GeneralPOMaterialQuantity, pk=general_po_material_quntity_id)
        material = get_object_or_404(CustomerBrandMaterial, pk=self.kwargs.get('material_id'))
        if general_po_material_quantity.general_po.is_po_club_general_po():
            purchase_orders = general_po_material_quantity.general_po.po_club.get_purchase_orders()
            purchase_order_boms = PurchaseOrderBom.objects.filter(purchase_order__in=purchase_orders, material=material).order_by('-id')
        else:
            purchase_order_boms = PurchaseOrderBom.objects.none
        supplier_prices = self.get_supplier_prices(general_po_material_quantity.general_po, material)

        total_value_with_po_breakdown = {
            'id': general_po_material_quantity.id,
            'quantity': general_po_material_quantity.quantity,
            'measuring_unit': general_po_material_quantity.measuring_unit,
            'measuring_unit_display': general_po_material_quantity.get_measuring_unit_display(),
            'order_quantity': general_po_material_quantity.order_quantity,
            'order_quantity_units': general_po_material_quantity.order_quantity_units,
            'order_quantity_units_display': general_po_material_quantity.get_order_quantity_units_display(),
            'purchase_order_boms': PurchaseOrderBomBasicSerializer(purchase_order_boms, many=True).data if purchase_order_boms else None,
        }

        deliveries = general_po_material_quantity.supplierdeliverydatequantity_set.all()
        
        data = {
            'material': CustomerBrandMaterialBasicSerializer(material).data,
            'total_value_with_po_breakdown': total_value_with_po_breakdown,
            'supplier_prices': GeneralPOSupplierMaterialPriceSerializer(supplier_prices, many=True).data,
            'deliveries': SupplierDeliveryDateQuantitySerializer(deliveries, many=True).data,
        }

        return Response(data, status=status.HTTP_200_OK)
    

# class POClubBOMSupplierCreateView(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, ]
#     # TODO major - add state validation to this

#     errors = {
#     }

#     def validate_po_bom_order_quantity(self, po_breakdown_data):
#         errors = []
#         for row in po_breakdown_data['purchase_order_boms']:
#             po_bom_id = row['id']
#             order_quantity = row['order_quantity']
#             measuring_unit = row['measuring_unit']
#             if not order_quantity:
#                 errors.append({
#                     'id': po_bom_id,
#                     'error': 'Order quantity cannot be empty.'
#                 })
#             if not measuring_unit:
#                 errors.append({
#                     'id': po_bom_id,
#                     'error': 'Order quantity units cannot be empty.'
#                 })
#         if errors:
#             self.errors['purchase_order_errors'] = errors
    
#     def validate_supplier_prices(self, supplier_price_data):
#         errors = []
#         for row in supplier_price_data:
#             id = row['id']
#             order_price = row['order_price']
#             order_price_units = row['order_price_units']
#             discount = row['discount']
#             if not order_price:
#                 errors.append({
#                     'id': id,
#                     'error': 'Order price cannot be empty.'
#                 })
#             if not order_price_units:
#                 errors.append({
#                     'id': id,
#                     'error': 'Order price unit cannot be empty.'
#                 })
#         if errors:
#             self.errors['supplier_price_errors'] = errors

#     def validate_total_order_quantity(self, total_order_quantity, total_entered_quantity):
#         error = None
#         if total_entered_quantity > total_order_quantity:
#             error = "Order quantity exceeded"
#         return error

#     def validate_po_bom_total_quantity(self, purchase_order_bom_total_quantity, delivery_date_total_quantity):
#         error = None
#         if purchase_order_bom_total_quantity != delivery_date_total_quantity:
#             error = "PO's entered quantities mismatch."
#         return error
    
#     def refresh_supplier_pos(self, po_club):
#         if po_club.supplierpo_set.filter(state=SupplierPO.DRAFT_STATE).exists():
#             NewGenerateSupplierPOs(po_club).create_supplier_pos()

#     def get_supplier_delivery_date(self, delivery_date, supplier, po_club):
#         supplier_delivery_date = get_object_or_none(SupplierDeliveryDate, {'supplier': supplier, 'po_club':po_club, 'confirmed_delivery_date': delivery_date})
#         if not supplier_delivery_date:
#             supplier_delivery_date = SupplierDeliveryDate.objects.create(
#                 general_po_supplier__supplier=supplier, po_club=po_club, confirmed_delivery_date=delivery_date
#             )
#         return supplier_delivery_date
    
#     def get_supplier_price(self, new_supplier_id, supplier_price_data):
#         supplier_price = GeneralPOSupplierMaterialPrice.objects.none
    
#         for row in supplier_price_data:
#             supplier_id = row.get('supplier', None)
#             if supplier_id == new_supplier_id:
#                 supplier_price_id = row.get('id', None)
#                 supplier_price = get_object_or_404(GeneralPOSupplierMaterialPrice, pk=supplier_price_id)
#                 return supplier_price
#         return supplier_price
    
#     def update_supplier_price(self, supplier_price_data):
#         supplier_price = GeneralPOSupplierMaterialPrice.objects.none
#         for supplier_price in supplier_price_data:
#             supplier_price_id = supplier_price.get('id', None)
#             order_price = supplier_price.get('order_price', None)
#             order_price_units = supplier_price.get('order_price_units', None)
#             discount = supplier_price.get('discount', None)
#             supplier_price = get_object_or_404(GeneralPOSupplierMaterialPrice, pk=supplier_price_id)
#             supplier_price.order_price = order_price
#             supplier_price.order_price_units = order_price_units
#             supplier_price.discount = discount
#             supplier_price.save()
#         return True

#     def create_po_allocation(self, general_po_material_quntity, delivery_data, supplier_price_data):
#         for row in delivery_data:
#             delivery_quantity_id = row['id']
#             confirmed_delivery_date = row['confirmed_delivery_date']
#             supplier = row['supplier']
#             quantity = row['quantity']
#             po_allocation_quantity_data = row['supplierdeliverydatequantitypoallocation_set']
#             supplier_delivery_date, created = SupplierDeliveryDate.objects.get_or_create(
#                     general_po_supplier=general_po_material_quntity.default_material_supplier.general_po_supplier,
#                     confirmed_delivery_date=confirmed_delivery_date,
#             )
#             supplier_price = self.get_supplier_price(supplier, supplier_price_data)
#             if delivery_quantity_id:
#                 delivery_quantity = SupplierDeliveryDateQuantity.objects.get(pk=delivery_quantity_id)
#                 delivery_quantity.material_supplier = supplier_price
#                 delivery_quantity.supplier_delivery_date=supplier_delivery_date
#             else:
#                 delivery_quantity = SupplierDeliveryDateQuantity.objects.create(
#                     general_po_material_quantity=general_po_material_quntity,
#                     supplier_delivery_date=supplier_delivery_date,
#                     material_supplier=supplier_price
#                 )
#             delivery_quantity.quantity = quantity['quantity']
#             delivery_quantity.quantity_units = MaterialUnitHelper.METERS_UNIT
#             delivery_quantity.save()

#             for row in po_allocation_quantity_data:
#                 purchase_order = row['purchase_order']
#                 quantity = row['quantity']
#                 quantity_units = row['quantity_units']
#                 po_allocation, created = SupplierDeliveryDateQuantityPOAllocation.objects.get_or_create(
#                     purchase_order_id=purchase_order,
#                     supplier_delivery_date_quantity=delivery_quantity
#                 )
#                 po_allocation.quantity = quantity
#                 po_allocation.quantity_units = quantity_units
#                 po_allocation.proforma_invoice_quantity = quantity
#                 po_allocation.proforma_invoice_quantity_units = quantity_units
#                 po_allocation.save()
#         return True
    
#     def validate_data(self, po_breakdown_data, delivery_data, supplier_price_data):
#         self.validate_po_bom_order_quantity(po_breakdown_data)
#         self.validate_supplier_prices(supplier_price_data)
    
#     def post(self, request, *args, **kwargs):
#         general_po_material_quntity = get_object_or_404(GeneralPOMaterialQuantity, pk=self.kwargs.get('general_po_material_quntity_id'))
#         po_breakdown_data = request.data.get('total_value_with_po_breakdown', {})
#         delivery_data = request.data.get('deliveries', [])
#         supplier_price_data = request.data.get('supplier_prices', [])

#         po_bom_ids = []

#         self.validate_data(po_breakdown_data, delivery_data, supplier_price_data)

#         for row in po_breakdown_data['purchase_order_boms']:
#             po_bom_id = row['id']
#             order_quantity = row['order_quantity']
#             measuring_unit = row['measuring_unit']
#             po_bom = get_object_or_404(PurchaseOrderBom, pk=po_bom_id)
#             po_bom.order_quantity = order_quantity
#             po_bom.measuring_unit = measuring_unit
#             po_bom.save()  
#             po_bom_ids.append(po_bom.id)

#         po_boms = PurchaseOrderBom.objects.filter(id__in=po_bom_ids)
#         from shared.utils import calculate_queryset_total_normalized_quantity
#         normalized_unit = general_po_material_quntity.material.material_normalized_measuring_unit
#         total_order_quantity = calculate_queryset_total_normalized_quantity(po_boms, normalized_unit, 'order_quantity', 'measuring_unit')

#         general_po_material_quntity.order_quantity = total_order_quantity
#         general_po_material_quntity.save()
        
#         self.update_supplier_price(supplier_price_data)
#         if self.create_po_allocation(general_po_material_quntity, delivery_data, supplier_price_data):
#             http_response = Response({
#                 'success': True,
#                 'general_po_material_quntity_id': general_po_material_quntity.id,
#                 'material_id': general_po_material_quntity.material.id
#             }, status=status.HTTP_200_OK)    
#         else:
#             http_response = Response({'success': False, 'errors': self.errors}, status=status.HTTP_400_BAD_REQUEST)
#         return http_response
    

class POClubBOMSupplierDetailView(generics.ListAPIView):


    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderPOClubBomSetSerailzier
    queryset = PurchaseOrder.objects.all()

    def get_queryset(self):
        actual_club_bom = get_object_or_404(ActualClubBom, pk=self.kwargs.get('actual_club_bom_id'))
        qs = actual_club_bom.actual_club.purchaseorder_set.all().order_by('id')
        return qs
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['material'] = self.get_material()
        return context

    def get_material(self):
        material_id = self.kwargs.get('material_id')
        return get_object_or_404(CustomerBrandMaterial, pk=material_id)
    


class POClubBOMSupplierDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierDeliveryDateQuantitySerializer
    queryset = PurchaseOrderClubBomSupplier.objects.all()


class StateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    
    def get(self, request):
        source = request.query_params.get('source')
        if source == 'PurchaseOrder':
            response = PurchaseOrder.STATE_CHOICE
            response_data = [{'value': row[0], 'display_value': row[1]} for row in response]
            return Response(response_data)
        elif source == 'ActualPOClub':
            response = ActualPOClub.STATE_OPTIONS
            response_data = [{'value': row[0], 'display_value': row[1]} for row in response]
            return Response(response_data)


class ClubSupplierPOFileListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierBOMFileSerializer
    queryset = SupplierBOMFile.objects.all()

    def get_queryset(self):
        actual_po_club = get_object_or_404(ActualPOClub, pk=self.kwargs.get('actual_po_club_id'))
        qs = SupplierBOMFile.objects.filter(actual_po_club=actual_po_club)
        return qs


class ClubStateForceChangeView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [BUSINESS_ADMIN_ROLE, ]

    def has_any_role(self, *role_names):
        user = self.request.user
        for role_name in role_names:
            if user.has_role(role_name):
                return True
        return False

    def post(self, request, *args, **kwargs):
        user = self.request.user
        has_admin_role = self.has_any_role(user, ADMIN_ROLE, BUSINESS_ADMIN_ROLE)
        if user.is_authenticated and has_admin_role:
            po_club_id = kwargs.get('actual_po_club_id', None)
            po_club = self.get_po_club_or_raise_http404(po_club_id)
            state = request.data.get('new_state', None)
            po_club.state = state
            po_club.save()
            if po_club.state == ActualPOClub.READY_TO_SEND_BOM_EMAIL:
                for po in po_club.get_purchase_orders():
                    po.set_po_pack_cost()
                    deliveries = po.purchaseorderdelivery_set.all()
                    for delivery in deliveries:
                        delivery.set_total_amount()
                po_club.set_calculated_values()
            http_response = Response({'status': 'Updated'})
        else:
            http_response = Response({'error': 'User not authenticated'}, status=status.HTTP_403_FORBIDDEN)
        return http_response


class OrderInquirySupplierList(generics.ListAPIView):
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_costing_materials(self, actual_club, material):
        item_material_ids = POPackItemPlacement.objects.filter(
            po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=actual_club
        ).values_list('costing_pack_item_placement__orderpackitemplacementmaterial__material_id', flat=True).distinct()
        pack_material_ids = POPackPlacement.objects.filter(
            po_material=material, po_pack__purchase_order__actual_po_club=actual_club
        ).values_list('costing_pack_placement__orderpackplacementmaterial__material_id', flat=True).distinct()
        material_ids = [*item_material_ids, *pack_material_ids]
        return material_ids

    def get_queryset(self):
        # TODO - change dependency from actual_club_bom to actual_club
        general_po_material_quantity_id = self.kwargs.get('general_po_material_quantity_id')
        general_po_material_quntity = get_object_or_404(GeneralPOMaterialQuantity, pk=general_po_material_quantity_id)
        material_id = self.kwargs.get('material_id')
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        material_ids = self.get_costing_materials(general_po_material_quntity.general_po.po_club, material)
        versions = general_po_material_quntity.general_po.po_club.get_purchase_orders().values_list('costing_version', flat=True)
        supplier_ids = SupplierInquiry.objects.filter(customer_brand_material_id__in=material_ids, version__in=versions).values_list('supplier_id', flat=True)
        qs = Supplier.objects.filter(id__in=supplier_ids)
        return qs


class InHouseMaterialByPOListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get_headers(self):
        from materials.fieldmetadata.material_metadata import get_inhouse_material_headers
        headers = get_inhouse_material_headers()
        return headers

    def get(self, request, po_id):
        response = {}
        material_ids = PurchaseOrderBom.objects.filter(
            purchase_order=po_id
        ).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).order_by('id')
        context = {'purchase_order_id': po_id, 'filter_by': 'PurchaseOrder'}
        searializer = InHouseMaterialListDataSerializer(materials, context=context, many=True)
        response['general_headers'] = self.get_headers()
        response['data'] = searializer.data
        return Response(response)
    

class InHouseMaterialDetailsByPOListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_id, material_id):
        purchase_order = get_object_or_404(PurchaseOrder, pk=po_id)
        context = {'material_id': material_id}
        serializer = POAllocatedMaterialDetailSerializer(context=context, instance=purchase_order)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class InHouseMaterialChartSummaryView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_id):
        response = {}
        material_ids = PurchaseOrderBom.objects.filter(
            purchase_order=po_id
        ).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(
            id__in=material_ids,
            material_code__material_definition__user_material__name=Material.FABRIC_MATERIAL
        )
        context = {'purchase_order_id': po_id}
        searializer = InHouseMaterialChartSummaryByPOSerializer(materials, context=context, many=True).data
        return Response(searializer)
    
class CreatedPOPackagingInstructionListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, purchase_order_id):
        response = {
            'costing_pack_instruction': {},
            'purchase_order_pack_instruction': [],
            'is_packaging_instruction_exist': False
        }
        purchase_order = PurchaseOrder.objects.get(id=purchase_order_id)
        costing_pack_instructions = PackPackaging.objects.filter(costing=purchase_order.costing_version, current_version=True)
        purchase_order_pack_instructions = PurchaseOrderPackaging.objects.filter(purchase_order__costing_version=purchase_order.costing_version).exclude(purchase_order_id=purchase_order.id)

        response['costing_pack_instruction'] = {
            'order_id': purchase_order.costing_version.order.id,
            'costing_id': purchase_order.costing_version.id,
            'costing_display_number': purchase_order.costing_version.display_number,
            'pack_packaging_versions': []
        }
        for costing_pack_instruction in costing_pack_instructions:
            response['costing_pack_instruction']['pack_packaging_versions'].append({
                'id': costing_pack_instruction.id,
                'display_number': costing_pack_instruction.display_number,
                'approved': costing_pack_instruction.current_version,
            })

        for purchase_order_pack_instruction in purchase_order_pack_instructions:
            response['purchase_order_pack_instruction'].append({
                'id': purchase_order_pack_instruction.id,
                'display_number': purchase_order_pack_instruction.display_number,
                'purchase_order_id': purchase_order_pack_instruction.purchase_order.id,
                'purchase_order_display_number': purchase_order_pack_instruction.purchase_order.display_number
            })

        is_packaging_instruction_exist = PurchaseOrderPackaging.objects.filter(purchase_order=purchase_order).exists()
        response['is_packaging_instruction_exist'] = is_packaging_instruction_exist

        return Response(response)
    

class POPackagingInstructionDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_country_pack_instructions(self, country, po_packaging):
        instructions = PurchaseOrderPackagingInstruction.objects.none()
        if po_packaging:
            country_instructions = PurchaseOrderPackagingInstructionOrderPack.objects.filter(
                po_pack__po_country=country, 
                po_pack_instruction__po_pack_packaging=po_packaging
            ).values_list('po_pack_instruction_id', flat=True)
            instructions = PurchaseOrderPackagingInstruction.objects.filter(id__in=country_instructions)
        return instructions

    def get_country_meta_data(self, country, sizes, colorways, country_instruction_order_packs=None):
        data = []
        for size in sizes:
            size_data = {
                'size_id': size.id,
                'size': size.po_size_name,
                'country_id': country.id,
                'selected': False if not country_instruction_order_packs else country_instruction_order_packs.filter(po_pack__po_country=country, po_pack__po_size=size).exists(),
                'colorways': []
            }
            
            for colorway in colorways:
                if country_instruction_order_packs:
                    instruction_order_packs = country_instruction_order_packs.filter(po_pack__po_country=country, po_pack__po_size=size, po_pack__po_colorway=colorway)
                else:
                    instruction_order_packs = None
                colorway_data = {
                    'colorway_id': colorway.id,
                    'name': colorway.colorway,
                    'selected': False if not country_instruction_order_packs else country_instruction_order_packs.filter(po_pack__po_country=country, po_pack__po_size=size, po_pack__po_colorway=colorway).exists(),
                    'ratio_id': instruction_order_packs[0].id if instruction_order_packs else None,
                    'quantity': instruction_order_packs[0].quantity if instruction_order_packs else None,
                    'ratio': instruction_order_packs[0].ratio if instruction_order_packs else None,
                }
                size_data['colorways'].append(colorway_data)
            data.append(size_data)
    
        return data

    def post(self, request, purchase_order_id):
        po_packaging_id = request.data.get('po_packaging_id', None)
        pack_packaging_id = request.data.get('pack_packaging_id', None)

        purchase_order = get_object_or_404(PurchaseOrder, pk=purchase_order_id)
        countries = purchase_order.get_po_countries()
        sizes = purchase_order.get_po_sizes().order_by('order_size__size__sorting_order')
        colorways = purchase_order.get_po_colorways()

        if pack_packaging_id:
            purchase_order.copy_packaging_instruction_from_costing()
            po_packaging = purchase_order.purchaseorderpackaging
        elif po_packaging_id:
            from_purchase_order_pakaging = PurchaseOrderPackaging.objects.get(id=po_packaging_id)
            purchase_order.copy_packaging_instruction_from_purchase_order(from_purchase_order_pakaging.purchase_order)
            po_packaging = purchase_order.purchaseorderpackaging
        else:
            po_packaging, created = PurchaseOrderPackaging.objects.get_or_create(purchase_order=purchase_order)
            

        response = {
            'po_packaging': po_packaging.id if po_packaging else None,
            'display_name': po_packaging.display_number if po_packaging else None,
            'data': []
        }

        for country in countries:
            country_data = {
                'id': country.id,
                'name': country.po_country_name,
                'meta_data': self.get_country_meta_data(country, sizes, colorways),
                'instructions': []
            }
            if po_packaging:
                country_instructions = self.get_country_pack_instructions(country, po_packaging)
                for country_instruction in country_instructions:
                    instruction_packs = country_instruction.purchaseorderpackaginginstructionorderpack_set.all()
                    instruction_metadata = self.get_country_meta_data(country, sizes, colorways, instruction_packs)
                    instruction_data = {
                        'id': country_instruction.id,
                        'material': CustomerBrandMaterialBasicSerializer(country_instruction.carton).data,
                        'instruction_meta_data': instruction_metadata,
                        'ratios': PurchaseOrderPackagingInstructionOrderPackSerializer(instruction_packs, many=True).data
                    }

                    country_data['instructions'].append(instruction_data)
            response['data'].append(country_data)
        
        return Response(response)


class POPackagingInstructionCreateUpdateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [PurchaseOrder.OPEN, PurchaseOrder.REQUIRES_CHANGED, PurchaseOrder.MAPPINGS_COMPLETE]
    
    def get_object_current_state(self):
        po_packaging = get_object_or_404(PurchaseOrderPackaging, pk=self.kwargs['po_packaging_id'])
        purchase_order = po_packaging.purchase_order
        return purchase_order.state
    
    errors = {}
    has_errors = False

    def __init__(self, *args, **kwargs):
        self.errors = {}
        super(APIView, self).__init__(*args, **kwargs)

    def validate_data(self, data):
        material_errors = {}
        for data_item in data:
            index = 0
            country_id = data_item['id']
            instructions = data_item.get('instructions', [])
            for instruction_row in instructions:
                quantity_errors = None
                material_data = instruction_row.get('material')
                material_id = material_data['id']
                instruction_meta_data = instruction_row.get('instruction_meta_data', [])
                    
                if not material_id:
                    if country_id not in material_errors:
                        material_errors[country_id] = {}
                    material_errors[country_id][index] = {"Select packaging material."}
                    self.has_errors = True

                quantity_errors = self.validate_quantities(instruction_meta_data, index)

                if quantity_errors:
                    self.has_errors = True
                    if 'size_quantity_errors' not in self.errors:
                        self.errors['size_quantity_errors'] = {}
                    if country_id not in self.errors['size_quantity_errors']:
                        self.errors['size_quantity_errors'][country_id] = {}
                    if index not in self.errors['size_quantity_errors'][country_id]:
                        self.errors['size_quantity_errors'][country_id][index] = {}
                    self.errors['size_quantity_errors'][country_id][index] = quantity_errors

                index += 1
        if self.has_errors:
            self.errors['material_errors'] = material_errors

    def validate_quantities(self, data, index):
        size_quantity_errors = {}
        for row in data:
            size_id = row['size_id']
            colorways = row['colorways']
            for colorway in colorways:
                colorway_id = colorway['colorway_id']
                quantity = colorway.get('quantity')
                ratio = colorway.get('ratio')
                selected = colorway['selected']

                if selected and (not quantity or not ratio):
                    if size_id not in size_quantity_errors:
                        size_quantity_errors[size_id] = {}
                    if colorway_id not in size_quantity_errors[size_id]:
                        size_quantity_errors[size_id][colorway_id] = {}

                    if not quantity:
                        size_quantity_errors[size_id][colorway_id]["quantity"] = "Enter quantity."
                    if not ratio:
                        size_quantity_errors[size_id][colorway_id]["ratio"] = "Enter ratio."

        return size_quantity_errors
    
    def validate_exist_po_pack_in_another_instruction(self, data):
        multi_select_errors = {}

        # previous_combinations = set()
        # index = 0
        # for data_item in data:
        #     country_id = data_item['id']
        #     instructions = data_item.get('instructions', [])
        #     for instruction_row in instructions:
        #         material_data = instruction_row.get('material')
        #         material_id = material_data['id']
        #         instruction_meta_data = instruction_row.get('instruction_meta_data', [])
        #         for row in instruction_meta_data:
        #             size_id = row['size_id']
        #             colorways = row['colorways']

        #             for colorway in colorways:
        #                 colorway_id = colorway['colorway_id']
        #                 combination = (country_id, size_id, colorway_id)

        #                 if combination in previous_combinations:
        #                     if index not in multi_select_errors:
        #                         multi_select_errors[index] = "Duplicate combination found in another instruction."
        #                         self.has_errors = True
        #                 previous_combinations.add(combination)
        #             if self.has_errors:
        #                 self.errors['multi_select_errors'] = multi_select_errors
        #         index += 1
        return multi_select_errors

    def post(self, request, po_packaging_id):
        po_packaging = get_object_or_404(PurchaseOrderPackaging, pk=po_packaging_id)
        data = request.data.get('data', [])
        self.validate_data(data)
        self.validate_exist_po_pack_in_another_instruction(data)

        if not self.has_errors:

            for data_item in data:
                instructions = data_item.get('instructions', [])
                for instruction_row in instructions:
                    pack_instruction_id = instruction_row['id']
                    material_data = instruction_row.get('material')
                    instruction_meta_data = instruction_row.get('instruction_meta_data', [])
                    material_id =  material_data['id']

                    if pack_instruction_id:
                        pack_instruction = PurchaseOrderPackagingInstruction.objects.get(id=pack_instruction_id)
                        pack_instruction.carton_id = material_id
                        pack_instruction.save()
                    else:
                        if material_id:
                            pack_instruction = PurchaseOrderPackagingInstruction.objects.create(
                                po_pack_packaging=po_packaging,
                                carton_id=material_id
                            )
                    if pack_instruction:
                        for instruction_meta_data_row in instruction_meta_data:
                            size_id = instruction_meta_data_row['size_id']
                            country_id = instruction_meta_data_row['country_id']
                            colorways = instruction_meta_data_row['colorways']
                            for colorway in colorways:
                                pack_instruction_order_pack_id = colorway['ratio_id']
                                colorway_id = colorway['colorway_id']
                                quantity = colorway['quantity']
                                ratio = colorway['ratio']
                                quantity = colorway['quantity']
                                selected = colorway['selected']
                                po_pack = POPack.objects.get(po_size_id=size_id, po_country_id=country_id, po_colorway_id=colorway_id)

                                if pack_instruction_order_pack_id and selected:
                                    pack_instruction_order_pack = PurchaseOrderPackagingInstructionOrderPack.objects.get(id=pack_instruction_order_pack_id)
                                    pack_instruction_order_pack.quantity = quantity
                                    pack_instruction_order_pack.ratio = ratio
                                    pack_instruction_order_pack.save()
                                elif pack_instruction_order_pack_id and not selected:
                                        PurchaseOrderPackagingInstructionOrderPack.objects.get(id=pack_instruction_order_pack_id).delete()
                                else:
                                    if material_id and quantity and ratio:
                                        pack_instruction_order_pack_id = PurchaseOrderPackagingInstructionOrderPack.objects.create(
                                            po_pack=po_pack,
                                            po_pack_instruction=pack_instruction,
                                            quantity=quantity,
                                            ratio=ratio
                                        )

            response = PurchaseOrderPackagingSerializer(po_packaging, many=False).data
            http_response = Response(response)
        else:
            http_response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)

        return http_response


class POPackagingInstructionDeleteView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [PurchaseOrder.OPEN, PurchaseOrder.REQUIRES_CHANGED, PurchaseOrder.MAPPINGS_COMPLETE]
    
    def get_object_current_state(self):
        po_packaging_instruction = get_object_or_404(PurchaseOrderPackagingInstruction, pk=self.kwargs['po_packaging_instruction_id'])
        purchase_order = po_packaging_instruction.po_pack_packaging.purchase_order
        return purchase_order.state

    def post(self, request, po_packaging_instruction_id):
        po_packaging_instruction = get_object_or_404(PurchaseOrderPackagingInstruction, pk=po_packaging_instruction_id)
        po_pack_packaging = po_packaging_instruction.po_pack_packaging
        po_packaging_instruction.delete()
        response = PurchaseOrderPackagingSerializer(po_pack_packaging, many=False).data
        return Response(response)
    

class POPackagingSummaryView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def calculate_no_of_catons(self, packing_instruction):
        total_cartons = 0
        instruction_order_packs = packing_instruction.purchaseorderpackaginginstructionorderpack_set.all()

        for instruction_order_pack in instruction_order_packs:
            total_quantity = instruction_order_pack.po_pack.quantity
            units_per_carton = instruction_order_pack.quantity

            if units_per_carton is None or total_quantity is None:
                continue

            number_of_cartons = total_quantity // units_per_carton
            if total_quantity % units_per_carton != 0:
                number_of_cartons += 1

            total_cartons += number_of_cartons

        return total_cartons

    def get_grouped_data(self, packing_instruction):
        from django.db.models import Sum
        data = []
        purchase_order_packaging_instruction_order_packs = packing_instruction.purchaseorderpackaginginstructionorderpack_set.all()
        po_countries = packing_instruction.po_pack_packaging.purchase_order.get_po_countries()
        po_colorways = packing_instruction.po_pack_packaging.purchase_order.get_po_colorways()
        po_sizes = packing_instruction.po_pack_packaging.purchase_order.get_po_sizes().order_by('order_size__size__sorting_order')

        for country in po_countries:
            country_data = {
                'id': country.id,
                'name': country.po_country_name,
                'colorways': []
            }
            for colorway in po_colorways:
                colorway_data = {
                    'id': colorway.id,
                    'name': colorway.colorway,
                    'sizes': []
                }
                for size in po_sizes:
                    size_data = {
                        'id': size.id,
                        'size': size.po_size_name,
                        'colorway_size_quantity': purchase_order_packaging_instruction_order_packs.filter(
                                po_pack__po_country=country, 
                                po_pack__po_colorway=colorway,
                                po_pack__po_size=size
                            ).aggregate(Sum('quantity'))
                    }
                    colorway_data['sizes'].append(size_data)
                country_data['colorways'].append(colorway_data)
            data.append(country_data)
        return data

    def get(self, request, purchase_order_id):
        data = []
        purchase_order = get_object_or_404(PurchaseOrder, pk=purchase_order_id)
        packing_instructions = PurchaseOrderPackagingInstruction.objects.filter(po_pack_packaging__purchase_order=purchase_order)
        for packing_instruction in packing_instructions:
            data.append({
                'id': packing_instruction.id,
                'carton': CustomerBrandMaterialBasicSerializer(packing_instruction.carton, many=False).data,
                'number_of_cartons': self.calculate_no_of_catons(packing_instruction),
                'countries':  self.get_grouped_data(packing_instruction)
            })
        return Response(data)
    

class InHouseFabricMaterialShadeSummaryByPOListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderShadeSummarySerializer
    queryset = SupplierInquiryMaterialCode.objects.all().order_by('-id')

    def get_queryset(self):
        qs = super().get_queryset()
        material_ids = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order=self.kwargs['po_id']
        ).values_list('in_house_material__supplier_material', flat=True)
        qs = qs.filter(id__in=material_ids, customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['po_id'] = self.kwargs['po_id']
        return context
    

class PurchaseOrderPackDeliveryListView(APIView):
    permission_classes = (HasPermission, )

    def get_po_pack_meta_data(self, po_packs, po_delivery_packs=None):
        data = []

        for po_pack in po_packs:
            if po_delivery_packs:
                po_delivery_pack = po_delivery_packs.filter(po_pack=po_pack)
            else:
                po_delivery_pack = None

            data.append({
                'id': po_delivery_pack[0].id if po_delivery_pack else None,
                'po_pack_id': po_pack.id,
                'name': '%s / %s / %s / %d Pcs' % (po_pack.po_country.po_country_name, po_pack.po_colorway.colorway, po_pack.po_size.po_size_name, po_pack.quantity),
                'po_pack_quantity': po_pack.quantity,
                'selected': False if not po_delivery_packs else po_delivery_packs.filter(po_pack=po_pack).exists(),
                'quantity':  po_delivery_pack[0].quantity if po_delivery_pack else None,
            })
    
        return data

    def get(self, request, purchase_order_id):
        
        purchase_order = get_object_or_404(PurchaseOrder, pk=purchase_order_id)
        po_packs = purchase_order.popack_set.all()
        po_deliveries = PurchaseOrderDelivery.objects.filter(purchase_order=purchase_order)

        data = {
            'no_of_deliveries': po_deliveries.count(),
            'initial_po_pack_meta_data': self.get_po_pack_meta_data(po_packs),
            'delivery_data': []
        }

        for po_delivery in po_deliveries:
            po_delivery_packs = po_delivery.purchaseorderdeliverypack_set.all().order_by(
                'po_pack__order_pack__colorway__colorway', 'po_pack__order_pack__country__country', 'po_pack__order_pack__size__size__sorting_order'
            )
            po_delivery_packs_meta_data = self.get_po_pack_meta_data(po_packs, po_delivery_packs)
            delivery_data = {
                'id': po_delivery.id,
                'delivery_date': po_delivery.delivery_date,
                'po_delivery_packs_meta_data': po_delivery_packs_meta_data
            }
            data['delivery_data'].append(delivery_data)
        return Response(data)
    

class PurchaseOrderPackDeliveryUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    errors = None
    has_errors = False

    def __init__(self, *args, **kwargs):
        self.has_errors = False
        self.errors = {
            'total_pack_quantity_errors': {},
            'delivery_errors': {}
        }
        super(APIView, self).__init__(*args, **kwargs)

    def validate_delivery_quantities(self, data, po_packs):
        pack_quantity_map = {pack.id: pack.quantity for pack in po_packs}
        quantity_sum_map = {}

        for delivery in data:
            for detail in delivery['po_delivery_packs_meta_data']:
                po_pack_id = detail['po_pack_id']
                if detail['selected']:
                    quantity = detail.get('quantity', 0)

                    if po_pack_id not in quantity_sum_map:
                        quantity_sum_map[po_pack_id] = 0
                    
                    quantity_sum_map[po_pack_id] += int(quantity) if quantity else 0

        for po_pack_id, quantity_sum in quantity_sum_map.items():
            max_quantity = pack_quantity_map.get(po_pack_id)

            if max_quantity is not None and quantity_sum > max_quantity:
                if po_pack_id not in self.errors['total_pack_quantity_errors']:
                    self.errors['total_pack_quantity_errors'][po_pack_id] = {}
                self.errors['total_pack_quantity_errors'][po_pack_id] = {
                    'error': '%s %s' % ('Delivery quantities exceed. Maximum quantity is', max_quantity)
                }
                self.has_errors = True

    def validate_data(self, delivery_data):
        index = 0

        for row in delivery_data:
            delivery_date = row.get('delivery_date')
            
            if not delivery_date:
                if index not in self.errors['delivery_errors']:
                    self.errors['delivery_errors'][index] = {}
                self.errors['delivery_errors'][index]['delivery_date_error'] = 'Enter a delivery date'
                self.has_errors = True

            po_delivery_packs = row.get('po_delivery_packs_meta_data', [])
            sub_index = 0
            for detail_row in po_delivery_packs:
                selected = detail_row['selected']
                
                if selected:
                    quantity = detail_row.get('quantity')
                    
                    if not quantity:
                        if index not in self.errors['delivery_errors']:
                            self.errors['delivery_errors'][index] = {}
                        if 'quantity_errors' not in self.errors['delivery_errors'][index]:
                            self.errors['delivery_errors'][index]['quantity_errors'] = {}
                        self.errors['delivery_errors'][index]['quantity_errors'][sub_index] = {'quantity': 'Enter quantity'}
                        self.has_errors = True
                    sub_index += 1
            index += 1

    def post(self, request, purchase_order_id):
        purchase_order = get_object_or_404(PurchaseOrder, pk=purchase_order_id)
        po_packs = purchase_order.popack_set.all()
        delivery_data = request.data.get('delivery_data', [])
        self.validate_data(delivery_data)
        self.validate_delivery_quantities(delivery_data, po_packs)

        if not self.has_errors:
            for row in delivery_data:
                po_delivery_id = row['id']
                delivery_date = row['delivery_date']
                deleted_pack_ids = row['deleted_ids']
                if po_delivery_id:
                    po_delivery = get_object_or_404(PurchaseOrderDelivery, pk=po_delivery_id)
                    po_delivery.delivery_date = delivery_date
                    po_delivery.save()
                else:
                    po_delivery = PurchaseOrderDelivery.objects.create(
                        purchase_order=purchase_order,
                        delivery_date=delivery_date
                    )

                po_delivery_packs = row.get('po_delivery_packs_meta_data', [])
                for detail_row in po_delivery_packs:
                    selected = detail_row['selected']
                    if selected:
                        po_delivery_pack_id = detail_row['id']
                        po_pack_id = detail_row['po_pack_id']
                        quantity = detail_row['quantity']
                        if po_delivery_pack_id:
                            po_delivery_pack = get_object_or_404(PurchaseOrderDeliveryPack, pk=po_delivery_pack_id)
                            po_delivery_pack.quantity = quantity
                            po_delivery_pack.save()
                        else:
                            po_delivery_pack = PurchaseOrderDeliveryPack.objects.create(
                                purchase_order_delivery=po_delivery,
                                po_pack_id=po_pack_id,
                                quantity = quantity
                            )
            
                PurchaseOrderDeliveryPack.objects.filter(id__in=deleted_pack_ids).delete()
            http_response = Response({'success': True})
        else:
            http_response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class PurchaseOrderDeliveryDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderDeliverySerializer
    queryset = PurchaseOrderDelivery.objects.all()


class PurchaseOrderDeliveryListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PurchaseOrderDeliveryListSerializer
    queryset = PurchaseOrderDelivery.objects.all()
    pagination_class = GeneralLargeResultsSetPagination


class POPackPreSeenCostingSummary(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_pack_id = kwargs.get('po_pack_id', None)
        po_pack = get_object_or_404(POPack, pk=po_pack_id)
        return Response(po_pack.calculate_po_pack_pre_seen_costing_summary())


