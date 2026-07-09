export const pclSettlementDetailsURL = (rowsPerPage: any, searchText: any) => `finance/payments/po_club/incomming_payment/list/?page_size=${rowsPerPage}&search_text=${searchText}`;

export const paymentCurrencyListURL = () => `finance/payments/currency/list/`;

export const incomingPaymentDetailsURL = (incommingPaymentId: any) => `finance/payments/incoming_payment/detail/${incommingPaymentId}/`;

export const saveIncommingPaymentDeductionsURL = (incommingPaymentId: any) => `finance/payments/incoming/deduction/save/${incommingPaymentId}/`;

export const deleteIncommingPaymentDeductionURL = (deductionId: any) => `finance/payments/deduction/delete/${deductionId}/`;
export const incomingPaymentsListURL = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `finance/payments/incoming_payment/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const outgoingPaymentsListURL = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `finance/payments/outgoing_payment/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
}

export const outgoingCommercialInvoiceListURL = (searchText: any) => `finance/payments/outgoing_commercial_invoice/list/?search_text=${searchText}`;

export const outgoingPaymentDetailsURL = (outgoingPaymentId: any) => `finance/payments/outgoing_payment/detail/${outgoingPaymentId}/`;

export const outgoingCommercialInvoiceDetailsURL = (outgoingCommercialInvocieId: any) => `finance/payments/outgoing_commercial_invoice/detail/${outgoingCommercialInvocieId}/`;

export const saveIncomingPaymentDetails = (incommingPaymentId: any) => `finance/payments/incoming_payment/update/${incommingPaymentId}/`;

export const updateOutgoingPaymentDetails = (outgoingPaymentId: any) => `/finance/payments/outgoing_payment/update/${outgoingPaymentId}/`;

export const createIncomingPaymentURL = () => `finance/payments/incoming_payment/create/`;
export const outgoingCommercialInvoicesUrl = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `finance/payments/commercial_invoice/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const createOutgoingCommercialInvoiceURl = () => `finance/payments/outgoing_commercial_invoice/save/`;

export const createIncomingPaymentDeductionURL = () => `finance/payments/incoming_payment_deduction/create/`;

export const updateIncomingPaymentDeductionURL = (deductionId: any) => `finance/payments/incoming_payment_deduction/update/${deductionId}/`;

export const incomingPaymentDeductionDetailsURL = (deductionId: any) => `finance/payments/incoming_payment_deduction/detail/${deductionId}/`;

export const financePaymentMethodsURL = () => `finance/payments/type/list/`;

export const createOutgoingPaymentURL = () => `finance/payments/pcl/create/`;

export const updateOutgoingPaymentURL = (outgoingPaymentId: any) => `finance/payments/outgoing_payment/update/${outgoingPaymentId}/`;

export const updateOutgoingCommercialInvoiceURL = (invoiceId: any) => `finance/payments/outgoing_commercial_invoice/update/${invoiceId}/`;

export const deleteOutgoingIncomingPaymentURL = (outgoingPaymentId: any, takenId: any) => `outgoing_payment_taken_from/delete/${outgoingPaymentId}/${takenId}/`;

export const pclSummaryDetailUrl = () => `finance/payments/summary_by_customer/list/`;

export const pclPOClubDetailUrl = (clubId: any) => `finance/payments/summary_by_customer/detail/${clubId}/`;

export const pclIncomingPaymentCreateURL = () => `finance/payments/shipment/incoming/payment/create/`;

export const pclIncomingPaymentUpdateURL = (incomingPaymentId: any) => `finance/payments/shipment/incoming/payment/update/${incomingPaymentId}/`;

export const pclSupplierGRNSummaryURL = (clubId: any) => `finance/payments/pcl/summary/${clubId}/`;

export const financePOClubListURL = () => `finance/payments/taken_from/po_club/list/`;

export const pclMatchingDetailsURL = (clubId: any) => `finance/payments/pcl/po_club/automap/${clubId}/`;

export const savePCLMatchingDetailsURL = (clubId: any) => `finance/payments/pcl/po_club/automap/save/${clubId}/`;

export const commercialInvoiceDetailsURL = (commercialInvoiceId: any) => `finance/payments/supplier/commercial_invoice/detail/${commercialInvoiceId}/`;

export const commercialInvoiceStateChangeURL = (commercialInvoiceId: any) => `finance/payments/commercial_invoice/state/change/${commercialInvoiceId}/`;

export const commercialInvoiceStatesListURL = () => `finance/payments/supplier/commercial_invoice/state/list/`;

export const saveCommercialInvoiceDetailsURL = (CommercialInvoiceId: any) => `finance/payments/supplier/commercial_invoice/update/${CommercialInvoiceId}/`;

export const recalculateCommercialInvoiceValuesURL = (CommercialInvoiceId: any) => `finance/payments/supplier/commercial_invoice/value_recalculate/${CommercialInvoiceId}/`;
export const supplierCommercialInvoiceListUrl = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `finance/payments/supplier/commercial_invoice/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const pclMatchingInvoiceListURL = (page: any, pageSize: any, searchedText: any) => `finance/payments/pcl/mactching/list/?page=${page}&page_size=${pageSize}&search_text=${searchedText}`;

export const pclMatchingPOClubListURL = () => `finance/payments/pcl/matching/po_club/list/`;

export const pclMatchingDataURL = () => `finance/payments/pcl/macthing_data/`;

export const pclBankInformationListURL = (page: any, pageSize: any, searchText: string) => `finance/payments/pcl_bank_information/list/?page=${page}&page_size=${pageSize}&search_text=${searchText}`;

export const pclListToDropdownURL = (searchText: string) => `finance/payments/pcl_bank_information/list/?search_text=${searchText}`;

export const pclSettlementListURL = (customer: any, supplier: any, startData: any, endDate: any, page: any, pageSize: any) => `finance/payments/due_payment/list/?customer=${customer}&supplier=${supplier}&start_date=${startData}&end_date=${endDate}&page=${page}&page_size=${pageSize}`;

export const pclDueSettlementListURL = (page: any, pageSize: any, searchText: any) => `finance/payments/due_payment/all_list/?page=${page}&page_size=${pageSize}&search_text=${searchText}`;

export const pclPaymentSettlementSaveURL = () => `finance/payments/pcl/settle/`;

export const pclDuePaymentsCalenderDetailsURL= (startDate: any, endDate: any) => `finance/payments/due_payment/calander/?start_date=${startDate}&end_date=${endDate}`;

export const pendingPCLPOClubListURL= (searchText: any, page: any, pageSize: any, clubId: any) => `finance/payments/pcl_bank_information/pending/po_club/list/?base_po_club_id=${clubId}&page=${page}&page_size=${pageSize}&search_text=${searchText}`;

export const pclPOClubAutoMappingURL= () => `finance/payments/pcl/po_club/automap/`;

export const pclPOClubAutoMappingSaveURL= () => `finance/payments/pcl/clubbing/`;

export const pclPOClubBOMSummaryURL= (pclDetailId: any) => `finance/payments/pcl_bank_information/detail/${pclDetailId}/`;

export const pclStatesURL= () => `finance/payments/pcl_bank_information/state/list/`;

export const pclMergedPoClubsList= (pclId: any) => `finance/payments/pcl_bank_information/merged_po_club/list/${pclId}/`;

export const createdPCLDetailUpdateURL= (pclId: any) => `finance/payments/pcl_bank_information/merged_po_club/edit/${pclId}/`;

export const pclStateChangeURL= (pclId: any) => `finance/payments/pcl_bank_information/state/change/${pclId}/`;

export const pclOrderProfitabilityDetails = (pclId: any) => `finance/payments/pcl_bank_information/order_profitability/detail/${pclId}/`;

export const pclPOClubOrderProfitabilityDetails = (poClubId: any) => `finance/payments/po_club/order_profitability/detail/${poClubId}/`;

export const pclPOOrderProfitabilityDetails = (poId: any) => `finance/payments/purchase_order/order_profitability/detail/${poId}/`;

export const pclPOClubRecalculateValuesURL = (clubId: any) => `marketing/po_club/pcl/recalculate_values/${clubId}/`;

export const pclBankInformationBasicDetailsURL = (pclId: any) => `finance/payments/pcl_bank_information/basic_detail/${pclId}/`;

export const dueSupplierPOListURL = (searchText: string) => `finance/payments/due_payment/supplier_po/list/?search_text=${searchText}`;

export const dueCommercialInvoiceListURL = (searchText: string) => `finance/payments/due_payment/commercial_invoice/list/?search_text=${searchText}`;

export const reCalculateInterestCharge = (outgoingPaymentId: any) => `finance/payments/pcl_bank_information/outgoing_payment_interest/re_calculate/${outgoingPaymentId}/`;

export const supplierPODeliveryInvoiceDeleteURL = (id: any) => `finance/payments/pcl_bank_information/supplier_po_delivery_invoice_pcl/delete/${id}/`;

export const outgoingPaymentStateListURL = () => `finance/payments/outgoing_payment/state/list/`;

export const dueAdvancePaymentsListInDateURL = (date: any, page: any, pageSize: any, searchText: any) => `finance/payments/due_payment/calander/advance_payment/list/1/?date=${date}&page=${page}&page_size=${pageSize}&search_text=${searchText}`;

export const dueInvoicePaymentListInDateURL = (date: any, page: any, pageSize: any, searchText: any) => `finance/payments/due_payment/calander/invoice_payment/list/1/?date=${date}&page=${page}&page_size=${pageSize}&search_text=${searchText}`;

export const dueAllPaymentsListInDateURL = (date: any, page: any, pageSize: any, searchText: any) => `finance/payments/due_payment/calander/all_payment/list/1/?date=${date}&page=${page}&page_size=${pageSize}&search_text=${searchText}`;

export const pclFacilityListURL = (supplierId: any, globalFilter: any) => `finance/payments/pcl_bank_information/dashbaord/${supplierId}/?global_filter=${globalFilter}`;

export const paymentModesListURL = () => `shared/pay_mode/list/`;

export const pclSummaryDetailsForScrollUrl = (customerId: any, clubId: any) => `finance/payments/summary_by_customer/list/?last_customer_id=${customerId}&club_id=${clubId}`; //temp Add this URL