from django.urls import path
from marketing.views import po_views

urlpatterns = [
    
    path('inhouse_material/material/list_by_po/<int:po_id>/', po_views.InHouseMaterialByPOListView.as_view(), name = 'inhouse-material-list-by-po'),

    path('inhouse_material/material/detail/<int:po_id>/<int:material_id>/', po_views.InHouseMaterialDetailsByPOListView.as_view(), name = 'inhouse-material-details-by-po'),

    path('inhouse_material/material/chart/summary/<int:po_id>/', po_views.InHouseMaterialChartSummaryView.as_view(), name = 'inhouse-material-chart-summary-sby-po'),

    path('packaging/instruction/list/<int:purchase_order_id>/', po_views.CreatedPOPackagingInstructionListView.as_view(), name = 'created-po-packaging-instruction-list-view'),
    
    path('packaging/instruction/detail/<int:purchase_order_id>/', po_views.POPackagingInstructionDetailView.as_view(), name = 'packaging-instruction-detail-view'),

    path('packaging/instruction/save/<int:po_packaging_id>/', po_views.POPackagingInstructionCreateUpdateView.as_view(), name = 'packaging-instruction-create-update-view'),

    path('packaging/instruction/delete/<int:po_packaging_instruction_id>/', po_views.POPackagingInstructionDeleteView.as_view(), name = 'packaging-instruction-delete-view'),

    path('packaging/summary/<int:purchase_order_id>/', po_views.POPackagingSummaryView.as_view(), name = 'packaging-instruction-summary-view'),

    path('inhouse_material/material/fabric/shade/summery/<int:po_id>/', po_views.InHouseFabricMaterialShadeSummaryByPOListView.as_view(), name='in-house-material-fabric-shade-summery-by-po'),

    path('po_pack/delivery/list/<int:purchase_order_id>/', po_views.PurchaseOrderPackDeliveryListView.as_view(), name = 'purchase-order-po-pack-list-view'),

    path('po_pack/delivery/update/<int:purchase_order_id>/', po_views.PurchaseOrderPackDeliveryUpdateView.as_view(), name = 'purchase-order-delivery-update-view'),

    path('po_pack/delivery/delete/<int:pk>/', po_views.PurchaseOrderDeliveryDeleteView.as_view(), name = 'purchase-order-delivery-delete-view'),

    path('delivery/list/', po_views.PurchaseOrderDeliveryListView.as_view(), name = 'purchase-order-delivery-list-view'),

    path('po_pack/<int:po_pack_id>/pre_seen_cost_summary', po_views.POPackPreSeenCostingSummary.as_view(), name='popack-cost-summary'),

]