from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404, HttpResponse
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from marketing.constants.costing_constants import PACK_ITEM_TOTAL_COST_KEY, PACK_TOTAL_COST_KEY, NORMALIZED_COSTS_KEY, \
    PACKAGING_COSTS_SUMMARY, TRIMS_COSTS_KEY, TRIM_FINANCING_COST_KEY, FABRIC_FINANCING_COST_KEY, \
    BUYER_COMMISSION_COST_KEY, PACK_PACK_ITEM_COSTS_SUMMARY, FABRIC_FINANCING_COST_PERCENTAGE_KEY, \
    TRIM_FINANCING_COST_PERCENTAGE_KEY, BUYER_COMMISSION_COST_PERCENTAGE_KEY
from marketing.exceptions.exceptions import InvalidStateTransition, CostingEditingDenied
from marketing.helpers.combined_material_pack_pack_item_helper import CombinedCostingPackItemInterface, \
    CombinedCostingPackCadInterfacePlacementMaterial
from marketing.helpers.po_assign_material_helper import POPackItemPlacementAssignMaterial
from marketing.helpers.services_other_costs_helper import OtherCostCombination, CombinedServiceCosts
from marketing.mixins.material_mixins import PackPlacementInfoMixin, PackItemPlacementInfoMixin
from marketing.mixins.order_mixins import OrderMixin
from marketing.mixins.other_services_mixins import PackItemServiceMixin
from marketing.models import OrderCostingVersion, ItemVariation, OrderInquiry, OrderPack, \
    OrderPackItem, PurchaseOrder, OrderCostingColorwayMaterialSupplierInquiry, \
    OrderColorway, OrderCountry, OrderSize, POPackItemPlacement, OrderItem, \
    ItemVariationOperation, OrderPackItemPlacement, OrderPackItemPlacementMaterial, OrderPackPlacement, \
    OrderPackPlacementMaterial, OrderItemColorwayOperation, ColorwayItemType, OrderSizeGroup, \
    OrderVersionColorwayCountry, OtherCostType, OrderPackOtherCost, OrderPlacement, \
    OtherCostType, OrderPackOtherCost, PackItemWashService, \
    PackItemService, OrderCostingServiceSupplierInquiry, OrderInquiryProgram, Item, OrderVersionColorwayCountry, \
    EmbellishmentServiceDetail, PackItemEmbellishmentService, OrderPackSizeGroup, ItemAttribute, \
    OrderInquiryStyleNumber, PackInstructionOrderPack, \
    PackInstruction, PackPackaging, OrderPackItemPlacementMaterialConsumption, OrderPackPlacementMaterialConsumption, ActualPOClub, ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, \
    CostingCompletedMaterial, POClubCompletedMaterial
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin
from marketing.permissions.po_club_mixins import POClubPermissionMixin
from marketing.serializer.pack_pack_item_serializers import OrderCostingColorwayMaterialSupplierInquirySerializer
from marketing.serializers import OrderVersionSerializer, OrderPackSerializer, OrderItemSizeGroupPacksSerializer, \
    PurchaseOrderSerializer, POPackSerializer, POPackItemPlacement, OrderItemColorwayOperationSerializer, \
    OrderPackItemSerializer, OrderColorwaySerializer, \
    OrderPackItemSerializer, OtherCostTypeSerializer, OrderPackOtherCostSerializer, OrderPackItemPlacementSerializer, \
    OrderPackPlacementSerializer, WashServiceSerializer, \
    OrderInquiryProgramSerializer, OrderInquirySerializer, OrderVersionColorwaySerializer, \
    EmbellishmentServiceDetailSerializer, PackItemEmbellishmentServiceSerializer, \
    OrderVersionSupplierInquiryCompleteStatusSerializer, FlatPackItemEmbellishmentServiceSerializer, \
     ColorwayItemTypeSerializer, OrderInquiryStyleNumberSerializer, FileAttachmentSerializer, PackPackagingSerializer, PackInstructionOrderPackSerializer, \
    OrderVersionBasicSerializer, OrderInquiryWidgetSerializer, POClubWidgetSerializer, OrderCostingVersionDetailSerializer, OrderPlacementSpeedConsumptionSerializer, OrderItemSpeedConsumptionSerializer, \
    ActualPOClubSerializer
from marketing.utils.placement_material_utils import get_pack_item_placement_material_helper_class, \
    get_order_pack_placement_material_helper
from marketing.utils.supplier_inquiry_utils import get_service_inquiries_for_colorway, \
    get_material_inquiries_for_colorway
from marketing.utils.validator_utils import OrderInquiryValidator
from materials.fieldmetadata.material_metadata import get_supplier_inquiry_headers, get_supplier_quote_meta_data, get_user_defined_material_meta_data, get_pack_item_placement_material_metadata
from materials.models import SupplierInquiry, CustomerBrandMaterial, UserDefinedMaterial, EmbellishmentSubType, \
    PACKAGING_TYPES, SEWING_TRIM_TYPES, FABRIC_TRIM_TYPES, WarehouseMaterialTransfer, WarehouseMaterialTransferDetail, PartialDeliveryTransferPackQuantity
from materials.utils.material_utils import segregate_material_into_types, segregate_material_into_types_and_material
from shared.constants.global_constants import FORM_ERRORS_KEY, FIELD_ERRORS_KEY
from shared.permissions.roles import MERCHANT_ROLE, ADMIN_ROLE, CAD_USER_ROLE, IE_USER_ROLE
from shared.permissions.view_permissions import HasPermission
from django.db.models import Q
from materials.models import SupplierInquiryDetail, SupplierInquiry, Material
from shared.models import FileAttachment, OtherCost, PlantWarehouse, InHouseMaterial
from shared.utils import get_object_or_none, get_object_or_none_qs, dict_is_empty, convert_to_float_or_none, \
    get_display_value_for_unit, convert_per_unit_cost, get_quantity_dictionary, is_none, round_float_to_decimal_places, \
    get_amount_dictionary
from django.db import transaction
from marketing.helpers.version_clone_helper import VersionCloneHelper
from materials.serializers.material_serializers import CustomerBrandMaterialBasicSerializer, \
    SupplierInquiryMaterialDetailSerializer
from django.db.models import Sum
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.utils import search_qs_from_id
from shared.approvals.constants.task_entities import ORDER_COSTING_VERSION
from shared.approvals.constants.task_descriptions import COSTING_SPEED_CONSUMPTION_DESCRIPTION
from shared.approvals.utils import ApprovalUtils
from shared.models import Role
from django.contrib.contenttypes.models import ContentType
from materials.serializers.material_serializers import WarehouseMaterialTransferSerializer
from shared.utils import search_qs_from_global_filter_v2

# Order Item Colorway Country Size CAD
class OrderPackListUpdateView(ObjectStatePermissionMixin, generics.ListCreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderPackSerializer
    editable_states = [OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE, ]

    def get_object_current_state(self):
        return self.get_order_inquiry_version().version_state

    def get_queryset(self):
        order = self.get_order()
        version = self.get_order_inquiry_version()
        queryset = OrderPack.objects.filter(size__order=order, version=version)
        return queryset

    def get_order(self):
        order_id = self.kwargs['order_id']
        order = get_object_or_404(OrderInquiry, pk=order_id)
        return order

    def get_order_inquiry_version(self):
        order = self.get_order()
        version_id = self.kwargs.get('version_id', None)
        version = get_object_or_404(OrderCostingVersion, order=order, pk=version_id)
        return version

    def post(self, request, *args, **kwargs):
        return_data = []
        return_status = status.HTTP_200_OK
        version = self.get_order_inquiry_version()
        order = self.get_order()

        for colorway_country_quantity in request.data['colorway_country_quantity']:
            country_id = colorway_country_quantity['country']
            colorway_id = colorway_country_quantity['colorway']
            estimated_quantity = colorway_country_quantity['estimated_quantity']
            order_version_colorway, created = OrderVersionColorwayCountry.objects.get_or_create(version=version, colorway_id=colorway_id, country_id=country_id)
            serializer_data = {
                "country":country_id,
                "colorway":colorway_id,
                "estimated_quantity": estimated_quantity,
                "version":version.id
            }
            serializer = OrderVersionColorwaySerializer(data=serializer_data, instance=order_version_colorway)

            if serializer.is_valid():
                updated_serializer = serializer.update(instance=order_version_colorway, validated_data=serializer.validated_data)
                data = {
                        "id": updated_serializer.id,
                        "colorway": updated_serializer.colorway.id,
                        "country": updated_serializer.country.id,
                        "estimated_quantity": updated_serializer.estimated_quantity
                    }
                return_data.append(data)
            else:
                colorway_country_quantity['errors'] = serializer.errors
                return_data.append(colorway_country_quantity)
                return_status = status.HTTP_400_BAD_REQUEST

        for order_item_colorway_size_cad in request.data['ratios']:
            size = order_item_colorway_size_cad['size']
            colorway = order_item_colorway_size_cad['colorway']
            country = order_item_colorway_size_cad['country']
            try:
                instance = OrderPack.objects.get(size=size, country=country, colorway=colorway,
                                                 size__order=order, version=version)
                serializer = OrderPackSerializer(data=order_item_colorway_size_cad, instance=instance)
                if serializer.is_valid():
                    updated_serializer = serializer.update(instance=instance, validated_data=serializer.validated_data)
                    data = {
                        "id": updated_serializer.id,
                        "colorway": updated_serializer.colorway.id,
                        "country": updated_serializer.country.id,
                        "size": updated_serializer.size.id,
                        "cad_quantity": updated_serializer.cad_quantity
                    }
                    return_data.append(data)
                else:
                    order_item_colorway_size_cad['errors'] = serializer.errors
                    return_data.append(order_item_colorway_size_cad)
                    return_status = status.HTTP_400_BAD_REQUEST
            except OrderPack.DoesNotExist:
                order_item_colorway_size_cad['errors'] = {"detail": "Not Found"}  # wecan replace the error msg
                return_data.append(order_item_colorway_size_cad)
                return_status = status.HTTP_404_NOT_FOUND
        return Response(return_data, status=return_status)


class OrderPackItemPlacementOtherCreateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_fields(self, data):
        errors = {}
        order_placement_name_key = 'other_placement_name'
        material_type_name_key = 'material_type'
        estimated_consumption_ratio_key = 'estimated_consumption_ratio'
        estimated_consumption_ratio_units_key = 'estimated_consumption_ratio_units'

        if not data.get(estimated_consumption_ratio_key, None):
            errors[estimated_consumption_ratio_key] = "Estimated Consumption Ratio is required"

        if not data.get(order_placement_name_key, None):
            errors[order_placement_name_key] = "Other placement name is required"

        if not data.get(material_type_name_key, None):
            errors[material_type_name_key] = "Material name is required"

        if not data.get(estimated_consumption_ratio_units_key, None):
            errors[estimated_consumption_ratio_units_key] = "Estimated consumption ratio Unit is required"
        return errors

    def update_placements(self, pack_item_ids, version, other_placement, material_headers):
        if pack_item_ids:
            pack_item_placements = []
            pack_items = OrderPackItem.objects.filter(id__in=pack_item_ids, pack__version=version)
            for pack_item in pack_items:
                placement, created = OrderPackItemPlacement.objects.get_or_create(
                    order_pack_item=pack_item,
                    item_attribute_other=other_placement
                )

                if created and pack_item.reviewed:
                    pack_item.reviewed = False
                    pack_item.pack.reviewed = False
                    pack_item.save()
                    pack_item.pack.save()
                pack_item_placements.append(placement)

            OrderPackItemPlacement.objects.filter(
                order_pack_item__pack__version=version,
                item_attribute_other=other_placement
            ).exclude(order_pack_item_id__in=pack_item_ids).delete()

            serializer = OrderPackItemPlacementSerializer(pack_item_placements, many=True)
            response_data = {
                "other_placement_id": other_placement.id,
                "other_placement_name": other_placement.name,
                "placements": serializer.data,
                "material_headers": material_headers
            }
        else:
            OrderPackItemPlacement.objects.filter(
                order_pack_item__pack__version=version,
                item_attribute_other=other_placement
            ).delete()
            response_data = {'status': 'All pack item placements delete successfully'}
        return response_data

    def post(self, request, order_id, version_id, item_id):
        material_type = request.data.get('material_type')
        other_placement_id = request.data.get("other_placement_id")
        other_placement_name = request.data.get("other_placement_name")
        pack_item_ids = request.data.get("pack_item_ids")
        estimated_consumption_ratio = request.data.get("estimated_consumption_ratio")
        estimated_consumption_ratio_units = request.data.get("estimated_consumption_ratio_units")
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order=order)
        item = get_object_or_404(Item, pk=item_id)

        data = {
            'other_placement_name': other_placement_name,
            'material_type': material_type,
            'estimated_consumption_ratio': estimated_consumption_ratio,
            'estimated_consumption_ratio_units': estimated_consumption_ratio_units,
        }
        validation_errors = self.validate_fields(data)

        if validation_errors:
            return Response(validation_errors, status=status.HTTP_400_BAD_REQUEST)

        material = get_object_or_404(UserDefinedMaterial, name=material_type)

        duplicate_placements = OrderPlacement.objects.filter(version=version, name__iexact=other_placement_name, material=material, item=item)
        # pack_item = get_object_or_404(OrderPackItem, pk=pack_item_id, pack__version=version)

        if other_placement_id:
            other_placement = get_object_or_404(OrderPlacement, pk=other_placement_id, version=version)

            # Check if placement name changed and if so, check if it got duplicated
            if other_placement.name != other_placement_name and duplicate_placements.exists():
                    return Response({"other_placement_name" : "Already have placement with same name for this order"}, status=status.HTTP_400_BAD_REQUEST)
            other_placement.name = other_placement_name
            other_placement.type = material_type    
            other_placement.material = material
            other_placement.estimated_consumption_ratio = estimated_consumption_ratio
            other_placement.estimated_consumption_ratio_units = estimated_consumption_ratio_units
            other_placement.save()
        else:
            if duplicate_placements.exists():
                return Response({"other_placement_name" : "Already have placement with same name for this order"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                other_placement = OrderPlacement.objects.create(
                    name=other_placement_name,
                    version=version,
                    type=material_type,
                    material=material,
                    estimated_consumption_ratio=estimated_consumption_ratio,
                    item=item,
                    estimated_consumption_ratio_units=estimated_consumption_ratio_units,
                    assign_type = ItemAttribute.ORDER_PACK_ITEM
                )
        material_headers, material_label = get_user_defined_material_meta_data(material.name)
        response_data = self.update_placements(pack_item_ids, version, other_placement, material_headers)
        return Response(response_data, status=status.HTTP_200_OK)


class OrderItemOtherPlacementDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_item_response(self, order_pack_item_ids):
        data = []
        item_ids = OrderPackItem.objects.filter(id__in=order_pack_item_ids).values_list('item_id', flat=True)
        for item_id in item_ids:
            data.append({
                'item': item_id,
            })
        return data

    def get_country_response(self, pack_ids):
        data = []
        country_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('country_id', flat=True)
        for country_id in country_ids:
            data.append({
                'country': country_id,
            })
        return data

    def get_colorway_response(self, pack_ids):
        data = []
        colorway_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('colorway_id', flat=True)
        for colorway_id in colorway_ids:
            data.append({
                'colorway': colorway_id,
            })
        return data

    def get_size_response(self, pack_ids):
        data = []
        size_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('size_id', flat=True)
        for size_id in size_ids:
            data.append({
                'size': size_id,
            })
        return data
    
    def get_colorway_category_response(self, pack_ids, order_pack_item_ids):
        data = []
        item_ids = OrderPackItem.objects.filter(id__in=order_pack_item_ids).values_list('item_id', flat=True)
        colorway_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('colorway_id', flat=True)
        colorway_category_ids = ColorwayItemType.objects.filter(item_id__in=item_ids, colorway_id__in=colorway_ids).values_list('colorway_category_id', flat=True)
        for colorway_category_id in colorway_category_ids:
            data.append({
                'colorway_category': colorway_category_id,
            })
        return data

    def get(self, request, other_placement_id, version_id, item_id):
        data = []
        order_pack_item_other_placement = get_object_or_404(OrderPlacement, pk=other_placement_id, version_id=version_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id,
                                    order=order_pack_item_other_placement.version.order)
        item = get_object_or_404(Item, pk=item_id)
        if item:
            order_pack_item_ids = OrderPackItemPlacement.objects.filter(
                item_attribute_other=order_pack_item_other_placement,
                order_pack_item__pack__version=version,
                order_pack_item__item__item=item,
            ).filter(
                order_pack_item__item__item=order_pack_item_other_placement.item  # Filter this as well
            ).values_list('order_pack_item_id', flat=True)

            pack_ids = OrderPackItem.objects.filter(id__in=order_pack_item_ids).values_list('pack_id', flat=True)
        
            items = self.get_item_response(order_pack_item_ids)
            countries = self.get_country_response(pack_ids)
            colorways = self.get_colorway_response(pack_ids)
            sizes = self.get_size_response(pack_ids)
            colorway_categories = self.get_colorway_category_response(pack_ids, order_pack_item_ids)

            data = {
                "placement_id": order_pack_item_other_placement.id,
                "placement_name": order_pack_item_other_placement.name,
                "type": order_pack_item_other_placement.type,
                "pack_item_placements": order_pack_item_ids,
                "estimated_consumption_ratio": order_pack_item_other_placement.estimated_consumption_ratio,
                "estimated_consumption_ratio_units":order_pack_item_other_placement.estimated_consumption_ratio_units,
                "items": items,
                "countries": countries,
                "colorways": colorways,
                "sizes": sizes,
                "colorway_categories": colorway_categories
            }
        return Response(data)


class OrderPackPlacementOtherCreateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_fields(self, data):
        errors = {}
        other_placement_name_key = 'other_placement_name'
        material_type_key = 'material_type'
        estimated_consumption_ratio_key = 'estimated_consumption_ratio'
        estimated_consumption_ratio_unit_key = 'estimated_consumption_ratio_units'

        if not data.get(other_placement_name_key, None):
            errors[other_placement_name_key] = "Other placement name is required"

        if not data.get(material_type_key, None):
            errors[material_type_key] = "Material type is required"

        if not data.get(estimated_consumption_ratio_key, None):
            errors[estimated_consumption_ratio_key] = "Estimated consumption ratio is required"

        if not data.get(estimated_consumption_ratio_unit_key, None):
            errors[estimated_consumption_ratio_unit_key] = "Estimated consumption ratio unit is required"
        return errors

    def update_placement(self, pack_ids, other_placement, version, material_headers):
        if pack_ids:
            pack_placements = []
            packs = OrderPack.objects.filter(id__in=pack_ids, version=version)
            for pack in packs:
                placement, created = OrderPackPlacement.objects.get_or_create(order_pack=pack, item_attribute_other=other_placement)
                if created and pack.reviewed:
                    pack.reviewed = False
                    pack.save()
                pack_placements.append(placement)
            OrderPackPlacement.objects.filter(
                order_pack__version=version,
                item_attribute_other=other_placement
            ).exclude(order_pack_id__in=pack_ids).delete()

            serializer = OrderPackPlacementSerializer(pack_placements, many=True)
            response_data = {
                "other_placement_id": other_placement.id,
                "other_placement_name": other_placement.name,
                "placements": serializer.data,
                "material_headers": material_headers,
            }
        else:
            OrderPackPlacement.objects.filter(order_pack__version=version, item_attribute_other=other_placement).delete()
            response_data = {'status': 'All packs placements delete successfully'}
        return response_data

    def post(self, request, order_id, version_id):
        material_type = request.data.get('material_type')
        other_placement_id = request.data.get("other_placement_id")
        other_placement_name = request.data.get("other_placement_name")
        pack_ids = request.data.get("pack_ids")
        estimated_consumption_ratio = request.data.get("estimated_consumption_ratio")
        estimated_consumption_ratio_units = request.data.get("estimated_consumption_ratio_units")
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order=order)

        data = {
            'other_placement_name': other_placement_name,
            'material_type': material_type,
            'estimated_consumption_ratio': estimated_consumption_ratio,
            'estimated_consumption_ratio_units':estimated_consumption_ratio_units
        }

        validate_fields = self.validate_fields(data)
        if validate_fields:
            return Response(validate_fields, status=status.HTTP_400_BAD_REQUEST)

        material = get_object_or_404(UserDefinedMaterial, name=material_type)
        duplicate_placements = OrderPlacement.objects.filter(version=version, name__iexact=other_placement_name,
                                                             material=material)

        if other_placement_id:
            other_placement = get_object_or_404(OrderPlacement, pk=other_placement_id, version=version)

            if other_placement.name != other_placement_name and duplicate_placements.exists():
                return Response({"other_placement_name": "Already have placement with same name for this order"},
                                status=status.HTTP_400_BAD_REQUEST)
            other_placement.name = other_placement_name
            other_placement.type = material_type
            other_placement.material = material
            other_placement.estimated_consumption_ratio = estimated_consumption_ratio
            other_placement.estimated_consumption_ratio_units = estimated_consumption_ratio_units
            other_placement.save()

        else:
            if duplicate_placements.exists():
                return Response({"other_placement_name": "Already have placement with same name for this order"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                other_placement = OrderPlacement.objects.create(
                    name=other_placement_name,
                    version=version,
                    type=material_type,
                    estimated_consumption_ratio=estimated_consumption_ratio,
                    material=material,
                    estimated_consumption_ratio_units=estimated_consumption_ratio_units,
                    assign_type = ItemAttribute.ORDER_PACK
                )
        material_headers, display_name = get_user_defined_material_meta_data(material.name)
        response = self.update_placement(pack_ids, other_placement, version, material_headers)
        return Response(response)


class OrderPackOtherPlacementDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, pk):
        try:
            order_pack_placement = OrderPackPlacement.objects.get(pk=pk)
        except ObjectDoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        order_pack_placement.delete()
        return Response({'status_text': 'Deleted'}, status=status.HTTP_200_OK)


class OrderPackOtherPlacementDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_country_response(self, pack_ids):
        data = []
        country_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('country_id', flat=True)
        for country_id in country_ids:
            data.append({
                'country': country_id,
            })
        return data

    def get_colorway_response(self, pack_ids):
        data = []
        colorway_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('colorway_id', flat=True)
        for colorway_id in colorway_ids:
            data.append({
                'colorway': colorway_id,
            })
        return data

    def get_size_response(self, pack_ids):
        data = []
        size_ids = OrderPack.objects.filter(id__in=pack_ids).values_list('size_id', flat=True)
        for size_id in size_ids:
            data.append({
                'size': size_id,
            })
        return data

    def get(self, request, other_placement_id, version_id):
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        order_pack_other_placement = get_object_or_404(OrderPlacement, pk=other_placement_id, version=version)
        order_pack_ids = OrderPackPlacement.objects.filter(
            item_attribute_other=order_pack_other_placement,
            order_pack__version=version).values_list('order_pack_id', flat=True)
        
        countries = self.get_country_response(order_pack_ids)
        colorways = self.get_colorway_response(order_pack_ids)
        sizes = self.get_size_response(order_pack_ids)
        
        data = {
            "placement_id": order_pack_other_placement.id,
            "placement_name": order_pack_other_placement.name,
            "type": order_pack_other_placement.type,
            "pack_placements": order_pack_ids,
            "estimated_consumption_ratio": order_pack_other_placement.estimated_consumption_ratio,
            "estimated_consumption_ratio_units": order_pack_other_placement.estimated_consumption_ratio_units,
            "countries": countries,
            "colorways": colorways,
            "sizes": sizes,
        }
        return Response(data)


class PackMaterialAPI(APIView, PackPlacementInfoMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_pack_id, version_id):
        pack = get_object_or_404(OrderPack, pk=order_pack_id, version_id=version_id)
        pack_placements = pack.orderpackplacement_set.all().prefetch_related(
            'orderpackplacementmaterial',
            'orderpackplacementmaterial__material',
            'orderpackplacementmaterial__material__material_code',
        )
        return self.get_api_response(pack_placements)


class PackItemMaterialAPI(APIView, PackItemPlacementInfoMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_pack_item_id, version_id):
        pack_item = get_object_or_404(OrderPackItem, pk=order_pack_item_id, pack__version_id=version_id)
        pack_item_placements = pack_item.orderpackitemplacement_set.all().prefetch_related(
            'orderpackitemplacementmaterial',
            'orderpackitemplacementmaterial__material',
            'orderpackitemplacementmaterial__material__material_code'
        )
        return self.get_api_response(pack_item_placements)


class PackItemAssignMaterial(ObjectStatePermissionMixin, APIView):
    serializer_class = OrderItemSizeGroupPacksSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE, ]

    def get_pack_item_placement(self, row, version):
        order_pack_placement_item_id = row.get('selected_placements', [])[0]
        pack_item_placement = OrderPackItemPlacement.objects.get(pk=order_pack_placement_item_id, order_pack_item__pack__version=version)
        return pack_item_placement

    def get_object_current_state(self):
        version = get_object_or_404(OrderCostingVersion, pk=self.kwargs.get('version_id', None))
        return version.version_state
    
    def validate_completed_material_types(self, costing, data_list):
        is_complete = False
        for row in data_list:
            material_type = row.get('material_type', None)
            is_complete = CostingCompletedMaterial.objects.filter(costing_version=costing, material__name=material_type).exists()
        return is_complete

    def post(self, request, version_id):

        errors = {FORM_ERRORS_KEY: [],}
        data_list = request.data
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        created_material_id = None
        is_material_type_completed = self.validate_completed_material_types(version, data_list)
        if not is_material_type_completed:
            for row in data_list:
                # If there are no selected placements, continue
                if len(row.get('selected_placements', [])) == 0:
                    errors[FORM_ERRORS_KEY].append("Please select at least one pack item")
                    continue
                try:
                    pack_item_placement = self.get_pack_item_placement(row, version)
                    material_type = row.get('material_type', None)
                    material_helper_class = get_pack_item_placement_material_helper_class(material_type)

                    if material_helper_class:
                        material_helper = material_helper_class(pack_item_placement, row)
                        errors = material_helper.process_material()
                        placement_material = get_object_or_none(OrderPackItemPlacementMaterial, {'placement': pack_item_placement})
                        if placement_material:
                            created_material_id = placement_material.material_id
                    else:
                        errors[FORM_ERRORS_KEY].append("Specified Material (%s) Not Found" % material_type)

                except ObjectDoesNotExist:
                    errors[FORM_ERRORS_KEY].append("Order Pack Item Placement Not found")

            success = len(errors.get(FORM_ERRORS_KEY, [])) == 0 and errors.get(FIELD_ERRORS_KEY, {}) == {}
            response = {'success': success, 'errors': errors, 'customer_brand_material_id': created_material_id}
            response_http = Response(response)

            if not success:
                response_http.status_code = status.HTTP_400_BAD_REQUEST
        else:
            response_http = Response('Material Type already completed', status=status.HTTP_400_BAD_REQUEST)
        return response_http


class PackAssignMaterial(ObjectStatePermissionMixin, APIView):
    serializer_class = OrderItemSizeGroupPacksSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE, ]

    def get_pack_placement(self, row, order_version):
        order_pack_placement_id = row.get('selected_placements', [])[0]
        pack_placement = OrderPackPlacement.objects.get(pk=order_pack_placement_id, order_pack__version=order_version)
        return pack_placement

    def get_object_current_state(self):
        version = get_object_or_404(OrderCostingVersion, pk=self.kwargs.get('version_id', None))
        return version.version_state

    def post(self, request, version_id):
        errors = {FORM_ERRORS_KEY: [],}
        data_list = request.data
        order_version = get_object_or_404(OrderCostingVersion, pk=version_id)
        for row in data_list:
            if len(row.get('selected_placements', [])) == 0:
                errors[FORM_ERRORS_KEY].append("Please select at least one pack")
                continue
            try:
                material_type = row.get('material_type', None)
                material_helper_class = get_order_pack_placement_material_helper(material_type)
                pack_placement = self.get_pack_placement(row, order_version)

                if material_helper_class:
                    material_helper = material_helper_class(pack_placement, row)
                    errors = material_helper.process_material()
                else:
                    errors.append("Specified Material (%s) Not Found" % material_type)

            except ObjectDoesNotExist:
                errors.append({"": "Order Pack Placement Not found"})

        success = len(errors) == 0
        response = {'success': success, 'errors': errors}
        response_http = Response(response)

        if not success:
            response_http.status_code = status.HTTP_400_BAD_REQUEST
        return response_http


class OrderPackItemList(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderPackItemPlacementSerializer

    def get_queryset(self):
        pack_item_placement_id = self.kwargs.get('pack_item_placement_id', None)
        version_id = self.kwargs.get('version_id', None)
        pack_item_placement = OrderPackItemPlacement.objects.get(pk=pack_item_placement_id)
        pack_item_placements = OrderPackItemPlacement.objects.filter(
            item_attribute_other=pack_item_placement.item_attribute_other,
            order_pack_item__pack__version_id=version_id
        ).order_by('order_pack_item__pack__country__country__name', 'order_pack_item__pack__colorway__colorway', 'order_pack_item__pack__size__size__sorting_order')
        return pack_item_placements


class OrderPackPlacementList(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderPackPlacementSerializer

    def get_queryset(self):
        pack_placement_id = self.kwargs.get('pack_placement_id', None)
        version_id = self.kwargs.get('version_id', None)
        pack_item_placement = OrderPackPlacement.objects.get(pk=pack_placement_id)
        pack_item_placements = OrderPackPlacement.objects.filter(
            item_attribute_other=pack_item_placement.item_attribute_other,
            order_pack__version_id=version_id
        ).order_by('order_pack__country__country__name', 'order_pack__colorway__colorway',
                   'order_pack__size__size__sorting_order')
        return pack_item_placements


class GroupMaterialReviewDetailUpdateView(ObjectStatePermissionMixin, APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE, ]

    def get_object_current_state(self):
        version_id = self.kwargs.get('version_id')
        version = self.get_costing_version_or_raise_http404(version_id)
        return version.version_state

    def validate_packs(self):
        placements = OrderPackPlacement.objects.filter(
            order_pack__in=self.packs,
        )
        placement_materials = OrderPackPlacementMaterial.objects.filter(
            placement__order_pack__in=self.packs,
        )

        valid = True
        if placements.count() != placement_materials.count():
            valid = False

        if placement_materials.filter(material__isnull=True).exists():
            valid = False
        return valid

    def validate_pack_items(self):

        placements = OrderPackItemPlacement.objects.filter(
            order_pack_item__in=self.pack_items,
        )

        placement_materials = OrderPackItemPlacementMaterial.objects.filter(
            placement__order_pack_item__in=self.pack_items,
        )
        valid = True
        if placements.count() != placement_materials.count():
            valid = False

        if placement_materials.filter(material__isnull=True).exists():
            valid = False
        return valid


    def post(self, request, *args, **kwargs):
        version_id = kwargs['version_id']
        order_colorway_id = kwargs['order_colorway_id']
        order_country_id = kwargs['order_country_id']
        order_size_group_id = kwargs['order_size_group_id']
        version = self.get_costing_version_or_raise_http404(version_id)
        size_group = OrderSizeGroup.objects.get(pk=order_size_group_id)
        sizes = size_group.sizes.all()

        self.packs = version.get_version_colorway_country_size_group_packs(order_colorway_id, order_country_id, order_size_group_id)
        self.pack_items = version.get_version_colorway_country_size_group_pack_items(order_colorway_id, order_country_id, order_size_group_id)

        valid_packs = self.validate_packs()
        valid_pack_items = self.validate_pack_items()

        reviewed = request.data.get('reviewed', False)

        if reviewed and valid_packs and valid_pack_items:
            self.packs.update(reviewed=True)
            self.pack_items.update(reviewed=True)
            return Response({'success': True}, status=status.HTTP_200_OK)
        elif not reviewed:
            self.packs.update(reviewed=False)
            self.pack_items.update(reviewed=False)
            return Response({'success': True}, status=status.HTTP_200_OK)
        return Response({'message': "Please ensure that all placements have an assigned material."}, status=status.HTTP_400_BAD_REQUEST)


class MaterialReviewDetailUpdateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE, ]

    def get_object_current_state(self):
        order_pack = get_object_or_404(OrderPack, pk=self.request.data.get("pack_id"))
        return order_pack.version.version_state

    def post(self, request, order_id):
        pack_item_id = request.data.get("pack_item_id")
        pack_id = request.data.get("pack_id")
        type = request.data.get("type")
        reviewed = request.data.get("reviewed")
        pack = get_object_or_404(OrderPack, pk=pack_id)

        has_complete = True

        if type == "material":
            pack_item = get_object_or_404(OrderPackItem, pk=pack_item_id)
            order_pack_item_placements_ids = OrderPackItemPlacement.objects.filter(
                order_pack_item=pack_item).values_list('id', flat=True)
            for order_pack_item_placements_id in order_pack_item_placements_ids:
                try:
                    pack_item_placement_material = OrderPackItemPlacementMaterial.objects.get(
                        placement=order_pack_item_placements_id, material__isnull=False)
                    if pack_item_placement_material.material is None:
                        has_complete = False
                except ObjectDoesNotExist:
                    has_complete = False
            data = {}
            if reviewed:
                if has_complete:
                    if reviewed:
                        pack_item.reviewed = True
                        pack_item.save()
                        data = {'message': True}
                else:
                    data = {'message': "Please enter materials for all the placements"}
                    return Response(data, status=status.HTTP_400_BAD_REQUEST)
            else:
                pack_item.reviewed = False
                pack.reviewed = False
                pack_item.save()
                pack.save()
                data = {'message': False}
            return Response(data, status=status.HTTP_200_OK)

        elif type == "packaging":
            has_pack_items_not_complete = OrderPackItem.objects.filter(pack=pack, reviewed=False).exists()
            order_pack_placements_ids = OrderPackPlacement.objects.filter(order_pack=pack).values_list('id', flat=True)
            for order_pack_placements_id in order_pack_placements_ids:
                try:
                    OrderPackPlacementMaterial.objects.get(placement=order_pack_placements_id, material__isnull=False)
                    has_complete = True
                except ObjectDoesNotExist:
                    data = {
                        'message': "Please enter materials for all the placements"
                    }
                    return Response(data, status=status.HTTP_400_BAD_REQUEST)

            if has_complete and reviewed:
                pack.packaging_reviewed = True
                pack.save()
                if not has_pack_items_not_complete:
                    if has_complete and pack.packaging_reviewed:
                        pack.reviewed = True
                        pack.save()
                data = {
                    'message': True
                }
            else:
                pack.packaging_reviewed = False
                pack.reviewed = False
                data = {
                    'message': False
                }
                pack.save()
            return Response(data, status=status.HTTP_200_OK)
        return HttpResponse("Invalid request.", status=status.HTTP_400_BAD_REQUEST)

class OrderCostingVersionDetailUpdateView(generics.RetrieveUpdateAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderVersionSerializer

    def get_queryset(self):
        order_id = self.kwargs.get('order_id')
        order = get_object_or_404(OrderInquiry, pk=order_id)
        qs = OrderCostingVersion.objects.filter(order=order)
        return qs

class OrderCostingVersionListCreateView(generics.ListCreateAPIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderVersionSerializer

    def get_queryset(self):
        order_id = self.kwargs.get('order_id')
        order = get_object_or_404(OrderInquiry, pk=order_id)
        qs = OrderCostingVersion.objects.filter(order=order)
        return qs

    def post(self, request, order_id):
        order = self.get_order_inquiry_or_raise_http404(order_id)
        name = self.request.data.get('name', None)
        version = order.create_version(name=name, user=self.request.user)
        version.verify_packs()
        data = OrderVersionSerializer(version, many=False).data
        return Response(data)

class ConfirmCostingGeneralInformation(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderVersionSerializer

    def post(self, request, order_id):
        order = self.get_order_inquiry_or_raise_http404(order_id)
        valid, form_errors = OrderInquiryValidator(order).validate_general_info()
        if valid:
            valid2 = True
            try:
                order.set_state(OrderInquiry.GENERAL_INFORMATION_COMPLETE_STATE)
                order.generate_code()
                version = order.create_version(user=request.user)
                version.verify_packs()
                return Response({'success': True, 'version_id': version.id})

            except InvalidStateTransition as ex:
                errors = {'invalid_state': str(ex)}
                return Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'success': False, 'errors': form_errors}, status=status.HTTP_400_BAD_REQUEST)


class OrderItemSizeGroupPacksDetailView(APIView, OrderMixin):
    serializer_class = OrderItemSizeGroupPacksSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_item_colorway_categories(self, order):
        item_colorway_categories = {}
        colorways = order.get_order_colorways()

        for colorway in colorways:
            pack_item_cw_types = ColorwayItemType.objects.filter(colorway=colorway)
            for pack_item_cw_type in pack_item_cw_types:
                colorway_id = pack_item_cw_type.colorway.id
                colorway_name = pack_item_cw_type.colorway.colorway
                order_item_id = pack_item_cw_type.item.id
                item_name = pack_item_cw_type.item.item_display

                colorway_category = pack_item_cw_type.colorway_category.name if pack_item_cw_type.colorway_category else None

                if colorway_id not in item_colorway_categories:
                    item_colorway_categories[colorway_id] = {
                        'colorway_id': colorway_id,
                        'colorway': colorway_name,
                        'items':{}
                    }
                if order_item_id not in item_colorway_categories[colorway_id]['items']:
                    item_colorway_categories[colorway_id]['items'][order_item_id]= {
                    'item_name': item_name,
                    'item_id': order_item_id,
                    'colorway_category': colorway_category
                    }
        return item_colorway_categories

    def get(self, request, order_id, version_id):
        order = self.get_order_inquiry_or_raise_http404(order_id)
        version = self.get_order_version_or_raise_http404(order_id, version_id)
        queryset = {
            "items": order.get_order_items(),
            "order_pack_size_groups": version.get_order_version_pack_groups().order_by('country__country__name',
                                                                                       'colorway__colorway', 'size_group'),
            "order_pack_items": version.get_order_pack_items(),
            "order_packs": version.get_order_version_packs(),
            "item_colorway_categories": self.get_item_colorway_categories(order)
        }
        serializer = self.serializer_class(queryset)
        return Response(serializer.data)


class OrderCostingStateChangeView(APIView, OrderMixin):
    serializer_class = OrderCostingVersion
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, CAD_USER_ROLE]

    def post(self, request, order_id, version_id):
        order_costing_version = get_object_or_404(OrderCostingVersion, order_id=order_id, pk=version_id)
        response = order_costing_version.move_to_next_state(request.user)
        http_response = Response(response)
        if not response.get('success', None):
            http_response.status_code = status.HTTP_400_BAD_REQUEST
        return http_response


class OrderPackItemColorwayMaterialSupplierInquiry(ObjectStatePermissionMixin, APIView, OrderMixin):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [OrderCostingVersion.PENDING_SUPPLIER_SELECTION_VERSION_STATE, ]

    def get_object_current_state(self):
        version = self.get_version()
        return version.version_state

    def get_order_colorway(self, version):
        order_pack_item_id = self.kwargs['pack_item_id']
        try:
            order_pack_item = OrderPackItem.objects.get(pk=order_pack_item_id, pack__version=version)
        except ObjectDoesNotExist:
            raise Http404("Colorway Does not Exist")
        return order_pack_item.pack.colorway

    def get_customer_brand_material(self, data):
        customer_brand_material_id = data.get('customer_brand_material_id', None)
        try:
            customer_brand_material = CustomerBrandMaterial.objects.get(pk=customer_brand_material_id)
        except ObjectDoesNotExist:
            raise Http404("Material Does not Exist")
        return customer_brand_material

    def get_customer_item_service(self, data):
        item_service_id = data.get('item_service_id', None)
        try:
            item_service = PackItemService.objects.get(pk=item_service_id)
        except ObjectDoesNotExist:
            raise Http404("Pack Item Service Does not Exist")
        return item_service

    def get_supplier_inquiry_detail(self, data, version):
        supplier_inquiry_detail_id = data.get('supplier_inquiry_detail_id', None)

        try:
            customer_brand_material = SupplierInquiryDetail.objects.get(pk=supplier_inquiry_detail_id, supplier_inquiry__version=version)
        except ObjectDoesNotExist:
            raise Http404("Supplier Inquiry Does not Exist")
        return customer_brand_material

    def get_version(self):
        order_id = self.kwargs['order_id']
        version_id = self.kwargs['version_id']
        version = self.get_order_version_or_raise_http404(order_id, version_id)
        return version

    def get_order_and_version(self):
        order_id = self.kwargs['order_id']
        order = self.get_order_inquiry_or_raise_http404(order_id)
        version = self.get_version()
        return order, version

    def get(self, request, **kwargs):
        order, version = self.get_order_and_version()
        colorway = self.get_order_colorway(version)

        material_response = get_material_inquiries_for_colorway(version, colorway)
        service_response = get_service_inquiries_for_colorway(version, colorway)
        response = {
            'service_suppliers': service_response,
            'material_suppliers': material_response
        }
        return Response(response)

    def save_material(self, data, version, colorway):
        customer_brand_material = self.get_customer_brand_material(data)
        supplier_inquiry_detail = self.get_supplier_inquiry_detail(data, version)

        order_costing_colorway_material = OrderCostingColorwayMaterialSupplierInquiry.objects.get_or_create(
            order_costing_version=version,
            colorway=colorway,
            customer_brand_material=customer_brand_material
        )[0]
        order_costing_colorway_material.supplier_inquiry_detail = supplier_inquiry_detail
        order_costing_colorway_material.save()

    # def calculate_colorway_costs(self, colorway, costing_version):
    #     costing_version.recalculate_all_pack_costs_and_normalized_costs(colorway)

    def save_item_service(self, data, version, colorway):
        item_service = self.get_customer_item_service(data)
        supplier_inquiry_detail = self.get_supplier_inquiry_detail(data, version)

        order_costing_colorway_material = OrderCostingServiceSupplierInquiry.objects.get_or_create(
            order_costing_version=version,
            item_service=item_service
        )[0]
        order_costing_colorway_material.supplier_inquiry_detail = supplier_inquiry_detail
        order_costing_colorway_material.save()

    def post(self, request, **kwargs):
        order, version = self.get_order_and_version()
        version.raise_exception_if_cannot_edit_request()
        colorway = self.get_order_colorway(version)
        self.version_supplier_selectable(version) # Raise error if not editable
        material_data = request.data.get('data', [])
        # OrderColorway object (484) OrderCostingVersion object (247)
        for data in material_data:
            if data.get('is_service', None):
                self.save_item_service(data, version, colorway)
            else:
                self.save_material(data, version, colorway)
        return Response({"success": True})


class OrderPackColorwayMaterialSupplierInquiry(OrderPackItemColorwayMaterialSupplierInquiry):
    # Permissions inherited
    def get_order_colorway(self, version):
        order_pack_id = self.kwargs['pack_id']
        try:
            order_pack = OrderPack.objects.get(pk=order_pack_id, version=version)
        except ObjectDoesNotExist:
            raise Http404("Colorway Does not Exist")
        return order_pack.colorway


class OrderColorwayMaterialSupplierInquiry(OrderPackItemColorwayMaterialSupplierInquiry):

    def get_order_colorway(self, version):
        colorway_id = self.kwargs.get('colorway_id', None)
        colorway = get_object_or_404(OrderColorway, pk=colorway_id)
        return colorway


class OrderVersionStateRetrieveUpdateAPIView(RetrieveUpdateAPIView):
    queryset = OrderCostingVersion.objects.all().order_by('id')
    serializer_class = OrderVersionSerializer
    write_roles = [MERCHANT_ROLE, ]
    permission_classes = (HasPermission,)

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_id=self.kwargs['order_id'], version=self.kwargs['version_id'])
        return qs


class ReCalculateVersionCosts(APIView):
    write_roles = [MERCHANT_ROLE, ]
    permission_classes = (HasPermission,)

    def post(self, request, *args, **kwargs):
        costing_id = kwargs.get('version_id', None)
        costing = get_object_or_404(OrderCostingVersion, pk=costing_id)
        calc_type = request.data.get('calculate_type')
        colorway_id = request.data.get('colorway_id', None)

        try:
            costing.raise_exception_if_cannot_edit_request()
        except CostingEditingDenied:
            raise PermissionDenied("Cannot edit costing in current state")

        calculation_failed = False
        if calc_type == 'costing_colorway':
            colorway = costing.order.get_order_colorways().get(pk=colorway_id)
            costing.recalculate_colorway_all_pack_costs_and_normalized_costs(colorway)
            calculation_failed = costing.orderpack_set.filter(colorway=colorway, normalized_total_pack_cost__isnull=True).exists()
        elif calc_type == 'all_colorways':
            costing.recalculate_all_pack_costs_and_normalized_costs()
            calculation_failed = costing.orderpack_set.filter(normalized_total_pack_cost__isnull=True).exists()

        response = Response(data={"success": True})
        if calculation_failed:
            response = Response(data={"success": False, 'message': "Calculation failed. Please verify that materials are selected for all the packs"}, status=status.HTTP_400_BAD_REQUEST)
        return response


class PackPackItemCostingDetails(APIView):
    write_roles = [MERCHANT_ROLE, ]
    permission_classes = (HasPermission,)

    def format_cost(self, cost):
        cost_display = None
        if cost:
            cost_display = cost
            if not isinstance(cost, str):
                cost_display = '{0:.2f}'.format(cost)
        return cost_display

    def get(self, request, **kwargs):
        type = request.GET.get('type', None)
        pk = kwargs.get('pk', None)
        if type == 'orderpack':
            pack = get_object_or_404(OrderPack, pk=pk)
            if not pack.normalized_total_pack_cost:
                cost_data = pack.calculate_pack_cost(False)
                cost = cost_data.get(PACK_TOTAL_COST_KEY, None)
                normalized_cost = None
            else:
                cost = pack.total_pack_cost
                normalized_cost = pack.normalized_total_pack_cost
                cost_data = {
                    'fabric_financing_cost': pack.total_fabric_financing_cost,
                    'buyer_commission_cost': pack.buyer_commission_cost,
                    'trim_financing_cost': pack.total_trim_financing_cost,
                }
            response = {'cost': self.format_cost(cost), 'normalized_cost': self.format_cost(normalized_cost), 'cost_break_down': cost_data}

        elif type == 'orderpackitem':
            pack_item = get_object_or_404(OrderPackItem, pk=pk)
            if not pack_item.pack.normalized_total_pack_cost:

                pack_item = get_object_or_404(OrderPackItem, pk=pk)
                cost_data = pack_item.calculate_pack_item_cost(False)
                cost = cost_data.get(PACK_ITEM_TOTAL_COST_KEY, None)
                normalized_cost = None
            else:
                cost = pack_item.total_pack_item_cost
                normalized_cost = pack_item.total_pack_item_normalized_cost
                cost_data = {
                    'fabric_financing_cost': pack_item.pack_item_fabric_financing_cost,
                    'trim_financing_cost': pack_item.pack_item_trim_financing_cost,
                }
            response = {'cost': self.format_cost(cost), 'normalized_cost': self.format_cost(normalized_cost), 'cost_break_down': cost_data}
        else:
            raise Http404()

        if not cost:
            response = {"errors": ["Costing failed. Make sure every material has a consumption ratio and a supplier is selected for each placement."]}
            http_response = Response(response)
        else:
            http_response = Response(response)
        return http_response


class PerformSizeGroupPackCosting(APIView, OrderMixin):
    write_roles = [MERCHANT_ROLE, ]
    permission_classes = (HasPermission,)

    def get(self, request, **kwargs):
        version_id = kwargs.get('version_id')
        country_id = kwargs.get('order_country_id')
        colorway_id = kwargs.get('order_colorway_id')
        size_group_id = kwargs.get('size_group_id')
        version = self.get_costing_version_or_raise_http404(version_id)
        country = get_object_or_404(OrderCountry, pk=country_id, order_id=version.order_id)
        colorway = get_object_or_404(OrderColorway, pk=colorway_id, order_id=version.order_id)
        size_group = get_object_or_404(OrderSizeGroup, pk=size_group_id, order_id=version.order_id)
        sizes = size_group.sizes.all()

        packs = OrderPack.objects.filter(country=country, colorway=colorway, version=version, size__in=sizes).order_by('size__size__sorting_order')
        pack_cost_summary = []
        for pack in packs:
            pack_cost_summary.append({
                'size': pack.size.size.name,
                # 'cost': pack.calculate_pack_cost(), #old way
                'cost': {
                    PACK_TOTAL_COST_KEY: pack.total_pack_cost,
                    FABRIC_FINANCING_COST_KEY: pack.total_fabric_financing_cost,
                    TRIM_FINANCING_COST_KEY: pack.total_trim_financing_cost,
                    BUYER_COMMISSION_COST_KEY: pack.buyer_commission_cost,
                },
                'normalized_cost': {'normalized_costs': pack.normalized_total_pack_cost},
            })
        return Response(pack_cost_summary)


class VersionPackCosts(APIView, OrderMixin):
    write_roles = [MERCHANT_ROLE, ]
    permission_classes = (HasPermission,)

    def get_data(self, costing):
        groups = OrderSizeGroup.objects.filter(order=costing.order)
        colorways = costing.order.get_order_colorways()
        countries = costing.order.get_order_countries()
        data = []
        for country in countries:
            for colorway in colorways:
                for group in groups:
                    sizes = [size.size.name for size in group.sizes.all()]
                    pack = OrderPack.objects.get(colorway=colorway, country=country, size=group.sizes.all()[0])
                    OrderColorway
                    data.append(
                        {
                            'pack_id': pack.id,
                            'colorway': colorway.colorway,
                            'colorway_id': colorway.pk,
                            'country': country.country.name,
                            'country_id': country.country.pk,
                            'size': ", ".join(sizes),
                            'normalized_cost': pack.normalized_total_pack_cost
                        }
                    )
        response = {
            'pack_costs': data,
            'average_cost': costing.average_pack_cost
        }
        return response


    def get(self, request, **kwargs):
        version_id = kwargs.get('version_id')
        order_id = kwargs.get('order_id')

        version = self.get_order_version_or_raise_http404(order_id, version_id)
        costs = self.get_data(version)
        return Response(costs)


class OrderItemColorwayOperationListView(generics.ListAPIView, OrderMixin):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]

    queryset = OrderItemColorwayOperation.objects.all()
    serializer_class = OrderItemColorwayOperationSerializer

    def get_queryset(self):
        order_item = get_object_or_404(OrderItem, pk = self.kwargs['order_item_id'])
        order_colorway = get_object_or_404(OrderColorway, pk = self.kwargs['order_colorway_id'])
        version = get_object_or_404(OrderCostingVersion, pk = self.kwargs['version_id'])
        queryset = OrderItemColorwayOperation.objects.filter(colorway_item_category__item = order_item, colorway_item_category__colorway = order_colorway, version = version).order_by('-active')
        return queryset

    def get(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id', None)
        version = self.get_costing_version_or_raise_http404(version_id)
        order_item = get_object_or_404(OrderItem, pk = self.kwargs['order_item_id'])
        order_colorway = get_object_or_404(OrderColorway, pk = self.kwargs['order_colorway_id'])
        colorway_item_type = get_object_or_none(ColorwayItemType, {'item': order_item, 'colorway': order_colorway})
        return_data = {}
        if not colorway_item_type == None:
            colorway_category = colorway_item_type.colorway_category#.order_colorway_category.colorway_category fix after CW category removing
            item_variation = get_object_or_none(ItemVariation, {'item': order_item.item, 'colorway_category': colorway_category})
            if not item_variation == None:
                return_data['variation'] = item_variation.id
                return_data['variation_name'] = item_variation.variation_name
                return_data['item_id'] = order_item.id
                return_data['total_costed_smv'] = item_variation.get_total_costed_smv(colorway_item_type, version)
                return_data['total_factory_smv'] = item_variation.get_total_factory_smv(colorway_item_type, version)
        data = super().get(request, *args, **kwargs)
        return_data['operations'] = data.data
        data.data = return_data
        return data


class OrderPackItemColorwayOperationListView(OrderItemColorwayOperationListView):

    def get_serializer_context(self):
        pack_item_id = self.kwargs.get('pack_item_id')
        order_pack_item = OrderPackItem.objects.get(pk=pack_item_id)
        kwargs = {'order_pack_item': order_pack_item}
        return kwargs


class ConsolidatedOrderPackItemColorwayOperationListView(OrderItemColorwayOperationListView):

    def get(self, request, *args, **kwargs):
        pack_item_id = kwargs.get('pack_item_id', None)
        version = get_object_or_404(OrderCostingVersion, pk=self.kwargs['version_id'])
        pack_item = get_object_or_404(OrderPackItem, pk=pack_item_id, pack__version=version)
        operations = pack_item.get_consolidated_colorway_operations()
        data = {'operations': [operations]}
        return Response(data)


class OrderPackItemGroupItemColorwayOperationListView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = OrderItemColorwayOperation.objects.all()

    def get_pack_items(self):
        #order_size_group_pack_item_colorway_operation/list/<int:country_id>/<int:colorway_id>/<int:size_group_id>/<int:order_item_id>/<int:version_id>
        size_group_id = self.kwargs.get('size_group_id')
        country_id = self.kwargs.get('country_id')
        order_colorway_id = self.kwargs.get('colorway_id')
        version_id = self.kwargs.get('version_id')
        order_item_id = self.kwargs.get('order_item_id')
        order_size_group_pack = get_object_or_404(
            OrderPackSizeGroup,
            size_group_id=size_group_id,
            colorway_id=order_colorway_id,
            version_id=version_id,
            country_id=country_id
        )
        packs = order_size_group_pack.order_packs
        pack_items = OrderPackItem.objects.filter(
            pack__in=packs,
            item_id=order_item_id
        ).order_by('pack__size__size__sorting_order')
        return pack_items

    def get(self, request, *args, **kwargs):
        pack_items = self.get_pack_items()

        data = []
        for pack_item in pack_items:
            pack_item_data = pack_item.get_consolidated_colorway_operations()
            pack_item_data = { **pack_item_data, 'size_name': pack_item.pack.size.size.name}
            data.append(pack_item_data)
        return Response(data)


class OrderItemColorwayOperationDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]

    queryset = OrderItemColorwayOperation.objects.all()
    serializer_class = OrderItemColorwayOperationSerializer


class OrderItemColorwayOperationCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]

    queryset = OrderItemColorwayOperation.objects.all()
    serializer_class = OrderItemColorwayOperationSerializer

    def post(self, request, *args, **kwargs):
        errors = {}
        order_item = get_object_or_404(OrderItem, pk = kwargs['order_item_id'])
        order_colorway = get_object_or_404(OrderColorway, pk = kwargs['order_colorway_id'])
        version = get_object_or_404(OrderCostingVersion, pk = kwargs['version_id'])
        colorway_item_type = get_object_or_none(ColorwayItemType, {'item': order_item, 'colorway': order_colorway})
        if not colorway_item_type == None:
            data = request.data
            data['colorway_item_category'] = colorway_item_type.id
            data['version'] = version.id
            data['display_order'] = len(OrderItemColorwayOperation.objects.filter(colorway_item_category = colorway_item_type, version = version))+1
            serializer = OrderItemColorwayOperationSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                data = Response(data=serializer.data, status=status.HTTP_200_OK)
            else:
                data = Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            data = Response(data={'colorway_item_type': 'Not found'}, status=status.HTTP_400_BAD_REQUEST)
        return data


class OrderItemColorwayOperationDisplayOrderUpdateView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]

    queryset = OrderItemColorwayOperation.objects.all()
    serializer_class = OrderItemColorwayOperationSerializer

    def put(self, request, *args, **kwargs):
        errors = {}
        with transaction.atomic():
            for array_element in request.data:
                order_item_colorway_operation = get_object_or_none(OrderItemColorwayOperation, {'pk': array_element['order_item_colorway_operation_id']})
                if not order_item_colorway_operation == None:
                    order_item_colorway_operation.display_order = array_element['display_order']
                    serializer = OrderItemColorwayOperationSerializer(data=OrderItemColorwayOperationSerializer(order_item_colorway_operation).data)
                    if serializer.is_valid():
                        order_item_colorway_operation.save()
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


# Size group material views
class OrderPackItemSizeGroupMaterialsView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, version_id, order_id, order_colorway_id, order_country_id, order_size_group_id):
        version = self.get_order_version_or_raise_http404(order_id, version_id)
        colorway = get_object_or_404(OrderColorway, pk=order_colorway_id)

        material_inquiries = get_material_inquiries_for_colorway(version, colorway)
        service_inquiries = get_service_inquiries_for_colorway(version, colorway)
        order_items = version.order.get_order_items()
        pack_item_data = {}
        for order_item in order_items:
            material_data = CombinedCostingPackItemInterface(
                request,
                order_id,
                order_colorway_id,
                order_country_id,
                order_item.id,
                order_size_group_id,
                version_id
            ).get_placement_material_details()

            colorway_item_type = get_object_or_none(ColorwayItemType, {'item_id': order_item.id, 'colorway_id': order_colorway_id})
            item_display = order_item.item_display
            if colorway_item_type:
                item_display += ' (%s)' % colorway_item_type.colorway_category.name
            pack_item_data[order_item.id] = {
                'item': item_display,
                'order_item_id': order_item.pk,
                'item_id': order_item.item.id,
                'data': material_data,
                'colorway_item_type': colorway_item_type.colorway_category_id
            }

        packaging_data = CombinedCostingPackCadInterfacePlacementMaterial(
            request,
            order_id,
            order_colorway_id,
            order_country_id,
            order_size_group_id,
            version_id
        ).get_placement_material_details()

        other_costs = OtherCostCombination(
            request,
            order_id,
            version_id,
            order_colorway_id,
            order_country_id,
            order_size_group_id
        ).get_size_group_pack_costs()

        service_costs = CombinedServiceCosts(
            request,
            order_id,
            version_id,
            order_colorway_id,
            order_country_id,
            order_size_group_id
        ).get_service_information()

        not_reviewed_packs = version.get_version_colorway_country_size_group_packs(order_colorway_id, order_country_id, order_size_group_id).filter(reviewed=False)
        not_reviewed_pack_items = version.get_version_colorway_country_size_group_pack_items(order_colorway_id, order_country_id, order_size_group_id).filter(reviewed=False)
        marked_as_complete = not (not_reviewed_packs.exists() or not_reviewed_pack_items.exists())
        response = {
            'pack_item_data': pack_item_data,
            'packaging_data': packaging_data,
            'material_supplier_inquiries': material_inquiries,
            'service_supplier_inquiries': service_inquiries,
            'other_costs': other_costs,
            'service_costs': service_costs,
            'supplier_inquiry_headers': get_supplier_quote_meta_data(False),
            'marked_as_complete': marked_as_complete
        }
        return Response(response)


# class ColorwayItemOperationView(APIView, OrderMixin):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, ]
#
#     def get(self, request, *args, **kwargs):
#         version_id = kwargs.get('version_id')
#         colorway_id = kwargs.get('colorway_id')
#         version = self.get_costing_version_or_raise_http404(version_id)
#         colorway = get_object_or_404(OrderColorway, pk=colorway_id)
#         order_items = version.order.get_order_items()
#         data = []
#
#         for order_item in order_items:
#             item_cw_operations = OrderItemColorwayOperation.objects.filter(colorway_item_category__colorway=colorway, colorway_item_category__item=order_item)
#             operations = OrderItemColorwayOperationSerializer(item_cw_operations, many=True)
#             data =


class OrderPackItemDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    serializer_class = OrderPackItemSerializer


class OrderPackDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    serializer_class = OrderPackSerializer


class OtherCostTypeListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OtherCostTypeSerializer

    def get_queryset(self):
        qs = OtherCostType.objects.filter(version_id=self.kwargs.get('version_id', None))
        return qs


class OrderPackOtherCostDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, pack_id):
        pack = get_object_or_404(OrderPack, pk=pack_id)
        order_pack_other_cost = OrderPackOtherCost.objects.filter(pack=pack)
        serializer = OrderPackOtherCostSerializer(order_pack_other_cost, many=True)
        return Response(serializer.data)

    def post(self, request, pack_id):
        other_cost_type_id = request.data.get('other_cost_type_id')
        cost = request.data.get('cost')
        try:
            order_pack_other_cost = OrderPackOtherCost.objects.get(pack_id=pack_id, other_cost_type_id=other_cost_type_id)
        except ObjectDoesNotExist:
            return Response({'errors':'OrderPack other cost not exist'}, status=status.HTTP_400_BAD_REQUEST)
        order_pack_other_cost.cost = cost
        serializer = OrderPackOtherCostSerializer(instance=order_pack_other_cost)
        return Response(serializer.data)


class OrderPackOtherCostCreateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_field(self, other_cost_type_id, other_cost_type_name, pack_ids, cost, version):
        errors = {}
        is_new_cost_type = False
        if not other_cost_type_id or other_cost_type_id == '':
            is_new_cost_type = True
            if not other_cost_type_name:
                errors['other_cost_type_id'] = 'Please enter a Cost Type'
        elif not other_cost_type_id:
            other_cost_type = get_object_or_none(OtherCostType, {'pk': other_cost_type_id, 'version': version})
            if not other_cost_type :
                errors['other_cost_type_id'] = 'Invalid Cost Type Selected'

        if len(pack_ids) == 0:
            errors['pack_ids'] = "Select at least one order pack"
        # if cost is None:
        #     errors['cost'] = "Enter cost"
        return errors, is_new_cost_type

    def get_or_create_order_cost_type(self, cost_id_or_name, other_cost_type_name, is_new_cost_type, version):
        if is_new_cost_type:
            cost_type = OtherCostType.objects.get_or_create(version=version, name=other_cost_type_name)[0]
        else:
            cost_type = get_object_or_404(OtherCostType, pk=cost_id_or_name, version=version)
        return cost_type

    def post(self, request, order_id, version_id):
        other_cost_type_id = request.data.get('other_cost_type_id') # Name comes in this as well
        other_cost_type_name = request.data.get('other_cost_type_name') # Name comes in this as well
        pack_ids = request.data.get('pack_ids', [])
        cost = request.data.get('cost')
        version = get_object_or_404(OrderCostingVersion, pk=version_id)

        validate_fields, is_new_cost_type = self.validate_field(other_cost_type_id, other_cost_type_name, pack_ids, cost, version)
        #if validate_fields:
        #    return Response(validate_fields, status=status.HTTP_400_BAD_REQUEST)

        other_cost_type = self.get_or_create_order_cost_type(other_cost_type_id, other_cost_type_name, is_new_cost_type, version)
        data = []

        for row in pack_ids:
            pack_id = row['id']
            cost = row['cost']
            if pack_id:
                pack = get_object_or_404(OrderPack, pk=pack_id)
                order_pack_other_cost, created = OrderPackOtherCost.objects.get_or_create(pack=pack, other_cost_type=other_cost_type)
                if created:
                    order_pack_other_cost.other_cost_type_name = other_cost_type.name
                order_pack_other_cost.cost = cost
                order_pack_other_cost.save()
                serializer = OrderPackOtherCostSerializer(instance=order_pack_other_cost)
                data.append(serializer.data)
        return Response(data, status=status.HTTP_200_OK)


class OrderPackOtherCostByPackandTypeDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, pack_id, other_cost_type_id):
        other_cost_type = get_object_or_404(OtherCostType, pk=other_cost_type_id)
        pack = get_object_or_404(OrderPack, pk=pack_id)
        order_pack_other_costs = OrderPackOtherCost.objects.filter(other_cost_type_id=other_cost_type_id, pack__country=pack.country, pack__colorway=pack.colorway)
        response = {
            'other_cost_type_id': other_cost_type.id,
            'other_cost_type_name': other_cost_type.name,
            'pack_ids': []
        }
        for order_pack_other_cost in order_pack_other_costs:
            if order_pack_other_cost.cost:
                response['pack_ids'].append({
                    'id': order_pack_other_cost.pack.id,
                    'cost': order_pack_other_cost.cost
                })
        return Response(response, status=status.HTTP_200_OK)

class OrderPackOtherCostDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, pk):
        try:
            order_pack_other_cost = OrderPackOtherCost.objects.get(pk=pk)
        except ObjectDoesNotExist:
            return Response({'errors':'Pack order cost not found'}, status=status.HTTP_400_BAD_REQUEST)
        order_pack_other_cost.delete()
        return Response({'status': 'Deleted'}, status=status.HTTP_200_OK)
    
class OrderPackOtherCostGroupDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, other_cost_type_id, country_id, colorway_id):
        other_cost_type = get_object_or_404(OtherCostType, pk=other_cost_type_id)
        order_pack_other_costs = OrderPackOtherCost.objects.filter(other_cost_type=other_cost_type, pack__country_id=country_id, pack__colorway_id=colorway_id).delete()
        return Response({'status':'Deleted.'}, status=status.HTTP_200_OK)


# Wash Service
class WashServiceCreateUpdate(PackItemServiceMixin, APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    # TODO - major permissions

    def get_serializer(self):
        return WashServiceSerializer

    def get_service_object(self, pack_item_id):
        return PackItemWashService.objects.get_or_create(pack_item_id=pack_item_id)[0]

    def get_form_data(self):
        data = self.request.data
        form_data = {
            'technique': data.get('technique', None),
            'service_type': PackItemService.WASH_SERVICE_TYPE,
            'wash_service_attachment': data.get('wash_service_attachment', None),
        }
        return form_data


class WashServiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = WashServiceSerializer
    # TODO - major permissions

    def get_queryset(self):
        pack_item_id = self.kwargs.get('pack_item_id', None)
        qs = PackItemWashService.objects.filter(pack_item_id=pack_item_id)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            response_data = response.data
            response_new_data = {
                'data': response_data,
                'supplier_inquiry_headers': get_supplier_quote_meta_data(False)
            }
            response = Response(response_new_data)
        return response


class WashServiceDetailDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = WashServiceSerializer
    # TODO - major permissions

    def get_object(self):
        version_id = self.kwargs.get('version_id', None)
        wash_service_id = self.kwargs.get('wash_service_id', None)
        object = get_object_or_404(PackItemWashService, pk=wash_service_id, pack_item__pack__version_id=version_id)
        return object



class EmbellishmentServiceCreateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_fields(self, data):
        errors = {}
        type_key = 'type'
        sub_type_key = 'sub_type'
        sizes_key = 'sizes'

        if not data.get(type_key, None):
            errors[type_key] = "EMB Type is required"
        if not data.get(sub_type_key, None):
            errors[sub_type_key] = "EMB Sub Type is required"
        if not data.get(sizes_key, []):
            errors[sizes_key] = "At least one size is required"
        return errors

    def get_or_create_embellishment_service_object(self, embellishment_service_id, version, sub_type_id, grading, embellishment_attachment):
        if embellishment_service_id is not None:
            embelishment_service_detail = get_object_or_404(EmbellishmentServiceDetail, pk=embellishment_service_id)
            embelishment_service_detail.sub_type_id = sub_type_id
            embelishment_service_detail.grading = grading
            embelishment_service_detail.embellishment_attachment_id = embellishment_attachment
            embelishment_service_detail.save()
            return embelishment_service_detail
        else:
            embelishment_service_detail = EmbellishmentServiceDetail.objects.create(version_id=version, sub_type_id=sub_type_id,
                                                                                    grading=grading, embellishment_attachment_id=embellishment_attachment)
            return embelishment_service_detail

    def create_or_update_pack_item_embellishment_objects(self, embellishment_service_id, embelishment_service_detail, sizes):
        pack_item_ids = []
        if embellishment_service_id is not None:
            for size in sizes:
                pack_item_id = size["pack_item"]
                size_value = size["size"]
                pack_item_embellishment_attachment = size["pack_item_embellishment_attachment"]
                pack_item_service, created = PackItemEmbellishmentService.objects.get_or_create(
                    pack_item_id=pack_item_id,
                    embellishment_detail=embelishment_service_detail,
                )
                pack_item_service.size = size_value
                pack_item_service.pack_item_embellishment_attachment_id = pack_item_embellishment_attachment
                pack_item_service.save()
                pack_item_ids.append(pack_item_service.id)
            PackItemEmbellishmentService.objects.filter(embellishment_detail=embelishment_service_detail).exclude(id__in=pack_item_ids).delete()
        else:
            for size in sizes:
                pack_item_id = size["pack_item"]
                size_value = size["size"]
                pack_item_embellishment_attachment = size["pack_item_embellishment_attachment"]
                pack_item_service = PackItemEmbellishmentService.objects.create(
                    pack_item_id=pack_item_id,
                    embellishment_detail=embelishment_service_detail,
                    size = size_value, 
                    pack_item_embellishment_attachment_id = pack_item_embellishment_attachment
                )
                pack_item_ids.append(pack_item_service.id)
        return pack_item_ids

    def post(self, request, *args, **kwargs):
        data = request.data
        embellishment_service_id = data.get('embellishment_service_detail_id')
        version = kwargs['version_id']
        type = data.get('type')
        sub_type_id = data.get('sub_type')
        grading = data.get('grading')
        embellishment_attachment = data.get('embellishment_attachment')
        sizes = data.get('sizes', {})

        data = {
            'type': type,
            'sub_type': sub_type_id,
            'sizes': sizes
        }

        validate_fields = self.validate_fields(data)
        if validate_fields:
            return Response(validate_fields, status=status.HTTP_400_BAD_REQUEST)


        embellishment_service_detail = self.get_or_create_embellishment_service_object(embellishment_service_id, version, sub_type_id, grading, embellishment_attachment)
        self.create_or_update_pack_item_embellishment_objects(embellishment_service_id, embellishment_service_detail, sizes)
        serializer = EmbellishmentServiceDetailSerializer(embellishment_service_detail)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PackItemEmbellishmentServiceDetailView(generics.RetrieveAPIView):
    queryset = PackItemEmbellishmentService.objects.all().order_by('id')
    serializer_class = PackItemEmbellishmentServiceSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class EmbellishmentServiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = FlatPackItemEmbellishmentServiceSerializer
    # TODO - major permissions

    def get_queryset(self):
        pack_item_id = self.kwargs.get('pack_item_id', None)
        qs = PackItemEmbellishmentService.objects.filter(pack_item_id=pack_item_id)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        pack_item = get_object_or_404(OrderPackItem, pk=kwargs.get('pack_item_id', None))
        # service_costs = CombinedServiceCosts(
        #     request,
        #     pack_item.pack.version.order_id,
        #     pack_item.pack.version_id,
        #     pack_item.pack.colorway_id,
        #     pack_item.pack.country_id,
        #     order_size_group_id
        # ).get_service_information()
        if response.status_code == status.HTTP_200_OK:
            response_data = response.data
            response_new_data = {
                'data': response_data,
                'supplier_inquiry_headers': get_supplier_quote_meta_data(False)
            }
            response = Response(response_new_data)
        return response


class EmbellishmentServiceTypeDetailByServiceView(generics.RetrieveAPIView):
    queryset = EmbellishmentServiceDetail.objects.all().order_by('id')
    serializer_class = EmbellishmentServiceDetailSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class EmbellishmentServiceTypeMetaDataDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_id, version_id, item_id, country_id, colorway_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order=order)
        pack_items = OrderPackItem.objects.filter(pack__version=version, item=item_id, pack__country_id=country_id,
                                                  pack__colorway_id=colorway_id)
        serializer = OrderPackItemSerializer(pack_items, many=True)
        return Response(serializer.data)
    

class PackItemEmbellishmentServiceDeleteView(generics.DestroyAPIView):
    queryset = PackItemEmbellishmentService.objects.all().order_by('id')
    serializer_class = PackItemEmbellishmentServiceSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderProgramInquiryCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        program = get_object_or_404(OrderInquiryProgram, pk=kwargs['program_id'])
        program_confirmed = request.data.get('program_confirmed')
        orders = []
        if program_confirmed:
            for _ in range(program.number_of_orders):
                order = OrderInquiry.objects.create(customer=program.customer, brand=program.brand, season=program.season, year=program.year, order_program=program)
                serializer = OrderInquirySerializer(order)
                orders.append(serializer.data)
            return Response(orders, status=status.HTTP_200_OK)


class OrderProgramInquiryListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderInquiry.objects.all()
    serializer_class = OrderInquirySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(order_program_id=self.kwargs['program_id'])
        return qs


class OrderProgramListCreateView(generics.ListCreateAPIView):
    queryset = OrderInquiryProgram.objects.all().order_by('id')
    serializer_class = OrderInquiryProgramSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderVersionColorwayListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderVersionColorwayCountry.objects.all()
    serializer_class = OrderVersionColorwaySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(version_id=self.kwargs['version_id'])
        return qs


class OrderProgramRetriveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = OrderInquiryProgram.objects.all().order_by('id')
    serializer_class = OrderInquiryProgramSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderSupplierCompleteStatusUpdateView(generics.RetrieveUpdateAPIView):
    queryset = OrderCostingVersion.objects.all().order_by('id')
    serializer_class = OrderVersionSupplierInquiryCompleteStatusSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class OrderSizeGroupItemPackDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, order_id, version_id, country_id, colorway_id, size_group_id):
        response = {
            "packs": [],
            "order_items": {}
        }
        order = get_object_or_404(OrderInquiry, pk=order_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id, order=order)
        size_group = get_object_or_404(OrderSizeGroup, pk=size_group_id)

        response['packs'] = []

        for pack in size_group.get_version_packs(version).filter(country_id=country_id, colorway_id=colorway_id):
            item_ids = [pack_item.item.id for pack_item in pack.get_pack_items()]
            for item_id in item_ids:
                pack_item_ids = [pack_item.id for pack_item in pack.get_pack_items().filter(item_id=item_id)]
                if item_id not in response["order_items"]:
                    response["order_items"][item_id] = []
                response["order_items"][item_id].extend(pack_item_ids)
            response["packs"].append(pack.id)
        return Response(response)
    

class GroupPackItemPlacementDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, version_id, colorway_id, country_id, size_group_id, order_item_id, item_attribute_other_id):
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        item_attribute_other = get_object_or_404(OrderPlacement, pk=item_attribute_other_id)
        size_group = get_object_or_404(OrderSizeGroup, pk=size_group_id)
        order_packs = size_group.get_version_packs(version).filter(country_id=country_id, colorway_id=colorway_id)
        for order_pack in order_packs:
            pack_items = order_pack.get_pack_items().filter(item_id=order_item_id)
            for pack_item in pack_items:
                OrderPackItemPlacement.objects.filter(order_pack_item=pack_item, item_attribute_other=item_attribute_other).delete()
        return Response({'status_text': 'Deleted'}, status=status.HTTP_200_OK)


class GroupPackPlacementDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, version_id, colorway_id, country_id, size_group_id, item_attribute_other_id):
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        item_attribute_other = get_object_or_404(OrderPlacement, pk=item_attribute_other_id)
        size_group = get_object_or_404(OrderSizeGroup, pk=size_group_id)
        order_packs = size_group.get_version_packs(version).filter(country_id=country_id, colorway_id=colorway_id)
        for order_pack in order_packs:
            OrderPackPlacement.objects.filter(order_pack=order_pack, item_attribute_other=item_attribute_other).delete()
        return Response({'status_text': 'Deleted'}, status=status.HTTP_200_OK)


class OrderInquiryStyleNumberCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderInquiryStyleNumber.objects.all().order_by('-id')
    serializer_class = OrderInquiryStyleNumberSerializer

class OrderInquiryStyleNumberListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OrderInquiryStyleNumberSerializer

    def get_queryset(self):
        order_id = self.kwargs['order_id']
        style_numbers = OrderInquiryStyleNumber.objects.filter(order_inquiry_id=order_id)
        return style_numbers

class OrderInquiryStyleNumberRetriveUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderInquiryStyleNumber.objects.all().order_by('-id')
    serializer_class = OrderInquiryStyleNumberSerializer

class TechPackUploadView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        
        costing_version = get_object_or_404(OrderCostingVersion,pk=kwargs['version_id'])
        attachment_ids = request.data.get('attachment_ids',[])
        attachments = FileAttachment.objects.filter(id__in=attachment_ids)

        for attachment in attachments:
            costing_version.attachments.add(attachment)
        serializer = FileAttachmentSerializer(attachments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class TechPackDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        costing_version = get_object_or_404(OrderCostingVersion, pk=kwargs['version_id'])
        attachment_id = kwargs['file_id']

        if attachment_id:
            attachment = FileAttachment.objects.filter(pk=attachment_id).first()

            if attachment:
                attachment.delete()
                return Response({'message': "File delete successful"}, status=status.HTTP_200_OK)
            else:
                raise Http404("Attachment not found")

        else:
            return Response({'error': "Attachment ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        

class OrderPackOtherCostByGroupDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, country_id, colorway_id, size_group_id, other_cost_type_id):
        other_cost_type = get_object_or_404(OtherCostType, pk=other_cost_type_id)
        order_pack_other_costs = OrderPackOtherCost.objects.filter(other_cost_type_id=other_cost_type_id, pack__country_id=country_id, pack__colorway_id=colorway_id)
        response = {
            'other_cost_type_id': other_cost_type.id,
            'other_cost_type_name': other_cost_type.name,
            'pack_ids': []
        }
    
        for order_pack_other_cost in order_pack_other_costs:
            response['pack_ids'].append({
                'id': order_pack_other_cost.pack.id,
                'cost': order_pack_other_cost.cost
            })
        return Response(response, status=status.HTTP_200_OK)

class VersionCloneTriggerView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, source_version_id, clone_version_id):
        source_version = get_object_or_404(OrderCostingVersion, pk=source_version_id)
        clone_version = get_object_or_404(OrderCostingVersion, pk=clone_version_id)
        helper_instance = VersionCloneHelper(source_version, clone_version)
        helper_instance.clone_data() 
        return Response({'status': 'Data copied successfully.'}, status=status.HTTP_200_OK)
    

class PackagingMaterialList(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_packaging_property_string(self, attributes):
        length = None
        width = None
        height = None

        for key, value in attributes.items():
            if '_length' in key:
                length = value
            elif '_width' in key:
                width = value
            elif '_height' in key:
                height = value
        
        concat_string = ""
        if width is not None:
            concat_string += f"Width {width}"
        if length is not None:
            if concat_string:
                concat_string += " / "
            concat_string += f"Length {length}"
        if height is not None:
            if concat_string:
                concat_string += " / "
            concat_string += f"Height {height}"
        return concat_string


    def get(self, request, costing_version_id):
        data = []
        pakaging_ids = SupplierInquiryDetail.objects.filter(
            supplier_inquiry__version_id=costing_version_id,
            supplier_inquiry__customer_brand_material__material_detail__generic_material__user_material__category=PACKAGING_TYPES,
            completed=True
        ).values_list('supplier_inquiry__customer_brand_material', flat=True)
        packagings = CustomerBrandMaterial.objects.filter(id__in=pakaging_ids)
        for packaging in packagings:
            attribute = self.get_packaging_property_string(packaging.get_attributes())
            data.append(
                {
                    'id': packaging.id,
                    'name': '%s %s ' % (packaging.verbose_reference_code, attribute),
                    'a': packaging.get_attributes()
                }
            )
        return Response(data)
    

class PackagingInstructionDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_country_pack_instructions(self, country, packaging_version):
        instructions = PackInstruction.objects.none()
        if packaging_version:
            country_instructions = PackInstructionOrderPack.objects.filter(
                order_pack__country=country, 
                pack_instruction__pack_packaging=packaging_version
            ).values_list('pack_instruction_id', flat=True)
            instructions = PackInstruction.objects.filter(id__in=country_instructions)
        return instructions

    def get_country_meta_data(self, country, sizes, colorways, country_instruction_order_packs=None):
        data = []
        for size in sizes:
            size_data = {
                'size_id': size.id,
                'size': size.size.name,
                'country_id': country.id,
                'selected': False if not country_instruction_order_packs else country_instruction_order_packs.filter(order_pack__country=country, order_pack__size=size).exists(),
                'colorways': []
            }
            
            for colorway in colorways:
                if country_instruction_order_packs:
                    instruction_order_packs = country_instruction_order_packs.filter(order_pack__country=country, order_pack__size=size, order_pack__colorway=colorway)
                else:
                    instruction_order_packs = None
                colorway_data = {
                    'colorway_id': colorway.id,
                    'name': colorway.colorway,
                    'selected': False if not country_instruction_order_packs else country_instruction_order_packs.filter(order_pack__country=country, order_pack__size=size, order_pack__colorway=colorway).exists(),
                    'ratio_id': instruction_order_packs[0].id if instruction_order_packs else None,
                    'quantity': instruction_order_packs[0].quantity if instruction_order_packs else None,
                    'ratio': instruction_order_packs[0].ratio if instruction_order_packs else None,
                }
                size_data['colorways'].append(colorway_data)
            data.append(size_data)
    
        return data

    def post(self, request, costing_version_id):
        packaging_version_id = request.data.get('packaging_version_id', None)
        costing = get_object_or_404(OrderCostingVersion, pk=costing_version_id)
        countries = costing.order.get_order_countries()
        sizes = costing.order.get_order_sizes().order_by('size__sorting_order')
        colorways = costing.order.get_order_colorways()

        packaging_version = PackPackaging.objects.none()
        
        if packaging_version_id and packaging_version_id != 'null':
            packaging_version = PackPackaging.objects.get(pk=packaging_version_id)
        elif not PackPackaging.objects.filter(costing=costing).exists():
            packaging_version = PackPackaging.objects.create(costing=costing, current_version=True)

        response = {
            'packaging_version_id': packaging_version.id if packaging_version else None,
            'display_name': packaging_version.display_number if packaging_version else None,
            'current_version': packaging_version.current_version,
            'data': []
        }

        for country in countries:
            country_data = {
                'id': country.id,
                'name': country.country.name,
                'meta_data': self.get_country_meta_data(country, sizes, colorways),
                'instructions': []
            }
            if packaging_version:
                country_instructions = self.get_country_pack_instructions(country, packaging_version)
                for country_instruction in country_instructions:
                    instruction_packs = country_instruction.packinstructionorderpack_set.all()
                    instruction_metadata = self.get_country_meta_data(country, sizes, colorways, instruction_packs)
                    instruction_data = {
                        'id': country_instruction.id,
                        'material': CustomerBrandMaterialBasicSerializer(country_instruction.carton).data,
                        'instruction_meta_data': instruction_metadata,
                        'ratios': PackInstructionOrderPackSerializer(instruction_packs, many=True).data
                    }

                    country_data['instructions'].append(instruction_data)
            response['data'].append(country_data)
        
        return Response(response)


class PackagingInstructionCreateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

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

    def post(self, request, pack_packaging_id):
        pack_packaging = get_object_or_404(PackPackaging, pk=pack_packaging_id)
        data = request.data.get('data', [])
        self.validate_data(data)

        if not self.has_errors:
            for data_item in data:
                instructions = data_item.get('instructions', [])
                for instruction_row in instructions:
                    pack_instruction_id = instruction_row['id']
                    material_data = instruction_row.get('material')
                    instruction_meta_data = instruction_row.get('instruction_meta_data', [])
                    material_id =  material_data['id']

                    pack_instruction = PackInstruction.objects.none()
                    if pack_instruction_id:
                        pack_instruction = PackInstruction.objects.get(id=pack_instruction_id)
                        pack_instruction.carton_id = material_id
                        pack_instruction.save()
                    else:
                        if material_id:
                            pack_instruction = PackInstruction.objects.create(
                                pack_packaging=pack_packaging,
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
                                selected = colorway['selected']
                                order_pack = OrderPack.objects.get(size_id=size_id, country_id=country_id, colorway_id=colorway_id)

                                if pack_instruction_order_pack_id and selected:
                                    pack_instruction_order_pack = PackInstructionOrderPack.objects.get(id=pack_instruction_order_pack_id)
                                    pack_instruction_order_pack.quantity = quantity
                                    pack_instruction_order_pack.ratio = ratio
                                    pack_instruction_order_pack.save()
                                elif pack_instruction_order_pack_id and not selected:
                                        PackInstructionOrderPack.objects.get(id=pack_instruction_order_pack_id).delete()
                                else:
                                    if material_id and quantity and ratio:
                                        pack_instruction_order_pack_id = PackInstructionOrderPack.objects.create(
                                            order_pack=order_pack,
                                            pack_instruction=pack_instruction,
                                            quantity=quantity,
                                            ratio=ratio
                                        )

            response = PackPackagingSerializer(pack_packaging, many=False).data
            http_response = Response(response)
        else:
            http_response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class PackagingInstructionVersionListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = PackPackaging.objects.all().order_by('-id')
    serializer_class = PackPackagingSerializer

    def get_queryset(self):
        queryset = PackPackaging.objects.filter(costing_id=self.kwargs['costing_version_id'])
        return queryset


class PackagingInstructionVersionCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, costing_version_id):
        pack_packaging = PackPackaging.objects.create(
            costing_id=costing_version_id,
            current_version=False
        )
        response = PackPackagingSerializer(pack_packaging, many=False).data
        return Response(response)
    

class PackagingInstructionCurrentVersionUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    
    def post(self, request, pack_packaging_id):
        pack_packaging_version = get_object_or_404(PackPackaging, pk=pack_packaging_id)
        pack_packaging_version.current_version = True
        pack_packaging_version.save()
        other_pack_pakaging_versions = PackPackaging.objects.filter(costing=pack_packaging_version.costing).exclude(id=pack_packaging_version.id)

        for other_pack_pakaging_version in other_pack_pakaging_versions:
            other_pack_pakaging_version.current_version = False
            other_pack_pakaging_version.save()

        qs = PackPackaging.objects.filter(costing=pack_packaging_version.costing)
        response = PackPackagingSerializer(qs, many=True).data
        return Response(response)
    

class PackagingInstructionDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    
    def post(self, request, pack_packaging_instruction_id):
        pack_instruction = get_object_or_404(PackInstruction, pk=pack_packaging_instruction_id)
        pack_packaging = pack_instruction.pack_packaging
        pack_instruction.delete()
        response = PackPackagingSerializer(pack_packaging, many=False).data
        return Response(response)
    

class SizeGroupDetailListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        from supplier_po.models import GeneralPO
        data = {
            'quantities': [],
            'size_groups': []
        }
        costing = OrderCostingVersion.objects.get(pk=self.kwargs['costing_id'])
        order = costing.order
        countries = order.get_order_countries()
        colorways = order.get_order_colorways()
        for country in countries:
            country_data = {
                'id': country.id,
                'country_name': country.country.name,
                'colorways': []
            }
            for colorway in colorways:
                colorway_data = {
                    'id': colorway.id,
                    'colorway': colorway.colorway,
                    'size_groups': []
                }
                size_groups = order.get_order_size_groups()
                for group in size_groups:
                    sizes = group.sizes.all()
                    group_data = {
                        'id': group.id,
                        'sizes': [],
                        'total_quantity': 0
                    }
                
                    for size in sizes:
                        size_data = {
                            'id': size.id,
                            'name': size.size.name,
                            'quantity': 0
                        }
                        group_data['sizes'].append(size_data)
                    colorway_data['size_groups'].append(group_data)
                country_data['colorways'].append(colorway_data)
            data['quantities'].append(country_data)

        size_groups = order.get_order_size_groups()
        for group in size_groups:
            group_data = {
                'id': group.id,
                'sizes': []
            }
            sizes = group.sizes.all()
            for size in sizes:
                size_data = {
                    'id': size.id,
                    'name': size.size.name
                }
                group_data['sizes'].append(size_data)
            data ['size_groups'].append(group_data)

        return Response(data)
    

class GeneralPOSizeGroupListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_general_po_quantity(self, general_po, country, colorway, sizes):
        size_ids = sizes.filter().values_list('id', flat=True)
        quantity = 0
        total_ratio = OrderPack.objects.filter(country=country, colorway=colorway, size__in=size_ids, version=general_po.costing).aggregate(Sum('cad_quantity'))
        total_quantity = general_po.generalpoquantity_set.filter(
            pack__country=country,
            pack__colorway=colorway,
            pack__size__in=size_ids
        ).aggregate(Sum('quantity'))
        if total_quantity['quantity__sum']:
            quantity = total_quantity['quantity__sum'] 
        return quantity
    
    def get_quantity(self, general_po, country, colorway, size):
        from marketing.models import GeneralPOQuantity
        quantity = 0
        pack = OrderPack.objects.get(country=country, colorway=colorway, size=size, version=general_po.costing)
        general_po_quantity = get_object_or_none(GeneralPOQuantity, 
            {
                'general_po': general_po,
                'pack': pack
            }
        )
        if general_po_quantity:
            quantity = general_po_quantity.quantity
        return quantity


    def get(self, request, *args, **kwargs):
        from supplier_po.models import GeneralPO
        data = {
            'quantities': [],
            'size_groups': []
        }
        general_po = GeneralPO.objects.get(pk=self.kwargs['general_po_id'])
        order = general_po.costing.order
        countries = order.get_order_countries()
        colorways = order.get_order_colorways()
        for country in countries:
            country_data = {
                'id': country.id,
                'country_name': country.country.name,
                'colorways': []
            }
            for colorway in colorways:
                colorway_data = {
                    'id': colorway.id,
                    'colorway': colorway.colorway,
                    'size_groups': []
                }
                size_groups = order.get_order_size_groups()
                for group in size_groups:
                    sizes = group.sizes.all()
                    group_data = {
                        'id': group.id,
                        'sizes': [],
                        'total_quantity': self.get_general_po_quantity(general_po, country, colorway, sizes)
                    }
                
                    for size in sizes:
                        size_data = {
                            'id': size.id,
                            'name': size.size.name,
                            'quantity': self.get_quantity(general_po, country, colorway, size)
                        }
                        group_data['sizes'].append(size_data)
                    colorway_data['size_groups'].append(group_data)
                country_data['colorways'].append(colorway_data)
            data['quantities'].append(country_data)

        size_groups = order.get_order_size_groups()
        for group in size_groups:
            group_data = {
                'id': group.id,
                'sizes': []
            }
            sizes = group.sizes.all()
            for size in sizes:
                size_data = {
                    'id': size.id,
                    'name': size.size.name
                }
                group_data['sizes'].append(size_data)
            data ['size_groups'].append(group_data)

        return Response(data)
    

class SizeGroupQuantityListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_quantities(self, costing, country, colorway, size_group_id, total_quantity):
        quantity = 0
        size_group = OrderSizeGroup.objects.get(pk=size_group_id)
        size_group_data = {
            'id': size_group.id,
            'sizes': []
        }
        sizes = size_group.get_sizes()
        total_size_group_ratio = OrderPack.objects.filter(size__in=sizes, colorway=colorway, country=country).aggregate(Sum('cad_quantity'))
        for size in sizes:
            order_pack = OrderPack.objects.get(size=size, colorway=colorway, country=country)
            quantity = round((total_quantity / total_size_group_ratio['cad_quantity__sum']) * order_pack.cad_quantity)
            data = {
                'id': size.id,
                'quantity': quantity
             }
            size_group_data['sizes'].append(data)
            
        return size_group_data

    def post(self, request, *args, **kwargs):
        costing = OrderCostingVersion.objects.get(pk=self.kwargs['pk'])

        country_id = request.data.get('country_id')
        colorway_id = request.data.get('colorway_id')
        size_group_id = request.data.get('size_group_id')
        total_quantity = request.data.get('quantity')

        data = {
            'country_id': country_id,
            'colorway_id': colorway_id,
            'size_groups': self.get_quantities(costing, country_id, colorway_id, size_group_id, total_quantity)
        }

        return Response(data)
    

class CostingActivityDetailView(APIView):
    permission_classes = (HasPermission, )

    def get(self, request, costing_id):
        from marketing.helpers.costing_timeline_hepler import CostingTimelineHelper
        data = {}
        order_costing_version = get_object_or_404(OrderCostingVersion, pk=costing_id)
        activities = CostingTimelineHelper(
            request,
            order_costing_version
        ).get_combined_data()
        
        data = {
            'id': order_costing_version.id,
            'display_number': order_costing_version.display_number,
            'created_date': CostingTimelineHelper.get_date_display(order_costing_version.created),
            'approved_date': CostingTimelineHelper.get_date_display(order_costing_version.approved_date),
            'activities': activities,
        }
        return Response(data)


class CostingCloneView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, source_costing_id, source_costing_version_id):
        from marketing.helpers.order_inquiry_clone_helper import OrderInquiryCloneHelper
        data = {}
        source_costing = get_object_or_404(OrderInquiry, pk=source_costing_id)
        source_costing_version = get_object_or_404(OrderCostingVersion, pk=source_costing_version_id)
        costing_type = request.query_params.get('costing_type', None)
        data_rows = request.data.get('data', None)

        if costing_type == OrderInquiryCloneHelper.NEW_PRE_COSTING or costing_type == OrderInquiryCloneHelper.NEW_MARKETING_COSTING:
            helper = OrderInquiryCloneHelper(source_costing_version.order, source_costing_version, None, None, costing_type, data_rows)
        elif costing_type == OrderInquiryCloneHelper.VERIFY_BASIC_PRE_COSTING:
            helper = OrderInquiryCloneHelper(source_costing_version.marketing_costing.order, source_costing_version.marketing_costing, source_costing_version.order, source_costing_version, costing_type, data_rows)
        costing, version = helper.clone_data()

        data = {
            'costing_id': costing.id,
            'costing_version_id': version.id,
        }
        return Response(data)


class OrderInquiryPreCostingCreateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def create_pre_costing_colorways_country_sizes(self, data, pre_costing_order, source_costing_version, pre_costing_version):
        for row in data:
            colorways = row['colorways']
            order_country = get_object_or_none(OrderCountry, {'pk': row['country_id']})
            if order_country:
                pre_costing_order_country, created = OrderCountry.objects.get_or_create(
                    order=pre_costing_order,
                    country=order_country.country,
                    copied_from=order_country
                )
            for colorway in colorways:
                total_colorway_country_quantity = 0
                order_colorway = get_object_or_none(OrderColorway, {'pk': colorway['marketing_costing_colorway_id']})
                is_new = colorway.get('is_new', False)
                pre_costing_colorway_id = colorway.get('id', None)
                if isinstance(pre_costing_colorway_id, int):
                    pre_costing_order_colorway = get_object_or_none(OrderColorway, {'pk': pre_costing_colorway_id})
                    pre_costing_order_colorway.colorway = colorway['name']
                    pre_costing_order_colorway.copied_from = order_colorway
                    pre_costing_order_colorway.save()

                else:
                    pre_costing_order_colorway, created = OrderColorway.objects.get_or_create(
                        order=pre_costing_order,
                        colorway=colorway['name'],
                        copied_from=order_colorway
                    )
                source_order_version_colorway_country = get_object_or_none(OrderVersionColorwayCountry,{
                    'version': source_costing_version,
                    'colorway': order_colorway,
                    'country': order_country
                })
                pre_costing_order_version_colorway_country, created = OrderVersionColorwayCountry.objects.get_or_create(
                    version=pre_costing_version,
                    colorway=pre_costing_order_colorway,
                    country=pre_costing_order_country,
                    copied_from=source_order_version_colorway_country
                )
                
                for size in colorway['sizes']:
                    order_size = get_object_or_none(OrderSize, {'pk': size['id']})
                    pre_costing_order_size, created = OrderSize.objects.get_or_create(
                        order=pre_costing_order,
                        size=order_size.size,
                        copied_from=order_size
                    )
                    order_pack = get_object_or_none(OrderPack, {
                        'country': order_country,
                        'colorway': order_colorway,
                        'size': order_size,
                        'version': source_costing_version
                    })
                    pre_costing_order_pack, created = OrderPack.objects.get_or_create(
                        country=pre_costing_order_country,
                        colorway=pre_costing_order_colorway,
                        size=pre_costing_order_size,
                        version=pre_costing_version,
                        # copied_from=order_pack
                    )
                    pre_costing_order_pack.copied_from = order_pack
                    pre_costing_order_pack.save()
                    pre_costing_order_pack.cad_quantity = size['quantity']
                    pre_costing_order_pack.save()
                    total_colorway_country_quantity += size['quantity']
                pre_costing_order_version_colorway_country.estimated_quantity = total_colorway_country_quantity
                pre_costing_order_version_colorway_country.save()

    def create_pre_costing_size_groups(self, source_order_inquiry, pre_costing_order):
        for source_size_group in source_order_inquiry.get_order_size_groups():
            pre_costing_size_group, created = OrderSizeGroup.objects.get_or_create(
                order=pre_costing_order,
                copied_from=source_size_group
            )
            source_sizes = source_size_group.get_sizes()
            for source_size in source_sizes:
                pre_costing_sizes = pre_costing_order.get_order_sizes().filter(copied_from=source_size)
                for pre_costing_size in pre_costing_sizes:
                    pre_costing_size_group.sizes.add(pre_costing_size)
    
    def create_pre_costing_items(self, source_order_inquiry, pre_costing_order):
        source_order_items = source_order_inquiry.get_order_items()

        for source_order_item in source_order_items:
            pre_costing_item, created = OrderItem.objects.get_or_create(
                order=pre_costing_order,
                item=source_order_item.item,
                copied_from=source_order_item,
                item_identifier=source_order_item.item_identifier
            )
    
    # def create_pre_costing_order_pack_items(self, pre_costing_order, pre_costing_version):
    #     pre_costing_order_packs = pre_costing_version.get_order_version_packs()
    #     pre_costing_order_items = pre_costing_order.get_order_items()
    #     for pre_costing_order_item in pre_costing_order_items:
    #         copied_order_item = pre_costing_order_item.copied_from
    #         for pre_costing_order_pack in pre_costing_order_packs:
    #             copied_order_pack = pre_costing_order_pack.copied_from
    #             source_order_pack_item = get_object_or_none(OrderPackItem, {
    #                 'pack': copied_order_pack,
    #                 'item': copied_order_item
    #             })
    #             pre_costing_order_pack_item, created = OrderPackItem.objects.get_or_create(
    #                 pack=pre_costing_order_pack,
    #                 item=pre_costing_order_item
    #             )
    #             pre_costing_order_pack_item.copied_from = source_order_pack_item
    #             pre_costing_order_pack_item.save()
    
    def create_pre_costing_colorway_item_types(self, source_order_inquiry, pre_costing_order):
        source_colorway_item_types = ColorwayItemType.objects.filter(
                colorway__order=source_order_inquiry,
                item__order=source_order_inquiry
            )
        pre_costing_order_items = pre_costing_order.get_order_items()
        pre_costing_order_colorways = pre_costing_order.get_order_colorways()

        for pre_costing_order_item in pre_costing_order_items:
            for pre_costing_order_colorway in pre_costing_order_colorways:
                if pre_costing_order_item.item_identifier:
                    source_colorway_item_type = source_colorway_item_types.filter(
                        item__item=pre_costing_order_item.item,
                        colorway__colorway=pre_costing_order_colorway.copied_from.colorway,
                        item__item_identifier=pre_costing_order_item.item_identifier
                    )
                    if source_colorway_item_type.exists():
                        source_colorway_item_type = source_colorway_item_type[0]
                        pre_costing_colorway_item_type, created = ColorwayItemType.objects.get_or_create(
                            item=pre_costing_order_item,
                            colorway=pre_costing_order_colorway,
                            colorway_category=source_colorway_item_type.colorway_category
                        )
                        pre_costing_colorway_item_type.copied_from = source_colorway_item_type
                        pre_costing_colorway_item_type.save()
    
    def set_pre_costing_version_basic_data(self, source_costing_version, pre_costing_version):
        attributes = ['fabric_finance_cost_percentage', 'trim_finance_cost_percentage', 'earnings_per_minute', 'buyer_commission_percentage']
        
        for attribute in attributes:
            pre_costing_version.__setattr__(attribute, source_costing_version.__getattribute__(attribute))
        pre_costing_version.costing_type = OrderCostingVersion.PRE_COSTING
        pre_costing_version.marketing_costing = source_costing_version
        pre_costing_version.save()

    def post(self, request, *args, **kwargs):
        from marketing.helpers.order_inquiry_clone_helper import OrderInquiryCloneHelper
        errors = {
            'colorways': [],
            'data': []
        }
        has_errors = False
        data = {}
        return_status = status.HTTP_200_OK
        data = {}
        source_order_inquiry_id = kwargs.get('source_order_inquiry_id', None)
        source_costing_version_id = kwargs.get('source_costing_version_id', None)
        source_order_inquiry = get_object_or_404(OrderInquiry, pk=source_order_inquiry_id)
        source_costing_version = get_object_or_404(OrderCostingVersion, pk=source_costing_version_id)
        data_rows = request.data.get('data', None)
        pre_costing_colorways = request.data.get('colorways', {})

        with transaction.atomic():
            clon_helper = OrderInquiryCloneHelper(source_order_inquiry=source_order_inquiry, source_version=source_costing_version, costing_type=OrderInquiryCloneHelper.NEW_PRE_COSTING)
            pre_costing_order = clon_helper.create_clone_order_inquiry()
            pre_costing_order.state = OrderInquiry.OPEN_PRE_COSTING_STATE
            pre_costing_order.copied_from = source_order_inquiry
            pre_costing_order.save()
            pre_costing_version = pre_costing_order.create_version(copied_from=source_costing_version)
            self.set_pre_costing_version_basic_data(source_costing_version, pre_costing_version)
            data = {
                'costing_id': pre_costing_order.id,
                'costing_version_id': pre_costing_version.id
            }
            
            self.create_pre_costing_colorways_country_sizes(data_rows, pre_costing_order, source_costing_version, pre_costing_version)
            self.create_pre_costing_size_groups(source_order_inquiry, pre_costing_order)
            self.create_pre_costing_items(source_order_inquiry, pre_costing_order)
            # self.create_pre_costing_order_pack_items(pre_costing_order, pre_costing_version)
            self.create_pre_costing_colorway_item_types(source_order_inquiry, pre_costing_order)


                    
            if has_errors:
                data = errors
                return_status = status.HTTP_400_BAD_REQUEST
                transaction.set_rollback(True)
        return Response(data, return_status)


class OrderInquiryPreCostingEditView(OrderInquiryPreCostingCreateView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def handle_deleted_colorways(self, deleted_colorway_ids):
        OrderColorway.objects.filter(pk__in=deleted_colorway_ids).delete()
    
    def handle_deleted_countries(self, pre_costing_order_inquiry, data_rows):
        pre_costing_order_countries = pre_costing_order_inquiry.get_order_countries()
        country_ids = [data['country_id'] for data in data_rows]
        deleted_pre_costing_order_countries = pre_costing_order_countries.exclude(copied_from__id__in=country_ids)
        deleted_pre_costing_order_countries.delete()
    

    def put(self, request, *args, **kwargs):
        data = {}
        errors = {}
        has_error = False
        return_status = status.HTTP_200_OK
        pre_costing_order_inquiry_id = kwargs.get('pre_costing_order_inquiry_id', None)
        pre_costing_version_id = kwargs.get('pre_costing_version_id', None)
        pre_costing_order_inquiry = get_object_or_404(OrderInquiry, pk=pre_costing_order_inquiry_id)
        pre_costing_version = get_object_or_404(OrderCostingVersion, pk=pre_costing_version_id)
        source_order_inquiry = pre_costing_order_inquiry.copied_from
        source_costing_version = pre_costing_version.copied_from

        data = {
            'costing_id': pre_costing_order_inquiry_id,
            'costing_version_id': pre_costing_version_id
        }
        data_rows = request.data.get('data', None)
        deleted_colorway_ids = request.data.get('deleted_colorways', [])
        self.handle_deleted_colorways(deleted_colorway_ids)
        self.handle_deleted_countries(pre_costing_order_inquiry, data_rows)

        self.create_pre_costing_colorways_country_sizes(data_rows, pre_costing_order_inquiry, source_costing_version, pre_costing_version)
        self.create_pre_costing_size_groups(source_order_inquiry, pre_costing_order_inquiry)
        self.create_pre_costing_colorway_item_types(source_order_inquiry, pre_costing_order_inquiry)

        return Response(data, return_status)



class OrderCostingBasicListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderCostingVersion.objects.all().order_by('-id')
    serializer_class = OrderVersionBasicSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(version_state=OrderCostingVersion.COMPLETED_VERSION_STATE)
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs


class CostingVersionSearchPlacementView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get_packs(self, order_colorways, order_sizes, order_countries):
        packs = OrderPack.objects.filter(colorway__in=order_colorways)

        if order_sizes.exists():
            packs = packs.filter(size__in=order_sizes)

        if order_countries.exists():
            packs = packs.filter(country__in=order_countries)
        return packs

    def flatten_data(self, data):
        new_data = []
        for item_attribute_other_id, placement_data in data.items():
            placement_materials = placement_data.pop("materials")
            placement_data["materials"] = []
            for material_id, material_placements in placement_materials.items():
                placement_data['materials'].append(material_placements)
            new_data.append(placement_data)
        return new_data

    def get_placement_data(self, placements, placement_type):
        # pack_placements = OrderPackPlacement.objects.filter(order_pack__in=packs).order_by('item_attribute_other')
        # placement_type is pack or pack_item
        pack_key = placement_type + 's'
        placement_key = placement_type + '_placement_id'
        data = {}
        for pack_placement in placements:
            if placement_type == 'order_item':
                pack_placement_material = pack_placement.get_placement_material_object()
                pack_placement_material_consumption = pack_placement.get_material_consumption_object()
            else:
                pack_placement_material = pack_placement.get_placement_material_object()
                pack_placement_material_consumption = pack_placement.get_placement_material_consumption()

            if not data.get(pack_placement.item_attribute_other_id, None):
                metadata, display_name = get_pack_item_placement_material_metadata(pack_placement.placement_material_type)
                data[pack_placement.item_attribute_other_id] = {
                    "placement_name": pack_placement.item_attribute_other.name,
                    "item_attribute_id": pack_placement.item_attribute_other_id,
                    placement_type + '_placement_id': pack_placement.id,
                    "material_type_display_name": display_name,
                    "material_type_name": pack_placement.placement_material_type,
                    "headers": metadata,
                    "materials": {}
                }

            if not data[pack_placement.item_attribute_other_id]["materials"].get(pack_placement_material.material_id, None):
                data[pack_placement.item_attribute_other_id]["materials"][pack_placement_material.material_id] ={
                    pack_key: [],
                    "material": pack_placement_material.material.get_attributes(),
                }
            data[pack_placement.item_attribute_other_id]["materials"][pack_placement_material.material_id][pack_key].append(
                {
                    "pack_display": pack_placement.order_pack.get_pack_display() if placement_type == 'pack' else pack_placement.order_pack_item.pack.get_pack_display(),
                    "pack_id": pack_placement.order_pack.id if placement_type == 'pack' else pack_placement.order_pack_item.pack.id,
                    placement_key: pack_placement.pk,
                    "consumption_ratio": pack_placement_material_consumption.costing_consumption_ratio if pack_placement_material_consumption else None,
                    "wastage": pack_placement_material_consumption.wastage if pack_placement_material_consumption else None,
                },
            )
        return self.flatten_data(data)

    def post(self, request, *args, **kwargs):
        item_id = self.request.data.get('order_item_id')
        colorway_ids = self.request.data.get('order_colorway_id', [])
        size_ids = self.request.data.get('order_size_id', [])
        country_ids = self.request.data.get('order_country_id', [])

        order_items = OrderItem.objects.filter(pk=item_id)
        colorways = OrderColorway.objects.filter(pk__in=colorway_ids)
        sizes = OrderSize.objects.filter(pk__in=size_ids)
        countries = OrderCountry.objects.filter(pk__in=country_ids)

        packs = self.get_packs(colorways, sizes, countries)
        pack_items = OrderPackItem.objects.filter(pack__in=packs, item__in=order_items)

        pack_placements = OrderPackPlacement.objects.filter(order_pack__in=packs).order_by('item_attribute_other').prefetch_related('orderpackplacementmaterial', 'orderpackplacementmaterial__orderpackplacementmaterialconsumption')

        pack_item_fabric_placements = OrderPackItemPlacement.objects.filter(
            order_pack_item__in=pack_items,
            item_attribute_other__material__category=Material.FABRIC_MATERIAL
        ).order_by('item_attribute_other').prefetch_related('orderpackitemplacementmaterial', 'orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption')

        pack_item_sewing_trim_placements = OrderPackItemPlacement.objects.filter(
            order_pack_item__in=pack_items
        ).exclude(item_attribute_other__material__category=Material.FABRIC_MATERIAL).order_by('item_attribute_other').prefetch_related('orderpackitemplacementmaterial', 'orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption')

        data = {
            "fabrics": self.get_placement_data(pack_item_fabric_placements, "order_item"),
            "sewing_trims": self.get_placement_data(pack_item_sewing_trim_placements, "order_item"),
            "packaging": self.get_placement_data(pack_placements, "pack"),
        }

        return Response(data)


class OrderCostingPackPlacementDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        fabrics = self.request.data.get('fabrics', [])
        sewing_trims = self.request.data.get('sewing_trims', [])
        packaging = self.request.data.get('packaging', [])

        OrderPackItemPlacement.objects.filter(id__in=fabrics).delete()
        OrderPackItemPlacement.objects.filter(id__in=sewing_trims).delete()
        OrderPackPlacement.objects.filter(id__in=packaging).delete()
        return Response({'success': True})


class PreCostingColorwayMappingDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, costing_id, version_id):
        costing = get_object_or_404(OrderInquiry, pk=costing_id)
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        marketing_order_inquiry = get_object_or_404(OrderInquiry, pk=costing.copied_from.id)

        colorways = costing.get_order_colorways()
        countries = costing.get_order_countries()
        sizes = costing.get_order_sizes()

        data = {
            "data": [],
            "no_of_colorways": colorways.count(),
            "colorway_mapping": [],
            "countries": [],
            "colorways": [],
            "sizes": []
        }

        source_colorways = OrderColorway.objects.filter(order=marketing_order_inquiry)
        source_countries = OrderCountry.objects.filter(order=marketing_order_inquiry)
        source_sizes = OrderSize.objects.filter(order=marketing_order_inquiry)

        for source_colorway in source_colorways:
            data['colorways'].append(
                {
                    'id': source_colorway.id,
                    'colorway': source_colorway.colorway
                }
            )

        for source_country in source_countries:
            data['countries'].append(
                {
                    'country_id': source_country.id,
                    'country_name': source_country.country.name
                }
            )

        for source_size in source_sizes:
            data['sizes'].append(
                {
                    'id': source_size.id,
                    'size_name': source_size.size.name
                }
            )

        for colorway in colorways:
            colorway_mapping_data = {
                'marketing_costing_colorway': colorway.copied_from.colorway,
                'marketing_costing_colorway_id': colorway.copied_from.id,
                'pre_costing_colorway': colorway.colorway,
                'pre_costing_colorway_id': colorway.id
            }
            data['colorway_mapping'].append(colorway_mapping_data)

        for country in countries:
            country_data = {
                'country_id': country.copied_from.id,
                'country_name': country.copied_from.country.name,
                'order_country_id': country.id,
                'colorways': [],
            }
            for colorway in colorways:
                colorway_data = {
                    'id': colorway.id,
                    'name': colorway.colorway,
                    'sizes':[],
                    'marketing_costing_colorway_id': colorway.copied_from.id
                }
                for size in sizes:
                    order_pack = OrderPack.objects.get(country=country, colorway=colorway, size=size)
                    size_data = {
                        'id': size.copied_from.id,
                        'name': size.copied_from.size.name,
                        'order_size_id': size.id,
                        'quantity': order_pack.cad_quantity
                    }
                    colorway_data['sizes'].append(size_data)
                country_data['colorways'].append(colorway_data)
            data['data'].append(country_data)

        return Response(data)


class CostingMaterialListAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        material_qs = costing.get_costing_version_materials()

        data = segregate_material_into_types(material_qs)
        return Response(data)


class MaterialColorwaySupplierDataAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        customer_brand_material_id = kwargs.get('customer_brand_material_id')
        material = get_object_or_none(CustomerBrandMaterial, {'pk': customer_brand_material_id})

        inquiries = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
            order_costing_version=costing,
            customer_brand_material=material
        )
        data = OrderCostingColorwayMaterialSupplierInquirySerializer(inquiries, many=True).data

        inquiries = SupplierInquiryDetail.objects.filter(
            supplier_inquiry__version=costing,
            supplier_inquiry__customer_brand_material=material,
            completed=True
        )
        inquiry_data = SupplierInquiryMaterialDetailSerializer(inquiries, many=True).data
        response = {
            'colorway_supplier_inquiries': data,
            'all_inquiries': inquiry_data
        }
        return Response(response)


class MaterialCostingSaveConsumptionRatio(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_pack_item_placement(self, row, costing):
        placement_material_consumption = None
        placement = get_object_or_none(
            OrderPackItemPlacement,
            {
                "pk": row['order_item_placement_id'],
                "order_pack_item__pack__version": costing
            }
        )
        if placement:
            placement_material = OrderPackItemPlacementMaterial.objects.get_or_create(placement=placement)[0]
            placement_material_consumption = OrderPackItemPlacementMaterialConsumption.objects.get_or_create(
                pack_item_placement_material=placement_material)[0]
        return placement_material_consumption

    def get_pack_placement(self, row, costing):
        placement_material_consumption = None
        placement = get_object_or_none(
            OrderPackPlacement,
            {
                "pk": row['pack_placement_id'],
                "order_pack__version": costing
            }
        )
        if placement:
            placement_material = OrderPackPlacementMaterial.objects.get_or_create(placement=placement)[0]
            placement_material_consumption = OrderPackPlacementMaterialConsumption.objects.get_or_create(pack_placement_material=placement_material)[0]
        return placement_material_consumption

    def save_consumption_data(self, data, costing, get_object_func):
        errors = []
        for row in data:
            placement_object = get_object_func(row, costing)
            wastage = convert_to_float_or_none(row.get('wastage', "N/A"))
            costing_consumption_ratio = convert_to_float_or_none(row.get('consumption_ratio', "N/A"))
            if wastage is not None and costing_consumption_ratio is not None:
                placement_object.wastage = wastage
                placement_object.costing_consumption_ratio = costing_consumption_ratio
                placement_object.save()
            else:
                row['errors'] = ["Please make sure wastage and consumption ratio are numbers"]
                errors.append(row)
        return errors

    def post(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        data = request.data.get('pack_item_placement_data')
        errors1 = self.save_consumption_data(data, costing, self.get_pack_item_placement)
        data = request.data.get('pack_placement_data')
        errors2 = self.save_consumption_data(data, costing, self.get_pack_placement)
        errors = [*errors1, *errors2]

        response = Response({"success": True})

        if errors:
            response = Response({"success": False, "errors": errors}, status=status.HTTP_400_BAD_REQUEST)
        return response


class SaveColorwaySupplierInquiryDetail(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)

        supplier_inquiry_detail_id = request.data.get('supplier_inquiry_detail_id')
        supplier_inquiry_detail = get_object_or_none(SupplierInquiryDetail, {"pk": supplier_inquiry_detail_id,
                                                                             'supplier_inquiry__version': costing})
        colorway_ids = list(set(request.data.get('colorway_ids')))
        order_colorways = OrderColorway.objects.filter(pk__in=colorway_ids, order=costing.version)
        if order_colorways.count() != len(colorway_ids):
            return Response({"error": "Invalid colorway found. Please make sure that all colorways are valid"})

        for order_colorway in order_colorways:
            cw_supplier = OrderCostingColorwayMaterialSupplierInquiry.objects.get_or_create(
                order_costing_version=costing,
                customer_brand_material=supplier_inquiry_detail.supplier_inquiry.customer_brand_material,
                colorway=order_colorway
            )
            cw_supplier.supplier_inquiry_detail = supplier_inquiry_detail
            cw_supplier.save()
        return Response({"success": True, })


class POClubCostingCloneView(POClubPermissionMixin, APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [ActualPOClub.OPEN_STATE, ]
    
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

    def post(self, request, *args, **kwargs):
        from marketing.helpers.po_club_pre_costing_clone_helper import POClubCloneHelper

        data = {}
        po_club = self.get_po_club()

        source_costing_version = po_club.get_marketing_costing()
        costing_type = request.query_params.get('costing_type', None)
        purchase_orders = po_club.get_purchase_orders()

        helper = POClubCloneHelper(po_club, costing_type)
        helper.clone_data()

        for purchase_order in purchase_orders:
            purchase_order.costing_version = helper.get_created_costing_version()
            purchase_order.marketing_costing = source_costing_version
            purchase_order.state = PurchaseOrder.PENDING_PRECOSTING_COMPLETION
            purchase_order.save()

        po_club.pre_costing = helper.get_created_costing_version()
        po_club.marketing_costing = po_club.pre_costing.marketing_costing
        po_club.state = ActualPOClub.PENDING_PRECOSTING_COMPLETION
        po_club.save()

        self.verify_quantities(po_club, helper.get_created_costing_version())

        return Response({'success': True})


class OrderInquiryProcessWidgetView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderInquiry.objects.filter().order_by('-id')
    serializer_class = OrderInquiryWidgetSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def filter_by_costing_vrsion(self, qs, version_id):
        order_inquiry_ids = OrderCostingVersion.objects.filter(id=version_id).values_list('order', flat=True)
        qs = qs.filter(id__in=order_inquiry_ids)
        return qs
    
    def filter_by_purchase_order(self, qs, purchase_order_id):
        order_inquiry_ids = PurchaseOrder.objects.filter(id=purchase_order_id).values_list('marketing_costing__order', flat=True)
        qs = qs.filter(id__in=order_inquiry_ids)
        return qs
    
    def filter_by_po_club(self, qs, po_club_id):
        order_inquiry_ids = ActualPOClub.objects.filter(id=po_club_id).values_list('marketing_costing__order', flat=True)
        qs = qs.filter(id__in=order_inquiry_ids)
        return qs

    def get_queryset(self):
        qs = super().get_queryset()
        qs = [data for data in qs if data.costing_type == OrderCostingVersion.MARKETING_COSTING]
        costing_version_id = self.request.query_params.get('costing_version_id', None)
        purchase_order_id = self.request.query_params.get('purchase_order_id', None)
        po_club_id = self.request.query_params.get('po_club_id', None)
        if costing_version_id:
            qs = self.filter_by_costing_vrsion(qs, costing_version_id)
        if purchase_order_id:
            qs = self.filter_by_purchase_order(qs, purchase_order_id)
        if po_club_id:
            qs = self.filter_by_po_club(qs, po_club_id)
        return qs


class OrderInquiryProcessPOClubWidgetView(generics.RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    queryset = ActualPOClub.objects.filter().order_by('-id')
    serializer_class = POClubWidgetSerializer
    pagination_class = GeneralLargeResultsSetPagination


class OrderPackCostSummary(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_normalize_mesuring_unit(self, instance):
        if isinstance(instance, OrderPackPlacementMaterialConsumption):
            return instance.pack_placement_material.material.material_detail.generic_material.user_material.get_consumption_measuring_unit_display()
        elif isinstance(instance, OrderPackItemPlacementMaterialConsumption):
            return instance.pack_item_placement_material.material.material_detail.generic_material.user_material.get_consumption_measuring_unit_display()
        elif isinstance(instance, ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio):
            return instance.customer_brand_fabric.material_detail.generic_material.user_material.get_consumption_measuring_unit_display()
        return None

    def get_total_cost_of_placement_material_consumption(self, placement_material_consumption, supplier_inquiry_detail, placement_material):
        total_cost = 0.00
        if placement_material_consumption and supplier_inquiry_detail:
            data = self.get_supplier_inquiry_detail_data(supplier_inquiry_detail)
            cost_per_unit = data['cost_per_unit']['cost']
            normalized_cost_per_unit = convert_per_unit_cost(placement_material.material_normalized_measuring_unit, cost_per_unit, data['cost_per_unit']['costing_unit'])['cost']

            total_consumption = placement_material_consumption.costing_consumption_ratio + (placement_material_consumption.costing_consumption_ratio * placement_material_consumption.wastage / 100)
            total_cost = normalized_cost_per_unit * float(total_consumption)
            total_cost = round(total_cost, 5)

        return total_cost

    def get_supplier_inquiry_detail_data(self, supplier_inquiry_detail):
        data = {}
        if supplier_inquiry_detail:
            data['id'] = supplier_inquiry_detail.pk
            data['supplier_inquiry_detail_id'] = supplier_inquiry_detail.supplier_inquiry_detail_id
            data['supplier'] = supplier_inquiry_detail.supplier_inquiry_detail.supplier_inquiry.supplier.name
            data['supplier'] = supplier_inquiry_detail.supplier_inquiry_detail.supplier_inquiry.supplier.name
            data['cost_per_unit'] = {
                'cost': supplier_inquiry_detail.supplier_inquiry_detail.cost_per_unit,
                'costing_unit': supplier_inquiry_detail.supplier_inquiry_detail.costing_unit,
                'costing_unit_display': supplier_inquiry_detail.supplier_inquiry_detail.get_costing_unit_display(),
                # get_display_value_for_unit(supplier_inquiry_detail.cost_per_unit),
            }
            data['ship_mode'] = supplier_inquiry_detail.supplier_inquiry_detail.get_ship_mode_display()
            data['cost_per_unit_type'] = supplier_inquiry_detail.supplier_inquiry_detail.get_cost_per_unit_type_display()
        return data

    def get_material_data_summary(self, pack, placement, placement_material):
        supplier_inquiry_detail = pack.get_selected_supplier_inquiry_for_material(placement_material.material)
        placement_material_consumption = placement.get_placement_material_consumption(supplier_inquiry_detail.supplier_inquiry_detail)
        data = {
            'order_pack_item_placement_id': placement.pk,
            'placement_name': placement.item_attribute_other.name,
            'material': {},
            'placement_material_consumption': {},
            'supplier_inquiry_detail': {}
        }
        if placement_material:
            data['material'] = placement_material.material.get_attributes()

        if placement_material_consumption:
            data['placement_material_consumption']['consumption_ratio'] = placement_material_consumption.costing_consumption_ratio
            data['placement_material_consumption']['consumption_ratio_units'] = self.get_normalize_mesuring_unit(placement_material_consumption)
            data['placement_material_consumption']['wastage'] = placement_material_consumption.wastage
            data['placement_material_consumption']['total_cost'] = self.get_total_cost_of_placement_material_consumption(placement_material_consumption, supplier_inquiry_detail, placement_material.material)

        if supplier_inquiry_detail:
            data['supplier_inquiry_detail_data'] = self.get_supplier_inquiry_detail_data(supplier_inquiry_detail)
        return data

    def get_material_placement_data(self, placements):
        data = []

        for placement in placements:
            placement_material = placement.get_placement_material_object()
            if getattr(placement, 'order_pack_item', None):
                placement_data = self.get_material_data_summary(placement.order_pack_item.pack, placement, placement_material)
            else:
                placement_data = self.get_material_data_summary(placement.order_pack, placement, placement_material)
            data.append(placement_data)
        return data

    def get_fabric_data(self, fabric_placements):
        fabric_data = {}
        for fabric_placement in fabric_placements:
            placement_material = fabric_placement.get_placement_material_object()
            print(placement_material, fabric_placement)

            if not fabric_data.get(placement_material.material_id, None):
                placement_data = self.get_material_data_summary(fabric_placement.order_pack_item.pack, fabric_placement, placement_material)
                fabric_data[placement_material.material_id] = placement_data
            else:
                fabric_data[placement_material.material_id]['placement_name'] += f', {fabric_placement.item_attribute_other.name}'
        return fabric_data.values()

    def get_service_data(self, services):
        service_data_list = []

        for service in services:
            service_data = service.get_attributes()
            supplier_inquiry_detail = service.get_pack_item_service_selected_supplier_inquiry_detail()
            supplier_inquiry_data = None
            if supplier_inquiry_detail:
                selected_supplier_inquiry = service.get_pack_item_service_selected_supplier_inquiry_detail()
                supplier_inquiry_data = self.get_supplier_inquiry_detail_data(selected_supplier_inquiry)
            service_data['supplier_inquiry_detail_data'] = supplier_inquiry_data
            service_data_list.append(service_data)
        return service_data_list

    def get_ie_operations_data(self, ie_operations, pack_item):
        ie_data = []
        for ie_operation in ie_operations:
            operation_cost = None
            epm = pack_item.pack.version.get_version_earnings_per_minute(pack_item)
            if ie_operation.costing_smv and epm:
                operation_cost = float(ie_operation.costing_smv) * float(epm)

            data = {
               'operation_name': ie_operation.operation_name, # if ie_operation.item_variation_operation else ie_operation.operation_name,
               'costing_smv': ie_operation.costing_smv,
               'factory_smv': ie_operation.factory_smv,
               'earnings_per_minute': pack_item.pack.version.get_version_earnings_per_minute(pack_item),
               'operation_cost': round_float_to_decimal_places(operation_cost, 2)
            }
            ie_data.append(data)
        return ie_data

    def get_pack_item_costs(self, pack_item):
        all_placements = pack_item.get_pack_item_placements()
        fabric_placements = OrderPackItemPlacementMaterial.objects.filter(placement__in=all_placements, material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES).values_list('placement_id', flat=True)
        # sewing_trim_placements = all_placements.filter(item_attribute_other__material__category=SEWING_TRIM_TYPES) # TODO - fix data in database
        sewing_trim_placements = all_placements.exclude(pk__in=fabric_placements)
        sewing_trim_data = self.get_material_placement_data(sewing_trim_placements)
        fabric_placements = all_placements.filter(pk__in=fabric_placements)

        fabric_data = self.get_fabric_data(fabric_placements)

        services = pack_item.get_pack_item_services()
        services_data = self.get_service_data(services)

        ie_operations = pack_item.get_colorway_item_operations()
        data = {
            'fabric_data': fabric_data,
            'sewing_trim_data': sewing_trim_data,
            'service_data': services_data,
            'ie_operation_data': self.get_ie_operations_data(ie_operations, pack_item),
            'pack_item_id': pack_item.pk,
            'pack_item_display': pack_item.get_pack_item_display(),
            **pack_item.get_pack_item_cost_summary()
            # **pack_item.calculate_pack_item_cost()
        }
        return data

    def get_pack_other_costs(self, pack):
        other_costs = pack.get_other_costs()
        other_cost_data = []
        for other_cost in other_costs:
            other_cost_data.append({
                'other_cost_type_name': other_cost.other_cost_type_name,
                'cost': other_cost.cost,
            })
        return other_cost_data

    def get_pack_costs(self, pack):
        packaging_placements = pack.get_pack_placements()
        packaging_data = self.get_material_placement_data(packaging_placements)
        other_costs = self.get_pack_other_costs(pack)
        data = {
            'packaging_data': packaging_data,
            'other_costs': other_costs
        }
        return data

    def get(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id', None)
        pack_id = kwargs.get('pack_id', None)

        costing = self.get_costing_version_or_raise_http404(version_id)
        pack = self.get_object_or_404(OrderPack, pk=pack_id, version=costing)
        pack_items = pack.get_pack_items().order_by('item__item_identifier')
        meta_data = OrderInquirySerializer(costing.order, many=False).data
        data = {
            'pack_item_data': [],
            **self.get_pack_costs(pack),
            **pack.get_cost_summary()
        }
        fabric_cost = 0
        trim_cost = pack.total_packaging_costs
        for pack_item in pack_items:
            cost = self.get_pack_item_costs(pack_item)
            data['pack_item_data'].append(cost)

        data['meta_data'] = meta_data

        return Response(data)
    

class OrderInquiryTechPackUploadView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        order = get_object_or_404(OrderInquiry,pk=kwargs['order_id'])
        attachment_ids = request.data.get('attachment_ids',[])
        attachments = FileAttachment.objects.filter(id__in=attachment_ids)
        order.tech_packs.set(attachments)
        serializer = FileAttachmentSerializer(attachments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OrderPlacementSpeedConsumptionDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderCostingVersion.objects.filter().order_by('-id')
    serializer_class = OrderPlacementSpeedConsumptionSerializer

class OrderPlacementSpeedConsumptionSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, data):
        pass

    def post(self, request):
        item_data = request.data.get('item_data')
        for row in item_data:
            placement_data = row['placements']
            for placement_row in placement_data:
                id = placement_row['id']
                estimated_consumption_ratio = placement_row['estimated_consumption_ratio']
                order_placement = get_object_or_404(OrderPlacement, pk=id)
                order_placement.estimated_consumption_ratio = estimated_consumption_ratio
                order_placement.estimated_consumption_ratio_units = order_placement.material.get_consumption_measuring_unit() if order_placement.material else None
                order_placement.save()
        return Response({'success': True})

class OrderPlacementSpeedConsumptionListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    queryset = OrderItem.objects.filter().order_by('-id')
    serializer_class = OrderItemSpeedConsumptionSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        version = get_object_or_404(OrderCostingVersion, pk=self.kwargs['version_id'])
        item = get_object_or_404(Item, pk=self.kwargs['item_id'])
        order_item_ids = OrderItem.objects.filter(item=item).exclude(order=version.order).distinct('item', 'order')
        qs = qs.filter(id__in=order_item_ids)
        return qs


class OrderPlacementSpeedConsumptionSendtoCadTeamView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, version_id):
        cad_role = Role.objects.get(name=CAD_USER_ROLE)
        cad_users = cad_role.users.all()
        costing_version = get_object_or_404(OrderCostingVersion, pk=version_id)
        consumption_entity = [{
                'entity_id': costing_version.id,
                'entity_name': ORDER_COSTING_VERSION
            }]
        if consumption_entity:
            ApprovalUtils.assign_action_task(cad_users, consumption_entity, COSTING_SPEED_CONSUMPTION_DESCRIPTION, 'Costing Speed Consumption Data Enter')
        return Response({'status': True})


class CostingFabricMaterialListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, version_id):
        data = []
        version = get_object_or_404(OrderCostingVersion, pk=version_id)
        material_ids = SupplierInquiry.objects.filter(version=version, customer_brand_material__material_detail__generic_material__user_material__category=Material.FABRIC_MATERIAL).values_list('customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        for material in materials:
            data.append({
                'id': material.id,
                'name': material.verbose_reference_code
            })
        return Response(data)


class ColorwayItemTypeAttachmentUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        colorway_item_type = get_object_or_404(ColorwayItemType,pk=kwargs['colorway_item_type_id'])
        attachment_id = request.data.get('attachment_id',None)
        if attachment_id:
            attachment = get_object_or_404(FileAttachment, pk=attachment_id)
            colorway_item_type.image = attachment
        else:
            colorway_item_type.image = None
        colorway_item_type.save()
        return Response({'success': True})


class OrderItemAttachmentUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        order_item = get_object_or_404(OrderItem,pk=kwargs['order_item_id'])
        attachment_id = request.data.get('attachment_id',None)
        if attachment_id:
            attachment = get_object_or_404(FileAttachment, pk=attachment_id)
            order_item.image = attachment
        else:
            order_item.image = None
        order_item.save()
        return Response({'success': True})


class OrderCostingVersionDetailView(generics.ListAPIView):

    serializer_class = OrderCostingVersionDetailSerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    def get_customer_filtering_queryset(self):

        qs = OrderCostingVersion.objects.all().order_by('-id')
        customer_id = self.request.query_params.get('customer_id', None)
        if customer_id:
            qs = qs.filter(order__customer__id=customer_id)

        return qs

    def get_field_list(self):

        field_list = [
            {'field_name': 'id', 'field_type': 'id', 'front_end_field_name': 'id'},
            {'field_name': 'order__customer__name', 'field_type': 'text', 'front_end_field_name': 'customer'},
            {'field_name': 'order__brand__name', 'field_type': 'text', 'front_end_field_name': 'brand_name'},
            {'field_name': 'order__date', 'field_type': 'date', 'front_end_field_name': 'date'},
            {'field_name': 'order__year', 'field_type': 'text', 'front_end_field_name': 'year'},
            {'field_name': 'order__style_number', 'field_type': 'text', 'front_end_field_name': 'style_number'},
            {'field_name': 'costing_type', 'field_type': 'choice', 'front_end_field_name': 'costing_type'},
        ]

        return field_list

    def get_queryset(self):

        qs = self.get_customer_filtering_queryset()
        field_list = self.get_field_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, OrderCostingVersion)
        short_code = self.request.query_params.get('short_code', None)
        if short_code:
            qs = list(qs)
            qs = [obj for obj in qs if short_code.lower() in obj.short_code.lower()]

        return qs
    

class PreCostingMaterialListAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        data = {
            'materials': [],
            'fabric_completion_date': costing.fabric_completion_date,
            'sewing_trim_completion_date': costing.sewing_trim_completion_date,
            'packaging_trim_completion_date': costing.packaging_trim_completion_date,
        }
        material_qs = costing.get_costing_version_materials()
        data['materials'] = segregate_material_into_types_and_material(material_qs, costing)
        return Response(data)
    

class PreCostingMaterialCompleteUpdateAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, costing, material):
        errors = {}
        has_errors = False
        user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
        if user_define_material.category == FABRIC_TRIM_TYPES or user_define_material.category == SEWING_TRIM_TYPES:
            is_exist = OrderPackItemPlacementMaterial.objects.filter(placement__item_attribute_other__material=user_define_material, material=None).exists()
            if is_exist:
                has_errors = True
                if user_define_material.name not in errors:
                    errors[user_define_material.name] = {}
                errors[user_define_material.name] = '%s %s' % (u'Please assign materials for ', user_define_material.material)
        else:
            is_exist = OrderPackPlacementMaterial.objects.filter(placement__item_attribute_other__material=user_define_material, material=None).exists()
            if is_exist:
                has_errors = True
                if user_define_material.name not in errors:
                    errors[user_define_material.name] = {}
                errors[user_define_material.name] = '%s %s' % (u'Please assign materials for ', user_define_material.material)
 
        if not has_errors:
            is_supplier_inquiry_data_not_exists = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
                order_costing_version=costing,
                customer_brand_material__material_detail__generic_material__user_material=user_define_material,
                supplier_inquiry_detail=None
            ).exists()

            if is_supplier_inquiry_data_not_exists:
                has_errors = True
                if user_define_material.name not in errors:
                    errors[user_define_material.name] = {}
                errors[user_define_material.name] = "Please complete supplier inquiry data in costing."
                
        return has_errors, errors

    def post(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        material = request.data.get('material', None)
        is_complete = request.data.get('is_complete', False)
        has_errors, errors = self.validate_data(costing, material)
        if not has_errors:
            user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
            if is_complete:
                if costing.validate_completed_material_consumption_objects_complete(user_define_material):
                    CostingCompletedMaterial.objects.get_or_create(costing_version=costing, material=user_define_material)
                    http_response = Response({'success': True})
                else:
                    if user_define_material.name not in errors:
                        errors[user_define_material.name] = {}
                    errors[user_define_material.name] = '%s %s' % (u'Please complete and verify consumption data for ', user_define_material.material)
                    http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                po_clubs = ActualPOClub.objects.filter(pre_costing=costing)
                is_exists_po_club_completed_materials = POClubCompletedMaterial.objects.filter(po_club__in=po_clubs, material=user_define_material).exists()
                if is_exists_po_club_completed_materials:
                    http_response = Response({"error": "Already completed materials in PO Clubs"}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    costing_completed_material = get_object_or_none(CostingCompletedMaterial, {'material': user_define_material, 'costing_version': costing})
                    costing_completed_material.delete()
                    http_response = Response({'success': True})
        else: 
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    


class PreCostingMaterialCompleteDateUpdateAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        fabric_completion_date = request.data['fabric_completion_date']
        sewing_trim_completion_date = request.data['sewing_trim_completion_date']
        packaging_trim_completion_date = request.data['packaging_trim_completion_date']

        costing.fabric_completion_date = fabric_completion_date
        costing.sewing_trim_completion_date = sewing_trim_completion_date
        costing.packaging_trim_completion_date = packaging_trim_completion_date
        costing.save()
        http_response = Response({'success': True})
        return http_response
    

class PreCostingMaterialCompletePOClubListViewAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = {
            'material_completed_po_lub_list': [],
            'material_pending_po_club_list': []
        }
        version_id = kwargs.get('version_id')
        costing = self.get_costing_version_or_raise_http404(version_id)
        material = request.query_params.get('material')
        user_define_material = get_object_or_404(UserDefinedMaterial, name=material)
        coting_po_clubs = ActualPOClub.objects.filter(pre_costing=costing)
        material_completed_po_clubs = ActualPOClub.objects.filter(id__in=POClubCompletedMaterial.objects.filter(material=user_define_material, po_club__in=coting_po_clubs).values_list('po_club', flat=True))
        material_pending_po_clubs = ActualPOClub.objects.filter(id__in=coting_po_clubs.values_list('id', flat=True)).exclude(id__in=material_completed_po_clubs.values_list('id', flat=True))
        for material_pending_po_club in material_pending_po_clubs:
            data['material_pending_po_club_list'].append({
                'id': material_pending_po_club.id,
                'display_number': material_pending_po_club.display_number,
                'short_code': material_pending_po_club.short_code,
                'long_code': material_pending_po_club.long_code,
            })

        for material_completed_po_club in material_completed_po_clubs:
            data['material_completed_po_lub_list'].append({
                'id': material_completed_po_club.id,
                'display_number': material_completed_po_club.display_number,
                'short_code': material_completed_po_club.short_code,
                'long_code': material_completed_po_club.long_code,
            })

        http_response = Response(data)
        return http_response
    

class PreCostingMaterialCompletePOClubUpdateViewAPI(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, po_clubs, user_define_material):
        errors = {}
        has_errors = False

        for po_club in po_clubs:
            order_costing = po_club.pre_costing
            is_exists = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
                order_costing_version=order_costing,
                customer_brand_material__material_detail__generic_material__user_material=user_define_material,
                supplier_inquiry_detail=None
            ).exists()
            if is_exists:
                has_errors = True
                if po_club.display_number not in errors:
                    errors[po_club.display_number] = {}
                errors[po_club.display_number][user_define_material.name] = "Please complete supplier inquiry data in costing."
        return has_errors, errors

    def update_completed_material_po_clubs(self, po_clubs, user_define_material):
        for po_club in po_clubs:
            po_club.finalize_po_packs_and_create_dependencies_from_material(user_define_material)
            if user_define_material.category == FABRIC_TRIM_TYPES:
                po_club.generate_po_club_purchase_order_bom(user_define_material)
                po_club.create_po_fabric_default_widths()
                po_club.create_fabric_material_inhouse_verification()
            else:
                po_club.generate_po_club_purchase_order_bom(user_define_material, True)
                po_club.create_other_material_inhouse_verification()
            po_club.aggregate_bom_by_material_and_supplier_inquiry_detail_and_create_bom(user_define_material)

        return True
    
    def post(self, request, *args, **kwargs):
        material = request.data.get('material', None)
        po_club_ids = request.data.get('po_club_ids', [])
        po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
        user_define_material = get_object_or_none(UserDefinedMaterial, {'name': material})
        has_errors, errors = self.validate_data(po_clubs, user_define_material)

        if not has_errors:
            self.update_completed_material_po_clubs(po_clubs, user_define_material)
            http_response = Response({'success': True})
        else: 
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class CostingDifferenceDetailView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        from marketing.helpers.costing_pack_material_wise_difference_summary import MaterialCostingDifferenceSummaryMixin
        marketing_costing_version_id = kwargs.get('marketing_costing_version_id')
        pre_costing_version_id = kwargs.get('pre_costing_version_id')
        marketing_costing = self.get_costing_version_or_raise_http404(marketing_costing_version_id)
        pre_costing = self.get_costing_version_or_raise_http404(pre_costing_version_id)
        marketing_costing_helper = MaterialCostingDifferenceSummaryMixin()
        marketing_costing_packs = marketing_costing.get_order_version_packs()
        pre_costing_packs = pre_costing.get_order_version_packs()
        data = marketing_costing_helper.get_cost_difference_summary(marketing_costing, pre_costing, marketing_costing_packs, pre_costing_packs)
        http_response = Response(data)
        return http_response


class POClubCostingDifferenceDetailView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        from marketing.helpers.po_pack_material_wise_difference_summary import POClubMaterialCostingDifferenceSummaryMixin
        pre_costing_version_id = kwargs.get('pre_costing_version_id')
        po_club_id = kwargs.get('po_club_id')
        pre_costing = self.get_costing_version_or_raise_http404(pre_costing_version_id)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        helper = POClubMaterialCostingDifferenceSummaryMixin()
        data = helper.get_cost_difference_summary(pre_costing, po_club)
        http_response = Response(data)
        return http_response
    

class CostingColorwayDifferenceDetailView(APIView, OrderMixin):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        from marketing.helpers.costing_pack_material_wise_difference_summary import MaterialCostingDifferenceSummaryMixin
        marketing_costing_version_id = kwargs.get('marketing_costing_version_id')
        pre_costing_version_id = kwargs.get('pre_costing_version_id')
        marketing_costing = self.get_costing_version_or_raise_http404(marketing_costing_version_id)
        pre_costing = self.get_costing_version_or_raise_http404(pre_costing_version_id)
        marketing_costing_helper = MaterialCostingDifferenceSummaryMixin()
        pack  = get_object_or_404(OrderPack, pk=kwargs.get('pack_id'))
        marketing_costing_packs = marketing_costing.get_order_version_packs().filter(id=pack.copied_from.id)
        pre_costing_packs = pre_costing.get_order_version_packs().filter(id=pack.id)

        data = marketing_costing_helper.get_cost_difference_summary(marketing_costing, pre_costing, marketing_costing_packs, pre_costing_packs)
        http_response = Response(data)
        return http_response