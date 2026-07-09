export const createdMaterialDetailsListURL = (material_id: number, page_number: number) => `/admin/material_types/created_materials/${material_id}`;

export const createdMaterialVariationDetailsListURL = (material_type: number, variation_id: number) => `/admin/material_types/created_materials/${material_type}/${variation_id}?&tab=1`;

export const materialDetailURL = (materialID: number) => `/admin/material_types/materials/${materialID}`;

export const editMaterialDetailURL = (materialID: number, attribute_id: any) => `/admin/material_types/materials/${materialID}/${attribute_id}/edit_attribute_detail`;

export const cadNavigationDetailURL = (versionId: number, orderId: number, countryId: number, colorwayId: number, itemId: number, sizeGroupId: number) => `/costing/cad/${orderId}/version/${versionId}/${countryId}/${colorwayId}/${sizeGroupId}/${itemId}/consumption_ratios`

export const editMaterialDetailOptionsURL = (materialID: number, attribute_id: any) => `/admin/material_types/material_options/${materialID}/${attribute_id}/edit_attribute_detail`;

export const tastRelatedDetailsPageURL = (url: any) => `/${url}`;