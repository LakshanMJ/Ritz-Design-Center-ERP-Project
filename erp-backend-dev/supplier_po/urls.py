from django.urls import path, include

app_name = 'supplier_po'

urlpatterns = [
    path('spo/', include('supplier_po.supplier_po.urls', namespace='supplier_po_spo')),

    path('grn/', include('supplier_po.supplier_po_grn.urls', namespace='supplier_po_grn')),

    path('commercial_invoice/', include('supplier_po.invoice.urls', namespace='supplier_po_commercial_invoice')),

    path('general_po/', include('supplier_po.general_po.urls', namespace='supplier_po_general_po')),

]
