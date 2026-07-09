export const incomingPaymentDetailPageURL = (incomingPaymentId: number) => `/pcl/finance/incoming_payments/${incomingPaymentId}`

export const outgoingPaymentDetailPageURL = (outgoingPaymentId: number) => `/pcl/finance/outgoing_payments/${outgoingPaymentId}`

export const outgoingCommercialInvoiceDetailPageURL = (outgoingCommercialInvoiceId: number) => `/pcl/finance/outgoing_commercial_invoices/${outgoingCommercialInvoiceId}`

export const commercialInvoiceSummaryPageURL = (commercialInvoiceId: number) => `/pcl/finance/commercial_invoice/${commercialInvoiceId}`

export const pclSummaryDetailsPageURL = (pclDetailId: number) => `/pcl/finance/pcl_list/${pclDetailId}` //todo-remove this

export const pclFacilityDetailsPageURL = (pclFacilityId: number) => `/pcl/finance/pcl_facility/${pclFacilityId}`