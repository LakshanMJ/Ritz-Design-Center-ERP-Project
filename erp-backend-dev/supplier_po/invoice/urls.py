from django.urls import path
from supplier_po.invoice import views as invoice_views

app_name = 'supplier_po_commercial_invoice'

urlpatterns = [

    path('delivery/summary/<int:supplier_po>/<int:pk>/', invoice_views.CommercialInvoiceDeliverySummaryView.as_view(),
         name='commercial-invoice-delivery-summary-view'),

    path('debit_note/meta_data/', invoice_views.DebitNoteMetaDataView.as_view(),
         name='debit-note-meta-data-view'),

    path('debit_note/save/<int:pk>/', invoice_views.DebitNoteSaveView.as_view(),
         name='commercial-invoice-delivery-summary-view'),

    path('debit_note/detail/<int:pk>/', invoice_views.DebitNoteDetailView.as_view(),
         name='debit-note-summary-view'),

    path('replacement/future_delivery_dates/<int:commercial_invoice_id>/<int:supplier_po_grn_material>/',
         invoice_views.ReplacementFutureDeliveryDatesDetailView.as_view(),
         name='replacement-material-save-view'),

    path(
        'color_tone/debit_note_replacement/detail/<int:delivery_date_id>/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
        invoice_views.ColorToneDefectDebitNoteReplacementDetailView.as_view(),
        name='color-tone-debit-note-replacement-material-detail-view'),

    path('color_tone/debit_note_replacement/save/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
         invoice_views.ColorToneDefectDebitNoteReplacementCreateUpdateView.as_view(),
         name='color-tone-debit-note-replacement-material-save-view'),

    path(
        'batch_rejection/debit_note_replacement/detail/<int:delivery_date_id>/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
        invoice_views.BatchRejectionRemediationDetailView.as_view(),
        name='batch_rejection-debit-note-replacement-material-detail-view'),

    path('batch_rejection/debit_note_replacement/save/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
         invoice_views.BatchRejectionRemediation.as_view(),
         name='batch-rejection-debit-note-replacement-material-save-view'),

    path(
        'shortage/debit_note_replacement/detail/<int:delivery_date_id>/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
        invoice_views.ShortageRemediationDetailView.as_view(),
        name='shortage-debit-note-replacement-material-detail-view'),

    path('shortage/debit_note_replacement/save/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
         invoice_views.ShortageRemediation.as_view(),
         name='shortage-debit-note-replacement-material-save-view'),

    path(
        'excess/debit_note/detail/<int:delivery_date_id>/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
        invoice_views.ExcessRemediationDetailView.as_view(),
        name='excess-debit-note-material-detail-view'),

    path('excess/debit_note/save/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
         invoice_views.ExcessRemediation.as_view(),
         name='excess-debit-note-material-save-view'),

    path(
        'mismatch/debit_note/detail/<int:delivery_date_id>/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
        invoice_views.MismatchRemediationDetail.as_view(),
        name='mismatch-debit-note-material-detail-view'),

    path('mismatch/debit_note/save/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
         invoice_views.MismatchRemediation.as_view(),
         name='mismatch-debit-note-replacement-material-save-view'),

    path('finacial/debit_note_replacement/detail/<int:supplier_po_id>/',
         invoice_views.SupplierPOFinancialDetailView.as_view(),
         name='mismatch-debit-note-replacement-material-save-view'),

    path(
        'width/replacement/detail/<int:delivery_date_id>/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
        invoice_views.WidthRemediationDetailView.as_view(),
        name='width-replacement-detail-view'),

    path('width/replacement/save/<int:commercial_invoice_id>/<int:supplier_po_grn_material_id>/',
         invoice_views.WidthRemediationCreateView.as_view(),
         name='width-replacement-save-view'),

    path('in_complete/list/',  invoice_views.PendingCommercialInvoiceListView.as_view(), name='pending-invoice-list-view'),

    path('complete/list/',  invoice_views.CompletedCommercialInvoiceListView.as_view(), name='completed-invoice-list-view'),

]