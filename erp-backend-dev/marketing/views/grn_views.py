from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status, generics
from rest_framework.generics import get_object_or_404

from materials.models import Material
from shared.utils import get_object_or_none, is_none, get_object_or_none_dict, get_float_or_zero, \
    convert_to_float_or_none
from rest_framework.response import Response
from rest_framework.views import APIView
from marketing.models import SupplierPO, SupplierPOGRN, SupplierPOGRNMaterial, SupplierPOGRNMaterialDetail, \
    CustomerBrandMaterial, FabricGRNDetail, SupplierPOGRNMaterialQA, FabricGRNBatchNumber, POClubShade, ActualPOClub, \
    GRNBatchNumberShade, ActualPOClub, POFabricMarker, FabricWidth, \
    PurchaseOrderAllocatedMaterial, PurchaseOrderBom, SupplierDeliveryDate, SupplierDeliveryDateQuantity, PackItemService, \
        SupplierPODeliveryInvoicePackList, SupplierPODeliveryInvoice, SupplierActualDeliveryDate, \
        SupplierPOInvoiceDeliveryNote
from materials.models import SupplierInquiryMaterialCode
from supplier_po.supplier_po.serializers import SupplierPOSerializer, SupplierPOGRNBasicSerializer, \
    SupplierPOBasicListSerializer
from marketing.serializers import SupplierPOGRNSerializer, \
    SupplierPOGRNMaterialSerializer, POClubShadeSerializer, \
    SupplierPOGRNMaterialDetailSerializer, SupplierPOMaterialShrinkageSerializer, \
        SupplierPOGRNBasicDataSerializer, SupplierDeliveryDateDetailSerializer, SupplierDeliveryDateQuantityDetailSerializer, SupplierPOFabricShadeSerializer
from supplier_po.supplier_po.serializers import SupplierPOSummaryDetailSerializer, SupplierPODeliveryDateSerializer, SupplierPODeliveryInvoiceSerializer, SupplierPODeliveryInvoicePackListSerializer, \
    SupplierPODeliveryInvoiceDetailSerializer
from shared.models import FileAttachment, Port, ROAD_TRANSPORT_METHOD, AIR_TRANSPORT_METHOD, SEA_TRANSPORT_METHOD
from materials.serializers.material_serializers import CustomerBrandMaterialSerializer, SupplierPOCustomerBrandMaterialSerializer
from shared.permissions.roles import STORES_USER_ROLE, FABRIC_INSPECTION_USER_ROLE
from shared.permissions.view_permissions import HasPermission
from rest_framework.views import APIView
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from materials.models import FABRIC_TRIM_TYPES
import uuid
from marketing.utils.aws_utils import handle_uploaded_file
import os
from django.db.models import Sum
from django.utils import timezone
from datetime import date, timedelta
from supplier_po.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin, GRNSummary, SupplierPOSummary, DeliveryNoteSummary, PackListSummary, InvoiceSummary, DeliveryDateSummary, \
    POClubDeliverySummary
from supplier_po.supplier_po_grn.serializers import MaterialGRNDetailSerializer, GRNShadeSummarySerializer
from supplier_po.models import SupplierDeliveryDateQuantityPOAllocation, SupplierPOFabricShade, SupplierPOShrinkageValue, SupplierPOMaterialShrinkage, SupplierPOShrinkLot


class GRNListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOGRNBasicSerializer
    queryset = SupplierPOGRN.objects.all().order_by('-id')


class GRNUnAssignMaterialList(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def get_material_headers(self):
        from materials.fieldmetadata.material_metadata import get_grn_meta_material_headers
        headers = get_grn_meta_material_headers()
        return headers

    def get(self, request, grn_id, supplier_po_id):
        material_list = []
        headers = self.get_material_headers()
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)
        assign_material_ids = SupplierPOGRNMaterial.objects.filter(supplier_po_grn_id=grn_id).values_list('grn_material_id', flat=True)

        unassign_material_ids = SupplierDeliveryDateQuantity.objects.filter(
            supplier_delivery_date__general_po_supplier__supplierpo=supplier_po
        ).values_list('material_supplier__supplier_material', flat=True).exclude(material_supplier__supplier_material__in=assign_material_ids)
        materials = SupplierInquiryMaterialCode.objects.filter(pk__in=unassign_material_ids)
        for material in materials:
            material_headers = material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(
                material.customer_brand_material.material_detail.generic_material.user_material.name
            )
            material_list_data = {
               'attributes': material.get_attributes(),
               'headers': material_headers
            }
            material_list.append(material_list_data)
        response = {
            'headers': headers,
            'materials': material_list
        }
        return Response(response)


class GRNANewMaterialSaveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request, grn_id):
        materials = request.data.get('materials')
        grn = get_object_or_404(SupplierPOGRN, pk=grn_id)
        for material in materials:
            grn_material, created = SupplierPOGRNMaterial.objects.get_or_create(
                supplier_po_grn=grn,
                grn_material_id=material
            )
        response = SupplierPOGRNSerializer(grn).data
        return Response(response, status=status.HTTP_200_OK)


class MaterialPackListUploadTemplateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def file_upload(self):
        location = self.request.data.get('location')
        uploaded_files = self.request.FILES.getlist('files')
        file_attachments = []

        for file in uploaded_files:
            display_name = os.path.splitext(file.name)[0]
            file_path = handle_uploaded_file(file, location)
            file_name, file_ext = os.path.splitext(file_path)
            file_name = os.path.basename(file_name)
            file_attachment = FileAttachment.objects.create(display_name=display_name, type=file_ext, file_path=file_path)
            file_attachments.append(file_attachment)
        
        if file_attachments:
            return file_attachments[0]
        return None

    def post(self, request, grn_material_id):
        grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)
        attachment = self.file_upload()
        if attachment:
            from supplier_po.helpers.pack_list_processor import PackListProcessor
            response = PackListProcessor(grn_material, attachment.file_path, attachment.id).process_upload_pack_list()
            return response
        else:
            return Response({"status": "No file found to process"})


class GRNMaterialRowDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOGRNMaterialSerializer
    queryset = SupplierPOGRNMaterial.objects.all().order_by('-id')


class SupplierPOFabricShadeListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOFabricShadeSerializer
    queryset = SupplierPOFabricShade.objects.all()

    def get_queryset(self):
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=self.kwargs['supplier_po_grn_material_id'])
        qs = super().get_queryset()
        qs = qs.filter(
            supplier_po=supplier_po_grn_material.supplier_po_grn.supplier_po, 
            material_id=supplier_po_grn_material.grn_material.customer_brand_material
        ).order_by('display_order')
        return qs
    

class ActualClubShadeRetriveUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = POClubShadeSerializer
    queryset = POClubShade.objects.all()

    def file_upload(self):
        location = self.request.data.get('location')
        uploaded_files = self.request.FILES.getlist('file')
        file_attachments = []

        for file in uploaded_files:
            display_name = os.path.splitext(file.name)[0]
            file_path = handle_uploaded_file(file, location)
            file_name, file_ext = os.path.splitext(file_path)
            file_name = os.path.basename(file_name)
            file_attachment = FileAttachment.objects.create(display_name=display_name, type=file_ext, file_path=file_path)
            file_attachments.append(file_attachment)
        
        if file_attachments:
            return file_attachments[0]
        return None

    def post(self, request, pk):
        attachment = self.file_upload()
        actual_club_shade = get_object_or_404(POClubShade, pk=pk)
        actual_club_shade.attachment = attachment
        serializer = POClubShadeSerializer(attachment, many=False).data
        return serializer


class ActualShadeGroupUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def validate_shades(self, shade_list):
        from django.db.models import Count
        shade_ids = []
        for row in shade_list:
            shade_id = row['id']
            shade_ids.append(shade_id)
        shades = GRNBatchNumberShade.objects.filter(id__in=shade_ids)
        has_duplicate_split_from = False
        if shades.exists():
            has_duplicate_split_from = shades.values('split_from').annotate(count=Count('split_from')).filter(count__gt=1).exists()
        return has_duplicate_split_from
    
    def validate_attachment(self, data):
        is_valid = True
        for row in data:
            attachment = row.get('attachment')
            if not attachment:
                is_valid = False
                return is_valid
        return is_valid

    def post(self, request, supplier_po_grn_material_id):
        data = request.data
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=supplier_po_grn_material_id)
        material = supplier_po_grn_material.grn_material.customer_brand_material
        supplier_po = supplier_po_grn_material.supplier_po_grn.supplier_po
        errors = []

        validate_attachment = self.validate_attachment(data)

        if validate_attachment:
            for row in data:
                saved_shade_id_list = []
                supplier_po_fabric_shade_id = row['id']
                shade_name = row['shade_name']
                display_order = row['display_order']
                shades = row['shades']
                has_shade_errors = self.validate_shades(shades)

                if supplier_po_fabric_shade_id != 0:
                    supplier_po_shade = SupplierPOFabricShade.objects.get(id=supplier_po_fabric_shade_id)
                else:
                    supplier_po_shade = SupplierPOFabricShade.objects.create(
                        supplier_po=supplier_po, material=material, shade_name=shade_name
                    )
                supplier_po_shade.shade_name = shade_name
                supplier_po_shade.display_order = display_order
                supplier_po_shade.save()

                if not has_shade_errors:
                    for shade_row in shades:
                        shade_id = shade_row['id']
                        shade = GRNBatchNumberShade.objects.get(id=shade_id)
                        shade.supplier_po_shade = supplier_po_shade
                        shade.save()
                        saved_shade_id_list.append(shade_id)
                    unassign_shades = GRNBatchNumberShade.objects.filter(
                        supplier_po_shade=supplier_po_shade, 
                        batch_number__grn_material=supplier_po_grn_material
                    ).exclude(id__in=saved_shade_id_list)

                    for unassign_shade in unassign_shades:
                        unassign_shade.supplier_po_shade = None
                        unassign_shade.save()
                else:
                    errors.append({supplier_po_shade.id: 'Split shades cannot be in same shade group.'})
        else:
            errors.append('Every shade must have shade swatch')

        if errors:
            response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            response = Response({'status': True}, status=status.HTTP_200_OK)
        return response


class GRNMaterialSummaryView(generics.GenericAPIView):

    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterial.objects.filter(
        grn_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL
    )

    def get_queryset(self):
        supplier_po_grn_id = self.kwargs['supplier_po_grn_id']
        queryset = super().get_queryset()
        queryset = queryset.filter(supplier_po_grn__id = supplier_po_grn_id)
        return queryset

    def get(self, request, *args, **kwargs):
        supplier_po_grn_id = kwargs['supplier_po_grn_id']
        self.queryset = self.queryset.filter(supplier_po_grn__id = supplier_po_grn_id)
        return_data = []
        for supplier_po_grn_material in self.queryset:
            data = SupplierPOGRNMaterialSerializer(supplier_po_grn_material).data
            summary_data = {
                'grn_material_details': {key: data[key] for key in data if not key in ['supplierpogrnmaterialdetail_set', 'material_headers']}
            }
            supplier_po_grn_material_details = supplier_po_grn_material.supplierpogrnmaterialdetail_set.all()
            fabric_grn_details = FabricGRNDetail.objects.filter(grn_material_detail__in = supplier_po_grn_material_details)
            widths = [
                {'indicated_width': fabric_grn_detail.indicated_width,
                 'indicated_width_units': fabric_grn_detail.indicated_width_units} for fabric_grn_detail in fabric_grn_details.distinct('indicated_width', 'indicated_width_units')]
            shades = [
                supplier_po_grn_material_detail.shade.actual_shade.shade_name
                for supplier_po_grn_material_detail in supplier_po_grn_material_details.distinct('shade__actual_shade__shade_name') if supplier_po_grn_material_detail.shade
                and supplier_po_grn_material_detail.shade.actual_shade
            ]
            shades.append(None)
            summary_data['width_group'] = [
                {
                    'width': width_data['indicated_width'],
                    'width_unit': width_data['indicated_width_units'],
                    'total_quantity': fabric_grn_details.filter(**width_data).aggregate(Sum('grn_material_detail__indicated_quantity'))['grn_material_detail__indicated_quantity__sum'],
                    'width_shade_group': [
                        {
                            'shade_display': shade,
                            'total_quantity': fabric_grn_details.filter(**width_data, grn_material_detail__shade__actual_shade__shade_name = shade).aggregate(Sum('grn_material_detail__indicated_quantity'))['grn_material_detail__indicated_quantity__sum'],
                            'rolls': [
                                {
                                    'quantity': fabric_grn_detail.grn_material_detail.indicated_quantity,
                                    'pack_number': fabric_grn_detail.pack_number,
                                    'batch_number': fabric_grn_detail.grn_material_detail.batch_number.batch_number
                                } for fabric_grn_detail in fabric_grn_details.filter(**width_data, grn_material_detail__shade__actual_shade__shade_name = shade)]
                        } for shade in shades]
                } for width_data in widths]
            return_data.append(summary_data)
        return Response(return_data)


class ActualPOClubGRNMaterialListView(generics.GenericAPIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterial.objects.all()

    def get(self, request, *args, **kwargs):

        actual_po_club_id = kwargs['actual_po_club_id']
        self.queryset = self.queryset.filter(supplier_po_grn__supplier_po__po_club__id=actual_po_club_id)
        return_data = []
        grn_headers = []
        grn_materials = [supplier_po_grn_material.grn_material for supplier_po_grn_material in self.queryset.distinct('grn_material')]
        for grn_material in grn_materials:
            summary_data = {}

            for supplier_po_grn_material in self.queryset.filter(grn_material = grn_material):
                data = SupplierPOGRNMaterialSerializer(supplier_po_grn_material).data
                material_type = grn_material.material_type
                for supplier_po_grn_material_detail in supplier_po_grn_material.supplierpogrnmaterialdetail_set.all():
                    grn_material_data = {
                        'quantity': supplier_po_grn_material_detail.indicated_quantity,
                        'grn_number': supplier_po_grn_material.supplier_po_grn.id
                    }
                    grn_headers = SupplierPOGRNSerializer(supplier_po_grn_material.supplier_po_grn).data['grn_headers']
                    if material_type == FABRIC_TRIM_TYPES:
                        grn_material_data['barcode'] = supplier_po_grn_material_detail.barcode
                        fabric_grn_detail = get_object_or_none(FabricGRNDetail, {'grn_material_detail': supplier_po_grn_material_detail})
                        if fabric_grn_detail:
                            grn_material_data['pack_number'] = fabric_grn_detail.pack_number
                            grn_material_data['batch_number'] = fabric_grn_detail.grn_material_detail.batch_number.batch_number if fabric_grn_detail.grn_material_detail.batch_number else None
                    if summary_data == {}:
                        summary_data = {
                            'customer_brand_material_id': grn_material.id,
                            'grn_material_details': {key: data[key] for key in data if not key in ['supplierpogrnmaterialdetail_set']},
                            'grn_materials': [grn_material_data]
                        }
                    else:
                        summary_data['grn_materials'].append(grn_material_data)
            if summary_data:
                return_data.append(summary_data)
        return Response({
            'grn_headers': grn_headers,
            'supplier_po_grn_material_data': return_data
        })
    

class ActualPOClubGRNMaterialSummaryView(generics.GenericAPIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterial.objects.filter(grn_material__customer_brand_material__material_detail__generic_material__user_material__name = FABRIC_TRIM_TYPES)

    def get_queryset(self):
        actual_po_club_id = self.kwargs['actual_po_club_id']
        queryset = super().get_queryset()
        queryset = queryset.filter(supplier_po_grn__supplier_po__po_club__id = actual_po_club_id)
        return queryset

    def new_get(self):
        actual_po_club_id = self.kwargs['actual_po_club_id']
        materials = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__actual_po_club_id=actual_po_club_id)


    def get(self, request, *args, **kwargs):
        actual_po_club_id = kwargs['actual_po_club_id']
        self.queryset = self.queryset.filter(supplier_po_grn__supplier_po__po_club__id = actual_po_club_id)
        return_data = []
        for supplier_po_grn_material in self.queryset:

            data = SupplierPOGRNMaterialSerializer(supplier_po_grn_material).data
            summary_data = {
                'grn_material_details': {key: data[key] for key in data if not key in ['supplierpogrnmaterialdetail_set', 'material_headers']}
            }
            supplier_po_grn_material_details = supplier_po_grn_material.supplierpogrnmaterialdetail_set.all()
            if supplier_po_grn_material_details:
                fabric_grn_details = FabricGRNDetail.objects.filter(grn_material_detail__in=supplier_po_grn_material_details)

                widths = [
                    {'indicated_width': fabric_grn_detail.indicated_width,
                    'indicated_width_units': fabric_grn_detail.indicated_width_units} for fabric_grn_detail in fabric_grn_details.distinct('indicated_width', 'indicated_width_units')]

                shades = [supplier_po_grn_material_detail.shade.actual_shade.shade_name for supplier_po_grn_material_detail in supplier_po_grn_material_details.distinct('shade__actual_shade__shade_name') if supplier_po_grn_material_detail.shade]
                shades.append(None)

                summary_data['width_group'] = [
                    {
                        'width': width_data['indicated_width'],
                        'width_unit': width_data['indicated_width_units'],
                        'total_quantity': fabric_grn_details.filter(**width_data).aggregate(Sum('grn_material_detail__indicated_quantity'))['grn_material_detail__indicated_quantity__sum'],
                        'width_shade_group': [
                            {
                                'shade_display': shade,
                                'total_quantity': fabric_grn_details.filter(**width_data, grn_material_detail__shade__actual_shade__shade_name = shade).aggregate(Sum('grn_material_detail__indicated_quantity'))['grn_material_detail__indicated_quantity__sum'],
                                'rolls': [
                                    {
                                        'quantity': fabric_grn_detail.grn_material_detail.indicated_quantity,
                                        'pack_number': fabric_grn_detail.pack_number,
                                        'batch_number': fabric_grn_detail.grn_material_detail.batch_number.batch_number
                                    } for fabric_grn_detail in fabric_grn_details.filter(**width_data, grn_material_detail__shade__actual_shade__shade_name = shade)]
                            } for shade in shades]
                    } for width_data in widths]
                return_data.append(summary_data)
        return Response(return_data)


class InHouseMaterialByClubListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, club_id):
        material_ids = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_club_bom__purchase_order_bom__purchase_order__actual_po_club=club_id
        ).values_list('in_house_material__material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        searializer = CustomerBrandMaterialSerializer(materials, many=True)
        return Response(searializer.data)


class ClubShadeUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request, supplier_po_grn_material_id):
        errors = {}
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=supplier_po_grn_material_id)
        supplier_po_fabric_shade_id = request.data.get('id', None)
        attachment = request.data.get('attachment', None)
        shade_name = request.data.get('shade_name', None)
        display_order = request.data.get('display_order', None)

        if not attachment:
            errors['shade_swatch'] = "Upload a shade swatch"
        if not shade_name:
            errors['shade_name'] = "Enter shade name"

        if not errors:
            if supplier_po_fabric_shade_id:
                supplier_po_fabric_shade = get_object_or_404(SupplierPOFabricShade, pk=supplier_po_fabric_shade_id)
            else:
                supplier_po_fabric_shade, created = SupplierPOFabricShade.objects.get_or_create(
                    material=supplier_po_grn_material.grn_material.customer_brand_material, 
                    shade_name=shade_name, 
                    supplier_po=supplier_po_grn_material.supplier_po_grn.supplier_po, 
                )
            supplier_po_fabric_shade.shade_name = shade_name
            supplier_po_fabric_shade.display_order = display_order
            supplier_po_fabric_shade.shade_swatch_id = attachment['id']    
            supplier_po_fabric_shade.save()
            serializer = SupplierPOFabricShadeSerializer(supplier_po_fabric_shade, many=False).data
            http_response = Response(serializer)
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class ClubShadeDeletesView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def valid_deletable(self, supplier_po_fabric_shade):
        valid = GRNBatchNumberShade.objects.filter(supplier_po_shade=supplier_po_fabric_shade).exists()
        return not valid

    def post(self, request, pk, grn_id):
        supplier_po_fabric_shade = get_object_or_404(SupplierPOFabricShade, pk=pk)
        is_deletable = self.valid_deletable(supplier_po_fabric_shade)
        if is_deletable:
            supplier_po_fabric_shade.delete()
            httt_response =  Response({'status': True})
        else:
            httt_response = Response({'errors': 'Supplier po fabric shade cannot delete. Already assign shade in GRN'}, status=status.HTTP_400_BAD_REQUEST)
        return httt_response


class ActualShadeRollListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [FABRIC_INSPECTION_USER_ROLE, ]

    def get(self, request, actual_shade_id):
        supplier_po_shade = get_object_or_404(SupplierPOFabricShade, pk=actual_shade_id)
        grn_batch_shades = GRNBatchNumberShade.objects.filter(supplier_po_shade=supplier_po_shade)
        rolls = SupplierPOGRNMaterialDetail.objects.filter(shade__in=grn_batch_shades)
        rolls_data = SupplierPOGRNMaterialDetailSerializer(rolls, many=True).data
        data = {
            'id': supplier_po_shade.id,
            'shade_name': supplier_po_shade.shade_name,
            'rolls': []
        }
        data['rolls'].extend(rolls_data)
        return Response(data)


class GRNBatchShadeSplitDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [FABRIC_INSPECTION_USER_ROLE, ]

    def get(self, request, grn_batch_shade_id):
        from django.db.models import Q
        grn_batch_shade = get_object_or_404(GRNBatchNumberShade, pk=grn_batch_shade_id)
        split_batch_shades = GRNBatchNumberShade.objects.filter(split_from=grn_batch_shade)
        split_batch_shades_count = split_batch_shades.count()
        combined_shade_query = Q(shade=grn_batch_shade) | Q(shade__in=split_batch_shades)
        rolls = SupplierPOGRNMaterialDetail.objects.filter(combined_shade_query).order_by('id')
        rolls_data = SupplierPOGRNMaterialDetailSerializer(rolls, many=True).data

        if split_batch_shades_count == 0:
            data = {
                'parent_shade_name': grn_batch_shade.shade,
                'split_batch_shades_count': split_batch_shades_count,
                'shade_list': [],
                'rolls': []
            }
        else:
            data = {
                'parent_shade_name': grn_batch_shade.shade,
                'split_batch_shades_count': split_batch_shades_count,
                'shade_list': [],
                'rolls': []
            }

        for split_batch_shade in split_batch_shades:
            data['shade_list'].append(
                {
                    'id': split_batch_shade.id,
                    'shade': split_batch_shade.shade,
                    'is_parent': False
                }
            )

        data['rolls'].extend(rolls_data)
        return Response(data)


class GRNBatchShadeSplitCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [FABRIC_INSPECTION_USER_ROLE, ]

    def __init__(self):
        self.rolls_errors = {}

    def get_mapping_shade(self, created_shade_list, shade_index):
        for row in created_shade_list:
            if row['shade_index'] == shade_index:
                return row['shade']
        return None

    def validate_rolls(self, roll_list):
        for row in roll_list:
            if row['new_shade'] is None:
                error = 'Enter select a roll shade'
                self.rolls_errors[row['id']] = error
        return {'roll_errors': self.rolls_errors}

    def post(self, request, grn_batch_shade_id):
        grn_batch_shade = get_object_or_404(GRNBatchNumberShade, pk=grn_batch_shade_id)
        shade_list = request.data.get('shade_list', None)
        roll_list = request.data.get('rolls', None)
        created_shade_list = []

        errors = self.validate_rolls(roll_list)

        if len(errors['roll_errors']) == 0:
            for row in shade_list:
                if not row['is_parent']:
                    if row['id']:
                        split_shade = get_object_or_404(GRNBatchNumberShade, pk=row['id'])
                        split_shade.shade = row['shade']
                        split_shade.save()
                    else:
                        split_shade, created = GRNBatchNumberShade.objects.get_or_create(
                            batch_number=grn_batch_shade.batch_number,
                            shade=row['shade'],
                            # grn = grn_batch_shade.grn,
                            # material = grn_batch_shade.material,
                            split_from=grn_batch_shade
                        )
                    created_shade_list.append({'shade': split_shade, 'shade_index': row['shade_index']})

            for row in roll_list:
                roll = SupplierPOGRNMaterialDetail.objects.get(pk=row['id'])
                shade_index = row['new_shade'].get('shade_index')
                shade = self.get_mapping_shade(created_shade_list, shade_index)
                if shade is not None:
                    roll.shade = shade
                    roll.save()
            response = Response({'success': True}, status=status.HTTP_200_OK)
        else:
            response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return response


class FabricShrinkageTimeFrameDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request):
        shrinkage_test_time_frames = []
        for choice in SupplierPOMaterialShrinkage.SHRINKAGE_TIMES:
            shrinkage_test_time_frames.append({"id": choice[0], "name": choice[1]})

        metadata = {
            'shrinkage_test_time_frames': shrinkage_test_time_frames,
        }
        return Response(metadata)



class FabricShrinkageDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get_style_number(self, grn):
        style_number = grn.supplier_po.general_po_supplier.general_po.costing.order.style_number
        return style_number

    def get(self, request, grn_id):
        grn = get_object_or_404(SupplierPOGRN, pk=grn_id)
        supplier_po = grn.supplier_po
        style_number = self.get_style_number(grn)
        is_wash_garment = grn.get_type_of_garment()

        shrinkages = SupplierPOMaterialShrinkage.objects.filter(supplier_po=supplier_po).order_by('id')
        context = {'is_wash_garment': is_wash_garment, 'supplier_po': supplier_po, 'grn': grn}
        serialzier = SupplierPOMaterialShrinkageSerializer(shrinkages, context=context, many=True).data
        response = {
            'supplier_name': grn.supplier_po.general_po_supplier.supplier.name,
            'style_number': style_number,
            'is_wash_garment': is_wash_garment,
            'shrinkage_materials': serialzier,
        }
        return Response(response)


class FabricShrinkageCreateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def validate_time_frame(self, id, shrinkage_test_time_frame):
        errors = {}
        is_valid = True
        shrinkage_material = SupplierPOMaterialShrinkage.objects.get(pk=id)
        shrinkage_material.shrinkage_test_time_frame = shrinkage_test_time_frame
        shrinkage_material.save()
        #is_valid = shrinkage_material.supplierpogrnshrinkagevalue_set.all().exclude(shrinkage_test_time_frame=shrinkage_test_time_frame).exist()
        return is_valid

    def post(self, request, grn_id):
        shrinkage_materials = request.data.get('shrinkage_materials', None)
        grn = get_object_or_404(SupplierPOGRN, pk=grn_id)
        is_wash_garment = grn.get_type_of_garment()

        for shrinkage_material in shrinkage_materials:
            shrinkage_test_time_frame = shrinkage_material['shrinkage_test_time_frame']
            valid_time_frame = self.validate_time_frame(shrinkage_material['id'], shrinkage_test_time_frame)
            for row in shrinkage_material['supplierposhrinkagevalue_set']:
                shrinkage_value = SupplierPOShrinkageValue.objects.get(id=row['id'])
                if is_wash_garment:
                    shrinkage_value.wash_shrinkage_length = row['wash_shrinkage_length']
                    shrinkage_value.wash_shrinkage_width = row['wash_shrinkage_width']
                else:
                    shrinkage_value.residual_shrinkage_length = row['residual_shrinkage_length']
                    shrinkage_value.residual_shrinkage_width = row['residual_shrinkage_width']
                    shrinkage_value.steam_shrinkage_length = row['steam_shrinkage_length']
                    shrinkage_value.steam_shrinkage_width = row['steam_shrinkage_width']
                shrinkage_value.save()

            shrink_lot_groups = shrinkage_material['shrink_lot_group_data']
            for shrink_lot_group in shrink_lot_groups:
                shrink_lot_id = shrink_lot_group['shrinkage_lot']
                shrinkage_lot_name = shrink_lot_group['shrinkage_lot_name']
                supplier_material = shrink_lot_group['supplier_material']
                supplier_po = shrink_lot_group['supplier_po']
                roll_numbers = shrink_lot_group['roll_numbers']

                shrink_lot = None
                if shrink_lot_id:
                    shrink_lot = get_object_or_404(SupplierPOShrinkLot, pk=shrink_lot_id)
                    shrink_lot.shrink_lot_name = shrinkage_lot_name
                    shrink_lot.save()
                elif not shrink_lot_id and shrinkage_lot_name:
                    shrink_lot, craeted = SupplierPOShrinkLot.objects.get_or_create(
                        supplier_po_id=supplier_po, supplier_material_id=supplier_material, shrink_lot_name=shrinkage_lot_name
                    )
                for roll in roll_numbers:
                    shrinkage_value_id = roll['shrinkage_value_id']
                    if shrink_lot:
                        shrinkage_value = get_object_or_404(SupplierPOShrinkageValue, pk=shrinkage_value_id)
                        shrinkage_value.shrinkage_lot = shrink_lot
                        shrinkage_value.save()
        return Response({'status': True}, status=status.HTTP_200_OK)

class FabricInspectionStartView(generics.RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    queryset = SupplierPOGRNMaterialDetail.objects.all()

    def get(self, request, *args, **kwargs):
        supplier_po_grn_id = kwargs['supplier_po_grn_id']
        supplier_po_grn_material_id = kwargs['supplier_po_grn_material_id']


        modal_status = 'load_next'
        material_data = {}
        next_supplier_po_grn_material_detail = None
        http_response = Response({'modal_status': 'unsuccess'})
        inspection_pending_supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(inspection_state__in = [SupplierPOGRNMaterialDetail.INSPECTION_STATE_READY_FOR_INSPECTION, SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_IN_PROGRESS],
                                                                                            supplier_po_grn_material__id = supplier_po_grn_material_id,
                                                                                            supplier_po_grn_material__supplier_po_grn = supplier_po_grn_id,
                                                                                            ).order_by('batch_number', 'id')

        supplier_po_grn_material_details = inspection_pending_supplier_po_grn_material_details.exclude(batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS).exclude(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_IN_PROGRESS).order_by('batch_number', 'id')
        if supplier_po_grn_material_details:
            next_supplier_po_grn_material_detail = supplier_po_grn_material_details[0]
            if len(supplier_po_grn_material_details) == 1:
                if not inspection_pending_supplier_po_grn_material_details.exclude(batch_number = next_supplier_po_grn_material_detail.batch_number).exists():
                    modal_status = 'last_inspection_roll'
        else:
            supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_READY_FOR_INSPECTION,
                                                                                            supplier_po_grn_material__id = supplier_po_grn_material_id,
                                                                                            ).exclude(batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED
                                                                                                    ).exclude(batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS).order_by('batch_number', 'id')
            if supplier_po_grn_material_details:
                next_supplier_po_grn_material_detail = supplier_po_grn_material_details[0]
                if len(supplier_po_grn_material_details) == 1:
                    if not inspection_pending_supplier_po_grn_material_details.exclude(batch_number = next_supplier_po_grn_material_detail.batch_number).exists():
                        modal_status = 'last_inspection_roll'
            else:
                modal_status = 'skipped_batches'
                skipped_supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_READY_FOR_INSPECTION,
                                                                                            supplier_po_grn_material__id = supplier_po_grn_material_id,
                                                                                            batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS
                                                                                            ).distinct('batch_number').order_by('batch_number', 'id')
                if not skipped_supplier_po_grn_material_details:
                    skipped_supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_IN_PROGRESS,
                                                                                            supplier_po_grn_material__id = supplier_po_grn_material_id,
                                                                                            batch_number__inspection_status = FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_INPROGRESS
                                                                                            ).distinct('batch_number').order_by('batch_number', 'id')


        if next_supplier_po_grn_material_detail:
            material_data = SupplierPOGRNMaterialDetailSerializer(next_supplier_po_grn_material_detail).data
            material_data['modal_status'] = modal_status
            http_response = Response(material_data)
        elif skipped_supplier_po_grn_material_details.exists():
            material_data['rolls'] = SupplierPOGRNMaterialDetailSerializer(skipped_supplier_po_grn_material_details, many = True).data
            material_data['modal_status'] = modal_status
            http_response = Response(material_data)

        return http_response


class InvoiceUploadView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, delivery_date_id):
        response = []
        delivery_date = get_object_or_404(SupplierDeliveryDate, pk=delivery_date_id)

        return Response({'status': True}, status=status.HTTP_200_OK)
    

class SupplierPOGRNSummaryDetailView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po', None)
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)

        data = SupplierPOSummaryDetailSerializer(supplier_po, many=False).data
        return Response(data)
    

class PackListBySupplierPOListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po= get_object_or_404(SupplierPO, pk=supplier_po_id)
        pack_list = supplier_po.get_pack_list()
        context = {'supplier_po': supplier_po}
        data = SupplierPODeliveryInvoicePackListSerializer(pack_list, context=context, many=True).data
        return Response(data)
    

class CalculationSummaryBreakdownBySupplierPurchaseOrderDetailView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po= get_object_or_404(SupplierPO, pk=supplier_po_id)
        data = SupplierPOSummary(supplier_po).get_supplier_po_summarized_data()
        return Response(data)
    

class CalculationSummaryBreakdownByDeliveryNoteDetailView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        delivery_note_id = kwargs.get('delivery_note_id', None)
        supplier_po_id = kwargs.get('supplier_po_id', None)
        delivery_note = get_object_or_404(SupplierPOInvoiceDeliveryNote, pk=delivery_note_id)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)
        data = DeliveryNoteSummary(delivery_note, supplier_po).get_delivery_note_summarized_data()
        return Response(data)
    

class CalculationSummaryBreakdownByPackListDetailView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        pack_list_id = kwargs.get('pack_list_id', None)
        supplier_po_id = kwargs.get('supplier_po_id', None)
        pack_list = get_object_or_404(SupplierPODeliveryInvoicePackList, pk=pack_list_id)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)
        data = PackListSummary(pack_list, supplier_po).get_pack_list_summarized_data()
        return Response(data, status=status.HTTP_200_OK)
    

class CalculationSummaryBreakdownByInvoiceDetailView(APIView):
    permission_classes = (HasPermission,)
    
    def get(self, request, *args, **kwargs):
        invoice_id = kwargs.get('invoice_id', None)
        supplier_po_id = kwargs.get('supplier_po_id', None)
        invoice= get_object_or_404(SupplierPODeliveryInvoice, pk=invoice_id)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)
        data = InvoiceSummary(invoice, supplier_po).get_invoice_summarized_data()
        return Response(data, status=status.HTTP_200_OK)


class CalculationSummaryBreakdownByPIDetailView(APIView, GRNMaterialSummaryCalculatorMixin):
    permission_classes = (HasPermission,)
    
    def get(self, request, *args, **kwargs):
        pi_id = kwargs.get('pi_id', None)
        delivery_date= get_object_or_none(SupplierDeliveryDate, {'performa_invoice': pi_id})
        po_club = delivery_date.po_club
        grns = delivery_date.get_delivery_date_grns()
        data = self.get_po_club_grns_material_breakdown(po_club, grns)
        return Response(data, status=status.HTTP_200_OK)
    


    

class GRNDSummaryBreakdown(APIView):
    permission_classes = (HasPermission,)
    
    def get(self, request, *args, **kwargs):
        grn_id = kwargs.get('grn_id', None)
        grn= get_object_or_404(SupplierPOGRN, id=grn_id)
        data = GRNSummary(grn).get_grn_summarized_data()
        return Response(data, status=status.HTTP_200_OK)
    

class InvoiceDetailView(APIView):
    permission_classes = (HasPermission,)
    
    def get(self, request, *args, **kwargs):
        invoice_id = kwargs.get('invoice_id', None)
        supplier_po_id = kwargs.get('supplier_po_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, id=invoice_id)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)
        context = {'supplier_po': supplier_po}
        data = SupplierPODeliveryInvoiceDetailSerializer(invoice, context=context).data
        return Response(data, status=status.HTTP_200_OK)
    

class PerformaInvoiceSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def create_new_delivery(self, split_from_bom, data):
        delivery_date = data.get('delivery_date', None)
        transport_method = data.get('transport_method', None)
        port_id = data.get('port', None)
        port = get_object_or_404(Port, pk=port_id)
        supplier_delivery_date = SupplierDeliveryDate.objects.get_or_create(
            general_po_supplier=split_from_bom.supplier_delivery_date.general_po_supplier,
            confirmed_delivery_date=delivery_date,
            transport_method=transport_method,
            supplier_port=port
        )[0]
        delivery = SupplierDeliveryDateQuantity.objects.create(
            general_po_material_quantity=split_from_bom.general_po_material_quantity,
            quantity=0,
            quantity_units=split_from_bom.quantity_units,
            supplier_delivery_date=supplier_delivery_date,
            default_supplier=split_from_bom.default_supplier,
            saved_in_house_material_status=split_from_bom.saved_in_house_material_status,
            requested_date=split_from_bom.requested_date,
            proforma_invoice_quantity=0,
            proforma_invoice_quantity_units=split_from_bom.proforma_invoice_quantity_units,
            split_from=split_from_bom,
            material_supplier=split_from_bom.material_supplier,
        )
        return delivery

    def validate_data(self, material_data):
        processed_data = []
        errors_dict = {}
        for index, row in enumerate(material_data):
            errors = {}
            proforma_invoice_quantity = convert_to_float_or_none(row['proforma_invoice_quantity'])
            proforma_invoice_quantity_units = row['proforma_invoice_quantity_units']
            transport_quantity = convert_to_float_or_none(row['transport_quantity'])
            transport_quantity_units = row['transport_quantity_units']
            ex_mill_date = row['ex_mill_date']
            delivery_date_value = row['delivery_date']
            transport_method = row.get('transport_method', None)
            port = row.get('port', None)

            if is_none(proforma_invoice_quantity):
                errors['proforma_invoice_quantity'] = "Proforma Invoice Quantity is required"

            if not proforma_invoice_quantity_units:
                errors['proforma_invoice_quantity'] = "Proforma Invoice Quantity Units is required"

            if is_none(transport_quantity):
                errors['transport_quantity'] = "Transport Quantity is required"

            if not transport_quantity_units:
                errors['transport_quantity_units'] = "Transport Quantity Units is required"

            if not ex_mill_date:
                errors['exmill_date'] = "Ex-mill date is required"

            if not delivery_date_value:
                errors['delivery_date'] = "Delivery Date is required"

            if transport_method in [AIR_TRANSPORT_METHOD, SEA_TRANSPORT_METHOD]:
                port_object = get_object_or_none_dict(Port, pk=port)

                if not port:
                    errors['port'] = "Port is required"
                elif port_object.port_type != transport_method:
                    errors['port'] = f'The selected port type doesn\'t match transport method selected. Port is a {port.port_type} port.'

            if errors:
                errors_dict[index] = errors
                continue

            errors['general_errors'] = []
            for past_delivery in processed_data:
                if transport_method == past_delivery['transport_method'] and delivery_date_value == past_delivery['delivery_date_value']:
                    errors['general_errors'].append("There are 2 deliveries for the same material with the same Delivery Date and Transport Method. Please merge the 2 deliveries into 1 delivery")

            po_allocations = row['po_allocations']
            total_value = 0
            for po_allocation in po_allocations:
                #print(po_allocation['proforma_invoice_quantity'])
                total_value += get_float_or_zero(po_allocation['proforma_invoice_quantity'])

            if proforma_invoice_quantity != transport_quantity:
                #print(total_value, transport_quantity)
                errors['general_errors'].append("Allocated quantity must match the transport quantity")

            if len(errors.get('general_errors', [])) == 0:
               errors.pop('general_errors')

            if len(errors.keys()) > 0:
                errors_dict[index] = errors
            processed_data.append({'transport_method': transport_method, 'delivery_date_value': delivery_date_value})

        return len(errors_dict.keys()) == 0, errors_dict

    def delete_deliveries(self, delete_delivery_ids):
        delete_deliveries = SupplierDeliveryDateQuantity.objects.filter(pk__in=delete_delivery_ids)
        errors = []
        print(delete_deliveries, 'delete_deliveries')
        for delivery in delete_deliveries:
            print(delivery.split_from, delivery.supplier_delivery_date.actual_delivery_date)
            if delivery.split_from and is_none(delivery.supplier_delivery_date.actual_delivery_date):
                delivery.delete()
            else:
                errors.append({'delivery_id': delivery.pk, 'message': "Delivery deletion failed. Either the delivery has already been made or this is not a splitted delivery"})
        return errors

    def post(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        deleted_delivery_ids = request.data.get('deleted_delivery_ids', None)
        proforma_invoice = request.data.get('performa_invoice', {})
        proforma_invoice_supplier_display_number = request.data.get('proforma_invoice_supplier_display_number', {})
        material_data = request.data.get('material_data', [])
        advance_payment = request.data.get('advance_payment', None)
        advance_payment_currency = request.data.get('advance_payment_currency', None)
        advance_payment_due_date = request.data.get('advance_payment_due_date', None)
        proforma_invoice_date = request.data.get('proforma_invoice_date', None)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)

        if proforma_invoice:
            id = proforma_invoice['id']
            attachment = get_object_or_404(FileAttachment, pk=id)
            supplier_po.proforma_invoice = attachment
            supplier_po.save()

        if proforma_invoice_supplier_display_number:
            supplier_po.proforma_invoice_supplier_display_number = proforma_invoice_supplier_display_number
            supplier_po.save()

        supplier_po.advance_payment = advance_payment
        supplier_po.advance_payment_currency = advance_payment_currency
        supplier_po.advance_payment_due_date = advance_payment_due_date
        supplier_po.proforma_invoice_date = proforma_invoice_date
        supplier_po.save()
        errors = []

        for material in material_data:
            data = material['material_details']
            bom_supplier_data = data['bom_data']
            valid, material_errors = self.validate_data(bom_supplier_data)
            if valid:
                for bom_supplier in bom_supplier_data:
                    id = bom_supplier.get('id', None)
                    proforma_invoice_quantity = bom_supplier['proforma_invoice_quantity']
                    proforma_invoice_quantity_units = bom_supplier['proforma_invoice_quantity_units']
                    transport_quantity = bom_supplier['transport_quantity']
                    transport_quantity_units = bom_supplier['transport_quantity_units']
                    ex_mill_date = bom_supplier['ex_mill_date']
                    delivery_date_value = bom_supplier['delivery_date']
                    transport_method = bom_supplier.get('transport_method', None)
                    port = bom_supplier.get('port', None)

                    po_allocations = bom_supplier['po_allocations']
                    print(ex_mill_date, transport_quantity, transport_quantity_units, "ex_mill_date, transport_quantity, transport_quantity_units")

                    if not is_none(id):
                        bom = SupplierDeliveryDateQuantity.objects.get(pk=id)
                    else:
                        split_from_id = bom_supplier.get('split_from')
                        split_from_bom = get_object_or_404(SupplierDeliveryDateQuantity, pk=split_from_id)
                        bom = self.create_new_delivery(split_from_bom, bom_supplier)

                    bom.proforma_invoice_quantity = proforma_invoice_quantity
                    bom.proforma_invoice_quantity_units = proforma_invoice_quantity_units
                    delivery_date = bom.supplier_delivery_date
                    delivery_date.confirmed_delivery_date = delivery_date_value
                    delivery_date.transport_method = transport_method
                    bom.transport_quantity = transport_quantity
                    bom.transport_quantity_units = transport_quantity_units
                    bom.ex_mill_date = ex_mill_date
                    bom.port_id = port
                    delivery_date.save()
                    bom.save()

                    for row in po_allocations:
                        po_allocation = get_object_or_none_dict(SupplierDeliveryDateQuantityPOAllocation, pk=row['id'])
                        if is_none(po_allocation):
                            po_allocation = SupplierDeliveryDateQuantityPOAllocation.objects.get_or_create(purchase_order_id=row['purchase_order'], supplier_delivery_date_quantity=bom)
                        po_allocation.proforma_invoice_quantity = row['proforma_invoice_quantity']
                        po_allocation.proforma_invoice_quantity_units = bom.transport_quantity_units
                        po_allocation.save()
            else:
                errors.append(material_errors)

        deletion_errors = []
        if deleted_delivery_ids:
            deletion_errors = self.delete_deliveries(deleted_delivery_ids)

        response = Response({'status': True})

        if errors or deletion_errors:
            response = Response({'form_errors': errors, 'deletion_errors': deletion_errors}, status=status.HTTP_400_BAD_REQUEST)
        return response
    

class PerformaInvoiceDetailView(APIView):
    permission_classes = (HasPermission,)

    def get_allocate_pos(self, supplier_po):
        general_po = supplier_po.general_po_supplier

    def get(self, request, *args, **kwargs):
        response = {}
        proforma_invoice_attachment = None
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)

        materials = supplier_po.get_supplier_po_material_list()
        context = {'supplier_po': supplier_po}
        material_data = SupplierPOCustomerBrandMaterialSerializer(materials, context=context, many=True).data
        proforma_invoice = supplier_po.proforma_invoice


        if proforma_invoice:
            proforma_invoice_attachment = proforma_invoice.get_object_data()
        response = {
            'performa_invoice': proforma_invoice_attachment,
            'proforma_invoice_supplier_display_number': supplier_po.proforma_invoice_supplier_display_number,
            'material_data': material_data,
            'advance_payment': supplier_po.advance_payment,
            'advance_payment_currency': supplier_po.advance_payment_currency,
            'advance_payment_due_date': supplier_po.advance_payment_due_date,
            'proforma_invoice_date': supplier_po.proforma_invoice_date,
        }
        return Response(response, status=status.HTTP_200_OK)
    

class PCLCalendarWeekView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        data = []
        return Response(data, status=status.HTTP_200_OK)
