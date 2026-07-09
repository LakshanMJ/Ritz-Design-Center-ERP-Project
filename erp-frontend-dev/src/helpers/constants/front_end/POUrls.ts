

export const poColorwayCountryItemMaterialUrl = (purchaseOrderId: number, poCWId: number, poCountryId: number, poItemId: number) => `/purchase_order/${purchaseOrderId}/colorway_country/${poCWId}/${poCountryId}/${poItemId}/item_materials`;

export const poColorwayCountryPackagingMaterialUrl = (purchaseOrderId: number, poCWId: number, poCountryId: number) => `/purchase_order/${purchaseOrderId}/colorway_country/${poCWId}/${poCountryId}/item_materials`;

export const purchaseOrderInquiryPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}/edit_purchase_order_costing`;

export const purchaseOrderUploadDetailPageURL = (purchase_order_upload_id: number) => `/purchase_order/po_upload/${[purchase_order_upload_id]}?&tab=1`

export const purchaseOrderClubDetailsPageURL = (purchase_order_club_id: number) => `/purchase_order/purchase_order_club/${[purchase_order_club_id]}?&tab=1`

export const purchaseOrderDetailsPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}?&tab=1`

export const generalPurchaseOrderDetailsPageURL = (generalPurchaseOrderId: number) =>`/general_purchase_order/${generalPurchaseOrderId}?&tab=1`;