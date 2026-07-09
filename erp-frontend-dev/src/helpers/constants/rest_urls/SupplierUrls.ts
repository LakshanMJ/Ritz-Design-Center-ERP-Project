export const getSupplierRepliesURL = (versionId: number) => `materials/supplierinquiry/list/${versionId}`;

export const getQueuedEmailCountURL = (versionId: number) => `materials/pending_emails/list/${versionId}`;

export const getActiveSuppliersURL = () => `shared/supplier/list/`;

export const getConsumptionUnits = () => `materials/consumption_units/`;

export const getAllMaterialInfoURL = (versionId: number) => `marketing/version_material/details/${versionId}`;

export const sendSupplierInquriesURL = (versionId: number) => `materials/supplierinquiry/create/${versionId}`;

export const updateQueuedEmailsURL = (versionId: number) => `materials/supplier_inquiry/set_state_queued/${versionId}`;

export const getInquiriesBySupplierIdURL = (versionId: number, supplierId: number) => `materials/supplierinquiry/list/${versionId}/${supplierId}`;

export const updateSupplierInquiryDataURL = (orderID: number) => `materials/supplierinquiry/update/${orderID}`;//

export const manualCostEntryURL = (versionId: number) => `materials/manual_supplier_inquiry/update/${versionId}`;

export const deleteSupplierInquiryDetailUrl = (versionId: number, suppInqDetailId: number) => `materials/supplierinquiry/delete/${versionId}/${suppInqDetailId}`;

// export const getSupplierFeedbackGraphURL = (orderID: number, material_id: number, variation_id: number) => `materials/supplierinquiry/graph/${orderID}?material_id=${material_id}&variation_id=${variation_id}`;

export const supplierInquaryCompleteStateURL = (versionId: number) => `marketing/order/supplier_inquiry/complete_status/${versionId}`;

export const deleteSupplierInquiryURL = (supplierInquiryDetailId: number) => `materials/supplierinquiry_detail/delete/${supplierInquiryDetailId}`;

//Supplier profile URLs
export const supplierContactPeopleUrl = () => `shared/supplier/contact_person/list_create/`

export const createSupplierContactPersonUrl = () => `shared/supplier/contact_person/list_create/`

export const updateSupplierContactPersonUrl = (supplierPersonId: number) => `shared/supplier/contact_person/${supplierPersonId}/`

export const supplierContactPersonUrl = (supplierPersonId: number) => `shared/supplier/contact_person/${supplierPersonId}/`

export const assignSupplierCustomerBrandsUrl = () => `shared/supplier/customer_brand/`

export const unassignedCustomerBrandListUrl = (supplierId: any) => `shared/supplier/${supplierId}/customer-brands/`

export const deleteAssignedSupplierCustomerBrandsUrl = (customerBrandId: number) => `shared/supplier/customer_brand/delete/${customerBrandId}/`

export const deleteAssignedSupplierMaterialsUrl = (materialId: number, supplierId:  number) => `shared/supplier/material/delete/${supplierId}/${materialId}/`

export const supplierLocationsUrl = () => `shared/supplier_location/list/`

export const createSupplierLocationUrl = () => `shared/supplier_location/create/`

export const updateSupplierLocationsUrl = (location_id: number) => `shared/supplier_location/edit/${location_id}`

export const supplierLocationUrl = (location_id: number) => `shared/supplier_location/edit/${location_id}`

export const supplierLocationCountriesUrl = () => `shared/location_country/list/?include_inactive=false`

export const assignsupplierMaterialUrl = () => `shared/supplier/material/`

export const supplierMetaDataUrl = () => `shared/supplier/meta_data/`

export const supplierUnassignedMaterialUrl = (supplier_id: number) => `shared/supplier/${supplier_id}/materials/`

export const getCostPerUnitTypesURL = () => `shared/cost_per_unit_type/list/`;

export const getTransportTypesURL = () => `shared/transport_type/list/`;

export const supplierInquirySendEmailURL = () => `marketing/consolidate/supplier_inquiry/move_state/`;