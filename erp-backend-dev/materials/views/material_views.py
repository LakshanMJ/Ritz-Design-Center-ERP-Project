from django.forms import model_to_dict
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import get_object_or_404, ListAPIView, RetrieveAPIView, RetrieveDestroyAPIView
from rest_framework import status

from django.core.exceptions import ObjectDoesNotExist
from marketing.models import Item, OrderInquiry, OrderPackItemPlacementMaterial, ActualPOClub, POPack, POPackPlacement, POPackItemPlacement
from marketing.serializers import DetailedOrderInquirySerializer, ItemSerializer, ActualPOClubSerializer
from materials.models import CustomerBrandMaterial, SupplierInquiry, SupplierInquiryDetail, UserDefinedMaterial, GenericMaterialVariation, CustomerBrandMaterialCode, SupplierInquiryMaterialCode
from materials.serializers.material_serializers import *
from shared.permissions.roles import MERCHANT_ROLE
from shared.permissions.view_permissions import HasPermission
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.models import PlantWarehouse
from shared.utils import get_quantity_dictionary, clean_search_dictionary, search_qs_from_global_filter
from materials.models import InHouseMaterialVerification, InHouseMaterialVerificationMaterial
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin


class MaterialDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        customer_brand_material_code_id = kwargs.get('customer_brand_material_code_id', None)
        material = CustomerBrandMaterial.objects.get(pk=customer_brand_material_code_id)
        data = material.get_attributes()
        headers = UserDefinedMaterial.get_material_headers(material.material_detail.material_type)
        response_data = {
            'material_data': data,
            'material_headers': headers
        }
        return Response(response_data)


class SupplierInquiryDetailsListView(APIView):
    queryset = SupplierInquiry.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self,request):
        customer_brand_materials = request.GET.get('customer_brand_material_ids')
        item_service = request.GET.get('item_service_ids')
        customer_brand_material_ids = [int(id) for id in customer_brand_materials.split(',')]
        item_service_ids = [int(id) for id in item_service.split(',')]
        supplier_inquiry_objects = SupplierInquiry.objects.filter(customer_brand_material__id__in=customer_brand_material_ids , item_service__id__in=item_service_ids)
        serializer = SupplierInquirySerializer(supplier_inquiry_objects, many=True)
        serialized_data = serializer.data
        return Response(serialized_data)


class ItemMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    def get(self, request, generic_material_variation_id):
        item_ids=OrderPackItemPlacementMaterial.objects.filter(
           material__material_detail__id=generic_material_variation_id).values_list(
               'placement__order_pack_item__item__item_id', flat=True
           )
        items = Item.objects.filter(id__in=item_ids)
        serializer = ItemSerializer(items, many=True).data
        return Response(serializer, status=status.HTTP_200_OK)


class CostingMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    def get(self, request, generic_material_variation_id):
        costing_ids=OrderPackItemPlacementMaterial.objects.filter(
            material__material_detail__id=generic_material_variation_id).values_list(
                'placement__order_pack_item__pack__version__order', flat=True
            )
        costings = OrderInquiry.objects.filter(id__in=costing_ids)
        serializer = DetailedOrderInquirySerializer(costings, many=True).data
        return Response(serializer, status=status.HTTP_200_OK)
    

class SupplierMaterialDetailView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        material_id = kwargs['customer_brand_material_id']
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        supplier_ids = customer_brand_material.supplierinquiry_set.all().values_list('supplier__id', flat=True)
        supplier_inquiry_material_codes = SupplierInquiryMaterialCode.objects.filter(customer_brand_material=customer_brand_material, supplier__id__in=supplier_ids)
        data = SupplierInquiryMaterialCodeSerilizer(supplier_inquiry_material_codes, many=True).data
        return Response(data, status.HTTP_200_OK)
    

class InhouseMaterialPOClubListView(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActualPOClubSerializer
    queryset = ActualPOClub.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.query_params.get('customer_id', None)
        po_club_ids = InHouseMaterial.objects.filter().values_list('grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club', flat=True)
        qs = qs.filter(id__in=po_club_ids)
        if customer_id:
            qs = qs.filter(id__in=po_club_ids, pre_costing__order__customer_id=customer_id)
        return qs 


class POClubInhouseMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE]

    def get(self, request, po_club_id):
        data = {
            FABRIC_TRIM_TYPES: {'category': FABRIC_TRIM_TYPES, 'material_data': []},
            SEWING_TRIM_TYPES: {'category': SEWING_TRIM_TYPES, 'material_data': []},
            PACKAGING_TYPES: {'category': PACKAGING_TYPES, 'material_data': []},
        }

        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        materials = InHouseMaterial.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club
        )

        for material in materials:
            normalized_measuring_unit = material.supplier_material.customer_brand_material.material_normalized_measuring_unit
            category = material.supplier_material.customer_brand_material.material_category
            if category in data:
                data[category]['material_data'].append({
                    'id': material.id,
                    'barcode' : material.barcode,
                    'quantity' : get_quantity_dictionary(material.quantity, normalized_measuring_unit),
                    'available_quantity' : get_quantity_dictionary(material.available_quantity, normalized_measuring_unit),
                    #'cutting_width' : get_quantity_dictionary(material.cutting_width)
                    'manually_added' : material.manually_added,
                    'attributes': material.supplier_material.customer_brand_material.get_attributes()
                })

        return Response(data)

        

class POClubMaterialTransferSaveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, warehouse_id, transfer_type):
        errors = {}

        if not warehouse_id:
            errors['warehouse_id'] = 'Select warehouse.'

        if not transfer_type:
            errors['transfer_type'] = 'Select transfer type.'

        has_errors = bool(errors)
        return has_errors, errors
    
    def validate_selected_materials(self, data):
        has_errors = False
        errors = {
            'quantity_errors': {}
        }
        for row in data:
            in_house_material = get_object_or_404(InHouseMaterial, pk=row['id'])
            transfer_quantity = row['transfer_quantity']
            if in_house_material.available_quantity < transfer_quantity:
                if in_house_material.id not in errors['quantity_errors']:
                    errors['quantity_errors'][in_house_material.id] = {}
                has_errors = True
                errors['quantity_errors'][in_house_material.id] = "Transfer quantity must be less than available quantity."

        return has_errors, errors
    
    def get_allocated_materials_until_quantity(self, po_club, material_id, total_qty):
        from django.db.models import F
        # filter and get full inhouse roll details
        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order__actual_po_club=po_club,
            purchase_order_bom__material_id=material_id,
            allocated_quantity=F('in_house_material__quantity')
        ).order_by('in_house_material__grn_material_detail__batch_number', 'width_id', 'shade_id',)

        accumulated_qty = 0
        selected_materials = []

        for purchase_order_allocated_material in purchase_order_allocated_materials:
            if accumulated_qty >= total_qty:
                break
            selected_materials.append(purchase_order_allocated_material)
            accumulated_qty += purchase_order_allocated_material.allocated_quantity or 0

        if total_qty > accumulated_qty:
            purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
                purchase_order_bom__purchase_order__actual_po_club=po_club,
                purchase_order_bom__material_id=material_id
            ).exclude(allocated_quantity=F('in_house_material__quantity')).order_by('in_house_material__grn_material_detail__batch_number', 'width_id', 'shade_id',)

            for purchase_order_allocated_material in purchase_order_allocated_materials:
                if accumulated_qty >= total_qty:
                    break
                selected_materials.append(purchase_order_allocated_material)
                accumulated_qty += purchase_order_allocated_material.allocated_quantity or 0
        
        return selected_materials
    
    def get_is_pending_warehouse_transfer(self, po_club_id):
        actual_po_club_ct = ContentType.objects.get_for_model(ActualPOClub)
        is_created = WarehouseMaterialTransfer.objects.filter(
            entity_type=actual_po_club_ct,
            entity_id=po_club_id,
            state__in=[WarehouseMaterialTransfer.PENDING_STATE, WarehouseMaterialTransfer.TRNASFER_IN_PROGRESS_STATE]
        ).exists()
        return is_created

    def post(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        warehouse_id = request.data.get('warehouse_id', None)
        transfer_type = request.data.get('transfer_type')

        has_errors, errors = self.validate_data(warehouse_id, transfer_type)
        if not has_errors:
            content_type = ContentType.objects.get_for_model(ActualPOClub)
            transfer_warehouse = get_object_or_404(PlantWarehouse, pk=request.data.get('warehouse_id'))

            is_pending_warehouse_transfer = self.get_is_pending_warehouse_transfer(po_club.id)
            if not is_pending_warehouse_transfer:
                warehouse_material_transfer = WarehouseMaterialTransfer.objects.create(
                    entity_type=content_type,
                    entity_id=po_club.id,
                    transfer_warehouse=transfer_warehouse
                )
                warehouse_material_transfer.transfer_type=transfer_type
                warehouse_material_transfer.state=WarehouseMaterialTransfer.PENDING_STATE
                warehouse_material_transfer.save()
                
                if transfer_type == WarehouseMaterialTransfer.FULL_TRANSFER_TYPE:
                    inhouse_materials = InHouseMaterial.objects.filter(
                        grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club
                    )
                    for inhouse_material in inhouse_materials:
                        warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                            warehouse_material_transfer=warehouse_material_transfer,
                            in_house_material=inhouse_material
                        )
                        material_category = inhouse_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                        warehouse_material_transfer_detail.quantity = inhouse_material.quantity
                        warehouse_material_transfer_detail.quantity_units = inhouse_material.quantity_units
                        warehouse_material_transfer_detail.previous_color_tone = inhouse_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                        warehouse_material_transfer_detail.previous_shade = inhouse_material.get_po_club_shade(inhouse_material.grn_material_detail.shade.supplier_po_shade, po_club) if material_category==Material.FABRIC_MATERIAL else None
                        warehouse_material_transfer_detail.save()
                        if material_category == Material.FABRIC_MATERIAL:
                            print(inhouse_material.grn_material_detail.fabricgrndetail.color_tone, ">>>>>>>>>>>>>>>>>>>>>>>>>>>>")
                    http_response = Response({'status': True, 'warehouse_material_transfer_id': warehouse_material_transfer.id})
                elif transfer_type == WarehouseMaterialTransfer.PARTIAL_TRANSFER_TYPE:
                    transfer_detail_ids = []
                    po_pack_data = request.data.get('po_packs')
                    quantity_data = []
                    material_quantity_map = {}
                    for row in po_pack_data:
                        transfer_quantity = row['transfer_quantity']

                        if transfer_quantity and transfer_quantity > 0:
                            po_pack = get_object_or_404(POPack, pk=row['id'])
                            partial_delivery_transfer_pack_quantity = PartialDeliveryTransferPackQuantity.objects.create(
                                warehouse_material_transfer=warehouse_material_transfer,
                                po_pack=po_pack,
                                quantity=transfer_quantity,
                                quantity_units=MaterialUnitHelper.PIECES_UNIT
                            )
                        
                            partial_delivery_transfer_pack_quantity.save()
                            po_pack_placements = POPackPlacement.objects.filter(po_pack=po_pack)
                            po_pack_item_placements = POPackItemPlacement.objects.filter(po_pack_item__po_pack=po_pack)

                            for po_pack_placement in po_pack_placements:
                                material_id = po_pack_placement.po_material.id
                                required_quantity = (po_pack_placement.material_quantity / po_pack.quantity) * transfer_quantity

                                if material_id in material_quantity_map:
                                    material_quantity_map[material_id] += required_quantity
                                else:
                                    material_quantity_map[material_id] = required_quantity

                            for po_pack_item_placement in po_pack_item_placements:
                                material_id = po_pack_item_placement.po_material.id
                                required_quantity = (po_pack_item_placement.material_quantity / po_pack.quantity) * transfer_quantity

                                if material_id in material_quantity_map:
                                    material_quantity_map[material_id] += required_quantity
                                else:
                                    material_quantity_map[material_id] = required_quantity

                            inhouse_materials = InHouseMaterial.objects.filter(
                                grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club
                            )

                    for material_id, total_qty in material_quantity_map.items():
                        quantity_data.append({
                            'material_id': material_id,
                            'required_quantity': total_qty
                        })
                    for row in quantity_data:
                        material_id = row['material_id']
                        total_qty = row['required_quantity']
                        purchase_order_allocated_materials = self.get_allocated_materials_until_quantity(po_club, material_id, total_qty)
                        for purchase_order_allocated_material in purchase_order_allocated_materials:
                            warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                                warehouse_material_transfer=warehouse_material_transfer,
                                in_house_material=purchase_order_allocated_material.in_house_material,
                                
                            )
                            material_category = purchase_order_allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                            warehouse_material_transfer_detail.quantity=purchase_order_allocated_material.in_house_material.quantity
                            warehouse_material_transfer_detail.quantity_units=purchase_order_allocated_material.in_house_material.quantity_units
                            warehouse_material_transfer_detail.previous_color_tone = purchase_order_allocated_material.in_house_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                            warehouse_material_transfer_detail.previous_shade = purchase_order_allocated_material.in_house_material.get_po_club_shade(purchase_order_allocated_material.in_house_material.grn_material_detail.shade.supplier_po_shade, po_club) if material_category==Material.FABRIC_MATERIAL else None
                            warehouse_material_transfer_detail.save()
                            transfer_detail_ids.append(warehouse_material_transfer_detail.id)

                    #TODO delete transfer material details exclude warehouse_material_transfer_details created in partial material transfer
                    warehouse_material_transfer.warehousematerialtransferdetail_set.filter().exclude(id__in=transfer_detail_ids).delete()
                    http_response = Response({'status': True, 'warehouse_material_transfer_id': warehouse_material_transfer.id})

                elif transfer_type == WarehouseMaterialTransfer.PO_TRANSFER_TYPE:
                    purchase_order_ids = request.data.get('purchase_order_ids', [])
                    inhouse_material_ids = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order_id__in=purchase_order_ids).values_list('in_house_material', flat=True)
                    inhouse_materials = InHouseMaterial.objects.filter(
                        id__in=inhouse_material_ids
                    )
                    for inhouse_material in inhouse_materials:
                        warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                            warehouse_material_transfer=warehouse_material_transfer,
                            in_house_material=inhouse_material
                        )
                        material_category = inhouse_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                        warehouse_material_transfer_detail.quantity = inhouse_material.quantity
                        warehouse_material_transfer_detail.quantity_units = inhouse_material.quantity_units
                        warehouse_material_transfer_detail.previous_color_tone = inhouse_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                        warehouse_material_transfer_detail.previous_shade = inhouse_material.get_po_club_shade(inhouse_material.grn_material_detail.shade.supplier_po_shade, po_club) if material_category==Material.FABRIC_MATERIAL else None
                        warehouse_material_transfer_detail.save()
                    http_response = Response({'status': True, 'warehouse_material_transfer_id': warehouse_material_transfer.id})

                elif WarehouseMaterialTransfer.WITHIN_COSTING_TRANSFER:
                    transfer_detail_ids = []
                    selected_materials = request.data.get('selected_materials')
                    has_errors, errors = self.validate_selected_materials(selected_materials)

                    if not has_errors:
                        for row in selected_materials:
                            transfer_quantity = row['transfer_quantity']
                            if transfer_quantity and transfer_quantity > 0:
                                in_house_material = get_object_or_404(InHouseMaterial, pk=row['id'])

                                
                                warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                                    warehouse_material_transfer=warehouse_material_transfer,
                                    in_house_material=in_house_material
                                )
                                material_category = in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                                warehouse_material_transfer_detail.quantity = transfer_quantity
                                warehouse_material_transfer_detail.quantity_units = in_house_material.quantity_units
                                warehouse_material_transfer_detail.previous_color_tone = in_house_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                                warehouse_material_transfer_detail.previous_shade = in_house_material.get_po_club_shade(in_house_material.grn_material_detail.shade.supplier_po_shade, po_club) if material_category==Material.FABRIC_MATERIAL else None
                                warehouse_material_transfer_detail.save()
                                transfer_detail_ids.append(warehouse_material_transfer_detail.id)
                        http_response = Response({'status': True, 'warehouse_material_transfer_id': warehouse_material_transfer.id})
                    else:
                        http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
                    
                else:
                    http_response = Response({'error': 'Invalid transfer type.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                http_response = Response({'error': 'Material Transfers have already been created for this PO Club. Please complete them before proceeding.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class POClubMaterialTransferPackDetailSaveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, warehouse_material_transfer_id):
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        data = request.data.get('data', [])
        for row in data:
            pass

        return Response({'status': True})

class POClubMaterialTransferDetailView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, po_club_id, plant_warehouse_id):
        # po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        # transfer_warehouse = get_object_or_404(PlantWarehouse, pk=plant_warehouse_id)
        # transfer_type = request.data.get('transfer_type')
        # content_type = ContentType.objects.get_for_model(ActualPOClub)
        # warehouse_material_transfer = WarehouseMaterialTransfer.objects.create(
        #     entity_type=content_type,
        #     entity_id=po_club.id,
        #     transfer_type=transfer_type,
        #     state=WarehouseMaterialTransfer.PENDING_STATE,
        #     transfer_warehouse=transfer_warehouse
        # )
        Response(True)


class MaterialTransferPOPackListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_club_id):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        po_packs = po_club.get_club_packs().order_by('purchase_order_id', 'po_country', 'po_colorway', 'po_size__order_size__size__sorting_order')
        for po_pack in po_packs:
            data.append({
                'id': po_pack.id,
                'purchase_order_name': po_pack.purchase_order.display_number,
                'country_name': po_pack.po_country.po_country_name,
                'po_colorway': po_pack.po_colorway.colorway,
                'po_size': po_pack.po_size.po_size_name,
                'quantity': po_pack.quantity
            })

        return Response(data)
    

class POClubTransferMaterialList(APIView):
    permission_classes = (HasPermission, )

    def get(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        materials = CustomerBrandMaterial.objects.filter(
            id__in=InHouseMaterial.objects.filter(grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club).values_list('supplier_material__customer_brand_material')
        )

        data = {
            FABRIC_TRIM_TYPES: {'category': FABRIC_TRIM_TYPES, 'material_data': []},
            SEWING_TRIM_TYPES: {'category': SEWING_TRIM_TYPES, 'material_data': []},
            PACKAGING_TYPES: {'category': PACKAGING_TYPES, 'material_data': []},
        }

        for material in materials:
            normalized_measuring_unit = material.material_normalized_measuring_unit
            category = material.material_category

            if category in data:
                details = []
                material_details = InHouseMaterial.objects.filter(
                    grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club,
                    supplier_material__customer_brand_material=material
                )
                total_available_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_measuring_unit, 'available_quantity', 'available_quantity_units')
                for material_detail in material_details:
                    actual_width = get_quantity_dictionary(material_detail.grn_material_detail.fabricgrndetail.actual_width.actual_width, MaterialUnitHelper.INCHES_UNIT) if category == FABRIC_TRIM_TYPES else {}
                    details.append({
                        'id': material_detail.id,
                        'barcode' : material_detail.barcode,
                        'pack_number' : material_detail.grn_material_detail.fabricgrndetail.pack_number if  category == Material.FABRIC_MATERIAL else None,
                        'batch_number' : material_detail.grn_material_detail.batch_number.batch_number if  category == Material.FABRIC_MATERIAL else None,
                        'width' : actual_width,
                        'grn_quantity' : get_quantity_dictionary(material_detail.grn_material_detail.actual_quantity, normalized_measuring_unit),
                        'available_quantity' : get_quantity_dictionary(material_detail.available_quantity, normalized_measuring_unit),
                    })
                total_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_measuring_unit, 'quantity', 'quantity_units')
                data[category]['material_data'].append({
                    'id': material.id,
                    'category': category,
                    'attributes': material.get_attributes(),
                    'details': details,
                    'total_available_quantity': get_quantity_dictionary(total_available_quantity, normalized_measuring_unit)
                })
                
        return Response(data)
    

class TransferCustomerBrandMaterialList(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = CustomerBrandMaterialDropDownSerializer
    queryset = CustomerBrandMaterial.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            #qs = search_qs_from_id(qs, search_text)
            qs = [obj for obj in qs if search_text.lower() in obj.verbose_reference_code.lower()]

        return qs


class TransferCustomerBrandMaterialInhouseMaterialList(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, customer_brand_material_id):
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=customer_brand_material_id)
        materials = InHouseMaterial.objects.filter(supplier_material__customer_brand_material=customer_brand_material)
        normalized_measuring_unit = customer_brand_material.material_normalized_measuring_unit
        total_available_quantity = calculate_queryset_total_normalized_quantity(materials, normalized_measuring_unit, 'available_quantity', 'available_quantity_units')
        
        data = {
            'id': customer_brand_material.id,
            'category': customer_brand_material.material_category,
            'attributes': customer_brand_material.get_attributes(),
            'total_available_quantity': get_quantity_dictionary(total_available_quantity, normalized_measuring_unit),
            'details': []
        }
        
        for material in materials:
            actual_width = get_quantity_dictionary(material.grn_material_detail.fabricgrndetail.actual_width.actual_width, MaterialUnitHelper.INCHES_UNIT) if customer_brand_material.material_category == FABRIC_TRIM_TYPES else {}
            data['details'].append({
                'id': material.id,
                'barcode' : material.barcode,
                'pack_number' : material.grn_material_detail.fabricgrndetail.pack_number if  customer_brand_material.material_category == Material.FABRIC_MATERIAL else None,
                'batch_number' : material.grn_material_detail.batch_number.batch_number if  customer_brand_material.material_category == Material.FABRIC_MATERIAL else None,
                'width' : actual_width,
                'grn_quantity' : get_quantity_dictionary(material.grn_material_detail.actual_quantity, normalized_measuring_unit),
                'available_quantity' : get_quantity_dictionary(material.available_quantity, normalized_measuring_unit),
            })

        return Response(data)
    

class TransferCustomerBrandMaterialInhouseMaterialSaveView(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def validate_selected_materials(self, data):
        has_errors = False
        errors = {
            'quantity_errors': {}
        }
        for row in data:
            in_house_material = get_object_or_404(InHouseMaterial, pk=row['id'])
            transfer_quantity = row['transfer_quantity']
            if in_house_material.available_quantity < transfer_quantity:
                if in_house_material.id not in errors['quantity_errors']:
                    errors['quantity_errors'][in_house_material.id] = {}
                has_errors = True
                errors['quantity_errors'][in_house_material.id] = "Transfer quantity must be less than available quantity."

        return has_errors, errors

    def post(self, request):
        transfer_detail_ids = []
        selected_materials = request.data.get('selected_materials')
        has_errors, errors = self.validate_selected_materials(selected_materials)

        if not has_errors:
            transfer_warehouse = get_object_or_404(PlantWarehouse, pk=request.data.get('warehouse_id'))
            warehouse_material_transfer = WarehouseMaterialTransfer.objects.create(
                transfer_warehouse=transfer_warehouse,
                transfer_type=WarehouseMaterialTransfer.MATERIAL_TRANSFER,
                state=WarehouseMaterialTransfer.PENDING_STATE
            )
            
            for row in selected_materials:
                transfer_quantity = row['transfer_quantity']
                if transfer_quantity and transfer_quantity > 0:
                    in_house_material = get_object_or_404(InHouseMaterial, pk=row['id'])

                    
                    warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                        warehouse_material_transfer=warehouse_material_transfer,
                        in_house_material=in_house_material
                    )
                    material_category = in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                    po_club = in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club
                    warehouse_material_transfer_detail.quantity = transfer_quantity
                    warehouse_material_transfer_detail.quantity_units = in_house_material.quantity_units
                    warehouse_material_transfer_detail.previous_color_tone = in_house_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                    warehouse_material_transfer_detail.previous_shade = in_house_material.get_po_club_shade(in_house_material.grn_material_detail.shade.supplier_po_shade, po_club) if material_category==Material.FABRIC_MATERIAL else None
                    warehouse_material_transfer_detail.save()
                    transfer_detail_ids.append(warehouse_material_transfer_detail.id)
            http_response = Response({'status': True, 'warehouse_material_transfer_id': warehouse_material_transfer.id})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)

        return http_response



class MaterialTransferListView(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = WarehouseMaterialTransferBasicSerializer
    queryset = WarehouseMaterialTransfer.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    replace_keys = {
            'display_number': 'id',
            'warehouse_name': 'transfer_warehouse__warehouse_name__icontains'
        }

    def clean_dictionary(self, dic):
        dictionary = clean_search_dictionary(dic, self.replace_keys)
        return dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        state = self.request.query_params.get('state', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.replace_keys.get(sort_col, None)
        sort_dir = self.request.query_params.get('sort_dir', None)
        search_fields = ['id', ]
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, WarehouseMaterialTransfer)
        if state:
            qs = qs.filter(state=state)
        return qs


class MaterialTransferDetailView(RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = WarehouseMaterialTransferSerializer
    queryset = WarehouseMaterialTransfer.objects.all().order_by('-id')


class MaterialTransferForceEditDetailView(RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = WarehouseMaterialTransferForceEditDetailSerializer
    queryset = WarehouseMaterialTransfer.objects.all().order_by('-id')


class MaterialTransferMaterialVerificationListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, warehouse_material_trnasfer_id):
        data = []
        warehouse_material_transfer =get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_trnasfer_id)
        inhouse_material_ids = warehouse_material_transfer.warehousematerialtransferdetail_set.all().values_list('in_house_material', flat=True)
        in_house_material_verifications = InHouseMaterialVerification.objects.filter(id__in=InHouseMaterialVerificationMaterial.objects.filter(inhouse_material__in=inhouse_material_ids).values_list('inhouse_material_verification', flat=True))
        for in_house_material_verification in in_house_material_verifications:
            data.append({
                'id': in_house_material_verification.id,
                'display_number': in_house_material_verification.display_number
            })
        return Response(data)


class MaterialTransferForceEditMaterialListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_club_id, warehouse_material_transfer_id):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        material_category = request.query_params.get('material_category', None)
        exclude_material_ids = warehouse_material_transfer.warehousematerialtransferdetail_set.all().values_list('in_house_material__supplier_material__customer_brand_material', flat=True)
        material_ids = InHouseMaterial.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club
        ).exclude(grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material__in=exclude_material_ids).values_list('grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids, material_detail__generic_material__user_material__category=material_category)

        for material in materials:
            normalized_measuring_unit = material.material_normalized_measuring_unit
            total_available_quantity = InHouseMaterial.objects.filter(
                    grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club,
                    grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material=material
                ).aggregate(total_available_quantity=Sum('available_quantity'))['total_available_quantity'] or 0
            serializer = CustomerBrandMaterialBasicSerializer(material, many=False).data
            serializer['category'] = material.material_category
            serializer['total_available_quantity'] = get_quantity_dictionary(total_available_quantity, normalized_measuring_unit)
            data.append(serializer)

        return Response(data)
    

class MaterialTransferForceEditMaterialDetailListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, po_club_id, warehouse_material_transfer_id, customer_brand_material_id):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=customer_brand_material_id)
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)

        exclude_inhouse_material_ids = warehouse_material_transfer.warehousematerialtransferdetail_set.filter(
            in_house_material__supplier_material__customer_brand_material=customer_brand_material,
        ).values_list('in_house_material', flat=True)

        inhouse_materials = InHouseMaterial.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club,
            supplier_material__customer_brand_material=customer_brand_material,
            available_quantity__gt=0
        ).exclude(id__in=exclude_inhouse_material_ids)

        for inhouse_material in inhouse_materials:
            material_category = inhouse_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
            inhouse_material_data = {
                'id': inhouse_material.id,
                'barcode' : inhouse_material.barcode,
                'pack_number' : inhouse_material.grn_material_detail.fabricgrndetail.pack_number if material_category ==  Material.FABRIC_MATERIAL else None,
                'batch_number' : inhouse_material.grn_material_detail.batch_number.batch_number if material_category ==  Material.FABRIC_MATERIAL else None,
                'available_quantity' : get_quantity_dictionary(inhouse_material.available_quantity, inhouse_material.available_quantity_units),
                'allocated_po_details': []
            }
            purchase_order_allocated_materials = inhouse_material.purchaseorderallocatedmaterial_set.all()

            for purchase_order_allocated_material in purchase_order_allocated_materials:
                allocated_po_detail_data = {
                    'id': purchase_order_allocated_material.id,
                    'purchase_order_id': purchase_order_allocated_material.purchase_order_bom.purchase_order.id,
                    'purchase_order_display_number': purchase_order_allocated_material.purchase_order_bom.purchase_order.display_number,
                    'allocated_quantity': get_quantity_dictionary(purchase_order_allocated_material.allocated_quantity, purchase_order_allocated_material.allocated_quantity_units)
                }
                inhouse_material_data['allocated_po_details'].append(allocated_po_detail_data)

            data.append(inhouse_material_data)

        return Response(data)
    

class MaterialTransferForceEditSaveView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [WarehouseMaterialTransfer.PENDING_STATE, ]

    def get_object_current_state(self):
        warehouse_material_transfer_id = self.kwargs.get('warehouse_material_transfer_id', None)
        self.warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        return self.warehouse_material_transfer.state 

    def validate_data(self, po_club, data):
        has_errors = False
        errors = {
            'material_errors': {}
        }
        for row in data:
            customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=row['customer_brand_material_id'])
            transfer_quantity = row['transfer_quantity']

            total_available_quantity = InHouseMaterial.objects.filter(
                grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club,
                supplier_material__customer_brand_material=customer_brand_material
            ).aggregate(total_available_quantity=Sum('available_quantity'))['total_available_quantity'] or 0

            transfer_quantity = row.get('transfer_quantity')
            if transfer_quantity == 0 or transfer_quantity == None:
                if customer_brand_material.id not in errors['material_errors']:
                    errors['material_errors'][customer_brand_material.id] = {}
                has_errors = True
                errors['material_errors'][customer_brand_material.id]['transfer_quantity'] = 'Enter quantity.'

            elif total_available_quantity < transfer_quantity:
                if customer_brand_material.id not in errors['material_errors']:
                    errors['material_errors'][customer_brand_material.id] = {}
                has_errors = True
                errors['material_errors'][customer_brand_material.id]['transfer_quantity'] = 'Transfer quantity must less be than available quantity.'
        return has_errors, errors

    def get_allocated_materials_until_quantity(self, inhouse_materials, total_qty):
        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            in_house_material__in=inhouse_materials,
            in_house_material__available_quantity__gt=0
        ).order_by('in_house_material__grn_material_detail__batch_number', 'width_id', 'shade_id',)

        accumulated_qty = 0
        selected_materials = []

        for purchase_order_allocated_material in purchase_order_allocated_materials:
            if accumulated_qty >= total_qty:
                break
            selected_materials.append(purchase_order_allocated_material)
            accumulated_qty += purchase_order_allocated_material.allocated_quantity or 0        
        return selected_materials

    def post(self, request, po_club_id, warehouse_material_transfer_id):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)

        data = request.data
        has_erros, errors = self.validate_data(po_club, data)

        if not has_erros:
            for row in data:
                customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=row['customer_brand_material_id'])
                transfer_quantity = row['transfer_quantity']

                inhouse_materials = InHouseMaterial.objects.filter(
                    grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club,
                    supplier_material__customer_brand_material=customer_brand_material
                )
                purchase_order_allocated_materials = self.get_allocated_materials_until_quantity(inhouse_materials, transfer_quantity)
                for purchase_order_allocated_material in purchase_order_allocated_materials:
                    warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                        warehouse_material_transfer=warehouse_material_transfer,
                        in_house_material=purchase_order_allocated_material.in_house_material,
                    )
                    material_category = purchase_order_allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                    warehouse_material_transfer_detail.quantity=purchase_order_allocated_material.in_house_material.quantity
                    warehouse_material_transfer_detail.quantity_units=purchase_order_allocated_material.in_house_material.quantity_units
                    warehouse_material_transfer_detail.previous_color_tone = purchase_order_allocated_material.in_house_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                    warehouse_material_transfer_detail.previous_shade = purchase_order_allocated_material.in_house_material.get_po_club_shade(purchase_order_allocated_material.in_house_material.grn_material_detail.shade.supplier_po_shade, po_club) if material_category==Material.FABRIC_MATERIAL else None
                    warehouse_material_transfer_detail.save()
                
            http_response = Response({'sucess': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class MaterialTransferForceEditUpdateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [WarehouseMaterialTransfer.PENDING_STATE, ]

    def get_object_current_state(self):
        warehouse_material_transfer_id = self.kwargs.get('warehouse_material_transfer_id', None)
        self.warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        return self.warehouse_material_transfer.state 

    def validate_data(self, data):
        has_errors = False
        errors = {
            'inhouse_material_errors': {}
        }

        for row in data:
            inhouse_material = get_object_or_404(InHouseMaterial, pk=row['id'])
            transfer_quantity = row.get('transfer_quantity')
            if transfer_quantity == 0 or transfer_quantity == None:
                if inhouse_material.id not in errors['inhouse_material_errors']:
                    errors['inhouse_material_errors'][inhouse_material.id] = {}
                has_errors = True
                errors['inhouse_material_errors'][inhouse_material.id]['transfer_quantity'] = 'Enter quantity.'

            elif inhouse_material.available_quantity < transfer_quantity:
                if inhouse_material.id not in errors['inhouse_material_errors']:
                    errors['inhouse_material_errors'][inhouse_material.id] = {}
                has_errors = True
                errors['inhouse_material_errors'][inhouse_material.id]['transfer_quantity'] = 'Transfer quantity must be less than available quantity.'
        return has_errors, errors

    def post(self, request, warehouse_material_transfer_id):
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        actual_po_club = warehouse_material_transfer.actual_po_club

        has_errors, errors = self.validate_data(request.data)
        if not has_errors:
            for row in request.data:
                inhouse_material = get_object_or_404(InHouseMaterial, pk=row['id'])
                normalized_measuring_unit = inhouse_material.supplier_material.customer_brand_material.material_normalized_measuring_unit
                warehouse_material_transfer_detail, created = WarehouseMaterialTransferDetail.objects.get_or_create(
                    warehouse_material_transfer=warehouse_material_transfer,
                    in_house_material=inhouse_material
                )
                material_category = inhouse_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
                warehouse_material_transfer_detail.quantity = row['transfer_quantity']
                warehouse_material_transfer_detail.quantity_units = normalized_measuring_unit
                warehouse_material_transfer_detail.previous_color_tone = inhouse_material.grn_material_detail.fabricgrndetail.color_tone if material_category==Material.FABRIC_MATERIAL else None
                if actual_po_club:
                    warehouse_material_transfer_detail.previous_shade = inhouse_material.get_po_club_shade(inhouse_material.grn_material_detail.shade.supplier_po_shade, actual_po_club) if material_category==Material.FABRIC_MATERIAL else None
                warehouse_material_transfer_detail.save()

            http_response = Response({'sucess': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        
        return http_response
    

class MaterialTransferDetailInlineEditView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [WarehouseMaterialTransfer.PENDING_STATE, ]

    def get_object_current_state(self):
        warehouse_material_transfer_id = self.kwargs.get('warehouse_material_transfer_id', None)
        self.warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        return self.warehouse_material_transfer.state 
    
    def validate_data(self, warehouse_material_transfer_detail, transfer_quantity):
        has_errors = False
        errors = {
            'quantity_errors': {}
        }
        if transfer_quantity['quantity'] == 0 or transfer_quantity['quantity'] == None:
            if warehouse_material_transfer_detail.id not in errors['quantity_errors']:
                errors['quantity_errors'][warehouse_material_transfer_detail.id] = {}
                has_errors = True
                errors['quantity_errors'][warehouse_material_transfer_detail.id]['transfer_quantity'] = 'Enter quantity.'

        elif warehouse_material_transfer_detail.in_house_material.available_quantity < transfer_quantity['quantity']:
            if warehouse_material_transfer_detail.id not in errors['quantity_errors']:
                errors['quantity_errors'][warehouse_material_transfer_detail.id] = {}
            has_errors = True
            errors['quantity_errors'][warehouse_material_transfer_detail.id]['transfer_quantity'] = 'Transfer quantity must be less than available quantity.'
        return has_errors, errors     

    def post(self, request, warehouse_material_transfer_id, warehouse_material_transfer_detail_id):
        warehouse_material_transfer_detail = get_object_or_404(WarehouseMaterialTransferDetail, pk=warehouse_material_transfer_detail_id)
        trnasfer_quantity = request.data.get('transfer_quantity', None)
        has_errors, errors = self.validate_data(warehouse_material_transfer_detail, trnasfer_quantity)
    
        if not has_errors:
            warehouse_material_transfer_detail.quantity = trnasfer_quantity['quantity']
            warehouse_material_transfer_detail.save()
            http_response = Response({'status': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class MaterialTransferDetailDeleteView(ObjectStatePermissionMixin, RetrieveDestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = WarehouseMaterialTransferDetailSerializer
    queryset = WarehouseMaterialTransferDetail.objects.all()
    editable_states = [WarehouseMaterialTransfer.PENDING_STATE, ]

    def get_object_current_state(self):
        obj = self.get_object()
        warehouse_material_transfer = obj.warehouse_material_transfer
        return warehouse_material_transfer.state
    

class MaterialTransferMaterialDeleteView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [WarehouseMaterialTransfer.PENDING_STATE, ]

    def get_object_current_state(self):
        warehouse_material_transfer_id = self.kwargs.get('warehouse_material_transfer_id', None)
        self.warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        return self.warehouse_material_transfer.state 
    
    def delete(self, request, po_club, warehouse_material_transfer_id, customer_brand_material_id):
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=customer_brand_material_id)

        in_house_materials = InHouseMaterial.objects.filter(
                grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=po_club,
                supplier_material__customer_brand_material=customer_brand_material
        )
        WarehouseMaterialTransferDetail.objects.filter(in_house_material__in=in_house_materials, warehouse_material_transfer=warehouse_material_transfer).delete()
        
        return Response({'status': True})
    


class MaterialTransferLeftOverVerificationView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, pk):
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=pk)
        transfer_materials = warehouse_material_transfer.get_transfer_materials()

        grouped_by_supplier = {}
        for transfer_material in transfer_materials:
            supplier_po_grn_material = transfer_material.in_house_material.grn_material_detail.supplier_po_grn_material
            if supplier_po_grn_material not in grouped_by_supplier:
                grouped_by_supplier[supplier_po_grn_material] = []
            grouped_by_supplier[supplier_po_grn_material].append(transfer_material)

        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)

        for group in grouped_by_supplier.values():
            inhouse_material_verification = InHouseMaterialVerification.objects.create(
                state=InHouseMaterialVerification.PENDING_STATE,
            )

            for transfer_material in group:
                inhouse_material_verification_material, created = InHouseMaterialVerificationMaterial.objects.get_or_create(
                    inhouse_material_verification=inhouse_material_verification,
                    inhouse_material=transfer_material.in_house_material,
                    referance_material_type=warehouse_material_transfer_detail_ct,
                    referance_material_id=transfer_material.id,
                )
                inhouse_material_verification_material.shade = None
                inhouse_material_verification_material.available_quantity = transfer_material.in_house_material.available_quantity
                inhouse_material_verification_material.available_quantity_units = transfer_material.in_house_material.available_quantity_units
                inhouse_material_verification_material.usable_quantity = transfer_material.in_house_material.quantity
                inhouse_material_verification_material.usable_quantity_units = transfer_material.in_house_material.quantity_units
                inhouse_material_verification_material.save()

        return Response({'success': True, 'inhouse_material_verification_id': inhouse_material_verification.id})


# class InHouseMaterialVerification(BaseAbstractModel):
#     PENDING_STATE = 'pending'
#     IN_PROGRESS_STATE = 'in_progress'
#     COMPLETE_STATE = 'complete'
#     CANCELED_STATE = 'canceled'

#     STATE_CHOICES = (
#         (PENDING_STATE, 'Pending'),
#         (IN_PROGRESS_STATE, 'IN Progress'),
#         (COMPLETE_STATE, 'Complete'),
#         (CANCELED_STATE, 'Canceled'),
#     )

#     state = models.CharField(max_length=200, choices=STATE_CHOICES, default=PENDING_STATE)
#     warehouse = models.ForeignKey('shared.PlantWarehouse', on_delete=models.SET_NULL, null=True)

#     @property
#     def display_number(self):
#         return f"INHOUSERVER{self.id:06}"

#     def get_verified_materials(self):
#         materials = self.inhousematerialverificationmaterial_set.all()
#         return materials

#     def move_to_next_state(self, new_state):
#         self.state = new_state
#         self.save()

#         if new_state == self.COMPLETE_STATE:
#             self.allocate_material()
#         return True

#     def update_inhouse_material_available_quantity(self):
#         verified_materials = self.get_verified_materials()
#         for verified_material in verified_materials:
#             in_house_material = verified_material.inhouse_material
#             in_house_material.available_quantity = verified_material.usable_quantity
#             in_house_material.available_quantity_units = verified_material.usable_quantity_units
#             in_house_material.save()

#     def allocate_material(self):
#         self.update_inhouse_material_available_quantity()
#         from marketing.models import PurchaseOrderBom
#         verified_materials = self.get_verified_materials()

#         for verified_material in verified_materials:
#             assigned_customer_brand_material = verified_material.po_leftover_material.assigned_customer_brand_material
#             po_club = verified_material.attached_po_club
#             purchase_orders = po_club.get_purchase_orders().order_by('id')
#             in_house_material = verified_material.inhouse_material

#             for purchase_order in purchase_orders:
#                 po_boms = purchase_order.get_material_purchase_order_boms(assigned_customer_brand_material)
#                 for po_bom in po_boms:
#                     in_house_material.allocate_in_house_material_to_purchase_order_bom(po_bom.quantity, po_bom.measuring_unit, po_bom)
#                     in_house_material.refresh_from_db()

#                     if in_house_material.available_quantity <= 0:
#                         break
#                 if in_house_material.available_quantity <= 0:
#                     break


# class InHouseMaterialVerificationMaterial(BaseAbstractModel):
#     inhouse_material_verification = models.ForeignKey(InHouseMaterialVerification, on_delete=models.CASCADE)
#     inhouse_material = models.ForeignKey('shared.InHouseMaterial', on_delete=models.CASCADE)
#     available_quantity = models.FloatField(null=True)
#     available_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     usable_quantity = models.FloatField(null=True)
#     usable_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     po_leftover_material = models.ForeignKey('marketing.POClubLeftOverMaterial', on_delete=models.SET_NULL, null=True)
#     shade = models.ForeignKey('marketing.POClubShade', on_delete=models.SET, null=True)

#     @property
#     def display_number(self):
#         return f"INHOUSERVERMAT{self.id:06}"

#     @property
#     def attached_po_club(self):
#         return self.po_leftover_material.po_club
        

class MaterialTransferStateChangeView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, warehouse_material_transfer_id):
        new_state = request.data.get('new_state', None)
        warehouse_material_transfer = get_object_or_404(WarehouseMaterialTransfer, pk=warehouse_material_transfer_id)
        response = warehouse_material_transfer.move_to_next_state(new_state)
        http_response = Response(response)
        if not response.get('valid', None):
            http_response.status_code = status.HTTP_400_BAD_REQUEST
        return http_response
    

class MaterialTransferStateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        data = []
        for choice in WarehouseMaterialTransfer.STATE_CHOICES:
            data.append({
                'id': choice[0],
                'name': choice[1]
            })
        return Response(data)
    

class CustomerBrandMaterialSupplierCodeList(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierCustomerBrandMaterialSerializer
    queryset = SupplierInquiryMaterialCode.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_brand_material_id = self.kwargs['customer_brand_material_id']
        supplier_id =self.kwargs['supplier_id']
        qs = qs.filter(supplier_id=supplier_id, customer_brand_material_id=customer_brand_material_id)
        return qs 