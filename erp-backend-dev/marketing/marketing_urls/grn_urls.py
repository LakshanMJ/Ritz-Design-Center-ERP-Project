from django.urls import path
from marketing.views import grn_views

urlpatterns = [

    path('invoice/<int:delivery_date_id>/', grn_views.InvoiceUploadView.as_view(), name = 'invoice-upload-view'),


    path('list/', grn_views.GRNListView.as_view(), name = 'grn-list-view'),


    # path('filter_list/grn/<int:grn_id>/', grn_views.GRNBasicDetailView.as_view(), name = 'grn-basic-detail-view'),

    # path('filter_list/supplier_po/<int:po_id>/', grn_views.SupplierPOBasicDetailView.as_view(), name = 'po-basic-detail-view'),


    path('unassign_material/list/<int:grn_id>/<int:supplier_po_id>/', grn_views.GRNUnAssignMaterialList.as_view(), name = 'grn-unassign-material-list'),

    path('assign/material/<int:grn_id>/', grn_views.GRNANewMaterialSaveView.as_view(), name = 'grn-assign-material-save'),


    path('pack_list/template/upload/<int:grn_material_id>/', grn_views.MaterialPackListUploadTemplateView.as_view(), name = 'grn-material-pack-list-template-upload'),



    path('material/row/delete/<int:pk>/', grn_views.GRNMaterialRowDeleteView.as_view(), name = 'grn-material-row-delete'),

    path('fabric/shade/actual_shade/list/<int:supplier_po_grn_material_id>/', grn_views.SupplierPOFabricShadeListView.as_view(), name = 'supplier-po-fabric-shade-list'),

    path('fabric/shade/actual_shade/detail/<int:pk>/', grn_views.ActualClubShadeRetriveUpdateView.as_view(), name = 'actual-shade-update-view'),

    path('fabric/shade/actual_shade/group/update/<int:supplier_po_grn_material_id>/', grn_views.ActualShadeGroupUpdateView.as_view(), name = 'actual-shade-group-update-view'),


    path('material/summary/list2/<int:supplier_po_grn_id>/', grn_views.GRNMaterialSummaryView.as_view(), name='supplier-po-grn-material-summary-list-view'),
    

    path('fabric/shade/actual_shade/create_or_update/<int:supplier_po_grn_material_id>/', grn_views.ClubShadeUpdateView.as_view(), name = 'actual-shade-create-update-view'),

    path('fabric/shade/actual_shade/delete/<int:pk>/<int:grn_id>/', grn_views.ClubShadeDeletesView.as_view(), name = 'actual-shade-delete-view'),

    path('fabric/roll/list_by_actual_shade/<int:actual_shade_id>/', grn_views.ActualShadeRollListView.as_view(), name = 'actual-shade-roll-list-view'),

    path('fabric/shade/split/detail/<int:grn_batch_shade_id>/', grn_views.GRNBatchShadeSplitDetailView.as_view(), name = 'grn-batch-shade-detail-view'),

    path('fabric/shade/split/create/<int:grn_batch_shade_id>/', grn_views.GRNBatchShadeSplitCreateView.as_view(), name = 'grn-batch-shade-craete-view'),

    path('fabric/inspection/start/<int:supplier_po_grn_id>/<int:supplier_po_grn_material_id>/', grn_views.FabricInspectionStartView.as_view(), name = 'fabric-inspection-start-view'),


    path('fabric/inspection/shrinkage/time_frame/', grn_views.FabricShrinkageTimeFrameDetailView.as_view(), name = 'fabric-inspection-shrink-time-frame-meta-view'),

    path('fabric/inspection/shrinkage/detail/<int:grn_id>/', grn_views.FabricShrinkageDetailView.as_view(), name = 'fabric-inspection-shrink-detail-view'),

    path('fabric/inspection/shrinkage/create/<int:grn_id>/', grn_views.FabricShrinkageCreateUpdateView.as_view(), name = 'fabric-inspection-shrink-create-view'),

    path('final_grn/summary/<int:supplier_po>/', grn_views.SupplierPOGRNSummaryDetailView.as_view(), name = 'supplier-po-grn-summary-detail-view'),

    path('pack_list/list/<int:supplier_po_id>/', grn_views.PackListBySupplierPOListView.as_view(), name = 'pack-list-by-supplier-po-list-view'),

    path('summary/breakdown/purchase_order/<int:supplier_po_id>/', grn_views.CalculationSummaryBreakdownBySupplierPurchaseOrderDetailView.as_view(), name = 'grn-summary-breakdown-by-purchase-order-detail-view'),

    path('summary/breakdown/delivery_note/<int:delivery_note_id>/<int:supplier_po_id>/', grn_views.CalculationSummaryBreakdownByDeliveryNoteDetailView.as_view(), name = 'grn-summary-breakdown-by-delivery-date-detail-view'),

    path('summary/breakdown/pack_list/<int:pack_list_id>/<int:supplier_po_id>/', grn_views.CalculationSummaryBreakdownByPackListDetailView.as_view(), name = 'grn-summary-breakdown-by-pack-list-detail-view'),

    path('summary/breakdown/invoice/<int:invoice_id>/<int:supplier_po_id>/', grn_views.CalculationSummaryBreakdownByInvoiceDetailView.as_view(), name = 'grn-summary-breakdown-by-invoice-detail-view'),

    path('summary/breakdown/pi/<int:pi_id>/', grn_views.CalculationSummaryBreakdownByPIDetailView.as_view(), name = 'grn-summary-breakdown-by-pi-detail-view'),

    path('summary/breakdown/<int:grn_id>/', grn_views.GRNDSummaryBreakdown.as_view(), name = 'grn-summary-breakdown-by-grn-detail-view'),

    path('invoice/detail/<int:supplier_po_id>/<int:invoice_id>/', grn_views.InvoiceDetailView.as_view(), name = 'grn-invoice-detail-view'),

    path('performa_invoice/save/<int:supplier_po_id>/', grn_views.PerformaInvoiceSaveView .as_view(), name = 'performa-invoice-save-view'),

    path('performa_invoice/detail/<int:supplier_po_id>/', grn_views.PerformaInvoiceDetailView .as_view(), name = 'performa-invoice-detail-view'),

    path('pcl/calander/list/', grn_views.PCLCalendarWeekView.as_view(), name = 'performa-invoice-detail-view'),


]