from django.urls import path
from materials.views import virtual_warehouse_views

urlpatterns = [
    
    path('plant/customer/purchase_order/actual_po_club/list/<int:plant_id>/<int:customer_id>/', virtual_warehouse_views.PlantCustomerActualPOClubListView.as_view(), name = 'plant-customer-purchase_order-actual_po_club-list-view'),

    path('plant/customer/list/', virtual_warehouse_views.PlantCustomerListView.as_view(), name='plant-customer-list-view'),

    path('order_specific_materials/list/<int:po_club_id>/', virtual_warehouse_views.OrderSpecificMaterialsListView.as_view(), name='order_specific_materials-list-view'),

    path('material/all_plant_customer/list/', virtual_warehouse_views.VirtualWarehouseMaterialAllPlantCustomerView.as_view(), name='virtual_warehouse-fabric-all_plant_customer-list-view'),

    path('allocation_material/list/<int:costing_version_id>/<int:customer_brand_material_id>/', virtual_warehouse_views.VirtualWarehouseAllocationMaterialListView.as_view() ,name='allocation-material-list-view'),

    path('page_loading_detail/<int:pk>/', virtual_warehouse_views.PageLoadingDetailView.as_view(), name='in_house-material-detail-view'),

    path('po_club_left_over_material/allocation/<int:po_club_id>/<int:material_id>/', virtual_warehouse_views.POClubLeftOverMaterialAllocationView.as_view(), name='po-club-left-over-material-allocation-view'),

    path('po_club_left_over_material/list/<int:po_club_id>/', virtual_warehouse_views.POClubLeftOverMaterialAllocationListView.as_view(), name='po-club-left-over-material-list-view'),

    path('po_club_left_over_material/material/list/<int:po_club_id>/<int:customer_brand_material_id>/', virtual_warehouse_views.POClubMaterialLeftOverMaterialAllocationListView.as_view(), name='po-club-material-left-over-material-list-view'),

    path('po_club_left_over_material/delete/<int:po_club_left_over_material_id>/', virtual_warehouse_views.POClubLeftOverMaterialDeleteView.as_view(), name='po-club-left-over-material-delete-view'),

    path('order_specific_materials/detail/list/<int:pk>/', virtual_warehouse_views.OrderSpecificMaterialsDetailListView.as_view(), name='order_specific_materials-detail-list-view'),

    path('search/in_house_material/barcode/', virtual_warehouse_views.SearchInHouseMaterialBarcodeView.as_view(), name='search-in_house_material-barcode-view'),
    
    path('left_over_material/state/list/', virtual_warehouse_views.LeftOverMaterialStateListView.as_view(), name='left-over-material-state-list-view'),

    path('left_over_material/state/count/', virtual_warehouse_views.LeftOverMaterialStateCountView.as_view(), name='left-over-material-state-count-view'),

    path('warehouse_list/list/', virtual_warehouse_views.WarehouseListView.as_view(), name='warehouse-list-view'),

    path('left_over_material/shade/list/<int:inhouse_material_verification_material_id>/', virtual_warehouse_views.LeftOverMaterialShadeListView.as_view(), name='left-over-material-verification-shade-list-view'),

    path('left_over_material/verification/list/', virtual_warehouse_views.LeftOverMaterialVerificationListView.as_view(), name='left-over-material-verification-list-view'),

    path('left_over_material/verification/detail/<int:pk>/', virtual_warehouse_views.LeftOverMaterialVerificationDetailView.as_view(), name='left-over-material-verification-detail-view'),

    path('left_over_material/verification/material/list/<int:inhouse_material_verification_id>/', virtual_warehouse_views.LeftOverMaterialVerificationMaterialListView.as_view(), name='left-over-material-verification-material-list-view'),

    path('left_over_material/verification_material/update/<int:inhouse_material_verification_material_id>/', virtual_warehouse_views.LeftOverMaterialUpdateListView.as_view(), name='left-over-material-verfication-material-update-view'),

    path('left_over_material/verification/<int:inhouse_material_verification_id>/', virtual_warehouse_views.LeftOverMaterialStateUpdateView.as_view(), name='left-over-material-verification-state-update-view'),

]