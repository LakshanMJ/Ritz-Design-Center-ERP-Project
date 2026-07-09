from django.urls import path
from supplier_po.general_po import views as general_po_view

app_name = 'general_po'

# api/supplier_po/spo - url path to here

urlpatterns = [
    
    path('meta_data/', general_po_view.GeneralPOMetaDataDetailView.as_view(),
         name='general-po-order-pack-item-quantities-detail-view'),

    path('order_pack/quantity/detail/<int:general_po_id>/', general_po_view.GeneralPOOrderPackQuantityDetailView.as_view(),
         name='general-po-order-pack-item-quantities-detail-view'),

    path('order_pack/quantity/save/<int:costing_version_id>/', general_po_view.GeneralPOOrderPackQuantitySaveView.as_view(),
         name='general-po-order-pack-item-quantities-save-view'),

     path('order_pack/quantity/update/<int:general_po_id>/', general_po_view.GeneralPOOrderPackQuantityUpdateView.as_view(),
         name='general-po-order-pack-item-quantities-update-view'),

    path('list/', general_po_view.GeneralPOListView.as_view(),
         name='general-po-list-view'),

    path('detail/<int:general_po_id>/', general_po_view.GeneralPODetailView.as_view(),
         name='general-po-detail-view'),

     path('state/update/<int:general_po_id>/', general_po_view.GeneralPOStateUpdateView.as_view(),
         name='general-po-state-update-view'),

     path('bom/materail/list/<int:general_po_id>/', general_po_view.GeneralPOBOMListViewView.as_view(),
         name='general-po-state-update-view'),

    path('materail_quantity/send_po_for_material/state/update/', general_po_view.GeneralPOMaterialQuantitySendPOForMaterialStateUpdateView.as_view(),
         name='general-po-state-update-view'),

     path('bom/material/supplier/list/<int:general_po_material_quantity_id>/<int:material_id>/', general_po_view.OrderInquirySupplierInquiryList.as_view(),
         name='general-po-bom-material-quantity-detail-view'),

     path('bom/material/quantity/detail/<int:pk>/', general_po_view.GeneralPOBOMMaterialQuantityDetailView.as_view(),
         name='general-po-bom-material-quantity-detail-view'),

     path('bom/supplier/delivery_date/save/<int:general_po_material_quantity_id>/', general_po_view.GeneralPOBOMSupplierDeliveryDateCreateUpdateView.as_view(),
         name='general-po-bom-supplier-delivery-date-create-update-view'),

     path('bom/supplier/delete/<int:pk>/', general_po_view.GeneralPOBOMSupplierDeleteView.as_view(), name='general-po-bom-supplier-delete-view'),

    # Supplier PO Delivery date creation urls
    path('save_delivery/<int:general_po_material_quantity_id>/',
         general_po_view.SaveSupplierQuantityDelivery.as_view(), name='save-supplier-quantity-delivery'),

     path('general_po_price/delete/<int:pk>/',
         general_po_view.GeneralPOSupplierMaterialPriceDeleteView.as_view(), name='delete-general-po'),

     path('delivery_po_allocation/delete/<int:pk>/',
         general_po_view.SupplierDeliveryDateQuantityPOAllocationDeleteView.as_view(), name='delete-general-po'),

    path('material/detail/<int:general_po_material_quantity_id>/',
         general_po_view.GeneralPOMaterialDetail.as_view(), name='general-po-material-detail'),

     path('material/list/',
         general_po_view.GeneralPOMaterialList.as_view(), name='general-po-material-list'),

     path('material/list/save/',
         general_po_view.GeneralPOMaterialListSaveView.as_view(), name='general-po-material-list'),

    path('material/delivery/meta_data/<int:po_club_id>/<int:supplier_id>/<int:material_id>/',
         general_po_view.GeneralPOMaterialDeliveryMetaDataView.as_view(), name='general-po-material-meta-data'),

    path('po_club/material_list/<int:club_id>/', general_po_view.GeneralPOPOClubMaterialQuantityListView.as_view(),
         name='po-club-general-po-material-list-view'),

    path('po_club/material_list/excel/<int:club_id>/', general_po_view.GeneralPOPOClubMaterialQuantityExcelListView.as_view(),
         name='po-club-general-po-material-list-view'),

    path('supplier_po/list/<int:id>/', general_po_view.GeneralPOSupplierPOListView.as_view(),
         name='general-po-supplier-po-list-view'),

    path('fabric/shade_summary/<int:general_po_id>/', general_po_view.GeneralPOFabricShadeSummary.as_view(),
         name='general-po-supplier-po-list-view'),

    path('fabric/chart/summary/<int:general_po_id>/', general_po_view.GeneralPOFabricChartSummaryView.as_view(),
         name='supplier-po-grn-material-summary-list-view'),

     path('material/discrepancy_reasons/', general_po_view.GeneralPOMaterialQuantityDiscrepancyReasonsChoicesView.as_view(),
         name='supplier-po-general-po-material-discrepancy-reasons'),
     
     path('generate_supplier_pos/<int:po_club_id>/', general_po_view.GenerateSupplierPOsView.as_view(), name='generate-supplier-pos'),

     path('re_generate_supplier_po/<int:supplier_po_id>/', general_po_view.ReGenerateSupplierPOView.as_view(), name='re-generate-supplier_po'),

]