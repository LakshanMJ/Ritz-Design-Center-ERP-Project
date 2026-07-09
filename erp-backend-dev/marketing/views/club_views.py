from django.http import JsonResponse
from rest_framework import generics,status
from rest_framework.response import Response
from rest_framework.views import APIView

from marketing.mixins.material_mixins import ActualClubFabricPlacementHelper
from marketing.mixins.order_mixins import OrderMixin
from marketing.models import POColorwayItem, POColorway, POItem, POFabricMarkerPlacement, SupplierPOGRNMaterial, \
    ActualClubBom, PurchaseOrderBom, SupplierDeliveryDate, SupplierPOGRN, FabricGRNBatchNumber, \
    SupplierPOGRNMaterialDetail, SupplierPOInvoiceDeliveryNote, SupplierPODeliveryInvoicePackList, \
    POClubMaterialColorTone, POClubShade, SupplierDeliveryDateQuantityPOAllocation, PurchaseOrderAllocatedMaterial, \
    ActualPOClubColorway, ActualPOClubCountry, ActualPOClubSize, UploadedPurchaseOrder, \
    OrderCostingVersion, OrderColorway, OrderCountry, OrderSize, POCountry, POSize, POPackItem, POPack, \
    POPackItemPlacement, POPackPlacement, UploadedPurchaseOrder, PurchaseOrder, OrderCostingColorwayMaterialSupplierInquiry, \
    BOMChangeRequest, OrderPlacement, BOMChangeRequestChangeType, POFabricMarker, BOMChangeRequestMaterialAppliedPackandPackItemPlacements, \
    BOMChangeRequestPriceChange, BOMChangeRequestConsumptionChange, ColorwayItemFabricConsumption, BOMChangeRequestFabricVoidMarker, BOMChangeRequestFabricMarker, SupplierInquiryDetail, \
    POClubCompletedMaterial
from marketing.permissions.po_club_mixins import POClubPermissionMixin
from marketing.serializer.po_club_serializers import ConsumptionWastageSerializer
from materials.models import FabricColorTone, SupplierCustomerBrandMaterial, SupplierInquiryMaterialCode, \
    FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES, CustomerBrand, PACKAGING_TYPES
from marketing.serializers import SupplierPOGRNMaterialSerializer, ClubAllocatedMaterialDetailSerializer, \
    POClubShadeSerializer, ClubShadeSummarySerializer, \
    POClubColorwaySerializer, POClubPurchaseOrderColorwayCountrySizeListSerializer, POClubCountrySerializer, \
    POClubSizeSerializer, \
    PurchaseOrderColorwaySerializer, PurchaseOrderSerializer, BOMChangeRequestSerailizer, BOMChangeRequestDetailSerailizer
from materials.serializers.material_serializers import InHouseMaterialListDataSerializer, InHouseMaterialChartSummaryByClubSerializer, CustomerBrandMaterialBasicSerializer, ConsolidatedSupplierInquiryMaterialDetailSerializer
from shared.permissions.roles import MERCHANT_ROLE, CAD_USER_ROLE, MERCHANT_ADMIN_ROLE
from shared.permissions.view_permissions import HasPermission
from shared.utils import get_object_or_none, convert_to_float_or_none, is_none, get_object_or_none_dict
from materials.scripts.supplier_po_bom_generator import *
from shared.utils import calculate_queryset_total_normalized_quantity, get_amount_dictionary
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from django.db import transaction
from shared.utils import search_qs_from_id
from marketing.helpers.po_club_pre_costing_clone_helper import POClubCloneHelper
from django.contrib.contenttypes.models import ContentType
from shared.helpers.currency_helper import CurrencyHelper
from service_po.models import GeneralServicePOSupplier, GeneralServicePOSupplierPrice, GeneralServicePOService, GeneralServicePOServiceDelivery
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from supplier_po.models import GeneralPOSupplierMaterialPrice, GeneralPOMaterialQuantity
from django.db.models import Q
from marketing.scripts.export_fabric_report import FabricReportExporter


class ActualClubFabric(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def get(self, request, *args, **kwargs):
        actual_club_bom_id = kwargs.get('actual_club_bom_id')

        actual_club_bom = self.get_po_club_or_raise_http404(actual_club_bom_id)

        helper = ActualClubFabricPlacementHelper(actual_po_club=actual_club_bom)
        data = helper.get_material_data()
        return Response(data)


class ActualClubColorwayMatrix(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def get(self, request, *args, **kwargs):
        actual_club_bom_id = kwargs.get('actual_club_bom_id')

        actual_club_bom = self.get_po_club_or_raise_http404(actual_club_bom_id)
        po_items = actual_club_bom.get_po_item_ids()
        
        item_data = []
        seen_item_ids = set()

        for po_item in po_items:
            item_id = po_item.order_item.item.id
            if item_id not in seen_item_ids:
                item_data.append({
                    'item_id': item_id, 
                    'item_name': po_item.order_item.item.name
                })
                seen_item_ids.add(item_id)

        pos = actual_club_bom.get_purchase_orders()
        data = {}
        for po in pos:
            data[po.pk] = {'purchase_order_id': po.pk, 'po_display_number': po.display_number, 'po_number': po.name, 'po_colorway_mappings': []}

            po_cws = po.get_po_colorways()
            po_items = po.get_po_items()
            for po_cw in po_cws:
                for po_item in po_items:
                    cw_item_category = get_object_or_none(POColorwayItem, {'po_item': po_item, 'po_colorway': po_cw})
                    cw_item_category_display = 'N/A'
                    if cw_item_category:
                        cw_item_category_display = cw_item_category.colorway_category_color



                    data[po.pk]['po_colorway_mappings'].append({
                        'po_colorway': po_cw.colorway,
                        'po_colorway_id': po_cw.pk,
                        'order_colorway': po_cw.order_colorway.colorway,
                        'po_item': po_item.order_item.item.name,
                        'po_item_id': po_item.pk,
                        'item_id' : po_item.order_item.item.id,
                        'cw_item_category_display': cw_item_category_display,
                        
                    })
        
        data['item_data'] = item_data
        return Response(data)




class POClubCompletedGRNData(generics.ListAPIView, OrderMixin):
    queryset = POFabricMarkerPlacement.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )
    serializer_class = SupplierPOGRNMaterialSerializer

    def get_queryset(self):
        club_id = self.kwargs.get('po_club_id', None)
        po_club = self.get_object_or_404(ActualPOClub, pk=club_id)
        grns = po_club.get_completed_grns()
        grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grns)
        return grn_materials


class InHouseMaterialByClubListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get_headers(self):
        from materials.fieldmetadata.material_metadata import get_inhouse_material_headers
        headers = get_inhouse_material_headers()
        return headers

    def get(self, request, club_id):
        response = {
            'general_headers': self.get_headers(),
            'data': {
                'fabric': [],
                'sewing_trim': [],
                'packaging_trim': []
            }
        }
        material_ids = PurchaseOrderBom.objects.filter(
            purchase_order__actual_po_club=club_id
        ).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).order_by('material_detail__generic_material__user_material__category')
        context = {'club_id': club_id, 'filter_by': 'Club'}
        for material in materials:
            data = InHouseMaterialListDataSerializer(material, context=context, many=False).data
            if material.material_category == Material.FABRIC_MATERIAL:
                response['data']['fabric'].append(data)
            elif material.material_category == SEWING_TRIM_TYPES:
                response['data']['sewing_trim'].append(data)
            elif material.material_category == PACKAGING_TYPES:
                response['data']['packaging_trim'].append(data)
        return Response(response)

    
class InHouseMaterialDetailsByClubListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, club_id, material_id):
        club = get_object_or_404(ActualPOClub, pk=club_id)
        
        context = {'material_id': material_id}
        serializer = ClubAllocatedMaterialDetailSerializer(context=context, instance=club)
        return Response(serializer.data)


class InHouseMaterialChartSummaryByClubView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, actual_po_club_id):
        response = {}
        po_club = ActualPOClub.objects.get(id=actual_po_club_id)
        materials = po_club.get_materials_in_club().filter(material_detail__generic_material__user_material__category=Material.FABRIC_MATERIAL)
        context = {'actual_club_id': actual_po_club_id}
        searializer = InHouseMaterialChartSummaryByClubSerializer(materials, context=context, many=True).data
        return Response(searializer)


class ClubDeliverySummary(APIView):
    permission_classes = (HasPermission,)

    def get_material_supplier_pos(self, customer_brand_material, po_club):
        supplier_po_ids = PurchaseOrderClubBomSupplier.objects.filter(
            purchase_order_bom__purchase_order__in=po_club.get_purchase_orders(),
            purchase_order_bom__material=customer_brand_material,
        ).values_list('supplier_po_id', flat=True).distinct()
        supplier_pos = SupplierPO.objects.filter(po_club=po_club, pk__in=supplier_po_ids)
        return supplier_pos

    def get_supplier_po_material_delivery_data(self, supplier_po, customer_brand_material):
        supplier_po_material_deliveries = supplier_po.get_material_delivery_dates(customer_brand_material).order_by('confirmed_delivery_date')
        po_deliveries = []
        last_delivery = None
        for supplier_po_material_delivery in supplier_po_material_deliveries:
            po_deliveries.append(
                {
                    'id': supplier_po_material_delivery.pk,
                    'delivery_date': supplier_po_material_delivery.confirmed_delivery_date,
                }
            )
            if supplier_po_material_delivery.actual_delivery_date:
                last_delivery = supplier_po_material_delivery.actual_delivery_date
        return po_deliveries, last_delivery

    def get_supplier_po_data(self, supplier_po):
        data = {
            'id': supplier_po.pk,
            'po_number': supplier_po.supplier_po_number,
            'supplier_name': supplier_po.supplier.name,
            'supplier_po_file': supplier_po.supplier_po_file.get_object_data() if supplier_po.supplier_po_file else {}
        }
        return data

    def get(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        bom_summary = po_club.get_po_club_bom_summary()

        data = []

        for material in bom_summary:
            customer_brand_material = material['customer_brand_material']
            supplier_pos = self.get_material_supplier_pos(customer_brand_material, po_club)
            for supplier_po in supplier_pos:
                supplier_po_material_delivery_dates, last_delivery = self.get_supplier_po_material_delivery_data(supplier_po, customer_brand_material)

                data.append({
                        'material_headers': UserDefinedMaterial.get_material_headers(customer_brand_material.get_user_defined_material().name),
                        'material_details': customer_brand_material.get_attributes(),
                        'required_quantity': material['required_quantity'],
                        'allocated_quantity': material['allocated_quantity'],
                        'pending_quantity': material['pending_quantity'],
                        'supplier_po_deliveries': supplier_po_material_delivery_dates,
                        'supplier_po': self.get_supplier_po_data(supplier_po),
                        'last_delivery_date': last_delivery
                })
        return Response(data)


class SupplierPOMaterialDeliveries(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        material_id = kwargs.get('customer_brand_material_id', None)
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)
        data = []
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        deliveries = supplier_po.get_material_delivery_dates(customer_brand_material)

        for delivery in deliveries:
            # delivery_data = delivery.get_normalized_quantity()
            data.append({
                'confirmed_delivery_date': delivery.confirmed_delivery_date,
                'actual_delivery_date': delivery.actual_delivery_date,
                **delivery.get_material_delivery_quantity_summary(customer_brand_material)
            })
        return Response(data)
    

class POClubColorToneSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE]

    def post(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        material_id = request.data.get('material_id', None)
        color_tones = request.data.get('color_tones', [])

        club_material_color_tone, created = POClubMaterialColorTone.objects.get_or_create(
            po_club=po_club,
            material_id=material_id
        )
        for color_tone_id in color_tones:
            color_tone = get_object_or_404(FabricColorTone, pk=color_tone_id)
            club_material_color_tone.acceptable_color_tones.add(color_tone)

        #club_material_color_tone.acceptable_color_tones.exclude(id__in=color_tones).remove()

        return Response({'success': True}, status=status.HTTP_200_OK)
    

class POClubColorToneDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        material_id = kwargs.get('material_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        data = None
        club_material_color_tone = get_object_or_none(POClubMaterialColorTone, {'po_club': po_club, 'material_id': material_id})
        if club_material_color_tone:
            data = club_material_color_tone.acceptable_color_tones.all().values_list('id', flat=True)

        return Response(data, status=status.HTTP_200_OK)
    

class POClubShadeListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )
    
    def get(self, request, supplier_po_grn_id):
        response = []
        supplier_po_grn_id = self.kwargs.get('supplier_po_grn_id', None)
        supplier_po_grn = get_object_or_404(SupplierPOGRN, pk=supplier_po_grn_id)
        po_club_ids = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order__costing_version=supplier_po_grn.supplier_po.general_po_supplier.general_po.costing
        ).values_list('purchase_order__actual_po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)

        for po_club in po_clubs:
            shades = POClubShade.objects.filter(po_club=po_club)
            response.append({
                'id': po_club.id,
                'display_number': po_club.display_number,
                'shades': POClubShadeSerializer(shades, many=True).data
            })
        return Response(response)


class InHouseFabricMaterialShadeSummaryByClubListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ClubShadeSummarySerializer
    queryset = SupplierInquiryMaterialCode.objects.all().order_by('-id')

    def get_queryset(self):
        qs = super().get_queryset()
        material_ids = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order__actual_po_club=self.kwargs['club_id']
        ).values_list('in_house_material__supplier_material', flat=True)
        qs = qs.filter(id__in=material_ids, customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['club_id'] = self.kwargs['club_id']
        return context
    

class POClubShadeAttachmentUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request):
        po_club_shade_id = request.data.get('id', None)
        attachment = request.data.get('attachment', None)
        shade_name = request.data.get('shade_name', None)

        po_club_shade = get_object_or_404(POClubShade, pk=po_club_shade_id)
        if attachment:
            po_club_shade.shade_swatch_id = attachment['id']
        else:
            po_club_shade.shade_swatch_id = None
        if shade_name:
            po_club_shade.shade_name = shade_name
        po_club_shade.save()
        serializer = POClubShadeSerializer(po_club_shade, many=False).data
        return Response(serializer)
    

class POClubActivityDetailView(APIView):
    permission_classes = (HasPermission, )

    def get(self, request, po_club_id):
        from marketing.helpers.po_club_timeline_helper import POClubTimelineHelper
        data = {}
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        activities = POClubTimelineHelper(
            request,
            po_club
        ).get_combined_data()
        
        data = {
            'id': po_club.id,
            'display_number': po_club.display_number,
            'created_date': POClubTimelineHelper.get_date_display(po_club.created),
            'activities': activities,
        }
        return Response(data)
    

class POClubColorwayDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubColorwaySerializer
    queryset = ActualPOClubColorway.objects.all()

    def delete(self, request, *args, **kwargs):

        return super().delete(request, *args, **kwargs)


class POClubColorwayCreateView(POClubPermissionMixin, generics.CreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubColorwaySerializer
    queryset = ActualPOClubColorway.objects.all()
    editable_states = [ActualPOClub.OPEN_STATE, ActualPOClub.PENDING_PRECOSTING_COMPLETION ]

    def get_po_club(self):
        po_club_id = self.request.data.get('po_club')
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        return po_club


class POClubCountryCreateView(POClubPermissionMixin, generics.CreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubCountrySerializer
    queryset = ActualPOClubCountry.objects.all()
    editable_states = [ActualPOClub.OPEN_STATE, ActualPOClub.PENDING_PRECOSTING_COMPLETION ]

    def get_po_club(self):
        po_club_id = self.request.data.get('po_club')
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        return po_club


class POClubCountryDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubCountrySerializer
    queryset = ActualPOClubCountry.objects.all()


class POClubSizeCreateView(POClubPermissionMixin, generics.CreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubSizeSerializer
    queryset = ActualPOClubSize.objects.all()
    editable_states = [ActualPOClub.OPEN_STATE, ActualPOClub.PENDING_PRECOSTING_COMPLETION]

    def get_po_club(self):
        po_club_id = self.request.data.get('po_club')
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        return po_club


class POClubSizeDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubSizeSerializer
    queryset = ActualPOClubSize.objects.all()


class POClubPurchaseOrderColorwayCountrySizeDetailView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, pk):
        po_club = get_object_or_404(ActualPOClub, pk=pk)
        selected_pre_costing = request.data.get('selected_pre_costing', None)
        if selected_pre_costing:
            pre_costing = get_object_or_404(OrderCostingVersion, pk=selected_pre_costing)
            context = {'pre_costing': pre_costing}
        else:
            context = {'pre_costing': None}
        data = POClubPurchaseOrderColorwayCountrySizeListSerializer(po_club, context=context, many=False).data
        return Response(data)


class POClubPurchaseOrderColorwayUpdateView(POClubPermissionMixin, APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [ActualPOClub.OPEN_STATE, ActualPOClub.PENDING_PRECOSTING_COMPLETION]

    def validate_data(self, actual_po_club_colorways, po_colorways, actualpoclubcountry_set, po_countries, actualpoclubsize_set, po_sizes, selected_pre_costing, select_type):
        errors = {
            'actualpoclubcolorway_set': {},
            'po_colorways': {},
            'actualpoclubcountry_set': {},
            'po_countries': {},
            'actualpoclubsize_set': {},
            'po_sizes': {},

        }
        has_errors = False
        for actual_po_club_colorway in actual_po_club_colorways:
            if select_type:
                validate_parameter = actual_po_club_colorway['pre_costing_order_colorway']
            else:
                validate_parameter = actual_po_club_colorway['marketing_order_colorway']
            if not validate_parameter:
                actual_po_club_colorway_id = actual_po_club_colorway['id']
                if actual_po_club_colorway_id not in errors['actualpoclubcolorway_set']:
                    errors['actualpoclubcolorway_set'][actual_po_club_colorway_id] = {}
                errors['actualpoclubcolorway_set'][actual_po_club_colorway_id] = {'Please map costing colorway and po club colorway'}
                has_errors = True

        for po_colorway in po_colorways:
            if not po_colorway['po_club_colorway']:
                po_colorway_id = po_colorway['id']
                if po_colorway_id not in errors['po_colorways']:
                    errors['po_colorways'][po_colorway_id] = {}
                errors['po_colorways'][po_colorway_id] = {'Please map po colorway and po club colorway'}
                has_errors = True

        for row in actualpoclubcountry_set:
            if select_type:
                validate_parameter = row['pre_costing_order_country']
            else:
                validate_parameter = row['marketing_order_country']
            if not validate_parameter:
                actual_po_club_country_id = row['id']
                if actual_po_club_country_id not in errors['actualpoclubcountry_set']:
                    errors['actualpoclubcountry_set'][actual_po_club_country_id] = {}
                errors['actualpoclubcountry_set'][actual_po_club_country_id] = {'Please map costing country and po club country'}
                has_errors = True

        for row in po_countries:
            if not row['po_club_country']:
                po_country_id = row['id']
                if po_country_id not in errors['po_countries']:
                    errors['po_countries'][po_country_id] = {}
                errors['po_countries'][po_country_id] = {'Please map po country and po club country'}
                has_errors = True

        for row in actualpoclubsize_set:
            if select_type:
                validate_parameter = row['pre_costing_order_size']
            else:
                validate_parameter = row['marketing_order_size']
            if not validate_parameter:
                actual_po_club_size_id = row['id']
                if actual_po_club_size_id not in errors['actualpoclubsize_set']:
                    errors['actualpoclubsize_set'][actual_po_club_size_id] = {}
                errors['actualpoclubsize_set'][actual_po_club_size_id] = {'Please map costing size and po club size'}
                has_errors = True

        for row in po_sizes:
            if not row['po_club_size']:
                po_size_id = row['id']
                if po_size_id not in errors['po_sizes']:
                    errors['po_sizes'][po_size_id] = {}
                errors['po_sizes'][po_size_id] = {'Please map po size and po club size'}
                has_errors = True

        return has_errors, errors

    def add_error(self, errors_dict, key, message):
            if key not in errors_dict:
                errors_dict[key] = {}
            errors_dict[key] = {message}
    
    def validate_costing_colorway_country_sizes(self, costing, actual_po_club_colorways, actual_po_club_countries, actual_po_club_sizes, selected_pre_costing, select_type):
        if selected_pre_costing:
            costing = get_object_or_404(OrderCostingVersion, pk=selected_pre_costing)
        errors = {
            'actualpoclubcolorway_set': {},
            'actualpoclubcountry_set': {},
            'actualpoclubsize_set': {},
        }
        has_errors = False

        for row in actual_po_club_colorways:
            if select_type:
                order_colorway = get_object_or_404(OrderColorway, pk=row['pre_costing_order_colorway'])
            else:
                order_colorway = get_object_or_404(OrderColorway, pk=row['marketing_order_colorway'])
            if not costing.order.get_order_colorways().filter(id=order_colorway.id).exists():
                self.add_error(
                    errors['actualpoclubcolorway_set'],
                    key=row['id'],
                    message='Order Colorway not match with the selected costing colorways'
                )
                has_errors = True

        for row in actual_po_club_countries:
            if select_type:
                order_country = get_object_or_404(OrderCountry, pk=row['pre_costing_order_country'])
            else:
                order_country = get_object_or_404(OrderCountry, pk=row['marketing_order_country'])
            if not costing.order.get_order_countries().filter(id=order_country.id).exists():
                self.add_error(
                    errors['actualpoclubcountry_set'],
                    key=row['id'],
                    message='Order Country not match with the selected costing country'
                )
                has_errors = True

        for row in actual_po_club_sizes:
            if select_type:
                order_size = get_object_or_404(OrderSize, pk=row['pre_costing_order_size'])
            else:
                order_size = get_object_or_404(OrderSize, pk=row['marketing_order_size'])
            if not costing.order.get_order_sizes().filter(id=order_size.id).exists():
                self.add_error(
                    errors['actualpoclubsize_set'],
                    key=row['id'],
                    message='Order Size not match with the selected costing size'
                )
                has_errors = True

        return has_errors, errors
    
    def update_pre_costing_data(self, po_club, selected_pre_costing, save_type):
        po_club.pre_costing_id = selected_pre_costing
        po_club.save()
        po_club.marketing_costing = po_club.pre_costing.marketing_costing
        if save_type == 'verify':
            po_club.state = ActualPOClub.OPEN_STATE
        po_club.save()
        for purchase_order in po_club.get_purchase_orders():
            purchase_order.costing_version = po_club.pre_costing
            purchase_order.marketing_costing = po_club.marketing_costing
            if save_type == 'verify':
                purchase_order.state = PurchaseOrder.CAD_COMPLETED
            purchase_order.save()
        return po_club.pre_costing

    def create_pre_costing(self, po_club):

        source_costing_version = po_club.get_marketing_costing()
        costing_type = 'pre_costing'
        purchase_orders = po_club.get_purchase_orders()

        helper = POClubCloneHelper(po_club, costing_type)
        helper.clone_data()

        for purchase_order in purchase_orders:
            purchase_order.costing_version = helper.get_created_costing_version()
            purchase_order.marketing_costing = source_costing_version
            purchase_order.state = PurchaseOrder.CAD_COMPLETED
            purchase_order.save()

        po_club.pre_costing = helper.get_created_costing_version()
        po_club.marketing_costing = po_club.pre_costing.marketing_costing
        po_club.state = ActualPOClub.OPEN_STATE
        po_club.save()

        self.verify_quantities(po_club, helper.get_created_costing_version())

    def verify_quantities(self, po_club, pre_costing_version):
        order_packs = pre_costing_version.get_order_version_packs()
        for order_pack in order_packs:
            order_pack.cad_quantity = order_pack.copied_from.cad_quantity
            order_pack.save()

        colorway_countries = pre_costing_version.orderversioncolorwaycountry_set.all()
        for colorway_country in colorway_countries:
            colorway_country.estimated_quantity = colorway_country.copied_from.estimated_quantity
            colorway_country.save()

        order_packs = pre_costing_version.get_order_version_packs()
        for order_pack in order_packs:
            if order_pack.cad_quantity == None:
                order_pack.cad_quantity = 0
                order_pack.save()

    def put(self, request, *args, **kwargs):
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        po_colorways = request.data.get('po_colorways', [])
        actualpoclubcolorway_set = request.data.get('actualpoclubcolorway_set', [])
        po_countries = request.data.get('po_countries', [])
        actualpoclubcountry_set = request.data.get('actualpoclubcountry_set', [])
        po_sizes = request.data.get('po_sizes', [])
        actualpoclubsize_set = request.data.get('actualpoclubsize_set', [])
        selected_pre_costing = request.data.get('selected_pre_costing', None)
        save_type = request.data.get('save_type', None)
        select_type = request.data.get('selected_type')

        costing = po_club.get_costing()
        if not costing:
            costing = po_club.get_marketing_costing()
        has_errors, errors = self.validate_data(actualpoclubcolorway_set, po_colorways, actualpoclubcountry_set, po_countries, actualpoclubsize_set, po_sizes, selected_pre_costing, select_type)

        if costing.costing_type == OrderCostingVersion.PRE_COSTING:
            context = {'pre_costing': costing}
        else:
            context = {'pre_costing': None}
        if not has_errors:
            has_errors, errors = self.validate_costing_colorway_country_sizes(costing, actualpoclubcolorway_set, actualpoclubcountry_set, actualpoclubsize_set, selected_pre_costing, select_type)
            if select_type and not selected_pre_costing:
                return Response({'pre_costing': 'Please select a pre costing to proceed with automaping'}, status=status.HTTP_400_BAD_REQUEST)
            if not has_errors:
                if selected_pre_costing:
                    costing = self.update_pre_costing_data(po_club, selected_pre_costing, save_type)
                for row in actualpoclubcolorway_set:
                    actual_po_club_colorway = get_object_or_404(ActualPOClubColorway, pk=row['id'])
                    order_colorway = get_object_or_404(OrderColorway, pk=row['marketing_order_colorway']) if not selected_pre_costing else get_object_or_404(OrderColorway, pk=row['pre_costing_order_colorway'])
                    if costing.costing_type == OrderCostingVersion.PRE_COSTING:
                        actual_po_club_colorway.pre_costing_order_colorway = order_colorway
                        actual_po_club_colorway.marketing_order_colorway = order_colorway.copied_from
                    else:
                        actual_po_club_colorway.marketing_order_colorway = order_colorway
                    actual_po_club_colorway.save()

                for row in po_colorways:
                    po_colorway = get_object_or_404(POColorway, pk=row['id'])
                    po_colorway.po_club_colorway_id = row['po_club_colorway']
                    if costing.costing_type == OrderCostingVersion.PRE_COSTING:
                        po_club_colorway = get_object_or_404(ActualPOClubColorway, pk=po_colorway.po_club_colorway_id)
                        po_colorway.order_colorway = po_club_colorway.pre_costing_order_colorway
                    po_colorway.save()

                for row in actualpoclubcountry_set:
                    actual_po_club_country = get_object_or_404(ActualPOClubCountry, pk=row['id'])
                    order_country = get_object_or_404(OrderCountry, pk=row['marketing_order_country']) if not selected_pre_costing else get_object_or_404(OrderCountry, pk=row['pre_costing_order_country'])
                    if costing.costing_type == OrderCostingVersion.PRE_COSTING:
                        actual_po_club_country.pre_costing_order_country = order_country
                        actual_po_club_country.marketing_order_country = order_country.copied_from
                    else:
                        actual_po_club_country.marketing_order_country = order_country
                    actual_po_club_country.save()

                for row in po_countries:
                    po_country = get_object_or_404(POCountry, pk=row['id'])
                    po_country.po_club_country_id = row['po_club_country']
                    if costing.costing_type == OrderCostingVersion.PRE_COSTING:
                        po_club_country = get_object_or_404(ActualPOClubCountry, pk=po_country.po_club_country_id)
                        po_country.order_country = po_club_country.pre_costing_order_country
                    po_country.save()

                for row in actualpoclubsize_set:
                    actual_po_club_size = get_object_or_404(ActualPOClubSize, pk=row['id'])
                    order_size = get_object_or_404(OrderSize, pk=row['marketing_order_size']) if not selected_pre_costing else get_object_or_404(OrderSize, pk=row['pre_costing_order_size'])
                    if costing.costing_type == OrderCostingVersion.PRE_COSTING:
                        actual_po_club_size.pre_costing_order_size = order_size
                        actual_po_club_size.marketing_order_size = order_size.copied_from
                    else:
                        actual_po_club_size.marketing_order_size = order_size
                    actual_po_club_size.save()

                for row in po_sizes:
                    po_size = get_object_or_404(POSize, pk=row['id'])
                    po_size.po_club_size_id = row['po_club_size']
                    if costing.costing_type == OrderCostingVersion.PRE_COSTING:
                        po_club_size = get_object_or_404(ActualPOClubSize, pk=po_size.po_club_size_id)
                        po_size.order_size = po_club_size.pre_costing_order_size
                    po_size.save()

                if save_type == 'start_pre_costing':
                    costing = self.create_pre_costing(po_club)
                data = POClubPurchaseOrderColorwayCountrySizeListSerializer(po_club, context=context, many=False).data
                http_response = Response(data)
            else:
                http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        else :
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class POClubPurchaseOrderColorwayCountrySizeAutoMapDetailView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [ActualPOClub.OPEN_STATE, ActualPOClub.PENDING_PRECOSTING_COMPLETION]

    def post(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        selected_pre_costing = request.data.get('selected_pre_costing')
        if not selected_pre_costing:
            return Response('Please select a pre costing to proceed with automaping', status=status.HTTP_400_BAD_REQUEST)
        po_club.pre_costing_id = selected_pre_costing
        po_club.save()
        po_club.marketing_costing = po_club.pre_costing.marketing_costing
        po_club.save()
        for purchase_order in po_club.get_purchase_orders():
            purchase_order.costing_version = po_club.pre_costing
            purchase_order.marketing_costing = po_club.marketing_costing
            purchase_order.save()

        from marketing.scripts.actual_po_club_colorway_country_size_mapping import ActualPOClubColorwayCountrySizeMapper
        mapper = ActualPOClubColorwayCountrySizeMapper(po_club)
        mapper.automap_colorway()
        mapper.automap_country()
        mapper.automap_size()

        context = {'pre_costing': po_club.pre_costing}
        data = POClubPurchaseOrderColorwayCountrySizeListSerializer(po_club, context=context, many=False).data
        return Response(data)

class POClubPreCostingListView(APIView):
    permission_classes = (HasPermission, )

    def get_filtered_qs(self, search_text, qs):
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs

    def get(self, request, po_club_id):
        search_text = request.query_params.get('search')
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        pre_costings = OrderCostingVersion.objects.filter(
            marketing_costing=po_club.marketing_costing
        )
        filtered_qs = self.get_filtered_qs(search_text, pre_costings)
        for pre_costing in filtered_qs:
            data.append({
                'id': pre_costing.id,
                'display_number': pre_costing.display_number,
            })
        return Response(data)


class POClubAnalyzeMetaDataView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_po_items(self, po_club):
        po_items = POItem.objects.filter(purchase_order__actual_po_club=po_club)
        data = {}
        for po_item in po_items:
            if not data.get(po_item.order_item.id, None):
                data[po_item.order_item.id] = {
                    'display_value': po_item.order_item.item_display,
                    'po_item_id': po_item.id
                }
            # data[po_item.order_item.id]['po_item_ids'].append({
            #     'id': po_item.pk
            # })
        return data.values()

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        po_club_colorways = po_club.actualpoclubcolorway_set.all()
        po_club_countries = po_club.actualpoclubcountry_set.all()
        po_club_sizes = po_club.actualpoclubsize_set.all()

        data = {
            'po_club_colorways': POClubColorwaySerializer(po_club_colorways, many=True).data,
            'po_club_countries': POClubCountrySerializer(po_club_countries, many=True).data,
            'po_club_sizes': POClubSizeSerializer(po_club_sizes, many=True).data,
            'po_items': self.get_po_items(po_club),
            'purchase_orders': PurchaseOrderSerializer(po_club.get_purchase_orders(), many=True).data
        }
        return Response(data)


class POClubAnalyzeSearchDataView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def search_packs(self, po_club, po_club_cws, po_club_countries, po_club_sizes):
        po_packs = []

        if not po_club_countries.exists():
            po_club_countries = po_club.actualpoclubcountry_set.all()

        if not po_club_sizes.exists():
            po_club_sizes = po_club.actualpoclubsize_set.all()

        for po_club_cw in po_club_cws:
            for po_club_country in po_club_countries:
                for po_club_size in po_club_sizes:
                    pack_ids = list(po_club.get_matching_po_packs(po_club_cw, po_club_country, po_club_size).values_list('pk', flat=True))
                    po_packs.extend(pack_ids)
        po_packs = POPack.objects.filter(id__in=po_packs).distinct().order_by()
        return po_packs

    def flatten_placement_data(self, organized_data):
        placement_data = organized_data.values()
        data = []
        for row in placement_data:
            row['po_placement_materials_data'] = row.pop('po_placement_materials', {}).values()
            data.append(row)
        return data

    def group_pack_item_placements(self, placements):
        data = {}
        for placement in placements:
            if not data.get(placement.costing_pack_item_placement.item_attribute_other_id, None):
                data[placement.costing_pack_item_placement.item_attribute_other_id] = {
                    'name': placement.costing_pack_item_placement.item_attribute_other.name,
                    'item_attribute_other_id': placement.costing_pack_item_placement.item_attribute_other_id,
                    'po_placement_materials': {}
                    # 'po_pack_item_placements': []
                }
            if not data[placement.costing_pack_item_placement.item_attribute_other_id]['po_placement_materials'].get(placement.po_material.pk, None):
                data[placement.costing_pack_item_placement.item_attribute_other_id]['po_placement_materials'][placement.po_material.pk] = {
                    'po_pack_item_placements': [],
                    'material_details': placement.po_material.get_attributes()
                }
            data[placement.costing_pack_item_placement.item_attribute_other_id]['po_placement_materials'][placement.po_material.pk]['po_pack_item_placements'].append({
                'po_pack_placement_id': placement.pk,
                'display_value': placement.po_pack_item.get_po_pack_item_display(),
                'wastage': placement.wastage,
                'consumption_ratio': placement.consumption_ratio
            })
        return self.flatten_placement_data(data)

    def group_pack_placements(self, placements):
        data = {}
        for placement in placements:
            if not data.get(placement.costing_pack_placement.item_attribute_other_id, None):
                data[placement.costing_pack_placement.item_attribute_other_id] = {
                    'name': placement.costing_pack_placement.item_attribute_other.name,
                    'item_attribute_other_id': placement.costing_pack_placement.item_attribute_other_id,
                    'po_placement_materials': {}
                }
            if not data[placement.costing_pack_placement.item_attribute_other_id]['po_placement_materials'].get(placement.po_material.pk, None):
                data[placement.costing_pack_placement.item_attribute_other_id]['po_placement_materials'][placement.po_material.pk] = {
                    'po_pack_placements': [],
                    'material_details': placement.po_material.get_attributes()
                }
            data[placement.costing_pack_placement.item_attribute_other_id]['po_placement_materials'][placement.po_material.pk]['po_pack_placements'].append({
                'po_pack_placement_id': placement.pk,
                'display_value': placement.po_pack.get_po_pack_display(),
                'wastage': placement.wastage,
                'consumption_ratio': placement.consumption_ratio
            })
        return self.flatten_placement_data(data)

    def search_material_data(self, po_pack_items, po_packs):
        placements = POPackItemPlacement.objects.filter(po_pack_item__in=po_pack_items)
        fabrics = placements.filter(po_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)
        sewing_trims = placements.filter(po_material__material_detail__generic_material__user_material__category=SEWING_TRIM_TYPES)

        packaging = POPackPlacement.objects.filter(po_pack__in=po_packs)
        data = {
            'fabric_placements': self.group_pack_item_placements(fabrics),
            'sewing_trim_placements': self.group_pack_item_placements(sewing_trims),
            'packaging_trim_placements': self.group_pack_placements(packaging),
        }
        return data

    def post(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        po_item = request.data.get('po_item_id', None)
        po_club_cws = request.data.get('po_club_colorway_ids', [])
        po_club_countries = request.data.get('po_club_countries', [])
        po_club_sizes = request.data.get('po_club_sizes', [])

        po_club_cw_objs = ActualPOClubColorway.objects.filter(pk__in=po_club_cws)
        po_club_country_objs = ActualPOClubCountry.objects.filter(pk__in=po_club_countries)
        po_club_size_objs = ActualPOClubSize.objects.filter(pk__in=po_club_sizes)

        matching_packs = self.search_packs(po_club, po_club_cw_objs, po_club_country_objs, po_club_size_objs)
        po_pack_items = POPackItem.objects.filter(po_pack__in=matching_packs, po_item=po_item)

        data = self.search_material_data(po_pack_items, matching_packs)
        return Response(data)


class SavePOPackPOPackItemConsumptionRatio(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    # TODO add save permissions

    def get_placement(self, row, po_club):
        pack_item_placement_id = row.get('pack_item_placement_id', None)
        pack_placement_id = row.get('pack_placement_id', None)
        placement = None

        if not is_none(pack_item_placement_id):
            placement = get_object_or_none_dict(POPackItemPlacement, pk=pack_item_placement_id, po_pack_item__po_pack__purchase_order__actual_po_club=po_club)
        elif not is_none(pack_placement_id):
            placement = get_object_or_none_dict(POPackPlacement, pk=pack_placement_id, po_pack__purchase_order__actual_po_club=po_club)
        return placement

    def save_consumption_ratios(self, data, po_club):

        errors = []
        for row in data:
            serializer = ConsumptionWastageSerializer(data=row)
            if not serializer.is_valid():
                errors.append({'row': row, 'errors': serializer.errors})
            else:
                placement = self.get_placement(row, po_club)
                if is_none(placement):
                    errors.append({'row': row, 'errors': ["Placement not found"]})
                else:
                    placement.wastage = serializer.data['wastage']
                    placement.consumption_ratio = serializer.data['consumption_ratio']
                    placement.save()

    def post(self, request, *args, **kwargs):
        '''[
                    {'pack_item_placement_id', 'wastage', 'consumption_ratio'},# For pack item placment
                    {'pack_placement_id', 'wastage', 'consumption_ratio'}, # For pack placement
                ]'''
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        data = request.data.get('consumption_data', [])
        errors = self.save_consumption_ratios(data, po_club)

        response = Response({'success': True})
        if errors:
            response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return response


class DeletePurchaseOrderClubPlacements(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def post(self, request, *args, **kwargs):
        '''
        data expected format {
            'po_pack_placement_ids': [],
            'po_pack_item_placement_ids': [],
        }
        '''
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        deleted_po_pack_placement_ids = request.data.get('po_pack_placement_ids', None)
        deleted_po_pack_item_placement_ids = request.data.get('po_pack_item_placement_ids', None)

        pack_placements = POPackPlacement.objects.filter(
            pk__in=deleted_po_pack_placement_ids,
            po_pack__purchase_order__actual_po_club=po_club
        )

        pack_item_placements = POPackItemPlacement.objects.filter(
            pk__in=deleted_po_pack_item_placement_ids,
            po_pack_item__po_pack__purchase_order__actual_po_club=po_club
        )
        pack_placements.delete()
        pack_item_placements.delete()
        return Response({"success": True})


class AssignPurchaseOrderClubPlacementMaterial(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get_placement_objects(self, po_club, row_data):
        po_placement_id = row_data.get('po_placement_ids', [])
        row_type = row_data.get('type')
        placement_objects = POPackItemPlacement.objects.none()
        if row_type == 'po_pack_item':
            placement_objects = POPackItemPlacement.objects.filter(
                pk__in=po_placement_id,
                po_pack_item__po_pack__purchase_order__actual_po_club=po_club
            )
        elif row_type == 'po_pack':
            placement_objects = POPackItemPlacement.objects.filter(
                pk__in=po_placement_id,
                po_pack__purchase_order__actual_po_club=po_club
            )
        return placement_objects

    def post(self, request, *args, **kwargs):
        '''
            { po_placement_ids: [1,2, 3], customer_brand_material_id: 2, type: po_pack },
            type can be po_pack or po_pack_item
        '''
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        customer_brand_material_id = request.data.get('customer_brand_material_id')
        customer_brand_material = get_object_or_none_dict(CustomerBrandMaterial, pk=customer_brand_material_id)

        placement_objects = self.get_placement_objects(po_club, request.data)

        if placement_objects and customer_brand_material:
            placement_objects.update(po_material=customer_brand_material)

        errors = []
        if not placement_objects.exists():
            errors.append("Invalid placements selected")
        if not customer_brand_material:
            errors.append("Material doesn't exist. Please select a valid material.")
        response = Response({'success': True})
        if errors:
            response = Response({"success": False, "errors": errors}, status=status.HTTP_400_BAD_REQUEST)
        return response
    

class POClubPCLValuesRecalculateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):

        po_club_id = kwargs.get('pk', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        pos = po_club.get_purchase_orders()
        for po in pos:
            po.set_calculated_values()
        return Response({"success": True})
    

class POClubPreCostingPendingMaterialListAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        from marketing.models import CostingCompletedMaterial
        from materials.utils.material_utils import segregate_po_club_material_into_types_and_material
        data = []
        po_club_id = kwargs.get('po_club_id')
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        if po_club.pre_costing:
            material_types = CostingCompletedMaterial.objects.filter(costing_version=po_club.pre_costing).values_list('material', flat=True).order_by('material', 'material__display_order')
            material_qs = po_club.pre_costing.get_costing_version_materials().filter(material_detail__generic_material__user_material__in=material_types).order_by('material_detail__generic_material__user_material', 'material_detail__generic_material__user_material__display_order')
            data = segregate_po_club_material_into_types_and_material(material_qs, po_club)

        return Response(data)
    

class POClubMaterialCompleteUpdateAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, po_club, materials):
        has_errors = False
        errors = {}
        # for row in materials:
        #     material = row['material']
        #     user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
        #     if user_define_material.category == FABRIC_TRIM_TYPES:
        #         is_complete = po_club.validate_consumption_ratio_complete()
        #         if not is_complete:
        #             if user_define_material.name not in errors:
        #                 errors[user_define_material.name] = {}
        #             errors[user_define_material.name] = "Please complete markers before complete fabrics"
        #             has_errors = True
                # is_marker_create = po_club.validate_marker_create_for_fabrics()
                # if not is_marker_create:
                #     if user_define_material.name not in errors:
                #         errors[user_define_material.name] = {}
                #     errors[user_define_material.name] = "Please creates markers before complete fabrics"
                #     has_errors = True
        order_costing = po_club.pre_costing
        for row in materials:
            material = row['material']
            user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
            is_exists = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
                order_costing_version=order_costing,
                customer_brand_material__material_detail__generic_material__user_material=user_define_material,
                supplier_inquiry_detail=None
            ).exists()
            if is_exists:
                has_errors = True
                if user_define_material.name not in errors:
                    errors[user_define_material.name] = {}
                errors[user_define_material.name] = "Please complete supplier inquiry data in costing"
        return has_errors, errors
    
    def validate_deleted_material(self, po_club, materials):
        from supplier_po.models import GeneralPOMaterialQuantity
        has_errors = False
        errors = []
        for row in materials:
            material = row['material']
            user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
            if user_define_material.category == FABRIC_TRIM_TYPES:
                is_marker_create = po_club.get_markers().exists()
                if is_marker_create:
                    has_errors = True
                    message = f"Cannot delete. {user_define_material.material} marked as complete."
                    errors.append(message)
            else:
                is_exists = GeneralPOMaterialQuantity.objects.filter(material__material_detail__generic_material__user_material=user_define_material).exists()
                if is_exists:
                    has_errors = True
                    message = f"Cannot delete. {user_define_material.material} marked as complete."
                    errors.append(message)
        return has_errors, errors

    def post(self, request, *args, **kwargs):
        from marketing.models import POClubCompletedMaterial
        po_club_id = kwargs.get('po_club_id')
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        is_complete = request.data.get('is_complete')
        materials = request.data.get('material_data')

        if is_complete:
            has_errors, errors = self.validate_data(po_club, materials)
            if not has_errors:
                for row in materials:
                    material = row['material']
                    user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
                    po_club.finalize_po_packs_and_create_dependencies_from_material(user_define_material)
                    if user_define_material.category == FABRIC_TRIM_TYPES:
                        po_club.generate_po_club_purchase_order_bom(user_define_material)
                        po_club.create_po_fabric_default_widths()
                        po_club.create_fabric_material_inhouse_verification()
                    else:
                        po_club.generate_po_club_purchase_order_bom(user_define_material, True)
                        po_club.create_other_material_inhouse_verification()
                    po_club.aggregate_bom_by_material_and_supplier_inquiry_detail_and_create_bom(user_define_material)
                    http_response = Response({'success': True})
            else:
                http_response = Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        else:
            has_errors, errors = self.validate_deleted_material(po_club, materials)
            if not has_errors:
                for row in materials:
                    material = row['material']
                    user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
                    po_club_completed_material = get_object_or_none(POClubCompletedMaterial, {'material': user_define_material, 'po_club': po_club})
                    po_club_completed_material.delete()
                    http_response = Response({'success': True})
            else:
                http_response = Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class POClubMaterialCompleteRecalculateUpdateAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id')
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=kwargs.get('material_id'))
        po_club.generate_po_club_purchase_order_bom(customer_brand_material.material_detail.generic_material.user_material)
        po_club.aggregate_bom_by_material_and_supplier_inquiry_detail_and_create_bom(customer_brand_material.material_detail.generic_material.user_material)
        http_response = Response({'success': True})
        return http_response
    

class POClubOtherCostListView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_total_amount(self, deliveries):
        total_value = 0
        for delivery in deliveries:
            total_value += delivery.general_service_po_supplier_price.price * delivery.planned_send_quantity
        return total_value

    def get(self, request, *args, **kwargs):
        from marketing.models import POPackOtherCost, OtherCostType
        from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_quantity_dictionary
        po_club_id = kwargs.get('po_club_id')
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        data = []
        costing_other_cost_type_ids = po_club.get_po_pack_other_cost().filter().distinct().values_list('other_cost_type__costing_other_cost_type', flat=True)
        costing_other_cost_types = OtherCostType.objects.filter(id__in=costing_other_cost_type_ids)
        for costing_other_cost_type in costing_other_cost_types:
            budget_value = get_amount_dictionary(po_club.get_po_pack_other_cost_value_from_other_cost(costing_other_cost_type))
            used_value = get_amount_dictionary(po_club.get_po_pack_other_cost_value_used_value_from_other_cost(costing_other_cost_type))
            balance_value = get_amount_dictionary(budget_value['amount'] - used_value['amount'])
            main_data = {
                'id': costing_other_cost_type.id,
                'name': costing_other_cost_type.other_cost.name,
                'budget_value': budget_value,
                'used_value': used_value,
                'balance_value': balance_value,
                'created': False,
                'service_po_suppliers': []
            }
            content_type = ContentType.objects.get_for_model(OtherCostType)
            general_service_po_prices = GeneralServicePOSupplierPrice.objects.filter(
                entity_type=content_type, entity_id=costing_other_cost_type.id,
                general_service_po_supplier__general_service_po__po_club=po_club
            )
            general_service_po_suppliers = GeneralServicePOSupplier.objects.filter(
                id__in=general_service_po_prices.values_list('general_service_po_supplier', flat=True)
            )
            if general_service_po_suppliers.exists():
                main_data['created'] = True
            for general_service_po_supplier in general_service_po_suppliers:
                diliveries = GeneralServicePOServiceDelivery.objects.filter(general_service_po_supplier_price__general_service_po_supplier=general_service_po_supplier)
                other_cost_data = {
                    'id': general_service_po_supplier.id,
                    'supplier_name': general_service_po_supplier.supplier.name,
                    'total_value': get_amount_dictionary(self.get_total_amount(diliveries)),
                    'pay_mode': general_service_po_supplier.payment_term,
                    'pay_mode_display': general_service_po_supplier.get_payment_term_display(),
                    'service_po_display_number': general_service_po_supplier.service_po.display_number if general_service_po_supplier.service_po else None,
                    'service_po': general_service_po_supplier.service_po.service_po_file.get_object_data() if general_service_po_supplier.service_po else None
                }
                main_data['service_po_suppliers'].append(other_cost_data)
            data.append(main_data)
        return Response(data)
    

class POClubOtherCostCreateView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, po_club, other_cost_type, data):
        has_errors = False
        errors = {
        }
        budget_value = po_club.get_po_pack_other_cost_value_from_other_cost(other_cost_type)
        used_value = po_club.get_po_pack_other_cost_value_used_value_from_other_cost(other_cost_type)
        balance_value = budget_value - used_value
        if not data.get('supplier_id', None):
            has_errors = True
            errors['supplier_id'] = 'Select supplier.'

        if not data.get('pay_mode', None):
            has_errors = True
            errors['pay_mode'] = 'Select payment term.'

        if not data.get('planned_send_date', None):
            has_errors = True
            errors['planned_send_date'] = 'Select planned send date.'

        if not data.get('actual_send_date', None):
            has_errors = True
            errors['actual_send_date'] = 'Select actual send date.'

        if not data.get('quantity', None):
            has_errors = True
            errors['quantity'] = 'Enter quantity.'

        if not data.get('other_cost_type_description', None):
            has_errors = True
            errors['other_cost_type_description'] = 'Enter description.'

        if not data.get('quantity', None):
            has_errors = True
            errors['quantity'] = 'Select quantity.'

        if not data.get('unit_price', None):
            has_errors = True
            errors['unit_price'] = 'Enter unit price.'

        if not data.get('currency', None):
            has_errors = True
            errors['currency'] = 'Select currency.'

        if not data.get('quantity_unit', None):
            has_errors = True
            errors['quantity_unit'] = 'Select quantity_unit.'

        if data.get('unit_price', None) and data.get('quantity', None):
            total_price = data.get('unit_price') * data.get('quantity')
            if total_price > balance_value:
                has_errors = True
                errors['balance_value'] = 'Total value exceed balance value.'
        return has_errors, errors

    def post(self, request, po_club_id):
        from marketing.models import OtherCostType
        data = request.data
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        other_cost = get_object_or_404(OtherCostType, id=data['other_cost_type_id'])
        has_errors, errors = self.validate_data(po_club, other_cost, data)

        if not has_errors:
            supplier = get_object_or_404(Supplier, pk=data['supplier_id'])
            general_service_po_supplier_id = data['general_service_po_supplier_id']
            payment_term = data['pay_mode']
            general_service_po = po_club.get_or_create_po_club_general_service_po()
            if general_service_po_supplier_id:
                general_service_po_supplier = get_object_or_none(GeneralServicePOSupplier, {'pk': general_service_po_supplier_id})
            else:
                general_service_po_supplier = GeneralServicePOSupplier.objects.create(
                    general_service_po=general_service_po,
                    supplier=supplier
                )
            
            content_type = ContentType.objects.get_for_model(OtherCostType)
            service_detail = {
                'id': other_cost.id,
                'name': other_cost.name,
                'po_club_id': po_club.id,
                'other_cost_type_description': data['other_cost_type_description'],
                'remark': data['remark']
            }
            general_service_po_supplier_price, created = GeneralServicePOSupplierPrice.objects.get_or_create(
                general_service_po_supplier=general_service_po_supplier,
                supplier_inquiry_detail=None,
                entity_type=content_type,
                entity_id=other_cost.id,
                service_detail=service_detail
            )
            general_service_po_supplier_price.price = data['unit_price']
            general_service_po_supplier_price.price_currency = data['currency']
            general_service_po_supplier_price.lead_time = None
            general_service_po_supplier_price.costing_price = data['unit_price']
            general_service_po_supplier_price.costing_price_units = data['quantity_unit']
            general_service_po_supplier_price.save()

            general_service_po_service, created = GeneralServicePOService.objects.get_or_create(
                general_service_po=general_service_po,
                entity_type=content_type,
                entity_id=other_cost.id,
                service_detail=service_detail
            )
            general_service_po.service_detail = service_detail
            general_service_po.save()

            general_service_po_delivery = GeneralServicePOServiceDelivery.objects.create(
                general_service_po_service=general_service_po_service,
                general_service_po_supplier_price=general_service_po_supplier_price,
                planned_send_quantity=data['quantity'],
                actual_send_date_quantity=data['quantity'],
            )
            general_service_po_delivery.planned_send_date = data['planned_send_date']
            general_service_po_delivery.planned_send_quantity_units = data['quantity_unit']
            general_service_po_delivery.actual_send_date = data['actual_send_date']
            general_service_po_delivery.actual_send_date_quantity_units = data['quantity_unit']
            general_service_po_delivery.save()

            general_service_po_supplier.payment_term = payment_term
            general_service_po_supplier.save()

            http_response = Response({'status': True, 'general_service_po_supplier_id': general_service_po_supplier.id})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)

        return http_response
    

class POClubOtherCostUpdateView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, po_club, other_cost_type, data):
        has_errors = False
        errors = {
        }
        budget_value = po_club.get_po_pack_other_cost_value_from_other_cost(other_cost_type)
        used_value = po_club.get_po_pack_other_cost_value_used_value_from_other_cost(other_cost_type)
        balance_value = budget_value - used_value

        if not data.get('planned_send_date', None):
            has_errors = True
            errors['planned_send_date'] = 'Select planned send date.'

        if not data.get('actual_send_date', None):
            has_errors = True
            errors['actual_send_date'] = 'Select actual send date.'

        if not data.get('quantity', None):
            has_errors = True
            errors['quantity'] = 'Enter quantity.'

        if not data.get('other_cost_type_description', None):
            has_errors = True
            errors['other_cost_type_description'] = 'Enter description.'

        if not data.get('quantity', None):
            has_errors = True
            errors['quantity'] = 'Select quantity.'

        if not data.get('unit_price', None):
            has_errors = True
            errors['unit_price'] = 'Enter unit price.'

        if not data.get('quantity_unit', None):
            has_errors = True
            errors['quantity_unit'] = 'Select quantity_unit.'

        if data.get('unit_price', None) and data.get('quantity', None):
            total_price = data.get('unit_price') * data.get('quantity')
            if total_price > balance_value:
                has_errors = True
                errors['balance_value'] = 'Total value exceed balance value.'
        return has_errors, errors

    def put(self, request, general_service_po_service_delivery_id, other_cost_type_id):
        from marketing.models import OtherCostType
        data = request.data
        other_cost = get_object_or_404(OtherCostType, id=other_cost_type_id)
        general_service_po_service_delivery = get_object_or_none(GeneralServicePOServiceDelivery, {'pk': general_service_po_service_delivery_id})
        has_errors, errors = self.validate_data(general_service_po_service_delivery.general_service_po_service.general_service_po.po_club, other_cost, data)

        if not has_errors:
            general_service_po_service_delivery.general_service_po_supplier_price.price = data['unit_price']
            general_service_po_service_delivery.general_service_po_supplier_price.lead_time = None
            general_service_po_service_delivery.general_service_po_supplier_price.costing_price = data['unit_price']
            general_service_po_service_delivery.general_service_po_supplier_price.costing_price_units = data['quantity_unit']
            general_service_po_service_delivery.general_service_po_supplier_price.save()
            general_service_po_service_delivery.actual_send_date = data['actual_send_date']
            general_service_po_service_delivery.planned_send_date = data['planned_send_date']
            general_service_po_service_delivery.save()

            http_response = Response({'status': True, 'general_service_po_supplier_id': general_service_po_service_delivery.general_service_po_supplier_price.general_service_po_supplier.id})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)

        return http_response
    

class POClubOtherCostDetailView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        from marketing.models import POPackOtherCost, OtherCostType
        from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_quantity_dictionary, get_material_unit_category
        costing_other_cost_type = get_object_or_404(OtherCostType, pk=kwargs.get('other_cost_type_id'))
        general_service_po_supplier = get_object_or_404(GeneralServicePOSupplier, pk=kwargs.get('general_service_po_supplier_id'))
        data = {}
        budget_value = get_amount_dictionary(general_service_po_supplier.general_service_po.po_club.get_po_pack_other_cost_value_from_other_cost(costing_other_cost_type))
        used_value = get_amount_dictionary(general_service_po_supplier.general_service_po.po_club.get_po_pack_other_cost_value_used_value_from_other_cost(costing_other_cost_type))
        balance_value = get_amount_dictionary(budget_value['amount'] - used_value['amount'])

        content_type = ContentType.objects.get_for_model(OtherCostType)
        general_service_po_supplier_prices = GeneralServicePOSupplierPrice.objects.filter(
            entity_type=content_type, entity_id=costing_other_cost_type.id,
            general_service_po_supplier=general_service_po_supplier
        )
        deliveries = GeneralServicePOServiceDelivery.objects.filter(general_service_po_supplier_price__in=general_service_po_supplier_prices)
        data = {
            'id': general_service_po_supplier.id,
            'supplier_name': general_service_po_supplier.supplier.name,
            'supplier_id': general_service_po_supplier.supplier.id,
            'other_cost_type_id': costing_other_cost_type.id,
            'other_cost_type_name': costing_other_cost_type.other_cost.name,
            'budget_value': budget_value,
            'used_value': used_value,
            'balance_value': balance_value,
            'pay_mode': general_service_po_supplier.payment_term,
            'other_cost_types': []
        }
        
        for delivery in deliveries:
            total_price = delivery.general_service_po_supplier_price.price * delivery.planned_send_quantity
            other_cost_data = {
                'id': delivery.id,
                'name': delivery.general_service_po_supplier_price.service_detail.get('other_cost_type_description'),
                'service_category': delivery.general_service_po_supplier_price.service_detail.get('name'),
                'supplier_name': delivery.general_service_po_supplier_price.general_service_po_supplier.supplier.name,
                'quantity': get_quantity_dictionary(delivery.planned_send_quantity, delivery.general_service_po_supplier_price.costing_price_units),
                'price': get_amount_dictionary(delivery.general_service_po_supplier_price.price),
                'total_price': get_amount_dictionary(total_price),
                'planned_send_date': delivery.planned_send_date,
                'actual_send_date': delivery.actual_send_date

            }
            data['other_cost_types'].append(other_cost_data)
        return Response(data)
    

class POClubOtherCostDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, *args, **kwargs):
        all_delete = False
        general_service_po_service_delivery = get_object_or_404(GeneralServicePOServiceDelivery, pk=kwargs.get('general_service_po_service_delivery_id'))
        general_service_po_service_deliveries = GeneralServicePOServiceDelivery.objects.filter(general_service_po_supplier_price__general_service_po_supplier=general_service_po_service_delivery.general_service_po_supplier_price.general_service_po_supplier)
        if general_service_po_service_deliveries.count() == 1:
            general_service_po_supplier = general_service_po_service_delivery.general_service_po_supplier_price.general_service_po_supplier
            general_service_po_supplier_price = general_service_po_service_delivery.general_service_po_supplier_price
            general_service_po_service = general_service_po_service_delivery.general_service_po_service
            general_service_po_service_delivery.delete()
            general_service_po_supplier_price.delete()
            general_service_po_service.delete()
            general_service_po_supplier.delete()
            all_delete = True
        else:
            general_service_po_supplier = general_service_po_service_delivery.general_service_po_supplier_price.general_service_po_supplier
            general_service_po_supplier_price = general_service_po_service_delivery.general_service_po_supplier_price
            general_service_po_service_delivery.delete()
            general_service_po_supplier_price.delete()
        # else:
        #     general_service_po_deliveries = general_service_po_supplier_price.generalserviceposervicedelivery_set.all()
        #     general_service_po_supplier = general_service_po_supplier_price.general_service_po_supplier
        #     general_service_po_service = GeneralServicePOService.objects.filter(general_service_po=general_service_po_supplier_price.general_service_po_supplier.general_service_po)
        #     #general_service_po_service.delete()
        #     #general_service_po_supplier_price.delete()
        #     print(general_service_po_deliveries)
        #     for general_service_po_delivery in general_service_po_deliveries:
        #         pass
        #         #general_service_po_delivery.delete()
        #     #general_service_po_supplier.delete()
        return Response({'success': True, 'all_delete': all_delete})


class POClubGenerateGeneralServicePOServicesView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        data = {'status': "success"}
        return_status = status.HTTP_200_OK
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        po_club.generate_general_service_po_services()
        return Response(data=data, status=return_status)


class POClubPackQuantityListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def aggregate_po_pack_quantities(self, po_club):
        data = {}
        aggregated_data = {}
        purchase_orders = po_club.get_purchase_orders()
        total_order_quantity = 0
        for purchase_order in purchase_orders:
            po_packs = purchase_order.get_po_packs().order_by('po_size__order_size__size__sorting_order')
            for po_pack in po_packs:
                key = (
                    po_pack.po_country.order_country.id,
                    po_pack.po_size.order_size.id,
                    po_pack.po_colorway.order_colorway.id
                )

                if key in aggregated_data:
                    aggregated_data[key]['quantity'] += po_pack.quantity
                    total_order_quantity += po_pack.quantity
                else:
                    total_order_quantity += po_pack.quantity
                    aggregated_data[key] = {
                        'po_pack_id': po_pack.id,
                        'po_pack_display': po_pack.get_po_pack_display(),
                        'quantity': po_pack.quantity
                    }
        data = {
            'total_order_quantity': total_order_quantity,
            'pack_summary': list(aggregated_data.values())
        }
        return data

    def get(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        data = self.aggregate_po_pack_quantities(po_club)
        return Response(data)


class POClubPackQuantityPurchaesOrderDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_size_wise_pack_quantity_amoung_purchase_orders(self, source_po_pack):
        data = {
            'pack_summary': [],
            'total_order_quantity': 0
        }
        pack_summary = []
        purchase_orders = source_po_pack.purchase_order.actual_po_club.get_purchase_orders().order_by('id')
        total_order_quantity = 0
        for purchase_order in purchase_orders:
            po_pack = purchase_order.get_po_packs().get(
                purchase_order=purchase_order,
                po_country__order_country=source_po_pack.po_country.order_country,
                po_size__order_size=source_po_pack.po_size.order_size,
                po_colorway__order_colorway=source_po_pack.po_colorway.order_colorway
            )
            po_data = {
                'purchase_order_display_number': po_pack.purchase_order.display_number,
                'quantity': po_pack.quantity
            }
            total_order_quantity += po_pack.quantity
            pack_summary.append(po_data)
        data = {
            'pack_display_number': source_po_pack.get_po_pack_display(),
            'total_order_quantity': total_order_quantity,
            'pack_summary': pack_summary
        }
        return data

    def get(self, request, po_pack_id):
        po_pack = get_object_or_404(POPack, pk=po_pack_id)
        data = self.get_size_wise_pack_quantity_amoung_purchase_orders(po_pack)
        return Response(data)


class POClubExportFabricReportView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        fabric_report_exporter = FabricReportExporter(po_club)
        return fabric_report_exporter.export_excel_report()


class BOMChangeRequestTypeListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        data = []
        for type in BOMChangeRequestChangeType.CHANGE_TYPES:
            data.append({"id": type[0], "name": type[1]})
        return Response(data)


class BOMChangeRequestListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = BOMChangeRequest.objects.all().order_by('-id')
    serializer_class = BOMChangeRequestSerailizer
    pagination_class = GeneralLargeResultsSetPagination


class BOMChangeRequestByPOClubListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = BOMChangeRequest.objects.all().order_by('-id')
    serializer_class = BOMChangeRequestSerailizer

    def get_queryset(self):
        qs = super().get_queryset()
        club_id = self.kwargs.get('po_club_id', None)
        po_club_ct = ContentType.objects.get_for_model(ActualPOClub)
        qs = qs.filter(entity_type=po_club_ct, entity_id=club_id)
        return qs


class BOMChangeRequestDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = BOMChangeRequest.objects.all().order_by('-id')
    serializer_class = BOMChangeRequestDetailSerailizer


class BOMChangeRequestUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_supplier_inquiry_data(self, supplier_inquiry_data, material):
        has_errors = False
        errors = {}

        if material.material_category == FABRIC_TRIM_TYPES:
            if not supplier_inquiry_data.get('cutting_width'):
                has_errors = True
                errors['cutting_width'] = 'Please enter cutting width.'

            if not supplier_inquiry_data.get('cutting_width_unit'):
                has_errors = True
                errors['cutting_width_unit'] = 'Please select cutting width units.'

        if not supplier_inquiry_data.get('cost_per_unit'):
            has_errors = True
            errors['cost_per_unit'] = 'Please enter cost per unit.'

        if not supplier_inquiry_data.get('costing_unit'):
            has_errors = True
            errors['costing_unit'] = 'Please enter minimum order costing unit.'

        if not supplier_inquiry_data.get('expiration_date'):
            has_errors = True
            errors['expiration_date'] = 'Please select expiration date.'

        if not supplier_inquiry_data.get('lead_time'):
            has_errors = True
            errors['lead_time'] = 'Please enter lead time.'

        if not supplier_inquiry_data.get('excess_threshold'):
            has_errors = True
            errors['excess_threshold'] = 'Please enter excess_threshold.'

        if not supplier_inquiry_data.get('cost_per_unit_type'):
            has_errors = True
            errors['cost_per_unit_type'] = 'Please select cost per unit type.'

        if not supplier_inquiry_data.get('ship_mode'):
            has_errors = True
            errors['ship_mode'] = 'Please select ship mode.'

        if not supplier_inquiry_data.get('pay_mode'):
            has_errors = True
            errors['pay_mode'] = 'Please select pay mode.'

        if not supplier_inquiry_data.get('supplier_id'):
            has_errors = True
            errors['supplier_id'] = 'Please select supplier.'

        if not supplier_inquiry_data.get('supplier_material_reference_code'):
            has_errors = True
            errors['supplier_material_reference_code'] = 'Please enter material_reference_code.'

        return has_errors, errors

    def validate_material_change_data(self, data):
        has_errors = False
        errors = {}

        if not data.get('new_material'):
            has_errors = True
            errors['new_material'] = 'Please select new material.'

        if not data.get('old_material'):
            has_errors = True
            errors['old_material'] = 'Please select material.'

        if not data.get('pack_ids'):
            has_errors = True
            errors['pack_ids'] = 'Please select placements.'

        if not data.get('reason'):
            has_errors = True
            errors['reason'] = 'Please enter reason.'

        supplier_inquiry_data = data['supplier_inquiry_data']
        new_material = None
        if data.get('new_material'):
            new_material = get_object_or_404(CustomerBrandMaterial, pk=data.get('new_material'))
        inquiry_error_state, inquiry_errors = self.validate_supplier_inquiry_data(supplier_inquiry_data, new_material)
        if inquiry_error_state:
            has_errors = True
            errors['supplier_inquiry_errors'] = inquiry_errors
        return has_errors, errors

    def update_bcr_material_change(self, bom_change_request_type, data):
        supplier_inquiry_data = data['supplier_inquiry_data']
        new_material = get_object_or_404(CustomerBrandMaterial, pk=data['new_material'])
        old_material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        supplier = get_object_or_404(Supplier, pk=supplier_inquiry_data['supplier_id'])

        #void_markers = data['avoid_markers']
        select_markers = data['select_marker']

        supplier_material_reference_code = None
        if supplier_inquiry_data['supplier_material_reference_code']:
            supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(
                customer_brand_material=new_material,
                supplier=supplier,
                supplier_material_reference_code=supplier_inquiry_data['supplier_material_reference_code']
            )

        for bom_change_request_material_change in bom_change_request_type.bomchangerequestmaterialchange_set.all():
            cutting_width = supplier_inquiry_data['cutting_width'] if supplier_inquiry_data['cutting_width'] else None
            ex_work_price = supplier_inquiry_data['ex_work_price'] if supplier_inquiry_data['ex_work_price'] else None
            minimum_order_quantity = supplier_inquiry_data['minimum_order_quantity'] if supplier_inquiry_data['minimum_order_quantity'] else None
            bom_change_request_material_change.old_material = old_material
            bom_change_request_material_change.new_material = new_material
            bom_change_request_material_change.supplier=supplier
            bom_change_request_material_change.cutting_width=cutting_width
            bom_change_request_material_change.cutting_width_unit=supplier_inquiry_data['cutting_width_unit']
            bom_change_request_material_change.costing_unit=supplier_inquiry_data['costing_unit']
            bom_change_request_material_change.cost_per_unit=supplier_inquiry_data['cost_per_unit']
            bom_change_request_material_change.fob_price=supplier_inquiry_data['fob_price']
            bom_change_request_material_change.cif_price=supplier_inquiry_data['cif_price']
            bom_change_request_material_change.transport_charges=supplier_inquiry_data['transport_charges']
            bom_change_request_material_change.ex_work_price=ex_work_price
            bom_change_request_material_change.expiration_date=supplier_inquiry_data['expiration_date']
            bom_change_request_material_change.lead_time=supplier_inquiry_data['lead_time']
            bom_change_request_material_change.minimum_order_quantity=minimum_order_quantity
            bom_change_request_material_change.minimum_order_quantity_units=supplier_inquiry_data['minimum_order_quantity_units']
            bom_change_request_material_change.excess_threshold=supplier_inquiry_data['excess_threshold']
            bom_change_request_material_change.cost_per_unit_type=supplier_inquiry_data['cost_per_unit_type']
            bom_change_request_material_change.ship_mode=supplier_inquiry_data['ship_mode']
            bom_change_request_material_change.pay_mode=supplier_inquiry_data['pay_mode']
            bom_change_request_material_change.supplier_inquiry_material_code = supplier_material_reference_code
            bom_change_request_material_change.save()

            for row in data['ratios']:
                entity_type = None
                if new_material.material_category == SEWING_TRIM_TYPES:
                    print("update state")
                    entity_type = ContentType.objects.get_for_model(POPackItemPlacement)
                elif new_material.material_category == PACKAGING_TYPES:
                    entity_type = ContentType.objects.get_for_model(POPackPlacement)

                if entity_type:
                    bcr_material_applied_pack_and_pack_item_placements, created = BOMChangeRequestMaterialAppliedPackandPackItemPlacements.objects.get_or_create(
                        entity_type=entity_type,
                        entity_id=row['id'],
                        bom_change_request_material_change=bom_change_request_material_change
                    )
                    bcr_material_applied_pack_and_pack_item_placements.new_consumption_ratio = row['consumption']
                    bcr_material_applied_pack_and_pack_item_placements.new_wastage = row['wastage']
                    bcr_material_applied_pack_and_pack_item_placements.save()

            if new_material.material_category == FABRIC_TRIM_TYPES:
                for pack_item_id in data['checked_ids']:
                    entity_type = ContentType.objects.get_for_model(POPackItemPlacement)
                    bcr_material_applied_pack_and_pack_item_placements, created = BOMChangeRequestMaterialAppliedPackandPackItemPlacements.objects.get_or_create(
                        entity_type=entity_type,
                        entity_id=pack_item_id,
                        bom_change_request_material_change=bom_change_request_material_change
                    )
                    bcr_material_applied_pack_and_pack_item_placements.save()

                void_marker_ids = []
                marker_ids = []
                # for void_marker_id in void_markers:
                #     void_marker = get_object_or_404(POFabricMarker, pk=void_marker_id)
                #     bom_void_marker, created = BOMChangeRequestFabricVoidMarker.objects.get_or_create(
                #         bom_change_request_type=bom_change_request_type,
                #         void_marker=void_marker
                #     )
                #     void_marker_ids.append(bom_void_marker.id)
                for marker_id in select_markers:
                    marker = get_object_or_404(POFabricMarker, pk=marker_id)
                    bom_marker, created = BOMChangeRequestFabricMarker.objects.get_or_create(
                        bom_change_request_type=bom_change_request_type,
                        marker=marker
                    )
                    marker_ids.append(bom_marker.id)
                if void_marker_ids:
                    BOMChangeRequestFabricVoidMarker.objects.filter(
                        bom_change_request_type=bom_change_request_type
                    ).exclude(id__in=void_marker_ids).delete()
                if marker_ids:
                    BOMChangeRequestFabricMarker.objects.filter(
                        bom_change_request_type=bom_change_request_type
                    ).exclude(id__in=marker_ids).delete()
        bom_change_request_type.bom_change_request.reason = data['reason']
        bom_change_request_type.bom_change_request.save()
        return bom_change_request_type

    def validate_price_data(self, data):
        has_errors = False
        errors = {
            'reason': None,
            'material_details':{}
        }
        if not data['reason']:
            errors['reason'] = 'Enter reason.'
            has_errors = True
        # for row in data['material_details']:
        #     if not row['new_price_units']:
        #         has_errors = True
        #         if row['material_price_id'] not in errors['material_details']:
        #             material_price_id = row['material_price_id']
        #             errors['material_details'][material_price_id] = None
        #         errors['material_details'][material_price_id] = 'Select price units.'
        #     if not row['new_price']:
        #         has_errors = True
        #         if row['material_price_id'] not in errors['material_details']:
        #             material_price_id = row['material_price_id']
        #             errors['material_details'][material_price_id] = None
        #         errors['material_details'][material_price_id] = 'Enter price.'
        return has_errors, errors

    def update_bcr_price_change(self, bom_change_request_type, data):
        for row in data['material_details']:
            material_price = get_object_or_404(GeneralPOSupplierMaterialPrice, pk=row['material_price_id'])
            bcr_price_change, created = BOMChangeRequestPriceChange.objects.get_or_create(
                bom_change_request_type=bom_change_request_type,
                material_price=material_price
            )
            bcr_price_change.new_price=row['new_price']
            bcr_price_change.new_price_units=row['new_price_units']
            bcr_price_change.save()
        bom_change_request_type.bom_change_request.reason = data['reason']
        bom_change_request_type.bom_change_request.save()
        return bom_change_request_type

    def validate_consumption_data(self, data):
        has_errors = False
        errors = {
            'reason': None,
            'material_details':{}
        }
        if not data['reason']:
            errors['reason'] = 'Enter reason.'
            has_errors = True
        return has_errors, errors

    def update_bcr_consumption_change(self, bom_change_request_type, data):
        consumption_data = []
        material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        if material.material_category in [SEWING_TRIM_TYPES, PACKAGING_TYPES]:
            for row in data['ratios']:
                entity_type = None
                entity = None
                if material.material_category == SEWING_TRIM_TYPES:
                    entity_type = ContentType.objects.get_for_model(POPackItemPlacement)
                    entity = get_object_or_404(POPackItemPlacement, pk=row['id'])
                elif material.material_category == PACKAGING_TYPES:
                    entity_type = ContentType.objects.get_for_model(POPackPlacement)
                    entity = get_object_or_404(POPackPlacement, pk=row['id'])
                if entity_type and entity:
                    bcr_consumption_change, created = BOMChangeRequestConsumptionChange.objects.get_or_create(
                        bom_change_request_type = bom_change_request_type,
                        entity_type=entity_type,
                        entity_id=entity.id
                    )
                    bcr_consumption_change.new_consumption_ratio = row['consumption']
                    bcr_consumption_change.new_wastage = row['wastage']
                    bcr_consumption_change.save()
        elif material.material_category == FABRIC_TRIM_TYPES:
            #void_markers = data['avoid_markers']
            select_markers = data['select_marker']
            void_marker_ids = []
            marker_ids = []
            # for void_marker_id in void_markers:
            #     void_marker = get_object_or_404(POFabricMarker, pk=void_marker_id)
            #     bom_void_marker, created = BOMChangeRequestFabricVoidMarker.objects.get_or_create(
            #         bom_change_request_type=bom_change_request_type,
            #         void_marker=void_marker
            #     )
            #     void_marker_ids.append(bom_void_marker.id)
            for marker_id in select_markers:
                marker = get_object_or_404(POFabricMarker, pk=marker_id)
                bom_marker, created = BOMChangeRequestFabricMarker.objects.get_or_create(
                    bom_change_request_type=bom_change_request_type,
                    marker=marker
                )
                marker_ids.append(bom_marker.id)
            if void_marker_ids:
                BOMChangeRequestFabricVoidMarker.objects.filter(
                    bom_change_request_type=bom_change_request_type
                ).exclude(id__in=void_marker_ids).delete()
            if marker_ids:
                BOMChangeRequestFabricMarker.objects.filter(
                    bom_change_request_type=bom_change_request_type
                ).exclude(id__in=marker_ids).delete()

        bom_change_request_type.bom_change_request.reason = data['reason']
        bom_change_request_type.bom_change_request.save()
        return bom_change_request_type

    def validate_supplier_data(self, data):
        has_errors = False
        errors = {
            'reason': None,
            'material_details':{}
        }
        if not data['reason']:
            errors['reason'] = 'Enter reason.'
            has_errors = True

        supplier_inquiry_data = data['supplier_inquiry_data']
        old_material = None
        if data.get('old_material'):
            old_material = get_object_or_404(CustomerBrandMaterial, pk=data.get('old_material'))
        inquiry_error_state, inquiry_errors = self.validate_supplier_inquiry_data(supplier_inquiry_data, old_material)
        if inquiry_error_state:
            has_errors = True
            errors['supplier_inquiry_errors'] = inquiry_errors

        return has_errors, errors

    def update_bcr_supplier_change(self, bom_change_request_type, data):
        supplier_inquiry_data = data['supplier_inquiry_data']
        cancelled_spos = data['cancelled_spos']
        material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        supplier = get_object_or_404(Supplier, pk=supplier_inquiry_data['supplier_id'])

        supplier_material_reference_code = None
        if supplier_inquiry_data['supplier_material_reference_code']:
            supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(
                customer_brand_material=material,
                supplier=supplier,
                supplier_material_reference_code=supplier_inquiry_data['supplier_material_reference_code']
            )

        for bom_change_request_supplier_change in bom_change_request_type.bomchangerequestsupplierchange_set.all():
            bom_change_request_supplier_change.material = material
            bom_change_request_supplier_change.supplier = supplier
            bom_change_request_supplier_change.cutting_width = supplier_inquiry_data['cutting_width']
            bom_change_request_supplier_change.cutting_width_unit = supplier_inquiry_data['cutting_width_unit']
            bom_change_request_supplier_change.costing_unit = supplier_inquiry_data['costing_unit']
            bom_change_request_supplier_change.cost_per_unit = supplier_inquiry_data['cost_per_unit']
            bom_change_request_supplier_change.fob_price = supplier_inquiry_data['fob_price']
            bom_change_request_supplier_change.cif_price = supplier_inquiry_data['cif_price']
            bom_change_request_supplier_change.transport_charges = supplier_inquiry_data['transport_charges']
            bom_change_request_supplier_change.ex_work_price = supplier_inquiry_data['ex_work_price']
            bom_change_request_supplier_change.expiration_date = supplier_inquiry_data['expiration_date']
            bom_change_request_supplier_change.lead_time = supplier_inquiry_data['lead_time']
            bom_change_request_supplier_change.minimum_order_quantity = supplier_inquiry_data['minimum_order_quantity']
            bom_change_request_supplier_change.minimum_order_quantity_units = supplier_inquiry_data['minimum_order_quantity_units']
            bom_change_request_supplier_change.excess_threshold = supplier_inquiry_data['excess_threshold']
            bom_change_request_supplier_change.cost_per_unit_type = supplier_inquiry_data['cost_per_unit_type']
            bom_change_request_supplier_change.ship_mode = supplier_inquiry_data['ship_mode']
            bom_change_request_supplier_change.pay_mode = supplier_inquiry_data['pay_mode']
            bom_change_request_supplier_change.supplier_inquiry_material_code = supplier_material_reference_code
            bom_change_request_supplier_change.save()

        supplier_pos = SupplierPO.objects.filter(id__in=cancelled_spos)
        for supplier_po in supplier_pos:
            supplier_po.state = SupplierPO.CANCEL_STATE
            supplier_po.save()
        return bom_change_request_type

    def post(self, request, pk):
        data = request.data
        bom_change_request_type = get_object_or_404(BOMChangeRequestChangeType, pk=data['bom_change_request_change_type_id'])
        if bom_change_request_type.state == BOMChangeRequestChangeType.MATERIAL_CHANGE:
            has_errors, errors = self.validate_material_change_data(data)
            if not has_errors:
                self.update_bcr_material_change(bom_change_request_type, data)
                http_response = Response({'status': True})
            else:
                http_response = Response({'status': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        elif bom_change_request_type.state == BOMChangeRequestChangeType.PRICE_CHANGE:
            has_errors, errors = self.validate_price_data(data)
            if not has_errors:
                self.update_bcr_price_change(bom_change_request_type, data)
                http_response = Response({'status': True})
            else:
                http_response = Response({'status': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        elif bom_change_request_type.state == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
            has_errors, errors = self.validate_price_data(data)
            if not has_errors:
                self.update_bcr_consumption_change(bom_change_request_type, data)
                http_response = Response({'status': True})
            else:
                http_response = Response({'status': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        elif bom_change_request_type.state == BOMChangeRequestChangeType.SUPPLIER_CHANGE:
            has_errors, errors = self.validate_supplier_data(data)
            if not has_errors:
                self.update_bcr_supplier_change(bom_change_request_type, data)
                http_response = Response({'status': True})
            else:
                http_response = Response({'status': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response

class BOMChangeRequestMaterialPriceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_club_id):
        data = {
            Material.FABRIC_MATERIAL: [],
            SEWING_TRIM_TYPES: [],
            PACKAGING_TYPES: []
        }
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        material_prices = GeneralPOSupplierMaterialPrice.objects.filter(general_po_supplier__general_po__po_club=po_club)
        for material_price in material_prices:
            headers = material_price.supplier_material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(
                material_price.supplier_material.customer_brand_material.material_detail.generic_material.user_material.name
            )
            attributes = material_price.supplier_material.customer_brand_material.get_attributes()
            inquiry_data = {
                'id': material_price.id,
                'headers': headers,
                'attributes': attributes,
                'old_price': get_amount_dictionary(material_price.order_price, material_price.order_price_units),
                'supplier_po_file': material_price.general_po_supplier.supplier_po.supplier_po_file.get_object_data() if material_price.general_po_supplier.supplier_po and material_price.general_po_supplier.supplier_po.supplier_po_file else None,
                'supplier_po_display_name': material_price.general_po_supplier.supplier_po.display_number if material_price.general_po_supplier.supplier_po else None
            }
            if material_price.supplier_material.customer_brand_material.material_category == FABRIC_TRIM_TYPES:
                data[FABRIC_TRIM_TYPES].append(inquiry_data)
            elif material_price.supplier_material.customer_brand_material.material_category == SEWING_TRIM_TYPES:
                data[SEWING_TRIM_TYPES].append(inquiry_data)
            elif material_price.supplier_material.customer_brand_material.material_category == PACKAGING_TYPES:
                data[PACKAGING_TYPES].append(inquiry_data)
        return Response(data)


class BOMChangeRequestMaterialPriceCreateView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_material_in_pending_approve(self, data, po_club):
        is_material_in_pending_bcr = False
        material_ids = []
        for row in data.get('material_details'):
            material_price = get_object_or_none(GeneralPOSupplierMaterialPrice, {'pk': row['material_price_id']})
            if material_price:
                material_ids.append(material_price.supplier_material.customer_brand_material.id)

        content_type = ContentType.objects.get_for_model(ActualPOClub)
        bcrs = BOMChangeRequest.objects.filter(entity_type=content_type, entity_id=po_club.id)
        for bcr in bcrs:
            is_material_in_pending_bcr = bcr.validate_material_in_pending_approve(material_ids)
        return is_material_in_pending_bcr

    def validate_data(self, data, po_club):
        has_errors = False
        errors = {}

        if not data.get('reason'):
            has_errors = True
            errors['reason'] = 'Please enter reason.'

        if not data.get('material_details'):
            has_errors = True
            errors['material_details'] = 'Please enter prices.'
        is_material_in_pending_bcr = self.validate_material_in_pending_approve(data, po_club)
        if is_material_in_pending_bcr:
            has_errors = True
            errors['reason'] = 'Selected material in pending bcr.'
        return has_errors, errors

    def post(self, request, po_club_id):
        from marketing.helpers.po_club_bcr_change_request import POClubBOMChangeRequestHelper
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        po_club_helper = POClubBOMChangeRequestHelper(po_club)
        data = request.data
        reason = data['reason']
        material_details = data['material_details']
        has_errors, errors = self.validate_data(data, po_club)
        if not has_errors:
            created_data = po_club_helper.create_bcr(request.user, reason, BOMChangeRequestChangeType.PRICE_CHANGE, material_details)
            http_response = Response({'success': True})
        else:
            http_response = Response({'success': True, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class BOMChangeRequestMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_materials(self, po_club):
        material_ids = list(POPackItemPlacement.objects.filter(po_pack_item__po_pack__purchase_order__actual_po_club=po_club).values_list('po_material', flat=True)) + \
                         list(POPackPlacement.objects.filter(po_pack__purchase_order__actual_po_club=po_club).values_list('po_material', flat=True))
        user_define_material_ids = POClubCompletedMaterial.objects.filter(
            po_club=po_club
        ).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids, material_detail__generic_material__user_material__id__in=user_define_material_ids)
        return materials

    def get(self, request, po_club_id):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        materials = self.get_materials(po_club)
        for material in materials:
            material_data = {
                'id': material.id,
                'name': material.verbose_reference_code,
            }
            data.append(material_data)
        return Response(data)


# class BOMChangeRequestMaterialListView(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, ]

#     def get_materials(self, po_club):
#         material_ids = list(POPackItemPlacement.objects.filter(po_pack_item__po_pack__purchase_order__actual_po_club=po_club).values_list('po_material', flat=True)) + \
#                         list(POPackPlacement.objects.filter(po_pack__purchase_order__actual_po_club=po_club).values_list('po_material', flat=True))
#         materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
#         return materials

#     def get(self, request, po_club_id):
#         data = []
#         po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
#         materials = self.get_materials(po_club)
#         for material in materials:
#             material_data = {
#                 'id': material.id,
#                 'name': material.verbose_reference_code,
#             }
#             data.append(material_data)
#         return Response(data)

class BOMChangeRequestMaterialPlacementListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_placements(self, po_club, material, ):
        placement_ids = list(POPackItemPlacement.objects.filter(po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club).values_list('costing_pack_item_placement__item_attribute_other', flat=True)) + \
                        list(POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club).values_list('costing_pack_placement__item_attribute_other', flat=True))
        placements = OrderPlacement.objects.filter(id__in=placement_ids)
        return placements

    def get(self, request, po_club_id, material_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        placements = self.get_placements(po_club, material)
        data = {
            'material_category': material.material_category,
            'placements': []
        }
        for placement in placements:
            placement_data = {
                'id': placement.id,
                'placement_name': placement.name
            }
            data['placements'].append(placement_data)
        return Response(data)


class BOMChangeRequestChangeMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_placements(self, po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids):
        pack_item_placements = POPackItemPlacement.objects.filter(
            po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club,
        )
        pack_placements = POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club)
        if po_item_ids:
            po_pack_items = POPackItem.objects.filter(po_item__id__in=po_item_ids)
            pack_item_placements = pack_item_placements.filter(
            po_pack_item__in=po_pack_items
        )
        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__id__in=po_club_sizes)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_size__in=po_sizes)
            pack_placements = pack_placements.filter(po_pack__po_size__in=po_sizes)

        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__id__in=po_club_countries)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_country__in=po_countries)
            pack_placements = pack_placements.filter(po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__id__in=po_club_colorway_ids)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_colorway__in=po_coloways)
            pack_placements = pack_placements.filter(po_pack__po_colorway__in=po_coloways)

        placement_ids = list(pack_item_placements.values_list('costing_pack_item_placement__item_attribute_other', flat=True)) + \
                        list(pack_placements.values_list('costing_pack_placement__item_attribute_other', flat=True))
        placements = OrderPlacement.objects.filter(id__in=placement_ids)
        return placements

    def get_pack_item_placements(self, po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids):
        pack_item_placements = POPackItemPlacement.objects.filter(
            po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club,
        )

        if po_item_ids:
            order_item_ids = POPackItem.objects.filter(po_item__id__in=po_item_ids).values_list('po_item__order_item', flat=True)
            pack_item_placements = pack_item_placements.filter(
            po_pack_item__po_item__order_item__id__in=order_item_ids,
        )
        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__in=po_club_sizes)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_size__in=po_sizes)
        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__id__in=po_club_countries)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__id__in=po_club_colorway_ids)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_colorway__in=po_coloways)

        return pack_item_placements.order_by('po_pack_item__po_pack__purchase_order')

    def get_pack_placements(self, po_club, material, po_club_sizes, po_club_countries, po_club_colorway_ids):
        pack_placements = POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club)

        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__in=po_club_sizes)
            pack_placements = pack_placements.filter(po_pack__po_size__in=po_sizes)

        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__in=po_club_countries)
            pack_placements = pack_placements.filter(po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__in=po_club_colorway_ids)
            pack_placements = pack_placements.filter(po_pack__po_colorway__in=po_coloways)
        return pack_placements


    # def get_po_packs(self, po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids):

    #     pack_item_placements = POPackItemPlacement.objects.filter(
    #         po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club,
    #     )
    #     pack_placements = POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club)

    #     if po_item_ids:
    #         po_pack_items = POPackItem.objects.filter(po_item__id__in=po_item_ids)
    #         pack_item_placements = pack_item_placements.filter(
    #         po_pack_item__in=po_pack_items
    #     )
    #     if po_club_sizes:
    #         po_sizes = POSize.objects.filter(po_club_size__id__in=po_club_sizes)
    #         pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_size__in=po_sizes)
    #         pack_placements = pack_placements.filter(po_pack__po_size__in=po_sizes)

    #     if po_club_countries:
    #         po_countries = POCountry.objects.filter(po_club_country__id__in=po_club_countries)
    #         pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_country__in=po_countries)
    #         pack_placements = pack_placements.filter(po_pack__po_country__in=po_countries)

    #     if po_club_colorway_ids:
    #         po_coloways = POColorway.objects.filter(po_club_colorway__id__in=po_club_colorway_ids)
    #         pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_colorway__in=po_coloways)
    #         pack_placements = pack_placements.filter(po_pack__po_colorway__in=po_coloways)

    #     pack_ids = list(pack_item_placements.values_list('po_pack_item__po_pack', flat=True)) + \
    #                     list(pack_placements.values_list('po_pack', flat=True))
    #     po_packs = POPack.objects.filter(id__in=pack_ids)
    #     return po_packs

    def get_placement_name(self, placement):
        name = None
        if isinstance(placement, POPackItemPlacement):
            name = placement.costing_pack_item_placement.item_attribute_other.name
        elif isinstance(placement, POPackPlacement):
            name = placement.costing_pack_placement.item_attribute_other.name
        return name

    def get_po_pack_name(self, placement):
        name = None
        if isinstance(placement, POPackItemPlacement):
            name = placement.po_pack_item.po_pack.get_po_pack_display()
        elif isinstance(placement, POPackPlacement):
            name = placement.po_pack.get_po_pack_display()
        return name

    def get_purchase_order_name(self, placement):
        name = None
        if isinstance(placement, POPackItemPlacement):
            name = placement.po_pack_item.po_pack.purchase_order.display_number
        elif isinstance(placement, POPackPlacement):
            name = placement.po_pack.purchase_order.display_number
        return name

    def get_old_materials(self, po_club, material):
        material_ids = list(POPackItemPlacement.objects.filter(po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club).values_list('po_material', flat=True)) + \
                        list(POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club).values_list('po_material', flat=True))
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials


    def post(self, request, po_club_id):
        po_item_ids = request.data.get('po_item_ids', None)
        po_club_sizes = request.data.get('po_club_sizes', None)
        po_club_countries = request.data.get('po_club_countries', None)
        po_club_colorway_ids = request.data.get('po_club_colorway_ids', None)
        material_id	 = request.data.get('material_id', None)

        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        material = CustomerBrandMaterial.objects.get(id=material_id)
        old_material = None
        headers = material.material_detail.generic_material.user_material.get_material_headers(
            material.material_detail.generic_material.user_material.name
        )
        attributes = material.get_attributes()

        material_data = {
            'headers': headers,
            'attributes': attributes,
            'placements': []
        }
        order_placements = self.get_placements(po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids)
        for order_placement in order_placements:
            placement_data = {
                'id': order_placement.id,
                'placement_name': order_placement.name,
                'po_packs': []

            }
            if material.material_category in [FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES]:
                placements = self.get_pack_item_placements(po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids)
            elif material.material_category == PACKAGING_TYPES:
                placements = self.get_pack_placements(po_club, material, po_club_sizes, po_club_countries, po_club_colorway_ids)
            for placement in placements:
                po_pack_data = {
                    'id': placement.id,
                    'purchase_order': self.get_purchase_order_name(placement),
                    'display_name': self.get_po_pack_name(placement)
                }
                placement_data['po_packs'].append(po_pack_data)
                old_material = placement.po_material
            material_data['placements'].append(placement_data)
            material_data['attributes'] = old_material.get_attributes()
        return Response(material_data)


class BOMChangeRequestMaterialChangeMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_club_id):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=request.query_params.get('material_id', None))
        customer_brand = get_object_or_none(CustomerBrand, {'customer':po_club.pre_costing.order.customer, 'brand': po_club.pre_costing.order.brand})
        if customer_brand:
            materials = CustomerBrandMaterial.objects.filter(material_code__customer_brand=customer_brand, material_detail__generic_material__user_material__name=customer_brand_material.material_detail.generic_material.user_material.name).exclude(id=customer_brand_material.id)
            for material in materials:
                material_data = {
                    'id': material.id,
                    'name': material.verbose_reference_code,
                }
                data.append(material_data)
        return Response(data)


class BOMChangeRequestMaterialConsumptionListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_placements(self, po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids):
        pack_item_placements = POPackItemPlacement.objects.filter(
            po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club,
        )
        pack_placements = POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club)
        if po_item_ids:
            po_pack_items = POPackItem.objects.filter(po_item__id__in=po_item_ids)
            pack_item_placements = pack_item_placements.filter(
            po_pack_item__in=po_pack_items
        )
        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__id__in=po_club_sizes)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_size__in=po_sizes)
            pack_placements = pack_placements.filter(po_pack__po_size__in=po_sizes)

        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__id__in=po_club_countries)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_country__in=po_countries)
            pack_placements = pack_placements.filter(po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__id__in=po_club_colorway_ids)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_colorway__in=po_coloways)
            pack_placements = pack_placements.filter(po_pack__po_colorway__in=po_coloways)

        placement_ids = list(pack_item_placements.values_list('costing_pack_item_placement__item_attribute_other', flat=True)) + \
                        list(pack_placements.values_list('costing_pack_placement__item_attribute_other', flat=True))
        placements = OrderPlacement.objects.filter(id__in=placement_ids)
        return placements

    def get_pack_item_placements(self, po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids):
        pack_item_placements = POPackItemPlacement.objects.filter(
            po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club,
        )

        if po_item_ids:
            order_item_ids = POPackItem.objects.filter(po_item__id__in=po_item_ids).values_list('po_item__order_item', flat=True)
            pack_item_placements = pack_item_placements.filter(
            po_pack_item__po_item__order_item__id__in=order_item_ids,
        )
        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__in=po_club_sizes)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_size__in=po_sizes)
        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__id__in=po_club_countries)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__id__in=po_club_colorway_ids)
            pack_item_placements = pack_item_placements.filter(po_pack_item__po_pack__po_colorway__in=po_coloways)

        return pack_item_placements

    def get_pack_placements(self, po_club, material, po_club_sizes, po_club_countries, po_club_colorway_ids):
        pack_placements = POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club)

        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__in=po_club_sizes)
            pack_placements = pack_placements.filter(po_pack__po_size__in=po_sizes)

        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__in=po_club_countries)
            pack_placements = pack_placements.filter(po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__in=po_club_colorway_ids)
            pack_placements = pack_placements.filter(po_pack__po_colorway__in=po_coloways)
        return pack_placements

    def get_fabric_placements(self, po_club, material, po_club_sizes, po_club_countries, po_club_colorway_ids):
        fabric_placements = ColorwayItemFabricConsumption.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club)

        if po_club_sizes:
            po_sizes = POSize.objects.filter(po_club_size__in=po_club_sizes)
            fabric_placements = fabric_placements.filter(po_pack__po_size__in=po_sizes)

        if po_club_countries:
            po_countries = POCountry.objects.filter(po_club_country__in=po_club_countries)
            fabric_placements = fabric_placements.filter(po_pack__po_country__in=po_countries)

        if po_club_colorway_ids:
            po_coloways = POColorway.objects.filter(po_club_colorway__in=po_club_colorway_ids)
            fabric_placements = fabric_placements.filter(po_pack__po_colorway__in=po_coloways)
        return fabric_placements

    def get_placement_name(self, placement):
        name = None
        if isinstance(placement, POPackItemPlacement):
            name = placement.costing_pack_item_placement.item_attribute_other.name
        elif isinstance(placement, POPackPlacement):
            name = placement.costing_pack_placement.item_attribute_other.name
        return name

    def get_po_pack_name(self, placement):
        name = None
        if isinstance(placement, POPackItemPlacement):
            name = placement.po_pack_item.po_pack.get_po_pack_display()
        elif isinstance(placement, POPackPlacement):
            name = placement.po_pack.get_po_pack_display()
        return name

    def get_purchase_order_name(self, placement):
        name = None
        if isinstance(placement, POPackItemPlacement):
            name = placement.po_pack_item.po_pack.purchase_order.display_number
        elif isinstance(placement, POPackPlacement):
            name = placement.po_pack.purchase_order.display_number
        return name


    def post(self, request, po_club_id):
        po_item_ids = request.data.get('po_item_ids', None)
        po_club_sizes = request.data.get('po_club_sizes', None)
        po_club_countries = request.data.get('po_club_countries', None)
        po_club_colorway_ids = request.data.get('po_club_colorway_ids', None)
        material_id	 = request.data.get('material_id', None)
        material_data = {}
        if material_id:
            po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
            material = CustomerBrandMaterial.objects.get(id=material_id)
            headers = material.material_detail.generic_material.user_material.get_material_headers(
                material.material_detail.generic_material.user_material.name
            )
            attributes = material.get_attributes()
            material_data = {
                'headers': headers,
                'attributes': attributes,
                'placements': []
            }

            order_placements = self.get_placements(po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids)
            for order_placement in order_placements:
                placement_data = {
                    'id': order_placement.id,
                    'placement_name': order_placement.name,
                    'po_packs': []

                }
                if material.material_category in [FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES]:
                    placements = self.get_pack_item_placements(po_club, material, po_item_ids, po_club_sizes, po_club_countries, po_club_colorway_ids)
                elif material.material_category == PACKAGING_TYPES:
                    placements = self.get_pack_placements(po_club, material, po_club_sizes, po_club_countries, po_club_colorway_ids)
                for placement in placements:
                    po_pack_data = {
                        'id': placement.id,
                        'purchase_order': self.get_purchase_order_name(placement),
                        'display_name': self.get_po_pack_name(placement),
                        'consumption_ratio': placement.consumption_ratio,
                        'wastage': placement.wastage
                    }
                    placement_data['po_packs'].append(po_pack_data)
                material_data['placements'].append(placement_data)
        return Response(material_data)


class BOMChangeRequestMaterialChangeCreateView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_supplier_inquiry_data(self, supplier_inquiry_data, material):
        has_errors = False
        errors = {}

        if material.material_category == FABRIC_TRIM_TYPES:
            if not supplier_inquiry_data.get('cutting_width'):
                has_errors = True
                errors['cutting_width'] = 'Please enter cutting width.'

            if not supplier_inquiry_data.get('cutting_width_unit'):
                has_errors = True
                errors['cutting_width_unit'] = 'Please select cutting width units.'

        if not supplier_inquiry_data.get('cost_per_unit'):
            has_errors = True
            errors['cost_per_unit'] = 'Please enter cost per unit.'

        if not supplier_inquiry_data.get('costing_unit'):
            has_errors = True
            errors['costing_unit'] = 'Please enter costing unit.'

        if not supplier_inquiry_data.get('expiration_date'):
            has_errors = True
            errors['expiration_date'] = 'Please select expiration date.'

        if not supplier_inquiry_data.get('lead_time'):
            has_errors = True
            errors['lead_time'] = 'Please enter lead time.'

        if not supplier_inquiry_data.get('excess_threshold'):
            has_errors = True
            errors['excess_threshold'] = 'Please enter excess_threshold.'

        if not supplier_inquiry_data.get('cost_per_unit_type'):
            has_errors = True
            errors['cost_per_unit_type'] = 'Please select cost per unit type.'

        if not supplier_inquiry_data.get('ship_mode'):
            has_errors = True
            errors['ship_mode'] = 'Please select ship mode.'

        if not supplier_inquiry_data.get('pay_mode'):
            has_errors = True
            errors['pay_mode'] = 'Please select pay mode.'

        if not supplier_inquiry_data.get('supplier_id'):
            has_errors = True
            errors['supplier_id'] = 'Please select supplier.'

        if not supplier_inquiry_data.get('supplier_material_reference_code'):
            has_errors = True
            errors['supplier_material_reference_code'] = 'Please enter material_reference_code.'

        return has_errors, errors

    def validate_material_in_pending_approve(self, material, po_club):
        is_material_in_pending_bcr = False
        material_ids = []
        material_ids.append(material.id)

        content_type = ContentType.objects.get_for_model(ActualPOClub)
        bcrs = BOMChangeRequest.objects.filter(entity_type=content_type, entity_id=po_club.id)
        for bcr in bcrs:
            is_material_in_pending_bcr = bcr.validate_material_in_pending_approve(material_ids)
        return is_material_in_pending_bcr

    def get_supplier_pos(self, po_club, material):
        supplier_pos = SupplierPO.objects.filter(
            supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material__customer_brand_material=material,
            general_po_supplier__general_po__po_club=po_club
        )
        print(supplier_pos)
        return supplier_pos

    def validate_data(self, data, new_material, po_club):
        has_errors = False
        errors = {}
        old_material = None

        if data.get('old_material'):
            old_material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])

        if not data.get('new_material'):
            has_errors = True
            errors['new_material'] = 'Please select new material.'

        if not data.get('old_material'):
            has_errors = True
            errors['old_material'] = 'Please select material.'

        if not data.get('pack_ids'):
            has_errors = True
            errors['pack_ids'] = 'Please select placements.'

        if not data.get('reason'):
            has_errors = True
            errors['reason'] = 'Please enter reason.'

        if data.get('old_material'):
            new_material = get_object_or_404(CustomerBrandMaterial, pk=data['new_material'])
            is_material_in_pending_bcr = self.validate_material_in_pending_approve(new_material, po_club)
            if is_material_in_pending_bcr:
                has_errors = True
                errors['reason'] = 'Selected material in pending bcr'

        # if new_material.material_category == FABRIC_TRIM_TYPES:
        #     if not data.get('select_marker'):
        #         has_errors = True
        #         errors['select_marker'] = 'Please select markers.'
        supplier_inquiry_data = data['supplier_inquiry_data']
        inquiry_error_state, inquiry_errors = self.validate_supplier_inquiry_data(supplier_inquiry_data, new_material)
        if inquiry_error_state:
            has_errors = True
            errors['supplier_inquiry_errors'] = inquiry_errors

        if old_material:
            supplier_pos = self.get_supplier_pos(po_club, old_material)

            if not supplier_pos.exists():
                has_errors = True
                errors['general'] = 'No Supplier PO has been generated. You cannot create BCR'

            if supplier_pos.filter(state=SupplierPO.DRAFT_STATE).exists():
                has_errors = True
                errors['general'] = 'Supplier PO is still in draft. You cannot create BCR'

        return has_errors, errors

    def post(self, request, po_club_id):
        from marketing.helpers.po_club_bcr_change_request import POClubBOMChangeRequestHelper
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        po_club_helper = POClubBOMChangeRequestHelper(po_club)
        data = request.data
        reason = data['reason']
        material = None
        if data['new_material']:
            material = get_object_or_404(CustomerBrandMaterial, pk=data['new_material'])
        has_errors, errors = self.validate_data(data, material, po_club)
        if not has_errors:

            bcr = po_club_helper.create_bcr(request.user, reason, BOMChangeRequestChangeType.MATERIAL_CHANGE, data)
            http_response = Response({'success': True, 'bcr_id': bcr.id,  'material_id': material.id, 'material_category': material.material_category})
        else:
            http_response = Response({'success': True, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class BOMChangeRequestMaterialConsumptionChangeCreateView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_material_in_pending_approve(self, material, po_club):
        is_material_in_pending_bcr = False
        material_ids = []
        material_ids.append(material.id)

        content_type = ContentType.objects.get_for_model(ActualPOClub)
        bcrs = BOMChangeRequest.objects.filter(entity_type=content_type, entity_id=po_club.id)
        for bcr in bcrs:
            is_material_in_pending_bcr = bcr.validate_material_in_pending_approve(material_ids)
        return is_material_in_pending_bcr

    def get_supplier_pos(self, po_club, material):
        supplier_pos = SupplierPO.objects.filter(
            supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material__customer_brand_material=material,
            general_po_supplier__general_po__po_club=po_club
        )
        return supplier_pos

    def validate_data(self, data, po_club):
        has_errors = False
        errors = {}
        material = None

        if data.get('old_material'):
            material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])

        if not data.get('old_material'):
            has_errors = True
            errors['old_material'] = 'Please select material.'

        if not data.get('reason'):
            has_errors = True
            errors['reason'] = 'Please enter reason.'

        if material:
            is_material_in_pending_bcr = self.validate_material_in_pending_approve(material, po_club)
            if is_material_in_pending_bcr:
                has_errors = True
                errors['general'] = 'Selected material in pending bcr'

            supplier_pos = self.get_supplier_pos(po_club, material)

            if not supplier_pos.exists():
                has_errors = True
                errors['general'] = 'No Supplier PO has been generated. You cannot crate BCR'

            if supplier_pos.filter(state=SupplierPO.DRAFT_STATE).exists():
                has_errors = True
                errors['general'] = 'Supplier PO is still in draft. You cannot crate BCR'

            if material.material_category == FABRIC_TRIM_TYPES:
                if not data.get('select_marker'):
                    has_errors = True
                    errors['select_marker'] = 'Please select markers.'

        return has_errors, errors

    def post(self, request, po_club_id):
        from marketing.helpers.po_club_bcr_change_request import POClubBOMChangeRequestHelper
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        po_club_helper = POClubBOMChangeRequestHelper(po_club)
        data = request.data
        reason = data['reason']
        has_errors, errors = self.validate_data(data, po_club)
        if not has_errors:
            bcr = po_club_helper.create_bcr(request.user, reason, BOMChangeRequestChangeType.CONSUMPTION_CHANGE, data)
            http_response = Response({'success': True, 'bcr_id': bcr.id})
        else:
            http_response = Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class BOMChangeRequestSupplierChangeCreateView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_supplier_inquiry_data(self, supplier_inquiry_data, material):
        has_errors = False
        errors = {}

        if material.material_category == FABRIC_TRIM_TYPES:
            if not supplier_inquiry_data.get('cutting_width'):
                has_errors = True
                errors['cutting_width'] = 'Please enter cutting width.'

            if not supplier_inquiry_data.get('cutting_width_unit'):
                has_errors = True
                errors['cutting_width_unit'] = 'Please select cutting width units.'

        if not supplier_inquiry_data.get('cost_per_unit'):
            has_errors = True
            errors['cost_per_unit'] = 'Please enter cost per unit.'

        if not supplier_inquiry_data.get('costing_unit'):
            has_errors = True
            errors['costing_unit'] = 'Please enter minimum order costing unit.'

        if not supplier_inquiry_data.get('expiration_date'):
            has_errors = True
            errors['expiration_date'] = 'Please select expiration date.'

        if not supplier_inquiry_data.get('lead_time'):
            has_errors = True
            errors['lead_time'] = 'Please enter lead time.'

        if not supplier_inquiry_data.get('excess_threshold'):
            has_errors = True
            errors['excess_threshold'] = 'Please enter excess_threshold.'

        if not supplier_inquiry_data.get('cost_per_unit_type'):
            has_errors = True
            errors['cost_per_unit_type'] = 'Please select cost per unit type.'

        if not supplier_inquiry_data.get('ship_mode'):
            has_errors = True
            errors['ship_mode'] = 'Please select ship mode.'

        if not supplier_inquiry_data.get('pay_mode'):
            has_errors = True
            errors['pay_mode'] = 'Please select pay mode.'

        if not supplier_inquiry_data.get('supplier_id'):
            has_errors = True
            errors['supplier_id'] = 'Please select supplier.'

        if not supplier_inquiry_data.get('supplier_material_reference_code'):
            has_errors = True
            errors['supplier_material_reference_code'] = 'Please enter material_reference_code.'

        return has_errors, errors

    def validate_material_in_pending_approve(self, material, po_club):
        is_material_in_pending_bcr = False
        material_ids = []
        material_ids.append(material.id)

        content_type = ContentType.objects.get_for_model(ActualPOClub)
        bcrs = BOMChangeRequest.objects.filter(entity_type=content_type, entity_id=po_club.id)
        for bcr in bcrs:
            is_material_in_pending_bcr = bcr.validate_material_in_pending_approve(material_ids)
        return is_material_in_pending_bcr

    def get_supplier_pos(self, po_club, material, supplier_inquiry_data):
        supplier_id = supplier_inquiry_data.get('supplier_id')
        supplier = get_object_or_404(Supplier, pk=supplier_id)
        supplier_pos = SupplierPO.objects.filter(
            supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material__customer_brand_material=material,
            general_po_supplier__general_po__po_club=po_club,
            general_po_supplier__supplier=supplier
        )
        return supplier_pos

    def validate_data(self, data, material, po_club):
        has_errors = False
        errors = {}

        if not data.get('reason'):
            has_errors = True
            errors['reason'] = 'Please enter reason.'

        if not data.get('supplier_inquiry_data'):
            has_errors = True
            errors['supplier_inquiry_data'] = 'Please enter supplier data.'

        is_material_in_pending_bcr = self.validate_material_in_pending_approve(material, po_club)
        if is_material_in_pending_bcr:
            has_errors = True
            errors['reason'] = 'Selected material in pending bcr'

        supplier_inquiry_data = data['supplier_inquiry_data']
        inquiry_error_state, inquiry_errors = self.validate_supplier_inquiry_data(supplier_inquiry_data, material)
        if inquiry_error_state:
            has_errors = True
            errors['supplier_inquiry_errors'] = inquiry_errors

        if material and supplier_inquiry_data:
            supplier_pos = self.get_supplier_pos(po_club, material, supplier_inquiry_data)

            # if not supplier_pos.exists():
            #     has_errors = True
            #     errors['general'] = 'No Supplier PO has been generated. You cannot crate BCR'

            if supplier_pos.filter(state=SupplierPO.DRAFT_STATE).exists():
                has_errors = True
                errors['general'] = 'Supplier PO is still in draft. You cannot crate BCR'


        return has_errors, errors

    def post(self, request, po_club_id):
        from marketing.helpers.po_club_bcr_change_request import POClubBOMChangeRequestHelper
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        po_club_helper = POClubBOMChangeRequestHelper(po_club)
        data = request.data
        reason = data['reason']
        material = None
        if data['old_material']:
            material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        has_errors, errors = self.validate_data(data, material, po_club)
        if not has_errors:
            created_data = po_club_helper.create_bcr(request.user, reason, BOMChangeRequestChangeType.SUPPLIER_CHANGE, data)
            http_response = Response({'success': True})
        else:
            http_response = Response({'success': True, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class POClubFabricMarkers(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        material_id = kwargs.get('material_id', None)
        club = get_object_or_404(ActualPOClub, pk=po_club_id)

        markers = POFabricMarker.objects.filter(actual_club=club, po_material__id=material_id).order_by('id')
        data = []
        for marker in markers:
            marker_data = {
                'marker_id': marker.pk,
                'marker_name': marker.marker_name,
                'reviewed': marker.reviewed,
                'marker_type': marker.marker_type,
                'marker_classification': marker.marker_classification,
                'marker_type_display': marker.get_marker_type_display(),
            }
            data.append(marker_data)
        return Response(data)


class POClubMaterialSupplierPOListView(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        po_club_id = kwargs.get('po_club_id', None)
        material_id = kwargs.get('material_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)

        supplier_po_ids = GeneralPOMaterialQuantity.objects.filter(
            material_id=material_id,
            general_po__po_club=po_club
        ).values_list('default_material_supplier__general_po_supplier__supplierpo', flat=True).distinct()
        supplier_pos = SupplierPO.objects.filter(id__in=supplier_po_ids).order_by('id')
        data = []
        for supplier_po in supplier_pos:
            po_data = {
                'id': supplier_po.pk,
                'display_number': supplier_po.display_number,
                'state': supplier_po.get_state_display(),
                'file': supplier_po.supplier_po_file.get_object_data() if supplier_po.supplier_po_file else {}
            }
            data.append(po_data)
        return Response(data)


class POClubMaterialSupplierInquiryListView(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_supplier_inquiries(self, po_club, material):
        inquiry_ids = list(POPackItemPlacement.objects.filter(po_material=material, po_pack_item__po_pack__purchase_order__actual_po_club=po_club).values_list('supplier_inquiry_detail', flat=True)) + \
                        list(POPackPlacement.objects.filter(po_material=material, po_pack__purchase_order__actual_po_club=po_club).values_list('supplier_inquiry_detail', flat=True))
        inquiries = SupplierInquiryDetail.objects.filter(id__in=inquiry_ids)
        return inquiries

    def get(self, request, *args, **kwargs):
        data = []
        po_club_id = kwargs.get('po_club_id', None)
        material_id = kwargs.get('material_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)

        inquiries = self.get_supplier_inquiries(po_club, material)
        data = []
        for inquiry in inquiries:
            inquiry_data = ConsolidatedSupplierInquiryMaterialDetailSerializer(inquiry, many=False).data
            data.append(inquiry_data)
        return Response(data)