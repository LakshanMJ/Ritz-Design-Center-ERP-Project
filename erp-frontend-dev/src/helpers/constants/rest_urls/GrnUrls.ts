export const createdGrnListUrl = () => `marketing/supplier_po/grn/list/`

export const supplierPoListUrl = () => `supplier_po/spo/supplier_po/list/`

export const supplierPoMaterialDetailsUrl = (supplierPoId: number) => `supplier_po/spo/material/list/${supplierPoId}/`

export const createNewGrnUrl = () => `supplier_po/grn/create/`

export const grnMaterialDetailsURL = (grnId: number) => `supplier_po/grn/detail/${grnId}/`

export const updateGrnDetailsUrl = (grnId: number) => `supplier_po/grn/update/${grnId}/`

export const consumptionUnitsListUrl = () => `materials/consumption_units/` 

export const grnMetaDataURL = () => `supplier_po/grn/meta_data/`

export const fabricRollDefectSaveUrl = (materialId: number ) => `supplier_po/grn/material/detail/row/save/${materialId}/`

// export const deleteGrnAttachment = (grnId: number, attachmentId: number) => ``
//
// export const deleteGrnMaterialAttachment = (grnId: number, materialId: number, attachmentId: number) => ``;

export const grCodeGenerateURL = (material_id: number) => `supplier_po/grn/qr/create/${material_id}/`;

export const unassignedMaterialList = (grnId: number, supplier_po: string) => `marketing/supplier_po/grn/unassign_material/list/${grnId}/${supplier_po}/`;

export const assignedMaterialsToGrnURl = (grnId: number) => `marketing/supplier_po/grn/assign/material/${grnId}/`;

export const inlineRowDataSaveUrl = (grnMaterialDetailId: number) => `supplier_po/grn/material/detail/row/save/${grnMaterialDetailId}/`;

export const materialRowDeleteUrl = (rowMaterialId: number) => `marketing/supplier_po/grn/material/row/delete/${rowMaterialId}/`;

export const materialDetailRowDeleteUrl = (detailRowMaterialId: number) => `supplier_po/grn/material/detail/row/delete/${detailRowMaterialId}/`;

export const materialFileAttachmentUploadUrl = (grnId: number) => `marketing/supplier_po/grn/pack_list/template/upload/${grnId}/`;

export const materialTemplateDownloadUrl = (material_id: number) => `supplier_po/grn/pack_list/template/download/${material_id}/`;

export const subRowattachmentDeleteUrl = (attachmentId: number) => `marketing/${attachmentId}/`;

export const shadeListUrl = (batchNumber: number) => `supplier_po/grn/fabric/shade/list/${batchNumber}/`;

export const grnFabricMaterialSummaryUrl = (grnId: number) => `supplier_po/grn/fabric_width_shade/summary/list/${grnId}/`;

export const shadeGroupeDetailsUrl = (supplierPoMaterialId: number) => `supplier_po/grn/fabric/shade/list_by_batch/${supplierPoMaterialId}/`;

export const saveActualShadeGroupeUrl = (supplierMaterialCodeId: number) => `marketing/supplier_po/grn/fabric/shade/actual_shade/group/update/${supplierMaterialCodeId}/`;

export const actualShadeGroupDetailsUrl = (supplierPoMaterialId: number) => `marketing/supplier_po/grn/fabric/shade/actual_shade/list/${supplierPoMaterialId}/`;

export const actualShadeGroupAttachmentUploadUrl = (supplierMaterialCodeId: any) => `marketing/supplier_po/grn/fabric/shade/actual_shade/create_or_update/${supplierMaterialCodeId}/`;

export const grnActualShadeGroupAttachmentUploadUrl = () => `supplier_po/spo/fabric/shade/attachment/save/`;

export const actualShadeGroupDeleteUrl = (id: number, grnId: number) => `marketing/supplier_po/grn/fabric/shade/actual_shade/delete/${id}/${grnId}/`;

export const grnShadeGroupSummaryUrl = (grnId: number) => `supplier_po/grn/fabric/shade/summary/${grnId}/`;

export const clubShadeGroupSummaryUrl = (clubId: number) => `marketing/po_club/inhouse_material/material/fabric/shade/summery/${clubId}/`;

export const generalPOShadeGroupSummaryUrl = (generalPoId: number) => `supplier_po/general_po/fabric/shade_summary/${generalPoId}/`;

// TODO - move this to purchase order urls
export const poShadeGroupSummaryUrl = (poId: number) => `marketing/purchase_order/inhouse_material/material/fabric/shade/summery/${poId}/`;

export const clubBOMMaterialDetailsUrl = (clubId: number) => `marketing/po_club/inhouse_material/material/list_by_club/${clubId}/`;

export const clubInHouseMaterialDetailsUrl = (clubId: number, materialId: number) => `marketing/po_club/inhouse_material/material/detail/${clubId}/${materialId}/`;

export const fabricInspectionMaterialDetailsUrl = (grnId: number) => `supplier_po/grn/fabric/inspection/list/${grnId}`;

export const grnShadeSplitDetailsUrl = (shadeId: number) => `marketing/supplier_po/grn/fabric/shade/split/detail/${shadeId}/`;

export const actualShadeGroupRollDetailsUrl = (actual_group_shade: number) => `marketing/supplier_po/grn/fabric/roll/list_by_actual_shade/${actual_group_shade}/`;

export const grnShadeSplitDetailsSaveUrl = (batchId: number) => `marketing/supplier_po/grn/fabric/shade/split/create/${batchId}/`;

export const poInHouseMateriaDetailsUrl = (purchaseOrderId: number) => `marketing/purchase_order/inhouse_material/material/list_by_po/${purchaseOrderId}/`

export const poInHouseMateriaSubRowDetailsUrl = (purchaseOrderId: number, materialId: number) => `marketing/purchase_order/inhouse_material/material/detail/${purchaseOrderId}/${materialId}/`

export const purchaseOrderInhouseFabricSummaryUrl = (purchaseOrderId: number) => `marketing/purchase_order/inhouse_material/material/chart/summary/${purchaseOrderId}/`

export const filteredGrnDetailsListUrl = (selectedType: any) => `supplier_po/grn/dashboard/detail/?filter_type=${selectedType}`

export const grnDashboardDeliveryCountUrl = () => `supplier_po/grn/dashboard/counts/`;

export const MaterialQRCodeDetailsUrl = (grn_id: number) => `supplier_po/grn/fabric_detail/${grn_id}/`;

export const grnInspectionSummaryListUrl = (grnId: number) => `supplier_po/grn/fabric/inspection/summary/list/${grnId}`;

export const startInspectionItemURL = (grnId: number, materialId: number) => `marketing/supplier_po/grn/fabric/inspection/start/${grnId}/${materialId}/`

export const fabricShrinkageDetailsUrl = (grnId:number) => `marketing/supplier_po/grn/fabric/inspection/shrinkage/detail/${grnId}/`

export const fabricShrinkageUrlCreateUrl = (grnId:number)=> `marketing/supplier_po/grn/fabric/inspection/shrinkage/create/${grnId}/`

export const shrinkageTimeFrameDataUrl = () => `marketing/supplier_po/grn/fabric/inspection/shrinkage/time_frame/` 

export const grnSummaryRelatedToGrnIdAndURL = (grnId: number) => `marketing/supplier_po/grn/filter_list/grn/${grnId}/`;

export const grnSummaryRelatedToSupplierPoAndURL = (poId: number) => `marketing/supplier_po/grn/filter_list/supplier_po/${poId}/`;

export const packListDetailsUrlRelatedToInvoice = (invoiceId: number) => `marketing/supplier_po/grn/assign/material/${invoiceId}/`;

export const getSupplierPoDetailsURL = (supplierPoId: number) => `supplier_po/spo/delivery_date/detail/${supplierPoId}/`;

export const getMaterialsDetailsPoWiseURL = (supplierPoId: number, deliveryId: number) => `supplier_po/spo/delivery_date_material_summary/${deliveryId}/`;

export const getDDQandDDQIDetailsURL = (supplierPoId: number) => `supplier_po/spo/delivery_date/ddq_and_ddqi/detail/${supplierPoId}/`;

export const replacementsGRNsURL = (grnId: number) => `supplier_po/grn/replacement_grn/list/${grnId}/`;

export const poClubShadeListURL = (grnId: number) => `marketing/po_club/shade/list/${grnId}/`;

export const poClubShadeMappingDetailsURL = (grnId: number) => `supplier_po/grn/shade/mapping/list/${grnId}/`;

export const savePoClubShadeMappingDetailsURL = (grnId: number) => `supplier_po/grn/shade/mapping/save/${grnId}/`;
//leftover-verification URLS
export const leftoverVerificationStateDetailsURL = () => `materials/virtual_warehouse/left_over_material/state/list/`;

export const leftoverVerificationCountDetailsURL = () => `materials/virtual_warehouse/left_over_material/state/count/`;

export const leftoverVerificationListURL = (selectType: any) => `materials/virtual_warehouse/left_over_material/verification/list/?state=${selectType}`;

export const leftoverVerificationMaterialListURL = (verificationid: any) => `materials/virtual_warehouse/left_over_material/verification/material/list/${verificationid}/`;

export const plantWarehouseListURL = () => `materials/virtual_warehouse/warehouse_list/list/`;

export const leftoverVerificationDetailsSaveURL = (verificationId: any) => `materials/virtual_warehouse/left_over_material/verification_material/update/${verificationId}/`;

export const leftoverVerificationMaterialShadeListURL = (verificationMaterialId: any) => `materials/virtual_warehouse/left_over_material/shade/list/${verificationMaterialId}/`;

export const leftoverVerificationStateChangeURL = (verificationId: any) => `materials/virtual_warehouse/left_over_material/verification/${verificationId}/`;

export const grnQuantityAdjusmentDetailsURL = (grnId: number) => `supplier_po/grn/material/quantity_adjustment/detail/${grnId}/`;

export const grnQuantityAdjusmentDetailsUpdateURL = (grnId: number) => `supplier_po/grn/material/quantity_adjustment/update/${grnId}/`;

export const grnQuantityReCalculateURL = (grnId: number) => `supplier_po/grn/material/quantity_adjustment/recalculate/${grnId}/`;

export const grnStateChangeURL = (grnId: number) => `supplier_po/grn/move_to_next_state/${grnId}/`;

export const grnBasicDetailsURL = (grnId: number) => `supplier_po/grn/basic_detail/${grnId}/`;

export const warehouseBinLocationListURL = (searchText: any, selectedValue: any) => `warehouse/warehouse_rack_bin/paginated_list/?search_text=${searchText}&selected_value=${selectedValue}`;

export const grnBinLocationSaveURL = (grnId: number) => `supplier_po/grn/grn_material_detail/bin_location/update/${grnId}/`;

export const supplierPODeliveryDetails = (poClubId: number) => `supplier_po/grn/po_club/details/${poClubId}/`;

export const supplierPoDetails = (spoId: number) => `supplier_po/spo/supplier_po/detail/${spoId}/`;

export const supplierPoUpdate = (spoId: number) => `supplier_po/spo/supplier_po/update/${spoId}/`;

export const servicePoListURL = () => `service_po/spo/service_po/list/`;

export const servicePoMetaDataURL = () => `service_po/spo/service_po_meta_data/`;

export const servicePoDetails = (servicePoId: number) => `service_po/spo/service_po/detail/${servicePoId}/`;

export const servicePoUpdate = (servicePoId: number) => `service_po/spo/service_po/update/${servicePoId}/`;