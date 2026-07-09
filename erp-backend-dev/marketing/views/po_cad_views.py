from rest_framework import status, generics
from rest_framework.generics import get_object_or_404
from shared.utils import get_object_or_none
from rest_framework.response import Response
from rest_framework.views import APIView
from marketing.mixins.order_mixins import OrderMixin
from marketing.models import ActualPOClub, Item, POFabricMarker, POPackItemPlacement, PurchaseOrder, \
    POPack, PurchaseOrderBom, POPackItem, SupplierInquiryDetail, \
    FabricWidth, FabricWidthSupplier, POFabricMarkerPlacement, SupplierPOGRNMaterial, POMarkerPoint, POClubMaterialColorTone, \
    POClubLeftOverMaterial, CADMarkerPlacement, POCADMarkerUpload
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin
from marketing.serializers import FabricMarkerSerializer, FabricWidthSerializer, \
    SupplierPOGRNMaterialSerializer, POMarkerPointSerializer, POClubMaterialColorToneSerializer, CustomerBrandMaterialBasicSerializer
from materials.models import CustomerBrandMaterial, UserDefinedMaterial, Material, SEWING_TRIM_TYPES, PACKAGING_TYPES
from shared.helpers.field_validators import valid_float_field, valid_integer_field
from shared.permissions.roles import CAD_USER_ROLE, MERCHANT_ROLE
from shared.permissions.view_permissions import HasPermission
from marketing.mixins.material_mixins import CADPOColorwayCountryItemPlacementHelper
from marketing.serializers import FileAttachmentSerializer, POPackSerializer, BomSerializer,  FabricWidthSupplierSerializer, POFabricMarkerPlacementSerializer
from shared.models import FileAttachment
from django.db.models import Q, Sum
from marketing.mixins.actual_club_helper import ActualClubPlacementHelper
from marketing.scripts.po_marker_excel_file_readers import PlacementAreaDetailFileReader, MiniMarkerFileReader, POFabricMarkerCreator
from django.db import transaction


class POClubItemFabricPlacements(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get_filtered_po_pack_items(self, pos, item_id, po_material_id):

        po_pack_item_ids = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__purchase_order__in=pos,
            po_pack_item__order_pack_item__item__item_id=item_id,
            po_material_id=po_material_id).values_list('po_pack_item_id', flat=True)
        
        filtered_po_pack_items = POPackItem.objects.filter(id__in=po_pack_item_ids).order_by(
            'po_pack__po_colorway',
            'po_pack__po_colorway__po_country__order_country__country__name',
            'po_pack__po_size__order_size__size__sorting_order',
            'po_item__order_item__item_identifier',
        )

        return filtered_po_pack_items

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        item_id = kwargs.get('item_id', None)
        po_material_id = kwargs.get('po_material_id', None)

        club = get_object_or_404(ActualPOClub, pk=po_club_id)
        pos = club.get_purchase_orders()

        po_pack_items = self.get_filtered_po_pack_items(pos, item_id, po_material_id)
        
        fabric_width_list = club.get_fabric_widths(po_material_id)
        
        response = {
            'placements': [],
            'cutting_width': []
        }

        for po_pack_item in po_pack_items:
            placement_display = '%s - %s' %(po_pack_item.po_pack.purchase_order.name, po_pack_item.get_po_pack_item_display())
            data = {
                'display_value': placement_display,
                'po_pack_item_id': po_pack_item.pk

            }
            response['placements'].append(data)

        for fabric_width in fabric_width_list:
            width_display = '%s %s' %(fabric_width.width, fabric_width.get_width_unit_display())
            data = {
                'display_value': width_display,
                'width': fabric_width.pk

            }
            response['cutting_width'].append(data)

        return Response(response)
    

# class MarkerFabricWidthSupplierDetailView(generics.ListAPIView):
#     permission_classes = (HasPermission,)
#     write_roles = [CAD_USER_ROLE, ]
#     serializer_class = FabricWidthSupplierSerializer

#     def get_queryset(self):
#         actual_po_club_id = self.kwargs.get('actual_po_club_id')
#         fabric_width_id = self.kwargs.get('fabric_width_id')
#         qs = FabricWidthSupplier.objects.filter(width__actual_po_club_id=actual_po_club_id, width_id=fabric_width_id)
#         return qs


# class POCreateNewFabricMarker(ObjectStatePermissionMixin, OrderMixin, APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [CAD_USER_ROLE, ]
#     editable_states = [ActualPOClub.PENDING_CAD_DATA,]

#     def get_object_current_state(self):
#         po_club_id = self.kwargs.get('po_club_id', None)
#         self.club = get_object_or_404(ActualPOClub, pk=po_club_id)
#         return self.club.state

#     def post(self, request, *args, **kwargs):
#         po_club_id = kwargs.get('po_club_id', None)
#         marker_id = self.request.data.get('marker_id', None)
#         po_pack_item_ids = self.request.data.get('po_pack_item_ids', [])
#         po_material_id = self.request.data.get('po_material', None)
#         width_id = self.request.data.get('width', None)

#         width = get_object_or_404(FabricWidth, pk=width_id)
#         po_material = get_object_or_404(CustomerBrandMaterial, pk=po_material_id)
#         po_pack_items = POPackItem.objects.filter(id__in=po_pack_item_ids)

#         if marker_id is None:
#             serializer = FabricMarkerSerializer(data=request.data)
#         else:
#             fabric_marker = get_object_or_404(POFabricMarker, pk=marker_id)
#             serializer = FabricMarkerSerializer(fabric_marker, data=request.data)

#         if serializer.is_valid():
#             marker = serializer.save()
#             marker.width = width
#             marker.save()
#             for po_pack_item in po_pack_items:
#                 pack_item_fabrci_marker_detail, created = POPackItemFabricMarkerDetail.objects.get_or_create(marker=marker, po_pack_item=po_pack_item)
#                 pack_item_material_placement_area, created = POPackItemMaterialPlacementArea.objects.get_or_create(po_pack_item=po_pack_item, po_material=marker.po_material)
#             response = Response({'success': True})
#         else:
#             response = Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#         return response


class ActualClubMergeMaterials(ObjectStatePermissionMixin, OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, ]
    editable_states = [ActualPOClub.PENDING_MATERIALS_REVIEW_STATE,]

    def get_object_current_state(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        self.club = get_object_or_404(ActualPOClub, pk=po_club_id)
        return self.club.state

    def verify_material_consistency(self, materials, selected_material):
        valid = True
        for material in materials:
            if material.material_detail.generic_material != selected_material.material_detail.generic_material:
                valid = False
        return valid

    def post(self, request, *args, **kwargs):
        merge_ids = self.request.data.get('merge_ids', None)

        materials = CustomerBrandMaterial.objects.filter(pk__in=merge_ids).order_by('id')

        if materials.exists():
            selected_material = materials.first()
            valid = self.verify_material_consistency(materials, selected_material)

            if not valid:
                ud_material = UserDefinedMaterial.objects.get(name='fabric')
                attributes = ud_material.get_material_fields_excluding_variation_fields().values_list('label', flat=True)
                data = ", ".join(attributes)
                return Response({'error': "Failed to merge materials. Please make sure that the following fields are the same: %s" % data}, status=status.HTTP_400_BAD_REQUEST)
            else:
                self.club.get_all_pack_item_placements_in_clubbing_by_material(materials).update(po_material=selected_material)

                for material in materials:
                    if selected_material.pk != material.pk:
                        selected_material.marked_duplicate = True
                        selected_material.save()
        return Response({'success': True})


class POClubItemFabricMarkerRetriveDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = FabricMarkerSerializer
    queryset = POFabricMarker.objects.all().order_by('-id')


class POClubItemNotSelectFabricMarkerListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = FabricMarkerSerializer

    def get_queryset(self):
        po_club_id = self.kwargs.get('po_club_id')
        po_material_id = self.kwargs.get('po_material_id')
        item_id = self.kwargs.get('item_id')
        marker_id = self.kwargs.get('marker_id')
        qs = POFabricMarker.objects.filter(po_club_id=po_club_id, po_material_id=po_material_id, item_id=item_id).exclude(id=marker_id)
        return qs


class POClubItemFabricMarkersPlacementsCopyView(ObjectStatePermissionMixin, OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]
    serializer_class = FabricMarkerSerializer
    editable_states = [ActualPOClub.PENDING_LEFTOVER_MARKER_CREATION, ActualPOClub.PENDING_BOOKING_MARKER_CREATIONS,]

    def get_object_current_state(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        self.club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        self.marker = self.get_object_or_404(POFabricMarker, pk=self.kwargs['marker_id'], po_club=self.club)
        return self.club.state
    
    def check_only_marker(self):
        is_only = False
        len = POFabricMarker.objects.filter(po_club=self.club, po_material=self.marker.po_material, item=self.marker.item).count()
        if len == 1:
            is_only = True
        return is_only

    def post(self, request, *args, **kwargs):
        destination_marker_id = request.data.get('destination_marker_id', None)
        po_pack_item_ids = self.request.data.get('po_pack_item_ids', [])
        removed = self.request.data.get('removed', False)
        destination_marker = get_object_or_404(POFabricMarker, pk=destination_marker_id)
        po_pack_items = POPackItem.objects.filter(id__in=po_pack_item_ids)

        if removed:
            for po_pack_item in po_pack_items:
                po_pack_item_fabric_marker_detail = get_object_or_none(
                    POPackItemFabricMarkerDetail, {'marker': self.marker, 'po_pack_item': po_pack_item}
                )
                if po_pack_item_fabric_marker_detail is not None:
                    po_pack_item_fabric_marker_detail.delete()
                POPackItemFabricMarkerDetail.objects.get_or_create(marker=destination_marker, po_pack_item=po_pack_item)
            if not self.check_only_marker():
                if not self.marker.get_marker_placements():
                    self.marker.delete()
        else:
            for po_pack_item in po_pack_items:
                po_pack_item_fabric_marker_detail = POPackItemFabricMarkerDetail.objects.get_or_create(
                    po_pack_item=po_pack_item, marker=destination_marker
                )
        return Response({'status':True}, status=status.HTTP_200_OK)
    

class FabricMarkerPlacementDeleteView(ObjectStatePermissionMixin, OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, ]
    editable_states = [ActualPOClub.PENDING_LEFTOVER_MARKER_CREATION, ActualPOClub.PENDING_BOOKING_MARKER_CREATIONS,]

    def get_object_current_state(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        self.club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        self.marker = self.get_object_or_404(POFabricMarker, pk=self.kwargs['marker_id'], po_club=self.club)
        return self.club.state
    
    def check_only_marker(self):
        is_only = False
        len = POFabricMarker.objects.filter(po_club=self.club, po_material=self.marker.po_material, item=self.marker.item).count()
        if len == 1:
            is_only = True
        return is_only
    
    def post(self, request, *args, **kwargs):
        po_pack_item_ids = self.request.data.get('po_pack_item_ids', [])
        POPackItemFabricMarkerDetail.objects.filter(po_pack_item__in=po_pack_item_ids, marker=self.marker).delete()
        #POPackItemMaterialPlacementArea.objects.filter(po_pack_item__in=po_pack_item_ids, po_material=self.marker.po_material).delete()
        if not self.check_only_marker():
            if not self.marker.get_marker_placements():
                self.marker.delete()
        else:
             return Response({'errors':'This marker is only marker for the current material. It cannot be deleted. placement are deleted'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status':True}, status=status.HTTP_200_OK)
    

class ActualClubFabricList(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = self.kwargs.get('po_club_id', None)
        club = get_object_or_404(ActualPOClub, pk=po_club_id)
        placements = club.get_all_pack_item_placements_in_clubbing(Material.FABRIC_MATERIAL)
        material_ids = placements.values_list('po_material_id', flat=True).distinct()

        fabrics = CustomerBrandMaterial.objects.filter(pk__in=material_ids).order_by('material_detail__generic_material', 'material_detail',)

        data = []
        for fabric in fabrics:
            material_color_tone = get_object_or_none(POClubMaterialColorTone, {'po_club': club, 'material': fabric})
            color_tone_data = None
            if material_color_tone:
                color_tone_data = POClubMaterialColorToneSerializer(material_color_tone, many=False).data
            attributes = fabric.get_customer_brand_material_details()
            attributes['color_tones'] = color_tone_data
            data.append(attributes)
        return Response(data)


class ActualClubMaterialList(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = self.kwargs.get('po_club_id', None)
        club = get_object_or_404(ActualPOClub, pk=po_club_id)
        # placements = club.get_all_pack_item_placements_in_clubbing(Material.FABRIC_MATERIAL)
        placements = club.get_all_material_type_pack_item_placements_in_clubbing()
        material_ids = placements.values_list('po_material_id', flat=True).distinct()

        materials = CustomerBrandMaterial.objects.filter(pk__in=material_ids).order_by('material_detail__generic_material__user_material__display_order', 'material_detail',)

        data = []
        for material in materials:
            material_color_tone = get_object_or_none(POClubMaterialColorTone, {'po_club': club, 'material': material})
            color_tone_data = None
            if material_color_tone:
                color_tone_data = POClubMaterialColorToneSerializer(material_color_tone, many=False).data
            attributes = CustomerBrandMaterialBasicSerializer(material).data #material.get_customer_brand_material_details()
            attributes['color_tones'] = color_tone_data
            attributes['costing_version_id'] = club.get_costing().id
            data.append(attributes)
        return Response(data)


class POActualClubFabricCadData(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_marker_id = kwargs.get('marker_id', None)

        po_club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        marker = self.get_object_or_404(POFabricMarker, pk=po_marker_id, po_club=po_club)

        attachment_serializer = FileAttachmentSerializer(data=marker.attachments.all(), many=True)
        attachment_serializer.is_valid()

        marker_data = {
            'marker_name': marker.marker_name,
            'width': marker.width.id if marker.width else None,
            'consumption_ratio': marker.consumption_ratio,
            'wastage': marker.wastage,
            'reviewed': marker.reviewed,
            'marker_plys': marker.no_of_plys,
            'marker_length': marker.length,
            'fabric_width_supplier': marker.fabric_width_supplier.id if marker.fabric_width_supplier else None,
            'attachments': attachment_serializer.data,
            'data': []
        }

        marker_placements = marker.get_marker_placements().order_by(
            'po_pack_item__po_pack__po_colorway',
            'po_pack_item__po_pack__po_country__order_country__country__name',
            'po_pack_item__po_pack__po_size__order_size__size__sorting_order',
            'po_pack_item__po_item__order_item__item_identifier',
        )

        for marker_placement in marker_placements:
            item_name = '%s - %s' %(marker_placement.po_pack_item.po_pack.purchase_order.name, marker_placement.po_pack_item.get_po_pack_item_display())
            area = marker_placement.get_area()
            marker_data['data'].append({
                'item_name': item_name,
                'po_pack_item_id': marker_placement.po_pack_item.id,
                'item_id': marker_placement.po_pack_item.order_pack_item.item.item.id,
                'ratio_id': marker_placement.id,
                'ratio': marker_placement.marker_ratio,
                'area_id': area.id if area else None,
                'area': area.area if area else None,
                'placements': []
            })
            fabric_placements = marker_placement.po_pack_item.popackitemplacement_set.all().filter(po_material=marker.po_material)

            for fabrci_placement in fabric_placements:
                marker_data['data'][-1]['placements'].append({
                    'name': fabrci_placement.costing_pack_item_placement.item_attribute_other.name
                })

        return Response(marker_data)


# class SaveActualPOClubFabricData(ObjectStatePermissionMixin, OrderMixin, APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [CAD_USER_ROLE, ]
#     editable_states = [ActualPOClub.PENDING_CAD_DATA,]
#     consumption_errors = {}
#     ratio_errors = {}
#     area_errors = {}
#     attachment_errors = {}
#     PO_CONSUMPTION_DATE_KEY = 'po_consumption_data'
#     PO_WASTAGE_KEY = 'po_wastage'
#     PO_PACK_ITEM_RATIO_KEY = 'po_pack_item_ratio'
#     PO_PACK_ITEM_AREA_KEY = 'po_pack_item_area'
#     MARKER_PLYS_KEY = 'marker_plys'
#     MARKER_LENGTH_KEY = 'marker_length'

#     def get_object_current_state(self):
#         po_club_id = self.kwargs.get('po_club_id', None)
#         self.club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
#         self.marker = self.get_object_or_404(POFabricMarker, pk=self.kwargs['marker_id'], po_club=self.club)
#         return self.club.state

#     def valid_consumption_data(self, consumption_ratio, wastage, no_of_plys, length):
#         row_errors = {}
#         if not consumption_ratio and not valid_float_field(consumption_ratio):
#             row_errors[self.PO_CONSUMPTION_DATE_KEY] = 'Enter a number'

#         if not wastage and not valid_float_field(wastage):
#             row_errors[self.PO_WASTAGE_KEY] = 'Enter a number'
#         valid = True

#         if not no_of_plys and not valid_float_field(no_of_plys):
#             row_errors[self.MARKER_PLYS_KEY] = 'Enter a number'
#         valid = True

#         if not length and not valid_float_field(length):
#             row_errors[self.MARKER_LENGTH_KEY] = 'Enter a number'
#         valid = True

#         if row_errors:
#             valid = False
#             self.consumption_errors[self.marker.id] = row_errors
#         else:
#             self.marker.consumption_ratio = consumption_ratio
#             self.marker.wastage = wastage
#             self.marker.no_of_plys = no_of_plys
#             self.marker.length = length
#             self.marker.save()
#         return valid

#     def valid_placement_area(self, area_id, area):
#         row_errors = {}
#         if not area and not valid_float_field(area):
#             row_errors[self.PO_PACK_ITEM_AREA_KEY] = 'Enter a number'

#         valid = True
#         if row_errors:
#             valid = False
#             self.area_errors[area_id] = row_errors
#         return valid
    
#     def valid_placement_ratio(self, ratio_id, ratio):
#         row_errors = {}

#         if not ratio and not valid_float_field(ratio):
#             row_errors[self.PO_PACK_ITEM_RATIO_KEY] = 'Enter a number'

#         valid = True
#         if row_errors:
#             valid = False
#             self.ratio_errors[ratio_id] = row_errors
#         return valid

#     def verify_and_save_reviewed(self, reviewed):
#         valid = True
#         if reviewed:
#             if self.marker.attachments.all().count() == 0:
#                 valid = False
#                 self.marker.reviewed = False
#                 self.marker.save()
#             else:
#                 valid = True
#                 self.marker.reviewed = reviewed
#                 self.marker.save()
#         else:
#             self.marker.reviewed = False
#             self.marker.save()
#         return valid

#     def get_http_response(self, reviewed_valid):
#         errors = {}
#         if not reviewed_valid:
#             errors['reviewed'] = "Please make sure that each marker has an attachment, and the consumption ratios, wastage and placement areas are not empty"

#         if self.consumption_errors:
#             errors['consumption_errors'] = self.consumption_errors

#         if self.area_errors:
#             errors['area_errors'] = self.area_errors

#         if self.ratio_errors:
#             errors['ratio_errors'] = self.ratio_errors

#         if self.attachment_errors:
#             errors['attachment_errors'] = self.attachment_errors
#         response = Response({'success': True, 'reviewd': self.marker.reviewed})
#         if errors:
#             response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
#         return response
    
#     def save_attachments(self, reviewed, attachments):
#         is_upload = False
#         new_attachments = []
#         current_attachments = self.marker.attachments.all()

#         if attachments:
#             for attachment in attachments:
#                 attachment_id = attachment['id']
#                 attachment_file = get_object_or_404(FileAttachment, pk=attachment_id)
#                 self.marker.attachments.add(attachment_file)
#                 new_attachments.append(attachment_file)

#             for current_attachment in current_attachments:
#                 if current_attachment not in new_attachments:
#                     self.marker.attachments.remove(current_attachment)
#             is_upload = True
#         else:
#             current_attachments = self.marker.attachments.clear()
#             is_upload = False
#             if reviewed:
#                 self.attachment_errors[self.marker.id]= {'attachment':'Please select the attachment'}
#         return is_upload

#     def post(self, request, *args, **kwargs):
#         self.consumption_errors = {} # Don't remove this
#         self.area_errors = {} # Don't remove this
#         self.ratio_errors = {}
#         self.attachment_errors = {}

#         marker = self.marker
#         data = request.data.get('cad_data', [])
#         attachments = data.get('attachments', [])
#         reviewed = data.get('reviewed', False)
#         placement_data = data.get('data', [])
#         consumption_ratio = data.get('consumption_ratio', None)
#         wastage = data.get('wastage', None)
#         no_of_plys = data.get('marker_plys', None)
#         length = data.get('marker_length', None)

#         marker_valid = self.valid_consumption_data(consumption_ratio, wastage, no_of_plys, length)
#         is_uplopad = self.save_attachments(reviewed, attachments)

#         for row in placement_data:
#             po_pack_item_id = row.get('po_pack_item_id', None)
#             ratio_id = row.get('ratio_id', None)
#             ratio = row.get('ratio', None)
#             area_id = row.get('area_id', None)
#             area = row.get('area', None)

#             ratio_valid = self.valid_placement_ratio(ratio_id, ratio)
#             area_valid = self.valid_placement_area(area_id, area)
#             if ratio_valid and area_valid:
#                 ratio_obj = get_object_or_404(POPackItemFabricMarkerDetail, pk=ratio_id)
#                 area_obj = get_object_or_404(POPackItemMaterialPlacementArea, pk=area_id)
            
#                 ratio_obj.marker_ratio = ratio
#                 area_obj.area = area

#                 ratio_obj.save()
#                 area_obj.save()

#         valid = self.verify_and_save_reviewed(reviewed)
#         response = self.get_http_response(valid)
#         return response
            

class POClubPacksNavigation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POPackSerializer

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        actual_po_club = self.get_po_club_or_raise_http404(po_club_id)
        pos = PurchaseOrder.objects.filter(actual_po_club=actual_po_club)
        response = []
        for purchase_order in pos:
            packs = POPack.objects.filter(purchase_order=purchase_order).order_by('po_colorway__colorway',
                                                                                'po_country__po_country_name',
                                                                                'po_size__order_size__size__sorting_order')
            data = ({
                'po_id': purchase_order.id,
                'po_name': purchase_order.name,
                'pack_details': []
            })
            
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
                data['pack_details'].append(pack_details)
            response.append(data)
        return Response(response)
    

class POClubBOMRefreshCreateView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [ActualPOClub.PENDING_BOM_VERIFICATION_STATE,]

    def get_object_current_state(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        self.club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        return self.club.state

    def post(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        pos = PurchaseOrder.objects.filter(actual_po_club=po_club)
        po_markers = POFabricMarker.objects.filter(actual_club=po_club, marker_classification=POFabricMarker.BOOKING_MARKER)
        response = {}
        if pos.exists() and po_markers.exists():
            for po in pos:
                if po.state in [PurchaseOrder.CAD_COMPLETED, PurchaseOrder.MATERIALS_ASSIGNED]:
                    #po.build_purchase_order_bom()
                    pass
            user_define_material = get_object_or_none(UserDefinedMaterial, {'name': Material.FABRIC_MATERIAL})
            po_club.generate_po_club_purchase_order_bom(user_define_material)
            create_club_bom = po_club.aggregate_bom_by_material_and_supplier_inquiry_detail_and_create_bom(user_define_material)
            po_club.state = ActualPOClub.ACTUAL_PO_BOM_FINALIZED
            po_club.save()
            response = {'status': 'Created boms and selected the most efficient marker.'}
            return Response(response, status=status.HTTP_200_OK)
        else:
            response = {'errors': 'Purchase order or markers not found.'}
            return Response(response, status=status.HTTP_400_BAD_REQUEST)
        

class ActualClubPurchaseOrdersBomView(generics.ListAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = BomSerializer

    def get_queryset(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        po_club = self.get_po_club_or_raise_http404(po_club_id)
        bom = PurchaseOrderBom.objects.filter(purchase_order__actual_po_club=po_club)
        return bom
    



#### NEW MARKER CODE BELOW 1/16/2024
class POClubFabricsView(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        club = get_object_or_404(ActualPOClub, pk=po_club_id)
        # item_ids = club.get_item_ids()
        # items = Item.objects.filter(pk__in=item_ids)
        data = []
        # customer_brand_material_ids = []
        # for item in items:
        #     placements = club.get_pack_item_fabric_placements(item.pk)
        #     for placement in placements:
        #         material_id = placement.po_material_id
        #         if not material_id in customer_brand_material_ids:
        #             customer_brand_material_ids.append(placement.po_material_id)
            # data.append({
            #     'item_id': item.pk,
            #     'item_name': item.name,
            # })
        customer_brand_materials = club.get_fabrics_in_po_club()
        data = CustomerBrandMaterialBasicSerializer(customer_brand_materials, many=True).data
        return Response(data)


class POClubFabricMarkers(OrderMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get_item_material_data(self, club, item_id):
        placements = club.get_pack_item_fabric_placements(item_id)
        material_ids = placements.values_list('po_material_id', flat=True).distinct()
        materials = CustomerBrandMaterial.objects.filter(pk__in=material_ids)

        placement_materials = []
        for material in materials:
            placement_materials.append({
                'customer_brand_material_id': material.id,
                'verbose_reference_code': material.verbose_reference_code,
                'attributes': material.get_attributes()
            })
        return placement_materials

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        material_id = kwargs.get('material_id', None)
        marker_classification = request.query_params.get('marker_classification')
        club = get_object_or_404(ActualPOClub, pk=po_club_id)

        markers = POFabricMarker.objects.filter(actual_club=club, po_material__id=material_id, derived_from_marker=None, marker_classification=marker_classification).order_by('id')
        data = []
        for marker in markers:
            marker_data = {
                'po_material_id': marker.po_material_id,
                'marker_id': marker.pk,
                'marker_name': marker.marker_name,
                'reviewed': marker.reviewed,
                'marker_type': marker.marker_type,
                'marker_classification': marker.marker_classification,
                'marker_type_display': marker.get_marker_type_display(),
                'void_marker': marker.void_marker,
                'placements': []
            }

            marker_placements = marker.get_marker_placements().order_by(
                'placement__po_pack_item__po_pack__po_colorway',
                'placement__po_pack_item__po_pack__po_country__order_country__country__name',
                'placement__po_pack_item__po_pack__po_size__order_size__size__sorting_order',
                'placement__po_pack_item__po_item__order_item__item_identifier',
            )

            for marker_placement in marker_placements:
                filled_count = marker_placement.placement.pofabricmarkerplacement_set.filter(filled_placement_quantity__isnull=False).aggregate(Sum('filled_placement_quantity'))
                po_number = marker_placement.placement.po_pack_item.po_pack.purchase_order.get_purchase_order_display_name()

                marker_data['placements'].append({
                    'market_placement_id': marker_placement.pk,
                    'po_pack_item_placement_id': marker_placement.placement.id,
                    'ratio': marker_placement.ratio,
                    'area': marker_placement.area,
                    'filled_quantity': filled_count['filled_placement_quantity__sum'],
                    'required_quantity': marker_placement.placement.po_pack_item.po_pack.quantity,
                    'placement': str(po_number) + " - " + str(marker_placement.placement.get_po_pack_item_display())
                })
            data.append(marker_data)

        # response_data = {
        #     'materials': self.get_item_material_data(club, item_id),
        #     'markers': data
        # }
        return Response(data)


class POFabricMarkerItemPlacementsView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('actual_club_id', None)
        material_id = kwargs.get('customer_brand_material_id', None)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        # item = get_object_or_404(Item, pk=item_id)
        actual_po_club = self.get_po_club_or_raise_http404(po_club_id)
        item_ids = actual_po_club.get_item_ids()
        response = {
            'display_name': material.verbose_reference_code,
            'placements': []
        }
        for item_id in item_ids:
            placements = actual_po_club.get_pack_item_fabric_placements(item_id).filter(po_material_id=material_id).order_by('po_pack_item__po_pack__purchase_order',
                                                                                    'po_pack_item__po_pack__po_colorway__colorway',
                                                                                    'po_pack_item__po_pack__po_country__po_country_name',
                                                                                    'po_pack_item__po_pack__po_size__order_size__size__sorting_order')


            for placement in placements:
                print("placement name", placement.po_pack_item.po_pack.purchase_order.name)
                name = '%s - %s - %s' % (placement.po_pack_item.po_pack.purchase_order.name, 
                                        placement.po_pack_item.get_po_pack_item_display(), 
                                        placement.costing_pack_item_placement.placement_name)
                name = '%s - %s - %s' % (placement.po_pack_item.po_pack.purchase_order.name, 
                                        placement.po_pack_item.get_po_pack_item_display(), 
                                        placement.costing_pack_item_placement.item_attribute_other.name)
                filled_count = placement.pofabricmarkerplacement_set.filter(filled_placement_quantity__isnull=False).aggregate(Sum('filled_placement_quantity'))

                response['placements'].append({
                    'id': placement.id,
                    'size_id': placement.po_pack_item.po_pack.po_size.order_size.size.id,
                    'name': name,
                    'filled_quantity': filled_count['filled_placement_quantity__sum'],
                    'required_quantity': placement.po_pack_item.po_pack.quantity
                })
            
        return Response(response, status=status.HTTP_200_OK)


class CreatePOFabricSubMarker(ObjectStatePermissionMixin, APIView, OrderMixin):
    editable_states = [ActualPOClub.PENDING_LEFTOVER_MARKER_CREATION, ActualPOClub.PENDING_BOOKING_MARKER_CREATIONS, ]
    write_roles = (CAD_USER_ROLE,)
    permission_classes = (HasPermission,)

    def get_object_current_state(self):
        parent_marker_id = self.kwargs.get('parent_marker_id', None)
        marker = self.get_object_or_404(POFabricMarker, pk=parent_marker_id)
        self.club = marker.actual_club
        return self.club.state

    def get_placement_ids(self, marker_placements):
        placement_ids = []

        for marker_placement in marker_placements:
            placement_ids.append(marker_placement['marker_placement_id'])
        return placement_ids

    def post(self, request, *args, **kwargs):
        marker_placements = request.data.get('marker_placements', [])
        marker_id = self.kwargs.get('parent_marker_id', None)

        marker = POFabricMarker.objects.get(pk=marker_id)
        marker_placement_ids = self.get_placement_ids(marker_placements)

        parent_marker_placements = POFabricMarkerPlacement.objects.filter(pk__in=marker_placement_ids, marker=marker)

        if parent_marker_placements.count() != len(marker_placements) or not marker_placements:
            return Response({'success': False, 'errors': ["Selected placements not founds"]}, status=status.HTTP_400_BAD_REQUEST)

        new_marker = POFabricMarker.objects.create(
            marker_type=POFabricMarker.PLACEMENT_LEVEL_MARKER,
            item=marker.item,
            po_material=marker.po_material,
            actual_club=marker.actual_club
        )

        for marker_placement in marker_placements:

            parent_placement = parent_marker_placements.get(pk=marker_placement['marker_placement_id'])
            new_marker_placement = POFabricMarkerPlacement.objects.create(
                marker=new_marker,
                placement=parent_placement.placement,
                area=marker_placement['area'],
                ratio=marker_placement['ratio'],
            )
            new_marker_placement.related_marker_placements.add(parent_placement)
        return Response({'success': True})


class CreatePOFabricMarker(ObjectStatePermissionMixin, APIView, OrderMixin):
    editable_states = [ActualPOClub.PENDING_LEFTOVER_MARKER_CREATION, ActualPOClub.PENDING_BOOKING_MARKER_CREATIONS, ActualPOClub.PENDING_BOM_VERIFICATION_STATE, ActualPOClub.ACTUAL_PO_BOM_FINALIZED, ActualPOClub.BOM_EMAILS_SENT]
    write_roles = (CAD_USER_ROLE, )
    permission_classes = (HasPermission,)

    def get_object_current_state(self):
        po_club_id = self.kwargs.get('actual_club_id', None)
        self.club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        return self.club.state

    def validate_data(self, request):
        # item_id = self.kwargs.get('item_id')
        marker_type = request.data.get('markerType', None)
        placements = request.data.get('placements', [])
        material_id = self.kwargs.get('customer_brand_material_id', None)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        if not marker_type:
            self.errors['marker_type'] = 'Marker type is required'
        elif marker_type not in [POFabricMarker.PLACEMENT_LEVEL_MARKER, POFabricMarker.ITEM_LEVEL_MARKER]:
            self.errors['marker_type'] = 'Invalid marker type'

        if not placements:
            self.errors['placements'] = 'Please select at least one placement'

        valid_placements = self.club.get_all_pack_item_placements_in_clubbing_by_material([material])
        if valid_placements.filter(pk__in=placements).count() != len(placements):
            self.errors['placements'] = 'Invalid placements selected'

        placements = valid_placements.filter(pk__in=placements).exclude(po_material_id=material_id)
        if placements.exists():
            self.errors['placements'] = "Materials cannot be mixed when creating a marker"

    def post(self, request, *args, **kwargs):
        self.errors = {}
        # Validate data
        self.validate_data(request)

        if self.errors:
            return Response(self.errors, status=status.HTTP_400_BAD_REQUEST)

        marker_id = request.data.get('marker_id', None)
        marker_type = request.data.get('markerType', None)
        marker_classification = request.data.get('marker_classification', None)
        placements = request.data.get('placements', [])
        material_id = kwargs.get('customer_brand_material_id', None)
        if marker_id:
            marker_type_object = get_object_or_404(POFabricMarker, pk=marker_id)
            marker_type_object.marker_type = marker_type
            marker_type_object.save()
        else:
            marker_type_object = POFabricMarker.objects.create(
                marker_type=marker_type,
                actual_club=self.club,
                po_material_id=material_id,
                marker_classification=marker_classification
            )
        for placement in placements:
            POFabricMarkerPlacement.objects.get_or_create(
                marker=marker_type_object,
                placement_id=placement
            )
        POFabricMarkerPlacement.objects.filter(marker=marker_type_object).exclude(placement_id__in=placements).delete()
        marker_type_object.update_name()
        return Response({'success': True})
    

class POClubLeftOverMaterialStatusView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [CAD_USER_ROLE, ]

    def get(self, request, *args, **kwargs):
        left_over_material_status = True
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        return Response({'left_over_material_status': po_club.get_po_club_left_over_fabric_exist()})
    

class MarkerClassificationListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        classification_list = []
        for choice in POFabricMarker.MARKER_CLASSIFICATION_CHOICESS:
            classification_list.append({"id": choice[0], "name": choice[1]})
        return Response(classification_list)
    

class MarkerCadDataUpdateView(ObjectStatePermissionMixin, APIView, OrderMixin):
    editable_states = [ActualPOClub.PENDING_LEFTOVER_MARKER_CREATION, ActualPOClub.PENDING_BOOKING_MARKER_CREATIONS, ActualPOClub.PENDING_BOM_VERIFICATION_STATE, ActualPOClub.ACTUAL_PO_BOM_FINALIZED, ActualPOClub.BOM_EMAILS_SENT]
    write_roles = (CAD_USER_ROLE, )
    permission_classes = (HasPermission,)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.marker_errors = {}
        self.ratio_errors = {}
        self.area_errors = {}
        self.marker_point_unit_errors = {}
        self.marker_points_error = {}
        self.status_errors = {}
        self.derived_marker_errors = {}
        self.club = None
        self.marker = None
        

    marker_errors = {}
    ratio_errors = {}
    area_errors = {}
    marker_point_unit_errors = {}
    marker_points_error = {}
    status_errors = {}
    derived_marker_errors = {}
    
    MARKER_CONSUMPTION_RATIO_KEY = 'consumption_ratio'
    MARKER_NUMBER_OF_PLIES_KEY = 'number_of_plies'
    MARKER_WASTAGE_KEY = 'wastage'
    MARKER_WIDTH_KEY = 'width'
    MARKER_LENGTH_KEY = 'marker_length'
    MARKER_LENGTH_UNIT_KEY = 'marker_length_unit'
    MARKER_PLACEMENT_RATIO_KEY = 'marker_placement_ratio'
    MARKER_PLACEMENT_AREA_KEY = 'marker_placement_area'
    REVIEWED_KEY = 'reviewed'

    def get_object_current_state(self):
        po_club_id = self.kwargs.get('actual_club_id', None)
        self.club = self.get_object_or_404(ActualPOClub, pk=po_club_id)
        self.marker = self.get_object_or_404(POFabricMarker, pk=self.kwargs['marker_id'], actual_club=self.club)
        return self.club.state
    
    def validate_derived_marker(self):
        valid_marker = True
        derived_markers = POFabricMarker.objects.filter(derived_from_marker=self.marker)
        for derived_marker in derived_markers:
            if not derived_marker.reviewed:
                valid_marker = False
                if derived_marker.id not in self.derived_marker_errors:
                    self.derived_marker_errors[derived_marker.id] = {}
                self.derived_marker_errors[derived_marker.id][self.REVIEWED_KEY] = 'Review the marker'
        return valid_marker
    
    def validate_data(self, marker, consumption_ratio, wastage, width_id, number_of_plies, marker_length, marker_length_unit, placements, is_derived):
        valid_marker = True
        if not consumption_ratio or not valid_float_field(consumption_ratio):
                if marker.id not in self.marker_errors:
                    self.marker_errors[marker.id] = {}
                self.marker_errors[marker.id][self.MARKER_CONSUMPTION_RATIO_KEY] = 'Enter a number'
        if not wastage or not valid_float_field(wastage):
            if marker.id not in self.marker_errors:
                self.marker_errors[marker.id] = {} 
            self.marker_errors[marker.id][self.MARKER_WASTAGE_KEY] = 'Enter a number'

        if not width_id:
            if marker.id not in self.marker_errors:
                self.marker_errors[marker.id] = {} 
            self.marker_errors[marker.id][self.MARKER_WIDTH_KEY] = 'Select width'

        if not marker_length or not valid_float_field(marker_length):
            if marker.id not in self.marker_errors:
                self.marker_errors[marker.id] = {} 
            self.marker_errors[marker.id][self.MARKER_LENGTH_KEY] = 'Enter a number'

        if not marker_length_unit:
            if marker.id not in self.marker_errors:
                self.marker_errors[marker.id] = {} 
            self.marker_errors[marker.id][self.MARKER_LENGTH_UNIT_KEY] = 'Select a unit'

        if not is_derived and not number_of_plies or not valid_integer_field(number_of_plies):
            if marker.id not in self.marker_errors:
                self.marker_errors[marker.id] = {} 
            self.marker_errors[marker.id][self.MARKER_NUMBER_OF_PLIES_KEY] = 'Enter a number'

        if placements:
            self.valid_placement_ratio(placements)
            self.valid_placement_area(placements)

        if self.marker_errors or self.area_errors or  self.ratio_errors or self.status_errors or self.marker_points_error or self.marker_point_unit_errors or self.derived_marker_errors:
            valid_marker = False
        return valid_marker


    def update_marker_data(self, marker, consumption_ratio, wastage, width_id, number_of_plies, marker_length, marker_length_unit, marker_classification, reviewed):
        if width_id:
            width = get_object_or_404(FabricWidth, pk=width_id)
            self.marker.width = width
        marker.consumption_ratio = consumption_ratio
        marker.wastage = wastage
        marker.marker_length = marker_length
        marker.marker_length_unit = marker_length_unit
        marker.marker_classification = marker_classification
        marker.number_of_plies = number_of_plies
        if not reviewed:
            marker.reviewed = reviewed
        marker.save()

    def update_marker_placements(self, placements):
        for placement in placements:
            id = placement['id']
            area = placement['area']
            ratio = placement['ratio']
            po_fabric_marker_placements = get_object_or_404(POFabricMarkerPlacement, pk=id)
            if area and valid_float_field(area):
                po_fabric_marker_placements.area = area
            if ratio and valid_float_field(ratio):
                po_fabric_marker_placements.ratio = ratio
            po_fabric_marker_placements.save()

    def validate_marker_point_unit(self, marker, marker_point_unit):
        if not marker_point_unit:
            if marker.id not in self.marker_point_unit_errors:
                self.marker_point_unit_errors[marker.id] = {} 
            self.marker_point_unit_errors[marker.id]['marker_point_unit_error'] = {'marker_point_unit': 'Please select a Marker Point Unit'}
        
    def update_marker_points(self, marker, marker_points, marker_point_unit, deleted_marker_point_ids):
        if deleted_marker_point_ids:
            POMarkerPoint.objects.filter(pk__in=deleted_marker_point_ids).delete()
        marker_point_index = 0
        if marker_points and marker_point_unit:
            for marker_point in marker_points:
                marker_point_id = marker_point['id']
                marker_point['cut_point_unit'] = marker_point_unit
                marker_point['back_point_unit'] = marker_point_unit
                marker_point = {key:marker_point[key] for key in marker_point if not key == 'po_marker'}
                po_marker_point_serializer = POMarkerPointSerializer(data={**marker_point, 'po_marker': marker.pk})
                if po_marker_point_serializer.is_valid():
                    if marker_point_id:
                        marker_point_object = get_object_or_none(POMarkerPoint, {'pk': marker_point_id})
                        if marker_point_object:
                                po_marker_point_serializer.update(instance=marker_point_object, validated_data=po_marker_point_serializer.validated_data)                                
                        else:
                            self.marker_points_error[marker_point_id] = {'detail not found'}
                    else:
                        po_marker_point_serializer.save()
                else:
                    if marker.id not in self.marker_points_error:
                        self.marker_points_error[marker.id] = {}

                    if 'marker_point_errors' not in self.marker_points_error[marker.id]:
                        self.marker_points_error[marker.id]['marker_point_errors'] = {}

                    if marker_point_index not in self.marker_points_error[marker.id]['marker_point_errors']:
                        self.marker_points_error[marker.id]['marker_point_errors'][marker_point_index] = {}

                    self.marker_points_error[marker.id]['marker_point_errors'][marker_point_index].update(
                        po_marker_point_serializer.errors
                    )
                marker_point_index += 1
        elif marker_points and not marker_point_unit:
            self.validate_marker_point_unit(marker, marker_point_unit)       

    def handle_attachments(self, marker, attachments):
        available_attachments = [attachment.pk for attachment in self.marker.attachments.all()]
        payload_attachments = [attachment['id'] for attachment in attachments]
        for attachment in available_attachments:
            if not attachment in payload_attachments:
                marker.attachments.remove(attachment)
        for attachment in attachments:
            if not attachment['id'] in available_attachments:
                marker.attachments.add(attachment['id'])

    def valid_placement_area(self, placements):
        valid = True
        for placement in placements:
            row_errors = {}
            id = placement['id']
            area = placement['area']

            if not area and not valid_float_field(area):
                row_errors[self.MARKER_PLACEMENT_AREA_KEY] = 'Enter a number'

            if row_errors:
                valid = False
                self.area_errors[id] = row_errors
        return valid
    
    def valid_placement_ratio(self, placements):
        valid = True

        for placement in placements:
            row_errors = {}
            id = placement['id']
            ratio = placement['ratio']
            if not ratio and not valid_float_field(ratio):
                row_errors[self.MARKER_PLACEMENT_RATIO_KEY] = 'Ratio must be a greater than zero'
            if row_errors:
                valid = False
                self.ratio_errors[id] = row_errors
        return valid

    def get_http_response(self):
        errors = {}
        if self.marker_errors:
            errors['marker_errors'] = self.marker_errors

        if self.area_errors:
            errors['area_errors'] = self.area_errors

        if self.ratio_errors:
            errors['ratio_errors'] = self.ratio_errors
        
        if self.status_errors:
            errors['status_errors'] = self.status_errors
        
        if self.marker_points_error:
            errors['marker_point_errors'] = self.marker_points_error

        if self.derived_marker_errors:
            errors['derived_marker_errors'] = self.derived_marker_errors

        response = Response({'success': True}, status=status.HTTP_200_OK)
        if errors:
            response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return response

    def update_derived_marker_detail(self, derived_markers):
        for derived_marker in derived_markers:
            consumption_ratio = derived_marker.get('consumption_ratio', None)
            wastage = derived_marker.get('wastage', None)
            width_id = derived_marker.get('width', None)
            marker_length = derived_marker.get('marker_length', None)
            marker_length_unit = derived_marker.get('marker_length_unit', None)
            attachments = derived_marker.get('attachments', [])
            marker_points = derived_marker.get('marker_points', [])
            marker_point_unit = derived_marker.get('marker_point_unit', None)
            deleted_marker_point_ids = derived_marker.get('deleted_marker_point_ids', [])
            reviewed = derived_marker.get('reviewed', None)

            derived_marker = get_object_or_none(POFabricMarker, {'pk': derived_marker['marker_id']})
            self.update_marker_data(derived_marker, consumption_ratio, wastage, width_id, self.marker.number_of_plies, marker_length, marker_length_unit, self.marker.marker_classification, reviewed)
            self.update_marker_points(derived_marker, marker_points, marker_point_unit, deleted_marker_point_ids)
            self.handle_attachments(derived_marker, attachments)

            if reviewed:
                valid_marker = self.validate_data(derived_marker, consumption_ratio, wastage, width_id, self.marker.number_of_plies, marker_length, marker_length_unit, None, True)
                if valid_marker:
                    derived_marker.reviewed = valid_marker
                    derived_marker.save()
                else:
                    derived_marker.reviewed = valid_marker
                    derived_marker.save()
            else:
                derived_marker.reviewed = reviewed
                derived_marker.save()
                # if valid_marker:
                #     derived_marker.calculate_placement_level_consumption_ratio_and_completeness()

    def post(self, request, *args, **kwargs):
        derived_markers = request.data.get('derived_markers', [])
        consumption_ratio = request.data.get('consumption_ratio', None)
        wastage = request.data.get('wastage', None)
        width_id = request.data.get('width', None)
        placements = request.data.get('placements', {})
        attachments = request.data.get('attachments', [])
        number_of_plies = request.data.get('number_of_plies', None)
        reviewed = request.data.get('reviewed', None)
        marker_points = request.data.get('marker_points', [])
        marker_length = request.data.get('marker_length', None)
        marker_length_unit = request.data.get('marker_length_unit', None)
        deleted_marker_point_ids = request.data.get('deleted_marker_point_ids', [])
        marker_point_unit = request.data.get('marker_point_unit', None)
        marker_classification = request.data.get('marker_classification', None)

        self.update_marker_data(self.marker, consumption_ratio, wastage, width_id, number_of_plies, marker_length, marker_length_unit, marker_classification, reviewed)
        self.update_marker_placements(placements)
        self.update_marker_points(self.marker, marker_points, marker_point_unit, deleted_marker_point_ids)
        self.handle_attachments(self.marker, attachments)
        self.update_derived_marker_detail(derived_markers)

        if reviewed:
            valid_marker = self.validate_data(self.marker, consumption_ratio, wastage, width_id, number_of_plies, marker_length, marker_length_unit, placements, False)
            valid_marker = self.validate_derived_marker()
            if valid_marker:
                self.marker.calculate_placement_level_consumption_ratio_and_completeness()
                self.marker.reviewed = valid_marker
                self.marker.save()
            else:
                self.marker.reviewed = valid_marker
                self.marker.save()
                self.status_errors[str(self.marker.id)] = {'complete_status': 'Make sure to enter all required values to complete the marker'}
        response = self.get_http_response()
        return response


class MarkerCadDataDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = (CAD_USER_ROLE, )
    
    def get_marker_data(self, marker):
        helper = ActualClubPlacementHelper(marker)
        marker_response = helper.organize_data()
        related_marker_ids = helper.get_related_markers()
        related_markers = []
        for related_marker_id in related_marker_ids:
            related_marker = get_object_or_404(POFabricMarker, pk=related_marker_id)
            helper = ActualClubPlacementHelper(related_marker)
            related_response = helper.organize_data()
            related_markers.append(related_response)
        po_marker_points = marker.pomarkerpoint_set.all()
        data = {
            **marker_response,
            'related_markers': related_markers,
            'marker_points': [POMarkerPointSerializer(po_marker_point).data for po_marker_point in po_marker_points],
            'marker_point_unit': po_marker_points[0].cut_point_unit if po_marker_points else None
        }
        return data

    def get(self, request, *args, **kwargs):
        marker_id = self.kwargs.get('marker_id', None)
        marker = get_object_or_404(POFabricMarker, pk=marker_id)
        data = {
            **self.get_marker_data(marker),
            'derived_markers': [self.get_marker_data(other_width) for other_width in POFabricMarker.objects.filter(derived_from_marker = marker).order_by('id')]
        }
        return Response(data, status=status.HTTP_200_OK)


class FabricWidthListView(generics.ListAPIView):
    serializer_class = FabricWidthSerializer
    queryset = FabricWidth.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (CAD_USER_ROLE, )

    def get_queryset(self):
        actual_po_club_id = self.kwargs.get('actual_po_club_id')
        customer_brand_material_id = self.kwargs.get('customer_brand_material_id')
        qs = FabricWidth.objects.filter(actual_po_club=actual_po_club_id, customer_brand_material = customer_brand_material_id)
        return qs


class FabricMarkerDeleteView(generics.RetrieveDestroyAPIView):
    serializer_class = FabricMarkerSerializer
    queryset = POFabricMarker.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (CAD_USER_ROLE, )


class POClubItemMaterialFabricMarkerRetriveView(generics.GenericAPIView):

    serializer_class = FabricMarkerSerializer
    queryset = POFabricMarker.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (CAD_USER_ROLE, )

    def get(self, request, *args, **kwargs):
        # item_id = kwargs['item_id']
        po_material_id = kwargs['po_material_id']
        po_club_id = kwargs['po_club_id']
        marker_id = kwargs['marker_id']
        queryset = POFabricMarker.objects.filter(po_material = po_material_id, actual_club = po_club_id).exclude(pk = marker_id)
        return Response(data= [FabricMarkerSerializer(marker).data for marker in queryset])


class POClubMarkerPlacementAddView(generics.CreateAPIView):

    serializer_class = POFabricMarkerPlacementSerializer
    queryset = POFabricMarkerPlacement.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (CAD_USER_ROLE, )

    def post(self, request, *args, **kwargs):
        errors = {}
        related_marker_id = kwargs['related_marker_id']
        related_marker = get_object_or_404(POFabricMarker.objects.all(), pk = related_marker_id)
        marker_id = request.data['marker_id']
        marker = get_object_or_none(POFabricMarker, {'pk': marker_id})
        if marker:
            po_placements = request.data['po_placements']
            po_fabric_marker_placements = []
            placement_errors = []
            for placement_data in po_placements:
                po_pack_item_placement_id = placement_data['po_pack_item_placement_id']
                ratio = placement_data['ratio']
                area = placement_data['area']
                placement_object = get_object_or_none(POPackItemPlacement, {'pk': po_pack_item_placement_id})
                if placement_object:
                    related_marker_placement = get_object_or_none(POFabricMarkerPlacement, {'marker': related_marker, 'placement': placement_object})
                    po_fabric_marker_placement, created = POFabricMarkerPlacement.objects.get_or_create(marker = marker, placement = placement_object)
                    po_fabric_marker_placement.area = area
                    if po_fabric_marker_placement.ratio:
                        po_fabric_marker_placement.ratio += ratio
                    else:
                        po_fabric_marker_placement.ratio = ratio
                    if related_marker_placement:
                        po_fabric_marker_placement.related_marker_placements.add(related_marker_placement.id)
                    po_fabric_marker_placement.save()
                else:
                    placement_errors.append('pk ' + str(po_pack_item_placement_id) + ' details not found')
            if not placement_errors == []:
                errors['placement_ids'] = placement_errors
        else:
            errors['marker_id'] = 'pk '+ str(marker_id) + ' details not found'
        if errors == {}:
            data = {'status': 'Successfully Created'}
        else:
            data = errors
        return Response(data = data)


class POFabricMarkerItemPlacementsUploadView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def post(self, request, *args, **kwargs):
        errors = {}
        return_status = status.HTTP_200_OK
        has_errors = False
        area_file_id = request.data.get('area_file', None)
        mini_marker_file_id = request.data.get('mini_marker_file', None)
        area_file = get_object_or_none(FileAttachment, {'pk': area_file_id})
        mini_marker_file = get_object_or_none(FileAttachment, {'pk': mini_marker_file_id})
        po_club_id = kwargs.get('actual_club_id', None)
        # item_id = kwargs.get('item_id', None)
        material_id = kwargs.get('customer_brand_material_id', None)
        # item = get_object_or_404(Item, pk=item_id)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        actual_po_club = self.get_po_club_or_raise_http404(po_club_id)
        po_club_item_ids = actual_po_club.get_item_ids()
        response = {
            'po_club_id': actual_po_club.id,
            'customer_brand_material_id': material.id,
            'placements': [],
            'sizes': [],
            'marker_data': {
                'area_file': area_file_id,
                'mini_marker_file': mini_marker_file_id,
                'sizes': [],
                'placements': []
            }
        }
        placements = []
        for item_id in po_club_item_ids:
            item_placements = actual_po_club.get_pack_item_fabric_placements(item_id).filter(po_material_id=material_id).order_by('po_pack_item__po_pack__purchase_order',
                                                                                    'po_pack_item__po_pack__po_colorway__colorway',
                                                                                    'po_pack_item__po_pack__po_country__po_country_name',
                                                                                    'po_pack_item__po_pack__po_size__order_size__size__sorting_order')
            if placements == []:
                placements = item_placements
            else:
                placements = placements.union(item_placements)
        if area_file and mini_marker_file:
            area_file_reader = PlacementAreaDetailFileReader(area_file.file_path)
            mini_marker_file_reader = MiniMarkerFileReader(mini_marker_file.file_path)
            area_file_data = area_file_reader.file_read()
            mini_marker_file_data = mini_marker_file_reader.file_read()
            for key in ['sizes', 'placements']:
                if len(area_file_data.get(key, [])) == 0:
                    has_errors = True
                    errors['area_file'] = ['Invalid area file']
                
                if not mini_marker_file_reader.is_valid(mini_marker_file_data):
                    has_errors = True
                    errors['mini_marker_file'] = ['Invalid mini maker']

                response['marker_data'][key] = [
                    {
                        'id': key_data,
                        'name': key_data
                    } for key_data in area_file_data.get(key, [])
                ]
            for placement in placements:
                marker_size = area_file_reader.get_mapped_marker_size(placement.po_pack_item.po_pack.po_size.order_size.size)
                marker_placement = area_file_reader.get_mapped_marker_placements(placement)
                size_data = {
                    'id': placement.po_pack_item.po_pack.po_size.order_size.size.id,
                    'abbrevation': placement.po_pack_item.po_pack.po_size.order_size.size.abbreviation,
                    'name': placement.po_pack_item.po_pack.po_size.order_size.size.name,
                    'marker_size': marker_size
                }
                placement_data = {
                    'id': placement.costing_pack_item_placement.placement_name,
                    'name': placement.costing_pack_item_placement.placement_name,
                    'marker_placements': marker_placement,
                    'item_id': placement.costing_pack_item_placement.order_pack_item.item.id,
                    'item_name': placement.costing_pack_item_placement.order_pack_item.item.item_display
                }
                if not size_data in response['sizes']:
                    response['sizes'].append(size_data)
                if not placement_data in response['placements']:
                    response['placements'].append(placement_data)
        else:
            has_errors = True
            if not area_file:
                errors['area_file'] = 'This attachment cannot be empty'
            if not mini_marker_file:
                errors['mini_marker_file'] = 'This attachment cannot be empty'
        if has_errors:
            response = errors
            return_status = status.HTTP_400_BAD_REQUEST
        return Response(response, return_status)


class POFabricItemMarkerCreateByFileView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def get_mapped_size_data(self, id, mapped_sizes):
        mapped_size_data = None
        for mapped_size in mapped_sizes:
            if mapped_size['id'] == id:
                mapped_size_data = mapped_size
                break
        
        return mapped_size_data
    
    def get_mapped_placement_data(self, name, mapped_placements):
        mapped_placement_data = None
        for mapped_placement in mapped_placements:
            if mapped_placement['name'] == name:
                mapped_placement_data = mapped_placement
                break
        return mapped_placement_data

    def post(self, request, *args, **kwargs):
        return_status = status.HTTP_200_OK
        area_file_id = request.data.get('area_file', None)
        mini_marker_file_id = request.data.get('mini_marker_file', None)
        area_file = get_object_or_404(FileAttachment, pk=area_file_id)
        mini_marker_file = get_object_or_404(FileAttachment, pk=mini_marker_file_id)
        po_club_id = kwargs.get('actual_club_id', None)
        # item_id = kwargs.get('item_id', None)
        material_id = kwargs.get('customer_brand_material_id', None)
        # item = get_object_or_404(Item, pk=item_id)
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        actual_po_club = self.get_po_club_or_raise_http404(po_club_id)
        # po_club_item_ids = actual_po_club.get_item_ids()
        response = {}
        placements = []
        placements = actual_po_club.get_all_pack_item_placements_in_clubbing_by_material([material])
        # for item_id in po_club_item_ids:
        #     item_placements = actual_po_club.get_pack_item_fabric_placements(item_id).filter(po_material_id=material_id)
        #     if placements == []:
        #         placements = item_placements
        #     else:
        #         placements = placements.union(item_placements)

        mapped_sizes = request.data.get('sizes', [])
        mapped_placements = request.data.get('placements', [])

        has_mapping_error = False
        mapping_errors = {
            'sizes':[],
            'placements': []
        }
        po_fabric_marker_creator = POFabricMarkerCreator(area_file, mini_marker_file, mapped_sizes, mapped_placements)
        # area_file_reader = po_fabric_marker_creator.area_file_reader
        # marker_file_reader = MiniMarkerFileReader(mini_marker_file.file_path)
        # marker_file_data = po_fabric_marker_creator.mini_marker_file_reader.file_read()
        area_file_data = po_fabric_marker_creator.area_file_reader.file_read()

        with transaction.atomic():
            for map_size in mapped_sizes:
                if not map_size['marker_size']:
                    mapping_errors['sizes'].append({'marker_size': ['This field cannot empty']})
                    has_mapping_error = True
                else:
                    mapping_errors['sizes'].append({'marker_size':[]})
            for map_placement in mapped_placements:
                if map_placement['marker_placements'] == []:
                    mapping_errors['placements'].append({'marker_placements': ['This field cannot empty']})
                    has_mapping_error = True
                else:
                    mapping_errors['placements'].append({'marker_placement': []})
            if not has_mapping_error:
                po_cad_marker_upload =po_fabric_marker_creator.get_po_cad_marker_upload()
                for placement in placements:
                    po_pack_item_placement = placement
                    placement_size = placement.po_pack_item.po_pack.po_size.order_size.size
                    placement = placement.costing_pack_item_placement
                    mapped_size_data = self.get_mapped_size_data(placement_size.id, mapped_sizes)
                    mapped_placement_data = self.get_mapped_placement_data(placement.placement_name, mapped_placements)
                    area = 0.00
                    marker_size = None
                    marker_placements = None
                    if mapped_size_data:
                        marker_size = mapped_size_data['marker_size']
                    if mapped_placement_data:
                        marker_placements = mapped_placement_data['marker_placements']
                    if marker_size and marker_placements:
                        area_data = area_file_data['area_data']
                        marker_size_placements = area_data.get(marker_size, {})
                        for marker_placement in marker_placements:
                            marker_size_placement = marker_size_placements.get(marker_placement, {})
                            marker_size_placement_area = marker_size_placement.get('area', 0)
                            CADMarkerPlacement.objects.get_or_create(
                                po_cad_marker_upload=po_cad_marker_upload,
                                po_pack_item_placement = po_pack_item_placement,
                                area = marker_size_placement_area,
                                placement_name = marker_placement
                            )
                po_fabric_marker_creator.create_marker(actual_po_club, material, placements)
            
            if has_mapping_error:
                transaction.set_rollback(True)

        if has_mapping_error:
            response = mapping_errors
            return_status = status.HTTP_400_BAD_REQUEST
        return Response(response, status=return_status)