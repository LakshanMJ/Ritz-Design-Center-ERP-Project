

export const PlantWiseCustomerList = () => `materials/virtual_warehouse/plant/customer/list/`

export const orderSpecificMaterialsListURL = (club_id: number, specific_status: any) => `materials/virtual_warehouse/order_specific_materials/list/${club_id}/?specific_status=${specific_status}`;

export const allPlantsMaterialsListURL = (
    sorting_field:any,
    descending:any,
    searched_text: any, 
    searched_field: any,  
    customer_id: any, 
    material_category: any, //fabric, sewing
    plant_id: any, 
    specific_status: any,
    page_number:any, 
    rows_per_page: any, 
    
    
  ) => searched_field 
    ? `materials/virtual_warehouse/material/all_plant_customer/list/?searched_text=${searched_text}&searched_field=${searched_field}&customer_id=${customer_id}&material_category=${material_category}&plant_id=${plant_id}&specific_status=${specific_status}&page_size=${rows_per_page}` 
    : (sorting_field && descending)
      ? `materials/virtual_warehouse/material/all_plant_customer/list/?sorting_field=${sorting_field}&descending=${descending}&customer_id=${customer_id}&material_category=${material_category}&plant_id=${plant_id}&specific_status=${specific_status}&page=${page_number}&page_size=${rows_per_page}` 
      : `materials/virtual_warehouse/material/all_plant_customer/list/?customer_id=${customer_id}&material_category=${material_category}&plant_id=${plant_id}&specific_status=${specific_status}&page=${page_number}&page_size=${rows_per_page}`;

export const virtualWarehousePathLoadingDetailsURL = (inhouseMaterialId: number) => `materials/virtual_warehouse/page_loading_detail/${inhouseMaterialId}`;

export const MaterialSummarybyCustomerURL = (customerId: any, category: any, costingId:any , poClubId:any ,pageNumber: number, pageSize: number) =>
  `warehouse/warehouse_finance_customer_costing_details/?customer=${customerId}&costing=${costingId}&po_club=${poClubId}&category=${category}&page=${pageNumber}&page_size=${pageSize}`;

export const CustomerCostingIdsURL = (customerId: any ,search:any ,pageSize: number ,page:any ) => `warehouse/customer_costing_versions/?customer=${customerId}&search=${search}&page=${page}&page_size=${pageSize}`;

export const CustomerCostingActualPoClubURL = (customerId: any , costingId:any , search:any , pageSize: number ,page:any ) => `warehouse/customer_costing_po_clubs/?customer=${customerId}&costing=${costingId}&search=${search}&page=${page}&page_size=${pageSize}`;

export const warehouseCustomerDetailsURL = (warehouseId:any , pageNumber: number, pageSize: number) => `warehouse/warehouse_customer_detail/?warehouse=${warehouseId}&category=fabric&page=${pageNumber}&page_size=${pageSize}`;

export const warehouseCustomerCostingDetails = (warehouseId:any , customerId:any , pageNumber: number, pageSize: number) => `warehouse/warehouse_customer_costing_detail/?warehouse=${warehouseId}&category=fabric&customer=${customerId}&page=${pageNumber}&page_size=${pageSize}`;

export const warehouseCustomerCostingPoClubDetails = (warehouseId:any , customerId:any , costingId:any , pageNumber: number, pageSize: number) => `warehouse/warehouse_customer_costing_po_club_detail/?warehouse=${warehouseId}&category=fabric&customer=${customerId}&costing=${costingId}&page=${pageNumber}&page_size=${pageSize}`;

export const WarehouseCustomerCostingPoClubMaterialDetails = (warehouseId:any , customerId:any , costingId:any , poClubId:any , pageNumber: number, pageSize: number) => `warehouse/warehouse_customer_costing_po_club_material_detail/?warehouse=${warehouseId}&category=fabric&customer=${customerId}&costing=${costingId}&po_club=${poClubId}&page=${pageNumber}&page_size=${pageSize}`;

export const customerwisecostingURL = (customerId:any) => `warehouse/customer_costing_versions/?customer=${customerId}`;
//for warehouse Rack Bins
export const warehouseRackBinsListURL = (selectedRackBinsId:any) => `warehouse/warehouse_rack_details/${selectedRackBinsId}/`;
export const createWarehouseRackBinsURL = () => `warehouse/warehouse_rack_bin/create/`;
export const editWarehouseRackBinsURL = (selectedRackDetailId: any) => `warehouse/warehouse_rack_bin/update/${selectedRackDetailId}/`;
export const deleteWarehouseRackBinsURL = (selectedRackBinsId:any) => `warehouse/warehouse_rack_bin/delete/${selectedRackBinsId}/`;

//for warehouse Rack
export const warehouseRackListURL = (warehouseId:any) => `warehouse/warehouse_rack/list/${warehouseId}`;
export const editWarehouseRackURL = (selectedRackDetailId: any) => `warehouse/warehouse_rack/update/${selectedRackDetailId}/`;
export const createWarehouseRackURL = () => `warehouse/warehouse_rack/create/`;
export const deleteWarehouseRackURL = (selectedRackDetailId: any) => `warehouse/warehouse_rack/delete/${selectedRackDetailId}/`;

//for warehouse List
export const warehouseListURL = () => `warehouse/warehouse/list/`;
export const createWarehouseListURL = () => `warehouse/warehouse/create/`;
export const editWarehouseListURL = (selectedWarehouseListId: any) => `warehouse/warehouse/update/${selectedWarehouseListId}/`;

//for warehouse details
export const warehouseDetailsURL = (warehouseId: any) => `warehouse/warehouse_details/${warehouseId}/`;
export const warehouseAssignRackURL = (warehouseId: any) => `warehouse/warehouse_rack_bin/list/${warehouseId}`;
export const warehouseAssignRackCreateURL = () => `warehouse/plant_warehouse_rack_bin_customer_allocation/`;


export const InHouseMaterialListURL = (category:any , page:any ,pageSize: number ) => `warehouse/inhouse_material_detail/list/?category=${category}&page=${page}&page_size=${pageSize}`;

export const InHouseMaterialCreateURL = () => `warehouse/inhouse_material_detail/create/`;
export const InHouseMaterialUpdateURL = (inhouseMeterialId: any) => `warehouse/inhouse_material_detail/update/${inhouseMeterialId}/`;
export const InHouseMaterialDeleteURL = (inhouseMeterialId: any) => `warehouse/inhouse_material_detail/delete/${inhouseMeterialId}/`;
export const SupplierInquiryMaterialCodeURL = (category:any,searchText: any , selectedValue:any) => `warehouse/supplier_inquiry_material_codes/list/?category=${category}&search=${searchText}&id=${selectedValue}`;
export const CustomerBrandMaterialCodeURL = (category:any ,searchText: any , selectedValue:any)=> `warehouse/customer_brand_material_codes/list/?category=${category}&code=${searchText}&id=${selectedValue}`;
export const PurcahseOrderAlloactionListURL = (category:any ,inhouseMeterialId: any , page:any ,pageSize: number) => `warehouse/purchase_order_allocation/list/?category=${category}&inhousematerial=${inhouseMeterialId}&page=${page}&page_size=${pageSize}`;
export const PurchaseOrderAllocationCreateURL = () => `warehouse/purchase_order_allocation/create/`;
export const PurchaseOrderAllocationUpdateURL = (id: any) => `warehouse/purchase_order_allocation/update/${id}/`;
export const PurchaseOrderAllocationDeleteURL = (id: any) => `warehouse/purchase_order_allocation/delete/${id}/`;
export const CustomerBrandMaterialListURL = (inHouseMaterialId: any ,searchText:any ,purchaseOrderId:any, id:any) => `warehouse/customer_brand_material/list/?in_house_material=${inHouseMaterialId}&customer_brand_material_code=${searchText}&purchase_order=${purchaseOrderId}&customer_brand_material=${id}`;
export const PurchaseOrderListURL = (category:any , customerBrandMaterial:any ,searchText:any,purchaseOrderId:any) => `warehouse/purchase_order/list/?category=${category}&customer_brand_material=${customerBrandMaterial}&po=${searchText}&po_id=${purchaseOrderId}`;



