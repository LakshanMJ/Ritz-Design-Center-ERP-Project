
// This file contains all urls in the UI
export const orderColorwayMatrixURL = (orderId: number) => `/costing/add/${orderId}/colorway_matrix`;

export const orderItemVariationMatrixURL = (orderId: number) => `/costing/add/${orderId}/item_variation_matrix`;

export const orderColorwayCategoriesURL = (orderID: number) => `/costing/add/${orderID}/colorway_categories`;

export const orderColorwaysURL = (orderID: number) => `/costing/add/${orderID}/colorways`;

export const orderCountryColorwaySizeQuantityURL = (orderID: number) => `/costing/add/${orderID}/quantities`;


export const CADNavigationAssignURL = (orderID: number) => `/costing/add/${orderID}/cad/cad_info`;

export const cadOrderVersionDetailURL = (orderId: number, versionId: number) => `/costing/cad/${orderId}/version/${versionId}/cad_navigation_view`

export const orderMaterialAssignURL = (orderId: number, orderItemPackId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/${orderItemPackId}/materials`;
export const orderMaterialPackagingAssignURL = (orderId: number, orderPackId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/${orderPackId}/packaging`;

export const orderMaterialSupplierSelectURL = (orderId: number, orderItemPackId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/${orderItemPackId}/select_suppliers`;

export const orderPackagingSuppliersSelectURL = (orderId: number, orderPackId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/${orderPackId}/select_packaging_suppliers`;

export const orderSummaryURL = (orderId: number) => `/costing/add/${orderId}/summary`;

export const orderSummaryVersionURL = (orderId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}`;

export const orderQuantitiesURL = (orderId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/quantities`

export const supplierInquiriesURL = (orderId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/supplier_inquiries`;

export const orderPackListURL = (orderID: number) => `/costing/add/${orderID}/orderpacks`

export const orderCountriesAddURL = (orderID: number) => `/costing/add/${orderID}/countries`;

export const costingOrderCountriesURL = (orderID: number) => `/costing/add/${orderID}/countries`;

export const costingOrderItemsURL = (orderID: number) => `/costing/add/${orderID}/items`;

export const costingOrderColorwayCategoryURL = (orderID: number) => `/costing/add/${orderID}/colorway_categories`;

export const costingOrderSizesURL = (orderID: number) => `/costing/add/${orderID}/sizes`;

export const costingOrderEditURL = (orderID: number) => `/costing/add/${orderID}`;

export const costingOrderColorwaysURL = (orderID: number) => `/costing/add/${orderID}/colorways`;

export const editMaterialDetailURL = (materialID: number, attribute_id: any) => `/admin/material_types/materials/${materialID}/${attribute_id}/edit_attribute_detail`;

export const editMaterialDetailOptionsURL = (materialID: number, attribute_id: any) => `/admin/material_types/material_options/${materialID}/${attribute_id}/edit_attribute_detail`;

export const cadNavigationDetailURL = (versionId: number, orderId: number, countryId: number, colorwayId: number, itemId: number, sizeGroupId: number) => `/costing/cad/${orderId}/version/${versionId}/${countryId}/${colorwayId}/${sizeGroupId}/${itemId}/consumption_ratios`

export const costingGeneralIfoURL = () => `/costing/add/`;

export const costingOrderTypeURL = () => `/costing/program/add`;

// export const cadNavigationMaterialDataURL = (versionId: number, orderId: number, countryId: number, colorwayId: number, sizeGroupId: number) => `/costing/cad/${orderId}/version/${versionId}/${countryId}/${colorwayId}/${sizeGroupId}/consumption_data`
export const itemPlacementURL = (itemID: number) => `/admin/item/${itemID}`;

export const cadNavigationPackItemURL = (order_id: number, version_id: number, order_item_id: number, colorway_id: number, order_country_id: number, order_group_id: number ) => `/costing/cad/${order_id}/version/${version_id}/${order_country_id}/${colorway_id}/${order_group_id}/${order_item_id}/consumption_ratios`;

export const cadNavigationPackingURL = (order_id: number, version_id: number, order_country_id: number, colorway_id: number, order_group_id: number ) => `/costing/cad/${order_id}/version/${version_id}/${order_country_id}/${colorway_id}/${order_group_id}/consumption_data`;

// emellishment admin data
export const embellishmentDetailURL = (embellishmentId: number) => `/admin/embellishment/${embellishmentId}`;

//for user pages
export const userGroupViewURL = (user_groupID: number) => `/admin/user_group/${user_groupID}`;

export const userRoleViewURL = (user_roleID: number) => `/admin/user_role/${user_roleID}`;

export const userProfileURL = (userID: number) => `/admin/user/${userID}`;

export const cadNavigationMaterialDataURL = (versionId: number, orderId: number, countryId: number, colorwayId: number, sizeGroupId: number) => `/costing/cad/${orderId}/version/${versionId}/${countryId}/${colorwayId}/${sizeGroupId}/consumption_data`

//for purchase order
export const purchaseOrderExcelFileUploadCreatePageURL = () => `/purchase_order/upload_purchase_order` 

export const purchaseOrderInquiriesMatchPageURL =  (customer: number, file_id: number) => `/purchase_order/purchase_order_costing?customer=${customer}&file_id=${file_id}`

export const purchaseOrderInquiriesPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}/purchase_order_costing`

export const purchaseOrderInquiryPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}/edit_purchase_order_costing`;

export const purchaseOrderClubingPageURL = (purchase_order_id: number, uploadedPoId: number) => `/purchase_order/${[purchase_order_id]}/${[uploadedPoId]}/purchase_order_clubing`

export const purchaseOrderColorwaySizeCountryMappingPageURL = (purchaseOrderId: number, uploadedPoId: number) => `/purchase_order/${[purchaseOrderId]}/${[uploadedPoId]}/purchase_order_club_mapping`;

// export const purchaseOrderInquiryPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}/edit_purchase_order_costing`

export const purchaseOrderDetailPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}?&tab=1`

export const purchaseOrderPackagingInstructionPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}?&tab=3`

export const purchaseOrderExcelFileUploadPageURL = (purchase_order_id: number) => `/purchase_order/${[purchase_order_id]}/upload_purchase_order` 

export const purchaseOrderSizeToOrderSizeMatchingURL = (purchase_order_id: number) => `/purchase_order/${purchase_order_id}/purchase_order_sizes`;

export const purchaseOrderCountryToOrderCountryMatchingURL = (purchase_order_id: number) => `/purchase_order/${purchase_order_id}/purchase_order_countries`;

export const purchaseOrderColorwayToOrderColorwayMatchingURL = (purchase_order_id: number) => `/purchase_order/${purchase_order_id}/purchase_order_colorways`;

export const purchaseOrderColorwayColorMatchingURL = (purchase_order_id: number) => `/purchase_order/${purchase_order_id}/purchase_order_colorway_mappings`;

export const purchaseOrderQuantityToOrderQuantityMatchingURL = (purchase_order_id: number) => `/purchase_order/${purchase_order_id}/purchase_order_quantities`;

export const purchaseOrderMaterialPackItemURL =(purchaseOrderId:number, packItemId:number) => `/purchase_order/${[purchaseOrderId]}/materials/${[packItemId]}/pack_item`;

export const purchaseOrderMaterialPackURL = (purchaseOrderId: number, packId: number) => `/purchase_order/${[purchaseOrderId]}/materials/${[packId]}/packaging`;

export const supplierDetailsURL = (supplierID: number) => `/admin/supplier/${supplierID}`;

export const FreightForwarderDetailsURL = (supplierID: number) => `/transport/freight_forwarder/${supplierID}`;

export const orderSummaryPageURL = (orderId: number, versionId: number) => `/costing/add/${orderId}/version/${versionId}/`;

export const virtualWarehouseViewURL = (inhouse_material_id:any) => `/virtual_warehouse/${inhouse_material_id}/`;

export const myApprovalDetailPageURL = (id: number) => `/tasks/my_approvals/${id}/`

export const allApprovalDetailPageURL = (id: number) => `/tasks/all_approvals/${id}/`

export const myTaskDetailPageURL = (id: number) => `/tasks/my_tasks/${id}/`

export const allTaskDetailPageURL = (id: number) => `/tasks/all_tasks/${id}/`

export const transportDeliveryDateTracingDetailsPageUrl = (transport_tracking_id: number) => `/transport/transport_real_time/${transport_tracking_id}`;

export const warehouseDetailURL = (warehouseID: number) => `/admin/warehouse/${warehouseID}`;

export const warehouseManagersURL = () => `shared/users/?role=stores_admin`;

export const importDeliveryTrack = (transport_tracking_id:number) => `/transport/import_delivery_track/${transport_tracking_id}`;

export const supplierPODetailsPageURL = (supplier_po_id:number) => `/purchase_order/supplier_po_list/${supplier_po_id}`;

export const servicePoDetailsPageURL = (service_po_id:number) => `/purchase_order/service_po_list/${service_po_id}`;