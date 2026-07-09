export const getClubSupplierPODetailsURL = (sourceId:number, type:boolean) => `/supplier_po/spo/supplier_po_details/${sourceId}/?is_po_club=${type}`

export const saveSupplierPoAttachmentDetailsURL = (deliveryId:number) => `supplier_po/spo/delivery_data/save/${deliveryId}/`

export const getSupplierPoAttachmentDetailsURL = (deliveryId:number) => `supplier_po/spo/delivery/detail/${deliveryId}/`

export const supplierPOGRNInvoiceListURL = (spoId:number) => `supplier_po/spo/invoice/list_by_customer/${spoId}/`

export const grnSummaryBreakdownUsingSpoIdURL = (spoId:number) => `marketing/supplier_po/grn/summary/breakdown/purchase_order/${spoId}/`

export const grnSummaryBreakdownUsingDeliveryIdURL = (deliveryNote:number, spoId:number) => `marketing/supplier_po/grn/summary/breakdown/delivery_note/${deliveryNote}/${spoId}/`

export const grnSummaryBreakdownUsingPackListIdURL = (packListId:number, spoId:number) => `marketing/supplier_po/grn/summary/breakdown/pack_list/${packListId}/${spoId}/`

export const grnSummaryBreakdownUsingInvoiceIdURL = (invoiceId:number, spoId:number) => `marketing/supplier_po/grn/summary/breakdown/invoice/${invoiceId}/${spoId}/`

export const grnSummaryBreakdownUsingDeliveryDateIdURL = (deliveryDate:number, spoId:number) => `supplier_po/grn/summary/delivery_date/${deliveryDate}/${spoId}/`

export const grnSummaryBreakdownUsingPerfomaInvoiceIdURL = (performaId:number, spoId:number) => `marketing/supplier_po/grn/summary/breakdown/pi/${performaId}/${spoId}/`

export const grnSummaryBreakdownUsingActualDeliveryURL = (spoId:number) => `supplier_po/spo/actual_delivery/summary/${spoId}/`

export const supplierPOGRNShadeSummaryUsingSPOIdURL = (spoId:number) => `supplier_po/spo/shade_summary/list/${spoId}/`

export const supplierPOGRNShadeSummaryUsingDeliveryIdURL = (deliveryId:any) => `supplier_po/spo/supplier_delivery_date/shade_summary/list/${deliveryId}/`

export const supplierPOGRNShadeSummaryUsingPackListIdURL = (packListId:any) => `supplier_po/spo/supplier_pack_list/shade_summary/list/${packListId}/`

export const supplierPOGRNShadeSummaryUsingInvoiceIdURL = (invoiceId:any) => `supplier_po/spo/supplier_invoice/shade_summary/list/${invoiceId}/`

export const supplierPOGRNShadeSummaryUsingDeliveryNoteURL = (deliveryNoteId:any) => `supplier_po/spo/supplier_delivery_note/shade_summary/list/${deliveryNoteId}/`

export const supplierPOGRNInvoiceDetailsURL = (invoiceId:number, spoId: any) => `marketing/supplier_po/grn/invoice/detail/${spoId}/${invoiceId}/`

export const inspectionSummaryUsingSPOIdUrl = (spoId: number) => `supplier_po/spo/inspection/summary/${spoId}/`;

export const inspectionSummaryUsingDeliveryNoteIdUrl = (deliveryNoteId: number) => `supplier_po/spo/supplier_delivery_note/inspection/summary/${deliveryNoteId}/`;

export const inspectionSummaryUsingPackListIdUrl = (packListId: number) => `supplier_po/spo/supplier_pack_list/inspection/summary/${packListId}/`;

export const inspectionSummaryUsingInvoiceIdUrl = (invoiceId: number) => `supplier_po/spo/supplier_invoice/inspection/summary/${invoiceId}/`;

export const inspectionSummaryUsingDeliveryDateUrl = (deliveryId: number) => `supplier_po/spo/supplier_delivery_date/inspection/summary/${deliveryId}/`;

export const supplierPOprofomaInvoiceDetailsURL = (spoId: number) => `marketing/supplier_po/grn/performa_invoice/detail/${spoId}/`;

export const saveSupplierPOprofomaInvoiceURL = (spoId: number) => `marketing/supplier_po/grn/performa_invoice/save/${spoId}/`;

export const supplierPOdeliveryDatesDetails = (spoId: number) => `supplier_po/spo/delivery_date/materials/detail/${spoId}/`;

export const CISummaryDetailsURL = (spoId: any, invoiceId:number) => `supplier_po/commercial_invoice/delivery/summary/${spoId}/${invoiceId}/`

export const createDebitNoteURL = (deliveryId:number, invoiceId:number, materialId:number) => `supplier_po/commercial_invoice/debit_note/save/${deliveryId}/${invoiceId}/${materialId}/`

export const createdDebitNoteDetailsURL = (debitNote:number) => `supplier_po/commercial_invoice/debit_note/detail/${debitNote}/`

export const debitNoteStatesURL = () => `supplier_po/commercial_invoice/debit_note/meta_data/`

export const saveDebitNoteURL = (debitNoteId:any) => `supplier_po/commercial_invoice/debit_note/save/${debitNoteId}/`

export const colorToneCombineDetailsURL = (deliveryId: any, invoice: any, grnMaterialId: any) => `supplier_po/commercial_invoice/color_tone/debit_note_replacement/detail/${deliveryId}/${invoice}/${grnMaterialId}/`

export const defectedBatchesCombineDetailsURL = (deliveryId: any, invoice: any, grnMaterialId: any) => `supplier_po/commercial_invoice/batch_rejection/debit_note_replacement/detail/${deliveryId}/${invoice}/${grnMaterialId}/`

export const excessBatchesCombineDetailsURL = (deliveryId: any, invoice: any, grnMaterialId: any) => `supplier_po/commercial_invoice/excess/debit_note/detail/${deliveryId}/${invoice}/${grnMaterialId}/`

export const shortBatchesCombineDetailsURL = (deliveryId: any, invoice: any, grnMaterialId: any) => `supplier_po/commercial_invoice/shortage/debit_note_replacement/detail/${deliveryId}/${invoice}/${grnMaterialId}/`

export const mismatchCombineDetailsURL = (deliveryId: any, invoice: any, grnMaterialId: any) => `supplier_po/commercial_invoice/mismatch/debit_note/detail/${deliveryId}/${invoice}/${grnMaterialId}/`

export const widthCombineDetailsURL = (deliveryId: any, invoice: any, grnMaterialId: any) => `supplier_po/commercial_invoice/width/replacement/detail/${deliveryId}/${invoice}/${grnMaterialId}/`//todoooooo

export const colorToneCombineDetailsSaveURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/color_tone/debit_note_replacement/save/${invoiceId}/${grnMaterialId}/`

export const defectdBatchesCombineDetailsSaveURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/batch_rejection/debit_note_replacement/save/${invoiceId}/${grnMaterialId}/`

export const excessCombineDetailsSaveURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/excess/debit_note/save/${invoiceId}/${grnMaterialId}/`

export const shortCombineDetailsSaveURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/shortage/debit_note_replacement/save/${invoiceId}/${grnMaterialId}/`

export const mismatchCombineDetailsSaveURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/mismatch/debit_note/save/${invoiceId}/${grnMaterialId}/`

export const widthCombineDetailsSaveURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/width/replacement/save/${invoiceId}/${grnMaterialId}/` //todooo

export const futureDeliveryDatesURL = (invoiceId: any, grnMaterialId: any) => `supplier_po/commercial_invoice/replacement/future_delivery_dates/${invoiceId}/${grnMaterialId}/`

export const finacialSummaryDetailsURL = (spoId:number) => `supplier_po/commercial_invoice/finacial/debit_note_replacement/detail/${spoId}/`

export const deliveryNoteDeleteURL = (deliveryNoteId:number) => `supplier_po/spo/delivery_data/delivery_note/delete/${deliveryNoteId}/`

export const packListDeleteURL = (packListId:number) => `supplier_po/spo/delivery_data/pack_list/delete/${packListId}/`

export const spoLeftoverDetails = (sourceId:number, type:boolean) => `supplier_po/spo/supplier_po_details/leftover/${sourceId}/?is_po_club=${type}`

export const deliveryDateFOCDetails = (deliveryId: any) => `supplier_po/spo/supplier_po_details/foc/list/${deliveryId}/`





