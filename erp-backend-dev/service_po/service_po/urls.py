from django.urls import path, include
from service_po.service_po import views as service_po_view

app_name = 'service_po'

urlpatterns = [

    path('list/<int:po_club_id>/', service_po_view.ServicePODeliveryList.as_view(), name="service-po-delivery-list-view"),
    
    path('delivery/list/update/<int:po_club_id>/', service_po_view.ServicePODeliveryListUpdateView.as_view(), name='service_po-combined-delivery-list-view'),

    path('po_club/supplier/list/<int:po_club_id>/', service_po_view.POClubServicePOSupplierListView.as_view(), name="po_club-supplier-list-view"),

    path('supplier_list/<int:general_service_po_service_id>/', service_po_view.ServicePOSupplierListView.as_view(), name="service-po-supplier-list-view"),

    path('delivery/create/<int:general_service_po_service_id>/', service_po_view.ServicePODeliverySaveView.as_view(), name="service-po-delivery-save-view"),

    path('delivery/detail/<int:general_service_po_service_id>/', service_po_view.ServicePODeliveryDetailView.as_view(), name="service-po-delivery-detail-view"),

    path('generate_po_club_service_pos/<int:po_club_id>/', service_po_view.GeneratePOClubServicePOsView.as_view(), name='generate-po_club-service_pos-view'),

    path('service_po/list/<int:po_club_id>/', service_po_view.POClubServicePOListView.as_view(), name='po_club-service_po-list-view'),

    path('service_po/list/', service_po_view.ServicePOListView.as_view(), name='service-po-list'),

    path('service_po/update/<int:pk>/', service_po_view.ServicePOUpdateView.as_view(), name='service-po-update'),

    path('service_po/detail/<int:pk>/', service_po_view.ServicePODetailView.as_view(), name='testing-service-po-detail'),

    path('service_po_meta_data/', service_po_view.ServicePOMetadataView.as_view(), name='service-po-meta-data'),

    path('service_po/send_to_approval/<int:service_po_id>/', service_po_view.ServicePOSendToApproveView.as_view(), name='service-po_approval-create-view'),

    path('other_cost/po/list/<int:po_club_id>/', service_po_view.POClubOtherCostServicePOListView.as_view(), name='po_club-other-cost-service_po-list-view'),

    path('other_cost/generate_pos/<int:general_service_po_supplier_id>/', service_po_view.GeneratePOClubOtherCostServicePOsView.as_view(), name='generate-po_club-other-cost-service_pos-view'),

]
