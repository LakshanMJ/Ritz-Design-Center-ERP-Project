from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from supplier_po.models import SupplierPOGRNMaterialDetail, SupplierPOGRN
from shared.models import PlantWarehouse, PlantWarehouseRack, PlantWarehouseRackBin, Customer, InHouseMaterial, CustomerBrandDepartment, IssueNoteMaterial, IssueNote
from marketing.models import PurchaseOrder, PurchaseOrderAllocatedMaterial, CustomerBrandMaterial, OrderCostingVersion, ActualPOClub, PurchaseOrderBom
from materials.models import SupplierInquiryMaterialCode, Supplier
from .serializers import PlantWarehouseMainSerializer, PlantWarehouseRackMainSerializer, PlantWarehouseRackDetailSerializer, PlantWarehouseRackBinMainSerializer, PlantWarehouseRackBinDetailSerializer,\
    SupplierInquiryMaterialCodeSerializer, CustomerBrandMaterialCodeSerializer, InHouseMaterialSerializer, PurchaseOrderAllocationSerializer, PurchaseOrderAllocationDetailSerializer,\
    InHouseMaterialBasicSerializer, InHouseMaterialSupplierPOGRNSerializer, POClubMetaDataSearchableListSerializer, IssueNoteMaterialCreateSerializer, IssueNoteCreateSerializer, IssueNoteListSerializer,\
    IssueNoteDetailSerializer
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.utils import calculate_queryset_total_normalized_quantity, convert_quantity_to_unit, calculate_queryset_total_amount_normalized_amount, convert_per_unit_cost
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper, PerMeasuringUnitHelper
from materials.models import UserDefinedMaterial
from shared.helpers import currency_helper
from shared.permissions.view_permissions import HasPermission
from shared.permissions.roles import STORES_ADMIN_ROLE, STORES_EDITOR_ROLE
from django.shortcuts import get_object_or_404
from django.db.models import Q
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.utils import get_object_or_none
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from datetime import timedelta
from django.db import transaction

class NormalizedTotalQuantityPrice:

    def get_total_initial_quantity_value_for_material(self, in_house_material_queryset):

        customer_brand_material_ids = {material.customer_brand_material.id for material in in_house_material_queryset if material.customer_brand_material is not None}
        total_initial_quantity = 0
        normalized_unit = None
        initial_quantity_unit_price = None
        total_initial_quantity_price = 0
        for customer_brand_material_id in customer_brand_material_ids:
            customer_brand_material = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
            normalized_unit = customer_brand_material.material_normalized_measuring_unit
            in_house_material_queryset_for_customer_brand_material = in_house_material_queryset.filter(customer_brand_material__id=customer_brand_material_id)
            for in_house_material in in_house_material_queryset_for_customer_brand_material:
                if in_house_material.quantity is not None and in_house_material.quantity_units is not None:
                    initial_quantity = convert_quantity_to_unit(normalized_unit, in_house_material.quantity, in_house_material.quantity_units)['quantity']
                    initial_quantity_unit_price = convert_per_unit_cost(normalized_unit, in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, PerMeasuringUnitHelper().get_per_unit_measuring_unit(in_house_material.quantity_units))['cost']
                else:
                    initial_quantity = 0
                    initial_quantity_unit_price = 0
                total_initial_quantity += initial_quantity
                total_initial_quantity_price += initial_quantity*initial_quantity_unit_price

        return total_initial_quantity, normalized_unit, initial_quantity_unit_price, total_initial_quantity_price
    
    def get_total_available_quantity_value_for_material(self, in_house_material_queryset):
        
        customer_brand_material_ids = {material.customer_brand_material.id for material in in_house_material_queryset if material.customer_brand_material is not None}
        total_available_quantity = 0
        normalized_unit = None
        available_quantity_unit_price = None
        total_available_quantity_price = 0
        for customer_brand_material_id in customer_brand_material_ids:
            customer_brand_material = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
            normalized_unit = customer_brand_material.material_normalized_measuring_unit
            in_house_material_queryset_for_customer_brand_material = in_house_material_queryset.filter(customer_brand_material__id=customer_brand_material_id)
            for in_house_material in in_house_material_queryset_for_customer_brand_material:
                if in_house_material.available_quantity is not None and in_house_material.available_quantity_units is not None:
                    available_quantity = convert_quantity_to_unit(normalized_unit, in_house_material.available_quantity, in_house_material.available_quantity_units)['quantity']
                    available_quantity_unit_price = convert_per_unit_cost(normalized_unit, in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, PerMeasuringUnitHelper().get_per_unit_measuring_unit(in_house_material.available_quantity_units))['cost']
                else:
                    available_quantity = 0
                    available_quantity_unit_price = 0
                total_available_quantity += available_quantity
                total_available_quantity_price += available_quantity*available_quantity_unit_price
        
        return total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price
    
    def get_total_remaining_quantity_value_for_material(self, allocated_material_queryset):
        
        customer_brand_material_ids = {allocated_material.in_house_material.customer_brand_material.id for allocated_material in allocated_material_queryset if allocated_material.in_house_material.customer_brand_material is not None}
        total_remaining_quantity = 0
        normalized_unit = None
        allocated_quantity_unit_price = None
        used_quantity_unit_price = None
        total_remaining_quantity_price = 0
        for customer_brand_material_id in customer_brand_material_ids:
            customer_brand_material = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
            normalized_unit = customer_brand_material.material_normalized_measuring_unit
            allocated_material_queryset_for_customer_brand_material = allocated_material_queryset.filter(in_house_material__customer_brand_material__id=customer_brand_material_id)
            for allocated_material in allocated_material_queryset_for_customer_brand_material:
                if allocated_material.allocated_quantity is not None and allocated_material.allocated_quantity_units is not None:
                    allocated_quantity = convert_quantity_to_unit(normalized_unit, allocated_material.allocated_quantity, allocated_material.allocated_quantity_units)['quantity']
                    allocated_quantity_unit_price = convert_per_unit_cost(normalized_unit, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, PerMeasuringUnitHelper().get_per_unit_measuring_unit(allocated_material.allocated_quantity_units))['cost']
                else:
                    allocated_quantity = 0
                    allocated_quantity_unit_price = 0
                if allocated_material.used_quantity is not None and allocated_material.used_quantity_units is not None:
                    used_quantity = convert_quantity_to_unit(normalized_unit, allocated_material.used_quantity, allocated_material.used_quantity_units)['quantity']
                    used_quantity_unit_price = convert_per_unit_cost(normalized_unit, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, PerMeasuringUnitHelper().get_per_unit_measuring_unit(allocated_material.allocated_quantity_units))['cost']
                else:
                    used_quantity = 0
                    used_quantity_unit_price = 0
                total_remaining_quantity += allocated_quantity - used_quantity
                total_remaining_quantity_price += allocated_quantity*allocated_quantity_unit_price - used_quantity*used_quantity_unit_price
                
        return total_remaining_quantity, normalized_unit, allocated_quantity_unit_price, total_remaining_quantity_price


class PlantWarehouseListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouse.objects.all().order_by('id')
    serializer_class = PlantWarehouseMainSerializer


class PlantWarehouseCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    model = PlantWarehouse
    serializer_class = PlantWarehouseMainSerializer
    

class PlantWarehouseUpdateView(generics.UpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouse.objects.all().order_by('id')
    serializer_class = PlantWarehouseMainSerializer
    lookup_field = 'pk'


class PlantWarehouseDeleteView(generics.DestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE,]
    queryset = PlantWarehouse.objects.all().order_by('id')
    serializer_class = PlantWarehouseMainSerializer
    lookup_field = 'pk'


class PlantWarehouseDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouse.objects.all()
    serializer_class = PlantWarehouseMainSerializer
    lookup_field = 'pk'


class PlantWarehouseRackCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    model = PlantWarehouseRack
    serializer_class = PlantWarehouseRackMainSerializer


class PlantWarehouseRackListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = PlantWarehouseRackMainSerializer

    def get_queryset(self):
        warehouse_id = self.kwargs.get('warehouse')
        return PlantWarehouseRack.objects.filter(warehouse__id=warehouse_id).order_by('id')


class PlantWarehouseRackUpdateView(generics.UpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouseRack.objects.all().order_by('id')
    serializer_class = PlantWarehouseRackMainSerializer
    lookup_field = 'pk'


class PlantWarehouseRackDeleteView(generics.DestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE,]
    queryset = PlantWarehouseRack.objects.all().order_by('id')
    serializer_class = PlantWarehouseRackMainSerializer
    lookup_field = 'pk'


class PlantWarehouseRackDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouseRack.objects.all()
    serializer_class = PlantWarehouseRackDetailSerializer
    lookup_field = 'pk'


class PlantWarehouseRackBinCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    model = PlantWarehouseRackBin
    serializer_class = PlantWarehouseRackBinMainSerializer


class PlantWarehouseRackBinListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = PlantWarehouseRackBinMainSerializer

    def get_queryset(self):
        warehouse = self.kwargs.get("warehouse")
        queryset = PlantWarehouseRackBin.objects.filter(warehouse_rack__warehouse__id = warehouse).order_by('warehouse_rack__warehouse__plant__name', 'warehouse_rack__rack_number', 'id')
        return queryset


class PlantWarehouseRackBinUpdateView(generics.UpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouseRackBin.objects.all().order_by('id')
    serializer_class = PlantWarehouseRackBinMainSerializer
    lookup_field = 'pk'


class PlantWarehouseRackBinDeleteView(generics.DestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE,]
    queryset = PlantWarehouseRackBin.objects.all().order_by('id')
    serializer_class = PlantWarehouseRackBinMainSerializer
    lookup_field = 'pk'


class PlantWarehouseRackBinDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = PlantWarehouseRackBin.objects.all()
    serializer_class = PlantWarehouseRackBinDetailSerializer
    lookup_field = 'pk'


class PlantWarehouseRackBinCustomerAllocationView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def post(self, request, *args, **kwargs):
        customer_id = request.data.get('customer_id')
        bin_ids = request.data.get('bins', [])
        
        customer_object = get_object_or_404(Customer, id = customer_id)
        
        PlantWarehouseRackBin.objects.filter(id__in=bin_ids).update(customer=customer_object)
        PlantWarehouseRackBin.objects.filter(customer__id=customer_object.id).exclude(id__in = bin_ids).update(customer=None)
        
        return(Response(f"{', '.join(map(str, bin_ids))} bins are allocated to {customer_object.name}"))


class PlantWarehouseRackBinPaginatedListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    serializer_class = PlantWarehouseRackBinMainSerializer
    queryset = PlantWarehouseRackBin.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination


class CustomerCostingVersionIDs(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_costing_version_ids(self, customer_id=None, search=None):

        if customer_id:
            order_costing_versions = OrderCostingVersion.objects.filter(order__customer__id=customer_id)
        else:
            order_costing_versions = OrderCostingVersion.objects.all()

        if search:
            order_costing_versions = [
                version for version in order_costing_versions
                if search.lower() in version.short_code.lower()
            ]

        order_costing_version_list = []

        for order_costing_version in order_costing_versions:
            costing_version_id = order_costing_version.id
            costing_version_number = order_costing_version.version_display_number
            costing_ritz_code = order_costing_version.ritz_code
            costing_dispay_number = order_costing_version.display_number
            costing_short_code = order_costing_version.short_code
            costing_long_code = order_costing_version.long_code
            costing_version_created_date = order_costing_version.created

            order_costing_version_list.append({"costing_version_id":costing_version_id,
                                               "version_number":costing_version_number,
                                               "ritz_code":costing_ritz_code,
                                               "disply_number":costing_dispay_number,
                                               "short_code":costing_short_code,
                                               "long_code":costing_long_code,
                                               "version_created_date":costing_version_created_date})

        return order_costing_version_list

    def get(self, request):

        customer_id = request.query_params.get("customer", None)
        search = request.query_params.get("search", None)

        data = self.get_costing_version_ids(customer_id, search)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)

        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)

        return Response(data)


class CustomerCostingVersionActualPOClubIDs(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_actual_po_club_ids(self, customer_id=None, costing_id=None, search=None):

        if customer_id:
            customer_actual_po_clubs = ActualPOClub.objects.filter(pre_costing__order__customer__id = customer_id)
        else:
            customer_actual_po_clubs = ActualPOClub.objects.all()

        if costing_id:
            customer_costing_actual_po_clubs = customer_actual_po_clubs.filter(pre_costing__id = costing_id)
        else:
            customer_costing_actual_po_clubs = customer_actual_po_clubs

        if search:
            customer_costing_actual_po_clubs = [
                po_club for po_club in customer_costing_actual_po_clubs
                if search.lower() in po_club.short_code.lower()
            ]

        actual_po_clubs_list = []

        for actual_po_club in customer_costing_actual_po_clubs:
            actual_po_club_id = actual_po_club.id
            actual_po_club_display_number = actual_po_club.display_number
            actual_po_club_short_code = actual_po_club.short_code
            actual_po_clubs_list.append({"po_club_id":actual_po_club_id, "display_number":actual_po_club_display_number, "short_code":actual_po_club_short_code})

        return actual_po_clubs_list

    def get(self,request):
        customer_id = request.query_params.get("customer", None)
        costing_id = request.query_params.get("costing", None)
        search =  request.query_params.get("search", None)

        data = self.get_actual_po_club_ids(customer_id, costing_id, search)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)

        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)

        return Response(data)


class FinanceWarehouseCustomerDetails(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_customer_brand_material_details(self, customer_brand_material_id, allocated_material_list):

        customer_brand_material = CustomerBrandMaterial.objects.get(id = customer_brand_material_id)
        customer_brand_material_details = {}
        customer_brand_material_details["id"] = customer_brand_material.id
        customer_brand_material_details["name"] = customer_brand_material.material_detail.generic_material.user_material.name
        customer_brand_material_details["category"] = customer_brand_material.material_detail.generic_material.user_material.category
        customer_brand_material_details["attributes"] = customer_brand_material.get_attributes()
        material_name = customer_brand_material.material_detail.generic_material.user_material.name
        customer_brand_material_details["headers"] = customer_brand_material.material_detail.generic_material.user_material.get_material_headers(material_name)

        customer_brand_material_quantity = 0
        customer_brand_material_price = 0

        for allocated_material in allocated_material_list:

            customer_brand_material_quantity += allocated_material.allocated_quantity
            allocated_material_price = allocated_material.allocated_quantity*allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
            customer_brand_material_price += allocated_material_price

        customer_brand_material_details["material_quantity"] = round(customer_brand_material_quantity,5)
        customer_brand_material_details["material_price"] = round(customer_brand_material_price,5)

        return customer_brand_material_details

    def get_material_rack_bin_details(self, allocated_material_list):

        allocated_rack_bins_details = []

        for allocated_material in allocated_material_list:
            #if isinstance(allocated_material, PurchaseOrderAllocatedMaterial):
            allocated_bin = allocated_material.in_house_material.warehouse_bin

            allocated_rack = None
            if allocated_bin:
                allocated_rack = allocated_bin.warehouse_rack

            if allocated_bin and allocated_rack:
                allocated_rack_detail = {"id": allocated_rack.id, "display_number": allocated_rack.display_number, "warehouse_name": allocated_rack.warehouse.warehouse_name,
                                         "plant": allocated_rack.warehouse.plant.name, "bin_details": [{"id": allocated_bin.id, "display_number": allocated_bin.display_number}]}

                rack_exists = False
                for existing_rack_detail in allocated_rack_bins_details:
                    if existing_rack_detail["id"] == allocated_rack_detail["id"]:
                        existing_bin_ids = [bin_info["id"] for bin_info in existing_rack_detail["bin_details"]]
                        rack_exists = True
                        if allocated_rack_detail["bin_details"][0]["id"] not in existing_bin_ids:
                            existing_rack_detail["bin_details"].append(allocated_rack_detail["bin_details"][0])
                        break

                if not rack_exists:
                    allocated_rack_bins_details.append(allocated_rack_detail)

        return allocated_rack_bins_details

    def finance_warehouse_customer_costing_details(self, customer_id=None, costing_version_id=None, po_club_id=None, category=None):

        if customer_id:
            customer_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__customer__id=customer_id)
        else:
            customer_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()

        if costing_version_id:
            customer_costing_version_allocated_materials = customer_allocated_materials.filter(Q(purchase_order_bom__purchase_order__costing_version__id=costing_version_id) | Q(purchase_order_bom__purchase_order__actual_po_club__pre_costing__id=costing_version_id))
        else:
            customer_costing_version_allocated_materials = customer_allocated_materials

        if po_club_id:
            customer_costing_version_po_club_allocated_materials = customer_costing_version_allocated_materials.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
        else:
            customer_costing_version_po_club_allocated_materials = customer_costing_version_allocated_materials

        if category:
            customer_costing_version_po_club_category_allocated_materials = customer_costing_version_po_club_allocated_materials.filter(purchase_order_bom__material__material_detail__generic_material__user_material__category=category)
        else:
            customer_costing_version_po_club_category_allocated_materials = customer_costing_version_po_club_allocated_materials


        customer_brand_material_ids = {allocated_material.purchase_order_bom.material.id for allocated_material in customer_costing_version_po_club_category_allocated_materials}
        customer_brand_materials = []

        for customer_brand_material_id in customer_brand_material_ids:
            customer_brand_allocated_materials = customer_costing_version_po_club_category_allocated_materials.filter(purchase_order_bom__material__id = customer_brand_material_id)
            customer_brand_material_details = self.get_customer_brand_material_details(customer_brand_material_id, customer_brand_allocated_materials)
            customer_brand_material_details["rack_details"] = self.get_material_rack_bin_details(customer_brand_allocated_materials)
            customer_brand_materials.append(customer_brand_material_details)

        return customer_brand_materials

    def get(self, request):

        customer_id = request.query_params.get("customer", None)
        costing_version_id = request.query_params.get("costing", None)
        po_club_id = request.query_params.get("po_club", None)
        category = request.query_params.get("category", None)
        data = self.finance_warehouse_customer_costing_details(customer_id, costing_version_id, po_club_id, category)

        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)

        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)

        return Response(data)


class WarehouseMaterialCustomerwiseMaterial(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_customer_details(self, warehouse_id=None, category=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(purchase_order_bom__material__material_detail__generic_material__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials

        customer_ids = {in_house_material.customer_brand_material.material_code.customer_brand.customer.id for in_house_material in warehouse_in_house_materials_by_category if in_house_material.customer_brand_material is not None}

        customer_wise_material_details = []
        total_price = 0
        if customer_ids:
            for customer_id in customer_ids:
                customer_material_detail = {}
                customer_object = Customer.objects.get(id=customer_id)
                customer_material_detail["id"] = customer_id
                customer_material_detail["customer"] = customer_object.name
                customer_material_detail["customer_brand"] = customer_object.brands.name

                warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)

                categories = {in_house_material.customer_brand_material.material_code.material_definition.user_material.category for in_house_material in warehouse_in_house_materials_by_category_by_customer}
                category_wise_material_details = []
                if categories:
                    for category in categories:
                        category_total_price = 0
                        category_material_detail = {}
                        user_material_object = UserDefinedMaterial.objects.filter(category=category).first()
                        category_material_detail["category"] = category
                        category_material_detail["category_display"] = user_material_object.get_category_display()

                        warehouse_in_house_materials_by_category_by_customer_by_category = warehouse_in_house_materials_by_category_by_customer.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
                        warehouse_po_allocated_materials_by_category_by_customer_by_category = warehouse_po_allocated_materials_by_category_by_customer.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
                        
                        materials = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_category}
                        material_wise_material_details = []
                        if materials:
                            for material in materials:
                                material_detail = {}
                                material_detail["material"] = material

                                warehouse_in_house_materials_by_category_by_customer_by_category_by_material = warehouse_in_house_materials_by_category_by_customer_by_category.filter(customer_brand_material__material_code__material_definition__user_material__material=material)
                                warehouse_po_allocated_materials_by_category_by_customer_by_category_by_material = warehouse_po_allocated_materials_by_category_by_customer_by_category.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material)

                                material_detail["rack_details"] = FinanceWarehouseCustomerDetails().get_material_rack_bin_details(warehouse_po_allocated_materials_by_category_by_customer_by_category_by_material)

                                total_available_quantity = 0
                                total_available_quantity_price = 0
                                for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_category_by_material:
                                    if in_house_material.available_quantity_units != "pieces":
                                        in_house_material_available_quantity = in_house_material.normalized_available_quantity
                                        unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'available_quantity_units')['cost']
                                        quantity_units = MaterialUnitHelper.METERS_UNIT
                                    else:
                                        in_house_material_available_quantity = in_house_material.available_quantity
                                        if in_house_material_available_quantity is None:
                                            in_house_material_available_quantity = 0
                                        unit_price = in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT
                                    total_available_quantity += in_house_material_available_quantity
                                    total_available_quantity_price += in_house_material_available_quantity*unit_price

                                total_remaining_allocated_material_qunatity = 0
                                total_remaining_allocated_material_qunatity_price = 0
                                for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_category_by_material:
                                    if allocated_material.allocated_quantity_units != "pieces":
                                        allocated_material_quantity = allocated_material.normalized_allocated_quantity["quantity"]
                                        allocated_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'allocated_quantity_units')['cost']
                                        used_material_quantity = allocated_material.normalized_used_quantity["quantity"]
                                        used_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'used_quantity_units')['cost']
                                        remaining_allocated_material_qunatity_price = allocated_material_quantity*allocated_material_unit_price - used_material_quantity*used_material_unit_price
                                        quantity_units = MaterialUnitHelper.METERS_UNIT_DISPLAY
                                    else:
                                        allocated_material_quantity = allocated_material.allocated_quantity
                                        if allocated_material_quantity is None:
                                            allocated_material_quantity = 0
                                        used_material_quantity = allocated_material.used_quantity
                                        if used_material_quantity is None:
                                            used_material_quantity = 0
                                        allocated_material_unit_price = allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        remaining_allocated_material_qunatity_price = (allocated_material_quantity-used_material_quantity)*allocated_material_unit_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT_DISPLAY
                                    remaining_allocated_material_qunatity = allocated_material_quantity - used_material_quantity
                                    total_remaining_allocated_material_qunatity += remaining_allocated_material_qunatity
                                    total_remaining_allocated_material_qunatity_price += remaining_allocated_material_qunatity_price

                                material_detail["quantity"] = total_available_quantity + total_remaining_allocated_material_qunatity
                                material_detail["quantity_unit"] = quantity_units
                                material_detail["price"] = total_available_quantity_price + total_remaining_allocated_material_qunatity_price
                                material_detail["price_unit"] = "USD"
                                
                                total_price += material_detail["price"]
                                category_total_price +=  material_detail["price"]
                                material_wise_material_details.append(material_detail)

                        category_material_detail["material_wise_material_details"] = material_wise_material_details
                        category_material_detail["total_price"] = category_total_price
                        category_material_detail["total_price_unit"] = "USD"
                        category_wise_material_details.append(category_material_detail)

                customer_material_detail["category_wise_material_details"] = category_wise_material_details
                customer_wise_material_details.append(customer_material_detail)

        return customer_wise_material_details, total_price

    def get(self, request, *args, **kwargs):

        warehouse_id = request.query_params.get("warehouse_id", None)
        category = request.query_params.get("category", None)
        customer_wise_material_details, total_price = self.get_warehouse_customer_details(warehouse_id, category)

        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(customer_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data={"total_price": total_price, "total_price_unit": "USD"})


class WarehouseMaterialCustomerCostingwiseDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_customer_costing_details(self, warehouse_id=None, category=None, customer_id=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(purchase_order_bom__material__material_detail__generic_material__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if customer_id:
            warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
            warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
        else:
            warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category
        
        costing_ids = {allocated_material.purchase_order_bom.purchase_order.marketing_costing.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer}
        costing_wise_material_details = []
        total_costing_price = 0
        if costing_ids:
            for costing_id in costing_ids:
                costing_material_detail = {}
                costing_objcet = OrderCostingVersion.objects.get(id=costing_id)
                costing_material_detail["costing_id"] = costing_id
                costing_material_detail["disply_number"] = costing_objcet.display_number
                costing_material_detail["costing_name"] = costing_objcet.name
                costing_material_detail["version_disply_number"] = costing_objcet.version_display_number
                costing_material_detail["short_code"] = costing_objcet.short_code
                costing_material_detail["long_code"] = costing_objcet.long_code
                costing_material_detail["ritz_code"] = costing_objcet.ritz_code
                costing_material_detail["order_id"] = costing_objcet.order.id

                warehouse_po_allocated_materials_by_category_by_customer_by_costing = warehouse_po_allocated_materials_by_category_by_customer.filter(purchase_order_bom__purchase_order__marketing_costing__id=costing_id)
                in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing}
                warehouse_in_house_materials_by_category_by_customer_by_costing = warehouse_in_house_materials_by_category_by_customer.filter(id__in=list(in_house_material_ids))

                categories = {in_house_material.customer_brand_material.material_code.material_definition.user_material.category for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing}
                category_wise_material_details = []
                if categories:
                    for category in categories:
                        total_category_price = 0
                        category_material_detail = {}
                        user_material_object = UserDefinedMaterial.objects.filter(category=category).first()
                        category_material_detail["category"] = category
                        category_material_detail["category_display"] = user_material_object.get_category_display()

                        warehouse_in_house_materials_by_category_by_customer_by_costing_by_category = warehouse_in_house_materials_by_category_by_customer_by_costing.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
                        warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_category = warehouse_po_allocated_materials_by_category_by_customer_by_costing.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)

                        materials = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_category}
                        material_wise_material_details = []
                        if materials:
                            for material in materials:
                                material_detail = {}
                                material_detail["material"] = material

                                warehouse_in_house_materials_by_category_by_customer_by_costing_by_category_by_costing = warehouse_in_house_materials_by_category_by_customer_by_costing_by_category.filter(customer_brand_material__material_code__material_definition__user_material__material=material)
                                warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_category_by_costing = warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_category.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material)

                                material_detail["rack_detail"] = FinanceWarehouseCustomerDetails().get_material_rack_bin_details(warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_category_by_costing)

                                total_available_quantity = 0
                                total_available_quantity_price = 0
                                for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_category_by_costing:
                                    if in_house_material.available_quantity_units != "pieces":
                                        in_house_material_available_quantity = in_house_material.normalized_available_quantity
                                        unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'available_quantity_units')['cost']
                                        quantity_units = MaterialUnitHelper.METERS_UNIT
                                    else:
                                        in_house_material_available_quantity = in_house_material.available_quantity
                                        if in_house_material_available_quantity is None:
                                            in_house_material_available_quantity = 0
                                        unit_price = in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT
                                    total_available_quantity += in_house_material_available_quantity
                                    total_available_quantity_price += in_house_material_available_quantity*unit_price

                                total_remaining_allocated_material_qunatity = 0
                                total_remaining_allocated_material_qunatity_price = 0
                                for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_category_by_costing:
                                    if allocated_material.allocated_quantity_units != "pieces":
                                        allocated_material_quantity = allocated_material.normalized_allocated_quantity["quantity"]
                                        allocated_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'allocated_quantity_units')['cost']
                                        used_material_quantity = allocated_material.normalized_used_quantity["quantity"]
                                        used_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'used_quantity_units')['cost']
                                        remaining_allocated_material_qunatity_price = allocated_material_quantity*allocated_material_unit_price - used_material_quantity*used_material_unit_price
                                        quantity_units = MaterialUnitHelper.METERS_UNIT_DISPLAY
                                    else:
                                        allocated_material_quantity = allocated_material.allocated_quantity
                                        if allocated_material_quantity is None:
                                            allocated_material_quantity = 0
                                        used_material_quantity = allocated_material.used_quantity
                                        if used_material_quantity is None:
                                            used_material_quantity = 0
                                        allocated_material_unit_price = allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        remaining_allocated_material_qunatity_price = (allocated_material_quantity-used_material_quantity)*allocated_material_unit_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT_DISPLAY
                                    remaining_allocated_material_qunatity = allocated_material_quantity - used_material_quantity
                                    total_remaining_allocated_material_qunatity += remaining_allocated_material_qunatity
                                    total_remaining_allocated_material_qunatity_price += remaining_allocated_material_qunatity_price
                                
                                material_detail["quantity"] = total_available_quantity + total_remaining_allocated_material_qunatity
                                material_detail["quantity_unit"] = quantity_units
                                material_detail["price"] = total_available_quantity_price + total_remaining_allocated_material_qunatity_price
                                material_detail["price_unit"] = "USD"

                                total_costing_price += material_detail["price"]
                                total_category_price += material_detail["price"]
                              
                                material_wise_material_details.append(material_detail)

                        category_material_detail["material_wise_material_details"] = material_wise_material_details
                        category_material_detail["total_price"] = total_category_price
                        category_material_detail["total_price_unit"] = "USD"
                        category_wise_material_details.append(category_material_detail)

                costing_material_detail["category_wise_material_details"] = category_wise_material_details
                costing_wise_material_details.append(costing_material_detail)

        return costing_wise_material_details, total_costing_price
    
    def get(self, request, *args, **kwargs):

        warehouse_id = request.query_params.get("warehouse_id", None)
        category = request.query_params.get("category", None)
        customer_id = request.query_params.get("customer_id", None)
        costing_wise_material_details, total_costing_price = self.get_warehouse_customer_costing_details(warehouse_id, category, customer_id)

        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(costing_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data={"total_price": total_costing_price, "total_price_unit": "USD"})


class WarehouseMaterialCustomerCostingPOClubwiseDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_customer_costing_poclub_details(self, warehouse_id=None, category=None, customer_id=None, costing_id=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(purchase_order_bom__material__material_detail__generic_material__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if customer_id:
            warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
            warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
        else:
            warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category
        if costing_id:
            warehouse_po_allocated_materials_by_category_by_customer_by_costing = warehouse_po_allocated_materials_by_category_by_customer.filter(purchase_order_bom__purchase_order__marketing_costing__id=costing_id)
            in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing}
            warehouse_in_house_materials_by_category_by_customer_by_costing = warehouse_in_house_materials_by_category_by_customer.filter(id__in=list(in_house_material_ids))
        else:
            warehouse_in_house_materials_by_category_by_customer_by_costing = warehouse_in_house_materials_by_category_by_customer
            warehouse_po_allocated_materials_by_category_by_customer_by_costing = warehouse_po_allocated_materials_by_category_by_customer

        po_club_ids = {allocated_material.purchase_order_bom.purchase_order.actual_po_club.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing}
        po_club_wise_material_details = []
        total_po_club_price = 0
        if po_club_ids:
            for po_club_id in po_club_ids:
                po_club_material_detail = {}
                po_club_object = ActualPOClub(id=po_club_id)
                po_club_material_detail["po_club_id"] = po_club_id
                po_club_material_detail["disply_number"] = po_club_object.display_number
                po_club_material_detail["short_code"] = po_club_object.short_code
                po_club_material_detail["long_code"] = po_club_object.long_code

                warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club = warehouse_po_allocated_materials_by_category_by_customer_by_costing.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
                in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club}
                warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club = warehouse_in_house_materials_by_category_by_customer_by_costing.filter(id__in=list(in_house_material_ids))

                categories = {in_house_material.customer_brand_material.material_code.material_definition.user_material.category for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club}
                category_wise_material_details = []
                if categories:
                    for category in categories:
                        total_category_price = 0
                        category_material_detail = {}
                        user_material_object = UserDefinedMaterial.objects.filter(category=category).first()
                        category_material_detail["category"] = category
                        category_material_detail["category_display"] = user_material_object.get_category_display()

                        warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category = warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
                        warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category = warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)

                        materials = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category}
                        material_wise_material_details = []
                        if materials:
                            for material in materials:
                                material_detail = {}
                                material_detail["material"] = material

                                warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material = warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category.filter(customer_brand_material__material_code__material_definition__user_material__material=material)
                                warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material = warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material)

                                material_detail["rack_detail"] = FinanceWarehouseCustomerDetails().get_material_rack_bin_details(warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material)

                                total_available_quantity = 0
                                total_available_quantity_price = 0
                                for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material:
                                    if in_house_material.available_quantity_units != "pieces":
                                        in_house_material_available_quantity = in_house_material.normalized_available_quantity
                                        unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'available_quantity_units')['cost']
                                        quantity_units = MaterialUnitHelper.METERS_UNIT
                                    else:
                                        in_house_material_available_quantity = in_house_material.available_quantity
                                        if in_house_material_available_quantity is None:
                                            in_house_material_available_quantity = 0
                                        unit_price = in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT
                                    total_available_quantity += in_house_material_available_quantity
                                    total_available_quantity_price += in_house_material_available_quantity*unit_price

                                total_remaining_allocated_material_qunatity = 0
                                total_remaining_allocated_material_qunatity_price = 0
                                for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material:
                                    if allocated_material.allocated_quantity_units != "pieces":
                                        allocated_material_quantity = allocated_material.normalized_allocated_quantity["quantity"]
                                        allocated_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'allocated_quantity_units')['cost']
                                        used_material_quantity = allocated_material.normalized_used_quantity["quantity"]
                                        used_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'used_quantity_units')['cost']
                                        remaining_allocated_material_qunatity_price = allocated_material_quantity*allocated_material_unit_price - used_material_quantity*used_material_unit_price
                                        quantity_units = MaterialUnitHelper.METERS_UNIT_DISPLAY
                                    else:
                                        allocated_material_quantity = allocated_material.allocated_quantity
                                        if allocated_material_quantity is None:
                                            allocated_material_quantity = 0
                                        used_material_quantity = allocated_material.used_quantity
                                        if used_material_quantity is None:
                                            used_material_quantity = 0
                                        allocated_material_unit_price = allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        remaining_allocated_material_qunatity_price = (allocated_material_quantity-used_material_quantity)*allocated_material_unit_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT_DISPLAY
                                    remaining_allocated_material_qunatity = allocated_material_quantity - used_material_quantity
                                    total_remaining_allocated_material_qunatity += remaining_allocated_material_qunatity
                                    total_remaining_allocated_material_qunatity_price += remaining_allocated_material_qunatity_price
                                
                                material_detail["quantity"] = total_available_quantity + total_remaining_allocated_material_qunatity
                                material_detail["quantity_unit"] = quantity_units
                                material_detail["price"] = total_available_quantity_price + total_remaining_allocated_material_qunatity_price
                                material_detail["price_unit"] = "USD"
                                
                                total_po_club_price += material_detail["price"]
                                total_category_price += material_detail["price"]
                                material_wise_material_details.append(material_detail)

                        category_material_detail["material_wise_material_details"] = material_wise_material_details
                        category_material_detail["total_price"] = total_category_price
                        category_material_detail["total_price_unit"] = "USD"
                        category_wise_material_details.append(category_material_detail)

                po_club_material_detail["category_wise_material_details"] = category_wise_material_details
                po_club_wise_material_details.append(po_club_material_detail)

        return po_club_wise_material_details, total_po_club_price
    
    def get(self, request, *args, **kwargs):

        warehouse_id = request.query_params.get("warehouse_id", None)
        category = request.query_params.get("category", None)
        customer_id = request.query_params.get("customer_id", None)
        costing_id = request.query_params.get("costing_id", None)
        po_club_wise_material_details, total_po_club_price = self.get_warehouse_customer_costing_poclub_details(warehouse_id, category, customer_id, costing_id)

        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(po_club_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data={"total_price": total_po_club_price, "total_price_unit": "USD"})


class WarehouseMaterialCustomerCostingPOClubItemwiseDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_customer_costing_poclub_material_details(self, warehouse_id=None, category=None, customer_id=None, costing_id=None, po_club_id=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(purchase_order_bom__material__material_detail__generic_material__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if customer_id:
            warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
            warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
        else:
            warehouse_in_house_materials_by_category_by_customer = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_by_customer = warehouse_po_allocated_materials_by_category
        if costing_id:
            warehouse_po_allocated_materials_by_category_by_customer_by_costing = warehouse_po_allocated_materials_by_category_by_customer.filter(purchase_order_bom__purchase_order__marketing_costing__id=costing_id)
            in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing}
            warehouse_in_house_materials_by_category_by_customer_by_costing = warehouse_in_house_materials_by_category_by_customer.filter(id__in=list(in_house_material_ids))
        else:
            warehouse_in_house_materials_by_category_by_customer_by_costing = warehouse_in_house_materials_by_category_by_customer
            warehouse_po_allocated_materials_by_category_by_customer_by_costing = warehouse_po_allocated_materials_by_category_by_customer
        if po_club_id:
            warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club = warehouse_po_allocated_materials_by_category_by_customer_by_costing.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
            in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club}
            warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club = warehouse_in_house_materials_by_category_by_customer_by_costing.filter(id__in=list(in_house_material_ids))
        else:
            warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club = warehouse_in_house_materials_by_category_by_customer_by_costing
            warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club = warehouse_po_allocated_materials_by_category_by_customer_by_costing

        categories = {in_house_material.customer_brand_material.material_code.material_definition.user_material.category for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club}
        category_wise_material_details = []
        total_category_price = 0
        if categories:
            for category in categories:
                category_material_detail = {}
                user_material_object = UserDefinedMaterial.objects.filter(category=category).first()
                category_material_detail["category"] = category
                category_material_detail["category_display"] = user_material_object.get_category_display()

                warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category = warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
                warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category = warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)

                materials = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category}
                material_wise_material_details = []
                if materials:
                    for material in materials:
                        material_detail = {}
                        material_detail["material"] = material

                        warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material = warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category.filter(customer_brand_material__material_code__material_definition__user_material__material=material)
                        warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material = warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material)
                        
                        customer_brand_material_ids = {in_house_material.customer_brand_material.id for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material}
                        item_wise_material_details = []
                        if customer_brand_material_ids:
                            for customer_brand_material_id in customer_brand_material_ids:
                                item_material_detail = {}
                                customer_brand_material_object = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
                                item_material_detail["item"] = customer_brand_material_object.verbose_reference_code
                                material_name = customer_brand_material_object.material_detail.generic_material.user_material.name
                                item_material_detail["item_material_headers"] = customer_brand_material_object.material_detail.generic_material.user_material.get_material_headers(material_name)
                                item_material_detail["item_material_attributes"] = customer_brand_material_object.get_attributes()

                                warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material_by_item = warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material.filter(customer_brand_material__id=customer_brand_material_id)
                                warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material_by_item = warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material.filter(in_house_material__customer_brand_material__id=customer_brand_material_id)

                                item_material_detail["rack_detail"] = FinanceWarehouseCustomerDetails().get_material_rack_bin_details(warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material_by_item)

                                total_available_quantity = 0
                                total_available_quantity_price = 0
                                for in_house_material in warehouse_in_house_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material_by_item:
                                    if in_house_material.available_quantity_units != "pieces":
                                        in_house_material_available_quantity = in_house_material.normalized_available_quantity
                                        unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'available_quantity_units')['cost']
                                        quantity_units = MaterialUnitHelper.METERS_UNIT
                                    else:
                                        in_house_material_available_quantity = in_house_material.available_quantity
                                        if in_house_material_available_quantity is None:
                                            in_house_material_available_quantity = 0
                                        unit_price = in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT
                                    total_available_quantity += in_house_material_available_quantity
                                    total_available_quantity_price += in_house_material_available_quantity*unit_price

                                total_remaining_allocated_material_qunatity = 0
                                total_remaining_allocated_material_qunatity_price = 0
                                for allocated_material in warehouse_po_allocated_materials_by_category_by_customer_by_costing_by_po_club_by_category_by_material_by_item:
                                    if allocated_material.allocated_quantity_units != "pieces":
                                        allocated_material_quantity = allocated_material.normalized_allocated_quantity["quantity"]
                                        allocated_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'allocated_quantity_units')['cost']
                                        used_material_quantity = allocated_material.normalized_used_quantity["quantity"]
                                        used_material_unit_price = convert_per_unit_cost(MaterialUnitHelper.METERS_UNIT, allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price, 'used_quantity_units')['cost']
                                        remaining_allocated_material_qunatity_price = allocated_material_quantity*allocated_material_unit_price - used_material_quantity*used_material_unit_price
                                        quantity_units = MaterialUnitHelper.METERS_UNIT_DISPLAY
                                    else:
                                        allocated_material_quantity = allocated_material.allocated_quantity
                                        if allocated_material_quantity is None:
                                            allocated_material_quantity = 0
                                        used_material_quantity = allocated_material.used_quantity
                                        if used_material_quantity is None:
                                            used_material_quantity = 0
                                        allocated_material_unit_price = allocated_material.in_house_material.grn_material_detail.supplier_po_grn_material.grn_price
                                        remaining_allocated_material_qunatity_price = (allocated_material_quantity-used_material_quantity)*allocated_material_unit_price
                                        quantity_units = MaterialUnitHelper.PIECES_UNIT_DISPLAY
                                    remaining_allocated_material_qunatity = allocated_material_quantity - used_material_quantity
                                    total_remaining_allocated_material_qunatity += remaining_allocated_material_qunatity
                                    total_remaining_allocated_material_qunatity_price += remaining_allocated_material_qunatity_price
                                
                                item_material_detail["quantity"] = total_available_quantity + total_remaining_allocated_material_qunatity
                                item_material_detail["quantity_unit"] = quantity_units
                                item_material_detail["price"] = total_available_quantity_price + total_remaining_allocated_material_qunatity_price
                                item_material_detail["price_unit"] = "USD"

                                total_category_price += item_material_detail["price"]
                                item_wise_material_details.append(item_material_detail)
                        
                        material_detail["item_wise_material_details"] = item_wise_material_details
                        material_wise_material_details.append(material_detail)

                category_material_detail["material_wise_material_details"] = material_wise_material_details
                category_wise_material_details.append(category_material_detail)

        return category_wise_material_details, total_category_price
    
    def get(self, request, *args, **kwargs):

        warehouse_id = request.query_params.get("warehouse_id", None)
        category = request.query_params.get("category", None)
        customer_id = request.query_params.get("customer_id", None)
        costing_id = request.query_params.get("costing_id", None)
        po_club_id = request.query_params.get("po_club_id", None)
        category_wise_material_details, total_category_price = self.get_warehouse_customer_costing_poclub_material_details(warehouse_id, category, customer_id, costing_id, po_club_id)

        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(category_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data={"total_price": total_category_price, "total_price_unit": "USD"})


class SupplierInquiryMaterialCodeView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = SupplierInquiryMaterialCodeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['supplier_material_reference_code']

    def get_queryset(self):
        queryset = SupplierInquiryMaterialCode.objects.all()

        material_category = self.request.query_params.get("category", None)
        supplier_inquiry_material_id = self.request.query_params.get("id", None)

        if material_category:
            queryset = queryset.filter(customer_brand_material__material_detail__generic_material__user_material__category=material_category).order_by('id')
        if supplier_inquiry_material_id:
            queryset = queryset.filter(id=supplier_inquiry_material_id).order_by('id')

        return queryset
       
    def list(self, request, *args, **kwargs):
        data = self.filter_queryset(self.get_queryset())
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)
        if paginated_data is not None:
            serializer = self.get_serializer(paginated_data, many=True)
            return pagination.get_paginated_response(serializer.data, meta_data=None)

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)
    

class CustomerBrandMaterialCodeView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = CustomerBrandMaterialCodeSerializer

    def get_queryset(self):
        queryset = CustomerBrandMaterial.objects.all()

        material_category = self.request.query_params.get("category")
        material_code = self.request.query_params.get("code")
        customer_brand_material_id = self.request.query_params.get("id")

        if material_category:
            queryset = queryset.filter(material_detail__generic_material__user_material__category=material_category).order_by('id')
        if customer_brand_material_id:
           queryset = queryset.filter(id=customer_brand_material_id).order_by('id')
        if material_code:
            queryset = [obj for obj in queryset if material_code.lower() in obj.material_code.verbose_reference_code.lower()]

        return queryset

    def list(self, request, *args, **kwargs):
        data = self.get_queryset()
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)
        if paginated_data is not None:
            serializer = self.get_serializer(paginated_data, many=True)
            return pagination.get_paginated_response(serializer.data, meta_data=None)

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)


class InHouseMaterialListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = InHouseMaterialSerializer

    def get_queryset(self):
        material_category = self.request.query_params.get("category", None)
        if material_category:
            return InHouseMaterial.objects.filter(supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category).order_by('id')
        return InHouseMaterial.objects.all().order_by('id')
    
    def list(self, request, *args, **kwargs):
        data = self.get_queryset()
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)
        if paginated_data is not None:
            serializer = self.get_serializer(paginated_data, many=True)
            return pagination.get_paginated_response(serializer.data, meta_data=None)

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)
    

class InHouseMaterialCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    model = InHouseMaterial
    serializer_class = InHouseMaterialSerializer


class InHouseMaterialUpdateView(generics.UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    queryset = InHouseMaterial.objects.all().order_by('id')
    serializer_class = InHouseMaterialSerializer
    lookup_field = 'pk'


class InHouseMaterialDeleteView(generics.DestroyAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE,]
    queryset = InHouseMaterial.objects.all().order_by('id')
    serializer_class = InHouseMaterialSerializer
    lookup_field = 'pk'


class PurchaseOrderListView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get(self, request, *args, **kwargs):

        customer_brand_material_id = request.query_params.get("customer_brand_material", None)
        po_id = request.query_params.get("po_id", None)
        po_number = request.query_params.get("po", None)

        queryset = PurchaseOrderBom.objects.select_related('purchase_order').all()

        if customer_brand_material_id:
            queryset = queryset.filter(material__id=customer_brand_material_id)
        if po_id:
            queryset = queryset.filter(purchase_order__id=po_id)
        if po_number:
            queryset = [obj for obj in queryset if po_number.lower() in obj.purchase_order.display_number.lower()]

        if isinstance(queryset, list):
            purchase_order_ids = {obj.purchase_order.id for obj in queryset}
        else:
            purchase_order_ids = queryset.values_list('purchase_order__id', flat=True).distinct()

        purchase_orders = PurchaseOrder.objects.filter(id__in=purchase_order_ids).order_by('id')
        purchase_order_list = [{"purchase_order": po.id, "purchase_order_display_number": po.display_number} for po in purchase_orders]

        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(purchase_order_list, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        
        return Response(purchase_order_list)


class PurcahseOrderAlloactionListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = PurchaseOrderAllocationDetailSerializer

    def get_queryset(self):
        material_category = self.request.query_params.get("category", None)
        in_house_material = self.request.query_params.get("inhousematerial", None)

        if material_category:
            material_category_alloacted_material = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category).order_by('id')
        else:
            material_category_alloacted_material = PurchaseOrderAllocatedMaterial.objects.all()

        if in_house_material:
            in_house_material_object = InHouseMaterial.objects.get(id=in_house_material)
            available_quantity = in_house_material_object.available_quantity
            available_quantity_units = in_house_material_object.available_quantity_units
            material_category_in_house_material_allocated_material = material_category_alloacted_material.filter(in_house_material__id=in_house_material).order_by('id')
        else:
            material_category_in_house_material_allocated_material = material_category_alloacted_material

        return available_quantity, available_quantity_units, material_category_in_house_material_allocated_material
    
    def list(self, request, *args, **kwargs):
        available_quantity, available_quantity_units, data = self.get_queryset()
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)
        if paginated_data is not None:
            serializer = self.get_serializer(paginated_data, many=True)
            return pagination.get_paginated_response(serializer.data, meta_data={"available_quantity":available_quantity, "available_quantity_units":available_quantity_units})

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)


class PurchaseOrderAllocationCreateView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def perform_create(self, serializer, bom_object):

        inhouse_material = serializer.validated_data.get('in_house_material')
        allocated_quantity = serializer.validated_data.get('allocated_quantity')

        if inhouse_material and allocated_quantity > 0:
            if allocated_quantity <= inhouse_material.available_quantity:
                inhouse_material.available_quantity -= allocated_quantity
                inhouse_material.save()
                serializer.save(purchase_order_bom=bom_object)
            else:
                raise ValidationError({"allocation_quantity_exceeds":"Quantity allocation exceeds available quantity."})
        else:
            raise ValidationError({"invalid":"Invalid material or allocated quantity."})

    def post(self, request, *args, **kwargs):

        serializer = PurchaseOrderAllocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        purchase_order = request.data.get('purchase_order')
        purchase_order_object = get_object_or_404(PurchaseOrder, id=purchase_order)
        
        customer_brand_material = request.data.get('customer_brand_material')
        customer_brand_material_object = get_object_or_404(CustomerBrandMaterial, id=customer_brand_material)

        purchase_order_bom_object = PurchaseOrderBom.objects.get(purchase_order__id=purchase_order_object.id, material__id=customer_brand_material_object.id)
        if purchase_order_bom_object:
            self.perform_create(serializer, purchase_order_bom_object)
            return Response(serializer.data)
        else:
            raise ValidationError({"bom_not_found":"No BOM entry found for the given material and purchase order."})


class PurchaseOrderAllocationUpdateView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def perform_update(self, editable, serializer, new_quantity, bom_object):

        exsiting_allocation = serializer.instance
        inhouse_material = exsiting_allocation.in_house_material
        previous_allocated_quantity = exsiting_allocation.allocated_quantity
        
        if editable:
            quantity_difference = new_quantity-previous_allocated_quantity
            quantity_gap = abs(quantity_difference)

            if quantity_difference <= 0:
                inhouse_material.available_quantity += quantity_gap
                inhouse_material.save()
                serializer.save(purchase_order_bom=bom_object)
            else:
                if quantity_difference <= inhouse_material.available_quantity:
                    inhouse_material.available_quantity -= quantity_gap
                    inhouse_material.save()
                    serializer.save(purchase_order_bom=bom_object)
                else:
                    raise ValidationError({"allocation_quantity_exceeds":"Quantity allocation exceeds available quantity."})
        else:
            raise ValidationError({"not_editable": "This allocation is not editable."})
                
    def put(self, request, *args, **kwargs):

        print("request.data type:", type(request.data))
        print("request.data.get type:", type(request.data.get))
        po_alloaction_id = request.data.get('id')
        editable = request.data.get('editable') in [True, 'True', 'true', 1, '1']
        po_allocation = get_object_or_404(PurchaseOrderAllocatedMaterial, id=po_alloaction_id)

        serializer = PurchaseOrderAllocationSerializer(instance=po_allocation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        purchase_order = request.data.get('purchase_order')
        purchase_order_object = get_object_or_404(PurchaseOrder, id=purchase_order)

        customer_brand_material = request.data.get('customer_brand_material')
        customer_brand_material_object = get_object_or_404(CustomerBrandMaterial, id=customer_brand_material)

        new_quanity = request.data.get('allocated_quantity')

        purchase_order_bom_object = PurchaseOrderBom.objects.get(purchase_order__id=purchase_order_object.id, material__id=customer_brand_material_object.id)
        if purchase_order_bom_object:
            self.perform_update(editable, serializer, new_quanity, purchase_order_bom_object)
            return Response(serializer.data)
        else:
            raise ValidationError({"bom_not_found":"No BOM entry found for the given material and purchase order."})

            
class PurchaseOrderAllocationDeleteView(generics.DestroyAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE,]
    queryset = PurchaseOrderAllocatedMaterial.objects.all().order_by('id')
    serializer_class = PurchaseOrderAllocationSerializer
    lookup_field = 'pk'

    def perform_destroy(self, instance):

        inhouse_material = instance.in_house_material
        allocated_quantity = instance.allocated_quantity

        inhouse_material.available_quantity += allocated_quantity
        inhouse_material.save()

        instance.delete()


class CustomerBrandMaterialListView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_customer_brand_material_list(self, in_house_material_id=None, purchase_order_id=None, customer_brand_material_id=None, customer_brand_material_code=None):
        
        in_house_material = InHouseMaterial.objects.get(id=in_house_material_id)
        material_name = in_house_material.customer_brand_material.material_detail.generic_material.user_material.name
        queryset = PurchaseOrderBom.objects.filter(material__material_detail__generic_material__user_material__name=material_name)

        if purchase_order_id:
            queryset = queryset.filter(purchase_order__id=purchase_order_id)
        
        customer_brand_material_ids = {obj.material.id for obj in queryset}
        customer_brand_materials = CustomerBrandMaterial.objects.filter(id__in=list(customer_brand_material_ids))

        if customer_brand_material_id:
            customer_brand_materials = customer_brand_materials.filter(id=customer_brand_material_id)
        if customer_brand_material_code:
            customer_brand_materials = [obj for obj in customer_brand_materials if customer_brand_material_code.lower() in obj.material_code.verbose_reference_code.lower()]

        customer_brand_material_details = []
        for customer_brand_material in customer_brand_materials:
            customer_brand_material_details.append({"customer_brand_material":customer_brand_material.id,
                                                    "customer_brand_material_code":customer_brand_material.material_code.verbose_reference_code})
            
        return customer_brand_material_details
    
    def get(self, request, *args, **kwargs):

        in_house_material_id = self.request.query_params.get("in_house_material", None)
        purchase_order_id = self.request.query_params.get("purchase_order", None)
        customer_brand_material_id = self.request.query_params.get("customer_brand_material", None)
        customer_brand_material_code = self.request.query_params.get("customer_brand_material_code", None)

        data = self.get_customer_brand_material_list(in_house_material_id, purchase_order_id, customer_brand_material_id, customer_brand_material_code)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(data, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)

        return Response(data)
    

class WarehouseMaterialSummaryListView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_customer_wise_category_wise_material_detail(self, warehouse_id=None, category=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials

        customer_ids = {in_house_material.customer_brand_material.material_code.customer_brand.customer.id for in_house_material in warehouse_in_house_materials_by_category if in_house_material.customer_brand_material is not None}
        customer_wise_material_details = []
        if customer_ids:
            for customer_id in customer_ids:
                customer_material_details = {}
                customer_material_details["customer_id"] = customer_id
                customer_name = Customer.objects.get(id=customer_id).name
                customer_material_details["customer_name"] = customer_name

                warehouse_in_house_materials_by_category_for_customer = warehouse_in_house_materials_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                warehouse_po_allocated_materials_by_category_for_customer = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                material_names = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category_for_customer}
                
                material_name_wise_detail = []
                if material_names:
                    for material_name in material_names:
                        material_name_detail = {}
                        material_name_detail["material_name"] = material_name
                        warehouse_in_house_materials_by_category_for_customer_by_name = warehouse_in_house_materials_by_category_for_customer.filter(customer_brand_material__material_code__material_definition__user_material__material=material_name)
                        po_allocated_materials = warehouse_po_allocated_materials_by_category_for_customer.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material_name)
                        material_rack_bin_detail = FinanceWarehouseCustomerDetails().get_material_rack_bin_details(po_allocated_materials)
                        material_name_detail["rack_detail"] = material_rack_bin_detail

                        total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_category_for_customer_by_name)
                        total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(po_allocated_materials)

                        total_quantity = total_available_quantity + total_remaining_quantity
                        total_price = total_available_quantity_price + total_remaining_quantity_price
                        material_name_detail["total_quantity"] = total_quantity
                        material_name_detail["quantity_unit"] = normalized_unit
                        material_name_detail["total_price"] = total_price
                        material_name_detail["price_unit"] = "USD"
                        material_name_wise_detail.append(material_name_detail)
                
                customer_material_details["material_wise_details"] = material_name_wise_detail
                customer_wise_material_details.append(customer_material_details)

        return customer_wise_material_details
    
    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        data = self.get_customer_wise_category_wise_material_detail(warehouse_id, category)

        return Response(data)


class WarehouseMaterialRackDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_materials(self, warehouse_id=None, category=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials

        rack_details = FinanceWarehouseCustomerDetails().get_material_rack_bin_details(warehouse_po_allocated_materials_by_category)

        material_names = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category if in_house_material.customer_brand_material is not None}
        
        material_name_wise_material_summary = []
        if material_names:
            for material_name in material_names:
                material_name_detail = {}
                material_name_detail["material_name"] = material_name

                warehouse_in_house_materials_by_category_by_name = warehouse_in_house_materials_by_category.filter(customer_brand_material__material_code__material_definition__user_material__material=material_name)
                warehouse_po_allocated_materials_by_category_by_name = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material_name)

                total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_category_by_name)
                total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_by_category_by_name)

                total_quantity = total_available_quantity + total_remaining_quantity
                total_price = total_available_quantity_price + total_remaining_quantity_price
                material_name_detail["total_material_quantity"] = total_quantity
                material_name_detail["quantity_units"] = normalized_unit
                material_name_detail["total_material_price"] = total_price
                material_name_detail["price_unit"] = "USD"

                material_name_wise_material_summary.append(material_name_detail)
      
        return material_name_wise_material_summary, rack_details

    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        material_name_wise_material_summary, rack_details = self.get_warehouse_materials(warehouse_id, category)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(rack_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=material_name_wise_material_summary)
        

class WarehouseMaterialRackMaterials(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_rack_materials(self, warehouse_id=None, category=None, rack_id=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if rack_id:
            warehouse_in_house_materials_by_category_for_rack = warehouse_in_house_materials_by_category.filter(warehouse_bin__warehouse_rack__id=rack_id)
            warehouse_po_allocated_materials_by_category_for_rack = warehouse_po_allocated_materials_by_category.filter(in_house_material__warehouse_bin__warehouse_rack__id=rack_id)
        else:
            warehouse_in_house_materials_by_category_for_rack = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_for_rack = warehouse_po_allocated_materials_by_category

        rack_detail = {}
        rack_object = PlantWarehouseRack.objects.get(id=rack_id)
        rack_detail["id"] = rack_object.id
        rack_detail["rack_number"] = rack_object.display_number
        rack_detail["warehouse"] = rack_object.warehouse.warehouse_name
        rack_detail["plant"] = rack_object.warehouse.plant.name

        bin_ids = {in_house_material.warehouse_bin.id for in_house_material in warehouse_in_house_materials_by_category_for_rack if in_house_material.warehouse_bin is not None}
        bin_wise_material_details = []
        if bin_ids:
            for bin_id in bin_ids:
                bin_material_detail = {}
                bin_object = PlantWarehouseRackBin.objects.get(id=bin_id)
                bin_material_detail["id"] = bin_object.id
                bin_material_detail["bin_number"] = bin_object.display_number

                warehouse_in_house_materials_by_category_for_rack_bin = warehouse_in_house_materials_by_category_for_rack.filter(warehouse_bin__id=bin_id)
                warehouse_po_allocated_materials_by_category_for_rack_bin = warehouse_po_allocated_materials_by_category_for_rack.filter(in_house_material__warehouse_bin__id=bin_id)
                
                material_names = {in_house_material.customer_brand_material.material_code.material_definition.user_material.material for in_house_material in warehouse_in_house_materials_by_category_for_rack_bin if in_house_material.customer_brand_material is not None}
                material_name_wise_material_summary = []
                if material_names:
                    for material_name in material_names:
                        material_name_detail = {}
                        material_name_detail["material_name"] = material_name

                        warehouse_in_house_materials_by_category_for_rack_bin_by_name = warehouse_in_house_materials_by_category_for_rack_bin.filter(customer_brand_material__material_code__material_definition__user_material__material=material_name)
                        warehouse_po_allocated_materials_by_category_for_rack_bin_by_name = warehouse_po_allocated_materials_by_category_for_rack_bin.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__material=material_name)

                        total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_category_for_rack_bin_by_name)
                        total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_by_category_for_rack_bin_by_name)

                        total_quantity = total_available_quantity + total_remaining_quantity
                        total_price = total_available_quantity_price + total_remaining_quantity_price
                        material_name_detail["total_material_quantity"] = total_quantity
                        material_name_detail["quantity_units"] = normalized_unit
                        material_name_detail["total_material_price"] = total_price
                        material_name_detail["price_unit"] = "USD"

                        material_name_wise_material_summary.append(material_name_detail)
                
                bin_material_detail["material_summary"] = material_name_wise_material_summary
                bin_wise_material_details.append(bin_material_detail)

        return bin_wise_material_details, rack_detail
    
    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        rack_id = self.request.query_params.get("rack_id", None)
        bin_wise_material_details, rack_detail = self.get_warehouse_rack_materials(warehouse_id, category, rack_id)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(bin_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=rack_detail)


class WarehouseMaterialRackBinMaterials(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_rack_bin_materials(self, warehouse_id=None, category=None, rack_id=None, bin_id=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if rack_id:
            warehouse_in_house_materials_by_category_for_rack = warehouse_in_house_materials_by_category.filter(warehouse_bin__warehouse_rack__id=rack_id)
            warehouse_po_allocated_materials_by_category_for_rack = warehouse_po_allocated_materials_by_category.filter(in_house_material__warehouse_bin__warehouse_rack__id=rack_id)
        else:
            warehouse_in_house_materials_by_category_for_rack = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_for_rack = warehouse_po_allocated_materials_by_category
        if bin_id:
            warehouse_in_house_materials_by_category_for_rack_bin = warehouse_in_house_materials_by_category_for_rack.filter(warehouse_bin__id=bin_id)
            warehouse_po_allocated_materials_by_category_for_rack_bin = warehouse_po_allocated_materials_by_category_for_rack.filter(in_house_material__warehouse_bin__id=bin_id)
        else:
            warehouse_in_house_materials_by_category_for_rack_bin = warehouse_in_house_materials_by_category_for_rack
            warehouse_po_allocated_materials_by_category_for_rack_bin = warehouse_po_allocated_materials_by_category_for_rack
        
        bin_detail = {}
        bin_object = PlantWarehouseRackBin.objects.get(id=bin_id)
        bin_detail["id"] = bin_object.id
        bin_detail["bin_number"] = bin_object.display_number
        bin_detail["rack_number"] = bin_object.warehouse_rack.display_number
        bin_detail["warehouse"] = bin_object.warehouse_rack.warehouse.warehouse_name
        bin_detail["plant"] = bin_object.warehouse_rack.warehouse.plant.name

        customer_ids = {in_house_material.customer_brand_material.material_code.customer_brand.customer.id for in_house_material in warehouse_in_house_materials_by_category_for_rack_bin if in_house_material.customer_brand_material is not None}
        customer_wise_material_details = []
        if customer_ids:
            for customer_id in customer_ids:
                customer_material_detail = {}
                customer_object = Customer.objects.get(id=customer_id)
                customer_material_detail["customer"] = customer_object.name

                warehouse_in_house_materials_for_customer_by_category_for_rack_bin = warehouse_in_house_materials_by_category_for_rack_bin.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                warehouse_po_allocated_materials_for_customer_by_category_for_rack_bin = warehouse_po_allocated_materials_by_category_for_rack_bin.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                
                po_club_ids = {allocated_material.purchase_order_bom.purchase_order.actual_po_club.id for allocated_material in warehouse_po_allocated_materials_for_customer_by_category_for_rack_bin}
                customer_po_club_wise_material_details = []
                if po_club_ids:
                    for po_club_id in po_club_ids:
                        customer_po_club_material_detail = {}

                        po_club_object = ActualPOClub.objects.get(id=po_club_id)
                        customer_po_club_material_detail["po_club_id"] = po_club_id
                        customer_po_club_material_detail["po_club_number"] = po_club_object.display_number
                        customer_po_club_material_detail["po_club_short_code"] = po_club_object.short_code
                        customer_po_club_material_detail["po_club_long_code"] = po_club_object.long_code

                        warehouse_po_allocated_materials_for_customer_by_po_club_by_category_for_rack_bin = warehouse_po_allocated_materials_for_customer_by_category_for_rack_bin.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
                        in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_for_customer_by_po_club_by_category_for_rack_bin}
                        warehouse_in_house_materials_for_customer_by_po_club_by_category_for_rack_bin = warehouse_in_house_materials_for_customer_by_category_for_rack_bin.filter(id__in=list(in_house_material_ids))
                                              
                        customer_brand_material_ids = {in_house_material.customer_brand_material.id for in_house_material in warehouse_in_house_materials_for_customer_by_po_club_by_category_for_rack_bin}
                        item_wise_material_details = []
                        if customer_brand_material_ids:
                            for customer_brand_material_id in customer_brand_material_ids:
                                item_material_detail = {}
                                customer_brand_material_object = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
                                customer_brand_material = customer_brand_material_object.verbose_reference_code
                                item_material_detail["item"] = customer_brand_material
                                material_name = customer_brand_material_object.material_detail.generic_material.user_material.name
                                item_material_detail["item_material_headers"] = customer_brand_material_object.material_detail.generic_material.user_material.get_material_headers(material_name)
                                item_material_detail["item_material_attributes"] = customer_brand_material_object.get_attributes()

                                warehouse_in_house_materials_for_customer_by_po_club_by_material_by_category_for_rack_bin = warehouse_in_house_materials_for_customer_by_po_club_by_category_for_rack_bin.filter(customer_brand_material__id=customer_brand_material_id)
                                warehouse_po_allocated_materials_for_customer_by_po_club_by_material_by_category_for_rack_bin = warehouse_po_allocated_materials_for_customer_by_po_club_by_category_for_rack_bin.filter(in_house_material__customer_brand_material__id=customer_brand_material_id)

                                total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_for_customer_by_po_club_by_material_by_category_for_rack_bin)
                                total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_for_customer_by_po_club_by_material_by_category_for_rack_bin)

                                total_quantity = total_available_quantity + total_remaining_quantity
                                total_price = total_available_quantity_price + total_remaining_quantity_price
                                item_material_detail["total_material_quantity"] = total_quantity
                                item_material_detail["quantity_units"] = normalized_unit
                                item_material_detail["total_material_price"] = total_price
                                item_material_detail["price_unit"] = "USD"

                                item_wise_material_details.append(item_material_detail)

                        customer_po_club_material_detail["item_wise_material_details"] = item_wise_material_details
                        customer_po_club_wise_material_details.append(customer_po_club_material_detail)

                customer_material_detail["customer_po_club_wise_material_details"] = customer_po_club_wise_material_details
                customer_wise_material_details.append(customer_material_detail)

        return customer_wise_material_details, bin_detail

    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        rack_id = self.request.query_params.get("rack_id", None)
        bin_id = self.request.query_params.get("bin_id", None)
        customer_wise_material_details, bin_detail= self.get_warehouse_rack_bin_materials(warehouse_id, category, rack_id, bin_id)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(customer_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=bin_detail)
        

class WarehouseMaterialItems(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_material_items(self, warehouse_id=None, category=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        
        customer_brand_material_ids = {in_house_material.customer_brand_material.id for in_house_material in warehouse_in_house_materials_by_category if in_house_material.customer_brand_material is not None}
        item_wise_material_details = []
        if customer_brand_material_ids:
            for customer_brand_material_id in customer_brand_material_ids:
                item_material_detail = {}
                total_item_price = 0
                customer_brand_material_object = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
                item_material_detail["item"] = customer_brand_material_object.verbose_reference_code
                material_name = customer_brand_material_object.material_detail.generic_material.user_material.name
                item_material_detail["item_material_headers"] = customer_brand_material_object.material_detail.generic_material.user_material.get_material_headers(material_name)
                item_material_detail["item_material_attributes"] = customer_brand_material_object.get_attributes()

                warehouse_in_house_materials_by_category_by_item = warehouse_in_house_materials_by_category.filter(customer_brand_material__id=customer_brand_material_id)
                warehouse_po_allocated_materials_by_category_by_item = warehouse_po_allocated_materials_by_category.filter(in_house_material__customer_brand_material__id=customer_brand_material_id)

                supplier_ids = {in_house_material.supplier_material.supplier.id for in_house_material in warehouse_in_house_materials_by_category_by_item}
                supplier_wise_material_details = []
                if supplier_ids:
                    for supplier_id in supplier_ids:
                        supplier_material_detail = {}
                        supplier_object = Supplier.objects.get(id=supplier_id)
                        supplier_material_detail["supplier"] = supplier_object.name

                        warehouse_in_house_materials_by_category_by_item_by_supplier = warehouse_in_house_materials_by_category_by_item.filter(supplier_material__supplier__id=supplier_id)
                        warehouse_po_allocated_materials_by_category_by_item_by_supplier = warehouse_po_allocated_materials_by_category_by_item.filter(in_house_material__supplier_material__supplier__id=supplier_id)

                        customer_ids = {in_house_material.customer_brand_material.material_code.customer_brand.customer.id for in_house_material in warehouse_in_house_materials_by_category_by_item_by_supplier}
                        customer_wise_material_details = []
                        if customer_ids:
                            for customer_id in customer_ids:
                                customer_material_detail = {}
                                customer_object = Customer.objects.get(id=customer_id)
                                customer_material_detail["customer"] = customer_object.name

                                warehouse_in_house_materials_by_category_by_item_by_supplier_by_customer = warehouse_in_house_materials_by_category_by_item_by_supplier.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                                warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer = warehouse_po_allocated_materials_by_category_by_item_by_supplier.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                                
                                department_ids = {allocated_material.purchase_order_bom.purchase_order.costing_version.order.department.id for allocated_material in warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer}
                                department_wise_material_details = []
                                if department_ids:
                                    for department_id in department_ids:
                                        department_material_detail = {}
                                        department_object = CustomerBrandDepartment.objects.get(id=department_id)
                                        department_material_detail["department"] = department_object.department

                                        warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department = warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer.filter(purchase_order_bom__purchase_order__costing_version__order__department__id=department_id)
                                        in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department}
                                        warehouse_in_house_materials_by_category_by_item_by_supplier_by_customer_by_department = warehouse_in_house_materials_by_category_by_item_by_supplier_by_customer.filter(id__in=list(in_house_material_ids))
                                        
                                        po_club_ids = {allocated_material.purchase_order_bom.purchase_order.actual_po_club.id for allocated_material in warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department}
                                        po_club_wise_material_details = []
                                        if po_club_ids:
                                            for po_club_id in po_club_ids:
                                                po_club_material_detail = {}
                                                po_club_object = ActualPOClub.objects.get(id=po_club_id)
                                                po_club_material_detail["po_club_id"] = po_club_id
                                                po_club_material_detail["po_club_number"] = po_club_object.display_number
                                                po_club_material_detail["po_club_short_code"] = po_club_object.short_code
                                                po_club_material_detail["po_club_long_code"] = po_club_object.long_code

                                                warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department_by_po_club = warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
                                                in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department_by_po_club}
                                                warehouse_in_house_materials_by_category_by_item_by_supplier_by_customer_by_department_by_po_club = warehouse_in_house_materials_by_category_by_item_by_supplier_by_customer_by_department.filter(id__in=list(in_house_material_ids))

                                                total_available_quantity, normalized_unit, unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_category_by_item_by_supplier_by_customer_by_department_by_po_club)
                                                total_remaining_quantity, normalized_unit, unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_by_category_by_item_by_supplier_by_customer_by_department_by_po_club)

                                                total_quantity = total_available_quantity + total_remaining_quantity
                                                total_price = total_available_quantity_price + total_remaining_quantity_price
                                                total_item_price += total_price
                                                po_club_material_detail["material_quantity"] = total_quantity
                                                po_club_material_detail["quantity_units"] = normalized_unit
                                                po_club_material_detail["unit_price"] = unit_price
                                                po_club_material_detail["material_price"] = total_price
                                                po_club_material_detail["price_unit"] = "USD"

                                                po_club_wise_material_details.append(po_club_material_detail)
                                        
                                        department_material_detail["po_club_wise_material_details"] = po_club_wise_material_details
                                        department_wise_material_details.append(department_material_detail)

                                customer_material_detail["department_wise_material_details"] = department_wise_material_details
                                customer_wise_material_details.append(customer_material_detail)

                        supplier_material_detail["customer_wise_material_details"] = customer_wise_material_details
                        supplier_wise_material_details.append(supplier_material_detail)
                
                item_material_detail["supplier_wise_material_details"] = supplier_wise_material_details
                item_material_detail["total_item_price"] = total_item_price
                item_material_detail["price_unit"] = "USD"
                item_wise_material_details.append(item_material_detail)

        return item_wise_material_details

    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        item_wise_material_details = self.get_warehouse_material_items(warehouse_id, category)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(item_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)


class  WarehouseMaterialSupplierMaterial(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_supplier_materials(self, warehouse_id=None, category=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials

        supplier_ids = {in_house_material.supplier_material.supplier.id for in_house_material in warehouse_in_house_materials_by_category}

        supplier_wise_material_details = []
        if supplier_ids:
            for supplier_id in supplier_ids:
                supplier_material_detail = {}
                supplier_material_detail["id"] = supplier_id
                supplier_object = Supplier.objects.get(id=supplier_id)
                supplier_material_detail["supplier"] = supplier_object.name

                warehouse_in_house_materials_by_category_by_supplier = warehouse_in_house_materials_by_category.filter(supplier_material__supplier__id=supplier_id)
                warehouse_po_allocated_materials_by_category_by_supplier = warehouse_po_allocated_materials_by_category.filter(in_house_material__supplier_material__supplier__id=supplier_id)
                
                total_initial_quantity, normalized_unit, initial_quantity_unit_price, total_initial_quantity_price = NormalizedTotalQuantityPrice().get_total_initial_quantity_value_for_material(warehouse_in_house_materials_by_category_by_supplier)
                total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_category_by_supplier)
                total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_by_category_by_supplier)
                
                total_outstanding_quantity_price = total_available_quantity_price + total_remaining_quantity_price
                supplier_material_detail["initial_value"] = total_initial_quantity_price
                supplier_material_detail["outstanding_value"] = total_outstanding_quantity_price
                supplier_material_detail["unit"] = "USD"
                supplier_wise_material_details.append(supplier_material_detail)

        return supplier_wise_material_details
    
    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        supplier_wise_material_details = self.get_warehouse_supplier_materials(warehouse_id, category)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(supplier_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        

class WarehouseMaterialSupplierCustomerwiseMaterial(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_warehouse_supplier_materials_customerwise_materials(self, warehouse_id=None, category=None, supplier_id=None):

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if supplier_id:
            warehouse_in_house_materials_by_category_by_supplier =  warehouse_in_house_materials_by_category.filter(supplier_material__supplier__id=supplier_id)
            warehouse_po_allocated_materials_by_category_by_supplier = warehouse_po_allocated_materials_by_category.filter(in_house_material__supplier_material__supplier__id=supplier_id)
        else:
            warehouse_in_house_materials_by_category_by_supplier = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_by_supplier = warehouse_po_allocated_materials_by_category

        customer_ids = {in_house_material.customer_brand_material.material_code.customer_brand.customer.id for in_house_material in warehouse_in_house_materials_by_category_by_supplier if in_house_material.customer_brand_material is not None}
        customer_wise_material_details = []
        if customer_ids:
            for customer_id in customer_ids:
                customer_material_detail = {}
                customer_object = Customer.objects.get(id=customer_id)
                customer_material_detail["customer"] = customer_object.name

                warehouse_in_house_materails_by_category_by_supplier_by_customer = warehouse_in_house_materials_by_category_by_supplier.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                warehouse_po_allocated_materials_by_category_by_supplier_by_customer = warehouse_po_allocated_materials_by_category_by_supplier.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)

                department_ids = {allocated_material.purchase_order_bom.purchase_order.costing_version.order.department.id for allocated_material in warehouse_po_allocated_materials_by_category_by_supplier_by_customer}
                department_wise_material_details = []
                if department_ids:
                    for department_id in department_ids:
                        department_material_detail = {}
                        department_object = CustomerBrandDepartment.objects.get(id=department_id)
                        department_material_detail["department"] = department_object.department

                        warehouse_po_allocated_materials_by_category_by_supplier_by_customer_by_department = warehouse_po_allocated_materials_by_category_by_supplier_by_customer.filter(purchase_order_bom__purchase_order__costing_version__order__department__id=department_id)
                        in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_allocated_materials_by_category_by_supplier_by_customer_by_department}
                        warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department = warehouse_in_house_materails_by_category_by_supplier_by_customer.filter(id__in=list(in_house_material_ids))

                        po_club_ids = {allocated_material.purchase_order_bom.purchase_order.actual_po_club.id for allocated_material in warehouse_po_allocated_materials_by_category_by_supplier_by_customer_by_department}
                        po_club_wise_material_details = []
                        if po_club_ids:
                            for po_club_id in po_club_ids:
                                po_club_material_detail = {}
                                po_club_object = ActualPOClub.objects.get(id=po_club_id)
                                po_club_material_detail["po_club_id"] = po_club_id
                                po_club_material_detail["po_club_number"] = po_club_object.display_number
                                po_club_material_detail["po_club_short_code"] = po_club_object.short_code
                                po_club_material_detail["po_club_long_code"] = po_club_object.long_code

                                warehouse_po_alloacted_materials_by_category_by_supplier_by_customer_by_department_by_po_club = warehouse_po_allocated_materials_by_category_by_supplier_by_customer_by_department.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
                                in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_alloacted_materials_by_category_by_supplier_by_customer_by_department_by_po_club}
                                warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department_by_po_club = warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department.filter(id__in=list(in_house_material_ids))

                                customer_brand_material_ids = {in_house_material.customer_brand_material.id for in_house_material in warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department_by_po_club}
                                item_wise_material_details = []
                                if customer_brand_material_ids:
                                    for customer_brand_material_id in customer_brand_material_ids:
                                        item_material_detail = {}
                                        customer_brand_material_object = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
                                        item_material_detail["item"] = customer_brand_material_object.verbose_reference_code
                                        material_name = customer_brand_material_object.material_detail.generic_material.user_material.name
                                        item_material_detail["item_material_headers"] = customer_brand_material_object.material_detail.generic_material.user_material.get_material_headers(material_name)
                                        item_material_detail["item_material_attributes"] = customer_brand_material_object.get_attributes()

                                        warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department_by_po_club_by_item = warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department_by_po_club.filter(customer_brand_material__id=customer_brand_material_id)
                                        warehouse_po_allocated_materials_by_category_by_supplier_by_customer_by_department_by_po_club_by_item = warehouse_po_alloacted_materials_by_category_by_supplier_by_customer_by_department_by_po_club.filter(in_house_material__customer_brand_material__id=customer_brand_material_id)

                                        total_initial_quantity, normalized_unit, initial_quantity_unit_price, total_initial_quantity_price = NormalizedTotalQuantityPrice().get_total_initial_quantity_value_for_material(warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department_by_po_club_by_item)
                                        total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materails_by_category_by_supplier_by_customer_by_department_by_po_club_by_item)
                                        total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_by_category_by_supplier_by_customer_by_department_by_po_club_by_item)
                                        
                                        item_material_detail["total_quantity"] = total_available_quantity + total_remaining_quantity
                                        item_material_detail["quantity_units"] = normalized_unit
                                        item_material_detail["initial_value"] = total_initial_quantity_price
                                        item_material_detail["outstanding_value"] = total_available_quantity_price + total_remaining_quantity_price
                                        item_material_detail["unit"] = "USD"
                                        
                                        item_wise_material_details.append(item_material_detail)

                                po_club_material_detail["item_wise_material_details"] = item_wise_material_details
                                po_club_wise_material_details.append(po_club_material_detail)

                        department_material_detail["po_club_wise_material_details"] = po_club_wise_material_details
                        department_wise_material_details.append(department_material_detail)

                customer_material_detail["department_wise_material_details"] = department_wise_material_details
                customer_wise_material_details.append(customer_material_detail)

        return customer_wise_material_details

    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        supplier_id = self.request.query_params.get("supplier_id", None)
        customer_wise_material_details = self.get_warehouse_supplier_materials_customerwise_materials(warehouse_id, category, supplier_id)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(customer_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        

class AgingwiseMaterialCategoryWiseMaterial(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def grn_date_aging(self):
        now = timezone.now()
        ranges = {
            'less_than_1_month': {"from": now - relativedelta(months=1), "to": now},
            '1_to_2_months': {"from": now - relativedelta(months=2), "to": now - relativedelta(months=1)},
            '2_to_3_months': {"from": now - relativedelta(months=3), "to": now - relativedelta(months=2)},
            '3_to_more_than_3_months': {"from": None, "to": now - relativedelta(months=3)}}
        
        return ranges

    def get_agingwise_material_category_details(self, warehouse_id=None, category=None, range=None):
        ranges = self.grn_date_aging()

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if category:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_category = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_category = warehouse_po_allocated_materials
        if range:
            month_range = ranges[range]
            if range == "3_to_more_than_3_months":
                warehouse_in_house_materials_by_category_by_range = warehouse_in_house_materials_by_category.filter(grn_date__lt=month_range["to"])
                warehouse_po_allocated_materials_by_category_by_range = warehouse_po_allocated_materials_by_category.filter(in_house_material__grn_date__lt=month_range["to"])
            else:
                warehouse_in_house_materials_by_category_by_range = warehouse_in_house_materials_by_category.filter(grn_date__gte=month_range["from"], grn_date__lt=month_range["to"])
                warehouse_po_allocated_materials_by_category_by_range = warehouse_po_allocated_materials_by_category.filter(in_house_material__grn_date__gte=month_range["from"], in_house_material__grn_date__lt=month_range["to"])
        else:
            warehouse_in_house_materials_by_category_by_range = warehouse_in_house_materials_by_category
            warehouse_po_allocated_materials_by_category_by_range = warehouse_po_allocated_materials_by_category

        categories = {in_house_material.customer_brand_material.material_code.material_definition.user_material.category for in_house_material in warehouse_in_house_materials_by_category_by_range if in_house_material.customer_brand_material is not None}
        category_wise_material_details = []
        total_price = 0
        if categories:
            for category in categories:
                category_material_detail = {}
                user_material_object = UserDefinedMaterial.objects.filter(category=category).first()
                category_material_detail["category"] = category
                category_material_detail["category_display"] = user_material_object.get_category_display()

                warehouse_in_house_materials_by_range_by_category = warehouse_in_house_materials_by_category_by_range.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
                warehouse_po_allocated_materials_by_range_by_category = warehouse_po_allocated_materials_by_category_by_range.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)

                total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_range_by_category)
                total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_allocated_materials_by_range_by_category)
                 
                category_material_detail["price"] = total_available_quantity_price + total_remaining_quantity_price
                category_material_detail["price_unit"] = "USD"
                total_price += (total_available_quantity_price + total_remaining_quantity_price)
                category_wise_material_details.append(category_material_detail)

        return total_price, category_wise_material_details
    
    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        category = self.request.query_params.get("category", None)
        range = self.request.query_params.get("range", None)
        total_price, category_wise_material_details = self.get_agingwise_material_category_details(warehouse_id, category, range)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(category_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data={"total_price": total_price, "price_unit": "USD"})
        

class AgingwiseMaterialCategoryWiseCustomerMaterial(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_agingwise_material_category_customer_material_details(self, warehouse_id=None, range=None, category=None):
        
        ranges = AgingwiseMaterialCategoryWiseMaterial().grn_date_aging()

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if range:
            month_range = ranges[range]
            if range == "3_to_more_than_3_months":
                warehouse_in_house_materials_by_range = warehouse_in_house_materials.filter(grn_date__lt=month_range["to"])
                warehouse_po_allocated_materials_by_range = warehouse_po_allocated_materials.filter(in_house_material__grn_date__lt=month_range["to"])
            else:
                warehouse_in_house_materials_by_range = warehouse_in_house_materials.filter(grn_date__gte=month_range["from"], grn_date__lt=month_range["to"])
                warehouse_po_allocated_materials_by_range = warehouse_po_allocated_materials.filter(in_house_material__grn_date__gte=month_range["from"], in_house_material__grn_date__lt=month_range["to"])
        else:
            warehouse_in_house_materials_by_range = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_range = warehouse_po_allocated_materials
        if category:
            warehouse_in_house_materials_by_range_by_category = warehouse_in_house_materials_by_range.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_alloacted_materials_by_range_by_category = warehouse_po_allocated_materials_by_range.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_range_by_category = warehouse_in_house_materials_by_range
            warehouse_po_alloacted_materials_by_range_by_category = warehouse_po_allocated_materials_by_range

        customer_ids = {in_house_material.customer_brand_material.material_code.customer_brand.customer.id for in_house_material in warehouse_in_house_materials_by_range_by_category if in_house_material.customer_brand_material is not None}
        customer_wise_material_details = []
        if customer_ids:
            for customer_id in customer_ids:
                customer_material_detail = {}
                customer_object = Customer.objects.get(id=customer_id)
                customer_material_detail["customer_id"] = customer_id
                customer_material_detail["customer"] = customer_object.name

                warehouse_in_house_materials_by_range_by_category_by_customer = warehouse_in_house_materials_by_range_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
                warehouse_po_alloacted_materials_by_range_by_category_by_customer = warehouse_po_alloacted_materials_by_range_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)

                total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_range_by_category_by_customer)
                total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_alloacted_materials_by_range_by_category_by_customer)
                 
                customer_material_detail["price"] = total_available_quantity_price + total_remaining_quantity_price
                customer_material_detail["price_unit"] = "USD"

                customer_wise_material_details.append(customer_material_detail)

        return customer_wise_material_details
    
    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        range = self.request.query_params.get("range", None)
        category = self.request.query_params.get("category", None)
        customer_wise_material_details = self.get_agingwise_material_category_customer_material_details(warehouse_id, range, category)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(customer_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        

class AgingwiseMaterialCategoryWiseCustomerItemMaterial(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]

    def get_agingwise_material_category_customer_item_material_details(self, warehouse_id=None, range=None, category=None, customer_id=None):
        
        ranges = AgingwiseMaterialCategoryWiseMaterial().grn_date_aging()

        if warehouse_id:
            warehouse_in_house_materials = InHouseMaterial.objects.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)   
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        else:
            warehouse_in_house_materials = InHouseMaterial.objects.all()
            warehouse_po_allocated_materials = PurchaseOrderAllocatedMaterial.objects.all()
        if range:
            month_range = ranges[range]
            if range == "3_to_more_than_3_months":
                warehouse_in_house_materials_by_range = warehouse_in_house_materials.filter(grn_date__lt=month_range["to"])
                warehouse_po_allocated_materials_by_range = warehouse_po_allocated_materials.filter(in_house_material__grn_date__lt=month_range["to"])
            else:
                warehouse_in_house_materials_by_range = warehouse_in_house_materials.filter(grn_date__gte=month_range["from"], grn_date__lt=month_range["to"])
                warehouse_po_allocated_materials_by_range = warehouse_po_allocated_materials.filter(in_house_material__grn_date__gte=month_range["from"], in_house_material__grn_date__lt=month_range["to"])
        else:
            warehouse_in_house_materials_by_range = warehouse_in_house_materials
            warehouse_po_allocated_materials_by_range = warehouse_po_allocated_materials
        if category:
            warehouse_in_house_materials_by_range_by_category = warehouse_in_house_materials_by_range.filter(customer_brand_material__material_code__material_definition__user_material__category=category)
            warehouse_po_alloacted_materials_by_range_by_category = warehouse_po_allocated_materials_by_range.filter(in_house_material__customer_brand_material__material_code__material_definition__user_material__category=category)
        else:
            warehouse_in_house_materials_by_range_by_category = warehouse_in_house_materials_by_range
            warehouse_po_alloacted_materials_by_range_by_category = warehouse_po_allocated_materials_by_range
        if customer_id:
            warehouse_in_house_materials_by_range_by_category_by_customer = warehouse_in_house_materials_by_range_by_category.filter(customer_brand_material__material_code__customer_brand__customer__id=customer_id)
            warehouse_po_alloacted_materials_by_range_by_category_by_customer = warehouse_po_alloacted_materials_by_range_by_category.filter(in_house_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
        else:
            warehouse_in_house_materials_by_range_by_category_by_customer = warehouse_in_house_materials_by_range_by_category
            warehouse_po_alloacted_materials_by_range_by_category_by_customer = warehouse_po_alloacted_materials_by_range_by_category

        department_ids = {}
        department_ids = {allocated_material.purchase_order_bom.purchase_order.costing_version.order.department.id for allocated_material in warehouse_po_alloacted_materials_by_range_by_category_by_customer}
        department_wise_material_details = []
        if department_ids:
            for department_id in department_ids:
                total_department_value = 0
                department_material_detail = {}
                department_object = CustomerBrandDepartment.objects.get(id=department_id)
                department_material_detail["department"] = department_object.department

                warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department = warehouse_po_alloacted_materials_by_range_by_category_by_customer.filter(purchase_order_bom__purchase_order__costing_version__order__department__id=department_id)
                in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department}
                warehouse_in_house_materials_by_range_by_category_by_customer_by_department = warehouse_in_house_materials_by_range_by_category_by_customer.filter(id__in=list(in_house_material_ids))

                po_club_ids = {allocated_material.purchase_order_bom.purchase_order.actual_po_club.id for allocated_material in warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department}
                po_club_wise_material_details = []
                if po_club_ids:
                    for po_club_id in po_club_ids:
                        po_club_material_detail = {}
                        po_club_object = ActualPOClub.objects.get(id=po_club_id)

                        po_club_material_detail["po_club_id"] = po_club_id
                        po_club_material_detail["po_club_number"] = po_club_object.display_number
                        po_club_material_detail["po_club_short_code"] = po_club_object.short_code
                        po_club_material_detail["po_club_long_code"] = po_club_object.long_code

                        warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club = warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
                        in_house_material_ids = {allocated_material.in_house_material.id for allocated_material in warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club}
                        warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club = warehouse_in_house_materials_by_range_by_category_by_customer_by_department.filter(id__in=list(in_house_material_ids))

                        supplier_ids = {in_house_material.supplier_material.supplier.id for in_house_material in warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club}
                        supplier_wise_material_details = []
                        if supplier_ids:
                            for supplier_id in supplier_ids:
                                supplier_material_detail = {}
                                supplier_object = Supplier.objects.get(id=supplier_id)
                                supplier_material_detail["supplier"] = supplier_object.name

                                warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier = warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club.filter(supplier_material__supplier__id=supplier_id)
                                warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier = warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club.filter(in_house_material__supplier_material__supplier__id=supplier_id)

                                customer_brand_material_ids = {in_house_material.customer_brand_material.id for in_house_material in warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier}
                                item_wise_material_details = []
                                if customer_brand_material_ids:
                                    for customer_brand_material_id in customer_brand_material_ids:
                                        item_material_detail = {}
                                        customer_brand_material_object = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)

                                        item_material_detail["item"] = customer_brand_material_object.verbose_reference_code
                                        material_name = customer_brand_material_object.material_detail.generic_material.user_material.name
                                        item_material_detail["item_material_headers"] = customer_brand_material_object.material_detail.generic_material.user_material.get_material_headers(material_name)
                                        item_material_detail["item_material_attributes"] = customer_brand_material_object.get_attributes()

                                        warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier_by_item = warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier.filter(customer_brand_material__id=customer_brand_material_id)
                                        warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier_by_item = warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier.filter(in_house_material__customer_brand_material__id=customer_brand_material_id)

                                        total_available_quantity, normalized_unit, available_quantity_unit_price, total_available_quantity_price = NormalizedTotalQuantityPrice().get_total_available_quantity_value_for_material(warehouse_in_house_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier_by_item)
                                        total_remaining_quantity, normalized_unit, remaining_quantity_unit_price, total_remaining_quantity_price = NormalizedTotalQuantityPrice().get_total_remaining_quantity_value_for_material(warehouse_po_alloacted_materials_by_range_by_category_by_customer_by_department_by_po_club_by_supplier_by_item)

                                        item_material_detail["quantity"] = total_available_quantity + total_remaining_quantity
                                        item_material_detail["quantity_unit"] = normalized_unit
                                        item_material_detail["price"] = total_available_quantity_price + total_remaining_quantity_price
                                        item_material_detail["price_unit"] = "USD"
                                        total_department_value += (total_available_quantity_price + total_remaining_quantity_price)
                                        item_wise_material_details.append(item_material_detail)

                                supplier_material_detail["item_wise_material_details"] = item_wise_material_details
                                supplier_wise_material_details.append(supplier_material_detail)

                        po_club_material_detail["supplier_wise_material_details"] = supplier_wise_material_details
                        po_club_wise_material_details.append(po_club_material_detail)

                department_material_detail["po_club_wise_material_details"] = po_club_wise_material_details
                department_material_detail["total_price"] = total_department_value
                department_material_detail["total_price_unit"] = "USD"
                department_wise_material_details.append(department_material_detail)

        return department_wise_material_details
    
    def get(self, request, *args, **kwargs):

        warehouse_id = self.request.query_params.get("warehouse_id", None)
        range = self.request.query_params.get("range", None)
        category = self.request.query_params.get("category", None)
        customer_id = self.request.query_params.get("customer_id", None)
        department_wise_material_details = self.get_agingwise_material_category_customer_item_material_details(warehouse_id, range, category, customer_id)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(department_wise_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        

class VirtualWarehouseInhouseDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = InHouseMaterialBasicSerializer
    pagination = GeneralLargeResultsSetPagination()

    def get(self, request, *args, **kwargs):

        queryset = InHouseMaterial.objects.all().order_by('-id')

        po_club_id = self.request.query_params.get('po_club_id', None)
        warehouse_id = self.request.query_params.get('warehouse_id', None)
        material_type = self.request.query_params.get('material_type', None)
        
        if po_club_id:
            queryset = queryset.filter(purchase_order_club_bom_supplier__general_po_material_quantity__general_po__po_club__id=po_club_id)
        if warehouse_id:
            queryset = queryset.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        if material_type:
            queryset = queryset.filter(grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material__material_detail__generic_material__user_material__category=material_type)

        paginated_data = self.pagination.paginate_queryset(queryset, request, view=self)
        if paginated_data is not None:
            serializer = self.serializer_class(paginated_data, many=True)
            return self.pagination.get_paginated_response(serializer.data, meta_data=None)
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
    

class VirtualWarehouseBarcodeInhouseDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = InHouseMaterialBasicSerializer
    pagination = GeneralLargeResultsSetPagination()

    def get(self, request, *args, **kwargs):

        queryset = InHouseMaterial.objects.filter(available_quantity__gt=0).order_by('-id')

        barcode = self.request.query_params.get('barcode', None)
        if barcode:
            queryset = queryset.filter(barcode=barcode)

        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
    

class VirtualWarehouseCustomerBrandMaterialGRNMaterialDetails(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    
    def get_customer_brand_material_in_house_quantities(self, in_house_materials):

        total_quantity = 0
        total_available_quantity = 0
        total_issue_quantity = 0
        for material in in_house_materials:
            total_quantity += material.normalized_quantity
            total_available_quantity += material.normalized_available_quantity
            total_issue_quantity += material.normalized_issue_quantity
        
        return total_quantity, total_available_quantity, total_issue_quantity

    def get_queryset(self):

        in_house_material_queryset = InHouseMaterial.objects.filter(available_quantity__gt=0).order_by('-id')

        warehouse_id = self.request.query_params.get('warehouse_id', None)
        customer_id = self.request.query_params.get('customer_id', None)
        po_club_id = self.request.query_params.get('po_club_id', None)
        material_category = self.request.query_params.get('material_category', None)

        if warehouse_id:
            in_house_material_queryset = in_house_material_queryset.filter(warehouse_bin__warehouse_rack__warehouse__id=warehouse_id)
        if customer_id:
            in_house_material_queryset = in_house_material_queryset.filter(supplier_material__customer_brand_material__material_code__customer_brand__customer__id=customer_id)
        if po_club_id:
            purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__actual_po_club__id=po_club_id)
            po_club_in_house_material_ids = list({po_allocated_material.in_house_material.id for po_allocated_material in purchase_order_allocated_materials})
            in_house_material_queryset = in_house_material_queryset.filter(id__in=po_club_in_house_material_ids)
        if material_category:
            in_house_material_queryset = in_house_material_queryset.filter(grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category)

        customer_brand_material_ids = {material.supplier_material.customer_brand_material.id for material in in_house_material_queryset
                                       if material.supplier_material is not None and material.supplier_material.customer_brand_material is not None}
        
        customer_brand_material_details = []
        if customer_brand_material_ids:
            for customer_brand_material_id in customer_brand_material_ids:
                customer_brand_material = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
                customer_brand_in_house_materials = in_house_material_queryset.filter(supplier_material__customer_brand_material__id=customer_brand_material_id)
                
                total_quantity, total_available_quantity, total_issue_quantity = self.get_customer_brand_material_in_house_quantities(customer_brand_in_house_materials)
                customer_brand_material_detail = {
                    'id': customer_brand_material.id,
                    'display_number': customer_brand_material.display_number,
                    'reference_code': customer_brand_material.reference_code,
                    'verbose_reference_code': customer_brand_material.verbose_reference_code,
                    'material_type': customer_brand_material.material_type,
                    'material_headers': customer_brand_material.material_detail.generic_material.user_material.get_material_headers(customer_brand_material.material_type),
                    'material_attributes': customer_brand_material.get_attributes(),
                    'quantity': round(total_quantity, 4),
                    'available_quantity': round(total_available_quantity, 4),
                    'issue_quantity': round(total_issue_quantity, 4),
                    'quantity_unit': customer_brand_material.material_normalized_measuring_unit.capitalize(),
                    'inhouse_material_details': InHouseMaterialSupplierPOGRNSerializer(customer_brand_in_house_materials, many=True).data
                }
                customer_brand_material_details.append(customer_brand_material_detail)
        return customer_brand_material_details
    
    def get(self, request, *args, **kwargs):

        customer_brand_material_details = self.get_queryset()
        material_type = self.request.query_params.get('material_type', None)
        reference_code = self.request.query_params.get('reference_code', None)
        quantity = self.request.query_params.get('quantity', None)
        available_quantity = self.request.query_params.get('available_quantity', None)
        issue_quantity = self.request.query_params.get('issue_quantity', None)
        global_search = self.request.query_params.get('global_search', None)

        if material_type:
            customer_brand_material_details = [material for material in customer_brand_material_details if str(material_type).lower() in material.get('material_type').lower()]
        if reference_code:
            customer_brand_material_details = [material for material in customer_brand_material_details if str(reference_code).lower() in material.get('verbose_reference_code').lower()]
        if quantity:
            customer_brand_material_details = [material for material in customer_brand_material_details if str(quantity).lower() in  str(material.get('quantity'))]
        if available_quantity:
            customer_brand_material_details = [material for material in customer_brand_material_details if str(available_quantity).lower() in str(material.get('available_quantity'))]
        if issue_quantity:
            customer_brand_material_details = [material for material in customer_brand_material_details if str(issue_quantity).lower() in str(material.get('issue_quantity'))]
        if global_search:
            search_val = str(global_search).lower()
            customer_brand_material_details = [material for material in customer_brand_material_details
                if (
                    search_val in str(material.get('material_type')).lower()
                    or search_val in str(material.get('verbose_reference_code')).lower()
                    or search_val in str(material.get('quantity'))
                    or search_val in str(material.get('available_quantity'))
                    or search_val in str(material.get('issue_quantity'))
                )]
            
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(customer_brand_material_details, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        return Response(customer_brand_material_details)


class POClubMetaDataSearchableList(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = POClubMetaDataSearchableListSerializer
    
    def get(self, request, *args, **kwargs):

        po_clubs = ActualPOClub.objects.all().order_by('-id')
        po_club_id = self.request.query_params.get('po_club_id', None)
        search_text = self.request.query_params.get('search_text', None) 

        if po_club_id:
            po_clubs = po_clubs.filter(id=po_club_id)
        if search_text:
            po_clubs = [po_club for po_club in po_clubs if search_text.lower() in po_club.display_number.lower()]

        serializer = self.serializer_class(po_clubs, many=True)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(serializer.data, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        return Response(serializer.data)


class IssueNoteCreateUpdate(APIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    
    def post(self, request):
        
        errors = {}
        has_errors = False
        return_status = status.HTTP_200_OK
        
        with transaction.atomic():
            issue_note_data = request.data
            issue_note_data['issuer'] = request.user.id
            issue_note_serializer = IssueNoteCreateSerializer(data=issue_note_data)

            if issue_note_serializer.is_valid():
                issue_note_instance = issue_note_serializer.save()
                issue_note_id = issue_note_instance.id
                issue_note_state = issue_note_instance.state
                issue_note_material_data = issue_note_data.get('issue_note_materials', None)
                
                if issue_note_material_data:
                    issue_note_material_errors = self.create_issue_note_materials(issue_note_id, issue_note_state, issue_note_material_data)
                    if issue_note_material_errors:
                        has_errors = True
                        errors = {'issue_note_materials': issue_note_material_errors}
            else:
                has_errors = True
                errors = issue_note_serializer.errors
            if has_errors:
                transaction.set_rollback(True)

        if has_errors:
            return Response(data=errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(status=return_status)

    def put(self, request):

        errors = {}
        has_errors = False
        return_status = status.HTTP_200_OK

        with transaction.atomic():
            issue_note_data = request.data
            issue_note_id = issue_note_data.get('id', None)
            issue_note_instance = get_object_or_none(IssueNote, {'pk': issue_note_id})

            if issue_note_instance:
                issue_note_serializer = IssueNoteCreateSerializer(issue_note_instance, data=issue_note_data, partial=True)

                if issue_note_serializer.is_valid():
                    issue_note_instance = issue_note_serializer.save()
                    issue_note_state = issue_note_instance.state
                    issue_note_material_data = issue_note_data.get('issue_note_materials', None)

                    issue_note_material_errors = self.create_issue_note_materials(issue_note_id, issue_note_state, issue_note_material_data)
                    if issue_note_material_errors:
                        has_errors = True
                        errors = {'issue_note_materials': issue_note_material_errors}
                else:
                    has_errors = True
                    errors = issue_note_serializer.errors

                if has_errors:
                    transaction.set_rollback(True)
            else:
                has_errors = True
                errors = {'issue_note': 'Invalid issue note.'}

        if has_errors:
            return Response(data=errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(status=return_status)

    def create_issue_note_materials(self, issue_note_id, issue_note_state, issue_note_material_data):
        
        issue_note_materials_has_errors = False
        material_wise_errors = []
        
        with transaction.atomic():
            current_issue_note_material_ids = []

            for issue_note_material in issue_note_material_data:
                errors = {}
                issue_note_material_id = issue_note_material.get('issue_note_material_id', None)

                if issue_note_material_id:
                    issue_note_material_instance = get_object_or_none(IssueNoteMaterial, {'pk': issue_note_material_id})
                    if not issue_note_material_instance:
                        issue_note_materials_has_errors = True
                        errors['issue_note_material'] = 'Invalid issue note material.'
                        issue_note_material_serializer = None
                    else:
                        previous_issue_note_material_quantity = issue_note_material_instance.issue_quantity
                        issue_note_material_serializer = IssueNoteMaterialCreateSerializer(issue_note_material_instance, data=issue_note_material, partial=True)
                else:
                    issue_note_material['issue_note'] = issue_note_id
                    previous_issue_note_material_quantity = None
                    issue_note_material_serializer = IssueNoteMaterialCreateSerializer(data=issue_note_material)

                if issue_note_material_serializer and issue_note_material_serializer.is_valid():
                    issue_note_material_instance = issue_note_material_serializer.save()
                    current_issue_note_material_ids.append(issue_note_material_instance.id)
                    
                    in_house_material_errors = self.update_inhouse_material_available_quantity(issue_note_state, previous_issue_note_material_quantity, issue_note_material_instance)
                    if in_house_material_errors:
                        issue_note_materials_has_errors = True
                    errors.update(in_house_material_errors)

                elif issue_note_material_serializer:
                    issue_note_materials_has_errors = True
                    errors['issue_note_material'] = issue_note_material_serializer.errors

                material_wise_errors.append(errors)
        
            if issue_note_materials_has_errors:
                transaction.set_rollback(True)
                return material_wise_errors
            else:
                self.recover_in_house_materials(issue_note_state, issue_note_id, current_issue_note_material_ids)
                return None
      
    def update_inhouse_material_available_quantity(self, issue_note_state, previous_issue_quantity, issue_note_material):
        
        error = {}

        issue_quantity = issue_note_material.issue_quantity
        issue_quantity_units = issue_note_material.issue_quantity_units
        in_house_material_id = issue_note_material.in_house_material.id
        in_house_material = get_object_or_none(InHouseMaterial, {'pk': in_house_material_id})

        if in_house_material:
            if in_house_material.available_quantity >= issue_quantity:
                if previous_issue_quantity:
                    if issue_note_state == IssueNote.COMPLETE_STATUS:

                        if previous_issue_quantity > issue_quantity:
                            issue_quantity_difference = previous_issue_quantity - issue_quantity
                            converted_issue_quantity_difference = self.convert_issue_note_material_quantity(issue_quantity_difference, issue_quantity_units, in_house_material)
                            in_house_material.available_quantity = round(in_house_material.available_quantity + converted_issue_quantity_difference, 4)
                        
                        elif previous_issue_quantity < issue_quantity:
                            issue_quantity_difference = issue_quantity - previous_issue_quantity
                            converted_issue_quantity_difference = self.convert_issue_note_material_quantity(issue_quantity_difference, issue_quantity_units, in_house_material)
                            in_house_material.available_quantity = round(in_house_material.available_quantity - converted_issue_quantity_difference, 4)
                        else:
                            converted_issue_quantity = self.convert_issue_note_material_quantity(previous_issue_quantity, issue_quantity_units, in_house_material)
                            in_house_material.available_quantity = round(in_house_material.available_quantity - converted_issue_quantity, 4)
                else:
                    if issue_note_state == IssueNote.COMPLETE_STATUS:
                        converted_issue_quantity = self.convert_issue_note_material_quantity(issue_quantity, issue_quantity_units, in_house_material)
                        in_house_material.available_quantity = round(in_house_material.available_quantity - converted_issue_quantity, 4)
                in_house_material.save()
            else:
                error['issue_note_material'] = 'Issue quantity should not exceed the available quantity.'
        else:
            error['issue_note_material'] = 'Invalid issue note material.'
        
        return error
    
    def recover_in_house_materials(self, issue_note_state, issue_note_id, current_issue_note_material_ids):
        
        issue_note_materials = IssueNoteMaterial.objects.filter(issue_note__id=issue_note_id)
        deleted_issue_note_materials = issue_note_materials.exclude(id__in=current_issue_note_material_ids)
        for issue_note_material in deleted_issue_note_materials:
            deleted_issue_note_material_quantity = issue_note_material.issue_quantity
            deleted_issue_note_material_quantity_units = issue_note_material.issue_quantity_units
            in_house_material = issue_note_material.in_house_material
            converted_deleted_issue_note_material_quantity = self.convert_issue_note_material_quantity(deleted_issue_note_material_quantity, deleted_issue_note_material_quantity_units, in_house_material)
            if issue_note_state == IssueNote.COMPLETE_STATUS:
                in_house_material.available_quantity = round(in_house_material.available_quantity + converted_deleted_issue_note_material_quantity, 4)
            in_house_material.save()

        deleted_issue_note_materials.delete()

    def convert_issue_note_material_quantity(self, issue_note_material_quantity, issue_note_material_quantity_units, in_house_material):
        
        mh = MaterialUnitHelper()
        converted_issue_note_material_quantity = 0
        if issue_note_material_quantity > 0:
            in_house_material_available_quantity_units = in_house_material.available_quantity_units
            converted_issue_note_material_quantity = mh.convert_to_units(in_house_material_available_quantity_units, issue_note_material_quantity, issue_note_material_quantity_units)
        return converted_issue_note_material_quantity

   
class IssueNoteList(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = IssueNoteListSerializer
    
    def get(self, request, *args, **kwargs):
        queryset = IssueNote.objects.all().order_by('-id')
        serializer = self.serializer_class(queryset, many=True)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(serializer.data, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data, meta_data=None)
        return Response(serializer.data)


class IssueNoteDetail(generics.RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [STORES_ADMIN_ROLE, STORES_EDITOR_ROLE,]
    serializer_class = IssueNoteDetailSerializer
    queryset = IssueNote.objects.all().order_by('-id')
    lookup_field = 'pk'