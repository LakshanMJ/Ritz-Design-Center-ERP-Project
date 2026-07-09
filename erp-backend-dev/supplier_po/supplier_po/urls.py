from django.urls import path, include
from supplier_po.supplier_po import views as spo_v

app_name = 'supplier_po_spo'

# api/supplier_po/spo - url path to here

urlpatterns = [

    path('po_club/supplier/po/list/<int:id>/', spo_v.SupplierPODetailView.as_view(), name='supplier-po-list'),

    path('supplier_po_details/<int:id>/', spo_v.SupplierPODeliveries.as_view(), name='supplier-po-details'),

    path('supplier_po_details/leftover/<int:id>/', spo_v.SupplierPOLeftOverDetailView.as_view(), name='supplier-po-leftover-details'),

    path('supplier_po_details/foc/list/<int:delivery_date_id>/', spo_v.SupplierDeliveryDateFOCDetailView.as_view(), name='supplier-po-delivery-date-foc-details'),

    path('invoice/list/<int:supplier_po_id>/', spo_v.InvoiceBySupplierPOListView.as_view(), name='invoice-by-supplier-po-list-view'),

    path('invoice/list_by_customer/<int:supplier_po_id>/', spo_v.InvoiceListView.as_view(), name='invoice-by-supplier-po-list-view'),

    path('delivery/detail/<int:pk>/', spo_v.DeliveryinvoiceDetailView.as_view(), name='delivery-invoice-detail-view'),

    path('delivery_data/save/<int:delivery_date_id>/', spo_v.SupplierPODeliverySaveView.as_view(), name='grn-general-data-sace-view'),

    path('delivery_data/delivery_note/delete/<int:delivery_note_id>/', spo_v.SupplierPODeliveryNoteDeleteView.as_view(), name='delivery-note-delete-view'),

    path('delivery_data/pack_list/delete/<int:pack_list_id>/', spo_v.SupplierPOPackListDeleteView.as_view(), name='pack-list-delete-view'),

    path('actual_delivery/summary/<int:supplier_po_id>/', spo_v.ClubDeliverySummaryBreakdown.as_view(),
         name='delivery-summary-breakdown-by-actual-delivery-detail-view'),

    path('delivery_date/ddq_and_ddqi/detail/<int:supplier_po>/', spo_v.MaterialQuantitySummaryByDeliveryDateDetailView.as_view(),
         name='delivery-date-material-quantity-summary-detail-view'),

    path('delivery_date/materials/detail/<int:pk>/', spo_v.SupplierPODeliveryDateMaterialDetailView.as_view(),
         name='delivery-date-materials-detail-view'),

    path('material/list/<int:pk>/', spo_v.SupplierPOMaterialListView.as_view(),
         name='supplier-po-materail-list-view'),

    path('delivery_date/detail/<int:supplier_po>/', spo_v.DeliveryDateDetailView.as_view(),
         name='supplier-po-delivery-date-detail-view'),

    path('delivery_date_material_summary/<int:delivery_date_id>/', spo_v.DeliveryDateMaterialByPOListView.as_view(),
         name='materials-by-po-list-detail-view'),

    # TODO - this url might go away Mahesh check (supplier-po-add-supplier-create-view)
    path('add_supplier/<int:general_po_material_quantity_id>/<int:supplier_id>/',
         spo_v.SupplierPOAddSupplierCreateView.as_view(), name='supplier-po-add-supplier-create-view'),

    path('inspection/summary/<int:supplier_po_id>/', spo_v.InspectionSummaryListView.as_view(),
         name='supplier-po-inspection-summary-list-view'),

     path('supplier_delivery_date/inspection/summary/<int:supplier_delivery_date_id>/', spo_v.InspectionSummaryListView.as_view(),
         name='delivery-date-inspection-summary-list-view'),

     path('supplier_pack_list/inspection/summary/<int:supplier_pack_list_id>/', spo_v.InspectionSummaryListView.as_view(),
         name='pack-list-inspection-summary-list-view'),

     path('supplier_delivery_note/inspection/summary/<int:supplier_delivery_note_id>/', spo_v.InspectionSummaryListView.as_view(),
         name='delivery-note-inspection-summary-list-view'),

     path('supplier_invoice/inspection/summary/<int:supplier_invoice_id>/', spo_v.InspectionSummaryListView.as_view(),
         name='supplier-invoice-inspection-summary-list-view'),

    path('shade_summary/list/<int:supplier_po_id>/', spo_v.ShadeSummaryListView.as_view(),
         name='supplier-po-shade-summary-list-view'),

    path('supplier_delivery_date/shade_summary/list/<int:supplier_delivery_date_id>/',
         spo_v.ShadeSummaryListView.as_view(), name='delivery-date-shade-summary-list-view'),

    path('supplier_pack_list/shade_summary/list/<int:supplier_pack_list_id>/', spo_v.ShadeSummaryListView.as_view(),
         name='pack-list-shade-summary-list-view'),

     path('supplier_delivery_note/shade_summary/list/<int:supplier_delivery_note_id>/', spo_v.ShadeSummaryListView.as_view(),
         name='delivery-note-shade-summary-list-view'),

     path('supplier_invoice/shade_summary/list/<int:supplier_invoice_id>/', spo_v.ShadeSummaryListView.as_view(),
         name='supplier-invoice-shade-summary-list-view'),

     path('color_tone/detail/<int:supplier_po_id>/<int:customer_brand_material_id>/', spo_v.SupplierPOFabricColorToneDetailView.as_view(), name = 'supplier-po-fabric-color-tone-detail-view'),

     path('color_tone/save/<int:supplier_po_id>/', spo_v.SupplierPOFabricColorToneSaveView.as_view(), name = 'supplier-po-fabric-color-tone-save-view'),

     path('fabric/shade/attachment/save/', spo_v.SupplierPOShadeAttachmentUpdateView.as_view(), name = 'supplier-po-shade-attachment-update-view'),

     path('material/detail/<int:pk>/', spo_v.SPOMaterialListView.as_view(), name = 'spo-material-list-view'),

     path('delivery_invoice/list/', spo_v.SPOInvoiceListView.as_view(), name = 'spo-invoice-list-view'),

     path('supplier_po/list/', spo_v.SupplierPOListView.as_view(), name='supplier-po-list-view'),

     path('supplier_po/update/<int:pk>/', spo_v.SupplierPOUpdateView.as_view(), name='supplier-po-update-view'),

     path('supplier_po/detail/<int:pk>/', spo_v.SupplierPODetailMainView.as_view(), name='supplier-po-detail-view'),

     path('send_to_approve/<int:supplier_po_id>/', spo_v.SupplierPOSendToApproveView.as_view(),
         name='supplier-po-send-to-approve-view')

]
