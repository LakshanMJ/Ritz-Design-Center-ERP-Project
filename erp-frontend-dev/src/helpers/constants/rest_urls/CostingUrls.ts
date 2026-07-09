

// Pack, Pack Item edit related urls
export const packItemPlacements = (
        versionId: any, packItemPlacementId: any
    ) =>  `marketing/pack_item_placements/${versionId}/${packItemPlacementId}/`;

export const packPlacements = (
        versionId: any, packItemPlacementId: any
    ) =>  `marketing/pack_placements/${versionId}/${packItemPlacementId}/`;


// Pack, Pack Item assign material
export const savePackItemPlacementMaterialURL = (versionId: number) => `marketing/pack_item/${versionId}/assign_materials`;

export const savePackPlacementMaterialURL = (versionId: number) => `marketing/pack/${versionId}/assign_materials`;


// Create placement URLs
export const createPlacementURL = (
    orderId:number,versionId:number,itemId:number
) => `marketing/orderpackitemplacement/other/${orderId}/${versionId}/${itemId}/`;
export const updateDetailPlacementURL = (
    otherplacementID: number,versionID:number,itemId:number
) => `marketing/orderpackitemotherplacement/detail/${otherplacementID}/${versionID}/${itemId}/`;

export const uniqueOrderItemPlacementsURL = (
    orderId: number,type:any,materialType:any,itemId:number,versionId:number
) => `marketing/placements/other/${orderId}/${versionId}/?item_id=${itemId}&type=${type}&material_type=${materialType}`;

export const getUpdatePackagingOtherPlacementURL = (
    OtherPlacementID: number, versionId:number
) => `marketing/orderpackplacement/other/detail/${OtherPlacementID}/${versionId}/`;

export const uniqueOrderPackagingPlacementsURL = (
    orderId: number,type:any, materialType:any, versionId:number
) => `marketing/placements/other/${orderId}/${versionId}/?type=${type}&material_type=${materialType}`;

// Pack summary page urls
export const packMaterialSummaryURL = (
        orderId: any, versionId: any, orderCountryId: any, orderCwId: any, orderSizeGroupId: any
    ) => `marketing/orderpack_items_materials/${orderId}/${versionId}/${orderCwId}/${orderCountryId}/${orderSizeGroupId}/`;

export const colorwaySupplierMaterialURL = (
    orderId: any, versionId: any, colorwayId: any
) => `marketing/colorway_material/supplier_inquiry/${orderId}/${versionId}/${colorwayId}/`;


export const performColorwayCountrySizeGroupCostingURL = (
    versionId: any, countryId: any, colorwayId: any, sizeGroupId: any
) => `marketing/perform_grouped_costing/${versionId}/${countryId}/${colorwayId}/${sizeGroupId}/`;

export const getSummaryPackDetailsURL = (
    orderId: any, versionId: any, orderCountryId:any, orderColorwayId:any, sizeGroupId: any
) => `marketing/order/sizegroup/item/pack/details/${orderId}/${versionId}/${orderCountryId}/${orderColorwayId}/${sizeGroupId}/`;

export const deletePackItemGroupOtherPlacement = (
    versionId: number, colorwayId:number, countryId:number, sizeGroupId:number, orderItemId:number, otherPlacementId:number
    ) => `marketing/delete_group_pack_item_placement/${versionId}/${colorwayId}/${countryId}/${sizeGroupId}/${orderItemId}/${otherPlacementId}/`;

export const deletePackGroupOtherPlacement = (
    versionId: number, colorwayId:number, countryId:number, sizeGroupId:number, otherPlacementId:number
    ) => `marketing/delete_group_pack_placement/${versionId}/${colorwayId}/${countryId}/${sizeGroupId}/${otherPlacementId}/`;

export const orderSizeGroupReviewedStatus = (
    versionId: number, orderColorwayId: number, orderCountryId: number, orderSizeGroupId: number
        ) => `marketing/orderpack_items_materials/review/${versionId}/${orderColorwayId}/${orderCountryId}/${orderSizeGroupId}/`;


// Print Service Urls
export const packItemPrintCreateUpdateURL = (
    orderId: any, versionId: any, packItemId: any) => `marketing/pack_item_print_create_update/${orderId}/${versionId}/${packItemId}/`;

export const packItemPrintListURL = (
    packItemId: any) => `marketing/pack_item_print_list/${packItemId}/`;

export const packItemPrintDetailDeleteURL = (
    versionId: any, printServiceId: any) => `marketing/pack_item_print/${versionId}/${printServiceId}/`;


// EMB Service Urls
// export const packItemEMBCreateUpdateURL = (
//     orderId: any, versionId: any, packItemId: any) => `marketing/pack_item_emb_create_update/${orderId}/${versionId}/${packItemId}/`;

export const packItemEMBCreateUpdateURL = (
    orderId: any, versionId: any,) => `marketing/embellishment_service_type/create/${orderId}/${versionId}/`;

export const packItemEMBListURL = (
    packItemId: any) => `marketing/pack_item_emb_list/${packItemId}/`;

export const packItemEMBDetailDeleteURL = (
     packItemEMBId: any) => `marketing/pack_item_embellishment_service/delete/${packItemEMBId}/`;

export const packItemEMBDetailURL = (
    packItemEMBId: any) => `marketing/embellishment_service_type/detail/${packItemEMBId}/`;

export const packItemEmbellishmentServiceList = (
    packItemId: any) =>`marketing/embellishment_service_list/${packItemId}/`;


// Wash Service Urls
export const packItemWashCreateUpdateURL = (
    orderId: any, versionId: any, packItemId: any) => `marketing/pack_item_wash_create_update/${orderId}/${versionId}/${packItemId}/`;

export const packItemWashListURL = (
    packItemId: any) => `marketing/pack_item_wash_list/${packItemId}/`;

export const packItemWashDetailDeleteURL = (
    versionId: any, packItemWashId: any) => `marketing/pack_item_wash/${versionId}/${packItemWashId}/`;

// EMB Admin Pages
//embellishment admin 
export const createEmbellishmentTypeURL =  () =>`materials/embellishment_type/create/`;
export const updateEmbellishmentTypeURL = (embellishmentTypeId: number) => `materials/embellishment_type/update/${embellishmentTypeId}`;
export const getDetailEmbellishmentTypeURL = (embellishmentTypeId: number) => `materials/embellishment_type/update/${embellishmentTypeId}`;
export const getDetailEmbellishmentSubTypeURL = (embellishmentSubTypeId: number) => `materials/embellishment_sub_type/update/${embellishmentSubTypeId}`;
export const getEmbellishmentDetailsURL = (orderId: number, versionId:number, typeId:number, subTypeId:number) => `marketing/embellishment_service_type/detail/${orderId}/${versionId}/${typeId}/${subTypeId}/`;
export const getEmbellishmentSizesDetailsURL = (orderId:number, versionId:number, itemId:number, countryId:number, colorwayId:number) => `marketing/embellishment_service_type/meta_data/${orderId}/${versionId}/${itemId}/${countryId}/${colorwayId}/`;

//otherCostTypes admin
export const otherCostTypesURL =  () =>`shared/other_cost/`;
export const getDetailOtherCostTypeURL = (otherCostId: number) => `shared/other_cost/${otherCostId}/`;

export const createEmbellishmentSubTypeURL =  () =>`materials/embellishment_sub_type/create/`;
export const updateEmbellishmentSubTypeURL =  (embellishmentSubTypeId: number) =>`materials/embellishment_sub_type/update/${embellishmentSubTypeId}`;

//consolidate supplier inqury
export const consolidateSupplierInquiryMaterialListURL = ( pageNumber: number, pageSize: number, optionalParams?: string ) => {
    let url = `marketing/consolidate/supplier_inquiry/material/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const consolidateSupplierInquiryMaterialCostingList = ( pageNumber: number, pageSize: number, optionalParams?: string ) => {
    let url = `marketing/consolidate/supplier_inquiry/material/costing/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const consolidateMaterialInquirySaveURL =  () =>`marketing/consolidate/supplier_inquiry/material/save/`;
export const sendConsolidateSupplierInquiryListURL = (pageNumber: number, pageSize: number, status: any,  optionalParams?: string) => {
    let url = `marketing/consolidate/supplier_inquiry/send/list/?page=${pageNumber}&page_size=${pageSize}&status=${status}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const consolidateSupplierInquiryCostDetailsURL =  (inquryId: any) =>`marketing/consolidate/supplier_inquiry/send/detail/${inquryId}/`;

export const consolidateSupplierInquiryCostsSaveURL =  (inquryId: any) =>`marketing/consolidate/supplier_inquiry/send/update/${inquryId}/`;

export const consolidateSupplierInquiryDeleteURL =  (inquryId: any) =>`marketing/consolidate/supplier_inquiry/send/delete/${inquryId}/`;

export const consolidateSupplierInquiryDetailDeleteURL =  (inquryDetailId: any) =>`marketing/consolidate/supplier_inquiry_detail/send/delete/${inquryDetailId}/`;

export const consolidateSupplierInquiryCreateURL =  () =>`marketing/consolidate/supplier_inquiry/send/create/`;

//export const prevoiusCreatedSupplierInquiryListURL =  (customerBrandMaterialId: any) =>`marketing/prevoius/supplier_inquiry/list/${customerBrandMaterialId}/`;
export const prevoiusCreatedSupplierInquiryListURL = (customerBrandMaterialId: any, isCostingInquiryValue: any, pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `marketing/prevoius/supplier_inquiry/list/${customerBrandMaterialId}/?costing_inquiry=${isCostingInquiryValue}&page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const supplierInquiryDefaultsValuesURL =  (customerBrandMaterialId: any, supplierId: any) =>`shared/supplier_inuiry/default_value/list/${customerBrandMaterialId}/?supplier_id=${supplierId}`;

export const supplierInquryCopyURL =  (versionId: any, materialId: any) =>`marketing/supplier_inquiry/copy/${versionId}/${materialId}/`;

export const supplierInquiryRelatedMaterialListURL =  (customerBrandMaterialId: any, searchText: any) =>`marketing/supplier_inquiry/related_material/list/${customerBrandMaterialId}/?search_text=${searchText}`;

export const costingSpeedConsumptionDetailsURL =  (versionId: any) =>`marketing/order/speed_consumption/detail/${versionId}/`;

export const costingSpeedConsumptionSaveURL =  () =>`marketing/order/speed_consumption/save/`;

export const prevoiusSpeedConsumptionListURL =  (orderItemId: any, versionId: any) =>`marketing/order/speed_consumption/list/${orderItemId}/${versionId}/`;

export const speedConsumptionsSendToCadTeamURL =  (versionId: any) =>`marketing/order/speed_consumption/send_to_cad_team/${versionId}/`;

export const pendingSpeedConsumptionListURL =  () =>`marketing/order/speed_consumption/send_to_cad_team/list/`;

export const pendingSpeedConsumptionDetailURL =  (costingId: any) =>`marketing/order/speed_consumption/send_to_cad_team/detail/${costingId}/`;

export const speedConsumptionMaterialListURL =  (costingId: any) =>`marketing/order/speed_consumption/material_list/${costingId}/`;

export const speedConsumptionsSaveURL =  () =>`marketing/order/speed_consumption/cad/save/`;

export const speedConsumptionsCompleteURL =  (costingId: any) =>`marketing/order/speed_consumption/cad/task_complete/${costingId}/`;

export const costingOrderItemImageUploadURL =  (orderItemId: any) =>`marketing/order_item/file/update/${orderItemId}/`;

export const costingOrderColorwayItemTypeImageUploadURL =  (colorwayItemTypeId: any) =>`marketing/colorway_item_type/file/update/${colorwayItemTypeId}/`;

export const costingValuesRecalculateURL =  (versionId: any) =>`marketing/recalculate_costing/${versionId}/`;

export const consolidateSupplierInquiryCostingListURL =  (inquryId: any) =>`marketing/consolidate/supplier_inquiry/costing/list/${inquryId}/`;

export const supplierClaimListURL = (customer: any) => `supplier_po/commercial_invoice/in_complete/list/?customer=${customer}`;