export const vehicleTypeURL  = (vehicleTypeId: number) => `transport/vehicle_type/edit/${vehicleTypeId}`;

export const vehicleTypesURL  = () => `transport/vehicle_type/list/`;

export const createVehicleTypeURL  = () => `transport/vehicle_type/create/`;

export const updateVehicleTypeURL  = (vehicleTypeId: number) => `transport/vehicle_type/edit/${vehicleTypeId}`;

export const transportTypeURL  = (transportTypeId: number) => `transport/transport_type/edit/${transportTypeId}`;

export const transportTypesURL  = () => `transport/transport_type/list`;

export const createTransportTypeURL  = () => `transport/transport_type/create/`;

export const updateTransportTypeURL  = (transportTypeId: number) => `transport/transport_type/edit/${transportTypeId}`;

export const portURL  = (portId: number) => `shared/port/edit/${portId}`;

export const portsURL  = () => `shared/port/list/`;

export const createPortURL  = () => `shared/port/create/`;

export const updatePortURL  = (portId: number) => `shared/port/edit/${portId}`;

export const plantURL  = (plantId: number) => `shared/plant/${plantId}/`;

export const plantsURL  = () => `shared/plant/list/`;

export const createPlantURL  = () => `shared/plant/create/`;

export const updatePlantURL  = (plantId: number) => `shared/plant/${plantId}/`;

export const exWorkChargeURL  = (exWorkChargestId: number) => `/transport/transport_ex_work_charge/detail/${exWorkChargestId}`;

export const exWorkChargesURL  = () => `/transport/transport_ex_work_charge/list/`;

export const createExWorkChargeURL  = () => `/transport/transport_ex_work_charge/create/`;

export const createExWorkChargeNameURL  = () => `/transport/transport_ex_work_charge_name/create/`; 

export const updateExWorkChargeNameURL  = (exWorkNameId: number) => `/transport/transport_ex_work_charge_name/edit/${exWorkNameId}`; 

export const updateExWorkChargeURL  = (exWorkChargestId: number) => `/transport/transport_ex_work_charge/update/${exWorkChargestId}`;

export const exWorkChargesMetaDataURL = () => `transport/transport_ex_work_charge/meta_data/`

export const locationCountriesURL  = () => `shared/location_country/list/`;

export const supplierDeliveryListUrl  = () => `transport/supplier_delivery/list/`;

export const transportDeliveryDateTrackingCreateUrl = () => `transport/transport_tracking/create/`;

export const transportDeliveryDateTrackingChangeCreateUrl = (change_request:any,split_from:any) => `transport/transport_tracking/create/?change_request=${change_request}&split_from=${split_from}`;

export const transportDeliveryDateTrackingMetaData = () => `transport/transport_tracking/meta/data/`;

export const transportDeliveryDateTrackingListUrl = (transport_type:any,filter_type:any,searched_text:any,page_number:any,rows_per_page:any) => `transport/transport_tracking/list/?transport_type=${transport_type}&filter_type=${filter_type}&searched_text=${searched_text}&page=${page_number}&page_size=${rows_per_page}`;

export const transportDeliveryCounts = () => `transport/delivery_counts/`;

export const transportDeliveryDateTrackingDetail  = (transportTrackingId: number) => `/transport/transport_tracking/detail/${transportTrackingId}`;

export const transportDeliveryDateTrackingUpdate  = (transportTrackingId: number) => `/transport/transport_tracking/update/${transportTrackingId}/`;

export const transportPoClubPendingDeliveries  = (po_club_id: number) => `/transport/po_club/pending/deliveries/${po_club_id}`;

export const transportPoClubPlanActualDetails  = (po_club_id: number,material_type:any) => `/transport/po_club/plan/actual/${po_club_id}/?material_type=${material_type}`;

export const deliveryTransportTypeList = () => `transport/tracking/delivery_transport_type/list/`;

export const LclDeliveryTransportTypeList  = (vehicle_type: any) => `/transport/tracking/delivery_transport_type/list/?vehicle_type=${vehicle_type}`;

export const deliveryTransportTypeVehicleCreate = () => `transport/tracking/local/delivery/create/`;

export const deliveryTransportTypeVehicleDetail  = (transportVehicleTrackingId: number) => `transport/tracking/local/delivery/detail/${transportVehicleTrackingId}`;

export const deliveryTransportTypeVehicleUpdate  = (transportVehicleTrackingId: number) => `transport/tracking/local/delivery/update/${transportVehicleTrackingId}/`;

export const localDeliveryCount = () => `transport/local_delivery_counts/`;

export const localDeliveryTransportTrackingDetail  = (transportVehicleTrackingId: number) => `transport/tracking/local/delivery/detail/${transportVehicleTrackingId}`;

export const freightforwarderListURL  = () => `transport/freight_forwarder/list/create/`;

export const createSupplierUrl = (forwardertype: string) => `transport/freight_forwarder/list/create/?forwarder_type=${forwardertype}`;

export const SupplierListUrl = (forwardertype: string) => `shared/supplier/list/?supplier_type=${forwardertype}`;

export const countryPortListUrl = () => `transport/freight_forwarder/country/port/list/`;

export const createFreightForwarderPortURL = (forwarderid: number) => `transport/freight_forwarder_port/list/create/${forwarderid}/`;

export const createWarehouseUrl = (forwarderid: number) => `transport/freight_forwarder_warehouse/list/create/${forwarderid}/`;

export const updateWarehouseUrl = (freightforwarderwarehouseid:number) => `transport/freight_forwarder_warehouse/edit/${freightforwarderwarehouseid}/`;

export const deletePortUrl = (freightforwarderportid:number , portid:number) => `transport/freight_forwarder_port/delete/${freightforwarderportid}/${portid}/`;

export const freightForwardePortCalanderUrl = (freightforwarderid: number, portid: number) => `transport/freight_forwarder_port_calander/list/${freightforwarderid}/${portid}/`;

export const createFreightForwarderCutoffDatesUrl = (forwarderid: number, portid: number) => `transport/freight_forwarder_port_calander/create/${forwarderid}/${portid}/`;

export const deleteFreightForwarderCutoffDateUrl = (freightforwarderportcalanderid: number) => `transport/freight_forwarder_port_calander/delete/${freightforwarderportcalanderid}/`

export const transportDeliveryDateTrackingMergeListUrl  = (merge_from_id: number) => `transport/transport_tracking/list/?merge_from_id=${merge_from_id}`;

export const mergeSupplierDeliveryDateUrl  = (transport_delivery_date_id: number) => `transport/merge_supplier_delivery_dates/${transport_delivery_date_id}/`;

export const mergeContainersUrl = (local_delivery_tracking_id:number) => `transport/merge_containers/${local_delivery_tracking_id}/`;

export const localDeliveryTransportTrackingMergeList = (merge_from_id:number) => `transport/tracking/local/delivery/list/?merge_from_id=${merge_from_id}`;

export const LocaltransportDeliveryDateTrackingChangeCreateUrl = (change_request:any,split_from:any) => `transport/tracking/local/delivery/create/?change_request=${change_request}&split_from=${split_from}`;

export const localDeliveryTransportTrackingList = (pageNumber: number, pageSize: number, state: any, optionalParams?: string) => {
    let url = `transport/tracking/local/delivery/list/?page=${pageNumber}&page_size=${pageSize}&state=${state}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};
export const changeTransportStateURL = (transportTrackingId: number, state: string) => `transport/tracking/state/change/${transportTrackingId}/?state=${state}`;

export const  commercialinvoicesURL = (transportTrackingId: number) => `transport/tracking/invoice/list/${transportTrackingId}/`;

export const  getchargersURL = (transportTrackingId: number) => `transport/tracking/charges/list/${transportTrackingId}/`;

export const saveChargesURL = (deliverytrackingid:number , chargeType: string, transportTypeId: string) => `transport/tracking/charge/update_create/${deliverytrackingid}/?charge_type=${chargeType}&delivery_transport_type_id=${transportTypeId}`;

export const copyChargersURL = (deliverytrackingid:number) => `transport/tracking/transport_type_charge/copy/${deliverytrackingid}/`;

export const getDeliveryTransportTypeListURL = (deliverytrackingid:number) => `transport/tracking/delivery_transport_type/list/${deliverytrackingid}/`;

export const getContanierwithchargersURL = (transportTrackingId: number, chargeType: string, transportTypeId: string = '') => `transport/tracking/charges/list/${transportTrackingId}/?charge_type=${chargeType}&delivery_transport_type_id=${transportTypeId}`;

export const transportFixedChargeMetaData = () => `transport/fixed_charge/meta/data/`;

export const transportFixedChargeNameCreate = () => `transport/fixed_charge_name/create/`;

export const transportFixedChargeCreate = () => `transport/fixed_charge/create/`;

export const transportFixedChargeList = () => `transport/fixed_charge/list/`;

export const transportFixedChargeDetail = (id:number) => `transport/fixed_charge/detail/${id}/`;

export const transportFixedChargeUpdate = (id:number) => `transport/fixed_charge/update/${id}/`;

export const transportPerUnitChargeMetaData = () => `transport/per_unit_charge/meta/data/`;

export const transportPerUnitChargeNameCreate = () => `transport/per_unit_charge_name/create/`;

export const transportPerUnitChargeCreate = () => `transport/per_unit_charge/create/`;

export const transportPerUnitChargeNameList = () => `transport/per_unit_charge/list/`;

export const transportPerUnitChargeDetail = (id:number) => `transport/per_unit_charge/detail/${id}/`;

export const transportPerUnitChargeUpdate = (id:number) => `transport/per_unit_charge/update/${id}/`;

export const vehicleTypeMetaData = () => `transport/vehicle_type/meta_data/`;
