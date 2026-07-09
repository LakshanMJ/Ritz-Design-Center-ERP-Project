/* API BASE URL */
// export const apiBaseURL = () => `${process.env.NEXT_PUBLIC_API_URL}/${process.env.NEXT_PUBLIC_API_MODULE}/`;

export const apiBaseURL = () =>
  "https://nexa-erp-project.onrender.com/api/shared/";



/* COSTING API URLS */
// export const orderInquiriesURL = () => `marketing/orderinquiry/list/`;
// export const filteredOrderInquiriesURL = (search_text: any) => `marketing/orderinquiry/list/?search_query=${search_text}`;
export const orderInquiriesURL = (pageNumber: number, pageSize: number, customer: any, optionalParams?: string) => {
    let url = `marketing/orderinquiry/list/?page=${pageNumber}&page_size=${pageSize}&customer_id=${customer}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};
export const orderSizeGroupsURL = (orderId: number) => `marketing/ordersizegroup/list/by_order/${orderId}`;
export const orderSizesURL = (sizeId: number) => `marketing/ordersize/list/${sizeId}/`;
export const createOrderSizeURL = () => `marketing/ordersize/create/`;
export const updateOrderSizeGroupsURL = (objectId: number) => `marketing/ordersizegroup/${objectId}`;
export const updateOrderSizes = (orderId: number) => `marketing/orderinquiry/sizes/${orderId}`;

export const getOrderColorwaysURL = (orderId: number) => `marketing/ordercolorway/list/${orderId}`;
export const orderColorwayDetailsURL = (orderId: number) => `marketing/ordercolorway/list_create/${orderId}`;
export const orderPackQuantitiesURL = (orderId: number, versionId: number) => `marketing/orderpack/list/update/${orderId}/${versionId}/`;
export const orderPackEstimatedQuantitiesURL = (versionId: number) => `marketing/order_version_colorway/list/${versionId}/`;
export const createOrUpdateOrderItemsURL = (orderId: number) => `marketing/orderinquiry/items/${orderId}`;

export const costingOrderItemVariationURL = (orderId: number) => `marketing/order_item_colorway_mapping/${orderId}/`;

export const getItemOperationsURL = (itemId:number) => `marketing/item/variation/detail/${itemId}`;

export const getOrderItemColorwayOperationsURL = (itemId:number,colorwayId:number,versionId:number) => `marketing/order_item_colorway_operation/list/${itemId}/${colorwayId}/${versionId}`;

export const getOrderPackItemColorwayOperationsURL = (
    itemId:number, colorwayId:number, packItemId: number, versionId:number
) => `marketing/order_pack_item_colorway_operation/list/${itemId}/${colorwayId}/${packItemId}/${versionId}`;

export const getConsolidatedOrderPackItemColorwayOperationsURL = (
    versionId:number, packItemId: number
) => `marketing/order_pack_item_consolidated_colorway_operations/${versionId}/${packItemId}/`;

export const getSizeGroupOrderPackItemColorwayOperationsURL = (
    countryId: number, colorwayId:number,  sizeGroupId: number, orderItemId: number, versionId:number
) => `marketing/order_size_group_pack_item_colorway_operation/list/${countryId}/${colorwayId}/${sizeGroupId}/${orderItemId}/${versionId}`;

export const getItemColorwayOperationDetailURL = (operationId: number) => `marketing/order_item_colorway_operation/detail/${operationId}`;
export const createItemColorwayOperationURL = (colorwayId:number,orderItemId:number,versionId:number) => `marketing/order_item_colorway_operation/create/${orderItemId}/${colorwayId}/${versionId}`;
export const orderItemColorwayOperationDisplayOrder = () => `marketing/order_item_colorway_operation/display_order/update/`;
export const updateOperationsMarkAsCompleteURL = (versionId:number) => `marketing/operations/order_costing/update/${versionId}`;
export const getPendingOperationInquiries = () => `marketing/operations/order_costing/list/?type=pending`;
export const getCompleteOperationInquiries = () => `marketing/operations/order_costing/list/?type=complete`;
export const getCopyItemVariationsURL = ( versionId: number, orderItemId: number, colorwayCategoryId: number, colorwayId:number ) => `marketing/item_variation_operation/item/detail/${versionId}/${orderItemId}/${colorwayCategoryId}/${colorwayId}/`;
export const createItemColorwayOperationCopyURL = ( versionId: number, orderItemId: number, colorwayCategoryId: number, colorwayId:number ) => `marketing/item_variation_operation/copy/${versionId}/${orderItemId}/${colorwayCategoryId}/${colorwayId}/`;

export const getPackagingCostTypeList = (versionId: any) => `marketing/order_pack_other_cost/types/list/${versionId}/`;
export const createOtherCostURL = (orderId: number, versionId:number) => `marketing/order_pack_other_cost/${orderId}/${versionId}/`;
export const getOtherCostListURL = (packId: number) => `marketing/order_pack_other_cost/detail/${packId}`;
export const getOtherCostTypeURL = (packId: number, costTypeId:number) => `marketing/order_pack_other_cost/pack/${packId}/${costTypeId}/`;
export const getSummaryOtherCostTypeURL = (countryId: number, colorwayId: number, orderSizeGroupId: number, costTypeId: number) => `marketing/order_pack_other_cost/group/${countryId}/${colorwayId}/${orderSizeGroupId}/${costTypeId}/`;
export const deleteOtherCostTypeURL = (otherCostId: number) => `marketing/order_pack_other_cost/delete/${otherCostId}`;
export const deleteSummaryOtherCostTypeURL = (otherCostId: number, countryId: number, colorwayId: number ) => `marketing/order_pack_other_cost/group/delete/${otherCostId}/${countryId}/${colorwayId}/`;

//for brands
export const brandsURL = () => `shared/brands/`;
export const createBrandURL = () => `shared/brands/`;
export const updateBrandURL = (brandId: number) => `shared/brand/${brandId}/`;
export const brandURL = (brandId: number) => `shared/brand/${brandId}/`;

//for seasons
export const seasonsURL = () => `shared/seasons/`;
export const createSeasonURL = () => `shared/seasons/`;
export const updateSeasonURL = (seasonId: number) => `shared/season/${seasonId}`;
export const seasonURL = (seasonId: number) => `shared/season/${seasonId}`;

//for departments
export const departmentListURL = () => `shared/customer_brand_department/list/`;
export const departmentDetailsURL = (departmentId: number) => `shared/customer_brand_department/detail/${departmentId}/`;
export const departmentCreateURL = () => `shared/customer_brand_department/create/`;
export const updateDepartmentURL = (departmentId: number) => `shared/customer_brand_department/update/${departmentId}/`;

//for customers
export const customersURL = () => `shared/customers/`;
export const createCustomerURL = () => `shared/customers/`;
export const updateCustomerURL = (customerId: number) => `shared/customer/${customerId}/`;
export const customerURL = (customerId: number) => `shared/customer/${customerId}/`;
export const customerBrandListURL = () => `shared/customer_brand/list/`

//for size category
export const sizeCategoriesURL = () => `shared/sizecategory/list/`;
export const createSizeCategoryURL = () => `shared/sizecategory/create/`;
export const updateSizeCategoryURL = (categoryId: number) => `shared/sizecategory/edit/${categoryId}`;
export const sizeCategoryURL = (categoryId: number) => `shared/sizecategory/edit/${categoryId}`;

//for size
export const sizesURL =  () =>`shared/size/list/`;
export const allSizesURL = () => `shared/size/flatlist/`;
export const createSizeURL = () => `shared/size/create/`;
export const updateSizeURL = (sizeId: number) => `shared/size/edit/${sizeId}`;
export const sizeURL = (sizeId: number) => `shared/size/edit/${sizeId}`;

//for country
export const countriesURL =  () => `shared/country/create/`;
export const createCountryURL =  () =>`shared/country/create/`;
export const updateCountryURL = (countryId: number) => `shared/country/${countryId}/`;
export const CountryURL = (countryId: number) => `shared/country/${countryId}/`;

//for item
export const itemsURL =  () =>`marketing/items/`;
export const itemsPaginationListURL =  (searchText:any) =>`marketing/item/paginate/list/?search_text=${searchText}`;
export const createItemURL =  () =>`marketing/items/`;
export const updateItemURL = (itemId: number) => `marketing/item/${itemId}/`;
export const getDetailItemURL = (itemId: number) => `marketing/item/${itemId}/`;
export const getItemVariationsURL =   (itemId: number) =>`marketing/item/variation/detail/${itemId}`;
export const getVariationDetailURL = (variationId: number) => `marketing/item/variation/${variationId}`;
export const getOperationDetailURL = (operationId: number) => `marketing/item/variation_operation/${operationId}`;
export const createItemVariationURL = () => `marketing/item/variation/`;
export const updateItemVariationURL = (variationId: number) => `marketing/item/variation/${variationId}`;
export const createVariationOperationURL = () => `marketing/item/variation_operation/`;
export const updateVariationOperationURL = (operationId: number) => `marketing/item/variation_operation/${operationId}`;
export const cutomerItemsURL =  (CustomerIds: any) =>`marketing/items/?customer_ids=${CustomerIds}`;
export const itemVariationOperationDisplayOrder = () => `marketing/item_variation_operation/display_order/update/`;
export const CopyOperationURL = (source_item_variation_id: number, destination_item_variation_id: number) => `marketing/item/variation_operation/clone/${destination_item_variation_id}/${source_item_variation_id}/`;
export const deleteOperationURL = (operationId: number) => `marketing/item/variation_operation/delete/${operationId}/`;

//for versions
export const varsionsURL = (orderId: number) => `marketing/order_versions/${orderId}/`;
export const createVersionURL = (orderId: number) => `marketing/order_versions/${orderId}/`;
export const updateDetailVersionURL = (orderId: number, versionId: number) => `marketing/order_version/${orderId}/${versionId}/`;
export const versionStatesURL = () => `marketing/order_version/state/list/`;
export const updateVersionStateURL = (orderId: number, versionId: number) => `marketing/order_version/state/update/${orderId}/${versionId}/`;

//for style numbers
export const styleNumbersURL = (orderId: number) => `marketing/order_inquiry/style_number/${orderId}/`;
export const createStyleNumberURL = () => `marketing/order_inquiry/style_number/`;
export const updateStyleNumberDetailURL = (orderId: number) => `marketing/order_inquiry/style_number/detail/${orderId}/`;
export const styleNumberURL = (orderId: number) => `marketing/order_inquiry/style_number/detail/${orderId}/`;

//for fabric composition
export const fabricCompositionTypesURL = () => `marketing/composition/types/`;
export const fabricCompositionsURL = () => `marketing/compositions/`;
export const createFabricCompositionURL = () => `marketing/compositions/`;
export const updatefabricCompositionURL = (fabricCompositionId: number) => `marketing/composition/${fabricCompositionId}/`;
export const fabricCompositionURL = (fabricCompositionId: number) =>  `marketing/composition/${fabricCompositionId}/`;

//for fabric texture
export const fabricTexturesURL = () => `marketing/fabrictextures/`;
export const createFabricTextureURL = () => `marketing/fabrictextures/`;
export const updatefabricTextureURL = (fabricTextureId: number) => `marketing/fabrictexture/${fabricTextureId}/`;
export const fabricTextureURL = (fabricTextureId: number) => `marketing/fabrictexture/${fabricTextureId}/`;

//for supplier
export const suppliersURL = () => `shared/suppliers/`;
export const categorizeSuppliersURL = (type:any) => `shared/supplier/list/?material_category=${type}`;
export const createSupplierURL = () => `shared/suppliers/`;
export const updateSupplierURL = (supplierID: number) => `shared/supplier/${supplierID}/`;
export const supplierURL = (supplierID: number) => `shared/supplier/${supplierID}/`;

//for user
export const usersURL = () => `shared/user/create/`;
export const createUserURL = () => `shared/user/create/`;
export const updateUserURL = (userID: number) => `shared/user/${userID}`;
export const userURL = (userID: number) => `shared/user/${userID}`;
export const userRoleRemoveURL = (userID: number, roleID: number) => `shared/user/deleterole/${userID}/${roleID}`
export const userGroupRemoveURL = (userID: number, groupID: number) => `shared/user/deletegroup/${userID}/${groupID}`


//userDetail in user view
export const userDetailForUserURL = () => `shared/user/detail/update/`

//for user profile
export const userRoleGroupAddingURL  = (userID: number) => `shared/user/addrole/${userID}`;

//for user role
export const userRolesURL = () => `shared/role/list/`;
export const createUserRoleURL = () => `shared/role/create/`;
export const updateUserRoleURL = (userRoleId: number) => `shared/role/detail/${userRoleId}`;
export const userRoleURL = (userRoleId: number) => `shared/role/detail/${userRoleId}`;

//for user group
export const userGroupsURL = () => `shared/group/list/`;
export const createUserGroupURL = () => `shared/group/create/`;
export const updateUserGroupURL = (userGroupId: number) => `shared/group/detail/${userGroupId}`;
export const userGroupURL = (userGroupId: number) => `shared/group/detail/${userGroupId}`;
export const roleGroupRemoveURL = (groupID: number, roleID: number) => `shared/role/deletegroup/${groupID}/${roleID}`





export const fetchCompositionsURL = () => `marketing/material/types/`;


export const createPlacementPackagingURL = (orderID: number,versionId:number, packId:number) => `marketing/orderpackplacement/other/${orderID}/${versionId}/?pack_id=${packId}`;

// export const updatePlacementPackagingURL = (otherplacementID: number,versionId:number,packId:number) => `marketing/orderpackplacement/other/detail/${otherplacementID}/${versionId}/`;

export const postUploadPlacementURL = (orderID: number,versionId:number) => `marketing/orderpackitemplacement/${orderID}/${versionId}`;

export const costingOrderColorwayCategories = (orderID: number) => `marketing/ordercolorwaycategory/list/${orderID}`;

export const costingOrderColorwayItemTypesURL = (orderID: number ) => `marketing/colorwayitemtypes/${orderID}`;

export const costingOrderColorwayCategoryTypesURL = (orderID: number) => `marketing/ordercolorwaycategorytype/${orderID}`;

export const uploadImagesURL = (orderID: number,versionId:any) => `marketing/orderpackitemplacement/${orderID}/${versionId}`
;
export const postPlacementTypeURL = (orderID: number) => `marketing/orderinquiry/${orderID}`

export const deleteOtherPlacementURL = (otherplacementid: number) => `marketing/orderpackitemplacement/${otherplacementid}`;

export const deletePackagingPlacementURL = (packagingplacementid: number) => `marketing/orderpackplacement/other/delete/${packagingplacementid}`;

//Auth
export const authUserURL =  () => `shared/user/info/`;

//for Materials(get navigation)
export const getNavigationOrderMaterialURL = (orderId: number, versionId: number) => `marketing/orderitemsizegrouppacks/${orderId}/${versionId}/`;
export const getOrderPackItemMaterialURL = (orderPackItemId: number, versionId: number) => `marketing/orderpackitemplacements/${orderPackItemId}/${versionId}`;
export const getOrderPackMaterialURL = (orderPackId: number, versionId: number) => `marketing/orderpackplacements/${orderPackId}/${versionId}`;

export const getMaterialMetaDataURL = () => `materials/fabric_metadata/`;
export const getTrimsMaterialData = (trimtype: string ) => `marketing/composition/list/${trimtype}`;
export const getUOMMaterialMetaDataURL = () => `marketing/material/unit/`;
export const getGeneralInfoMetaDataURL = () => "shared/customers_brands_seasons/list/";
export const getGeneralInfoCustomerBrandFilteredMetaDataURL = (customer_id: number) => `shared/customer_brand/meta_data/${customer_id}/`;
export const getOrderInquiryDetailsUpdateURL = (orderId: any) => `marketing/orderinquiry/${orderId}/`;

//for item
export const GET_ITEMS = "marketing/items/";
export const CREATE_ITEM = "marketing/items/";
export const UPDATE_ITEM = "marketing/item/:itemId/";
export const GET_ITEM = "marketing/item/:itemId/";

//for itemAttribute
export const itemAttributesURL =  () => `marketing/item_attributes/`;
export const itemAttributePlacemnetTypeURL =  () => `marketing/material/types/?type=fabric,packaging_trim,sewing_trim`;
export const itemAttributesPlacementAssignTypeURL =  () => `marketing/item_attribute/assign/types/`;
export const itemAttributeURL = (placementID: number) => `marketing/item_attribute/${placementID}`;
export const getItemAttributesURL = (itemId: number) => `marketing/itemplacement/list/${itemId}`;
export const createItemAttributeURL = () => `marketing/item_attributes/`
export const updateItemAttributeURL = (placementID: number) => `marketing/item_attribute/${placementID}`;

export const fetchMaterialTypeURL = (types: string) => `marketing/material/types/?type=${types}`;


export const createOrderInquiryURL = () => "marketing/orderinquiry/create/";

export const orderCountryListURL = (orderID: number) => `marketing/ordercountry/list/${orderID}/`;
//OrderProgram
export const createOrderProgramURL = () => "marketing/order/program/create/";
export const OrderProgramsURL = () => "marketing/order/program/create/";
export const updateOrderProgramURL = (programId:number) => `marketing/order/program/update/${programId}`;
export const confirmOrderProgramURL = (programId:number) => `marketing/order/program/inquiry/create/${programId}`;
export const programOrderInquiriesURL = (programId:number) => `marketing/order/program/list/${programId}`

//for current material placement

export const orderCountryCreateURL = () => `marketing/ordercountry/create/`;

export const markOrderAsCompleteURL = (orderId: number) => `marketing/finalize_order_information/${orderId}`;

export const fetchOrderItemsURL = (orderID: number) => `marketing/orderitem/list/${orderID}`;

export const deleteOtherPlacement = (itemplacementID: number) => `marketing/orderpackitemplacement/other/delete/${itemplacementID}`;


// export const getOtherPlacementURL = (OtherPlacementID: number, versionId:number, itemId: any) => `marketing/orderpackitemotherplacement/detail/${OtherPlacementID}/${versionId}/${itemId}`;





export const getInquiriesBySupplierId = (supplierId: any, orderId: any) => `materials/supplierinquiry/${supplierId}/all/${orderId}`;

export const getOrderPackItemSizeGroupCadInfoURL = (orderID: any, colorwayId: any, countryId: any, itemId: any, sizeGroupId: any) => `marketing/orderpackitemgroupplacements/${orderID}/${countryId}/${colorwayId}/${sizeGroupId}/${itemId}/`;

// Cad URLs
export const getPendingConsumptionRatio = () => `marketing/pending_consumption_ratio_entry/`;
export const getCompleteConsumptionRatio = () => `marketing/completed_consumption_ratio_entry/`;
export const getUpcomingConsumptionRatio = () => `marketing/upcoming_consumption_ratio_entries/`;

export const getCadNavigationData = (orderId: number, versionId: number) => `marketing/cad_interface_navigation/${orderId}/${versionId}/`;
export const getFabricNavigationData = (orderId: number, versionId: number) => `marketing/cad_fabric_navigation/${orderId}/${versionId}/`;

export const getMaterialDetailsURL = (orderid: any, materialType:string) => `marketing/orderfabrictrim/detail/${orderid}/?type=${materialType}`

export const getOrderPackItemSizeGroupCadInfo = (versionId: any, orderId: any, colorwayId: any, countryId: any, itemId: any, sizeGroupId: any) => `marketing/orderpackitemgroupplacements/${orderId}/${versionId}/${colorwayId}/${countryId}/${itemId}/${sizeGroupId}/`;

export const getConsumptionRatioSaveURL = (orderId: any, versionId: any) => `marketing/save_consumption_data/${orderId}/${versionId}/`
export const getPackConsumptionRatioSaveURL = (orderId: any, versionId: any) => `marketing/save_pack_consumption_data/${orderId}/${versionId}/`

export const getFabricNavigationURL = (orderId: any) => `marketing/cad_interface_fabric_navigation/${orderId}/`

export const reviewedStatusURL = (orderId: number) => `marketing/material/review/${orderId}`;

export const orderInquiryIndividualItemAttribute = (orderId: number,versionId:number) => `marketing/itemplacements/individual/${orderId}/${versionId}`;

export const orderInquiryAllItemAttribute = (orderId: number,versionId:number) => `marketing/itemplacements/all_applicable/${orderId}/${versionId}`;

export const updatePatternType = (orderId: number,versionId:number) => `marketing/orderpatterntype/update/${orderId}/${versionId}/`;

export const deletePatternImageURL = (patternId:number) => `marketing/orderpackitemplacement/delete/${patternId}`;

export const getOrderPackSizeGroupCadInfoURL = (versionId: any, orderId: any, colorwayId: any, countryId: any, sizeGroupId: any) => `marketing/orderpackgroupplacements/${orderId}/${versionId}/${colorwayId}/${countryId}/${sizeGroupId}/`;

export const getConsumptionMeasuringUnitsURL = () => `materials/consumption_units/`;

export const getItemColorwayCountrySizeGroupFabricsURL = (orderId: any, versionId: any, itemId: any, colorwayId: any, orderCountryId: any, orderGroupId: any, cwTypeId: any) => `marketing/item_colorway_country_size_group_fabrics/${orderId}/${versionId}/${itemId}/${colorwayId}/${orderCountryId}/${orderGroupId}/${cwTypeId}`;

export const getItemColorwayFabricsURL = (orderId: any, versionId: any, itemId: any, colorwayId: any, colorwayTypeId: any) => `marketing/item_colorway_fabrics/${orderId}/${versionId}/${itemId}/${colorwayId}/${colorwayTypeId}/`;

export const getItemColorwayTypeFabricsURL = (orderId: any, versionId: any, itemId: any, colorwayTypeId: any) => `marketing/item_colorway_type_fabrics/${orderId}/${versionId}/${itemId}/${colorwayTypeId}/`;

export const saveItemColorwayCountrySizeGroupFabricsURL = (orderId: any, versionId: any, itemId: any, colorwayId: any, orderCountryId: any, orderGroupId: any, colorwayTypeId: any) => `marketing/save_item_colorway_country_size_group_fabrics/${orderId}/${versionId}/${itemId}/${colorwayId}/${orderCountryId}/${orderGroupId}/${colorwayTypeId}/`;

export const saveItemColorwayFabricsURL = (orderId: any, versionId: any, itemId: any, colorwayId: any, colorwatTypeId:any) => `marketing/save_item_colorway_type_fabrics/${orderId}/${versionId}/${itemId}/${colorwayId}/${colorwatTypeId}/`;

export const saveItemColowayTypeFabricsURL = (orderId: any, versionId: any, itemId: any, colorwayTypeId: any) => `marketing/save_item_colorway_type_fabrics/${orderId}/${versionId}/${itemId}/${colorwayTypeId}/`;

export const packItemMaterialSupplierInquiryURL = (orderId: any, versionId: any, packItemId: any) => `marketing/pack_order_item_material/supplier_inquiry/${orderId}/${versionId}/${packItemId}/`;
export const packMaterialSupplierInquiryURL = (orderId: any, versionId: any, packId: any) => `marketing/pack_order_material/supplier_inquiry/${orderId}/${versionId}/${packId}/`;

//Upload FIle
export const uploadFileURL = () => `shared/files/upload/`;

export const techPackFileUploadURL = (versionId: any) => `marketing/order_costing/version/attachments/${versionId}/`;

export const techPackFileDeleteURL = (versionId: any, fileId: any) => `marketing/order_costing/version/attachments/delete/${versionId}/${fileId}`;

export const performCostingURL = (versionId:any, objectId: any, type: any) => `marketing/perform_costing/${versionId}/${objectId}/?type=${type}`;

export const versionPackCostsURL = (orderId: any, versionId:any) => `marketing/pack_costs/${orderId}/${versionId}/`;

export const purchaseOrderPacksURL = (purchaseOrderId: number) => `marketing/purchase_order/packs/${purchaseOrderId}/`;

export const purchaseOrderColorwayCountryPlacementDataURL = (purchaseOrderId: number, poColorwayId: number, poCountryId: number) => `marketing/po_country_colorway_item_placements/${purchaseOrderId}/${poColorwayId}/${poCountryId}/`;
export const changePurchaseOrderStateURL = (purchaseOrderId: number) => `marketing/change_po_status/${purchaseOrderId}/`;

//Version State Change
export const changeVersionStateURL = (orderId: number, versionId: number) => `marketing/order_costing_version_state_change/${orderId}/${versionId}/`;

//for purchase order
export const purchaseOrdersListURL = () => `marketing/purchase_orders/`;

export const purchaseOrdersURL = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `marketing/purchase_orders/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const purchaseOrderDetailURL = (purchaseOrderId: number) => `marketing/po_colorway_country_size/details/list/${purchaseOrderId}`

export const purchaseOrderColorwaysListURL = (purchaseOrderId: number) => `marketing/po_colorway_order_colorway_list/${purchaseOrderId}`

export const purchaseOrderColorwaysMatchingURL = (error: boolean) => `marketing/po_colorway_order_colorway/matching/?error_validation=${error}`

export const purchaseOrderFileRetriveUpdateURL = (fileId: number) => `marketing/purchase_order/update/file/${fileId}`

export const purchaseOrderSizesListURL = (purchaseOrderId: number) => `marketing/po_size_order_size_list/${purchaseOrderId}`

export const purchaseOrderSizesMatchingURL = (error: boolean) => `marketing/po_size_order_size/matching/?error_validation=${error}`

export const purchaseOrderCountriesListURL = (purchaseOrderId: number) => `marketing/po_country_order_country_list/${purchaseOrderId}`

export const purchaseOrderCountriesMatchingURL = (error: boolean) => `marketing/po_country_order_country/matching?error_validation=${error}`

export const purchaseOrderPackDetailURL = (purchaseOrderId: number) => `marketing/purchase_order/pack/details/${purchaseOrderId}/`

export const purchaseOrderQuantitiesMatchingURL = (error: boolean) => `marketing/po_pack/list/update/?error_validation=${error}`

export const updatePurchaseOrderFileUploadURL = (fileId: number) => `marketing/purchase_order/update/file/${fileId}`

export const purchaseOrderFileUploadURL = (customer: number) => `marketing/purchase_order/capture/file/${customer}/`

export const purchaseOrderListURL = (purchaseOrderId: number) => `marketing/purchase_order/list/${purchaseOrderId}/`

export const purchaseOrderStatusListURL = (purchaseOrderId: number) => `marketing/po/status/list/${purchaseOrderId}` //need to pass po id

export const purchaseOrderMaterialNavigationURL = (purchaseOrderId: number) => `marketing/purchase_order/material_navigation/${purchaseOrderId}/`;

export const purchaseOrderPackItemMaterialsURL = (purchaseOrderId: number, packItemId: number) => `marketing/po_pack_item_materials/${purchaseOrderId}/${packItemId}/`;

export const purchaseOrderPackMaterialsURL = (purchaseOrderId: number, packItemId: number) => `marketing/po_pack_materials/${purchaseOrderId}/${packItemId}/`;

export const customerOrderVersionMatchListURL = (customer: number, fileId: number) => `marketing/customer_order_version/list/${customer}/${fileId}`

export const poCustomerOrderVersionMatchListURL = (purchase_order_id: number) => `marketing/customer_order_version/list/${purchase_order_id}`

export const purchaseOrderVersionsMatchingURL = (error: boolean) => `marketing/purchase_order_version/matching?error_validation=${error}`

export const savePOItemMaterialURL = (poPackItemId: number) => `marketing/save_po_pack_item_materials/${poPackItemId}/`;

export const savePOPackMaterialURL = (poPackId: number) => `marketing/save_po_pack_materials/${poPackId}/`;

export const materialsWithSameReferenceCode = (purchaseOrderId: number, referenceCodeId: number, materialType: string) => `marketing/purchase_order/${purchaseOrderId}/${referenceCodeId}/materials?material_type=${materialType}`;

export const poRatioComparisonURL = (purchaseOrderId: number) => `marketing/costing_vs_po_quantities/list/${purchaseOrderId}`

export const poPackReviewedStatusURL = () => `marketing/po_pack_review/update/`

export const getPoPackReviewedStatusURL = (objectId: number,materialType:any) => `marketing/po_pack_review/status/${objectId}/?type=${materialType}`

export const poColorwayItemListURL = (purchaseOrderId: any) => `marketing/po_colorway_item/list/${purchaseOrderId}/`

export const poColorwayItemColorMappingURL = () => `marketing/po_colorway_items/mapping/`

export const poColorwayItemList = (purchaseOrderId: any) => `marketing/po_colorway_item/matrix/${purchaseOrderId}/`

// for ie machine and folder
export const machinesURL = () => `shared/machine_type/list/`;

export const createMachineURL = () => `shared/machine_type/`;

export const updateMachineURL = (machine_type_id: number) => `shared/machine_type/update/${machine_type_id}`;

export const machineURL = (machine_type_id: number) => `shared/machine_type/${machine_type_id}`;

export const foldersURL = () => `shared/folder_type/list/`;

export const createFolderURL = () => `shared/folder_type/`;

export const updateFolderURL = (folder_type_id: number) => `shared/folder_type/update/${folder_type_id}`;

export const folderURL = (folder_type_id: number) => `shared/folder_type/${folder_type_id}`;

export const packagingDetailsURL = (costingVersionId: number) => `marketing/packaging/instruction/detail/${costingVersionId}/`;

export const packagingVersionsURL = (costingVersionId: number) => `marketing/packaging/instruction/version/list/${costingVersionId}/`;

export const createPackagingVersionURL = (costingVersionId: number) => `marketing/packaging/instruction/version/create/${costingVersionId}/`;

export const approvedPackagingVersionURL = (packagingVersionId: number) => `marketing/packaging/instruction/version/current_version/${packagingVersionId}/`;

export const savePackagingDetailsURL = (packagingVersionId: number) => `marketing/packaging/instruction/save/${packagingVersionId}/`;

export const packagingInstructionMaterialListURL = (costingVersionId: number) => `marketing/packaging/instruction/material/list/${costingVersionId}/`;

export const deleteCostingPackagingInstructionDetailsURL = (packagingInstructionId: number) => `marketing/packaging/instruction/delete/${packagingInstructionId}/`;

export const allocationMaterialListURL = (costing_version_id:any,customer_brand_material_id:any,rows_per_page:any) => `materials/virtual_warehouse/allocation_material/list/${costing_version_id}/${customer_brand_material_id}/?page_size=${rows_per_page}`

export const allocatedLeftOverMaterialsSaveURL = (poClubId: number, materialId: any) => `materials/virtual_warehouse/po_club_left_over_material/allocation/${poClubId}/${materialId}/`;

export const allocatedLeftOverDtailsURL = (po_club: any, customer_brand_material_id:any) => `materials/virtual_warehouse/po_club_left_over_material/material/list/${po_club}/${customer_brand_material_id}`

export const allocatedLeftOverMaterialsDeleteURL = (po_club_left_over_material_id: number) => `materials/virtual_warehouse/po_club_left_over_material/delete/${po_club_left_over_material_id}/`;

export const orderSpecificMaterialsSavingDetailList = (customer_brand_material_id: number) => `materials/virtual_warehouse/order_specific_materials/detail/list/${customer_brand_material_id}/`;

export const barcodeListURL = (search_text:any) => `materials/virtual_warehouse/search/in_house_material/barcode/?search_text=${search_text}`
//Approval Urls   
export const allPendingapprovalListURL = (page: any, pageSize: any, searchedText:any, entityType: any) => `shared/approval/admin/pending/list/?page=${page}&page_size=${pageSize}&search_text=${searchedText}&entity=${entityType}`;

export const allCompletedapprovalListURL = (page: any, pageSize: any, searchText: string, entityType: any) => `shared/approval/admin/other/list/?page=${page}&page_size=${pageSize}&search_text=${searchText}&entity=${entityType}`;

export const myPendingApprovalListURL = (page: any, pageSize: any, searchedText: any, entityType: any) => `shared/approval/user/pending/list/?page=${page}&page_size=${pageSize}&search_text=${searchedText}&entity=${entityType}`;

export const myCompletedApprovalListURL = (page: any, pageSize: any, searchText: string, entityType: any) => `shared/approval/user/other/list/?page=${page}&page_size=${pageSize}&search_text=${searchText}&entity=${entityType}`;

export const approvalDetailURL = (approvalId: any) => `shared/approval/detail/${approvalId}/`;

export const approvalStatusListURL = () => `shared/approval/status/list/`;

export const approvalCommentSaveURL = (id: any) => `shared/approval/update_comment/${id}/`;

export const approvalCommentDeleteURL = (commentId: any) => `shared/approval/comment/delete/${commentId}/`;

export const approvalStateChangeURL = (approvalId: any) => `shared/approval/update_state/${approvalId}/`;

export const approvalDetailsSaveURL = (approvalId: any) => `shared/approval/admin/update/${approvalId}/`;
//Task Urls
export const allPendingTaskListURL = (page: any, pageSize: any, searchedText:any, entityType: any) => `shared/approval/admin/task/pending/list/?page=${page}&page_size=${pageSize}&search_text=${searchedText}&entity=${entityType}`;

export const allCompletedTaskListURL = (page: any, pageSize: any, searchText: string, entityType: any) => `shared/approval/admin/task/other/list/?page=${page}&page_size=${pageSize}&search_text=${searchText}&entity=${entityType}`;

export const myPendingTaskListURL = (page: any, pageSize: any, searchedText: any, entityType: any) => `shared/approval/user/task/pending/list/?page=${page}&page_size=${pageSize}&search_text=${searchedText}&entity=${entityType}`;

export const myCompletedTaskListURL = (page: any, pageSize: any, searchText: string, entityType: any) => `shared/approval/user/task/other/list/?page=${page}&page_size=${pageSize}&search_text=${searchText}&entity=${entityType}`;

export const taskDetailsURL = (taskId: any) => `shared/approval/task/detail/${taskId}/`;

export const TaskStatusListURL = () => `shared/approval/task/choices/`;

export const taskDetailsSaveURL = (taskId: any) => `shared/approval/task/admin/update/${taskId}/`;
//Approval Entity URLS
export const approvalEntityURL = (approvalUserType: any, approvalStatus: any) => `shared/approval/task_entity/list/?filter=${approvalUserType}&status=${approvalStatus}`;

export const taskEntityURL = (approvalUserType: any, approvalStatus: any) => `shared/approval/action_task/task_entity/list/?filter=${approvalUserType}&status=${approvalStatus}`;
 
export const createOrderMaterials = (versionId: any) => `materials/costing_material/list/${versionId}/`;

export const costingTimeLineDetails = (versionId: any) => `marketing/costing/activity/detail/${versionId}/`;

export const createPreCostingURL = (costingId: any, versionId: any, costingType: any) => `marketing/costing/clone/${costingId}/${versionId}/?costing_type=${costingType}`;

export const costingVersionsListURL = () => `marketing/costing/version/source/list/`;

//Copy Costing URLS
// export const colorwayMappingURL = (source_costing_id: any, source_costing_version_id: any, pre_costing:any) => `marketing/costing/clone/${source_costing_id}/${source_costing_version_id}/?costing_type=${pre_costing}`;

export const colorwayMappingURL = (order_inquiry_id: any, order_costing_version_id: any, costing_type:any) => `marketing/costing/clone/${order_inquiry_id}/${order_costing_version_id}/?costing_type=${costing_type}`;

export const preCostingColorwayMappingDetails = (costing_id: any, version_id: any) => `marketing/pre_costing/colorway/mappling/detail/${costing_id}/${version_id}`;

export const preCostingColorwayMappingCreate = (order_inquiry_id: any, order_costing_version_id: any) => `marketing/order_inquiry/pre_costing/create/${order_inquiry_id}/${order_costing_version_id}`;

export const preCostingColorwayMappingEdit = (order_inquiry_id: any, order_costing_version_id: any) => `marketing/order_inquiry/pre_costing/update/${order_inquiry_id}/${order_costing_version_id}`;

export const orderPackPlacementDetailsURL = (costingId: any, versionId: any) => `marketing/placements/search/${costingId}/${versionId}/`;

export const orderPackPlacementDeleteURL = () => `marketing/costing/version/pack_placement/bulk_delete/`;

export const costingMaterialListURL = (orderId: any, versionId: any) => `marketing/material_list/${orderId}/${versionId}/`;

export const costingMaterialDetailsURL = (orderId: any, versionId: any, materialId: any) => `marketing/material_selected_suppliers/${orderId}/${versionId}/${materialId}/`;

export const costingConsumptionWastageSaveURL = (orderId: any, versionId: any) => `marketing/save_selected_consumption_ratios/${orderId}/${versionId}/`;

export const costingMaterialSupplierInquirySaveURL = (orderId: any, versionId: any) => `marketing/save_selected_material_supplier_inquiry_detail/${orderId}/${versionId}/`;

export const costingOrderProcessListURL = (costingVersionId: any, purchaseOrderId: any, poClubId: any) => `marketing/order_process/widget/?costing_version_id=${costingVersionId}&purchase_order_id=${purchaseOrderId}&po_club_id=${poClubId}`;

export const clubPreCostingListURL = (clubId: number) => `marketing/po_club/pre_costing/list/${clubId}/`;

export const costingPackSummaryDetailsURL = (orderId: any, versionId: any, packId: any) => `marketing/order_pack_cost_summary/${orderId}/${versionId}/${packId}/`;

export const preSeenSummaryDetailsURL = (packId: any) => `/marketing/purchase_order/po_pack/${packId}/pre_seen_cost_summary`;

export const orderProcessWidgetsDetailsURL = (clubId: any) => `marketing/order_process/po_club/widget/${clubId}/`;

export const searchPoClubListURL = (searchText: any) => `marketing/po_club/list/?search_text=${searchText}`;

export const searchPurchaseOrderListURL = (searchText: any) => `marketing/purchase_order/list/?search_text=${searchText}`;

export const searchOrderCostingURL = (searchText: any) => `marketing/order_costing/list/?search_text=${searchText}`;

export const orderTechPackUploadURL = (orderId: any) => `marketing/order/tech_pack/upload/${orderId}/`;

export const serviceSuppliersURL = (serviceId: any) => `service_po/spo/supplier_list/${serviceId}/`;

export const OrderCostingVersionDetail = (pageNumber: number, pageSize: number, customer: any, optionalParams?: string) => {
    let url = `marketing/order_costing_version_detail/?customer_id=${customer}&page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const updateOrderInquiryGeneralDataURL = (orderInquiryId: any) => `marketing/orderinquiry/general_information/update/${orderInquiryId}/`;

export const customerBrandMaterialDeleteURL = (customer_brand_material_id: any) => `materials/materail_library/delete/${customer_brand_material_id}/`;

export const poProcessorListURL = () => `shared/po_processor/list/`;
