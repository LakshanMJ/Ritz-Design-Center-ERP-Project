from django.urls import path, include
from supplier_po.supplier_po_grn import views as spo_grn_v

app_name = 'supplier_po_grn'

# api/supplier_po/spo - url path to here

urlpatterns = [

    # path('po_club/supplier/po/list/<int:club_id>/', spo_v.SupplierPODetailView.as_view(), name='supplier-po-list'),
    path('summary/delivery_date/<int:delivery_date_id>/<int:supplier_po_id>/',
         spo_grn_v.CalculationSummaryBreakdownByDeliveryDateDetailView.as_view(),
         name='grn-summary-breakdown-by-delivery-date-detail-view'),

    path('dashboard/detail/', spo_grn_v.GRNDashBoardDetailView.as_view(), name='grn-dashboard-detail-view'),

    path('dashboard/counts/', spo_grn_v.GRNDashBoardView.as_view(), name='grn-dashboard-view'),

    path('warehouse_actions/grn/dashboard/detail/', spo_grn_v.WarehouseActionsGRNDashBoardDetailView.as_view(), name='warehouse-actions-grn-dashboard-detail-view'),

    path('warehouse_actions/grn/dashboard/counts/', spo_grn_v.WarehouseActionsGRNDashBoardCountView.as_view(), name='warehouse-actions-grn-dashboard-count-view'),

    path('meta_data/', spo_grn_v.GRNMetaDataView.as_view(), name='grn-meta-data-view'),

    # path('meta_data/units/', spo_grn_v.GRNMetaDataUnitsView.as_view(), name = 'grn-meta-data-units-view'),

    path('detail/<int:pk>/', spo_grn_v.GRNDetailView.as_view(), name='grn-detail-view'),

    path('basic_detail/<int:pk>/', spo_grn_v.GRNBasicDetailView.as_view(), name='grn-basic-detail-view'),

    path('material/detail/<int:supplier_po_grn_id>/', spo_grn_v.GRNMaterialBasicDetailView.as_view(), name='grn-material-basic-detail-view'),

    path('replacement_grn/list/<int:grn_id>/', spo_grn_v.ReplacementGRNListView.as_view(),
         name='replacement-grn-list-view'),

    path('create/', spo_grn_v.GRNCreateView.as_view(), name='grn-create-view'),

    path('update/<int:supplier_po_grn_id>/', spo_grn_v.GRNUpdateView.as_view(),
         name='grn-material-create-view'),

    path('move_to_next_state/<int:supplier_po_grn_id>/', spo_grn_v.SupplierPOGRNStateChangeView.as_view(), name='supplier-po-grn-move-to-next-state-view'),

    path('grn_material_detail/bin_location/update/<int:supplier_po_grn_id>/', spo_grn_v.SupplierPOGRNMaterialDetailBinLocationUpdateView.as_view(), name='supplier-po-grn-material-detail-bin-location-update-view'),

    path('material/quantity_adjustment/detail/<int:supplier_po_grn_id>/', spo_grn_v.GRNMaterialQuantityAdjustmentDetailView.as_view(),
         name='grn-material-grn-material-quantity-adjustment-detail-view'),

    path('material/quantity_adjustment/update/<int:supplier_po_grn_id>/', spo_grn_v.GRNMaterialQuantityAdjustmentUpdateView.as_view(),
         name='grn-material-grn-material-quantity-adjustment-update-view'),

    path('material/quantity_adjustment/recalculate/<int:supplier_po_grn_id>/', spo_grn_v.GRNMaterialQuantityAdjustmentRecalculateView.as_view(),
         name='grn-material-grn-material-quantity-adjustment-detail-view'),

    path('material/detail/row/save/<int:grn_material_id>/', spo_grn_v.SupplierPOGRNMaterialDetailRowSaveView.as_view(),
         name='grn-fabric-material-row-save'),

    path('material/detail/row/list/save/<int:grn_material_id>/', spo_grn_v.SupplierPOGRNMaterialDetailRowListSaveView.as_view(),
         name='grn-fabric-material-row-list-save'),

    path('fabric/shade/list/<int:fabric_batch_number_id>/', spo_grn_v.ShadeByBatchNumberListView.as_view(),
         name='fabric-shade-list-view'),

    path('material/detail/row/delete/<int:pk>/', spo_grn_v.GRNFabricDetailRowDeleteView.as_view(),
         name='grn-material-detail-row-delete'),

    path('pack_list/template/download/<int:grn_material_id>/', spo_grn_v.MaterialPackListDownloadTemplateView.as_view(),
         name='grn-material-pack-list-template-download'),

    path('qr/create/<int:grn_material_id>/', spo_grn_v.FabricBarcodeGenerator.as_view(), name='grn-material-qr-view'),

    path('fabric/inspection/list/<int:supplier_po_grn_id>', spo_grn_v.FabricInspectionListView.as_view(),
         name='fabric-inspection-list-view'),

    path('fabric/inspection/summary/list/<int:supplier_po_grn_id>', spo_grn_v.FabricInspectionSummaryView.as_view(),
         name='fabric-inspection-summary-list-view'),

    path('fabric/shade/summary/<int:grn_id>/', spo_grn_v.GRNFabricShadeSummary.as_view(),
         name='material-fabric-shade-summary-by-grn'),

    path('fabric_width_shade/summary/list/<int:supplier_po_grn_id>/', spo_grn_v.GRNFabricWidthShadeSummaryView.as_view(),
         name='supplier-po-grn-material-summary-list-view'),

    path('fabric_detail/<int:grn_id>/', spo_grn_v.GRNFabricDetailListView.as_view(),
         name='material-pack-list-view'),

    path('fabric/shade/list_by_batch/<int:supplier_po_grn_material_id>/',
         spo_grn_v.ShadeByBatchListView.as_view(), name='shade-list-by-batch'),

     path('shade/mapping/list/<int:supplier_po_grn_id>/', spo_grn_v.SupplierPOClubMaterialShadeMappingListView.as_view(), name = 'shade-mapping-list-view-by-grn'),

     path('shade/mapping/save/<int:supplier_po_grn_id>/', spo_grn_v.SupplierPOClubMaterialShadeMappingCreateView.as_view(), name = 'shade-mapping-save-view'),

     path('po_club/details/<int:actual_po_club_id>/', spo_grn_v.POClubGRNMaterialDetailListView.as_view(), name='actual-club-grn-material-details'),

     path('supplier_po/search/list/', spo_grn_v.SupplierPOMetaDataSearchableList.as_view(), name='supplier-po-search-list'),

]

