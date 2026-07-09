from rest_framework.generics import get_object_or_404, ListAPIView, RetrieveAPIView, CreateAPIView, DestroyAPIView, RetrieveUpdateAPIView
from shared.utils import get_object_or_none
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from shared.permissions.view_permissions import HasPermission
from shared.permissions.roles import BUSINESS_ADMIN_ROLE, MERCHANT_ROLE, CAD_USER_ROLE, STORES_ADMIN_ROLE

from marketing.models import PurchaseOrder, ActualPOClub, SupplierPOGRNMaterialDetail, OrderCostingVersion, OrderCostingColorwayMaterialSupplierInquiry, POClubLeftOverMaterial, \
    POClubShade
from marketing.serializers import ActualPOClubSerializer, SupplierPOGRNMaterialDetailSerializer

from materials.serializers.virtual_warehouse_serializers import PlantCustomerSerializer, InHouseMaterialSerializer,\
    VirtualWarehouseFabricSerializer, VirtualWarehousePackagingSerializer, VirtualWarehouseSewingSerializer,\
    VirtualWarehousePageLoadingDetailSerializer, POClubLeftOverMaterialSerializer, OrderSpecificMaterialsDetailSerializer, \
    InHouseMaterialVerificationSerializer, InHouseMaterialVerificationMaterialSerializer
from materials.serializers.material_serializers import CustomerBrandMaterialBasicSerializer
from materials.models import CustomerBrandMaterial, SupplierInquiryDetail, InHouseMaterialVerification, InHouseMaterialVerificationMaterial, UserDefinedMaterial, \
        FabricColorTone
from shared.models import Plant, InHouseMaterial, Supplier, Customer, PlantWarehouse
from shared.serializers import CustomerSerializer, FileAttachmentSerializer
from materials.helpers.virtual_warehouse_helpers import VirtualWarehouseTableHeaders
from materials.models import FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES
from shared.helpers.large_results_set_pagination import LargeResultsSetPagination
from supplier_po.models import GeneralPO
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin

class PlantCustomerActualPOClubListView(ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ActualPOClubSerializer
    queryset = ActualPOClub.objects.all().order_by('-id')

    def get_queryset(self):
        plant_id = self.kwargs.get('plant_id', None)
        customer_id = self.kwargs.get('customer_id', None)
        queryset = self.queryset
        if plant_id and customer_id:
            actual_po_club_ids = GeneralPO.objects.filter(plant__id=plant_id, costing__order__customer__id=customer_id).distinct('po_club').values_list('po_club')
            queryset = self.queryset.filter(pk__in=actual_po_club_ids)
        return queryset
    

class PlantCustomerListView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PlantCustomerSerializer
    queryset = Plant.objects.all()

    def get(self, request, *args, **kwargs):
        super_response = super().get(request, *args, **kwargs)
        customers_ids = PurchaseOrder.objects.all().distinct('costing_version__order__customer').values_list('costing_version__order__customer')
        customer_queryset = Customer.objects.filter(pk__in=customers_ids)
        customers = CustomerSerializer(customer_queryset, many=True).data
        all_plants = {
            'id': 'all_plants',
            'name': 'All',
            'customers': customers
        }
        super_response.data.append(all_plants)
        return super_response


class OrderSpecificMaterialsListView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = InHouseMaterialSerializer
    queryset = InHouseMaterial.objects.all()

    def get_supplier_data_to_array(self, supplier_data):
        supplier_data_array = []
        if FABRIC_TRIM_TYPES in supplier_data:
            supplier_data_array.append(supplier_data[FABRIC_TRIM_TYPES])
        else:
            supplier_data_array.append({
                'material_category': FABRIC_TRIM_TYPES,
                'material_category_label': 'Fabric',
                'material_details':[]
            })
        if SEWING_TRIM_TYPES in supplier_data:
            supplier_data_array.append(supplier_data[SEWING_TRIM_TYPES])
        else:
            supplier_data_array.append({
                'material_category': SEWING_TRIM_TYPES,
                'material_category_label': 'Sewing Trims',
                'material_details':[]
            })
        if PACKAGING_TYPES in supplier_data:
            supplier_data_array.append(supplier_data[PACKAGING_TYPES])
        else:
            supplier_data_array.append({
                'material_category': PACKAGING_TYPES,
                'material_category_label': 'Packaging',
                'material_details':[]
            })
        return supplier_data_array
    
    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        state = request.GET['specific_status']
        data = []
        # supplier_po_grn_material_details = SupplierPOGRNMaterialDetail.objects.all()
        if po_club_id:
            queryset = InHouseMaterial.objects.filter(
                grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club__id=po_club_id,
                state__in=InHouseMaterial.get_virtual_warehouse_category_states(state)
            ).exclude(available_quantity=0).exclude(available_quantity_units=None)
        distinct_field = 'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__supplier'
        supplier_ids = queryset.distinct(distinct_field).values_list(distinct_field)
        # distinct_field = 'supplier_po_grn_material__supplier_po_grn__supplier_po__supplier'
        # supplier_ids = supplier_po_grn_material_details.distinct(distinct_field).values_list(distinct_field)
        for supplier_id in supplier_ids:
            supplier = get_object_or_none(Supplier, {'pk': supplier_id[0]})
            if supplier:
                distinct_field = 'grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material'
                customer_brand_material_ids = queryset.distinct(distinct_field).values_list(distinct_field)
                # distinct_field = 'supplier_po_grn_material__grn_material'
                # customer_brand_material_ids = supplier_po_grn_material_details.distinct(distinct_field).values_list(distinct_field)
                supplier_data = {}
                for customer_brand_material_id in customer_brand_material_ids:
                    customer_brand_material = get_object_or_none(CustomerBrandMaterial, {'pk': customer_brand_material_id[0]})
                    if customer_brand_material:
                        material_category = customer_brand_material.material_category
                        material_category_label = customer_brand_material.material_category_label
                        # print(customer_brand_material.material_category_label)
                        if not material_category in supplier_data:
                            
                            supplier_data[material_category]={
                                'material_category': material_category,
                                'material_category_label': material_category_label,
                                # 'material_headers': VirtualWarehouseTableHeaders(material_category, specific_status).get_headers(),
                                'material_details':[]
                            }
                        inhouse_material_queryset = queryset.filter(grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material=customer_brand_material).exclude(grn_material_detail=None).exclude(available_quantity_units=None)
                        # inhouse_material_queryset = queryset
                        # grn_material_details = supplier_po_grn_material_details.filter(supplier_po_grn_material__grn_material=customer_brand_material)
                        # material_data = {
                        #     'total_quantity': 0.00,
                        #     'pack_details': []
                        # }
                        for inhouse_material in inhouse_material_queryset:
                        # for grn_material_detail in grn_material_details:
                            # print(inhouse_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.grn_number)
                            pack_data = {}
                            # print(material_category)
                            if material_category == FABRIC_TRIM_TYPES:
                                pack_data = VirtualWarehouseFabricSerializer(inhouse_material).data
                                # pack_data = VirtualWarehouseFabricPackDetailSerializer(grn_material_detail).data
                            elif material_category == SEWING_TRIM_TYPES:
                                pack_data = VirtualWarehouseSewingSerializer(inhouse_material).data
                                # pack_data = VirtualWarehouseSewingTrimPackDetailSerializer(grn_material_detail).data
                            elif material_category == PACKAGING_TYPES:
                                pack_data = VirtualWarehousePackagingSerializer(inhouse_material).data
                                # pack_data = VirtualWarehousePackagingPackDetailSerializer(grn_material_detail).data
                            
                            pack_data = {**pack_data, **CustomerBrandMaterialBasicSerializer(customer_brand_material).data}
                            # material_data['pack_details'].append(pack_data)
                            # material_data['total_quantity'] += inhouse_material.grn_material_detail.normalized_actual_quantity
                            # material_data['total_quantity'] += grn_material_detail.normalized_actual_quantity
                            supplier_data[material_category]['material_details'].append(pack_data)
                data.append({
                    'supplier_name': supplier.name,
                    'supplier_id': supplier.id,
                    'supplier_material_details': self.get_supplier_data_to_array(supplier_data)
                })
        return Response(data)
    

class VirtualWarehouseMaterialAllPlantCustomerView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = InHouseMaterialSerializer
    queryset = InHouseMaterial.objects.all()
    pagination_class = LargeResultsSetPagination
    
    def get(self, request, *args, **kwargs):
        plant_id = request.GET['plant_id']
        customer_id = request.GET['customer_id']
        state = request.GET['specific_status']
        material_category = request.GET['material_category']
        search_text = request.GET.get('searched_text', None)
        search_field = request.GET.get('searched_field', None)
        sorting_field = request.GET.get('sorting_field', None)
        descending = request.GET.get('descending', None)
        descending = '-' if descending == 'true' else ''
        field_mapping = {
            'plant_name': 'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__plant__name',
            'customer_name': 'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__costing__order__customer__name',
            'supplier_name': 'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__supplier__name'
        }
        search_field = field_mapping.get(search_field, None)
        data = []
        order_by_field = 'grn_material_detail__supplier_po_grn_material__grn_material'
        sorting_field = field_mapping.get(sorting_field, None)
        if sorting_field:
            order_by_field = descending + sorting_field
        if plant_id == 'all_plants' and customer_id == 'all_customers':
            queryset = InHouseMaterial.objects.filter(
                supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category,
                state__in=InHouseMaterial.get_virtual_warehouse_category_states(state)
            ).exclude(available_quantity=0).order_by(order_by_field)
            # print(material_category)
        elif plant_id == 'all_plants':
            queryset = InHouseMaterial.objects.filter(
            supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category,
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__costing__order__customer__id=customer_id,
            state__in=InHouseMaterial.get_virtual_warehouse_category_states(state)
            ).exclude(available_quantity=0).order_by(order_by_field)
        elif customer_id == 'all_customers':
            queryset = InHouseMaterial.objects.filter(
            supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category,
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__plant__id=plant_id,
            state__in=InHouseMaterial.get_virtual_warehouse_category_states(state)
            ).exclude(available_quantity=0).order_by(order_by_field)
        else:
            queryset = InHouseMaterial.objects.filter(
            supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category,
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__costing__order__customer__id=customer_id,
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__plant__id=plant_id,
            state__in=InHouseMaterial.get_virtual_warehouse_category_states(state)
            ).exclude(available_quantity=0).order_by(order_by_field)
        queryset = queryset.exclude(grn_material_detail=None).exclude(available_quantity_units=None).exclude(grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=None)
        if search_text and search_field:
            queryset = queryset.filter(**{search_field + '__contains': search_text})
        queryset = self.paginate_queryset(queryset)
        # print(queryset)
        for inhouse_material in queryset:
            pack_data = {}
            material_category_serializers = {
                FABRIC_TRIM_TYPES: VirtualWarehouseFabricSerializer,
                SEWING_TRIM_TYPES: VirtualWarehouseSewingSerializer,
                PACKAGING_TYPES: VirtualWarehousePackagingSerializer
            }
            if material_category in material_category_serializers:
                pack_data = {**material_category_serializers[material_category](inhouse_material).data,
                             **CustomerBrandMaterialBasicSerializer(inhouse_material.supplier_material.customer_brand_material).data}
            data.append(pack_data)
            

        return Response(data)
    

class VirtualWarehouseAllocationMaterialListView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = InHouseMaterialSerializer
    queryset = InHouseMaterial.objects.all()
    pagination_class = LargeResultsSetPagination

    def get(self, request, *args, **kwargs):
        costing_version = get_object_or_404(OrderCostingVersion, id=kwargs['costing_version_id'])
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, id=kwargs['customer_brand_material_id'])
        supplier_inquiries = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
            order_costing_version=costing_version,
            customer_brand_material=customer_brand_material
        ).values_list('supplier_inquiry_detail_id', flat=True)
        approved_supplier_ids = SupplierInquiryDetail.objects.filter(pk__in=supplier_inquiries, supplier_inquiry__version=costing_version).distinct('supplier_inquiry__supplier').values_list('supplier_inquiry__supplier', flat=True)
        not_use_for_allocation_states = [InHouseMaterial.RETURNABLES_STATUS,
                             InHouseMaterial.BATCH_REJECTION,
                             InHouseMaterial.OTHER_REJECTION,
                             InHouseMaterial.COLOR_TONE_REJECTION]
        inhouse_materials = InHouseMaterial.objects.filter(grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__costing=costing_version,
                                                           grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material=customer_brand_material,
                                                           supplier_material__supplier__id__in=approved_supplier_ids,
                                                        #    state='left_over',
                                                           available_quantity__gt=0,).exclude(
                                                               available_quantity_units=None).exclude(
                                                               state__in=not_use_for_allocation_states
                                                           )
        inhouse_materials = self.paginate_queryset(inhouse_materials)
        data = self.serializer_class(inhouse_materials, many=True).data
        return Response(data=data)
    

class PageLoadingDetailView(RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = VirtualWarehousePageLoadingDetailSerializer
    queryset = InHouseMaterial.objects.all()


class POClubLeftOverMaterialAllocationView(CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubLeftOverMaterialSerializer
    queryset = POClubLeftOverMaterial.objects.all()

    def post(self, request, *args, **kwargs):
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        assigned_customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=kwargs['material_id'])
        in_house_materials = InHouseMaterial.objects.filter(id__in=request.data['in_house_material_ids'], available_quantity__gt=0)
        return_status = status.HTTP_200_OK
        errors = {}
        for in_house_material in in_house_materials:
            serializer = POClubLeftOverMaterialSerializer(data={'po_club': po_club.id,
                                                                'in_house_material': in_house_material.pk,
                                                                'assigned_customer_brand_material': assigned_customer_brand_material.pk,
                                                                'quantity': in_house_material.available_quantity,
                                                                'quantity_units': in_house_material.available_quantity_units})
            
            if serializer.is_valid():
                serializer.save()
                in_house_material.available_quantity = 0
                in_house_material.save()
            else:
                errors[str(in_house_material.id)] = serializer.errors
        if errors == {}:
            data = {'status': 'success'}
        else:
            data = {'status': 'error',
                    'errors': errors}
            return_status = status.HTTP_400_BAD_REQUEST
        return Response(data=data, status=return_status)
    

class POClubLeftOverMaterialAllocationListView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubLeftOverMaterialSerializer
    queryset = POClubLeftOverMaterial.objects.all()
    pagination_class = LargeResultsSetPagination

    def get(self, request, *args, **kwargs):
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        queryset = po_club.poclubleftovermaterial_set.filter(quantity__gt=0)
        queryset = self.paginate_queryset(queryset)
        data = POClubLeftOverMaterialSerializer(queryset, many=True).data
        return Response(data=data)
    

class POClubMaterialLeftOverMaterialAllocationListView(ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubLeftOverMaterialSerializer
    queryset = POClubLeftOverMaterial.objects.all()

    def get(self, request, *args, **kwargs):
        po_club = get_object_or_404(ActualPOClub, pk=kwargs['po_club_id'])
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=kwargs['customer_brand_material_id'])
        queryset = po_club.poclubleftovermaterial_set.filter(in_house_material__grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material=customer_brand_material, quantity__gt=0)
        data = POClubLeftOverMaterialSerializer(queryset, many=True).data
        return Response(data=data)
    

class POClubLeftOverMaterialDeleteView(DestroyAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = POClubLeftOverMaterialSerializer
    queryset = POClubLeftOverMaterial.objects.all()

    def delete(self, request, *args, **kwargs):
        po_club_left_over_material = get_object_or_404(POClubLeftOverMaterial, pk=kwargs['po_club_left_over_material_id'])
        in_house_material = po_club_left_over_material.in_house_material
        in_house_material.available_quantity = po_club_left_over_material.quantity
        in_house_material.save()
        po_club_left_over_material.delete()
        return Response(data={'status': 'Success'})
    

class OrderSpecificMaterialsDetailListView(RetrieveUpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, ]
    serializer_class = OrderSpecificMaterialsDetailSerializer
    queryset = InHouseMaterial.objects.all()

    def get(self, request, *args, **kwargs):
        in_house_material = get_object_or_404(InHouseMaterial, id=kwargs['pk'], parent_material=None)
        return Response(self.serializer_class(in_house_material).data)
    
    def put(self, request, *args, **kwargs):
        in_house_material = get_object_or_404(InHouseMaterial, id=kwargs['pk'])
        available_quantity = request.data.get('available_quantity', None)
        excess_quantity = request.data.get('excess_quantity', None)
        bulk_savings = request.data.get('bulk_savings', None)
        cutting_savings = request.data.get('cutting_savings', None)
        production_savings = request.data.get('production_savings', None)

        if excess_quantity:
            in_house_material.available_quantity = excess_quantity['quantity']
            in_house_material.save()
        elif available_quantity:
            in_house_material.available_quantity = available_quantity['quantity']
            in_house_material.save()
        for savings in [bulk_savings, cutting_savings, production_savings]:
            for saving in savings:
                in_house_material_saving = get_object_or_none(InHouseMaterial, {'id': saving['id']})
                if in_house_material_saving:
                    if in_house_material_saving.parent_material == in_house_material:
                        in_house_material_saving.available_quantity = saving['available_quantity']['quantity']
                        in_house_material_saving.save()
        return Response(self.serializer_class(in_house_material).data)



class SearchInHouseMaterialBarcodeView(RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, ]
    serializer_class = OrderSpecificMaterialsDetailSerializer
    queryset = InHouseMaterial.objects.all()

    def get(self, request, *args, **kwargs):
        data = []
        search_text = request.GET.get('search_text', None)
        queryset = InHouseMaterial.objects.filter(barcode__contains=search_text)
        queryset = queryset[:20]
        for in_house_material in queryset:
            data.append({
                'id': in_house_material.parent_material.id if in_house_material.parent_material else in_house_material.id,
                'barcode': in_house_material.barcode
            })
        return Response(data)
    

class LeftOverMaterialStateListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request):
        state_list = []
        for choice in InHouseMaterialVerification.STATE_CHOICES:
            state_list.append({"id": choice[0], "name": choice[1]})
        return Response(state_list)
    

class LeftOverMaterialStateCountView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request):
        data = {}
        pending_count = InHouseMaterialVerification.objects.filter(state=InHouseMaterialVerification.PENDING_STATE).count()
        in_progress_count = InHouseMaterialVerification.objects.filter(state=InHouseMaterialVerification.IN_PROGRESS_STATE).count()
        complete_count = InHouseMaterialVerification.objects.filter(state=InHouseMaterialVerification.COMPLETE_STATE).count()
        canceled_count = InHouseMaterialVerification.objects.filter(state=InHouseMaterialVerification.CANCELED_STATE).count()
        data = {
            'pending':pending_count,
            'in_progress':in_progress_count,
            'complete':complete_count,
            'canceled':canceled_count,
        }
        return Response(data)
    

class WarehouseListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request):
        data = []
        warehouses = PlantWarehouse.objects.all()
        for warehouse in warehouses:
            data.append({
                'id':warehouse.id,
                'name':'%s - %s ' % (warehouse.plant.name, warehouse.warehouse_name)
            })
        return Response(data)
    

class LeftOverMaterialShadeListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        data = []
        verification_material_id = self.kwargs.get('inhouse_material_verification_material_id', None)
        verification_material = get_object_or_404(InHouseMaterialVerificationMaterial, pk=verification_material_id)
        po_club = verification_material.attached_po_club
        if po_club:
            po_club_shades = POClubShade.objects.filter(
                po_club=po_club,
                material=verification_material.inhouse_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material
            )
            for shade in po_club_shades:
                data.append({
                    'id': shade.id,
                    'shade_name': shade.shade_name,
                    'shade_swatch': FileAttachmentSerializer(shade.shade_swatch, many=False).data
                })

        return Response(data)


class LeftOverMaterialVerificationListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request):
        state = request.query_params.get('state', None)
        verification_materials = InHouseMaterialVerification.objects.filter(state=state)
        data = InHouseMaterialVerificationSerializer(verification_materials, many=True).data
        return Response(data)
    

class LeftOverMaterialVerificationDetailView(RetrieveAPIView):
    permission_classes = (HasPermission,)
    serializer_class = InHouseMaterialVerificationSerializer
    queryset = InHouseMaterialVerification.objects.all()

    
class LeftOverMaterialVerificationMaterialListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, inhouse_material_verification_id):
        response = {}
        verification = get_object_or_404(InHouseMaterialVerification, pk=inhouse_material_verification_id)
        response = {
            'inhouse_material_verification': InHouseMaterialVerificationSerializer(verification, many=False).data,
            'verification_type': verification.verification_type,
            'frontend_url': verification.frontend_url,
            'data': []
        }
        CustomerBrandMaterialBasicSerializer
        material_ids = InHouseMaterialVerificationMaterial.objects.filter(inhouse_material_verification_id=inhouse_material_verification_id).values_list('inhouse_material__supplier_material__customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        for material in materials:
            rolls = InHouseMaterialVerificationMaterial.objects.filter(inhouse_material_verification_id=inhouse_material_verification_id, inhouse_material__supplier_material__customer_brand_material=material).order_by('id')
            response['data'].append({
                'id': material.id,
                'attributes': material.get_attributes(),
                'headers': UserDefinedMaterial.get_material_headers(material.material_detail.generic_material.user_material.name),
                'rolls': InHouseMaterialVerificationMaterialSerializer(rolls, many=True).data
            })
        return Response(response)


class LeftOverMaterialUpdateListView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    editable_states = [InHouseMaterialVerification.IN_PROGRESS_STATE, ]

    def get_object_current_state(self):
        verification_material_id = self.kwargs.get('inhouse_material_verification_material_id', None)
        verification_material = get_object_or_404(InHouseMaterialVerificationMaterial, pk=verification_material_id)
        return verification_material.inhouse_material_verification.state

    def validate_data(self, usable_quantity, shade_id, shade_name, shade_swatch):
        from shared.helpers.field_validators import valid_float_field
        errors = {}
        if not usable_quantity and not valid_float_field(usable_quantity):
            errors['usable_quantity'] = 'Enter a number'
        if not shade_id and not shade_name:
            errors['shade'] = 'Select a shade'
        if not shade_swatch:
            errors['swatch'] = 'Select a shade swatch'
        return errors

    def post(self, request, *args, **kwargs):
        data = []
        verification_material_id = self.kwargs.get('inhouse_material_verification_material_id', None)
        verification_material = get_object_or_404(InHouseMaterialVerificationMaterial, pk=verification_material_id)
        usable_quantity = request.data.get('usable_quantity', None)
        shade_id = request.data.get('shade', None)
        shade_name = request.data.get('shade_name', None)
        shade_swatch = request.data.get('swatch', None)
        color_tone_id = request.data.get('color_tone', None)
        errors = self.validate_data(usable_quantity, shade_id, shade_name, shade_swatch)
        if not errors:
            verification_material.usable_quantity = usable_quantity
            if shade_id:
                shade = get_object_or_404(POClubShade, pk=shade_id)
            else:
                shade, created = POClubShade.objects.get_or_create(
                    po_club=verification_material.po_leftover_material.po_club,
                    material=verification_material.po_leftover_material.assigned_customer_brand_material,
                    shade_name=shade_name
                )
            shade.shade_swatch_id = shade_swatch['id']
            shade.save()
            verification_material.shade = shade
            if color_tone_id:
                color_tone = get_object_or_404(FabricColorTone, pk=color_tone_id)
                verification_material.color_tone = color_tone
            verification_material.save()
            data = InHouseMaterialVerificationMaterialSerializer(verification_material, many=False).data
            http_response = Response(data)
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class LeftOverMaterialStateUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        data = []
        verification_id = self.kwargs.get('inhouse_material_verification_id', None)
        inhouse_material_verification = get_object_or_404(InHouseMaterialVerification, pk=verification_id)
        new_state = request.data.get('new_state', None)
        plant_warehouse_id = request.data.get('plant_warehouse_id', None)
        inhouse_material_verification.move_to_next_state(new_state)
        inhouse_material_verification.warehouse_id = plant_warehouse_id
        inhouse_material_verification.save()
        data = InHouseMaterialVerificationSerializer(inhouse_material_verification, many=False).data
        http_response = Response(data)
        return http_response


