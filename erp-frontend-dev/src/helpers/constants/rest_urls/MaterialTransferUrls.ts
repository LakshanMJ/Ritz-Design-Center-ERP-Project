export const inhouseMaterialListURL = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `materials/inhouse_material/po_club/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};
export const partialTransferMaterialListURL = (clubId: any) => `materials/transfer/po_club/pack_details/${clubId}/`;

export const materialTransferSaveURL = (clubId: any) => `materials/transfer/po_club/save/${clubId}/`;

export const materialTransferDetailsURL = (transferId: any) => `materials/transfer/detail/${transferId}/`;

export const leftOverVerificationTransferURL = (transferId: any) => `materials/transfer/leftover_verification/${transferId}/`;

export const materialTransferList = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `materials/transfer/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const materialTransferEditDetailsURL = (transferId: any) => `materials/transfer/force_edit/detail/${transferId}/`;

export const materialTransferForceEditMaterialListURL = (clubId: any, transferId: any, materialCategory: any) => `materials/transfer/force_edit/material_list/${clubId}/${transferId}/?material_category=${materialCategory}`;

export const materialTransferForceEditMaterialItemListURL = (clubId: any, transferId: any, customerBrandMaterialId: any) => `materials/transfer/force_edit/material_detail_list/${clubId}/${transferId}/${customerBrandMaterialId}/`;

export const materialTransferForceMaterialSaveURL = (clubId: any, transferId: any) => `materials/transfer/force_edit/save/${clubId}/${transferId}/`;

export const materialTransferForceMaterialItemSaveURL = (transferId: any) => `materials/transfer/force_edit/update/${transferId}/`;

export const materialTransferItemSaveURL = (transferId: any, materialItemId: any) => `materials/transfer/force_edit/transfer_detail/in_line/update/${transferId}/${materialItemId}/`;

export const materialTransferForceMaterialDeleteURL = (clubId: any, transferId: any, customerBrandMaterialId: any) => `materials/transfer/force_edit/material/delete/${clubId}/${transferId}/${customerBrandMaterialId}/`;

export const materialTransferForceMaterialItemDeleteURL = (materialItemId: any) => `materials/transfer/force_edit/detail/delete/${materialItemId}/`;

export const materialTransferStateChangeURL = (transferId: any) => `materials/transfer/state_change/${transferId}/`;

export const materialTransferStateListURL = () => `materials/transfer/state/list/`;

export const poMaterialTransferListURL = (clubId: any) => `materials/transfer/material/list/${clubId}/`;

export const transferMaterialListURL = (searchText: any) => `materials/transfer/customer_brand_material/list/?search_text=${searchText}`;

export const transferMaterialRollDetailsURL = (customerBrandMaterialId: any) => `materials/transfer/customer_brand_material/inhouse_material/${customerBrandMaterialId}/`;

export const otherMaterialTranferSaveURL = () => `materials/transfer/customer_brand_material/inhouse_material/save/`;

export const transferPOListURL = (clubId: any) => `marketing/po_club/purchase_order/list/${clubId}/`;