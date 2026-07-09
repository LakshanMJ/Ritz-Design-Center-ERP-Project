

export const buildPurchaseOrderBomURL = (poPackId: number) => `marketing/build_purchase_order_bom/${poPackId}/`;
export const buildPurchaseOrderClubingBomURL = (clubId: number) => `marketing/po_clubs/refresh_create/bom/${clubId}/`;

export const poMaterialBomUrl = (purchaseOrderId: number) => `marketing/purchase_order_bom/${purchaseOrderId}/`;
export const poClubingMaterialBomUrl = (clubId: number) => `marketing/po_club/purchase_orders_bom/${clubId}/`;
export const poClubBomMaterialsUrl = (clubId: number) => `supplier_po/general_po/po_club/material_list/${clubId}/`;
export const poClubBomMaterialDetailsUrl = (generalPoMaterialQuantity: number, materialId: number) => `supplier_po/general_po/material/detail/${generalPoMaterialQuantity}/`;
export const savePoClubBomMaterialDetailsUrl = (generalPoMaterialQuantity: number) => `supplier_po/general_po/save_delivery/${generalPoMaterialQuantity}/`;
export const savePoClubBomOrderQuantityUrl = (bomId: number) => `marketing/purchase_order/club/supplier/po/increase_quantity/${bomId}/`;
export const poMaterialSupplierDetailsURL = (bomId: number, materialId: number) => `marketing/po_club/bom/supplier/detail/${bomId}/${materialId}/`;
export const deletePoMaterialSupplierURL = (detailId: number) => `marketing/po_club/bom/supplier/delete/${detailId}/`;
export const poClubingBomMaterialsUrl = (clubId: number) => `supplier_po/general_po/po_club/material_list/${clubId}/`;
export const supplierPOBomDetailsUrl = (clubId: number) => `marketing/purchase_order/club/supplier_po/file/list/${clubId}/`;
export const poClubOrderInquirySuppliersURL = (generalPoQuantityId: number, materialId: number) => `supplier_po/general_po/bom/material/supplier/list/${generalPoQuantityId}/${materialId}/`;

export const purchaseOrderColorwayCountryItemPlacementDataURL = (purchaseOrderId: number, poItemId: number, poColorwayId: number, poCountryId: number) => `marketing/po_country_colorway_item_placements/${purchaseOrderId}/${poItemId}/${poColorwayId}/${poCountryId}/`;
export const purchaseOrderColorwayCountryPlacementDataURL = (purchaseOrderId: number, poColorwayId: number, poCountryId: number) => `marketing/po_country_colorway_placements/${purchaseOrderId}/${poColorwayId}/${poCountryId}/`;
export const purchaseOrderColorwayCountryItemURL = (purchaseOrderId: number) => `marketing/purchase_order/colorway_country_material_navigation/${purchaseOrderId}/`;

export const purchaseOrderClubDetailsURL = (purchaseOrderUploadId:number) => `marketing/purchase_order/uploaded_purchase_order/${purchaseOrderUploadId}/`;
export const purchaseOrderListURL = () => `marketing/purchase_orders/`;
export const purchaseOrderClubingSaveURL = () => `marketing/purchase_order/actual_club/po_update/`;
export const purchaseOrderUploadedListURL = () => `marketing/purchase_order/uploaded_purchase_order/list/`;
export const purchaseOrderClubSetMarkAsCompleteURL = (purchaseOrderUploadId:  number) => `marketing/purchase_order/po_clubbing/complete_status/${purchaseOrderUploadId}/`;

export const purchaseOrderStateListURL = () => `marketing/purchase_order/state/list/`

export const stateDropDownOptionListURL = (type: any) => `marketing/purchase_order/state/meta/list/?source=${type}`

export const purchaseOrderStateUpdateURL = (purchaseOrderId: number) => `marketing/purchase_order/state/update/${purchaseOrderId}/`

export const poColorwayItemList = (purchaseOrderId: any) => `marketing/po_colorway_item/matrix/${purchaseOrderId}/`

export const poEditMaterialsNavigationListUrl = (purchaseOrderId: number) => `marketing/po_colorway_country_navigation/${purchaseOrderId}/`

export const poEditMaterialsDataUrl = (purchaseOrderId: number, poCountryId: number, poColorwayId: number) => `marketing/po_colorway_country_materials/${purchaseOrderId}/${poCountryId}/${poColorwayId}/`;

export const saveEditMaterialsColorsUrl = (purchaseOrderId: number) => `marketing/po_colorway_country_save_material/${purchaseOrderId}/`

export const getPoFabricNavigationData = (purchaseOrderId: number) => `marketing/purchase_order/cad_navigation/${purchaseOrderId}/`;

export const getPOMaterialColorwayFabricsURL = (purchaseOrderId: any, poColorwayId: any, poOrderItemId: any) => `marketing/purchase_order/cad/fabrics/${purchaseOrderId}/${poColorwayId}/${poOrderItemId}/`;

export const savePOMaterialColorwayFabricsURL = (purchaseOrderId: any) => `marketing/purchase_order/save_colorway_item_cad_data/${purchaseOrderId}/`;

export const filterPOBomMaterialsURL = (purchase_order_id:number) => `marketing/purchace_order/bom/detail/${purchase_order_id}/`;

export const poNavagationURl = (purchase_order_id:number) => `marketing/purchase_order/material_navigation/${purchase_order_id}/`;

export const poMaterialCompleteStateUrl = (purchaseOrderId: number) => `marketing/po_material/review/${purchaseOrderId}/`;

export const actualPoClubsURL = () => `marketing/purchase_order/actual_po_club/list/`

export const actualPoClubslistURL = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `marketing/purchase_order/actual_po_club/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const FactoryCustomerWisePoClubsURL = (plant_id:number,customer_id:number) => `materials/virtual_warehouse/plant/customer/purchase_order/actual_po_club/list/${plant_id}/${customer_id}/`

export const poClubStateMetaDataURL = () => `marketing/actual_po_club/state_options/`

export const poClubStateUpdateURL = (po_club_id: number) => `marketing/change_po_club_status/${po_club_id}/`

export const poClubEditStateURL = (po_club_id: number) => `marketing/purchase_order/club/state/force_change/${po_club_id}/`

export const poClubMaterialMergeURL = (po_club_id: number) => `marketing/purchase_order_club/merge_fabrics/${po_club_id}/`

export const clubPoListURL = (po_club_id: number) => `marketing/purchase_order/actual_po_club/${po_club_id}/`

export const poClubFabricListURL = (poClubId: number) => `marketing/club_fabric_list/${poClubId}/`

export const purchaseOrderBomMaterialsFilterURL = (purchaseOrderId: number) => `marketing/purchace_order/bom/detail/${purchaseOrderId}/`;

export const purchaseOrderClubingBomMaterialsFilterURL = (clubId: number) => `marketing/po_club/bom/detail/${clubId}/`;

export const changePurchaseOrderMarkerMaterialsURL = (clubId: number, markerId: number) => `marketing/purchase_order_club/item_fabric_markers/placements/copy/${clubId}/${markerId}/`;//TOdo

export const purchaseOrderMarkersChangeListURL = (clubId: number, materialId: number, itemId: number, markerId: number ) => `marketing/purchase_order_club/item_fabric_markers/list/${clubId}/${materialId}/${itemId}/${markerId}/`;//TOdo

export const purchaseOrderClubCreatedMarkerDetailsURL = (poClubId: number, material_id: number, category: any) => `marketing/purchase_order_club/item_fabric_markers/${poClubId}/${material_id}/?marker_classification=${category}`;

export const purchaseOrderFabricsDataURL = (poClubId: number) => `marketing/purchase_order_club/fabrics/${poClubId}/ `;

export const purchaseOrderItemMaterialPlacementsDataURL = (poClubId:number, itemId:number, materialId:number) => `marketing/purchase_order_club/item_clubs/${poClubId}/${itemId}/${materialId}/`;

export const createPoMaterialMarkerURL = (poClubId: number) => `marketing/purchase_order_club/item_clubs/${poClubId}/`;

export const deletePoMarkerURL = (markerId: number) => `marketing/purchase_order_club/item_fabric_markers/${markerId}/`;

export const deleteFabricMarkerPlacementURL = (clubId: number, markerId:number ) => `marketing/purchase_order_club/item_fabric_markers/placements/delete/${clubId}/${markerId}/`;

export const purchaseOrderRatioDetailsURL = (poClubId:number, markerId: number) => `marketing/po_marker_details/${poClubId}/${markerId}/`;

export const savePurchaseOrderMarkerRatioURL = (poClubId:number, markerId: number) => `marketing/po_marker/save_cad_date/${poClubId}/${markerId}/ `;

export const completedConsumptionRatioDetailsURL = (poClubId:number) => `marketing/po_clubs/consumption_ratios/complete/${poClubId}/`;

export const poClubingBomNavagationURl = (poClubId:number) => `marketing/po_clubs/purchase_orders/navigation/${poClubId}/`;

export const fabricWidthSuppliers = (poClubId:number, widthId: number) => `marketing/purchase_order_club/fabric_marker/${poClubId}/${widthId}/`;

export const poFabricMaterialDetailsURL = (poClubId: number) => `marketing/po_club/fabrics/${poClubId}/`;

export const poActualClubColorwayMatrixDetailsURL = (poClubId: number) => `marketing/po_club/colorway_mappings/${poClubId}/`;

export const poClubItemPlacementListUrl = (clubId: number, materialId: number, markerClassification: any) => `marketing/po_club/material/marker/placements/${clubId}/${materialId}/?marker_classification=${markerClassification}`;

export const poClubMarkerCreateURL = (clubId: number, materialId: any) => `marketing/po_club/create_marker/${clubId}/${materialId}/`;

export const poClubSubMarkerCreateURL = (parentMarkerId: number) => `marketing/po_club/create_sub_marker/${parentMarkerId}/`;

export const poClubMarkerCadDetailsURL = (markerId: any) => `marketing/po_club/marker/cad_data/detail/${markerId}/`;

export const poClubMarkerCadDataSaveURL = (clubId: number, markerId: any) => `marketing/po_club/marker/cad_data/${clubId}/${markerId}/`;

export const poClubMarkerWidthListURL = (clubId: number, materialId: number) => `marketing/po_club/marker/widht/list/${clubId}/${materialId}/`;

export const poClubMarkerClassificationListURL = () => `marketing/po_club/marker/classification/list/`;

export const poClubMarkerDeleteURL = (markerId: number) => `marketing/po_club/marker/delete/${markerId}/`;

export const addPlacementsToExistingMarkerURL = (markerId: number) => `marketing/po_club/marker/placements/${markerId}`;

export const relatedMarkersListURL = (clubId: any, materialId: number, markerId: number) => `marketing/po_club/marker/details/${clubId}/${materialId}/${markerId}`;

export const supplierInquiryDetails = (clubId: number, type: boolean) => `supplier_po/general_po/supplier_po/list/${clubId}/?is_po_club=${type}`;

export const poClubGrnFabricSummaryURL = (clubId: number) => `marketing/po_club/fabric/summary/list/${clubId}/`;

export const generalPOFabricSummaryUrl = (generalPoId: number) => `supplier_po/general_po/fabric/chart/summary/${generalPoId}/`;

export const consumptionUnitsUrl = () => `materials/consumption_units/`;

export const factoryListURL = () => `shared/plant/list/`;

export const cadPOAllocatedMaterialListURL = (clubId: number) => `marketing/po_club/in_house/material/list/material/${clubId}/`;

export const cadPurchaseOrderAllocatedMaterialListDeliveryDate = (clubId: number) => `marketing/po_club/in_house/material/list/delivery_date/${clubId}/`;

export const cadPurchaseOrderAllocatedMaterialListShadeGroup = (clubId: number) => `marketing/po_club/in_house/material/list/shade_group/${clubId}/`;

export const saveColorTonesURL = (clubId: number) => `marketing/po_club/color_tone/save/${clubId}/`;

export const saveGenralMaterialColorTonesURL = (supplierPoId: number) => `supplier_po/spo/color_tone/save/${supplierPoId}/`;

export const getColorTonesListURL = () => `materials/color_tone/list/`;

export const materialColorToneDetailsURL = (clubId:any, materialId:any) => `marketing/po_club/color_tone/detail/${clubId}/${materialId}/`;

export const generalMaterialColorToneDetailsURL = (supplierPoId:any, materialId:any) => `supplier_po/spo/color_tone/detail/${supplierPoId}/${materialId}/`;

export const createdGeneralPOQuantityDetailsURL = (generalPoId:any) => `marketing/orderinquiry/size_groups/${generalPoId}/`;

export const saveGeneralPOQuantityDetailsURL = (version:any) => `supplier_po/general_po/order_pack/quantity/save/${version}/`;

export const updateGeneralPOQuantityDetailsURL = (generalPoId:any) => `supplier_po/general_po/order_pack/quantity/update/${generalPoId}/`;

export const generalPoListURL = (pageNumber: number, pageSize: number, optionalParams?: string) => {
    let url = `supplier_po/general_po/list/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const generalPoDetailsURL = (generalPoId:any) => `supplier_po/general_po/detail/${generalPoId}/`

export const generalPoStatesURL = () => `supplier_po/general_po/meta_data/`

export const generalPOStateUpdateURL = (generalPoId: number) => `supplier_po/general_po/state/update/${generalPoId}/`

export const generalPOBOMMaterialDetailsURL = (generalPoId: number) => `supplier_po/general_po/bom/materail/list/${generalPoId}/`

export const generalPOBOMMaterialQuantityDetailsURL = (materialId: number) => `supplier_po/general_po/bom/material/quantity/detail/${materialId}/`

export const generalPOBOMMaterialSupplierDetailsURL = (generalPoQuantityId:any, materialId: number ) => `supplier_po/general_po/bom/material/supplier/list/${generalPoQuantityId}/${materialId}/`

export const saveGeneralPOBOMMaterialQuantityDetailsURL = (generalPoQuantityId:any ) => `supplier_po/general_po/bom/supplier/delivery_date/save/${generalPoQuantityId}/`

export const deleteGeneralPOBOMMaterialQuantityURL = (deleteId:any ) => `supplier_po/general_po/bom/supplier/delete/${deleteId}/`

export const generalSupplierPODetails = (sourceId: number, type: boolean) => `supplier_po/general_po/supplier_po/list/${sourceId}/?is_po_club=${type}`;

export const checkExitingPackagingDetailsURL = (purchaseOrderId: any) => `marketing/purchase_order/packaging/instruction/list/${purchaseOrderId}/`;

export const purchaseOrderPackagingDetailsURL = (purchaseOrderId: number) => `marketing/purchase_order/packaging/instruction/detail/${purchaseOrderId}/`;

export const savePurchaseOrderPackagingDetailsURL = (packagingId: number) => `marketing/purchase_order/packaging/instruction/save/${packagingId}/`;

export const deletePurchaseOrderPackagingDetailsURL = (packagingInstructionId: number) => `marketing/purchase_order/packaging/instruction/delete/${packagingInstructionId}/`;

export const deleteGeneralPoSupplierMaterial = (generalPoSupplierMaterialPriceId: number) => `supplier_po/general_po/general_po_price/delete/${generalPoSupplierMaterialPriceId}/`;

export const deleteGeneralPoSupplierMaterialAllocation = (allocationId: number) => `supplier_po/general_po/delivery_po_allocation/delete/${allocationId}/`;

export const poClubShadeAttachmentUploadUrl = () => `marketing/po_club/fabric/shade/attachment/save/`;

export const poPackagingSummaryDetailsURL = (purchaseOrderID: any) => `marketing/purchase_order/packaging/summary/${purchaseOrderID}/`;

export const generalPOMaterialDiscrepancyReasonsURL = () => `supplier_po/general_po/material/discrepancy_reasons/`;

export const costingGeneralPOQuantityDetailsURL = (versionId: number) => `marketing/orderinquiry/size_groups/detail/${versionId}/`;

export const generalPORatioQuantityDeailsURL = (versionId:any) => `marketing/orderinquiry/size_groups/quantities/${versionId}/`;

export const generalPOMaterialQuantityStatusChangeURL = () => `supplier_po/general_po/materail_quantity/send_po_for_material/state/update/`;

export const cutPlanMetaDataURL = (clubId:any) => `marketing/cad/po_club/cut_plan/meta/${clubId}/`;

export const poClubMaterialMarkerCutPlanDetail = (clubId: number, materialId: number) => `marketing/cad/po_club/material/marker_cut_plan/detail/${clubId}/${materialId}`;

export const poClubMarkerCutPlanDetail = (clubId:any) => `marketing/cad/po_club/marker_cut_plan/detail/${clubId}/`;

export const markerCutPlanSave = () => `marketing/cad/po_club/marker_cut_plan/save/`;

export const poClubMarkerCutPlanUpdate = (markerCutPlanId:any) => `marketing/cad/po_club/marker_cut_plan/update/${markerCutPlanId}/`;

export const poClubMarkerCutPlanDelete = (markerCutPlanId:any) => `marketing/cad/po_club/marker_cut_plan/delete/${markerCutPlanId}/`;

export const actualClubMaterialList = (clubId: number) => `marketing/club_material_list/${clubId}/`;

export const getPoMarkerLeftOverStatusURL = (poClubId: number) => `marketing/po_club/left_over_marker/status/${poClubId}/`;

export const purchaseOrderDeliveryPacksDetailsURL = (purchaseOrderId: number) => `marketing/purchase_order/po_pack/delivery/list/${purchaseOrderId}/`;

export const purchaseOrderDeliveryPacksDataSaveURL = (purchaseOrderId: number) => `marketing/purchase_order/po_pack/delivery/update/${purchaseOrderId}/`;

export const purchaseOrderDeliveryPackDeleteURL = (deliveryId: number) => `marketing/purchase_order/po_pack/delivery/delete/${deliveryId}/`;

export const poClubItemMaterialRollSequenceGenarete = (clubId:number,materialId:number) => `marketing/cad/po_club/item/material/roll_sequence/${clubId}/${materialId}`;

export const clubMarkerCutPlanRollSequenceSelectedRollDetail = (marker_cut_plan_id: number) => `marketing/cad/po_club/marker_cut_plan/roll_sequence/selected_roll/${marker_cut_plan_id}/`;

export const poClubMarkerCutPlanGenarete = (clubId:number,materialId:number) => `marketing/cad/po_club/marker_cut_plan/genarete/${clubId}/${materialId}`;

export const rollSequenceItemMaterialFinalized = (clubId:number,materialId:number) => `marketing/cad/po_club/marker_cut_plan/roll_sequence/finalized/${clubId}/${materialId}/`;

export const poClubTimeLineDetailsURL = (poClubId: number) => `marketing/po_club/activity/detail/${poClubId}/`;

export const spoGRNDetailsURL = (spoId: number) => `supplier_po/spo/material/detail/${spoId}/`;

export const grnMaterialDetailsSummaryURL = (grnId: number) => `supplier_po/grn/material/detail/${grnId}/`;

export const poClubMaterialRollList = (clubId:any,materialId:any,type:any) => `marketing/cad/po_club/material/roll/list/${clubId}/${materialId}/?roll_state=${type}`;

export const purchaseOrderColorwaySizeCountryDeailsURL = (poClub: number) => `marketing/po_club/colorway_country_size/detail/${poClub}/`;

export const poClubColorwayCreateURL = () => `marketing/po_club/colorway/create/`;

export const poClubColorwayUpdateURL = (poColorwayId: any) => `marketing/po_club/colorway/update/${poColorwayId}/`;

export const poClubColorwayDeleteURL = (poColorwayId: any) => `marketing/po_club/colorway/delete/${poColorwayId}/`;

export const poClubColorwayMappedDataSaveURL = (clubId: any) => `marketing/po_club/purchase_order/colorway/update/${clubId}/`;

export const poMarkerUploadURL = (clubId: number, materialId: any) => `marketing/po_club/marker/item/placements/upload/${clubId}/${materialId}/`;

export const poMarkerCreateUploadDataURL = (clubId: number, materialId: any) => `marketing/po_club/material/marker/create/file/upload/${clubId}/${materialId}/`;

export const startPreCostingInPoClubURL = (clubId: number) => `marketing/costing/clone/from_club/${clubId}/?costing_type=pre_costing`;

export const poClubSizeCraeteURL = () => `marketing/po_club/size/create/`;

export const poClubCountryCraeteURL = () => `marketing/po_club/country/create/`;

export const poClubSizeUpdateDelteURL = (sizeId: any) => `marketing/po_club/size/detail_update_delete/${sizeId}/`;

export const poClubCountryUpdateDeleteURL = (countryId: any) => `marketing/po_club/country/detail_update_delete/${countryId}/`;

export const poClubColorwayUpdateDeleteURL = (colorwayId: any) => `marketing/po_club/colorway/detail_update_delete/${colorwayId}/`;

export const poClubAnalyzeMetaDataURL = (clubId: number) => `marketing/po_club/analyze/meta_data/${clubId}`;

export const poClubAnalyzeSearchURL = (clubId: number) => `marketing/po_club/analyze/search/${clubId}`;

export const poPlacementDeleteURL = (clubId: number) => `marketing/po_club/delete_po_placements/${clubId}`;

export const poClubConsumptionWastageSaveURL = (clubId: any) => `marketing/po_club/save_po_pack_po_pack_item_consumption_wastage/${clubId}`;

export const poClubMaterialDetailsURL = (customerBrandId: any, materialType: any) => `materials/customer_brand_material/list/${customerBrandId}/?material_type=${materialType}`;

export const poClubAssignMaterialSaveURL = (clubId: any) => `marketing/po_club/assign_club_placement_materials/${clubId}`;

export const poClubColorwaySizeCountryMappingURL = (clubId: number) => `marketing/po_club/colorway_country_size/auto_map/${clubId}/`;

export const poClubServicePOListURL = (clubId: number) => `service_po/spo/list/${clubId}/`;

export const poClubServicePODeliveryCreateURL = (servicePOId: any) => `service_po/spo/delivery/create/${servicePOId}/`;

export const poClubServicePODeliveryDetailsURL = (serviceId: any) => `service_po/spo/delivery/detail/${serviceId}/`;

export const actualSupplierGeneralMaterialDeliveryMetaDataURL = (poClubId: any, supplierId: any, customerBrandMaterialId: any) => `supplier_po/general_po/material/delivery/meta_data/${poClubId}/${supplierId}/${customerBrandMaterialId}/`;