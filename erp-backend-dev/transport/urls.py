from django.urls import path
from transport.views import *


app_name = 'transport'

urlpatterns = [
    path('vehicle_type/create/', VehicleTypeCreateView.as_view(), name = 'vehicle_type-create'),
    path('vehicle_type/list/', VehicleTypeListView.as_view(), name = 'vehicle_type-list'),
    path('vehicle_type/edit/<int:pk>', VehicleTypeEditView.as_view(), name = 'vehicle_type-edit'),

    path('vehicle_type/meta_data/', VehicleTypeMetaDataView.as_view(), name='vehicle_type-meta-data'),

    path('transport_type/create/', TransportTypeCreateView.as_view(), name='transport_type-create'),
    path('transport_type/list/', TransportTypeListVIew.as_view(), name='transport_type-list'),
    path('transport_type/edit/<int:pk>', TransportTypeEditVIew.as_view(), name='transport_type-edit'),

    path('transport_ex_work_charge_name/create/', TransportExWorkChargeNameCreateView.as_view(), name='transport_ex_work_charge_name-create'),
    path('transport_ex_work_charge_name/list/', TransportExWorkChargeNameListView.as_view(), name='transport_ex_work_charge_name-list'),
    path('transport_ex_work_charge_name/edit/<int:pk>', TransportExWorkChargeNameEditView.as_view(), name = 'transport_ex_work_charge_name-edit'),
    
    path('transport_ex_work_charge/meta_data/', TransportExWorkChargeMetaDataView.as_view(), name='transport_ex_wrok_meta_data-detail'),

    path('transport_ex_work_charge/create/', TransportExWorkChargeCreateView.as_view(), name='transport_ex_work_charge-create'),
    path('transport_ex_work_charge/update/<int:pk>', TransportExWorkChargeEditView.as_view(), name='transport_ex_work_charge-update'),
    path('transport_ex_work_charge/detail/<int:pk>', TransportExWorkChargeEditView.as_view(), name='transport_ex_work_charge-update'),
    path('transport_ex_work_charge/list/', TransportExWorkChargeListView.as_view(), name='transport_ex_work_charge-list'),

    path('fixed_charge_name/create/', TransportFixedChargeNameCreateView.as_view(), name='fixed_charge_name-create'),
    path('fixed_charge_name/detail/<int:pk>/', TransportFixedChargeNameDetailView.as_view(), name='fixed_charge_name-detail'),
    path('fixed_charge_name/list/', TransportFixedChargeNameListView.as_view(), name='fixed_charge_name-list'),
    path('fixed_charge_name/update/<int:pk>/', TransportFixedChargeNameUpdateView.as_view(), name='fixed_charge_name-update'),

    path('fixed_charge/create/', TransportFixedChargeCreateView.as_view(), name='fixed_charge-create'),
    path('fixed_charge/detail/<int:pk>/', TransportFixedChargeDetailView.as_view(), name='fixed_charge-detail'),
    path('fixed_charge/list/', TransportFixedChargeListView.as_view(), name='fixed_charge-list'),
    path('fixed_charge/update/<int:pk>/', TransportFixedChargeUpdateView.as_view(), name='fixed_charge-update'),

    path('fixed_charge/meta/data/', TransportFixedChargeMetaDataView.as_view(), name='fixed_charge-meta-data'),

    path('per_unit_charge_name/create/', TransportPerUnitChargeNameCreateView.as_view(), name='per_unit_charge_name-create'),
    path('per_unit_charge_name/detail/<int:pk>/', TransportPerUnitChargeNameDetailView.as_view(), name='per_unit_charge_name-detail'),
    path('per_unit_charge_name/list/', TransportPerUnitChargeNameListView.as_view(), name='per_unit_charge_name-list'),
    path('per_unit_charge_name/update/<int:pk>/', TransportPerUnitChargeNameUpdateView.as_view(), name='per_unit_charge_name-update'),

    path('per_unit_charge/create/', TransportPerUnitChargeCreateView.as_view(), name='per_unit_charge-create'),
    path('per_unit_charge/detail/<int:pk>/', TransportPerUnitChargeDetailView.as_view(), name='per_unit_charge-detail'),
    path('per_unit_charge/list/', TransportPerUnitChargeListView.as_view(), name='per_unit_charge-list'),
    path('per_unit_charge/update/<int:pk>/', TransportPerUnitChargeUpdateView.as_view(), name='per_unit_charge-update'),

    path('per_unit_charge/meta/data/', TransportPerUnitChargeMetaDataView.as_view(), name='per_unit_charge-meta-data'),


    path('supplier_delivery/list/', SupplierDeliveryListView.as_view(), name='supplier_delivery-list-view'),

    path('transport_tracking/create/', TransportDeliveryDateTrackingCreateUpdateView.as_view(), name='transport_tracking-create'),
    path('transport_tracking/list/', TransportDeliveryDateTrackingListView.as_view(), name='transport_tracking-list'),
    path('transport_tracking/update/<int:pk>/', TransportDeliveryDateTrackingCreateUpdateView.as_view(), name='transport_tracking-update'),
    path('transport_tracking/detail/<int:pk>/', TransportDeliveryDateTrackingDetailView.as_view(), name='transport_tracking-detail'),

    path('transport_tracking/meta/data/', TransportDeliveryDateTrackingMetaDataView.as_view(), name='transport_tracking-meta-data'),

    path('delivery_counts/', TransportDeliveryCountsView.as_view(), name='delivery_counts-detail'),

    path('tracking/state/change/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingStateChangeView.as_view(), name='transport_tracking-state-change'),
    path('tracking/invoice/list/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingInvoiceListView.as_view(), name='transport_tracking-invoice-list'),
    path('tracking/charges/list/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingChargeListView.as_view(), name='transport_tracking_charges-list'),
    path('tracking/charge/update_create/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingChargeUpdateCreateView.as_view(), name='transport_tracking_combined_charge-create'),
    path('tracking/transport_type_charge/copy/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingTypeChargeCopyView.as_view(), name='transport_tracking_transport_type_charge-copy'),
    path('tracking/delivery_transport_type/list/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingTransportTypeListView.as_view(), name='transport_tracking_transport_type-list'),

    path('po_club/plan/actual/<int:po_club_id>/', TransportPOClubPlanActualView.as_view(), name='po_club_plan_actual-detail'),
    path('po_club/pending/deliveries/<int:po_club_id>/', TransportPOClubPendingDeliveriesView.as_view(), name='po_club_pending_deliveries-detail'),

    path('freight_forwarder/list/create/', FreightForwarderListCreateView.as_view(), name='freight_forwarder-list-create'),
    path('freight_forwarder/edit/<int:pk>/', FreightForwarderEditView.as_view(), name='freight_forwarder-edit'),

    path('freight_forwarder_port/list/create/<int:freight_forwarder_id>/', FreightForwarderPortListCreateView.as_view(), name='freight_forwarder_port-list-create'),
    path('freight_forwarder_port/delete/<int:freight_forwarder_id>/<int:port_id>/', FreightForwarderPortDeleteView.as_view(), name='freight_forwarder_port-delete'),

    path('freight_forwarder_port_calander/create/<int:freight_forwarder_id>/<int:port_id>/', FreightForwarderPortCalanderCreateView.as_view(), name='freight_forwarder_port_calander-create'),
    path('freight_forwarder_port_calander/delete/<int:pk>/', FreightForwarderPortCalanderDeleteView.as_view(), name='freight_forwarder_port_calander-delete'),
    path('freight_forwarder_port_calander/list/<int:freight_forwarder_id>/<int:port_id>/', FreightForwarderPortCalanderListView.as_view(), name='freight_forwarder_port_calander-list'),
    path('freight_forwarder_warehouse/list/create/<int:freight_forwarder_id>/', FreightForwarderWarehouseListCreateView.as_view(), name='freight_forwarder_warehouse-list-create'),
    path('freight_forwarder_warehouse/edit/<int:pk>/', FreightForwarderWarehouseEditView.as_view(), name='freight_forwarder_warehouse-edit'),

    path('tracking/delivery_transport_type/list/', DeliveryTransportTypeListView.as_view(), name='tracking-delivery_transport_type-list'),
    path('tracking/local/delivery/create/', DeliveryTransportTypeVehicleCreateView.as_view(), name='tracking-local-delivery-create'),
    path('tracking/local/delivery/update/<int:pk>/', DeliveryTransportTypeVehicleCreateView.as_view(), name='tracking-local-delivery-update'),
    path('tracking/local/delivery/list/', LocalDeliveryTransportTrackingListView.as_view(), name='local-delivery-tracking-list'),
    path('tracking/local/delivery/detail/<int:pk>/', LocalDeliveryTransportTrackingDetailView.as_view(), name='local-delivery-tracking-detail'),

    path('freight_forwarder/country/port/list/', FreightForwarderCountryPortListView.as_view(), name='freight_forwarder-country-port-list'),

    path('local_delivery_counts/', LocalDeliveryCountDetail.as_view(),name='local_delivery_count-detail'),

    path('merge_supplier_delivery_dates/<int:transport_delivery_date_tracking_id>/', MergeSupplierDeliveryDateView.as_view(), name='merge_supplier_delivery_dates-update'),
    path('merge_containers/<int:local_delivery_tracking_id>/', MergeContainersView.as_view(), name='merge_containers-update'),

    path('import/delivery/auto/consolidation/', ImportDeliveryAutoConsolidationView.as_view(), name='import-delivery-auto-consolidation'),

    path('purchase_order_delivery/list/', PurchaseOrderOrderDeliveryListView.as_view(), name='purchase-order-delivery-list'),
    path('export_delivery_counts/', TransportExportDeliveryCountsView.as_view(), name='export-delivery-counts'),
    path('export_transport_tracking/meta/data/', TransportDeliveryDateExportTrackingMetaDataView.as_view(), name='export-transport-tracking-meta-data'),
    path('export_transport_tracking/list/', TransportDeliveryExportDateTrackingListView.as_view(), name='export-transport-tracking-list'),
    path('export_transport_tracking/detail/<int:pk>/', TransportDeliveryExportDateTrackingDetailView.as_view(), name='export-transport-tracking-detail'),
    path('export_transport_tracking/create/', TransportDeliveryExportDateTrackingCreateUpdateView.as_view(), name='export-transport_tracking-create'),
    path('export_transport_tracking/update/<int:pk>/', TransportDeliveryExportDateTrackingCreateUpdateView.as_view(), name='export-transport_tracking-update'),
    path('exprot_merge_with_transport_tracking_list/', ExportMergewithTransportDeliveryDateTrackingListView.as_view(), name='export-merge-with-transport-tracking-list'),
    path('exprot_merge_transport_tracking/<int:transport_delivery_date_tracking_id>/', MergeExportPurchaseOrderDeliveryView.as_view(), name='export-merge-transport-tracking'),
    path('exprot_transport_delivery_tracking_invoice_list/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingExportInvoiceListView.as_view(), name='export-transport-delivery-tracking-invoice-list'),
    path('exprot_transport_delivery_tracking_charges_list/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingExportChargeListView.as_view(), name='export-transport-delivery-tracking-charges-list'),
    path('export_transport_delivery_tracking_charges/update_create/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingExportChargeUpdateCreateView.as_view(), name='export-transport-delivery-tracking-charges-update-create'),
    path('export_transport_delivery_tracking/state/change/<int:delivery_tracking_id>/', TransportDeliveryDateTrackingExportStateChangeView.as_view(), name='export-transport-delivery-tracking-state-change'),
    path('export_transport_delivery_tracking/auto/consolidation/', TransportExportAutoConsolidate.as_view(), name='export-transport-delivery-tracking-auto-consolidate'),

    path('po_club/purchase_order_delivery/list/<int:po_club_id>/', POClubPurchaseOrderDeliveryListView.as_view(), name='po-club-purchase-order-delivery-list'),
    path('export_po_club/plan/actual/<int:po_club_id>/', TransportExportPOClubPlanActualView.as_view(), name='export-po-club-plan-actual-detail'),
]

