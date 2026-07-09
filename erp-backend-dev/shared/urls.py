from django.urls import path, include
from django.views.generic.base import TemplateView
from shared.views import *
from django.contrib.auth.views import LogoutView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

app_name = 'shared'

urlpatterns = [
    path('user/authenticate/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', JWTRefreshToken.as_view(), name='token-refresh'),
    path('user/info/', UserDetailView.as_view(), name='user-details'),

    # Customer URLs
    path('customers/', CustomerCreateListView.as_view(), name='customer-create-list'),
    path('customer/<int:pk>/', CustomerUpdateDetailView.as_view(), name='customer-update-detail'),
    path('customer/contact_person/list_create/', CustomerContactPersonListCreateView.as_view(), name='customer-contact-person-craete-list-view'),
    path('customer/contact_person/<int:pk>/', CustomerContactPersonUpdateDetailView.as_view(), name='customer-contact-person-update-detail-view'),


    # Brand URLs
    path('brands/', BrandCreateListView.as_view(), name='brand-create-list'),
    path('brand/<int:pk>/', BrandUpdateDetailView.as_view(), name='brand-update-detail'),

    # Supplier URLs
    path('suppliers/', SupplierCreateListView.as_view(), name='supplier-create-list'),
    path('supplier/<int:pk>/', SupplierUpdateDetailView.as_view(), name='supplier-update-detail'),
    path('supplier/list/', SupplierListView.as_view(), name='supplier-list'),
    path('supplier/contact_person/list_create/', SupplerContactPersonListCreateView.as_view(), name='supplier-contact-person-craete-list-view'),
    path('supplier/contact_person/<int:pk>/', SupplierContactPersonUpdateDetailView.as_view(), name='supplier-contact-person-update-detail-view'),
    path('supplier/customer_brand/', SupplierCustomerBrandListCreateView.as_view(), name='supplier-customer-brand-list-create-view'),
    path('supplier/<int:supplier_id>/customer-brands/', CustomerBrandsNotInSupplierBrandView.as_view(), name='customer-brands-not-in-supplier-list-view'),
    path('supplier/customer_brand/delete/<int:pk>/', SupplierBrandDeleteView.as_view(), name='supplier-customer-brand-delete-view'),
    path('supplier/material/', SupplierMaterialListCreateView.as_view(), name='supplier-material-list-create-view'),
    path('supplier/<int:supplier_id>/materials/', SupplierMaterialsNotInSupplierMaterialdView.as_view(), name='supplier-material-not-in-supplier-list-view'),
    path('supplier/material/delete/<int:pk>/<int:material_id>/', SupplierMaterialDeleteView.as_view(), name='supplier-material-delete-view'),
    path('supplier/meta_data/', SupplierMetaDataView.as_view(), name='supplier-meta-data-view'),

    path('supplier/paginate/list/', SupplierPaginateListView.as_view(), name='supplier-paginate-list-view'),

    # Season URLs
    path("seasons/", SeasonCreateListView.as_view(), name="season-create-list"),
    path("season/<int:pk>", SeasonUpdateDetailView.as_view(), name="season-update-detail"),

    path('customers_brands_seasons/list/', MetaDataListView.as_view(), name='customers-brands-seasons-countries-list'),

    # User URLs
    path("user/create/", UserCreateListView.as_view(), name="user-create-list"),
    path("user/<int:pk>", UserUpdateDetailView.as_view(), name="user-update-detail"),
    path("user/detail/update/", UserDetailUpdateDetailView.as_view(), name="user-detail-update-detail"),
    path('user/addrole/<int:pk>', UserAddRoleView.as_view(),name = 'user-addrole'),
    path('user/deleterole/<int:user_id>/<int:role_id>', UserRoleDeleteView.as_view(),name='user-role-delete'),
    path('user/deletegroup/<int:user_id>/<int:group_id>', UserGroupDeleteView.as_view(),name='user-group-delete'),
    path('role/deletegroup/<int:group_id>/<int:role_id>', RoleGroupDeleteView.as_view(),name='role-group-delete'),
    path('users/', UsersListView.as_view(), name='users-filter-by-role-list-view'),
    path('user/add_plant/<int:pk>', UserPlantCreateView.as_view(), name='user-add-plant'),

    # Role
    path("role/create/", RoleCreateView.as_view(), name="role-create"),
    path("role/list/", RoleListView.as_view(), name="role-list"),
    path("role/detail/<int:pk>", RoleDetailView.as_view(), name="role-details"),

    # Group
    path("group/create/", GroupCreateView.as_view(), name="group-create"),
    path("group/list/", GroupListView.as_view(), name="group-list"),
    path("group/addpermission/<int:pk>", GroupAddPermissionView.as_view(), name="group-addpermission"),
    path("group/detail/<int:pk>", GroupDetailView.as_view(), name="group-detail"),

    # Country URLs
    path("country/create/", CountryCreateListView.as_view(), name="country-create-list"),
    path("country/<int:pk>/", CountryUpdateDetailView.as_view(), name="country-update-detail"),

    # Size Category
    path('sizecategory/create/', SizeCategoryCreateView.as_view(), name = 'sizecategory-create'),
    path('sizecategory/edit/<int:pk>', SizeCategoryEditView.as_view(), name = 'sizecategory-edit'),
    path('sizecategory/detail', SizeCategoryDetailView.as_view(), name = 'sizecategory-detail'),
    path('sizecategory/list/', SizeCategoryListView.as_view(), name = 'sizecategory-list'),

    # Size
    path('size/create/', SizeCreateView.as_view(), name = 'size-create'),
    path('size/edit/<int:pk>', SizeEditView.as_view(), name = 'size-edit'),
    path('size/detail/<int:pk>', SizeDetailView.as_view(), name = 'size-detail'),
    path('size/list/', SizeListView.as_view(), name = 'size-list'),    
    path('size/flatlist/', SizeFlatListView.as_view(), name = 'size-category-list'),

    path("colorwaycategories/", ColorwayCategoryCreateListView.as_view(), name="colorway-category-create-list"),
    path("colorwaycategory/<int:pk>", ColorwayCategoryUpdateDetailView.as_view(), name="colorway-category-update-detail"),

    path("files/upload/", FileUploadAPIView.as_view(), name="generic-file-upload"),

    path('machine_type/', MachineTypeCreateView.as_view(), name = 'machine_type-create'),
    path('machine_type/update/<int:pk>', MachineTypeUpdateView.as_view(), name = 'machine_type-update'),
    path('machine_type/<int:machine_type_id>', MachineTypeListView.as_view(), name = 'machine_type-detail'),
    path('machine_type/list/', MachineTypeListView.as_view(), name = 'machine_type-list'),

    path('folder_type/', FolderTypeCreateView.as_view(), name = 'folder_type-create'),
    path('folder_type/update/<int:pk>', FolderTypeUpdateView.as_view(), name = 'folder_type-update'),
    path('folder_type/<int:folder_type_id>', FolderTypeListView.as_view(), name = 'folder_type-detail'),
    path('folder_type/list/', FolderTypeListView.as_view(), name = 'folder_type-list'),

    path('location_country/create/', LocationCountryCreateView.as_view(), name='location_country-create'),
    path('location_country/list/', LocationCountryListView.as_view(), name='location_country-list'),
    path('location_country/edit/<int:pk>', LocationCountryEditView.as_view(), name='location_country-edit'),

    path('port/create/', PortCreateView.as_view(), name = 'port-create'),
    path('port/list/', PortListView.as_view(), name = 'port-list'),
    path('port/edit/<int:pk>', PortEditView.as_view(), name = 'port-edit'),

    path('supplier_location/create/', SupplierLocationCreateView.as_view(), name='supplier_location-create'),
    path('supplier_location/edit/<int:pk>', SupplierLocationEditView.as_view(), name='supplier_location-edit'),
    path('supplier_location/list/', SupplierLocationListView.as_view(), name='supplier_location-list'),

    path('supplier_location_port/create/', SupplierLocationPortCreateView.as_view(), name='supplier_location_port-create'),
    path('supplier_location_port/edit/<int:pk>', SupplierLocationPortEditView.as_view(), name='supplier_location_port-edit'),
    path('supplier_location_port/list/', SupplierLocationPortListView.as_view(), name='supplier_location_port-list'),

    path('customer_brand/meta_data/<int:customer_id>/', CustomerBrandMetaDataView.as_view(), name='customer-brand-meta-data'),
    path('customer_brand/list/', CustomerBrandListView.as_view(), name='customer-brand-list'),

    # CustomerBrandDepartment
    path('customer_brand_department/create/', CustomerBrandDepartmentCreateView.as_view(), name='customer-brand-department-create-view'),
    path('customer_brand_department/list/', CustomerBrandDepartmentListView.as_view(), name='customer-brand-department-list-view'),
    path('customer_brand_department/update/<int:pk>/',CustomerBrandDepartmentUpdateView.as_view(), name='customer-brand-department-update-view'),
    path('customer_brand_department/detail/<int:pk>/',CustomerBrandDepartmentDetailView.as_view(), name='customer-brand-department-detail-view'),

    # Plant URLs
    path("plant/list/", PlantCreateListView.as_view(), name="plant-list-view"),
    path("plant/<int:pk>/", PlantUpdateDetailView.as_view(), name="plant-update-detail"),
    path("plant/create/", PlantCreateView.as_view(), name="plant-create-view"),

    # Port URLs
    path("port/create/", PortCreateListView.as_view(), name="port-create-list"),
    path("port/<int:pk>/", PortUpdateDetailView.as_view(), name="port-update-detail"),

    path('approval/', include('shared.approvals.urls', namespace='task-approvals')),

    path('cost_per_unit_type/list/', CostPerUnitTypeListView.as_view(), name='cost-per-unit-type-list'),
    path('transport_type/list/', TransportTypeListView.as_view(), name='transport-type-list'),
    path('pay_mode/list/', SupplierPayModeTypeListView.as_view(), name='supplier-pay-mode-type-list'),
    path('supplier_inuiry/default_value/list/<customer_brand_material_id>/', SupplierInquiryDefaultValueListView.as_view(), name='supplier-inquiry-default-value-list'),

    path('other_cost/', OtherCostCreateListView.as_view(), name='other-cost-create-list-view'),
    path('other_cost/<int:pk>/', OtherCostUpdateDetailView.as_view(), name='other-cost-update-detail'),

    path('item/data/live/', ItemDataLiveView.as_view(), name='item-data-detail'),

    path('item/data/details/', ItemDataDetailView.as_view(), name='item-data-detail'),

    path('po_processor/list/', POProcessorListView.as_view(), name='po-processpr-list-view'),

    # Address URLs
    path('address/list/create/', AddressListCreateView.as_view(), name='address-list-create-view'),
    path('address/edit/<int:pk>/', AddressEditView.as_view(), name='address-edit-view'),

    path('customer/user/assign/<int:pk>/', CustomerUserAssignView.as_view(), name='customer-user-assign'),
    path('customer/user/delete/<int:pk>/<int:user_id>/', CustomerUserDeleteView.as_view(), name='customer-user-delete'),
    path('customer/users/list/', CustomerUserListView.as_view(), name='customer-user-list'),
    path('customer/user/detail/<int:customer_id>/<int:user_id>/', CustomerUserDetailView.as_view(), name='customer-user-detail'),
    path('user/merchant/list/', CustomerUserMerchantListView.as_view(), name='user-merchant-list'),

]


