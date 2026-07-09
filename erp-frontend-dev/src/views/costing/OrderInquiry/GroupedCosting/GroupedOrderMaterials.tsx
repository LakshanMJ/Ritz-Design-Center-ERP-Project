import {
    Table,
    TableContainer,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Card,
    Tooltip,
    Box, Paper, Grid, CardHeader, Button, IconButton, useMediaQuery, useTheme, Typography, Radio, Link,
    Alert
} from "@mui/material";
import {useEffect, useState} from "react";
import api from "@/services/api";
import {performCostingURL} from "@/helpers/constants/RestUrls";
import { toast } from 'react-hot-toast';
import {getDefaultError, getNumberDisplayValue} from '@/helpers/Utilities';
import InfoIcon from '@mui/icons-material/Info';
import * as React from "react";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import DefaultLoader from "@/components/DefaultLoader";
import PackOrPackItemCost from "@/views/costing/OrderInquiry/Material/CostTable";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import MaterialNavigation from "@/views/costing/OrderInquiry/Material/MaterialNavigation";
import * as restUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import {
    PENDING_CONSUMPTION_DATA_VERSION_STATE,
    PENDING_MATERIALS_VERSION_STATE, PENDING_SUPPLIER_SELECTION_VERSION_STATE
} from "@/helpers/constants/CostingStates";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import * as appUrls from "@/helpers/constants/FrontEndUrls";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import {DEFAULT_SUCCESS, ORDER_PACK_ITEM_EMB_SERVICE_TYPE, ORDER_PACK_ITEM_WASH_SERVICE_TYPE, VALIDATION_ERROR_CODE} from "@/helpers/constants/Constants";
import GroupedSizeCosting from "@/views/costing/OrderInquiry/GroupedCosting/GroupedCostingSummary";
import GroupedServiceCosts from "@/views/costing/OrderInquiry/GroupedCosting/GroupedServiceCosts";
import GroupedOtherCosts from "@/views/costing/OrderInquiry/GroupedCosting/GroupedOtherCosts";
import supplier from "@/pages/admin/supplier";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import RitzModal from "@/components/Ritz/RitzModal";
import EditMaterial from "@/views/costing/OrderInquiry/Material/EditMaterial";
import AddPackagingPlacement from "@/views/costing/AddPackagingPlacement";
import {OrderPackItemPlacementHelper, OrderPackPlacementHelper} from "@/helpers/costings/materials/MaterialFieldHelper";
import AddPlacement from "@/views/costing/AddPlacement";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import SaveSpinner from "@/components/SaveSpinner";
import GroupedPackItemsOperations from "@/views/costing/OrderInquiry/GroupedCosting/GroupedIEOperations";
import ShowMaterialReferenceCode from "@/views/costing/OrderInquiry/Material/ShowReferenceCode";
import NextLink from "next/link";
import DisplayCostingServiceData from "../Service/ServiceDisplay";
import EditPackItemWashService from "../Service/EditPackItemWashService";
import EditPackItemEMBService from "../Service/EditPackItemEMBService";
import AddOtherCosts from "../OrderPack/AddOtherCosts";
import RitzSwitch from "@/components/Ritz/RitzSwitch";
import CompletedStatus from "../Material/CompletedStatus";
import CompletedStatusOrderSizeGroupPacks
    from "@/views/costing/OrderInquiry/Material/CompletedStatusOrderSizeGroupPacks";
import CircularLoader from "@/components/CircularLoader";


const ASSIGN_MATERIAL_MODAL = 'assign_material';
const ADD_MATERIAL_PLACEMENT_MODAL = 'add_placement';
const ADD_MATERIAL_PACKAGING_MODAL = 'add_packaging';
const DELETE_PLACEMENT_MODAL = 'delete_placement';
const washServiceType = ORDER_PACK_ITEM_WASH_SERVICE_TYPE;
const embServiceType = ORDER_PACK_ITEM_EMB_SERVICE_TYPE;


const EditDialog = (props: any) => {
    const onClose = () => {
        props?.setOpen(false);
    }

    const openAssignMaterial = (materialData: any, postData: any) => {
        props.createPlacementToggleAssignMaterial(materialData, postData, props.component_type);
    }
    return (
        <RitzModal
            title={props?.title}
            open={props?.open}
            onClose={onClose}
            maxWidth='lg'
            fullWidth={true}
        >
            { props.component_type == ASSIGN_MATERIAL_MODAL && <EditMaterial
                drawerData={props?.drawerData}
                materialHelper={props?.materialHelper}
                saveURL={props?.saveURL}
                orderPackType={props?.orderPackType}
                setUpdated={props?.setOpen}
                groupedData={true}
                />
            }

            { props.component_type == ADD_MATERIAL_PLACEMENT_MODAL &&
                // sizeId, countryId, colorwayId, colorwayTypeId,
                <AddPlacement
                    orderId={props?.orderId}
                    type={'individual'}
                    itemId={props?.itemId || null}//orderItemID
                    itemItemId={props?.itemItemId}//ItemID
                    placementOther={props?.otherplacement}
                    setUpdated={props?.setOpen}
                    // packItemId={parseInt(props?.packItemId)}
                    versionId={props?.versionId}
                    materialType={props?.materialType}
                    orderSizeGroupId={props.orderSizeGroupId}
                    orderCountryId={props.orderCountryId}
                    orderColorwayId={props.orderColorwayId}
                    materialTypeId={props.materialTypeId}
                    openAssignMaterial={openAssignMaterial}
                />

            }

            {
                props.component_type == ADD_MATERIAL_PACKAGING_MODAL &&

                    <AddPackagingPlacement
                        orderId={props?.orderId}
                        type={'individual'}
                        sizeId={props?.materialTitle?.size}
                        countryId={props?.materialTitle?.country}
                        colorwayId={props?.materialTitle?.colorway}
                        placementOther={props?.otherplacement}
                        setUpdated={props?.setUpdated}
                        versionId={props?.versionId}
                        materialType={props?.materialType}
                        orderSizeGroupId={props.orderSizeGroupId}
                        orderCountryId={props.orderCountryId}
                        orderColorwayId={props.orderColorwayId}
                        materialTypeId={props.materialTypeId}
                        openAssignMaterial={openAssignMaterial}
                    />
            }
        </RitzModal>
    )
}
const DeleteDialog = (props: any) => {
    const onClose = () => {
        props?.setOpen(false);
    }

    let deleteApi: string;
    if (props.component_type == ADD_MATERIAL_PLACEMENT_MODAL) {
        deleteApi = costingRestUrls.deletePackItemGroupOtherPlacement(props?.versionId, props.orderColorwayId, props.orderCountryId, props.orderSizeGroupId, props.itemId, props.placementId);
    }
    else {
        deleteApi = costingRestUrls.deletePackGroupOtherPlacement(props?.versionId, props.orderColorwayId, props.orderCountryId, props.orderSizeGroupId, props.placementId);
    }

    const [isSaving, setIsSaving] = useState(false);

    const onDelete = () => {
        setIsSaving(true);
        api.delete(deleteApi).then(() => {
            props?.setOpen(true)
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    };

    return (
        <RitzModal
            title={props?.title}
            open={props?.open}
            onClose={onClose}
            maxWidth='xs'
        >
            Are you sure you want to delete this Placement ?
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button  variant='contained'  onClick={onDelete} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Delete
                </Button>
            </Box>
        </RitzModal>
    )
}
const SizeGroupPackMaterials = ({ versionId, orderId,  orderColorwayId, orderCountryId, orderSizeGroupId}: any) => {
    const dataKey = 'data';
    const cadDataKey = 'cad_data';
    const headerKey = 'headers';
    const labelKey = 'label';
    const nameKey = 'name';
    const displayNameKey = 'display_name';
    const supplierInquiryHeaderKey = 'supplier_inquiry_headers';
    const sizeHeadersKey = 'size_headers';
    const supplierInquiryDataKey = 'supplier_inquiries';
    const packIdKey = 'pack_id';
    const consumptionDataKey = 'consumption_data';
    const consumptionRatioKey = 'consumption_ratio';
    const wastageKey = 'wastage';
    const supplierInquiryMaterialCostDataKey = 'supplier_inquiry_material_cost_data';
    const totalCostKey = 'total_cost';
    const packItemDataKey = 'pack_item_data';
    const packagingDataKey = 'packaging_data';
    const customerBrandMaterialIdKey = 'customer_brand_material_id';
    const itemServiceIdKey = 'item_service_id';
    const materialIdKey = 'material_id';
    const orderPlacementMaterialIdKey = 'order_placement_material_id';
    const materialSupplierInquiriesKey = 'material_supplier_inquiries';
    const serviceSupplierInquiriesKey = 'service_supplier_inquiries';
    const supplierInquiryIdKey = 'supplier_inquiry_detail_id';
    const serviceCostsKeys = 'service_costs';
    const otherServiceCostKeys = 'other_costs';
    const materialNameKey = 'material_name';
    const materialDisplayNameKey = 'display_name';
    const modalOpenKey = 'open';
    const idKey = 'id';
    const sizeGroupColorwayKey = 'sizeGroupColorway';
    const orderPlacementIdKey = 'order_placement_id';
    const orderItemIdKey = 'order_item_id';
    const itemIdKey = 'item_id';
    const orderPackItemType = 'packitem';
    const orderPackType = 'pack';

    const packItemPlacementIdKey = 'pack_item_placement_id';

    const [packItemMaterialData, setPackItemMaterialData] = useState<any>({});
    const [packagingMaterialData, setPackagingMaterialData] = useState<any>({});
    const [itemServiceCosts, setItemServiceCosts] = useState({});
    const [supplierInquiryHeaders, setSupplierInquiryHeaders] = useState([]);
    const [packOtherCosts, setPackOtherCosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [navigationData, setNavigationData] = useState<any>({});
    const [versionData, setVersionData] = useState<any>({});
    const [materialSupplierInquiry, setMaterialSupplierInquiry] = useState<any>({});
    const [serviceSupplierInquiry, setServiceSupplierInquiry] = useState({});
    const [materialTitle, setMaterialTitle] = useState<any>({});
    const [showConsumptionRatios, setShowConsumptionRatios] = useState(false);
    const [markedAsComplete, setMarkedAsComplete] = useState(false);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));
    const keyHelper = new ReactKeyHelper();
    const editableMaterial = versionData?.version_state?.value == PENDING_MATERIALS_VERSION_STATE;
    const [serviceData, setServiceData] = useState({});
    const [openServiceNewForm, setOpenServiceNewForm] = useState<any>({open: false, serviceType: null});
    // Modal related stuff
    const [modalData, setModalData]:any = useState({[modalOpenKey]: false});
    const [deleteModalData, setDeleteModalData]:any = useState({[modalOpenKey]: false});
    const [openOtherCostModal, setOpenOtherCostModal] = useState(false);
    const [isCalaculatingData, setIsCalaculatingData] = useState(false);
    const [costingRecalculateErrors, setCostingRecalculateErrors] = useState<any>({});

    useEffect(() => {
        if (versionId && orderId && orderColorwayId && orderCountryId && orderSizeGroupId) {
            refreshMaterialData();
        }
    }, [versionId, orderId,  orderColorwayId, orderCountryId, orderSizeGroupId]);

    useEffect(() => {
        const sizeGroup = navigationData?.order_pack_size_groups?.find((orderPackSizeGroupData: any) => {
            return orderPackSizeGroupData?.size_group_id == orderSizeGroupId && orderPackSizeGroupData?.order_country.id == orderCountryId &&  orderPackSizeGroupData?.order_colorway.id == orderColorwayId;
        });

        let title = {
            sizeGroupColorway: sizeGroup?.order_colorway,
            sizeGroupCountry: sizeGroup?.order_country,
            sizeGroupSizes: sizeGroup?.order_sizes,
        };

        // country_name, colorway name, size_name,
        setMaterialTitle({ ...title });

    }, [navigationData]);

    const flattenSupplierInquiries = (materialSupplierInquiryData: any, fieldName: any) => {
        const inquiryData = {} as any;
        materialSupplierInquiryData.map((materialSupplierInquiry: any) => {
            inquiryData[materialSupplierInquiry[fieldName]] = materialSupplierInquiry[supplierInquiryIdKey];
        });
        return inquiryData;
    }

    const handleSupplierSelect = (materialRow: any, supplierInquiry: any) => {
        const materialData = {...materialSupplierInquiry} as any
        materialData[materialRow[materialIdKey]] = supplierInquiry[supplierInquiryIdKey];
        setMaterialSupplierInquiry(materialData);
        saveMaterialSupplierInquiry({[customerBrandMaterialIdKey]: materialRow[materialIdKey], [supplierInquiryIdKey]: supplierInquiry[supplierInquiryIdKey]});
    }

    const handleServiceSupplierSelect = (packItemServiceId: number, supplierInquiryId: number) => {
        setServiceSupplierInquiry({...serviceSupplierInquiry, [packItemServiceId]: supplierInquiryId});

        const saveData = { [itemServiceIdKey]: packItemServiceId, [supplierInquiryIdKey]: supplierInquiryId, 'is_service': true };
        saveMaterialSupplierInquiry(saveData);
    }

    const saveMaterialSupplierInquiry = (payLoad: any) => {
        const apiPayLoad = {[dataKey]: [payLoad]};
        const saveUrl = costingRestUrls.colorwaySupplierMaterialURL(orderId, versionId, orderColorwayId);

        api.post(saveUrl, apiPayLoad).then(resp => {
           toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        });
    }
    const refreshMaterialData = () => {
        setIsLoadingMaterial(true);
        const requests = [
            api.get(costingRestUrls.packMaterialSummaryURL(orderId, versionId, orderCountryId, orderColorwayId, orderSizeGroupId)),
            api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId)),
            api.get(restUrls.updateDetailVersionURL(orderId, versionId)),
            api.get(costingRestUrls.packItemWashListURL(orderId)),
            api.get(costingRestUrls.packItemEmbellishmentServiceList(orderId)),
        ];

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [orderObjMaterialData, navData, versionData, washData, embellishmentData] = respData;
            setPackItemMaterialData(orderObjMaterialData?.[packItemDataKey] || {});
            setPackagingMaterialData(orderObjMaterialData?.[packagingDataKey] || {});
            setPackOtherCosts(orderObjMaterialData?.[otherServiceCostKeys] || []);
            setItemServiceCosts(orderObjMaterialData?.[serviceCostsKeys] || {});
            setSupplierInquiryHeaders(orderObjMaterialData?.[supplierInquiryHeaderKey] || []);
            setNavigationData(navData);
            setVersionData(versionData);
            const serviceDataDict:any = {
                [washServiceType]: washData,
                [embServiceType]: embellishmentData,
            }
            setServiceData(serviceDataDict);
            setMarkedAsComplete(orderObjMaterialData?.['marked_as_complete'] || false);
            const materialSupplierInquiryData = flattenSupplierInquiries(orderObjMaterialData?.[materialSupplierInquiriesKey], customerBrandMaterialIdKey);
            setMaterialSupplierInquiry(materialSupplierInquiryData);
            const serviceSupplierInquiryData = flattenSupplierInquiries(orderObjMaterialData?.[serviceSupplierInquiriesKey], itemServiceIdKey);
            setServiceSupplierInquiry(serviceSupplierInquiryData);

            const showConsumptionRatiosData = ![PENDING_MATERIALS_VERSION_STATE, PENDING_CONSUMPTION_DATA_VERSION_STATE].includes(versionData?.['version_state']?.['value']) || false;
            setShowConsumptionRatios(showConsumptionRatiosData);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingMaterial(false)
        });
    }


    const getHeaderTableCellValue = (headers: any) => {
        return (
            headers.map((materialHeader: any) => (
                <TableCell key={`${keyHelper.getNextKeyValue()}`}>
                    {materialHeader[labelKey]}
                </TableCell>
            ))
        )
    }

    const handleModalClose = (refreshData: boolean) => {

        setModalData({...modalData, [modalOpenKey]: false});
        setDeleteModalData({...deleteModalData, [modalOpenKey]: false});
        if (refreshData) {
            refreshMaterialData();
        }
    }
    const handleAssignMaterialModalClose = () => {
        setModalData({...modalData, [modalOpenKey]: false});
        refreshMaterialData();
 
    }
    const handleEmbModal=(closeStatus:boolean)=>{
        if(closeStatus){
            refreshMaterialData();
        }
    }
    const assignMaterialHandler = (materialRow: any, headers: any, supplierInquiryHeaders: any, assignType: any, materialType: any, otherPlacementId:any, itemData: any) => {
        let materialHelper;
        if (assignType == orderPackItemType) {
            materialHelper = new OrderPackItemPlacementHelper({
                materialType: materialType?.[materialNameKey],
                headers: headers,
                displayName: materialType?.[materialDisplayNameKey],
                inputType: PENDING_MATERIALS_VERSION_STATE,
                readOnly: false,// TODO - change this
                orderId: orderId,
                versionId: versionId,
            });
            materialHelper.setOrderItemId(itemData?.[orderItemIdKey]);
            materialHelper.setItemId(itemData?.[itemIdKey]); // need to review
        } else {
            materialHelper = new OrderPackPlacementHelper({
                materialType: materialType?.[materialNameKey],
                headers: headers,
                displayName: materialType?.[materialDisplayNameKey],
                inputType: PENDING_MATERIALS_VERSION_STATE,
                readOnly: false,// TODO - change this
                orderId: orderId,
                versionId: versionId,
            });
        }
        if(otherPlacementId){
             materialHelper.setOrderPlacementId(materialRow[packItemPlacementIdKey]);
        }
        else{
            const firstMaterialKey = Object.keys(materialRow?.[consumptionDataKey])[0];
            materialHelper.setOrderPlacementId(materialRow?.[consumptionDataKey][firstMaterialKey][orderPlacementIdKey]);
        }
       
        materialHelper.setColorwayId(materialTitle?.[sizeGroupColorwayKey]?.[idKey]);

        setModalData({
            title: 'Assign Material',
            [modalOpenKey]: true,
            drawerData: materialRow,
            orderPackType: assignType,
            materialHelper: materialHelper,
            setOpen: handleAssignMaterialModalClose,
            component_type: ASSIGN_MATERIAL_MODAL,
        });

    }

    const createPlacementToggleAssignMaterial = (createdPlacementData: any, postData: any, componentType:any) => {
        const material_type = {
            [materialNameKey]: postData.material_type,
            [materialDisplayNameKey]: postData.material_type_display_name
        }
        const placementData = createdPlacementData['placements'][0];
        const modifiedPlacementData = {...placementData, [packItemPlacementIdKey]: placementData[idKey], placement: placementData['placement_name']};
        assignMaterialHandler(
            modifiedPlacementData,
            createdPlacementData.material_headers,
            undefined, // You provided undefined for supplierInquiryHeaders
            componentType === ADD_MATERIAL_PLACEMENT_MODAL ? orderPackItemType : orderPackType,
            material_type,
            createdPlacementData.other_placement_id,
            {}//TODO - change this
        );

    }

    const getTableCellValue = (headers: any, materialRow: any) => {
        return (
            headers.map((materialHeader: any, index: any) => (materialHeader?.['is_reference_code']) ? (
                        <TableCell key={`${keyHelper.getNextKeyValue()}`}>
                                <ShowMaterialReferenceCode
                                materialAttributes={materialRow}
                                customerBrandMaterialId={materialRow?.['material_id']}
                                headerInformation={materialHeader}
                            />
                        </TableCell>


                 ) : (

                    <TableCell key={`${keyHelper.getNextKeyValue()}`}>
                        {materialRow[materialHeader[nameKey]] || '-'}
                    </TableCell>
                )
            ))
    }


    const getSizeConsumptionDataValue = (headers: any, materialRow: any, supplierInquiry: any) => {
        return (
            headers.map((materialHeader: any) => (

                <TableCell key={`${keyHelper.getNextKeyValue()}`} sx={{width: '200px'}}>
                    Consumption Ratio:&nbsp;
                    {getNumberDisplayValue(supplierInquiry?.[supplierInquiryMaterialCostDataKey]?.[materialHeader[packIdKey]]?.[consumptionRatioKey])}
                    <br/>
                    Wastage:&nbsp;
                    {getNumberDisplayValue(supplierInquiry?.[supplierInquiryMaterialCostDataKey]?.[materialHeader[packIdKey]]?.[wastageKey])}<br/>
                    Total:&nbsp;

                    {getNumberDisplayValue(supplierInquiry?.[supplierInquiryMaterialCostDataKey]?.[materialHeader[packIdKey]]?.[totalCostKey])}
                </TableCell>
            ))
        )
    }

    const getMaterialExistsValue = (headers: any, materialSizeConsumptionData: any) => {
        return (
            headers.map((materialHeader: any) => (

                <TableCell key={`${keyHelper.getNextKeyValue()}`} sx={{width: '200px'}}>
                    {
                        materialSizeConsumptionData?.[materialHeader[packIdKey]]?.[orderPlacementMaterialIdKey] ? (
                            < CheckIcon style={{ color: 'green' }} />
                        ):  (
                            <CloseIcon style={{ color: 'red' }} />
                        )
                    }
                </TableCell>
            ))
        )
    }

    const createMaterialDataTable = (materialHeaders: any, materialData: any, supplierInquiryHeaders: any,
                                     sizeHeaders: any, materialInfo: any, assignType: any, itemData:any) => {
        return (
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {!showConsumptionRatios && <TableCell></TableCell>}
                            {getHeaderTableCellValue(materialHeaders)}
                            { showConsumptionRatios && <TableCell>Select</TableCell>}
                            {showConsumptionRatios && getHeaderTableCellValue(supplierInquiryHeaders)}
                            {getHeaderTableCellValue(sizeHeaders)}
                        </TableRow>
                    </TableHead>
                    <TableBody>

                        {
                            materialData.map((materialRow: any, materialIndex: any) => {
                                return (
                                    materialRow?.[supplierInquiryDataKey].length != 0 && showConsumptionRatios ? (materialRow?.[supplierInquiryDataKey].map((supplierInquiry: any, supplierInquiryIndex: number) => (

                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                           {!showConsumptionRatios ? <TableCell></TableCell>  : (
                                               supplierInquiryIndex > 0 && <TableCell colSpan={materialHeaders.length}></TableCell>
                                           )}

                                            {supplierInquiryIndex == 0 ? (
                                                getTableCellValue(materialHeaders, materialRow)
                                            ) : (
                                                !showConsumptionRatios && supplierInquiryIndex == 0 &&
                                                    <TableCell colSpan={materialHeaders.length}>
                                                        <IconButton size='small' color='primary' onClick={() => assignMaterialHandler(materialRow, materialHeaders, supplierInquiryHeaders, assignType, materialInfo, undefined, itemData)} >
                                                            <ModeEditIcon fontSize='inherit' />
                                                        </IconButton>
                                                    </TableCell>
                                            )}
                                            <TableCell>
                                                <Radio
                                                      checked={materialSupplierInquiry[materialRow[materialIdKey]] == supplierInquiry[supplierInquiryIdKey]}
                                                      onClick={() => handleSupplierSelect(materialRow, supplierInquiry)}
                                                      name="radio-buttons"
                                                      inputProps={{ 'aria-label': 'A' }}
                                                />
                                            </TableCell>

                                            {getTableCellValue(supplierInquiryHeaders, supplierInquiry)}
                                            {getSizeConsumptionDataValue(sizeHeaders, materialRow[consumptionDataKey], supplierInquiry)}

                                        </TableRow>
                                    ))
                                    ) : (
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                            {!showConsumptionRatios &&
                                                <TableCell  sx={{maxWidth: '90px'}}>
                                                        <IconButton size='small' color='primary' onClick={() => { confirmationDeletePlacement(assignType, materialRow?.placement_other_id, itemData?.order_item_id,) }} >
                                                        <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                                    </IconButton>

                                                       <IconButton
                                                        size='small'
                                                        color='primary'
                                                            onClick={() => { handleEditOtherPlacement(assignType, materialRow?.placement_other_id, itemData?.order_item_id, itemData?.item_id) }}

                                                    >
                                                        <BorderColorIcon fontSize='inherit' />
                                                    </IconButton>
                                                    <Tooltip title="Assign Material">
                                                        <IconButton size='small' color='primary'
                                                            onClick={() => assignMaterialHandler(materialRow, materialHeaders, supplierInquiryHeaders, assignType, materialInfo, undefined, itemData)} >
                                                            <ModeEditIcon fontSize='inherit' />
                                                        </IconButton>
                                                    </Tooltip>

                                                </TableCell>
                                            }
                                            {getTableCellValue(materialHeaders, materialRow)}
                                            { showConsumptionRatios && <TableCell>--</TableCell>}
                                            {showConsumptionRatios && getTableCellValue(supplierInquiryHeaders, [])}
                                            {showConsumptionRatios && getSizeConsumptionDataValue(sizeHeaders, materialRow[consumptionDataKey], [])}
                                            {!showConsumptionRatios && getMaterialExistsValue(sizeHeaders, materialRow[consumptionDataKey])}
                                        </TableRow>
                                    )
                                )

                            })
                        }
                    </TableBody>

                </Table>
            </TableContainer>
        )
    }


    const confirmationDeletePlacement = (assignType: any, placementId: any, itemId: any) => {
        let placementDeleteModalData;
        if (assignType == 'packitem') {
            placementDeleteModalData = {
                setOpen: handleModalClose,
                component_type: ADD_MATERIAL_PLACEMENT_MODAL,
                [modalOpenKey]: true,
                title: 'Delete Placement',
                orderId: orderId,
                versionId: versionId,
                orderSizeGroupId: orderSizeGroupId,
                orderCountryId: orderCountryId,
                orderColorwayId: orderColorwayId,
                placementId: placementId,
                itemId: itemId,

            }
        }
        else {
            placementDeleteModalData = {
                setOpen: handleModalClose,
                component_type: ADD_MATERIAL_PACKAGING_MODAL,
                [modalOpenKey]: true,
                title: 'Delete Placement',
                orderId: orderId,
                versionId: versionId,
                orderSizeGroupId: orderSizeGroupId,
                orderCountryId: orderCountryId,
                orderColorwayId: orderColorwayId,
                placementId: placementId,

            }
        }
        setDeleteModalData(placementDeleteModalData);
    }
    const handleEditOtherPlacement = (assignType: any, placementId: any, itemId: any, ItemitemId:any) => {
        let placementModalData;
        if (assignType == 'packitem') {
            placementModalData = {
                setOpen: handleModalClose,
                component_type: ADD_MATERIAL_PLACEMENT_MODAL,
                [modalOpenKey]: true,
                title: 'Add Placement',
                orderId: orderId,
                versionId: versionId,
                orderSizeGroupId: orderSizeGroupId,
                orderCountryId: orderCountryId,
                orderColorwayId: orderColorwayId,
                otherplacement: placementId,
                itemId: itemId,
                itemItemId: ItemitemId,
                createPlacementToggleAssignMaterial:createPlacementToggleAssignMaterial
            }
        }
        else {
            placementModalData = {

                setOpen: handleModalClose,
                component_type: ADD_MATERIAL_PACKAGING_MODAL,
                [modalOpenKey]: true,
                title: 'Add Packaging',
                orderId: orderId,
                versionId: versionId,
                orderSizeGroupId: orderSizeGroupId,
                orderCountryId: orderCountryId,
                orderColorwayId: orderColorwayId,
                otherplacement: placementId,
                createPlacementToggleAssignMaterial:createPlacementToggleAssignMaterial
            }
        }
        setModalData(placementModalData);
    }
    const handleItemAddPlacement = (itemId:any,materialType:any) => {
        const placementModalData = {
            setOpen: handleModalClose,
            component_type: ADD_MATERIAL_PLACEMENT_MODAL,
            [modalOpenKey]: true,
            title: 'Add Placement',
            orderId: orderId,
            versionId: versionId,
            orderSizeGroupId: orderSizeGroupId,
            orderCountryId: orderCountryId,
            orderColorwayId: orderColorwayId,
            itemId: itemId,
            itemItemId: itemId,
            materialTypeId: materialType,
            createPlacementToggleAssignMaterial:createPlacementToggleAssignMaterial
        }
        setModalData(placementModalData);
    }


    const handleAddPackaging = (materialType:any) => {
        const placementModalData = {

            setOpen: handleModalClose,
            component_type: ADD_MATERIAL_PACKAGING_MODAL,
            [modalOpenKey]: true,
            title: 'Add Packaging',
            orderId: orderId,
            versionId: versionId,
            orderSizeGroupId: orderSizeGroupId,
            orderCountryId: orderCountryId,
            orderColorwayId: orderColorwayId,
            materialTypeId: materialType,
            createPlacementToggleAssignMaterial:createPlacementToggleAssignMaterial
        }
        setModalData(placementModalData);
    }
    const handleServiceKeyChange = (serviceType: any) => {
        setOpenServiceNewForm({open: true, serviceType: serviceType})
    }
    const handleOtherCostModal = () => {
        setOpenOtherCostModal(true);
    }
    
    const handleRecalculateCosting = () => {
        setCostingRecalculateErrors({})
        setIsCalaculatingData(true)
        const data ={
            calculate_type: 'costing_colorway',
            colorway_id: parseInt(orderColorwayId),
            pack_ids : navigationData?.order_packs?.map((pack: any)=> pack.id)
        }
        api.post(costingRestUrls.costingValuesRecalculateURL(versionId), data).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            refreshMaterialData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setCostingRecalculateErrors(error?.response?.data);
        }).finally(() => {
            setIsLoading(false);
            setIsCalaculatingData(false)
        });
    }

    return (
       <>
       { isLoading ? <DefaultLoader /> :  <>
           <RitzBreadcrumbs
                    items={[
                        { label: 'Order Inquiries', url: '/costing' },
                        { label: 'Order Summary', url: `${appUrls.orderSummaryVersionURL(+orderId, +versionId)}?tab=3` },
                        { label: 'Assign Materials' }
                    ]}
                    title={`${materialTitle?.sizeGroupCountry?.name} - ${materialTitle?.sizeGroupColorway?.name} - Summary`}
                />
            <Box sx={{ mb: 1 }}>
                {costingRecalculateErrors?.success === false && (
                    <Alert severity="error" >{costingRecalculateErrors?.message}</Alert>
                )}
            </Box>
            <Box sx={{ mb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {versionData.version_state?.value === PENDING_SUPPLIER_SELECTION_VERSION_STATE && (
                            <Link component={'button'} onClick={() => {handleRecalculateCosting()}}>
                                <Button variant='outlined' sx={{ mb: 3, mr: 1 }} disabled={isCalaculatingData}>{isCalaculatingData && <SaveSpinner/>}Recalculate Costing</Button>
                            </Link>
                    )}
                    {versionData.version_state?.value !== PENDING_MATERIALS_VERSION_STATE && (
                            <Link component={NextLink} href={appUrls.supplierInquiriesURL(+orderId, +versionId)}>
                                <Button variant='outlined' sx={{ mb: 3 }}>Supplier Inquiries</Button>
                            </Link>
                    )}
                    { editableMaterial &&
                        <Box>
                            <Button variant='outlined' onClick={() => handleItemAddPlacement(undefined,undefined)} sx={{ mb: 3, mr: 3 }} >Add Placement</Button>
                            <Button variant='outlined' onClick={() => handleAddPackaging(undefined)} sx={{ mb: 3, mr: 3 }} >Add Packaging</Button>
                            <Button variant='outlined'  onClick={() => { handleServiceKeyChange(washServiceType);}} sx={{ mb: 3, mr: 3 }} >Add Wash</Button>
                            <Button variant='outlined'  onClick={() => { handleServiceKeyChange(embServiceType);}} sx={{ mb: 3, mr: 3 }} >Add Embellishment</Button>
                            <Button variant='outlined'  onClick={() => { handleOtherCostModal()}} sx={{ mb: 3, mr: 3 }} >Add Other Cost</Button>
                        </Box>
                    }
                    
                </Box>
                <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement='left'>
                    <IconButton
                        onClick={() => setCollapsed(!collapsed)}
                        sx={{
                            fontSize: '1rem',
                            mb: 1,
                            borderRadius: 1
                        }}
                    >
                        {!collapsed ? <MenuOpenIcon fontSize='inherit' /> : <MenuIcon fontSize='inherit' />}
                        <span style={{ marginLeft: 4, fontSize: 'smaller' }}>Order Packs</span>
                    </IconButton>
                </Tooltip>
            </Box>

               <Grid container columnSpacing={3} direction={isSmall ? 'column-reverse' : 'row'}>
                    <Grid item md={!collapsed ? 9 : 12} xs={12} sx={{ width: '100%' }}>
                        {showConsumptionRatios &&
                            <GroupedSizeCosting versionId={versionId} countryId={orderCountryId} colorwayId={orderColorwayId}
                                sizeGroupId={orderSizeGroupId} costComponentRefresher={materialSupplierInquiry} />
                        }
                        {
                            Object.keys(packItemMaterialData)?.map((orderItemId: any, materialIndex: any) => {
                                const itemData = packItemMaterialData?.[orderItemId];
                                const itemMaterialData = itemData[dataKey][cadDataKey];
                                const supplierInquiryHeaders = itemData?.[dataKey]?.[supplierInquiryHeaderKey] || [];
                                const sizeHeaders = itemData?.[dataKey]?.[sizeHeadersKey] || [];

                                return (
                                    <React.Fragment key={`${materialIndex}-material-pack-item`}>
                                    <Box><Typography variant="h1" component="h2">{itemData?.['item']}</Typography></Box>

                                    {Object.keys(itemMaterialData)?.map((material: any) => {
                                            const materialInfo = itemMaterialData[material];
                                            const materialData = materialInfo?.[dataKey] || [];
                                            const materialHeaders = materialInfo?.[headerKey] || [];
                                            const materialDataTable = createMaterialDataTable(materialHeaders, materialData, supplierInquiryHeaders, sizeHeaders, materialInfo, orderPackItemType, itemData);
                                            console.log(itemData,"itemData")
                                            return (
                                                <Grid container columnSpacing={3} direction={'row'} key={keyHelper.getNextKeyValue()}>
                                                     <Grid item md={12} xs={12} sx={{ width: '100%' }}>
                                                         <Card key={`${keyHelper.getNextKeyValue()}`} sx={{ mb: 3 }} variant='outlined'>
                                                            <CardHeader
                                                                title={
                                                                    <>
                                                                         <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                            <Box> {materialInfo[displayNameKey]}</Box>
                                                                            {editableMaterial && (
                                                                                <Box>  <Button onClick={() => handleItemAddPlacement(itemData.item_id, materialInfo[materialNameKey])} ><ControlPointIcon /></Button></Box>
                                                                            )}                                                                         
                                                                        </Box>

                                                                    </>
                                                                  }
                                                                sx={{
                                                                    background: (theme) => theme.palette.grey[100],
                                                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                                                }}

                                                            />
                                                            {materialDataTable}
                                                         </Card>
                                                     </Grid>
                                                </Grid>
                                            )

                                        })}

                                        { itemMaterialData.length == 0 && <Card variant='outlined' sx={{ p: 2, marginBottom: '24px' }}>No assigned materials found.</Card> }
                                        <GroupedServiceCosts
                                            orderItemId={itemData?.['order_item_id']}
                                            serviceCostData={itemServiceCosts}
                                            supplierInquiryHeaders={supplierInquiryHeaders}
                                            showSupplierInquiries={showConsumptionRatios}
                                            serviceSupplierInquiryData={serviceSupplierInquiry}
                                            handleServiceSupplierSelect={handleServiceSupplierSelect}
                                            colorwayId={orderColorwayId}
                                            orderId={orderId}
                                            versionId={versionId}
                                            countryId={orderCountryId}
                                            ModalClose={() => handleEmbModal(true)}
                                            />
                                        {/*{showConsumptionRatios && <ItemColorwayOperations  versionId={versionId} orderItemId={itemData?.['order_item_id']} colorwayId={orderColorwayId}/>}*/}
                                        <GroupedPackItemsOperations
                                            versionId={versionId}
                                            orderItemId={itemData?.['order_item_id']}
                                            colorwayId={orderColorwayId} 
                                            sizeGroupId={orderSizeGroupId} 
                                            countryId={orderCountryId}
                                            sizeHeaders={packagingMaterialData?.[sizeHeadersKey]}
                                        />

                                    </React.Fragment>
                                )
                            })
                        }

                        <React.Fragment key={`material-packaging-data`}>
                        <Box>
                            <Typography variant="h1" component="h2">Packaging Data</Typography>
                        </Box>

                        {
                            Object.keys(packagingMaterialData?.[cadDataKey] || {})?.map((materialKey: any) => {
                                const materialInfo = packagingMaterialData[cadDataKey][materialKey];
                                const materialData = materialInfo?.[dataKey] || [];
                                const materialHeaders = materialInfo?.[headerKey] || [];
                                const supplierInquiryHeaders = packagingMaterialData[supplierInquiryHeaderKey];
                                const sizeHeaders = packagingMaterialData[sizeHeadersKey];
                                const materialDataTable = createMaterialDataTable(materialHeaders, materialData, supplierInquiryHeaders, sizeHeaders, materialInfo, orderPackType, undefined);

                                return (
                                    <Grid container columnSpacing={3} direction={'row'} key={keyHelper.getNextKeyValue()}>
                                         <Grid item md={12} xs={12} sx={{ width: '100%' }}>
                                             <Card key={`${keyHelper.getNextKeyValue()}`} sx={{ mb: 3 }} variant='outlined'>
                                                <CardHeader
                                                     title={
                                                        <>
                                                             <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                <Box> {materialInfo[displayNameKey]}</Box>
                                                                {editableMaterial && (
                                                                    <Box>  <Button onClick={() => handleAddPackaging(materialInfo[materialNameKey])} ><ControlPointIcon /></Button></Box>
                                                                )}
                                                               
                                                            </Box>

                                                        </>
                                                      }
                                                    sx={{
                                                        background: (theme) => theme.palette.grey[100],
                                                        borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                                    }}
                                                />
                                                {materialDataTable}

                                             </Card>
                                         </Grid>
                                    </Grid>
                                )

                            })
                        }
                        { packagingMaterialData?.[cadDataKey]?.[dataKey]}
                        { (packagingMaterialData?.[cadDataKey] || [])?.length == 0 && <Card variant='outlined' sx={{ p: 2, marginBottom: '24px'  }}>No results found.</Card> }
                            <GroupedOtherCosts
                                otherCosts={packOtherCosts}
                                sizeHeaders={packagingMaterialData?.[sizeHeadersKey]}
                                fetchData={refreshMaterialData}
                                orderID={orderId}
                                versionId={versionId}
                                orderSizeGroupId={orderSizeGroupId}
                                colorwayId={orderColorwayId} 
                                countryId={orderCountryId}
                            />

                            <EditDialog {...modalData} />
                            <DeleteDialog {...deleteModalData} />
                        </React.Fragment>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <CompletedStatusOrderSizeGroupPacks
                                orderId={orderId}
                                versionId={versionId}
                                colorwayId={orderColorwayId}
                                orderCountryId={orderCountryId}
                                orderSizeGroupId={orderSizeGroupId}
                                reviewedStatus={markedAsComplete}
                                fetchSavedData={refreshMaterialData} />
                        </Box>
                    </Grid>

                    {!collapsed && <Grid item md={3} xs={12} sx={{ width: '100%', mb: isSmall ? 3 : 0 }}>
                        <Card variant='outlined'>
                            <MaterialNavigation
                                navigationData={navigationData}
                                orderID={orderId}
                                pageType={'summary'}
                                versionId={versionId}
                                costingPhase={showConsumptionRatios ? PENDING_SUPPLIER_SELECTION_VERSION_STATE : PENDING_MATERIALS_VERSION_STATE} />
                        </Card>
                        
                    </Grid>}
                   
               </Grid>
                

                {
                    openServiceNewForm.serviceType === washServiceType && <EditPackItemWashService
                        colorwayId={orderColorwayId}
                        countryId={orderCountryId}
                        orderId={orderId}
                        versionId={versionId}
                        setModalOpen={setOpenServiceNewForm}
                        modalOpen={openServiceNewForm.open}
                        setUpdated={refreshMaterialData}
                        packItemId={[1]}//need to change api (remove packItemId from api)
                    />
                }
                {
                    openServiceNewForm.serviceType === embServiceType && <EditPackItemEMBService
                        colorwayId={orderColorwayId}
                        countryId={orderCountryId}
                        orderId={orderId}
                        versionId={versionId}
                        setModalOpen={setOpenServiceNewForm}
                        modalOpen={openServiceNewForm.open}
                        setUpdated={refreshMaterialData}
                />
                }
                {
                    openOtherCostModal == true &&
                    <RitzModal
                        open={openOtherCostModal}
                        title={'Edit/Add Other Cost'}
                        onClose={() => {setOpenOtherCostModal(false)}}
                        maxWidth='lg'>
                        <AddOtherCosts
                            orderId={orderId}
                            versionId={versionId}
                            packId={11}
                            setUpdated={refreshMaterialData}
                            costTypeId={0}
                            orderSizeGroupId={orderSizeGroupId}
                            colorwayId={orderColorwayId} 
                            countryId={orderCountryId}
                        />
                    </RitzModal>

                }
             {isLoadingMaterial && (<CircularLoader />)}    
        </>
        
       }
       </>
    );
};

export default SizeGroupPackMaterials;
