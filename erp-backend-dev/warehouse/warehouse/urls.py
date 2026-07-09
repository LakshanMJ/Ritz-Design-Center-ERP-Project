from django.urls import path
from . import views, helpers

app_name = 'warehouse'

urlpatterns = [
    path('warehouse/list/', views.PlantWarehouseListView.as_view(), name='warehouse_list'),
    path('warehouse/create/', views.PlantWarehouseCreateView.as_view(), name='warehouse_create'),
    path('warehouse/update/<int:pk>/', views.PlantWarehouseUpdateView.as_view(), name='warehouse_update'),
    path('warehouse/delete/<int:pk>/', views.PlantWarehouseDeleteView.as_view(), name='warehouse_delete'),
    path('warehouse_details/<int:pk>/', views.PlantWarehouseDetailView.as_view(), name='warehouse_details'),

    path('warehouse_rack/list/<int:warehouse>/', views.PlantWarehouseRackListView.as_view(), name='warehouse_rack_list'),
    path('warehouse_rack/create/', views.PlantWarehouseRackCreateView.as_view(), name='warehouse_rack_create'),
    path('warehouse_rack/update/<int:pk>/', views.PlantWarehouseRackUpdateView.as_view(), name='warehouse_rack_update'),
    path('warehouse_rack/delete/<int:pk>/', views.PlantWarehouseRackDeleteView.as_view(), name='warehouse_rack_delete'),
    path('warehouse_rack_details/<int:pk>/', views.PlantWarehouseRackDetailView.as_view(), name='warehouse_rack_details'),
    
    path('warehouse_rack_bin/list/<int:warehouse>', views.PlantWarehouseRackBinListView.as_view(), name='warehouse_rack_bin_list'),
    path('warehouse_rack_bin/create/', views.PlantWarehouseRackBinCreateView.as_view(), name='warehouse_rack_bin_create'),
    path('warehouse_rack_bin/update/<int:pk>/', views.PlantWarehouseRackBinUpdateView.as_view(), name='warehouse_rack_bin_update'),
    path('warehouse_rack_bin/delete/<int:pk>/', views.PlantWarehouseRackBinDeleteView.as_view(), name='warehouse_rack_bin_delete'),
    path('warehouse_rack_bin_details/<int:pk>/', views.PlantWarehouseRackBinDetailView.as_view(), name='warehouse_rack_bin_details'),
    path('warehouse_rack_bin/paginated_list/', views.PlantWarehouseRackBinPaginatedListView.as_view(), name='warehouse_rack_bin_paginated_list_view'),

    path('plant_warehouse_rack_bin_customer_allocation/', views.PlantWarehouseRackBinCustomerAllocationView.as_view(), name='warehouse_rack_bin_customer_alloaction'),

    path('customer_costing_versions/', views.CustomerCostingVersionIDs.as_view(), name='customer_costing_versions'),
    path('warehouse_finance_customer_costing_details/', views.FinanceWarehouseCustomerDetails.as_view(), name='finance_warehouse_customer_costing_details'),
    path('customer_costing_po_clubs/', views.CustomerCostingVersionActualPOClubIDs.as_view(), name='customer_costing_po_clubs'),

    path('warehouse_material_customer_details/', views.WarehouseMaterialCustomerwiseMaterial.as_view(), name='warehouse-material-customer-details'),
    path('warehouse_material_customer_costing_details/', views.WarehouseMaterialCustomerCostingwiseDetails.as_view(), name='warehouse-material-customer-costing-details'),
    path('warehouse_material_customer_costing_po_club_details/', views.WarehouseMaterialCustomerCostingPOClubwiseDetails.as_view(), name='warehouse-material-customer-costing-po-club-details'),
    path('warehouse_material_customer_costing_po_club_item_details/', views.WarehouseMaterialCustomerCostingPOClubItemwiseDetails.as_view(), name='warehouse-material-customer-costing-po-club-item-details'),

    path('supplier_inquiry_material_codes/list/', views.SupplierInquiryMaterialCodeView.as_view(), name='supplier_inquiry_material_codes'),
    path('customer_brand_material_codes/list/', views.CustomerBrandMaterialCodeView.as_view(), name='customer_brand_material_codes'),
    path('inhouse_material_detail/list/', views.InHouseMaterialListView.as_view(), name='inhouse_material_details'),
    path('inhouse_material_detail/create/', views.InHouseMaterialCreateView.as_view(), name='inhouse_material_detail_create'),
    path('inhouse_material_detail/update/<int:pk>/', views.InHouseMaterialUpdateView.as_view(), name='inhouse_material_detail_update'),
    path('inhouse_material_detail/delete/<int:pk>/', views.InHouseMaterialDeleteView.as_view(), name='inhouse_material_detail_delete'),

    path('purchase_order_allocation/list/', views.PurcahseOrderAlloactionListView.as_view(), name='purchase_order_allocation'),
    path('purchase_order/list/', views.PurchaseOrderListView.as_view(), name='purchase_order_boms'),
    path('purchase_order_allocation/create/', views.PurchaseOrderAllocationCreateView.as_view(), name='purchase_order_allocation_create'),
    path('purchase_order_allocation/update/<int:pk>/', views.PurchaseOrderAllocationUpdateView.as_view(), name='purchase_order_allocation_update'),
    path('purchase_order_allocation/delete/<int:pk>/', views.PurchaseOrderAllocationDeleteView.as_view(), name='purchase_order_allocation_delete'),

    path('customer_brand_material/list/', views.CustomerBrandMaterialListView.as_view(), name='customer_brand_materials'),
    path('warehouse_material_summary/', views.WarehouseMaterialSummaryListView.as_view(), name='warehouse-material-summary'),
    path('warehouse_material_rack_details/', views.WarehouseMaterialRackDetails.as_view(), name='warehouse-material-rack_details'),
    path('warehouse_material_rack_materials/', views.WarehouseMaterialRackMaterials.as_view(), name='warehouse-material-rack'),
    path('warehouse_material_rack_bin_materials/', views.WarehouseMaterialRackBinMaterials.as_view(), name='warehouse-material-rack-bin'),
    path('warehouse_material_items/', views.WarehouseMaterialItems.as_view(), name='warehouse-material-items'),
    path('warehouse_material_supplier_material/', views.WarehouseMaterialSupplierMaterial.as_view(), name='warehouse-material-supplier-material'),
    path('warehouse_material_supplier_customer_wise_material/', views.WarehouseMaterialSupplierCustomerwiseMaterial.as_view(), name='warehouse-material-supplier-customer-wise-material'),
    path('agingwise_material_category_details/', views.AgingwiseMaterialCategoryWiseMaterial.as_view(), name='agingwise-material-category-details'),
    path('agingwise_material_category_customer_material_details/', views.AgingwiseMaterialCategoryWiseCustomerMaterial.as_view(), name='agingwise-material-category-customer-material-details'),
    path('agingwise_material_category_customer_item_material_details/', views.AgingwiseMaterialCategoryWiseCustomerItemMaterial.as_view(), name='agingwise-material-category-customer-material-item-details'),

    path('virtual_warehouse/inhouse_materials/', views.VirtualWarehouseInhouseDetails.as_view(), name='virtual-warehouse-inhouse-materials'),
    path('virtual_warehouse/inhouse_grn_material/details/', views.VirtualWarehouseCustomerBrandMaterialGRNMaterialDetails.as_view(), name='virtual-warehouse-inhouse-grn-material-details'),
    path('virtual_warehouse/barcode_inhouse_material/', views.VirtualWarehouseBarcodeInhouseDetails.as_view(), name='virtual-warehouse-barcode-inhouse-material'),
    path('po_club/search/list/', views.POClubMetaDataSearchableList.as_view(), name='po_club-search-list'),
    path('virtual_warehouse/issue_note/create/update/', views.IssueNoteCreateUpdate.as_view(), name='issue-note-create-update'),
    path('virtual_warehouse/issue_note/list/', views.IssueNoteList.as_view(), name='issue-note-list'),
    path('virtual_warehouse/issue_note/detail/<int:pk>/', views.IssueNoteDetail.as_view(), name='issue-note-detail'),
]
