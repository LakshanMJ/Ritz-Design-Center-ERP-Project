from django.urls import path
from finance.payments import views as finance_views

app_name = 'payments'

# api/supplier_po/spo - url path to here

urlpatterns = [

    path('currency/list/', finance_views.CurrencyListView.as_view(), name='currency-list-view'),

    path('type/list/', finance_views.PaymentTypeListView.as_view(), name='payment-type-list-view'),
    
    path('po_club/incomming_payment/list/', finance_views.POClubPaymentListView.as_view(), name='po-club-delivery-incomming-payment-list-view'),

    path('deduction/delete/<int:pk>/', finance_views.IncomingPaymentDeductionDeleteView.as_view(), name='incomming-payment-deduction-delete-view'),

    path('incoming/deduction/save/<int:incoming_payment_id>/', finance_views.IncomingPaymentDeductionSaveView.as_view(), name='incomming-payment-deduction-save-view'),

    path('incoming_payment/list/', finance_views.IncomingPaymentListView.as_view(), name='incomming-payment-list-view'),

    

    path('incoming_payment/detail/<int:pk>/', finance_views.IncomingPaymentDetailView.as_view(), name='incomming-payment-detail-view'),

    path('outgoing_commercial_invoice/list/', finance_views.OutgoingCommercialInvoiceBasicListView.as_view(), name='outgoing-commercial-invoice-list-view'),

    path('incoming_payment/update/<int:incoming_payment_id>/', finance_views.IncomingPaymentSaveView.as_view(), name='incomming-payment-save-view'),

    #path('outgoing_payment/update/<int:pk>/', finance_views.OutgoingPaymentSaveView.as_view(), name='outgoing-payment-save-view'),

    path('commercial_invoice/list/', finance_views.OutgoingCommercialInvoiceListView.as_view(), name='commercial-invoice-list-view'),

    path('outgoing_commercial_invoice/save/', finance_views.OutgoingCommercialInvoiceCreateView.as_view(), name='-outgoing-commercial-invoice-create-view'),

    path('outgoing_commercial_invoice/update/<int:pk>/', finance_views.OutgoingCommercialInvoiceUpdateView.as_view(), name='-outgoing-commercial-invoice-update-view'),

    path('outgoing_commercial_invoice/detail/<int:pk>/', finance_views.OutgoingCommercialInvoiceDetailView.as_view(), name='-outgoing-commercial-invoice-detail-view'),

    path('incoming_payment/create/', finance_views.IncomingPaymentCreateView.as_view(), name='incoming-payment-create-view'),

    path('incoming_payment_deduction/create/', finance_views.IncomingPaymentDeductionCreateView.as_view(), name='incoming-deduction-create-view'),

    path('incoming_payment_deduction/detail/<int:pk>/', finance_views.IncomingPaymentDeductionDetailView.as_view(), name='incoming-deduction-update-view'),

    path('incoming_payment_deduction/update/<int:pk>/', finance_views.IncomingPaymentDeductionUpdateView.as_view(), name='incoming-deduction-update-view'),

    path('summary_by_customer/list/', finance_views.PaymentSummaryByCustomerListView.as_view(), name='payment-summary-by-customer-view'),

    path('summary_by_customer/detail/<int:pk>/', finance_views.PaymentSummaryByPOClubDetailView.as_view(), name='payment-summary-by-customer-detail-view'),

    path('shipment/incoming/payment/create/', finance_views.ShipmentIncomingPaymentCreateView.as_view(), name='shipment-incoming-payment-create-view'),

    path('shipment/incoming/payment/update/<int:pk>/', finance_views.ShipmentIncomingPaymentUpdateView.as_view(), name='shipment-incoming-payment-update-view'),

    path('pcl/summary/<int:po_club_id>/', finance_views.PCLSummaryDetailView.as_view(), name='pcl-summary-detail-view'),

    path('taken_from/po_club/list/', finance_views.TakenFromPOClubListView.as_view(), name='taken-from-po-club-list'),

    path('pcl/matching/list/<int:po_club_id>/', finance_views.POClubPCLMatchingListView.as_view(), name='po-club-pcl-macthing-list-view'),

    path('pcl/matching/create/<int:po_club_id>/', finance_views.POClubPCLMatchingCreateView.as_view(), name='po-club-pcl-macthing-create-view'),

    path('supplier/commercial_invoice/detail/<int:pk>/', finance_views.SupplierCommercialInvoiceDetailView.as_view(), name='supplier-commercial-invoice-detail-view'),

    path('supplier/commercial_invoice/list/', finance_views.SupplierCommercialInvoiceListView.as_view(), name='supplier-commercial-invoice-list-view'),

    path('supplier/commercial_invoice/state/list/', finance_views.SupplierCommercialInvoiceStateListView.as_view(), name='supplier-commercial-invoice-state-list-view'),

    path('supplier/commercial_invoice/update/<int:supplier_po_delivery_invoice_id>/', finance_views.SupplierCommercialInvoiceUpdateView.as_view(), name='supplier-commercial-invoice-update-view'),

    path('supplier/commercial_invoice/value_recalculate/<int:supplier_po_delivery_invoice_id>/', finance_views.SupplierCommercialInvoiceCalculateValueUpdateView.as_view(), name='supplier-commercial-invoice-value-update-view'),

    #path('pcl/mactching/list/', finance_views.PCLMatchingOutgoingPaymentList.as_view(), name='pcl-matching-outgoing-payment-list-view'),

    path('pcl/matching/po_club/list/', finance_views.POClubPCLMatchingListViewTest.as_view(), name='po-club-pcl-macthing-list-view'),

    #path('pcl/macthing_data/', finance_views.POClubPCLMatchingDataDetailView.as_view(), name='po-club-pcl-macthing-list-view'),

    

    path('bank/pcl/create/<int:po_club_id>/', finance_views.BankPCLCreateView.as_view(), name='po-club-bank-pcl-create-view'),

    

    path('due_payment/list/', finance_views.DuePaymentListView.as_view(), name='due-payment-list-view'),

    path('due_payment/all_list/', finance_views.DuePaymentAllListView.as_view(), name='due-payment-all-list-view'),

    path('due_payment/commercial_invoice/list/', finance_views.DueCommercialInvoiceList.as_view(), name='due-commercial-invoice-list-view'),

    path('due_payment/supplier_po/list/', finance_views.DueAdvancePaymentList.as_view(), name='due-advance-payment-all-list-view'),

    #Outgoing Payment API's Start
    path('outgoing_payment/update/<int:pk>/', finance_views.OutgoingPaymentUpdateView.as_view(), name='outgoing-payment-detail-view'),

    path('outgoing_payment/list/', finance_views.OutgoingPaymentListView.as_view(), name='outgoing-payment-list-view'),

    path('outgoing_payment/detail/<int:pk>/', finance_views.OutgoingPaymentDetailView.as_view(), name='outgoing-payment-detail-view'), #TODO

    path('outgoing_payment/state/list/', finance_views.OutgoingPaymentStateListView.as_view(), name='outgoing-payment-state-list-view'),

    path('outgoing_payment/interest_rate/list/', finance_views.OutgoingPaymentInterestRateListView.as_view(), name='outgoing-payment-interest-rate-list-view'),

    path('outgoing_payment/move_to_next_state/<int:pk>/', finance_views.OutgoingPaymentStateChangeView.as_view(), name='outgoing-payment-state-movce-view'),
    #Outgoing Payment API's Ed

    #Due Calander API's start

    path('due_payment/calander/', finance_views.DuePaymentCalanderView.as_view(), name='due-payment-calander-view'),

    path('due_payment/calander/advance_payment/list/<int:customer_id>/', finance_views.DuePaymentCalanderAdvancePaymentListView.as_view(), name='due-payment-calander-advance-payment-list'),

    path('due_payment/calander/invoice_payment/list/<int:customer_id>/', finance_views.DuePaymentCalanderInvoiceListView.as_view(), name='due-payment-calander-advance-payment-list'),

    path('due_payment/calander/all_payment/list/<int:customer_id>/', finance_views.DuePaymentCalanderAllDuePaymentListView.as_view(), name='due-payment-calander-advance-payment-list'),

    #Due calander API's End


    # start PCLBankInformation API's

    path('pcl_bank_information/detail/<int:pk>/', finance_views.PCLBankInformationDetailView.as_view(), name='pcl-bank-infomation-detail-view'),

    path('pcl_bank_information/merged_po_club/list/<int:pk>/', finance_views.PCLBankInformationMergedPOClubListView.as_view(), name='pcl-bank-infomation-merged-po-list-view'),

    path('pcl_bank_information/merged_po_club/edit/<int:pk>/', finance_views.PCLBankInformationMergedPOClubEditView.as_view(), name='pcl-bank-infomation-merged-po-club-edit-view'),

    path('pcl_bank_information/state/list/', finance_views.PCLBankInformationStateListView.as_view(), name='pcl-bank-information-state-list-view'),

    path('pcl_bank_information/pending/po_club/list/', finance_views.PendingPCLPOClubListView.as_view(), name='pending-pcl-po-club-list-vew'),

    path('pcl_bank_information/state/change/<int:pk>/', finance_views.PCLBankInformationStateChangeView.as_view(), name='change-pcl-bank-information-states'),

    path('pcl_bank_information/order_profitability/detail/<int:pk>/', finance_views.PCLBankInformationOrderProfitabilityDetailView.as_view(), name='pcl-bank-information-order_profitability'),

    path('po_club/order_profitability/detail/<int:pk>/', finance_views.POClubOrderProfitabilityDetailView.as_view(), name='po-club-order_profitability'),

    path('purchase_order/order_profitability/detail/<int:pk>/', finance_views.PurchaseOrderOrderProfitabilityDetailView.as_view(), name='purchase-order-order_profitability'),

    path('commercial_invoice/state/change/<int:pk>/', finance_views.CommercialInvoiceMoveToNextStateView.as_view(), name='commercial-invoice-move-to-next-state'),

    path('pcl_bank_information/list/', finance_views.PCLBankInformationListView.as_view(), name='pcl-bank-infomation-list-view'),

    path('pcl_bank_information/pending/list/', finance_views.PCLBankInformationListView.as_view(), name='pcl-bank-infomation-list-view'),

    path('pcl_bank_information/basic_detail/<int:pk>/', finance_views.PCLBankInformationBasicDetailView.as_view(), name='pcl-bank-infomation-basic-detail-view'),

    path('pcl_bank_information/supplier_po_delivery_invoice_pcl/delete/<int:pk>/', finance_views.SupplierPODeliveryInvoicePCLDeleteView.as_view(), name='supplier-po-delivery-invoice-pcl-delete-view'),

    path('pcl_bank_information/outgoing_payment_interest/re_calculate/<int:outgoing_payment_id>/', finance_views.OutgoingPaymentInterestRecalculateView.as_view(), name='outgoing-payment-recalculate-view'),

    path('pcl_bank_information/dashbaord/<int:customer_id>/', finance_views.PCLDashBoardListView.as_view(), name='pcl-dashbaord-list-view'),

     # end PCLBankInformation API's

    path('pcl/settle/', finance_views.PCLSettleView.as_view(), name='pcl-settle-view'),

    path('pcl/clubbing/', finance_views.PCLClubbingCreateView.as_view(), name='pcl-clubbing-create-view'),

    path('pcl/po_club/automap/', finance_views.PCLClubbingAutomapView.as_view(), name='pcl-clubbing-automap-view'),

    path('pcl/po_club/automap/<int:po_club_id>/', finance_views.PCLClubbingAutomapByClubView.as_view(), name='pcl-clubbing-automap-by-club-view'),

    path('pcl/po_club/automap/save/<int:po_club_id>/', finance_views.PCLClubbingAutomapByClubCreateView.as_view(), name='pcl-clubbing-automap-by-club-view'),

    
]

