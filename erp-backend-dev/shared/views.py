from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.views import TokenRefreshView
import datetime
from materials.serializers.material_serializers import SupplierInquirySerializer
from shared.exceptions.exceptions import CustomInvalidToken
from .permissions.roles import MERCHANT_ADMIN_ROLE, MERCHANT_ROLE, ALL_USER_ROLES, IE_USER_ROLE, TRANSPORT_ADMIN_ROLE, ALL_ROLES, STORES_USER_ROLE, STORES_ADMIN_ROLE, STORES_MANAGER_ROLE
from .serializers import *
from rest_framework import views
from rest_framework import generics, response, status
from shared.permissions.view_permissions import HasPermission
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import render, get_object_or_404
from marketing.utils.aws_utils import handle_uploaded_file
import os
from .utils import get_object_or_none_qs, get_object_or_none
from shared.models import SHIPPING_MODE_TYPES, COSTING_MODE_TYPES, CREDIT_DAYS_30_PAYMENT_METHOD_TYPE
from marketing.serializers import ItemSerializer
from django.db.models import Q
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from django.db import transaction


# Customer Views
class CustomerCreateListView(generics.ListCreateAPIView):
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def post(self, request):
        serializer = CustomerSerializer(data=request.data)
        brands = request.data.get('brands', [])
        if serializer.is_valid():
            instance = serializer.save()
            instance.brands.add(*brands)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomerUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def put(self, request, pk):
        instance = self.get_object()
        brands = request.data.get('brands', [])
        serializer = CustomerSerializer(instance=instance, data=request.data)
        if serializer.is_valid():
            serializer.update(instance=instance, validated_data=serializer.validated_data)
            instance.brands.add(*brands)
            remove_brands = instance.brands.exclude(id__in=brands).values_list('id', flat=True)
            instance.brands.remove(*remove_brands)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomerContactPersonListCreateView(generics.ListCreateAPIView):
    queryset = CustomerContactPerson.objects.all().order_by('-id')
    serializer_class = CustomerContactPersonSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class CustomerContactPersonUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = CustomerContactPerson.objects.all().order_by('-id')
    serializer_class = CustomerContactPersonSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


# Brand views
class BrandCreateListView(generics.ListCreateAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class BrandUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


# Supplier views
class SupplierCreateListView(generics.ListCreateAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SupplierUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SupplierListView(generics.ListAPIView):
    serializer_class = SupplierSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get_queryset(self):
        material_category = self.request.GET.get('material_category', None)
        supplier_type = self.request.GET.get('supplier_type', None)
        queryset = Supplier.objects.filter(active=True).order_by('name')
        if material_category:
            queryset = queryset.filter(Q(materials__category=material_category)).distinct()
        if supplier_type:
            queryset = queryset.filter(supplier_type=supplier_type)
        return queryset


class SupplerContactPersonListCreateView(generics.ListCreateAPIView):
    queryset = SupplierContactPerson.objects.all().order_by('-id')
    serializer_class = SupplierContactPersonSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SupplierContactPersonUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = SupplierContactPerson.objects.all().order_by('-id')
    serializer_class = SupplierContactPersonSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SupplierCustomerBrandListCreateView(generics.ListCreateAPIView):
    queryset = SupplierBrand.objects.all().order_by('-id')
    serializer_class = SupplierBrandSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def create_or_update_supplier_brands(self, supplier_id, customer_brands):
        for brand_id in customer_brands:
            SupplierBrand.objects.create(supplier_id=supplier_id, customer_brand_id=brand_id)

    def create(self, request, *args, **kwargs):
        serializer = SupplierBrandPayloadSerializer(data=request.data)

        if serializer.is_valid():
            supplier_id = serializer.validated_data['supplier_id']
            customer_brands = serializer.validated_data['customer_brands']
            self.create_or_update_supplier_brands(supplier_id, customer_brands)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomerBrandsNotInSupplierBrandView(generics.ListAPIView):
    serializer_class = CustomerBrandSerializer
    permission_classes = (HasPermission, )

    def get_queryset(self):
        supplier_id = self.kwargs.get('supplier_id')
        existing_customer_brand_ids = SupplierBrand.objects.filter(supplier_id=supplier_id).values_list('customer_brand_id', flat=True)
        return CustomerBrand.objects.exclude(id__in=existing_customer_brand_ids)
    

class SupplierBrandDeleteView(generics.RetrieveDestroyAPIView):
    queryset = SupplierBrand.objects.all().order_by('-id')
    serializer_class = SupplierBrandSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SupplierMaterialListCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]
    serializer_class = SupplierMaterialSerializer

    def create_or_update_supplier_materials(self, supplier, material_ids):
        for material_id in material_ids:
            material = get_object_or_404(UserDefinedMaterial, pk=material_id)
            supplier.materials.add(material)

    def create(self, request, *args, **kwargs):
        serializer = SupplierMaterialsPayloadSerializer(data=request.data)
        if serializer.is_valid():
            supplier_id = serializer.validated_data['supplier_id']
            supplier = get_object_or_404(Supplier, pk=supplier_id)
            material_ids = serializer.validated_data['supplier_materials']
            self.create_or_update_supplier_materials(supplier, material_ids)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class SupplierMaterialsNotInSupplierMaterialdView(generics.ListAPIView):
    serializer_class = SupplierMaterialSerializer
    permission_classes = (HasPermission, )

    def get_queryset(self):
        supplier_id = self.kwargs.get('supplier_id')
        supplier = get_object_or_404(Supplier, pk=supplier_id)
        existing_supplier_material_ids = supplier.materials.all().values_list('id', flat=True)
        return UserDefinedMaterial.objects.exclude(id__in=existing_supplier_material_ids)
    

class SupplierMaterialDeleteView(generics.RetrieveDestroyAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        response = self.perform_destroy(instance)
        if response:
            return Response({'status':'deleted'}, status=status.HTTP_200_OK)
        else:
            return Response({'error':'Material not found.'}, status=status.HTTP_400_BAD_REQUEST)

    def perform_destroy(self, instance):
        material_id = self.kwargs.get('material_id')
        try:
            material = instance.materials.get(pk=material_id)
            instance.materials.remove(material)
            return True
        except UserDefinedMaterial.DoesNotExist:
            return False
    

class SupplierMetaDataView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        shipping_modes = []
        for choice in SHIPPING_MODE_TYPES:
            shipping_modes.append({"id": choice[0], "name": choice[1]})
        costing_modes = []
        for choice in COSTING_MODE_TYPES:
            costing_modes.append({"id": choice[0], "name": choice[1]})
        location_choices = []
        for choice in Supplier.LOCATION_CHOICE:
            location_choices.append({"id": choice[0], "name": choice[1]})
        payment_method_types = []
        for choice in PAYMENT_METHOD_TYPES:
            payment_method_types.append({"id": choice[0], "name": choice[1]})

        metadata = {
            'shipping_modes': shipping_modes,
            'costing_modes': costing_modes,
            'location_choices': location_choices,
            'payment_method_types': payment_method_types,
        }
        return Response(metadata)
    

class SupplierPaginateListView(generics.ListCreateAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = qs.filter(name__icontains=search_text)
        return qs


# Season Views
class SeasonCreateListView(generics.ListCreateAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SeasonUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class MetaDataListView(views.APIView):
    allowed_methods = ['GET',]
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request):
        customer_objects = Customer.objects.all()
        customer_serializer = CustomerSerializer(customer_objects, many=True)
        brand_objects = Brand.objects.all()#.values('id', 'name', 'cod')
        brand_serializer = BrandSerializer(brand_objects, many=True)
        season_objects = Season.objects.all()#.values('id', 'name')
        season_serializer = SeasonSerializer(season_objects, many=True)
        country_objects = Country.objects.all()#.values('id', 'name')
        country_serializer = CountrySerializer(country_objects, many=True)
        current_year = datetime.now().year
        current_year -= 1
        year_list = [{'id': current_year + i, 'name': current_year + i} for i in range(0, 5)]
        size_objects = SizeCategory.objects.all()
        size_serializer = SizeCategoryListSerializer(size_objects, many=True)
        colorway_category_objects = ColorwayCategory.objects.all()
        colorway_category_serializer = ColorwayCategorySerializer(colorway_category_objects, many=True)
        plant_objects = Plant.objects.all()
        plant_serializer = PlantSerializer(plant_objects, many=True)
        department = CustomerBrandDepartment.objects.all()
        department_serializer = CustomerBrandDepartmentSerializer(department, many=True)

        package_type_objects = []
        for choice in OrderInquiry.TYPE_CHOICES:
            package_type_objects.append({"id": choice[0], "name": choice[1]})
        costing_method = []
        for choice in OrderInquiry.COSTING_METHODE_CHOICES:
            costing_method.append({"id": choice[0], "name": choice[1]})
        package_type_serializer = PackageTypeSerializer(
            package_type_objects, many=True)
        response_data = {
            'customers': customer_serializer.data,
            'brands': brand_serializer.data,
            'seasons': season_serializer.data,
            'pack_types': package_type_serializer.data,
            'countries': country_serializer.data,
            'year_list': year_list,
            'sizes': size_serializer.data,
            'colorway_categories': colorway_category_serializer.data,
            'costing_methods': costing_method,
            'plants': plant_serializer.data,
            'departments': department_serializer.data
        }
        return response.Response(response_data)


# User Views
class UserCreateListView(generics.ListCreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    queryset = User.objects.all().order_by('-id')
    serializer_class = UserSerializer
    

class UserUpdateDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    queryset = User.objects.all().order_by('-id')
    serializer_class = UserUpdateSerializer


class UserDetailUpdateDetailView(generics.UpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [ALL_USER_ROLES,]
    serializer_class = UserDetailSerializer
    queryset = User.objects.all()

    def get_object(self):
        return self.request.user
    
    def partial_update(self, request, *args, **kwargs):
        self.kwargs['partial'] = True
        return super().update(request, *args, **kwargs)
    
    def get(self, request):
        user = request.user
        if user.is_authenticated:
            serializer = UserDetailSerializer(user)
            return response.Response(serializer.data)
        else:
            return response.Response({"status":"User is not authenticated"})


class UsersListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    queryset = Role.objects.all().order_by('-id')
    serializer_class = UsersListSerializer

    def get_queryset(self):
        role = self.request.GET.get('role')
        role_object = get_object_or_404(Role, name__iexact=role)
        users = role_object.users.all()
        return users


class JWTRefreshToken(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            response = super(JWTRefreshToken, self).post(
                request, *args, **kwargs)
        except InvalidToken:
            raise CustomInvalidToken()
        return response


class CountryCreateListView(generics.ListCreateAPIView):
    queryset = Country.objects.all().order_by('-id')
    serializer_class = CountrySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class CountryUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Country.objects.all().order_by('-id')
    serializer_class = CountrySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


# Size Category
class SizeCategoryCreateView(generics.CreateAPIView):
    queryset = SizeCategory.objects.all()
    serializer_class = SizeCategorySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SizeCategoryEditView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SizeCategory.objects.all()
    serializer_class = SizeCategorySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SizeCategoryDetailView(generics.RetrieveAPIView):
    queryset = SizeCategory.objects.all()
    serializer_class = SizeCategorySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SizeCategoryListView(generics.ListAPIView):
    queryset = SizeCategory.objects.all()
    serializer_class = SizeCategorySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]



# Size
class SizeCreateView(generics.CreateAPIView):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class SizeEditView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class SizeDetailView(generics.RetrieveAPIView):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]


class SizeListView(generics.ListAPIView):
    serializer_class = SizeCategoryListSerializer
    queryset = SizeCategory.objects.all().order_by('id')
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]


class SizeFlatListView(generics.ListAPIView):
    serializer_class = SizeSerializer
    queryset = Size.objects.all().order_by('category_id', 'sorting_order')
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ColorwayCategoryCreateListView(generics.ListCreateAPIView):
    queryset = ColorwayCategory.objects.all().order_by('-id')
    serializer_class = ColorwayCategorySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ColorwayCategoryUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = ColorwayCategory.objects.all().order_by('-id')
    serializer_class = ColorwayCategorySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]
    

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (HasPermission, )

    def get(self, request):
        user = request.user
        if user.is_authenticated:
            serializer = UserSerializer(user)
            return response.Response(serializer.data)
        else:
            return response.Response({"status":"User is not authenticated"})
        
        

class RoleCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = RoleSerializer
    queryset = Role.objects.all()


class RoleListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = RoleListSerializer
    queryset = Role.objects.all()


class UserAddRoleView(generics.UpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = UserAddRoleSerializer
    queryset = User.objects.all()


class UserRoleDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    
    def delete(self, request, user_id, role_id):
        role = get_object_or_404(Role, pk=role_id)
        user = get_object_or_404(User, pk=user_id)
        role.users.remove(user)
        return Response({"message": "User removed from the role successfully."})
    
    
class UserGroupDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    
    def delete(self, request, user_id, group_id):
        group = get_object_or_404(Group, pk=group_id)
        user = get_object_or_404(User, pk=user_id)
        user.groups.remove (group)
        return Response({"message": "User removed from the group successfully."})
    

class RoleGroupDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [ADMIN_ROLE, ]
    
    def delete(self, request, role_id, group_id):
        group = get_object_or_404(Group, pk=group_id)
        role = get_object_or_404(Role, pk=role_id)
        role.groups.remove (group)
        return Response({"message": "Role removed from the group successfully."})


class RoleDetailView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = RoleListSerializer
    queryset = Role.objects.all()


class GroupDetailView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = GroupSerializer
    queryset = Group.objects.all()

    def put(self, request, *args, **kwargs):
        role_error_status = False
        role_error_list = []
        if "role_set" in request.data:
            for role_id in request.data["role_set"]:
                try:
                    role = Role.objects.get(id=role_id)
                    role.groups.add(kwargs["pk"])
                except Role.DoesNotExist:
                    role_error_status = True
                    role_error_list.append({"id": role_id, "status": "Invalid pk - object does not exist."})

        response = super().put(request, *args, **kwargs)
        if role_error_status:
            response.status_code = status.HTTP_401_UNAUTHORIZED
            for role_error in role_error_list:
                response.data['role_set'].append(role_error)
        return response
    

class GroupCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = GroupSerializer
    queryset = Group.objects.all()

    def post(self, request, *args, **kwargs):

        group = super().post(request, *args, **kwargs)
        if "role_set" in request.data:
            for role_id in request.data["role_set"]:
                try:
                    role = Role.objects.get(id=role_id)
                    role.groups.add(group.data["id"])
                    group.data["role_set"].append({"id": role.id, "name": role.name})
                except Role.DoesNotExist:
                    group.status_code = status.HTTP_401_UNAUTHORIZED
                    group.data["role_set"].append({"id": role_id, "status": "Invalid pk - object does not exist."})
        return group


class GroupListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = GroupSerializer
    queryset = Group.objects.all()


class GroupAddPermissionView(generics.UpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [ADMIN_ROLE, ]

    serializer_class = GroupAddPermissionSerializer
    queryset = Group.objects.all()


class FileUploadAPIView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, MERCHANT_ADMIN_ROLE, STORES_USER_ROLE, STORES_ADMIN_ROLE, STORES_MANAGER_ROLE, ]

    def post(self, request, *args, **kwargs):
        location = request.data.get('location')
        uploaded_files = request.FILES.getlist('files')
        file_attachments = []

        for file in uploaded_files:
            display_name = os.path.splitext(file.name)[0]
            file_path = handle_uploaded_file(file, location)
            file_name, file_ext = os.path.splitext(file_path)
            file_name = os.path.basename(file_name)
            file_attachment = FileAttachment.objects.create(display_name=display_name, type=file_ext, file_path=file_path)
            file_attachments.append(file_attachment)

        serializer = FileAttachmentSerializer(file_attachments, many=True)
        return Response(serializer.data)


class MachineTypeCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = MachineType.objects.all()
    serializer_class = MachineTypeSerializer


    def post(self, request, *args, **kwargs):
        validation_errors = {}
        for key in ['name', 'short_name']:
            if not len(MachineType.objects.filter(**{key: request.data[key]})) == 0:
                validation_errors[key]=[request.data[key] + " is already exist"]
        if validation_errors == {}:
            data = super().post(request, *args, **kwargs)
        else:
            data = Response(data=validation_errors, status=status.HTTP_400_BAD_REQUEST)
        return data
    

class MachineTypeUpdateView(generics.UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = MachineType.objects.all()
    serializer_class = MachineTypeSerializer

    def put(self, request, *args, **kwargs):
        validation_errors = {}
        for key in ['name', 'short_name']:
            if not len(MachineType.objects.filter(**{key: request.data[key]}).exclude(pk = kwargs['pk'])) == 0:
                validation_errors[key]=[request.data[key] + " is already exist"]
        if validation_errors == {}:
            data = super().put(request, *args, **kwargs)
        else:
            data = Response(data=validation_errors, status=status.HTTP_400_BAD_REQUEST)
        return data


class MachineTypeListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = MachineType.objects.all()
    serializer_class = MachineTypeSerializer


    def get(self, request, *args, **kwargs):
        if 'machine_type_id' in kwargs:
            machine_type = get_object_or_404(MachineType, pk = kwargs['machine_type_id'])
            data = Response(data=MachineTypeSerializer(machine_type).data)
        else:
            data = super().get(request, *args, **kwargs)
        return data
    

class FolderTypeCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = FolderType.objects.all()
    serializer_class = FolderTypeSerializer


    def post(self, request, *args, **kwargs):
        validation_errors = {}
        for key in ['name',]:
            if not len(FolderType.objects.filter(**{key: request.data[key]})) == 0:
                validation_errors[key]=[request.data[key] + " is already exist"]
        if validation_errors == {}:
            data = super().post(request, *args, **kwargs)
        else:
            data = Response(data=validation_errors, status=status.HTTP_400_BAD_REQUEST)
        return data


class FolderTypeUpdateView(generics.UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = FolderType.objects.all()
    serializer_class = FolderTypeSerializer

    def put(self, request, *args, **kwargs):
        validation_errors = {}
        for key in ['name',]:
            if not len(FolderType.objects.filter(**{key: request.data[key]}).exclude(pk = kwargs['pk'])) == 0:
                validation_errors[key]=[request.data[key] + " is already exist"]
        if validation_errors == {}:
            data = super().put(request, *args, **kwargs)
        else:
            data = Response(data=validation_errors, status=status.HTTP_400_BAD_REQUEST)
        return data
    

class FolderTypeListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [IE_USER_ROLE, ]
    queryset = FolderType.objects.all()
    serializer_class = FolderTypeSerializer


    def get(self, request, *args, **kwargs):
        if 'folder_type_id' in kwargs:
            machine_type = get_object_or_404(FolderType, pk = kwargs['folder_type_id'])
            data = Response(data=FolderTypeSerializer(machine_type).data)
        else:
            data = super().get(request, *args, **kwargs)
        return data
    

class LocationCountryCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = LocationCountry.objects.all()
    serializer_class = LocationCountrySerializer

    def post(self, request, *args, **kwargs):
        location_countries = LocationCountry.objects.filter(name = request.data['name'])
        if len(location_countries)>0:
            return Response(data={'name': request.data['name'] + " already exist"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return super().post(request, *args, **kwargs)
        

class LocationCountryListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = LocationCountry.objects.all()
    serializer_class = LocationCountrySerializer


    def get_queryset(self):
        if 'include_inactive' in self.request.GET:
            if self.request.GET['include_inactive'].lower() == 'true':
                queryset = super().get_queryset()
            else:
                queryset = LocationCountry.objects.filter(active = True)
        else:
            queryset = LocationCountry.objects.filter(active = True)
        return queryset
    

class LocationCountryEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = LocationCountry.objects.all()
    serializer_class = LocationCountrySerializer


class PortCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = Port.objects.all()
    serializer_class = PortSerializer

    def post(self, request, *args, **kwargs):
        return_status = status.HTTP_200_OK
        data={}
        # keys = ['address_line_1', 'address_line_2', 'city', 'country']
        address_serializer = AddressSerializer(data=request.data)#data={key: request.data[key] for key in request.data if key in keys})
        if address_serializer.is_valid():
            if len(Port.objects.filter(name = request.data['name']))>0:
                return_status=status.HTTP_400_BAD_REQUEST
                data = Response(data={'name': request.data['name'] + " already exist"}, status=return_status)
            else:
                address = Address.objects.create(**address_serializer.validated_data)
                request.data['address'] = address.id
                data = super().post(request, *args, **kwargs)
        else:
            return_status = status.HTTP_400_BAD_REQUEST
            data = Response(data=address_serializer.errors, status=return_status)
        return data
    

class PortListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = Port.objects.all()
    serializer_class = PortSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if 'include_inactive' in self.request.GET:
            include_inactive = self.request.GET['include_inactive'].lower()
            if include_inactive == 'false':
                queryset = queryset.filter(active=True)
        return queryset
    

class PortEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = Port.objects.all()
    serializer_class = PortSerializer

    def put(self, request, *args, **kwargs):
        port_id = kwargs['pk']
        return_status = status.HTTP_200_OK
        address_serializer = AddressSerializer(data=request.data)
        if address_serializer.is_valid():
            if len(Port.objects.filter(name = request.data['name']).exclude(pk=port_id))>0:
                return_status=status.HTTP_400_BAD_REQUEST
                data = Response(data={'name': request.data['name'] + " already exist"}, status=return_status)
            else:
                if request.data['address'] == None:
                    address = Address.objects.create(**address_serializer.validated_data)
                    request.data['address'] = address.id
                else:
                    address_instance = get_object_or_none(Address, {'pk': request.data['address']})
                    if not address_instance == None:
                        address_serializer.update(instance=address_instance, validated_data=address_serializer.validated_data)
                        data = super().put(request, *args, **kwargs)
                    else:
                        data = Response(data={'address': ["Invalid pk \"" + str(request.data['address']) + "\" - object does not exist"]})
        else:
            return_status = status.HTTP_400_BAD_REQUEST
            data = Response(data=address_serializer.errors, status=return_status)
        return data


class SupplierLocationCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierLocation.objects.all()
    serializer_class = SupplierLocationSerializer

    def post(self, request, *args, **kwargs):
        return_status = status.HTTP_200_OK
        address_serializer = AddressSerializer(data=request.data)
        if address_serializer.is_valid():
            address = Address.objects.create(**address_serializer.validated_data)
            request.data['address'] = address.id
            data = super().post(request, *args, **kwargs)
        else:
            return_status = status.HTTP_400_BAD_REQUEST
            data = Response(data=address_serializer.errors, status=return_status)
        return data
    

class SupplierLocationEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierLocation.objects.all()
    serializer_class = SupplierLocationSerializer

    def put(self, request, *args, **kwargs):
        return_status = status.HTTP_200_OK
        address_serializer = AddressSerializer(data=request.data)
        if address_serializer.is_valid():
            if request.data['address'] == None:
                address = Address.objects.create(**address_serializer.validated_data)
                request.data['address'] = address.id
            else:
                address_instance = get_object_or_none(Address, {'pk': request.data['address']})
                if not address_instance == None:
                    address_serializer.update(instance=address_instance, validated_data=address_serializer.validated_data)
                    data = super().put(request, *args, **kwargs)
                else:
                    data = Response(data={'address': ["Invalid pk \"" + str(request.data['address']) + "\" - object does not exist"]})
        else:
            return_status = status.HTTP_400_BAD_REQUEST
            data = Response(data=address_serializer.errors, status=return_status)
        return data


class SupplierLocationListView(generics.ListAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierLocation.objects.all()
    serializer_class = SupplierLocationSerializer


class SupplierLocationPortCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierLocationPort.objects.all()
    serializer_class = SupplierLocationPortSerializer

    def post(self, request, *args, **kwargs):
        #TODO validation default ports duplication (sea, air)
        return super().post(request, *args, **kwargs)


class SupplierLocationPortEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierLocationPort.objects.all()
    serializer_class = SupplierLocationPortSerializer


class SupplierLocationPortListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierLocationPort.objects.all()
    serializer_class = SupplierLocationPortSerializer

class CustomerBrandMetaDataView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        customer_id = kwargs.get('customer_id')
        brand_id = request.data.get('brand_id', None)

        if customer_id and brand_id is None:
            response = {}
            brand_ids = CustomerBrand.objects.filter(customer_id = customer_id).values_list('brand_id', flat=True)
            brands = Brand.objects.filter(id__in = brand_ids).order_by('-id')
            brand_serializer = BrandSerializer(brands, many = True)

            response = {
            'brands':brand_serializer.data
            }

        if customer_id and brand_id:
            response = {}
            customer_brand = get_object_or_none(CustomerBrand,{'customer_id':customer_id,'brand_id':brand_id})
            customers_all_brands = CustomerBrand.objects.filter(customer_id=customer_id)
            if customer_brand:
                seasons = Season.objects.filter(customer_brand = customer_brand).order_by('-id')
                seasons_serializer = SeasonSerializer(seasons, many = True)
                country = Country.objects.filter(customer_brand = customer_brand).order_by('-id')
                country_serializer = CountrySerializer(country, many = True)
                brands = Brand.objects.filter(customerbrand__in=customers_all_brands).order_by('-id')
                brand_serializer = BrandSerializer(brands, many = True)
                items = Item.objects.filter(customer_brand=customer_brand).order_by('-id')
                item_serializer = ItemSerializer(items, many = True)
                departments = CustomerBrandDepartment.objects.filter(customer_brand=customer_brand).order_by('-id')
                department_serializer = CustomerBrandDepartmentSerializer(departments, many = True)

                response = {
                    'seasons': seasons_serializer.data,
                    'brands': brand_serializer.data,
                    'countries': country_serializer.data,
                    'items': item_serializer.data,
                    'departments': department_serializer.data
                }
        return Response(response, status=status.HTTP_200_OK)
    

class CustomerBrandListView(generics.ListAPIView):
        permission_classes = (HasPermission, )
        write_roles = [MERCHANT_ADMIN_ROLE, ]
        queryset = CustomerBrand.objects.all()
        serializer_class = CustomerBrandSerializer


class CustomerBrandDepartmentCreateView(generics.CreateAPIView):
    queryset = CustomerBrandDepartment.objects.all().order_by('-id')
    serializer_class = CustomerBrandDepartmentSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class CustomerBrandDepartmentListView(generics.ListAPIView):
    queryset = CustomerBrandDepartment.objects.all().order_by('-id')
    serializer_class = CustomerBrandDepartmentSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class CustomerBrandDepartmentUpdateView(generics.UpdateAPIView):
    queryset = CustomerBrandDepartment.objects.all().order_by('-id')
    serializer_class = CustomerBrandDepartmentSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class CustomerBrandDepartmentDetailView(generics.RetrieveAPIView):
    queryset = CustomerBrandDepartment.objects.all().order_by('-id')
    serializer_class = CustomerBrandDepartmentSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class PlantCreateListView(generics.ListAPIView):
    queryset = Plant.objects.all().order_by('-id')
    serializer_class = PlantSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class PlantCreateView(generics.CreateAPIView):
    queryset = Plant.objects.all().order_by('-id')
    serializer_class = PlantSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def post(self, request, *args, **kwargs):
        has_error = False
        data = {}
        address_errors = {}
        billing_address_errors = {}
        address_data = {
            'address_line_1': request.data.pop('address_line_1', None),
            'address_line_2': request.data.pop('address_line_2', None),
            'city': request.data.pop('city', None),
            'country': request.data.pop('country', None)
        }
        address_serializer = AddressSerializer(data=address_data)
        if address_serializer.is_valid():
            address, created = Address.objects.get_or_create(**address_serializer.validated_data)
            request.data['address'] = address.id
            
        else:
            has_error = True
            address_errors = address_serializer.errors
        
        
        billing_address_data = {
            'address_line_1': request.data.pop('billing_address_line_1', None),
            'address_line_2': request.data.pop('billing_address_line_2', None),
            'city': request.data.pop('billing_address_city', None),
            'country': request.data.pop('billing_address_country', None)
        }
        billing_address_serializer = AddressSerializer(data=billing_address_data)
        if billing_address_serializer.is_valid():
            billing_address, created = Address.objects.get_or_create(**billing_address_serializer.validated_data)
            request.data['billing_address'] = billing_address.id
        else:
            has_error = True
            billing_address_errors = billing_address_serializer.errors
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            if not has_error:
                serializer.save()
                data = serializer.data
            else:
                data = {**address_errors, **billing_address_errors}
        else:
            if has_error:
                data = {**serializer.errors, **address_errors, **billing_address_errors}
            else:
                data = serializer.errors
                has_error = True
        if has_error:
            response = Response(data, status=status.HTTP_400_BAD_REQUEST)
        else:
            response = Response(data, status=status.HTTP_200_OK)
        
        return response


class PlantUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Plant.objects.all().order_by('-id')
    serializer_class = PlantSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get_address_data(self, incoming_data, incoming_data_pre_possition: str='', incoming_data_special_pre_possition: dict={}, reverse_operation:bool=False):
        address_fields = ['address_line_1', 'address_line_2', 'city', 'country']
        if reverse_operation:
            data = {incoming_data_pre_possition + incoming_data_special_pre_possition.get(address_field, '') + address_field: incoming_data.pop(address_field, None)
                    for address_field in address_fields 
                    if address_field in incoming_data}
        else:
            data = {address_field: incoming_data.pop(incoming_data_pre_possition + incoming_data_special_pre_possition.get(address_field, '') + address_field, None)
                    for address_field in address_fields}
        return data


    def put(self, request, *args, **kwargs):
        plant_instance = get_object_or_404(Plant, pk=kwargs['pk'])
        has_error = False
        data = {}

        #plant address
        address_errors = {}
        address_data = self.get_address_data(request.data)
        address_id = request.data.get('address', None)
        instance_address = get_object_or_none(Address, {'pk': address_id})
        address_serializer = AddressSerializer(data=address_data)
        if address_serializer.is_valid():
            if instance_address:
                address = address_serializer.update(instance=instance_address, validated_data=address_serializer.validated_data)
            else:
                address, created = Address.objects.get_or_create(**address_serializer.validated_data)
            request.data['address'] = address.id
            
        else:
            has_error = True
            address_errors = address_serializer.errors
        
        #billing address
        billing_address_errors = {}
        billing_address_data = self.get_address_data(request.data, 'billing_', {
            'city': 'address_',
            'country': 'address_'

        })
        billing_address_id = request.data.pop('billing_address', None)
        instance_billing_address = get_object_or_none(Address, {'pk': billing_address_id})
        billing_address_serializer = AddressSerializer(data=billing_address_data)
        if billing_address_serializer.is_valid():
            if instance_billing_address:
                billing_address = billing_address_serializer.update(
                    instance=instance_billing_address,
                    validated_data=billing_address_serializer.validated_data
                )
            else:
                billing_address, created = Address.objects.get_or_create(**billing_address_serializer.validated_data)
            request.data['billing_address'] = billing_address.id
        else:
            billing_address_errors = self.get_address_data(billing_address_serializer.errors, 'billing_', {
                'city': 'address_',
                'country': 'address_'

            }, True)
            has_error = True

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            if not has_error:
                serializer.update(instance=plant_instance, validated_data=serializer.validated_data)
                data = serializer.data
            else:
                data = {**address_errors, **billing_address_errors}
        else:
            if has_error:
                data = {**serializer.errors, **address_errors, **billing_address_errors}
            else:
                data = serializer.errors
                has_error = True
        if has_error:
            response = Response(data, status=status.HTTP_400_BAD_REQUEST)
        else:
            response = Response(data, status=status.HTTP_200_OK)
        
        return response


class PortCreateListView(generics.ListCreateAPIView):
    queryset = Plant.objects.all().order_by('-id')
    serializer_class = PortSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class PortUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = Plant.objects.all().order_by('-id')
    serializer_class = PortSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class CostPerUnitTypeListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in COSTING_MODE_TYPES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)
    

class TransportTypeListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in SHIPPING_MODE_TYPES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)
    

class SupplierPayModeTypeListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in PAYMENT_METHOD_TYPES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)
    

class SupplierInquiryDefaultValueListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=self.kwargs['customer_brand_material_id'])
        supplier_id = request.query_params.get('supplier_id')
        data = {
            'cutting_width_unit': MaterialUnitHelper.INCHES_UNIT,
            'costing_unit': PerMeasuringUnitHelper().get_per_unit_measuring_unit(customer_brand_material.material_normalized_measuring_unit),
            'minimum_order_quantity_units': customer_brand_material.material_normalized_measuring_unit,
            'excess_threshold': 5,
            'pay_mode': CREDIT_DAYS_30_PAYMENT_METHOD_TYPE
        }
        if supplier_id:
            supplier = get_object_or_404(Supplier, pk=supplier_id)
            supplier_data = {
                'ship_mode': supplier.shipping_mode,
                'cost_per_unit_type': supplier.costing_mode
            }
            data.update(supplier_data)
        return Response(data)
    

class OtherCostCreateListView(generics.ListCreateAPIView):
    queryset = OtherCost.objects.all()
    serializer_class = OtherCostSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class OtherCostUpdateDetailView(generics.RetrieveUpdateAPIView):
    queryset = OtherCost.objects.all()
    serializer_class = OtherCostSerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]


class ItemDataLiveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get(self, request):
        from materials.models import UserDefinedDropDownOption
        data = []
        dropdown_options = UserDefinedDropDownOption.objects.all().order_by('attribute__material__category', 'attribute_id')
        for dropdown_option in dropdown_options:
            data.append({
                'material': dropdown_option.attribute.material.name,
                'value': dropdown_option.value,
                'display_value': dropdown_option.display_value,
                'attribute_id': dropdown_option.attribute.id,
            })
                    
        return Response(data)
    

class ItemDataDetailView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ADMIN_ROLE, ]

    def get(self, request):
        from marketing.models import Item, ItemAttribute
        data = []
        items = Item.objects.filter(customer_brand__customer__name='Matalan')
        for item in items:
            item_data = {
                'name': item.name,
                'code': item.code,
                'brand': item.customer_brand.brand.name,
                'customer': item.customer_brand.customer.name,
                'attributes': []
            }
            
            attributes = ItemAttribute.objects.filter(item=item)
            for attribute in attributes:
                item_data['attributes'].append({
                    "placement": attribute.placement,
                    "type": attribute.type,
                    "assign_type": attribute.assign_type,
                    "material": attribute.material.name if attribute.material else None,
                    "estimated_consumption_ratio": attribute.estimated_consumption_ratio,
                    "estimated_consumption_ratio_units": attribute.estimated_consumption_ratio_units,
                    "is_mandatory": attribute.is_mandatory
                })
            
            data.append(item_data)
        return Response(data)
    

class POProcessorListView(APIView):
    permission_classes = (HasPermission, )

    def get(self, request):
        from shared.constants.customer_processors import PO_PROCESSOR_CHOICES
        data = []
        for choice in PO_PROCESSOR_CHOICES:
             data.append({"id": choice[0], "name": choice[1]})
        return Response(data)
    

class AddressListCreateView(generics.ListCreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    serializer_class = AddressSerializer
    queryset = Address.objects.all().order_by('-id')


class AddressEditView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    serializer_class = AddressSerializer
    queryset = Address.objects.all().order_by('-id')


class CustomerUserAssignView(views.APIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    
    def put(self, request, pk):
        
        errors = {}
        has_errors = False

        with transaction.atomic():
            customer_instance = get_object_or_none(Customer, {'id': pk})
            if customer_instance:
                already_existed = CustomerMerchant.objects.filter(user__id=request.data.get('users'),
                                                                  customer__id=customer_instance.id).exists()
                if already_existed:
                    already_existed_instance = CustomerMerchant.objects.get(user__id=request.data.get('users'),
                                                                            customer__id=customer_instance.id)
                    if already_existed_instance.is_admin == request.data.get('is_admin'):
                        errors = {'error': 'User already assigned as same admin status.'}
                        has_errors = True
                    else:
                        already_existed_instance.is_admin = request.data.get('is_admin')
                        already_existed_instance.save()
                else:
                    serializer = CustomerUserAssignSerializer(customer_instance, data=request.data)
                    if serializer.is_valid():
                        serializer.save()
                    else:
                        errors = serializer.errors
                        has_errors = True
            else:
                errors = {'error': 'Customer not found.'}
                has_errors = True

            if has_errors:
                transaction.set_rollback(True)
                return Response(errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({'message': 'User assigned successfully.'}, status=status.HTTP_200_OK)


class CustomerUserDeleteView(views.APIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES

    def delete(self, request, pk, user_id):

        errors = {}
        has_errors = False

        with transaction.atomic():
            customer_instance = get_object_or_none(Customer, {'id': pk})
            if customer_instance:
                user_instance = get_object_or_none(User, {'id': user_id})
                if user_instance:
                    customer_instance.users.remove(user_instance)
                else:
                    errors = {'error': 'Invalid user.'}
                    has_errors = True
            else:
                errors = {'error': ' Customer not found.'}
                has_errors = True

            if has_errors:
                transaction.set_rollback(True)
                return Response(errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({'message': 'User unassigned successfully.'}, status=status.HTTP_200_OK)


class CustomerUserListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    serializer_class = CustomerUserListSerializer

    def get(self, request, *args, **kwargs):
        customer_id = self.request.query_params.get('customer_id')
        users = User.objects.filter(customermerchant__customer__id=customer_id).order_by('-id')
        serializer = self.serializer_class(users, many=True, context={'customer_id': customer_id})
        return Response(serializer.data)
        

class CustomerUserDetailView(views.APIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    serializer_class = CustomerUserListSerializer

    def get(self, request, *args, **kwargs):
        customer_id = self.kwargs.get('customer_id')
        user_id = self.kwargs.get('user_id')
        user = get_object_or_404(User, customermerchant__customer__id=customer_id,
                                 customermerchant__user__id=user_id)
        serializer = self.serializer_class(user, context={'customer_id': customer_id})
        return Response(serializer.data)
    

class CustomerUserMerchantListView(views.APIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    serializer_class = CustomerUserMerchantListSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get(self, request):
        search_text = self.request.query_params.get('username', None)
        merchant_role = Role.objects.get(name=MERCHANT_ROLE)
        users_in_role = merchant_role.users.all().order_by('id')
        if search_text:
            users_in_role = [merchant for merchant in users_in_role if search_text.lower() in merchant.username.lower()]
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(users_in_role, request, view=self)
        serializer = self.serializer_class(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)
    

class UserPlantCreateView(generics.UpdateAPIView):
    permission_classes = (HasPermission, )
    write_roles = ALL_ROLES
    queryset = User.objects.all()
    serializer_class = UserPlantAssignSerializer