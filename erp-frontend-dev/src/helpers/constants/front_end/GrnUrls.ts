export const createdGrnDetailsPageURL = (Id: number) => `/goods_received_note/${[Id]}`

export const createNewGrnPageURL = (supplier_po: number) => supplier_po > 0 ? `/goods_received_note/create_new_grn?supplier_po=${supplier_po}` : `/goods_received_note/create_new_grn`

export const grnSummaryReportURL = (spoId: number, reportId: number, reportType:any, selecteId: any, isPoClub: any) => `/goods_received_note/reports/${[spoId]}/${reportId}/${[reportType]}?id=${selecteId}&is_po_club=${isPoClub}`

export const cISummaryReportURL = (spoId: any, invoiceId:any, selecteId: any, isPoClub: any) => `/goods_received_note/commercial_invoice/${spoId}/${[invoiceId]}?id=${selecteId}&is_po_club=${isPoClub}`

export const createdGrnInspectionDetailsPageURL = (Id: number) => `/goods_received_note/${[Id]}?tab=6`