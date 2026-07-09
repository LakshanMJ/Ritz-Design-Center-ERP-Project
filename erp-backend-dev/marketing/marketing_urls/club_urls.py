from django.urls import path
from marketing.views import club_views, po_cad_views

urlpatterns = [

    path('fabrics/<int:actual_club_bom_id>/', club_views.ActualClubFabric.as_view(),
         name='po-club-fabrics'),

    path('colorway_mappings/<int:actual_club_bom_id>/', club_views.ActualClubColorwayMatrix.as_view(),
         name='po-club-colorway-mappings'),

    path('completed_grn_materials/<int:po_club_id>/', club_views.POClubCompletedGRNData.as_view(),
         name='completed-grn-material-data'),

    path('inhouse_material/material/list_by_club/<int:club_id>/', club_views.InHouseMaterialByClubListView.as_view(),
         name='inhouse-material-list-by-club'),

    path('inhouse_material/material/detail/<int:club_id>/<int:material_id>/', club_views.InHouseMaterialDetailsByClubListView.as_view(),
         name='inhouse-material-details-by-club'),

    path('supplier_po_summary/<int:po_club_id>/', club_views.ClubDeliverySummary.as_view(), name='supplier-po-summary'),

    path('supplier_po_material_delivery/<int:supplier_po_id>/<int:customer_brand_material_id>/', club_views.SupplierPOMaterialDeliveries.as_view(),
         name='supplier-po-material-delivery_data'),

    path('color_tone/save/<int:po_club_id>/', club_views.POClubColorToneSaveView.as_view(), name = 'po-club-fabric-color-tone-save-view'),

    path('color_tone/detail/<int:po_club_id>/<int:material_id>/', club_views.POClubColorToneDetailView.as_view(), name = 'po-club-fabric-color-tone-detail-view'),

    path('shade/list/<int:supplier_po_grn_id>/', club_views.POClubShadeListView.as_view(), name = 'po-club-shade-list-view-by-grn'),

     path('fabric/shade/attachment/save/', club_views.POClubShadeAttachmentUpdateView.as_view(), name = 'po-club-shade-attachment-update-view'),

    path('inhouse_material/material/fabric/shade/summery/<int:club_id>/', club_views.InHouseFabricMaterialShadeSummaryByClubListView.as_view(), name='in-house-material-fabric-shade-summery-by-club'),

    path('fabric/summary/list/<int:actual_po_club_id>/', club_views.InHouseMaterialChartSummaryByClubView.as_view(), name = 'po-club-grn-fabric-summary-list-view'),

    path('activity/detail/<int:po_club_id>/', club_views.POClubActivityDetailView.as_view(), name='po-club-activity-detail-view'),

    path('colorway/create/', club_views.POClubColorwayCreateView.as_view(), name='po-club-colorway-create-view'),

    path('colorway/detail_update_delete/<int:pk>/', club_views.POClubColorwayDetailUpdateDeleteView.as_view(), name='po-club-colorway-detail-update-delete-view'),

    path('country/create/', club_views.POClubCountryCreateView.as_view(), name='po-club-colorway-create-view'),

    path('country/detail_update_delete/<int:pk>/', club_views.POClubCountryDetailUpdateDeleteView.as_view(), name='po-club-country-detail-update-delete-view'),

    path('size/create/', club_views.POClubSizeCreateView.as_view(), name='po-club-size-create-view'),

    path('size/detail_update_delete/<int:pk>/', club_views.POClubSizeDetailUpdateDeleteView.as_view(), name='po-club-size-detail-update-delete-view'),

    path('colorway_country_size/detail/<int:pk>/', club_views.POClubPurchaseOrderColorwayCountrySizeDetailView.as_view(), name='po-club-colorway-country-size-detail-view'),

    path('purchase_order/colorway/update/<int:po_club_id>/', club_views.POClubPurchaseOrderColorwayUpdateView.as_view(), name='purchase-order-colorway-update-view'),

    path('colorway_country_size/auto_map/<int:po_club_id>/', club_views.POClubPurchaseOrderColorwayCountrySizeAutoMapDetailView.as_view(), name='purchase-order-colorway-country-size-automap-update-view'),

    path('colorway_country_size/auto_map/<int:po_club_id>/', club_views.POClubPurchaseOrderColorwayCountrySizeAutoMapDetailView.as_view(), name='purchase-order-colorway-country-size-automap-update-view'),

    path('marker/item/placements/upload/<int:actual_club_id>/<customer_brand_material_id>/', po_cad_views.POFabricMarkerItemPlacementsUploadView.as_view(), name='po_club-marker-item-placement-upload-view'),

    path('material/marker/create/file/upload/<int:actual_club_id>/<customer_brand_material_id>/', po_cad_views.POFabricItemMarkerCreateByFileView.as_view(), name='item-marker-create-file-upload-view'),

    path('pre_costing/list/<int:po_club_id>/', club_views.POClubPreCostingListView.as_view(), name='club-pre-costing-list'),

    path('analyze/meta_data/<int:po_club_id>', club_views.POClubAnalyzeMetaDataView.as_view(), name='po-club-analyze-meta-data'),

    path('analyze/search/<int:po_club_id>', club_views.POClubAnalyzeSearchDataView.as_view(), name='po-club-analyze-search'),

    path('save_po_pack_po_pack_item_consumption_wastage/<int:po_club_id>', club_views.SavePOPackPOPackItemConsumptionRatio.as_view(), name='save-po-pack-item-po-pack-consumption-ratios'),

    path('delete_po_placements/<int:po_club_id>', club_views.DeletePurchaseOrderClubPlacements.as_view(), name='delete-po-placements'),

    path('assign_club_placement_materials/<int:po_club_id>', club_views.AssignPurchaseOrderClubPlacementMaterial.as_view(), name='assign-purchase-order-club-placement-materials'),

    path('pcl/recalculate_values/<int:pk>/', club_views.POClubPCLValuesRecalculateView.as_view(), name='po-club-pcl-values-recalculate-view'),

    path('pending/material/list/<int:po_club_id>/', club_views.POClubPreCostingPendingMaterialListAPI.as_view(), name='club-pending-material-list-view'),

    path('completed_material/update/<int:po_club_id>/', club_views.POClubMaterialCompleteUpdateAPI.as_view(), name='prr-costing-material-update-view'),

    path('completed_material/recalculate/update/<int:po_club_id>/<int:material_id>/', club_views.POClubMaterialCompleteRecalculateUpdateAPI.as_view(), name='prr-costing-material-recalculate-update-view'),

    path('other_cost/<int:po_club_id>/', club_views.POClubOtherCostListView.as_view(), name='po-other-cost-list-view'),

    path('other_cost/create/<int:po_club_id>/', club_views.POClubOtherCostCreateView.as_view(), name='po-other-cost-list-view'),

    path('other_cost/detail/<int:general_service_po_supplier_id>/<int:other_cost_type_id>/', club_views.POClubOtherCostDetailView.as_view(), name='po-other-cost-delete-view'),

    path('other_cost/update/<int:general_service_po_service_delivery_id>/<int:other_cost_type_id>/', club_views.POClubOtherCostUpdateView.as_view(), name='po-other-cost-update-view'),

    path('other_cost/delete/<int:general_service_po_service_delivery_id>/', club_views.POClubOtherCostDeleteView.as_view(), name='po-other-cost-delete-view'),

    path('bcr/type/list/', club_views.BOMChangeRequestTypeListView.as_view(), name='bom-change-request-type-list-view'),

    path('bcr/list/', club_views.BOMChangeRequestListView.as_view(), name='bom-change-request-list-view'),

    path('bcr/list/<int:po_club_id>/', club_views.BOMChangeRequestByPOClubListView.as_view(), name='bom-change-request-by-club-list-view'),

    path('bcr/detail/<int:pk>/', club_views.BOMChangeRequestDetailView.as_view(), name='bom-change-request-detail-view'),

    path('bcr/update/<int:pk>/', club_views.BOMChangeRequestUpdateView.as_view(), name='bom-change-request-update-view'),

    path('bcr/material_price/list/<int:po_club_id>/', club_views.BOMChangeRequestMaterialPriceListView.as_view(), name='bom-change-request-price-list-view'),
    
    path('bcr/price_change/create/<int:po_club_id>/', club_views.BOMChangeRequestMaterialPriceCreateView.as_view(), name='bom-change-request-price-change-create-view'),

    path('bcr/material_change/material/list/<int:po_club_id>/', club_views.BOMChangeRequestMaterialListView.as_view(), name='bom-change-request-type-list-view'),

    #path('bcr/material_change/material_by_category/list/<int:po_club_id>/', club_views.BOMChangeRequestMaterialListView.as_view(), name='bom-change-request-type-list-view'),

    path('bcr/material_change/material/placement/list/<int:po_club_id>/<int:material_id>/', club_views.BOMChangeRequestMaterialPlacementListView.as_view(), name='bom-change-request-material-placement-list-view'),

    path('bcr/material_change/list/<int:po_club_id>/', club_views.BOMChangeRequestChangeMaterialListView.as_view(), name='bom-change-request-change-material-list-view'),

    path('bcr/material_change/material_by_category/list/<int:po_club_id>/', club_views.BOMChangeRequestMaterialChangeMaterialListView.as_view(), name='bom-change-request-material-change-material-list-view'),

    path('bcr/consumption_change/list/<int:po_club_id>/', club_views.BOMChangeRequestMaterialConsumptionListView.as_view(), name='bom-change-request-material-list-view'),

    path('bcr/material_change/create/<int:po_club_id>/', club_views.BOMChangeRequestMaterialChangeCreateView.as_view(), name='bom-change-request-material-change-create-view'),

    path('bcr/consumption_change/create/<int:po_club_id>/', club_views.BOMChangeRequestMaterialConsumptionChangeCreateView.as_view(), name='bom-change-request-consumption-change-create-view'),

    path('bcr/supplier_change/create/<int:po_club_id>/', club_views.BOMChangeRequestSupplierChangeCreateView.as_view(), name='bom-change-request-supplier-change-create-view'),

    path('bcr/marker_list/<int:po_club_id>/<int:material_id>/',  club_views.POClubFabricMarkers.as_view(),
         name='po-club-item-markers'),

    path('bcr/supplier_po/list/<int:po_club_id>/<int:material_id>/',  club_views.POClubMaterialSupplierPOListView.as_view(),
         name='po-club-material-supplier-po-list-view'),
     
     path('bcr/supplier_inquiry/list/<int:po_club_id>/<int:material_id>/',  club_views.POClubMaterialSupplierInquiryListView.as_view(),
         name='po-club-material-supplier-inquiry-list-view'),

    path('po_pack/quantities/<int:po_club_id>/', club_views.POClubPackQuantityListView.as_view(), name='po-club-pack-quantity-list-view'),

    path('po_pack/po_wise/quantities/<int:po_pack_id>/', club_views.POClubPackQuantityPurchaesOrderDetailView.as_view(), name='po-club-pack-quantity-purchase-order-detail-view'),

    path('export/fabric_report/<int:po_club_id>/', club_views.POClubExportFabricReportView.as_view(), name='export-fabric_report'),

]
