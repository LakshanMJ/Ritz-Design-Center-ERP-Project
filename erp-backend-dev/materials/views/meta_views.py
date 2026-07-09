from django.forms import CharField
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from marketing.models import Item, OrderPackItemPlacementMaterial, POPackItemPlacement, POPackPlacement, OrderCostingVersion, OrderPackPlacementMaterial, OrderPackItemPlacementMaterial
from django.db.models import Q
from django.shortcuts import render
import django_filters
from materials.forms.form_factory import UserDefinedMaterialFormFactory
from marketing.utils.placement_material_utils import simplify_string
from materials.models import Material, SupplierInquiry, UserDefinedMaterial, UserDefinedMaterialAttribute, UserDefinedDropDownOption, PACKAGING_TYPES, CustomerBrandMaterialCode, CustomerBrandMaterial, GenericMaterialVariation, \
                                EmbellishmentType, EmbellishmentSubType, CustomerBrandMaterialCode, UserDefinedMaterialDefect, FabricColorTone, \
                                SupplierInquiryMaterialCode, SupplierInquiryDetail
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper, PerMeasuringUnitHelper
from shared.permissions.roles import MERCHANT_ADMIN_ROLE, MERCHANT_ROLE
from shared.permissions.view_permissions import HasPermission
from materials.serializers.material_serializers import UserDefinedMaterialDefectSerializer, UserDefinedMaterialSerializer, UserDefinedMaterialAttributeSerializer, UserDefinedDropDownOptionsSerializer, \
    UserDefinedMaterialAttributeDeleteSerializer, \
    UserDefinedDropdownOptionDeleteSerializer, SupplierInquiryMaterialDetailSerializer, \
    UserDefinedMaterialUpdateSerializer, UserDefinedAttributeDropdownListSerializer, CustomerBrandMaterialCodeSerializer, GenericMaterialVariationSerializer, EmbellishmentTypeSerializer, EmbellishmentSubTypeSerializer, \
    FabricColorToneSerializer, SupplierInquiryMaterialCodeSerilizer, SupplierCustomerBrandMaterialSerializer, MaterailLibrarySerializer, CostingCustomerBrandMaterialSerializer
from rest_framework.generics import ListAPIView, get_object_or_404
from shared.models import Customer, Supplier
from django.core import serializers
from django.db import IntegrityError
from shared.utils import generate_unique_hex, get_object_or_none
from django.http import JsonResponse
from shared.helpers.large_results_set_pagination import LargeResultsSetPagination
from materials.scripts.supplier_po_bom_generator import ActualPOBOMSupplierBOM
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination


class CompositionTypeMetaView(APIView):
    allowed_methods = ['GET', ]
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]

    def get(self, request):

        # Fabric Meta Data
        # fabric_compositions = Composition.objects.filter(type=Material.FABRIC_MATERIAL, active=True).order_by('name')
        # textures = FabricTexture.objects.filter(active=True).order_by('name')
        # variation_types = [{'id': variation_type[0], 'name': variation_type[1]} for variation_type in Fabric.TYPE_OPTIONS]

        fabric_data = {
            'composition': [],
            'texture': [], #FabricTextureSerializer(textures, many=True).data,
            'variation_type': [] #GenericMetaOptionSerializer(variation_types, many=True).data
        }
        return Response(fabric_data)
    

class UserDefinedMaterialListView(generics.ListAPIView):
    serializer_class = UserDefinedMaterialSerializer
    queryset = UserDefinedMaterial.objects.all().order_by('category')
    permission_classes = (HasPermission, )
    write_roles = ['merchant_admin', ]


class UserDefinedMaterialDetailDetailView(generics.RetrieveAPIView):
    serializer_class = UserDefinedMaterialSerializer
    queryset = UserDefinedMaterial.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant_admin', ]


class UserDefinedMaterialDetailCreateView(generics.CreateAPIView):
    serializer_class = UserDefinedMaterialSerializer
    queryset = UserDefinedMaterial.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant_admin', ]

    def create(self, request, *args, **kwargs):
        name = simplify_string(request.data.get('material'))
        request.data['name'] = name
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except IntegrityError:
            errors = ({"error":"Material name already exists."})
        return Response(data=errors, status=status.HTTP_400_BAD_REQUEST)
        

class UserDefinedMaterialDetailUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDefinedMaterialUpdateSerializer
    queryset = UserDefinedMaterial.objects.all()
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def update(self, request, *args, **kwargs):
        name = simplify_string(request.data.get('material'))
        request.data['name'] = name
        userdefinedmaterial = self.get_object()
        serializer = self.get_serializer(userdefinedmaterial, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class UserDefinedMaterialMeasurementListView(generics.ListAPIView):
    queryset = MaterialUnitHelper.CONSUMPTION_MEASURING_OPTIONS
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def list(self, request, *args, **kwargs):
        choices = [
            {"id": key, "name": value}
            for key, value in MaterialUnitHelper.CONSUMPTION_MEASURING_OPTIONS
        ]
        return Response(choices)


class UserDefinedMaterialAttributeDetailView(generics.RetrieveAPIView):
    serializer_class = UserDefinedMaterialAttributeSerializer
    queryset = UserDefinedMaterialAttribute.objects.all()
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class UserDefinedMaterialAttributeCreateView(generics.CreateAPIView):
    serializer_class = UserDefinedMaterialAttributeSerializer
    queryset = UserDefinedMaterialAttribute.objects.all()
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def create(self, request, *args, **kwargs):
        dropdown_options_data = request.data.get('userdefineddropdownoption_set', [])
        name = simplify_string(request.data.get('label'))
        material_id = request.data.get('material')
        error = []
        material = get_object_or_404(UserDefinedMaterial, pk=material_id)
        material_name = material.name + "_" + name
        try:
            user_material_attribute = UserDefinedMaterialAttribute.objects.get(name=material_name) # needed to trigger exception
            name_hex = generate_unique_hex(material_name)
            request.data['name'] = name_hex
        except ObjectDoesNotExist:
            request.data['name'] = material_name
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attribute = serializer.save()

        if attribute.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
            for option_data in dropdown_options_data:
                if option_data.get('display_value'):
                    option_data['value'] = simplify_string(option_data.get('display_value'))
                    exits_options = UserDefinedDropDownOption.objects.filter(attribute=attribute, **option_data)
                    if exits_options.exists():
                        return Response({"error":"Dropdown option cannot be duplicate."}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        UserDefinedDropDownOption.objects.create(attribute=attribute, **option_data)

        return Response(serializer.data, status=status.HTTP_200_OK)


class UserDefinedMaterialAttributeUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDefinedMaterialAttributeSerializer
    queryset = UserDefinedMaterialAttribute.objects.all()
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def update(self, request, *args, **kwargs):
        userdefinedmaterialattribute = self.get_object()
        dropdown_options_data = request.data.get('userdefineddropdownoption_set', [])
        request.data['name'] = userdefinedmaterialattribute.name
        serializer = self.get_serializer(userdefinedmaterialattribute, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if userdefinedmaterialattribute.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
            existing_options = userdefinedmaterialattribute.userdefineddropdownoption_set.all()
            for option_data in dropdown_options_data:
                option_value = option_data.get('display_value')
                option_id = option_data.get('id')
                try:
                    if option_value:
                        option = existing_options.get(id=option_id)
                        exits_options = UserDefinedDropDownOption.objects.filter(attribute=userdefinedmaterialattribute, display_value=option_value)
                        if exits_options.exists():
                            return Response({"display_value":"Dropdown option cannot be duplicate."}, status=status.HTTP_400_BAD_REQUEST)
                        else:
                            option.value = simplify_string(option_value)
                            option.display_value = option_value
                            option.save()
                    else:
                        return Response({"display_value":"Dropdown option cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
                except ObjectDoesNotExist:
                    if option_value:
                        exits_options = UserDefinedDropDownOption.objects.filter(attribute=userdefinedmaterialattribute, **option_data)
                        if exits_options.exists():
                            return Response({"display_value":"Dropdown option cannot be duplicate."}, status=status.HTTP_400_BAD_REQUEST)
                        else:
                            UserDefinedDropDownOption.objects.create(attribute=userdefinedmaterialattribute, **option_data)
                    else:
                        errors = ()
                        return Response({"display_value":"Dropdown option cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class UserDefinedMaterialAttributeDeleteView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDefinedMaterialAttributeDeleteSerializer
    queryset = UserDefinedMaterialAttribute.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant_admin', ]


class UserDefinedDropdownOptionListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = ['merchant_admin', ]
    serializer_class = UserDefinedAttributeDropdownListSerializer
    queryset = UserDefinedMaterialAttribute.objects.filter(attribute_type=UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE).order_by('-id')


class UserDefinedDropdownOptionDeleteView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDefinedDropdownOptionDeleteSerializer
    queryset = UserDefinedDropDownOption.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant_admin', ]


class UserDefinedDropDownFieldOptions(ListAPIView):
    serializer_class = UserDefinedDropDownOptionsSerializer
    queryset = UserDefinedMaterialAttribute.objects.all()
    permission_classes = (HasPermission,)
    write_roles = ['merchant', ]

    def get_queryset(self):
        attribute_id = self.kwargs.get('attribute_id')
        attribute = get_object_or_404(UserDefinedMaterialAttribute, pk=attribute_id)
        options = attribute.get_dropdown_options()
        return options


class ConsumptionMeasuringUnits(APIView):
    permission_classes = (HasPermission, )

    def get(self, request):
        special_length_units = [MaterialUnitHelper.PIECES_UNIT, MaterialUnitHelper.METERS_2500_UNIT, MaterialUnitHelper.METERS_5000_UNIT]
        response_data = {
            'per_unit_options': [{'value': row[0], 'display_value': row[1]} for row in PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS],
            'all': [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS],
            'standard_length_units': [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.ALL_MEASURING_UNITS if not row[0] in special_length_units],
            MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.LENGTH_UNITS],
            MaterialUnitHelper.PIECES_UNIT: [{'value': row[0], 'display_value': row[1]} for row in MaterialUnitHelper.PIECE_UNITS],
        }
        return Response(response_data)


class MeasureMentOptions(APIView):
    permission_classes = (HasPermission, )

    def get(self, request):
        data = MaterialUnitHelper.CONSUMPTION_MEASURING_OPTIONS
        response_data = [{'value': row[0], 'display_value': row[1]} for row in data]
        return Response(response_data)


class GenricMaterialListView(generics.ListAPIView):
    queryset= CustomerBrandMaterial.objects.all().order_by('-id')
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]
    pagination_class = LargeResultsSetPagination   
    
    def get_customer_headers(self):
        headers = [
        {
            "label": "Customer",
            "name": "customer_name",
            "value": CustomerBrandMaterial.CUSTOMER_NAME
        },
        {
            "label": "Ritz Reference Code",
            "name": CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY,
            "value": CustomerBrandMaterial.VERBOSE_MATERIAL_VARIATION_REFERENCE_CODE_ID_KEY
        },
        {
            "label": "Material Reference Code",
            "name": "reference_code",
            "value": CustomerBrandMaterialCode.CUSTOMER_BRAND_MATERIAL_CODE_KEY
        }
        ]
        return headers
    
    def filter_query_by_customers(self, customer_ids, material_id):
        customer_ids = [int(id) for id in customer_ids.split(',')]
        customers = Customer.objects.filter(id__in=customer_ids)
        customer_brand_material_ids = CustomerBrandMaterial.objects.filter(material_code__customer_brand__customer__in=customers).values_list('id', flat=True)
        queryset = self.queryset.filter(id__in=customer_brand_material_ids,  material_detail__generic_material__user_material__id=material_id)
        return queryset 
        
    def filter_query_by_items(self, item_ids, material_id):
        item_ids = [int(id) for id in item_ids.split(',')]
        customer_brand_ids = Item.objects.filter(id__in=item_ids).values_list('customer_brand', flat=True)
        customer_brand_material_ids = CustomerBrandMaterial.objects.filter(material_code__customer_brand__in=customer_brand_ids).values_list('id', flat=True)
        queryset = self.queryset.filter(id__in=customer_brand_material_ids,  material_detail__generic_material__user_material__id=material_id)
        return queryset
    
    def filter_query_by_customer_and_items(self, customer_ids, item_ids, material_id):
        customer_ids = [int(id) for id in customer_ids.split(',')]
        item_ids = [int(id) for id in item_ids.split(',')]
        
        customer_brand_ids = Item.objects.filter(id__in=item_ids).values_list('customer_brand', flat=True)
        customers = Customer.objects.filter(id__in=customer_ids)
        
        customer_brand_material_ids = CustomerBrandMaterial.objects.filter(
            material_code__customer_brand__customer__in=customers,
            material_code__customer_brand__in=customer_brand_ids).values_list('id', flat=True)
       
        queryset = self.queryset.filter(id__in=customer_brand_material_ids, material_detail__generic_material__user_material__id=material_id)
        return queryset
    
    def filter_query_by_item_and_material_category(self, material_id, item_ids, material_categories):
        item_ids = [int(id) for id in item_ids.split(',')]
        material_categories = material_categories.split(',') if material_categories else []
        customer_brand_ids = Item.objects.filter(id__in=item_ids).values_list('customer_brand', flat=True)
        generic_material_ids = CustomerBrandMaterial.objects.filter(
            material_detail__generic_material__user_material__category__in=material_categories,
            material_code__customer_brand__in=customer_brand_ids).values_list('id', flat=True)
        queryset = self.queryset.filter(id__in=generic_material_ids,  material_detail__generic_material__user_material__id=material_id)
        return queryset
    
    def get_user_defined_material_attribute_by_material_id(self, material_id, query_params):
       
        fields_to_return = ['attribute_type', 'name', 'is_material_variation']
        attributes = UserDefinedMaterialAttribute.objects.filter(
            material_id=material_id
        ).values_list(*fields_to_return)

        filters = Q()

        for attribute in attributes:
            attribute_type, attribute_name, is_material_variation = attribute

            if attribute_name in query_params and query_params[attribute_name]:
                query_value = query_params[attribute_name]
                if is_material_variation:
                    if attribute_type == 'dropdown':
                        dropdown_option_ids = UserDefinedDropDownOption.objects.filter(
                            attribute__material_id=material_id,
                            display_value__icontains=query_value
                        ).values_list('id', flat=True)

                        if dropdown_option_ids.exists():
                            filters |= Q(
                                material_detail__genericmaterialvariation__user_defined_material_data__contains={
                                    attribute_name: list(dropdown_option_ids)
                                }
                            )
                    else:
                        filters |= Q(
                            material_detail__generic_material__user_defined_material_data__contains={
                                attribute_name: query_value
                            }
                        )
                else:
                    if attribute_type == 'dropdown':
                        dropdown_option_ids = UserDefinedDropDownOption.objects.filter(
                            attribute__material_id=material_id,
                            display_value__icontains=query_value
                        ).values_list('id', flat=True)
                        if dropdown_option_ids.exists():
                            q_query = { f'material_detail__generic_material__user_defined_material_data__{attribute_name}__in':list(dropdown_option_ids)}
                            filters |= Q(
                                                            
                                **q_query
                            )
                            
                    else:
                        filters |= Q(
                            material_detail__generic_material__user_defined_material_data__contains={
                                attribute_name: query_value
                            }
                        )
             
        return filters
    
    def get_queryset(self):
        material_id = self.kwargs.get('material_id')
        customer_ids = self.request.GET.get('customer_ids', None)
        item_ids = self.request.GET.get('item_ids', None)
        query_params = self.request.query_params
        
        filters = self.get_user_defined_material_attribute_by_material_id(material_id, query_params)
       
        if customer_ids and not item_ids:
            queryset = self.filter_query_by_customers(customer_ids, material_id)
            queryset = queryset.filter(filters)
            return queryset
        elif item_ids and not customer_ids:
            queryset = self.filter_query_by_items(item_ids, material_id)
            queryset = queryset.filter(filters)
            return queryset
        elif customer_ids and item_ids:
            queryset = self.filter_query_by_customer_and_items(customer_ids, item_ids, material_id)
            queryset = queryset.filter(filters)
            return queryset
        else:
            queryset = self.queryset.filter(material_detail__generic_material__user_material__id=material_id)
        queryset = queryset.filter(filters)
        return queryset

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        attributes = []
        if page is not None and len(page) != 0:
            customer_headers = self.get_customer_headers()
            headers = customer_headers
            user_defined_material = page[0].material_detail.generic_material.user_material
            material = user_defined_material.material
            headers.extend(user_defined_material.get_material_headers(user_defined_material.name))
            
            for customer_brand_material in page:
                eav_attributes = customer_brand_material.get_attributes()
                if customer_brand_material.material_code.customer_brand:
                    eav_attributes['customer_name'] = customer_brand_material.material_code.customer_brand.customer.name
                    eav_attributes['customer_brand_id'] = customer_brand_material.material_code.customer_brand.id
                else:
                    eav_attributes['customer_name'] = None
                    eav_attributes['customer_brand_id'] = None
                attributes.append(eav_attributes)

            filter_attributes = self.filter(request, attributes)
            data = {
                'material': material,
                'headers': headers,
                'data': filter_attributes
            }
            return self.get_paginated_response(data)
            
        return Response({'status':'Material not found'}, status=status.HTTP_200_OK)

    def filter(self, request, data):
        query_parameters = request.GET
        filter_data = []

        if query_parameters and 'page' not in query_parameters:
            for item in data:
                if any(str(item.get(key, '').lower()) == value.lower() for key, value in query_parameters.items()):
                    filter_data.append(item)
            return filter_data
        return data

class MaterailLibraryListView(generics.ListAPIView):
    queryset= CustomerBrandMaterial.objects.all().order_by('-id')
    serializer_class = MaterailLibrarySerializer
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]
    pagination_class = GeneralLargeResultsSetPagination   
 
    def filter_queryset_by_params(self, customer_ids=None, item_ids=None, material_categories=None):
        filters = Q()

        if customer_ids:
            customer_ids = [int(id) for id in customer_ids.split(',')]
            customers = Customer.objects.filter(id__in=customer_ids)
            filters &= Q(material_code__customer_brand__customer__in=customers)

        if item_ids:
            item_ids = [int(id) for id in item_ids.split(',')]
            customer_brand_ids = Item.objects.filter(id__in=item_ids).values_list('customer_brand', flat=True)
            filters &= Q(material_code__customer_brand__in=customer_brand_ids)

        if material_categories:
            material_categories = material_categories.split(',')
            filters &= Q(material_detail__generic_material__user_material__category__in=material_categories)

        return self.queryset.filter(filters).order_by('material_detail__generic_material__user_material__display_order')

    def get_queryset(self):
        customer_ids = self.request.GET.get('customer_ids', None)
        item_ids = self.request.GET.get('item_ids', None)
        material_categories = self.request.GET.get('material_categories', None)
        return self.filter_queryset_by_params(customer_ids, item_ids, material_categories)
    

class CustomerBrandMaterialDeleteView(APIView):
    permission_classes = (HasPermission, )
    pagination_class = GeneralLargeResultsSetPagination
    write_roles = ['admin', ]
 
    def post(self, request, material_id):
        data = []
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        version_ids = list(OrderPackItemPlacementMaterial.objects.filter(material=material).values_list('placement__order_pack_item__pack__version', flat=True)) + \
                    list(OrderPackPlacementMaterial.objects.filter(material=material).values_list('placement__order_pack__version'))
        costings = OrderCostingVersion.objects.filter(id__in=version_ids)
        if costings.exists():
            for costing in costings:
                data.append({
                    'id': costing.id,
                    'order_id': costing.order.id,
                    'display_name': costing.ritz_code,
                    'short_code': costing.short_code,
                    'long_code': costing.long_code
                })
            http_response = Response({'success': False, 'results': data}, status=status.HTTP_403_FORBIDDEN)
        else:
            material.delete()
            http_response = Response({'success': True})
        return http_response

class CustomerBrandMaterialListView(generics.ListAPIView):
    serializer_class = CustomerBrandMaterialCodeSerializer
    queryset = CustomerBrandMaterialCode.objects.all()
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        generic_material_variation = get_object_or_404(GenericMaterialVariation, pk=self.kwargs['generic_material_variation_id'])
        queryset = self.queryset.filter(material_definition=generic_material_variation.generic_material)
        return queryset

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        attributes = []

        if page is not None:
            try:
                user_defined_material = page[0].material_detail.generic_material.user_material
                material = user_defined_material.name
                headers = user_defined_material.get_material_headers(user_defined_material.name)
                for customer_brand_material in page:
                    customer_brand_material_attribute = customer_brand_material.get_customer_brand_material_details()
                    attributes.append(customer_brand_material_attribute)
                filter_attributes = self.filter(request, attributes)
                data = {
                    'material':material,
                    'headers':headers,
                    'data':filter_attributes
                }
                return self.get_paginated_response(data)
            except ObjectDoesNotExist:
                return Response({'errors':'Data not found'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'errors': 'Data not found'}, status=status.HTTP_400_BAD_REQUEST)

    def filter(self, request, data):
        query_parameters = request.GET
        filter_data = []

        if query_parameters and 'page' not in query_parameters:
            for item in data:
                if any(str(item.get(key, '')).lower() == value.lower() for key, value in query_parameters.items()):
                    filter_data.append(item)
            return filter_data
        return data


class EmbellishmentTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmbellishmentTypeSerializer
    queryset = EmbellishmentType.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class EmbellishmentTypeRetriveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = EmbellishmentTypeSerializer
    queryset = EmbellishmentType.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class EmbellishmentSubTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmbellishmentSubTypeSerializer
    queryset = EmbellishmentSubType.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class EmbellishmentSubTypeRetriveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = EmbellishmentSubTypeSerializer
    queryset = EmbellishmentSubType.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class UserDefinedMaterialDefectCreateView(generics.ListCreateAPIView):
    serializer_class = UserDefinedMaterialDefectSerializer
    queryset = UserDefinedMaterialDefect.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class UserDefinedMaterialDefectUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserDefinedMaterialDefectSerializer
    queryset = UserDefinedMaterialDefect.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class FabricColorToneListCreateView(generics.ListCreateAPIView):
    serializer_class = FabricColorToneSerializer
    queryset = FabricColorTone.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class FabricColorToneDetailUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = FabricColorToneSerializer
    queryset = FabricColorTone.objects.all()
    permission_classes = (HasPermission, )
    write_roles = ['merchant', ]


class CostingVersionMaterialListView(APIView):
    queryset = UserDefinedMaterial.objects.all()
    permission_classes = (HasPermission, )

    def get_costing_materials(self, version, material_type):
        # inquiry_material_ids = SupplierInquiryDetail.objects.filter(
        #     supplier_inquiry__version=version,
        #     supplier_inquiry_material_code__customer_brand_material__material_detail__generic_material__user_material__category=material_type,
        #     completed=True,
        # ).values_list('supplier_inquiry_material_code', flat=True).distinct()
        item_material_ids = OrderPackItemPlacementMaterial.objects.filter(
            placement__item_attribute_other__version=version,
            material__material_detail__generic_material__user_material__category=material_type,
        ).values_list('material', flat=True).distinct()

        pack_material_ids = OrderPackPlacementMaterial.objects.filter(
            placement__item_attribute_other__version=version,
            material__material_detail__generic_material__user_material__category=material_type,
        ).values_list('material', flat=True).distinct()
        material_ids = [*item_material_ids, *pack_material_ids]
        return material_ids
    
    def get_material_supplier_inquiry_data(self, version, material):
        data = {}
        #print(material.material_detail.generic_material.user_material.name)
        supplier_inquiry_detail = SupplierInquiryDetail.objects.filter(
                supplier_inquiry__version=version, 
                supplier_inquiry__customer_brand_material=material, 
            ).order_by('-created').first()

        if supplier_inquiry_detail:
            data = {
                'supplier_name': supplier_inquiry_detail.supplier_inquiry.supplier.name,
                'supplier_id': supplier_inquiry_detail.supplier_inquiry.supplier.id,
                'cost_per_unit': supplier_inquiry_detail.cost_per_unit,
                'costing_unit': supplier_inquiry_detail.get_costing_unit_display(),
                'expiration_date': supplier_inquiry_detail.expiration_date,
            }

        return data


    def get(self, request, costing_version_id):
        version = get_object_or_404(OrderCostingVersion, pk=costing_version_id)
        data = []
        for material_type, display_value in UserDefinedMaterial.USER_DEFINED_MATERIAL_TYPES:
            material_category_data = {
                "id": material_type,
                "display_value": display_value,
                "data": []
            }
            material_ids = self.get_costing_materials(version, material_type)
            materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).order_by(
                'material_detail__generic_material__user_material__name',
                'material_detail__generic_material__user_material__display_order'
            )
            for material in materials:
                material_serialize_data = CostingCustomerBrandMaterialSerializer(material, many=False).data
                inquiry_data = self.get_material_supplier_inquiry_data(version, material)
                material_serialize_data['supplier_inquiry_data'] = inquiry_data
                material_serialize_data['supplier_material_reference_code'] = material.material_code.customer_reference_code,
                material_category_data['data'].append(material_serialize_data)
            data.append(material_category_data)
        return Response(data)


class CustomerBrandMaterialSupplierList(APIView):
    allowed_methods = ['GET', ]
    permission_classes = (HasPermission, )

    def get(self, request, material_id):
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        print(material)
        data = []
        material_codes = material.supplierinquirymaterialcode_set.all().distinct('supplier')
        for material_code in material_codes:
            data.append({
                'id': material_code.supplier.id,
                'name': material_code.supplier.name,
                'supplier_material_reference_code': material_code.supplier_material_reference_code,
                'payment_term': material_code.supplier.payment_term,
                'shipping_mode': material_code.supplier.shipping_mode,
                'ex_fty_to_inhouse': material_code.supplier.ex_fty_to_inhouse,
                'fob_to_inhouse': material_code.supplier.fob_to_inhouse,
                'remarks': material_code.supplier.remarks,

            })
        return Response(data)


class CustomerBrandMaterialCostingList(APIView):
    permission_classes = (HasPermission, )

    def get(self, request, material_id):
        material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
        data = []
        version_ids = list(OrderPackItemPlacementMaterial.objects.filter(material=material).values_list('placement__order_pack_item__pack__version', flat=True)) + \
                    list(OrderPackPlacementMaterial.objects.filter(material=material).values_list('placement__order_pack__version'))
        costings = OrderCostingVersion.objects.filter(id__in=version_ids)
        for costing in costings:
            data.append({
                'id': costing.id,
                'order_id': costing.order.id,
                'display_name': costing.ritz_code,
                'short_code': costing.short_code,
                'long_code': costing.long_code
            })
        return Response(data)


class CustomerBrandMaterialList(APIView):
    queryset = CustomerBrandMaterial.objects.all()
    permission_classes = (HasPermission, )

    def get(self, request, *args, **kwargs):
        customer_brand_id = self.kwargs.get('customer_brand_id', None)
        material_type = request.GET.get('material_type', None)
        materials = CustomerBrandMaterial.objects.filter(
            material_code__customer_brand_id=customer_brand_id
        )
        material_object = get_object_or_404(UserDefinedMaterial, name=material_type)

        if material_type:
            materials = materials.filter(material_detail__generic_material__user_material__name=material_type)

        data = []

        for material in materials:
            data.append(material.get_attributes())

        response = {
            'data': data,
            'headers': material_object.get_material_headers(material_object.name)
        }
        return Response(response)