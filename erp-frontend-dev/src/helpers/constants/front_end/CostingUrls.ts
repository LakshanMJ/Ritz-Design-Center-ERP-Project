


export const packMaterialSummaryUrl = (
        orderId: any, versionId: any, orderCountryId: any, orderCwId: any, orderSizeGroupId: any
    ) => `/costing/add/${orderId}/version/${versionId}/pack_summary/${orderCountryId}/${orderCwId}/${orderSizeGroupId}`;

export const programedOrderInquiriesSummaryUrl = (program_id: number) => `/costing/${program_id}`

export const editOrderProgramUrl = (program_id: number) => `/costing/program/add/${program_id}`

export const materialTransferDetailsPageURL = (transferId: number) => `/purchase_order/material_transfer/${transferId}`

export const materialTransferDetailsFromListPageURL = (transferId: number) => `/purchase_order/material_transfer_list/${transferId}`

export const ViewPOWiseURL = (customer: any, costing: any) => `/finance_warehouse/po_wise_material_summary?customer=${customer}&costingId=${costing}`
